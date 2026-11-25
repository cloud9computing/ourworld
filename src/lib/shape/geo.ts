// Sphere maths shared by the reveal, the poster and the tests.
// Ported from assets/shape_reference.py and generalised to any map centre.

export type LatLon = { lat: number; lon: number };
export type Vec3 = [number, number, number];
export type XY = { x: number; y: number };
export type Projection = (p: LatLon) => XY;

const D = Math.PI / 180;
export const EARTH_KM = 6371;

export function vec(p: LatLon): Vec3 {
  return [Math.cos(p.lat * D) * Math.cos(p.lon * D), Math.cos(p.lat * D) * Math.sin(p.lon * D), Math.sin(p.lat * D)];
}

export function toLatLon(v: Vec3): LatLon {
  const n = Math.hypot(v[0], v[1], v[2]);
  return { lat: Math.asin(Math.max(-1, Math.min(1, v[2] / n))) / D, lon: Math.atan2(v[1], v[0]) / D };
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Angle between two unit vectors, in radians. */
export function angle(a: Vec3, b: Vec3): number {
  return Math.acos(Math.max(-1, Math.min(1, dot(a, b))));
}

/** Spherical interpolation between unit vectors (great-circle path). */
export function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  const om = angle(a, b);
  if (om < 1e-9) return a;
  const s = Math.sin(om), ka = Math.sin((1 - t) * om) / s, kb = Math.sin(t * om) / s;
  return [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
}

export function distanceKm(a: LatLon, b: LatLon): number {
  return angle(vec(a), vec(b)) * EARTH_KM;
}

export function midpoint(a: LatLon, b: LatLon): LatLon {
  return toLatLon(slerp(vec(a), vec(b), 0.5));
}

/** Normalised mean of the points' unit vectors: the "middle" of a set of places. */
export function sphericalMean(points: LatLon[]): LatLon {
  const s: Vec3 = [0, 0, 0];
  for (const p of points) { const v = vec(p); s[0] += v[0]; s[1] += v[1]; s[2] += v[2]; }
  if (Math.hypot(...s) < 1e-9) return points[0];
  return toLatLon(s);
}

/**
 * The reference north-polar projection: r = (90 - lat) / 90, theta = lon + rotation,
 * x = r sin(theta), y = -r cos(theta). Kept so the shared maths can be tested against the reference.
 */
export function polarProjection(rotationDeg = -43): Projection {
  return ({ lat, lon }) => {
    const r = (90 - lat) / 90, t = (lon + rotationDeg) * D;
    return { x: r * Math.sin(t), y: -r * Math.cos(t) };
  };
}

/**
 * Azimuthal equidistant projection centred on `centre`, north up.
 * Distance from the centre is true (1 unit = 90 degrees of arc, so the antipode sits at r = 2).
 * x grows to the east, y grows to the south (screen coordinates).
 */
export function azimuthalProjection(centre: LatLon): Projection {
  const p0 = centre.lat * D, l0 = centre.lon * D, sp0 = Math.sin(p0), cp0 = Math.cos(p0);
  return ({ lat, lon }) => {
    const p = lat * D, dl = lon * D - l0, sp = Math.sin(p), cp = Math.cos(p);
    const cosc = Math.max(-1, Math.min(1, sp0 * sp + cp0 * cp * Math.cos(dl)));
    const c = Math.acos(cosc);
    if (c < 1e-12) return { x: 0, y: 0 };
    const az = Math.atan2(Math.sin(dl) * cp, cp0 * sp - sp0 * cp * Math.cos(dl));
    const r = c / (Math.PI / 2);
    return { x: r * Math.sin(az), y: -r * Math.cos(az) };
  };
}

/** Angle around the chart centre, measured clockwise from "up" (the reference's atan2(x, -y)). */
export function chartAngle(p: XY): number {
  return Math.atan2(p.x, -p.y);
}
