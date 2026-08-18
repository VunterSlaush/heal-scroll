import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/devto-programming.json';
import { articlesToCards, type DevtoArticle } from './devto.adapter';

const articles = fixture as DevtoArticle[];

describe('devto adapter — articlesToCards', () => {
  const cards = articlesToCards(articles, 'tech');

  it('maps the weekly-top articles with reaction-based popularity', () => {
    expect(cards).toHaveLength(articles.length);
    for (const card of cards) {
      expect(card.id).toMatch(/^devto:\d+$/);
      expect(card.sourceId).toBe('devto');
      expect(card.body.length).toBeGreaterThan(0);
      expect(card.body).not.toMatch(/<[^>]+>/);
      expect(card.popularity).toBeGreaterThan(0);
      expect(card.popularity).toBeLessThanOrEqual(1);
      expect(card.sourceUrl).toMatch(/^https:\/\/dev\.to\//);
    }
  });

  it('cover images ride along for the visual substance gate', () => {
    expect(cards.some((c) => c.imageUrl)).toBe(true);
  });

  it('skips incomplete payloads', () => {
    expect(articlesToCards([{ title: 'no id' }, { id: 1, url: 'https://dev.to/x' }], 'tech')).toEqual([]);
  });
});
