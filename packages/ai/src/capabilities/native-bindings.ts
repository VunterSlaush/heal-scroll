/**
 * Raw native surfaces, constructed ONLY in the app's composition root. A
 * binding is present only when its platform probe succeeded (OS version,
 * model downloaded, Apple Intelligence enabled, …) — this file keeps every
 * react-native/expo import out of packages/ai.
 */
export interface NativeEmbedderBinding {
  /** Vector dimensionality the model produces. */
  readonly dim: number;
  embed(texts: string[]): Promise<number[][]>;
  /** Frees native model memory (ExecuTorch module delete). */
  unload?(): Promise<void>;
}

export interface NativeGeneratorBinding {
  /** Raw model text (JSON expected but not guaranteed); null on refusal. */
  generate(prompt: string): Promise<string | null>;
}

export interface NativeAiBindings {
  appleNl?: NativeEmbedderBinding;
  miniLm?: NativeEmbedderBinding;
  appleFoundation?: NativeGeneratorBinding;
  mlkitNano?: NativeGeneratorBinding;
}
