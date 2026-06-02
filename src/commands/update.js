import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execSync, spawnSync } from 'node:child_process';
import { appendCtoSections } from './init.js';
import { hooksCommand } from './hooks.js';

const { version: current } = createRequire(import.meta.url)('../../package.json');

function getLatestVersion() {
  try {
    const out = execSync('npm view copilot-token-optimizer version', { encoding: 'utf8', timeout: 10000 });
    return out.trim();
  } catch {
    return null;
  }
}

function isGlobalInstall() {
  try {
    const out = execSync('npm list -g copilot-token-optimizer --depth=0 2>/dev/null', { encoding: 'utf8' });
    return out.includes('copilot-token-optimizer');
  } catch {
    return false;
  }
}

async function updateContent(dir) {
  const date = new Date().toISOString().split('T')[0];
  let anyChange = false;

  // 1. .github/copilot-instructions.md — append missing sections only
  const copilotMdPath = path.join(dir, '.github/copilot-instructions.md');
  if (fs.existsSync(copilotMdPath)) {
    const existing = fs.readFileSync(copilotMdPath, 'utf8');
    const { content, added } = appendCtoSections(existing, date);
    if (added.length > 0) {
      fs.writeFileSync(copilotMdPath, content, 'utf8');
      console.log(chalk.green(`  ✓ .github/copilot-instructions.md — appended: ${added.join(', ')}`));
      anyChange = true;
    } else {
      console.log(chalk.dim('  · .github/copilot-instructions.md — already up to date'));
    }
  } else {
    console.log(chalk.yellow('  ⚠ .github/copilot-instructions.md not found — run cpto init first'));
  }

  // 2. Hook templates — re-install any hooks that are already installed
  const hooksDir = path.join(dir, '.copilot', 'hooks');
  if (fs.existsSync(hooksDir)) {
    const installed = fs.readdirSync(hooksDir).filter(f => f.endsWith('.sh'));
    if (installed.length > 0) {
      for (const hook of installed) {
        const name = hook.replace(/\.sh$/, '');
        await hooksCommand('install', name, {});
      }
      console.log(chalk.green(`  ✓ hooks — refreshed ${installed.length} installed hook(s)`));
      anyChange = true;
    } else {
      console.log(chalk.dim('  · hooks — none installed'));
    }
  } else {
    console.log(chalk.dim('  · hooks — none installed'));
  }

  if (!anyChange) {
    console.log('');
    console.log(chalk.dim('  All project content is already current.'));
  }
  console.log('');
}

export async function updateCommand(opts) {
  const dir = process.cwd();

  if (opts.content) {
    console.log('');
    console.log(chalk.bold('Updating project content...'));
    console.log('');
    await updateContent(dir);
    return;
  }

  console.log('');
  console.log(chalk.bold('Checking for updates...'));
  console.log('');

  const latest = getLatestVersion();

  if (!latest) {
    console.log(chalk.red('✗ Could not reach npm registry. Check your internet connection.'));
    process.exit(1);
  }

  console.log(`  Current : ${chalk.dim(current)}`);
  console.log(`  Latest  : ${chalk.green(latest)}`);
  console.log('');

  if (current === latest) {
    console.log(chalk.green('✓ Already up to date.'));
    console.log('');
    console.log(chalk.dim(`  Run ${chalk.cyan('cpto update --content')} to refresh project files (.github/copilot-instructions.md sections, hook scripts).`));
    console.log('');
    return;
  }

  const global = isGlobalInstall();

  if (global) {
    console.log(chalk.blue(`Updating ${current} → ${latest} (global install)...`));
    console.log('');
    const result = spawnSync('npm', ['install', '-g', `copilot-token-optimizer@${latest}`], {
      stdio: 'inherit',
      shell: false,
    });
    if (result.status !== 0) {
      console.log('');
      console.log(chalk.red('✗ Update failed. Try manually:'));
      console.log(`  npm install -g copilot-token-optimizer@${latest}`);
      process.exit(1);
    }
    console.log('');
    console.log(chalk.green(`✓ Updated to ${latest}`));
    console.log('');
    console.log(chalk.dim(`  Run ${chalk.cyan('cpto update --content')} to refresh project files too.`));
  } else {
    console.log(chalk.yellow(`ℹ cpto is not globally installed — cannot self-update.`));
    console.log('');
    console.log('Run one of:');
    console.log(`  ${chalk.cyan(`npm install -g copilot-token-optimizer@${latest}`)}`);
    console.log(`  ${chalk.cyan(`curl -fsSL https://raw.githubusercontent.com/edixos/copilot-token-optimizer/main/install.sh | bash`)}`);
  }
  console.log('');
}
