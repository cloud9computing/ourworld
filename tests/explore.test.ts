import { describe, expect, it } from 'vitest';
import { setFor, byId } from '../src/data/bank';
import { beenKey, exploreCount, exploreList, nextToExplore } from '../src/lib/explore';
import { aroundTheWorld, buildWorld } from '../src/lib/shape/world';
import { posterSvg } from '../src/lib/shape/poster';
import type { City } from '../src/lib/places/index';
import type { Person } from '../src/state/people';

let nextId = 1;
const C = (name: string, lat: number, lon: number, cc: string): City =>
  ({ id: nextId++, name, lat, lon, cc, admin: '', pop: 1, country: cc, capital: false, tz: 'UTC', cont: '' });
const chennai = C('Chennai', 13.08, 80.27, 'IN'), vienna = C('Vienna', 48.21, 16.37, 'AT'), goa = C('Goa', 15.45, 73.8, 'IN');
const lisbon = C('Lisbon', 38.72, -9.14, 'PT'), rome = C('Rome', 41.9, 12.5, 'IT'), paris = C('Paris', 48.86, 2.35, 'FR');
const kyoto = C('Kyoto', 35.01, 135.77, 'JP'), reykjavik = C('Reykjavik', 64.15, -21.94, 'IS'), kochi = C('Kochi', 9.93, 76.27, 'IN');
const bali = C('Bali', -8.41, 115.19, 'ID'), hanoi = C('Hanoi', 21.03, 105.85, 'VN'), lima = C('Lima', -12.05, -77.04, 'PE');
const jaipur = C('Jaipur', 26.91, 75.79, 'IN'), mumbai = C('Mumbai', 19.08, 72.88, 'IN');

function person(name: string, role: 0 | 1, tier: 0 | 2, answers: (City | undefined)[], together: City[] = []): Person {
  const ids = setFor(tier), byQ: Record<number, City | undefined> = {};
  ids.forEach((id, i) => { byQ[id] = answers[i]; });
  const visited = ids.filter(id => byId.get(id)!.kind !== 'dream' && byId.get(id)!.kind !== 'guess').map(id => byQ[id]).filter((c): c is City => !!c);
  return { name, role, answers: byQ, together, lived: [], ordered: visited, places: { name, visited, dreams: [] } };
}

// "1–3 years": Act 1 = 4 past places, Act 2 = 4 shared, Act 3 = dream, dream, show, dream
const q = setFor(2);
const ravi = person('Ravi', 0, 2, [chennai, vienna, goa, lisbon, rome, paris, rome, rome, kyoto, reykjavik, chennai, lisbon]);
const tara = person('Tara', 1, 2, [kochi, bali, hanoi, paris, rome, rome, paris, rome, kyoto, lima, hanoi, rome]);
const been = {
  [beenKey(q[0], 0)]: false, // Chennai: not yet
  [beenKey(q[1], 0)]: true, // Vienna: we've been together
  [beenKey(q[2], 0)]: false, // Goa: not yet
  [beenKey(q[0], 1)]: false, // Kochi: not yet
  [beenKey(q[1], 1)]: false, // Bali: not yet
  [beenKey(q[2], 1)]: true, // Hanoi: we've been together
};

describe('places to explore (R4)', () => {
  const list = exploreList({ tier: 2, questions: q, a: ravi, b: tara, been, went: [] });

  it('orders shared dreams first, then places from the past marked "Not yet", then other dreams', () => {
    expect(list.map(e => e.place.name)).toEqual(['Kyoto', 'Chennai', 'Kochi', 'Bali', 'Goa', 'Reykjavik', 'Lima', 'Lisbon']);
    expect(list.map(e => e.group)).toEqual([1, 2, 2, 2, 2, 3, 3, 3]);
  });

  it('excludes places marked "We\'ve been together" and places already visited together', () => {
    const names = list.map(e => e.place.name);
    expect(names).not.toContain('Vienna'); // marked together
    expect(names).not.toContain('Hanoi'); // marked together, so Tara's "show" answer for it is left out too
    expect(names).not.toContain('Rome'); // an Act 2 place: already shared, so Tara's dream of it is left out
  });

  it('merges duplicates, keeping the most important origin', () => {
    expect(list.filter(e => e.place.name === 'Chennai')).toHaveLength(1);
    expect(list.find(e => e.place.name === 'Chennai')!.origin).toBe('where Ravi was happiest as a kid');
    expect(list.filter(e => e.place.name === 'Kyoto')).toHaveLength(1);
  });

  it('words each origin type', () => {
    const by = (n: string) => list.find(e => e.place.name === n)!;
    expect(by('Kyoto').origin).toBe('you both dream of it');
    expect(by('Kyoto').posterOrigin).toBe('where you both want to go');
    expect(by('Goa').origin).toBe('the food Ravi would go back for');
    expect(by('Reykjavik').origin).toBe('on Ravi’s secret wishlist');
    expect(by('Lisbon').origin).toBe('where Ravi could see you living for a year');
  });

  it('updates the count when a place is ticked off as "We went"', () => {
    expect(exploreCount(list)).toBe(8);
    const ticked = exploreList({ tier: 2, questions: q, a: ravi, b: tara, been, went: [bali.id, kyoto.id] });
    expect(exploreCount(ticked)).toBe(6);
    expect(nextToExplore(ticked)!.place.name).toBe('Chennai');
  });

  it('leaves out Act 1 places until the "Been there together?" choice is made', () => {
    const undecided = exploreList({ tier: 2, questions: q, a: ravi, b: tara, been: {}, went: [] });
    // Chennai and Hanoi still come in as places each wants to show the other
    expect(undecided.map(e => e.place.name)).toEqual(['Kyoto', 'Reykjavik', 'Lima', 'Chennai', 'Hanoi', 'Lisbon']);
    expect(undecided.find(e => e.place.name === 'Chennai')!.origin).toBe('the place Ravi wants to show Tara');
  });

  it('Just met: every place from the other’s world goes in, unless both named it', () => {
    const jm = setFor(0);
    const aanya = person('Aanya', 0, 0, [jaipur, mumbai]);
    const kabir = person('Kabir', 1, 0, [mumbai, goa]);
    const l = exploreList({ tier: 0, questions: jm, a: aanya, b: kabir, been: {}, went: [] });
    expect(l.map(e => e.place.name)).toEqual(['Jaipur', 'Goa']); // Mumbai was named by both
  });

  it('includes "A place from our early days we should go back to" as somewhere to go back to', () => {
    const t5 = setFor(5);
    const a = person('Ravi', 0, 2, []), b = person('Tara', 1, 2, []);
    a.answers = { [t5[7]]: lisbon };
    const l = exploreList({ tier: 5, questions: t5, a, b, been: {}, went: [] });
    expect(l.map(e => [e.place.name, e.origin])).toEqual([['Lisbon', 'somewhere to go back to']]);
  });
});

describe('around the world', () => {
  it('is 360° minus the largest east–west gap, over 360', () => {
    expect(aroundTheWorld([0, 90, 180])).toBeCloseTo(0.5);
    expect(aroundTheWorld([-10, 10])).toBeCloseTo(20 / 360);
    expect(aroundTheWorld([170, -170])).toBeCloseTo(20 / 360); // across the date line
    expect(aroundTheWorld([0, 120, 240])).toBeCloseTo(240 / 360);
  });
});

describe('poster hero (R5)', () => {
  const world = buildWorld(ravi.places, tara.places);
  const texts = (svg: string) => [...svg.matchAll(/>([^<]+)</g)].map(m => m[1].trim()).filter(Boolean);
  const make = (explore: { count: number; next?: { name: string; origin: string } }, showPlace = true, w = world) =>
    texts(posterSvg(w, { format: 'story', names: ['Ravi', 'Tara'], showNames: true, showPlace, explore, land: [], link: 'https://x.example' }));
  const around = `${Math.round(world.aroundWorld! * 100)}%`;

  it('shows the count, the caption, the supporting line and the next place', () => {
    const t = make({ count: 14, next: { name: 'Chennai', origin: 'where Ravi was happiest as a kid' } });
    expect(t).toEqual(expect.arrayContaining(['14', 'PLACES STILL TO EXPLORE IN EACH OTHER’S WORLDS', 'Next: Chennai, where Ravi was happiest as a kid']));
    expect(t).toContain(`${world.counts.places} places · ${world.counts.countries} countries · ${around} of the way around the world`);
  });

  it.each([
    ['where you both want to go', 'Next: Kyoto, where you both want to go'],
    ['on Ravi’s secret wishlist', 'Next: Kyoto, on Ravi’s secret wishlist'],
    ['somewhere to go back to', 'Next: Kyoto, somewhere to go back to'],
  ])('words the next place for each origin: %s', (origin, line) => {
    expect(make({ count: 3, next: { name: 'Kyoto', origin } })).toContain(line);
  });

  it('handles zero places to explore', () => {
    const t = make({ count: 0 });
    expect(t).toEqual(expect.arrayContaining([around, 'OF THE WAY AROUND THE WORLD', 'You’ve explored each other’s worlds. Time for new ones.']));
    expect(t.join(' ')).not.toMatch(/Next:/);
  });

  it('handles fewer than 3 visited places', () => {
    const small = buildWorld({ name: 'A', visited: [goa], dreams: [] }, { name: 'B', visited: [lisbon], dreams: [] });
    expect(make({ count: 2, next: { name: 'Kyoto', origin: 'on Ravi’s wishlist' } }, true, small)).toContain('2 places · 2 countries · Just getting started');
  });

  it('hides place names: no star label, and "Next: somewhere new"', () => {
    const t = make({ count: 5, next: { name: 'Chennai', origin: 'where Ravi was happiest as a kid' } }, false);
    expect(t).toContain('Next: somewhere new');
    expect(t.join(' ')).not.toMatch(/Chennai|CHENNAI/);
  });

  it('keeps the earlier removals: no "=", no North Pole, no "Mine + yours = ours", no per-person counts', () => {
    const t = make({ count: 5, next: { name: 'Chennai', origin: 'x' } }).join(' | ');
    expect(t).not.toMatch(/=|North Pole|Mine \+ yours|of the planet|the size of either world/i);
  });
});
