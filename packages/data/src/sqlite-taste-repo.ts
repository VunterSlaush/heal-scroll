import type { TasteCentroid, TasteCentroidKind, TasteRepo } from '@heal-scroll/core';
import { and, eq, inArray } from 'drizzle-orm';
import { tasteCentroids } from './schema';
import type { Database } from './sqlite-card-repo';
import { decodeVector, encodeVector, toDriverBlob } from './vector-codec';

/** Drizzle types blobs as Buffer; the runtime accepts Uint8Array on both drivers. */
type VectorBlob = (typeof tasteCentroids.$inferInsert)['vector'];

export class SqliteTasteRepo implements TasteRepo {
  constructor(private readonly db: Database) {}

  async getCentroids(model: string): Promise<TasteCentroid[]> {
    const rows = await this.db
      .select()
      .from(tasteCentroids)
      .where(eq(tasteCentroids.model, model));
    return rows.map((row) => {
      const centroid: TasteCentroid = {
        id: row.id,
        kind: row.kind as TasteCentroidKind,
        model: row.model,
        vector: decodeVector(row.vector, row.dim),
        weight: row.weight,
        updatedAt: row.updatedAt,
      };
      if (row.topicId !== null) centroid.topicId = row.topicId;
      if (row.label !== null) centroid.label = row.label;
      return centroid;
    });
  }

  async upsertCentroids(centroids: TasteCentroid[]): Promise<void> {
    for (const c of centroids) {
      const row = {
        id: c.id,
        kind: c.kind,
        topicId: c.topicId ?? null,
        model: c.model,
        dim: c.vector.length,
        vector: toDriverBlob(encodeVector(c.vector)) as VectorBlob,
        weight: c.weight,
        label: c.label ?? null,
        updatedAt: c.updatedAt,
      };
      await this.db
        .insert(tasteCentroids)
        .values(row)
        .onConflictDoUpdate({ target: tasteCentroids.id, set: row });
    }
  }

  async replaceCentroids(
    model: string,
    kinds: TasteCentroidKind[],
    next: TasteCentroid[],
  ): Promise<void> {
    // Delete + insert back-to-back on the single local connection; a crash in
    // between only costs centroids, which are always rebuildable from the log.
    if (kinds.length > 0) {
      await this.db
        .delete(tasteCentroids)
        .where(and(eq(tasteCentroids.model, model), inArray(tasteCentroids.kind, kinds)));
    }
    await this.upsertCentroids(next);
  }

  async deleteAll(): Promise<void> {
    await this.db.delete(tasteCentroids);
  }
}
