import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import { HOOKS_DIR, HOOKS_SCRIPTS_DIR, PACKAGE_NAME } from '../lib/paths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const TEMPLATES_DIR = path.resolve(__dirname, '../../templates/hooks');
const HOOKS_SCRIPTS_INSTALL_DIR = path.join(process.cwd(), HOOKS_SCRIPTS_DIR);

// --- Pure functions (no fs, no console, no process) ---

export function parseHookMeta(content) {
  const event = (content.match(/^# EVENT:\s*(.+)$/m) || [])[1]?.trim() ?? 'Unknown';
  const desc = (content.match(/^# DESCRIPTION:\s*(.+)$/m) || [])[1]?.trim() ?? '';
  return { event, desc };
}

export function buildSettingsBlock(installedHooks) {
  const byEvent = {};
  for (const hook of installedHooks) {
    if (!byEvent[hook.event]) byEvent[hook.event] = [];
    byEvent[hook.event].push(hook);
  }
  const hooksBlock = {};
  for (const [event, hooks] of Object.entries(byEvent)) {
    hooksBlock[event] = hooks.map(h => ({
      hooks: [{ type: 'command', command: `bash ${HOOKS_SCRIPTS_DIR}/${h.file}` }],
    }));
  }
  return {
    tool: PACKAGE_NAME,
    kind: 'helper-script-manifest',
    note: 'GitHub Copilot has no native CLI hook settings file; use these commands from VS Code tasks, wrapper scripts, or CI.',
    hooks: hooksBlock,
  };
}

export function formatHookLine(hook) {
  const status = hook.installed ? chalk.green('[installed]  ') : chalk.gray('[not installed]');
  const event = chalk.cyan(hook.event.padEnd(20));
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
      return { name: f.replace('.sh', ''), file: f, event, desc, installed };
    });
}

function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
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
  if (opts?.all) {
    fs.mkdirSync(installDir, { recursive: true });
    for (const hook of templates) {
      const dst = path.join(installDir, hook.file);
      fs.copyFileSync(path.join(templatesDir, hook.file), dst);
      fs.chmodSync(dst, 0o755);
      console.log(chalk.green(`✓ Installed: ${HOOKS_SCRIPTS_DIR}/${hook.file}`));
    }
    console.log(chalk.bold(`\n${templates.length} hooks installed.`));
    console.log(chalk.dim('Run: cpto hooks settings  to print a helper-script manifest'));
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
  _printSettingsHint(hook);
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
    console.log(`  ${chalk.green('✓')} ${t.name.padEnd(38)} ${chalk.cyan(t.event.padEnd(20))} modified ${age}m ago`);
  }
}

export function settingsHooks(templatesDir, installDir) {
  const templates = readTemplates(templatesDir, installDir);
  const installed = templates.filter(t => t.installed);
  if (installed.length === 0) {
    console.log('No hooks installed. Run: cpto hooks install --all  first.');
    return;
  }
  const output = JSON.stringify(buildSettingsBlock(installed), null, 2);
  console.log(output);
  if (process.stdout.isTTY) {
    console.log(chalk.dim('\nGitHub Copilot does not expose a native CLI hook settings file.'));
    console.log(chalk.dim('Use this JSON as a manifest for VS Code tasks, wrapper scripts, or CI.'));
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

function _printSettingsHint(hook) {
  console.log(chalk.dim('\nGitHub Copilot does not expose a native CLI hook settings file.'));
  console.log(chalk.dim('Run this helper script from a VS Code task, wrapper, or CI step:'));
  console.log(chalk.dim(`  bash ${HOOKS_SCRIPTS_DIR}/${hook.file}`));
}
