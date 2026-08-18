import type { RecallRepo } from '@heal-scroll/core';
import { recallLog } from './schema';
import type { Database } from './sqlite-card-repo';

export class SqliteRecallRepo implements RecallRepo {
  constructor(private readonly db: Database) {}

  async logRecall(itemId: string, shownAt: Date, remembered: boolean): Promise<void> {
    await this.db.insert(recallLog).values({ itemId, shownAt, remembered });
  }
}
