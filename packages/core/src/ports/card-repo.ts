import type { Card } from '../entities/card';

export interface RecallWindow {
  /** Seen at least this many days ago. */
  minDays: number;
  /** Seen at most this many days ago. */
  maxDays: number;
}

/** Implemented by packages/data. Core never knows about SQLite or drizzle. */
export interface CardRepo {
  /** Store cards, skipping ones already present (dedupe by `hash`). Returns how many were new. */
  upsertCards(cards: Card[]): Promise<number>;
  /** Unseen cards for the given topics, newest first. */
  getUnseenCards(topicIds: string[], limit: number): Promise<Card[]>;
  countUnseen(topicIds: string[]): Promise<number>;
  markSeen(cardIds: string[], seenAt: Date): Promise<void>;
  getCards(cardIds: string[]): Promise<Card[]>;

  /** Removes a deleted topic's pure-buffer cards; seen/saved/collected ones survive. */
  purgeTopicCards(topicId: string): Promise<void>;
  setSaved(cardId: string, saved: boolean, at: Date): Promise<void>;
  setVote(cardId: string, vote: -1 | 0 | 1): Promise<void>;
  getSavedCards(): Promise<Card[]>;

  /** High-quality seen cards older than `olderThanDays`, for the "revisit" fallback tier. */
  getRevisitCandidates(topicIds: string[], olderThanDays: number, limit: number, now: Date): Promise<Card[]>;
  /**
   * Saved or upvoted cards seen within the recall window and not shown as a
   * recall card in the last `maxDays`, oldest seen first (PLAN §2d).
   */
  getRecallCandidates(window: RecallWindow, now: Date): Promise<Card[]>;
}
