import { describe, expect, it } from 'vitest';
import categoriesFixture from './__fixtures__/categories-en.json';
import feedFixture from './__fixtures__/featured-en.json';
import {
  featuredToCards,
  type CategoriesResponse,
  type FeaturedFeed,
} from './wikipedia-featured.adapter';

const feed = feedFixture as FeaturedFeed;
const categories = categoriesFixture as CategoriesResponse;

describe('wikipedia-featured adapter — featuredToCards', () => {
  const cards = featuredToCards(feed, categories, '2026-08-18');

  it('drops the celebrity-dominated most-read entries that match no topic', () => {
    // The fixture's most-read is actresses, boxers and TV shows; only a
    // handful of candidates map to a real topic.
    const titles = cards.map((c) => c.title);
    expect(titles).not.toContain('Hayden Panettiere');
    expect(titles).not.toContain('Wladimir Klitschko');
    // OBE honours must not read as "empire" → history.
    expect(titles).not.toContain('Bonnie Tyler');
    expect(cards.length).toBeGreaterThanOrEqual(1);
    expect(cards.length).toBeLessThan(6);
  });

  it("maps today's featured article to history via its battle/siege categories", () => {
    const tfa = cards.find((c) => c.title.startsWith('Featured:'));
    expect(tfa).toBeDefined();
    expect(tfa!.topicId).toBe('history');
    expect(tfa!.popularity).toBe(0.85);
  });

  it('most-read survivors carry view-based popularity and stable ids', () => {
    for (const card of cards) {
      expect(card.id).toMatch(/^wikipedia-featured:2026-08-18:/);
      expect(card.sourceId).toBe('wikipedia-featured');
      expect(card.popularity).toBeGreaterThan(0.5);
      expect(card.body).not.toMatch(/<[^>]+>/);
      expect(card.sourceUrl).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//);
    }
    expect(featuredToCards(feed, categories, '2026-08-18').map((c) => c.id)).toEqual(
      cards.map((c) => c.id),
    );
  });

  it('handles empty feeds', () => {
    expect(featuredToCards({}, {}, '2026-08-18')).toEqual([]);
  });
});
