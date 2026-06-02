import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { countTokens } from '../src/lib/tokenizer.js';

describe('countTokens', () => {
  it('returns a number for empty string', () => {
    const result = countTokens('');
    assert.equal(typeof result, 'number');
  });

  it('returns more tokens for longer text', () => {
    const short = countTokens('hello');
    const long = countTokens('hello world this is a longer sentence with many words');
    assert.ok(long > short, `expected ${long} > ${short}`);
  });

  it('counts a known string within expected range', () => {
    // "Hello, world!" tokenizes to roughly 4 tokens in Copilot's tokenizer
    const result = countTokens('Hello, world!');
    assert.ok(result >= 3 && result <= 6, `expected 3-6 tokens, got ${result}`);
  });

  it('handles multiline text', () => {
    const result = countTokens('line one\nline two\nline three');
    assert.equal(typeof result, 'number');
    assert.ok(result > 0);
  });
});
