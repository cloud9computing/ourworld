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
    expect(copy.landingTitle).toBe('Our world is bigger than we think.');
    expect(copy.landingLine).toBe('Twelve questions each, answered in secret. Then swap and see how much is still waiting to be explored.');
    expect('landingSmall' in copy).toBe(false); // removed in v5
    expect(copy.inviteShare).toBe('Our world is bigger than we think. Let’s find out.');
    expect(copy.landingStart).toBe('Find out together');
    expect(copy.haveInvite).toBe('Got a code? Scan it.');
    expect(copy.joinRule3).toBe('Swap codes and discover what’s waiting in each other’s worlds.');
    expect(copy.shareLine).toBe('A 10-minute game for two. No sign-up.');
    expect(copy.posterCta).toBe('What’s waiting in yours?');
  });

  it('carries the link preview title and description in index.html', async () => {
    const { readFileSync } = await import('fs');
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('<title>Our world is bigger than we think.</title>');
    expect(html).toContain('content="Our world is bigger than we think."');
    expect(html).toContain('content="A 10-minute game for two. Answer in secret, swap, and see how much is still waiting to be explored."');
  });

  it('has no "How big is", "Find your shape", "A date for two phones" or "How much of their world have you seen?" anywhere', async () => {
    const { readFileSync, readdirSync, statSync } = await import('fs');
    const files: string[] = ['index.html', 'scripts/og-image.ts'];
    const walk = (d: string) => readdirSync(d).forEach(f => { const p = `${d}/${f}`; statSync(p).isDirectory() ? walk(p) : files.push(p); });
    walk('src');
    for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(/how big|find your shape|a date for two phones|how much of their world/i);
  });
});
