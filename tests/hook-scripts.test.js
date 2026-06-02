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

  it('exits 0 for non-matching tool input (no command field)', () => {
    const r = runHook(SCRIPT, { toolName: 'read_file', toolArgs: { filePath: '/etc' } });
    assert.strictEqual(r.code, 0);
  });

  it('exits 2 and outputs deny JSON for find /', () => {
    const r = runHook(SCRIPT, { toolName: 'bash', toolArgs: { command: 'find / -name "*.md"' } });
    assert.strictEqual(r.code, 2);
    const out = JSON.parse(r.stdout);
    assert.equal(out.permissionDecision, 'deny');
    assert.ok(out.permissionDecisionReason.includes('find /'), `expected 'find /' in reason`);
  });

  it('exits 2 for cat node_modules/', () => {
    const r = runHook(SCRIPT, { toolName: 'bash', toolArgs: { command: 'cat node_modules/lodash/index.js' } });
    assert.strictEqual(r.code, 2);
    const out = JSON.parse(r.stdout);
    assert.equal(out.permissionDecision, 'deny');
    assert.ok(out.permissionDecisionReason.includes('node_modules'), `reason: ${out.permissionDecisionReason}`);
  });

  it('exits 0 with warning for find . without -maxdepth', () => {
    const r = runHook(SCRIPT, { toolName: 'bash', toolArgs: { command: 'find . -name "*.js"' } });
    assert.strictEqual(r.code, 0);
    assert.ok(r.stderr.includes('maxdepth'), `expected maxdepth warning, got: ${r.stderr}`);
  });

  it('exits 0 with warning for cat *.json', () => {
    const r = runHook(SCRIPT, { toolName: 'bash', toolArgs: { command: 'cat *.json' } });
    assert.strictEqual(r.code, 0);
    assert.ok(r.stderr.includes('Large output'), `stderr: ${r.stderr}`);
  });

  it('exits 0 with warning for find . targeting .log files', () => {
    const r = runHook(SCRIPT, { toolName: 'bash', toolArgs: { command: 'find . -name "*.log"' } });
    assert.strictEqual(r.code, 0);
    assert.ok(r.stderr.includes('log'), `stderr: ${r.stderr}`);
  });

  it('exits 0 cleanly for safe find with -maxdepth', () => {
    const r = runHook(SCRIPT, { toolName: 'bash', toolArgs: { command: 'find . -maxdepth 3 -name "*.ts"' } });
    assert.strictEqual(r.code, 0);
    assert.strictEqual(r.stderr, '');
  });

  it('exits 0 cleanly for grep with path scope', () => {
    const r = runHook(SCRIPT, { toolName: 'bash', toolArgs: { command: 'grep -r "pattern" src/' } });
    assert.strictEqual(r.code, 0);
  });

  it('bypasses all checks when CPTO_BASH_GUARD_DISABLE=1', () => {
    const r = runHook(SCRIPT, { toolName: 'bash', toolArgs: { command: 'find / -name "*.md"' } },
      { CPTO_BASH_GUARD_DISABLE: '1' });
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
    fs.mkdirSync(path.join(tmpDir, '.cpto', 'sessions'), { recursive: true });
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
    const marker = path.join(tmpDir, '.cpto', 'sessions', `.notification-shown-${today}`);
    fs.writeFileSync(marker, '');

    const r = runHook(SCRIPT, { message: 'Another notification' }, {}, tmpDir);
    assert.strictEqual(r.code, 0);
    assert.strictEqual(r.stderr.trim(), '');
  });

  it('creates session marker after first notification', () => {
    const today = execSync('date +%Y-%m-%d', { encoding: 'utf8' }).trim();
    const marker = path.join(tmpDir, '.cpto', 'sessions', `.notification-shown-${today}`);
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
    fs.mkdirSync(path.join(tmpDir, '.cpto', 'sessions'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  function writeLog(entries) {
    const content = entries.map((e, i) => `## Session ${i + 1}\n\n${e}\n`).join('\n');
    fs.writeFileSync(path.join(tmpDir, '.cpto', 'sessions', 'token-log.md'), content);
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
    const marker = path.join(tmpDir, '.cpto', 'sessions', `.ghost-checked-${today}`);
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

// ── user-prompt-optimize.sh ──────────────────────────────────────────────

describe('user-prompt-optimize', () => {
  const SCRIPT = 'user-prompt-optimize.sh';
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpto-optimize-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('is off by default', () => {
    const r = runHook(SCRIPT, { prompt: 'please compress this prompt' }, {}, tmpDir);
    assert.strictEqual(r.code, 0);
    assert.strictEqual(r.stdout.trim(), '');
  });

  it('returns a compressed prompt when enabled and the API responds', () => {
    const skillDir = path.join(tmpDir, 'skills');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(
      path.join(skillDir, 'custom.skill.md'),
      '# Custom Deployment Skill\n\nUse when the project has an unusual deployment flow.'
    );

    const debugSystemFile = path.join(tmpDir, 'optimizer-system.txt');
    const r = runHook(
      SCRIPT,
      { prompt: 'hey can you make the login code cleaner?' },
      {
        CPTO_PROMPT_OPTIMIZER_ENABLED: '1',
        CPTO_PROMPT_OPTIMIZER_MOCK_RESPONSE: JSON.stringify({
          compressed_prompt: 'Refactor the login flow',
          required_skills: ['api-integration'],
        }),
        CPTO_PROMPT_OPTIMIZER_APPEND_SKILLS: '0',
        CPTO_PROMPT_OPTIMIZER_DEBUG_SYSTEM_FILE: debugSystemFile,
        COPILOT_RUNTIME_DIR: path.join(tmpDir, '.copilot-runtime'),
      },
      tmpDir
    );

    assert.strictEqual(r.code, 0);
    assert.ok(r.stdout.includes('Refactor the login flow'), `stdout: ${r.stdout}`);

    assert.ok(fs.existsSync(debugSystemFile), 'should write the debug system instruction file');
    const systemInstruction = fs.readFileSync(debugSystemFile, 'utf8');
    assert.ok(systemInstruction.includes('Custom Deployment Skill'), 'should discover local skill manifests dynamically');

    const logPath = path.join(tmpDir, '.copilot-runtime', 'prompt-optimizer.ndjson');
    assert.ok(fs.existsSync(logPath), 'should write compact prompt-optimizer log');
    const logLines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
    assert.equal(logLines.length, 1, 'should append a single compact log record');
    const logRecord = JSON.parse(logLines[0]);
    assert.equal(logRecord.status, 'ok');
    assert.ok(Array.isArray(logRecord.skills), 'log record should store selected skills as an array');
    assert.ok(logRecord.skills.includes('api-integration'), 'log record should include selected skill hints');
    assert.ok(logRecord.catalog_count >= 1, 'log record should include a discovered catalog count');
    assert.equal(logRecord.credit_model, 'gpt-5-mini', 'log record should note the billing model');
    assert.ok(logRecord.total_ai_credits > 0, 'log record should include a positive credit estimate');
    assert.ok(!logLines[0].includes('hey can you make the login code cleaner?'), 'log should not store the full prompt');

    const dailyPath = path.join(tmpDir, '.copilot-runtime', 'prompt-optimizer-daily.ndjson');
    assert.ok(fs.existsSync(dailyPath), 'should write daily summary data');
    const dailyLines = fs.readFileSync(dailyPath, 'utf8').trim().split('\n');
    const today = dailyLines.map(line => JSON.parse(line)).find(row => row.date);
    assert.ok(today, 'should have a daily summary row');
    assert.equal(today.attempts, 1, 'daily summary should count one run');
    assert.equal(today.success_runs, 1, 'daily summary should count one successful run');
    assert.ok(today.credits > 0, 'daily summary should aggregate AI credits');

    const dailyMd = path.join(tmpDir, '.copilot-runtime', 'prompt-optimizer-daily.md');
    assert.ok(fs.existsSync(dailyMd), 'should write a human-readable daily report');
    const dailyMdText = fs.readFileSync(dailyMd, 'utf8');
    assert.ok(dailyMdText.includes('Prompt Optimizer Daily Summary'), 'daily report should have a title');
    assert.ok(dailyMdText.includes('AI Credits'), 'daily report should mention AI credits');
  });
});
