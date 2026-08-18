import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/twitter-finance.json';
import { createTwitterAdapter, tweetsToCards, type TwitterResponse } from './twitter.adapter';

const response = fixture as TwitterResponse;

describe('twitter adapter — tweetsToCards', () => {
  const cards = tweetsToCards(response, 'finance');

  it('keeps only tweets with a known author and real text', () => {
    // 4 tweets in fixture: one is link-only, one has an unknown author.
    expect(cards).toHaveLength(2);
  });

  it('maps author, permalink, image and strips t.co links', () => {
    const first = cards[0]!;
    expect(first).toMatchObject({
      id: 'twitter:1957501234567890123',
      sourceId: 'twitter',
      sourceName: 'X',
      title: 'Sensible Finance (@sensiblefin)',
      sourceUrl: 'https://x.com/sensiblefin/status/1957501234567890123',
      imageUrl: 'https://pbs.twimg.com/media/example-chart.jpg',
      publishedAt: '2026-08-17T14:05:00.000Z',
    });
    expect(first.body).not.toMatch(/t\.co/);
    expect(cards[1]!.imageUrl).toBeUndefined();
  });

  it('hashes are stable and unique per author+text', () => {
    expect(new Set(cards.map((c) => c.hash)).size).toBe(cards.length);
    expect(tweetsToCards(response, 'finance')[0]!.hash).toBe(cards[0]!.hash);
  });
});

describe('createTwitterAdapter', () => {
  it('returns no cards without a bearer token instead of hitting the network', async () => {
    const adapter = createTwitterAdapter(undefined);
    expect(await adapter.fetchCards({ id: 'finance', name: 'Personal finance' }, 10)).toEqual([]);
  });

  it('ignores topics it has no query for', async () => {
    const adapter = createTwitterAdapter('token');
    expect(await adapter.fetchCards({ id: 'space', name: 'Space' }, 10)).toEqual([]);
  });
});
