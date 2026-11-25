# Implementation plan: The Shape of Our Journey (MVP, QR swap)

2026-11-25 · Companion to `docs/PRD.md`. Replaces the earlier Supabase-based plan.

## What changed and why

The MVP is a **one-time activity with no backend**. Each partner answers on their own phone. When both have sealed, the two phones swap answers by scanning each other's QR codes. Both phones then run the reveal and draw the poster locally. Nothing about a couple ever leaves their phones.

This plan overrides these parts of the build brief and PRD:

| Brief / PRD says | This plan |
|---|---|
| Next.js on Vercel, Supabase, Resend | A static web app (Vite + React + TypeScript) on Cloudflare Pages. No server, database, email or login |
| Owner, invite and view-only links with hashed tokens | No links per couple. Both partners open the same homepage. The QR swap pairs them |
| Rule 1: sealed answers enforced on the server | **Rule 1 (rewritten):** a phone accepts its partner's answers only after its own answers are sealed, and a sealed answer can't change. The app enforces it; there is no server |
| Rule 4: nothing leaves the couple's *space* | **Rule 4 (stronger):** nothing leaves the couple's *phones* unless they share the poster image |
| Posters rendered on the server, three sizes, `/s/[token]` landing page | Posters rendered in the browser. Story (1080 × 1920) and feed (1080 × 1350). The link and QR on the poster go to the homepage |
| R6 photos, R8 permanent home and magic links, R9 add a place, R10 globe, R11 search, R12 email notifications and reminders | Out of the MVP |

**Kept unchanged:** rules 2, 3 and 5 (no dates, differences never framed as wrong, places are the only required output), the question set, catch-alls, the wishlist round, the staged reveal and the shape maths.

**Known trade-offs, accepted:**
- **Partners must be in the same room** for the swap. Long-distance couples are served later (section 9).
- **A technical user could peek** at answers using browser developer tools. That's acceptable for a couple's game, and the app never makes peeking possible through normal use.
- **Answers in progress live in one browser.** Clearing it or switching phones loses them, which is acceptable for a one-time activity.
- **No partner notifications, and only anonymous funnel analytics.**

---

## 1. Stack

| Area | Choice | Why |
|---|---|---|
| App | Vite + React + TypeScript, single-page app | With no server, Next.js adds nothing. Vite is smaller and simpler |
| Hosting | Cloudflare Pages, on your own domain | Free, allows commercial use, global CDN, HTTPS (which camera access needs) |
| Offline | `vite-plugin-pwa` service worker | The app and city index work offline once loaded, so answering doesn't depend on a network |
| Storage on the phone | IndexedDB (via `idb-keyval`), with `localStorage` as fallback | Saved after every answer, wrapped in try/catch |
| Place search | Bundled GeoNames city index, searched in a Web Worker | Unchanged from the earlier plan (section 4) |
| QR generation | `qrcode` | Small, outputs SVG or canvas |
| QR scanning | `BarcodeDetector` where available (Chrome on Android), otherwise `zxing-wasm` | iOS Safari has no `BarcodeDetector` |
| Poster | SVG built by `lib/shape/poster.ts`, rasterised to PNG on a canvas | No server needed (section 7) |
| Styling | Tailwind. Fonts: Instrument Serif (italic), Space Mono, Inter, self-hosted (all OFL) | |
| Analytics | Cloudflare Web Analytics or Plausible, anonymous events only | Measures the funnel without personal data |
| Tests | Vitest (logic), Playwright (two browser contexts = two partners) | |

**Cost:** hosting is about $0 a month. The domain is about $15 a year, and Plausible about $9 a month if you choose it over Cloudflare's free analytics.

### Repository layout

```
src/
  app/                 screens: Home, Name, Question, CatchAll, Wishlist, Review, Sealed,
                       Swap (show + scan), Reveal, Poster
  state/               the session state machine and storage on the phone
config/brand.ts        product name, domain, colours
data/questions.ts      questions, groups, card titles (pronoun-free)
data/copy.ts           all reveal and poster copy
lib/shape/             projection, merge, polygon, fit, labels, poster SVG + tests
lib/places/            index loader, search worker, paste parser + tests
lib/swap/              payload encode/decode, QR, scanner + tests
lib/reveal/            pairing answers into reveal moments + tests
public/data/           cities.<hash>.json (content-addressed, never deleted)
assets/                world-land-dots.json, shape_reference.py, grain.png, fonts
scripts/               build-city-index.ts, export-reference-fixture.py
tests/e2e/             Playwright
docs/                  PRD, this plan, design reference
```

---

## 2. The flow

```
Home ─► Your first name ─► 15 questions ─► 2 catch-alls ─► 3 wishlist questions
     ─► Review (edit anything) ─► Seal ─► "Show your code" / "Scan your partner's code"
     ─► both swapped ─► Reveal (one question at a time, catch-alls, wishlist, the shape last)
     ─► Poster (story, feed) ─► Share or download ─► "We're done" (clears everything)
```

- **Home** says what it is and that it needs two phones, then a single "Start" button. There is no "create space" or "invite" step: the first partner tells the other to open the same address. A "Send this to your partner" button uses the phone's share sheet with the homepage link.
- **The partner does exactly the same.** There are no roles. The app tells them apart by a random device id created on first open.
- **Resume:** reopening the app returns to where the person left off. "Start over" is always in the menu.
- **Own shape after 5 answers:** a small preview of the polar shape from their own answers only, animating each new edge (the PRD's two minutes to a first shape).
- **Progress** reads "7 places so far", counting distinct places. Never "x of y".

---

## 3. State on the phone (`src/state/`)

One record per device, saved after every change:

```ts
type Session = {
  v: 1;
  deviceId: string;            // random 64-bit, base64url
  firstName: string;           // ≤ 24 characters
  indexVersion: string;        // hash of the city index used
  answers: Record<QuestionId, Answer>;   // 15 questions + 3 wishlist
  alsoBeen: GeonameId[];       // catch-all: places visited, ≤ 60
  homes: GeonameId[];          // catch-all: cities lived in, ≤ 15
  sealedAt?: number;
  partner?: PartnerPayload;    // only ever set after sealedAt
  createdAt: number;
};
type Answer = { status: 'answered' | 'skipped' | 'cant_remember'; place?: GeonameId };
```

- **Sealing** sets `sealedAt`. From then on every edit action is disabled, and the stored answers are what the QR code carries.
- **`partner` can only be written when `sealedAt` is set.** The scanner screen isn't reachable before sealing, and the decoder refuses to store a payload if the session isn't sealed (the same check sits in both the UI and the storage function).
- **Clean-up:** "We're done" and "Start over" delete the record. On open, a session older than 30 days is deleted automatically.
- **No timestamps or anything except first names and city ids are stored.**

---

## 4. Place search (`lib/places/`)

Unchanged from the earlier plan, plus one rule about index versions:

- `scripts/build-city-index.ts` reads GeoNames `cities15000.txt`, `countryInfo.txt` and `admin1CodesASCII.txt`. It writes `public/data/cities.<hash>.json` with compact rows `[id, name, asciiName, countryCode, admin1, lat, lon, population]` plus a few alternate names. Target about 600 KB compressed. GeoNames is CC BY 4.0, so credit it on the homepage.
- **Index files are content-addressed and never deleted.** The QR payload carries a short index version. If the partner's phone has a newer app, it fetches the sender's index version too, so city ids always resolve. The service worker keeps the current index for offline use.
- **Search** runs in a Web Worker from 2 characters. It ranks prefix matches by population, then word starts, then a one-letter typo for queries of 4 or more letters. Results show "City, Country". Typing a country puts its capital or best-known city first, labelled "refine".
- **Paste parser** for catch-alls splits on commas, new lines, semicolons, " and " and "&". Each piece becomes a confirm chip, with one tap to swap in the second match. Duplicates are merged by id.
- **Map tap** for catch-alls picks the nearest indexed city within 100 km.
- **Tests:** "sev" → Seville; "bombay" → Mumbai; "Zürich" and "zurich" match; pasting "Goa, Langkawi, Vienna" gives three chips.

---

## 5. The QR swap (`lib/swap/`)

### Payload

Binary, then base64url, inside a URL so a phone's own camera app can scan it too:

```
https://<domain>/#s=<base64url payload>
```

The fragment (`#...`) is never sent to the server, so even the hosting provider never sees answers.

| Field | Size |
|---|---|
| Format version | 1 byte |
| Index version | 4 bytes |
| Device id | 8 bytes |
| First name | 1-byte length + UTF-8, ≤ 24 bytes |
| 18 answers (15 questions + 3 wishlist) | 2-bit status each + varint GeoNames id for answered ones |
| Also-been list | varint count + varint ids, ≤ 60 |
| Homes list | varint count + varint ids, ≤ 15 |
| Checksum | CRC-32, 4 bytes |

GeoNames ids take 3 to 4 bytes as varints. A typical session (about 18 answers and 15 catch-all places) is **about 180 bytes**, which is about 290 characters with the URL. That's a QR code of about version 12 at error-correction level M, which scans easily from screen to screen. The worst case at the caps (93 places) is about 400 bytes, about 570 characters with the URL, which needs about version 19 at M. That's dense but still scannable from a screen at full brightness. A test checks the worst case stays within version 20.

### Showing and scanning

- **After sealing**, the screen has two halves: "Show your code" (full-brightness QR, a large size and a white quiet zone) and "Scan your partner's code" (opens the camera).
- **The scanner** uses `BarcodeDetector` when available, otherwise `zxing-wasm` on video frames.
- **On a successful scan:** check the checksum, format version, lengths and that every id resolves. Reject your own device id ("That's your own code"). Store as `partner`, then show "Now let Tara scan yours" until the partner confirms (the app can't know the other phone scanned, so the reveal opens as soon as *this* phone has the partner's answers, with a gentle prompt to let the other phone scan too).
- **Scanned with the phone's camera app instead:** the URL opens the app. If the session is sealed, the payload is accepted the same way. If it isn't, it's **discarded without being stored or shown**, with the message "Seal your answers first, then scan again".
- **The other browser trap:** on iOS, the camera app opens links in Safari. If the person answered in another browser, Safari won't have their session. The in-app scanner avoids this, which is why it's the main path.
- **Camera denied or unavailable:** show how to allow it, and suggest the camera-app route.

### Security of the payload

A scanned QR code is untrusted input. Validate strictly, cap all lengths before allocating, render names only as text, and **XML-escape every string that goes into the poster SVG**. Fuzz the decoder in tests.

---

## 6. Shape maths (`lib/shape/`)

Pure functions, ported from `assets/shape_reference.py`.

```ts
project(lat, lon, rotationDeg = -43): {x, y}   // r = (90 - lat)/90, θ = lon + rot, x = r sinθ, y = -r cosθ
mergeNearby(places, km = 50): Dot[]             // deterministic, see below
orderLoop(dots): Dot[]                          // by atan2(x, -y), ties broken by GeoNames id
greatCircle(a, b, segments = 12): Vec3[]        // slerp, 13 samples including both ends
buildPolygon(dots): Path                        // 0 → nothing, 1 → dot, 2 → arc, ≥ 3 → closed loop
fit(points, frameRadiusPx, marginPx = 70)       // centre on the bounding box, farthest vertex 70 px inside
labels(dots, transform, canvasBounds): Label[]  // country names, grouped when they'd collide
stats(dots): { places, countries }              // "12 places · 7 countries"
```

- **Merging** is greedy and deterministic: sort by GeoNames id, and each place joins the first dot within 50 km (haversine), otherwise starts a new dot. The dot sits at its most-populated member. The same places always give the same shape on both phones.
- **Stable slotting:** ordering by angle means a new place only changes the two edges next to it. Test it.
- **Fit** follows the reference: vertices only. For the sample set, the farthest arc point equals the farthest vertex (0.7631). A test checks all arc samples stay inside the frame for every fixture. Cap the zoom so very compact sets keep some map context (the shown span is never less than about 600 km, tuned with real journeys).
- **Land dots** in `assets/world-land-dots.json` are already projected, with the -43° rotation built in. Only the fit transform is applied to them. They cover the north and down to about 8°S, so southern places sit over empty sky (open question 2).
- **The reference doesn't merge places.** Its closest sample pair is 116 km apart, so merging needs its own fixture.
- **Golden fixture:** `scripts/export-reference-fixture.py` runs the reference and writes `lib/shape/__fixtures__/reference.json` (vertices, loop order, 156 arc samples, fit for 1000 × 1000). The port must match within 1e-9. Expected loop order: Portland → California → Yellowstone → Portimão → Seville → Barcelona → Vienna → Goa → Valiyaparamba → Wayanad → Sri Lanka → Langkawi.

---

## 7. Poster (in the browser)

- `lib/shape/poster.ts` builds an SVG string from `(dots, names, options, format)`. Formats: **story 1080 × 1920** and **feed 1080 × 1350**. The link card isn't needed: there's no per-couple share page, and the homepage has one fixed preview image.
- **Layers:** #05050A background → magenta glow → stars outside the frame → frame circle, degree ticks, graticule every 15° → land dots fading by radius → blurred polygon glow → 2.8 px #FF2E7E line with a 10% fill → white dots with pink halos → country labels → type and the URL pill with a QR code to the homepage.
- **Turning it into a PNG:** fonts are embedded in the SVG as subsetted base64 `@font-face` rules (an SVG drawn as an image can't load external fonts). The SVG is drawn onto a 1080-wide canvas with `drawImage`, then exported with `canvas.toBlob`. Film grain is a tiled PNG, not a noise filter.
- **The risk is iOS Safari**, which is less consistent with SVG filters drawn to a canvas. It's tested in slice 1 on a real iPhone. If the blur or fonts come out wrong, the fallback is `@resvg/resvg-wasm` in the browser (about 2.5 MB, loaded only on the poster screen), which gives identical output everywhere.
- **Layout fixes** from the reference image:
  1. Long names covered the counts line. Measure the names with the real font (`opentype.js`), shrink to fit on one line down to a minimum, wrap only below that, then place the counts line under the measured block.
  2. "SPAIN · PORTUGAL" was cut off. The label placer gets the canvas bounds: it tries right, left, above and below each dot, then moves the label inward toward the chart centre.
  A layout test with long names ("Maximiliana & Bartholomew") and edge places fails on any overlap or text leaving the canvas.
- **Options:** names on or off, country labels on or off ("guess our shape"). Dark theme only. No photos.
- **Sharing:** the Web Share API with the PNG file (works on iOS Safari and Android Chrome), so it goes straight to Instagram stories, WhatsApp and so on. Fallback: download. Both phones can make the poster, since both have both sets of answers.
- **Alt text** is generated: "A glowing pink polygon joining 12 places on a faded map seen from the North Pole".

---

## 8. Reveal (`lib/reveal/`)

Runs on each phone from `(mine, partner)`. Both phones show the same sequence, ordered by device id so "Ravi chose…, Tara chose…" reads the same way on both.

- **One question at a time**, in three states with equal visual weight:
  - *Same place:* the same dot after the 50 km merge → "You both said Seville" (soft pink glow).
  - *Same region:* same country and (same admin1, or within 300 km) → "Different cities, same corner of Spain".
  - *Different places* → "Ravi chose Goa, Tara chose Langkawi: two good memories".
  - Only one answered → "Tara remembered this one: Kyoto". The empty side is never mentioned. Questions neither answered are skipped silently.
- **Catch-alls:** places both listed, then "A memory only Tara kept: Vienna". The shape uses the union of both lists.
- **Wishlist:** shared dreams, near dreams, and different ideas as "two good ideas". Wishlist places are **not** part of the polygon. On the poster they're optional dotted ghost pins (open question 3).
- **The shape draws last:** map fades in, then the polygon draws edge by edge over about 3 seconds, and each dot lights up as its edge arrives. Places both named are slightly brighter.
- **Copy rules, tested:** all copy lives in `data/copy.ts`. A test fails on `wrong`, `mismatch`, `disagree`, `%`, `!`, "score" or "out of". Question 11's wording ("hilariously wrong") lives in `data/questions.ts`, which the test skips on purpose. There's no count of matches anywhere and no red or green in the palette.
- **No gendered pronouns:** card titles like "Tara's favourite meal ever" and "Where you both had your favourite meal ever", from `titleFor(name)` and `titleForBoth()` in `data/questions.ts`.

---

## 9. Build slices

Estimates assume one engineer working with Claude Code. Each slice ends deployed to a Cloudflare Pages preview with its tests green.

| # | Slice | Days | Done when |
|---|---|---|---|
| 1 | **Scaffold, shape maths, poster** | 4 | Vite, Tailwind, fonts, CI. `lib/shape` matches the reference fixture. A story poster of the sample places exports as PNG on a real iPhone and an Android phone, and matches the design. Layout tests pass |
| 2 | **City index and search** | 2 | Index builds; the worker search answers in under 50 ms; paste parser tests pass |
| 3 | **Questions, catch-alls, wishlist, seal** | 4 | Full flow with skip and "can't remember", reuse chips, progress line, own-shape preview after 5 answers, resume after reload, review, seal locks editing |
| 4 | **QR swap** | 2 | Encode/decode round-trip and fuzz tests; the worst-case payload fits version 20; scanning works phone to phone on iOS Safari and Android Chrome; an unsealed phone discards a payload |
| 5 | **Reveal** | 3 | All three states, single-answer case, catch-alls, wishlist, the shape drawing; copy test passes; both phones show the same order |
| 6 | **Share, home, offline, launch polish** | 3 | Web Share with the PNG; homepage with a sample poster and fixed preview image; works offline once loaded; anonymous analytics events; "We're done" clears everything; accessibility pass |

**Total: about 18 working days, 3 to 4 weeks with review and fixes.** (My earlier guess of 2 to 3 weeks was optimistic.) The poster on iOS Safari and phone-to-phone scanning carry the most risk, which is why they're tested on real devices in slices 1 and 4.

**End-to-end test:** Playwright runs two browser contexts as two partners, answers, seals, and passes each payload to the other through a test hook in place of the camera. One extra test uses Chromium's fake camera fed with a recording of a QR code, to cover the real scanner.

**Analytics events** (anonymous, no names or places): started, 5 answers, sealed, swapped, reveal finished, poster shared or downloaded. These map to the PRD's activation, completion, pairing and sharing metrics.

**Before launch:** privacy notice (short, since nothing is collected), the GeoNames credit, strict Content Security Policy headers on Cloudflare Pages, and testing the question wording with 5 couples in person.

### Later (not MVP)

- **Long-distance couples:** each partner sends an **encrypted** answers link over chat. The decryption keys are swapped only after both have sent theirs, so neither can peek. Still no server.
- **A share page** showing the couple's poster, if the growth loop needs it (this would bring back a small amount of storage).
- **Pass-the-phone mode** for couples with one phone.
- **Multi-part animated QR** if the caps on catch-all lists prove too low.
- Feed of other formats, archetype names, guess-your-partner bonus.

---

## 10. Open questions for the owner

1. The product name and domain (needed for the QR codes and the poster pill).
2. The land dots stop at about 8°S. Extend them to the southern hemisphere before launch?
3. Should wishlist places appear on the poster as ghost pins, or only in the reveal?
4. Are the catch-all caps (60 places visited, 15 homes) enough?
5. Does question 11 ("went hilariously wrong") stay, given the no-"wrong" copy rule? It's allowed as question text in this plan.
6. The final question wording, after the first couples (wording is data only, so changes need no code).
