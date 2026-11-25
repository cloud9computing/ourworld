import { describe, expect, it } from 'vitest';
import { copy } from '../src/data/copy';

// Question wording (src/data/questions.ts) is deliberately not checked here: question 8 says
// "something went hilariously wrong", which is a prompt, not a judgement of the pair.
const BANNED = [/wrong/i, /mismatch/i, /disagree/i, /%/, /!/, /\bscore/i, /out of \d/i, /\bfail/i];

describe('reveal and poster copy', () => {
  const lines: string[] = [];
  for (const v of Object.values(copy)) {
    if (typeof v === 'string') lines.push(v);
    else lines.push((v as (...a: unknown[]) => string)('Ravi', 'Goa', 'Tara', 'Langkawi'), (v as (...a: unknown[]) => string)(3, 2));
  }
  it.each(lines)('"%s" frames differences warmly and never scores', line => {
    for (const b of BANNED) expect(line).not.toMatch(b);
  });
});
