// The 12 questions for a game: the tier's fixed set, in order (PRD changes v3, R1).
// Both phones get the same set: the invite carries the tier and the ids.
import { setFor, type Tier } from '../../data/bank';

export function selectQuestions(_gameId: string, tier: Tier): number[] {
  return setFor(tier);
}
