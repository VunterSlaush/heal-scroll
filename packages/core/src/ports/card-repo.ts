import type { Card } from '../entities/card';

/** Implemented by packages/data. Core never knows about SQLite or drizzle. */
export interface CardRepo {
  /** Store cards, skipping ones already present (dedupe by `hash`). Returns how many were new. */
  upsertCards(cards: Card[]): Promise<number>;
  /** Unseen cards for the given topics, newest first. */
  getUnseenCards(topicIds: string[], limit: number): Promise<Card[]>;
  markSeen(cardIds: string[], seenAt: Date): Promise<void>;
}
