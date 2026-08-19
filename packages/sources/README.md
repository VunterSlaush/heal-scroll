# @heal-scroll/sources

One adapter per content source, each implementing `SourcePort` from core, plus
the shared text utils and series splitters every adapter uses. Adapters are
deterministic transformers: raw API payload → `Card[]`. No LLM, no storage.

## Adapters

| sourceId | file | topics | notes |
| --- | --- | --- | --- |
| `wikipedia` | `wikipedia/wikipedia.adapter.ts` | all 12 topics | full-text search relevance x pageview sort (500+ views/month), language-aware with English fallback |
| `wikipedia-featured` | `wikipedia-featured/…` | all 12 topics | daily TFA + most-read, topic-mapped via categories (celebrity noise dropped); cached per day |
| `guardian` | `guardian/guardian.adapter.ts` | all 12 topics | Open Platform, FULL article bodies -> series; free key via EXPO_PUBLIC_GUARDIAN_API_KEY ('test' key default) |
| `devto` | `devto/devto.adapter.ts` | tech, ai | keyless, week's top posts by reactions |
| `nasa-images` | `nasa-images/nasa-images.adapter.ts` | space | keyless archive, image-first cards, day-rotated search terms |
| `arxiv` | `arxiv/arxiv.adapter.ts` | space, science, ai | Atom feed; long abstracts → 2-card series |
| `hn` | `hacker-news/hacker-news.adapter.ts` | tech, ai | Algolia API, one request per fetch |
| `lobsters` | `lobsters/lobsters.adapter.ts` | tech | hottest.json |
| `nasa-apod` | `nasa-apod/nasa-apod.adapter.ts` | space | factory takes an API key (DEMO_KEY default); image card first |
| `wikipedia-otd` | `wikipedia-on-this-day/…` | history | evergreen, chronological, idempotent per date |
| `rss` | `rss/rss.adapter.ts` | tech, ai | curated blog feeds via `createFeedAdapter`; heading/paragraph splitter |
| `news` | `news/news.adapter.ts` | economics, markets, finance, health, nutrition, mindfulness, science, space, tech, ai | BBC + NPR section RSS through the same feed factory |
| `medium` | `medium/medium.adapter.ts` | 11 topics (tag feeds) | teaser cards only — Medium RSS stopped carrying full articles; boilerplate stripped, thin teasers dropped |
| `pubmed` | `pubmed/pubmed.adapter.ts` | science, health, nutrition, longevity, mindfulness | E-utilities (esearch JSON + efetch XML), review articles only; abstracts split like arXiv |
| `reddit` | `reddit/reddit.adapter.ts` | all 12 topics | curated subreddits; public JSON (bot-gated on some networks — source health absorbs it) or OAuth via `createRedditAdapter({clientId, clientSecret})` |
| `twitter` | `twitter/twitter.adapter.ts` | all 12 topics | curated accounts per topic (`TOPIC_ACCOUNTS`) via X API v2 search; needs a paid Basic-tier bearer token, inactive without one |

Utils: `stripHtml`, `truncateAtSentence`, `canonicalUrl`, `hashTitle`,
`extractFirstImage`, `makeSeriesCards`.

**Dynamic topics:** adapters with `dynamicTopics: true` (wikipedia, guardian,
hn, arxiv, pubmed, devto, medium, reddit, twitter) serve ANY topic by falling
back to `topic.query` when their curated map has no entry — Guardian quotes the
phrase and searches headlines only, Reddit switches to site-wide search, Medium
and Dev.to slug the term into a tag. Fixed-feed sources ignore unknown topics.

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
