import type { Card, SourceConfig, SourcePort, Topic } from '@heal-scroll/core';
import { XMLParser } from 'fast-xml-parser';
import { makeSeriesCards } from '../splitters/make-series';
import { canonicalUrl } from '../utils/canonical-url';
import { extractFirstImage } from '../utils/extract-first-image';
import { hashTitle } from '../utils/hash-title';
import { splitRssContent } from './split-rss-content';

const USER_AGENT = 'heal-scroll/0.1 (personal project; jesus.mota@monalee.co)';

export interface FeedSpec {
  url: string;
  name: string;
  topicIds: string[];
}

/** Curated blog feeds (PLAN §3): per-feed topic mapping, extended over time. */
export const CURATED_FEEDS: FeedSpec[] = [
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
  'media:thumbnail'?: { '@_url'?: string };
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
  sourceId = 'rss',
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
      id: `${sourceId}:${hashTitle(sourceUrl)}`,
      topicId,
      sourceId,
      title,
      sourceName: feedName,
      sourceUrl,
    };
    const publishedAt = item.pubDate ?? item.published ?? item.updated;
    if (publishedAt) {
      const date = new Date(publishedAt);
      if (!Number.isNaN(date.getTime())) base.publishedAt = date.toISOString();
    }
    const image =
      item['media:content']?.['@_url'] ?? item['media:thumbnail']?.['@_url'] ?? extractFirstImage(html);
    if (image) base.imageUrl = image;
    return makeSeriesCards(base, bodies);
  });
}

/** Builds a SourcePort over a curated feed list; used for blogs, news and Medium. */
export function createFeedAdapter(options: {
  id: string;
  name: string;
  quality: number;
  feeds: FeedSpec[];
  ttlHours?: number;
  /** Optional source-specific cleanup applied to each feed's cards. */
  postProcess?: (cards: Card[]) => Card[];
}): SourcePort {
  const config: SourceConfig = {
    userAgent: USER_AGENT,
    rateLimitPerMinute: 30,
    ttlHours: options.ttlHours ?? 24,
    quality: options.quality,
    topicIds: [...new Set(options.feeds.flatMap((feed) => feed.topicIds))],
  };
  return {
    id: options.id,
    name: options.name,
    config,

    async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
      const feeds = options.feeds.filter((feed) => feed.topicIds.includes(topic.id));
      if (feeds.length === 0 || limit <= 0) return [];
      const perFeed = Math.ceil(limit / feeds.length);
      const results = await Promise.allSettled(
        feeds.map(async (feed) => {
          const response = await fetch(feed.url, { headers: { 'User-Agent': USER_AGENT } });
          if (!response.ok) throw new Error(`${options.id}: HTTP ${response.status} for ${feed.url}`);
          const { feedTitle, items } = parseFeed(await response.text());
          const cards = feedItemsToCards(items.slice(0, perFeed), topic.id, feedTitle ?? feed.name, options.id);
          return options.postProcess ? options.postProcess(cards) : cards;
        }),
      );
      const cards = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
      if (cards.length === 0 && results.every((r) => r.status === 'rejected')) {
        throw new Error(`${options.id}: all feeds failed`);
      }
      return cards;
    },
  };
}

export const rssAdapter = createFeedAdapter({
  id: 'rss',
  name: 'Curated RSS',
  quality: 0.7,
  feeds: CURATED_FEEDS,
});
