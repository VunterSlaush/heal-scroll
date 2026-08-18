import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/wikipedia-space.json';
import { pagesToCards, type WikipediaResponse } from './wikipedia.adapter';

const response = fixture as WikipediaResponse;

describe('wikipedia adapter — pagesToCards', () => {
  const cards = pagesToCards(response, 'space');

  it('keeps only well-read pages and returns them most-viewed first', () => {
    // Fixture has 8 pages; everything under 500 views/30d drops out
    // (GGSE-4: 19, Dynamical dimensional reduction: 48, Crucids: 58,
    // BOTSAT-1: 142, Cycler: 327).
    expect(cards.map((c) => c.title)).toEqual([
      'Space', // 13099 views
      'Human presence in space', // 1413
      'Astranis', // 1172
    ]);
  });

  it('maps the first page completely, including log-scale popularity', () => {
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
    // 13k views/30d → log10(13100)/6 ≈ 0.69
    expect(space?.popularity).toBeGreaterThan(0.6);
    expect(space?.popularity).toBeLessThanOrEqual(1);
    expect(space?.body.startsWith('Space is a three-dimensional continuum')).toBe(true);
  });

  it('produces plain-text bodies within the length budget, ending at a sentence', () => {
    for (const card of cards) {
      expect(card.body).not.toMatch(/<[^>]+>/);
      expect(card.body).not.toMatch(/&[a-z]+;/);
      expect(card.body.length).toBeGreaterThanOrEqual(120);
      expect(card.body.length).toBeLessThanOrEqual(481);
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
    expect(synthetic[0]!.title).toBe('No thumbnail, no views');
    expect(synthetic[0]!.imageUrl).toBeUndefined();
    expect(synthetic[0]!.popularity).toBeUndefined();
  });

  it('dedupe hashes are unique across the fixture', () => {
    expect(new Set(cards.map((c) => c.hash)).size).toBe(cards.length);
  });

  it('skips pages without extracts and handles empty payloads', () => {
    expect(pagesToCards({ query: { pages: [{ pageid: 1, title: 'X' }] } }, 'space')).toEqual([]);
    expect(pagesToCards({}, 'space')).toEqual([]);
  });
});
