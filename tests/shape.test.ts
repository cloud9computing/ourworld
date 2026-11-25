import { describe, expect, it } from 'vitest';
import ref from './fixtures/reference.json';
import { azimuthalProjection, distanceKm, polarProjection } from '../src/lib/shape/geo';
import { buildShape, fitChart, boundingCentre, mergeNearby, orderLoop, type Place } from '../src/lib/shape/polygon';
import { buildWorld, centreOf } from '../src/lib/shape/world';

const refPlaces = ref.places.map((p, i) => ({ ...p, id: i + 1 }));
const byName = (n: string) => refPlaces.find(p => p.name === n)!;

describe('port of assets/shape_reference.py', () => {
  const project = polarProjection(ref.rotation);

  it('projects every place exactly like the reference', () => {
    for (const p of refPlaces) {
      const q = project(p), [x, y] = (ref.points as Record<string, number[]>)[p.name];
      expect(q.x).toBeCloseTo(x, 9);
      expect(q.y).toBeCloseTo(y, 9);
    }
  });

  it('orders the loop like the reference', () => {
    expect(orderLoop(refPlaces, project).map(p => p.name)).toEqual(ref.order);
  });

  it('produces the same 156 arc samples', () => {
    const shape = buildShape(refPlaces, project, 12);
    expect(shape.kind).toBe('loop');
    if (shape.kind !== 'loop') return;
    expect(shape.path.length).toBe(ref.arcs.length);
    shape.path.forEach((p, i) => {
      expect(p.x).toBeCloseTo(ref.arcs[i][0], 9);
      expect(p.y).toBeCloseTo(ref.arcs[i][1], 9);
    });
  });

  it('keeps every arc sample inside the frame when fitted like the reference', () => {
    const pts = refPlaces.map(project);
    const fit = fitChart(pts, boundingCentre(pts), 500, 500, 500, 70);
    const shape = buildShape(refPlaces, project, 12);
    if (shape.kind !== 'loop') throw new Error('expected loop');
    for (const p of shape.path) expect(Math.hypot((p.x - fit.ox) * fit.scale, (p.y - fit.oy) * fit.scale)).toBeLessThanOrEqual(430 + 1e-6);
  });

  it('gives the same order whatever order the places come in', () => {
    const shuffled = [...refPlaces].reverse();
    expect(orderLoop(shuffled, project).map(p => p.name)).toEqual(ref.order);
  });

  it('changes only the two edges next to a new place', () => {
    const before = orderLoop(refPlaces, project).map(p => p.name);
    const extra = { name: 'Tokyo', lat: 35.68, lon: 139.69, id: 99 };
    const after = orderLoop([...refPlaces, extra], project).map(p => p.name);
    expect(after.filter(n => n !== 'Tokyo')).toEqual(before);
  });
});

const P = (id: number, name: string, lat: number, lon: number, cc = 'XX', admin = ''): Place => ({ id, name, lat, lon, cc, admin });

describe('merging and small sets', () => {
  it('merges places within 50 km and keeps those just beyond apart', () => {
    const a = P(1, 'A', 0, 0);
    const near = P(2, 'B', 0, 49 / 111.195); // ~49 km east
    const far = P(3, 'C', 0, 51 / 111.195); // ~51 km east
    expect(distanceKm(a, near)).toBeLessThan(50);
    expect(mergeNearby([a, near]).length).toBe(1);
    expect(mergeNearby([a, far]).length).toBe(2);
  });

  it('keeps the reference pair Valiyaparamba and Wayanad (116 km) apart', () => {
    expect(mergeNearby([byName('Valiyaparamba'), byName('Wayanad')].map((p, i) => ({ ...p, cc: 'IN', admin: '', id: i + 1 }))).length).toBe(2);
  });

  it('draws nothing, a dot or a line for fewer than three places', () => {
    const pr = polarProjection();
    expect(buildShape([], pr).kind).toBe('empty');
    expect(buildShape([P(1, 'A', 10, 10)], pr).kind).toBe('dot');
    expect(buildShape([P(1, 'A', 10, 10), P(2, 'B', 20, 20)], pr).kind).toBe('line');
  });
});

describe('azimuthal projection', () => {
  const c = { lat: 12.97, lon: 77.59 };
  const pr = azimuthalProjection(c);
  it('puts the centre at the origin, north up and east right', () => {
    const o = pr(c);
    expect(Math.hypot(o.x, o.y)).toBeLessThan(1e-9);
    expect(pr({ lat: 30, lon: 77.59 }).y).toBeLessThan(0);
    expect(pr({ lat: 13, lon: 90 }).x).toBeGreaterThan(0);
  });
  it('keeps true distance from the centre (1 unit = 90 degrees)', () => {
    const p = { lat: 51.5, lon: -0.13 };
    const units = Math.hypot(pr(p).x, pr(p).y);
    expect(units * (Math.PI / 2) * 6371).toBeCloseTo(distanceKm(c, p), 3);
  });
});

describe('our world', () => {
  const blr = P(10, 'Bangalore', 12.97, 77.59, 'IN', '19');
  const hyd = P(11, 'Hyderabad', 17.39, 78.49, 'IN', '40');
  it('centres between two homes, or on a shared home', () => {
    const m = centreOf({ name: 'A', home: blr, places: [], dreams: [] }, { name: 'B', home: hyd, places: [], dreams: [] });
    expect(distanceKm(m, blr)).toBeCloseTo(distanceKm(m, hyd), 3);
    expect(centreOf({ name: 'A', home: blr, places: [], dreams: [] }, { name: 'B', home: blr, places: [], dreams: [] })).toEqual(blr);
  });
  it('counts places and countries from the union, with shared places once', () => {
    const lis = P(20, 'Lisbon', 38.72, -9.14, 'PT');
    const w = buildWorld(
      { name: 'A', home: blr, places: [lis, P(21, 'Rome', 41.9, 12.5, 'IT')], dreams: [] },
      { name: 'B', home: hyd, places: [lis, P(22, 'Paris', 48.86, 2.35, 'FR')], dreams: [] },
    );
    expect(w.counts).toEqual({ places: 5, countries: 4 });
    expect(w.dots.find(d => d.id === 20)?.who).toBe('both');
  });
});
