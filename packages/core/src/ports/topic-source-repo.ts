import type { TopicSourceState } from '../entities/topic-source';

export interface TopicSourceRepo {
  /** States for the given topics; missing pairs mean "defaults" (enabled, weight 1, healthy). */
  getStates(topicIds: string[]): Promise<TopicSourceState[]>;
  setEnabled(topicId: string, sourceId: string, enabled: boolean): Promise<void>;
  adjustWeight(topicId: string, sourceId: string, delta: number): Promise<void>;
  /** Updates health (reset or increment consecutiveFailures) and appends to fetch_log. */
  recordFetchResult(result: {
    topicId: string;
    sourceId: string;
    ok: boolean;
    cardCount: number;
    error?: string;
    at: Date;
  }): Promise<void>;
}
