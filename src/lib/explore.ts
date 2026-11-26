// Places to explore (PRD changes v3, R4): the other's past places you haven't been to together, plus dreams.
import { byId, JUST_MET, originText, type BankQuestion, type Tier } from '../data/bank';
import { distanceKm } from './shape/geo';
import { MERGE_KM } from './shape/polygon';
import type { City } from './places/index';
import type { Person } from '../state/people';

export type ExploreEntry = {
  place: City;
  /** For the list: "where Ravi was happiest as a kid", "you both dream of it". */
  origin: string;
  /** For the poster's dream line: "where Ravi was happiest as a kid", "where you both want to go". */
  posterOrigin: string;
  /** 1 dreams both named, 2 places from a partner's past (and places to go back to), 3 other dreams. */
  group: 1 | 2 | 3;
  went: boolean;
};

const near = (a: City, b: City) => a.id === b.id || distanceKm(a, b) <= MERGE_KM;
const nearAny = (p: City, list: City[]) => list.some(q => near(p, q));

export const beenKey = (questionId: number, role: 0 | 1) => `${questionId}:${role}`;

/** Every place a person named anywhere: answers (except guesses) and lists. */
export function namedBy(p: Person, questions: BankQuestion[]): City[] {
  return [...questions.filter(q => q.kind !== 'guess').map(q => p.answers[q.id]).filter((c): c is City => !!c), ...p.together, ...p.lived];
}

/**
 * Has the other partner named this place anywhere in their own answers? Then an Act 1 place is already shared:
 * the "Been there together?" step is skipped (R3).
 */
export function alreadyShared(place: City, other: Person, questions: BankQuestion[]): boolean {
  return nearAny(place, namedBy(other, questions));
}

export function exploreList(args: {
  tier: Tier; questions: number[]; a: Person; b: Person; been: Record<string, boolean>; went: number[];
}): ExploreEntry[] {
  const { tier, a, b, been } = args;
  const qs = args.questions.map(id => byId.get(id)).filter((q): q is BankQuestion => !!q);
  const justMet = tier === JUST_MET;

  // places the couple has already been to together
  const together: City[] = [];
  for (const p of [a, b]) {
    for (const q of qs) {
      const c = p.answers[q.id];
      if (!c) continue;
      if (q.kind === 'us' || q.kind === 'backTo') together.push(c);
      if (q.kind === 'past' && been[beenKey(q.id, p.role)] === true) together.push(c);
    }
    if (!justMet) together.push(...p.together, ...p.lived);
  }

  type Candidate = ExploreEntry & { order: number };
  const out: Candidate[] = [];
  const dreamsOf = (p: Person) => qs.filter(q => q.kind === 'dream' || q.kind === 'show').map(q => p.answers[q.id]).filter((c): c is City => !!c);
  const dreamsA = dreamsOf(a), dreamsB = dreamsOf(b);

  qs.forEach((q, qi) => {
    for (const [owner, other] of [[a, b], [b, a]] as [Person, Person][]) {
      const place = owner.answers[q.id];
      if (!place) continue;
      const order = qi * 2 + owner.role;
      const origin = originText(q, owner.name, other.name);
      if (q.kind === 'past') {
        const notYet = justMet ? !alreadyShared(place, other, qs) : been[beenKey(q.id, owner.role)] === false;
        if (notYet) out.push({ place, origin, posterOrigin: origin, group: 2, went: false, order });
      } else if (q.kind === 'backTo') {
        out.push({ place, origin, posterOrigin: origin, group: 2, went: false, order });
      } else if (q.kind === 'dream' || q.kind === 'show') {
        const shared = nearAny(place, owner === a ? dreamsB : dreamsA);
        out.push(shared
          ? { place, origin: 'you both dream of it', posterOrigin: 'where you both want to go', group: 1, went: false, order }
          : { place, origin, posterOrigin: origin, group: 3, went: false, order });
      }
    }
  });

  out.sort((x, y) => x.group - y.group || x.order - y.order);
  const went = args.went;
  const result: ExploreEntry[] = [];
  for (const c of out) {
    // a place to go back to is shared on purpose; everything else already visited together is left out
    if (c.origin !== 'somewhere to go back to' && nearAny(c.place, together)) continue;
    if (result.some(r => near(r.place, c.place))) continue; // duplicates merge (the first, most important, wins)
    const { order: _order, ...entry } = c;
    result.push({ ...entry, went: went.some(id => id === c.place.id) });
  }
  return result;
}

/** How many places are still to explore: everything not ticked off. */
export const exploreCount = (list: ExploreEntry[]) => list.filter(e => !e.went).length;
export const nextToExplore = (list: ExploreEntry[]) => list.find(e => !e.went);
