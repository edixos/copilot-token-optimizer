import { encode } from 'gpt-tokenizer';

export function countTokens(text) {
  return encode(text ?? '').length;
}
