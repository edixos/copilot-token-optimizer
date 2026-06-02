import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { scanAutoLoadFiles } from '../src/lib/scanner.js';

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpto-test-'));
  fs.mkdirSync(path.join(tmpDir, '.github'), { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true });
});

describe('scanAutoLoadFiles', () => {
  it('returns empty array for empty directory', async () => {
    const files = await scanAutoLoadFiles(tmpDir);
    assert.deepEqual(files, []);
  });

  it('picks up root-level .md files', async () => {
    fs.writeFileSync(path.join(tmpDir, '.github/copilot-instructions.md'), '# Copilot');
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Readme');
    const files = await scanAutoLoadFiles(tmpDir);
    const rels = files.map(f => path.relative(tmpDir, f.path));
    assert.ok(rels.includes(path.join('.github', 'copilot-instructions.md')), 'should include .github/copilot-instructions.md');
    assert.ok(rels.includes('README.md'), 'should include README.md');
  });

  it('picks up .copilot/*.md files', async () => {
    fs.mkdirSync(path.join(tmpDir, '.copilot'));
    fs.writeFileSync(path.join(tmpDir, '.copilot', 'COMMON_MISTAKES.md'), '# Mistakes');
    const files = await scanAutoLoadFiles(tmpDir);
    const names = files.map(f => path.basename(f.path));
    assert.ok(names.includes('COMMON_MISTAKES.md'));
  });

  it('picks up docs/**/*.md files', async () => {
    fs.mkdirSync(path.join(tmpDir, 'docs'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'docs', 'guide.md'), '# Guide');
    const files = await scanAutoLoadFiles(tmpDir);
    const names = files.map(f => path.basename(f.path));
    assert.ok(names.includes('guide.md'));
  });

  it('returns objects with path and content fields', async () => {
    fs.writeFileSync(path.join(tmpDir, '.github/copilot-instructions.md'), '# Copilot');
    const files = await scanAutoLoadFiles(tmpDir);
    assert.ok(files.length > 0);
    assert.ok('path' in files[0]);
    assert.ok('content' in files[0]);
  });

  it('respects .copilotignore patterns', async () => {
    fs.mkdirSync(path.join(tmpDir, '.copilot', 'sessions'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.copilot', 'sessions', 'old.md'), '# Old session');
    fs.writeFileSync(path.join(tmpDir, '.copilotignore'), '.copilot/sessions/**');
    const files = await scanAutoLoadFiles(tmpDir);
    const paths = files.map(f => f.path);
    assert.ok(!paths.some(p => p.includes('sessions')), 'should exclude sessions dir');
  });
});
