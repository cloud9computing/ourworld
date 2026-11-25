// "Our world": two people's places on one circular map, centred between their homes.
import { azimuthalProjection, distanceKm, midpoint, sphericalMean, type LatLon, type Projection } from './geo';
import { buildShape, mergeNearby, smoothSegments, MERGE_KM, type Dot, type Place, type Shape } from './polygon';

export type PersonWorld = { name: string; home?: Place; places: Place[]; dreams: Place[] };

/** Places this close to the centre stay as dots but don't become corners of the loop (avoids spikes into the middle). */
export const NEAR_CENTRE_KM = 800;
/** Even a very compact world shows at least this much of the map around its centre. */
export const MIN_REACH_KM = 1500;
const KM_PER_UNIT = (Math.PI / 2) * 6371;

export type WorldModel = {
  centre: LatLon;
  project: Projection;
  homes: Place[];
  dots: (Dot & { who: 'a' | 'b' | 'both' })[];
  dreams: (Dot & { who: 'a' | 'b' | 'both' })[];
  ours: Shape;
  shapeA: Shape;
  shapeB: Shape;
  minReach: number;
  counts: { places: number; countries: number };
};

export function centreOf(a: PersonWorld, b?: PersonWorld): LatLon {
  const ha = a.home, hb = b?.home;
  if (ha && hb) return distanceKm(ha, hb) <= MERGE_KM ? ha : midpoint(ha, hb);
  if (ha) return ha;
  if (hb) return hb;
  const all = [...a.places, ...(b?.places ?? [])];
  return all.length ? sphericalMean(all) : { lat: 20, lon: 0 };
}

function tag(dots: Dot[], aIds: Set<number>, bIds: Set<number>) {
  return dots.map(d => {
    const inA = d.members.some(m => aIds.has(m.id)), inB = d.members.some(m => bIds.has(m.id));
    return { ...d, who: inA && inB ? 'both' as const : inA ? 'a' as const : 'b' as const };
  });
}

export function buildWorld(a: PersonWorld, b?: PersonWorld): WorldModel {
  const centre = centreOf(a, b);
  const project = azimuthalProjection(centre);
  const homes = [a.home, b?.home].filter((h): h is Place => !!h);
  const homeIds = new Set(homes.map(h => h.id));

  const visitedA = a.places.filter(p => !homeIds.has(p.id));
  const visitedB = (b?.places ?? []).filter(p => !homeIds.has(p.id));
  const dots = tag(mergeNearby([...visitedA, ...visitedB]), new Set(visitedA.map(p => p.id)), new Set(visitedB.map(p => p.id)))
    .filter(d => !homes.some(h => distanceKm(h, d) <= MERGE_KM));
  const dreams = tag(mergeNearby([...a.dreams, ...(b?.dreams ?? [])]), new Set(a.dreams.map(p => p.id)), new Set((b?.dreams ?? []).map(p => p.id)));

  const corners = (ds: Dot[]) => ds.filter(d => distanceKm(centre, d) > NEAR_CENTRE_KM);
  const ours = buildShape(corners(dots), project, smoothSegments);
  const shapeA = buildShape(corners(dots.filter(d => d.who !== 'b')), project, smoothSegments);
  const shapeB = buildShape(corners(dots.filter(d => d.who !== 'a')), project, smoothSegments);

  const allPlaces = mergeNearby([...homes, ...visitedA, ...visitedB]);
  const countries = new Set(allPlaces.map(p => p.cc));
  return {
    centre, project, homes, dots, dreams, ours, shapeA, shapeB,
    minReach: MIN_REACH_KM / KM_PER_UNIT,
    counts: { places: allPlaces.length, countries: countries.size },
  };
}
