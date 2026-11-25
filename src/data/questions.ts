// The question set. Wording is data only: edit freely, but keep ids stable (they're in the QR payload)
// and only ever append new ids at the end of SINGLE_IDS.

export type QuestionId =
  | 'home' | 'grewup' | 'furthest' | 'firsttrip' | 'meal' | 'sunset'
  | 'extreme' | 'disaster' | 'surprise' | 'once' | 'move' | 'dream';

export type Question = {
  id: QuestionId;
  prompt: string;
  /** Card title used in the reveal. */
  title: string;
  /** Hint under the prompt. */
  hint?: string;
  /** A place they haven't been: shown as a dream, not part of the shape. */
  dream?: boolean;
  /** Hide the reuse chips (questions that should produce a new place). */
  noChips?: boolean;
};

export const QUESTIONS: Question[] = [
  { id: 'home', prompt: 'The city you call home', title: 'Home', hint: 'Where you live now, or the place that feels like home.' },
  { id: 'grewup', prompt: 'The city where you grew up', title: 'Where it started' },
  { id: 'furthest', prompt: 'The furthest from home you have ever been', title: 'Furthest away', noChips: true },
  { id: 'firsttrip', prompt: 'Your first trip without your family', title: 'First trip on your own' },
  { id: 'meal', prompt: 'The best meal you have had away from home', title: 'Best meal' },
  { id: 'sunset', prompt: 'The best sunset or view you have seen on a trip', title: 'Best view' },
  { id: 'extreme', prompt: 'The hottest or coldest place you have been', title: 'Wildest weather' },
  { id: 'disaster', prompt: 'The place where something went hilariously wrong', title: 'The story' },
  { id: 'surprise', prompt: 'A place that surprised you', title: 'The surprise' },
  { id: 'once', prompt: 'A place you have been once and still think about', title: 'Still thinking about it' },
  { id: 'move', prompt: 'A city you would move to tomorrow', title: 'Move there tomorrow' },
  { id: 'dream', prompt: 'A place you have never been but dream of going', title: 'Dream trip', dream: true, noChips: true },
];

/** Order of single-answer questions in the QR payload. Append only. */
export const SINGLE_IDS: QuestionId[] = QUESTIONS.map(q => q.id);

export const OTHERS = {
  prompt: 'Every other city you have been to',
  hint: 'Type them one by one, or paste a list like “Goa, Langkawi, Vienna”. Skip if you like.',
  title: 'Also been',
};

export const OTHERS_MAX = 60;
