import type { Embedder, TextGenerator } from '@heal-scroll/core';

/** Shown in Settings as "System AI" / "Local embeddings" / "Rules only". */
export type AiMode = 'system' | 'local-embeddings' | 'rules-only';

export interface AiCapabilities {
  /** Always present — the noop embedder stands in when nothing is available. */
  embedder: Embedder;
  generator: TextGenerator | null;
  mode: AiMode;
}
