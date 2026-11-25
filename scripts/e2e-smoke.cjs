// End-to-end smoke test: two browser contexts play the whole game against a running build.
// Usage: npx vite build && npx vite preview --port 4173 & node scripts/e2e-smoke.cjs [outDir]
// The QR swap is exercised through the camera-app route (opening the link the QR code holds).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = process.env.BASE_URL || 'http://localhost:4173';
const OUT = process.argv[2] || 'e2e-out';
fs.mkdirSync(OUT, { recursive: true });

const RAVI = ['Bangalore', 'Cochin', 'San Francisco', 'Goa', 'Bangkok', null, 'Leh', 'Rome', 'Istanbul', 'Kyoto', 'Lisbon', 'Reykjavik'];
const TARA = ['Hyderabad', 'Melbourne', 'Cape Town', 'Singapore', 'Lisbon', 'Bali', 'Dubai', 'Paris', 'Hanoi', 'Queenstown', 'Barcelona', 'Reykjavik'];
const TARA_OTHERS = 'Vienna, Prague and Seville';

async function play(browser, name, cities, others, shots) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', e => { throw e; });
  page.on('dialog', d => d.accept());
  await page.goto(BASE);
  if (shots) await page.screenshot({ path: path.join(OUT, '01-home.png') });
  await page.getByRole('button', { name: 'Start' }).click();
  await page.getByPlaceholder('First name').fill(name);
  await page.getByLabel('I’m 18 or over').check();
  await page.getByRole('button', { name: 'Next' }).click();
  for (let i = 0; i < cities.length; i++) {
    const city = cities[i];
    if (!city) { await page.getByRole('button', { name: 'Skip' }).click(); continue; }
    const input = page.getByLabel('Search for a city');
    await input.fill(city);
    await page.locator('.results button').first().waitFor();
    if (shots && i === 4) await page.screenshot({ path: path.join(OUT, '02-question.png') });
    await page.locator('.results button').first().click();
    // repeat nudge: keep it
    const keep = page.getByRole('button', { name: /^Keep / });
    if (await keep.isVisible().catch(() => false)) await keep.click();
  }
  if (others) {
    await page.getByText('Paste a list instead').click();
    await page.locator('textarea').fill(others);
    await page.getByRole('button', { name: 'Add these' }).click();
    await page.getByRole('button', { name: 'Done' }).click();
  } else {
    await page.getByRole('button', { name: 'Skip' }).click();
  }
  if (shots) await page.screenshot({ path: path.join(OUT, '03-review.png'), fullPage: true });
  await page.getByRole('button', { name: 'Seal my answers' }).click();
  await page.locator('.qr svg').waitFor();
  if (shots) await page.screenshot({ path: path.join(OUT, '04-swap.png') });
  const link = await page.locator('.qr').getAttribute('data-link');
  return { page, link };
}

(async () => {
  const browser = await chromium.launch();
  const ravi = await play(browser, 'Ravi', RAVI, null, true);
  const tara = await play(browser, 'Tara', TARA, TARA_OTHERS, false);
  console.log('payload link length', ravi.link.length, tara.link.length);

  // Swap: each phone opens the other's link (what the phone's camera app would do).
  for (const [me, other] of [[ravi, tara], [tara, ravi]]) {
    await me.page.goto('about:blank');
    await me.page.goto(other.link);
    await me.page.getByRole('button', { name: 'Continue' }).click().catch(() => {});
    await me.page.getByRole('button', { name: 'Start the reveal' }).waitFor();
  }

  // Reveal on Ravi's phone
  const p = ravi.page;
  await p.getByRole('button', { name: 'Start the reveal' }).click();
  await p.getByRole('button', { name: 'Next' }).waitFor();
  let step = 0;
  while (await p.getByRole('button', { name: 'Next' }).isVisible().catch(() => false)) {
    step++;
    const verdict = await p.locator('.verdict').first().textContent().catch(() => null);
    if (verdict) console.log('reveal:', verdict);
    if ([2, 6].includes(step)) await p.screenshot({ path: path.join(OUT, `05-reveal-${step}.png`) });
    await p.getByRole('button', { name: 'Next' }).click();
  }
  await p.waitForTimeout(3300);
  await p.screenshot({ path: path.join(OUT, '06-our-world.png') });
  await p.getByRole('button', { name: 'Make our poster' }).click();
  await p.locator('.poster-preview > svg').waitFor();
  await p.screenshot({ path: path.join(OUT, '07-poster-screen.png'), fullPage: true });

  // Export the PNG the way a person would
  await p.getByLabel('Show our names').check();
  const [download] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Save image' }).click()]);
  await download.saveAs(path.join(OUT, 'poster-story.png'));
  await p.getByRole('button', { name: 'Post' }).click();
  const [d2] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Save image' }).click()]);
  await d2.saveAs(path.join(OUT, 'poster-feed.png'));

  // An unsealed phone must discard a scanned code
  const ctx = await browser.newContext();
  const fresh = await ctx.newPage();
  await fresh.goto(BASE);
  await fresh.goto('about:blank');
  await fresh.goto(tara.link);
  const notice = await fresh.locator('.notice').textContent();
  const stored = await fresh.evaluate(() => localStorage.getItem('ourworld.session.v1'));
  console.log('unsealed phone notice:', notice, '| stored:', stored);
  if (stored) throw new Error('unsealed phone stored a partner payload');

  await browser.close();
  console.log('OK');
})().catch(e => { console.error(e); process.exit(1); });
