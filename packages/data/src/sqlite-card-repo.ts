import type { Card, CardRepo, RecallWindow, Topic } from '@heal-scroll/core';
import { and, desc, eq, gt, gte, inArray, isNull, lt, lte, notInArray, or, sql } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import * as schema from './schema';
import { collectionItems, items, recallLog, topics, userItems } from './schema';

/**
 * Any drizzle SQLite database over our schema: expo-sqlite in the app,
 * better-sqlite3 in tests. The run-result generics differ per driver,
 * hence the `any`s.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = BaseSQLiteDatabase<any, any, typeof schema>;

type ItemRow = typeof items.$inferSelect;

const DAY_MS = 86_400_000;

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
    seriesId: card.seriesId ?? null,
    seriesIndex: card.seriesIndex ?? null,
    seriesCount: card.seriesCount ?? null,
    popularity: card.popularity ?? null,
  };
}

export function rowToCard(row: ItemRow): Card {
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
  if (row.seriesId) card.seriesId = row.seriesId;
  if (row.seriesIndex !== null) card.seriesIndex = row.seriesIndex;
  if (row.seriesCount !== null) card.seriesCount = row.seriesCount;
  if (row.popularity !== null) card.popularity = row.popularity;
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

  async countUnseen(topicIds: string[]): Promise<number> {
    if (topicIds.length === 0) return 0;
    const rows = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(items)
      .leftJoin(userItems, eq(userItems.itemId, items.id))
      .where(and(inArray(items.topicId, topicIds), isNull(userItems.seenAt)));
    return rows[0]?.count ?? 0;
  }

  async markSeen(cardIds: string[], seenAt: Date): Promise<void> {
    if (cardIds.length === 0) return;
    await this.db
      .insert(userItems)
      .values(cardIds.map((itemId) => ({ itemId, seenAt })))
      .onConflictDoUpdate({ target: userItems.itemId, set: { seenAt } });
  }

  async getCards(cardIds: string[]): Promise<Card[]> {
    if (cardIds.length === 0) return [];
    const rows = await this.db.select().from(items).where(inArray(items.id, cardIds));
    return rows.map(rowToCard);
  }

  async purgeTopicCards(topicId: string): Promise<void> {
    // Only untouched buffer cards go; anything seen/voted/saved/collected stays.
    await this.db.delete(items).where(
      and(
        eq(items.topicId, topicId),
        notInArray(items.id, this.db.select({ id: userItems.itemId }).from(userItems)),
        notInArray(items.id, this.db.select({ id: collectionItems.itemId }).from(collectionItems)),
      ),
    );
  }

  async setSaved(cardId: string, saved: boolean, at: Date): Promise<void> {
    const savedAt = saved ? at : null;
    await this.db
      .insert(userItems)
      .values({ itemId: cardId, saved, savedAt })
      .onConflictDoUpdate({ target: userItems.itemId, set: { saved, savedAt } });
  }

  async setVote(cardId: string, vote: -1 | 0 | 1): Promise<void> {
    await this.db
      .insert(userItems)
      .values({ itemId: cardId, vote })
      .onConflictDoUpdate({ target: userItems.itemId, set: { vote } });
  }

  async getSavedCards(): Promise<Card[]> {
    const rows = await this.db
      .select({ item: items })
      .from(items)
      .innerJoin(userItems, eq(userItems.itemId, items.id))
      .where(eq(userItems.saved, true))
      .orderBy(desc(userItems.savedAt));
    return rows.map((row) => rowToCard(row.item));
  }

  async getRevisitCandidates(
    topicIds: string[],
    olderThanDays: number,
    limit: number,
    now: Date,
  ): Promise<Card[]> {
    if (topicIds.length === 0 || limit <= 0) return [];
    const cutoff = new Date(now.getTime() - olderThanDays * DAY_MS);
    const rows = await this.db
      .select({ item: items })
      .from(items)
      .innerJoin(userItems, eq(userItems.itemId, items.id))
      .where(
        and(
          inArray(items.topicId, topicIds),
          lt(userItems.seenAt, cutoff),
          gte(userItems.vote, 0), // high quality: never downvoted
        ),
      )
      .orderBy(desc(userItems.vote), userItems.seenAt)
      .limit(limit);
    return rows.map((row) => rowToCard(row.item));
  }

  async getRecallCandidates(window: RecallWindow, now: Date): Promise<Card[]> {
    const newest = new Date(now.getTime() - window.minDays * DAY_MS);
    const oldest = new Date(now.getTime() - window.maxDays * DAY_MS);
    const recentlyRecalled = this.db
      .select({ itemId: recallLog.itemId })
      .from(recallLog)
      .where(gt(recallLog.shownAt, oldest));
    const rows = await this.db
      .select({ item: items })
      .from(items)
      .innerJoin(userItems, eq(userItems.itemId, items.id))
      .where(
        and(
          or(eq(userItems.saved, true), gt(userItems.vote, 0)),
          gte(userItems.seenAt, oldest),
          lte(userItems.seenAt, newest),
          notInArray(items.id, recentlyRecalled),
        ),
      )
      .orderBy(userItems.seenAt, items.id);
    return rows.map((row) => rowToCard(row.item));
  }
}

/** Idempotent topic seeding, called from the app's composition root. */
export async function seedTopics(db: Database, topicList: Topic[]): Promise<void> {
  if (topicList.length === 0) return;
  await db.insert(topics).values(topicList).onConflictDoNothing();
}
