// Builds public/data/land.json: evenly spaced points on the sphere that fall on land
// (Natural Earth 50m via world-atlas, public domain). Output: flat [lon, lat, lon, lat, ...].
import { createRequire } from 'module';
import { writeFileSync } from 'fs';
import { geoContains } from 'd3-geo';
import { feature } from 'topojson-client';
const require = createRequire(import.meta.url);
const topo = require('world-atlas/land-50m.json');
const land = feature(topo, topo.objects.land);

const polys = [];
for (const f of land.features) {
  const list = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const coords of list) {
    let x0 = 180, x1 = -180, y0 = 90, y1 = -90;
    for (const [x, y] of coords[0]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    polys.push({ g: { type: 'Polygon', coordinates: coords }, b: [x0, x1, y0, y1], wide: x1 - x0 > 180 || y0 < -60 });
  }
}
const N = Number(process.argv[2] || 70000), golden = Math.PI * (3 - Math.sqrt(5)), out = [];
for (let i = 0; i < N; i++) {
  const z = 1 - (2 * i + 1) / N;
  const lat = Math.asin(z) * 180 / Math.PI;
  const lon = ((i * golden * 180 / Math.PI) % 360 + 540) % 360 - 180;
  for (const p of polys) {
    if (!p.wide && (lon < p.b[0] || lon > p.b[1] || lat < p.b[2] || lat > p.b[3])) continue;
    if (geoContains(p.g, [lon, lat])) { out.push(+lon.toFixed(2), +lat.toFixed(2)); break; }
  }
}
writeFileSync('public/data/land.json', JSON.stringify(out));
console.log(`wrote ${out.length / 2} land dots from ${N} samples`);
