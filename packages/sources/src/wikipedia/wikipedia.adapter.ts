import type { Card, SourceConfig, SourcePort, Topic } from '@heal-scroll/core';
import { canonicalUrl } from '../utils/canonical-url';
import { hashTitle } from '../utils/hash-title';
import { stripHtml } from '../utils/strip-html';
import { truncateAtSentence } from '../utils/truncate-at-sentence';

export const WIKIPEDIA_CONFIG: SourceConfig = {
  // Wikimedia UA policy: identify the client and give a contact.
  userAgent: 'heal-scroll/0.1 (personal project; jesus.mota@monalee.co)',
  rateLimitPerMinute: 30,
  ttlHours: 24 * 7,
  quality: 0.8,
  topicIds: [
    'space',
    'science',
    'tech',
    'ai',
    'history',
    'economics',
    'markets',
    'finance',
    'health',
    'nutrition',
    'longevity',
    'mindfulness',
  ],
};

/** topicId → category used with generator=categorymembers. */
const TOPIC_CATEGORIES: Record<string, string> = {
  space: 'Category:Space',
  science: 'Category:Science',
  tech: 'Category:Technology',
  ai: 'Category:Artificial intelligence',
  history: 'Category:History',
  economics: 'Category:Economics',
  markets: 'Category:Financial markets',
  finance: 'Category:Personal finance',
  health: 'Category:Medicine',
  nutrition: 'Category:Nutrition',
  longevity: 'Category:Ageing',
  mindfulness: 'Category:Mindfulness',
};

const API_URL = 'https://en.wikipedia.org/w/api.php';
const MAX_BODY_CHARS = 480; // ≈ 2–4 sentences
const MAX_PAGES_PER_REQUEST = 20; // exlimit ceiling for extracts

interface WikipediaPage {
  pageid: number;
  title: string;
  extract?: string;
  fullurl?: string;
  touched?: string;
  thumbnail?: { source: string };
}

export interface WikipediaResponse {
  query?: { pages?: WikipediaPage[] };
}

/** Pure transform: recorded API payload → cards. This is what the fixture test covers. */
export function pagesToCards(response: WikipediaResponse, topicId: string): Card[] {
  const pages = response.query?.pages ?? [];
  return pages.flatMap((page) => {
    if (!page.extract) return [];
    const body = truncateAtSentence(stripHtml(page.extract), MAX_BODY_CHARS);
    if (!body) return [];
    const card: Card = {
      id: `wikipedia:${page.pageid}`,
      topicId,
      sourceId: 'wikipedia',
      title: page.title,
      body,
      sourceName: 'Wikipedia',
      sourceUrl: canonicalUrl(page.fullurl ?? `https://en.wikipedia.org/?curid=${page.pageid}`),
      hash: hashTitle(page.title),
    };
    if (page.thumbnail?.source) card.imageUrl = page.thumbnail.source;
    if (page.touched) card.publishedAt = page.touched;
    return [card];
  });
}

function buildQuery(category: string, limit: number): string {
  const params: Record<string, string> = {
    action: 'query',
    format: 'json',
    formatversion: '2',
    generator: 'categorymembers',
    gcmtitle: category,
    gcmtype: 'page',
    gcmlimit: String(Math.min(Math.max(limit, 1), MAX_PAGES_PER_REQUEST)),
    prop: 'extracts|pageimages|info',
    exintro: '1',
    exlimit: 'max',
    piprop: 'thumbnail',
    pithumbsize: '640',
    inprop: 'url',
  };
  return Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
}

export const wikipediaAdapter: SourcePort = {
  id: 'wikipedia',
  name: 'Wikipedia',
  config: WIKIPEDIA_CONFIG,

  async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
    const category = TOPIC_CATEGORIES[topic.id];
    if (!category || limit <= 0) return [];

    const response = await fetch(`${API_URL}?${buildQuery(category, limit)}`, {
      headers: {
        'User-Agent': WIKIPEDIA_CONFIG.userAgent,
        'Api-User-Agent': WIKIPEDIA_CONFIG.userAgent,
      },
    });
    if (!response.ok) {
      throw new Error(`wikipedia: HTTP ${response.status} for ${topic.id}`);
    }
    const json = (await response.json()) as WikipediaResponse;
    return pagesToCards(json, topic.id).slice(0, limit);
  },
};
