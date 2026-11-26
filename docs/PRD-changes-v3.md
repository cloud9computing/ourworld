# Our World: requirement changes (v3)

These changes update the existing PRD (F1–F17) and the earlier poster revision. Where they conflict, this document wins. The interactive globe (F18) is out of scope for the MVP and will be revisited later.

## Why these changes

Two people coming together means their worlds coming together. The best moment is realising how much more there is to explore in the other person's world: their past, and where they dream of going. The reveal has two hero moments: **finding the same place** (you remember it the same way) and **discovering something new** about the other (a place from their world you haven't shared yet). Size and stats come second.

## Summary of changes

| Area | Before | Now |
|---|---|---|
| Questions | One bank, 3 · 6 · 3, tiers as a light tweak | Six tenure tiers (including "Just met"), each with a fixed set of 12; 4 · 4 · 4, or 5 · 3 · 4 for "Just met" |
| Stories | — | The reveal prompts each partner to ask the other a specific question about their answer, so stories happen out loud on the date |
| Reveal of Act 1 | Shown one after the other | Partner answers "We've been together" or "Not yet" |
| Hero reveal moments | A match | Two: a match (unchanged, full celebration) and a new discovery ("New to Tara") |
| New concept | — | "Places to explore": the other's past places you haven't been to together, plus dreams |
| Poster hero | % of planet, then % of the way around the world | Number of places still to explore in each other's worlds |
| Dream line | Dream that adds the most distance | The next place to explore, named with whose world it comes from |

## R1. Tenure tiers and question sets (replaces F2's chips, F5, and the bank in section 7)

The full question sets, prompts and rules are in **`question-sets-by-tenure.md`**. That file is the source of truth for questions; this section summarises what changes.

- **New tenure chips:** Just met · Under a year · 1–3 years · 3–7 years · 7–15 years · 15+ years. The chip is now **required** (one tap), because "Just met" changes the structure of the game. Helper copy is unchanged.
- **Fixed sets:** each tier has its own fixed set of 12 questions in a fixed order, no longer picked from a shared bank. Both phones get the same set, from the tier carried in the invite code.
- **Structure:**
  - Every tier except "Just met": 4 Before us · 4 Us · 4 Next. In "Under a year", Act 2 is called "Us so far".
  - "Just met": 5 Your world · 3 First impressions · 4 Maybe someday.
- **No plain facts after "Just met":** from "Under a year" on, every question is a superlative, an opinion, a memory or a view of the partner.
- **Each question has an ask-your-partner prompt** for its reveal card (R2).
- **"Just met" special rules:**
  - The two guess questions are linked to the partner's own answers and revealed side by side ("Kabir guessed Mumbai. Aanya grew up in Jaipur.").
  - There is no "Been there together?" step: every place from the other's world goes into the explore list unless both named it.
  - The optional list questions become "Any other places you love?" (each partner separately), and "Every city we've lived in together" is skipped.
- **The eight checks** at the end of the question file must pass for every set, and should be re-run whenever a question changes.
- **Acceptance:**
  - Median time for the whole quiz stays under 6 minutes in testing.
  - The same tier and game always produce the same 12 questions on both phones.

## R2. Ask-your-partner prompts (new; changes F9)

The quiz stays places only, with no extra typing. Stories happen out loud during the reveal.

- **Where prompts appear:** on the reveal card of every question. Each card shows one prompt under the place, addressed to the partner who didn't give the answer: "Ask Ravi: what did a perfect Sunday there look like?"
- **Prompt wording:**
  - Each question has 2–3 prompts written for it. The app rotates between them so a replay doesn't repeat.
  - Prompts are specific and easy to answer out loud, never "Why?" on its own.
  - The first prompt for every question is in `question-sets-by-tenure.md`. Examples:
    - Where you were happiest as a kid: "Ask Ravi: what did a perfect day there look like?"
    - Where you saw me happiest: "Ask Tara: what did you notice that day?"
    - A place you'd go back to just for the food: "Ask Ravi: what's the one dish?"
    - A place you've always wanted to go but never mentioned: "Ask Tara: what stopped you from mentioning it?"
- **Pacing:**
  - The reveal never moves on by itself and has no timer.
  - Under the prompt, a quiet line reads "Take your time. Tap when you're ready."
  - The next card waits for a tap.
- **Nothing is recorded:** prompts are not answered in the app, and nothing new is added to the answer code.
- **Copy review:** prompts are warm and curious. They never ask about past partners and never feel like a test of what the other person knows.

## R3. Reveal changes (changes F9, F10, F12)

**Act 1: "Been there together?"** (all tiers except "Just met", see R1)
- Each partner's Act 1 place is revealed on its own: "Ravi, before us: Chennai", with its ask-your-partner prompt (R2).
- The other partner then taps one of two buttons: **"We've been together"** or **"Not yet"**.
- "Not yet" triggers the **discovery moment**: the card glows, a soft pulse and light vibration, and the copy "New to Tara: Chennai. Added to your places to explore." It is a hero moment, with its own look (a glow that travels into the explore list), distinct from a match.
- "We've been together" shows a warm note ("A place you already share") and moves on.
- If the other partner also named the same place anywhere in their own answers, skip the question and treat it as shared.

**Matches: the hero celebration (unchanged from F10), in every act.** When both partners give the same place:
- the two cards slide together into one, with a pink ring pulse and a vibration
- the copy reads "You both said Goa", with a line such as "It becomes a bright star in your shape"
- the place becomes a bright star on the footer shape and on the poster
- the ask-your-partner prompt still appears, so they can compare how each remembers it

It is never shortened or toned down, and there is still no count or score of matches anywhere.

**Act 2: unchanged.** "Where you saw me happiest" keeps its mirrored layout.

**Act 3: dreams**
- A dream both partners named: "You both want Kyoto" (glows, added to the explore list once).
- Different dreams: "Two places to go next", each with its ask-your-partner prompt. Both are added to the explore list.

**New final reveal card, before the poster's final beat:** "And there's more." It counts up to the number of places to explore and shows the first three with their origin ("Chennai · where Ravi was happiest as a kid"). Then the screen dims and the poster appears as before.

## R4. Places to explore (new)

- **What goes in:**
  - every Act 1 place the other partner marked "Not yet"
  - every Act 3 dream
- **Rules:**
  - Duplicates merge.
  - A place either partner named as already visited together is excluded.
- **Each entry shows:**
  - the place and country
  - where it came from, in plain words based on the question that produced it: "where Ravi was happiest as a kid", "the food Tara would go back for", "on Ravi's wishlist", "you both dream of it". Each question in the question file needs a short origin phrase for this.
- **Where it lives:** it can be opened from the poster screen ("Your places to explore"), and it is kept on both phones with the finished game (F17).
- **Marking a place visited:** a place can be ticked off as "We went". This removes it from the count and adds it to the couple's visited places.
- **Order:**
  1. Dreams both partners named.
  2. Places from a partner's past that the other partner marked "Not yet".
  3. Other dreams.

  Ties keep question order.

## R5. Poster (replaces the earlier poster revision's hero block and dream line)

**Keep from the earlier revision:**
- No "Seen from the North Pole".
- No "Mine + yours = ours".
- No "=".
- Two small silver charts labelled "Ravi's world" and "Tara's world", with no counts.
- The large pink chart with one labelled shared star.

**New hero block, centred under the large chart:**
1. "Ravi & Tara's world" in italic serif.
2. The number of places to explore in very large pink type, for example **14**.
3. Below it, "places still to explore in each other's worlds".
4. Supporting line: "16 places · 8 countries · 63% of the way around the world". The percentage uses the around-the-world rule: (360° − the largest east–west gap between visited places) ÷ 360.
5. Dream line: "Next: [first place in the explore list], [origin]", for example "Next: Chennai, where Ravi was happiest as a kid" or "Next: Kyoto, where you both want to go".
6. Footer unchanged: "How big is yours?" and the link.

**Edge cases:**
- Zero places to explore: the hero shows the around-the-world percentage, with "You've explored each other's worlds. Time for new ones." The dream line is left out.
- Fewer than 3 visited places: the supporting line shows "Just getting started" in place of the percentage.

**Privacy:**
- The "hide place names" option removes the star label and changes the dream line to "Next: somewhere new".

**Remove:**
- "% of the planet"
- "Twice the size of either world alone"
- The "[dream] would take you to [n]%" line

## R6. Acceptance tests to add

- **Question sets:** each tier produces its fixed set, identical on both phones for the same game; "Just met" guess questions reveal next to the linked answers.
- **Prompts:** every question has at least two prompts before launch; the reveal never advances without a tap.
- **Explore list:**
  - excludes places marked "We've been together"
  - merges duplicates
  - orders entries correctly
  - updates the count when a place is ticked off
- **Poster:**
  - shows the correct count and dream-line origin wording for each origin type
  - handles zero places to explore
  - handles fewer than 3 visited places
  - handles "hide place names"
- **Copy review:** no reveal or poster text compares the two partners' counts or implies either has a smaller world.
- **Matches:** a same-place answer in any act plays the full match celebration and becomes a star on the poster.

## Out of scope for this version

- The interactive globe (F18)
- Photos
- Accounts and cloud saves
- Video export
