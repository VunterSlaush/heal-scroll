import type { Card } from '@heal-scroll/core';
import { beforeEach, describe, expect, it } from 'vitest';
import * as schema from './schema';
import { SqliteCardRepo, seedTopics } from './sqlite-card-repo';
import { SqliteRecallRepo } from './sqlite-recall-repo';
import { createTestDb } from './test-db';

const NOW = new Date('2026-08-18T12:00:00Z');

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 86_400_000);
}

function card(id: string, overrides: Partial<Card> = {}): Card {
  return {
    id: `wikipedia:${id}`,
    topicId: 'space',
    sourceId: 'wikipedia',
    title: `Title ${id}`,
    body: 'A short body.',
    imageUrl: 'https://example.org/img.jpg',
    sourceName: 'Wikipedia',
    sourceUrl: `https://en.wikipedia.org/wiki/${id}`,
    publishedAt: '2026-08-01T00:00:00Z',
    hash: `hash-${id}`,
    ...overrides,
  };
}

describe('SqliteCardRepo', () => {
  let repo: SqliteCardRepo;
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
    repo = new SqliteCardRepo(db);
  });

  it('stores cards and reads them back intact, including series fields', async () => {
    const withSeries = card('s1', { seriesId: 'arxiv:1', seriesIndex: 1, seriesCount: 3 });
    await repo.upsertCards([card('a'), withSeries]);
    const stored = await repo.getUnseenCards(['space'], 10);
    expect(stored.find((c) => c.id === 'wikipedia:a')).toEqual(card('a'));
    expect(stored.find((c) => c.id === 'wikipedia:s1')).toEqual(withSeries);
  });

  it('round-trips optional fields as undefined', async () => {
    const bare: Card = { ...card('bare') };
    delete bare.imageUrl;
    delete bare.publishedAt;
    await repo.upsertCards([bare]);
    const [stored] = await repo.getUnseenCards(['space'], 10);
    expect(stored?.imageUrl).toBeUndefined();
    expect(stored?.publishedAt).toBeUndefined();
    expect(stored?.seriesId).toBeUndefined();
  });

  it('dedupes by hash across calls and within a batch, reporting only new cards', async () => {
    expect(await repo.upsertCards([card('a'), card('dup', { hash: 'hash-a' })])).toBe(1);
    expect(await repo.upsertCards([card('a'), card('b')])).toBe(1);
    expect(await repo.countUnseen(['space'])).toBe(2);
  });

  it('excludes seen cards and markSeen is idempotent', async () => {
    await repo.upsertCards([card('a'), card('b')]);
    await repo.markSeen(['wikipedia:a'], NOW);
    await repo.markSeen(['wikipedia:a'], NOW);
    const unseen = await repo.getUnseenCards(['space'], 10);
    expect(unseen.map((c) => c.id)).toEqual(['wikipedia:b']);
    expect(await repo.countUnseen(['space'])).toBe(1);
  });

  it('saves and unsaves cards, newest saved first', async () => {
    await repo.upsertCards([card('a'), card('b')]);
    await repo.setSaved('wikipedia:a', true, daysAgo(2));
    await repo.setSaved('wikipedia:b', true, daysAgo(1));
    expect((await repo.getSavedCards()).map((c) => c.id)).toEqual(['wikipedia:b', 'wikipedia:a']);
    await repo.setSaved('wikipedia:b', false, NOW);
    expect((await repo.getSavedCards()).map((c) => c.id)).toEqual(['wikipedia:a']);
  });

  it('stores votes independently of seen state', async () => {
    await repo.upsertCards([card('a')]);
    await repo.setVote('wikipedia:a', 1);
    await repo.markSeen(['wikipedia:a'], NOW);
    const rows = await db.select().from(schema.userItems);
    expect(rows[0]).toMatchObject({ itemId: 'wikipedia:a', vote: 1, seenAt: NOW });
  });

  it('revisit candidates: seen >30d ago, never downvoted, best votes first', async () => {
    await repo.upsertCards([card('old-up'), card('old-down'), card('recent'), card('old-plain')]);
    await repo.markSeen(['wikipedia:old-up', 'wikipedia:old-down', 'wikipedia:old-plain'], daysAgo(40));
    await repo.markSeen(['wikipedia:recent'], daysAgo(2));
    await repo.setVote('wikipedia:old-up', 1);
    await repo.setVote('wikipedia:old-down', -1);

    const candidates = await repo.getRevisitCandidates(['space'], 30, 10, NOW);
    expect(candidates.map((c) => c.id)).toEqual(['wikipedia:old-up', 'wikipedia:old-plain']);
  });

  it('recall candidates: saved/upvoted cards seen 3–14 days ago, not recently recalled', async () => {
    const recallRepo = new SqliteRecallRepo(db);
    await repo.upsertCards([
      card('saved-in-window'),
      card('upvoted-in-window'),
      card('saved-too-recent'),
      card('saved-too-old'),
      card('plain-in-window'),
      card('already-recalled'),
    ]);
    await repo.markSeen(
      ['wikipedia:saved-in-window', 'wikipedia:upvoted-in-window', 'wikipedia:already-recalled', 'wikipedia:plain-in-window'],
      daysAgo(5),
    );
    await repo.markSeen(['wikipedia:saved-too-recent'], daysAgo(1));
    await repo.markSeen(['wikipedia:saved-too-old'], daysAgo(20));
    await repo.setSaved('wikipedia:saved-in-window', true, daysAgo(5));
    await repo.setSaved('wikipedia:saved-too-recent', true, daysAgo(1));
    await repo.setSaved('wikipedia:saved-too-old', true, daysAgo(20));
    await repo.setSaved('wikipedia:already-recalled', true, daysAgo(5));
    await repo.setVote('wikipedia:upvoted-in-window', 1);
    await recallRepo.logRecall('wikipedia:already-recalled', daysAgo(2), true);

    const candidates = await repo.getRecallCandidates({ minDays: 3, maxDays: 14 }, NOW);
    expect(candidates.map((c) => c.id).sort()).toEqual([
      'wikipedia:saved-in-window',
      'wikipedia:upvoted-in-window',
    ]);
  });

  it('purgeTopicCards drops only untouched buffer cards', async () => {
    const { SqliteCollectionRepo } = await import('./sqlite-collection-repo');
    const collections = new SqliteCollectionRepo(db);
    await repo.upsertCards([
      card('buffer'),
      card('seen'),
      card('saved'),
      card('collected'),
      card('other-topic', { topicId: 'history' }),
    ]);
    await repo.markSeen(['wikipedia:seen'], NOW);
    await repo.setSaved('wikipedia:saved', true, NOW);
    const collectionId = await collections.createCollection('Keep', NOW);
    await collections.addItem(collectionId, 'wikipedia:collected', NOW);

    await repo.purgeTopicCards('space');

    const remaining = (await db.select({ id: schema.items.id }).from(schema.items)).map((r) => r.id).sort();
    expect(remaining).toEqual([
      'wikipedia:collected',
      'wikipedia:other-topic',
      'wikipedia:saved',
      'wikipedia:seen',
    ]);
  });

  it('seedTopics is idempotent', async () => {
    await seedTopics(db, [{ id: 'space', name: 'Space', query: 'space astronomy' }]);
    await seedTopics(db, [{ id: 'space', name: 'Space', query: 'space astronomy' }]);
    const rows = await db.select().from(schema.topics);
    expect(rows).toEqual([{ id: 'space', name: 'Space', query: 'space astronomy', enabled: true, weight: 1 }]);
  });
});
