/** Static declaration every source ships with (PLAN §2, fetch strategy). */
export interface SourceConfig {
  userAgent: string;
  rateLimitPerMinute: number;
  /** How long fetched cards stay fresh in the cache. */
  ttlHours: number;
  /** Editorial quality prior, 0..1 — a ranking input in later milestones. */
  quality: number;
  /** Topics this source can serve. */
  topicIds: string[];
  /** True when the source can serve ANY topic via `topic.query` (search-shaped APIs). */
  dynamicTopics?: boolean;
}

export interface Source {
  id: string;
  name: string;
  config: SourceConfig;
}
