import { describe, expect, it } from 'vitest';
import { copy } from '../src/data/copy';

// Question wording (src/data/questions.ts) is deliberately not checked here: question 8 says
// "something went hilariously wrong", which is a prompt, not a judgement of the pair.
const BANNED = [/wrong/i, /mismatch/i, /disagree/i, /%/, /!/, /\bscore/i, /out of \d/i, /\bfail/i];

describe('reveal and poster copy', () => {
  const lines: string[] = [];
  for (const v of Object.values(copy)) {
    if (typeof v === 'string') lines.push(v);
    else if (Array.isArray(v)) lines.push(v.join(' '));
    else lines.push((v as (...a: unknown[]) => string)('Ravi', 'Goa', 'Tara', 'Langkawi'), (v as (...a: unknown[]) => string)(3, 2));
  }
  it.each(lines)('"%s" frames differences warmly and never scores', line => {
    for (const b of BANNED) expect(line).not.toMatch(b);
  });
});

describe('speclet v4 copy', () => {
  it('uses the new lines exactly', () => {
    expect(copy.landingEyebrow).toBe('A game for two · 10 minutes');
    expect(copy.landingTitle).toBe('How much of their world have you seen?');
    expect(copy.landingLine).toBe('Twelve questions about the places that made you, and the ones you dream of. Answer in secret on your own phones, then swap and discover what’s waiting in each other’s worlds.');
    expect(copy.landingSmall).toBe('No sign-up · Nothing leaves your phones');
    expect(copy.landingStart).toBe('Find out together');
    expect(copy.haveInvite).toBe('Got a code from your partner? Scan it.');
    expect(copy.joinRule3).toBe('Swap codes and discover what’s waiting in each other’s worlds.');
    expect(copy.shareLine).toBe('A 10-minute game for two. No sign-up.');
    expect(copy.posterCta).toBe('What’s waiting in yours?');
  });

  it('carries the link preview title and description in index.html', async () => {
    const { readFileSync } = await import('fs');
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('<title>How much of their world have you seen?</title>');
    expect(html).toContain('content="How much of their world have you seen?"');
    expect(html).toContain('content="A 10-minute game for two. Answer on your own phones, swap codes, and discover what’s waiting in each other’s worlds."');
  });

  it('has no "How big is", "Find your shape" or "A date for two phones" anywhere', async () => {
    const { readFileSync, readdirSync, statSync } = await import('fs');
    const files: string[] = ['index.html', 'scripts/og-image.ts'];
    const walk = (d: string) => readdirSync(d).forEach(f => { const p = `${d}/${f}`; statSync(p).isDirectory() ? walk(p) : files.push(p); });
    walk('src');
    for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(/how big|find your shape|a date for two phones/i);
  });
});
