# @heal-scroll/data

SQLite persistence: drizzle schema, generated SQL migrations, and the repos
implementing every core port.

## Public API (`src/index.ts`)

- `schema` — tables: `items`, `user_items`, `topics`, `topic_sources`, `settings`,
  `fetch_log`, `sessions`, `recall_log`, `collections`, `collection_items`
- Repos: `SqliteCardRepo`, `SqliteSettingsRepo`, `SqliteTopicRepo`,
  `SqliteTopicSourceRepo`, `SqliteSessionRepo`, `SqliteRecallRepo`,
  `SqliteCollectionRepo`, `SqliteInsightsRepo` (SQL-side PLAN §2e aggregates)
- `seedTopics(db, topics)`, `Database` (the drizzle DB type the repos accept)
- Subpath `@heal-scroll/data/migrations` — the drizzle-kit bundle for
  `useMigrations()` on device (**never import it in Node**)

## Invariants

- Driver-agnostic: the same repo code runs on expo-sqlite (app) and
  better-sqlite3 (tests, in-memory via `src/test-db.ts` which replays the real
  migrations). Drivers are chosen by the caller — this package imports neither.
- Schema changes go through migrations: edit `src/schema.ts`, run
  `pnpm generate`, commit the new files in `drizzle/`. Never edit `drizzle/` by
  hand (exception: `migrations.d.ts`).
- Series are columns on `items` (`series_id/index/count`), not a separate table —
  a deliberate deviation from PLAN §2's table list; completion stats derive from a join.
- `items.hash` is unique — dedupe happens at the storage boundary.
- Learned weights are clamped to [0.2, 3] in SQL, not in callers.
- Repo methods return core entities, never drizzle rows.
