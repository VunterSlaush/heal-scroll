import type { Card, SourceConfig, SourcePort, Topic } from '@heal-scroll/core';
import { hashTitle } from '../utils/hash-title';
import { truncateAtSentence } from '../utils/truncate-at-sentence';

/**
 * X (Twitter) API v2 recent search. Reading tweets requires a paid Basic-tier
 * bearer token — the free tier is write-only — so this adapter only activates
 * when a token is provided (EXPO_PUBLIC_X_BEARER_TOKEN in the app).
 */
export const TWITTER_CONFIG: SourceConfig = {
  userAgent: 'heal-scroll/0.1 (personal project; jesus.mota@monalee.co)',
  rateLimitPerMinute: 4,
  ttlHours: 12,
  quality: 0.55,
  topicIds: [
    'space', 'science', 'tech', 'ai', 'history', 'economics', 'markets',
    'finance', 'health', 'nutrition', 'longevity', 'mindfulness',
  ],
};

const API_URL = 'https://api.x.com/2/tweets/search/recent';

/**
 * Curated accounts per topic — original posts from known-good authors beat
 * keyword search for signal. Edit freely; the query is built from `from:`.
 */
export const TOPIC_ACCOUNTS: Record<string, string[]> = {
  space: ['NASA', 'ESA', 'NASAWebb', 'SPACEdotcom'],
  science: ['nature', 'QuantaMagazine', 'newscientist', 'ScienceMagazine'],
  tech: ['IEEESpectrum', 'arstechnica', 'verge'],
  ai: ['OpenAI', 'AnthropicAI', 'GoogleDeepMind', 'huggingface'],
  history: ['HistoryToday', 'BBCHistoryMag'],
  economics: ['TheEconomist', 'WSJecon'],
  markets: ['markets', 'WSJmarkets'],
  finance: ['morganhousel', 'ramit'],
  health: ['WHO', 'NIH', 'CDCgov'],
  nutrition: ['ExamineCom', 'nutrition_org'],
  longevity: ['PeterAttiaMD', 'sleepdiplomat'],
  mindfulness: ['Headspace', 'hubermanlab'],
};

function queryFor(topicId: string): string | undefined {
  const accounts = TOPIC_ACCOUNTS[topicId];
  if (!accounts || accounts.length === 0) return undefined;
  return `(${accounts.map((a) => `from:${a}`).join(' OR ')}) -is:retweet -is:reply`;
}

interface TweetMedia {
  media_key: string;
  preview_image_url?: string;
  url?: string;
}

interface TweetUser {
  id: string;
  name: string;
  username: string;
}

interface Tweet {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
  attachments?: { media_keys?: string[] };
  public_metrics?: { like_count?: number };
}

export interface TwitterResponse {
  data?: Tweet[];
  includes?: { users?: TweetUser[]; media?: TweetMedia[] };
}

export function tweetsToCards(response: TwitterResponse, topicId: string): Card[] {
  const users = new Map((response.includes?.users ?? []).map((u) => [u.id, u]));
  const media = new Map((response.includes?.media ?? []).map((m) => [m.media_key, m]));

  return (response.data ?? []).flatMap((tweet) => {
    const author = tweet.author_id ? users.get(tweet.author_id) : undefined;
    if (!author) return [];
    // Strip trailing t.co links; the card links to the tweet itself.
    const text = tweet.text.replace(/https:\/\/t\.co\/\w+/g, '').replace(/\s+/g, ' ').trim();
    if (!text) return [];
    const card: Card = {
      id: `twitter:${tweet.id}`,
      topicId,
      sourceId: 'twitter',
      title: `${author.name} (@${author.username})`,
      body: truncateAtSentence(text, 480),
      sourceName: 'X',
      sourceUrl: `https://x.com/${author.username}/status/${tweet.id}`,
      hash: hashTitle(`${author.username} ${text.slice(0, 80)}`),
      // ~100 likes → 0.5, ~10k → 1
      popularity: Math.min(1, Math.log10((tweet.public_metrics?.like_count ?? 0) + 1) / 4),
    };
    if (tweet.created_at) card.publishedAt = tweet.created_at;
    const firstMediaKey = tweet.attachments?.media_keys?.[0];
    const image = firstMediaKey ? media.get(firstMediaKey) : undefined;
    const imageUrl = image?.url ?? image?.preview_image_url;
    if (imageUrl) card.imageUrl = imageUrl;
    return [card];
  });
}

export function createTwitterAdapter(bearerToken?: string): SourcePort {
  return {
    id: 'twitter',
    name: 'X (Twitter)',
    config: TWITTER_CONFIG,

    async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
      const topicQuery = queryFor(topic.id);
      if (!bearerToken || !topicQuery || limit <= 0) return [];
      const query = encodeURIComponent(topicQuery);
      const params = [
        `query=${query}`,
        `max_results=${Math.min(Math.max(limit, 10), 100)}`, // API minimum is 10
        'tweet.fields=created_at,public_metrics',
        'expansions=author_id,attachments.media_keys',
        'user.fields=name,username',
        'media.fields=preview_image_url,url',
      ].join('&');
      const response = await fetch(`${API_URL}?${params}`, {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          'User-Agent': TWITTER_CONFIG.userAgent,
        },
      });
      if (!response.ok) throw new Error(`twitter: HTTP ${response.status} for ${topic.id}`);
      const json = (await response.json()) as TwitterResponse;
      return tweetsToCards(json, topic.id).slice(0, limit);
    },
  };
}
