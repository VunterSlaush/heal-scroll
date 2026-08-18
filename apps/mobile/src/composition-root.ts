/**
 * Composition root — the ONLY file that wires concrete infrastructure
 * (expo-sqlite driver, source adapters) together. Screens and hooks import
 * from @heal-scroll/core and from here, never from @heal-scroll/sources.
 */
import type {
  BuildSessionDeps,
  Card,
  Clock,
  SourcePort,
  Topic,
} from '@heal-scroll/core';
import { refillBuffer } from '@heal-scroll/core';
import {
  schema,
  SqliteCardRepo,
  SqliteCollectionRepo,
  SqliteInsightsRepo,
  SqliteRecallRepo,
  SqliteSessionRepo,
  SqliteSettingsRepo,
  SqliteTopicRepo,
  SqliteTopicSourceRepo,
} from '@heal-scroll/data';
import {
  arxivAdapter,
  createNasaApodAdapter,
  createTwitterAdapter,
  hackerNewsAdapter,
  lobstersAdapter,
  rssAdapter,
  wikipediaAdapter,
  wikipediaOnThisDayAdapter,
} from '@heal-scroll/sources';
import { Image } from 'expo-image';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

/** v1 topics plus the health & finance waves (PLAN §3 v1.2). */
export const TOPICS: Topic[] = [
  { id: 'space', name: 'Space & astronomy' },
  { id: 'science', name: 'Science & nature' },
  { id: 'tech', name: 'Tech & programming' },
  { id: 'ai', name: 'AI & machine learning' },
  { id: 'history', name: 'History' },
  { id: 'economics', name: 'Economics & business' },
  { id: 'markets', name: 'Markets & macro' },
  { id: 'finance', name: 'Personal finance & investing' },
  { id: 'health', name: 'Health & medicine' },
  { id: 'nutrition', name: 'Nutrition & food science' },
  { id: 'longevity', name: 'Longevity & sleep' },
  { id: 'mindfulness', name: 'Mental health & mindfulness' },
];

const sqlite = openDatabaseSync('heal-scroll.db');
export const db = drizzle(sqlite, { schema });

export const cardRepo = new SqliteCardRepo(db);
export const settingsRepo = new SqliteSettingsRepo(db);
export const topicRepo = new SqliteTopicRepo(db);
export const topicSourceRepo = new SqliteTopicSourceRepo(db);
export const sessionRepo = new SqliteSessionRepo(db);
export const recallRepo = new SqliteRecallRepo(db);
export const collectionRepo = new SqliteCollectionRepo(db);
export const insightsRepo = new SqliteInsightsRepo(db);

export const clock: Clock = () => new Date();

/**
 * Set EXPO_PUBLIC_NASA_API_KEY in .env to lift DEMO_KEY's rate limit.
 * X (Twitter) needs a paid Basic-tier token in EXPO_PUBLIC_X_BEARER_TOKEN;
 * without one the adapter is left out entirely.
 */
const twitterToken = process.env.EXPO_PUBLIC_X_BEARER_TOKEN;
export const sources: SourcePort[] = [
  wikipediaAdapter,
  arxivAdapter,
  hackerNewsAdapter,
  lobstersAdapter,
  createNasaApodAdapter(process.env.EXPO_PUBLIC_NASA_API_KEY ?? 'DEMO_KEY'),
  wikipediaOnThisDayAdapter,
  rssAdapter,
  ...(twitterToken ? [createTwitterAdapter(twitterToken)] : []),
];

export const sourceNames: Record<string, string> = Object.fromEntries(
  sources.map((s) => [s.id, s.name]),
);

const sourceQuality: Record<string, number> = Object.fromEntries(
  sources.map((s) => [s.id, s.config.quality]),
);

/** PLAN §2b: images are cached at fetch time so cached cards work offline. */
async function prefetchImages(cards: Card[]): Promise<void> {
  const urls = cards.flatMap((c) => (c.imageUrl ? [c.imageUrl] : [])).slice(0, 30);
  if (urls.length > 0) await Image.prefetch(urls, { cachePolicy: 'disk' }).catch(() => false);
}

/** Tier-3 gap closer: evergreen Wikipedia fetch for whatever topics are thin. */
async function liveTopUp(topicIds: string[], needed: number): Promise<void> {
  const topics = await topicRepo.getEnabledTopics();
  const perTopic = Math.max(needed, 5);
  for (const topic of topics.filter((t) => topicIds.includes(t.id))) {
    const cards = await wikipediaAdapter.fetchCards(topic, perTopic);
    await cardRepo.upsertCards(cards);
    void prefetchImages(cards);
  }
}

export const buildSessionDeps: BuildSessionDeps = {
  cardRepo,
  settingsRepo,
  sessionRepo,
  topicRepo,
  topicSourceRepo,
  insights: insightsRepo,
  clock,
  sourceQuality,
  liveTopUp,
};

export async function seedInitialData(): Promise<void> {
  await topicRepo.upsertTopics(TOPICS);
}

let refillInFlight: Promise<void> | undefined;

/** Fetch trigger (PLAN §2b): app foreground and end of session both call this. */
export function refillBufferInBackground(): Promise<void> {
  refillInFlight ??= refillBuffer({
    cardRepo,
    settingsRepo,
    topicRepo,
    topicSourceRepo,
    sources,
    clock,
  })
    .then(async ({ inserted }) => {
      if (inserted > 0) {
        const topics = await topicRepo.getEnabledTopics();
        const fresh = await cardRepo.getUnseenCards(topics.map((t) => t.id), 60);
        await prefetchImages(fresh);
      }
    })
    .catch(() => undefined)
    .finally(() => {
      refillInFlight = undefined;
    });
  return refillInFlight;
}
