import type { TextGenerator } from '@heal-scroll/core';
import type { NativeGeneratorBinding } from '../capabilities/native-bindings';
import { wrapNativeGenerator } from './wrap-native';

/**
 * Gemini Nano via the ML Kit GenAI Prompt API (alpha, device-gated). Behind a
 * local flag; Android ships embedder-only until the API stabilizes.
 */
export const MLKIT_NANO_GENERATOR_ID = 'mlkit-nano';

export function createMlkitNanoGenerator(binding: NativeGeneratorBinding): TextGenerator {
  return wrapNativeGenerator(MLKIT_NANO_GENERATOR_ID, binding);
}
