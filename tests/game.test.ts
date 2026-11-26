import { describe, expect, it } from 'vitest';
import { myAnswers, withPartner, type Game } from '../src/state/game';
import { selectQuestions } from '../src/lib/game/select';
import { BANK, byId, type Tier } from '../src/data/bank';

const base = (role: 0 | 1, sealed: boolean): Game => ({
  v: 2, gameId: 'aaaaaaaaaaaaaaaa', role, myName: role ? 'Tara' : 'Ravi', partnerName: role ? 'Ravi' : 'Tara', tier: 2,
  questions: selectQuestions('aaaaaaaaaaaaaaaa', 2), answers: {}, together: [], lived: [], createdAt: 0, ...(sealed ? { sealedAt: 1 } : {}),
});

describe('sealing (rule 1)', () => {
  it('refuses a partner’s answers before this phone has sealed', () => {
    expect(() => withPartner(base(0, false), myAnswers(base(1, true)))).toThrow(/Seal/);
  });
  it('accepts the other partner’s answers for the same game once sealed', () => {
    expect(withPartner(base(0, true), myAnswers(base(1, true))).partner).toBeTruthy();
  });
  it('refuses its own code and codes from another game', () => {
    expect(() => withPartner(base(0, true), myAnswers(base(0, true)))).toThrow(/own code/);
    expect(() => withPartner(base(0, true), { ...myAnswers(base(1, true)), gameId: 'bbbbbbbbbbbbbbbb' })).toThrow('This code is from a different game.');
  });
});

describe('question selection (F5)', () => {
  const tiers: Tier[] = [0, 1, 2, 3, 4];
  it('picks 3 + 6 + 3 in act order, always including the starred questions', () => {
    for (const tier of tiers) for (const seed of ['0011223344556677', 'ffeeddccbbaa9988', '1234567890abcdef']) {
      const ids = selectQuestions(seed, tier);
      expect(ids.length).toBe(12);
      expect(new Set(ids).size).toBe(12);
      expect(ids.map(i => byId.get(i)!.act)).toEqual([1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3]);
      for (const star of BANK.filter(q => q.star)) expect(ids).toContain(star.id);
      for (const id of ids) { const q = byId.get(id)!; if (q.tiers) expect(q.tiers).toContain(tier); }
    }
  });
  it('gives the same set for the same game', () => {
    expect(selectQuestions('0011223344556677', 3)).toEqual(selectQuestions('0011223344556677', 3));
  });
  it('fits every question id in one byte (they travel in the invite)', () => {
    for (const q of BANK) expect(q.id).toBeLessThan(256);
  });
});
