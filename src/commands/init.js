import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { getCopilotIgnore, isKnownFramework, detectFramework, SUPPORTED_FRAMEWORKS } from '../lib/frameworks.js';
import { hooksCommand } from './hooks.js';

function prompt(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

export function buildCopilotMd(projectType, techStack, mainFeatures, date) {
  return `# GitHub Copilot Instructions

**Keep this file lean. Route deeper context through the linked docs below.**

---

## Project Overview

${projectType} for ${mainFeatures}

**Tech Stack**: ${techStack}

---

## Session Start Protocol ⚡

Use this file as the startup summary for Copilot Chat. For non-trivial work, consult the three core references before editing:

\`\`\`bash
# High-signal docs (~800 tokens total)
✓ .copilot/COMMON_MISTAKES.md      # ⚠️ CRITICAL - Read FIRST
✓ .copilot/QUICK_START.md          # Essential commands
✓ .copilot/ARCHITECTURE_MAP.md     # File locations
\`\`\`

**Load topic docs only when the task needs them:**
- Use \`docs/INDEX.md\` to find deep-dive notes in \`docs/learnings/\`
- Pull in only the topic files that match the current task

**At task completion:**
- Create completion doc in \`.copilot/completions/YYYY-MM-DD-task-name.md\`
- Move session file to \`.copilot/sessions/archive/\` (if created)

**⚠️ NEVER auto-load:**
- Files in \`.copilot/completions/\` (0 token cost)
- Files in \`.copilot/sessions/\` (0 token cost)
- Files in \`docs/archive/\` (0 token cost)

---

## Quick Start Commands

\`\`\`bash
# Add your common commands here
\`\`\`

---

**Last Updated**: ${date}
**Optimized with**: [Copilot Token Optimizer](https://github.com/nadimtuhin/copilot-token-optimizer)
`;
}

export function buildCommonMistakesMd(date) {
  return `# Common Mistakes

**⚠️ CRITICAL - Read at session start**

---

## Top 5 Critical Mistakes

### 1. [Add Your First Critical Mistake]

**Symptom**:
**Check**:
**Fix**:

### 2. [Add Second Mistake]

### 3. [Add Third Mistake]

### 4. [Add Fourth Mistake]

### 5. [Add Fifth Mistake]

---

**Last Updated**: ${date}
`;
}

export function buildQuickStartMd(date) {
  return `# Quick Start Commands

---

## Development

\`\`\`bash
# Start development server

# Run tests

# Build for production
\`\`\`

---

**Last Updated**: ${date}
`;
}

export function buildArchitectureMapMd(date) {
  return `# Architecture Map

---

## Directory Structure

\`\`\`
project/
├── [Add your structure]
\`\`\`

## Key File Locations

- **Configuration**:
- **Main entry**:
- **Tests**:

---

**Last Updated**: ${date}
`;
}

export function buildSessionProtocolSection() {
  return `## Session Start Protocol ⚡

Use this file as the startup summary for Copilot Chat. For non-trivial work, consult the three core references before editing:

\`\`\`bash
# High-signal docs (~800 tokens total)
✓ .copilot/COMMON_MISTAKES.md      # ⚠️ CRITICAL - Read FIRST
✓ .copilot/QUICK_START.md          # Essential commands
✓ .copilot/ARCHITECTURE_MAP.md     # File locations
\`\`\`

**Load topic docs only when the task needs them:**
- Use \`docs/INDEX.md\` to find deep-dive notes in \`docs/learnings/\`
- Pull in only the topic files that match the current task

**At task completion:**
- Create completion doc in \`.copilot/completions/YYYY-MM-DD-task-name.md\`
- Move session file to \`.copilot/sessions/archive/\` (if created)

**⚠️ NEVER auto-load:**
- Files in \`.copilot/completions/\` (0 token cost)
- Files in \`.copilot/sessions/\` (0 token cost)
- Files in \`docs/archive/\` (0 token cost)`;
}

// Returns section names missing from existingContent
export function getMissingCtoSections(existingContent) {
  const missing = [];
  if (!existingContent.includes('## Session Start Protocol')) {
    missing.push('Session Start Protocol');
  }
  return missing;
}

// Appends missing cpto sections to existingContent, returns new content
export function appendCtoSections(existingContent, date) {
  const missing = getMissingCtoSections(existingContent);
  if (missing.length === 0) return { content: existingContent, added: [] };

  const ctoFooter = `\n\n---\n\n**Last Updated**: ${date}\n**Optimized with**: [Copilot Token Optimizer](https://github.com/nadimtuhin/copilot-token-optimizer)\n`;

  // Strip existing cpto footer to avoid duplication before re-appending
  const stripped = existingContent.replace(
    /\n*---\n+\*\*Last Updated\*\*:[^\n]*\n\*\*Optimized with\*\*:[^\n]*\n?$/,
    ''
  ).trimEnd();

  const additions = missing.map(name => {
    if (name === 'Session Start Protocol') return `\n\n---\n\n${buildSessionProtocolSection()}`;
    return '';
  }).join('');

  return { content: stripped + additions + ctoFooter, added: missing };
}

export function buildDocsIndexMd(date) {
  return `# Documentation Index

---

## Core Copilot Context (~800 tokens)

- \`.github/copilot-instructions.md\` (~450 tokens)
- \`.copilot/COMMON_MISTAKES.md\` (~350 tokens)
- \`.copilot/QUICK_START.md\` (~100 tokens)
- \`.copilot/ARCHITECTURE_MAP.md\` (~150 tokens)

## Task-Specific Topics (Load Only When Needed)

Add topic files in \`docs/learnings/\` and list them here.

---

**Last Updated**: ${date}
`;
}

// Pure: returns the list of dirs to create
export function getInitDirs() {
  return [
    '.copilot/completions',
    '.copilot/sessions/active',
    '.copilot/sessions/archive',
    '.copilot/templates',
    'docs/learnings',
    'docs/archive',
  ];
}

// Writes all generated files into dir
export function writeInitFiles(dir, fw, projectType, techStack, mainFeatures, date) {
  writeFile(path.join(dir, '.copilotignore'), getCopilotIgnore(fw));
  writeFile(path.join(dir, '.github/copilot-instructions.md'), buildCopilotMd(projectType, techStack, mainFeatures, date));
  writeFile(path.join(dir, '.copilot', 'COMMON_MISTAKES.md'), buildCommonMistakesMd(date));
  writeFile(path.join(dir, '.copilot', 'QUICK_START.md'), buildQuickStartMd(date));
  writeFile(path.join(dir, '.copilot', 'ARCHITECTURE_MAP.md'), buildArchitectureMapMd(date));
  writeFile(path.join(dir, 'docs', 'INDEX.md'), buildDocsIndexMd(date));
}

// Returns { framework, detected, unknown } — pure-ish (calls detectFramework)
export function resolveFramework(framework, dir) {
  if (framework && !isKnownFramework(framework)) {
    return { framework: undefined, detected: null, unknown: framework };
  }
  const detected = framework ? null : detectFramework(dir);
  return { framework: framework ?? undefined, detected, unknown: null };
}

// Sync: returns default project info; null means "prompt needed"
export function resolveProjectInfo(yes, framework) {
  if (yes || framework) {
    return {
      projectType: framework ? `${framework} application` : 'Application',
      techStack: framework ?? 'Unknown',
      mainFeatures: 'See README',
    };
  }
  return null;
}

// Async: prompts user for project info via readline interface
export async function promptProjectInfo(rl) {
  const projectType = await prompt(rl, 'Project Type (e.g., Express, Next.js, Django): ');
  const techStack = await prompt(rl, 'Tech Stack (e.g., Express, PostgreSQL, Prisma): ');
  const mainFeatures = await prompt(rl, 'Main Features (brief description): ');
  return { projectType, techStack, mainFeatures };
}

export function printHeader() {
  console.log('');
  console.log(chalk.bold('╔════════════════════════════════════════════════╗'));
  console.log(chalk.bold('║   Copilot Token Optimizer - Project Setup       ║'));
  console.log(chalk.bold('╚════════════════════════════════════════════════╝'));
  console.log('');
}

export function printFrameworkInfo({ framework, detected, unknown }) {
  if (unknown) {
    console.log(chalk.yellow(`⚠️  Unknown framework "${unknown}". Supported: ${SUPPORTED_FRAMEWORKS.join(', ')}`));
  }
  if (!framework && detected) {
    console.log(chalk.dim(`🔍 Auto-detected: ${detected}  (from config file)`));
    console.log('');
  } else if (!framework && !detected) {
    console.log(chalk.dim('ℹ️  No framework detected — using base .copilotignore'));
    console.log('');
  }
}

export function printSetupComplete() {
  console.log('');
  console.log(chalk.green('✅ Setup Complete!'));
  console.log('');
  console.log('📊 Token Optimization:');
  console.log('   • Session start: ~800 tokens (vs ~8,000 before)');
  console.log('   • Savings: ~88% reduction ⚡');
  console.log('');
}

export function printNextSteps() {
  console.log('📝 Next Steps:');
  console.log(`   1. Customize ${chalk.cyan('.copilot/COMMON_MISTAKES.md')}`);
  console.log(`   2. Update ${chalk.cyan('.copilot/QUICK_START.md')} with your commands`);
  console.log(`   3. Fill in ${chalk.cyan('.copilot/ARCHITECTURE_MAP.md')}`);
  console.log(`   4. Add to CI: ${chalk.cyan('npx copilot-token-optimizer audit --json')}`);
  console.log('');
  console.log(`   Run ${chalk.cyan('cpto measure')} to verify savings`);
  console.log('');
}

export async function maybeInstallHooks(installHooks, yes) {
  if (installHooks) {
    console.log(chalk.blue('🪝 Installing GitHub Copilot helper scripts...'));
    await hooksCommand('install', null, { all: true });
    console.log('');
    console.log(chalk.dim('GitHub Copilot does not expose native pre/post tool hooks in the CLI.'));
    console.log(chalk.dim('Use these scripts from VS Code tasks, wrapper commands, or CI:'));
    await hooksCommand('settings');
    console.log('');
    return;
  }
  if (!yes) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ans = await new Promise(resolve => rl.question(
      chalk.blue('🪝 Install GitHub Copilot helper scripts for token monitoring? (y/N) '),
      resolve
    ));
    rl.close();
    console.log('');
    if (ans.trim().toLowerCase() === 'y') {
      console.log(chalk.blue('Installing hooks...'));
      await hooksCommand('install', null, { all: true });
      console.log('');
      console.log(chalk.dim('GitHub Copilot does not expose native pre/post tool hooks in the CLI.'));
      console.log(chalk.dim('Use these scripts from VS Code tasks, wrapper commands, or CI:'));
      await hooksCommand('settings');
      console.log('');
    } else {
      console.log(chalk.dim('Skipped. Run: cpto hooks install --all  to add later.'));
      console.log('');
    }
  }
}

export async function runInit(dir, options) {
  const date = new Date().toISOString().split('T')[0];
  const { projectType, techStack, mainFeatures, framework, force } = options;

  const copilotMdPath = path.join(dir, '.github/copilot-instructions.md');

  for (const d of getInitDirs()) {
    fs.mkdirSync(path.join(dir, d), { recursive: true });
  }

  const fw = (framework ?? detectFramework(dir))?.toLowerCase();

  if (fs.existsSync(copilotMdPath) && !force) {
    const existing = fs.readFileSync(copilotMdPath, 'utf8');
    const { content, added } = appendCtoSections(existing, date);
    if (added.length === 0) {
      return { created: false, merged: false, added: [] };
    }
    fs.writeFileSync(copilotMdPath, content, 'utf8');
    const writeIfMissing = (p, c) => { if (!fs.existsSync(p)) writeFile(p, c); };
    writeIfMissing(path.join(dir, '.copilotignore'), getCopilotIgnore(fw));
    writeIfMissing(path.join(dir, '.copilot', 'COMMON_MISTAKES.md'), buildCommonMistakesMd(date));
    writeIfMissing(path.join(dir, '.copilot', 'QUICK_START.md'), buildQuickStartMd(date));
    writeIfMissing(path.join(dir, '.copilot', 'ARCHITECTURE_MAP.md'), buildArchitectureMapMd(date));
    writeIfMissing(path.join(dir, 'docs', 'INDEX.md'), buildDocsIndexMd(date));
    return { created: false, merged: true, added };
  }

  writeInitFiles(dir, fw, projectType, techStack, mainFeatures, date);
  return { created: true, merged: false, added: [] };
}

export async function initCommand(options) {
  printHeader();

  let { framework, yes, force, hooks: installHooks } = options;
  const resolved = resolveFramework(framework, process.cwd());
  framework = resolved.framework;
  printFrameworkInfo(resolved);

  let projectInfo = resolveProjectInfo(yes, framework ?? resolved.detected);
  if (!projectInfo) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log(chalk.blue('📋 Project Information'));
    console.log('');
    projectInfo = await promptProjectInfo(rl);
    rl.close();
    console.log('');
  }

  console.log(chalk.green('📁 Creating directory structure...'));
  const { created, merged, added } = await runInit(process.cwd(), { framework, ...projectInfo, force });

  if (!created && !merged) {
    console.log(chalk.dim('ℹ️  .github/copilot-instructions.md already has all cpto sections. No changes needed.'));
    console.log(chalk.dim('   Run with --force to overwrite completely.'));
    console.log('');
    return;
  }

  if (merged) {
    console.log('');
    console.log(chalk.green('✅ .github/copilot-instructions.md updated!'));
    console.log('');
    console.log(`📝 Appended missing sections: ${added.map(s => chalk.cyan(s)).join(', ')}`);
    console.log('');
  } else {
    printSetupComplete();
  }
  await maybeInstallHooks(installHooks, yes);
  printNextSteps();
}
