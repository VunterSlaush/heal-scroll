# @heal-scroll/sources

One adapter per content source, each implementing `SourcePort` from core, plus
the shared text utils and series splitters every adapter uses. Adapters are
deterministic transformers: raw API payload → `Card[]`. No LLM, no storage.

## Adapters

| sourceId | file | topics | notes |
| --- | --- | --- | --- |
| `wikipedia` | `wikipedia/wikipedia.adapter.ts` | all 12 topics | category extracts + pageview curation; language-aware via `createWikipediaAdapter(getLanguage)` (langlink-resolved categories, English fallback) |
| `arxiv` | `arxiv/arxiv.adapter.ts` | space, science, ai | Atom feed; long abstracts → 2-card series |
| `hn` | `hacker-news/hacker-news.adapter.ts` | tech, ai | Algolia API, one request per fetch |
| `lobsters` | `lobsters/lobsters.adapter.ts` | tech | hottest.json |
| `nasa-apod` | `nasa-apod/nasa-apod.adapter.ts` | space | factory takes an API key (DEMO_KEY default); image card first |
| `wikipedia-otd` | `wikipedia-on-this-day/…` | history | evergreen, chronological, idempotent per date |
| `rss` | `rss/rss.adapter.ts` | tech, ai | curated blog feeds via `createFeedAdapter`; heading/paragraph splitter |
| `news` | `news/news.adapter.ts` | economics, markets, finance, health, nutrition, mindfulness, science, space, tech, ai | BBC + NPR section RSS through the same feed factory |
| `pubmed` | `pubmed/pubmed.adapter.ts` | science, health, nutrition, longevity, mindfulness | E-utilities (esearch JSON + efetch XML), review articles only; abstracts split like arXiv |
| `reddit` | `reddit/reddit.adapter.ts` | all 12 topics | curated subreddits; public JSON (bot-gated on some networks — source health absorbs it) or OAuth via `createRedditAdapter({clientId, clientSecret})` |
| `twitter` | `twitter/twitter.adapter.ts` | all 12 topics | curated accounts per topic (`TOPIC_ACCOUNTS`) via X API v2 search; needs a paid Basic-tier bearer token, inactive without one |

Utils: `stripHtml`, `truncateAtSentence`, `canonicalUrl`, `hashTitle`,
`extractFirstImage`, `makeSeriesCards`.

## Invariants

- **Adapters never touch the database** (ESLint-enforced). They fetch, transform, return.
- The payload → cards transform is a pure exported function tested from a recorded
  fixture; `fetchCards` is a thin fetch wrapper around it. Tests never hit the network.
- Every request sends the source's declared `User-Agent` (see `SourceConfig`).
- Series come only from `makeSeriesCards`: ≤4 cards, "· i/n" titles, image on card 1.
- Splitters are conservative — unclear structure means a single card.
- Avoid `URL`/`URLSearchParams` — React Native's implementations are incomplete.

## Adding a new source (checklist)

1. `src/<name>/<name>.adapter.ts` — export a `SourcePort` object plus a pure
   `…ToCards(payload, topicId)` transform. Card `id` is `"<sourceId>:<externalId>"`,
   `hash` comes from `hashTitle`, `sourceUrl` through `canonicalUrl`.
2. Declare a `SourceConfig`: real `userAgent` (with contact), `rateLimitPerMinute`,
   `ttlHours`, `quality` (0..1), and the `topicIds` it serves.
3. Map topics to source-specific queries inside the adapter.
4. Record one real response into `src/<name>/__fixtures__/` (curl with the declared UA).
5. `src/<name>/<name>.adapter.test.ts` — fixture → expected cards: field mapping,
   plain-text body within budget, unique hashes, empty/missing-field payloads.
6. Export the adapter from `src/index.ts` and add it to `sources` in
   `apps/mobile/src/composition-root.ts`.
7. `pnpm test && pnpm typecheck && pnpm lint`.
