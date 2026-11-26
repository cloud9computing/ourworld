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
  /** Ask-your-partner prompts (R2), rotated between games. Each reads after "Ask Ravi: ". */
  prompts: string[];
  origin: string;
  /** Used in "Two good …" when two different places come up. */
  noun: string;
  /** About the partner: revealed mirrored. "<answerer> … <subject> … <place>." */
  about?: (answerer: string, subject: string, place: string) => string;
  /** Just met guess questions: the id of the question whose partner answer is the truth, and how to say it. */
  guessOf?: number;
  truth?: (owner: string, place: string) => string;
};

type Row = [act: Act, kind: Kind, text: string, prompts: string[], origin: string, noun: string, extra?: Partial<BankQuestion>];

const happiestAbout = (who: string, subject: string, place: string) => `${who} says ${subject} was happiest in ${place}.`;
const surprisedAbout = (who: string, subject: string, place: string) => `${who} remembers a surprise from ${subject} in ${place}.`;
const fellAbout = (who: string, subject: string, place: string) => `${who} fell for ${subject} all over again in ${place}.`;

const FOOD: Row = [1, 'past', 'A place you’d go back to just for the food', ['What’s the one dish?', 'Who would you take with you to eat it?', 'What does the place smell like when you walk in?'], 'the food {a} would go back for', 'meals'];
const HOME_NOT_HOME: Row = [1, 'past', 'A place that feels like home but isn’t home', ['What makes it feel that way?', 'What’s the first thing you do when you get there?'], '{a}’s home away from home', 'second homes', { shared: 'A place that feels like home but isn’t home' }];
const SAW_HAPPIEST: Row = [2, 'us', 'Where you saw {p} happiest', ['What did you notice that day?', 'What do you remember about the moment?'], 'where {a} saw {p} happiest', 'happy places', { shared: 'Where you saw each other happiest', about: happiestAbout }];
const BACK_TOMORROW: Row = [2, 'us', 'The place you’d go back to tomorrow', ['What would you do differently this time?', 'Where would you have breakfast on the first morning?'], 'where {a} would go back tomorrow', 'places to go back to'];
const TAKE_NEXT: Row = [3, 'dream', 'Where you want to take {p} next', ['What’s the first thing we’d do there?', 'What would we eat on the first night?'], 'where {a} wants to take {p} next', 'next trips', { shared: 'Where you want to take each other next' }];
const NEVER_MENTIONED: Row = [3, 'dream', 'A place you’ve always wanted to go but never mentioned', ['What stopped you from mentioning it?', 'When did you first want to go?'], 'on {a}’s secret wishlist', 'secret wishes'];
const SHOW_PAST: Row = [3, 'show', 'A place from your past you want to show {p}', ['What do you want me to see there?', 'Where would we go first?'], 'the place {a} wants to show {p}', 'places to show each other', { shared: 'A place from your past to show each other' }];
const LAUGHED: Row = [2, 'us', 'Where we laughed hardest on a trip', ['Do you remember what started it?', 'Could you do the impression?'], 'where you laughed hardest', 'laughs'];
const NEXT_ADVENTURE: Row = [3, 'dream', 'Our next adventure, just the two of us', ['What’s the first thing we’d do there?', 'What would we leave at home?'], '{a}’s idea for your next adventure', 'adventures'];
const MONTH_A_YEAR: Row = [3, 'dream', 'Where you’d love us to spend a month every year when we’re older', ['What does a morning there look like?', 'What would our favourite café be?'], 'where {a} pictures a month every year', 'months away'];
const FELL_AGAIN: Row = [2, 'us', 'Where you fell for {p} all over again', ['What was I doing?', 'What were we wearing?'], 'where {a} fell for {p} all over again', 'moments', { shared: 'Where you fell for each other all over again', about: fellAbout }];

const SETS: Record<Tier, Row[]> = {
  0: [ // Just met: Your world · First impressions · Maybe someday (5 · 3 · 4)
    [1, 'past', 'The place you grew up', ['What’s one thing every visitor gets wrong about it?', 'Where would you take a friend on their first evening there?'], 'where {a} grew up', 'hometowns'],
    [1, 'past', 'The place you feel most like yourself', ['What do you do in your first hour there?', 'What do you always buy there?'], 'where {a} feels most at ease', 'places'],
    [1, 'past', 'The best trip you’ve ever taken', ['What’s the story you always tell about it?', 'Who were you with?'], '{a}’s best trip ever', 'trips'],
    [1, 'past', 'A place that completely surprised you', ['What did you expect, and what was it really like?', 'What surprised you most?'], 'the place that surprised {a}', 'surprises'],
    [1, 'past', 'Where you’d go for a weekend on your own', ['What does the perfect day there look like?', 'What would you skip that everyone else does?'], '{a}’s weekend spot', 'weekends'],
    [2, 'guess', 'Guess: where did {p} grow up?', ['What made you guess that?', 'What do you picture it looks like?'], '', 'guesses', { shared: 'Guess: where did the other grow up?', guessOf: 1, truth: (o, p) => `${o} grew up in ${p}.` }],
    [2, 'guess', 'Guess: which city feels most like {p}?', ['What gave it away?', 'What about me made you think of it?'], '', 'guesses', { shared: 'Guess: which city feels most like the other?', guessOf: 2, truth: (o, p) => `${o}’s own answer: ${p}.` }],
    [2, 'mine', 'Where you’d take {p} on a perfect date', ['What would we do there?', 'What time would we start?'], 'where {a} would take {p} on a perfect date', 'dates', { shared: 'Where you’d take each other on a perfect date' }],
    [3, 'dream', 'A place you’ve always wanted to go', ['When did you first want to go?', 'What would you do on day one?'], 'on {a}’s wishlist', 'wishes'],
    [3, 'show', 'A place you’d love to show {p} someday', ['What would we do first?', 'What should I bring?'], 'the place {a} wants to show {p}', 'places to show each other', { shared: 'A place you’d love to show each other someday' }],
    [3, 'dream', 'A city you’d live in for a year if you could', ['What would a Tuesday there look like?', 'Which neighbourhood would you pick?'], 'where {a} would live for a year', 'years away'],
    [3, 'dream', 'A place you’d go tomorrow if you could', ['What would you pack first?', 'Who would you call when you landed?'], 'where {a} would go tomorrow', 'escapes'],
  ],
  1: [ // Under a year: Before us · Us so far · Next
    [1, 'past', 'Where you were happiest as a kid', ['What did a perfect day there look like?', 'What did it smell like?'], 'where {a} was happiest as a kid', 'childhoods'],
    [1, 'past', 'A place your family always tells stories about', ['Which story do they tell most?', 'Who tells it best?'], 'where {a}’s family stories come from', 'family stories'],
    [1, 'past', 'The best trip you took before we met', ['What’s the story you always tell about it?', 'What did you bring back?'], '{a}’s best trip before you met', 'trips'],
    [1, 'past', 'The place you feel most like yourself', ['What do you do in your first hour there?', 'What do you always buy there?'], 'where {a} feels most at ease', 'places'],
    [2, 'us', 'The trip of ours you’d relive first', ['Which moment would you go back to?', 'What would you pack differently?'], 'the trip {a} would relive first', 'trips'],
    [2, 'us', 'Where you knew this was something', ['What happened that made you sure?', 'What were we doing just before?'], 'where {a} knew', 'moments'],
    SAW_HAPPIEST,
    BACK_TOMORROW,
    TAKE_NEXT,
    [3, 'dream', 'A place you’ve always wanted to go but never mentioned', ['When did you first want to go?', 'What would you do on day one?'], 'on {a}’s secret wishlist', 'secret wishes'],
    SHOW_PAST,
    [3, 'dream', 'If we could move anywhere for a year', ['What would our weekends look like?', 'What would we miss from home?'], 'where {a} would move for a year', 'years away'],
  ],
  2: [ // 1–3 years
    [1, 'past', 'Where you were happiest as a kid', ['What did a perfect day there look like?', 'What did it smell like?'], 'where {a} was happiest as a kid', 'childhoods'],
    [1, 'past', 'The best trip you took without {p}', ['What’s the story you always tell about it?', 'What did you bring back?'], '{a}’s best trip without {p}', 'trips', { shared: 'The best trip you took without each other' }],
    FOOD,
    HOME_NOT_HOME,
    [2, 'us', 'Where something went hilariously wrong', ['Tell it from your side.', 'When did it start being funny?'], 'where something went hilariously wrong', 'stories'],
    SAW_HAPPIEST,
    [2, 'us', 'The best meal we’ve had on a trip', ['Do you both remember it the same way?', 'What did we order?'], 'your best meal on a trip', 'meals'],
    BACK_TOMORROW,
    TAKE_NEXT,
    NEVER_MENTIONED,
    SHOW_PAST,
    [3, 'dream', 'A city you could see us living in for a year', ['What would our weekends look like?', 'What would we miss from home?'], 'where {a} could see you living for a year', 'years away'],
  ],
  3: [ // 3–7 years
    FOOD,
    [1, 'past', 'A place from your childhood {p} has never been to', ['What’s your earliest memory there?', 'Who would we visit there?'], '{a}’s childhood place {p} hasn’t seen', 'childhoods', { shared: 'A childhood place the other has never been to' }],
    [1, 'past', 'The best trip you took without {p}', ['Is there a part of that story I haven’t heard?', 'What did you bring back?'], '{a}’s best trip without {p}', 'trips', { shared: 'The best trip you took without each other' }],
    [1, 'past', 'A place you wish {p} had seen with you', ['What would you have shown me?', 'What would we have done on the first night?'], 'where {a} wishes you’d been together', 'places', { shared: 'A place you wish the other had seen with you' }],
    LAUGHED,
    SAW_HAPPIEST,
    [2, 'us', 'Where {p} surprised you', ['What did I do?', 'How long did it take you to work it out?'], 'where {p} surprised {a}', 'surprises', { shared: 'Where you surprised each other', about: surprisedAbout }],
    BACK_TOMORROW,
    [3, 'dream', 'Where you’d want to spend our next anniversary', ['What would the day look like?', 'Where would we have dinner?'], 'where {a} wants to spend your next anniversary', 'anniversaries'],
    NEVER_MENTIONED,
    SHOW_PAST,
    [3, 'dream', 'Where you’d love us to spend a whole summer someday', ['What would we do every evening?', 'What would we do on rainy days?'], 'where {a} pictures a summer together', 'summers'],
  ],
  4: [ // 7–15 years
    [1, 'past', 'The childhood holiday you’d relive', ['What’s one thing you did there every time?', 'Who was always there?'], '{a}’s favourite childhood holiday', 'holidays'],
    [1, 'past', 'Where you’d take {p} to meet the person you were at 22', ['What would that version of you think of us?', 'Where would we find you on a Friday night?'], 'where {a} was at 22', 'past lives', { shared: 'Where you’d go to meet the person you were at 22' }],
    FOOD,
    HOME_NOT_HOME,
    LAUGHED,
    SAW_HAPPIEST,
    FELL_AGAIN,
    [2, 'us', 'The trip that changed us', ['What was different afterwards?', 'When did you notice?'], 'the trip that changed you', 'turning points'],
    NEXT_ADVENTURE,
    [3, 'dream', 'A trip that’s been waiting for the right time', ['What would make it the right time?', 'What would we need to plan first?'], 'the trip {a} has been saving', 'trips'],
    SHOW_PAST,
    MONTH_A_YEAR,
  ],
  5: [ // 15+ years
    [1, 'past', 'The childhood trip you’d relive', ['What’s one thing you remember about getting there?', 'Who sat next to you on the way?'], '{a}’s favourite childhood trip', 'trips'],
    [1, 'past', 'Where you’d take {p} to meet the young you', ['What would that version of you think of us?', 'Where would we find you on a Saturday?'], 'where to meet the young {a}', 'past lives', { shared: 'Where you’d go to meet the young you' }],
    FOOD,
    HOME_NOT_HOME,
    [2, 'us', 'Where we were happiest with very little', ['What do you miss about those days?', 'What did we eat back then?'], 'where you were happiest with very little', 'early days'],
    SAW_HAPPIEST,
    FELL_AGAIN,
    [2, 'backTo', 'A place from our early days we should go back to', ['What would we do there now?', 'Who would we look up?'], 'somewhere to go back to', 'places to go back to'],
    NEXT_ADVENTURE,
    [3, 'dream', 'A place still on your list since you were young', ['Why hasn’t it happened yet?', 'Who first told you about it?'], 'on {a}’s list for years', 'old dreams'],
    SHOW_PAST,
    MONTH_A_YEAR,
  ],
};

const BASE: Record<Tier, number> = { 0: 10, 1: 30, 2: 50, 3: 70, 4: 90, 5: 110 };

export const BANK: BankQuestion[] = (Object.keys(SETS).map(Number) as Tier[]).flatMap(tier =>
  SETS[tier].map(([act, kind, text, prompts, origin, noun, extra], i) => {
    const q: BankQuestion = { id: BASE[tier] + i + 1, tier, act, kind, text, prompts, origin, noun, ...extra };
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

/** "Ask Ravi: what's the one dish?" — the prompt for this game, rotated so a replay doesn't repeat. */
export function promptFor(q: BankQuestion, gameId: string, ask: string): string {
  const seed = parseInt(gameId.slice(0, 6), 16) || 0;
  const p = q.prompts[(seed + q.id) % q.prompts.length];
  const lower = /^I\b/.test(p) ? p : p.charAt(0).toLowerCase() + p.slice(1);
  return `Ask ${ask}: ${lower}`;
}
