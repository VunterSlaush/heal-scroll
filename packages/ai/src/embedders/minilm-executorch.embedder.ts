import type { Embedder } from '@heal-scroll/core';
import type { NativeEmbedderBinding } from '../capabilities/native-bindings';
import { wrapNativeEmbedder } from './wrap-native';

/** all-MiniLM-L6-v2 via ExecuTorch, 384-d, downloaded post-install (~23 MB). */
export const MINILM_EMBEDDER_ID = 'minilm-l6-v2';

export function createMiniLmEmbedder(binding: NativeEmbedderBinding): Embedder {
  return wrapNativeEmbedder(MINILM_EMBEDDER_ID, binding);
}
