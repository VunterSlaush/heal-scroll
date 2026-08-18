import type { Topic } from '../entities/topic';

export interface TopicWithState extends Topic {
  enabled: boolean;
  /** Learned ranking weight nudged by votes, clamped to [0.2, 3]. */
  weight: number;
}

export interface TopicRepo {
  getTopics(): Promise<TopicWithState[]>;
  getEnabledTopics(): Promise<TopicWithState[]>;
  setEnabled(topicId: string, enabled: boolean): Promise<void>;
  adjustWeight(topicId: string, delta: number): Promise<void>;
  upsertTopics(topics: Topic[]): Promise<void>;
}
