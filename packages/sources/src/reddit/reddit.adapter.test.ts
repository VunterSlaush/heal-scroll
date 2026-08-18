import { isSubstantialCard } from '@heal-scroll/core';
import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/reddit-space-top.json';
import { postsToCards, TOPIC_SUBREDDITS, type RedditListing } from './reddit.adapter';

const listing = fixture as RedditListing;

describe('reddit adapter — postsToCards', () => {
  const cards = postsToCards(listing, 'space');

  it('skips stickied/meta posts and keeps the rest', () => {
    // 4 posts: the stickied weekly thread drops out.
    expect(cards.map((c) => c.id)).toEqual(['reddit:1mtx8ab', 'reddit:1mtw2cd', 'reddit:1mtu1gh']);
  });

  it('maps image posts with unescaped preview urls and log-scale popularity', () => {
    const image = cards[0]!;
    expect(image.imageUrl).toBe('https://preview.redd.it/carina-nebula-example.jpg?width=1080&format=pjpg');
    expect(image.sourceName).toBe('r/space');
    expect(image.sourceUrl).toMatch(/^https:\/\/www\.reddit\.com\/r\/space\/comments\//);
    expect(image.popularity).toBeGreaterThan(0.8);
    expect(image.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('selftext posts carry their own text as the body', () => {
    const text = cards.find((c) => c.id === 'reddit:1mtw2cd')!;
    expect(text.body).toMatch(/^I was looking at a diagram/);
    expect(text.body.length).toBeLessThanOrEqual(481);
  });

  it('stat-only link posts exist but fail the core substance gate', () => {
    const bare = cards.find((c) => c.id === 'reddit:1mtu1gh')!;
    expect(bare.imageUrl).toBeUndefined();
    expect(isSubstantialCard(bare)).toBe(false); // filtered before storage by refillBuffer
    expect(isSubstantialCard(cards[0]!)).toBe(true); // image post passes with a short body
  });

  it('covers every topic with at least one subreddit', () => {
    for (const topic of ['space', 'science', 'tech', 'ai', 'history', 'economics', 'markets', 'finance', 'health', 'nutrition', 'longevity', 'mindfulness']) {
      expect(TOPIC_SUBREDDITS[topic]?.length).toBeGreaterThan(0);
    }
  });
});
