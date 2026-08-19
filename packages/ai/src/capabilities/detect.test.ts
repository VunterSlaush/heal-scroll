import { describe, expect, it } from 'vitest';
import type { NativeAiBindings, NativeEmbedderBinding, NativeGeneratorBinding } from './native-bindings';
import { aiModeLabel, detectAiCapabilities } from './detect';

const embedderBinding = (dim: number): NativeEmbedderBinding => ({
  dim,
  embed: (texts) => Promise.resolve(texts.map(() => new Array<number>(dim).fill(0.5))),
});
const generatorBinding = (): NativeGeneratorBinding => ({
  generate: () => Promise.resolve('{}'),
});

describe('detectAiCapabilities', () => {
  const matrix: Array<{
    name: string;
    bindings: NativeAiBindings;
    embedderId: string;
    generatorId: string | null;
    mode: string;
  }> = [
    {
      name: 'iOS 26+ with Apple Intelligence',
      bindings: { appleNl: embedderBinding(512), appleFoundation: generatorBinding() },
      embedderId: 'apple-nl-latin-v1',
      generatorId: 'apple-foundation',
      mode: 'system',
    },
    {
      name: 'iOS 17–25',
      bindings: { appleNl: embedderBinding(512) },
      embedderId: 'apple-nl-latin-v1',
      generatorId: null,
      mode: 'local-embeddings',
    },
    {
      name: 'iOS with failed NL assets but MiniLM downloaded',
      bindings: { miniLm: embedderBinding(384) },
      embedderId: 'minilm-l6-v2',
      generatorId: null,
      mode: 'local-embeddings',
    },
    {
      name: 'Android with Nano',
      bindings: { miniLm: embedderBinding(384), mlkitNano: generatorBinding() },
      embedderId: 'minilm-l6-v2',
      generatorId: 'mlkit-nano',
      mode: 'system',
    },
    {
      name: 'Apple NL outranks MiniLM when both exist',
      bindings: { appleNl: embedderBinding(512), miniLm: embedderBinding(384) },
      embedderId: 'apple-nl-latin-v1',
      generatorId: null,
      mode: 'local-embeddings',
    },
    {
      name: 'nothing available',
      bindings: {},
      embedderId: 'noop',
      generatorId: null,
      mode: 'rules-only',
    },
  ];

  it.each(matrix)('$name', ({ bindings, embedderId, generatorId, mode }) => {
    const caps = detectAiCapabilities(bindings);
    expect(caps.embedder.id).toBe(embedderId);
    expect(caps.generator?.id ?? null).toBe(generatorId);
    expect(caps.mode).toBe(mode);
  });

  it('reports the embedder dim from the binding', () => {
    expect(detectAiCapabilities({ appleNl: embedderBinding(512) }).embedder.dim).toBe(512);
    expect(detectAiCapabilities({}).embedder.dim).toBe(0);
  });
});

describe('aiModeLabel', () => {
  it('maps modes to the Settings display strings', () => {
    expect(aiModeLabel('system')).toBe('System AI');
    expect(aiModeLabel('local-embeddings')).toBe('Local embeddings');
    expect(aiModeLabel('rules-only')).toBe('Rules only');
  });
});
