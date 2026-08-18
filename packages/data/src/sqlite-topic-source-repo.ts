import type { TopicSourceRepo, TopicSourceState } from '@heal-scroll/core';
import { inArray, sql } from 'drizzle-orm';
import { fetchLog, topicSources } from './schema';
import type { Database } from './sqlite-card-repo';

const WEIGHT_FLOOR = 0.2;
const WEIGHT_CEILING = 3;

export class SqliteTopicSourceRepo implements TopicSourceRepo {
  constructor(private readonly db: Database) {}

  async getStates(topicIds: string[]): Promise<TopicSourceState[]> {
    if (topicIds.length === 0) return [];
    const rows = await this.db
      .select()
      .from(topicSources)
      .where(inArray(topicSources.topicId, topicIds));
    return rows.map((row) => {
      const state: TopicSourceState = {
        topicId: row.topicId,
        sourceId: row.sourceId,
        enabled: row.enabled,
        weight: row.weight,
        consecutiveFailures: row.consecutiveFailures,
      };
      if (row.lastFetchedAt) state.lastFetchedAt = row.lastFetchedAt;
      return state;
    });
  }

  async setEnabled(topicId: string, sourceId: string, enabled: boolean): Promise<void> {
    await this.db
      .insert(topicSources)
      .values({ topicId, sourceId, enabled })
      .onConflictDoUpdate({
        target: [topicSources.topicId, topicSources.sourceId],
        set: { enabled },
      });
  }

  async adjustWeight(topicId: string, sourceId: string, delta: number): Promise<void> {
    await this.db
      .insert(topicSources)
      .values({ topicId, sourceId, weight: clamp(1 + delta) })
      .onConflictDoUpdate({
        target: [topicSources.topicId, topicSources.sourceId],
        set: {
          weight: sql`max(${WEIGHT_FLOOR}, min(${WEIGHT_CEILING}, ${topicSources.weight} + ${delta}))`,
        },
      });
  }

  async recordFetchResult(result: {
    topicId: string;
    sourceId: string;
    ok: boolean;
    cardCount: number;
    error?: string;
    at: Date;
  }): Promise<void> {
    await this.db.insert(fetchLog).values({
      topicId: result.topicId,
      sourceId: result.sourceId,
      fetchedAt: result.at,
      ok: result.ok,
      cardCount: result.cardCount,
      error: result.error ?? null,
    });
    await this.db
      .insert(topicSources)
      .values({
        topicId: result.topicId,
        sourceId: result.sourceId,
        consecutiveFailures: result.ok ? 0 : 1,
        lastFetchedAt: result.at,
      })
      .onConflictDoUpdate({
        target: [topicSources.topicId, topicSources.sourceId],
        set: {
          consecutiveFailures: result.ok ? 0 : sql`${topicSources.consecutiveFailures} + 1`,
          lastFetchedAt: result.at,
        },
      });
  }
}

function clamp(weight: number): number {
  return Math.max(WEIGHT_FLOOR, Math.min(WEIGHT_CEILING, weight));
}

/** Convenience for the settings screen: state lookup with defaults for missing pairs. */
export function stateFor(
  states: TopicSourceState[],
  topicId: string,
  sourceId: string,
): TopicSourceState {
  return (
    states.find((s) => s.topicId === topicId && s.sourceId === sourceId) ?? {
      topicId,
      sourceId,
      enabled: true,
      weight: 1,
      consecutiveFailures: 0,
    }
  );
}
