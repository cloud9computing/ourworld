// One connecting fact between two different places (PRD v2, F11). Worked out from coordinates and
// time zones only: the first rule that applies wins.
import { distanceKm, midpoint } from '../shape/geo';
import type { City, CityIndex } from '../places/index';

const D = Math.PI / 180;

/** Compass bearing from a to b along a constant heading (rhumb line), so "due east" means what people expect. */
export function bearing(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  let dl = (b.lon - a.lon) * D;
  if (Math.abs(dl) > Math.PI) dl = dl > 0 ? dl - 2 * Math.PI : dl + 2 * Math.PI;
  const dpsi = Math.log(Math.tan(Math.PI / 4 + (b.lat * D) / 2) / Math.tan(Math.PI / 4 + (a.lat * D) / 2));
  return (Math.atan2(dl, dpsi) / D + 360) % 360;
}

export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

/** UTC offset in minutes for an IANA zone today; falls back to solar time from the longitude. */
export function utcOffsetMinutes(tz: string, lon: number, at = new Date()): number {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' })
      .formatToParts(at).find(p => p.type === 'timeZoneName')?.value ?? '';
    const m = part.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (m) return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0));
    if (part === 'GMT') return 0;
  } catch { /* unknown zone */ }
  return Math.round(lon / 15) * 60;
}

/** "10:30 at night", "6 in the morning", "noon", "midnight". */
export function spokenTime(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440, h = Math.floor(m / 60), mm = m % 60;
  if (m === 0) return 'midnight';
  if (m === 720) return 'noon';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const clock = mm ? `${h12}:${String(mm).padStart(2, '0')}` : `${h12}`;
  const part = h < 12 ? 'in the morning' : h < 17 ? 'in the afternoon' : h < 21 ? 'in the evening' : 'at night';
  return `${clock} ${part}`;
}

const km = (n: number) => `${(Math.round(n / 10) * 10).toLocaleString('en-US')} km`;

export function connectingFact(a: City, b: City, index: Pick<CityIndex, 'nearest'>, at = new Date()): string {
  const d = distanceKm(a, b);
  // 1. same country, close
  if (a.cc === b.cc && d < 300) return `Same country, ${km(d)} apart.`;
  // 2. same parallel
  if (Math.abs(a.lat - b.lat) <= 1) {
    const mid = (a.lat + b.lat) / 2, n = Math.floor(Math.abs(mid));
    return n === 0 ? 'Both on the equator.' : `Both on the ${ordinal(n)} parallel${mid < 0 ? ' south' : ''}.`;
  }
  // 3. nearly due east or west
  const br = bearing(a, b);
  if (Math.abs(br - 90) <= 10) return `${b.name} is almost due east of ${a.name}.`;
  if (Math.abs(br - 270) <= 10) return `${b.name} is almost due west of ${a.name}.`;
  // 4. two hours or more apart: sunset in one is what time in the other (sunset taken as 6 p.m.)
  const diff = utcOffsetMinutes(b.tz, b.lon, at) - utcOffsetMinutes(a.tz, a.lon, at);
  if (Math.abs(diff) >= 120) return `${km(d)} apart. When the sun sets in ${a.name}, it’s ${spokenTime(18 * 60 + diff)} in ${b.name}.`;
  // 5. distance, and the city halfway between if there is one nearby
  const m = midpoint(a, b);
  const half = index.nearest(m.lat, m.lon, 100_000, 400);
  return half && half.id !== a.id && half.id !== b.id ? `${km(d)} apart. Halfway between: ${half.name}.` : `${km(d)} apart.`;
}
