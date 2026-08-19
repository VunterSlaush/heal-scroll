import { NOOP_EMBEDDER_ID } from '@heal-scroll/core';
import { createAppleNlEmbedder } from '../embedders/apple-nl.embedder';
import { createMiniLmEmbedder } from '../embedders/minilm-executorch.embedder';
import { createNoopEmbedder } from '../embedders/noop.embedder';
import { createAppleFoundationGenerator } from '../generators/apple-foundation.generator';
import { createMlkitNanoGenerator } from '../generators/mlkit-nano.generator';
import type { NativeAiBindings } from './native-bindings';
import type { AiCapabilities, AiMode } from './types';

/**
 * Resolves the capability ladder (AI_ON_DEVICE_PLAN §2) from whichever native
 * bindings the composition root's platform probes produced. Pure and sync —
 * the async, fallible probing happens where the bindings are built.
 */
export function detectAiCapabilities(bindings: NativeAiBindings): AiCapabilities {
  const embedder = bindings.appleNl
    ? createAppleNlEmbedder(bindings.appleNl)
    : bindings.miniLm
      ? createMiniLmEmbedder(bindings.miniLm)
      : createNoopEmbedder();
  const generator = bindings.appleFoundation
    ? createAppleFoundationGenerator(bindings.appleFoundation)
    : bindings.mlkitNano
      ? createMlkitNanoGenerator(bindings.mlkitNano)
      : null;
  const mode: AiMode = generator
    ? 'system'
    : embedder.id !== NOOP_EMBEDDER_ID
      ? 'local-embeddings'
      : 'rules-only';
  return { embedder, generator, mode };
}

/** Settings display string for a mode. */
export function aiModeLabel(mode: AiMode): string {
  switch (mode) {
    case 'system':
      return 'System AI';
    case 'local-embeddings':
      return 'Local embeddings';
    case 'rules-only':
      return 'Rules only';
  }
}
