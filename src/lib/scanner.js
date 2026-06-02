import { glob } from 'glob';
import fs from 'node:fs';
import path from 'node:path';
import { AUTO_LOAD_PATTERNS, COPILOT_IGNORE_PATH, DOCS_DEFAULT_EXCLUDE_PATTERNS, DOCS_DEEP_PATTERNS } from './paths.js';

export function readIgnorePatterns(dir) {
  const ignorePath = path.join(dir, COPILOT_IGNORE_PATH);
  if (!fs.existsSync(ignorePath)) return [];
  return fs.readFileSync(ignorePath, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));
}

export async function scanAutoLoadFiles(dir) {
  const userIgnorePatterns = readIgnorePatterns(dir);
  // Merge user-defined ignores with always-excluded default patterns
  const ignorePatterns = [...DOCS_DEFAULT_EXCLUDE_PATTERNS, ...userIgnorePatterns];

  const files = await glob(AUTO_LOAD_PATTERNS, {
    cwd: dir,
    absolute: true,
    ignore: ignorePatterns,
    dot: true,
  });

  const uniqueFiles = [...new Set(files)];
  const results = [];
  for (const filePath of uniqueFiles) {
    try {
      results.push({ path: filePath, content: fs.readFileSync(filePath, 'utf8') });
    } catch {
      // skip unreadable files
    }
  }
  return results;
}

/**
 * Scans for deep docs files (3+ directory levels inside docs/) that are excluded
 * from auto-load. These should be referenced via on-demand tool calls instead.
 */
export async function scanDeepDocFiles(dir) {
  const userIgnorePatterns = readIgnorePatterns(dir);
  const ignorePatterns = [...DOCS_DEFAULT_EXCLUDE_PATTERNS, ...userIgnorePatterns];

  const files = await glob(DOCS_DEEP_PATTERNS, {
    cwd: dir,
    absolute: true,
    ignore: ignorePatterns,
    dot: true,
  });

  const uniqueFiles = [...new Set(files)];
  const results = [];
  for (const filePath of uniqueFiles) {
    try {
      const rel = path.relative(dir, filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      // Extract first heading as a brief description
      const heading = content.match(/^#+\s+(.+)$/m)?.[1] ?? '';
      results.push({ path: filePath, rel, heading });
    } catch {
      // skip unreadable files
    }
  }
  return results;
}
