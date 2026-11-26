// "Mine + yours = ours": each partner's places, and the bigger world they make together,
// on the north-polar map (PRD v2, section 8).
import { distanceKm, polarProjection, type Projection, type XY } from './geo';
import { boundingCentre, buildShape, mergeNearby, smoothSegments, type Dot, type Place, type Shape } from './polygon';


export const ROTATION = -43;

export type PersonPlaces = { name: string; visited: Place[]; dreams: Place[] };
export type Who = 'a' | 'b' | 'both';
export type TaggedDot = Dot & { who: Who };
export type DreamDot = TaggedDot & { from?: TaggedDot };

/** Chart units shown inside the frame: (ox, oy) sits at the frame centre and `reach` at its edge. */
export type View = { ox: number; oy: number; reach: number };

export type WorldModel = {
  project: Projection;
  dots: TaggedDot[];
  dreams: DreamDot[];
  shapeA: Shape;
  shapeB: Shape;
  ours: Shape;
  view: View;
  counts: { places: number; countries: number; continents: number; dreams: number; a: number; b: number };
  /** Share of the way around the world, 0..1, or null with fewer than 3 places ("Just getting started"). */
  aroundWorld: number | null;
  /** The one shared place whose name goes on the poster, if any. */
  featured?: TaggedDot;
};

export type WorldOptions = {
  continentOf?: (cc: string) => string;
  /** Every answer's place in order, for picking the featured star. */
  mentions?: Place[];
};

/** Fraction of the frame radius kept clear around the farthest point (70 px on a 400 px chart). */
export const MARGIN = 0.175;
/** Very compact sets are not blown up beyond this much of the map (chart units; 1 = 90 degrees). */
export const MIN_REACH = 0.1;

function tag(dots: Dot[], aIds: Set<number>, bIds: Set<number>): TaggedDot[] {
  return dots.map(d => {
    const inA = d.members.some(m => aIds.has(m.id)), inB = d.members.some(m => bIds.has(m.id));
    return { ...d, who: inA && inB ? 'both' : inA ? 'a' : 'b' };
  });
}

/** Fit to the places (and their arcs); dreams may use the margin and zoom out a little, but don't set the zoom on their own. */
export function fitView(points: XY[], extras: XY[] = [], margin = MARGIN, minReach = MIN_REACH): View {
  if (!points.length && !extras.length) return { ox: 0, oy: 0, reach: 1 };
  const c = boundingCentre(points.length ? points : extras);
  const far = Math.max(minReach, ...points.map(p => Math.hypot(p.x - c.x, p.y - c.y)));
  const farExtra = Math.max(0, ...extras.map(p => Math.hypot(p.x - c.x, p.y - c.y)));
  // a far-away dream may zoom the map out by up to 30%; beyond that its dotted line runs off the edge
  const base = far / (1 - margin);
  return { ox: c.x, oy: c.y, reach: Math.max(base, Math.min(farExtra / 0.96, base * 1.3)) };
}

export function buildWorld(a: PersonPlaces, b?: PersonPlaces, options: WorldOptions | ((cc: string) => string) = {}): WorldModel {
  const opts: WorldOptions = typeof options === 'function' ? { continentOf: options } : options;
  const continentOf = opts.continentOf ?? (() => '');
  const project = polarProjection(ROTATION);
  const va = a.visited, vb = b?.visited ?? [];
  const dots = tag(mergeNearby([...va, ...vb]), new Set(va.map(p => p.id)), new Set(vb.map(p => p.id)));
  const da = a.dreams, db = b?.dreams ?? [];
  const dreams: DreamDot[] = tag(mergeNearby([...da, ...db]), new Set(da.map(p => p.id)), new Set(db.map(p => p.id)))
    // a dream someone has already been to (as a visit) stays a place, not a dream line
    .filter(d => !dots.some(v => distanceKm(v, d) <= 50))
    .map(d => {
      const own = dots.filter(v => d.who === 'both' || v.who === d.who || v.who === 'both');
      const pool = own.length ? own : dots;
      const from = pool.reduce<TaggedDot | undefined>((best, v) => (!best || distanceKm(v, d) < distanceKm(best, d) ? v : best), undefined);
      return { ...d, from };
    });

  const mine = (who: 'a' | 'b') => dots.filter(d => d.who === who || d.who === 'both');
  const shapeA = buildShape(mine('a'), project, smoothSegments);
  const shapeB = b ? buildShape(mine('b'), project, smoothSegments) : { kind: 'empty' as const };
  const ours = buildShape(dots, project, smoothSegments);

  const pts = dots.map(project);
  if (ours.kind === 'loop' || ours.kind === 'line') pts.push(...ours.path);
  return {
    project, dots, dreams, shapeA, shapeB, ours, view: fitView(pts, dreams.map(project)),
    counts: {
      places: dots.length,
      countries: new Set(dots.map(d => d.cc)).size,
      continents: new Set(dots.map(d => continentOf(d.cc)).filter(Boolean)).size,
      dreams: dreams.length,
      a: mine('a').length,
      b: mine('b').length,
    },
    aroundWorld: dots.length < 3 ? null : aroundTheWorld(dots.map(d => d.lon)),
    featured: opts.mentions ? featuredPlace(dots, opts.mentions) : undefined,
  };
}

/**
 * How far around the world the places reach: (360° − the largest east–west gap between them) ÷ 360.
 * Places strung right round the globe come close to 1; places in one region stay small.
 */
export function aroundTheWorld(longitudes: number[]): number {
  if (longitudes.length < 2) return 0;
  const lons = longitudes.map(l => ((l % 360) + 360) % 360).sort((x, y) => x - y);
  let gap = 360 - lons[lons.length - 1] + lons[0];
  for (let i = 1; i < lons.length; i++) gap = Math.max(gap, lons[i] - lons[i - 1]);
  return (360 - gap) / 360;
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
