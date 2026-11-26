# PRD: Our World — functional requirements (v2, date-night)

Owner: Ravi · Live app: https://ourworld.cloud9trt.workers.dev/

## How to use this document (for Claude Code)

This is an update to an app that already exists and is deployed. **Do not start over.** Keep the current stack, structure, hosting and code style.

1. Read the existing code first. For each requirement below, mark it as done, partly done, or missing.
2. Show that gap list before changing anything, then work through the gaps in the order of section 9.
3. Where the existing app does something differently but meets the intent of a requirement, keep it and say so.
4. Mock screens are in `docs/mocks/` (PNG) and `docs/boards/` (HTML source with exact sizes, colours and copy). They show intent, not pixel law. The mocks use stand-in fonts and made-up sample data, and their QR codes are dummies.

This document only describes what the product must do. It doesn't prescribe libraries or architecture.

## 1. The experience in one paragraph

A couple sits together for about ten minutes, each on their own phone. One partner starts a game and brings the other in by QR code. Each answers 12 short questions about places in their lives, in three acts: before they met, together, and where they want to go next. Answers are sealed. They swap by scanning each other's code, then go through a reveal together, one question at a time. It ends with a poster: each partner's world in silver, plus the bigger world they make together in pink. "Mine + yours = ours."

## 2. Rules that must hold everywhere

1. **Sealed means sealed.** Once a partner finishes, their answers lock. The other partner can only see them after scanning that partner's code.
2. **No dates are asked.** The shape never depends on order or time.
3. **No scoring.** No match percentage, no count of matches, no red and green, and no words like "wrong", "mismatch" or "disagree". Matches glow; differences are "two good memories".
4. **Nothing leaves the phones** unless a partner explicitly shares the poster. Analytics, if any, never include places or names.
5. **Every question can be skipped.** Places are the only thing collected.
6. **Alone in silver, together in colour.** Pink is only used for the combined world, never for one partner's own shape.

## 3. Onboarding

### F1. Landing
- Shows the poster forming as a short loop (two silver shapes sliding together into a pink one), the line "Answer 12 questions about the places in your lives, on your own phones. Then swap, and see the world you make together.", "About 10 minutes · No sign-up", and Start.
- A secondary link: "Have an invite? Scan your partner's code."
- Mock: `01-landing`.

### F2. Set-up
- Fields: your name and your partner's name (first names, 1 to 20 characters).
- "How long have you been together?" as one-tap chips: Under 1 year, 1–3 years, 3–7 years, 7–15 years, 15+. Optional; default 3–7.
- Helper line: "We use this to pick questions that are more likely to surprise you." The tier is never mentioned again.
- Mock: `02-names`.

### F3. Invite the partner
- The first phone shows a large QR code on a light card: "Ask Tara to scan this with her phone camera. You'll both get the same 12 questions."
- The code carries the game ID, both names, the tier and whatever is needed so both phones get the identical question set. It doesn't need a server: keep the data in the URL fragment (after `#`) so it isn't sent to one.
- "Send link instead" shares the same link through the phone's share sheet.
- A 4-letter code is shown in the mock. Keep it only if the app already has a backend that can look it up; otherwise hide it.
- Mock: `03-invite`.

### F4. Partner joins
- The second phone opens on "Ravi asked you on a date", three numbered rules (12 questions, about 5 minutes; on your own, no peeking; then swap codes), a name field already filled in, and "I'm in".
- Acceptance: the partner reaches their first question in three taps from scanning.
- Mock: `04-partner`.

## 4. The quiz

### F5. Question selection
- Pick 12 questions from the bank in section 7: 3 in Act 1, 6 in Act 2, 3 in Act 3. Both phones must get the same 12 in the same order.
- The tier changes which questions are picked (rules in section 7), so couples are more likely to learn something new about each other.
- After the 12, two optional list questions: "Any other places we've been together?" and "Every city we've lived in together". Both are skippable and accept a pasted list ("Goa, Langkawi, Vienna"), with each place confirmed by one tap.

### F6. Question screen
- One question per screen, in large italic serif.
- Type-ahead place search after 2 characters, showing city and country. Choosing a place moves on to the next question automatically after a short pause.
- "Already named" chips for this partner's earlier answers. A chip already used twice dims and says "Somewhere new?", but can still be tapped.
- At the top: act label ("Act 2 · Us") and three act dots. A small silver map of this partner's own places, with the newest one pulsing, and "5 places so far" below it. Never "5 of 12".
- At the bottom: "Tara is answering this one too." (always on about-partner questions) and "Skip, we'll draw without it".
- Progress is saved after every answer, and reopening the page resumes.
- Acceptance: median under 25 seconds per question in testing.
- Mock: `05-question`.

### F7. Chapter cards
- Between acts, a full-screen card: act number, act name ("Before us", "Us", "Next"), one line ("Three places you'd like to go. This is where your shape grows."), tap to continue. The silver map is shown large behind it.
- Mock: `06-chapter`.

### F8. Seal and answer code
- After the last question: "Seal my answers", with a confirmation.
- Sealed screen: "Sealed", "Ravi's world" with the silver shape and dream lines, "10 places · 2 dreams", the answer QR code, "Don't show Tara yet. When she's done, swap codes.", and a "Scan Tara's code" button.
- The answer code holds the game ID, which partner, and each answer (a place, a custom place, or skipped). It must fit in one scannable QR code; cap each list question at 20 places.
- Scanning happens inside the app, not with the phone's camera app, because the camera app may open a different browser that doesn't have the game saved.
- A code from another game shows "This code is from a different game."
- If the camera can't be used: "Send my answers" shares the answer link, and the scanner screen accepts a pasted link.
- One scan is enough to start the reveal on that phone. The second scan gives the other phone its own copy.
- Mock: `07-sealed`.

## 5. The reveal

### F9. Reveal flow
- Opens with "Ready? Hold one phone between you."
- Goes act by act, one question at a time. Each answer starts as a face-down card, and **the other partner taps to flip it** ("Ravi, tap to see Tara's").
- Cards show the name label, the place, the country and a small crop of the dot map with the place marked.
- Footer on every reveal screen: a small pink preview of the combined shape that gains a point with each revealed place and stays slightly blurred until the end. "Your shape: 9 places."
- Mocks: `08-reveal-different`, `09-reveal-same`.

### F10. The three outcomes (equal visual weight)
- **Same place:** the two cards slide together into one, with a soft pink ring pulse and a light vibration. "You both said Goa." and "It becomes a bright star in your shape."
- **Same region** (under 300 km apart, or the same small country): "Different cities, same coast" or "same corner of Spain".
- **Different places:** "Two good memories" (or a question-specific version such as "Two good views"), plus one connecting fact (F11).

### F11. Connecting facts
Worked out from coordinates and time zones only, never made-up text. Use the first rule that applies:
1. Same country and under 300 km: "Same country, 120 km apart."
2. Latitudes within 1 degree: "Both on the 37th parallel."
3. Nearly due east or west (bearing within 10 degrees): "Langkawi is almost due east of Goa."
4. Time difference of 2 hours or more: "When the sun sets in Vienna, it's 10:30 at night in Wayanad." (assume a 6 p.m. sunset)
5. Otherwise: "6,820 km apart. Halfway between: Muscat." (the nearest known city to the midpoint; leave out the halfway part if the midpoint is far from any city)

### F12. Act-specific reveals
- **Act 1 (before us)** isn't a comparison: "Ravi, before us: Chennai" and "Tara, before us: Kochi", one after the other.
- **About-partner questions** use a mirrored layout: "Tara says you were happiest in Vienna. You said Tara was happiest in Goa."
- **Act 3 (dreams):** a shared dream glows ("You both want Kyoto"); different dreams are "Two places to go next".
- **List questions:** places both listed are shown together; a place only one listed is shown as "A memory only Tara kept: Vienna", with one tap to add it to the shared list.

### F13. The final beat
- The screen dims for about a second, then "This is your world", then the poster animates in: the two silver shapes slide together and the pink shape draws edge by edge over about three seconds.

## 6. The poster and sharing

### F14. Poster layout (story, 1080 × 1920)
See `docs/mocks/10-poster.png`. Top to bottom:
1. "Seen from the North Pole" (small, monospaced), then "Ravi & Tara" in large italic serif with a pink ampersand.
2. Two small charts, "Ravi's world · 10 places" and "Tara's world · 10 places", in silver, with a "+" between them and a pink "=" below.
3. The large chart, "Our world": the combined polygon in neon pink over the faded world map. Places both named are four-point stars. Dreams are dotted lines and dashed rings reaching out from the nearest place.
4. "16 places · 8 countries · 3 continents · 3 dreams".
5. "Do yours together tonight" and the link.

All three charts use the same scale and centre, so each partner's shape is visibly smaller than the combined one. The poster shows no place names by default.

### F15. Formats and sharing
- Story (1080 × 1920) and feed (1080 × 1350, the combined chart only).
- Share through the phone's share sheet as an image; fall back to download. Each phone can save its own copy.
- Option to hide the names.
- Acceptance: image ready in under 2 seconds on a mid-range phone.

### F16. Share landing
- The link on the poster opens a page with a sample poster, "A 10-minute date for two phones", and Start. A couple's own data is never on this page.

### F17. Resume and replay
- Each phone keeps the finished game so the poster can be reopened. "Play again" starts a new game, and "Clear this game" deletes it.

## 7. Question bank

Each question is one superlative and produces one place. Act 1 and Act 3 make the two partners' worlds different; Act 2 finds what they share.

**Act 1 · Before us** (pick 3)
- The place you grew up *(under 7 years)*
- A place from your childhood I've never been to *(7+ years)*
- A place from before we met that still means something to you
- The best trip you took without me
- The first city you lived in on your own
- A place you'd take me to show me who you were before us *(7+ years)*

**Act 2 · Us** (pick 6, always including the two marked ★)
- ★ Where you saw me happiest *(about partner)*
- ★ The place you'd go back to tomorrow
- The best meal we've had together
- The best view or sunset we've seen
- Where something went hilariously wrong
- Where we laughed the hardest
- Where we walked until our feet hurt
- The best city we've lived in together *(not for under 1 year)*
- The place that felt most like us
- Where we were most relaxed
- Where I surprised you *(about partner, 3+ years)*
- Our first trip together *(under 3 years)*

**Act 3 · Next** (pick 3)
- Where you want to take me next
- A place you've always wanted to go but never mentioned
- Where you picture us in 20 years *(3+ years)*
- Where you'd want to spend our next anniversary
- A place you want us to live one day

**Tier rules:** under 3 years, prefer questions that collect new places (Act 1 and Act 3). 7+ years, use the "never been to" Act 1 variants and more about-partner questions.

**Answer rules:** city-level results first; a country typed alone suggests its best-known cities; "Can't think of one" counts as a skip.

## 8. The shape

- Map: north-polar view (r = (90 − latitude) / 90, angle = longitude − 43°, x = r·sin(angle), y = −r·cos(angle)).
- Merge places within about 50 km into one point.
- Join the points into one closed loop in the order they sit around the pole, with great-circle edges.
- Fewer than 3 places: show dots or a line.
- Southern-hemisphere places still appear, outside the land map, which only covers the north. Test with Cape Town and Sydney.
- `assets/shape_reference.py` is a working reference, and `assets/world-land-dots.json` has the land dots already in chart coordinates. Use them only if the app doesn't already have equivalents.

**Look:** background #05050A with a soft magenta glow; neon pink #FF2E7E for together; silver #CFCFD8 for each partner alone; cream #F4F0E8 for text and the faded land dots. Instrument Serif italic for names and questions, Space Mono for small labels, Inter for body text. Copy tone: warm, plain and short, with no exclamation marks.

## 9. Priority order for the gaps

1. F8 seal and in-app scan, and rule 1 (sealing)
2. F5 to F7 question bank, tiers and question screen
3. F9 to F13 reveal
4. F14 and F15 poster and sharing
5. F1 to F4 onboarding polish
6. F16 and F17

## 10. Not in this version

Accounts and email, cloud saves, photos, adding places later, anniversary emails, a long-distance mode, printed posters, a video export of the merge animation, and named shape types. The last two are the likely next additions.

## 11. Open questions

- Keep the 4-letter join code (needs a lookup), or QR and link only?
- Final question wording, after testing with about 10 couples in person.
