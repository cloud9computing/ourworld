// End-to-end smoke test for PRD v2: two browser contexts play a whole date against a running build.
// Usage: npm run build && npx vite preview --port 4173 &  node scripts/e2e-smoke.cjs [outDir]
// Swaps: Ravi's phone uses the in-app scanner's "paste a link" fallback (no camera in headless Chromium);
// Tara's phone opens Ravi's answer link the way the phone's camera app would.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = process.env.BASE_URL || 'http://localhost:4173';
const OUT = process.argv[2] || 'e2e-out';
fs.mkdirSync(OUT, { recursive: true });
const shot = (page, name, full = false) => page.screenshot({ path: path.join(OUT, name), fullPage: full });

// 12 answers each (null = skip). Position 4 is in Act 2 for both: same place (Goa) to see the "same" reveal.
const RAVI = ['Chennai', 'Kyoto', 'Vienna', 'Lisbon', 'Goa', 'Seville', 'Paris', 'Rome', null, 'Reykjavik', 'Hanoi', 'Cape Town'];
const TARA = ['Cochin', 'Melbourne', 'Barcelona', 'Wayanad', 'Goa', 'Vienna', 'Langkawi', 'Bali', 'Istanbul', 'Reykjavik', 'Sydney', 'Lima'];

async function newPhone(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.error('page error:', e); process.exitCode = 1; });
  page.on('dialog', d => d.accept());
  return page;
}

async function answerAll(page, cities, shots) {
  for (let i = 0; i < cities.length; i++) {
    // chapter cards between acts
    const chapter = page.getByText('Tap to continue');
    await page.locator('h2.question, .chapter').first().waitFor();
    if (await chapter.isVisible().catch(() => false)) {
      if (shots && !fs.existsSync(path.join(OUT, '06-chapter.png'))) await shot(page, '06-chapter.png');
      await chapter.click();
    }
    const city = cities[i];
    if (!city) { await page.getByRole('button', { name: 'Skip, we’ll draw without it' }).click(); continue; }
    await page.getByLabel('Search for a city').fill(city);
    try { await page.locator('.results button').first().waitFor({ timeout: 8000 }); }
    catch (e) { await shot(page, `fail-${i}.png`); throw new Error(`no results for ${city} at question ${i + 1}`); }
    if (shots && i === 4) await shot(page, '05-question.png');
    await page.locator('.results button').first().click();
    await page.waitForTimeout(800); // auto-advance after a short pause
  }
}

(async () => {
  const browser = await chromium.launch();
  const ravi = await newPhone(browser), tara = await newPhone(browser);

  // F1–F3: Ravi starts and shows the invite
  await ravi.goto(BASE);
  await ravi.locator('.loop svg').first().waitFor();
  await ravi.waitForTimeout(1500);
  await shot(ravi, '01-landing.png');
  await ravi.getByRole('button', { name: 'Find out together' }).click();
  await ravi.getByLabel('Your name').fill('Ravi');
  await ravi.getByLabel('Your partner').fill('Tara');
  await ravi.getByRole('button', { name: '3–7 years' }).click();
  await ravi.getByLabel('We’re both 18 or over').check();
  await shot(ravi, '02-names.png');
  await ravi.getByRole('button', { name: 'Next' }).click();
  await ravi.locator('.qr svg').waitFor();
  await shot(ravi, '03-invite.png');
  const invite = await ravi.locator('.qr').getAttribute('data-link');
  console.log('invite link length', invite.length);

  // F4: Tara opens the invite (as the camera app would) and is in within three taps
  await tara.goto(invite);
  await tara.getByRole('button', { name: 'I’m in' }).waitFor();
  await shot(tara, '04-partner.png');
  await tara.getByRole('button', { name: 'I’m in' }).click();
  await tara.locator('h2.question').waitFor();

  await ravi.getByRole('button', { name: 'Tara’s in. Start' }).click();

  // F5–F7: both answer
  await answerAll(ravi, RAVI, true);
  await answerAll(tara, TARA, false);

  // list questions: Ravi pastes a list and confirms with one tap; Tara skips
  await ravi.getByText('Paste a list instead').click();
  await ravi.getByLabel('Paste a list of places').fill('Prague, Vienna and Bruges');
  await ravi.getByRole('button', { name: 'Find these' }).click();
  await ravi.getByRole('button', { name: 'Add all' }).click();
  await ravi.getByRole('button', { name: 'Done' }).click();
  await ravi.getByRole('button', { name: 'Skip' }).click();
  for (let k = 0; k < 2; k++) await tara.getByRole('button', { name: 'Skip' }).click();

  // F8: seal
  for (const p of [ravi, tara]) {
    await p.getByRole('button', { name: 'Seal my answers' }).click();
    await p.locator('.qr svg').waitFor();
  }
  await ravi.waitForTimeout(400);
  await shot(ravi, '07-sealed.png');
  const raviCode = await ravi.locator('.qr').getAttribute('data-link');
  const taraCode = await tara.locator('.qr').getAttribute('data-link');
  console.log('answer link lengths', raviCode.length, taraCode.length);

  // a phone in another game rejects the code
  const stranger = await newPhone(browser);
  await stranger.goto(invite); await stranger.getByRole('button', { name: 'I’m in' }).click();
  await stranger.goto('about:blank'); await stranger.goto(taraCode);
  console.log('unsealed stranger:', await stranger.locator('.notice').textContent());

  // swap: Ravi scans in-app (paste fallback), Tara opens Ravi's link from the camera app
  await ravi.getByRole('button', { name: 'Scan Tara’s code' }).click();
  const pasteBtn = ravi.getByRole('button', { name: 'Paste a link instead' });
  await ravi.waitForTimeout(500);
  if (await pasteBtn.isVisible()) await pasteBtn.click();
  await ravi.getByLabel('Paste a link').fill(invite);
  await ravi.getByRole('button', { name: 'Use this link' }).click();
  console.log('scanning an invite into the answer scanner:', await ravi.locator('.error').last().textContent());
  await ravi.getByLabel('Paste a link').fill(taraCode);
  await ravi.getByRole('button', { name: 'Use this link' }).click();
  await ravi.getByRole('button', { name: 'Start the reveal' }).waitFor();
  await tara.goto('about:blank'); await tara.goto(raviCode);
  await tara.getByRole('button', { name: 'Continue our game' }).click().catch(() => {});
  await tara.getByRole('button', { name: 'Start the reveal' }).waitFor();

  // F9–F12: the reveal on Ravi's phone
  await ravi.getByRole('button', { name: 'Start the reveal' }).click();
  await ravi.getByRole('button', { name: 'Begin →' }).click();
  let q = 0;
  for (;;) {
    await ravi.waitForTimeout(300);
    const flips = ravi.locator('button.flip:not(:disabled):not(.shown)');
    while (await flips.count()) { await flips.first().click(); await ravi.waitForTimeout(700); }
    await ravi.waitForTimeout(900);
    q++;
    const lines = (await ravi.locator('.outcome p, .kept li, .verdict').allTextContents()).filter(Boolean);
    console.log(`reveal ${q}:`, [...new Set(lines)].join(' | '));
    const same = await ravi.locator('.cards.one').count();
    if (same && !fs.existsSync(path.join(OUT, '09-reveal-same.png'))) await shot(ravi, '09-reveal-same.png');
    else if (q === 5) await shot(ravi, '08-reveal-different.png');
    const nextQ = ravi.getByRole('button', { name: 'Next question →' });
    if (await nextQ.isVisible()) { await nextQ.click(); continue; }
    await ravi.getByRole('button', { name: 'See your world →' }).click();
    break;
  }

  // F13: final beat
  await ravi.getByRole('button', { name: 'See your poster' }).waitFor();
  await ravi.waitForFunction(() => !document.querySelector('.final-cta')?.hasAttribute('disabled'), null, { timeout: 15000 });
  await shot(ravi, '10-final.png');
  await ravi.getByRole('button', { name: 'See your poster' }).click();
  await ravi.locator('.poster-preview > svg').waitFor();
  await shot(ravi, '11-poster-screen.png', true);

  // F15: export both formats
  for (const [label, file] of [['Story', 'poster-story.png'], ['Post', 'poster-feed.png']]) {
    await ravi.getByRole('button', { name: label }).click();
    const t0 = Date.now();
    const [dl] = await Promise.all([ravi.waitForEvent('download'), ravi.getByRole('button', { name: 'Save image' }).click()]);
    await dl.saveAs(path.join(OUT, file));
    console.log(`${file} ready in ${Date.now() - t0} ms`);
  }

  // F17: the finished game is kept
  await ravi.goto(BASE);
  console.log('landing after finishing:', await ravi.getByRole('button', { name: 'See our poster' }).isVisible());

  await browser.close();
  console.log(process.exitCode ? 'FAILED' : 'OK');
})().catch(e => { console.error(e); process.exit(1); });
