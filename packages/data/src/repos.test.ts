import type { Card } from '@heal-scroll/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { SqliteCardRepo } from './sqlite-card-repo';
import { SqliteCollectionRepo } from './sqlite-collection-repo';
import { SqliteInsightsRepo } from './sqlite-insights-repo';
import { SqliteRecallRepo } from './sqlite-recall-repo';
import { SqliteSessionRepo } from './sqlite-session-repo';
import { SqliteSettingsRepo } from './sqlite-settings-repo';
import { SqliteTopicRepo } from './sqlite-topic-repo';
import { SqliteTopicSourceRepo } from './sqlite-topic-source-repo';
import { createTestDb } from './test-db';

const NOW = new Date('2026-08-18T12:00:00Z');

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 86_400_000);
}

function card(id: string, overrides: Partial<Card> = {}): Card {
  return {
    id,
    topicId: 'space',
    sourceId: 'wikipedia',
    title: `Title ${id}`,
    body: 'Body.',
    sourceName: 'Wikipedia',
    sourceUrl: `https://example.org/${id}`,
    hash: `hash-${id}`,
    ...overrides,
  };
}

let db: ReturnType<typeof createTestDb>;
beforeEach(() => {
  db = createTestDb();
});

describe('SqliteSettingsRepo', () => {
  it('returns defaults, merges patches, and keeps internal values separate', async () => {
    const repo = new SqliteSettingsRepo(db);
    expect(await repo.getSettings()).toEqual({
      itemsPerSession: 7,
      cooldownMinutes: 10,
      preferShortCards: false,
      disciplineStatEnabled: false,
    });
    await repo.saveSettings({ itemsPerSession: 5 });
    await repo.saveSettings({ preferShortCards: true });
    expect(await repo.getSettings()).toMatchObject({ itemsPerSession: 5, preferShortCards: true });
    await repo.setValue('weeklySummary.lastShownAt', NOW.toISOString());
    expect(await repo.getValue('weeklySummary.lastShownAt')).toBe(NOW.toISOString());
  });
});

describe('SqliteTopicRepo', () => {
  it('upserts, toggles, and clamps weight adjustments', async () => {
    const repo = new SqliteTopicRepo(db);
    await repo.upsertTopics([
      { id: 'space', name: 'Space' },
      { id: 'history', name: 'History' },
    ]);
    await repo.setEnabled('history', false);
    expect((await repo.getEnabledTopics()).map((t) => t.id)).toEqual(['space']);

    for (let i = 0; i < 100; i++) await repo.adjustWeight('space', 0.05);
    expect((await repo.getTopics()).find((t) => t.id === 'space')?.weight).toBeCloseTo(3);
    for (let i = 0; i < 100; i++) await repo.adjustWeight('space', -0.05);
    expect((await repo.getTopics()).find((t) => t.id === 'space')?.weight).toBeCloseTo(0.2);
  });
});

describe('SqliteTopicSourceRepo', () => {
  it('tracks health across fetches and writes the fetch log', async () => {
    const repo = new SqliteTopicSourceRepo(db);
    const base = { topicId: 'space', sourceId: 'arxiv', cardCount: 0, at: NOW };
    await repo.recordFetchResult({ ...base, ok: false, error: 'boom' });
    await repo.recordFetchResult({ ...base, ok: false, error: 'boom' });
    let [state] = await repo.getStates(['space']);
    expect(state?.consecutiveFailures).toBe(2);

    await repo.recordFetchResult({ ...base, ok: true, cardCount: 9 });
    [state] = await repo.getStates(['space']);
    expect(state?.consecutiveFailures).toBe(0);
    expect(state?.lastFetchedAt).toEqual(NOW);
  });

  it('toggles and clamps weights per (topic, source)', async () => {
    const repo = new SqliteTopicSourceRepo(db);
    await repo.setEnabled('space', 'nasa-apod', false);
    await repo.adjustWeight('space', 'arxiv', 0.05);
    const states = await repo.getStates(['space']);
    expect(states.find((s) => s.sourceId === 'nasa-apod')?.enabled).toBe(false);
    expect(states.find((s) => s.sourceId === 'arxiv')?.weight).toBeCloseTo(1.05);
  });
});

describe('SqliteSessionRepo', () => {
  it('runs the session lifecycle including the discipline flag', async () => {
    const repo = new SqliteSessionRepo(db);
    const first = await repo.startSession(daysAgo(1), 7);
    await repo.finishSession(first, daysAgo(1), 7);
    expect(await repo.getLastFinished()).toMatchObject({ id: first, seenCount: 7, respectedCooldown: true });

    const second = await repo.startSession(NOW, 7);
    await repo.markCooldownAttempt(second);
    await repo.finishSession(second, NOW, 5);
    expect(await repo.getLastFinished()).toMatchObject({ id: second, respectedCooldown: false });
  });
});

describe('SqliteCollectionRepo', () => {
  it('creates collections, manages items, and deletes cleanly', async () => {
    const cardRepo = new SqliteCardRepo(db);
    const repo = new SqliteCollectionRepo(db);
    await cardRepo.upsertCards([card('a'), card('b')]);

    const id = await repo.createCollection('Black holes', NOW);
    await repo.addItem(id, 'a', NOW);
    await repo.addItem(id, 'b', NOW);
    await repo.addItem(id, 'b', NOW); // idempotent

    expect(await repo.listCollections()).toEqual([
      { id, name: 'Black holes', createdAt: NOW, itemCount: 2 },
    ]);
    expect((await repo.getItems(id)).map((c) => c.id)).toEqual(['a', 'b']);

    await repo.removeItem(id, 'a');
    expect((await repo.getItems(id)).map((c) => c.id)).toEqual(['b']);
    await repo.deleteCollection(id);
    expect(await repo.listCollections()).toEqual([]);
  });
});

describe('SqliteInsightsRepo', () => {
  it('aggregates reading, votes, recall, series and session stats', async () => {
    const cardRepo = new SqliteCardRepo(db);
    const recallRepo = new SqliteRecallRepo(db);
    const sessionRepo = new SqliteSessionRepo(db);
    const insights = new SqliteInsightsRepo(db);

    await cardRepo.upsertCards([
      card('s1'),
      card('s2'),
      card('h1', { topicId: 'history', sourceId: 'hn' }),
      card('ser1', { seriesId: 'arxiv:1', seriesIndex: 1, seriesCount: 2, sourceId: 'arxiv' }),
      card('ser2', { seriesId: 'arxiv:1', seriesIndex: 2, seriesCount: 2, sourceId: 'arxiv' }),
      card('ser3', { seriesId: 'arxiv:2', seriesIndex: 1, seriesCount: 2, sourceId: 'arxiv' }),
    ]);
    await cardRepo.markSeen(['s1', 's2', 'ser1', 'ser2', 'ser3'], daysAgo(2));
    await cardRepo.markSeen(['h1'], daysAgo(20));
    await cardRepo.setSaved('s1', true, daysAgo(2));
    await cardRepo.setVote('s1', 1);
    await cardRepo.setVote('h1', -1);
    await recallRepo.logRecall('s1', daysAgo(1), true);
    await recallRepo.logRecall('s2', daysAgo(1), false);

    const sessionId = await sessionRepo.startSession(daysAgo(2), 7);
    await sessionRepo.finishSession(sessionId, new Date(daysAgo(2).getTime() + 5 * 60_000), 7);

    expect(await insights.cardsPerTopic(7, NOW)).toEqual([{ topicId: 'space', seen: 5, saved: 1 }]);
    expect(await insights.cardsPerTopic(null, NOW)).toEqual([
      { topicId: 'space', seen: 5, saved: 1 },
      { topicId: 'history', seen: 1, saved: 0 },
    ]);
    expect(await insights.recallStats(null, NOW)).toEqual([{ topicId: 'space', shown: 2, remembered: 1 }]);
    expect(await insights.voteProfile()).toEqual([
      { sourceId: 'hn', up: 0, down: 1 },
      { sourceId: 'wikipedia', up: 1, down: 0 },
    ]);
    expect(await insights.seriesCompletion()).toEqual([{ sourceId: 'arxiv', started: 2, completed: 1 }]);
    expect(await insights.seriesFinished(7, NOW)).toBe(1);
    expect(await insights.cardsPerSource(7, NOW)).toEqual(
      expect.arrayContaining([
        { sourceId: 'wikipedia', seen: 2 },
        { sourceId: 'arxiv', seen: 3 },
      ]),
    );
    expect(await insights.sessionStats(30, NOW)).toEqual({
      sessions: 1,
      averageCardsPerSession: 7,
      averageMinutesPerSession: 5,
      cooldownRespectedRate: 1,
    });
  });
});
