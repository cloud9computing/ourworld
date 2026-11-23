# Implementation plan: The Shape of Our Journey

2026-11-23 · Companion to `docs/PRD.md` (build brief + PRD). Where the two disagree, the build brief wins, and this plan follows the brief.

This plan turns the PRD into a build sequence: architecture, schema, the hard design calls the PRD leaves open, and seven slices that each ship on their own. Slices 1 to 6 are the Phase 1 MVP. Slice 7 is Phase 2.

---

## 0. Before writing code

**Missing inputs.** The brief refers to files that are not in this repository yet:

| File | Used for | Fallback if it doesn't arrive |
|---|---|---|
| `assets/shape_reference.py` | Reference geometry and the sample-places test fixture | Implement from the formulas in the brief; take fixture places from the poster image |
| World-land dots asset | The faded dot map | Generate from Natural Earth 110m land (public domain) with `scripts/build-land-dots.ts` |
| `docs/poster-story-polygon-map.png` | Visual reference for the poster | Use the design canvas boards |

**Accounts the owner must create:** a Supabase project, a Vercel project, a Resend account with a verified sending domain, and the product name and domain. Until the name is chosen, it lives only in `config/brand.ts`.

**Decisions this plan makes.** Each one can be changed. They are listed in section 9 so they can be reviewed in one place.

---

## 1. Architecture

```
Browser (Next.js client)
  ├─ city index + search (Web Worker, ~25k rows, lazy-loaded)
  ├─ shape maths (lib/shape, shared with the server)
  └─ globe (canvas 2D + d3-geo orthographic)
        │  token in the URL path, never in query strings
        ▼
Next.js server (Vercel, Node runtime)
  ├─ route handlers and server actions: the only code that talks to the database
  ├─ token → hash → member/invite lookup on every request
  ├─ poster renderer: SVG → PNG with @resvg/resvg-js
  └─ cron (Vercel Cron): 24-hour reminders, 7-day reveal offer
        │  service-role key, server-only
        ▼
Supabase
  ├─ Postgres: RLS on every table, no anon policies (deny all)
  ├─ SQL functions that hold the seal rule and the reveal
  ├─ Storage: posters (cached), photos (slice 7)
  └─ Auth: email magic link, only to make a member permanent (slice 7)
Resend: magic links, "reveal is ready", reminders, anniversary emails
```

**Why the browser never talks to Supabase directly.** There are no accounts at the start, so `auth.uid()` can't drive RLS. The URL token is the credential, and only the server can check it. Every table has RLS turned on with no policies for `anon` or `authenticated`. That means the public anon key can read nothing, even if someone finds it. The server uses the service-role key, which is kept in server-only modules (`import 'server-only'`).

**Seal rule as defence in depth.** The server doesn't read the `answers` table directly. It calls SQL functions (section 3), so the rule "a partner's answers come back only once both have sealed" lives in one place in the database, where page or API code can't skip it by mistake.

### Repository layout (from the brief, with additions)

```
app/
  page.tsx                 start: create a space
  c/[token]/               couple space (owner or claimed partner)
    questions/             question flow
    waiting/               sealed, waiting for the partner
    reveal/                staged reveal
    page.tsx               the shape: globe, cards, search, "+"
  i/[token]/               invite: claim as the partner
  v/[token]/               view-only space
  s/[token]/               public poster landing, "Find your shape"
  api/                     route handlers (answers, seal, places, poster, cron)
config/brand.ts            product name, domain, colours
data/questions.ts          questions, groups, card titles
data/copy.ts               every user-facing line of reveal and card copy
lib/shape/                 projection, merge, polygon, fit, poster SVG + tests
lib/places/                index loader, search, paste parser + tests
lib/tokens.ts              token creation and hashing
lib/db/                    typed wrappers over the SQL functions
supabase/migrations/       schema, RLS, functions
supabase/tests/            pgTAP tests for the seal rule
scripts/                   build-city-index.ts, build-land-dots.ts
assets/                    land dots, fonts, reference generator
tests/e2e/                 Playwright, two browser contexts = two partners
```

### Libraries

Next.js 15 App Router + TypeScript, Tailwind, `@supabase/supabase-js` (server only), `zod` for input checks, `@resvg/resvg-js` for posters, `qrcode` (SVG output), `d3-geo` for the globe, `resend`, Vitest, Playwright, pgTAP through `supabase test db`. Fonts (Instrument Serif, Space Mono, Inter) are all OFL. They are self-hosted with `next/font/local`, and the same files are loaded into resvg.

---

## 2. Links and tokens

- `createToken()`: 32 random bytes from `crypto.randomBytes`, base64url encoded (256 bits, 43 characters). `hashToken()`: SHA-256 in hex. A slow hash isn't needed because the tokens have high entropy, and a lookup by hash is effectively constant-time.
- Only hashes are stored. A raw token exists only in the URL and in the one response that creates it.
- **Owner link** `/c/[token]`: created with the space.
- **Invite link** `/i/[token]`: works once. When the partner enters a first name, the server creates their member row with a new member token and redirects to `/c/[memberToken]`. After that the invite is marked `accepted` and only shows "this invite has been used". This stops a forwarded invite from being claimed by someone else, and stops a stray tab from creating a second partner.
- **View-only link** `/v/[token]`: optional, can be revoked (`revoked_at`). It shows the shape and cards only after the reveal, never answers in progress.
- **Share link** `/s/[token]`: one per poster shared. It points to a frozen snapshot of that poster (section 6), not the live space.
- **Hardening.** Add `Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex` on every `/c /i /v` route. Tokens never go in query strings, and analytics strip path tokens. Rate-limit token lookups per IP (for example with Upstash or a Postgres counter). Every response is `Cache-Control: private, no-store`.
- **"Save your link".** Without an account, losing the URL means losing the space. After the first answer, show a quiet prompt to copy the link or add the page to the home screen. In slice 7 the magic link becomes the recovery path.

---

## 3. Data model

The key point: **a partner's answers must not leak through derived data.** If answers wrote straight into a shared `places` table, the partner's places would be visible before the reveal. So:

- `answers` is private per member, and holds a copy of each chosen place (GeoNames id, name, country, lat/lon).
- `places` and `cards` are the shared space. They are created **at the moment of reveal** by a SQL function, and after that by "add a place".
- Before the reveal, each partner's own globe is drawn from their own `answers` only.

### Tables

```sql
spaces        id uuid pk, created_at, anniversary date null, theme text default 'dark',
              revealed_at timestamptz null, reveal_forced_at timestamptz null,
              show_names_on_poster bool default true, deleted_at null

members       id uuid pk, space_id fk, role ('owner'|'partner'), first_name text,
              email citext null, auth_user_id uuid null, token_hash text unique,
              sealed_at timestamptz null, adult_confirmed_at timestamptz,
              created_at, last_seen_at
              unique (space_id, role)

invites       id uuid pk, space_id fk, kind ('partner'|'view'), token_hash text unique,
              status ('pending'|'accepted'|'revoked'), created_at, accepted_at, revoked_at

answers       id uuid pk, space_id fk, member_id fk, question_id text,
              status ('answered'|'skipped'|'cant_remember'),
              geoname_id int null, place_name, country_code char(2), admin1_code,
              lat double, lon double, position int default 0, updated_at
              -- single-answer questions: unique (member_id, question_id) where position = 0
              -- catch-alls ('also_been', 'homes') hold many rows, one per place

places        id uuid pk, space_id fk, geoname_id int null, name, country_code, admin1_code,
              lat, lon, kind ('visited'|'wishlist'), is_home bool default false,
              created_at, went_at null
              unique (space_id, geoname_id, kind)

cards         id uuid pk, space_id fk, place_id fk, prompt_id text null,
              note text null check (length <= 140), year int null, created_at
card_authors  card_id fk, member_id fk, pk (card_id, member_id)   -- 1 author, or 2 for "you both"

wishlist_items id uuid pk, space_id fk, place_id fk, member_id fk, prompt_id text, created_at

photos        id uuid pk, space_id fk, card_id fk null, place_id fk null, storage_key,
              width, height, added_by fk members, is_cover bool, created_at   -- slice 7

share_assets  id uuid pk, space_id fk, token_hash text unique, snapshot jsonb,
              options jsonb, content_hash text, created_at, revoked_at null
```

The brief lists "wishlist items" and the PRD has places with a type. This model uses both: places with `kind = 'wishlist'` hold the location, and `wishlist_items` record who wished for it and through which prompt. Marking "we went" sets `places.kind = 'visited'` and `went_at`, and offers a card.

### SQL functions (all `security definer`, owned by a role that RLS doesn't restrict, and `execute` revoked from `anon` and `authenticated`)

| Function | Rule it holds |
|---|---|
| `resolve_member(token_hash)` | Returns the member and space, or nothing |
| `save_answer(token_hash, question_id, payload)` | Refused once the member has sealed |
| `my_answers(token_hash)` | Own answers, always |
| `partner_answers(token_hash)` | Partner's answers **only if** both have sealed, or `reveal_forced_at` is set. Otherwise returns an empty set and the partner's progress count (a number only) for the "Ravi has named 8 places" hint |
| `seal(token_hash)` | Sets `sealed_at`. If the other member has sealed too, calls `materialise_reveal(space_id)` in the same transaction |
| `materialise_reveal(space_id)` | Builds `places`, `cards`, `card_authors` and `wishlist_items` from both members' answers, sets `revealed_at`. Idempotent |
| `force_reveal(token_hash)` | Allowed only 7 days after the first seal. Reveals with whatever exists |

**Card rules in `materialise_reveal`.** For each prompt: if both answered with the same place (same GeoNames id, or within 50 km), make one card with two authors. Otherwise make one card per answer. Skipped and "can't remember" answers make no card. Catch-all entries make places with no prompt card ("Also been"), and the `homes` list plus the answer to question 15 set `is_home`. Duplicates are merged on GeoNames id, falling back to within 50 km. Deleting a card never deletes its place while any other card or wishlist item points at it. A trigger cleans up places left with nothing pointing at them, unless they came from a catch-all.

**Can a partner change sealed answers?** No. A seal is final. Before sealing, a review screen lists every answer and lets them edit. After the reveal, changes go through "add a place" and editing cards.

**Tests (pgTAP, slice 1, run in CI against `supabase start`).** The partner sees nothing before both seal. They see everything after. `save_answer` fails after sealing. The anon role can't select from any table or execute any function. A forced reveal is refused before 7 days.

---

## 4. Shape maths (`lib/shape/`)

Pure functions, no DOM, used by the globe, the reveal animation and the server poster renderer.

```ts
project(lat, lon, rotationDeg = -43): {x, y}     // r = (90 - lat)/90, θ = lon + rot, x = r sinθ, y = -r cosθ
toUnitVector(lat, lon): Vec3
mergeNearby(places, km = 50): Dot[]               // deterministic, see below
polarAngle({x, y}) = atan2(x, -y)
orderLoop(dots): Dot[]                            // sort by polarAngle, ties broken by geonameId
greatCircle(a, b, segments): LatLon[]             // slerp; segment count scales with the angle (≥ 8)
buildPolygon(dots): Path                          // n=0 → empty, n=1 → dot, n=2 → one arc, n≥3 → closed loop
fit(points, frameRadiusPx, marginPx = 70): Transform  // centre on bounding-box middle, scale so the farthest point sits 70px inside
labels(dots, transform): Label[]                  // country names, grouped when they'd collide
stats(dots): { places, countries }               // "12 places · 7 countries"
```

- **Deterministic merging.** Sort places by GeoNames id (or by lat/lon when there is no id), then do a greedy single pass: each place joins the first existing dot within 50 km (haversine), otherwise it starts a new dot. The dot sits at the position of its most-populated member. The same set of places always gives the same dots, and so the same shape.
- **Stable slotting.** Ordering by angle around the pole means a new place only changes the two edges next to it. That is the PRD's "slots in without redrawing the rest". Test it.
- **Fit for compact and spread-out sets.** Cap the zoom so that a tight cluster (say, everything in Kerala) still shows enough map context. Suggested cap: the shown span is never less than about 600 km, to be tuned with real journeys. Southern places (r > 1) are fine. The land dots fade out by radius, so the frame is chosen from the polygon, not the pole.
- **Fit uses arc samples too.** It fits to the polygon's arc points, not only the vertices, so long great-circle edges stay inside the frame.
- **Labels.** Country names in spaced capitals. Greedy placement: measure each label's box (Space Mono's advance width is fixed, which makes measuring easy). If two would overlap, merge them ("India · Sri Lanka") and place at their centroid, then repeat until nothing overlaps.
- **Tests (Vitest).** Projection values at known points (the pole, the equator, the rotation); merging thresholds at 49 and 51 km; ordering is stable when the input is shuffled; inserting a place changes exactly two edges; the n = 0, 1, 2 cases; fit keeps every arc point within `R - 70`. A golden SVG snapshot built from the `shape_reference.py` sample places is compared point by point against the Python output (within 0.01 px).

---

## 5. Place search (`lib/places/`)

- **Build step** `scripts/build-city-index.ts`: read GeoNames `cities15000.txt`, `countryInfo.txt` (country names, capitals) and `admin1CodesASCII.txt`. Write `public/data/cities.v1.json`: compact arrays of `[id, name, asciiName, countryCode, admin1, lat(4dp), lon(4dp), population]` plus a small alternate-names list (top names only, for example "Bombay" for Mumbai). Aim for about 600 KB after Brotli. Content-hash the file name so it caches forever. GeoNames is CC BY 4.0: put the credit in the footer.
- **Search** runs in a Web Worker, which loads the index as soon as the first question screen mounts. Normalise text (lowercase, strip accents). Rank prefix matches on name or alternate name first, ordered by population, then word-start matches, then a small typo allowance (edit distance 1 for queries of 4 or more characters). Results appear from 2 characters and show "City, Country". Target under 50 ms.
- **Countries and regions.** If the query matches a country name, put that country's capital (or best-known city, from a small override list: Italy → Rome, but Australia → Sydney is a judgement call), labelled "Rome, Italy · refine", at the top.
- **Paste parser.** Split on commas, new lines, semicolons, " and " and "&". Trim each piece and take the top match for it. Show the results as chips to confirm, each with one tap to swap in the second-best match. Unmatched pieces show as "couldn't find ‘Langkawi Island’, try another spelling". Duplicates are merged by id.
- **Server check.** The client sends only `geoname_id`. The server looks up the coordinates itself from the same index (loaded once per server instance), so stored places are always clean.
- **Globe tap** (catch-all): turn the tap into lat/lon and pick the nearest indexed city within 100 km, then confirm.
- **Tests.** "sev" → Seville first; "bombay" → Mumbai; "goa" (a state) → Panaji or a curated city; pasting "Goa, Langkawi, Vienna" gives three chips; accents ("Zürich" and "zurich") match.

---

## 6. Poster rendering

The brief overrides the PRD here: posters are rendered **on the server** (SVG → PNG with resvg), because the same image has to work as the link preview.

- `lib/shape/poster.ts` builds an SVG string from `(snapshot, format, options)`. The formats are story 1080 × 1920, feed 1080 × 1350 and link 1200 × 630. Each has its own layout constants, following the story layout in the PRD (chart about 890 px across).
- **Layers, from the back:** #05050A background → magenta radial glow → stars outside the frame → frame circle, degree ticks, graticule every 15° → land dots, fading by radius → polygon glow (a blurred copy: resvg supports `feGaussianBlur`) → 2.8 px #FF2E7E line with a 10% fill → white dots with pink halos → labels → type (names in Instrument Serif italic with a pink ampersand, labels in Space Mono, supporting text in Inter) → URL pill and QR code (`qrcode` as SVG).
- **Film grain at 7%.** Rendering noise in resvg is slow, so use a pre-made tileable grain PNG embedded as an `<image>` pattern instead.
- **Route** `GET /api/poster/[shareToken]/[format].png`: `content_hash = sha256(snapshot + options + renderer version)`. If `posters/{content_hash}/{format}.png` exists in Storage, serve it. Otherwise render it, store it and serve it. Headers are `Cache-Control: public, max-age=31536000, immutable`. Target under 3 seconds when nothing is cached (resvg usually takes 200 to 600 ms at these sizes).
- **Inside the couple space**, the poster preview is the same SVG rendered in the browser, so changing options feels instant. The PNG is made only when they press share or download.
- **Snapshots.** Pressing share writes a `share_assets` row whose `snapshot` freezes the dots, country labels, counts, names (if shown) and options at that moment. Later changes to the space never change a poster that was already shared, and `/s/[token]` exposes nothing beyond the snapshot. Shares can be revoked.
- **Alt text** comes from the snapshot: "A glowing pink polygon joining 12 places on a faded map seen from the North Pole".
- **Link previews.** `/s/[token]` sets `og:image` to the link-card PNG and `twitter:card` to `summary_large_image`.
- **Tests.** The SVG snapshot for the fixture; a PNG renders for each format without error; the time budget is checked in CI (a warning above 1.5 s locally).

---

## 7. Copy and framing rules, enforced by tests

- All reveal, card and notification copy lives in `data/copy.ts` as functions, for example `sameRegion(a, b, regionName)`.
- `tests/copy.test.ts` fails the build if any copy string contains `wrong`, `mismatch`, `disagree`, `%`, `!`, "out of", or "score". **Question 11's own wording ("something went hilariously wrong") is the one allowed exception.** It lives in `data/questions.ts`, which this test doesn't scan, and the test file has a comment explaining why.
- A test checks the reveal components never show a count of matches.
- The three reveal states share one component with the same size and weight. The only difference is the glow (soft pink for the same place, dimmer for the same region, none for different places). There is no red and green anywhere in the palette (`config/brand.ts` has no such tokens).
- **Pronouns.** The PRD's card example "the place where Tara had *her* favourite meal ever" guesses a pronoun from a name. Card titles should be written so they need no pronoun: "Tara's favourite meal ever", "Where Tara saw the best sunset", "Where you both had your favourite meal ever". Likewise R10's "hers, his, both" pin colours become member A, member B and both. Both changes go into `data/questions.ts` as a per-question `titleFor(member)` and `titleForBoth()`.

---

## 8. Build slices

Estimates assume one full-stack engineer working with Claude Code. Each slice ends deployed to a Vercel preview with its tests green.

### Slice 1 — Spaces and links (about 4 days)

- Scaffold Next.js, Tailwind, fonts, `config/brand.ts`, Vitest, Playwright, and CI on GitHub Actions (lint, typecheck, unit, pgTAP, e2e).
- Supabase migrations for **every table in section 3**, RLS on with no policies, plus the SQL functions and pgTAP tests for the seal rule. (The tables for later slices are created now so the schema doesn't change shape mid-MVP.)
- `lib/tokens.ts`. Start screen: first name, optional anniversary, an 18+ checkbox → create space → owner link plus an invite link, with "copy" and native share (`navigator.share`) buttons.
- `/i/[token]` claim flow, with redirect to the new member link.
- **Done when:** two browser contexts reach their own spaces; the anon key can read nothing (an automated test calls PostgREST with it); creating a space to the first question takes under 15 seconds.

### Slice 2 — Question flow (about 6 days)

- `data/questions.ts` (17 questions, groups, card titles) and `data/copy.ts`.
- City index build plus the worker search (section 5).
- Full-screen question card: search field, reuse chips (own earlier answers, in order of use), "skip", "can't remember", and the progress line "7 places so far" (counting distinct places, never "x of y").
- Save after every answer (an optimistic update, then `save_answer`). On a return visit, resume at the first question not yet answered. "Can't remember" questions are offered again once on a later visit.
- **Own globe after 5 answers:** a small preview of the polar shape (from `lib/shape`) that animates the new edge after each answer. It shows only their own places. The full rotating globe comes in slice 6.
- Wishlist round (3 questions) after the main set, then a review screen, then **seal**.
- **Done when:** in an e2e test with two contexts, partner B can't fetch A's answers before both seal (direct calls to the API too, not only the page); progress survives a reload; the median time to 5 answers in a scripted run is well under 2 minutes.

### Slice 3 — Catch-alls (about 3 days)

- "List every place we visited together": type several in a row (the field clears after each pick, and chips build up), paste a list (the parser plus confirm chips), or tap on a small map.
- "List every city we have lived in together": the same component, saved as `homes`.
- Both lists are saved as many `answers` rows. Duplicates are merged on the client and again on the server.
- **Done when:** pasting 10 places and confirming them takes under 60 seconds in a scripted test, and `materialise_reveal` sets `is_home` from both lists and from question 15.

### Slice 4 — Reveal (about 6 days)

- **Waiting screen:** "Your answers are in. Waiting for Tara." with a light hint of the partner's progress. It checks `/api/status` every 4 seconds (cheaper than Supabase Realtime, which would need its own way of authorising tokens) and stops when the tab is hidden.
- **Notification:** on the waiting screen, an optional "email me when it's ready" collects an email (stored unverified, used only for this). When the second partner seals, a Resend email goes to every member with an email. Acceptance (reveal available within 5 seconds) holds because materialising happens in the same transaction as the seal.
- **Cron** (every hour): a 24-hour reminder to the unsealed partner if they left an email. Otherwise the sealed partner sees a "send Tara a nudge" share sheet with a ready message ("Ravi has named 8 places, your turn"). After 7 days, `force_reveal` becomes available to either member.
- **Reveal sequence:** one question at a time, swiped, in three states:
  - *Same place:* the same dot after the 50 km merge → "You both said Seville".
  - *Same region:* the same country and (same admin1, or within 300 km) → "Different cities, same corner of Spain". The region name comes from admin1 or the country.
  - *Different places:* everything else → "Ravi chose Goa, Tara chose Langkawi: two good memories".
  - When only one partner answered a question, show their answer warmly ("Tara remembered this one: Kyoto") and never mention the empty side.
- **Wishlist reveal:** shared dreams, near dreams, and "two good ideas" shown as two branches.
- **Catch-all reveal:** places both listed, then "A memory only Tara kept: Vienna" with one tap to add it to the shared list (by default the shared list is already the union, so the tap acknowledges it and gives it a card).
- **The shape draws last:** the map fades in, then the polygon draws edge by edge over about 3 seconds (`stroke-dashoffset` along each arc), and each dot lights up as its edge arrives. Places both named are a little brighter.
- **Done when:** a copy test passes; the e2e test covers all three states and the single-answer case; the reveal opens within 5 seconds of the second seal.

### Slice 5 — Poster and share (about 5 days)

- `lib/shape/poster.ts` in three formats, the route with Storage caching, share snapshots, and the QR code.
- Poster options: names on or off, place names on or off ("guess our shape"). Dark theme only.
- Share sheet: native share with the story PNG (Web Share Level 2 files where supported), download, and copy link.
- `/s/[token]`: the poster, the alt text, OG tags and one button, "Find your shape", which goes to `/` with the space-creation form ready. That is two taps from a post to the first question: open the link, press the button (with the name field on the same screen as the first question if that's needed to meet it).
- **Done when:** a PNG renders in under 3 seconds with nothing cached; link previews validate (check them in the iMessage, WhatsApp and Slack preview tools); a revoked share returns 410.

### Slice 6 — The shape space: add a place, search, browse (about 7 days)

- **Couple space home:** the globe, a card stack per pin, and the "+" button.
- **Globe** (R10): canvas 2D with a d3-geo orthographic projection, land dots, pins coloured by member A, member B or both, and the polygon drawn as great-circle arcs on the sphere; drag with inertia, pinch to zoom, and a fly-to animation (interpolated rotation). Draw the land dots to an offscreen canvas while the globe is still, and use a dot field with fewer dots while it rotates, to hold 30 fps with 50 pins on a mid-range phone. Profile on a real Android mid-range device.
- **"Play our story" tour:** visits pins in their order around the loop (not by date).
- **Add a place** (R9): search → pick → optional prompt, year and note → save → the shape redraws with the new arc and a short glow. Target under 10 seconds with no extras.
- **Search** (R11): the couple's own places first (a client-side filter), then the world index. Picking their own place flies to it and never opens an add flow. Picking an unvisited place offers "we've been here" or "add to wishlist".
- **Wishlist pins:** dotted ghost pins with dashed arcs; "we went" moves the place to visited.
- **Cards:** edit the note and year, delete a card (the place stays if anything else points at it).
- **Export and delete** (R8 is P0): JSON export of the space, and delete by either member. Deleting sets `deleted_at`, revokes all tokens and share assets straight away, and a cron job purges the data after 30 days. "Leave space" (export your own answers and remove your cards) is built here, and its copy is reviewed with real users before launch.
- **View-only link** management: create and revoke.
- **Done when:** the globe holds 30 fps with 50 pins on the test phone; search results appear in under 300 ms; adding a place takes under 10 seconds.

**MVP launch checklist (between slices 6 and 7):** a privacy and legal review; a privacy notice; the GeoNames credit; error monitoring (Sentry, with path tokens scrubbed); privacy-friendly product analytics (Plausible or PostHog with tokens scrubbed) wired to the funnel in the PRD (5 answers, completion, pairing within 7 days, share, starts per share); the one-tap delight survey after the reveal; load tests on the poster route. Then hand-invite the first 20 couples.

### Slice 7 — Later (Phase 2)

- **Photos (R6) with magic-link save (R8):** pick and preview on the device (kept in IndexedDB until saved); resize on the device to a 1600 px long edge with a canvas re-encode, which drops all EXIF data including GPS; read GPS only on the device, before stripping, to suggest a place; upload to a private Storage bucket through a signed upload URL after the email is confirmed; set a cover photo; delete. Cap photos per space. Never on the poster by default.
- **Magic link:** Supabase Auth email OTP, sent through Resend as custom SMTP. Confirming links `members.auth_user_id`, and the email link takes them straight back to their space (one click).
- Anniversary emails with a new poster, and "your shape grew" notes (opt-in).
- Solo mode on the viewer path (a space with one member and no seal step, who can invite a partner later and then enter the normal seal flow).
- Year slider replay (only cards with years).
- P2 after that: pass-the-phone mode, "open together" synced reveal, archetype names, the guess-your-partner bonus, secret pins, the looping video.

**Total MVP (slices 1 to 6):** about 31 working days, or 6 to 7 weeks with review and fixes. That is at the top end of the PRD's 4 to 6 weeks. The globe (slice 6) carries the most risk to the estimate.

---

## 9. Decisions made in this plan (review these)

| # | Decision | Alternative |
|---|---|---|
| D1 | All database access goes through the Next.js server; RLS denies everything to anon | Supabase anonymous sign-ins with RLS on `auth.uid()` (harder across devices) |
| D2 | Shared places and cards are created only at the reveal; before that, answers are private rows | Visibility flags on shared rows (easy to leak by mistake) |
| D3 | Invite links work once and are swapped for a member link | Reusable invite links (forwarding risk) |
| D4 | One seal covers the questions, catch-alls and wishlist | A separate seal for the wishlist round |
| D5 | A seal is final; edits happen in a review step before it | Allow unsealing until the partner seals |
| D6 | "Same region" means the same country and (same admin1 or within 300 km) | Distance only, or cross-border regions |
| D7 | The waiting screen checks for changes every few seconds; email only when given | Supabase Realtime or Web Push |
| D8 | Shared posters are frozen snapshots | Live posters that update with the space |
| D9 | Card titles and pin colours avoid gendered pronouns | The PRD's "her" / "hers, his" wording |
| D10 | The tightest zoom is capped at about 600 km of span | Unlimited zoom-to-fit |

## 10. Open questions for the owner

1. The product name and domain (this blocks email sending and the final URL in posters).
2. Should the viewer landing page show the sharer's place names by default? This plan follows the sharer's poster toggle.
3. The final question wording, after the first 20 couples (wording is data-only, so changes need no code).
4. Whether question 11 ("went hilariously wrong") stays, given the no-"wrong" copy rule. It is allowed as question text in this plan.
5. The country → best-known-city overrides for country searches (a short curated list).
