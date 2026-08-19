import type { Card, SourceConfig, SourcePort, Topic } from '@heal-scroll/core';
import { makeSeriesCards } from '../splitters/make-series';
import { splitRssContent } from '../rss/split-rss-content';
import { canonicalUrl } from '../utils/canonical-url';
import { hashTitle } from '../utils/hash-title';

/**
 * The Guardian Open Platform: free API with FULL article bodies as HTML —
 * the best content-per-effort source available. The public 'test' key works
 * for light personal use; register a free key and set
 * EXPO_PUBLIC_GUARDIAN_API_KEY to be a good citizen.
 */
export const GUARDIAN_CONFIG: SourceConfig = {
  userAgent: 'heal-scroll/0.1 (personal project; jesus.mota@monalee.co)',
  rateLimitPerMinute: 10,
  ttlHours: 24,
  quality: 0.85,
  topicIds: [
    'space', 'science', 'tech', 'ai', 'history', 'economics', 'markets',
    'finance', 'health', 'nutrition', 'longevity', 'mindfulness',
  ],
  dynamicTopics: true,
};

/** topicId → section and/or query on the content API. */
const TOPIC_FILTERS: Record<string, { section?: string; q?: string; headlineOnly?: boolean }> = {
  space: { section: 'science', q: 'space OR nasa OR astronomy' },
  science: { section: 'science' },
  tech: { section: 'technology' },
  ai: { section: 'technology', q: '"artificial intelligence"' },
  history: { q: 'archaeology OR "ancient history"' },
  economics: { section: 'business' },
  markets: { section: 'business', q: 'markets OR stocks OR "interest rates"' },
  finance: { section: 'money' },
  health: { section: 'society', q: 'health OR medicine' },
  nutrition: { q: 'nutrition OR diet', section: 'food' },
  longevity: { q: 'longevity OR sleep OR ageing' },
  mindfulness: { q: 'mindfulness OR "mental health"' },
};

const API_URL = 'https://content.guardianapis.com/search';

export interface GuardianResult {
  id?: string;
  webTitle?: string;
  webUrl?: string;
  webPublicationDate?: string;
  fields?: { body?: string; thumbnail?: string; trailText?: string };
}

export interface GuardianResponse {
  response?: { status?: string; results?: GuardianResult[] };
}

/** Pure transform: full bodies run through the series splitter (PLAN §2c). */
export function resultsToCards(response: GuardianResponse, topicId: string): Card[] {
  return (response.response?.results ?? []).flatMap((result) => {
    const title = result.webTitle?.trim();
    if (!title || !result.webUrl) return [];
    const html = result.fields?.body ?? result.fields?.trailText ?? '';
    const bodies = splitRssContent(html);
    if (bodies.length === 0 || bodies[0] === '') return [];
    const base: Omit<Card, 'body' | 'hash'> = {
      id: `guardian:${hashTitle(result.id ?? result.webUrl)}`,
      topicId,
      sourceId: 'guardian',
      title,
      sourceName: 'The Guardian',
      sourceUrl: canonicalUrl(result.webUrl),
    };
    if (result.webPublicationDate) base.publishedAt = result.webPublicationDate;
    if (result.fields?.thumbnail) base.imageUrl = result.fields.thumbnail;
    return makeSeriesCards(base, bodies);
  });
}

export function createGuardianAdapter(apiKey = 'test'): SourcePort {
  return {
    id: 'guardian',
    name: 'The Guardian',
    config: GUARDIAN_CONFIG,

    async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
      // User topics search as an exact phrase in the HEADLINE only — full-body
      // matches drag in every article that merely mentions the term.
      const filters =
        TOPIC_FILTERS[topic.id] ??
        (topic.query ? { q: `"${topic.query}"`, headlineOnly: true } : undefined);
      if (!filters || limit <= 0) return [];
      const params = [
        'order-by=newest',
        'show-fields=body,thumbnail,trailText',
        `page-size=${Math.min(limit, 20)}`,
        filters.section ? `section=${filters.section}` : '',
        filters.q ? `q=${encodeURIComponent(filters.q)}` : '',
        filters.headlineOnly ? 'query-fields=headline' : '',
        `api-key=${apiKey}`,
      ]
        .filter(Boolean)
        .join('&');
      const response = await fetch(`${API_URL}?${params}`, {
        headers: { 'User-Agent': GUARDIAN_CONFIG.userAgent },
      });
      if (!response.ok) throw new Error(`guardian: HTTP ${response.status} for ${topic.id}`);
      const json = (await response.json()) as GuardianResponse;
      return resultsToCards(json, topic.id);
    },
  };
}
