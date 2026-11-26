// Picks the 12 questions for a game: 3 from Act 1, 6 from Act 2 (always both starred ones), 3 from Act 3.
// Seeded by the game id, so the same game always gets the same set. The invite carries the chosen ids
// as well, so the partner's phone never has to repeat this.
import { ACTS, BANK, type Act, type BankQuestion, type Tier } from '../../data/bank';

function rng(seedHex: string) {
  let a = parseInt(seedHex.slice(0, 8), 16) >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function eligible(q: BankQuestion, tier: Tier) {
  return !q.tiers || q.tiers.includes(tier);
}

export function selectQuestions(gameId: string, tier: Tier): number[] {
  const rand = rng(gameId);
  const out: number[] = [];
  for (const act of [1, 2, 3] as Act[]) {
    const pool = BANK.filter(q => q.act === act && eligible(q, tier));
    const picked: BankQuestion[] = pool.filter(q => q.star);
    let rest = pool.filter(q => !q.star);
    while (picked.length < ACTS[act].count && rest.length) {
      const weights = rest.map(q => q.weight?.[tier] ?? 1);
      let r = rand() * weights.reduce((s, w) => s + w, 0);
      let i = 0;
      while (i < rest.length - 1 && (r -= weights[i]) > 0) i++;
      picked.push(rest[i]);
      rest = rest.filter((_, k) => k !== i);
    }
    // a light shuffle inside the act so starred questions aren't always first
    for (let i = picked.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [picked[i], picked[j]] = [picked[j], picked[i]]; }
    out.push(...picked.map(q => q.id));
  }
  return out;
}
