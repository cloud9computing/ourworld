// Every line of reveal and poster copy lives here, so tests/copy.test.ts can check it.
// Rules: no scoring, no "wrong", "mismatch" or "disagree", no exclamation marks, no counts of matches.

export const copy = {
  brand: 'Our World',
  tagline: 'A game for two. Answer on your own phones, swap codes, and see the shape of your world together.',
  progress: (n: number) => (n === 1 ? '1 place so far' : `${n} places so far`),
  repeatNudge: (city: string) => `${city} again. Any other place come to mind?`,

  same: (city: string) => `You both said ${city}`,
  sameRegion: (country: string) => `Different cities, same corner of ${country}`,
  different: (a: string, aCity: string, b: string, bCity: string) => `${a} chose ${aCity}, ${b} chose ${bCity}: two worlds to explore`,
  onlyOne: (who: string, city: string) => `${who} remembered this one: ${city}`,

  sameDream: (city: string) => `You both dream of ${city}. Maybe that's your next trip.`,
  nearDream: (country: string) => `Both of you dream of ${country}`,
  twoDreams: (a: string, aCity: string, b: string, bCity: string) => `${a} dreams of ${aCity}, ${b} of ${bCity}: two good ideas`,

  sharedPlaces: (cities: string) => `Places you have both been: ${cities}`,
  onlyKept: (who: string, cities: string) => `Places only ${who} knows: ${cities}`,

  yourWorld: (name: string) => `${name}'s world`,
  ourWorld: 'Our world',
  togetherCounts: (places: number, countries: number) =>
    `Together · ${places} ${places === 1 ? 'place' : 'places'} · ${countries} ${countries === 1 ? 'country' : 'countries'}`,
  posterTop: 'The world, as seen from us',
  posterTitle: 'the shape of our world',
  posterCta: 'Find your shape.',
  altText: (places: number) => `A glowing pink shape joining ${places} places on a faded world map, centred between two homes`,
};
