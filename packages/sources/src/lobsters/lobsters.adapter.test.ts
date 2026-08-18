import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/lobsters-hottest.json';
import { storiesToCards, type LobstersStory } from './lobsters.adapter';

const stories = fixture as LobstersStory[];

describe('lobsters adapter', () => {
  const cards = storiesToCards(stories, 'tech');

  it('turns every story into a card with plain-text bodies', () => {
    expect(cards).toHaveLength(stories.length);
    for (const card of cards) {
      expect(card.id).toMatch(/^lobsters:/);
      expect(card.body.length).toBeGreaterThan(0);
      expect(card.body).not.toMatch(/<[^>]+>/);
      expect(card.sourceUrl).toMatch(/^https:\/\//);
    }
  });

  it('uses the description when present, stats otherwise', () => {
    const withDescription = storiesToCards(
      [{ short_id: 'x', title: 'T', url: 'https://a.example/post', description: '<p>Real summary.</p>' }],
      'tech',
    );
    expect(withDescription[0]!.body).toBe('Real summary.');
    const withoutDescription = storiesToCards(
      [{ short_id: 'y', title: 'T2', url: 'https://a.example/2', score: 28, comment_count: 4, tags: ['privacy'] }],
      'tech',
    );
    expect(withoutDescription[0]!.body).toBe('28 points and 4 comments on Lobsters. Tagged privacy.');
  });
});
