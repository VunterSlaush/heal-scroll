import type { Card } from '../entities/card';
import type { CardRepo, RecallWindow } from '../ports/card-repo';
import type { RecallRepo } from '../ports/recall-repo';

/** Spaced-repetition style window: saved/upvoted cards from 3–14 days ago (PLAN §2d). */
export const RECALL_WINDOW: RecallWindow = { minDays: 3, maxDays: 14 };

export async function pickRecallCard(cardRepo: CardRepo, now: Date): Promise<Card | undefined> {
  const candidates = await cardRepo.getRecallCandidates(RECALL_WINDOW, now);
  return candidates[0];
}

/** The only quiz-like interaction: "yes I remember" / "show me again". */
export async function recordRecall(
  recallRepo: RecallRepo,
  cardId: string,
  remembered: boolean,
  now: Date,
): Promise<void> {
  await recallRepo.logRecall(cardId, now, remembered);
}
