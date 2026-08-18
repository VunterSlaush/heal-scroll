import type { Card, SourceConfig, SourcePort, Topic } from '@heal-scroll/core';
import { canonicalUrl } from '../utils/canonical-url';
import { hashTitle } from '../utils/hash-title';
import { stripHtml } from '../utils/strip-html';
import { truncateAtSentence } from '../utils/truncate-at-sentence';

/**
 * Wikipedia's daily "featured" feed: today's featured article (editorially
 * curated) plus the most-read articles of the day. Most-read is dominated by
 * pop culture, so every candidate is topic-mapped through its categories and
 * anything that matches no enabled topic is dropped — low yield, high signal.
 * Mapping keys on English category names, so this source is strongest in English.
 */
export const WIKIPEDIA_FEATURED_CONFIG: SourceConfig = {
  userAgent: 'heal-scroll/0.1 (personal project; jesus.mota@monalee.co)',
  rateLimitPerMinute: 10,
  ttlHours: 24,
  quality: 0.9,
  topicIds: [
    'space', 'science', 'tech', 'ai', 'history', 'economics', 'markets',
    'finance', 'health', 'nutrition', 'longevity', 'mindfulness',
  ],
};

/** topicId → regex matched against an article's category titles. */
const TOPIC_CATEGORY_PATTERNS: Record<string, RegExp> = {
  space: /astronom|planet|spacecraft|space |galax|solar system|cosmolog|nebula|comet|asteroid/i,
  science: /biolog|physic|chemistr|species|geolog|ecolog|evolution|scientist/i,
  tech: /software|computing|internet|technolog|programming|electronics|websites/i,
  ai: /artificial intelligence|machine learning|neural network/i,
  // "empire" needs a civilization prefix — "Order of the British Empire" is an honour, not history.
  history: /battle|siege|\bwars\b|ancient|dynast|archaeolog|medieval|historical|century BC|\bempires\b|(roman|ottoman|byzantine|persian|mongol|holy roman) empire/i,
  economics: /compan(y|ies)|economic|industr|corporations|listed on|trade/i,
  markets: /stock exchange|financial market|banks|investment/i,
  finance: /personal finance|banking|currencies/i,
  health: /disease|medicin|medical|health|drugs|epidemi|viruses|syndrome|anatomy/i,
  nutrition: /\bfoods?\b|nutrition|\bdiets?\b|cuisine|vitamin/i,
  longevity: /ageing|aging|longevity|\bsleep\b/i,
  mindfulness: /meditation|psycholog|mental health|emotion/i,
};

interface FeedArticle {
  titles?: { normalized?: string };
  extract?: string;
  views?: number;
  thumbnail?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
}

export interface FeaturedFeed {
  tfa?: FeedArticle;
  mostread?: { articles?: FeedArticle[] };
}

export interface CategoriesResponse {
  query?: { pages?: Array<{ title?: string; categories?: Array<{ title?: string }> }> };
}

function topicForCategories(categoryTitles: string[]): string | undefined {
  const haystack = categoryTitles.join(' | ');
  for (const [topicId, pattern] of Object.entries(TOPIC_CATEGORY_PATTERNS)) {
    if (pattern.test(haystack)) return topicId;
  }
  return undefined;
}

/** Views → 0..1: ~100k/day → 0.71, ~10M → 1. TFA gets a fixed editorial prior. */
function popularityFromViews(views: number | undefined): number {
  if (views === undefined) return 0.85; // tfa
  return Math.min(1, Math.log10(views + 1) / 7);
}

/**
 * Pure transform: feed + categories lookup → topic-mapped cards.
 * Exported for the fixture test.
 */
export function featuredToCards(
  feed: FeaturedFeed,
  categories: CategoriesResponse,
  dateKey: string,
): Card[] {
  const categoriesByTitle = new Map(
    (categories.query?.pages ?? []).map((page) => [
      page.title,
      (page.categories ?? []).flatMap((c) => (c.title ? [c.title] : [])),
    ]),
  );
  const candidates: Array<{ article: FeedArticle; isTfa: boolean }> = [
    ...(feed.tfa ? [{ article: feed.tfa, isTfa: true }] : []),
    ...(feed.mostread?.articles ?? []).map((article) => ({ article, isTfa: false })),
  ];

  return candidates.flatMap(({ article, isTfa }) => {
    const title = article.titles?.normalized;
    const pageUrl = article.content_urls?.desktop?.page;
    if (!title || !article.extract || !pageUrl) return [];
    const topicId = topicForCategories(categoriesByTitle.get(title) ?? []);
    if (!topicId) return [];
    const body = truncateAtSentence(stripHtml(article.extract), 480);
    if (body.length < 80) return [];
    const card: Card = {
      id: `wikipedia-featured:${dateKey}:${hashTitle(title)}`,
      topicId,
      sourceId: 'wikipedia-featured',
      title: isTfa ? `Featured: ${title}` : title,
      body,
      sourceName: 'Wikipedia',
      sourceUrl: canonicalUrl(pageUrl),
      hash: hashTitle(title),
      popularity: popularityFromViews(isTfa ? undefined : article.views),
    };
    if (article.thumbnail?.source) card.imageUrl = article.thumbnail.source;
    return [card];
  });
}

const HEADERS = {
  'User-Agent': WIKIPEDIA_FEATURED_CONFIG.userAgent,
  'Api-User-Agent': WIKIPEDIA_FEATURED_CONFIG.userAgent,
};

export function createWikipediaFeaturedAdapter(
  getLanguage: () => Promise<string> = () => Promise.resolve('en'),
): SourcePort {
  // The feed and mapping are fetched once per (day, language) and served per topic.
  let cache: { key: string; cards: Card[] } | undefined;

  async function loadDay(language: string): Promise<Card[]> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    const cacheKey = `${language}:${dateKey}`;
    if (cache?.key === cacheKey) return cache.cards;

    const feedResponse = await fetch(
      `https://${language}.wikipedia.org/api/rest_v1/feed/featured/${year}/${month}/${day}`,
      { headers: HEADERS },
    );
    if (!feedResponse.ok) throw new Error(`wikipedia-featured: HTTP ${feedResponse.status}`);
    const feed = (await feedResponse.json()) as FeaturedFeed;

    const titles = [
      feed.tfa?.titles?.normalized,
      ...(feed.mostread?.articles ?? []).map((a) => a.titles?.normalized),
    ].filter((t): t is string => Boolean(t));
    let categories: CategoriesResponse = {};
    if (titles.length > 0) {
      const categoriesResponse = await fetch(
        `https://${language}.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=categories&cllimit=max&clshow=!hidden&titles=${encodeURIComponent(titles.join('|'))}`,
        { headers: HEADERS },
      );
      if (categoriesResponse.ok) categories = (await categoriesResponse.json()) as CategoriesResponse;
    }

    const cards = featuredToCards(feed, categories, dateKey);
    cache = { key: cacheKey, cards };
    return cards;
  }

  return {
    id: 'wikipedia-featured',
    name: 'Wikipedia Featured',
    config: WIKIPEDIA_FEATURED_CONFIG,

    async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
      if (limit <= 0) return [];
      const cards = await loadDay(await getLanguage());
      return cards.filter((card) => card.topicId === topic.id).slice(0, limit);
    },
  };
}

export const wikipediaFeaturedAdapter: SourcePort = createWikipediaFeaturedAdapter();
