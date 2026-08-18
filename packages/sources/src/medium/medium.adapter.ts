import type { Card } from '@heal-scroll/core';
import { isSubstantialCard } from '@heal-scroll/core';
import { createFeedAdapter, type FeedSpec } from '../rss/rss.adapter';

/**
 * Medium's public API is write-only and its RSS feeds stopped carrying full
 * articles (PLAN §3 notes) — tag feeds serve teaser snippets. So Medium cards
 * are teasers: boilerplate stripped, and only posts whose authors wrote a real
 * subtitle survive the substance gate. Modest yield, decent quality.
 */
const tagFeed = (tag: string, name: string, topicIds: string[]): FeedSpec => ({
  url: `https://medium.com/feed/tag/${tag}`,
  name,
  topicIds,
});

export const MEDIUM_FEEDS: FeedSpec[] = [
  tagFeed('space', 'Medium · Space', ['space']),
  tagFeed('science', 'Medium · Science', ['science']),
  tagFeed('programming', 'Medium · Programming', ['tech']),
  tagFeed('artificial-intelligence', 'Medium · AI', ['ai']),
  tagFeed('history', 'Medium · History', ['history']),
  tagFeed('economics', 'Medium · Economics', ['economics']),
  tagFeed('investing', 'Medium · Investing', ['markets', 'finance']),
  tagFeed('health', 'Medium · Health', ['health']),
  tagFeed('nutrition', 'Medium · Nutrition', ['nutrition']),
  tagFeed('longevity', 'Medium · Longevity', ['longevity']),
  tagFeed('mindfulness', 'Medium · Mindfulness', ['mindfulness']),
];

const BOILERPLATE = /\s*Continue reading on .*?»\s*\.?$/;

export function cleanMediumCards(cards: Card[]): Card[] {
  return cards
    .map((card) => ({ ...card, body: card.body.replace(BOILERPLATE, '').trim() }))
    .filter(isSubstantialCard);
}

export const mediumAdapter = createFeedAdapter({
  id: 'medium',
  name: 'Medium',
  quality: 0.55,
  ttlHours: 24,
  feeds: MEDIUM_FEEDS,
  postProcess: cleanMediumCards,
});
