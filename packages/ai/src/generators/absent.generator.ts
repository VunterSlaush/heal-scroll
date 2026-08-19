import type { TextGenerator } from '@heal-scroll/core';

export const ABSENT_GENERATOR_ID = 'absent';

/** No system model: every feature degrades to its embeddings/rules column. */
export function createAbsentGenerator(): TextGenerator {
  return {
    id: ABSENT_GENERATOR_ID,
    generate: () => Promise.resolve(null),
  };
}
