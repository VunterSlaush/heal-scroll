export type { Card } from './entities/card';
export type { Topic } from './entities/topic';
export type { Source, SourceConfig } from './entities/source';
export type { Settings } from './entities/settings';
export { DEFAULT_SETTINGS, SESSION_SIZE_LIMITS } from './entities/settings';
export type { SessionItem, SessionRecord, SessionSummary } from './entities/session';
export type { TopicSourceState } from './entities/topic-source';
export { isHealthy, MAX_CONSECUTIVE_FAILURES } from './entities/topic-source';
export type { BadgeLevel, TopicBadge } from './entities/badge';
export { BADGE_LEVELS } from './entities/badge';
export type {
  Insights,
  SessionStats,
  SourceSeriesStats,
  SourceVoteStats,
  TopicReadingStats,
  TopicRecallStats,
  WeeklyStats,
} from './entities/insights';
export type { Collection } from './entities/collection';
export { isSubstantialCard } from './entities/card-quality';

export type { SourcePort } from './ports/source-port';
export type { CardRepo, RecallWindow } from './ports/card-repo';
export type { SettingsRepo } from './ports/settings-repo';
export type { TopicRepo, TopicWithState } from './ports/topic-repo';
export type { TopicSourceRepo } from './ports/topic-source-repo';
export type { SessionRepo } from './ports/session-repo';
export type { RecallRepo } from './ports/recall-repo';
export type { CollectionRepo } from './ports/collection-repo';
export type { InsightsPort } from './ports/insights-port';
export type { Clock } from './ports/clock';

export { buildSession, WEEKLY_SUMMARY_KEY } from './usecases/build-session.usecase';
export type { BuildSessionDeps, BuildSessionResult } from './usecases/build-session.usecase';
export { finishSession } from './usecases/finish-session.usecase';
export { getLockState } from './usecases/lock-state.usecase';
export type { LockState } from './usecases/lock-state.usecase';
export { freshnessDecay, rankCards, scoreCard } from './usecases/rank-cards.usecase';
export type { RankContext } from './usecases/rank-cards.usecase';
export { selectSessionCards } from './usecases/select-session-cards';
export { applyVote, VOTE_LEARNING_RATE } from './usecases/apply-vote.usecase';
export {
  refillBuffer,
  BUFFER_REFILL_THRESHOLD_SESSIONS,
  BUFFER_TARGET_SESSIONS,
} from './usecases/refill-buffer.usecase';
export { pickRecallCard, recordRecall, RECALL_WINDOW } from './usecases/pick-recall-card.usecase';
export { computeBadge, computeTopicBadges } from './usecases/compute-badges.usecase';
export { computeInsights } from './usecases/compute-insights.usecase';
export {
  buildWeeklySummaryText,
  computeWeeklyStats,
  shouldShowWeeklySummary,
} from './usecases/weekly-summary.usecase';
export { exportAsJson, exportAsMarkdown } from './usecases/export-data.usecase';
export type { ExportData } from './usecases/export-data.usecase';
