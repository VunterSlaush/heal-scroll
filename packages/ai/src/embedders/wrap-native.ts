import type { Embedder } from '@heal-scroll/core';
import { normalize } from '@heal-scroll/core';
import type { NativeEmbedderBinding } from '../capabilities/native-bindings';

/**
 * Adapts a raw native embedding surface to the core `Embedder` port:
 * number[][] → unit-normalized Float32Array, never rejecting. A native failure
 * yields zero vectors, which persist layers skip (zero norm).
 */
export function wrapNativeEmbedder(id: string, binding: NativeEmbedderBinding): Embedder {
  return {
    id,
    dim: binding.dim,
    async embed(texts: string[]): Promise<Float32Array[]> {
      if (texts.length === 0) return [];
      try {
        const raw = await binding.embed(texts);
        return texts.map((_, i) => {
          const row = raw[i];
          return row ? normalize(Float32Array.from(row)) : new Float32Array(binding.dim);
        });
      } catch {
        return texts.map(() => new Float32Array(binding.dim));
      }
    },
    unload: binding.unload,
  };
}
