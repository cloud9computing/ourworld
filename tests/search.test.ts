import { describe, expect, it } from 'vitest';
import data from '../public/data/cities.json';
import { buildIndex } from '../src/lib/places/index';

const index = buildIndex(data.v, data.rows as never);
const top = (q: string) => index.search(q)[0];

describe('city search', () => {
  it('puts exact names first', () => { expect(top('Leh').name).toBe('Leh'); expect(top('Paris').cc).toBe('FR'); });
  it('finds by prefix from two characters', () => expect(top('Lisb').name).toBe('Lisbon'));
  it('understands English and older names', () => {
    expect(top('Seville').name).toBe('Sevilla');
    expect(top('Bombay').name).toBe('Mumbai');
    expect(top('Bangalore').name).toBe('Bengaluru');
  });
  it('maps famous places that are not cities', () => { expect(top('Bali').name).toBe('Denpasar'); expect(top('Santorini').cc).toBe('GR'); });
  it('ignores accents', () => expect(top('zurich').name).toBe('Zürich'));
  it('answers a country with its capital', () => expect(top('Portugal').name).toBe('Lisbon'));
  it('parses a pasted list', () => {
    const r = index.parseList('Goa, Langkawi, Vienna');
    expect(r.matched.map(c => c.name)).toEqual(['Panaji', 'Kuah', 'Vienna']);
  });
});
