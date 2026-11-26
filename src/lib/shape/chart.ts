// Draws one circular chart as an SVG fragment. Silver for one person's world, pink for "our world"
// (PRD v2 rule 6). Used by the quiz map, the sealed screen, the reveal and the poster.
import type { XY } from './geo';
import { greatCircle, type Shape } from './polygon';
import type { View, WorldModel } from './world';

export const LOOK = {
  bg: '#05050A',
  frameFill: '#0B0A12',
  cream: '#F4F0E8',
  silver: '#CFCFD8',
  pink: '#FF2E7E',
};

export type ChartMode = 'a' | 'b' | 'ours';

export type ChartOptions = {
  cx: number; cy: number; r: number;
  land: ArrayLike<number>;
  mode: ChartMode;
  /** Defaults to the model's own view; the poster passes the combined view to all three charts. */
  view?: View;
  /** 0..1 of the outline drawn (reveal animation). */
  progress?: number;
  dreams?: boolean;
  ticks?: boolean;
  /** Id of a place to pulse (the newest answer). */
  pulse?: number;
  /** Unique prefix for ids inside the SVG. */
  id: string;
};

const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

export function chartSvg(m: WorldModel, o: ChartOptions): string {
  const { cx, cy, r, mode } = o;
  const view = o.view ?? m.view;
  const k = r / view.reach;
  const px = (p: XY): XY => ({ x: cx + (p.x - view.ox) * k, y: cy + (p.y - view.oy) * k });
  const at = (p: { lat: number; lon: number }) => px(m.project(p));
  const w = r / 160; // line unit
  const together = mode === 'ours';
  const col = together ? LOOK.pink : LOOK.silver;
  const shape: Shape = mode === 'a' ? m.shapeA : mode === 'b' ? m.shapeB : m.ours;
  const dots = mode === 'ours' ? m.dots : m.dots.filter(d => d.who === mode || d.who === 'both');
  const id = o.id;

  const d = pathD(shape, px, o.progress ?? 1);
  let s = `<defs><clipPath id="${id}c"><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}"/></clipPath>`;
  if (together) s += `<filter id="${id}g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${f1(w * 3.5)}"/></filter>`;
  if (d && shape.kind === 'loop') s += `<clipPath id="${id}p"><path d="${d}"/></clipPath>`;
  s += `</defs>`;
  s += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="${LOOK.frameFill}" stroke="${LOOK.cream}" stroke-opacity=".22" stroke-width="${f1(Math.max(1, w * 0.7))}"/>`;
  if (o.ticks) {
    for (let a = 0; a < 360; a += 5) {
      const t = (a * Math.PI) / 180, len = a % 30 === 0 ? r * 0.04 : r * 0.018, r0 = r * 1.04;
      s += `<line x1="${f1(cx + r0 * Math.sin(t))}" y1="${f1(cy - r0 * Math.cos(t))}" x2="${f1(cx + (r0 + len) * Math.sin(t))}" y2="${f1(cy - (r0 + len) * Math.cos(t))}" stroke="${LOOK.cream}" stroke-opacity=".2"/>`;
    }
  }
  s += `<g clip-path="url(#${id}c)">`;
  // graticule around the pole: rings every 15 degrees of latitude, meridians every 30
  const pole = px({ x: 0, y: 0 });
  for (let lat = 75; lat >= -30; lat -= 15) {
    s += `<circle cx="${f1(pole.x)}" cy="${f1(pole.y)}" r="${f1(((90 - lat) / 90) * k)}" fill="none" stroke="${LOOK.cream}" stroke-opacity=".045"/>`;
  }
  // faded land dots, drawn as a few paths of zero-length strokes (fast to draw and to export)
  const bands = landBands(o.land, at, cx, cy, r);
  // land samples are ~0.77 degrees apart; keep each dot about half that so they stay dots at any zoom
  const spacingPx = (0.77 / 90) * k;
  const dotW = f1(Math.max(1, Math.min(r / 110, spacingPx * 0.62)));
  bands.forEach((path, i) => {
    if (path) s += `<path d="${path}" stroke="${LOOK.cream}" stroke-opacity="${(0.07 + i * 0.05).toFixed(3)}" stroke-width="${dotW}" stroke-linecap="round" fill="none"/>`;
  });
  if (together && d && shape.kind === 'loop' && (o.progress ?? 1) >= 1) {
    s += `<g clip-path="url(#${id}p)">`;
    bands.forEach((path, i) => { if (path) s += `<path d="${path}" stroke="${LOOK.pink}" stroke-opacity="${(0.06 + i * 0.045).toFixed(3)}" stroke-width="${dotW}" stroke-linecap="round" fill="none"/>`; });
    s += `</g>`;
  }

  // the shape
  if (d) {
    const full = (o.progress ?? 1) >= 1;
    if (together) s += `<path d="${d}" fill="none" stroke="${LOOK.pink}" stroke-width="${f1(w * 5)}" stroke-opacity=".55" filter="url(#${id}g)"/>`;
    s += `<path d="${d}" fill="${col}" fill-opacity="${full && shape.kind === 'loop' ? (together ? '.09' : '.05') : '0'}" stroke="${col}" stroke-width="${f1(w * (together ? 1.6 : 1.15))}" stroke-linejoin="round" stroke-linecap="round"/>`;
  }

  // dreams: a dotted line out from the nearest place and a dashed ring
  if (o.dreams !== false) {
    for (const dr of m.dreams) {
      if (mode !== 'ours' && dr.who !== mode && dr.who !== 'both') continue;
      const q = at(dr);
      const c = together ? LOOK.pink : LOOK.silver, op = dr.who === 'both' && together ? 1 : 0.75;
      if (dr.from) {
        const line = greatCircle(dr.from, dr, 24).map(at);
        s += `<path d="M${line.map(p => `${f1(p.x)} ${f1(p.y)}`).join(' L')}" fill="none" stroke="${c}" stroke-opacity="${op}" stroke-width="${f1(w * 0.8)}" stroke-dasharray="${f1(w * 0.2)} ${f1(w * 2.2)}" stroke-linecap="round"/>`;
      }
      s += `<circle cx="${f1(q.x)}" cy="${f1(q.y)}" r="${f1(w * 4)}" fill="none" stroke="${c}" stroke-opacity="${op}" stroke-width="${f1(w * 0.7)}" stroke-dasharray="${f1(w * 1.2)} ${f1(w * 1.2)}"/>`;
      if (dr.who === 'both' && together) s += `<circle cx="${f1(q.x)}" cy="${f1(q.y)}" r="${f1(w * 7)}" fill="${LOOK.pink}" fill-opacity=".18"/>`;
    }
  }

  // places: white dots with a halo; places both named are four-point stars on the pink chart
  for (const dot of dots) {
    const q = at(dot);
    if (together && dot.who === 'both') {
      s += `<circle cx="${f1(q.x)}" cy="${f1(q.y)}" r="${f1(w * 6)}" fill="${LOOK.pink}" fill-opacity=".35" filter="url(#${id}g)"/>`;
      s += star(q, w * 4.2);
    } else {
      s += `<circle cx="${f1(q.x)}" cy="${f1(q.y)}" r="${f1(w * 3.2)}" fill="${col}" fill-opacity="${together ? '.28' : '.18'}"/>`;
      s += `<circle cx="${f1(q.x)}" cy="${f1(q.y)}" r="${f1(w * 1.5)}" fill="#fff"/>`;
    }
    if (o.pulse !== undefined && dot.members.some(mm => mm.id === o.pulse)) {
      s += `<circle class="pulse" cx="${f1(q.x)}" cy="${f1(q.y)}" r="${f1(w * 3)}" fill="none" stroke="#fff" stroke-width="${f1(w * 0.6)}"/>`;
    }
  }
  s += `</g>`;
  return s;
}

function star(c: XY, size: number): string {
  const a = size, b = size * 0.22;
  const pts = [[0, -a], [b, -b], [a, 0], [b, b], [0, a], [-b, b], [-a, 0], [-b, -b]].map(([x, y]) => `${f1(c.x + x)},${f1(c.y + y)}`).join(' ');
  return `<polygon points="${pts}" fill="#fff"/>`;
}

function pathD(shape: Shape, px: (p: XY) => XY, progress: number): string {
  if (shape.kind !== 'loop' && shape.kind !== 'line') return '';
  const pts = shape.path.map(px);
  const n = Math.max(2, Math.round(pts.length * Math.min(1, progress)));
  const d = 'M' + pts.slice(0, n).map(p => `${f1(p.x)} ${f1(p.y)}`).join(' L');
  return shape.kind === 'loop' && progress >= 1 ? d + ' Z' : d;
}

/** Land dots grouped into 6 opacity bands that fade toward the frame edge. */
function landBands(land: ArrayLike<number>, at: (p: { lat: number; lon: number }) => XY, cx: number, cy: number, r: number): string[] {
  const bands = ['', '', '', '', '', ''];
  for (let i = 0; i < land.length; i += 2) {
    const q = at({ lon: land[i], lat: land[i + 1] });
    const dist = Math.hypot(q.x - cx, q.y - cy) / r;
    if (dist > 0.99) continue;
    const band = Math.min(5, Math.floor((1 - Math.pow(dist, 1.6)) * 6));
    if (band < 0) continue;
    bands[band] += `M${f1(q.x)} ${f1(q.y)}h0`;
  }
  return bands;
}

/** A small square crop of the dot map around one place, for the reveal cards. */
export function cropSvg(place: { lat: number; lon: number }, land: ArrayLike<number>, w = 160, h = 100): string {
  const halfLat = 9, halfLon = halfLat * (w / h) / Math.max(0.35, Math.cos((place.lat * Math.PI) / 180));
  const sx = w / (2 * halfLon), sy = h / (2 * halfLat);
  let path = '';
  for (let i = 0; i < land.length; i += 2) {
    let dl = land[i] - place.lon;
    if (dl > 180) dl -= 360; else if (dl < -180) dl += 360;
    const dp = land[i + 1] - place.lat;
    if (Math.abs(dl) > halfLon || Math.abs(dp) > halfLat) continue;
    path += `M${f1(w / 2 + dl * sx)} ${f1(h / 2 - dp * sy)}h0`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">` +
    `<path d="${path}" stroke="${LOOK.cream}" stroke-opacity=".28" stroke-width="2.6" stroke-linecap="round" fill="none"/>` +
    `<circle cx="${w / 2}" cy="${h / 2}" r="9" fill="${LOOK.pink}" fill-opacity=".3"/>` +
    `<circle cx="${w / 2}" cy="${h / 2}" r="6" fill="none" stroke="#fff" stroke-width="1.5"/>` +
    `<circle cx="${w / 2}" cy="${h / 2}" r="2.6" fill="${LOOK.pink}"/></svg>`;
}
