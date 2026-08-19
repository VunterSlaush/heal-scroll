import type { OutputValidator, TextGenerator } from '@heal-scroll/core';
import type { NativeGeneratorBinding } from '../capabilities/native-bindings';
import { withTimeout } from './with-timeout';

/** AI_ON_DEVICE_PLAN §6: any generation slower than this degrades silently. */
export const GENERATE_TIMEOUT_MS = 2_000;

/** Small models often wrap JSON in prose or code fences — dig it out. */
export function extractJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
    throw new SyntaxError('no JSON object in model output');
  }
}

/**
 * Adapts a raw native generation surface to the core `TextGenerator` port:
 * timeout, JSON extraction, schema validation, one retry on parse failure
 * (§6), then null. Never rejects.
 */
export function wrapNativeGenerator(
  id: string,
  binding: NativeGeneratorBinding,
  timeoutMs: number = GENERATE_TIMEOUT_MS,
): TextGenerator {
  async function attempt<T>(prompt: string, schema: OutputValidator<T>): Promise<T | null> {
    const raw = await withTimeout(binding.generate(prompt), timeoutMs);
    if (raw == null) return null;
    return schema.parse(extractJson(raw));
  }
  return {
    id,
    async generate<T>(prompt: string, schema: OutputValidator<T>): Promise<T | null> {
      try {
        return await attempt(prompt, schema);
      } catch {
        try {
          return await attempt(prompt, schema);
        } catch {
          return null;
        }
      }
    },
  };
}
