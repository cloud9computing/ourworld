// "Mine + yours = ours": each partner's places, and the bigger world they make together,
// on the north-polar map (PRD v2, section 8).
import { distanceKm, polarProjection, type Projection, type XY } from './geo';
import { boundingCentre, buildShape, mergeNearby, smoothSegments, type Dot, type Place, type Shape } from './polygon';
import { dreamLine, featuredPlace, formatShare, growthText, worldArea, type DreamLine } from './area';

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
  /** Fractions of the Earth's surface enclosed by each loop. */
  area: { ours: number; a: number; b: number };
  /** "23%", or null with fewer than 3 places together ("Just getting started"). */
  share: string | null;
  /** "Twice the size of either world alone", "Bigger together", ... */
  growth: string;
  dream: DreamLine | null;
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

  const area = { ours: worldArea(dots, project), a: worldArea(mine('a'), project), b: b ? worldArea(mine('b'), project) : 0 };
  const biggerAlone = Math.max(area.a, area.b);
  const ratio = b && mine('a').length >= 3 && mine('b').length >= 3 && biggerAlone > 0 ? area.ours / biggerAlone : null;
  const rawDreams = [...da, ...db].filter((d, i, all) => all.findIndex(x => x.id === d.id) === i);

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
    area,
    share: dots.length < 3 ? null : formatShare(area.ours),
    growth: growthText(ratio),
    dream: dreamLine(dots, rawDreams, project),
    featured: opts.mentions ? featuredPlace(dots, opts.mentions) : undefined,
  };
}
