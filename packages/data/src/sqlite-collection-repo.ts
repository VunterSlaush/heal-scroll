import type { Card, Collection, CollectionRepo } from '@heal-scroll/core';
import { and, desc, eq, sql } from 'drizzle-orm';
import { collectionItems, collections, items } from './schema';
import type { Database, } from './sqlite-card-repo';
import { rowToCard } from './sqlite-card-repo';

export class SqliteCollectionRepo implements CollectionRepo {
  constructor(private readonly db: Database) {}

  async createCollection(name: string, at: Date): Promise<number> {
    const rows = await this.db
      .insert(collections)
      .values({ name, createdAt: at })
      .returning({ id: collections.id });
    const id = rows[0]?.id;
    if (id === undefined) throw new Error('failed to create collection');
    return id;
  }

  async deleteCollection(collectionId: number): Promise<void> {
    await this.db.delete(collectionItems).where(eq(collectionItems.collectionId, collectionId));
    await this.db.delete(collections).where(eq(collections.id, collectionId));
  }

  async listCollections(): Promise<Collection[]> {
    const rows = await this.db
      .select({
        id: collections.id,
        name: collections.name,
        createdAt: collections.createdAt,
        itemCount: sql<number>`(select count(*) from ${collectionItems} where ${collectionItems.collectionId} = ${collections.id})`,
      })
      .from(collections)
      .orderBy(desc(collections.createdAt));
    return rows;
  }

  async addItem(collectionId: number, cardId: string, at: Date): Promise<void> {
    await this.db
      .insert(collectionItems)
      .values({ collectionId, itemId: cardId, addedAt: at })
      .onConflictDoNothing();
  }

  async removeItem(collectionId: number, cardId: string): Promise<void> {
    await this.db
      .delete(collectionItems)
      .where(and(eq(collectionItems.collectionId, collectionId), eq(collectionItems.itemId, cardId)));
  }

  async getItems(collectionId: number): Promise<Card[]> {
    const rows = await this.db
      .select({ item: items })
      .from(collectionItems)
      .innerJoin(items, eq(items.id, collectionItems.itemId))
      .where(eq(collectionItems.collectionId, collectionId))
      .orderBy(collectionItems.addedAt);
    return rows.map((row) => rowToCard(row.item));
  }
}
