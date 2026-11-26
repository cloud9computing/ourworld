// The poster (PRD v2, F14 and F15): "mine + yours = ours".
// Story: two small silver charts, a "+", a pink "=", and the large pink chart, all at the same scale and centre.
// Feed: the combined chart only.
import { chartSvg, LOOK, type ExplorePoint } from './chart';
import { ghostShape } from './world';
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
  /** The one place name on the poster, on the featured star, and the place in the "Next" line. Off hides both. */
  showPlace: boolean;
  /**
   * Places still to explore (not ticked off): the hero number, the rings on the large chart (one per place),
   * the places each partner's small chart rings, and the next one with where it came from.
   */
  explore: {
    count: number;
    next?: { id?: number; name: string; origin: string };
    places?: ExplorePoint[];
    ringIdsA?: number[];
    ringIdsB?: number[];
  };
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

  const exploring = o.explore.count > 0;
  const places = exploring ? o.explore.places ?? [] : [];

  // 1. mine + yours: two small silver charts, at the same scale and centre as the large one.
  // Each rings its own places the other hasn't been to yet; dreams aren't shown here.
  if (story) {
    const small = { r: 172, cy: 250, ax: 285, bx: 795 };
    s += chartSvg(m, { cx: small.ax, cy: small.cy, r: small.r, land: o.land, mode: 'a', view: m.view, dreams: false, ringIds: exploring ? o.explore.ringIdsA : [], id: 'pa' });
    s += chartSvg(m, { cx: small.bx, cy: small.cy, r: small.r, land: o.land, mode: 'b', view: m.view, dreams: false, ringIds: exploring ? o.explore.ringIdsB : [], id: 'pb' });
    s += `<text x="${W / 2}" y="${small.cy + 22}" text-anchor="middle" font-family="Inter, sans-serif" font-size="64" font-weight="300" fill="${LOOK.cream}">+</text>`;
    const la = o.showNames ? copy.yourWorld(na) : copy.mine, lb = o.showNames ? copy.yourWorld(nb) : copy.yours;
    for (const [x, label] of [[small.ax, la], [small.bx, lb]] as [number, string][]) {
      let size = 46;
      while (size > 28 && serifWidth(label, size) > 420) size -= 2;
      s += serif(x, 478, esc(label), size);
    }
  }

  // 2. the large pink chart: one named shared star, a hollow ring for every place still to explore,
  // and a ghost outline of the world with all of them added
  const label = o.showPlace && o.explore.next?.id !== undefined ? { id: o.explore.next.id, text: o.explore.next.name } : undefined;
  s += chartSvg(m, {
    cx: W / 2, cy: L.big.cy, r: L.big.r, land: o.land, mode: 'ours', view: m.view, ticks: true, dreams: false, id: 'po',
    explore: places.length ? { places, ghost: ghostShape(m, places.map(p => ({ ...p, name: '', cc: '', admin: '' }))), label } : undefined,
  });
  if (o.showPlace && m.featured) s += placeLabel(m, L.big, W);

  // 3. hero: the two names, then how much is still waiting in each other's worlds
  const title = o.showNames ? `${esc(na)} <tspan fill="${LOOK.pink}">&amp;</tspan> ${esc(nb)}` : esc(copy.ourWorld);
  const titleText = o.showNames ? `${na} & ${nb}` : copy.ourWorld;
  let titleSize = story ? 66 : 58;
  while (titleSize > 34 && serifWidth(titleText, titleSize) > W - 160) titleSize -= 2;
  s += serif(W / 2, L.hero, title, titleSize);
  const bigSize = story ? 200 : 170;
  // nothing left to explore: the number is the places they've been together
  s += serif(W / 2, L.share, String(exploring ? o.explore.count : m.counts.places), bigSize, LOOK.pink);
  s += mono(W / 2, L.of, exploring ? copy.toExplore : copy.exploredTogether, story ? 21 : 19, 'fill-opacity=".85"');
  const stats = copy.placesTogether(m.counts.places, m.counts.countries);
  s += `<text x="${W / 2}" y="${L.support}" text-anchor="middle" font-family="Inter, sans-serif" font-size="${story ? 26 : 23}" fill="${LOOK.cream}" fill-opacity=".85">${esc(stats)}</text>`;

  // 4. the next place to explore, and whose world it comes from (left out when there's nothing left)
  if (exploring) {
    const line = !o.showPlace || !o.explore.next ? copy.nextSomewhere : copy.nextLine(o.explore.next.name, o.explore.next.origin);
    let size = story ? 38 : 34;
    while (size > 22 && serifWidth(line, size) > W - 140) size -= 2;
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
