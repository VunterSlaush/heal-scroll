import type {
  InsightsPort,
  SessionStats,
  SourceSeriesStats,
  SourceVoteStats,
  TopicReadingStats,
  TopicRecallStats,
} from '@heal-scroll/core';
import { and, eq, gt, gte, isNotNull, ne, sql } from 'drizzle-orm';
import { items, recallLog, sessions, userItems } from './schema';
import type { Database } from './sqlite-card-repo';

const DAY_MS = 86_400_000;

function cutoff(sinceDays: number, now: Date): Date {
  return new Date(now.getTime() - sinceDays * DAY_MS);
}

/** All PLAN §2e aggregates, computed SQL-side on device. */
export class SqliteInsightsRepo implements InsightsPort {
  constructor(private readonly db: Database) {}

  async cardsPerTopic(sinceDays: number | null, now: Date): Promise<TopicReadingStats[]> {
    const seenFilter =
      sinceDays === null
        ? isNotNull(userItems.seenAt)
        : and(isNotNull(userItems.seenAt), gte(userItems.seenAt, cutoff(sinceDays, now)));
    return this.db
      .select({
        topicId: items.topicId,
        seen: sql<number>`count(*)`,
        saved: sql<number>`coalesce(sum(${userItems.saved}), 0)`,
      })
      .from(userItems)
      .innerJoin(items, eq(items.id, userItems.itemId))
      .where(seenFilter)
      .groupBy(items.topicId)
      .orderBy(sql`count(*) desc`);
  }

  async recallStats(sinceDays: number | null, now: Date): Promise<TopicRecallStats[]> {
    const filter = sinceDays === null ? undefined : gte(recallLog.shownAt, cutoff(sinceDays, now));
    return this.db
      .select({
        topicId: items.topicId,
        shown: sql<number>`count(*)`,
        remembered: sql<number>`coalesce(sum(${recallLog.remembered}), 0)`,
      })
      .from(recallLog)
      .innerJoin(items, eq(items.id, recallLog.itemId))
      .where(filter)
      .groupBy(items.topicId);
  }

  async seriesCompletion(): Promise<SourceSeriesStats[]> {
    const rows: Array<{ sourceId: string; started: number; completed: number }> = await this.db.all(sql`
      SELECT source_id AS sourceId,
             SUM(CASE WHEN seen_count > 0 THEN 1 ELSE 0 END) AS started,
             SUM(CASE WHEN seen_count = total_count THEN 1 ELSE 0 END) AS completed
      FROM (
        SELECT i.series_id, i.source_id,
               MAX(i.series_count) AS total_count,
               COUNT(u.seen_at) AS seen_count
        FROM items i
        LEFT JOIN user_items u ON u.item_id = i.id AND u.seen_at IS NOT NULL
        WHERE i.series_id IS NOT NULL
        GROUP BY i.series_id, i.source_id
      )
      GROUP BY source_id
    `);
    return rows;
  }

  async voteProfile(): Promise<SourceVoteStats[]> {
    return this.db
      .select({
        sourceId: items.sourceId,
        up: sql<number>`sum(case when ${userItems.vote} = 1 then 1 else 0 end)`,
        down: sql<number>`sum(case when ${userItems.vote} = -1 then 1 else 0 end)`,
      })
      .from(userItems)
      .innerJoin(items, eq(items.id, userItems.itemId))
      .where(ne(userItems.vote, 0))
      .groupBy(items.sourceId);
  }

  async sessionStats(sinceDays: number, now: Date): Promise<SessionStats> {
    const rows = await this.db
      .select({
        sessions: sql<number>`count(*)`,
        averageCards: sql<number>`coalesce(avg(${sessions.seenCount}), 0)`,
        averageMinutes: sql<number>`coalesce(avg((${sessions.endedAt} - ${sessions.startedAt}) / 60000.0), 0)`,
        respected: sql<number | null>`avg(${sessions.respectedCooldown})`,
      })
      .from(sessions)
      .where(and(isNotNull(sessions.endedAt), gte(sessions.startedAt, cutoff(sinceDays, now))));
    const row = rows[0];
    return {
      sessions: row?.sessions ?? 0,
      averageCardsPerSession: row?.averageCards ?? 0,
      averageMinutesPerSession: row?.averageMinutes ?? 0,
      cooldownRespectedRate: row?.respected ?? null,
    };
  }

  async cardsPerSource(sinceDays: number, now: Date): Promise<Array<{ sourceId: string; seen: number }>> {
    return this.db
      .select({ sourceId: items.sourceId, seen: sql<number>`count(*)` })
      .from(userItems)
      .innerJoin(items, eq(items.id, userItems.itemId))
      .where(and(isNotNull(userItems.seenAt), gte(userItems.seenAt, cutoff(sinceDays, now))))
      .groupBy(items.sourceId);
  }

  async seriesFinished(sinceDays: number, now: Date): Promise<number> {
    const rows: Array<{ finished: number }> = await this.db.all(sql`
      SELECT COUNT(*) AS finished FROM (
        SELECT i.series_id,
               MAX(i.series_count) AS total_count,
               COUNT(u.seen_at) AS seen_count,
               MAX(u.seen_at) AS last_seen
        FROM items i
        LEFT JOIN user_items u ON u.item_id = i.id AND u.seen_at IS NOT NULL
        WHERE i.series_id IS NOT NULL
        GROUP BY i.series_id
      )
      WHERE seen_count = total_count AND last_seen >= ${cutoff(sinceDays, now).getTime()}
    `);
    return rows[0]?.finished ?? 0;
  }
}
