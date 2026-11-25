import { describe, expect, it } from 'vitest';
import { classify, compareLists } from '../src/lib/reveal/reveal';
import type { Place } from '../src/lib/shape/polygon';

const P = (id: number, lat: number, lon: number, cc: string, admin = ''): Place => ({ id, name: String(id), lat, lon, cc, admin });
const seville = P(1, 37.39, -5.99, 'ES', '51'), cadiz = P(2, 36.53, -6.29, 'ES', '51'), madrid = P(3, 40.42, -3.70, 'ES', '29');
const goa = P(4, 15.5, 73.83, 'IN'), kyoto = P(5, 35.01, 135.77, 'JP');

describe('reveal states', () => {
  it('same city', () => expect(classify(seville, { ...seville })).toBe('same'));
  it('same region (same admin area)', () => expect(classify(seville, cadiz)).toBe('region'));
  it('same country but far apart in different regions is different', () => expect(classify(seville, madrid)).toBe('different'));
  it('different', () => expect(classify(goa, kyoto)).toBe('different'));
  it('one answer only', () => { expect(classify(goa, undefined)).toBe('onlyA'); expect(classify(undefined, goa)).toBe('onlyB'); });
  it('lists: both and only one', () => {
    const r = compareLists([seville, goa], [goa, kyoto]);
    expect(r.both.map(p => p.id)).toEqual([4]);
    expect(r.onlyA.map(p => p.id)).toEqual([1]);
    expect(r.onlyB.map(p => p.id)).toEqual([5]);
  });
});
