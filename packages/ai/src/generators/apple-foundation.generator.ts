import type { TextGenerator } from '@heal-scroll/core';
import type { NativeGeneratorBinding } from '../capabilities/native-bindings';
import { wrapNativeGenerator } from './wrap-native';

/** Apple Foundation Models, iOS 26+ with Apple Intelligence enabled. */
export const APPLE_FOUNDATION_GENERATOR_ID = 'apple-foundation';

export function createAppleFoundationGenerator(binding: NativeGeneratorBinding): TextGenerator {
  return wrapNativeGenerator(APPLE_FOUNDATION_GENERATOR_ID, binding);
}
