export type { AiCapabilities, AiMode } from './capabilities/types';
export type {
  NativeAiBindings,
  NativeEmbedderBinding,
  NativeGeneratorBinding,
} from './capabilities/native-bindings';
export { aiModeLabel, detectAiCapabilities } from './capabilities/detect';

export { createNoopEmbedder } from './embedders/noop.embedder';
export { APPLE_NL_EMBEDDER_ID, createAppleNlEmbedder } from './embedders/apple-nl.embedder';
export { createMiniLmEmbedder, MINILM_EMBEDDER_ID } from './embedders/minilm-executorch.embedder';
export { wrapNativeEmbedder } from './embedders/wrap-native';

export { ABSENT_GENERATOR_ID, createAbsentGenerator } from './generators/absent.generator';
export {
  APPLE_FOUNDATION_GENERATOR_ID,
  createAppleFoundationGenerator,
} from './generators/apple-foundation.generator';
export { createMlkitNanoGenerator, MLKIT_NANO_GENERATOR_ID } from './generators/mlkit-nano.generator';
export { extractJson, GENERATE_TIMEOUT_MS, wrapNativeGenerator } from './generators/wrap-native';
export { withTimeout } from './generators/with-timeout';

export {
  recallQuestionSchema,
  sessionRecapSchema,
  topicTagSchema,
  whyInterestingSchema,
} from './schemas/enrichment.schema';
export type {
  RecallQuestion,
  SessionRecap,
  TopicTag,
  WhyInteresting,
} from './schemas/enrichment.schema';

export { ONBOARDING_EXEMPLARS, pickOnboardingSet } from './cold-start/exemplars';
export type { ExemplarCard } from './cold-start/exemplars';
