import type { Card, SourceConfig, SourcePort, Topic } from '@heal-scroll/core';
import { hashTitle } from '../utils/hash-title';
import { stripHtml } from '../utils/strip-html';
import { truncateAtSentence } from '../utils/truncate-at-sentence';

/** NASA Image & Video Library: keyless, gorgeous image-first cards. */
export const NASA_IMAGES_CONFIG: SourceConfig = {
  userAgent: 'heal-scroll/0.1 (personal project; jesus.mota@monalee.co)',
  rateLimitPerMinute: 10,
  ttlHours: 24 * 7,
  quality: 0.8,
  topicIds: ['space'],
};

const API_URL = 'https://images-api.nasa.gov/search';

/** Rotated by day so refills discover different corners of the archive. */
const SEARCH_TERMS = ['nebula', 'galaxy', 'mars surface', 'apollo mission', 'space telescope', 'earth from space'];

interface NasaItem {
  data?: Array<{ nasa_id?: string; title?: string; description?: string; date_created?: string }>;
  links?: Array<{ href?: string; rel?: string }>;
}

export interface NasaImagesResponse {
  collection?: { items?: NasaItem[] };
}

export function itemsToCards(response: NasaImagesResponse, topicId: string): Card[] {
  return (response.collection?.items ?? []).flatMap((item) => {
    const data = item.data?.[0];
    const imageUrl = item.links?.find((l) => l.href)?.href;
    if (!data?.nasa_id || !data.title || !data.description || !imageUrl) return [];
    const body = truncateAtSentence(stripHtml(data.description), 650);
    if (body.length < 40) return [];
    const card: Card = {
      id: `nasa-images:${data.nasa_id}`,
      topicId,
      sourceId: 'nasa-images',
      title: data.title,
      body,
      imageUrl,
      sourceName: 'NASA Images',
      sourceUrl: `https://images.nasa.gov/details/${encodeURIComponent(data.nasa_id)}`,
      hash: hashTitle(data.title),
      // The archive is editorially captioned — a fixed high interest prior.
      popularity: 0.75,
    };
    if (data.date_created) card.publishedAt = data.date_created;
    return [card];
  });
}

export const nasaImagesAdapter: SourcePort = {
  id: 'nasa-images',
  name: 'NASA Images',
  config: NASA_IMAGES_CONFIG,

  async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
    if (!NASA_IMAGES_CONFIG.topicIds.includes(topic.id) || limit <= 0) return [];
    const dayOfYear = Math.floor((Date.now() / 86_400_000) % SEARCH_TERMS.length);
    const term = SEARCH_TERMS[dayOfYear] ?? 'nebula';
    const response = await fetch(`${API_URL}?q=${encodeURIComponent(term)}&media_type=image`, {
      headers: { 'User-Agent': NASA_IMAGES_CONFIG.userAgent },
    });
    if (!response.ok) throw new Error(`nasa-images: HTTP ${response.status}`);
    const json = (await response.json()) as NasaImagesResponse;
    return itemsToCards(json, topic.id).slice(0, limit);
  },
};
