// Builds public/data/cities.json from GeoNames data (via the all-the-cities package, CC BY 4.0 GeoNames).
// Row: [geonameId, name, altName, countryCode, adminCode, lat, lon, population, isCapital, timeZoneIndex]
// Also: tz (IANA time zone names), cont (country -> continent code), small (countries small enough
// that two cities in them count as "the same corner").
import { createRequire } from 'module';
import { writeFileSync } from 'fs';
import { createHash } from 'crypto';
const require = createRequire(import.meta.url);
const cities = require('all-the-cities');
const tzLookup = require('@photostructure/tz-lookup');
const { countries } = require('countries-list');

// Small places people often name (islands, mountain towns), kept even under 15,000 people.
const EXTRA_IDS = new Set([252920, 256344, 6204696, 2657928, 3170051, 5892532, 2660253, 3183130, 257056, 3027301, 5849996,
  1270448, 1253392, 1265896, 1259148, 1228051, 1580541, 1713917, 1716834]);
// Well-known places that GeoNames' city list doesn't have. Ids from 4,000,000,000 up are reserved for these:
// never reuse or renumber one (they travel in the answer codes).
const CURATED = [
  [4000000001, 'Wayanad', 'IN', 11.69, 76.08],
  [4000000002, 'Darjeeling', 'IN', 27.04, 88.26],
  [4000000003, 'Hallstatt', 'AT', 47.56, 13.65],
  [4000000004, 'Ella', 'LK', 6.87, 81.05],
  [4000000005, 'Uluwatu', 'ID', -8.83, 115.09],
  // regions and islands people name as one place
  [4000000006, 'Goa', 'IN', 15.45, 73.80],
  [4000000007, 'Bali', 'ID', -8.41, 115.19],
  [4000000008, 'Langkawi', 'MY', 6.35, 99.80],
  [4000000009, 'Santorini', 'GR', 36.39, 25.46],
];
const picked = cities
  .filter(c => c.population >= 15000 || c.featureCode === 'PPLC' || EXTRA_IDS.has(c.cityId))
  .sort((a, b) => b.population - a.population);

const tzNames = [], tzIndex = new Map();
const tzOf = (lat, lon) => {
  let name;
  try { name = tzLookup(lat, lon); } catch { name = 'UTC'; }
  if (!tzIndex.has(name)) { tzIndex.set(name, tzNames.length); tzNames.push(name); }
  return tzIndex.get(name);
};

const curated = CURATED.map(([id, name, cc, lat, lon]) => ({ cityId: id, name, altName: '', country: cc, adminCode: '', population: 1, featureCode: 'PPL', loc: { coordinates: [lon, lat] } }));
const rows = [...picked, ...curated].map(c => {
  const lat = +c.loc.coordinates[1].toFixed(3), lon = +c.loc.coordinates[0].toFixed(3);
  return [c.cityId, c.name, c.altName || '', c.country, c.adminCode || '', lat, lon, c.population, c.featureCode === 'PPLC' ? 1 : 0, tzOf(lat, lon)];
});

const cont = {};
for (const cc of new Set(rows.map(r => r[3]))) cont[cc] = countries[cc]?.continent ?? '';

// A country is "small" when all its listed cities sit within 250 km of their middle.
const R = 6371, D = Math.PI / 180;
const dist = (a, b) => 2 * R * Math.asin(Math.sqrt(Math.sin((b[0] - a[0]) * D / 2) ** 2 + Math.cos(a[0] * D) * Math.cos(b[0] * D) * Math.sin((b[1] - a[1]) * D / 2) ** 2));
const byCc = new Map();
for (const r of rows) { if (!byCc.has(r[3])) byCc.set(r[3], []); byCc.get(r[3]).push([r[5], r[6]]); }
const small = [];
for (const [cc, pts] of byCc) {
  const mid = [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
  if (Math.max(...pts.map(p => dist(p, mid))) <= 250) small.push(cc);
}

const body = JSON.stringify({ tz: tzNames, cont, small: small.sort(), rows });
const v = createHash('sha256').update(body).digest('hex').slice(0, 8);
writeFileSync('public/data/cities.json', `{"v":"${v}",${body.slice(1)}`);
console.log(`wrote ${rows.length} cities, ${tzNames.length} time zones, ${small.length} small countries, version ${v}`);
