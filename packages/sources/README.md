# @heal-scroll/sources

One adapter per content source, each implementing `SourcePort` from core, plus
the shared text utils every adapter uses. Adapters are deterministic
transformers: raw API payload → `Card[]`. No LLM, no storage.

## Public API (`src/index.ts`)

- Utils: `stripHtml`, `truncateAtSentence`, `canonicalUrl`, `hashTitle`
- Adapters: `wikipediaAdapter` (+ its `WIKIPEDIA_CONFIG`)

## Invariants

- **Adapters never touch the database** (ESLint-enforced). They fetch, transform, return.
- The payload → cards transform is a pure exported function (`pagesToCards`) so it
  can be tested from a recorded fixture. `fetchCards` is a thin fetch wrapper around it.
- Tests never hit the network — fixtures only.
- Every request sends the source's declared `User-Agent` (see `SourceConfig`).
- Avoid `URL`/`URLSearchParams` — React Native's implementations are incomplete.

## Adding a new source (checklist)

1. `src/<name>/<name>.adapter.ts` — export a `SourcePort` object plus a pure
   `…ToCards(payload, topicId)` transform. Card `id` is `"<sourceId>:<externalId>"`,
   `hash` comes from `hashTitle(title)`, `sourceUrl` through `canonicalUrl`.
2. Declare a `SourceConfig`: real `userAgent` (with contact), `rateLimitPerMinute`,
   `ttlHours`, `quality` (0..1), and the `topicIds` it serves.
3. Map topics to source-specific queries inside the adapter (see `TOPIC_CATEGORIES`).
4. Record one real response into `src/<name>/__fixtures__/<name>-<topic>.json`
   (curl with the declared User-Agent).
5. `src/<name>/<name>.adapter.test.ts` — fixture → expected cards: field mapping,
   plain-text body within budget, unique hashes, empty/missing-field payloads.
6. Export the adapter from `src/index.ts` and wire it in
   `apps/mobile/src/composition-root.ts`.
7. `pnpm test && pnpm typecheck && pnpm lint`.
