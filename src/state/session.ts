// Everything a person enters lives here, on their own phone only.
import type { QuestionId } from '../data/questions';

export type Status = 'answered' | 'skipped' | 'cant_remember';
export type Answer = { status: Status; place?: number };

export type PartnerData = {
  deviceId: string;
  firstName: string;
  answers: Partial<Record<QuestionId, Answer>>;
  others: number[];
};

export type Session = {
  v: 1;
  deviceId: string;
  firstName: string;
  answers: Partial<Record<QuestionId, Answer>>;
  others: number[];
  othersDone?: boolean;
  sealedAt?: number;
  partner?: PartnerData;
  createdAt: number;
};

const KEY = 'ourworld.session.v1';
const MAX_AGE_MS = 30 * 24 * 3600 * 1000;

export function randomId(bytes = 8): string {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
}

export function newSession(): Session {
  return { v: 1, deviceId: randomId(8), firstName: '', answers: {}, others: [], createdAt: Date.now() };
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (s.v !== 1 || Date.now() - s.createdAt > MAX_AGE_MS) { clearSession(); return null; }
    return s;
  } catch {
    return null;
  }
}

export function saveSession(s: Session): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode or storage full: keep going in memory */ }
}

export function clearSession(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** Partner answers may only be stored on a sealed session. The UI checks this too. */
export function withPartner(s: Session, partner: PartnerData): Session {
  if (!s.sealedAt) throw new Error('Seal your answers before scanning your partner’s code.');
  if (partner.deviceId === s.deviceId) throw new Error('That’s your own code. Scan the other phone.');
  return { ...s, partner };
}
