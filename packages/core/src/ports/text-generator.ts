/** Structurally compatible with a zod schema so core never imports zod. */
export interface OutputValidator<T> {
  parse(value: unknown): T;
}

/**
 * Optional on-device text generation (AI_ON_DEVICE_PLAN §6). Output is always
 * decoration — card title/body/source are never generated.
 */
export interface TextGenerator {
  readonly id: string;
  /**
   * Null on model absence, refusal, schema-parse failure, or timeout — callers
   * silently degrade to the next fallback column. Never rejects.
   */
  generate<T>(prompt: string, schema: OutputValidator<T>): Promise<T | null>;
}
