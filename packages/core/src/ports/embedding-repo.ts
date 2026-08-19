import type { Card } from '../entities/card';

/**
 * Storage for per-item embedding vectors, keyed by item and embedder model.
 * Vectors from different models are never mixed in one computation.
 */
export interface EmbeddingRepo {
  setEmbeddings(
    model: string,
    entries: ReadonlyArray<{ itemId: string; vector: Float32Array }>,
  ): Promise<void>;
  /** Only items that have a vector for `model` appear in the result. */
  getEmbeddings(model: string, itemIds: string[]): Promise<Map<string, Float32Array>>;
  /** Vectors of the most recently seen items, newest first (novelty window). */
  getRecentSeenVectors(model: string, limit: number): Promise<Float32Array[]>;
  /** Cards lacking a vector for `model`, newest first (embed-at-ingest backfill). */
  getCardsMissingEmbedding(
    model: string,
    limit: number,
  ): Promise<Array<Pick<Card, 'id' | 'title' | 'body' | 'topicId'>>>;
  /** Deletes vectors written by any other model (provider switch). Returns rows removed. */
  pruneOtherModels(model: string): Promise<number>;
  /** Mean vector over up to `limit` embedded items of a topic (cold start). */
  getTopicCentroid(model: string, topicId: string, limit: number): Promise<Float32Array | undefined>;
}
