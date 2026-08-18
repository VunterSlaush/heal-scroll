import type { Topic, TopicRepo, TopicWithState } from '@heal-scroll/core';
import { eq, sql } from 'drizzle-orm';
import { topics } from './schema';
import type { Database } from './sqlite-card-repo';

const WEIGHT_FLOOR = 0.2;
const WEIGHT_CEILING = 3;

export class SqliteTopicRepo implements TopicRepo {
  constructor(private readonly db: Database) {}

  async getTopics(): Promise<TopicWithState[]> {
    return this.db.select().from(topics).orderBy(topics.name);
  }

  async getEnabledTopics(): Promise<TopicWithState[]> {
    return this.db.select().from(topics).where(eq(topics.enabled, true)).orderBy(topics.name);
  }

  async setEnabled(topicId: string, enabled: boolean): Promise<void> {
    await this.db.update(topics).set({ enabled }).where(eq(topics.id, topicId));
  }

  async adjustWeight(topicId: string, delta: number): Promise<void> {
    await this.db
      .update(topics)
      .set({
        weight: sql`max(${WEIGHT_FLOOR}, min(${WEIGHT_CEILING}, ${topics.weight} + ${delta}))`,
      })
      .where(eq(topics.id, topicId));
  }

  async upsertTopics(topicList: Topic[]): Promise<void> {
    if (topicList.length === 0) return;
    await this.db.insert(topics).values(topicList).onConflictDoNothing();
  }
}
