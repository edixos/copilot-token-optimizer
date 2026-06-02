import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '../lib/tokenizer.js';
import { getCopilotIgnore } from '../lib/frameworks.js';
import {
  ARCHITECTURE_MAP_PATH,
  COMMON_MISTAKES_PATH,
  COMPLETIONS_DIR,
  COPILOT_IGNORE_PATH,
  COPILOT_MD_PATH,
  DOCS_INDEX_PATH,
  QUICK_START_PATH,
  SESSIONS_DIR,
} from '../lib/paths.js';
import {
  buildCopilotMd, buildCommonMistakesMd, buildQuickStartMd,
  buildArchitectureMapMd, buildDocsIndexMd,
} from './init.js';

const ESSENTIAL_FILES = [
  COMMON_MISTAKES_PATH,
  QUICK_START_PATH,
  ARCHITECTURE_MAP_PATH,
];

const FILE_EXCLUSIONS = [
  { filename: 'README.md',       fixKey: 'readme-exclude',       hint: 'typical README = 1,000–10,000 tokens' },
  { filename: 'CHANGELOG.md',    fixKey: 'changelog-exclude',    hint: 'typical CHANGELOG = 2,000–8,000 tokens' },
  { filename: 'CONTRIBUTING.md', fixKey: 'contributing-exclude', hint: 'typically 1,000–3,000 tokens' },
  { filename: 'GEMINI.md',       fixKey: 'gemini-exclude',       hint: 'Gemini Code instructions file' },
  { filename: 'AGENTS.md',       fixKey: 'agents-exclude',       hint: 'AI agent instructions file' },
  { filename: '.cursorrules',    fixKey: 'cursorrules-exclude',  hint: 'Cursor IDE rules file' },
  { filename: '.windsurfrules',  fixKey: 'windsurfrules-exclude', hint: 'Windsurf IDE rules file' },
  { filename: '.clinerules',     fixKey: 'clinerules-exclude',   hint: 'Cline AI rules file' },
  { filename: '.roomodes',       fixKey: 'roomodes-exclude',     hint: 'Roo Code modes file' },
];

// --- Pure functions (no fs, no console, no process) ---

function check(label, pass, severity, detail, fixKey = null) {
  return { label, pass, severity, detail, fixKey };
}

export function checkCopilotMdContent(content) {
  const results = [];
  const tokens = countTokens(content);
  results.push(check(
    `.github/copilot-instructions.md token count (${tokens})`,
    tokens < 600,
    'warning',
    tokens >= 600 ? `${tokens} tokens — aim for < 600` : null,
  ));
  const hasCompleted = /^##\s+(completed|done)\b/im.test(content);
  results.push(check(
    'No completed tasks in .github/copilot-instructions.md',
    !hasCompleted,
    'warning',
    hasCompleted ? `Move completed items to ${COMPLETIONS_DIR}/` : null,
  ));
  const hasDateHeaders = /^##\s+\d{4}-\d{2}-\d{2}/m.test(content);
  results.push(check(
    'No session notes in .github/copilot-instructions.md',
    !hasDateHeaders,
    'warning',
    hasDateHeaders ? `Move session notes to ${SESSIONS_DIR}/` : null,
  ));
  return results;
}

export function checkIgnoreContent(ignoreContent) {
  const results = [];
  const coversSessions = ignoreContent.includes(`${SESSIONS_DIR}/`) || ignoreContent.includes(`${SESSIONS_DIR}/**`);
  results.push(check(`.copilotignore covers ${SESSIONS_DIR}/`, coversSessions, 'warning',
    coversSessions ? null : `Add: ${SESSIONS_DIR}/** to .copilotignore`, 'sessions-cover'));

  const coversCompletions = ignoreContent.includes(`${COMPLETIONS_DIR}/`) || ignoreContent.includes(`${COMPLETIONS_DIR}/**`);
  results.push(check(`.copilotignore covers ${COMPLETIONS_DIR}/`, coversCompletions, 'warning',
    coversCompletions ? null : `Add: ${COMPLETIONS_DIR}/** to .copilotignore`, 'completions-cover'));

  const coversArchive = ignoreContent.includes('docs/archive/') || ignoreContent.includes('docs/archive/**');
  results.push(check('copilotignore covers docs/archive/', coversArchive, 'warning',
    coversArchive ? null : 'Add: docs/archive/** to .copilotignore', 'archive-cover'));

  for (const { filename, fixKey, hint } of FILE_EXCLUSIONS) {
    const lines = ignoreContent.split('\n');
    const covered = lines.some(line => line.trim() === filename || line.trim() === `/${filename}`);
    results.push(check(`copilotignore covers ${filename}`, covered, 'info',
      covered ? null : `Add ${filename} to .copilotignore — ${hint}`,
      fixKey));
  }
  return results;
}

export function summarizeCounts(results) {
  return {
    errors: results.filter(r => !r.pass && r.severity === 'error').length,
    warnings: results.filter(r => !r.pass && r.severity === 'warning').length,
    infos: results.filter(r => !r.pass && r.severity === 'info').length,
  };
}

export function formatResults(results, useColor) {
  const green = s => useColor ? chalk.green(s) : s;
  const red = s => useColor ? chalk.red(s) : s;
  const yellow = s => useColor ? chalk.yellow(s) : s;
  const lines = [];
  for (const r of results) {
    const icon = r.pass ? green('✓') : r.severity === 'error' ? red('✗') : yellow('⚠');
    const label = r.pass ? r.label : r.detail ? `${r.label} — ${r.detail}` : r.label;
    lines.push(`  ${icon} ${label}`);
  }
  return lines;
}

export function buildFixSummary(warnings, infos) {
  const parts = [];
  if (warnings) parts.push(`${warnings} warning${warnings > 1 ? 's' : ''}`);
  if (infos) parts.push(`${infos} info item${infos > 1 ? 's' : ''}`);
  if (!parts.length) return '';
  const total = warnings + infos;
  return `  ${parts.join(', ')} ${total === 1 ? 'remains' : 'remain'} — run cpto audit for details`;
}

// --- Fix helpers (fs I/O) ---

function makeDirectoryFixable(pattern) {
  return (dir) => {
    const dest = path.join(dir, COPILOT_IGNORE_PATH);
    if (!fs.existsSync(dest)) return null;
    const content = fs.readFileSync(dest, 'utf8');
    const base = pattern.replace('/**', '/');
    if (content.includes(base)) return null;
    const suffix = content.endsWith('\n') ? '' : '\n';
    fs.appendFileSync(dest, `${suffix}${pattern}\n`);
    return `${COPILOT_IGNORE_PATH} (added ${pattern})`;
  };
}

function makeExcludeFixable(filename) {
  return (dir) => {
    const dest = path.join(dir, COPILOT_IGNORE_PATH);
    if (!fs.existsSync(dest)) return null;
    const content = fs.readFileSync(dest, 'utf8');
    if (content.split('\n').some(line => line.trim() === filename || line.trim() === `/${filename}`)) return null;
    const suffix = content.endsWith('\n') ? '' : '\n';
    fs.appendFileSync(dest, `${suffix}${filename}\n`);
    return `${COPILOT_IGNORE_PATH} (added ${filename})`;
  };
}

const FIXABLE = {
  'copilot-md': (dir) => {
    const date = new Date().toISOString().split('T')[0];
    const dest = path.join(dir, COPILOT_MD_PATH);
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buildCopilotMd('Application', 'Your stack', 'See README', date), 'utf8');
      return COPILOT_MD_PATH;
    }
  },
  'copilotignore': (dir) => {
    const dest = path.join(dir, COPILOT_IGNORE_PATH);
    if (!fs.existsSync(dest)) {
      fs.writeFileSync(dest, getCopilotIgnore(null), 'utf8');
      return COPILOT_IGNORE_PATH;
    }
  },
  'essential-files': (dir) => {
    const date = new Date().toISOString().split('T')[0];
    const created = [];
    const files = [
      [COMMON_MISTAKES_PATH, buildCommonMistakesMd(date)],
      [QUICK_START_PATH, buildQuickStartMd(date)],
      [ARCHITECTURE_MAP_PATH, buildArchitectureMapMd(date)],
    ];
    for (const [rel, content] of files) {
      const dest = path.join(dir, rel);
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, content, 'utf8');
        created.push(rel);
      }
    }
    return created.length ? created.join(', ') : null;
  },
  'docs-index': (dir) => {
    const date = new Date().toISOString().split('T')[0];
    const dest = path.join(dir, DOCS_INDEX_PATH);
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buildDocsIndexMd(date), 'utf8');
      return DOCS_INDEX_PATH;
    }
  },
};

for (const { filename, fixKey } of FILE_EXCLUSIONS) {
  FIXABLE[fixKey] = makeExcludeFixable(filename);
}

FIXABLE['sessions-cover']    = makeDirectoryFixable(`${SESSIONS_DIR}/**`);
FIXABLE['completions-cover'] = makeDirectoryFixable(`${COMPLETIONS_DIR}/**`);
FIXABLE['archive-cover']     = makeDirectoryFixable('docs/archive/**');

// --- Public API ---

export function applyFixes(dir, results) {
  const created = [];
  for (const r of results) {
    if (!r.pass && r.fixKey && FIXABLE[r.fixKey]) {
      const result = FIXABLE[r.fixKey](dir);
      if (result) created.push(result);
    }
  }
  return created;
}

export function runAudit(dir) {
  const results = [];
  const copilotMdPath = path.join(dir, COPILOT_MD_PATH);
  const copilotMdExists = fs.existsSync(copilotMdPath);
  results.push(check(`${COPILOT_MD_PATH} present`, copilotMdExists, 'error',
    copilotMdExists ? null : 'Run: cpto init  (or: cpto audit --fix)', 'copilot-md'));

  if (copilotMdExists) {
    const content = fs.readFileSync(copilotMdPath, 'utf8');
    results.push(...checkCopilotMdContent(content));
  }

  const ignoreExists = fs.existsSync(path.join(dir, COPILOT_IGNORE_PATH));
  results.push(check(`${COPILOT_IGNORE_PATH} present`, ignoreExists, 'info',
    ignoreExists ? null : 'Run: cpto init  (or: cpto audit --fix)', 'copilotignore'));

  if (ignoreExists) {
    const ignoreContent = fs.readFileSync(path.join(dir, COPILOT_IGNORE_PATH), 'utf8');
    results.push(...checkIgnoreContent(ignoreContent));
  }

  const presentCount = ESSENTIAL_FILES.filter(f => fs.existsSync(path.join(dir, f))).length;
  results.push(check(
    `Essential files present (${presentCount}/${ESSENTIAL_FILES.length})`,
    presentCount === ESSENTIAL_FILES.length,
    'info',
    presentCount < ESSENTIAL_FILES.length ? 'Run: cpto init  (or: cpto audit --fix)' : null,
    'essential-files',
  ));

  const docsIndexExists = fs.existsSync(path.join(dir, DOCS_INDEX_PATH));
  results.push(check('docs/INDEX.md present', docsIndexExists, 'info',
    docsIndexExists ? null : 'Run: cpto init  (or: cpto audit --fix)', 'docs-index'));

  return results;
}

export async function auditCommand(options) {
  const dir = process.cwd();
  const useColor = process.stdout.isTTY;
  const results = runAudit(dir);

  if (options?.fix) {
    const created = applyFixes(dir, results);
    if (created.length) {
      for (const f of created) console.log(`🔧 Auto-fix: ${f}`);
      console.log('');
    } else {
      console.log('✓ Nothing to fix.');
      return;
    }
    const fixed = runAudit(dir);
    const { errors: errCount, warnings: warnCount, infos: infoCount } = summarizeCounts(fixed);
    const remaining = fixed.filter(r => !r.pass && r.severity === 'error');
    if (!errCount) {
      console.log('✓ No more errors.');
    } else {
      for (const r of remaining) {
        const msg = r.detail ? `${r.label} — ${r.detail}` : r.label;
        console.log(`  ✗ ${msg}`);
      }
    }
    const fixSummary = buildFixSummary(warnCount, infoCount);
    if (fixSummary) console.log(fixSummary);
    console.log('');
    return;
  }

  const { errors, warnings, infos } = summarizeCounts(results);

  if (options?.json) {
    process.stdout.write(JSON.stringify({ results, errors, warnings, infos }, null, 2) + '\n');
    process.exit(errors > 0 ? 1 : 0);
  }

  const green = s => useColor ? chalk.green(s) : s;
  const red = s => useColor ? chalk.red(s) : s;
  const yellow = s => useColor ? chalk.yellow(s) : s;
  const dim = s => useColor ? chalk.dim(s) : s;
  const bold = s => useColor ? chalk.bold(s) : s;

  console.log('');
  console.log(bold('cpto audit — .github/copilot-instructions.md health report'));
  console.log('');

  for (const line of formatResults(results, useColor)) {
    console.log(line);
  }

  console.log('');
  const summary = [];
  if (errors) summary.push(red(`${errors} error${errors > 1 ? 's' : ''}`));
  if (warnings) summary.push(yellow(`${warnings} warning${warnings > 1 ? 's' : ''}`));
  if (infos) summary.push(dim(`${infos} info item${infos > 1 ? 's' : ''}`));
  if (!summary.length) summary.push(green('all checks passed'));
  console.log(summary.join(', '));
  const fixable = results.filter(r => !r.pass && r.fixKey);
  if (fixable.length) {
    console.log(dim(`  → Run cpto audit --fix to resolve ${fixable.length} fixable issue${fixable.length > 1 ? 's' : ''}`));
  }
  console.log('');

  if (errors > 0) process.exit(1);
}
