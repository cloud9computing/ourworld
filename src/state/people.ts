// Turns a game's stored answers (city ids) into the two people the reveal and poster work with.
import { byId, type BankQuestion } from '../data/bank';
import type { City, CityIndex } from '../lib/places/index';
import type { PersonPlaces } from '../lib/shape/world';
import type { Answer } from '../lib/swap/codec';
import type { Game } from './game';

export type Person = {
  name: string;
  answers: Record<number, City | undefined>;
  together: City[];
  lived: City[];
  /** Every visited place this person named, in question order, then the lists. */
  ordered: City[];
  places: PersonPlaces;
};

export function toPerson(index: CityIndex, name: string, questions: number[], answers: Record<number, Answer | undefined>, together: number[], lived: number[]): Person {
  const get = (id?: number) => (id ? index.byId.get(id) : undefined);
  const resolved: Record<number, City | undefined> = {};
  for (const q of questions) { const a = answers[q]; if (a?.status === 'answered') resolved[q] = get(a.place); }
  const qs = questions.map(q => byId.get(q)).filter((q): q is BankQuestion => !!q);
  const pick = (act: number) => qs.filter(q => q.act === act).map(q => resolved[q.id]).filter((c): c is City => !!c);
  const t = together.map(get).filter((c): c is City => !!c), l = lived.map(get).filter((c): c is City => !!c);
  const ordered = [...qs.filter(q => q.act !== 3).map(q => resolved[q.id]).filter((c): c is City => !!c), ...t, ...l];
  return { name, answers: resolved, together: t, lived: l, ordered, places: { name, visited: [...pick(1), ...pick(2), ...t, ...l], dreams: pick(3) } };
}

export function me(index: CityIndex, g: Game): Person {
  return toPerson(index, g.myName, g.questions, g.answers, g.together, g.lived);
}

/** Both people, the one who started the game first, so both phones show the same order. */
export function bothPeople(index: CityIndex, g: Game): [Person, Person] | null {
  if (!g.partner) return null;
  const mine = me(index, g);
  const theirs = toPerson(index, g.partnerName, g.questions, g.partner.answers, g.partner.together, g.partner.lived);
  return g.role === 0 ? [mine, theirs] : [theirs, mine];
}

/** Distinct places named so far, dreams included (for "7 places so far"). */
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
