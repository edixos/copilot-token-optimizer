import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';

import {
  parseHookMeta,
  buildSettingsBlock,
  mapEventToNative,
  writeNativeConfig,
  formatHookLine,
  readTemplates,
  installHook,
  removeHook,
  statusHooks,
  settingsHooks,
  TEMPLATES_DIR,
} from '../src/commands/hooks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CTO = path.join(ROOT, 'bin', 'cpto.js');

// ── Unit tests — pure logic ────────────────────────────────────────────

describe('unit — pure logic', () => {
  describe('parseHookMeta', () => {
    it('extracts event and description', () => {
      const content = '#!/bin/bash\n# EVENT: PreToolUse\n# DESCRIPTION: Guard token usage\n';
      const meta = parseHookMeta(content);
      assert.equal(meta.event, 'PreToolUse');
      assert.equal(meta.desc, 'Guard token usage');
    });

    it('extracts camelCase native event names', () => {
      const content = '#!/bin/bash\n# EVENT: preToolUse\n# DESCRIPTION: Native hook\n';
      const meta = parseHookMeta(content);
      assert.equal(meta.event, 'preToolUse');
    });

    it('returns Unknown event when missing', () => {
      const meta = parseHookMeta('#!/bin/bash\n# DESCRIPTION: something\n');
      assert.equal(meta.event, 'Unknown');
    });

    it('returns empty desc when missing', () => {
      const meta = parseHookMeta('# EVENT: Stop\n');
      assert.equal(meta.desc, '');
    });
  });

  describe('mapEventToNative', () => {
    it('maps PascalCase to camelCase native events', () => {
      assert.equal(mapEventToNative('PreToolUse'), 'preToolUse');
      assert.equal(mapEventToNative('PostToolUse'), 'postToolUse');
      assert.equal(mapEventToNative('Stop'), 'agentStop');
      assert.equal(mapEventToNative('UserPromptSubmit'), 'userPromptSubmitted');
      assert.equal(mapEventToNative('Notification'), 'notification');
      assert.equal(mapEventToNative('SessionEnd'), 'sessionEnd');
    });

    it('passes through already-native event names', () => {
      assert.equal(mapEventToNative('preToolUse'), 'preToolUse');
      assert.equal(mapEventToNative('agentStop'), 'agentStop');
      assert.equal(mapEventToNative('userPromptSubmitted'), 'userPromptSubmitted');
    });
  });

  describe('buildSettingsBlock', () => {
    it('groups hooks by native event name', () => {
      const hooks = [
        { event: 'PreToolUse', file: 'a.sh', name: 'a' },
        { event: 'PreToolUse', file: 'b.sh', name: 'b' },
        { event: 'PostToolUse', file: 'c.sh', name: 'c' },
      ];
      const block = buildSettingsBlock(hooks);
      assert.ok(block.hooks.preToolUse, 'should have preToolUse');
      assert.ok(block.hooks.postToolUse, 'should have postToolUse');
      assert.equal(block.hooks.preToolUse.length, 2);
      assert.equal(block.hooks.postToolUse.length, 1);
    });

    it('each entry has correct native hook format', () => {
      const hooks = [{ event: 'Stop', file: 'stop.sh', name: 'stop' }];
      const block = buildSettingsBlock(hooks);
      const entry = block.hooks.agentStop[0];
      assert.equal(entry.type, 'command');
      assert.equal(entry.bash, './.github/scripts/copilot-hooks/stop.sh');
      assert.equal(entry.cwd, '.');
      assert.equal(entry.timeoutSec, 30);
    });

    it('includes version 1 in output', () => {
      const hooks = [{ event: 'UserPromptSubmit', file: 'p.sh', name: 'p' }];
      const block = buildSettingsBlock(hooks);
      assert.equal(block.version, 1);
      assert.doesNotThrow(() => JSON.stringify(block));
    });

    it('includes matcher for preToolUse hooks', () => {
      const hooks = [{ event: 'PreToolUse', file: 'guard.sh', name: 'guard', matcher: 'bash' }];
      const block = buildSettingsBlock(hooks);
      assert.equal(block.hooks.preToolUse[0].matcher, 'bash');
    });
  });

  describe('formatHookLine', () => {
    it('contains hook name', () => {
      const hook = { name: 'my-hook', file: 'my-hook.sh', event: 'PreToolUse', desc: 'Test hook', installed: false };
      const line = formatHookLine(hook);
      assert.ok(line.includes('my-hook'), 'line should contain hook name');
    });

    it('shows [not installed] for uninstalled hooks', () => {
      const hook = { name: 'x', file: 'x.sh', event: 'Stop', desc: '', installed: false };
      const line = formatHookLine(hook);
      assert.ok(line.includes('[not installed]'));
    });

    it('shows [installed] for installed hooks', () => {
      const hook = { name: 'x', file: 'x.sh', event: 'Stop', desc: '', installed: true };
      const line = formatHookLine(hook);
      assert.ok(line.includes('[installed]'));
    });

    it('contains native event name', () => {
      const hook = { name: 'x', file: 'x.sh', event: 'PostToolUse', desc: 'my desc', installed: false };
      const line = formatHookLine(hook);
      assert.ok(line.includes('postToolUse'));
    });
  });
});

// ── Integration tests — filesystem ────────────────────────────────────

describe('integration — filesystem', () => {
  let tmpDir;
  let scriptsDir;

  before(() => {
    // Create a realistic project structure: tmpDir/.github/scripts/copilot-hooks/
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpto-hooks-'));
    scriptsDir = path.join(tmpDir, '.github', 'scripts', 'copilot-hooks');
    fs.mkdirSync(scriptsDir, { recursive: true });
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('readTemplates returns array of hook descriptors', () => {
    const templates = readTemplates(TEMPLATES_DIR, scriptsDir);
    assert.ok(templates.length > 0, 'should find templates');
    for (const t of templates) {
      assert.ok(t.name, 'has name');
      assert.ok(t.file.endsWith('.sh'), 'file ends with .sh');
      assert.ok(t.event, 'has event');
      assert.equal(t.installed, false, 'none installed in fresh scriptsDir');
    }
  });

  it('readTemplates returns [] for nonexistent dir', () => {
    const result = readTemplates('/nonexistent/path', scriptsDir);
    assert.deepEqual(result, []);
  });

  it('installHook copies file and makes it executable', () => {
    installHook('pre-tool-token-guard', TEMPLATES_DIR, scriptsDir, {});
    const dst = path.join(scriptsDir, 'pre-tool-token-guard.sh');
    assert.ok(fs.existsSync(dst), 'file should exist');
    const mode = fs.statSync(dst).mode;
    assert.ok(mode & 0o111, 'should be executable');
  });

  it('installHook is idempotent', () => {
    installHook('pre-tool-token-guard', TEMPLATES_DIR, scriptsDir, {});
    installHook('pre-tool-token-guard', TEMPLATES_DIR, scriptsDir, {});
    const dst = path.join(scriptsDir, 'pre-tool-token-guard.sh');
    assert.ok(fs.existsSync(dst), 'still exists after second install');
  });

  it('readTemplates shows installed=true after installHook', () => {
    const templates = readTemplates(TEMPLATES_DIR, scriptsDir);
    const t = templates.find(x => x.name === 'pre-tool-token-guard');
    assert.ok(t, 'template found');
    assert.equal(t.installed, true);
  });

  it('removeHook with yes:true removes the file', async () => {
    const dst = path.join(scriptsDir, 'pre-tool-token-guard.sh');
    assert.ok(fs.existsSync(dst), 'exists before remove');
    await removeHook('pre-tool-token-guard', scriptsDir, { yes: true });
    assert.ok(!fs.existsSync(dst), 'gone after remove');
  });

  it('installHook --all installs every template and writes config', () => {
    installHook(null, TEMPLATES_DIR, scriptsDir, { all: true });
    const templateFiles = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.sh'));
    for (const f of templateFiles) {
      assert.ok(fs.existsSync(path.join(scriptsDir, f)), `${f} should be installed`);
    }
    // Verify native config was written
    const configPath = path.join(tmpDir, '.github', 'hooks', 'cpto-token-optimizer.json');
    assert.ok(fs.existsSync(configPath), 'native config JSON should be created');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert.equal(config.version, 1);
    assert.ok(config.hooks.preToolUse, 'config should have preToolUse hooks');
  });

  it('settingsHooks outputs valid JSON grouped by event', () => {
    // hooks already installed by --all above; capture stdout
    let captured = '';
    const origLog = console.log;
    console.log = (...args) => { captured += args.join(' ') + '\n'; };
    try {
      settingsHooks(TEMPLATES_DIR, scriptsDir);
    } finally {
      console.log = origLog;
    }
    // Find the JSON portion (first { to last })
    const jsonStart = captured.indexOf('{');
    const jsonEnd = captured.lastIndexOf('}');
    const jsonStr = captured.slice(jsonStart, jsonEnd + 1);
    let parsed;
    assert.doesNotThrow(() => { parsed = JSON.parse(jsonStr); }, 'output should be valid JSON');
    assert.ok(parsed.hooks, 'has hooks key');
    assert.equal(parsed.version, 1, 'has version 1');
    assert.ok(Object.keys(parsed.hooks).includes('preToolUse'), 'has preToolUse');
  });

  it('statusHooks lists installed hooks', () => {
    let captured = '';
    const origLog = console.log;
    console.log = (...args) => { captured += args.join(' ') + '\n'; };
    try {
      statusHooks(TEMPLATES_DIR, scriptsDir);
    } finally {
      console.log = origLog;
    }
    assert.ok(captured.includes('pre-tool-token-guard') || captured.includes('Installed'), 'shows installed hooks');
  });
});

// ── E2E tests — subprocess ─────────────────────────────────────────────

describe('e2e — subprocess', () => {
  it('hooks list exits 0 and shows Available hooks or No hook templates', () => {
    const result = spawnSync('node', [CTO, 'hooks', 'list'], { encoding: 'utf8' });
    assert.equal(result.status, 0, `exit code should be 0, got: ${result.stderr}`);
    const out = result.stdout + result.stderr;
    assert.ok(
      out.includes('Available hooks') || out.includes('No hook templates'),
      `expected list output, got: ${out}`
    );
  });

  it('hooks list shows known hook names when templates exist', () => {
    const result = spawnSync('node', [CTO, 'hooks', 'list'], { encoding: 'utf8' });
    assert.equal(result.status, 0);
    const out = result.stdout;
    assert.ok(out.includes('pre-tool-token-guard'), 'should list pre-tool-token-guard');
    assert.ok(out.includes('preToolUse') || out.includes('postToolUse'), 'should show event types');
  });

  it('hooks install nonexistent exits non-zero', () => {
    const result = spawnSync('node', [CTO, 'hooks', 'install', 'nonexistent-hook'], { encoding: 'utf8' });
    assert.notEqual(result.status, 0, 'should fail for unknown hook name');
  });
});
