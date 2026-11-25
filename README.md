# Our World

A game for two. Each person answers 12 quick questions about places in their life on their own phone, seals their answers, then the two phones swap answers by scanning each other's QR code. Both phones then show the reveal (same places, same corners of the world, different places) and draw the shape of their world together as a shareable poster.

There is no backend. Answers stay on each phone, and the QR code carries them after the `#` in a link, which browsers never send to a server.

Plans and background: `docs/PRD.md` (original PRD), `docs/IMPLEMENTATION_PLAN.md`.

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

## Deploy (Cloudflare Pages, free)

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → pick this repository.
2. Framework preset: none. Build command: `npm run build`. Build output directory: `dist`.
3. Save and deploy. You get a `*.pages.dev` address; add your own domain later under Custom domains.

`public/_headers` sets the security headers (strict Content Security Policy, no referrer, camera allowed for this site only).

## Data

- `public/data/cities.json`: about 24,000 cities (over 15,000 people, plus capitals and a few famous small places) from GeoNames, CC BY 4.0, via the `all-the-cities` package. Rebuild with `npm run build:cities`.
- `public/data/land.json`: land dots on the whole globe from Natural Earth 50m (public domain), via `world-atlas`. Rebuild with `npm run build:land` (about 2 minutes).
- `tests/fixtures/reference.json`: output of `assets/shape_reference.py`, regenerated with `python3 scripts/export-reference-fixture.py`.

## Where things live

| Path | What |
|---|---|
| `src/data/questions.ts` | The questions. Edit wording freely; keep ids stable and only append new ones (they're in the QR payload) |
| `src/data/copy.ts` | All reveal and poster copy (tested: no scoring, no "wrong", no exclamation marks) |
| `src/lib/shape/` | Projection, merging, the loop, fitting (`geo.ts`, `polygon.ts`, `world.ts`) and the poster SVG (`poster.ts`) |
| `src/lib/swap/` | QR payload format (`codec.ts`) and the camera scanner |
| `src/lib/places/` | City search, aliases (Seville → Sevilla, Bali → Denpasar), paste parsing |
| `src/lib/reveal/` | Same place / same region / different |
| `src/screens/` | The flow: Home → Name → Questions → Also been → Review → Seal and swap → Reveal → Poster |

The poster look in `src/lib/shape/poster.ts` (`THEME` and the layout in `posterSvg`) is interim and is expected to be replaced by a design pass.
