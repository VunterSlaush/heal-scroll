import type { SessionItem, SessionSummary } from '../entities/session';
import type { CardRepo } from '../ports/card-repo';
import type { Clock } from '../ports/clock';
import type { SessionRepo } from '../ports/session-repo';

export interface FinishSessionDeps {
  cardRepo: CardRepo;
  sessionRepo: SessionRepo;
  clock: Clock;
}

/**
 * Reaching the lock is what makes a session "count" (PLAN §2d): mark all
 * served cards seen, close the session record, and build the calm recap.
 */
export async function finishSession(
  deps: FinishSessionDeps,
  sessionId: number,
  items: SessionItem[],
): Promise<SessionSummary> {
  const now = deps.clock();
  const servedCards = items.flatMap((item) => (item.kind === 'summary' ? [] : [item.card]));
  const contentCards = items.flatMap((item) => (item.kind === 'card' ? [item.card] : []));

  await deps.cardRepo.markSeen(servedCards.map((c) => c.id), now);
  await deps.sessionRepo.finishSession(sessionId, now, servedCards.length);

  const savedIds = new Set((await deps.cardRepo.getSavedCards()).map((c) => c.id));
  const summary: SessionSummary = {
    cardsRead: contentCards.length,
    topicIds: [...new Set(contentCards.map((c) => c.topicId))],
  };
  const savedCard = contentCards.find((c) => savedIds.has(c.id));
  if (savedCard) summary.savedCard = savedCard;
  return summary;
}
