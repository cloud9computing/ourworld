import { distanceKm } from '../shape/geo';
import { MERGE_KM, type Place } from '../shape/polygon';

export type Match = 'same' | 'region' | 'different' | 'onlyA' | 'onlyB' | 'none';

export const REGION_KM = 300;

/** How two answers to the same question relate. Never a judgement: all three main states are equal. */
export function classify(a?: Place, b?: Place): Match {
  if (!a && !b) return 'none';
  if (!b) return 'onlyA';
  if (!a) return 'onlyB';
  if (a.id === b.id || distanceKm(a, b) <= MERGE_KM) return 'same';
  if (a.cc === b.cc && ((a.admin && a.admin === b.admin) || distanceKm(a, b) <= REGION_KM)) return 'region';
  return 'different';
}

/** Places both people have been (within the merge distance), and places only one of them has. */
export function compareLists<T extends Place>(a: T[], b: T[]) {
  const near = (p: T, list: T[]) => list.some(q => q.id === p.id || distanceKm(p, q) <= MERGE_KM);
  const both = a.filter(p => near(p, b));
  return { both, onlyA: a.filter(p => !near(p, b)), onlyB: b.filter(p => !near(p, a)) };
}
