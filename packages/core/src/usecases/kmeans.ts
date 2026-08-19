/**
 * Deterministic weighted k-means over unit vectors (cosine distance), used for
 * the multi-interest taste centroids (AI_ON_DEVICE_PLAN §10.2). Seeded so the
 * nightly recompute never shuffles the profile between identical runs.
 */
import { cosineSimilarity, meanVector, normalize } from '../entities/vector';

export interface KMeansOptions {
  maxIterations?: number;
  seed?: number;
}

const DEFAULT_MAX_ITERATIONS = 25;

/** k for n positive signals, clamped to 3–6 (fewer only when n is tiny). */
export function chooseK(n: number): number {
  if (n <= 0) return 0;
  const k = Math.floor(Math.sqrt(n / 8)) + 2;
  return Math.min(n, Math.max(3, Math.min(6, k)));
}

function makeRng(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

/** Weighted pick proportional to `scores`; assumes at least one positive score. */
function pickWeighted(scores: readonly number[], rng: () => number): number {
  let total = 0;
  for (const s of scores) total += s;
  if (total <= 0) return 0;
  let target = rng() * total;
  for (let i = 0; i < scores.length; i++) {
    target -= scores[i] ?? 0;
    if (target <= 0) return i;
  }
  return scores.length - 1;
}

/**
 * k-means++ init + Lloyd iterations under cosine distance. Weights scale each
 * vector's pull on its centroid (negative weights are treated as 0). Returns
 * unit-normalized centroids; k ≥ n returns the normalized inputs as-is.
 */
export function kMeans(
  vectors: readonly Float32Array[],
  weights: readonly number[],
  k: number,
  opts: KMeansOptions = {},
): Float32Array[] {
  const { maxIterations = DEFAULT_MAX_ITERATIONS, seed = 1 } = opts;
  const n = vectors.length;
  if (n === 0 || k <= 0) return [];
  if (k >= n) return vectors.map(normalize);

  const rng = makeRng(seed);
  const clampedWeights = vectors.map((_, i) => Math.max(weights[i] ?? 1, 0));

  const centroids: Float32Array[] = [];
  const first = vectors[Math.floor(rng() * n)];
  if (!first) return [];
  centroids.push(normalize(first));
  while (centroids.length < k) {
    // k-means++: sample proportional to squared distance from the nearest centroid.
    const scores = vectors.map((v, i) => {
      let nearest = Infinity;
      for (const c of centroids) nearest = Math.min(nearest, 1 - cosineSimilarity(v, c));
      return nearest * nearest * (clampedWeights[i] ?? 0);
    });
    const picked = vectors[pickWeighted(scores, rng)];
    if (!picked) break;
    centroids.push(normalize(picked));
  }

  const assignment = new Array<number>(n).fill(-1);
  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;
    for (let i = 0; i < n; i++) {
      const v = vectors[i];
      if (!v) continue;
      let best = 0;
      let bestSim = -Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const centroid = centroids[c];
        if (!centroid) continue;
        const sim = cosineSimilarity(v, centroid);
        if (sim > bestSim) {
          bestSim = sim;
          best = c;
        }
      }
      if (assignment[i] !== best) {
        assignment[i] = best;
        changed = true;
      }
    }
    if (!changed && iter > 0) break;
    for (let c = 0; c < centroids.length; c++) {
      const members: Float32Array[] = [];
      const memberWeights: number[] = [];
      for (let i = 0; i < n; i++) {
        const v = vectors[i];
        if (assignment[i] !== c || !v) continue;
        members.push(v);
        memberWeights.push(clampedWeights[i] ?? 0);
      }
      const mean = meanVector(members, memberWeights);
      if (mean) centroids[c] = normalize(mean); // empty cluster keeps its old centroid
    }
  }
  return centroids;
}
