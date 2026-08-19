import type { TasteCentroid, TasteCentroidKind } from '../entities/taste';

/** Storage for the learned taste centroids (AI_ON_DEVICE_PLAN §10). */
export interface TasteRepo {
  getCentroids(model: string): Promise<TasteCentroid[]>;
  upsertCentroids(centroids: TasteCentroid[]): Promise<void>;
  /** Replaces all centroids of the given kinds (nightly recompute); redo-safe — the profile is rebuildable from the log. */
  replaceCentroids(
    model: string,
    kinds: TasteCentroidKind[],
    next: TasteCentroid[],
  ): Promise<void>;
  deleteAll(): Promise<void>;
}
