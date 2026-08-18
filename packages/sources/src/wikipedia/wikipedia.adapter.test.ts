import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/wikipedia-space.json';
import { pagesToCards, type WikipediaResponse } from './wikipedia.adapter';

const response = fixture as WikipediaResponse;

describe('wikipedia adapter — pagesToCards', () => {
  const cards = pagesToCards(response, 'space');

  it('turns every fixture page with an extract into a card', () => {
    expect(cards).toHaveLength(8);
  });

  it('maps the first page completely', () => {
    const space = cards.find((c) => c.id === 'wikipedia:27667');
    expect(space).toMatchObject({
      topicId: 'space',
      sourceId: 'wikipedia',
      sourceName: 'Wikipedia',
      title: 'Space',
      sourceUrl: 'https://en.wikipedia.org/wiki/Space',
      imageUrl: expect.stringContaining('https://upload.wikimedia.org/'),
      publishedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      hash: expect.stringMatching(/^[0-9a-f]{8}$/),
    });
    expect(space?.body.startsWith('Space is a three-dimensional continuum')).toBe(true);
  });

  it('produces plain-text bodies within the length budget, ending at a sentence', () => {
    for (const card of cards) {
      expect(card.body).not.toMatch(/<[^>]+>/);
      expect(card.body).not.toMatch(/&[a-z]+;/);
      expect(card.body.length).toBeGreaterThan(0);
      expect(card.body.length).toBeLessThanOrEqual(481);
      expect(card.body).toMatch(/[.!?…]$/);
    }
  });

  it('omits imageUrl when the page has no thumbnail', () => {
    const noThumb = cards.find((c) => c.title === 'GGSE-4');
    expect(noThumb).toBeDefined();
    expect(noThumb?.imageUrl).toBeUndefined();
  });

  it('dedupe hashes are unique across the fixture', () => {
    expect(new Set(cards.map((c) => c.hash)).size).toBe(cards.length);
  });

  it('skips pages without extracts and handles empty payloads', () => {
    expect(pagesToCards({ query: { pages: [{ pageid: 1, title: 'X' }] } }, 'space')).toEqual([]);
    expect(pagesToCards({}, 'space')).toEqual([]);
  });
});
