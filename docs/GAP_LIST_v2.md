# Gap list: PRD v2 against the app as built (2026-11-26)

Status of each requirement in `docs/PRD-v2.md` before the v2 work. **Done** = meets it as is, **Partly** = some of it exists, **Missing** = not built.

## Rules (section 2)

| Rule | Status | Notes |
|---|---|---|
| 1. Sealed means sealed | Done | Answers lock on seal. Partner answers are only accepted after your own seal, and only by scanning. A code opened on an unsealed phone is thrown away. Keep |
| 2. No dates | Done | Keep |
| 3. No scoring | Done | Copy is tested for banned words. New copy goes through the same test |
| 4. Nothing leaves the phones | Done | No backend, no analytics. Answers travel after `#` in a link |
| 5. Every question can be skipped | Done | "Skip" and "Can't remember" on every question |
| 6. Alone in silver, together in colour | Missing | Each partner is amber or blue today, so this needs a palette change |

## Onboarding

| Req | Status | Notes |
|---|---|---|
| F1 Landing | Partly | Static intro and Start. Missing: the silver-to-pink loop, "Have an invite? Scan your partner's code." |
| F2 Set-up | Partly | Own first name and an 18+ check only. Missing: partner's name, "How long have you been together?" chips |
| F3 Invite | Missing | Today both people open the homepage separately. No game ID, so the phones don't share a question set |
| F4 Partner joins | Missing | |

## Quiz

| Req | Status | Notes |
|---|---|---|
| F5 Question selection | Missing | Fixed list of 12 questions about each person's own life, plus one optional "every other city" list. No acts, tiers or shared selection |
| F6 Question screen | Partly | Has: one question per screen, search from 2 characters with city and country, "already named" chips, a nudge on the third use of a city, "N places so far", saved after every answer, resume. Missing: act label and dots, silver mini map with the newest place pulsing, auto-advance, the partner line, chips that dim with "Somewhere new?" (today it's a confirm step) |
| F7 Chapter cards | Missing | |
| F8 Seal and answer code | Partly | Has: seal with confirmation, answer QR, in-app scanner (BarcodeDetector or jsQR), payload with checksum, one scan opens the reveal. Missing: game ID check ("This code is from a different game."), sealed screen with silver world and counts, "Send my answers" and pasting a link, list cap of 20 (60 today), custom places |

## Reveal

| Req | Status | Notes |
|---|---|---|
| F9 Reveal flow | Partly | One question at a time with both answers. Missing: "Ready? Hold one phone between you.", face-down cards the other partner flips, map crops on cards, pink shape preview in the footer |
| F10 Three outcomes | Partly | Same / same region / different exist with equal weight. Missing: the "same small country" region rule, slide-together and pulse, vibration, question-specific "Two good views" |
| F11 Connecting facts | Missing | Needs time zones per city (not in the current city data) |
| F12 Act-specific reveals | Partly | Dream and list reveals exist. Missing: Act 1 "before us" lines, mirrored about-partner layout, "A memory only Tara kept" wording |
| F13 Final beat | Partly | "Our world" draws itself over 3 seconds. Missing: dim, "This is your world", silver shapes sliding together |

## Poster and sharing

| Req | Status | Notes |
|---|---|---|
| F14 Poster layout | Partly | One chart with three overlaid outlines today. Needs the "mine + yours = ours" layout: two small silver charts and one large pink chart at the same scale and centre, stars for shared places, dream lines, continents count, "Do yours together tonight" |
| F15 Formats and sharing | Mostly done | Story and feed, share sheet with PNG, download fallback, hide names. Change: feed shows the combined chart only |
| F16 Share landing | Partly | Poster link goes to the homepage. Plan: make the homepage the share landing (sample poster loop and Start), which meets the intent without a separate page |
| F17 Resume and replay | Partly | Resume works and the finished game stays until "We're done". Missing: reopening the poster, "Play again", "Clear this game" |

## The shape (section 8)

| Item | Status | Notes |
|---|---|---|
| North-polar map | Different | The app uses a circular map centred between two homes (an earlier decision). v2 asks for the polar view again, and the polar maths is already in the code and tested, so switch back |
| Merge within 50 km, loop around the pole, dots or a line under 3 places | Done | Shared code, tested against `assets/shape_reference.py` |
| Southern places | Better than asked | Our land dots cover the whole globe (Natural Earth), so Cape Town and Sydney sit over land, not empty sky. Keep |
| Look (colours, fonts) | Partly | Fonts match. Colours change to silver #CFCFD8, pink #FF2E7E, cream #F4F0E8, background #05050A |

## Reused as is

Stack (Vite + React + TypeScript on Cloudflare), city search and aliases, QR scanner, varint and checksum payload code, poster SVG → PNG export, share sheet, shape maths, unit tests and the two-phone end-to-end script.

## Decisions taken while implementing

- **Pronouns:** the mocks say "Ask her to scan this with her phone camera", "She's in" and "When she's done". The app writes these without guessing a pronoun from a name: "Have Tara scan this with a phone camera", "Tara's in. Start", "When Tara is done, swap codes."
- **Questions that say "me"** ("Where you saw me happiest") are shown with the partner's name, because each phone shows them to its own person: "Where you saw Tara happiest".
- **About-partner reveal** uses names rather than "you", because both people are looking at one phone: "Tara says Ravi was happiest in Vienna. Ravi says Tara was happiest in Goa."
- **4-letter code:** hidden. There's no backend to look it up (PRD F3).
- **Places only one partner listed** are already in "our world", because the shared list is the union of both (the original PRD says so). The reveal says so instead of offering a tap that would change nothing.

## After the v2 work

Everything above is implemented, except:

- **Custom places** (F8 mentions "a custom place"): not built. Instead, the city data now includes well-known places that aren't cities (Goa, Bali, Langkawi, Santorini, Wayanad, Darjeeling, Hallstatt and others), and search understands common English and older names.
- **4-letter join code:** hidden, as the PRD allows, since there's no backend to look it up.
- **Share landing (F16):** the poster's link opens the landing page, which already shows the sample shape forming and Start. A couple's own data is never on it.
- **"A memory only Tara kept":** shown, but without an "add" tap, because the place is already in the combined shape (the shared list is the union of both).
- **Not tested on real phones yet:** camera scanning on iPhone, vibration, the share sheet, and how fast the poster PNG is made on a mid-range phone (about 0.2 to 0.4 seconds in desktop Chromium).
