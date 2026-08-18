import type { Card } from '../entities/card';
import type { CardRepo } from '../ports/card-repo';
import type { TopicRepo } from '../ports/topic-repo';
import type { TopicSourceRepo } from '../ports/topic-source-repo';

/** Small learning rate so a single vote nudges rather than flips the ranking (PLAN §2). */
export const VOTE_LEARNING_RATE = 0.05;

export interface ApplyVoteDeps {
  cardRepo: CardRepo;
  topicRepo: TopicRepo;
  topicSourceRepo: TopicSourceRepo;
}

export async function applyVote(deps: ApplyVoteDeps, card: Card, vote: -1 | 0 | 1): Promise<void> {
  await deps.cardRepo.setVote(card.id, vote);
  if (vote === 0) return;
  const delta = vote * VOTE_LEARNING_RATE;
  await deps.topicRepo.adjustWeight(card.topicId, delta);
  await deps.topicSourceRepo.adjustWeight(card.topicId, card.sourceId, delta);
}
