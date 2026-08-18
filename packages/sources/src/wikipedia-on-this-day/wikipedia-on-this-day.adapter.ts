import type { Card, SourceConfig, SourcePort, Topic } from '@heal-scroll/core';
import { canonicalUrl } from '../utils/canonical-url';
import { hashTitle } from '../utils/hash-title';
import { truncateAtSentence } from '../utils/truncate-at-sentence';

export const WIKIPEDIA_OTD_CONFIG: SourceConfig = {
  userAgent: 'heal-scroll/0.1 (personal project; jesus.mota@monalee.co)',
  rateLimitPerMinute: 30,
  ttlHours: 24,
  quality: 0.8,
  topicIds: ['history'],
};

const API_BASE = 'https://en.wikipedia.org/api/rest_v1/feed/onthisday/events';

interface OtdPage {
  title?: string;
  titles?: { normalized?: string };
  extract?: string;
  thumbnail?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
}

export interface OtdEvent {
  year?: number;
  text?: string;
  pages?: OtdPage[];
}

export interface OtdResponse {
  events?: OtdEvent[];
}

/**
 * Each "on this day" event becomes its own card, sequenced chronologically
 * (PLAN §2c). Cards are keyed by date + year + text hash so re-fetching the
 * same day is idempotent.
 */
export function eventsToCards(response: OtdResponse, topicId: string, monthDay: string): Card[] {
  const events = [...(response.events ?? [])].sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
  return events.flatMap((event) => {
    if (!event.text || event.year === undefined) return [];
    const page = event.pages?.[0];
    const pageTitle = page?.titles?.normalized ?? page?.title;
    const pageUrl = page?.content_urls?.desktop?.page;
    const card: Card = {
      id: `wikipedia-otd:${monthDay}:${event.year}:${hashTitle(event.text)}`,
      topicId,
      sourceId: 'wikipedia-otd',
      title: pageTitle ? `${event.year}: ${pageTitle}` : `On this day, ${event.year}`,
      body: truncateAtSentence(event.text.replace(/\s+/g, ' ').trim(), 480),
      sourceName: 'Wikipedia',
      sourceUrl: canonicalUrl(pageUrl ?? 'https://en.wikipedia.org/wiki/Main_Page'),
      // Evergreen on purpose: an anniversary is not "news", so no publishedAt.
      hash: hashTitle(`otd ${monthDay} ${event.year} ${event.text.slice(0, 60)}`),
    };
    if (page?.thumbnail?.source) card.imageUrl = page.thumbnail.source;
    return [card];
  });
}

export const wikipediaOnThisDayAdapter: SourcePort = {
  id: 'wikipedia-otd',
  name: 'Wikipedia On This Day',
  config: WIKIPEDIA_OTD_CONFIG,

  async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
    if (!WIKIPEDIA_OTD_CONFIG.topicIds.includes(topic.id) || limit <= 0) return [];
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const response = await fetch(`${API_BASE}/${month}/${day}`, {
      headers: {
        'User-Agent': WIKIPEDIA_OTD_CONFIG.userAgent,
        'Api-User-Agent': WIKIPEDIA_OTD_CONFIG.userAgent,
      },
    });
    if (!response.ok) throw new Error(`wikipedia-otd: HTTP ${response.status}`);
    const json = (await response.json()) as OtdResponse;
    return eventsToCards(json, topic.id, `${month}-${day}`).slice(0, limit);
  },
};
