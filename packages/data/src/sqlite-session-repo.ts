import type { SessionRecord, SessionRepo } from '@heal-scroll/core';
import { desc, eq, isNotNull, sql } from 'drizzle-orm';
import { sessions } from './schema';
import type { Database } from './sqlite-card-repo';

export class SqliteSessionRepo implements SessionRepo {
  constructor(private readonly db: Database) {}

  async startSession(at: Date, plannedCount: number): Promise<number> {
    const rows = await this.db
      .insert(sessions)
      .values({ startedAt: at, plannedCount })
      .returning({ id: sessions.id });
    const id = rows[0]?.id;
    if (id === undefined) throw new Error('failed to create session row');
    return id;
  }

  async finishSession(sessionId: number, at: Date, seenCount: number): Promise<void> {
    await this.db
      .update(sessions)
      .set({
        endedAt: at,
        seenCount,
        // Respected until an attempt during the cooldown says otherwise.
        respectedCooldown: sql`coalesce(${sessions.respectedCooldown}, 1)`,
      })
      .where(eq(sessions.id, sessionId));
  }

  async markCooldownAttempt(sessionId: number): Promise<void> {
    await this.db
      .update(sessions)
      .set({ respectedCooldown: false })
      .where(eq(sessions.id, sessionId));
  }

  async getLastFinished(): Promise<SessionRecord | undefined> {
    const rows = await this.db
      .select()
      .from(sessions)
      .where(isNotNull(sessions.endedAt))
      .orderBy(desc(sessions.endedAt))
      .limit(1);
    const row = rows[0];
    if (!row) return undefined;
    const record: SessionRecord = {
      id: row.id,
      startedAt: row.startedAt,
      plannedCount: row.plannedCount,
      seenCount: row.seenCount,
    };
    if (row.endedAt) record.endedAt = row.endedAt;
    if (row.respectedCooldown !== null) record.respectedCooldown = row.respectedCooldown;
    return record;
  }
}
