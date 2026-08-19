import { cosineSimilarity } from '@heal-scroll/core';
import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/embeddings.json';
import { createNoopEmbedder } from './noop.embedder';
import { wrapNativeEmbedder } from './wrap-native';

describe('wrapNativeEmbedder', () => {
  it('converts recorded native output to unit vectors preserving similarity structure', async () => {
    const embedder = wrapNativeEmbedder('fixture-model', {
      dim: fixture.dim,
      embed: () => Promise.resolve(fixture.vectors),
    });
    const [a, b, c] = await embedder.embed(fixture.texts);
    expect(a).toBeDefined();
    if (!a || !b || !c) return;
    for (const v of [a, b, c]) {
      let norm = 0;
      for (const x of v) norm += x * x;
      expect(Math.sqrt(norm)).toBeCloseTo(1);
    }
    // The two black-hole texts are near-duplicates; the bread text is not.
    expect(cosineSimilarity(a, b)).toBeGreaterThan(0.95);
    expect(cosineSimilarity(a, c)).toBeLessThan(0.5);
  });

  it('returns zero vectors instead of rejecting when the binding throws', async () => {
    const embedder = wrapNativeEmbedder('broken', {
      dim: 4,
      embed: () => Promise.reject(new Error('native crash')),
    });
    const out = await embedder.embed(['a', 'b']);
    expect(out).toHaveLength(2);
    expect(out.every((v) => v.length === 4 && [...v].every((x) => x === 0))).toBe(true);
  });

  it('pads missing rows with zero vectors and short-circuits empty input', async () => {
    const embedder = wrapNativeEmbedder('short', {
      dim: 2,
      embed: () => Promise.resolve([[1, 0]]),
    });
    const out = await embedder.embed(['present', 'missing']);
    expect([...(out[0] ?? [])]).toEqual([1, 0]);
    expect([...(out[1] ?? [])]).toEqual([0, 0]);
    expect(await embedder.embed([])).toEqual([]);
  });

  it('forwards the binding unload', async () => {
    let unloaded = false;
    const embedder = wrapNativeEmbedder('unloadable', {
      dim: 2,
      embed: () => Promise.resolve([]),
      unload: () => {
        unloaded = true;
        return Promise.resolve();
      },
    });
    await embedder.unload?.();
    expect(unloaded).toBe(true);
  });
});

describe('createNoopEmbedder', () => {
  it('returns empty vectors with id noop and dim 0', async () => {
    const noop = createNoopEmbedder();
    expect(noop.id).toBe('noop');
    expect(noop.dim).toBe(0);
    const out = await noop.embed(['x', 'y']);
    expect(out).toHaveLength(2);
    expect(out.every((v) => v.length === 0)).toBe(true);
  });
});
