import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/hn-front-page.json';
import { hitsToCards, type HnResponse } from './hacker-news.adapter';

const response = fixture as HnResponse;

describe('hacker-news adapter', () => {
  const cards = hitsToCards(response, 'tech');

  it('turns every hit into a card', () => {
    expect(cards).toHaveLength(10);
  });

  it('links to the article and keeps the stats in a deterministic body', () => {
    const first = cards[0]!;
    expect(first.id).toMatch(/^hn:\d+$/);
    expect(first.sourceId).toBe('hn');
    expect(first.sourceUrl).toMatch(/^https:\/\//);
    expect(first.body).toMatch(/\d+ points and \d+ comments on Hacker News\./);
    expect(first.publishedAt).toMatch(/^\d{4}-/);
  });

  it('falls back to the discussion page for url-less stories and skips titleless hits', () => {
    const cards2 = hitsToCards(
      { hits: [{ objectID: '1', title: 'Ask HN: X?', url: null, story_text: '<p>Question body.</p>' }, { objectID: '2' }] },
      'tech',
    );
    expect(cards2).toHaveLength(1);
    expect(cards2[0]!.sourceUrl).toBe('https://news.ycombinator.com/item?id=1');
    expect(cards2[0]!.body).toBe('Question body.');
  });
});
