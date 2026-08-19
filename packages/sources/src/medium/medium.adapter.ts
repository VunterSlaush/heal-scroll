import type { Card, SourceConfig, SourcePort, Topic } from '@heal-scroll/core';
import { feedItemsToCards, parseFeed } from '../rss/rss.adapter';

/**
 * Medium's public API is write-only and its RSS feeds stopped carrying full
 * articles (PLAN §3 notes) — tag feeds serve teaser snippets. So Medium cards
 * are teasers: boilerplate stripped, and only posts whose authors wrote a real
 * subtitle survive. Any topic works: user topics resolve to a dash-slugged tag.
 */
export const MEDIUM_CONFIG: SourceConfig = {
  userAgent: 'heal-scroll/0.1 (personal project; jesus.mota@monalee.co)',
  rateLimitPerMinute: 30,
  ttlHours: 24,
  quality: 0.55,
  topicIds: [
    'space', 'science', 'tech', 'ai', 'history', 'economics', 'markets',
    'finance', 'health', 'nutrition', 'longevity', 'mindfulness',
  ],
  dynamicTopics: true,
};

/** Curated tag per default topic; user topics fall back to a slug of their term. */
export const MEDIUM_TAGS: Record<string, string> = {
  space: 'space',
  science: 'science',
  tech: 'programming',
  ai: 'artificial-intelligence',
  history: 'history',
  economics: 'economics',
  markets: 'investing',
  finance: 'investing',
  health: 'health',
  nutrition: 'nutrition',
  longevity: 'longevity',
  mindfulness: 'mindfulness',
};

/** "Quantum Computing" → "quantum-computing" (Medium's tag URL format). */
export function mediumTag(topic: Topic): string | undefined {
  const curated = MEDIUM_TAGS[topic.id];
  if (curated) return curated;
  const slug = topic.query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || undefined;
}

const BOILERPLATE = /\s*Continue reading on .*?»\s*\.?$/;

/** Teasers must earn the screen with a real subtitle — a cover image alone is not enough. */
const MIN_TEASER_CHARS = 120;

export function cleanMediumCards(cards: Card[]): Card[] {
  return cards
    .map((card) => ({ ...card, body: card.body.replace(BOILERPLATE, '').trim() }))
    .filter((card) => card.body.length >= MIN_TEASER_CHARS);
}

export const mediumAdapter: SourcePort = {
  id: 'medium',
  name: 'Medium',
  config: MEDIUM_CONFIG,

  async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
    const tag = mediumTag(topic);
    if (!tag || limit <= 0) return [];
    const response = await fetch(`https://medium.com/feed/tag/${tag}`, {
      headers: { 'User-Agent': MEDIUM_CONFIG.userAgent },
    });
    // Unknown tags 404 — that just means Medium has nothing for this topic.
    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`medium: HTTP ${response.status} for ${tag}`);
    const { feedTitle, items } = parseFeed(await response.text());
    return cleanMediumCards(
      feedItemsToCards(items.slice(0, limit), topic.id, feedTitle ?? 'Medium', 'medium'),
    );
  },
};
