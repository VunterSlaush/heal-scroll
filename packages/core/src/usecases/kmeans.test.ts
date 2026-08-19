import { describe, expect, it } from 'vitest';
import { cosineSimilarity, normalize } from '../entities/vector';
import { chooseK, kMeans } from './kmeans';

const vec = (...values: number[]) => Float32Array.from(values);

/** Two tight clusters around the x and y axes. */
function twoClusters(): Float32Array[] {
  return [
    vec(1, 0.05, 0),
    vec(1, -0.05, 0),
    vec(1, 0, 0.05),
    vec(0.05, 1, 0),
    vec(-0.05, 1, 0),
    vec(0, 1, 0.05),
  ].map(normalize);
}

describe('chooseK', () => {
  it('clamps to the 3–6 band and never exceeds n', () => {
    expect(chooseK(0)).toBe(0);
    expect(chooseK(2)).toBe(2);
    expect(chooseK(10)).toBe(3);
    expect(chooseK(100)).toBe(5);
    expect(chooseK(10_000)).toBe(6);
  });
});

describe('kMeans', () => {
  it('is deterministic across runs with the same seed', () => {
    const vectors = twoClusters();
    const weights = vectors.map(() => 1);
    const a = kMeans(vectors, weights, 2, { seed: 7 });
    const b = kMeans(vectors, weights, 2, { seed: 7 });
    expect(a.map((c) => [...c])).toEqual(b.map((c) => [...c]));
  });

  it('finds the two obvious clusters', () => {
    const vectors = twoClusters();
    const centroids = kMeans(vectors, vectors.map(() => 1), 2);
    expect(centroids).toHaveLength(2);
    const x = normalize(vec(1, 0, 0));
    const y = normalize(vec(0, 1, 0));
    const simsToX = centroids.map((c) => cosineSimilarity(c, x));
    const simsToY = centroids.map((c) => cosineSimilarity(c, y));
    expect(Math.max(...simsToX)).toBeGreaterThan(0.99);
    expect(Math.max(...simsToY)).toBeGreaterThan(0.99);
  });

  it('returns normalized inputs when k >= n and empty for degenerate input', () => {
    const vectors = [vec(2, 0), vec(0, 2)];
    const centroids = kMeans(vectors, [1, 1], 5);
    expect(centroids).toHaveLength(2);
    expect(centroids[0]?.[0]).toBeCloseTo(1);
    expect(kMeans([], [], 3)).toEqual([]);
    expect(kMeans(vectors, [1, 1], 0)).toEqual([]);
  });

  it('lets weights pull a centroid toward the heavier member', () => {
    // One cluster of two same-direction-ish vectors with very unequal weights.
    const heavy = normalize(vec(1, 0.3));
    const light = normalize(vec(1, -0.3));
    const [centroid] = kMeans([heavy, light], [10, 0.1], 1);
    expect(centroid).toBeDefined();
    if (!centroid) return;
    expect(cosineSimilarity(centroid, heavy)).toBeGreaterThan(cosineSimilarity(centroid, light));
  });
});
