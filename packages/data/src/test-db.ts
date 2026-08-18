/** Test-support only: in-memory better-sqlite3 database running the real migrations. */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const MIGRATIONS_DIR = fileURLToPath(new URL('../drizzle/', import.meta.url));

export function createTestDb() {
  const sqlite = new BetterSqlite3(':memory:');
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  if (files.length === 0) throw new Error('no migrations found — run pnpm generate');
  for (const file of files) {
    const migrationSql = readFileSync(`${MIGRATIONS_DIR}/${file}`, 'utf8');
    for (const statement of migrationSql.split('--> statement-breakpoint')) {
      sqlite.exec(statement);
    }
  }
  return drizzle(sqlite, { schema });
}
