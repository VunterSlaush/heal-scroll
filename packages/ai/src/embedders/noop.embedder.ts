import type { Embedder } from '@heal-scroll/core';
import { NOOP_EMBEDDER_ID } from '@heal-scroll/core';

/** Stands in when no model is available; its zero vectors are never persisted. */
export function createNoopEmbedder(): Embedder {
  return {
    id: NOOP_EMBEDDER_ID,
    dim: 0,
    embed: (texts: string[]) => Promise.resolve(texts.map(() => new Float32Array(0))),
  };
}
