import { describe, expect, it } from 'vitest';
import type { Card } from '../entities/card';
import type { CardRepo } from '../ports/card-repo';
import { buildSession } from './build-session.usecase';

function card(id: string, topicId = 'space'): Card {
  return {
    id,
    topicId,
    sourceId: 'wikipedia',
    title: `Title ${id}`,
    body: 'Body.',
    sourceName: 'Wikipedia',
    sourceUrl: `https://example.org/${id}`,
    hash: `hash-${id}`,
  };
}

function fakeRepo(unseen: Card[]): CardRepo & { calls: Array<{ topicIds: string[]; limit: number }> } {
  const calls: Array<{ topicIds: string[]; limit: number }> = [];
  return {
    calls,
    upsertCards: () => Promise.resolve(0),
    getUnseenCards: (topicIds, limit) => {
      calls.push({ topicIds, limit });
      return Promise.resolve(unseen.slice(0, limit));
    },
    markSeen: () => Promise.resolve(),
  };
}

describe('buildSession', () => {
  it('returns up to n unseen cards from the repo', async () => {
    const repo = fakeRepo([card('a'), card('b'), card('c')]);
    const session = await buildSession(repo, ['space'], 2);
    expect(session.map((c) => c.id)).toEqual(['a', 'b']);
    expect(repo.calls).toEqual([{ topicIds: ['space'], limit: 2 }]);
  });

  it('returns fewer cards when the buffer is thin', async () => {
    const repo = fakeRepo([card('a')]);
    const session = await buildSession(repo, ['space'], 7);
    expect(session).toHaveLength(1);
  });

  it('returns [] without touching the repo when n <= 0 or no topics', async () => {
    const repo = fakeRepo([card('a')]);
    expect(await buildSession(repo, ['space'], 0)).toEqual([]);
    expect(await buildSession(repo, [], 7)).toEqual([]);
    expect(repo.calls).toHaveLength(0);
  });

  it('never returns more than n even if the repo over-delivers', async () => {
    const over: CardRepo = {
      upsertCards: () => Promise.resolve(0),
      getUnseenCards: () => Promise.resolve([card('a'), card('b'), card('c')]),
      markSeen: () => Promise.resolve(),
    };
    expect(await buildSession(over, ['space'], 2)).toHaveLength(2);
  });
});
