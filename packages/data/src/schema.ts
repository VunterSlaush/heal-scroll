import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/** Normalized cards (PLAN §2 storage). Series live as columns here, not a separate table. */
export const items = sqliteTable(
  'items',
  {
    id: text('id').primaryKey(),
    topicId: text('topic_id').notNull(),
    sourceId: text('source_id').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    imageUrl: text('image_url'),
    sourceName: text('source_name').notNull(),
    sourceUrl: text('source_url').notNull(),
    publishedAt: text('published_at'),
    hash: text('hash').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    seriesId: text('series_id'),
    seriesIndex: integer('series_index'),
    seriesCount: integer('series_count'),
    popularity: real('popularity'),
  },
  (table) => [
    uniqueIndex('items_hash_unique').on(table.hash),
    index('items_topic_created_idx').on(table.topicId, table.createdAt),
    index('items_series_idx').on(table.seriesId),
  ],
);

/** Per-user state for an item: seen/saved/vote. A row exists once the user interacted. */
export const userItems = sqliteTable('user_items', {
  itemId: text('item_id')
    .primaryKey()
    .references(() => items.id),
  seenAt: integer('seen_at', { mode: 'timestamp_ms' }),
  saved: integer('saved', { mode: 'boolean' }).notNull().default(false),
  savedAt: integer('saved_at', { mode: 'timestamp_ms' }),
  vote: integer('vote').notNull().default(0),
});

export const topics = sqliteTable('topics', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  /** Learned ranking weight nudged by votes, clamped to [0.2, 3]. */
  weight: real('weight').notNull().default(1),
});

/** Learned per-(topic, source) state: user toggle, weight, fetch health (PLAN §2b). */
export const topicSources = sqliteTable(
  'topic_sources',
  {
    topicId: text('topic_id').notNull(),
    sourceId: text('source_id').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    weight: real('weight').notNull().default(1),
    consecutiveFailures: integer('consecutive_failures').notNull().default(0),
    lastFetchedAt: integer('last_fetched_at', { mode: 'timestamp_ms' }),
  },
  (table) => [uniqueIndex('topic_sources_pk').on(table.topicId, table.sourceId)],
);

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

/** One row per fetch attempt — feeds source health and adaptive quotas. */
export const fetchLog = sqliteTable('fetch_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceId: text('source_id').notNull(),
  topicId: text('topic_id').notNull(),
  fetchedAt: integer('fetched_at', { mode: 'timestamp_ms' }).notNull(),
  ok: integer('ok', { mode: 'boolean' }).notNull(),
  cardCount: integer('card_count').notNull().default(0),
  error: text('error'),
});

/** Finite sessions; a session "counts" once ended_at is set (PLAN §2d). */
export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
  endedAt: integer('ended_at', { mode: 'timestamp_ms' }),
  plannedCount: integer('planned_count').notNull(),
  seenCount: integer('seen_count').notNull().default(0),
  /** Null = unknown; set true on finish, false when a cooldown attempt is recorded. */
  respectedCooldown: integer('respected_cooldown', { mode: 'boolean' }),
});

/** Every recall-card answer (PLAN §2d) — the app's real success metric. */
export const recallLog = sqliteTable('recall_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: text('item_id')
    .notNull()
    .references(() => items.id),
  shownAt: integer('shown_at', { mode: 'timestamp_ms' }).notNull(),
  remembered: integer('remembered', { mode: 'boolean' }).notNull(),
});

export const collections = sqliteTable('collections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const collectionItems = sqliteTable(
  'collection_items',
  {
    collectionId: integer('collection_id')
      .notNull()
      .references(() => collections.id),
    itemId: text('item_id')
      .notNull()
      .references(() => items.id),
    addedAt: integer('added_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [uniqueIndex('collection_items_pk').on(table.collectionId, table.itemId)],
);
