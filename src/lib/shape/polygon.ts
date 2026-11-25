import { chartAngle, distanceKm, slerp, toLatLon, vec, angle, type LatLon, type Projection, type XY } from './geo';

export type Place = LatLon & { id: number; name: string; cc: string; admin: string; pop?: number };
export type Dot = Place & { members: Place[] };

export const MERGE_KM = 50;

/**
 * Merge places within `km` of each other into one dot. Deterministic: places are visited in id order,
 * each joins the first existing dot within range, and a dot sits at its most-populated member.
 */
export function mergeNearby(places: Place[], km = MERGE_KM): Dot[] {
  const sorted = [...places].sort((a, b) => a.id - b.id || a.lat - b.lat || a.lon - b.lon);
  const dots: { anchor: Place; members: Place[] }[] = [];
  for (const p of sorted) {
    const hit = dots.find(d => d.members.some(m => distanceKm(m, p) <= km));
    if (hit) { if (!hit.members.some(m => m.id === p.id)) hit.members.push(p); }
    else dots.push({ anchor: p, members: [p] });
  }
  return dots.map(d => {
    const main = [...d.members].sort((a, b) => (b.pop ?? 0) - (a.pop ?? 0) || a.id - b.id)[0];
    return { ...main, members: d.members };
  });
}

/** Order points by their angle around the chart centre; ties broken by id so the loop is stable. */
export function orderLoop<T extends LatLon & { id: number }>(points: T[], project: Projection): T[] {
  return points
    .map(p => ({ p, a: chartAngle(project(p)) }))
    .sort((u, v) => u.a - v.a || u.p.id - v.p.id)
    .map(u => u.p);
}

export type SegmentRule = number | ((radians: number) => number);

/** Great-circle samples from a to b, inclusive of both ends. */
export function greatCircle(a: LatLon, b: LatLon, segments: SegmentRule = 12): LatLon[] {
  const va = vec(a), vb = vec(b);
  const n = typeof segments === 'number' ? segments : segments(angle(va, vb));
  const out: LatLon[] = [];
  for (let j = 0; j <= n; j++) out.push(toLatLon(slerp(va, vb, j / n)));
  return out;
}

/** Long arcs get more samples so they stay smooth on a whole-world map. */
export const smoothSegments: SegmentRule = rad => Math.max(12, Math.ceil(rad / (2 * Math.PI / 180)));

export type Shape =
  | { kind: 'empty' }
  | { kind: 'dot'; at: XY }
  | { kind: 'line'; path: XY[] }
  | { kind: 'loop'; path: XY[]; order: LatLon[] };

/**
 * The shape: places ordered around the chart centre and joined (closed) by great-circle arcs.
 * Fewer than three places give a dot or a line.
 */
export function buildShape<T extends LatLon & { id: number }>(points: T[], project: Projection, segments: SegmentRule = 12): Shape {
  if (points.length === 0) return { kind: 'empty' };
  if (points.length === 1) return { kind: 'dot', at: project(points[0]) };
  if (points.length === 2) return { kind: 'line', path: greatCircle(points[0], points[1], segments).map(project) };
  const order = orderLoop(points, project);
  const path: XY[] = [];
  order.forEach((a, i) => {
    const b = order[(i + 1) % order.length];
    for (const s of greatCircle(a, b, segments)) path.push(project(s));
  });
  return { kind: 'loop', path, order };
}

export type Fit = { cx: number; cy: number; scale: number; ox: number; oy: number };

/**
 * Map chart units to pixels. `origin` is the chart point placed at (cx, cy); the farthest of
 * `points` from it sits `margin` px inside a frame of radius `radius`. `minReach` stops very
 * compact sets from being blown up too far.
 */
export function fitChart(points: XY[], origin: XY, cx: number, cy: number, radius: number, margin = 70, minReach = 0): Fit {
  const far = Math.max(minReach, ...points.map(p => Math.hypot(p.x - origin.x, p.y - origin.y)), 1e-6);
  return { cx, cy, scale: (radius - margin) / far, ox: origin.x, oy: origin.y };
}

/** Centre of the points' bounding box, as in the reference. */
export function boundingCentre(points: XY[]): XY {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}

export const toPx = (f: Fit) => (p: XY): XY => ({ x: f.cx + (p.x - f.ox) * f.scale, y: f.cy + (p.y - f.oy) * f.scale });
