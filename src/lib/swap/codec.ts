// The two QR codes, packed small and carried after "#" in a link so no server ever sees them.
//
// Invite (#j=):  u8 format | u8 'J' | 8 bytes game id | u8 tier | name, partner name (u8 length + UTF-8)
//                | u8 count + u8 question ids | 4 bytes city index version | CRC-32
// Shared (#r=):  u8 format | u8 'R' | 8 bytes game id | u8 count + (u8 question id, u8 role << 1 | together) choices
//                | varint count + varint ids of places ticked off as "We went" | CRC-32
// Answers (#a=): u8 format | u8 'A' | 8 bytes game id | u8 role (0 started the game, 1 joined)
//                | u8 count | 2-bit statuses (0 none, 1 answered, 2 skipped) | varint city ids for answered
//                | two lists (varint count + varint ids): places together, cities lived in | CRC-32
import { LIST_MAX } from '../../data/bank';
import type { Tier } from '../../data/bank';

export const FORMAT = 3;
const MAX_NAME_BYTES = 40;

export type Status = 'answered' | 'skipped';
export type Answer = { status: Status; place?: number };

export type Invite = { gameId: string; tier: Tier; from: string; to: string; questions: number[]; indexVersion: string };
export type Answers = { gameId: string; role: 0 | 1; answers: Answer[]; together: number[]; lived: number[] };

/** What the reveal decided, so the other phone can keep the same places-to-explore list (R4). */
export type Shared = { gameId: string; been: Record<string, boolean>; went: number[] };

export class CodeError extends Error {}

function crc32(bytes: Uint8Array): number {
  let c = ~0;
  for (const b of bytes) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
  return ~c >>> 0;
}

class Writer {
  buf: number[] = [];
  u8(n: number) { this.buf.push(n & 255); }
  bytes(b: ArrayLike<number>) { for (let i = 0; i < b.length; i++) this.u8(b[i]); }
  varint(n: number) {
    if (!Number.isInteger(n) || n < 0 || n > 2 ** 32) throw new CodeError('bad number');
    while (n >= 128) { this.u8((n % 128) | 128); n = Math.floor(n / 128); }
    this.u8(n);
  }
  name(s: string) {
    let b = new TextEncoder().encode(s.trim());
    if (b.length > MAX_NAME_BYTES) b = b.slice(0, MAX_NAME_BYTES);
    this.u8(b.length); this.bytes(b);
  }
  hex(h: string, n: number) { this.bytes(Uint8Array.from((h.padEnd(n * 2, '0').slice(0, n * 2).match(/../g) ?? []), x => parseInt(x, 16))); }
  done(): Uint8Array {
    const body = Uint8Array.from(this.buf), out = new Uint8Array(body.length + 4);
    out.set(body);
    new DataView(out.buffer).setUint32(body.length, crc32(body));
    return out;
  }
}

class Reader {
  i = 0;
  constructor(private b: Uint8Array) {}
  u8() { if (this.i >= this.b.length) throw new CodeError('short'); return this.b[this.i++]; }
  bytes(n: number) { if (this.i + n > this.b.length) throw new CodeError('short'); const s = this.b.slice(this.i, this.i + n); this.i += n; return s; }
  varint() {
    let n = 0, mul = 1;
    for (let k = 0; k < 5; k++) { const x = this.u8(); n += (x & 127) * mul; if (x < 128) return n; mul *= 128; }
    throw new CodeError('varint too long');
  }
  name() {
    const len = this.u8();
    if (len > MAX_NAME_BYTES) throw new CodeError('bad name');
    return new TextDecoder().decode(this.bytes(len)).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 20);
  }
  hex(n: number) { return Array.from(this.bytes(n), x => x.toString(16).padStart(2, '0')).join(''); }
  list(max: number) {
    const n = this.varint();
    if (n > max) throw new CodeError('too many places');
    return Array.from({ length: n }, () => this.varint());
  }
  end() { if (this.i !== this.b.length) throw new CodeError('trailing data'); }
}

function open(bytes: Uint8Array, kind: 'J' | 'A' | 'R'): Reader {
  if (bytes.length < 12 || bytes.length > 2000) throw new CodeError('This code isn’t one of ours.');
  const body = bytes.slice(0, bytes.length - 4);
  const crc = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(bytes.length - 4);
  if (crc32(body) !== crc) throw new CodeError('This code didn’t scan cleanly. Try again.');
  const r = new Reader(body);
  if (r.u8() !== FORMAT) throw new CodeError('This code comes from an older version. Refresh both phones and start again.');
  const k = String.fromCharCode(r.u8());
  if (k !== kind) throw new CodeError(kind === 'A' ? 'That’s an invite code. Scan the code on the sealed screen instead.' : kind === 'R' ? 'That’s not a places-to-explore code.' : 'That’s an answer code, not an invite.');
  return r;
}

export function encodeInvite(v: Invite): Uint8Array {
  const w = new Writer();
  w.u8(FORMAT); w.u8('J'.charCodeAt(0)); w.hex(v.gameId, 8); w.u8(v.tier); w.name(v.from); w.name(v.to);
  w.u8(v.questions.length); for (const q of v.questions) w.u8(q);
  w.hex(v.indexVersion, 4);
  return w.done();
}

export function decodeInvite(bytes: Uint8Array): Invite {
  const r = open(bytes, 'J');
  const gameId = r.hex(8), tier = r.u8();
  if (tier > 5) throw new CodeError('bad tier');
  const from = r.name(), to = r.name();
  const n = r.u8();
  if (n < 1 || n > 20) throw new CodeError('bad questions');
  const questions = Array.from({ length: n }, () => r.u8());
  const indexVersion = r.hex(4);
  r.end();
  return { gameId, tier: tier as Tier, from, to, questions, indexVersion };
}

export function encodeAnswers(v: Answers): Uint8Array {
  const w = new Writer();
  w.u8(FORMAT); w.u8('A'.charCodeAt(0)); w.hex(v.gameId, 8); w.u8(v.role);
  w.u8(v.answers.length);
  const st = new Uint8Array(Math.ceil(v.answers.length / 4));
  v.answers.forEach((a, i) => {
    const code = a.status === 'answered' && a.place ? 1 : a.status === 'skipped' ? 2 : 0;
    st[i >> 2] |= code << ((i & 3) * 2);
  });
  w.bytes(st);
  for (const a of v.answers) if (a.status === 'answered' && a.place) w.varint(a.place);
  for (const list of [v.together, v.lived]) { const l = list.slice(0, LIST_MAX); w.varint(l.length); l.forEach(x => w.varint(x)); }
  return w.done();
}

export function decodeAnswers(bytes: Uint8Array): Answers {
  const r = open(bytes, 'A');
  const gameId = r.hex(8), role = r.u8();
  if (role > 1) throw new CodeError('bad role');
  const n = r.u8();
  if (n > 20) throw new CodeError('bad answers');
  const st = r.bytes(Math.ceil(n / 4));
  const answers: Answer[] = [];
  for (let i = 0; i < n; i++) {
    const code = (st[i >> 2] >> ((i & 3) * 2)) & 3;
    answers.push(code === 1 ? { status: 'answered', place: 0 } : { status: 'skipped' });
  }
  for (const a of answers) if (a.status === 'answered') a.place = r.varint();
  const together = r.list(LIST_MAX), lived = r.list(LIST_MAX);
  r.end();
  return { gameId, role: role as 0 | 1, answers, together, lived };
}

export function encodeShared(v: Shared): Uint8Array {
  const w = new Writer();
  w.u8(FORMAT); w.u8('R'.charCodeAt(0)); w.hex(v.gameId, 8);
  const entries = Object.entries(v.been).slice(0, 40);
  w.u8(entries.length);
  for (const [key, together] of entries) {
    const [q, role] = key.split(':').map(Number);
    w.u8(q); w.u8(((role & 1) << 1) | (together ? 1 : 0));
  }
  const went = v.went.slice(0, 60);
  w.varint(went.length); went.forEach(x => w.varint(x));
  return w.done();
}

export function decodeShared(bytes: Uint8Array): Shared {
  const r = open(bytes, 'R');
  const gameId = r.hex(8), n = r.u8();
  if (n > 40) throw new CodeError('bad code');
  const been: Record<string, boolean> = {};
  for (let i = 0; i < n; i++) { const q = r.u8(), f = r.u8(); been[`${q}:${(f >> 1) & 1}`] = (f & 1) === 1; }
  const went = r.list(60);
  r.end();
  return { gameId, been, went };
}

export function toBase64Url(b: Uint8Array): string {
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(s: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]{1,3000}$/.test(s)) throw new CodeError('This code isn’t one of ours.');
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

export const inviteLink = (origin: string, v: Invite) => `${origin}/#j=${toBase64Url(encodeInvite(v))}`;
export const answersLink = (origin: string, v: Answers) => `${origin}/#a=${toBase64Url(encodeAnswers(v))}`;
export const sharedLink = (origin: string, v: Shared) => `${origin}/#r=${toBase64Url(encodeShared(v))}`;

/** Reads a scanned or pasted link. */
export function readLink(text: string):
  { kind: 'invite'; invite: Invite } | { kind: 'answers'; answers: Answers } | { kind: 'shared'; shared: Shared } {
  const m = text.trim().match(/#([jar])=([A-Za-z0-9_-]+)\s*$/);
  if (!m) throw new CodeError('This code isn’t one of ours.');
  const bytes = fromBase64Url(m[2]);
  if (m[1] === 'j') return { kind: 'invite', invite: decodeInvite(bytes) };
  if (m[1] === 'r') return { kind: 'shared', shared: decodeShared(bytes) };
  return { kind: 'answers', answers: decodeAnswers(bytes) };
}
