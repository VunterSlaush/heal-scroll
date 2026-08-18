# heal-scroll

Anti-doomscroll feed app: a finite, topic-driven feed of short cards, fetched and
stored entirely on device (Expo / React Native, SQLite, no backend, no LLM).
Full product/architecture plan: **PLAN.md**. Current state: Milestones 1–5 —
sessions with lock/cooldown, 7 source adapters, ranking + votes, buffer/tier
refill with source health, series, recall cards, badges, stats, collections, export.

## Layout

- `packages/core` — pure TypeScript domain: entities, ports, use-cases. **Zero React/Expo/DB imports.**
- `packages/sources` — one adapter per content source implementing `SourcePort`, plus shared text utils and series splitters. **Adapters never touch the database.**
- `packages/data` — drizzle schema, SQL migrations, SQLite repos implementing the core ports. Driver-agnostic: expo-sqlite in the app, better-sqlite3 in tests.
- `apps/mobile` — Expo Router app (SDK 57, New Architecture): Feed/Saved/Stats/Settings tabs. **UI depends on core only**; adapters and the DB driver are wired in exactly one file: `apps/mobile/src/composition-root.ts`.

The first two rules are enforced by ESLint (`eslint.config.mjs`, `no-restricted-imports`).

## Where to start reading

1. `packages/core/src/index.ts` — the whole domain surface.
2. `packages/core/src/usecases/build-session.usecase.ts` — how a session is assembled (lock → rank → diversity/series → revisit → recall → weekly summary).
3. `packages/sources/src/wikipedia/wikipedia.adapter.ts` — the reference adapter (fixture + test beside it).
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
