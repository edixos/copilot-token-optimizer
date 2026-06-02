import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import { HOOKS_DIR, HOOKS_SCRIPTS_DIR, PACKAGE_NAME } from '../lib/paths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const TEMPLATES_DIR = path.resolve(__dirname, '../../templates/hooks');
const HOOKS_SCRIPTS_INSTALL_DIR = path.join(process.cwd(), HOOKS_SCRIPTS_DIR);
const HOOKS_CONFIG_FILE = 'cpto-token-optimizer.json';

// Map template EVENT metadata (PascalCase / legacy) → native camelCase hook event names
// Reference: https://docs.github.com/en/copilot/reference/hooks-reference#hook-events
const EVENT_MAP = {
  PreToolUse: 'preToolUse',
  PostToolUse: 'postToolUse',
  UserPromptSubmit: 'userPromptSubmitted',
  Stop: 'agentStop',
  Notification: 'notification',
  SessionStart: 'sessionStart',
  SessionEnd: 'sessionEnd',
  ErrorOccurred: 'errorOccurred',
};

export function mapEventToNative(event) {
  return EVENT_MAP[event] ?? event;
}

// --- Pure functions (no fs, no console, no process) ---

export function parseHookMeta(content) {
  const event = (content.match(/^# EVENT:\s*(.+)$/m) || [])[1]?.trim() ?? 'Unknown';
  const desc = (content.match(/^# DESCRIPTION:\s*(.+)$/m) || [])[1]?.trim() ?? '';
  return { event, desc };
}

export function buildNativeHooksConfig(installedHooks) {
  const byEvent = {};
  for (const hook of installedHooks) {
    const nativeEvent = mapEventToNative(hook.event);
    if (!byEvent[nativeEvent]) byEvent[nativeEvent] = [];
    byEvent[nativeEvent].push(hook);
  }
  const hooksBlock = {};
  for (const [event, hooks] of Object.entries(byEvent)) {
    hooksBlock[event] = hooks.map(h => {
      const entry = {
        type: 'command',
        bash: `./${HOOKS_SCRIPTS_DIR}/${h.file}`,
        cwd: '.',
        timeoutSec: 30,
      };
      // preToolUse hooks can use matcher to filter tool names
      if (event === 'preToolUse' && h.matcher) {
        entry.matcher = h.matcher;
      }
      return entry;
    });
  }
  return { version: 1, hooks: hooksBlock };
}

// Legacy alias for tests that import buildSettingsBlock
export const buildSettingsBlock = buildNativeHooksConfig;

export function formatHookLine(hook) {
  const nativeEvent = mapEventToNative(hook.event);
  const status = hook.installed ? chalk.green('[installed]  ') : chalk.gray('[not installed]');
  const event = chalk.cyan(nativeEvent.padEnd(20));
  return `  ${hook.name.padEnd(38)} ${status} ${event} ${hook.desc}`;
}

// --- Filesystem helpers ---

export function readTemplates(templatesDir, installDir) {
  if (!fs.existsSync(templatesDir)) return [];
  return fs.readdirSync(templatesDir)
    .filter(f => f.endsWith('.sh'))
    .map(f => {
      const content = fs.readFileSync(path.join(templatesDir, f), 'utf8');
      const { event, desc } = parseHookMeta(content);
      const installed = fs.existsSync(path.join(installDir, f));
      // Extract matcher from template if present
      const matcherMatch = content.match(/^# MATCHER:\s*(.+)$/m);
      const matcher = matcherMatch ? matcherMatch[1].trim() : undefined;
      return { name: f.replace('.sh', ''), file: f, event, desc, installed, matcher };
    });
}

function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

// Write the native .github/hooks/cpto-token-optimizer.json config
export function writeNativeConfig(hooksDir, installedHooks) {
  const config = buildNativeHooksConfig(installedHooks);
  fs.mkdirSync(hooksDir, { recursive: true });
  const configPath = path.join(hooksDir, HOOKS_CONFIG_FILE);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
  return configPath;
}

// --- Subcommand handlers ---

export function listHooks(templatesDir, installDir) {
  const templates = readTemplates(templatesDir, installDir);
  if (templates.length === 0) {
    console.log(chalk.yellow('No hook templates found in templates/hooks/'));
    return;
  }
  console.log(chalk.bold('\nAvailable hooks:\n'));
  for (const t of templates) {
    console.log(formatHookLine(t));
  }
  console.log(chalk.dim('\nRun: cpto hooks install <name>'));
}

export function installHook(name, templatesDir, installDir, opts) {
  const templates = readTemplates(templatesDir, installDir);
  // Derive hooks config dir: installDir is .github/scripts/copilot-hooks/ → .github/hooks/
  const configDir = path.resolve(installDir, '..', '..', 'hooks');
  if (opts?.all) {
    fs.mkdirSync(installDir, { recursive: true });
    for (const hook of templates) {
      const dst = path.join(installDir, hook.file);
      fs.copyFileSync(path.join(templatesDir, hook.file), dst);
      fs.chmodSync(dst, 0o755);
      console.log(chalk.green(`✓ Installed: ${HOOKS_SCRIPTS_DIR}/${hook.file}`));
    }
    // Write native hook configuration
    const configPath = writeNativeConfig(configDir, templates);
    console.log(chalk.green(`✓ Config:    ${HOOKS_DIR}/${HOOKS_CONFIG_FILE}`));
    console.log(chalk.bold(`\n${templates.length} hooks installed.`));
    console.log(chalk.dim(`Native config written to ${path.relative(process.cwd(), configPath)}`));
    return;
  }
  if (!name) {
    console.error(chalk.red('Usage: cpto hooks install <name>  or  cpto hooks install --all'));
    process.exit(1);
  }
  const hook = templates.find(t => t.name === name);
  if (!hook) {
    console.error(chalk.red(`Hook not found: ${name}`));
    console.error(chalk.dim(`Available: ${templates.map(t => t.name).join(', ')}`));
    process.exit(1);
  }
  fs.mkdirSync(installDir, { recursive: true });
  const dst = path.join(installDir, hook.file);
  fs.copyFileSync(path.join(templatesDir, hook.file), dst);
  fs.chmodSync(dst, 0o755);
  console.log(chalk.green(`✓ Installed: ${HOOKS_SCRIPTS_DIR}/${hook.file}`));
  // Regenerate native config with current installed set
  const installed = readTemplates(templatesDir, installDir).filter(t => t.installed);
  writeNativeConfig(configDir, installed);
  console.log(chalk.green(`✓ Updated:   ${HOOKS_DIR}/${HOOKS_CONFIG_FILE}`));
}

export async function removeHook(name, installDir, opts) {
  if (!name) {
    console.error(chalk.red('Usage: cpto hooks remove <name>'));
    process.exit(1);
  }
  const dst = path.join(installDir, `${name}.sh`);
  if (!fs.existsSync(dst)) {
    console.error(chalk.red(`Not installed: ${name}`));
    process.exit(1);
  }
  if (!opts?.yes) {
    const ans = await confirm(`Remove ${HOOKS_SCRIPTS_DIR}/${name}.sh? [y/N] `);
    if (ans.trim().toLowerCase() !== 'y') { console.log('Cancelled.'); return; }
  }
  fs.unlinkSync(dst);
  console.log(chalk.green(`✓ Removed: ${HOOKS_SCRIPTS_DIR}/${name}.sh`));
  // Regenerate native config without the removed hook
  const configDir = path.resolve(installDir, '..', '..', 'hooks');
  const templatesDir = TEMPLATES_DIR;
  const remaining = readTemplates(templatesDir, installDir).filter(t => t.installed);
  if (remaining.length > 0) {
    writeNativeConfig(configDir, remaining);
    console.log(chalk.green(`✓ Updated:   ${HOOKS_DIR}/${HOOKS_CONFIG_FILE}`));
  } else {
    const configPath = path.join(configDir, HOOKS_CONFIG_FILE);
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
      console.log(chalk.dim(`  Removed empty config: ${HOOKS_DIR}/${HOOKS_CONFIG_FILE}`));
    }
  }
}

export function statusHooks(templatesDir, installDir) {
  const templates = readTemplates(templatesDir, installDir);
  const installed = templates.filter(t => t.installed);
  if (installed.length === 0) {
    console.log('No hooks installed. Run: cpto hooks install <name>');
    return;
  }
  console.log(chalk.bold('\nInstalled hooks:\n'));
  for (const t of installed) {
    const stat = fs.statSync(path.join(installDir, t.file));
    const age = Math.round((Date.now() - stat.mtimeMs) / 60000);
    const nativeEvent = mapEventToNative(t.event);
    console.log(`  ${chalk.green('✓')} ${t.name.padEnd(38)} ${chalk.cyan(nativeEvent.padEnd(20))} modified ${age}m ago`);
  }
  const configPath = path.join(process.cwd(), HOOKS_DIR, HOOKS_CONFIG_FILE);
  if (fs.existsSync(configPath)) {
    console.log(chalk.dim(`\n  Native config: ${HOOKS_DIR}/${HOOKS_CONFIG_FILE}`));
  }
}

export function settingsHooks(templatesDir, installDir) {
  const templates = readTemplates(templatesDir, installDir);
  const installed = templates.filter(t => t.installed);
  if (installed.length === 0) {
    console.log('No hooks installed. Run: cpto hooks install --all  first.');
    return;
  }
  const config = buildNativeHooksConfig(installed);
  const output = JSON.stringify(config, null, 2);
  console.log(output);
  if (process.stdout.isTTY) {
    console.log(chalk.dim(`\nThis JSON is written to ${HOOKS_DIR}/${HOOKS_CONFIG_FILE}`));
    console.log(chalk.dim('Copilot CLI loads it automatically from .github/hooks/ on session start.'));
  }
}

// --- Dispatcher ---

export async function hooksCommand(sub, name, opts) {
  sub = sub ?? 'list';
  const tDir = TEMPLATES_DIR;
  const iDir = HOOKS_SCRIPTS_INSTALL_DIR;

  if (sub === 'list')     return listHooks(tDir, iDir);
  if (sub === 'install')  return installHook(name, tDir, iDir, opts);
  if (sub === 'remove')   return removeHook(name, iDir, opts);
  if (sub === 'status')   return statusHooks(tDir, iDir);
  if (sub === 'settings') return settingsHooks(tDir, iDir);

  console.error(chalk.red(`Unknown subcommand: ${sub}`));
  console.error('Usage: cpto hooks [list|install|remove|status|settings]');
  process.exit(1);
}
