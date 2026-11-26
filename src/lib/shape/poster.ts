// The poster (PRD v2, F14 and F15): "mine + yours = ours".
// Story: two small silver charts, a "+", a pink "=", and the large pink chart, all at the same scale and centre.
// Feed: the combined chart only.
import { chartSvg, LOOK } from './chart';
import type { WorldModel } from './world';
import { copy } from '../../data/copy';

export type PosterFormat = 'story' | 'feed';
export const FORMATS: Record<PosterFormat, { w: number; h: number }> = {
  story: { w: 1080, h: 1920 },
  feed: { w: 1080, h: 1350 },
};

export type PosterOptions = {
  format: PosterFormat;
  names: [string, string];
  showNames: boolean;
  /** The one place name on the poster, on the featured star. Off leaves no place names at all. */
  showPlace: boolean;
  land: ArrayLike<number>;
  link: string;
  fontCss?: string;
};

export const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Rough width of serif italic text, enough to pick a size that fits. */
const serifWidth = (text: string, size: number) => text.length * size * 0.42;

const mono = (x: number, y: number, text: string, size: number, extra = '') =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="Space Mono, monospace" font-size="${size}" letter-spacing="${(size * 0.32).toFixed(1)}" fill="${LOOK.cream}" ${extra}>${esc(text.toUpperCase())}</text>`;
const serif = (x: number, y: number, text: string, size: number, fill: string = LOOK.cream) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="Instrument Serif, serif" font-style="italic" font-size="${size}" fill="${fill}">${text}</text>`;

export function posterSvg(m: WorldModel, o: PosterOptions): string {
  const { w: W, h: H } = FORMATS[o.format];
  const story = o.format === 'story';
  const [na, nb] = o.names.map(n => n.trim() || 'You');
  // story: two small charts, then the large one; feed: the large one only
  const L = story
    ? { big: { cy: 930, r: 360 }, hero: 1396, share: 1572, of: 1624, support: 1688, dream: 1752, cta: 1852 }
    : { big: { cy: 450, r: 345 }, hero: 900, share: 1050, of: 1098, support: 1154, dream: 1208, cta: 1300 };
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  if (o.fontCss) s += `<style>${o.fontCss}</style>`;
  s += `<defs><radialGradient id="neb" cx="540" cy="${L.big.cy}" r="${H * 0.55}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3a0a2a" stop-opacity=".8"/><stop offset=".6" stop-color="#150818" stop-opacity=".5"/><stop offset="1" stop-color="${LOOK.bg}" stop-opacity="0"/></radialGradient></defs>`;
  s += `<rect width="${W}" height="${H}" fill="${LOOK.bg}"/><rect width="${W}" height="${H}" fill="url(#neb)"/>`;
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 150; i++) {
    const x = rnd() * W, y = rnd() * H, rr = rnd() * 0.8 + 0.5, op = rnd() * 0.35 + 0.1;
    s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rr.toFixed(1)}" fill="#fff" fill-opacity="${op.toFixed(2)}"/>`;
  }

  // 1. mine + yours: two small silver charts, at the same scale and centre as the large one
  if (story) {
    const small = { r: 172, cy: 250, ax: 285, bx: 795 };
    s += chartSvg(m, { cx: small.ax, cy: small.cy, r: small.r, land: o.land, mode: 'a', view: m.view, id: 'pa' });
    s += chartSvg(m, { cx: small.bx, cy: small.cy, r: small.r, land: o.land, mode: 'b', view: m.view, id: 'pb' });
    s += `<text x="${W / 2}" y="${small.cy + 22}" text-anchor="middle" font-family="Inter, sans-serif" font-size="64" font-weight="300" fill="${LOOK.cream}">+</text>`;
    const la = o.showNames ? copy.yourWorld(na) : copy.mine, lb = o.showNames ? copy.yourWorld(nb) : copy.yours;
    for (const [x, label] of [[small.ax, la], [small.bx, lb]] as [number, string][]) {
      let size = 46;
      while (size > 28 && serifWidth(label, size) > 420) size -= 2;
      s += serif(x, 478, esc(label), size);
    }
  }

  // 2. the large pink chart, with one shared place named
  s += chartSvg(m, { cx: W / 2, cy: L.big.cy, r: L.big.r, land: o.land, mode: 'ours', view: m.view, ticks: true, id: 'po' });
  if (o.showPlace && m.featured) s += placeLabel(m, L.big, W);

  // 3. hero: whose world, how much of the planet, how much bigger together
  const title = o.showNames ? `${esc(na)} <tspan fill="${LOOK.pink}">&amp;</tspan> ${esc(copy.yourWorld(nb))}` : esc(copy.ourWorld);
  const titleText = o.showNames ? `${na} & ${copy.yourWorld(nb)}` : copy.ourWorld;
  let titleSize = story ? 62 : 54;
  while (titleSize > 34 && serifWidth(titleText, titleSize) > W - 160) titleSize -= 2;
  s += serif(W / 2, L.hero, title, titleSize);
  if (m.share) {
    s += serif(W / 2, L.share, esc(m.share), story ? 200 : 170, LOOK.pink);
    s += mono(W / 2, L.of, copy.ofThePlanet, story ? 24 : 21, 'fill-opacity=".85"');
  } else {
    s += serif(W / 2, L.share - (story ? 40 : 34), esc(copy.justStarted), story ? 96 : 80, LOOK.pink);
  }
  const support = copy.supportLine(m.growth, m.counts.countries, m.counts.continents);
  let supportSize = story ? 26 : 23;
  while (supportSize > 16 && support.length * supportSize * 0.5 > W - 140) supportSize -= 1;
  s += `<text x="${W / 2}" y="${L.support}" text-anchor="middle" font-family="Inter, sans-serif" font-size="${supportSize}" fill="${LOOK.cream}" fill-opacity=".85">${esc(support)}</text>`;

  // 4. the dream that would grow it most
  if (m.dream) {
    const line = m.dream.kind === 'next' ? copy.dreamNext(m.dream.name, m.dream.share) : copy.dreamInside(m.dream.name);
    let size = story ? 38 : 34;
    while (size > 24 && serifWidth(line, size) > W - 140) size -= 2;
    s += serif(W / 2, L.dream, esc(line), size);
  }

  // 5. footer: the challenge and the link
  const host = o.link.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const ctaSize = story ? 46 : 38;
  const pillW = Math.max(200, host.length * 13 + 48), ctaW = serifWidth(copy.posterCta, ctaSize);
  const total = ctaW + 28 + pillW, x0 = (W - total) / 2;
  s += `<text x="${(x0 + ctaW / 2).toFixed(0)}" y="${L.cta}" text-anchor="middle" font-family="Instrument Serif, serif" font-style="italic" font-size="${ctaSize}" fill="${LOOK.cream}">${esc(copy.posterCta)}</text>`;
  const px = x0 + ctaW + 28;
  s += `<rect x="${px.toFixed(0)}" y="${L.cta - 34}" width="${pillW.toFixed(0)}" height="48" rx="24" fill="none" stroke="${LOOK.pink}" stroke-width="2"/>`;
  s += `<text x="${(px + pillW / 2).toFixed(0)}" y="${L.cta - 3}" text-anchor="middle" font-family="Space Mono, monospace" font-size="20" letter-spacing="2" fill="${LOOK.pink}">${esc(host)}</text>`;
  return s + `</svg>`;
}

/** The featured star's name, beside the star, kept inside the canvas. */
function placeLabel(m: WorldModel, big: { cy: number; r: number }, W: number): string {
  const f = m.featured!;
  const k = big.r / m.view.reach, p = m.project(f);
  const x = W / 2 + (p.x - m.view.ox) * k, y = big.cy + (p.y - m.view.oy) * k;
  const text = f.name.toUpperCase(), size = 20, tw = text.length * size * 0.74;
  const right = x + 22 + tw < W - 30;
  const lx = right ? x + 22 : x - 22 - tw;
  return `<text x="${lx.toFixed(0)}" y="${(y + size * 0.35).toFixed(0)}" font-family="Space Mono, monospace" font-size="${size}" letter-spacing="${(size * 0.14).toFixed(1)}" fill="${LOOK.cream}">${esc(text)}</text>`;
}
