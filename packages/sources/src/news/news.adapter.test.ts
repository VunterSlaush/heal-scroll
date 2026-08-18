import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { feedItemsToCards, parseFeed } from '../rss/rss.adapter';
import { NEWS_FEEDS, newsAdapter } from './news.adapter';

const xml = readFileSync(fileURLToPath(new URL('./__fixtures__/bbc-business.xml', import.meta.url)), 'utf8');

describe('news adapter', () => {
  it('serves the finance/health/science/tech topic waves', () => {
    expect(newsAdapter.id).toBe('news');
    expect(newsAdapter.config.topicIds.sort()).toEqual([
      'ai',
      'economics',
      'finance',
      'health',
      'markets',
      'mindfulness',
      'nutrition',
      'science',
      'space',
      'tech',
    ]);
    for (const feed of NEWS_FEEDS) expect(feed.url).toMatch(/^https:\/\//);
  });

  it('turns a BBC section feed into news cards', () => {
    const { feedTitle, items } = parseFeed(xml);
    const cards = feedItemsToCards(items.slice(0, 10), 'economics', feedTitle ?? 'BBC', 'news');
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(card.id).toMatch(/^news:/);
      expect(card.sourceId).toBe('news');
      expect(card.body).not.toMatch(/<[^>]+>/);
      expect(card.sourceUrl).toMatch(/^https:\/\//);
      if (card.publishedAt) expect(card.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
    // BBC feeds carry media thumbnails — at least some cards should have images.
    expect(cards.some((c) => c.imageUrl)).toBe(true);
  });
});
