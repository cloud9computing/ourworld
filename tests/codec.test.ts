import { describe, expect, it } from 'vitest';
import { decodeAnswers, decodeInvite, encodeAnswers, encodeInvite, answersLink, inviteLink, readLink, sharedLink, type Answers, type Invite } from '../src/lib/swap/codec';

const invite: Invite = { gameId: '0123456789abcdef', tier: 2, round: 2, from: 'Ravi', to: 'Tara', questions: [1, 3, 4, 11, 12, 13, 14, 15, 16, 31, 32, 34], indexVersion: 'abcc0607' };
const answers: Answers = {
  gameId: '0123456789abcdef', role: 1,
  answers: Array.from({ length: 12 }, (_, i) => (i % 4 === 3 ? { status: 'skipped' as const } : { status: 'answered' as const, place: 1_000_000 + i * 12345 })),
  together: [2643743, 2988507], lived: [1277333],
};

describe('invite code', () => {
  it('round-trips through a link', () => {
    expect(decodeInvite(encodeInvite(invite))).toEqual(invite);
    const r = readLink(inviteLink('https://ourworld.example', invite));
    expect(r).toEqual({ kind: 'invite', invite });
  });
  it('keeps accented names', () => {
    expect(decodeInvite(encodeInvite({ ...invite, from: 'Zoë', to: 'Ñuno' })).from).toBe('Zoë');
  });
});

describe('places-to-explore code', () => {
  it('round-trips choices and ticks', () => {
    const shared = { gameId: '0123456789abcdef', been: { '51:0': false, '52:1': true }, went: [1269843, 4000000006] };
    expect(readLink(sharedLink('https://x', shared))).toEqual({ kind: 'shared', shared });
  });
  it('carries every tenure tier, Just met to 15+', () => {
    for (const tier of [0, 5] as const) expect(decodeInvite(encodeInvite({ ...invite, tier })).tier).toBe(tier);
  });
});

describe('answer code', () => {
  it('round-trips', () => {
    expect(decodeAnswers(encodeAnswers(answers))).toEqual(answers);
    expect(readLink(answersLink('https://x', answers))).toEqual({ kind: 'answers', answers });
  });
  it('fits one scannable QR code at the caps (20 places per list)', () => {
    const big = { ...answers, answers: answers.answers.map(() => ({ status: 'answered' as const, place: 12_000_000 })), together: Array(20).fill(12_000_000), lived: Array(20).fill(12_000_000) };
    // QR version 20 at error correction M holds 666 bytes
    expect(answersLink('https://ourworld.cloud9trt.workers.dev', big).length).toBeLessThan(666);
  });
  it('rejects damaged, foreign or mixed-up codes', () => {
    const bytes = encodeAnswers(answers); bytes[5] ^= 1;
    expect(() => decodeAnswers(bytes)).toThrow();
    expect(() => readLink('https://example.com/hello')).toThrow();
    expect(() => decodeAnswers(encodeInvite(invite))).toThrow(/invite/);
  });
  it('never throws anything but an Error on random input', () => {
    for (let i = 0; i < 2000; i++) {
      const b = new Uint8Array(12 + (i % 200));
      for (let k = 0; k < b.length; k++) b[k] = (Math.random() * 256) | 0;
      try { decodeAnswers(b); } catch (e) { expect(e).toBeInstanceOf(Error); }
    }
  });
});
