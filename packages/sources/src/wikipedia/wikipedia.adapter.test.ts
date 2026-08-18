import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/wikipedia-space.json';
import { pagesToCards, type WikipediaResponse } from './wikipedia.adapter';

const response = fixture as WikipediaResponse;

describe('wikipedia adapter — pagesToCards (search-based pool)', () => {
  const cards = pagesToCards(response, 'space');

  it('search relevance beats category members: recognizable, well-read subjects', () => {
    // The fixture is a real search for "space exploration astronomy planets":
    // household names with tens of thousands of monthly views.
    expect(cards.length).toBeGreaterThanOrEqual(10);
    const titles = cards.map((c) => c.title);
    expect(titles).toContain('Solar System');
    expect(titles).toContain('Space exploration');
    for (const card of cards) {
      expect(card.popularity ?? 0).toBeGreaterThan(0.4); // 500+ views/month floor
    }
  });

  it('returns most-viewed first so limit slicing keeps the popular stuff', () => {
    const popularity = cards.map((c) => c.popularity ?? 0);
    expect(popularity).toEqual([...popularity].sort((a, b) => b - a));
    expect(cards[0]!.popularity).toBeGreaterThan(0.8);
  });

  it('drops meta pages like "Outline of space science"', () => {
    expect(cards.map((c) => c.title)).not.toContain('Outline of space science');
  });

  it('produces plain-text bodies within the length budget, ending at a sentence', () => {
    for (const card of cards) {
      expect(card.body).not.toMatch(/<[^>]+>/);
      expect(card.body.length).toBeGreaterThanOrEqual(120);
      expect(card.body.length).toBeLessThanOrEqual(1001);
      expect(card.body).toMatch(/[.!?…]$/);
    }
  });

  it('filters list/meta pages and keeps popularity optional without pageviews', () => {
    const longExtract = `<p>${'A perfectly interesting sentence about the topic at hand. '.repeat(5)}</p>`;
    const synthetic = pagesToCards(
      {
        query: {
          pages: [
            { pageid: 1, title: 'List of space agencies', extract: longExtract },
            { pageid: 2, title: 'Space (disambiguation)', extract: longExtract },
            { pageid: 3, title: 'No thumbnail, no views', extract: longExtract },
          ],
        },
      },
      'space',
    );
    expect(synthetic).toHaveLength(1);
    expect(synthetic[0]!.popularity).toBeUndefined();
  });

  it('dedupe hashes are unique across the fixture', () => {
    expect(new Set(cards.map((c) => c.hash)).size).toBe(cards.length);
  });
});
