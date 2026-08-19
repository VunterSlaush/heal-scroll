import type { Card } from '../entities/card';
import type { Embedder } from '../ports/embedder';
import { NOOP_EMBEDDER_ID } from '../ports/embedder';
import type { EmbeddingRepo } from '../ports/embedding-repo';

export const EMBED_BODY_CHARS = 300;
export const EMBED_BATCH_SIZE = 32;
export const EMBED_MAX_ITEMS_PER_RUN = 500;

/** What gets embedded per card (AI_ON_DEVICE_PLAN §5): title + first 300 chars. */
export function embeddingText(card: Pick<Card, 'title' | 'body'>): string {
  return `${card.title}\n${card.body.slice(0, EMBED_BODY_CHARS)}`;
}

export interface BackfillEmbeddingsDeps {
  embedder: Embedder;
  embeddingRepo: EmbeddingRepo;
}

function hasSignal(v: Float32Array): boolean {
  for (let i = 0; i < v.length; i++) if (v[i] !== 0) return true;
  return false;
}

/**
 * Pull-based embed-at-ingest: embeds whatever cards lack a vector for the
 * current model, in batches, during prefetch/cooldown. Pull (rather than a
 * hook on card insert) covers every ingest path at once — refill, live top-up,
 * and cards cached before the embedder existed. Zero vectors (native failure,
 * noop) are never persisted; a batch that produces any is the signal to stop
 * this run and retry later.
 */
export async function backfillEmbeddings(
  deps: BackfillEmbeddingsDeps,
  opts: { batchSize?: number; maxItems?: number } = {},
): Promise<{ embedded: number }> {
  const { embedder, embeddingRepo } = deps;
  const { batchSize = EMBED_BATCH_SIZE, maxItems = EMBED_MAX_ITEMS_PER_RUN } = opts;
  if (embedder.id === NOOP_EMBEDDER_ID) return { embedded: 0 };
  let embedded = 0;
  while (embedded < maxItems) {
    const cards = await embeddingRepo.getCardsMissingEmbedding(
      embedder.id,
      Math.min(batchSize, maxItems - embedded),
    );
    if (cards.length === 0) break;
    const vectors = await embedder.embed(cards.map(embeddingText));
    const entries: Array<{ itemId: string; vector: Float32Array }> = [];
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const vector = vectors[i];
      if (card && vector && hasSignal(vector)) entries.push({ itemId: card.id, vector });
    }
    if (entries.length > 0) await embeddingRepo.setEmbeddings(embedder.id, entries);
    embedded += entries.length;
    if (entries.length < cards.length) break;
  }
  return { embedded };
}
