import type { Card } from '../entities/card';
import type { Source } from '../entities/source';
import type { Topic } from '../entities/topic';

/** Implemented by every adapter in packages/sources. Adapters never touch the DB. */
export interface SourcePort extends Source {
  /** Fetch up to `limit` cards for a topic. Returns [] when the source cannot serve the topic. */
  fetchCards(topic: Topic, limit: number): Promise<Card[]>;
}
