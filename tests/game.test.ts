import { describe, expect, it } from 'vitest';
import { myAnswers, withPartner, type Game } from '../src/state/game';
import { selectQuestions } from '../src/lib/game/select';
import { BANK, byId, type Tier } from '../src/data/bank';

const base = (role: 0 | 1, sealed: boolean): Game => ({
  v: 3, gameId: 'aaaaaaaaaaaaaaaa', role, myName: role ? 'Tara' : 'Ravi', partnerName: role ? 'Ravi' : 'Tara', tier: 2, round: 1,
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

describe('question sets by tenure (v3 R1)', () => {
  const tiers: Tier[] = [0, 1, 2, 3, 4, 5];
  it('each tier gets its fixed 12 in order, the same for any game', () => {
    for (const tier of tiers) {
      const ids = selectQuestions('0011223344556677', tier);
      expect(ids).toEqual(selectQuestions('ffeeddccbbaa9988', tier));
      expect(ids.length).toBe(12);
      for (const id of ids) expect(byId.get(id)!.tier).toBe(tier);
    }
  });
  it('fits every question id in one byte (they travel in the invite)', () => {
    for (const q of BANK) expect(q.id).toBeLessThan(256);
  });
});
