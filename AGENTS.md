# heal-scroll

Anti-doomscroll feed app: a finite, topic-driven feed of short cards, fetched and
stored entirely on device (Expo / React Native, SQLite, no backend, no LLM).
Full product/architecture plan: **PLAN.md**. Current state: Milestone 1
(Wikipedia → SQLite → buildSession → Feed screen).

## Layout

- `packages/core` — pure TypeScript domain: entities, ports, use-cases. **Zero React/Expo/DB imports.**
- `packages/sources` — one adapter per content source implementing `SourcePort`, plus shared text utils. **Adapters never touch the database.**
- `packages/data` — drizzle schema, SQL migrations, `SqliteCardRepo` implementing `CardRepo`. Driver-agnostic: expo-sqlite in the app, better-sqlite3 in tests.
- `apps/mobile` — Expo Router app (SDK 57, New Architecture). **UI depends on core only**; concrete adapters and the DB driver are wired in exactly one file: `apps/mobile/src/composition-root.ts`.

The first two rules are enforced by ESLint (`eslint.config.mjs`, `no-restricted-imports`).

## Where to start reading

1. `packages/core/src/index.ts` — the whole domain surface, ~6 exports.
2. `packages/sources/src/wikipedia/wikipedia.adapter.ts` — the reference adapter (fixture + test beside it).
3. `packages/data/src/sqlite-card-repo.ts` — the only repo.
4. `apps/mobile/src/composition-root.ts` — how it all connects.

Each package has a README with its public API, invariants, and (in sources) the
checklist for adding a new source.

## Run / test / lint

```
pnpm install          # workspace root; .npmrc forces node-linker=hoisted for RN
pnpm test             # vitest in core/sources/data — fixtures only, no network
pnpm typecheck        # tsc --noEmit in every package incl. the app
pnpm lint             # eslint (packages) + expo lint (app)
pnpm --filter mobile start          # Expo dev server (Expo Go works)
pnpm --filter mobile exec expo run:android   # native dev build
```

After editing `packages/data/src/schema.ts`, run `pnpm --filter @heal-scroll/data generate`
to regenerate `drizzle/` (SQL + migrations.js are committed).

No Turborepo: four packages with a linear dependency graph and sub-second test
runs don't need task caching; plain `pnpm -r` keeps the toolchain boring.
