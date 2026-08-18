# @heal-scroll/data

SQLite persistence: drizzle schema, generated SQL migrations, and
`SqliteCardRepo` implementing the `CardRepo` port from core.

## Public API (`src/index.ts`)

- `schema` — drizzle tables: `items`, `user_items`, `topics`, `settings`, `fetch_log`
- `SqliteCardRepo` — upsert (dedupe by `hash`), unseen query, mark-seen
- `seedTopics(db, topics)` — idempotent topic seeding
- `Database` — the drizzle DB type the repo accepts
- Subpath `@heal-scroll/data/migrations` — the drizzle-kit bundle for
  `useMigrations()` on device (imports `.sql` via Metro/babel inline-import;
  **never import it in Node**)

## Invariants

- Driver-agnostic: the same repo code runs on expo-sqlite (app) and
  better-sqlite3 (tests, in-memory). Drivers are chosen by the caller —
  this package imports neither.
- Schema changes go through migrations: edit `src/schema.ts`, run
  `pnpm generate`, commit the new files in `drizzle/`. Never edit `drizzle/` by hand
  (exception: `migrations.d.ts`, which is hand-written).
- `items.hash` is unique — dedupe happens at the storage boundary.
- Repo methods return core entities (`Card`), never drizzle rows.
