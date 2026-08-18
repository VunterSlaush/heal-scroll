import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Card } from '@heal-scroll/core';
import BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import * as schema from './schema';
import { SqliteCardRepo, seedTopics } from './sqlite-card-repo';

const MIGRATIONS_DIR = fileURLToPath(new URL('../drizzle/', import.meta.url));

function createDb() {
  const sqlite = new BetterSqlite3(':memory:');
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) {
    const sql = readFileSync(`${MIGRATIONS_DIR}/${file}`, 'utf8');
    for (const statement of sql.split('--> statement-breakpoint')) {
      sqlite.exec(statement);
    }
  }
  return drizzle(sqlite, { schema });
}

function card(id: string, overrides: Partial<Card> = {}): Card {
  return {
    id: `wikipedia:${id}`,
    topicId: 'space',
    sourceId: 'wikipedia',
    title: `Title ${id}`,
    body: 'A short body.',
    imageUrl: 'https://example.org/img.jpg',
    sourceName: 'Wikipedia',
    sourceUrl: `https://en.wikipedia.org/wiki/${id}`,
    publishedAt: '2026-08-01T00:00:00Z',
    hash: `hash-${id}`,
    ...overrides,
  };
}

describe('SqliteCardRepo', () => {
  let repo: SqliteCardRepo;
  let db: ReturnType<typeof createDb>;

  beforeEach(() => {
    db = createDb();
    repo = new SqliteCardRepo(db);
  });

  it('stores cards and reads them back intact', async () => {
    await repo.upsertCards([card('a')]);
    const [stored] = await repo.getUnseenCards(['space'], 10);
    expect(stored).toEqual(card('a'));
  });

  it('round-trips optional fields as undefined', async () => {
    const bare: Card = { ...card('bare') };
    delete bare.imageUrl;
    delete bare.publishedAt;
    await repo.upsertCards([bare]);
    const [stored] = await repo.getUnseenCards(['space'], 10);
    expect(stored?.imageUrl).toBeUndefined();
    expect(stored?.publishedAt).toBeUndefined();
  });

  it('dedupes by hash across calls and within a batch, reporting only new cards', async () => {
    expect(await repo.upsertCards([card('a'), card('dup', { hash: 'hash-a' })])).toBe(1);
    expect(await repo.upsertCards([card('a'), card('b')])).toBe(1);
    expect(await repo.getUnseenCards(['space'], 10)).toHaveLength(2);
  });

  it('filters by topic and respects the limit', async () => {
    await repo.upsertCards([card('a'), card('b'), card('c', { topicId: 'history' })]);
    expect(await repo.getUnseenCards(['space'], 10)).toHaveLength(2);
    expect(await repo.getUnseenCards(['history'], 10)).toHaveLength(1);
    expect(await repo.getUnseenCards(['space', 'history'], 2)).toHaveLength(2);
    expect(await repo.getUnseenCards([], 10)).toEqual([]);
  });

  it('excludes seen cards and markSeen is idempotent', async () => {
    await repo.upsertCards([card('a'), card('b')]);
    await repo.markSeen(['wikipedia:a'], new Date('2026-08-18T10:00:00Z'));
    await repo.markSeen(['wikipedia:a'], new Date('2026-08-18T11:00:00Z'));
    const unseen = await repo.getUnseenCards(['space'], 10);
    expect(unseen.map((c) => c.id)).toEqual(['wikipedia:b']);
  });

  it('seedTopics is idempotent', async () => {
    await seedTopics(db, [{ id: 'space', name: 'Space' }]);
    await seedTopics(db, [{ id: 'space', name: 'Space' }]);
    const rows = await db.select().from(schema.topics);
    expect(rows).toEqual([{ id: 'space', name: 'Space' }]);
  });
});
