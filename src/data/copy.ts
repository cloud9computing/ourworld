// Every line of user-facing reveal and poster copy (PRD v2). tests/copy.test.ts checks it:
// no scoring, no "wrong", "mismatch" or "disagree", no exclamation marks, no counts of matches.
// Names are used instead of guessed pronouns.

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const copy = {
  brand: 'Our World',
  landingEyebrow: 'A game for two · 10 minutes',
  landingTitle: 'How big is our world?',
  landingLine: 'Twelve questions about the places that made you. Answer in secret on your own phones, then swap and watch your worlds become one.',
  landingStart: 'Find out together',
  haveInvite: 'Got a code from your partner? Scan it.',
  /** Link preview title (index.html carries the same text, since link previews don't run scripts). */
  previewTitle: 'How big is our world? A 10-minute game for two.',
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
  mine: 'Mine',
  yours: 'Yours',
  ofThePlanet: 'of the planet',
  justStarted: 'Just getting started',
  supportLine: (growth: string, countries: number, continents: number) =>
    [growth, plural(countries, 'country', 'countries'), ...(continents ? [plural(continents, 'continent')] : [])].join(' · '),
  dreamNext: (place: string, share: string) => `Next: ${place} would make it ${share}`,
  dreamInside: (place: string) => `${place} is already inside your world`,
  /** The link preview image's punchline; the "=" is drawn in pink. Not on the poster. */
  posterPunchline: ['Mine + yours', '=', 'ours'] as const,
  posterCta: 'How big is yours?',
  altText: (places: number, share: string | null) =>
    `A glowing pink shape joining ${places} places on a faded world map${share ? `, covering ${share} of the planet` : ''}, with each partner's own world in silver`,
};
