export const NOOP_EMBEDDER_ID = 'noop';

/**
 * Text-embedding capability (AI_ON_DEVICE_PLAN §2). Always resolvable: when no
 * model is available the noop embedder stands in, so callers never branch on
 * absence — but its zero vectors must never be persisted.
 */
export interface Embedder {
  /** Stable model id ('apple-nl-latin-v1' | 'minilm-l6-v2' | 'noop') — tags stored vectors. */
  readonly id: string;
  /** Vector dimensionality (512 Apple NL, 384 MiniLM, 0 noop). */
  readonly dim: number;
  /** Never rejects; failures come back as zero vectors callers must skip. */
  embed(texts: string[]): Promise<Float32Array[]>;
  /** Frees native model memory; called when the app backgrounds. */
  unload?(): Promise<void>;
}
