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

// Curation gates: obscure stubs and list/meta pages don't make interesting cards.
const MIN_BODY_CHARS = 120;
const MIN_MONTHLY_VIEWS = 150;
const BORING_TITLE = /^(List|Lists|Index|Outline|Glossary|Timeline) of |\(disambiguation\)$/;

interface WikipediaPage {
  pageid: number;
  title: string;
  extract?: string;
  fullurl?: string;
  touched?: string;
  thumbnail?: { source: string };
  /** date → views, from prop=pageviews (may hold nulls for missing days). */
  pageviews?: Record<string, number | null>;
}

export interface WikipediaResponse {
  query?: { pages?: WikipediaPage[] };
}

/** log-scale: ~1k views/month → 0.5, ~1M+ → 1. */
function popularityFromViews(totalViews: number): number {
  return Math.min(1, Math.log10(totalViews + 1) / 6);
}

/** Pure transform: recorded API payload → cards. This is what the fixture test covers. */
export function pagesToCards(response: WikipediaResponse, topicId: string): Card[] {
  const pages = response.query?.pages ?? [];
  return pages.flatMap((page) => {
    if (!page.extract || BORING_TITLE.test(page.title)) return [];
    const body = truncateAtSentence(stripHtml(page.extract), MAX_BODY_CHARS);
    if (body.length < MIN_BODY_CHARS) return [];
    const totalViews = page.pageviews
      ? Object.values(page.pageviews).reduce((sum: number, v) => sum + (v ?? 0), 0)
      : undefined;
    if (totalViews !== undefined && totalViews < MIN_MONTHLY_VIEWS) return [];
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
    if (totalViews !== undefined) card.popularity = popularityFromViews(totalViews);
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
    prop: 'extracts|pageimages|info|pageviews',
    exintro: '1',
    exlimit: 'max',
    piprop: 'thumbnail',
    pithumbsize: '640',
    inprop: 'url',
    pvipdays: '30',
  };
  return Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
}

const HEADERS = {
  'User-Agent': WIKIPEDIA_CONFIG.userAgent,
  'Api-User-Agent': WIKIPEDIA_CONFIG.userAgent,
};

/**
 * Language-aware adapter. Category names differ per wiki, so for non-English
 * languages the English category's langlink is resolved once (cached) and the
 * matching wiki is queried; topics without a localized category fall back to
 * English content rather than going empty.
 */
export function createWikipediaAdapter(
  getLanguage: () => Promise<string> = () => Promise.resolve('en'),
): SourcePort {
  const localizedCategories = new Map<string, string | null>();

  async function resolveCategory(topicId: string, language: string): Promise<{ lang: string; category: string } | undefined> {
    const englishCategory = TOPIC_CATEGORIES[topicId];
    if (!englishCategory) return undefined;
    if (language === 'en') return { lang: 'en', category: englishCategory };

    const cacheKey = `${language}:${topicId}`;
    if (!localizedCategories.has(cacheKey)) {
      try {
        const response = await fetch(
          `${API_URL}?action=query&format=json&formatversion=2&prop=langlinks&lllimit=1&lllang=${language}&titles=${encodeURIComponent(englishCategory)}`,
          { headers: HEADERS },
        );
        const json = (await response.json()) as {
          query?: { pages?: Array<{ langlinks?: Array<{ title?: string }> }> };
        };
        localizedCategories.set(cacheKey, json.query?.pages?.[0]?.langlinks?.[0]?.title ?? null);
      } catch {
        localizedCategories.set(cacheKey, null);
      }
    }
    const localized = localizedCategories.get(cacheKey);
    return localized ? { lang: language, category: localized } : { lang: 'en', category: englishCategory };
  }

  return {
    id: 'wikipedia',
    name: 'Wikipedia',
    config: WIKIPEDIA_CONFIG,

    async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
      if (limit <= 0) return [];
      const resolved = await resolveCategory(topic.id, await getLanguage());
      if (!resolved) return [];
      const apiUrl = `https://${resolved.lang}.wikipedia.org/w/api.php`;
      const response = await fetch(`${apiUrl}?${buildQuery(resolved.category, limit)}`, {
        headers: HEADERS,
      });
      if (!response.ok) {
        throw new Error(`wikipedia: HTTP ${response.status} for ${topic.id}`);
      }
      const json = (await response.json()) as WikipediaResponse;
      return pagesToCards(json, topic.id).slice(0, limit);
    },
  };
}

export const wikipediaAdapter: SourcePort = createWikipediaAdapter();
