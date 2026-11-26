// Renders public/og-image.jpg, the 1200 x 630 link preview image, with the app's own chart code
// and the sample couple. Run: npm run build:og (needs Playwright with Chromium installed).
// The image is committed, so the Cloudflare build doesn't need to run this.
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { buildWorld } from '../src/lib/shape/world';
import { chartSvg, LOOK } from '../src/lib/shape/chart';
import { esc } from '../src/lib/shape/poster';
import { copy } from '../src/data/copy';
import { SAMPLE_A, SAMPLE_B } from '../src/data/sample';

const W = 1200, H = 630;
const HOST = process.env.SITE_HOST || 'ourworld.cloud9trt.workers.dev';
const land: number[] = JSON.parse(readFileSync('data/land.json', 'utf8'));
const font = (p: string) => `data:font/woff2;base64,${readFileSync(p).toString('base64')}`;
const fontCss =
  `@font-face{font-family:'Instrument Serif';font-style:italic;src:url(${font('node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2')}) format('woff2')}` +
  `@font-face{font-family:'Space Mono';src:url(${font('node_modules/@fontsource/space-mono/files/space-mono-latin-400-normal.woff2')}) format('woff2')}`;

const model = buildWorld({ name: 'A', visited: SAMPLE_A, dreams: [] }, { name: 'B', visited: SAMPLE_B, dreams: [] });

let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><style>${fontCss}</style>`;
s += `<defs><radialGradient id="neb" cx="880" cy="315" r="620" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3a0a2a" stop-opacity=".85"/><stop offset=".6" stop-color="#150818" stop-opacity=".5"/><stop offset="1" stop-color="${LOOK.bg}" stop-opacity="0"/></radialGradient></defs>`;
s += `<rect width="${W}" height="${H}" fill="${LOOK.bg}"/><rect width="${W}" height="${H}" fill="url(#neb)"/>`;
let seed = 3;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let i = 0; i < 90; i++) s += `<circle cx="${(rnd() * W).toFixed(0)}" cy="${(rnd() * H).toFixed(0)}" r="${(rnd() * 0.8 + 0.5).toFixed(1)}" fill="#fff" fill-opacity="${(rnd() * 0.35 + 0.1).toFixed(2)}"/>`;

// right: their world together
s += chartSvg(model, { cx: 900, cy: 315, r: 245, land, mode: 'ours', view: model.view, ticks: true, dreams: false, id: 'oo' });

// left: the question, the punchline, the link
const mono = (x: number, y: number, t: string, size: number, extra = '') =>
  `<text x="${x}" y="${y}" font-family="Space Mono, monospace" font-size="${size}" letter-spacing="${(size * 0.28).toFixed(1)}" fill="${LOOK.cream}" ${extra}>${esc(t.toUpperCase())}</text>`;
const serif = (x: number, y: number, t: string, size: number) =>
  `<text x="${x}" y="${y}" font-family="Instrument Serif, serif" font-style="italic" font-size="${size}" fill="${LOOK.cream}">${t}</text>`;
s += mono(72, 150, copy.landingEyebrow, 18, 'fill-opacity=".7"');
s += serif(66, 250, 'How big is', 92);
s += serif(66, 345, 'our world?', 92);
const [mine, eq, ours] = copy.posterPunchline;
s += serif(70, 425, `${esc(mine)} <tspan fill="${LOOK.pink}">${esc(eq)}</tspan> ${esc(ours)}`, 40);
const pillW = HOST.length * 11.6 + 44;
s += `<rect x="70" y="487" width="${pillW.toFixed(0)}" height="46" rx="23" fill="none" stroke="${LOOK.pink}" stroke-width="2"/>`;
s += `<text x="${(70 + pillW / 2).toFixed(0)}" y="517" text-anchor="middle" font-family="Space Mono, monospace" font-size="18" letter-spacing="1.5" fill="${LOOK.pink}">${esc(HOST)}</text>`;
s += `</svg>`;

writeFileSync('public/og-image.svg.tmp', s);
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.setContent(`<!doctype html><html><body style="margin:0;background:${LOOK.bg}">${s}</body></html>`);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
// JPEG keeps it well under the ~300 KB some apps (WhatsApp) accept for previews
writeFileSync('public/og-image.jpg', await page.screenshot({ type: 'jpeg', quality: 88 }));
await browser.close();
(await import('fs')).unlinkSync('public/og-image.svg.tmp');
console.log('wrote public/og-image.jpg');
