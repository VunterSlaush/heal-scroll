import type { Card, EmbeddingRepo } from '@heal-scroll/core';
import { meanVector } from '@heal-scroll/core';
import { and, desc, eq, inArray, isNotNull, ne, or, isNull, sql } from 'drizzle-orm';
import { itemEmbeddings, items, userItems } from './schema';
import type { Database } from './sqlite-card-repo';
import { decodeVector, encodeVector, toDriverBlob } from './vector-codec';

/** Drizzle types blobs as Buffer; the runtime accepts Uint8Array on both drivers. */
type VectorBlob = (typeof itemEmbeddings.$inferInsert)['vector'];

export class SqliteEmbeddingRepo implements EmbeddingRepo {
  constructor(private readonly db: Database) {}

  async setEmbeddings(
    model: string,
    entries: ReadonlyArray<{ itemId: string; vector: Float32Array }>,
  ): Promise<void> {
    if (entries.length === 0) return;
    const now = new Date();
    for (const entry of entries) {
      const row = {
        itemId: entry.itemId,
        model,
        dim: entry.vector.length,
        vector: toDriverBlob(encodeVector(entry.vector)) as VectorBlob,
        createdAt: now,
      };
      await this.db
        .insert(itemEmbeddings)
        .values(row)
        .onConflictDoUpdate({
          target: itemEmbeddings.itemId,
          set: { model: row.model, dim: row.dim, vector: row.vector, createdAt: row.createdAt },
        });
    }
  }

  async getEmbeddings(model: string, itemIds: string[]): Promise<Map<string, Float32Array>> {
    const out = new Map<string, Float32Array>();
    if (itemIds.length === 0) return out;
    const rows = await this.db
      .select()
      .from(itemEmbeddings)
      .where(and(eq(itemEmbeddings.model, model), inArray(itemEmbeddings.itemId, itemIds)));
    for (const row of rows) out.set(row.itemId, decodeVector(row.vector, row.dim));
    return out;
  }

  async getRecentSeenVectors(model: string, limit: number): Promise<Float32Array[]> {
    const rows = await this.db
      .select({ vector: itemEmbeddings.vector, dim: itemEmbeddings.dim })
      .from(userItems)
      .innerJoin(itemEmbeddings, eq(itemEmbeddings.itemId, userItems.itemId))
      .where(and(isNotNull(userItems.seenAt), eq(itemEmbeddings.model, model)))
      .orderBy(desc(userItems.seenAt))
      .limit(limit);
    return rows.map((row) => decodeVector(row.vector, row.dim));
  }

  async getCardsMissingEmbedding(
    model: string,
    limit: number,
  ): Promise<Array<Pick<Card, 'id' | 'title' | 'body' | 'topicId'>>> {
    return this.db
      .select({ id: items.id, title: items.title, body: items.body, topicId: items.topicId })
      .from(items)
      .leftJoin(itemEmbeddings, eq(itemEmbeddings.itemId, items.id))
      .where(or(isNull(itemEmbeddings.itemId), ne(itemEmbeddings.model, model)))
      .orderBy(desc(items.createdAt))
      .limit(limit);
  }

  async pruneOtherModels(model: string): Promise<number> {
    const rows = await this.db
      .delete(itemEmbeddings)
      .where(ne(itemEmbeddings.model, model))
      .returning({ itemId: itemEmbeddings.itemId });
    return rows.length;
  }

  async getTopicCentroid(
    model: string,
    topicId: string,
    limit: number,
  ): Promise<Float32Array | undefined> {
    const rows = await this.db
      .select({ vector: itemEmbeddings.vector, dim: itemEmbeddings.dim })
      .from(itemEmbeddings)
      .innerJoin(items, eq(items.id, itemEmbeddings.itemId))
      .where(and(eq(itemEmbeddings.model, model), eq(items.topicId, topicId)))
      .orderBy(desc(sql`${itemEmbeddings.createdAt}`))
      .limit(limit);
    return meanVector(rows.map((row) => decodeVector(row.vector, row.dim)));
  }
}
