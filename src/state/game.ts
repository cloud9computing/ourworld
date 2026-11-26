// One game, kept on this phone only (PRD v2 rules 1 and 4).
import { LIST_MAX, type Tier } from '../data/bank';
import type { Answer, Answers } from '../lib/swap/codec';

export type Game = {
  v: 2;
  gameId: string;
  /** 0 started the game, 1 joined by invite. */
  role: 0 | 1;
  myName: string;
  partnerName: string;
  tier: Tier;
  questions: number[];
  answers: Record<number, Answer>;
  together: number[];
  lived: number[];
  listsDone?: { together?: boolean; lived?: boolean };
  /** The starter tapped "Tara's in. Start". */
  started?: boolean;
  sealedAt?: number;
  partner?: { answers: Record<number, Answer>; together: number[]; lived: number[] };
  revealDone?: boolean;
  createdAt: number;
};

const KEY = 'ourworld.game.v2';
const OLD_KEYS = ['ourworld.session.v1'];

export function randomHex(bytes: number): string {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
}

export function loadGame(): Game | null {
  try {
    for (const k of OLD_KEYS) localStorage.removeItem(k);
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const g = JSON.parse(raw) as Game;
    return g.v === 2 ? g : null;
  } catch {
    return null;
  }
}

export function saveGame(g: Game): void {
  try { localStorage.setItem(KEY, JSON.stringify(g)); } catch { /* private mode: keep going in memory */ }
}

export function clearGame(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** This phone's answers in game order, as the answer code carries them. */
export function myAnswers(g: Game): Answers {
  return {
    gameId: g.gameId, role: g.role,
    answers: g.questions.map(q => g.answers[q] ?? { status: 'skipped' }),
    together: g.together.slice(0, LIST_MAX), lived: g.lived.slice(0, LIST_MAX),
  };
}

/**
 * Store the partner's answers. Only allowed once this phone has sealed (rule 1),
 * and only for the same game and the other role.
 */
export function withPartner(g: Game, a: Answers): Game {
  if (!g.sealedAt) throw new Error('Seal your own answers first, then scan again. Nothing was saved.');
  if (a.gameId !== g.gameId) throw new Error('This code is from a different game.');
  if (a.role === g.role) throw new Error('That’s your own code. Scan the other phone.');
  if (a.answers.length !== g.questions.length) throw new Error('This code is from a different game.');
  const answers: Record<number, Answer> = {};
  g.questions.forEach((q, i) => { answers[q] = a.answers[i]; });
  return { ...g, partner: { answers, together: a.together, lived: a.lived } };
}
