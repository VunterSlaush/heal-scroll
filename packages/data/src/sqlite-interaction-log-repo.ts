import type { InteractionEvent, InteractionLogRepo, SignalType } from '@heal-scroll/core';
import { asc, count, gte, inArray } from 'drizzle-orm';
import { interactionLog } from './schema';
import type { Database } from './sqlite-card-repo';

export class SqliteInteractionLogRepo implements InteractionLogRepo {
  constructor(private readonly db: Database) {}

  async log(events: InteractionEvent[]): Promise<void> {
    if (events.length === 0) return;
    await this.db.insert(interactionLog).values(
      events.map((e) => ({
        itemId: e.itemId,
        type: e.type,
        value: e.value ?? null,
        at: e.at,
      })),
    );
  }

  async getEvents(since: Date | undefined, limit?: number): Promise<InteractionEvent[]> {
    const base = this.db
      .select()
      .from(interactionLog)
      .orderBy(asc(interactionLog.at), asc(interactionLog.id));
    const filtered = since ? base.where(gte(interactionLog.at, since)) : base;
    const rows = await (limit === undefined ? filtered : filtered.limit(limit));
    return rows.map((row) => {
      const event: InteractionEvent = {
        itemId: row.itemId,
        type: row.type as SignalType,
        at: row.at,
      };
      if (row.value !== null) event.value = row.value;
      return event;
    });
  }

  async countByTypes(types: SignalType[]): Promise<number> {
    if (types.length === 0) return 0;
    const rows = await this.db
      .select({ n: count() })
      .from(interactionLog)
      .where(inArray(interactionLog.type, types));
    return rows[0]?.n ?? 0;
  }
}
