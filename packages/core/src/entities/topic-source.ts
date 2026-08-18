/** Learned per-(topic, source) state: user weight and fetch health. */
export interface TopicSourceState {
  topicId: string;
  sourceId: string;
  enabled: boolean;
  /** Learned multiplier nudged by votes, clamped to [0.2, 3]. */
  weight: number;
  /** Consecutive fetch failures; >= 3 means unhealthy (auto-skip). */
  consecutiveFailures: number;
  lastFetchedAt?: Date;
}

export const MAX_CONSECUTIVE_FAILURES = 3;

export function isHealthy(state: TopicSourceState | undefined): boolean {
  if (!state) return true;
  return state.enabled && state.consecutiveFailures < MAX_CONSECUTIVE_FAILURES;
}
