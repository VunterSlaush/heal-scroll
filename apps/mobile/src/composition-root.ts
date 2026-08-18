/**
 * Composition root — the ONLY file that wires concrete infrastructure
 * (expo-sqlite driver, source adapters) together. Screens and hooks import
 * from @heal-scroll/core and from here, never from @heal-scroll/sources.
 */
import type { CardRepo, Topic } from '@heal-scroll/core';
import { schema, seedTopics, SqliteCardRepo } from '@heal-scroll/data';
import { wikipediaAdapter } from '@heal-scroll/sources';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

export const SPACE_TOPIC: Topic = { id: 'space', name: 'Space' };

const sqlite = openDatabaseSync('heal-scroll.db');
export const db = drizzle(sqlite, { schema });

export const cardRepo: CardRepo = new SqliteCardRepo(db);

export async function seedInitialData(): Promise<void> {
  await seedTopics(db, [SPACE_TOPIC]);
}

/** Fetch fresh cards for a topic and persist them. Returns how many were new. */
export async function topUpTopic(topic: Topic, limit: number): Promise<number> {
  const cards = await wikipediaAdapter.fetchCards(topic, limit);
  return cardRepo.upsertCards(cards);
}
