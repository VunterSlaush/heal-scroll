import type { Card, SourceConfig, SourcePort, Topic } from '@heal-scroll/core';
import { canonicalUrl } from '../utils/canonical-url';
import { hashTitle } from '../utils/hash-title';
import { stripHtml } from '../utils/strip-html';
import { truncateAtSentence } from '../utils/truncate-at-sentence';

/** Dev.to public API: keyless, `top=7` returns the week's most-hearted posts. */
export const DEVTO_CONFIG: SourceConfig = {
  userAgent: 'heal-scroll/0.1 (personal project; jesus.mota@monalee.co)',
  rateLimitPerMinute: 30,
  ttlHours: 24,
  quality: 0.65,
  topicIds: ['tech', 'ai'],
  dynamicTopics: true,
};

const TOPIC_TAGS: Record<string, string> = {
  tech: 'programming',
  ai: 'machinelearning',
};

const API_URL = 'https://dev.to/api/articles';

/** dev.to tags are bare alphanumerics: "Quantum Computing" -> "quantumcomputing". */
export function devtoTag(topic: Topic): string | undefined {
  const curated = TOPIC_TAGS[topic.id];
  if (curated) return curated;
  const slug = topic.query.toLowerCase().replace(/[^a-z0-9]/g, '');
  return slug || undefined;
}

export interface DevtoArticle {
  id?: number;
  title?: string;
  description?: string;
  url?: string;
  cover_image?: string | null;
  published_at?: string;
  positive_reactions_count?: number;
}

export function articlesToCards(articles: DevtoArticle[], topicId: string): Card[] {
  return articles.flatMap((article) => {
    if (!article.id || !article.title || !article.url) return [];
    const body = truncateAtSentence(stripHtml(article.description ?? ''), 480);
    if (!body) return [];
    const card: Card = {
      id: `devto:${article.id}`,
      topicId,
      sourceId: 'devto',
      title: article.title,
      body,
      sourceName: 'DEV Community',
      sourceUrl: canonicalUrl(article.url),
      hash: hashTitle(article.title),
      // ~30 reactions → 0.5, ~1000 → 1
      popularity: Math.min(1, Math.log10((article.positive_reactions_count ?? 0) + 1) / 3),
    };
    if (article.cover_image) card.imageUrl = article.cover_image;
    if (article.published_at) card.publishedAt = article.published_at;
    return [card];
  });
}

export const devtoAdapter: SourcePort = {
  id: 'devto',
  name: 'DEV Community',
  config: DEVTO_CONFIG,

  async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
    const tag = devtoTag(topic);
    if (!tag || limit <= 0) return [];
    const response = await fetch(`${API_URL}?tag=${tag}&top=7&per_page=${Math.min(limit, 30)}`, {
      headers: { 'User-Agent': DEVTO_CONFIG.userAgent },
    });
    if (!response.ok) throw new Error(`devto: HTTP ${response.status} for ${topic.id}`);
    const articles = (await response.json()) as DevtoArticle[];
    return articlesToCards(articles, topic.id);
  },
};
