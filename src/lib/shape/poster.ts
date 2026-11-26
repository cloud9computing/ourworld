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
  land: ArrayLike<number>;
  link: string;
  fontCss?: string;
};

export const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Rough width of serif italic text, enough to pick a size that fits. */
const serifWidth = (text: string, size: number) => text.length * size * 0.42;

const mono = (x: number, y: number, text: string, size: number, extra = '') =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="Space Mono, monospace" font-size="${size}" letter-spacing="${(size * 0.32).toFixed(1)}" fill="${LOOK.cream}" ${extra}>${esc(text.toUpperCase())}</text>`;
const serif = (x: number, y: number, text: string, size: number, extra = '') =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="Instrument Serif, serif" font-style="italic" font-size="${size}" fill="${LOOK.cream}" ${extra}>${text}</text>`;

export function posterSvg(m: WorldModel, o: PosterOptions): string {
  const { w: W, h: H } = FORMATS[o.format];
  const story = o.format === 'story';
  const [na, nb] = o.names.map(n => n.trim() || 'You');
  const big = story ? { cy: 1180, r: 400 } : { cy: 690, r: 420 };
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  if (o.fontCss) s += `<style>${o.fontCss}</style>`;
  s += `<defs><radialGradient id="neb" cx="540" cy="${big.cy}" r="${H * 0.55}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3a0a2a" stop-opacity=".8"/><stop offset=".6" stop-color="#150818" stop-opacity=".5"/><stop offset="1" stop-color="${LOOK.bg}" stop-opacity="0"/></radialGradient></defs>`;
  s += `<rect width="${W}" height="${H}" fill="${LOOK.bg}"/><rect width="${W}" height="${H}" fill="url(#neb)"/>`;
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 150; i++) {
    const x = rnd() * W, y = rnd() * H, rr = rnd() * 0.8 + 0.5, op = rnd() * 0.35 + 0.1;
    s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rr.toFixed(1)}" fill="#fff" fill-opacity="${op.toFixed(2)}"/>`;
  }

  // header: the line, then the names (or "Our world" when names are hidden)
  s += mono(W / 2, story ? 108 : 92, copy.posterTop, 24, 'fill-opacity=".65"');
  const nameY = story ? 250 : 210;
  if (o.showNames) {
    const line = `${na} & ${nb}`;
    let size = story ? 150 : 120;
    while (size > 64 && serifWidth(line, size) > W - 140) size -= 4;
    if (serifWidth(line, size) <= W - 140) {
      s += serif(W / 2, nameY, `${esc(na)} <tspan fill="${LOOK.pink}">&amp;</tspan> ${esc(nb)}`, size);
    } else {
      size = story ? 92 : 78;
      s += serif(W / 2, nameY - size * 0.95, `${esc(na)} <tspan fill="${LOOK.pink}">&amp;</tspan>`, size);
      s += serif(W / 2, nameY, esc(nb), size);
    }
  } else {
    s += serif(W / 2, nameY, esc(copy.ourWorld), story ? 130 : 110);
  }

  if (story) {
    // mine + yours
    const small = { r: 175, cy: 520, ax: 282, bx: 798 };
    s += chartSvg(m, { cx: small.ax, cy: small.cy, r: small.r, land: o.land, mode: 'a', view: m.view, id: 'pa' });
    s += chartSvg(m, { cx: small.bx, cy: small.cy, r: small.r, land: o.land, mode: 'b', view: m.view, id: 'pb' });
    s += `<text x="${W / 2}" y="${small.cy + 22}" text-anchor="middle" font-family="Inter, sans-serif" font-size="64" font-weight="300" fill="${LOOK.cream}">+</text>`;
    const la = o.showNames ? copy.yourWorld(na) : 'Mine', lb = o.showNames ? copy.yourWorld(nb) : 'Yours';
    for (const [x, label, n] of [[small.ax, la, m.counts.a], [small.bx, lb, m.counts.b]] as [number, string, number][]) {
      let size = 46;
      while (size > 28 && serifWidth(label, size) > 400) size -= 2;
      s += serif(x, 742, esc(label), size);
      s += mono(x, 780, copy.placesCount(n), 19, 'fill-opacity=".85"');
    }
    s += `<rect x="${W / 2 - 18}" y="726" width="36" height="5" rx="2" fill="${LOOK.pink}"/><rect x="${W / 2 - 18}" y="740" width="36" height="5" rx="2" fill="${LOOK.pink}"/>`;
  }

  // = ours
  s += chartSvg(m, { cx: W / 2, cy: big.cy, r: big.r, land: o.land, mode: 'ours', view: m.view, ticks: true, id: 'po' });
  const titleY = story ? 1672 : 1188;
  const [mine, eq, ours] = copy.posterPunchline;
  s += serif(W / 2, titleY, `${esc(mine)} <tspan fill="${LOOK.pink}">${esc(eq)}</tspan> ${esc(ours)}`, story ? 84 : 64);
  const counts = copy.posterCounts(m.counts);
  // Space Mono: 0.6 em per character plus the letter spacing; keep the line inside the side margins
  const countSize = Math.min(story ? 22 : 19, (W - 160) / (counts.length * 0.92));
  s += mono(W / 2, titleY + (story ? 46 : 40), counts, Math.round(countSize * 10) / 10);

  // call to action and link
  const host = o.link.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const ctaY = story ? 1830 : 1300, ctaSize = story ? 46 : 38;
  const pillW = Math.max(200, host.length * 13 + 48), ctaW = serifWidth(copy.posterCta, ctaSize);
  const total = ctaW + 28 + pillW, x0 = (W - total) / 2;
  s += `<text x="${(x0 + ctaW / 2).toFixed(0)}" y="${ctaY}" text-anchor="middle" font-family="Instrument Serif, serif" font-style="italic" font-size="${ctaSize}" fill="${LOOK.cream}">${esc(copy.posterCta)}</text>`;
  const px = x0 + ctaW + 28;
  s += `<rect x="${px.toFixed(0)}" y="${ctaY - 34}" width="${pillW.toFixed(0)}" height="48" rx="24" fill="none" stroke="${LOOK.pink}" stroke-width="2"/>`;
  s += `<text x="${(px + pillW / 2).toFixed(0)}" y="${ctaY - 3}" text-anchor="middle" font-family="Space Mono, monospace" font-size="20" letter-spacing="2" fill="${LOOK.pink}">${esc(host)}</text>`;
  return s + `</svg>`;
}
