// Builds public/data/cities.json from GeoNames data (via the all-the-cities package, CC BY 4.0 GeoNames).
// Row: [geonameId, name, altName, countryCode, adminCode, lat, lon, population, isCapital]
import { createRequire } from 'module';
import { writeFileSync } from 'fs';
import { createHash } from 'crypto';
const require = createRequire(import.meta.url);
const cities = require('all-the-cities');

// Small places people often name (islands, mountain towns), kept even under 15,000 people.
const EXTRA_IDS = new Set([252920, 256344, 6204696, 2657928, 3170051, 5892532, 2660253, 3183130, 257056, 3027301, 5849996]);
const rows = cities
  .filter(c => c.population >= 15000 || c.featureCode === 'PPLC' || EXTRA_IDS.has(c.cityId))
  .sort((a, b) => b.population - a.population)
  .map(c => [c.cityId, c.name, c.altName || '', c.country, c.adminCode || '',
    +c.loc.coordinates[1].toFixed(3), +c.loc.coordinates[0].toFixed(3), c.population, c.featureCode === 'PPLC' ? 1 : 0]);
const body = JSON.stringify(rows);
const v = createHash('sha256').update(body).digest('hex').slice(0, 8);
writeFileSync('public/data/cities.json', `{"v":"${v}","rows":${body}}`);
console.log(`wrote ${rows.length} cities, version ${v}`);
