import { describe, it, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  runInit,
  buildCopilotMd,
  buildCommonMistakesMd,
  buildQuickStartMd,
  buildArchitectureMapMd,
  buildDocsIndexMd,
  getInitDirs,
  resolveFramework,
  resolveProjectInfo,
  getMissingCtoSections,
  appendCtoSections,
} from '../src/commands/init.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CTO = path.join(ROOT, 'bin', 'cpto.js');

// ── unit — pure logic ──────────────────────────────────────────────────────

describe('unit — pure logic', () => {
  const DATE = '2026-01-01';

  describe('buildCopilotMd', () => {
    it('returns a string', () => {
      assert.equal(typeof buildCopilotMd('App', 'Node', 'API', DATE), 'string');
    });
    it('contains project type', () => {
      assert.ok(buildCopilotMd('MyApp', 'Node', 'API', DATE).includes('MyApp'));
    });
    it('contains tech stack', () => {
      assert.ok(buildCopilotMd('App', 'PostgreSQL', 'API', DATE).includes('PostgreSQL'));
    });
    it('contains main features', () => {
      assert.ok(buildCopilotMd('App', 'Node', 'REST endpoints', DATE).includes('REST endpoints'));
    });
    it('contains Last Updated date', () => {
      assert.ok(buildCopilotMd('App', 'Node', 'API', DATE).includes(DATE));
    });
  });

  describe('buildCommonMistakesMd', () => {
    it('returns a string containing date', () => {
      assert.ok(buildCommonMistakesMd(DATE).includes(DATE));
    });
    it('contains Critical heading', () => {
      assert.ok(buildCommonMistakesMd(DATE).includes('Common Mistakes'));
    });
  });

  describe('buildQuickStartMd', () => {
    it('returns a string containing date', () => {
      assert.ok(buildQuickStartMd(DATE).includes(DATE));
    });
    it('contains Quick Start heading', () => {
      assert.ok(buildQuickStartMd(DATE).includes('Quick Start'));
    });
  });

  describe('buildArchitectureMapMd', () => {
    it('returns a string containing date', () => {
      assert.ok(buildArchitectureMapMd(DATE).includes(DATE));
    });
    it('contains Architecture Map heading', () => {
      assert.ok(buildArchitectureMapMd(DATE).includes('Architecture Map'));
    });
  });

  describe('buildDocsIndexMd', () => {
    it('returns a string containing date', () => {
      assert.ok(buildDocsIndexMd(DATE).includes(DATE));
    });
    it('contains Documentation Index heading', () => {
      assert.ok(buildDocsIndexMd(DATE).includes('Documentation Index'));
    });
  });

  describe('getInitDirs', () => {
    it('returns an array', () => {
      assert.ok(Array.isArray(getInitDirs()));
    });
    it('includes .cpto/completions', () => {
      assert.ok(getInitDirs().includes('.cpto/completions'));
    });
    it('includes .github/instructions', () => {
      assert.ok(getInitDirs().includes('.github/instructions'));
    });
    it('includes docs/archive', () => {
      assert.ok(getInitDirs().includes('docs/archive'));
    });
  });

  describe('resolveFramework', () => {
    it('returns unknown for unrecognized framework', () => {
      const r = resolveFramework('fakefwxyz', '/tmp');
      assert.equal(r.framework, undefined);
      assert.equal(r.unknown, 'fakefwxyz');
    });
    it('returns framework unchanged when known', () => {
      const r = resolveFramework('express', '/tmp');
      assert.equal(r.framework, 'express');
      assert.equal(r.unknown, null);
    });
    it('returns detected=null when framework is explicit', () => {
      const r = resolveFramework('express', '/tmp');
      assert.equal(r.detected, null);
    });
  });

  describe('resolveProjectInfo', () => {
    it('returns defaults when yes=true', () => {
      const info = resolveProjectInfo(true, undefined);
      assert.equal(info.projectType, 'Application');
      assert.equal(info.techStack, 'Unknown');
    });
    it('uses framework name when framework provided', () => {
      const info = resolveProjectInfo(false, 'express');
      assert.equal(info.projectType, 'express application');
      assert.equal(info.techStack, 'express');
    });
    it('returns null when neither yes nor framework', () => {
      assert.equal(resolveProjectInfo(false, undefined), null);
    });
  });

  describe('getMissingCtoSections', () => {
    it('returns Session Start Protocol when missing', () => {
      const missing = getMissingCtoSections('# My .github/copilot-instructions.md\n\nSome content.\n');
      assert.deepStrictEqual(missing, ['Session Start Protocol']);
    });
    it('returns empty when Session Start Protocol present', () => {
      const content = buildCopilotMd('App', 'Node', 'REST API', '2026-01-01');
      assert.deepStrictEqual(getMissingCtoSections(content), []);
    });
  });

  describe('appendCtoSections', () => {
    it('appends Session Start Protocol to plain .github/copilot-instructions.md', () => {
      const existing = '# My .github/copilot-instructions.md\n\nSome content.\n';
      const { content, added } = appendCtoSections(existing, '2026-01-01');
      assert.deepStrictEqual(added, ['Session Start Protocol']);
      assert.ok(content.includes('My .github/copilot-instructions.md'));
      assert.ok(content.includes('Session Start Protocol'));
      assert.ok(content.includes('Optimized with'));
    });
    it('returns unchanged content when all sections present', () => {
      const full = buildCopilotMd('App', 'Node', 'REST API', '2026-01-01');
      const { content, added } = appendCtoSections(full, '2026-01-01');
      assert.deepStrictEqual(added, []);
      assert.strictEqual(content, full);
    });
    it('does not duplicate cpto footer on re-append', () => {
      const existing = '# My .github/copilot-instructions.md\n\nSome content.\n';
      const { content: first } = appendCtoSections(existing, '2026-01-01');
      const { content: second } = appendCtoSections(first, '2026-01-01');
      const footerCount = (second.match(/Optimized with/g) || []).length;
      assert.strictEqual(footerCount, 1);
    });
  });
});

// ── integration — filesystem ───────────────────────────────────────────────

describe('integration — filesystem', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpto-init-'));
    fs.mkdirSync(path.join(tmpDir, '.github'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  const defaultOptions = {
    framework: 'express',
    yes: true,
    projectType: 'Express API',
    techStack: 'Express, PostgreSQL',
    mainFeatures: 'REST API',
  };

  it('creates .github/ directory', async () => {
    await runInit(tmpDir, defaultOptions);
    assert.ok(fs.existsSync(path.join(tmpDir, '.github')));
  });

  it('creates .github/copilot-instructions.md', async () => {
    await runInit(tmpDir, defaultOptions);
    assert.ok(fs.existsSync(path.join(tmpDir, '.github/copilot-instructions.md')));
  });

  it('creates .copilotignore', async () => {
    await runInit(tmpDir, defaultOptions);
    assert.ok(fs.existsSync(path.join(tmpDir, '.copilotignore')));
  });

  it('.copilotignore contains framework patterns for express', async () => {
    await runInit(tmpDir, { ...defaultOptions, framework: 'express' });
    const content = fs.readFileSync(path.join(tmpDir, '.copilotignore'), 'utf8');
    assert.ok(content.includes('node_modules/**'));
  });

  it('.copilotignore contains framework patterns for go', async () => {
    await runInit(tmpDir, { ...defaultOptions, framework: 'go' });
    const content = fs.readFileSync(path.join(tmpDir, '.copilotignore'), 'utf8');
    assert.ok(content.includes('vendor/**'));
  });

  it('creates .cpto/COMMON_MISTAKES.md', async () => {
    await runInit(tmpDir, defaultOptions);
    assert.ok(fs.existsSync(path.join(tmpDir, '.cpto', 'COMMON_MISTAKES.md')));
  });

  it('creates .cpto/QUICK_START.md', async () => {
    await runInit(tmpDir, defaultOptions);
    assert.ok(fs.existsSync(path.join(tmpDir, '.cpto', 'QUICK_START.md')));
  });

  it('creates .cpto/ARCHITECTURE_MAP.md', async () => {
    await runInit(tmpDir, defaultOptions);
    assert.ok(fs.existsSync(path.join(tmpDir, '.cpto', 'ARCHITECTURE_MAP.md')));
  });

  it('creates .github/instructions/ directory', async () => {
    await runInit(tmpDir, defaultOptions);
    assert.ok(fs.existsSync(path.join(tmpDir, '.github', 'instructions')));
  });

  it('creates docs/INDEX.md', async () => {
    await runInit(tmpDir, defaultOptions);
    assert.ok(fs.existsSync(path.join(tmpDir, 'docs', 'INDEX.md')));
  });

  it('.github/copilot-instructions.md mentions project type', async () => {
    await runInit(tmpDir, defaultOptions);
    const content = fs.readFileSync(path.join(tmpDir, '.github/copilot-instructions.md'), 'utf8');
    assert.ok(content.includes('Express API'));
  });

  it('appends missing cpto sections when .github/copilot-instructions.md exists without --force', async () => {
    fs.writeFileSync(path.join(tmpDir, '.github/copilot-instructions.md'), '# My Existing .github/copilot-instructions.md\n\nSome content.\n');
    const result = await runInit(tmpDir, defaultOptions);
    assert.ok(result.merged, 'should report merged');
    assert.deepStrictEqual(result.added, ['Session Start Protocol']);
    const content = fs.readFileSync(path.join(tmpDir, '.github/copilot-instructions.md'), 'utf8');
    assert.ok(content.includes('My Existing .github/copilot-instructions.md'), 'preserves original content');
    assert.ok(content.includes('Session Start Protocol'), 'appends missing section');
  });

  it('no changes when .github/copilot-instructions.md already has all cpto sections', async () => {
    await runInit(tmpDir, defaultOptions);
    const before = fs.readFileSync(path.join(tmpDir, '.github/copilot-instructions.md'), 'utf8');
    const result = await runInit(tmpDir, defaultOptions);
    assert.ok(!result.merged, 'should not report merged');
    assert.deepStrictEqual(result.added, []);
    const after = fs.readFileSync(path.join(tmpDir, '.github/copilot-instructions.md'), 'utf8');
    assert.strictEqual(before, after, 'content unchanged');
  });

  it('merge path does not overwrite existing customized support files', async () => {
    fs.writeFileSync(path.join(tmpDir, '.github/copilot-instructions.md'), '# My .github/copilot-instructions.md\n\nSome content.\n');
    fs.mkdirSync(path.join(tmpDir, '.cpto'), { recursive: true });
    const customContent = '# My Custom Mistakes\n\n1. Never do this.\n';
    fs.writeFileSync(path.join(tmpDir, '.cpto', 'COMMON_MISTAKES.md'), customContent);
    await runInit(tmpDir, defaultOptions);
    const after = fs.readFileSync(path.join(tmpDir, '.cpto', 'COMMON_MISTAKES.md'), 'utf8');
    assert.strictEqual(after, customContent, 'COMMON_MISTAKES.md must not be overwritten on merge');
  });

  it('overwrites .github/copilot-instructions.md when --force is set', async () => {
    fs.writeFileSync(path.join(tmpDir, '.github/copilot-instructions.md'), 'existing content');
    await runInit(tmpDir, { ...defaultOptions, force: true });
    const content = fs.readFileSync(path.join(tmpDir, '.github/copilot-instructions.md'), 'utf8');
    assert.ok(!content.includes('existing content'));
    assert.ok(content.includes('Express API'));
  });
});

// ── e2e — subprocess ───────────────────────────────────────────────────────

describe('e2e — subprocess', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpto-e2e-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('exits 0 and creates .github/copilot-instructions.md', () => {
    const result = spawnSync('node', [CTO, 'init', '--yes'], { cwd: tmpDir, encoding: 'utf8' });
    assert.equal(result.status, 0, `expected exit 0, got ${result.status}. stderr: ${result.stderr}`);
    assert.ok(fs.existsSync(path.join(tmpDir, '.github/copilot-instructions.md')));
  });

  it('shows auto-detected framework when package.json has known dep', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'),
      JSON.stringify({ dependencies: { next: '14.0.0' } }));
    const out = execSync(`node "${CTO}" init --yes`, { cwd: tmpDir, encoding: 'utf8' });
    assert.ok(out.includes('Auto-detected') || out.includes('nextjs'),
      `expected auto-detect message, got: ${out}`);
  });

  it('auto-detected framework propagates into .github/copilot-instructions.md tech stack', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'),
      JSON.stringify({ dependencies: { next: '14.0.0' } }));
    execSync(`node "${CTO}" init --yes`, { cwd: tmpDir, encoding: 'utf8' });
    const content = fs.readFileSync(path.join(tmpDir, '.github/copilot-instructions.md'), 'utf8');
    assert.ok(content.includes('**Tech Stack**: nextjs'), `expected .github/copilot-instructions.md Tech Stack to be nextjs, got: ${content}`);
  });

  it('shows no-framework message when no config files present', () => {
    const out = execSync(`node "${CTO}" init --yes`, { cwd: tmpDir, encoding: 'utf8' });
    assert.ok(out.includes('No framework detected'),
      `expected no-framework message, got: ${out}`);
  });

  it('suppresses auto-detect message when --framework is explicit', () => {
    const out = execSync(`node "${CTO}" init --yes --framework express`, { cwd: tmpDir, encoding: 'utf8' });
    assert.ok(!out.includes('Auto-detected'),
      `expected no auto-detect message with explicit --framework, got: ${out}`);
  });

  it('shows CI audit hint in next steps', () => {
    const out = execSync(`node "${CTO}" init --yes`, { cwd: tmpDir, encoding: 'utf8' });
    assert.ok(out.includes('audit'), `expected CI audit hint in output, got: ${out}`);
  });

  it('--hooks flag installs all hook files', () => {
    execSync(`node "${CTO}" init --yes --framework express --hooks`, { cwd: tmpDir, encoding: 'utf8' });
    const templates = fs.readdirSync(path.join(ROOT, 'templates', 'hooks')).filter(f => f.endsWith('.sh'));
    const hooksDir = path.join(tmpDir, '.github', 'scripts', 'copilot-hooks');
    for (const f of templates) {
      assert.ok(fs.existsSync(path.join(hooksDir, f)), `${f} should be installed by --hooks`);
    }
  });
});
