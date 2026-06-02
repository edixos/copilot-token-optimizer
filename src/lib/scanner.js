import { glob } from 'glob';
import fs from 'node:fs';
import path from 'node:path';
import { AUTO_LOAD_PATTERNS, COPILOT_IGNORE_PATH } from './paths.js';

function readIgnorePatterns(dir) {
  const ignorePath = path.join(dir, COPILOT_IGNORE_PATH);
  if (!fs.existsSync(ignorePath)) return [];
  return fs.readFileSync(ignorePath, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));
}

export async function scanAutoLoadFiles(dir) {
  const ignorePatterns = readIgnorePatterns(dir);

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
