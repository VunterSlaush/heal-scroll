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

/**
 * topicId → full-text search terms. CirrusSearch relevance already favors
 * well-linked, notable articles, and the pageview sort below finishes the
 * job — a far better pool than raw category members ever gave.
 */
const TOPIC_SEARCHES: Record<string, string> = {
  space: 'space exploration astronomy planets',
  science: 'scientific discovery biology physics',
  tech: 'computer technology software internet',
  ai: 'artificial intelligence machine learning',
  history: 'ancient history empire civilization',
  economics: 'economics trade industry companies',
  markets: 'stock market investment banking',
  finance: 'personal finance money savings investment',
  health: 'medicine disease treatment human health',
  nutrition: 'nutrition food diet vitamins',
  longevity: 'ageing sleep longevity lifespan',
  mindfulness: 'meditation psychology mental health',
};

const MAX_BODY_CHARS = 480; // ≈ 2–4 sentences
const SEARCH_BATCH = 20;

// Curation gates: obscure stubs and list/meta pages don't make interesting cards.
const MIN_BODY_CHARS = 120;
const MIN_MONTHLY_VIEWS = 500;
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

/**
 * Pure transform: recorded API payload → cards, most-viewed first so callers
 * slicing to a limit keep the popular stuff. This is what the fixture test covers.
 */
export function pagesToCards(response: WikipediaResponse, topicId: string): Card[] {
  const pages = response.query?.pages ?? [];
  const cards = pages.flatMap((page) => {
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
  return cards.sort((a, b) => (b.popularity ?? 0.5) - (a.popularity ?? 0.5));
}

function buildQuery(searchTerms: string): string {
  const params: Record<string, string> = {
    action: 'query',
    format: 'json',
    formatversion: '2',
    generator: 'search',
    gsrsearch: searchTerms,
    gsrlimit: String(SEARCH_BATCH),
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
 * Language-aware adapter: queries the content language's wiki with the topic's
 * search terms (English terms match reasonably via cognates and redirects);
 * when a localized wiki yields too little, English fills the gap.
 */
export function createWikipediaAdapter(
  getLanguage: () => Promise<string> = () => Promise.resolve('en'),
): SourcePort {
  async function search(lang: string, topicId: string, terms: string): Promise<Card[]> {
    const response = await fetch(`https://${lang}.wikipedia.org/w/api.php?${buildQuery(terms)}`, {
      headers: HEADERS,
    });
    if (!response.ok) throw new Error(`wikipedia: HTTP ${response.status} for ${topicId}`);
    return pagesToCards((await response.json()) as WikipediaResponse, topicId);
  }

  return {
    id: 'wikipedia',
    name: 'Wikipedia',
    config: WIKIPEDIA_CONFIG,

    async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
      const terms = TOPIC_SEARCHES[topic.id];
      if (!terms || limit <= 0) return [];
      const language = await getLanguage();
      let cards = await search(language, topic.id, terms);
      if (cards.length < 3 && language !== 'en') {
        cards = await search('en', topic.id, terms);
      }
      return cards.slice(0, limit);
    },
  };
}

export const wikipediaAdapter: SourcePort = createWikipediaAdapter();
