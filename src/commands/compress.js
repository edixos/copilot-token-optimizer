import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { countTokens } from '../lib/tokenizer.js';
import { scanDeepDocFiles } from '../lib/scanner.js';

const LANG_SHORT = {
  javascript: 'js', typescript: 'ts', python: 'py', ruby: 'rb',
  golang: 'go', shell: 'sh', dockerfile: 'docker',
};

// ─── pure helpers ────────────────────────────────────────────────────────────

export function removeExtraBlankLines(content) {
  return content.replace(/\n{3,}/g, '\n\n');
}

export function shortenCodeFences(content) {
  return content.replace(/^(```)(javascript|typescript|python|ruby|golang|shell|dockerfile)$/gm,
    (_, fence, lang) => fence + (LANG_SHORT[lang] ?? lang));
}

export function truncateLongLists(content, maxItems = 3) {
  const changes = [];
  const result = content.replace(
    /((?:^[ \t]*[-*] .+\n){6,})/gm,
    (block) => {
      const lines = block.split('\n').filter(Boolean);
      if (lines.length <= maxItems) return block;
      const kept = lines.slice(0, maxItems);
      const dropped = lines.length - maxItems;
      changes.push(`Truncated list (kept ${maxItems} of ${lines.length} items)`);
      return kept.join('\n') + `\n- # ... ${dropped} more\n`;
    },
  );
  return { result, changes };
}

export function countBlankLineBlocks(content) {
  return (content.match(/\n{3,}/g) ?? []).length;
}

export function countVerboseFences(content) {
  return (content.match(/^```(javascript|typescript|python|ruby|golang|shell|dockerfile)$/gm) ?? []).length;
}

export function computeTokenStats(original, compressed) {
  const beforeTokens = countTokens(original);
  const afterTokens = countTokens(compressed);
  const saved = beforeTokens - afterTokens;
  const pct = beforeTokens > 0 ? Math.round((saved / beforeTokens) * 100) : 0;
  return { beforeTokens, afterTokens, saved, pct };
}

export function applyCompressionRules(content, aggressive = false) {
  const changes = [];
  let result = content;

  const blanksRemoved = countBlankLineBlocks(result);
  result = removeExtraBlankLines(result);
  if (blanksRemoved > 0)
    changes.push(`Removed ${blanksRemoved} extra blank line block${blanksRemoved > 1 ? 's' : ''}`);

  const fencesShortened = countVerboseFences(result);
  result = shortenCodeFences(result);
  if (fencesShortened > 0)
    changes.push(`Shortened ${fencesShortened} code fence label${fencesShortened > 1 ? 's' : ''}`);

  const maxItems = aggressive ? 3 : 5;
  const listResult = truncateLongLists(result, maxItems);
  result = listResult.result;
  changes.push(...listResult.changes);

  return { result, changes };
}

// ─── deep docs index helpers ─────────────────────────────────────────────────

export const DEEP_DOCS_SECTION_START = '<!-- cpto:deep-docs-index -->';
export const DEEP_DOCS_SECTION_END = '<!-- /cpto:deep-docs-index -->';

/**
 * Builds a markdown section listing deep docs files as on-demand references.
 * Copilot should read these using tool calls only when the task requires them.
 */
export function buildDeepDocsIndexSection(deepFiles) {
  if (deepFiles.length === 0) return '';
  const lines = [
    DEEP_DOCS_SECTION_START,
    '',
    '## Deep Reference Docs (Load On-Demand)',
    '',
    '> ⚡ These files are **not** auto-loaded. Use `read_file` / tool calls to load only when the task needs them.',
    '',
  ];
  for (const f of deepFiles) {
    const desc = f.heading ? ` — ${f.heading}` : '';
    lines.push(`- \`${f.rel}\`${desc}`);
  }
  lines.push('', DEEP_DOCS_SECTION_END);
  return lines.join('\n');
}

/**
 * Injects or replaces the deep-docs index section in copilot-instructions.md.
 * Returns the updated content and whether a change was made.
 */
export function injectDeepDocsIndex(content, section) {
  const hasSection = content.includes(DEEP_DOCS_SECTION_START);
  if (hasSection) {
    const updated = content.replace(
      new RegExp(`${DEEP_DOCS_SECTION_START}[\\s\\S]*?${DEEP_DOCS_SECTION_END}`, 'g'),
      section,
    );
    return { content: updated, injected: updated !== content };
  }
  // Append before final cpto footer if present, otherwise at end
  const footerIdx = content.lastIndexOf('\n---\n\n**Last Updated**:');
  if (footerIdx !== -1) {
    const updated = content.slice(0, footerIdx) + '\n\n' + section + content.slice(footerIdx);
    return { content: updated, injected: true };
  }
  return { content: content.trimEnd() + '\n\n' + section + '\n', injected: true };
}

// ─── output helpers ──────────────────────────────────────────────────────────

export function printCompressionReport(stats, changes) {
  const { beforeTokens, afterTokens, pct } = stats;
  console.log('');
  console.log(chalk.bold('cpto compress — .github/copilot-instructions.md optimization'));
  console.log('');
  console.log(`  Before: ${chalk.yellow(beforeTokens)} tokens`);
  console.log(`  After:  ${chalk.green(afterTokens)} tokens (${pct}% reduction)`);
  console.log('');
  if (changes.length === 0) {
    console.log(chalk.dim('  No compression opportunities found.'));
    console.log('');
    return;
  }
  console.log('  Changes:');
  for (const c of changes) console.log(`  - ${c}`);
  console.log('');
}

// Returns false and prints reason if writing should be skipped; true otherwise.
function shouldWrite(original, compressed, changes, dryRun) {
  if (changes.length === 0) return false;
  if (dryRun) {
    console.log(chalk.dim('  --dry-run: no files written.'));
    console.log('');
    return false;
  }
  if (original === compressed) {
    console.log(chalk.dim('  Content unchanged after compression.'));
    console.log('');
    return false;
  }
  return true;
}

async function promptApply() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ans = await new Promise(resolve =>
    rl.question(chalk.blue('Apply changes? [y/N] '), resolve));
  rl.close();
  console.log('');
  return ans.trim().toLowerCase() === 'y';
}

function writeCompressed(copilotMdPath, original, compressed, backup, stats) {
  if (backup !== false) {
    fs.writeFileSync(copilotMdPath + '.bak', original, 'utf8');
    console.log(chalk.dim('  Backup: .github/copilot-instructions.md.bak'));
  }
  fs.writeFileSync(copilotMdPath, compressed, 'utf8');
  console.log(chalk.green(`✓ Saved — ${stats.saved} tokens freed (${stats.pct}% reduction)`));
  console.log('');
}

// ─── command entry point ─────────────────────────────────────────────────────

export async function compressCommand(options) {
  const dir = process.cwd();
  const copilotMdPath = path.join(dir, '.github/copilot-instructions.md');
  if (!fs.existsSync(copilotMdPath)) {
    console.error(chalk.red('✗ .github/copilot-instructions.md not found. Run: cpto init'));
    process.exit(1);
  }
  const original = fs.readFileSync(copilotMdPath, 'utf8');
  const { result: textCompressed, changes } = applyCompressionRules(original, options?.aggressive);

  // Discover deep docs that should be routed through on-demand tool calls
  const deepFiles = await scanDeepDocFiles(dir);
  let finalContent = textCompressed;
  const deepDocsChanges = [];
  if (deepFiles.length > 0) {
    const section = buildDeepDocsIndexSection(deepFiles);
    const { content: withIndex, injected } = injectDeepDocsIndex(finalContent, section);
    if (injected) {
      finalContent = withIndex;
      deepDocsChanges.push(
        `Injected deep-docs index (${deepFiles.length} file${deepFiles.length !== 1 ? 's' : ''} listed as on-demand references)`
      );
    }
  }

  const allChanges = [...changes, ...deepDocsChanges];
  const stats = computeTokenStats(original, finalContent);
  printCompressionReport(stats, allChanges);

  if (deepFiles.length > 0) {
    console.log(chalk.dim(`  📂 ${deepFiles.length} deep doc file${deepFiles.length !== 1 ? 's' : ''} routed to on-demand index (not auto-loaded)`));
    console.log('');
  }

  if (!shouldWrite(original, finalContent, allChanges, options?.dryRun)) return;
  const confirmed = await promptApply();
  if (!confirmed) {
    console.log(chalk.dim('Skipped.'));
    console.log('');
    return;
  }
  writeCompressed(copilotMdPath, original, finalContent, options?.backup, stats);
}
