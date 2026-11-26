// How big is our world? (PRD F14 revised.) Areas of the loop on the sphere, the share of the planet,
// the growth wording, the dream line, and which shared place gets its name on the poster.
import { distanceKm, polarProjection, type LatLon, type Projection, type XY } from './geo';
import { greatCircle, orderLoop, smoothSegments, MERGE_KM, type Place } from './polygon';

const FOUR_PI = 4 * Math.PI;

const HALF_PI = Math.PI / 2;
/** Unit-sphere area per unit of chart area on the north-polar map, at chart radius r (r = 1 at the equator). */
const areaWeight = (r: number) => (r < 1e-9 ? HALF_PI * HALF_PI : (HALF_PI * Math.sin(r * HALF_PI)) / r);

/**
 * Surface area inside a closed outline drawn on the north-polar map, as a fraction of the Earth's surface.
 * The outline is filled with the non-zero rule, exactly as the chart fills it, so a loop that crosses itself
 * counts each covered part once. Scanlines across the outline, weighted by how the map stretches area.
 */
export function chartArea(path: XY[], rows = 480): number {
  if (path.length < 3) return 0;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of path) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
  const h = (maxY - minY) / rows, step = (maxX - minX) / rows;
  if (!(h > 0) || !(step > 0)) return 0;
  let total = 0;
  const hits: { x: number; dir: number }[] = [];
  for (let i = 0; i < rows; i++) {
    const y = minY + (i + 0.5) * h;
    hits.length = 0;
    for (let k = 0; k < path.length; k++) {
      const p = path[k], q = path[(k + 1) % path.length];
      if ((p.y <= y && q.y > y) || (q.y <= y && p.y > y)) hits.push({ x: p.x + ((y - p.y) * (q.x - p.x)) / (q.y - p.y), dir: q.y > p.y ? 1 : -1 });
    }
    hits.sort((a, b) => a.x - b.x);
    let winding = 0;
    for (let k = 0; k < hits.length - 1; k++) {
      winding += hits[k].dir;
      if (winding === 0) continue;
      const x0 = hits[k].x, x1 = hits[k + 1].x, n = Math.max(1, Math.ceil((x1 - x0) / step)), dx = (x1 - x0) / n;
      for (let j = 0; j < n; j++) { const x = x0 + (j + 0.5) * dx; total += areaWeight(Math.hypot(x, y)) * dx * h; }
    }
  }
  return total / FOUR_PI;
}

/**
 * Area enclosed by a closed loop of great-circle edges through `loop` (in this order), as a fraction of
 * the Earth's surface. The loop splits the globe in two; this is the smaller region, so at most 0.5.
 */
export function loopArea(loop: LatLon[]): number {
  if (loop.length < 3) return 0;
  const project = polarProjection(0);
  const path: XY[] = [];
  loop.forEach((a, i) => {
    const arc = greatCircle(a, loop[(i + 1) % loop.length], smoothSegments);
    for (let j = 0; j < arc.length - 1; j++) path.push(project(arc[j]));
  });
  const area = chartArea(path);
  return Math.min(area, 1 - area);
}

/** Area of the world drawn through these places: joined in order around the pole, as on the map. */
export function worldArea<T extends LatLon & { id: number }>(places: T[], project: Projection): number {
  return places.length < 3 ? 0 : loopArea(orderLoop(places, project));
}

/** "23%", or one decimal below 1% ("0.4%"). */
export function formatShare(fraction: number): string {
  const p = fraction * 100;
  if (p >= 0.995) return `${Math.round(p)}%`;
  if (p >= 0.05) return `${p.toFixed(1)}%`;
  return '<0.1%';
}

const trim = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/**
 * How much bigger together: combined area over the larger of the two individual areas.
 * `null` ratio (either partner has fewer than 3 places, or no individual area) reads "Bigger together".
 */
export function growthText(ratio: number | null): string {
  if (ratio === null || !Number.isFinite(ratio)) return 'Bigger together';
  if (ratio < 1.2) return 'Bigger together';
  const r = Math.round(ratio * 10) / 10;
  if (r <= 1.7) return `${trim(r)}× the size of either world alone`;
  if (r <= 2.4) return 'Twice the size of either world alone';
  if (r <= 3.4) return 'Three times the size of either world alone';
  return `${r < 10 ? trim(r) : Math.round(r)}× the size of either world alone`;
}

export type DreamLine = { kind: 'next'; name: string; share: string } | { kind: 'inside'; name: string };

/**
 * The dream that would grow the world most: recompute the area with each dream added.
 * If none grows it, the first dream is "already inside your world". No dreams: null.
 */
export function dreamLine<T extends Place>(places: T[], dreams: Place[], project: Projection): DreamLine | null {
  if (!dreams.length) return null;
  const base = worldArea(places, project);
  let best: { d: Place; area: number } | null = null;
  for (const d of dreams) {
    // a dream on top of a place they've been doesn't change the shape
    const set = places.some(p => distanceKm(p, d) <= MERGE_KM) ? places : [...places, d as T];
    const area = worldArea(set, project);
    if (!best || area > best.area) best = { d, area };
  }
  if (best && best.area > base + 1e-9) return { kind: 'next', name: best.d.name, share: formatShare(best.area) };
  return { kind: 'inside', name: dreams[0].name };
}

/**
 * The one star that gets its name on the poster: among places both partners named, the one named in the
 * most answers; ties go to the one whose first mention comes earliest. `mentions` lists every answer's
 * place in order (question by question, first partner then second, then the lists).
 */
export function featuredPlace<T extends Place & { members: Place[]; who: string }>(dots: T[], mentions: Place[]): T | undefined {
  let best: { d: T; count: number; first: number } | undefined;
  for (const d of dots) {
    if (d.who !== 'both') continue;
    const ids = new Set(d.members.map(m => m.id));
    let count = 0, first = Infinity;
    mentions.forEach((p, i) => { if (ids.has(p.id)) { count++; first = Math.min(first, i); } });
    if (!best || count > best.count || (count === best.count && first < best.first)) best = { d, count, first };
  }
  return best?.d;
}
