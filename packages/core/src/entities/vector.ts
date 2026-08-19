/** Dense-vector helpers shared by the taste profile and semantic ranking. */

/** Cosine similarity in [-1, 1]; 0 on dimension mismatch or a zero-norm input. */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / Math.sqrt(normA * normB);
}

/** Unit-normalized copy; a zero vector stays zero. */
export function normalize(v: Float32Array): Float32Array {
  let norm = 0;
  for (let i = 0; i < v.length; i++) {
    const x = v[i] ?? 0;
    norm += x * x;
  }
  const out = new Float32Array(v.length);
  if (norm === 0) return out;
  norm = Math.sqrt(norm);
  for (let i = 0; i < v.length; i++) out[i] = (v[i] ?? 0) / norm;
  return out;
}

/**
 * Weighted mean of same-length vectors; vectors of a different length than the
 * first are skipped. Undefined when there is nothing to average.
 */
export function meanVector(
  vectors: readonly Float32Array[],
  weights?: readonly number[],
): Float32Array | undefined {
  const first = vectors[0];
  if (!first) return undefined;
  const out = new Float32Array(first.length);
  let total = 0;
  for (let i = 0; i < vectors.length; i++) {
    const v = vectors[i];
    if (!v || v.length !== first.length) continue;
    const w = weights?.[i] ?? 1;
    if (w <= 0) continue;
    total += w;
    for (let j = 0; j < v.length; j++) out[j] = (out[j] ?? 0) + (v[j] ?? 0) * w;
  }
  if (total === 0) return undefined;
  for (let j = 0; j < out.length; j++) out[j] = (out[j] ?? 0) / total;
  return out;
}
