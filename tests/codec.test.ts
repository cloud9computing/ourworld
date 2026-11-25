import { describe, expect, it } from 'vitest';
import { decode, encode, fromLink, toLink, type Payload } from '../src/lib/swap/codec';
import { SINGLE_IDS } from '../src/data/questions';

const sample: Payload = {
  indexVersion: '9eecdd9d', deviceId: '0123456789abcdef', firstName: 'Tara',
  answers: { home: { status: 'answered', place: 1269843 }, grewup: { status: 'skipped' }, meal: { status: 'answered', place: 2267057 }, dream: { status: 'cant_remember' } },
  others: [2643743, 2988507, 3117735],
};

describe('QR payload', () => {
  it('round-trips', () => {
    expect(decode(encode(sample))).toEqual(sample);
    expect(fromLink(toLink('https://example.app', sample))).toEqual(sample);
  });

  it('keeps names with accents and emoji', () => {
    const p = { ...sample, firstName: 'Zoë 🌍' };
    expect(decode(encode(p)).firstName).toBe('Zoë 🌍');
  });

  it('stays small enough for a screen-to-screen QR code at the caps', () => {
    const answers = Object.fromEntries(SINGLE_IDS.map(q => [q, { status: 'answered' as const, place: 12_000_000 }]));
    const big = { ...sample, firstName: 'Maximiliana', answers, others: Array.from({ length: 60 }, () => 12_000_000) };
    const link = toLink('https://our-world.pages.dev', big);
    // QR version 20 at error correction M holds 666 bytes
    expect(link.length).toBeLessThan(666);
  });

  it('rejects damaged or foreign codes', () => {
    const bytes = encode(sample);
    const bad = bytes.slice(); bad[10] ^= 1;
    expect(() => decode(bad)).toThrow();
    expect(() => fromLink('https://example.com/hello')).toThrow();
    expect(() => decode(new Uint8Array(30))).toThrow();
  });

  it('never throws anything but an Error on random input', () => {
    for (let i = 0; i < 2000; i++) {
      const b = new Uint8Array(20 + (i % 200));
      for (let k = 0; k < b.length; k++) b[k] = (Math.random() * 256) | 0;
      try { decode(b); } catch (e) { expect(e).toBeInstanceOf(Error); }
    }
  });
});
