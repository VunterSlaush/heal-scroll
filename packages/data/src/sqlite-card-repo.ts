import type { Card, CardRepo, Topic } from '@heal-scroll/core';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import * as schema from './schema';
import { items, topics, userItems } from './schema';

/**
 * Any drizzle SQLite database over our schema: expo-sqlite in the app,
 * better-sqlite3 in tests. The run-result generics differ per driver,
 * hence the `any`s.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = BaseSQLiteDatabase<any, any, typeof schema>;

type ItemRow = typeof items.$inferSelect;

function cardToRow(card: Card, createdAt: Date): typeof items.$inferInsert {
  return {
    id: card.id,
    topicId: card.topicId,
    sourceId: card.sourceId,
    title: card.title,
    body: card.body,
    imageUrl: card.imageUrl ?? null,
    sourceName: card.sourceName,
    sourceUrl: card.sourceUrl,
    publishedAt: card.publishedAt ?? null,
    hash: card.hash,
    createdAt,
  };
}

function rowToCard(row: ItemRow): Card {
  const card: Card = {
    id: row.id,
    topicId: row.topicId,
    sourceId: row.sourceId,
    title: row.title,
    body: row.body,
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
    hash: row.hash,
  };
  if (row.imageUrl) card.imageUrl = row.imageUrl;
  if (row.publishedAt) card.publishedAt = row.publishedAt;
  return card;
}

export class SqliteCardRepo implements CardRepo {
  constructor(private readonly db: Database) {}

  async upsertCards(cards: Card[]): Promise<number> {
    if (cards.length === 0) return 0;

    const existing = await this.db
      .select({ hash: items.hash })
      .from(items)
      .where(inArray(items.hash, cards.map((c) => c.hash)));
    const knownHashes = new Set(existing.map((row) => row.hash));

    // Dedupe against the DB and within the batch itself.
    const freshByHash = new Map<string, Card>();
    for (const card of cards) {
      if (!knownHashes.has(card.hash) && !freshByHash.has(card.hash)) {
        freshByHash.set(card.hash, card);
      }
    }
    if (freshByHash.size === 0) return 0;

    const now = new Date();
    await this.db
      .insert(items)
      .values([...freshByHash.values()].map((card) => cardToRow(card, now)))
      .onConflictDoNothing();
    return freshByHash.size;
  }

  async getUnseenCards(topicIds: string[], limit: number): Promise<Card[]> {
    if (topicIds.length === 0 || limit <= 0) return [];
    const rows = await this.db
      .select({ item: items })
      .from(items)
      .leftJoin(userItems, eq(userItems.itemId, items.id))
      .where(and(inArray(items.topicId, topicIds), isNull(userItems.seenAt)))
      .orderBy(desc(items.createdAt), items.id)
      .limit(limit);
    return rows.map((row) => rowToCard(row.item));
  }

  async markSeen(cardIds: string[], seenAt: Date): Promise<void> {
    if (cardIds.length === 0) return;
    await this.db
      .insert(userItems)
      .values(cardIds.map((itemId) => ({ itemId, seenAt })))
      .onConflictDoUpdate({ target: userItems.itemId, set: { seenAt } });
  }
}

/** Idempotent topic seeding, called from the app's composition root. */
export async function seedTopics(db: Database, topicList: Topic[]): Promise<void> {
  if (topicList.length === 0) return;
  await db.insert(topics).values(topicList).onConflictDoNothing();
}
