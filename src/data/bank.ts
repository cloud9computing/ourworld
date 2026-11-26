// The question bank (PRD v2, section 7). Ids are stable: they travel in the invite code,
// so never reuse or renumber one. Edit wording freely.
// {p} is replaced with the partner's first name on each phone ("Where you saw Tara happiest").

export type Tier = 0 | 1 | 2 | 3 | 4;
export const TIERS: { label: string }[] = [
  { label: 'Under 1 year' }, { label: '1–3 years' }, { label: '3–7 years' }, { label: '7–15 years' }, { label: '15+' },
];
export const DEFAULT_TIER: Tier = 2;

export type Act = 1 | 2 | 3;
export const ACTS: Record<Act, { name: string; line: string; count: number }> = {
  1: { name: 'Before us', line: 'Three places from before you met. This is where your world starts.', count: 3 },
  2: { name: 'Us', line: 'Six places you have shared. This is where your worlds meet.', count: 6 },
  3: { name: 'Next', line: 'Three places you’d like to go. This is where your shape grows.', count: 3 },
};

export type BankQuestion = {
  id: number;
  act: Act;
  text: string;
  /** Wording for the reveal, when both people read it on one phone (defaults to `text`). */
  shared?: string;
  /** Used in "Two good …" when the answers differ. */
  noun: string;
  /** Always picked in its act. */
  star?: boolean;
  /** Asks about the partner: revealed mirrored. `mirror` reads "<answerer> … <subject> … <place>". */
  about?: { mirror: (answerer: string, subject: string, place: string) => string };
  /** Only for these tiers (all when missing). */
  tiers?: Tier[];
  /** Extra weight for some tiers (default 1). */
  weight?: Partial<Record<Tier, number>>;
};

const LONG: Tier[] = [3, 4];

export const BANK: BankQuestion[] = [
  // Act 1 · Before us
  { id: 1, act: 1, text: 'The place you grew up', noun: 'beginnings', tiers: [0, 1, 2] },
  { id: 2, act: 1, text: 'A place from your childhood {p} has never been to', shared: 'A place from your childhood the other has never been to', noun: 'childhoods', tiers: LONG, weight: { 3: 3, 4: 3 } },
  { id: 3, act: 1, text: 'A place from before you met that still means something to you', noun: 'places' },
  { id: 4, act: 1, text: 'The best trip you took without {p}', shared: 'The best trip you took without each other', noun: 'trips' },
  { id: 5, act: 1, text: 'The first city you lived in on your own', noun: 'first cities' },
  { id: 6, act: 1, text: 'A place you’d take {p} to show who you were before', shared: 'A place that shows who you were before', noun: 'places', tiers: LONG, weight: { 3: 3, 4: 3 } },

  // Act 2 · Us
  { id: 11, act: 2, text: 'Where you saw {p} happiest', shared: 'Where you saw each other happiest', noun: 'happy places', star: true,
    about: { mirror: (who, subject, place) => `${who} says ${subject} was happiest in ${place}.` } },
  { id: 12, act: 2, text: 'The place you’d go back to tomorrow', noun: 'places to go back to', star: true },
  { id: 13, act: 2, text: 'The best meal you’ve had together', noun: 'meals' },
  { id: 14, act: 2, text: 'The best view or sunset you’ve seen together', noun: 'views' },
  { id: 15, act: 2, text: 'Where something went hilariously wrong', noun: 'stories' },
  { id: 16, act: 2, text: 'Where the two of you laughed the hardest', noun: 'laughs' },
  { id: 17, act: 2, text: 'Where you walked until your feet hurt', noun: 'long walks' },
  { id: 18, act: 2, text: 'The best city you’ve lived in together', noun: 'homes', tiers: [1, 2, 3, 4] },
  { id: 19, act: 2, text: 'The place that felt most like the two of you', noun: 'places' },
  { id: 20, act: 2, text: 'Where you were most relaxed together', noun: 'slow days' },
  { id: 21, act: 2, text: 'Where {p} surprised you', shared: 'Where you surprised each other', noun: 'surprises', tiers: [2, 3, 4], weight: { 3: 3, 4: 3 },
    about: { mirror: (who, subject, place) => `${who} remembers a surprise from ${subject} in ${place}.` } },
  { id: 22, act: 2, text: 'Your first trip together', noun: 'first trips', tiers: [0, 1], weight: { 0: 3, 1: 3 } },

  // Act 3 · Next (dreams: not part of the shape)
  { id: 31, act: 3, text: 'Where you want to take {p} next', shared: 'Where you want to take each other next', noun: 'next trips' },
  { id: 32, act: 3, text: 'A place you’ve always wanted to go but never mentioned', noun: 'secret wishes' },
  { id: 33, act: 3, text: 'Where you picture the two of you in 20 years', noun: 'futures', tiers: [2, 3, 4] },
  { id: 34, act: 3, text: 'Where you’d want to spend your next anniversary', noun: 'anniversaries' },
  { id: 35, act: 3, text: 'A place you want the two of you to live one day', noun: 'future homes' },
];

export const byId = new Map(BANK.map(q => [q.id, q]));

export const LISTS = {
  together: { text: 'Any other places you’ve been together?', hint: 'Type them one by one, or paste a list like “Goa, Langkawi, Vienna”. Skip if you like.' },
  lived: { text: 'Every city you’ve lived in together', hint: 'Type or paste them. Skip if you haven’t yet.' },
};
export const LIST_MAX = 20;

export const questionText = (q: BankQuestion, partner: string) => q.text.replace(/\{p\}/g, partner);
export const sharedText = (q: BankQuestion) => q.shared ?? q.text;
