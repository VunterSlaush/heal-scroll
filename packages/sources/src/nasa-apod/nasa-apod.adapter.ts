import type { Card, SourceConfig, SourcePort, Topic } from '@heal-scroll/core';
import { makeSeriesCards } from '../splitters/make-series';
import { truncateAtSentence } from '../utils/truncate-at-sentence';

export const NASA_APOD_CONFIG: SourceConfig = {
  userAgent: 'heal-scroll/0.1 (personal project; jesus.mota@monalee.co)',
  // DEMO_KEY allows ~30 requests/hour; a personal key raises this.
  rateLimitPerMinute: 5,
  ttlHours: 24 * 30,
  quality: 0.85,
  topicIds: ['space'],
};

const API_URL = 'https://api.nasa.gov/planetary/apod';
const SERIES_THRESHOLD_CHARS = 700;

export interface ApodItem {
  date?: string;
  title?: string;
  explanation?: string;
  url?: string;
  hdurl?: string;
  media_type?: string;
}

/** `2013-08-30` → `https://apod.nasa.gov/apod/ap130830.html`. */
function apodPageUrl(date: string): string {
  const [year, month, day] = date.split('-');
  return `https://apod.nasa.gov/apod/ap${year?.slice(2)}${month}${day}.html`;
}

export function apodToCards(items: ApodItem[], topicId: string): Card[] {
  return items.flatMap((item) => {
    // Video days exist; v1 is image-only (PLAN §1 out of scope).
    if (!item.title || !item.explanation || !item.date || item.media_type !== 'image' || !item.url) {
      return [];
    }
    const explanation = item.explanation.replace(/\s+/g, ' ').trim();
    const base: Omit<Card, 'body' | 'hash'> = {
      id: `nasa-apod:${item.date}`,
      topicId,
      sourceId: 'nasa-apod',
      title: item.title,
      imageUrl: item.url,
      sourceName: 'NASA APOD',
      sourceUrl: apodPageUrl(item.date),
      publishedAt: `${item.date}T00:00:00Z`,
      // Editorially curated by NASA — a fixed high interest prior.
      popularity: 0.8,
    };
    // Museum/NASA pattern (PLAN §2c): image card first, description card second.
    const bodies =
      explanation.length > SERIES_THRESHOLD_CHARS
        ? [truncateAtSentence(explanation, 300), truncateAtSentence(explanation.slice(truncateAtSentence(explanation, 300).length).trim(), 480)]
        : [truncateAtSentence(explanation, 480)];
    return makeSeriesCards(base, bodies);
  });
}

export function createNasaApodAdapter(apiKey = 'DEMO_KEY'): SourcePort {
  return {
    id: 'nasa-apod',
    name: 'NASA APOD',
    config: NASA_APOD_CONFIG,

    async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
      if (!NASA_APOD_CONFIG.topicIds.includes(topic.id) || limit <= 0) return [];
      const count = Math.min(limit, 20);
      const response = await fetch(`${API_URL}?api_key=${apiKey}&count=${count}`, {
        headers: { 'User-Agent': NASA_APOD_CONFIG.userAgent },
      });
      if (!response.ok) throw new Error(`nasa-apod: HTTP ${response.status}`);
      const items = (await response.json()) as ApodItem[];
      return apodToCards(items, topic.id);
    },
  };
}
