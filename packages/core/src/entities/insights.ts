/** Local-only analytics (PLAN §2e). All computed on device, framed neutrally. */

export interface TopicReadingStats {
  topicId: string;
  seen: number;
  saved: number;
}

export interface TopicRecallStats {
  topicId: string;
  shown: number;
  remembered: number;
}

export interface SourceSeriesStats {
  sourceId: string;
  started: number;
  completed: number;
}

export interface SourceVoteStats {
  sourceId: string;
  up: number;
  down: number;
}

export interface SessionStats {
  sessions: number;
  averageCardsPerSession: number;
  averageMinutesPerSession: number;
  cooldownRespectedRate: number | null;
}

export interface Insights {
  last7Days: TopicReadingStats[];
  last30Days: TopicReadingStats[];
  allTime: TopicReadingStats[];
  recall: TopicRecallStats[];
  series: SourceSeriesStats[];
  votes: SourceVoteStats[];
  sessions: SessionStats;
}

export interface WeeklyStats {
  cardsRead: number;
  topicsCovered: number;
  topSourceId?: string;
  seriesFinished: number;
  /** 0..1, null when no recall cards were shown. */
  recallRate: number | null;
}
