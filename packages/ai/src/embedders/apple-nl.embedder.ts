import type { Embedder } from '@heal-scroll/core';
import type { NativeEmbedderBinding } from '../capabilities/native-bindings';
import { wrapNativeEmbedder } from './wrap-native';

/** Apple NLContextualEmbedding, iOS 17+, 512-d Latin model, OS-managed assets. */
export const APPLE_NL_EMBEDDER_ID = 'apple-nl-latin-v1';

export function createAppleNlEmbedder(binding: NativeEmbedderBinding): Embedder {
  return wrapNativeEmbedder(APPLE_NL_EMBEDDER_ID, binding);
}
