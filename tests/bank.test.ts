import { describe, expect, it } from 'vitest';
import { ACT_LINES, ACT_NAMES, BANK, byId, originText, promptFor, setFor, type Tier } from '../src/data/bank';

const TIERS: Tier[] = [0, 1, 2, 3, 4, 5];

describe('question sets (question-sets-by-tenure.md)', () => {
  it.each(TIERS)('tier %s has 12 questions in the right acts', tier => {
    const acts = setFor(tier).map(id => byId.get(id)!.act);
    expect(acts).toEqual(tier === 0 ? [1, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 3] : [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3]);
  });

  it('names the acts per tier, with chapter lines for each', () => {
    expect(Object.values(ACT_NAMES[0])).toEqual(['Your world', 'First impressions', 'Maybe someday']);
    expect(ACT_NAMES[1][2]).toBe('Us so far');
    for (const t of TIERS) for (const name of Object.values(ACT_NAMES[t])) expect(ACT_LINES[name]).toBeTruthy();
  });

  it('gives every question at least two ask-your-partner prompts (R6)', () => {
    for (const q of BANK) {
      expect(q.prompts.length, q.text).toBeGreaterThanOrEqual(2);
      expect(new Set(q.prompts).size).toBe(q.prompts.length);
      for (const p of q.prompts) expect(p, q.text).not.toMatch(/^why\??$/i); // never a bare "Why?"
    }
  });

  it('gives every place that can be explored an origin phrase (R4)', () => {
    for (const q of BANK) if (q.kind !== 'guess') expect(q.origin, q.text).toBeTruthy();
  });

  it('links the Just met guesses to the partner’s own answers to questions 1 and 2', () => {
    const [q1, q2, , , , g6, g7] = setFor(0).map(id => byId.get(id)!);
    expect(g6.guessOf).toBe(q1.id);
    expect(g7.guessOf).toBe(q2.id);
    expect(g6.truth!('Aanya', 'Jaipur')).toBe('Aanya grew up in Jaipur.');
  });

  it('uses no plain facts after Just met (no "where you grew up" or "where we met")', () => {
    for (const q of BANK.filter(q => q.tier !== 0)) expect(q.text).not.toMatch(/^(the place you grew up|where (we|you) met)/i);
  });

  it('keeps questions and prompts off past partners, loss and scores (copy review)', () => {
    const banned = /\bex\b|\bexes\b|boyfriend|girlfriend|previous partner|first love|died|passed away|funeral|grave|\bscore|\bwrong answer/i;
    for (const q of BANK) for (const t of [q.text, q.shared ?? '', ...q.prompts, q.origin]) expect(t).not.toMatch(banned);
  });

  it('writes prompts as "Ask <name>: …" and rotates them between games', () => {
    const q = byId.get(setFor(2)[2])!; // the food one
    const seen = new Set(['000000', '000001', '000002'].map(g => promptFor(q, g + '0000000000', 'Ravi')));
    expect([...seen][0]).toMatch(/^Ask Ravi: [a-z]/);
    expect(seen.size).toBeGreaterThan(1);
  });

  it('fills origins with the right names', () => {
    expect(originText(byId.get(setFor(1)[0])!, 'Ravi', 'Tara')).toBe('where Ravi was happiest as a kid');
    expect(originText(byId.get(setFor(1)[10])!, 'Ravi', 'Tara')).toBe('the place Ravi wants to show Tara');
  });
});
