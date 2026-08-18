import type { Card } from './card';

export interface SessionRecord {
  id: number;
  startedAt: Date;
  endedAt?: Date;
  plannedCount: number;
  seenCount: number;
  /** Whether the cooldown before this session was respected (discipline stat). */
  respectedCooldown?: boolean;
}

/** One entry in a built session, rendered by the feed. */
export type SessionItem =
  | { kind: 'card'; card: Card; revisit: boolean }
  | { kind: 'recall'; card: Card }
  | { kind: 'summary'; text: string };

/** Calm end-of-session recap (PLAN §2d). */
export interface SessionSummary {
  cardsRead: number;
  topicIds: string[];
  savedCard?: Card;
}
