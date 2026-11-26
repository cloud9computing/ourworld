// The bundled city index (GeoNames, cities over 15,000 people plus capitals), searched on the phone.
import type { Place } from '../shape/polygon';
import { distanceKm } from '../shape/geo';
// Imported as a URL so the build gives the file a content-hashed name: a new version of the
// data always has a new address, and a browser can never pair new code with an old cached copy.
import citiesUrl from '../../../data/cities.json?url';

type Row = [number, string, string, string, string, number, number, number, 0 | 1, number];
export type CityData = { v: string; tz: string[]; cont: Record<string, string>; small: string[]; rows: Row[] };

export type City = Place & { pop: number; country: string; capital: boolean; tz: string; cont: string };

export type CityIndex = {
  version: string;
  byId: Map<number, City>;
  search: (q: string, limit?: number) => City[];
  parseList: (text: string) => { matched: City[]; unmatched: string[] };
  /** Countries small enough that any two of their cities share "a corner". */
  isSmall: (cc: string) => boolean;
  /** Biggest-first nearest city of at least `minPop` within `maxKm`. */
  nearest: (lat: number, lon: number, minPop: number, maxKm: number) => City | undefined;
  continentOf: (cc: string) => string;
};

const regionNames = (() => {
  try { return new Intl.DisplayNames(['en'], { type: 'region' }); } catch { return null; }
})();
export function countryName(cc: string): string {
  try { return regionNames?.of(cc) ?? cc; } catch { return cc; }
}

export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Well-known places that aren't cities in the index, mapped to the nearest city that is. */
/** Keys are what people type; values are the index name (normalised) and country. */
const ALIASES: Record<string, [string, string]> = {
  // places that aren't cities
  bali: ['bali', 'ID'], goa: ['goa', 'IN'], tuscany: ['florence', 'IT'], santorini: ['santorini', 'GR'],
  hawaii: ['honolulu', 'US'], maui: ['lahaina', 'US'], patagonia: ['punta arenas', 'CL'], 'cote d azur': ['nice', 'FR'],
  'french riviera': ['nice', 'FR'], provence: ['marseille', 'FR'], kerala: ['cochin', 'IN'], ladakh: ['leh', 'IN'], langkawi: ['langkawi', 'MY'], coorg: ['madikeri', 'IN'], alleppey: ['alappuzha', 'IN'], mysuru: ['mysore', 'IN'],
  // English and older names
  seville: ['sevilla', 'ES'], cologne: ['koln', 'DE'], bruges: ['brugge', 'BE'], nuremberg: ['nurnberg', 'DE'],
  lucerne: ['luzern', 'CH'], gothenburg: ['goteborg', 'SE'], marrakech: ['marrakesh', 'MA'], saigon: ['ho chi minh city', 'VN'],
  kiev: ['kyiv', 'UA'], calcutta: ['kolkata', 'IN'], madras: ['chennai', 'IN'], pondicherry: ['puducherry', 'IN'],
  kochi: ['cochin', 'IN'], bangalore: ['bengaluru', 'IN'], bombay: ['mumbai', 'IN'], peking: ['beijing', 'CN'],
  nyc: ['new york city', 'US'], 'new york': ['new york city', 'US'], la: ['los angeles', 'US'], sf: ['san francisco', 'US'],
};

export function buildIndex(data: CityData): CityIndex {
  const { v: version, rows } = data;
  const small = new Set(data.small ?? []);
  const cities: City[] = rows.map(r => ({
    id: r[0], name: r[1], cc: r[3], admin: r[4], lat: r[5], lon: r[6], pop: r[7], capital: r[8] === 1, country: countryName(r[3]),
    tz: data.tz?.[r[9]] ?? 'UTC', cont: data.cont?.[r[3]] ?? '',
  }));
  const byId = new Map(cities.map(c => [c.id, c]));
  const names = cities.map(c => norm(c.name));
  const alts = rows.map(r => norm(r[2]));
  const countries = new Map<string, string>();
  for (const c of cities) if (!countries.has(c.cc)) countries.set(c.cc, norm(c.country));
  const capitalOf = new Map<string, City>();
  for (const c of cities) if (c.capital && !capitalOf.has(c.cc)) capitalOf.set(c.cc, c);
  for (const c of cities) if (!capitalOf.has(c.cc)) capitalOf.set(c.cc, c); // biggest city as fallback
  const topOf = new Map<string, City[]>();
  for (const c of cities) { const l = topOf.get(c.cc) ?? []; if (l.length < 3) { l.push(c); topOf.set(c.cc, l); } }

  function search(qRaw: string, limit = 8): City[] {
    const q = norm(qRaw);
    if (q.length < 2) return [];
    const out: City[] = [];
    const seen = new Set<number>();
    const add = (c?: City) => { if (c && !seen.has(c.id) && out.length < limit) { seen.add(c.id); out.push(c); } };
    for (const [key, [target, cc]] of Object.entries(ALIASES)) {
      if (key === q || (q.length >= 3 && key.startsWith(q))) add(cities.find((c, i) => names[i] === target && c.cc === cc));
    }
    for (let i = 0; i < cities.length && out.length < limit; i++) if (names[i] === q) add(cities[i]);
    // a country typed alone suggests its capital and best-known cities
    for (const [cc, cname] of countries) if (cname === q || (q.length >= 4 && cname.startsWith(q))) { add(capitalOf.get(cc)); topOf.get(cc)?.forEach(add); }
    for (let i = 0; i < cities.length && out.length < limit; i++) if (names[i].startsWith(q)) add(cities[i]);
    for (let i = 0; i < cities.length && out.length < limit; i++) if (names[i].includes(' ' + q) || alts[i].split(' ').some(w => w.startsWith(q))) add(cities[i]);
    if (out.length < 3 && q.length >= 4) {
      for (let i = 0; i < cities.length && out.length < limit; i++) if (within1(names[i].slice(0, q.length), q)) add(cities[i]);
    }
    return out;
  }

  function parseList(text: string) {
    const parts = text.split(/[,;\n\r]+|\s+and\s+|\s*&\s*/i).map(s => s.trim()).filter(Boolean);
    const matched: City[] = [], unmatched: string[] = [];
    for (const p of parts) {
      const hit = search(p, 1)[0];
      if (hit) { if (!matched.some(m => m.id === hit.id)) matched.push(hit); } else unmatched.push(p);
    }
    return { matched, unmatched };
  }

  function nearest(lat: number, lon: number, minPop: number, maxKm: number) {
    let best: City | undefined, bestD = maxKm;
    for (const c of cities) {
      if (c.pop < minPop) break; // rows are sorted by population
      const d = distanceKm(c, { lat, lon });
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  return { version, byId, search, parseList, isSmall: cc => small.has(cc), nearest, continentOf: cc => data.cont?.[cc] ?? '' };
}

/** True when a and b (same length) differ by at most one substitution. */
function within1(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && ++d > 1) return false;
  return true;
}

let loading: Promise<CityIndex> | null = null;
export function loadIndex(): Promise<CityIndex> {
  loading ??= fetch(citiesUrl)
    .then(r => { if (!r.ok) throw new Error('Could not load the city list'); return r.json(); })
    .then((j: CityData) => buildIndex(j));
  return loading;
}
