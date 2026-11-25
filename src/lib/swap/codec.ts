// The QR payload: one person's sealed answers, packed into a few hundred bytes.
// Layout (format 1):
//   u8 format | 4 bytes index version | 8 bytes device id | u8 name length + UTF-8 name
//   ceil(n/4) bytes of 2-bit statuses for the n single questions (0 none, 1 answered, 2 skipped, 3 can't remember)
//   varint place id for each answered question, in SINGLE_IDS order
//   varint count + varint ids for the "other places" list
//   4 bytes CRC-32 of everything before it
import { SINGLE_IDS, OTHERS_MAX, type QuestionId } from '../../data/questions';
import type { Answer, PartnerData, Status } from '../../state/session';

export const FORMAT = 1;
const MAX_NAME_BYTES = 48;
const STATUS: (Status | undefined)[] = [undefined, 'answered', 'skipped', 'cant_remember'];

export type Payload = PartnerData & { indexVersion: string };

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
    if (!Number.isInteger(n) || n < 0 || n > 2 ** 32) throw new Error('bad id');
    while (n >= 128) { this.u8((n % 128) | 128); n = Math.floor(n / 128); }
    this.u8(n);
  }
}

class Reader {
  i = 0;
  constructor(private b: Uint8Array) {}
  u8() { if (this.i >= this.b.length) throw new Error('short'); return this.b[this.i++]; }
  bytes(n: number) { if (this.i + n > this.b.length) throw new Error('short'); const s = this.b.slice(this.i, this.i + n); this.i += n; return s; }
  varint() {
    let n = 0, mul = 1;
    for (let k = 0; k < 5; k++) { const x = this.u8(); n += (x & 127) * mul; if (x < 128) return n; mul *= 128; }
    throw new Error('varint too long');
  }
}

const hexToBytes = (h: string) => Uint8Array.from(h.match(/../g) ?? [], x => parseInt(x, 16));
const bytesToHex = (b: Uint8Array) => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');

export function encode(p: Payload): Uint8Array {
  const w = new Writer();
  w.u8(FORMAT);
  const iv = hexToBytes(p.indexVersion.padEnd(8, '0').slice(0, 8));
  const id = hexToBytes(p.deviceId.padEnd(16, '0').slice(0, 16));
  w.bytes(iv); w.bytes(id);
  let name = new TextEncoder().encode(p.firstName.trim());
  if (name.length > MAX_NAME_BYTES) name = name.slice(0, MAX_NAME_BYTES);
  w.u8(name.length); w.bytes(name);
  const statusBytes = new Uint8Array(Math.ceil(SINGLE_IDS.length / 4));
  SINGLE_IDS.forEach((q, i) => {
    const s = p.answers[q]?.status;
    let code = s ? STATUS.indexOf(s) : 0;
    if (code === 1 && !p.answers[q]?.place) code = 0;
    statusBytes[i >> 2] |= code << ((i & 3) * 2);
  });
  w.bytes(statusBytes);
  for (const q of SINGLE_IDS) { const a = p.answers[q]; if (a?.status === 'answered' && a.place) w.varint(a.place); }
  const others = p.others.slice(0, OTHERS_MAX);
  w.varint(others.length);
  for (const o of others) w.varint(o);
  const body = Uint8Array.from(w.buf);
  const crc = crc32(body);
  const out = new Uint8Array(body.length + 4);
  out.set(body);
  new DataView(out.buffer).setUint32(body.length, crc);
  return out;
}

export function decode(bytes: Uint8Array): Payload {
  if (bytes.length < 20 || bytes.length > 2000) throw new Error('This code isn’t one of ours.');
  const body = bytes.slice(0, bytes.length - 4);
  const crc = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(bytes.length - 4);
  if (crc32(body) !== crc) throw new Error('This code didn’t scan cleanly. Try again.');
  const r = new Reader(body);
  if (r.u8() !== FORMAT) throw new Error('This code comes from a different version. Refresh both phones.');
  const indexVersion = bytesToHex(r.bytes(4));
  const deviceId = bytesToHex(r.bytes(8));
  const nameLen = r.u8();
  if (nameLen > MAX_NAME_BYTES) throw new Error('bad name');
  const firstName = new TextDecoder('utf-8', { fatal: false }).decode(r.bytes(nameLen)).replace(/[\u0000-\u001f\u007f]/g, '').trim();
  const statusBytes = r.bytes(Math.ceil(SINGLE_IDS.length / 4));
  const answers: Partial<Record<QuestionId, Answer>> = {};
  const codes = SINGLE_IDS.map((_, i) => (statusBytes[i >> 2] >> ((i & 3) * 2)) & 3);
  SINGLE_IDS.forEach((q, i) => {
    const s = STATUS[codes[i]];
    if (!s) return;
    answers[q] = s === 'answered' ? { status: s, place: r.varint() } : { status: s };
  });
  const n = r.varint();
  if (n > OTHERS_MAX) throw new Error('too many places');
  const others: number[] = [];
  for (let k = 0; k < n; k++) others.push(r.varint());
  if (r.i !== body.length) throw new Error('trailing data');
  return { indexVersion, deviceId, firstName, answers, others };
}

export function toBase64Url(b: Uint8Array): string {
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(s: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]{1,3000}$/.test(s)) throw new Error('This code isn’t one of ours.');
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

/** The text inside the QR code: a link to the app with the answers after the "#", which browsers never send to a server. */
export function toLink(origin: string, p: Payload): string {
  return `${origin}/#s=${toBase64Url(encode(p))}`;
}

export function fromLink(text: string): Payload {
  const m = text.match(/#s=([A-Za-z0-9_-]+)$/);
  if (!m) throw new Error('This code isn’t one of ours.');
  return decode(fromBase64Url(m[1]));
}
