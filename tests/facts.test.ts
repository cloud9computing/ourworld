import { describe, expect, it } from 'vitest';
import data from '../public/data/cities.json';
import { buildIndex, type CityData } from '../src/lib/places/index';
import { connectingFact, ordinal, spokenTime, utcOffsetMinutes } from '../src/lib/reveal/facts';
import { classify } from '../src/lib/reveal/reveal';

const index = buildIndex(data as unknown as CityData);
const city = (q: string, cc?: string) => index.search(q, 20).find(c => !cc || c.cc === cc)!;
const NOV = new Date('2026-11-26T12:00:00Z');

describe('connecting facts (F11)', () => {
  it('1. same country, close', () => {
    expect(connectingFact(city('Seville'), city('Cadiz', 'ES'), index, NOV)).toMatch(/^Same country, \d+ km apart\.$/);
  });
  it('2. same parallel', () => {
    expect(connectingFact(city('Seville'), city('San Francisco'), index, NOV)).toBe('Both on the 37th parallel.');
  });
  it('3. almost due east or west', () => {
    expect(connectingFact(city('Kolkata'), city('Hanoi'), index, NOV)).toBe('Hanoi is almost due east of Kolkata.');
    // far south of due east by compass, so no "due east" claim
    expect(connectingFact(city('Paris'), city('Mumbai'), index, NOV)).not.toMatch(/due east/);
  });
  it('4. sunset in one, the time in the other (the mock’s Vienna and Wayanad)', () => {
    const wayanad = index.search('Kalpetta')[0] ?? city('Calicut');
    expect(connectingFact(city('Vienna'), wayanad, index, NOV)).toMatch(/km apart\. When the sun sets in Vienna, it’s 10:30 at night in /);
  });
  it('5. distance and the city halfway between', () => {
    expect(connectingFact(city('Lisbon'), city('Moscow'), index, NOV)).toMatch(/km apart\./);
  });
  it('formats times and ordinals', () => {
    expect(spokenTime(22 * 60 + 30)).toBe('10:30 at night');
    expect(spokenTime(6 * 60)).toBe('6 in the morning');
    expect(spokenTime(60)).toBe('1 in the morning');
    expect(spokenTime(0)).toBe('midnight');
    expect(ordinal(1)).toBe('1st'); expect(ordinal(12)).toBe('12th'); expect(ordinal(23)).toBe('23rd'); expect(ordinal(37)).toBe('37th');
    expect(utcOffsetMinutes('Asia/Kolkata', 77, NOV)).toBe(330);
  });
});

describe('same region (F10)', () => {
  it('counts two cities in the same small country as the same corner', () => {
    expect(classify(city('Amsterdam'), city('Maastricht'), index.isSmall)).toBe('region');
  });
  it('counts neighbours under 300 km across a border', () => {
    expect(classify(city('Basel'), city('Strasbourg'), index.isSmall)).toBe('region');
  });
});
