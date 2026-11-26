# Speclet: copy and poster updates (v4)

Builds on `PRD-changes-v3.md` and `question-sets-by-tenure.md`. Where this conflicts with them, this speclet wins. Scope: product copy that changes with the new framing ("places still to explore in each other's worlds"), and the poster. Nothing else changes.

## 1. Copy changes by screen

Only the lines listed change. Everything else on each screen stays as it is.

### Landing

| Element | Old | New |
|---|---|---|
| Eyebrow | A date for two phones | A game for two · 10 minutes |
| Headline | Find your shape | How much of their world have you seen? |
| Body | Answer 12 questions about the places in your lives, on your own phones. Then swap, and see the world you make together. | Twelve questions about the places that made you, and the ones you dream of. Answer in secret on your own phones, then swap and discover what's waiting in each other's worlds. |
| Small line under body | About 10 minutes · No sign-up | No sign-up · Nothing leaves your phones |
| Primary button | Start | Find out together |
| Secondary link | Have an invite? Scan your partner's code. | Got a code from your partner? Scan it. |
| Footer | *(unchanged)* | *(unchanged)* |

The eyebrow already says "10 minutes", so the small line under the body now carries the privacy promise.

### Link preview (page title and social card)

- **Title:** How much of their world have you seen?
- **Description:** A 10-minute game for two. Answer on your own phones, swap codes, and discover what's waiting in each other's worlds.

### Partner joins

| Element | Old | New |
|---|---|---|
| Rule 3 detail | Scan each other's codes to see the world you make together. | Swap codes and discover what's waiting in each other's worlds. |

### Share landing (where the poster's link leads)

| Element | Old | New |
|---|---|---|
| Headline | A 10-minute date for two phones | How much of their world have you seen? |
| Supporting line | *(none)* | A 10-minute game for two. No sign-up. |
| Button | Start | Find out together |

### Poster footer

| Old | New |
|---|---|
| How big is yours? | What's waiting in yours? |

### Copy rules for every screen

- No "shape" as the main promise in headlines or buttons. It can still be used to describe the drawing.
- No "how big" anywhere.
- No comparison between the two partners, and no scoring.

## 2. Poster changes (replaces R5's layout in v3 where they differ)

### 2.1 Show the places still to explore

The hero number must be visible on the chart, not only in the text.

- **Large chart:**
  - Each place in the explore list is drawn as a **hollow pink ring** that pulses gently on screen (static in the exported image).
  - Each ring is joined to the nearest place in the solid shape by a faint dotted pink line.
  - Draw a **ghost outline**: a dashed pink line, about 40% opacity, with no fill and no glow, tracing the shape the couple would have with every explore-list place added (same joining rule as the main shape). It is drawn under the solid shape.
- **Small charts:**
  - On "Ravi's world", Ravi's places that are in the explore list (Tara hasn't been) get a small pink ring around the silver dot. The same applies on "Tara's world".
  - Dreams are not shown on the small charts.
- **Check:** the number of hollow rings on the large chart equals the hero number.

### 2.2 Text hierarchy

From the large chart down:

1. "Ravi & Tara" in italic serif, with a pink ampersand. Not "Ravi & Tara's world".
2. The hero number, in very large pink italic serif.
3. "places still to explore in each other's worlds", in small spaced monospace.
4. Stats line: "18 places together · 13 countries". Remove the "% of the way around the world".
5. Dream line, unchanged: "Next: Reykjavík, where you both want to go".
6. Footer: "What's waiting in yours?" with the link.

The labels "Ravi's world" and "Tara's world" under the small charts and the "+" between them stay.

### 2.3 Labels

- The single labelled star rule is unchanged: a place both partners named, or none.
- Explore-list rings are not labelled, except the place named in the dream line, which gets a small label next to its ring.

### 2.4 Edge cases

- **Nothing left to explore:**
  - The hero becomes "Every place, explored together", with the count of places together as the number.
  - There are no rings and no ghost outline, and the dream line is left out.
- **More than 20 places to explore:** draw all of them, but give the rings a fainter pulse and thinner lines so the chart stays readable.
- **Explore-list place outside the chart:** if a place falls outside the frame (far south), place its ring on the frame edge in its direction.
- **Hide place names option:** it also removes the dream-line label on the chart.

### 2.5 Feed format (1080 × 1350)

Same as the story poster without the two small charts. The large chart keeps its rings and ghost outline.

## 3. Acceptance

- The landing, link preview, partner joins, share landing and poster footer show the new copy exactly as written above.
- No screen contains "How big is", "Find your shape" or "A date for two phones".
- The large chart shows one hollow ring per place in the explore list, plus a ghost outline when the list is not empty.
- The small charts ring exactly the places from that partner's world that are in the explore list.
- The edge cases in 2.4 are covered by tests: an empty explore list, more than 20 places, a far-south place, and names hidden.
