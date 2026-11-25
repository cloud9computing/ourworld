// Builds the poster (and the smaller reveal charts) as an SVG string.
// The look is interim: a separate design pass will replace THEME and the layout constants.
import type { XY } from './geo';
import { fitChart, toPx, type Shape } from './polygon';
import type { WorldModel } from './world';
import { copy } from '../../data/copy';
import { countryName } from '../places/index';

export const THEME = {
  bg: '#07070C',
  glow: '#3A1430',
  frame: '#FFFFFF',
  land: '#9A97B5',
  ink: '#F4F0E8',
  muted: '#B9B3C6',
  ours: '#FF2E7E',
  a: '#F5B748', // first person's world (amber)
  b: '#72B7FF', // second person's world (sky blue)
};

export type ChartOptions = {
  cx: number; cy: number; r: number;
  land: Float32Array | number[];
  names: [string, string];
  showLabels: boolean;
  /** 0..1: how much of the "our world" outline is drawn (for the reveal animation). */
  progress?: number;
  layers?: { a?: boolean; b?: boolean; ours?: boolean };
  margin?: number;
};

export const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const f1 = (n: number) => n.toFixed(1);

function pathD(shape: Shape, px: (p: XY) => XY, progress = 1): string {
  if (shape.kind === 'loop' || shape.kind === 'line') {
    const pts = shape.path.map(px);
    const n = Math.max(2, Math.round(pts.length * progress));
    const d = 'M' + pts.slice(0, n).map(p => `${f1(p.x)} ${f1(p.y)}`).join(' L');
    return shape.kind === 'loop' && progress >= 1 ? d + ' Z' : d;
  }
  return '';
}

/** The circular chart: frame, faded land, both worlds, our world, places and labels. */
export function chartSvg(m: WorldModel, o: ChartOptions): string {
  const { cx, cy, r } = o;
  const layers = { a: true, b: true, ours: true, ...o.layers };
  const origin = { x: 0, y: 0 };
  const pts = [...m.dots, ...m.homes].map(p => m.project(p));
  const fit = fitChart(pts, origin, cx, cy, r, o.margin ?? 70, m.minReach);
  const px = toPx(fit);
  const id = `c${Math.round(cx)}${Math.round(cy)}${Math.round(r)}`;
  let s = '';

  s += `<defs><clipPath id="${id}clip"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>`;
  s += `<filter id="${id}blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${f1(r / 55)}"/></filter></defs>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#0B0A12" stroke="${THEME.frame}" stroke-opacity=".28" stroke-width="1.5"/>`;
  for (let a = 0; a < 360; a += 5) {
    const t = (a * Math.PI) / 180, len = a % 30 === 0 ? r * 0.035 : r * 0.015, r0 = r + r * 0.03;
    s += `<line x1="${f1(cx + r0 * Math.sin(t))}" y1="${f1(cy - r0 * Math.cos(t))}" x2="${f1(cx + (r0 + len) * Math.sin(t))}" y2="${f1(cy - (r0 + len) * Math.cos(t))}" stroke="${THEME.frame}" stroke-opacity=".22"/>`;
  }

  s += `<g clip-path="url(#${id}clip)">`;
  // rings every 2,500 km from the centre of their world
  const unitPerKm = 1 / ((Math.PI / 2) * 6371);
  for (let km = 2500; km < 20000; km += 2500) {
    const rr = km * unitPerKm * fit.scale;
    if (rr > r) break;
    s += `<circle cx="${cx}" cy="${cy}" r="${f1(rr)}" fill="none" stroke="${THEME.frame}" stroke-opacity=".05"/>`;
  }
  // faded land dots
  const dotR = Math.max(0.9, r / 260);
  let land = '';
  for (let i = 0; i < o.land.length; i += 2) {
    const q = px(m.project({ lon: o.land[i], lat: o.land[i + 1] }));
    const d = Math.hypot(q.x - cx, q.y - cy) / r;
    if (d > 0.985) continue;
    const op = 0.42 * (1 - Math.pow(d, 2.4));
    if (op < 0.03) continue;
    land += `<circle cx="${f1(q.x)}" cy="${f1(q.y)}" r="${f1(dotR)}" fill-opacity="${op.toFixed(2)}"/>`;
  }
  s += `<g fill="${THEME.land}">${land}</g>`;

  const w = r / 160;
  if (layers.ours) {
    const d = pathD(m.ours, px, o.progress);
    if (d) {
      s += `<path d="${d}" fill="none" stroke="${THEME.ours}" stroke-width="${f1(w * 4)}" stroke-opacity=".6" filter="url(#${id}blur)"/>`;
      s += `<path d="${d}" fill="${THEME.ours}" fill-opacity="${(o.progress ?? 1) >= 1 ? '.09' : '0'}" stroke="${THEME.ours}" stroke-width="${f1(w * 1.6)}" stroke-linejoin="round"/>`;
    }
  }
  if (layers.a) { const d = pathD(m.shapeA, px); if (d) s += `<path d="${d}" fill="none" stroke="${THEME.a}" stroke-width="${f1(w * 1.1)}" stroke-opacity=".95" stroke-linejoin="round"/>`; }
  if (layers.b) { const d = pathD(m.shapeB, px); if (d) s += `<path d="${d}" fill="none" stroke="${THEME.b}" stroke-width="${f1(w * 1.1)}" stroke-opacity=".95" stroke-linejoin="round"/>`; }

  // dreams: dotted ghost pins
  for (const d of m.dreams) {
    const q = px(m.project(d));
    if (Math.hypot(q.x - cx, q.y - cy) > r - 8) continue;
    const col = d.who === 'a' ? THEME.a : d.who === 'b' ? THEME.b : THEME.ink;
    s += `<circle cx="${f1(q.x)}" cy="${f1(q.y)}" r="${f1(w * 4.5)}" fill="none" stroke="${col}" stroke-dasharray="${f1(w)} ${f1(w * 1.6)}" stroke-width="${f1(w * 0.7)}"/>`;
  }
  // places: coloured by whose they are, white for both
  for (const d of m.dots) {
    const show = d.who === 'both' || (d.who === 'a' ? layers.a || layers.ours : layers.b || layers.ours);
    if (!show) continue;
    const q = px(m.project(d));
    const col = d.who === 'a' ? THEME.a : d.who === 'b' ? THEME.b : '#FFFFFF';
    if (d.who === 'both') s += `<circle cx="${f1(q.x)}" cy="${f1(q.y)}" r="${f1(w * 5)}" fill="${THEME.ours}" fill-opacity=".35"/>`;
    s += `<circle cx="${f1(q.x)}" cy="${f1(q.y)}" r="${f1(w * (d.who === 'both' ? 2.4 : 1.9))}" fill="${col}"/>`;
  }
  // homes: rings at the centre of their world
  for (const h of m.homes) {
    const q = px(m.project(h));
    s += `<circle cx="${f1(q.x)}" cy="${f1(q.y)}" r="${f1(w * 7)}" fill="${THEME.ours}" fill-opacity=".10"/>`;
    s += `<circle cx="${f1(q.x)}" cy="${f1(q.y)}" r="${f1(w * 4.5)}" fill="none" stroke="${THEME.ink}" stroke-opacity=".85" stroke-width="${f1(w * 0.8)}"/>`;
    s += `<circle cx="${f1(q.x)}" cy="${f1(q.y)}" r="${f1(w * 1.8)}" fill="${THEME.ink}"/>`;
  }
  s += `</g>`;
  if (o.showLabels) s += labelsSvg(m, px, cx, cy, r, w);
  return s;
}

/** Country names in spaced capitals. Countries close together share a label; labels avoid dots and the canvas edge. */
function labelsSvg(m: WorldModel, px: (p: XY) => XY, cx: number, cy: number, r: number, w: number): string {
  const size = Math.max(11, r / 26), charW = size * 0.6 + size * 0.14;
  const groups = new Map<string, XY[]>();
  for (const d of m.dots) {
    const q = px(m.project(d));
    if (Math.hypot(q.x - cx, q.y - cy) > r - 6) continue;
    const k = d.cc;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(q);
  }
  type G = { names: string[]; pts: XY[] };
  const mid = (g: G) => ({ x: g.pts.reduce((a, p) => a + p.x, 0) / g.pts.length, y: g.pts.reduce((a, p) => a + p.y, 0) / g.pts.length });
  let gl: G[] = [...groups.entries()].map(([cc, pts]) => ({ names: [countryName(cc).toUpperCase()], pts }));
  for (let merged = true; merged;) {
    merged = false;
    outer: for (let i = 0; i < gl.length; i++) for (let j = i + 1; j < gl.length; j++) {
      const a = mid(gl[i]), b = mid(gl[j]);
      if (Math.hypot(a.x - b.x, a.y - b.y) < r * 0.12 && gl[i].names.length + gl[j].names.length <= 2) {
        gl[i] = { names: [...gl[i].names, ...gl[j].names], pts: [...gl[i].pts, ...gl[j].pts] };
        gl.splice(j, 1); merged = true; break outer;
      }
    }
  }
  gl = gl.sort((a, b) => b.pts.length - a.pts.length);
  const boxes: number[][] = [];
  for (const g of gl) for (const p of g.pts) boxes.push([p.x - w * 4, p.y - w * 4, p.x + w * 4, p.y + w * 4]);
  for (const h of m.homes) { const q = px(m.project(h)); boxes.push([q.x - w * 8, q.y - w * 8, q.x + w * 8, q.y + w * 8]); }
  const left = cx - r * 1.15, right = cx + r * 1.15;
  let out = '';
  for (const g of gl) {
    const c = mid(g), text = g.names.join(' · '), tw = text.length * charW, gap = w * 7;
    const dx = c.x - cx, dy = c.y - cy;
    const cands: [number, number][] = [
      [c.x + gap, c.y + size * 0.35], [c.x - gap - tw, c.y + size * 0.35],
      [c.x - tw / 2, c.y - gap], [c.x - tw / 2, c.y + gap + size * 0.7],
    ].sort((p, q) => ((q[0] + tw / 2 - c.x) * dx + (q[1] - c.y) * dy) - ((p[0] + tw / 2 - c.x) * dx + (p[1] - c.y) * dy)) as [number, number][];
    for (const [lx, ly] of cands) {
      const bx = [lx - 2, ly - size, lx + tw + 2, ly + 4];
      if (bx[0] < left || bx[2] > right) continue;
      if (boxes.some(o => !(bx[2] < o[0] || bx[0] > o[2] || bx[3] < o[1] || bx[1] > o[3]))) continue;
      boxes.push(bx);
      out += `<text x="${f1(lx)}" y="${f1(ly)}" font-family="Space Mono, monospace" font-size="${f1(size)}" letter-spacing="${f1(size * 0.14)}" fill="${THEME.ink}" fill-opacity=".8">${esc(text)}</text>`;
      break;
    }
  }
  return out;
}

export type PosterFormat = 'story' | 'feed';
export const FORMATS: Record<PosterFormat, { w: number; h: number }> = {
  story: { w: 1080, h: 1920 },
  feed: { w: 1080, h: 1350 },
};

export type PosterOptions = {
  format: PosterFormat;
  names: [string, string];
  showNames: boolean;
  showLabels: boolean;
  land: Float32Array | number[];
  link: string;
  qrSvg: string;
  fontCss?: string;
};

/** Rough width of serif italic text, good enough to pick a font size that fits. */
const serifWidth = (text: string, size: number) => text.length * size * 0.4;

export function posterSvg(m: WorldModel, o: PosterOptions): string {
  const { w: W, h: H } = FORMATS[o.format];
  const story = o.format === 'story';
  const L = story
    ? { top: 150, names: 320, counts: 410, cy: 1000, r: 430, legend: 1520, title: 1660, cta: 1810 }
    : { top: 90, names: 215, counts: 280, cy: 700, r: 340, legend: 1110, title: 0, cta: 1255 };
  const [na, nb] = o.names.map(n => n.trim() || 'You');
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  if (o.fontCss) s += `<style>${o.fontCss}</style>`;
  s += `<defs><radialGradient id="bgglow" cx="50%" cy="${((L.cy / H) * 100).toFixed(0)}%" r="60%"><stop offset="0" stop-color="${THEME.glow}" stop-opacity=".9"/><stop offset="1" stop-color="${THEME.bg}" stop-opacity="0"/></radialGradient></defs>`;
  s += `<rect width="${W}" height="${H}" fill="${THEME.bg}"/><rect width="${W}" height="${H}" fill="url(#bgglow)"/>`;
  // stars outside the chart
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 140; i++) {
    const x = rnd() * W, y = rnd() * H, rr = rnd() * 1.3 + 0.3, op = rnd() * 0.45 + 0.1;
    if (Math.hypot(x - W / 2, y - L.cy) < L.r + 50) continue;
    s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rr.toFixed(1)}" fill="#fff" fill-opacity="${op.toFixed(2)}"/>`;
  }
  const mono = (y: number, text: string, size: number, extra = '') =>
    `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="Space Mono, monospace" font-size="${size}" letter-spacing="${(size * 0.3).toFixed(1)}" fill="${THEME.ink}" ${extra}>${esc(text.toUpperCase())}</text>`;

  s += mono(L.top, copy.posterTop, story ? 24 : 20, 'fill-opacity=".7"');
  if (o.showNames) {
    const line = `${na} & ${nb}`;
    let size = story ? 150 : 120;
    while (size > 64 && serifWidth(line, size) > W - 160) size -= 4;
    if (serifWidth(line, size) <= W - 160) {
      s += `<text x="${W / 2}" y="${L.names}" text-anchor="middle" font-family="Instrument Serif, serif" font-style="italic" font-size="${size}" fill="${THEME.ink}">${esc(na)} <tspan fill="${THEME.ours}">&amp;</tspan> ${esc(nb)}</text>`;
    } else {
      // very long names: two lines, smaller
      size = story ? 96 : 80;
      s += `<text x="${W / 2}" y="${L.names - size * 0.9}" text-anchor="middle" font-family="Instrument Serif, serif" font-style="italic" font-size="${size}" fill="${THEME.ink}">${esc(na)} <tspan fill="${THEME.ours}">&amp;</tspan></text>`;
      s += `<text x="${W / 2}" y="${L.names}" text-anchor="middle" font-family="Instrument Serif, serif" font-style="italic" font-size="${size}" fill="${THEME.ink}">${esc(nb)}</text>`;
    }
  } else {
    s += `<text x="${W / 2}" y="${L.names}" text-anchor="middle" font-family="Instrument Serif, serif" font-style="italic" font-size="${story ? 130 : 104}" fill="${THEME.ink}">Our world</text>`;
  }
  s += mono(L.counts, copy.togetherCounts(m.counts.places, m.counts.countries), story ? 24 : 20, 'fill-opacity=".85"');

  s += chartSvg(m, { cx: W / 2, cy: L.cy, r: L.r, land: o.land, names: [na, nb], showLabels: o.showLabels });

  // legend: whose world is whose
  const items: [string, string, boolean][] = [
    [o.showNames ? copy.yourWorld(na) : 'World one', THEME.a, false],
    [o.showNames ? copy.yourWorld(nb) : 'World two', THEME.b, false],
    [copy.ourWorld, THEME.ours, true],
  ];
  const fs = story ? 20 : 18, cw = fs * 0.6 + fs * 0.12;
  const widths = items.map(([t]) => 40 + 12 + t.length * cw);
  const total = widths.reduce((a, b) => a + b, 0) + 40 * (items.length - 1);
  let x = (W - total) / 2;
  items.forEach(([t, col, bold], i) => {
    s += `<line x1="${f1(x)}" y1="${L.legend - fs * 0.35}" x2="${f1(x + 40)}" y2="${L.legend - fs * 0.35}" stroke="${col}" stroke-width="${bold ? 4 : 3}" stroke-linecap="round"/>`;
    s += `<text x="${f1(x + 52)}" y="${L.legend}" font-family="Space Mono, monospace" font-size="${fs}" letter-spacing="${(fs * 0.12).toFixed(1)}" fill="${THEME.ink}" fill-opacity=".85">${esc(t.toUpperCase())}</text>`;
    x += widths[i] + 40;
  });

  if (story) s += `<text x="${W / 2}" y="${L.title}" text-anchor="middle" font-family="Instrument Serif, serif" font-style="italic" font-size="84" fill="${THEME.ink}">${esc(copy.posterTitle)}</text>`;
  // call to action: link pill and QR code to the homepage
  const host = o.link.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const qr = story ? 120 : 96;
  s += `<text x="90" y="${L.cta}" font-family="Instrument Serif, serif" font-style="italic" font-size="${story ? 52 : 44}" fill="${THEME.ink}">${esc(copy.posterCta)}</text>`;
  const pillW = Math.max(220, host.length * 13.5 + 48);
  s += `<rect x="90" y="${L.cta + 24}" width="${f1(pillW)}" height="48" rx="24" fill="none" stroke="${THEME.ours}" stroke-width="2"/>`;
  s += `<text x="${f1(90 + pillW / 2)}" y="${L.cta + 55}" text-anchor="middle" font-family="Space Mono, monospace" font-size="20" fill="${THEME.ours}">${esc(host)}</text>`;
  if (o.qrSvg) s += o.qrSvg.replace('<svg ', `<svg x="${W - 90 - qr}" y="${L.cta - qr + 70}" width="${qr}" height="${qr}" `);
  s += `</svg>`;
  return s;
}
