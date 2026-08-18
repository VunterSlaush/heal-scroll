import type { Card, SourceConfig, SourcePort, Topic } from '@heal-scroll/core';
import { canonicalUrl } from '../utils/canonical-url';
import { hashTitle } from '../utils/hash-title';
import { stripHtml } from '../utils/strip-html';
import { truncateAtSentence } from '../utils/truncate-at-sentence';

export const LOBSTERS_CONFIG: SourceConfig = {
  userAgent: 'heal-scroll/0.1 (personal project; jesus.mota@monalee.co)',
  rateLimitPerMinute: 30,
  ttlHours: 12,
  quality: 0.65,
  topicIds: ['tech'],
};

const API_URL = 'https://lobste.rs/hottest.json';

export interface LobstersStory {
  short_id: string;
  title?: string;
  url?: string;
  score?: number;
  comment_count?: number;
  created_at?: string;
  description?: string;
  tags?: string[];
  comments_url?: string;
}

export function storiesToCards(stories: LobstersStory[], topicId: string): Card[] {
  return stories.flatMap((story) => {
    if (!story.title) return [];
    const target = story.url || story.comments_url;
    if (!target) return [];
    const description = story.description ? stripHtml(story.description) : '';
    const body = description
      ? truncateAtSentence(description, 1000)
      : [
          `${story.score ?? 0} points and ${story.comment_count ?? 0} comments on Lobsters.`,
          story.tags?.length ? `Tagged ${story.tags.join(', ')}.` : '',
        ]
          .filter(Boolean)
          .join(' ');
    const card: Card = {
      id: `lobsters:${story.short_id}`,
      topicId,
      sourceId: 'lobsters',
      title: story.title,
      body,
      sourceName: 'Lobsters',
      sourceUrl: canonicalUrl(target),
      hash: hashTitle(story.title),
      // Lobsters scores are small: ~15 → 0.48, ~100 → 0.8
      popularity: Math.min(1, Math.log10((story.score ?? 0) + 1) / 2.5),
    };
    if (story.created_at) card.publishedAt = story.created_at;
    return [card];
  });
}

export const lobstersAdapter: SourcePort = {
  id: 'lobsters',
  name: 'Lobsters',
  config: LOBSTERS_CONFIG,

  async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
    if (!LOBSTERS_CONFIG.topicIds.includes(topic.id) || limit <= 0) return [];
    const response = await fetch(API_URL, {
      headers: { 'User-Agent': LOBSTERS_CONFIG.userAgent },
    });
    if (!response.ok) throw new Error(`lobsters: HTTP ${response.status}`);
    const stories = (await response.json()) as LobstersStory[];
    return storiesToCards(stories, topic.id).slice(0, limit);
  },
};
