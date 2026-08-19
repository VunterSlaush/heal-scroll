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
} from '@heal-scroll/core';
import { DEFAULT_TOPICS, refillBuffer } from '@heal-scroll/core';
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
  createGuardianAdapter,
  createRedditAdapter,
  createTwitterAdapter,
  createWikipediaAdapter,
  createWikipediaFeaturedAdapter,
  createWikipediaOnThisDayAdapter,
  devtoAdapter,
  hackerNewsAdapter,
  nasaImagesAdapter,
  lobstersAdapter,
  mediumAdapter,
  newsAdapter,
  pubmedAdapter,
  rssAdapter,
} from '@heal-scroll/sources';
import { Image } from 'expo-image';
import { getLocales } from 'expo-localization';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

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

/** Device language, used to seed the content-language setting on first run. */
export function deviceLanguage(): string {
  return getLocales()[0]?.languageCode ?? 'en';
}

async function getContentLanguage(): Promise<string> {
  return (await settingsRepo.getSettings()).language;
}

const wikipediaAdapter = createWikipediaAdapter(getContentLanguage);

/**
 * Set EXPO_PUBLIC_NASA_API_KEY in .env to lift DEMO_KEY's rate limit.
 * X (Twitter) needs a paid Basic-tier token in EXPO_PUBLIC_X_BEARER_TOKEN;
 * without one the adapter is left out entirely.
 */
const twitterToken = process.env.EXPO_PUBLIC_X_BEARER_TOKEN;
const redditClientId = process.env.EXPO_PUBLIC_REDDIT_CLIENT_ID;
const redditClientSecret = process.env.EXPO_PUBLIC_REDDIT_CLIENT_SECRET;
export const sources: SourcePort[] = [
  wikipediaAdapter,
  createWikipediaFeaturedAdapter(getContentLanguage),
  createGuardianAdapter(process.env.EXPO_PUBLIC_GUARDIAN_API_KEY ?? 'test'),
  devtoAdapter,
  nasaImagesAdapter,
  arxivAdapter,
  hackerNewsAdapter,
  lobstersAdapter,
  createNasaApodAdapter(process.env.EXPO_PUBLIC_NASA_API_KEY ?? 'DEMO_KEY'),
  createWikipediaOnThisDayAdapter(getContentLanguage),
  rssAdapter,
  newsAdapter,
  mediumAdapter,
  pubmedAdapter,
  // Public JSON without credentials (may be bot-gated on some networks —
  // source health auto-disables it there); OAuth when credentials are set.
  createRedditAdapter(
    redditClientId && redditClientSecret
      ? { clientId: redditClientId, clientSecret: redditClientSecret }
      : undefined,
  ),
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
  // Defaults are seeded once so deleted topics stay deleted; the same run
  // backfills `query` on installs that predate dynamic topics.
  if (!(await settingsRepo.getValue('topics.seeded'))) {
    await topicRepo.upsertTopics(DEFAULT_TOPICS);
    await settingsRepo.setValue('topics.seeded', '1');
  }
  // First run: content language follows the phone until the user changes it.
  const stored = await settingsRepo.getValue('settings');
  if (!stored || !('language' in (JSON.parse(stored) as Record<string, unknown>))) {
    await settingsRepo.saveSettings({ language: deviceLanguage() });
  }
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
