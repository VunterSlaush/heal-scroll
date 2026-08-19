import { describe, expect, it } from 'vitest';
import { FakeEmbedder, FakeEmbeddingRepo, makeCard } from '../testing/fakes';
import {
  backfillEmbeddings,
  EMBED_BODY_CHARS,
  embeddingText,
} from './backfill-embeddings.usecase';

describe('embeddingText', () => {
  it('joins title and body truncated to 300 chars', () => {
    const longBody = 'x'.repeat(1_000);
    const text = embeddingText({ title: 'A title', body: longBody });
    expect(text).toBe(`A title\n${'x'.repeat(EMBED_BODY_CHARS)}`);
  });
});

describe('backfillEmbeddings', () => {
  it('embeds all missing cards in batches and persists per model', async () => {
    const embedder = new FakeEmbedder();
    const repo = new FakeEmbeddingRepo();
    repo.cards = Array.from({ length: 5 }, (_, i) => makeCard(`c${i}`));
    const result = await backfillEmbeddings({ embedder, embeddingRepo: repo }, { batchSize: 2 });
    expect(result.embedded).toBe(5);
    expect(repo.vectors.size).toBe(5);
    expect([...repo.vectors.keys()].every((k) => k.startsWith('fake/'))).toBe(true);
  });

  it('refuses to run with the noop embedder', async () => {
    const repo = new FakeEmbeddingRepo();
    repo.cards = [makeCard('c1')];
    const noop = { id: 'noop', dim: 0, embed: () => Promise.resolve([new Float32Array(0)]) };
    const result = await backfillEmbeddings({ embedder: noop, embeddingRepo: repo });
    expect(result.embedded).toBe(0);
    expect(repo.vectors.size).toBe(0);
  });

  it('honours maxItems across batches', async () => {
    const embedder = new FakeEmbedder();
    const repo = new FakeEmbeddingRepo();
    repo.cards = Array.from({ length: 10 }, (_, i) => makeCard(`c${i}`));
    const result = await backfillEmbeddings(
      { embedder, embeddingRepo: repo },
      { batchSize: 4, maxItems: 6 },
    );
    expect(result.embedded).toBe(6);
    expect(repo.vectors.size).toBe(6);
  });

  it('never persists zero vectors and stops the run when they appear', async () => {
    const repo = new FakeEmbeddingRepo();
    repo.cards = Array.from({ length: 4 }, (_, i) => makeCard(`c${i}`));
    // A failing embedder: real vector for the first text of a batch, zeros after.
    const flaky = {
      id: 'flaky',
      dim: 4,
      embed: (texts: string[]) =>
        Promise.resolve(
          texts.map((_, i) => (i === 0 ? Float32Array.from([1, 0, 0, 0]) : new Float32Array(4))),
        ),
    };
    const result = await backfillEmbeddings({ embedder: flaky, embeddingRepo: repo }, { batchSize: 2 });
    expect(result.embedded).toBe(1);
    expect(repo.vectors.size).toBe(1);
  });
});
