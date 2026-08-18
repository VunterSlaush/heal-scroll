import type {
  SessionStats,
  SourceSeriesStats,
  SourceVoteStats,
  TopicReadingStats,
  TopicRecallStats,
} from '../entities/insights';

/** Aggregate queries implemented in packages/data (SQL-side, PLAN §2e). */
export interface InsightsPort {
  cardsPerTopic(sinceDays: number | null, now: Date): Promise<TopicReadingStats[]>;
  recallStats(sinceDays: number | null, now: Date): Promise<TopicRecallStats[]>;
  seriesCompletion(): Promise<SourceSeriesStats[]>;
  voteProfile(): Promise<SourceVoteStats[]>;
  sessionStats(sinceDays: number, now: Date): Promise<SessionStats>;
  /** Cards seen in the window grouped by source, for "top source". */
  cardsPerSource(sinceDays: number, now: Date): Promise<Array<{ sourceId: string; seen: number }>>;
  seriesFinished(sinceDays: number, now: Date): Promise<number>;
}
