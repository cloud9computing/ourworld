// Question sets by how long a couple has been together (docs/question-sets-by-tenure.md, PRD changes v3 R1, R2).
// Each tier has a fixed set of 12 questions in a fixed order. Ids are stable and travel in the invite code:
// never reuse or renumber one. Wording, prompts and origins are data: edit freely.
//
// In `text`, {p} becomes the partner's first name on each phone ("Where you saw Tara happiest").
// `shared` is the wording for the reveal, when both read one phone. `origin` explains, in the places-to-explore
// list and on the poster, where a place came from: {a} is the person who named it, {p} the other.

export type Tier = 0 | 1 | 2 | 3 | 4 | 5;
export const TIERS: { label: string }[] = [
  { label: 'Just met' }, { label: 'Under a year' }, { label: '1–3 years' }, { label: '3–7 years' }, { label: '7–15 years' }, { label: '15+ years' },
];
export const JUST_MET: Tier = 0;

export type Act = 1 | 2 | 3;

/**
 * What a question's answer is:
 * past   a place from the answerer's life before us: in their world; Act 1 "Been there together?"
 * us     a place the couple has been together: in both worlds' sense of "already shared"
 * mine   a place in the answerer's world, not necessarily shared (Just met)
 * guess  a guess about the partner (Just met): not a place in anyone's world
 * dream  somewhere to go: a dream line on the map, and a place to explore
 * show   a place from the answerer's past they want to show the partner: in their world, and a place to explore
 * backTo a shared place to go back to: already shared, and a place to explore ("somewhere to go back to")
 */
export type Kind = 'past' | 'us' | 'mine' | 'guess' | 'dream' | 'show' | 'backTo';

export type BankQuestion = {
  id: number;
  tier: Tier;
  act: Act;
  kind: Kind;
  text: string;
  shared?: string;
  /** Ask-your-partner prompts (R2): Prompt 1 on a couple's first game, Prompt 2 on a replay. Each reads after "Ask Ravi: ". */
  prompts: [string, string];
  origin: string;
  /** Used in "Two good …" when two different places come up. */
  noun: string;
  /** About the partner: revealed mirrored. "<answerer> … <subject> … <place>." */
  about?: (answerer: string, subject: string, place: string) => string;
  /** Just met guess questions: the id of the question whose partner answer is the truth, and how to say it. */
  guessOf?: number;
  truth?: (owner: string, place: string) => string;
};

type Row = [act: Act, kind: Kind, text: string, origin: string, noun: string, extra?: Partial<BankQuestion>];

const happiestAbout = (who: string, subject: string, place: string) => `${who} says ${subject} was happiest in ${place}.`;
const surprisedAbout = (who: string, subject: string, place: string) => `${who} remembers a surprise from ${subject} in ${place}.`;
const fellAbout = (who: string, subject: string, place: string) => `${who} fell for ${subject} all over again in ${place}.`;

const FOOD: Row = [1, 'past', 'A place you’d go back to just for the food', 'the food {a} would go back for', 'meals'];
const HOME_NOT_HOME: Row = [1, 'past', 'A place that feels like home but isn’t home', '{a}’s home away from home', 'second homes', { shared: 'A place that feels like home but isn’t home' }];
const SAW_HAPPIEST: Row = [2, 'us', 'Where you saw {p} happiest', 'where {a} saw {p} happiest', 'happy places', { shared: 'Where you saw each other happiest', about: happiestAbout }];
const BACK_TOMORROW: Row = [2, 'us', 'The place you’d go back to tomorrow', 'where {a} would go back tomorrow', 'places to go back to'];
const TAKE_NEXT: Row = [3, 'dream', 'Where you want to take {p} next', 'where {a} wants to take {p} next', 'next trips', { shared: 'Where you want to take each other next' }];
const NEVER_MENTIONED: Row = [3, 'dream', 'A place you’ve always wanted to go but never mentioned', 'on {a}’s secret wishlist', 'secret wishes'];
const SHOW_PAST: Row = [3, 'show', 'A place from your past you want to show {p}', 'the place {a} wants to show {p}', 'places to show each other', { shared: 'A place from your past to show each other' }];
const LAUGHED: Row = [2, 'us', 'Where we laughed hardest on a trip', 'where you laughed hardest', 'laughs'];
const NEXT_ADVENTURE: Row = [3, 'dream', 'Our next adventure, just the two of us', '{a}’s idea for your next adventure', 'adventures'];
const MONTH_A_YEAR: Row = [3, 'dream', 'Where you’d love us to spend a month every year when we’re older', 'where {a} pictures a month every year', 'months away'];
const FELL_AGAIN: Row = [2, 'us', 'Where you fell for {p} all over again', 'where {a} fell for {p} all over again', 'moments', { shared: 'Where you fell for each other all over again', about: fellAbout }];

const SETS: Record<Tier, Row[]> = {
  0: [ // Just met: Your world · First impressions · Maybe someday (5 · 3 · 4)
    [1, 'past', 'The place you grew up', 'where {a} grew up', 'hometowns'],
    [1, 'past', 'The place you feel most like yourself', 'where {a} feels most at ease', 'places'],
    [1, 'past', 'The best trip you’ve ever taken', '{a}’s best trip ever', 'trips'],
    [1, 'past', 'A place that completely surprised you', 'the place that surprised {a}', 'surprises'],
    [1, 'past', 'Where you’d go for a weekend on your own', '{a}’s weekend spot', 'weekends'],
    [2, 'guess', 'Guess: where did {p} grow up?', '', 'guesses', { shared: 'Guess: where did the other grow up?', guessOf: 1, truth: (o, p) => `${o} grew up in ${p}.` }],
    [2, 'guess', 'Guess: which city feels most like {p}?', '', 'guesses', { shared: 'Guess: which city feels most like the other?', guessOf: 2, truth: (o, p) => `${o}’s own answer: ${p}.` }],
    [2, 'mine', 'Where you’d take {p} on a perfect date', 'where {a} would take {p} on a perfect date', 'dates', { shared: 'Where you’d take each other on a perfect date' }],
    [3, 'dream', 'A place you’ve always wanted to go', 'on {a}’s wishlist', 'wishes'],
    [3, 'show', 'A place you’d love to show {p} someday', 'the place {a} wants to show {p}', 'places to show each other', { shared: 'A place you’d love to show each other someday' }],
    [3, 'dream', 'A city you’d live in for a year if you could', 'where {a} would live for a year', 'years away'],
    [3, 'dream', 'A place you’d go tomorrow if you could', 'where {a} would go tomorrow', 'escapes'],
  ],
  1: [ // Under a year: Before us · Us so far · Next
    [1, 'past', 'Where you were happiest as a kid', 'where {a} was happiest as a kid', 'childhoods'],
    [1, 'past', 'A place your family always tells stories about', 'where {a}’s family stories come from', 'family stories'],
    [1, 'past', 'The best trip you took before we met', '{a}’s best trip before you met', 'trips'],
    [1, 'past', 'The place you feel most like yourself', 'where {a} feels most at ease', 'places'],
    [2, 'us', 'The trip of ours you’d relive first', 'the trip {a} would relive first', 'trips'],
    [2, 'us', 'Where you knew this was something', 'where {a} knew', 'moments'],
    SAW_HAPPIEST,
    BACK_TOMORROW,
    TAKE_NEXT,
    [3, 'dream', 'A place you’ve always wanted to go but never mentioned', 'on {a}’s secret wishlist', 'secret wishes'],
    SHOW_PAST,
    [3, 'dream', 'If we could move anywhere for a year', 'where {a} would move for a year', 'years away'],
  ],
  2: [ // 1–3 years
    [1, 'past', 'Where you were happiest as a kid', 'where {a} was happiest as a kid', 'childhoods'],
    [1, 'past', 'The best trip you took without {p}', '{a}’s best trip without {p}', 'trips', { shared: 'The best trip you took without each other' }],
    FOOD,
    HOME_NOT_HOME,
    [2, 'us', 'Where something went hilariously wrong', 'where something went hilariously wrong', 'stories'],
    SAW_HAPPIEST,
    [2, 'us', 'The best meal we’ve had on a trip', 'your best meal on a trip', 'meals'],
    BACK_TOMORROW,
    TAKE_NEXT,
    NEVER_MENTIONED,
    SHOW_PAST,
    [3, 'dream', 'A city you could see us living in for a year', 'where {a} could see you living for a year', 'years away'],
  ],
  3: [ // 3–7 years
    FOOD,
    [1, 'past', 'A place from your childhood {p} has never been to', '{a}’s childhood place {p} hasn’t seen', 'childhoods', { shared: 'A childhood place the other has never been to' }],
    [1, 'past', 'The best trip you took without {p}', '{a}’s best trip without {p}', 'trips', { shared: 'The best trip you took without each other' }],
    [1, 'past', 'A place you wish {p} had seen with you', 'where {a} wishes you’d been together', 'places', { shared: 'A place you wish the other had seen with you' }],
    LAUGHED,
    SAW_HAPPIEST,
    [2, 'us', 'Where {p} surprised you', 'where {p} surprised {a}', 'surprises', { shared: 'Where you surprised each other', about: surprisedAbout }],
    BACK_TOMORROW,
    [3, 'dream', 'Where you’d want to spend our next anniversary', 'where {a} wants to spend your next anniversary', 'anniversaries'],
    NEVER_MENTIONED,
    SHOW_PAST,
    [3, 'dream', 'Where you’d love us to spend a whole summer someday', 'where {a} pictures a summer together', 'summers'],
  ],
  4: [ // 7–15 years
    [1, 'past', 'The childhood holiday you’d relive', '{a}’s favourite childhood holiday', 'holidays'],
    [1, 'past', 'Where you’d take {p} to meet the person you were at 22', 'where {a} was at 22', 'past lives', { shared: 'Where you’d go to meet the person you were at 22' }],
    FOOD,
    HOME_NOT_HOME,
    LAUGHED,
    SAW_HAPPIEST,
    FELL_AGAIN,
    [2, 'us', 'The trip that changed us', 'the trip that changed you', 'turning points'],
    NEXT_ADVENTURE,
    [3, 'dream', 'A trip that’s been waiting for the right time', 'the trip {a} has been saving', 'trips'],
    SHOW_PAST,
    MONTH_A_YEAR,
  ],
  5: [ // 15+ years
    [1, 'past', 'The childhood trip you’d relive', '{a}’s favourite childhood trip', 'trips'],
    [1, 'past', 'Where you’d take {p} to meet the young you', 'where to meet the young {a}', 'past lives', { shared: 'Where you’d go to meet the young you' }],
    FOOD,
    HOME_NOT_HOME,
    [2, 'us', 'Where we were happiest with very little', 'where you were happiest with very little', 'early days'],
    SAW_HAPPIEST,
    FELL_AGAIN,
    [2, 'backTo', 'A place from our early days we should go back to', 'somewhere to go back to', 'places to go back to'],
    NEXT_ADVENTURE,
    [3, 'dream', 'A place still on your list since you were young', 'on {a}’s list for years', 'old dreams'],
    SHOW_PAST,
    MONTH_A_YEAR,
  ],
};

// Ask-your-partner prompts, Prompt 1 and Prompt 2 for each question in each tier's order,
// exactly as in docs/question-sets-by-tenure.md (tests/bank.test.ts checks they match).
const PROMPTS: Record<Tier, [string, string][]> = {
  0: [ // Just met
    ['What’s one thing every visitor gets wrong about it?', 'Where would you take me first if we went?'],
    ['What do you do in your first hour there?', 'What does it feel like the moment you arrive?'],
    ['What’s the story you always tell about it?', 'What would you do differently if you went again?'],
    ['What did you expect, and what was it really like?', 'Would you go back?'],
    ['What does the perfect day there look like?', 'What would you leave behind?'],
    ['What made you guess that?', 'What do you imagine I was like as a kid?'],
    ['What gave it away?', 'Which city do you think I’d pick for you?'],
    ['What would we do there?', 'What time of day would it be?'],
    ['When did you first want to go?', 'What’s the first thing you’d do there?'],
    ['What would we do first?', 'What would you want me to notice?'],
    ['What would a Tuesday there look like?', 'What would you miss from home?'],
    ['What would you pack first?', 'How would you spend the first evening?'],
  ],
  1: [ // Under a year
    ['What did a perfect day there look like?', 'Who made it so happy?'],
    ['Which story do they tell most?', 'Which story do you tell?'],
    ['What’s the story you always tell about it?', 'What would you do differently if you went again?'],
    ['What do you do in your first hour there?', 'What does it feel like the moment you arrive?'],
    ['Which moment would you go back to?', 'What would you keep exactly the same?'],
    ['What happened that made you sure?', 'Did you tell anyone that day?'],
    ['What did you notice that day?', 'Did you tell me at the time?'],
    ['What would you do differently this time?', 'What’s the first thing you’d do there?'],
    ['What’s the first thing we’d do there?', 'When should we go?'],
    ['When did you first want to go?', 'What’s the first thing you’d do there?'],
    ['What do you want me to see there?', 'Where would we eat?'],
    ['What would our weekends look like?', 'What would you miss most from here?'],
  ],
  2: [ // 1–3 years
    ['What did a perfect day there look like?', 'Who made it so happy?'],
    ['What’s the story you always tell about it?', 'What would you do differently if you went again?'],
    ['What’s the one dish?', 'Where exactly would you take me to eat it?'],
    ['What makes it feel that way?', 'When were you last there?'],
    ['Tell it from your side.', 'Who laughed first?'],
    ['What did you notice that day?', 'Did you tell me at the time?'],
    ['Do you both remember it the same way?', 'What would you order if we went back?'],
    ['What would you do differently this time?', 'What’s the first thing you’d do there?'],
    ['What’s the first thing we’d do there?', 'When should we go?'],
    ['What stopped you from mentioning it?', 'What’s the first thing you’d do there?'],
    ['What do you want me to see there?', 'Where would we eat?'],
    ['What would our weekends look like?', 'Which neighbourhood would we pick?'],
  ],
  3: [ // 3–7 years
    ['What’s the one dish?', 'Where exactly would you take me to eat it?'],
    ['What’s your earliest memory there?', 'What would we do there together now?'],
    ['Is there a part of that story I haven’t heard?', 'What would you do differently if you went again?'],
    ['What would you have shown me?', 'What do you think I’d have loved most?'],
    ['Do you remember what started it?', 'Who laughed first?'],
    ['What did you notice that day?', 'Did you tell me at the time?'],
    ['What did I do?', 'What did you think of me after that?'],
    ['What would you do differently this time?', 'What’s the first thing you’d do there?'],
    ['What would the day look like?', 'What should we do that we’ve never done?'],
    ['What stopped you from mentioning it?', 'What’s the first thing you’d do there?'],
    ['What do you want me to see there?', 'Where would we eat?'],
    ['What would we do every evening?', 'What would a lazy Sunday there look like?'],
  ],
  4: [ // 7–15 years
    ['What’s one thing you did there every time?', 'Who was there with you?'],
    ['What would that version of you think of us?', 'What would you tell that version of yourself?'],
    ['What’s the one dish?', 'Where exactly would you take me to eat it?'],
    ['What makes it feel that way?', 'When were you last there?'],
    ['Do you remember what started it?', 'Who laughed first?'],
    ['What did you notice that day?', 'Did you tell me at the time?'],
    ['What was I doing?', 'Did I know?'],
    ['What was different afterwards?', 'What do you remember feeling on the way home?'],
    ['What’s the first thing we’d do there?', 'When should we go?'],
    ['What would make it the right time?', 'What if the right time is this year?'],
    ['What do you want me to see there?', 'Where would we eat?'],
    ['What does a morning there look like?', 'What would our routine be?'],
  ],
  5: [ // 15+ years
    ['What’s one thing you remember about getting there?', 'Who was there with you?'],
    ['What would that version of you think of us?', 'What would you tell that version of yourself?'],
    ['What’s the one dish?', 'Where exactly would you take me to eat it?'],
    ['What makes it feel that way?', 'When were you last there?'],
    ['What do you miss about those days?', 'What did a perfect day cost us back then?'],
    ['What did you notice that day?', 'Did you tell me at the time?'],
    ['What was I doing?', 'Did I know?'],
    ['What would we do there now?', 'What do you think has changed there?'],
    ['What’s the first thing we’d do there?', 'When should we go?'],
    ['Why hasn’t it happened yet?', 'What would you do first when you finally get there?'],
    ['What do you want me to see there?', 'Where would we eat?'],
    ['What does a morning there look like?', 'What would our routine be?'],
  ],
};

const BASE: Record<Tier, number> = { 0: 10, 1: 30, 2: 50, 3: 70, 4: 90, 5: 110 };

export const BANK: BankQuestion[] = (Object.keys(SETS).map(Number) as Tier[]).flatMap(tier =>
  SETS[tier].map(([act, kind, text, origin, noun, extra], i) => {
    const q: BankQuestion = { id: BASE[tier] + i + 1, tier, act, kind, text, prompts: PROMPTS[tier][i], origin, noun, ...extra };
    if (q.guessOf) q.guessOf = BASE[tier] + q.guessOf; // stored as the position in the set
    return q;
  }),
);

export const byId = new Map(BANK.map(q => [q.id, q]));

/** The fixed 12 for a tier, in order. */
export const setFor = (tier: Tier): number[] => BANK.filter(q => q.tier === tier).map(q => q.id);

export const ACT_NAMES: Record<Tier, Record<Act, string>> = {
  0: { 1: 'Your world', 2: 'First impressions', 3: 'Maybe someday' },
  1: { 1: 'Before us', 2: 'Us so far', 3: 'Next' },
  2: { 1: 'Before us', 2: 'Us', 3: 'Next' },
  3: { 1: 'Before us', 2: 'Us', 3: 'Next' },
  4: { 1: 'Before us', 2: 'Us', 3: 'Next' },
  5: { 1: 'Before us', 2: 'Us', 3: 'Next' },
};

/** Chapter card lines, by act name. */
export const ACT_LINES: Record<string, string> = {
  'Your world': 'Five places from your world. This is who you are, on a map.',
  'First impressions': 'Three quick ones about each other. Guesses welcome.',
  'Maybe someday': 'Four places you’d love to go. No pressure, just dreams.',
  'Before us': 'Four places from before you met. This is where your worlds start.',
  'Us so far': 'Four places you’ve shared so far. This is where your worlds meet.',
  Us: 'Four places you’ve shared. This is where your worlds meet.',
  Next: 'Four places you’d like to go. This is where your shape grows.',
};

export const actName = (q: BankQuestion) => ACT_NAMES[q.tier][q.act];

export const LISTS = {
  together: { text: 'Any other places you’ve been together?', hint: 'Type them one by one, or paste a list like “Goa, Langkawi, Vienna”. Skip if you like.' },
  lived: { text: 'Every city you’ve lived in together', hint: 'Type or paste them. Skip if you haven’t yet.' },
  loved: { text: 'Any other places you love?', hint: 'Type them one by one, or paste a list. Skip if you like.' },
};
export const LIST_MAX = 20;

const fill = (s: string, a: string, p: string) => s.replace(/\{a\}/g, a).replace(/\{p\}/g, p);
export const questionText = (q: BankQuestion, partner: string) => fill(q.text, '', partner);
export const sharedText = (q: BankQuestion) => q.shared ?? q.text;
export const originText = (q: BankQuestion, answerer: string, partner: string) => fill(q.origin, answerer, partner);

/**
 * "Ask Ravi: what's the one dish?" Prompt 1 on a couple's first game, Prompt 2 on a replay
 * (round 2), then alternating, so a second play feels fresh.
 */
export function promptFor(q: BankQuestion, round: number, ask: string): string {
  const p = q.prompts[(Math.max(1, round) - 1) % 2];
  const lower = /^I\b/.test(p) ? p : p.charAt(0).toLowerCase() + p.slice(1);
  return `Ask ${ask}: ${lower}`;
}
