# Our World

A game for two: "How big is our world?" One partner starts a game and brings the other in by QR code. Each answers 12 questions about places in their lives in three acts (before us, us, next), seals their answers, and the phones swap by scanning each other's code. Then a reveal, one question at a time, and a poster: each partner's world in silver, plus the bigger world they make together in pink. "Mine + yours = ours."

There is no backend. Answers stay on each phone, and the codes carry them after the `#` in a link, which browsers never send to a server.

Requirements: `docs/PRD-v2.md` (current), with mocks in `docs/mocks/` and boards in `docs/boards/`. `docs/GAP_LIST_v2.md` records what v2 changed. `docs/PRD.md` is the original PRD.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # unit tests (shape maths vs the Python reference, QR payload, reveal, search, copy rules)
npm run build        # static site in dist/
```

The camera needs HTTPS (or localhost). To try the swap with two real phones, deploy a preview (below) and open it on both.

End-to-end smoke test (two simulated phones play the whole game):

```bash
npm run build && npx vite preview --port 4173 &
node scripts/e2e-smoke.cjs e2e-out   # needs Playwright installed
```

## Deploy (Cloudflare, free)

The repository is connected to Cloudflare Workers & Pages (project `ourworld`), so every push to `main` builds and deploys.

- Build command: `npm run build`. Deploy command: `npx wrangler deploy` (the default).
- `wrangler.jsonc` tells Cloudflare to serve `dist/` as a static site. Without it, Wrangler tries to auto-configure the Vite project and fails on Vite 5.
- `public/_headers` sets the security headers (strict Content Security Policy, no referrer, camera allowed for this site only).
- Check a deploy locally without publishing: `npm run build && npx wrangler deploy --dry-run`.

## Data

- `data/cities.json`: about 24,000 cities (over 15,000 people, plus capitals and a few famous small places) from GeoNames, CC BY 4.0, via the `all-the-cities` package. Rebuild with `npm run build:cities`.
- `data/land.json`: land dots on the whole globe from Natural Earth 50m (public domain), via `world-atlas`. Rebuild with `npm run build:land` (about 2 minutes).
- `public/og-image.jpg`: the 1200 × 630 link preview image, drawn by the app's own chart code with the sample couple in `src/data/sample.ts`. Regenerate with `npm run build:og` (needs Playwright), then bump `?v=` on the image URL in `index.html`. The image URL there is absolute and must change if the site moves to its own domain.
- `tests/fixtures/reference.json`: output of `assets/shape_reference.py`, regenerated with `python3 scripts/export-reference-fixture.py`.

## Where things live

| Path | What |
|---|---|
| `src/data/bank.ts` | The question bank: acts, tiers, starred and about-partner questions. Ids are stable (they travel in the invite) |
| `src/data/copy.ts` | All reveal and poster copy (tested: no scoring, no "wrong", no exclamation marks) |
| `src/lib/game/select.ts` | Picks 3 + 6 + 3 questions for a game, seeded by the game id and shaped by the tier |
| `src/lib/swap/codec.ts` | The invite code (`#j=`) and the answer code (`#a=`), with checksums |
| `src/state/game.ts` | The game kept on each phone, and the sealing rule (partner answers only after your own seal, same game, other role) |
| `src/lib/shape/` | North-polar projection, merging, the loop (`geo.ts`, `polygon.ts`, `world.ts`), chart drawing (`chart.ts`) and the poster (`poster.ts`) |
| `src/lib/reveal/` | Same place, same region, different (`reveal.ts`) and the connecting facts (`facts.ts`) |
| `src/lib/places/` | City search, aliases, paste parsing, time zones, continents |
| `src/screens/` | Landing → Set-up → Invite / Join → Questions and chapter cards → Lists → Review → Sealed and scan → Reveal → Final → Poster |
