import type { Card } from '../entities/card';
import type { CardRepo } from '../ports/card-repo';

/**
 * Milestone 1: a session is simply the next `n` unseen cards for the chosen
 * topics. Ranking, diversity constraints and series slots arrive later.
 */
export async function buildSession(
  repo: CardRepo,
  topicIds: string[],
  n: number,
): Promise<Card[]> {
  if (n <= 0 || topicIds.length === 0) return [];
  const cards = await repo.getUnseenCards(topicIds, n);
  return cards.slice(0, n);
}
