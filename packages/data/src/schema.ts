import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/** Normalized cards (PLAN §2 storage). */
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
  },
  (table) => [
    uniqueIndex('items_hash_unique').on(table.hash),
    index('items_topic_created_idx').on(table.topicId, table.createdAt),
  ],
);

/** Per-user state for an item: seen/saved/vote. A row exists once the user interacted. */
export const userItems = sqliteTable('user_items', {
  itemId: text('item_id')
    .primaryKey()
    .references(() => items.id),
  seenAt: integer('seen_at', { mode: 'timestamp_ms' }),
  saved: integer('saved', { mode: 'boolean' }).notNull().default(false),
  vote: integer('vote').notNull().default(0),
});

export const topics = sqliteTable('topics', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

/** One row per fetch attempt — feeds source health and adaptive quotas later. */
export const fetchLog = sqliteTable('fetch_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceId: text('source_id').notNull(),
  topicId: text('topic_id').notNull(),
  fetchedAt: integer('fetched_at', { mode: 'timestamp_ms' }).notNull(),
  ok: integer('ok', { mode: 'boolean' }).notNull(),
  cardCount: integer('card_count').notNull().default(0),
  error: text('error'),
});
