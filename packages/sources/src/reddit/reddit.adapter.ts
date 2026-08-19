import type { Card, SourceConfig, SourcePort, Topic } from '@heal-scroll/core';
import { hashTitle } from '../utils/hash-title';
import { stripHtml } from '../utils/strip-html';
import { truncateAtSentence } from '../utils/truncate-at-sentence';

/**
 * Reddit's public JSON endpoints work from consumer IPs with a descriptive
 * User-Agent but are bot-gated on some networks; the source-health system
 * (auto-disable after 3 failures) absorbs that. Optional OAuth app
 * credentials make access reliable — create a free "installed app" and set
 * EXPO_PUBLIC_REDDIT_CLIENT_ID / EXPO_PUBLIC_REDDIT_CLIENT_SECRET.
 */
export const REDDIT_CONFIG: SourceConfig = {
  userAgent: 'android:co.monalee.healscroll:v0.1 (personal project; by /u/healscroll)',
  rateLimitPerMinute: 10,
  ttlHours: 24,
  quality: 0.6,
  topicIds: [
    'space', 'science', 'tech', 'ai', 'history', 'economics', 'markets',
    'finance', 'health', 'nutrition', 'longevity', 'mindfulness',
  ],
  dynamicTopics: true,
};

/** Curated best-of subreddits per topic. */
export const TOPIC_SUBREDDITS: Record<string, string[]> = {
  space: ['space', 'astronomy'],
  science: ['science', 'EverythingScience'],
  tech: ['programming', 'technology'],
  ai: ['MachineLearning', 'artificial'],
  history: ['history', 'AskHistorians'],
  economics: ['Economics'],
  markets: ['investing', 'StockMarket'],
  finance: ['personalfinance', 'financialindependence'],
  health: ['medicine', 'Health'],
  nutrition: ['nutrition'],
  longevity: ['longevity', 'sleep'],
  mindfulness: ['Mindfulness', 'mentalhealth'],
};

interface RedditPost {
  id: string;
  title?: string;
  selftext?: string;
  subreddit?: string;
  permalink?: string;
  created_utc?: number;
  ups?: number;
  num_comments?: number;
  over_18?: boolean;
  stickied?: boolean;
  spoiler?: boolean;
  url_overridden_by_dest?: string;
  preview?: { images?: Array<{ source?: { url?: string } }> };
}

export interface RedditListing {
  data?: { children?: Array<{ data?: RedditPost }> };
}

function imageOf(post: RedditPost): string | undefined {
  const preview = post.preview?.images?.[0]?.source?.url;
  if (preview) return preview.replace(/&amp;/g, '&');
  const direct = post.url_overridden_by_dest;
  if (direct && /\.(jpe?g|png|webp)$/i.test(direct)) return direct;
  return undefined;
}

export function postsToCards(listing: RedditListing, topicId: string): Card[] {
  const posts = (listing.data?.children ?? []).flatMap((child) => (child.data ? [child.data] : []));
  return posts.flatMap((post) => {
    if (!post.title || !post.permalink || post.over_18 || post.stickied || post.spoiler) return [];
    const imageUrl = imageOf(post);
    const selftext = post.selftext ? truncateAtSentence(stripHtml(post.selftext), 1000) : '';
    const body =
      selftext ||
      `${(post.ups ?? 0).toLocaleString('en-US')} upvotes and ${post.num_comments ?? 0} comments in r/${post.subreddit ?? ''}.`;
    // The core substance gate drops text-only stat bodies; image posts survive it.
    const card: Card = {
      id: `reddit:${post.id}`,
      topicId,
      sourceId: 'reddit',
      title: post.title,
      body,
      sourceName: `r/${post.subreddit ?? 'reddit'}`,
      sourceUrl: `https://www.reddit.com${post.permalink}`,
      hash: hashTitle(post.title),
      // ~100 ups → 0.44, ~10k → 0.89
      popularity: Math.min(1, Math.log10((post.ups ?? 0) + 1) / 4.5),
    };
    if (imageUrl) card.imageUrl = imageUrl;
    if (post.created_utc) card.publishedAt = new Date(post.created_utc * 1000).toISOString();
    return [card];
  });
}

export interface RedditCredentials {
  clientId: string;
  clientSecret: string;
}

export function createRedditAdapter(credentials?: RedditCredentials): SourcePort {
  let token: { value: string; expiresAt: number } | undefined;

  async function getToken(): Promise<string | undefined> {
    if (!credentials) return undefined;
    if (token && token.expiresAt > Date.now() + 60_000) return token.value;
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${credentials.clientId}:${credentials.clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': REDDIT_CONFIG.userAgent,
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) throw new Error(`reddit: HTTP ${response.status} (auth)`);
    const json = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) throw new Error('reddit: no access token');
    token = { value: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
    return token.value;
  }

  return {
    id: 'reddit',
    name: 'Reddit',
    config: REDDIT_CONFIG,

    async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
      const subreddits = TOPIC_SUBREDDITS[topic.id];
      if ((!subreddits || subreddits.length === 0) && !topic.query) return [];
      if (limit <= 0) return [];
      const bearer = await getToken();
      const base = bearer ? 'https://oauth.reddit.com' : 'https://www.reddit.com';
      const headers: Record<string, string> = { 'User-Agent': REDDIT_CONFIG.userAgent };
      if (bearer) headers.Authorization = `Bearer ${bearer}`;

      // User topics without curated subreddits use Reddit's site-wide search.
      if (!subreddits || subreddits.length === 0) {
        const response = await fetch(
          `${base}/search${bearer ? '' : '.json'}?q=${encodeURIComponent(topic.query)}&sort=top&t=week&limit=${Math.min(limit, 25)}&raw_json=1`,
          { headers },
        );
        if (!response.ok) throw new Error(`reddit: HTTP ${response.status} for search`);
        return postsToCards((await response.json()) as RedditListing, topic.id);
      }

      const perSub = Math.ceil(limit / subreddits.length);
      const results = await Promise.allSettled(
        subreddits.map(async (subreddit) => {
          const response = await fetch(
            `${base}/r/${subreddit}/top${bearer ? '' : '.json'}?t=day&limit=${Math.min(perSub, 25)}&raw_json=1`,
            { headers },
          );
          if (!response.ok) throw new Error(`reddit: HTTP ${response.status} for r/${subreddit}`);
          return postsToCards((await response.json()) as RedditListing, topic.id);
        }),
      );
      const cards = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
      if (cards.length === 0 && results.every((r) => r.status === 'rejected')) {
        throw new Error('reddit: all subreddits failed');
      }
      return cards;
    },
  };
}
