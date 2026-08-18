# @heal-scroll/core

Pure TypeScript domain layer. No React, no Expo, no database, no network —
just entities, ports, and use-cases. Everything else depends on this package;
this package depends on nothing.

## Public API (`src/index.ts`)

- Entities: `Card`, `Topic`, `Source`, `SourceConfig`
- Ports: `SourcePort` (implemented by packages/sources), `CardRepo` (implemented by packages/data)
- Use-cases: `buildSession(repo, topicIds, n)` — returns the next `n` unseen cards.
  Milestone 1 is a plain unseen-cards query; ranking/diversity/series land here later.

## Invariants

- Zero runtime dependencies. ESLint blocks React/Expo/drizzle imports.
- Use-cases receive ports as arguments — no globals, no service locator.
- `Card.hash` is the dedupe key (normalized-title hash computed by adapters).
- Tests use hand-rolled fakes of the ports, never real infrastructure.
