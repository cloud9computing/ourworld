// Every line of user-facing reveal and poster copy (PRD v2). tests/copy.test.ts checks it:
// no scoring, no "wrong", "mismatch" or "disagree", no exclamation marks, no counts of matches.
// Names are used instead of guessed pronouns.

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const copy = {
  brand: 'Our World',
  landingEyebrow: 'A date for two phones',
  landingTitle: 'Find your shape',
  landingLine: 'Answer 12 questions about the places in your lives, on your own phones. Then swap, and see the world you make together.',
  landingMeta: 'About 10 minutes · No sign-up',
  haveInvite: 'Have an invite? Scan your partner’s code.',
  setupHelper: 'We use this to pick questions that are more likely to surprise you.',
  inviteLine: (p: string) => `Have ${p} scan this with a phone camera. You’ll both get the same 12 questions.`,
  partnerIn: (p: string) => `${p}’s in. Start`,
  invited: (from: string) => `${from} asked you on a date`,

  progress: (n: number) => `${plural(n, 'place')} so far`,
  somewhereNew: 'Somewhere new?',
  partnerToo: (p: string) => `${p} is answering this one too.`,
  skip: 'Skip, we’ll draw without it',
  tapToContinue: 'Tap to continue',

  sealedCounts: (places: number, dreams: number) => `${plural(places, 'place')} · ${plural(dreams, 'dream')}`,
  sealedHint: (p: string) => `Don’t show ${p} yet. When ${p} is done, swap codes.`,
  gotAnswers: (p: string) => `${p}’s answers are in.`,
  showYours: (p: string) => `If ${p} hasn’t scanned your code yet, show it now. One scan each.`,

  revealReady: 'Ready? Hold one phone between you.',
  tapToSee: (viewer: string, owner: string) => `${viewer}, tap to see ${owner}’s`,
  same: (city: string) => `You both said ${city}.`,
  sameSub: 'It becomes a bright star in your shape.',
  sameRegion: (country: string) => `Different cities, same corner of ${country}`,
  sameRegionNear: 'Different cities, close neighbours',
  twoGood: (noun: string) => `Two good ${noun}`,
  onlyOne: (who: string, city: string) => `${who} remembered this one: ${city}`,
  beforeUs: (who: string, city: string) => `${who}, before us: ${city}`,
  beforeUsNone: (who: string) => `${who} skipped this one`,
  sameDream: (city: string) => `You both want ${city}.`,
  sameDreamSub: 'A shared dream glows on your poster.',
  twoDreams: 'Two places to go next',
  onlyDream: (who: string, city: string) => `${who} would go to ${city}`,
  bothListed: (cities: string) => `You both listed ${cities}`,
  onlyKept: (who: string, city: string) => `A memory only ${who} kept: ${city}`,
  onlyKeptSub: 'It’s in your shape too.',
  yourShape: (n: number) => `Your shape: ${plural(n, 'place')}`,
  thisIsYourWorld: 'This is your world',

  yourWorld: (name: string) => `${name}’s world`,
  ourWorld: 'Our world',
  placesCount: (n: number) => plural(n, 'place'),
  posterTop: 'Seen from the North Pole',
  posterCounts: (c: { places: number; countries: number; continents: number; dreams: number }) =>
    [plural(c.places, 'place'), plural(c.countries, 'country', 'countries'), plural(c.continents, 'continent'), ...(c.dreams ? [plural(c.dreams, 'dream')] : [])].join(' · '),
  posterCta: 'Do yours together tonight',
  altText: (places: number) => `A glowing pink shape joining ${places} places on a faded world map seen from the North Pole, with each partner's own world in silver`,
};
