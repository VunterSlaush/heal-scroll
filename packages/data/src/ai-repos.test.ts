import type { Card, TasteCentroid } from '@heal-scroll/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { backfillInteractionLogFromUserItems } from './backfill-interaction-log';
import { items, userItems } from './schema';
import { SqliteEmbeddingRepo } from './sqlite-embedding-repo';
import { SqliteInteractionLogRepo } from './sqlite-interaction-log-repo';
import { SqliteTasteRepo } from './sqlite-taste-repo';
import { createTestDb } from './test-db';

type Db = ReturnType<typeof createTestDb>;

const NOW = new Date('2026-08-18T12:00:00Z');
const vec = (...values: number[]) => Float32Array.from(values);

function makeCard(id: string, overrides: Partial<Card> = {}): Card {
  return {
    id,
    topicId: 'space',
    sourceId: 'wikipedia',
    title: `Title ${id}`,
    body: `Body ${id}`,
    sourceName: 'Wikipedia',
    sourceUrl: `https://example.org/${id}`,
    hash: `hash-${id}`,
    ...overrides,
  };
}

async function insertItems(db: Db, cards: Card[], createdAt = NOW): Promise<void> {
  await db.insert(items).values(
    cards.map((c) => ({
      id: c.id,
      topicId: c.topicId,
      sourceId: c.sourceId,
      title: c.title,
      body: c.body,
      sourceName: c.sourceName,
      sourceUrl: c.sourceUrl,
      hash: c.hash,
      createdAt,
    })),
  );
}

describe('SqliteEmbeddingRepo', () => {
  let db: Db;
  let repo: SqliteEmbeddingRepo;

  beforeEach(async () => {
    db = createTestDb();
    repo = new SqliteEmbeddingRepo(db);
    await insertItems(db, [makeCard('a'), makeCard('b'), makeCard('c', { topicId: 'history' })]);
  });

  it('round-trips vectors per model with exact float values', async () => {
    await repo.setEmbeddings('m1', [
      { itemId: 'a', vector: vec(0.25, -1.5) },
      { itemId: 'b', vector: vec(3, 4) },
    ]);
    const got = await repo.getEmbeddings('m1', ['a', 'b', 'c']);
    expect(got.size).toBe(2);
    expect([...(got.get('a') ?? [])]).toEqual([0.25, -1.5]);
    expect((await repo.getEmbeddings('other-model', ['a'])).size).toBe(0);
  });

  it('lists cards missing an embedding for the model, honouring other-model rows', async () => {
    await repo.setEmbeddings('m1', [{ itemId: 'a', vector: vec(1, 0) }]);
    const missingM1 = await repo.getCardsMissingEmbedding('m1', 10);
    expect(missingM1.map((c) => c.id).sort()).toEqual(['b', 'c']);
    // For a different model, even the embedded card counts as missing.
    const missingM2 = await repo.getCardsMissingEmbedding('m2', 10);
    expect(missingM2.map((c) => c.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('re-embedding an item under a new model replaces its row', async () => {
    await repo.setEmbeddings('m1', [{ itemId: 'a', vector: vec(1, 0) }]);
    await repo.setEmbeddings('m2', [{ itemId: 'a', vector: vec(0, 1, 0) }]);
    expect((await repo.getEmbeddings('m1', ['a'])).size).toBe(0);
    expect([...((await repo.getEmbeddings('m2', ['a'])).get('a') ?? [])]).toEqual([0, 1, 0]);
  });

  it('pruneOtherModels removes foreign vectors and reports the count', async () => {
    await repo.setEmbeddings('old', [{ itemId: 'a', vector: vec(1) }]);
    await repo.setEmbeddings('new', [{ itemId: 'b', vector: vec(1) }]);
    expect(await repo.pruneOtherModels('new')).toBe(1);
    expect((await repo.getEmbeddings('new', ['b'])).size).toBe(1);
    expect((await repo.getEmbeddings('old', ['a'])).size).toBe(0);
  });

  it('returns recently seen vectors newest first', async () => {
    await repo.setEmbeddings('m1', [
      { itemId: 'a', vector: vec(1, 0) },
      { itemId: 'b', vector: vec(0, 1) },
    ]);
    await db.insert(userItems).values([
      { itemId: 'a', seenAt: new Date('2026-08-17T10:00:00Z') },
      { itemId: 'b', seenAt: new Date('2026-08-18T10:00:00Z') },
    ]);
    const recent = await repo.getRecentSeenVectors('m1', 1);
    expect(recent).toHaveLength(1);
    expect([...(recent[0] ?? [])]).toEqual([0, 1]);
  });

  it('computes a topic centroid from that topic only', async () => {
    await repo.setEmbeddings('m1', [
      { itemId: 'a', vector: vec(1, 0) },
      { itemId: 'b', vector: vec(0, 1) },
      { itemId: 'c', vector: vec(100, 100) }, // other topic — excluded
    ]);
    const centroid = await repo.getTopicCentroid('m1', 'space', 10);
    expect(centroid?.[0]).toBeCloseTo(0.5);
    expect(centroid?.[1]).toBeCloseTo(0.5);
    expect(await repo.getTopicCentroid('m1', 'unknown', 10)).toBeUndefined();
  });
});

describe('SqliteTasteRepo', () => {
  const centroid = (id: string, overrides: Partial<TasteCentroid> = {}): TasteCentroid => ({
    id,
    kind: 'interest',
    model: 'm1',
    vector: vec(1, 0),
    weight: 1,
    updatedAt: NOW,
    ...overrides,
  });

  it('round-trips centroids incl. optional topicId/label', async () => {
    const repo = new SqliteTasteRepo(createTestDb());
    await repo.upsertCentroids([
      centroid('ema:topic:space', { kind: 'ema', topicId: 'space' }),
      centroid('pinned:roman engineering', { kind: 'pinned', label: 'Roman engineering' }),
    ]);
    const got = await repo.getCentroids('m1');
    expect(got).toHaveLength(2);
    const ema = got.find((c) => c.kind === 'ema');
    expect(ema?.topicId).toBe('space');
    expect(ema?.updatedAt.getTime()).toBe(NOW.getTime());
    expect(got.find((c) => c.kind === 'pinned')?.label).toBe('Roman engineering');
    expect(await repo.getCentroids('other')).toEqual([]);
  });

  it('replaceCentroids swaps only the given kinds for the model', async () => {
    const repo = new SqliteTasteRepo(createTestDb());
    await repo.upsertCentroids([
      centroid('interest:0'),
      centroid('dislike:0', { kind: 'dislike' }),
      centroid('pinned:x', { kind: 'pinned', label: 'x' }),
      centroid('other-model', { model: 'm2' }),
    ]);
    await repo.replaceCentroids('m1', ['interest', 'dislike'], [centroid('interest:new')]);
    const m1 = await repo.getCentroids('m1');
    expect(m1.map((c) => c.id).sort()).toEqual(['interest:new', 'pinned:x']);
    expect(await repo.getCentroids('m2')).toHaveLength(1);
  });

  it('deleteAll clears every model', async () => {
    const repo = new SqliteTasteRepo(createTestDb());
    await repo.upsertCentroids([centroid('a'), centroid('b', { model: 'm2' })]);
    await repo.deleteAll();
    expect(await repo.getCentroids('m1')).toEqual([]);
    expect(await repo.getCentroids('m2')).toEqual([]);
  });
});

describe('SqliteInteractionLogRepo', () => {
  it('appends and reads back oldest-first with since/limit', async () => {
    const db = createTestDb();
    await insertItems(db, [makeCard('a'), makeCard('b')]);
    const repo = new SqliteInteractionLogRepo(db);
    await repo.log([
      { itemId: 'b', type: 'save', at: new Date('2026-08-18T10:00:00Z') },
      { itemId: 'a', type: 'upvote', at: new Date('2026-08-17T10:00:00Z') },
      { itemId: 'a', type: 'dwell', value: 9_000, at: new Date('2026-08-18T11:00:00Z') },
    ]);
    const all = await repo.getEvents(undefined);
    expect(all.map((e) => e.type)).toEqual(['upvote', 'save', 'dwell']);
    expect(all[2]?.value).toBe(9_000);
    const since = await repo.getEvents(new Date('2026-08-18T00:00:00Z'));
    expect(since.map((e) => e.type)).toEqual(['save', 'dwell']);
    expect(await repo.getEvents(undefined, 1)).toHaveLength(1);
    expect(await repo.countByTypes(['upvote', 'downvote'])).toBe(1);
    expect(await repo.countByTypes([])).toBe(0);
  });
});

describe('backfillInteractionLogFromUserItems', () => {
  it('synthesizes vote/save events from user_items with approximate timestamps', async () => {
    const db = createTestDb();
    await insertItems(db, [makeCard('a'), makeCard('b'), makeCard('c'), makeCard('d')]);
    await db.insert(userItems).values([
      { itemId: 'a', seenAt: NOW, vote: 1 },
      { itemId: 'b', seenAt: NOW, saved: true, savedAt: NOW, vote: -1 },
      { itemId: 'c', seenAt: NOW, vote: 0 }, // no signal → no event
      { itemId: 'd', vote: 1 }, // no timestamp at all → skipped
    ]);
    const written = await backfillInteractionLogFromUserItems(db);
    expect(written).toBe(3);
    const events = await new SqliteInteractionLogRepo(db).getEvents(undefined);
    expect(events.map((e) => `${e.itemId}:${e.type}`).sort()).toEqual([
      'a:upvote',
      'b:downvote',
      'b:save',
    ]);
  });
});
