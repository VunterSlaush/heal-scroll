import type { Card, SourceConfig, SourcePort, Topic } from '@heal-scroll/core';
import { canonicalUrl } from '../utils/canonical-url';
import { hashTitle } from '../utils/hash-title';
import { stripHtml } from '../utils/strip-html';
import { truncateAtSentence } from '../utils/truncate-at-sentence';

export const HACKER_NEWS_CONFIG: SourceConfig = {
  userAgent: 'heal-scroll/0.1 (personal project; jesus.mota@monalee.co)',
  rateLimitPerMinute: 60,
  ttlHours: 12,
  quality: 0.6,
  topicIds: ['tech', 'ai'],
  dynamicTopics: true,
};

/** Algolia search API — one request per fetch, no per-item calls. */
const API_URL = 'https://hn.algolia.com/api/v1/search';

const TOPIC_QUERIES: Record<string, string> = {
  tech: 'tags=front_page',
  ai: `query=${encodeURIComponent('artificial intelligence')}&tags=story&numericFilters=${encodeURIComponent('points>50')}`,
};

export interface HnHit {
  objectID: string;
  title?: string;
  url?: string | null;
  points?: number;
  num_comments?: number;
  created_at?: string;
  story_text?: string | null;
}

export interface HnResponse {
  hits?: HnHit[];
}

function domainOf(url: string): string | undefined {
  const match = /^https?:\/\/(?:www\.)?([^/]+)/i.exec(url);
  return match?.[1]?.toLowerCase();
}

export function hitsToCards(response: HnResponse, topicId: string): Card[] {
  return (response.hits ?? []).flatMap((hit) => {
    if (!hit.title) return [];
    const discussionUrl = `https://news.ycombinator.com/item?id=${hit.objectID}`;
    const targetUrl = hit.url ?? discussionUrl;
    // Deterministic body: Ask/Show HN text when present, else the discussion stats.
    const body = hit.story_text
      ? truncateAtSentence(stripHtml(hit.story_text), 1000)
      : [
          `${hit.points ?? 0} points and ${hit.num_comments ?? 0} comments on Hacker News.`,
          hit.url ? `Article from ${domainOf(hit.url) ?? 'the web'}.` : '',
        ]
          .filter(Boolean)
          .join(' ');
    const card: Card = {
      id: `hn:${hit.objectID}`,
      topicId,
      sourceId: 'hn',
      title: hit.title,
      body,
      sourceName: 'Hacker News',
      sourceUrl: canonicalUrl(targetUrl),
      hash: hashTitle(hit.title),
      // ~50 points → 0.49, ~500 → 0.77, ~3000+ → 1
      popularity: Math.min(1, Math.log10((hit.points ?? 0) + 1) / 3.5),
    };
    if (hit.created_at) card.publishedAt = hit.created_at;
    return [card];
  });
}

export const hackerNewsAdapter: SourcePort = {
  id: 'hn',
  name: 'Hacker News',
  config: HACKER_NEWS_CONFIG,

  async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
    const topicQuery =
      TOPIC_QUERIES[topic.id] ??
      (topic.query
        ? "query=" + encodeURIComponent(topic.query) + "&tags=story&numericFilters=" + encodeURIComponent('points>20')
        : undefined);
    if (!topicQuery || limit <= 0) return [];
    const response = await fetch(`${API_URL}?${topicQuery}&hitsPerPage=${Math.min(limit, 30)}`, {
      headers: { 'User-Agent': HACKER_NEWS_CONFIG.userAgent },
    });
    if (!response.ok) throw new Error(`hn: HTTP ${response.status} for ${topic.id}`);
    const json = (await response.json()) as HnResponse;
    return hitsToCards(json, topic.id).slice(0, limit);
  },
};
