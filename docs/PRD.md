# Build brief for Claude Code

Read this first. It tells you what to build, with what, in what order, and which rules must never break. The full product requirements follow below it. Where this brief and the PRD's "Data model and technical approach" section disagree, this brief wins.

## What we are building

A web app where two partners each answer about 16 short "the place where..." questions on their own phones, seal their answers, and then see a staged reveal of where they said the same and where they said different. It ends in a shareable poster: one glowing pink polygon joining their places, drawn on a faded world map seen from the North Pole. Working name: "The Shape of Our Journey" (the real name and domain are still being decided, so keep the name in one config file).

## Stack decisions

| Area | Decision |
|---|---|
| App | Next.js (App Router, TypeScript), deployed on Vercel, served from a custom domain once chosen |
| Data, login, files | Supabase: Postgres with row-level security, Storage for photos, email magic-link auth |
| Email | Resend (magic links, reveal-ready notifications, anniversary email later) |
| Place search | Bundled city index from GeoNames (cities with population over 15,000, about 25,000 rows), searched in the browser. No per-search API calls |
| Poster images | Rendered on the server from SVG to PNG (for example with resvg) in three sizes, cached in Storage, and used as the link-preview image |
| Styling | Tailwind or plain CSS. Fonts: Instrument Serif (italic), Space Mono, Inter |

## Links and access

- Each couple space has three kinds of link: an owner link (the initiator), an invite link (the partner), and an optional view-only link.
- Every link carries a random token of at least 128 bits. Store only a hash of each token. Never use sequential ids, and never put names in URLs.
- No account is needed to start. The token is the credential. An email magic link is asked for only when someone wants permanence or to save photos.
- View-only links can be revoked at any time.

## Rules that must never break

1. **Sealed answers are enforced on the server.** A partner's answers are returned to the other partner only after both have sealed. Do this in database policy or a server function, never by hiding data in the page.
2. **No dates are collected, and the shape never depends on them.** Years on cards are optional extras.
3. **Differences are never framed as wrong.** No match percentage, no mismatch count, no red and green, no words like "wrong", "mismatch" or "disagree".
4. **Private by default.** Nothing leaves a couple's space until one of them shares. Photos are never on the poster by default. Photo location data is stripped before upload.
5. **Places are the one required output.** Photos, notes and years are always optional.

## How the shape is drawn

1. Convert each place to a point on a unit sphere and project it with the north-polar azimuthal projection: r = (90 - lat) / 90, theta = longitude + rotation (rotation is -43 degrees), x = r sin(theta), y = -r cos(theta).
2. Merge places within about 50 km of each other into one dot.
3. Sort the places by their angle around the pole, atan2(x, -y).
4. Join consecutive places, and the last to the first, with great-circle arcs (spherical interpolation), projected with the same formula. This is the polygon.
5. Centre the chart on the middle of the points' bounding box, and scale so the farthest point is about 70 px inside the frame circle.
6. Draw the faded world dots (see the assets), then a blurred pink glow, the 2.8 px pink line with about 10% fill, then white dots with pink halos.
7. With fewer than three places, draw a dot or a line.

A working Python version is in `assets/shape_reference.py` (run it to write a sample SVG). Port it to TypeScript. Use the sample places in it as a test fixture.

## Build order

Build in these slices, each shippable on its own, and write tests for the shape maths and the sealed-answer rule as you go.

1. **Spaces and links.** Create a space, the owner link, the invite link, token hashing, and the data model (couple spaces, members, answers, places, cards, wishlist items, photos, invites).
2. **Question flow.** One question per screen, type-ahead place search over the bundled index, reuse chips, skip and "can't remember", progress that reads "7 places so far", save after every answer, then seal.
3. **Catch-alls.** List every place visited (type several, tap, or paste a list) and list every city lived in together. These become places, with `is_home` set for the second list.
4. **Reveal.** Waiting screen, notification when both have sealed, one question at a time in three states (same place, same region, different places), the catch-all reveal, then the shape drawing last.
5. **Poster and share.** The shape in the three sizes, the viewer landing page with "Find your shape", and link-preview images.
6. **Add a place, search, browse.** Add-a-place button, search over the couple's own places first, and the globe or map browse.
7. **Later.** Photos with magic-link save (R6, R8), anniversary emails, solo mode, year slider.

## Suggested repository layout

- `app/` routes: `/` start, `/c/[token]` couple space, `/i/[token]` invite, `/v/[token]` view-only, `/s/[token]` public share landing
- `lib/shape/` projection, polygon and poster SVG code, with tests
- `lib/places/` the bundled city index and search
- `supabase/migrations/` schema and row-level security
- `data/questions.ts` the question list, groups and card titles
- `assets/` the world-land dots and the reference generator
- `docs/` this PRD and design images

## Design reference

See "Design guidance for the poster" in the PRD below and `docs/poster-story-polygon-map.png`. The image uses stand-in fonts and sample data. The live boards are on the design canvas: https://claude.ai/artifact/4cwKyFErNdYvyX1aH2f4nP. The feed, link-card and reveal boards there are in an older style, so follow the story poster.

## Needs the owner's input

- The product name and domain.
- A Supabase project, a Vercel project and a Resend account.
- The final question wording, to be checked with the first 20 couples.

---

# PRD: The Shape of Our Journey

2026-11-23 · Ravi

## Summary

The Shape of Our Journey turns a couple's shared travel memories into one beautiful, shareable object: the shape their journey has drawn across the globe, seen from above the North Pole.

Couples answer about 16 quick prompts ("the place where we had our favourite meal ever"), each with a type-ahead place search. Every answer becomes a pin and a story card on a living globe. They can add photos, build a wishlist of where to go next, and share a poster of their shape. Everything lives at one permanent link that grows as they travel.

**The core experience** is a 10-minute date night: two phones, no peeking. Each partner answers on their own device at their own pace and seals their answers. When both are done, a staged reveal shows where they said the same thing and where they said something different, and then draws the shape of their journey together.

It can spread for the reason a year-end music recap does: it reflects identity back in a form people are proud of, it is understood in a second, and every shared image carries an open invitation to "find your own shape" in about two minutes.

**Working name:** The Shape of Our Journey ("the shape of our journey so far").

## Problem and insight

Couples collect years of shared travel and almost never see it as one story. It sits in camera rolls, chat threads and map history, and the formats that exist either count countries (scratch maps), record a single trip (travel journals), or demand hours of effort (photo books).

Three insights shape the product:

- **People remember superlatives, not itineraries.** Nobody can list every trip, but everyone can name the place of their best meal or best sunset. Superlative questions turn recall into a game, and the list of places is a by-product.
- **The best recap products give identity back for free.** The user does very little, the output is flattering and comparable, and sharing it feels like self-expression and not advertising. Here the effort is two minutes of questions and the output is a shape no one else has.
- **Two people make it a moment.** Answering separately and revealing together creates a built-in conversation: do we remember the same place, and do we want to go to the same place next?

**What we know and don't.** One prototype exists, built as an anniversary gift with 12 places and one photo each. It shows the core object is delightful to its audience of one. Whether strangers will build their own shape is the central bet this PRD is designed to test.

## Users, principles and tone

The product is for romantic couples who travel together, and the first user is almost always one person who wants to surprise or delight the other.

| Who | Role in the product | What they need |
|---|---|---|
| Initiator | Starts the shape, often as a gift | A result worth showing within minutes, and a clear way to bring their partner in |
| Partner | Joins by link, answers separately | A low-effort, fun first step and no account wall |
| Viewer | Sees a shared poster on social media | To grasp it instantly and start their own in one tap |

Primary segment: couples aged roughly 25 to 45, together a year or more, with at least 5 shared trips. Long-distance couples and newlyweds (honeymoon, first anniversary) are early adopters.

**Design principles**

1. **Places are the spine.** The one required output is a list of places. Photos, notes and dates are always optional.
2. **Two minutes to the first shape.** The shape appears after the first five answers and grows with every answer after that.
3. **Easy beats complete.** Every question is skippable, and a skipped question is never shown as a failure.
4. **Private by default, shared by choice.** Nothing leaves the couple's space until one of them presses share.
5. **Two voices.** Each partner's answers stay attributable, so differences are shown as two good memories, never as right or wrong.
6. **Restraint is the brand.** A dark globe, a thin gold route, generous space and few words.

**Tone:** warm, dry and specific, like a well-written postcard. No exclamation marks, no gamified streak language, and no "you're a 7 out of 10 couple" scoring.

## Goals, non-goals and success metrics

**Goals**

- A couple goes from link to a first shape in under two minutes, without creating an account.
- Most couples bring their partner in, because the product is better with two.
- The shared image is attractive enough that people post it unprompted, and it brings new couples in.
- The shape is still being updated a year later.

**Non-goals (for now)**

- Not a trip planner, itinerary tool or booking product.
- Not a social network: no feed, no following, no public profiles.
- No automatic import from camera rolls, Google Maps history or Instagram. Everything is entered by the couple.
- No ads, and no selling of location data.

**Success metrics.** All targets are starting hypotheses to calibrate with the first 50 couples.

| Stage | Metric | Starting target |
|---|---|---|
| Activation | Visitors who answer 5 questions | 60% |
| Completion | Starters who finish the core set | 40% |
| Pairing | Couples where both partners seal their answers within 7 days (within 24 hours is the stretch goal) | 50% |
| Sharing | Finished shapes that export the poster | 35% |
| Virality | New starts per shared poster | 0.3 or more |
| Retention | Couples who add a place or photo within 90 days | 30% |
| Delight | Partner reaction ("I love it") in a one-tap survey | 80% positive |

## The experience in six moments

The journey runs from an invitation to a shape the couple keeps for years. Requirement numbers (R1 to R11) refer to the next section.

1. **The link (R1).** One partner creates the space and sends an invite link to the other. Each enters their own first name (and the couple optionally adds an anniversary date) and is in. No account is required to begin.
2. **The questions (R2, R3, R4).** Each partner, on their own device and at their own pace, answers full-screen cards one question at a time, each by typing a place, then seals their answers. After 5 answers their own globe appears and starts drawing, showing only their own places. A short wishlist round asks where they want to go next.
3. **The reveal (R2, R4).** When both partners have sealed their answers, a staged reveal (R12) shows where they said the same thing, where they said something different, and which dream destinations they share, and then draws their combined shape.
4. **The shape (R5, R6, R10, R11).** The couple browses their globe, opens a story card at each pin, adds photos, and searches for any place.
5. **The share (R7).** One tap produces the North Pole poster in story, feed and link-card sizes, with a link for viewers to start their own.
6. **The keeping (R8, R9).** The page stays at its permanent link. A "+" adds a new place after each trip, and each anniversary the shape is refreshed and sent back to them.

## Functional requirements

Priority: **P0** is required for the first public launch, **P1** follows within the first release cycle, and **P2** comes later.

### R1. A shareable link for the couple (P0)

- Creating a couple space takes one screen and no sign-up. The result is an unguessable URL.
- The initiator gets a private link for themselves and a separate invite link for their partner. The partner's link shows their own answers privately until both are done.
- A "view-only" link can be shared with friends and family, and it can be turned off at any time.
- Acceptance: a new user reaches the first question in under 15 seconds from opening the link.

### R2. Onboarding questions with type-ahead (P0)

- One question per screen. The answer field is a place search that suggests matches after two characters, showing city and country.
- Places already named appear as one-tap chips on later questions, so "same as before" costs one tap.
- Every question has "skip" and "can't remember". A progress line reads "7 places so far", never "7 of 15 done".
- A partner's own globe appears after their 5th answered question and updates with a short animation after each answer. It shows only their own places until the reveal.
- Both partners answer the same questions, each on their own device and at their own pace, and seal their answers when done. Neither can see the other's answers. A one-device "pass the phone" option is P2.
- Acceptance: median time to the first 5 answers is under 2 minutes, and progress is saved after every answer.

### R3. Catch-all question: every place you remember (P0)

- Each partner gets one catch-all question, answered separately and skippable: "List all the places you can remember that we visited together." They can add places three ways: type several in a row, tap the globe, or paste a list ("Goa, Langkawi, Vienna").
- Pasted text is parsed into places, and each is confirmed with one tap. Duplicates are merged.
- Acceptance: adding 10 places by pasting takes under 60 seconds.

**Cities lived in together.** A second catch-all asks each partner to list every city the couple has lived in together (for example Hyderabad and Bangalore), using the same type-ahead and paste flow. Each city named becomes a place marked as a home. The couple's list is the union of both partners' lists. Dates are never asked, so the product does not try to order the homes.

**Best city.** The question "The best city we lived in together" works like the other questions and makes a normal card. Its answer is also added to the homes list.

### R4. Wishlist (P0)

- A separate round of 3 questions asks where they want to go next. Each partner answers privately.
- When both are done, the reveal shows shared dreams (same place), near matches (same region) and divergences, which become two branches in the future shape. Differences are framed as two good ideas, never as disagreement.
- Wishlist places appear as dotted ghost pins and arcs, styled differently from visited places.
- A wishlist place can be marked "we went", which moves it to visited and offers a card for it.
- Acceptance: both partners' wishlists are hidden from each other until both finish, or until a 7-day timeout offers to reveal anyway.

### R5. The shape built from the answers, as cards (P0)

- Each answer creates a card, such as "The place where Tara had her favourite meal ever", using the answering partner's name. If both name the same place, it reads "The place where you both had your favourite meal ever".
- A place may hold several cards. Opening a pin shows its cards as a short stack.
- A card shows the place, the prompt, who answered, an optional photo, an optional one-line note, and an optional year.
- Acceptance: every answered question produces exactly one card, and deleting a card never deletes a place that still has other cards.

### R6. Optional photo upload on each card (P1)

- A card can take one or several photos. A user can pick and preview a photo with no account, and it stays on the device until they confirm an email by magic link (see R8) to save it. Images are resized on the device (long edge 1600 px) before upload, with location data stripped.
- If a photo carries GPS data, it is read on the device only to suggest which place it belongs to.
- Either partner can set the cover photo for a place and can delete any photo they added.
- Acceptance: a photo upload on mobile completes in under 5 seconds on a typical connection.

### R7. Shareable North Pole poster and viewer landing page (P0)

- One tap generates the shape seen from the North Pole in three formats: 1080 x 1920 (story), 1080 x 1350 (feed) and 1200 x 630 (link card).
- Each image carries the title, the couple's first names (toggleable), a one-line stat, and a short URL with a QR code.
- Options: show or hide place names. The poster is dark only at launch. Photos are never included by default. Full visual rules are in the design guidance section.
- The URL opens a viewer landing page that shows the sharer's poster and one button, "Find your shape".
- Acceptance: the poster renders in under 3 seconds, and a viewer reaches the first question in two taps from the post link.

### R8. A permanent home that keeps updating (P0)

- The couple space lives at a stable link. The email confirmation (a magic link, no password) is asked for only when a member wants to make the shape permanent or to save a photo. Until then the space works with no account.
- A space can be exported (data and poster) and deleted by either partner.
- An anniversary email reminds them to refresh the shape and sends a new poster, and an optional note after each added place says "your shape grew".
- Acceptance: a returning user reaches their shape in one click from the email.

### R9. Add a new place (P0)

- A persistent "+" button opens a place search. After choosing a place the user can optionally pick which prompt it answers, add a year and a photo.
- The shape redraws with the new arc and a short celebration.
- Acceptance: adding a place with no extras takes under 10 seconds.

### R10. Browse the journey on the globe (P0)

- A rotating globe with drag, pinch, inertia and a fly-to animation to any pin.
- Pins are coloured by whose answer created them (hers, his, both). A year slider replays the shape growing over time when years are known.
- A "play our story" tour visits each pin in order.
- Acceptance: the globe holds 30 frames per second on a mid-range phone with 50 pins.

### R11. Search for a place (P0)

- One search field finds a place among the couple's own pins first, then any place in the world.
- Choosing one of their own places flies the globe there. Choosing an unvisited place offers "we've been here" or "add to wishlist".
- Acceptance: results appear in under 300 ms, and a search for a visited place never opens an add flow.

### R12. The reveal: same and different (P0)

- **Sealed answers.** When a partner finishes, their answers are sealed and hidden from the other. They see a waiting screen ("Your answers are in. Waiting for Tara."). Neither partner can see the other's answers until both have sealed.
- **Opens when both are done.** Both are notified. Either can open the reveal on their own device, and an optional "open together" mode (P1) syncs the two screens for a shared moment.
- **One question at a time.** For each question the reveal shows both answers side by side, in one of three states with equal visual weight and equal warmth: *the same place* ("You both said Seville", a soft glow), *the same region* ("Different cities, same corner of Spain"), and *different places* ("Ravi chose Goa, Tara chose Langkawi: two good memories").
- **No scoring, and no right or wrong.** The reveal never shows a match percentage, a count of matches, a mismatch label, or red and green. Copy never says "wrong", "mismatch" or "disagree". Differences are the interesting part, not a problem.
- **Catch-all reveal.** The places both partners listed are shown together. A place only one partner listed is shown as "A memory only Tara kept: Vienna", with one tap to add it to the shared list. The shared list is the union of both.
- **The shape draws last.** The combined polygon draws itself from the shared list, edge by edge. Places both partners named light up a little brighter. It is one colour, with no her and his split.
- **Share cards.** Each reveal moment can become a card ("We both picked Seville"). Cards are never shared unless a partner chooses them.
- **Waiting states.** After 24 hours a gentle reminder goes to the partner who hasn't finished ("Ravi has named 8 places, your turn"). The sealed partner sees a light progress hint. After 7 days the reveal offers to open with what exists.
- Acceptance: the reveal is available within 5 seconds of the second partner sealing, and a copy review confirms that no reveal text implies a pair did something wrong.

## The question set

The questions carry the product, so they are designed to be answered in seconds and to produce a place each time. About 16 questions are expected to yield 8 to 12 distinct places, because answers repeat. Each question is phrased as "the place where..." and maps to a card title. Two questions ask about cities the couple lived in, because most couples have lived in more than one.

| # | Question | Card title | Group |
|---|---|---|---|
| 1 | The place where we had our favourite meal ever | Favourite meal | Warm-up |
| 2 | The place where we saw our best sunset | Best sunset | Warm-up |
| 3 | The place with the best view we've had | Best view | Warm-up |
| 4 | The place where we first travelled together | Our first trip | Warm-up |
| 5 | The place where we shopped the most | Most shopping | Doing |
| 6 | The place where we walked the most | Most walking | Doing |
| 7 | The place where we laughed the most | Most laughs | Doing |
| 8 | The place where we relaxed the most | Slowest days | Doing |
| 9 | The place with the best coffee, drink or dessert | Best treat | Doing |
| 10 | The place we would go back to tomorrow | Back tomorrow | Feeling |
| 11 | The place where something went hilariously wrong | The disaster | Feeling |
| 12 | The place that surprised us most | The surprise | Feeling |
| 13 | The place that felt most like us | Most like us | Feeling |
| 14 | The place where we took the most photos | Photo heaven | Feeling |
| 15 | The best city we lived in together | Best home city | Feeling |
| 16 | List every place you can remember that we visited together | Also been | Catch-all |
| 17 | List every city we have lived in together | Homes we shared | Catch-all |

**Wishlist round (3 questions, answered privately):** the place you most want us to go next; a place you'd love us to see in the next five years; a place you'd love to take me for our next anniversary.

**Answer rules**

- Type-ahead place search returns city-level results first. Typing a country or region returns its capital or best-known city, with an option to refine.
- Previously named places show as chips above the field. Most couples are expected to reuse them for 5 to 8 of the questions.
- A "can't remember" answer is stored as skipped and the question can be re-offered later, once, on a return visit.
- Order runs from easiest to hardest to recall, so early answers are quick and confidence builds.
- Optional rapid-fire bonus (P2): "Where would your partner say?" Guess the partner's answer, then reveal. It is off by default so the core flow stays short.

## The shape and the shareable poster

The shape is the product's signature: the couple's places joined by arcs and viewed straight down from the North Pole, so every couple gets a different, instantly recognisable form.

**How the shape is drawn**

- Projection: north-polar azimuthal, with the pole at the centre and distance from the pole growing as places move south. A faded dot map of the world sits behind the polygon so people can read where it is. The chart is centred on the shape and scaled to fit, not centred on the pole.
- How places are joined: no dates are needed, and the product never asks for them. The places are joined into one closed loop, a polygon, in the order they sit around the pole on the chart, using great-circle edges. The same set of places always gives the same shape. Adding a place slots it into the loop without redrawing the rest. Places within about 50 km of each other merge into one dot. With fewer than three places the shape shows as a dot or a line until a third is added.
- The polygon is drawn as one neon pink line with a soft inner fill and glow, laid over a faded dot map of the world in the same polar view. Each place is a white dot with a pink halo, and home cities get a larger halo (P1). Wishlist places are dotted ghost pins outside the polygon, and shared dreams glow. A wishlist place joins the polygon only once the couple marks it "we went".
- Years are optional extras. When a couple adds them on a card, the year slider (R10) can replay the journey growing, which also makes a short looping video for sharing (P2). The shape itself never depends on years.

**The poster**

- Three sizes (story, feed, link card), two themes, and a toggle to hide place names for a "guess our shape" version.
- A small caption such as "12 places · 7 countries". The counts are computed from the places, so they are always true. Distance is left out because it depends on the order of travel, which the product does not collect.
- A short URL and QR code at the bottom, and the line "Find your shape".
- Archetype names (for example, "The Loop", "The Constellation", "The Long Line") are assigned from the geometry of the shape. This is P2, and it gives people a name to share and compare.

**The viral loop**

1. A couple finishes and sees their poster.
2. They post it, with the link in the image and the caption.
3. A viewer opens the link and sees the sharer's poster with one button, "Find your shape".
4. The viewer, with or without a partner, answers the first five questions and sees their own shape within two minutes.
5. The viewer invites their partner, and the loop begins again.

**What makes it spread**

- **A form worth showing.** The poster must look good enough to be shared with no caption.
- **A reason to compare.** Shapes differ visibly, and people are curious about their friends' shapes.
- **A reason to share now.** Anniversaries, Valentine's Day, and the year-end "our shape of 2026" refresh give timed moments.
- **A free first step.** The viewer's first five answers cost nothing and need no account.

A solo mode is available on the viewer path, so a single person can see a shape, and then invite a partner.

## Design guidance for the poster (UX)

This is the reference that design and engineering build from. The live boards are on the [design canvas](https://claude.ai/artifact/4cwKyFErNdYvyX1aH2f4nP). The board titled "polygon on faded world map" is the current direction. The feed, link-card and reveal boards are still in an earlier neon style and are to be redrawn to match it. All names, places and counts in the boards are sample data.

**The look**

- A dark night sky (#05050A) with a soft magenta glow behind the chart, 7% film grain, and faint background stars outside the chart frame.
- A circular chart frame with degree ticks around the rim. Inside it, a faint graticule (rings and meridians every 15 degrees) and a dot map of the world that fades to nothing toward the edge.
- One neon pink (#FF2E7E) polygon over the map: a 2.8 px line, a soft blurred glow, and a 10% inner fill. Each place is a white dot with a pink halo.
- Labels are country names only, in small spaced capitals, never city names. Places that sit close together share one label, such as "India · Sri Lanka", and appear as one bright knot.

**Type and copy**

- Names in a large italic serif (Instrument Serif), with the ampersand in pink. Small labels in a monospaced face (Space Mono). Supporting text in Inter.
- Plain, warm copy. No film or movie references, no scoring. Lines used so far: "Seen from the North Pole", "12 places · 7 countries", "the shape of our journey", "Find your shape."

**Layout, story format (1080 x 1920)**

- Top: the line "Seen from the North Pole", then the couple's names, then the counts line.
- Middle: the chart, centred, about 890 px across, scaled so the polygon fits with a margin of about 70 px.
- Bottom: the title "the shape of our journey", then "Find your shape." with the link in a pill button.

**Rules for the data-driven parts**

- The chart zooms to fit the polygon. Very compact sets are enlarged so the shape stays readable, and very spread-out sets are accepted as long, narrow shapes.
- Labels must not overlap. When they would, nearby places are grouped under one label.
- The reveal draws the map first, then the polygon edge by edge over about three seconds, with each dot lighting up as its edge arrives (P1).
- The poster needs alt text such as "A glowing pink polygon joining 12 places on a faded map seen from the North Pole".

**Design files**

- Reference image of the story poster below. It uses stand-in fonts, so the final typefaces will look different.
- Editable boards on the design canvas: the story poster in several directions, plus feed, link-card and reveal formats.

![Story poster, single pink polygon over a faded world map seen from the North Pole. Sample data and stand-in fonts.](docs/poster-story-polygon-map.png)

## Data model and technical approach

The data model is small. The couple space is the root, and everything else hangs off it.

| Entity | Key fields | Notes |
|---|---|---|
| Couple space | id, created date, anniversary date (optional), theme, share settings | One per couple. Holds the permanent URL |
| Member | first name, role (initiator or partner), email (optional), access token | Two per space. Email is needed only to make the space permanent |
| Place | name, country, latitude, longitude, type (visited or wishlist), is_home (true for a city they lived in together), year (optional) | Deduplicated within a space |
| Card | place, prompt id, member, note (optional), created date | One per answered prompt. A place can hold many |
| Photo | card or place, storage key, width, height, added by | Resized on device, location data stripped |
| Share asset | format, theme, options, generated date | Regenerable, so it is not stored long term |
| Invite | space, token, status | Used for the partner link and the view-only link |

**Approach**

- **Front end:** one responsive web app. The existing prototype already proves the globe, search and shape views on a canvas, and it runs on mobile.
- **Place search:** a bundled index of roughly 25,000 cities and towns, which is enough for type-ahead with no per-search cost and no third-party call that leaks what users type. A full geocoder can be added later for smaller places.
- **Land map:** public-domain Natural Earth data, as in the prototype.
- **Poster:** drawn client-side on a canvas and exported as PNG, so no image-rendering server is needed at first.
- **Storage:** a database for spaces, places and cards, plus object storage for photos. Access is by unguessable token until an email is confirmed.
- **Prototype path:** the prototype can hold a handful of couples on the current artifact platform's database and asset capabilities, to be checked before committing. Public launch needs its own backend, domain and image hosting.
- **Permanence:** data is exportable as JSON and as a poster file, and a space is deleted on request within 30 days.

## Privacy, safety and trust

A couple's travel history is personal, so trust is part of the product's appeal and is set by default.

- **Private until shared.** A space is visible only to its two members. Sharing creates a separate view-only link that can be revoked.
- **No hidden location access.** The product never reads a device's location or photo library. Only what the couple types, picks or uploads is stored.
- **Photos stay on the couple's side.** Photos are never in the poster by default and are never public without an explicit choice. Location data in photos is read on the device for suggestions and then discarded.
- **Poster controls.** Names can be hidden, and place names can be hidden, so a shared poster reveals only as much as the couple wants. The poster never shows a street address or home address.
- **Secret pin (P2).** Each partner can add one hidden pin that is revealed on the next anniversary, which supports surprises without weakening privacy.
- **Leaving gracefully.** Either member can leave a space and export their own answers. If a relationship ends, the other member keeps the space and the leaver's cards can be removed. This is designed tenderly and tested with real users before launch.
- **No sale of data and no ads.** The business model must not depend on location data.
- **Audience.** The product is for adults. Sign-up asks for confirmation that the user is 18 or older.
- **Privacy and legal review** is required before public launch, including the rules for photos of other people and for users in regions with stricter data law.

## Phasing and launch plan

Build the smallest version that proves a stranger will finish the questions and share the poster, then widen. Durations are rough planning guesses, to be replaced by an engineering estimate.

| Phase | Scope | Exit criteria |
|---|---|---|
| 0. Done | Single-couple prototype: globe, pins, search, tour, shape view | Ravi's anniversary gift is delivered |
| 1. MVP (about 4 to 6 weeks) | R1, R2, R3, R4, R5, R7, R9, R10, R11, R12 (sealed answers and staged reveal). Account-free links, bundled city index, poster export, partner reveal | 20 invited couples finish; at least 60% reach 5 answers and 40% finish all questions |
| 2. v1 (about 4 weeks after) | R6 photos, R8 permanent email and anniversary emails, view-only links, solo mode for viewers who start without a partner | 50 couples; 50% pair within 7 days; 30% add a place in 90 days |
| 3. v1.1 | Year slider replay, short looping video, archetype names, guess-your-partner bonus | Poster share rate above 35% |
| 4. v2 | Secret pins, long-distance mode, printed poster, gift mode (one partner builds for the other) | Sustainable paid print or gift revenue with no ads |

**Launch plan**

1. Hand-invite 20 couples (friends, community, couples who just got married) and watch them use it. Fix the question wording first.
2. Open to a wider invite list in January and February, aiming at the Valentine's Day moment.
3. Run the "our shape of 2026" refresh as a year-end recap moment, and use anniversaries as the standing rhythm after that.
4. Seed shared posters from real couples who opt in, and avoid paid ads until organic loop numbers are known.

## Risks, open questions and next steps

The biggest risk is that a shape feels like homework to the second partner. Everything else is manageable.

| Risk | Why it matters | Mitigation |
|---|---|---|
| Partner never joins | The best moments need two people | Solo mode gives full value; the invite is a gift, not a request; a gentle one-time reminder |
| Shapes look too alike | Weak shapes make weak posters | Test the polygon, zoom-to-fit and label placement with 20 real journeys, including compact and very spread-out sets, before launch |
| Place search misses small towns | A wrong or missing place feels broken | Fall back to the nearest region with a map tap; add a full geocoder in v1 |
| Photo storage cost and abuse | Cost grows with success | Resize on device, cap per space, review reports |
| Privacy incident | Trust is the product | Private by default, short retention for assets, review before launch |
| Relationship ends | An ugly edge case with emotional weight | Leave-and-export flow, designed with care |
| One-time novelty | Couples do it once and forget it | Anniversary refresh, add-a-place nudges, yearly recap |

**Open questions**

- Decided: the shape does not depend on dates. Places are joined in the order they sit around the pole, and years stay an optional extra. Still open: how the polygon looks for very compact sets (all places in one region) and for very spread-out ones, to be tested with real journeys.
- Account model: decided on magic-link email confirmation, requested when a member wants permanence or saves a photo. Revisit sign-in with Apple or Google only if return visits prove slow.
- Brand: keep "the shape of our journey so far", or find a name that also works for non-romantic travel partners (friends, families)?
- Business model: free forever with paid printed posters and gifts, or a light yearly plan for the permanent space?
- Should the viewer landing page show the sharer's place names by default, or only the shape?

**Next steps**

- [ ] Decide the name, then redraw the feed, link-card and reveal formats in the polygon style
- [ ] Move the prototype's data into a data file so adding a place is one row
- [ ] Build the question flow with type-ahead, reuse chips and the wishlist round
- [ ] Add the North Pole poster export in three sizes
- [ ] Test with 5 couples in person, then widen to 20
