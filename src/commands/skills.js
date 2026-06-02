import chalk from 'chalk';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Source: bundled templates inside this package
export const SKILLS_TEMPLATE_DIR = path.resolve(__dirname, '../../templates/skills');

// Install destinations
export const SKILLS_LOCAL_SUBDIR = '.github/skills';
export function getSkillsLocalDir(cwd = process.cwd()) {
  return path.join(cwd, SKILLS_LOCAL_SUBDIR);
}
export function getSkillsGlobalDir() {
  return path.join(os.homedir(), '.agents', 'skills');
}

// ─── pure helpers ─────────────────────────────────────────────────────────────

/**
 * Returns names of available skill directories in SKILLS_TEMPLATE_DIR.
 */
export function getAvailableSkills() {
  if (!fs.existsSync(SKILLS_TEMPLATE_DIR)) return [];
  return fs.readdirSync(SKILLS_TEMPLATE_DIR).filter(entry => {
    return fs.statSync(path.join(SKILLS_TEMPLATE_DIR, entry)).isDirectory();
  });
}

/**
 * Checks whether a skill is installed in a given destination directory.
 */
export function isSkillInstalled(skillName, destDir) {
  return fs.existsSync(path.join(destDir, skillName));
}

/**
 * Copies a skill directory from source to destination (recursive).
 * Returns list of files written.
 */
export function copySkill(skillName, destDir) {
  const src = path.join(SKILLS_TEMPLATE_DIR, skillName);
  if (!fs.existsSync(src)) {
    throw new Error(`Skill "${skillName}" not found in templates.`);
  }
  const dest = path.join(destDir, skillName);
  fs.mkdirSync(dest, { recursive: true });
  return copyDirRecursive(src, dest);
}

function copyDirRecursive(src, dest) {
  const written = [];
  for (const entry of fs.readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    if (fs.statSync(srcPath).isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      written.push(...copyDirRecursive(srcPath, destPath));
    } else {
      fs.copyFileSync(srcPath, destPath);
      written.push(destPath);
    }
  }
  return written;
}

// ─── interactive helpers ───────────────────────────────────────────────────────

function prompt(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

/**
 * Prompts the user to pick install scope: local (.github/skills/) or global (~/.agents/skills/).
 * Returns 'local' | 'global' | null (if skipped).
 */
export async function promptSkillScope() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('');
  console.log(chalk.blue('📦 Skill install scope:'));
  console.log(`  ${chalk.cyan('1')} Local  → ${chalk.dim('.github/skills/')}  (this project only)`);
  console.log(`  ${chalk.cyan('2')} Global → ${chalk.dim('~/.agents/skills/')}  (available in all projects)`);
  console.log('');
  const ans = await prompt(rl, chalk.blue('Choose scope [1/2] (default: 1): '));
  rl.close();
  console.log('');
  const choice = ans.trim();
  if (choice === '2') return 'global';
  if (choice === '' || choice === '1') return 'local';
  return null;
}

// ─── sub-commands ──────────────────────────────────────────────────────────────

export function skillsList() {
  const available = getAvailableSkills();
  const localDir = getSkillsLocalDir();
  const globalDir = getSkillsGlobalDir();

  console.log('');
  console.log(chalk.bold('🧩 Available Skills'));
  console.log('');

  if (available.length === 0) {
    console.log(chalk.dim('  No skills found in templates/skills/.'));
    console.log('');
    return;
  }

  const maxLen = Math.max(...available.map(s => s.length));
  for (const skill of available) {
    const localOk = isSkillInstalled(skill, localDir);
    const globalOk = isSkillInstalled(skill, globalDir);

    const localStatus = localOk ? chalk.green('✓ local') : chalk.dim('· local');
    const globalStatus = globalOk ? chalk.green('✓ global') : chalk.dim('· global');

    // Read skill description from SKILL.md front-matter if available
    let desc = '';
    const skillMd = path.join(SKILLS_TEMPLATE_DIR, skill, 'SKILL.md');
    if (fs.existsSync(skillMd)) {
      const content = fs.readFileSync(skillMd, 'utf8');
      const nameMatch = content.match(/^name:\s*(.+)$/m);
      const descMatch = content.match(/^description:\s*['"]?(.+?)['"]?$/m);
      if (descMatch) {
        // Truncate long descriptions for readability
        const raw = (descMatch[1] ?? '').replace(/^'|'$/g, '').replace(/^"|"$/g, '');
        desc = raw.length > 60 ? raw.slice(0, 57) + '...' : raw;
      }
      void nameMatch; // used for future use
    }

    console.log(`  ${skill.padEnd(maxLen + 2)} ${localStatus}  ${globalStatus}  ${chalk.dim(desc)}`);
  }

  console.log('');
  console.log(chalk.dim(`  Install: cpto skills install <name>  |  cpto skills install --all`));
  console.log('');
}

export async function skillsInstall(name, options = {}) {
  const available = getAvailableSkills();

  if (available.length === 0) {
    console.error(chalk.red('✗ No skills available in templates/skills/.'));
    process.exit(1);
  }

  const targets = options.all ? available : [name].filter(Boolean);

  if (targets.length === 0) {
    console.error(chalk.red('✗ Specify a skill name or use --all.'));
    console.error(chalk.dim('  Example: cpto skills install init-cpto'));
    process.exit(1);
  }

  // Validate skill names before prompting for scope
  for (const t of targets) {
    if (!available.includes(t)) {
      console.error(chalk.red(`✗ Unknown skill: "${t}"`));
      console.error(chalk.dim(`  Available: ${available.join(', ')}`));
      process.exit(1);
    }
  }

  // Prompt for scope unless provided via options
  let scope = options.scope;
  if (!scope) {
    scope = await promptSkillScope();
    if (!scope) {
      console.log(chalk.dim('Invalid choice. Skipped.'));
      console.log('');
      return;
    }
  }

  const destDir = scope === 'global' ? getSkillsGlobalDir() : getSkillsLocalDir();
  const scopeLabel = scope === 'global'
    ? chalk.cyan('~/.agents/skills/')
    : chalk.cyan('.github/skills/');

  console.log(chalk.green(`📦 Installing to ${scopeLabel}`));
  console.log('');

  for (const skillName of targets) {
    try {
      const written = copySkill(skillName, destDir);
      console.log(chalk.green(`  ✓ ${skillName}`) + chalk.dim(` — ${written.length} file${written.length !== 1 ? 's' : ''} written`));
    } catch (err) {
      console.error(chalk.red(`  ✗ ${skillName}: ${err.message}`));
    }
  }

  console.log('');
  if (scope === 'global') {
    console.log(chalk.dim(`  Skills installed globally. Trigger with: @${targets[0]} in Copilot Chat`));
  } else {
    console.log(chalk.dim(`  Skills installed locally in .github/skills/`));
    console.log(chalk.dim(`  Trigger with: @${targets[0]} in Copilot Chat (this project)`));
  }
  console.log('');
}

// ─── command entry point ──────────────────────────────────────────────────────

export async function skillsCommand(subcommand, name, options = {}) {
  if (subcommand === 'list') {
    skillsList();
    return;
  }
  if (subcommand === 'install') {
    await skillsInstall(name, options);
    return;
  }
  console.error(chalk.red(`✗ Unknown skills sub-command: "${subcommand}"`));
  console.error(chalk.dim('  Usage: cpto skills list | cpto skills install <name> [--all]'));
  process.exit(1);
}
