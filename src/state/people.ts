// Turns a game's stored answers (city ids) into the two people the reveal and poster work with.
import { byId, JUST_MET, type BankQuestion } from '../data/bank';
import type { City, CityIndex } from '../lib/places/index';
import type { PersonPlaces } from '../lib/shape/world';
import type { Answer } from '../lib/swap/codec';
import type { Game } from './game';

export type Person = {
  name: string;
  /** 0 started the game, 1 joined. */
  role: 0 | 1;
  answers: Record<number, City | undefined>;
  together: City[];
  lived: City[];
  /** Every place in this person's world, in question order, then the lists (for picking the named star). */
  ordered: City[];
  places: PersonPlaces;
};

/** Kinds of answer that are places in the answerer's own world (PRD changes v3; see Kind in bank.ts). */
const IN_WORLD = new Set(['past', 'us', 'mine', 'show', 'backTo']);

export function toPerson(index: CityIndex, name: string, role: 0 | 1, questions: number[], answers: Record<number, Answer | undefined>,
  together: number[], lived: number[], went: number[] = []): Person {
  const get = (id?: number) => (id ? index.byId.get(id) : undefined);
  const resolved: Record<number, City | undefined> = {};
  for (const q of questions) { const a = answers[q]; if (a?.status === 'answered') resolved[q] = get(a.place); }
  const qs = questions.map(q => byId.get(q)).filter((q): q is BankQuestion => !!q);
  const pick = (test: (q: BankQuestion) => boolean) => qs.filter(test).map(q => resolved[q.id]).filter((c): c is City => !!c);
  const t = together.map(get).filter((c): c is City => !!c), l = lived.map(get).filter((c): c is City => !!c);
  const w = went.map(get).filter((c): c is City => !!c);
  const ordered = [...pick(q => IN_WORLD.has(q.kind)), ...t, ...l];
  return {
    name, role, answers: resolved, together: t, lived: l, ordered,
    // places ticked off as "We went" join both worlds
    places: { name, visited: [...ordered, ...w], dreams: pick(q => q.kind === 'dream') },
  };
}

export function me(index: CityIndex, g: Game): Person {
  return toPerson(index, g.myName, g.role, g.questions, g.answers, g.together, g.lived, g.went);
}

/** Both people, the one who started the game first, so both phones show the same order. */
export function bothPeople(index: CityIndex, g: Game): [Person, Person] | null {
  if (!g.partner) return null;
  const mine = me(index, g);
  const theirs = toPerson(index, g.partnerName, g.role === 0 ? 1 : 0, g.questions, g.partner.answers, g.partner.together, g.partner.lived, g.went);
  return g.role === 0 ? [mine, theirs] : [theirs, mine];
}

/** Distinct places named so far (for "7 places so far"). */
export function placeCount(g: Game): number {
  const ids = new Set<number>();
  for (const a of Object.values(g.answers)) if (a?.status === 'answered' && a.place) ids.add(a.place);
  g.together.forEach(i => ids.add(i)); g.lived.forEach(i => ids.add(i));
  return ids.size;
}

/** Both people's answers interleaved question by question (first partner, then second), then the lists. */
export function mentions(a: Person, b: Person): City[] {
  const out: City[] = [];
  for (let i = 0; i < Math.max(a.ordered.length, b.ordered.length); i++) {
    if (a.ordered[i]) out.push(a.ordered[i]);
    if (b.ordered[i]) out.push(b.ordered[i]);
  }
  return out;
}

export const isJustMet = (g: Pick<Game, 'tier'>) => g.tier === JUST_MET;
