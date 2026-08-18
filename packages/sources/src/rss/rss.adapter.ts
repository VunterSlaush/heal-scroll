import type { Card, SourceConfig, SourcePort, Topic } from '@heal-scroll/core';
import { XMLParser } from 'fast-xml-parser';
import { makeSeriesCards } from '../splitters/make-series';
import { canonicalUrl } from '../utils/canonical-url';
import { extractFirstImage } from '../utils/extract-first-image';
import { hashTitle } from '../utils/hash-title';
import { splitRssContent } from './split-rss-content';

export const RSS_CONFIG: SourceConfig = {
  userAgent: 'heal-scroll/0.1 (personal project; jesus.mota@monalee.co)',
  rateLimitPerMinute: 30,
  ttlHours: 24,
  quality: 0.7,
  topicIds: ['tech', 'ai'],
};

/** Curated feeds (PLAN §3): per-feed topic mapping, extended over time. */
export const CURATED_FEEDS: Array<{ url: string; name: string; topicIds: string[] }> = [
  { url: 'https://blog.codinghorror.com/rss/', name: 'Coding Horror', topicIds: ['tech'] },
  { url: 'https://martinfowler.com/feed.atom', name: 'Martin Fowler', topicIds: ['tech'] },
  { url: 'https://jalammar.github.io/feed.xml', name: 'Jay Alammar', topicIds: ['ai'] },
];

interface RssItem {
  title?: string;
  link?: string | { '@_href'?: string } | Array<{ '@_href'?: string; '@_rel'?: string }>;
  description?: string;
  'content:encoded'?: string;
  content?: string | { '#text'?: string };
  pubDate?: string;
  published?: string;
  updated?: string;
  guid?: string | { '#text'?: string };
  id?: string;
  'media:content'?: { '@_url'?: string };
}

interface ParsedFeed {
  rss?: { channel?: { title?: string; item?: RssItem | RssItem[] } };
  feed?: { title?: string | { '#text'?: string }; entry?: RssItem | RssItem[] };
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', cdataPropName: '__cdata' });

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function textOf(value: string | { '#text'?: string; __cdata?: string } | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value;
  return value.__cdata ?? value['#text'];
}

function linkOf(item: RssItem): string | undefined {
  if (typeof item.link === 'string') return item.link;
  if (Array.isArray(item.link)) {
    const alternate = item.link.find((l) => l['@_rel'] === 'alternate' || l['@_rel'] === undefined);
    return alternate?.['@_href'];
  }
  return item.link?.['@_href'];
}

/** RSS 2.0 and Atom, normalized to items. Exported for fixture tests. */
export function parseFeed(xml: string): { feedTitle?: string; items: RssItem[] } {
  const parsed = parser.parse(xml) as ParsedFeed;
  if (parsed.rss?.channel) {
    const result: { feedTitle?: string; items: RssItem[] } = { items: asArray(parsed.rss.channel.item) };
    const title = textOf(parsed.rss.channel.title);
    if (title) result.feedTitle = title;
    return result;
  }
  if (parsed.feed) {
    const result: { feedTitle?: string; items: RssItem[] } = { items: asArray(parsed.feed.entry) };
    const title = textOf(parsed.feed.title);
    if (title) result.feedTitle = title;
    return result;
  }
  return { items: [] };
}

export function feedItemsToCards(
  items: RssItem[],
  topicId: string,
  feedName: string,
): Card[] {
  return items.flatMap((item) => {
    const title = textOf(item.title)?.replace(/\s+/g, ' ').trim();
    const link = linkOf(item);
    if (!title || !link) return [];
    const html =
      textOf(item['content:encoded']) ?? textOf(item.content) ?? textOf(item.description) ?? '';
    const bodies = splitRssContent(html);
    if (bodies.length === 0 || bodies[0] === '') return [];

    const sourceUrl = canonicalUrl(link);
    const base: Omit<Card, 'body' | 'hash'> = {
      id: `rss:${hashTitle(sourceUrl)}`,
      topicId,
      sourceId: 'rss',
      title,
      sourceName: feedName,
      sourceUrl,
    };
    const publishedAt = item.pubDate ?? item.published ?? item.updated;
    if (publishedAt) {
      const date = new Date(publishedAt);
      if (!Number.isNaN(date.getTime())) base.publishedAt = date.toISOString();
    }
    const image = item['media:content']?.['@_url'] ?? extractFirstImage(html);
    if (image) base.imageUrl = image;
    return makeSeriesCards(base, bodies);
  });
}

export const rssAdapter: SourcePort = {
  id: 'rss',
  name: 'Curated RSS',
  config: RSS_CONFIG,

  async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
    const feeds = CURATED_FEEDS.filter((feed) => feed.topicIds.includes(topic.id));
    if (feeds.length === 0 || limit <= 0) return [];
    const perFeed = Math.ceil(limit / feeds.length);
    const results = await Promise.allSettled(
      feeds.map(async (feed) => {
        const response = await fetch(feed.url, {
          headers: { 'User-Agent': RSS_CONFIG.userAgent },
        });
        if (!response.ok) throw new Error(`rss: HTTP ${response.status} for ${feed.url}`);
        const { feedTitle, items } = parseFeed(await response.text());
        return feedItemsToCards(items.slice(0, perFeed), topic.id, feedTitle ?? feed.name);
      }),
    );
    const cards = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
    if (cards.length === 0 && results.every((r) => r.status === 'rejected')) {
      throw new Error('rss: all feeds failed');
    }
    return cards;
  },
};
