import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const HOOKS_DIR = path.join(ROOT, 'templates', 'hooks');

function runHook(scriptName, stdinObj, env = {}, cwd = ROOT) {
  const input = JSON.stringify(stdinObj);
  const result = spawnSync('bash', [path.join(HOOKS_DIR, scriptName)], {
    input,
    cwd,
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
  return {
    code: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

// ── pre-tool-bash-guard.sh ────────────────────────────────────────────────

describe('pre-tool-bash-guard', () => {
  const SCRIPT = 'pre-tool-bash-guard.sh';
  const bashInput = (cmd) => ({ tool_name: 'Bash', tool_input: { command: cmd } });

  it('exits 0 for non-Bash tool', () => {
    const r = runHook(SCRIPT, { tool_name: 'Read', tool_input: { file_path: '/etc' } },
      { COPILOT_TOOL_NAME: 'Read' });
    assert.strictEqual(r.code, 0);
  });

  it('exits 2 and explains for find /', () => {
    const r = runHook(SCRIPT, bashInput('find / -name "*.md"'), { COPILOT_TOOL_NAME: 'Bash' });
    assert.strictEqual(r.code, 2);
    assert.ok(r.stderr.includes('find /'), `expected 'find /' in: ${r.stderr}`);
  });

  it('exits 2 for cat node_modules/', () => {
    const r = runHook(SCRIPT, bashInput('cat node_modules/lodash/index.js'), { COPILOT_TOOL_NAME: 'Bash' });
    assert.strictEqual(r.code, 2);
    assert.ok(r.stderr.includes('node_modules'), `stderr: ${r.stderr}`);
  });

  it('exits 0 with warning for find . without -maxdepth', () => {
    const r = runHook(SCRIPT, bashInput('find . -name "*.js"'), { COPILOT_TOOL_NAME: 'Bash' });
    assert.strictEqual(r.code, 0);
    assert.ok(r.stderr.includes('maxdepth'), `expected maxdepth warning, got: ${r.stderr}`);
  });

  it('exits 0 with warning for cat *.json', () => {
    const r = runHook(SCRIPT, bashInput('cat *.json'), { COPILOT_TOOL_NAME: 'Bash' });
    assert.strictEqual(r.code, 0);
    assert.ok(r.stderr.includes('Large output'), `stderr: ${r.stderr}`);
  });

  it('exits 0 with warning for find . targeting .log files', () => {
    const r = runHook(SCRIPT, bashInput('find . -name "*.log"'), { COPILOT_TOOL_NAME: 'Bash' });
    assert.strictEqual(r.code, 0);
    assert.ok(r.stderr.includes('log'), `stderr: ${r.stderr}`);
  });

  it('exits 0 cleanly for safe find with -maxdepth', () => {
    const r = runHook(SCRIPT, bashInput('find . -maxdepth 3 -name "*.ts"'), { COPILOT_TOOL_NAME: 'Bash' });
    assert.strictEqual(r.code, 0);
    assert.strictEqual(r.stderr, '');
  });

  it('exits 0 cleanly for grep with path scope', () => {
    const r = runHook(SCRIPT, bashInput('grep -r "pattern" src/'), { COPILOT_TOOL_NAME: 'Bash' });
    assert.strictEqual(r.code, 0);
  });

  it('bypasses all checks when CPTO_BASH_GUARD_DISABLE=1', () => {
    const r = runHook(SCRIPT, bashInput('find / -name "*.md"'),
      { COPILOT_TOOL_NAME: 'Bash', CPTO_BASH_GUARD_DISABLE: '1' });
    assert.strictEqual(r.code, 0);
    assert.strictEqual(r.stderr, '');
  });
});

// ── notification-token-display.sh ────────────────────────────────────────

describe('notification-token-display', () => {
  const SCRIPT = 'notification-token-display.sh';
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpto-notif-'));
    fs.mkdirSync(path.join(tmpDir, '.github'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.copilot', 'sessions'), { recursive: true });
    // Create a minimal .github/copilot-instructions.md so token count is non-zero
    fs.writeFileSync(path.join(tmpDir, '.github/copilot-instructions.md'), 'This is a test project. '.repeat(50));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('shows token summary on first notification', () => {
    const r = runHook(SCRIPT, { message: 'Task complete' }, {}, tmpDir);
    assert.strictEqual(r.code, 0);
    assert.ok(r.stderr.includes('📊') || r.stderr.includes('Session context'),
      `expected token summary, stderr: ${r.stderr}`);
  });

  it('exits silently on second notification same day', () => {
    const today = execSync('date +%Y-%m-%d', { encoding: 'utf8' }).trim();
    const marker = path.join(tmpDir, '.copilot', 'sessions', `.notification-shown-${today}`);
    fs.writeFileSync(marker, '');

    const r = runHook(SCRIPT, { message: 'Another notification' }, {}, tmpDir);
    assert.strictEqual(r.code, 0);
    assert.strictEqual(r.stderr.trim(), '');
  });

  it('creates session marker after first notification', () => {
    const today = execSync('date +%Y-%m-%d', { encoding: 'utf8' }).trim();
    const marker = path.join(tmpDir, '.copilot', 'sessions', `.notification-shown-${today}`);
    assert.ok(!fs.existsSync(marker), 'marker should not exist before');
    runHook(SCRIPT, { message: 'test' }, {}, tmpDir);
    assert.ok(fs.existsSync(marker), 'marker should exist after first notification');
  });
});

// ── user-prompt-ghost-scanner.sh ─────────────────────────────────────────

describe('user-prompt-ghost-scanner', () => {
  const SCRIPT = 'user-prompt-ghost-scanner.sh';
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpto-ghost-'));
    fs.mkdirSync(path.join(tmpDir, '.github'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.copilot', 'sessions'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  function writeLog(entries) {
    const content = entries.map((e, i) => `## Session ${i + 1}\n\n${e}\n`).join('\n');
    fs.writeFileSync(path.join(tmpDir, '.copilot', 'sessions', 'token-log.md'), content);
  }

  function writeCopilotMd(content) {
    fs.mkdirSync(path.join(tmpDir, '.github'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.github/copilot-instructions.md'), content);
  }

  it('exits silently when token-log.md missing', () => {
    writeCopilotMd('# Project\n\n## Overview\n\nContent\n');
    const r = runHook(SCRIPT, { prompt: 'hello' }, {}, tmpDir);
    assert.strictEqual(r.code, 0);
    assert.strictEqual(r.stdout.trim(), '');
  });

  it('exits silently when fewer than 5 sessions in log', () => {
    writeLog(['used overview', 'used overview', 'used overview']);
    writeCopilotMd('# Project\n\n## Overview\n\nContent\n');
    const r = runHook(SCRIPT, { prompt: 'hello' }, {}, tmpDir);
    assert.strictEqual(r.code, 0);
    assert.strictEqual(r.stdout.trim(), '');
  });

  it('exits silently when all sections are referenced', () => {
    const sessions = Array.from({ length: 6 }, () => 'used overview section content here');
    writeLog(sessions);
    writeCopilotMd('# Project\n\n## Overview\n\nContent\n');
    const r = runHook(SCRIPT, { prompt: 'hello' }, {}, tmpDir);
    assert.strictEqual(r.code, 0);
    assert.strictEqual(r.stdout.trim(), '');
  });

  it('reports ghost sections with 5+ sessions and unreferenced headers', () => {
    const sessions = Array.from({ length: 6 }, () => 'worked on database queries and tests');
    writeLog(sessions);
    writeCopilotMd('# Project\n\n## Overview\n\nContent\n\n## LegacyAuthFlow\n\nOld stuff\n');
    const r = runHook(SCRIPT, { prompt: 'hello' }, {}, tmpDir);
    assert.strictEqual(r.code, 0);
    assert.ok(r.stdout.includes('LegacyAuthFlow') || r.stdout.includes('prune'),
      `expected ghost report, got stdout: ${r.stdout}`);
  });

  it('exits silently on second run same day (marker file)', () => {
    const today = execSync('date +%Y%m%d', { encoding: 'utf8' }).trim();
    const marker = path.join(tmpDir, '.copilot', 'sessions', `.ghost-checked-${today}`);
    fs.writeFileSync(marker, '');
    const sessions = Array.from({ length: 6 }, () => 'no relevant content here');
    writeLog(sessions);
    writeCopilotMd('# Project\n\n## UnusedSection\n\nForgotten\n');
    const r = runHook(SCRIPT, { prompt: 'hello' }, {}, tmpDir);
    assert.strictEqual(r.code, 0);
    assert.strictEqual(r.stdout.trim(), '');
  });

  it('bypasses when CPTO_GHOST_SCAN_DISABLE=1', () => {
    const sessions = Array.from({ length: 6 }, () => 'no relevant content');
    writeLog(sessions);
    writeCopilotMd('# Project\n\n## Forgotten\n\nOld stuff\n');
    const r = runHook(SCRIPT, { prompt: 'hello' }, { CPTO_GHOST_SCAN_DISABLE: '1' }, tmpDir);
    assert.strictEqual(r.code, 0);
    assert.strictEqual(r.stdout.trim(), '');
  });
});
