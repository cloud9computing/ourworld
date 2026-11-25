// Turns stored answers (city ids) into the two people the reveal and poster work with.
import { QUESTIONS, type QuestionId } from '../data/questions';
import type { CityIndex, City } from '../lib/places/index';
import type { PersonWorld } from '../lib/shape/world';
import type { Answer, Session } from './session';

export type Person = {
  deviceId: string;
  name: string;
  answers: Partial<Record<QuestionId, City | undefined>>;
  others: City[];
  /** Every place they've been, home included, without dreams. */
  visited: City[];
  world: PersonWorld;
  missing: number;
};

export function toPerson(index: CityIndex, deviceId: string, name: string, answers: Partial<Record<QuestionId, Answer>>, others: number[]): Person {
  let missing = 0;
  const get = (id?: number) => { if (!id) return undefined; const c = index.byId.get(id); if (!c) missing++; return c; };
  const resolved: Partial<Record<QuestionId, City | undefined>> = {};
  for (const q of QUESTIONS) { const a = answers[q.id]; if (a?.status === 'answered') resolved[q.id] = get(a.place); }
  const otherCities = others.map(get).filter((c): c is City => !!c);
  const visited = QUESTIONS.filter(q => !q.dream && q.id !== 'home').map(q => resolved[q.id]).filter((c): c is City => !!c);
  const dreams = QUESTIONS.filter(q => q.dream).map(q => resolved[q.id]).filter((c): c is City => !!c);
  return {
    deviceId, name, answers: resolved, others: otherCities, missing,
    visited: [...(resolved.home ? [resolved.home] : []), ...visited, ...otherCities],
    world: { name, home: resolved.home, places: [...visited, ...otherCities], dreams },
  };
}

/** Both people, in an order both phones agree on (by device id). */
export function bothPeople(index: CityIndex, s: Session): [Person, Person] | null {
  if (!s.partner) return null;
  const me = toPerson(index, s.deviceId, s.firstName, s.answers, s.others);
  const them = toPerson(index, s.partner.deviceId, s.partner.firstName, s.partner.answers, s.partner.others);
  return me.deviceId < them.deviceId ? [me, them] : [them, me];
}

/** Distinct places a person has named so far (for "7 places so far"). */
export function placeCount(s: Session): number {
  const ids = new Set<number>();
  for (const a of Object.values(s.answers)) if (a?.status === 'answered' && a.place) ids.add(a.place);
  for (const o of s.others) ids.add(o);
  return ids.size;
}
