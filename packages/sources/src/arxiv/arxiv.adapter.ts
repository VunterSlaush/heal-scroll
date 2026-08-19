import type { Card, SourceConfig, SourcePort, Topic } from '@heal-scroll/core';
import { XMLParser } from 'fast-xml-parser';
import { makeSeriesCards } from '../splitters/make-series';
import { canonicalUrl } from '../utils/canonical-url';
import { splitAbstract } from './split-abstract';

export const ARXIV_CONFIG: SourceConfig = {
  userAgent: 'heal-scroll/0.1 (personal project; jesus.mota@monalee.co)',
  // arXiv asks for no more than one request every 3 seconds.
  rateLimitPerMinute: 20,
  ttlHours: 72,
  quality: 0.9,
  topicIds: ['space', 'science', 'ai'],
  dynamicTopics: true,
};

/** topicId → arXiv category for the export API. */
const TOPIC_CATEGORIES: Record<string, string> = {
  space: 'astro-ph.EP',
  science: 'q-bio.NC',
  ai: 'cs.LG',
};

const API_URL = 'https://export.arxiv.org/api/query';

export interface ArxivEntry {
  id: string;
  title: string;
  summary: string;
  published?: string;
  link?: unknown;
}

interface ArxivFeed {
  feed?: { entry?: ArxivEntry | ArxivEntry[] };
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

export function parseArxivFeed(xml: string): ArxivEntry[] {
  const parsed = parser.parse(xml) as ArxivFeed;
  const entry = parsed.feed?.entry;
  if (!entry) return [];
  return Array.isArray(entry) ? entry : [entry];
}

/** `http://arxiv.org/abs/2508.12345v1` → `2508.12345v1`. */
function externalId(absUrl: string): string {
  return absUrl.split('/abs/')[1] ?? absUrl;
}

export function entriesToCards(entries: ArxivEntry[], topicId: string): Card[] {
  return entries.flatMap((entry) => {
    const title = entry.title.replace(/\s+/g, ' ').trim();
    const abstract = entry.summary?.replace(/\s+/g, ' ').trim();
    if (!title || !abstract) return [];
    const id = `arxiv:${externalId(entry.id)}`;
    const base: Omit<Card, 'body' | 'hash'> = {
      id,
      topicId,
      sourceId: 'arxiv',
      title,
      sourceName: 'arXiv',
      sourceUrl: canonicalUrl(entry.id),
    };
    if (entry.published) base.publishedAt = entry.published;
    return makeSeriesCards(base, splitAbstract(abstract));
  });
}

export const arxivAdapter: SourcePort = {
  id: 'arxiv',
  name: 'arXiv',
  config: ARXIV_CONFIG,

  async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
    const category = TOPIC_CATEGORIES[topic.id];
    const searchQuery = category ? `cat:${category}` : topic.query ? `all:"${topic.query}"` : undefined;
    if (!searchQuery || limit <= 0) return [];
    const query = [
      `search_query=${encodeURIComponent(searchQuery)}`,
      'sortBy=submittedDate',
      'sortOrder=descending',
      `max_results=${Math.min(limit, 25)}`,
    ].join('&');
    const response = await fetch(`${API_URL}?${query}`, {
      headers: { 'User-Agent': ARXIV_CONFIG.userAgent },
    });
    if (!response.ok) throw new Error(`arxiv: HTTP ${response.status} for ${topic.id}`);
    return entriesToCards(parseArxivFeed(await response.text()), topic.id);
  },
};
