export type BadgeLevel = 'explorer' | 'reader' | 'curious' | 'nerd';

/** Cumulative thresholds per topic: unique cards read + recall successes (PLAN §2d). */
export const BADGE_LEVELS: Array<{ level: BadgeLevel; read: number; recalled: number }> = [
  { level: 'explorer', read: 10, recalled: 0 },
  { level: 'reader', read: 40, recalled: 3 },
  { level: 'curious', read: 120, recalled: 10 },
  { level: 'nerd', read: 300, recalled: 30 },
];

export interface TopicBadge {
  topicId: string;
  level?: BadgeLevel;
  cardsRead: number;
  recallSuccesses: number;
  /** Next level and how far along the user is, for a quiet progress bar. */
  next?: { level: BadgeLevel; read: number; recalled: number };
}
