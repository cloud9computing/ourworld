import { describe, expect, it } from 'vitest';
import { featuredPlace, formatShare, growthText, loopArea } from '../src/lib/shape/area';
import { buildWorld } from '../src/lib/shape/world';
import { posterSvg, type PosterFormat } from '../src/lib/shape/poster';
import type { Place } from '../src/lib/shape/polygon';

const P = (id: number, name: string, lat: number, lon: number, cc: string): Place => ({ id, name, lat, lon, cc, admin: '' });
const lis = P(1, 'Lisbon', 38.72, -9.14, 'PT'), rome = P(2, 'Rome', 41.9, 12.5, 'IT'), goa = P(3, 'Goa', 15.45, 73.8, 'IN');
const cape = P(4, 'Cape Town', -33.92, 18.42, 'ZA'), paris = P(5, 'Paris', 48.86, 2.35, 'FR'), sydney = P(6, 'Sydney', -33.87, 151.21, 'AU');
const tokyo = P(7, 'Tokyo', 35.68, 139.69, 'JP'), ny = P(8, 'New York', 40.71, -74.0, 'US');
const kyoto = P(20, 'Kyoto', 35.01, 135.77, 'JP'), reykjavik = P(21, 'Reykjavik', 64.15, -21.94, 'IS');
const dubai = P(22, 'Dubai', 25.2, 55.27, 'AE'), lima = P(23, 'Lima', -12.05, -77.04, 'PE');
const CONT: Record<string, string> = { PT: 'EU', IT: 'EU', IN: 'AS', ZA: 'AF', FR: 'EU', AU: 'OC', JP: 'AS', US: 'NA', IS: 'EU', AE: 'AS', PE: 'SA' };
const continentOf = (cc: string) => CONT[cc] ?? '';

describe('area on the sphere', () => {
  it('measures known shapes', () => {
    expect(loopArea([{ lat: 0, lon: 0 }, { lat: 0, lon: 90 }, { lat: 90, lon: 0 }])).toBeCloseTo(1 / 8, 3); // an octant
    expect(loopArea([{ lat: 0, lon: 0 }, { lat: 0, lon: 90 }, { lat: 0, lon: 180 }, { lat: 0, lon: -90 }])).toBeCloseTo(0.5, 3); // a hemisphere
    // a 10 x 10 degree "square" at the equator: about 1.23 million km² of 510 million
    expect(loopArea([{ lat: 0, lon: 0 }, { lat: 0, lon: 10 }, { lat: 10, lon: 10 }, { lat: 10, lon: 0 }])).toBeCloseTo(0.002418, 5);
  });
  it('uses the smaller of the two regions', () => {
    // the same loop walked the other way round still encloses the smaller side
    expect(loopArea([{ lat: 10, lon: 0 }, { lat: 10, lon: 10 }, { lat: 0, lon: 10 }, { lat: 0, lon: 0 }])).toBeCloseTo(0.002418, 5);
  });
  it('is zero for fewer than three places', () => {
    expect(loopArea([{ lat: 0, lon: 0 }, { lat: 10, lon: 10 }])).toBe(0);
  });
});

describe('share of the planet', () => {
  it('rounds to a whole percent, with one decimal below 1%', () => {
    expect(formatShare(0.2342)).toBe('23%');
    expect(formatShare(0.0123)).toBe('1%');
    expect(formatShare(0.004)).toBe('0.4%');
    expect(formatShare(0.0002)).toBe('<0.1%');
  });
});

describe('growth wording', () => {
  it.each([
    [1.19, 'Bigger together'],
    [1.0, 'Bigger together'],
    [1.2, '1.2× the size of either world alone'],
    [1.5, '1.5× the size of either world alone'],
    [1.7, '1.7× the size of either world alone'],
    [1.8, 'Twice the size of either world alone'],
    [2.4, 'Twice the size of either world alone'],
    [2.5, 'Three times the size of either world alone'],
    [3.4, 'Three times the size of either world alone'],
    [3.5, '3.5× the size of either world alone'],
    [4.0, '4× the size of either world alone'],
    [12.3, '12× the size of either world alone'],
  ])('%s → %s', (ratio, text) => expect(growthText(ratio)).toBe(text));
  it('says "Bigger together" when either partner has fewer than 3 places', () => expect(growthText(null)).toBe('Bigger together'));
});

describe('fixed couples', () => {
  it('a couple spread across the world', () => {
    const w = buildWorld(
      { name: 'A', visited: [lis, rome, goa, cape], dreams: [reykjavik] },
      { name: 'B', visited: [lis, paris, sydney, tokyo, goa], dreams: [dubai, lima] },
      { continentOf, mentions: [lis, lis, goa, paris, goa, goa, rome] },
    );
    expect(w.share).toBe('12%');
    expect(w.growth).toBe('Twice the size of either world alone');
    expect(w.counts).toMatchObject({ countries: 7, continents: 4 });
    // Lima opens the shape out across the Atlantic the most
    expect(w.dream).toEqual({ kind: 'next', name: 'Lima', share: '46%' });
    // Goa and Lisbon were both named by both; Goa is named in more answers
    expect(w.featured?.name).toBe('Goa');
  });

  it('fewer than 3 places: no percentage yet', () => {
    const w = buildWorld({ name: 'A', visited: [lis], dreams: [kyoto] }, { name: 'B', visited: [goa], dreams: [] });
    expect(w.share).toBeNull();
    expect(w.growth).toBe('Bigger together');
    expect(w.dream).toEqual({ kind: 'next', name: 'Kyoto', share: '7%' });
  });

  it('no dreams: no dream line', () => {
    const w = buildWorld({ name: 'A', visited: [lis, rome, goa], dreams: [] }, { name: 'B', visited: [lis, paris, ny], dreams: [] });
    expect(w.share).toBe('4%');
    expect(w.growth).toBe('4.4× the size of either world alone');
    expect(w.dream).toBeNull();
  });

  it('a dream that falls inside the shape', () => {
    const w = buildWorld({ name: 'A', visited: [lis, goa, cape], dreams: [dubai] }, { name: 'B', visited: [lis, sydney, tokyo], dreams: [] });
    expect(w.dream).toEqual({ kind: 'inside', name: 'Dubai' });
  });

  it('a dream they have already been to counts as inside', () => {
    const w = buildWorld({ name: 'A', visited: [lis, goa, cape], dreams: [goa] }, { name: 'B', visited: [lis, sydney, tokyo], dreams: [] });
    expect(w.dream).toEqual({ kind: 'inside', name: 'Goa' });
  });
});

describe('the one named star', () => {
  const dot = (p: Place, who: string) => ({ ...p, members: [p], who });
  it('picks the shared place named most often, then the earliest', () => {
    const dots = [dot(lis, 'both'), dot(goa, 'both'), dot(rome, 'a')];
    expect(featuredPlace(dots, [lis, goa, goa, lis, rome, rome, rome])?.name).toBe('Lisbon'); // tie 2–2: Lisbon first
    expect(featuredPlace(dots, [lis, goa, goa, goa, lis])?.name).toBe('Goa');
  });
  it('names nothing when no place was named by both', () => {
    expect(featuredPlace([dot(lis, 'a'), dot(goa, 'b')], [lis, goa])).toBeUndefined();
  });
});

describe('poster (F14 acceptance)', () => {
  const land = [0, 50, 10, 45, 75, 20];
  const w = buildWorld(
    { name: 'Ravi', visited: [lis, rome, goa, cape], dreams: [reykjavik] },
    { name: 'Tara', visited: [lis, paris, sydney, tokyo, goa], dreams: [lima] },
    { continentOf, mentions: [lis, lis, goa, goa, goa] },
  );
  const texts = (svg: string) => [...svg.matchAll(/>([^<]+)</g)].map(m => m[1].trim()).filter(Boolean);
  const make = (format: PosterFormat, showPlace = true) =>
    posterSvg(w, { format, names: ['Ravi', 'Tara'], showNames: true, showPlace, land, link: 'https://ourworld.example' });

  it.each(['story', 'feed'] as PosterFormat[])('%s has no "=", "North Pole" or "Mine + yours = ours"', format => {
    const t = texts(make(format)).join(' | ');
    expect(t).not.toMatch(/=/);
    expect(t).not.toMatch(/North Pole/i);
    expect(t).not.toMatch(/Mine \+ yours/i);
  });

  it('story: two worlds, the hero block, the dream line and the footer', () => {
    const t = texts(make('story'));
    expect(t).toEqual(expect.arrayContaining(['Ravi’s world', 'Tara’s world', '+', '12%', 'OF THE PLANET', 'GOA', 'How big is yours?']));
    expect(t.join(' ')).toMatch(/Ravi &amp; Tara’s world/); // the "&" is its own pink span
    expect(t).toContain('Twice the size of either world alone · 7 countries · 4 continents');
    expect(t).toContain('Next: Lima would make it 46%');
    expect(t.join(' ')).not.toMatch(/\d+ places/);
  });

  it('feed: no small charts, same hero and dream line', () => {
    const t = texts(make('feed'));
    expect(t).not.toContain('+');
    expect(t).not.toContain('Ravi’s world');
    expect(t).toEqual(expect.arrayContaining(['12%', 'Next: Lima would make it 46%', 'How big is yours?']));
  });

  it('turning off the place label leaves no place names', () => {
    const t = texts(make('story', false)).join(' | ');
    for (const name of ['GOA', 'Goa', 'LISBON', 'Lisbon']) expect(t).not.toContain(name);
  });
});
