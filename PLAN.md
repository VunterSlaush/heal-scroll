# PLAN.md — Anti-doomscroll feed app

Replace doomscrolling with a finite, topic-driven feed of short, interesting cards. No backend: fetching, transforming, ranking and storage all happen on device.

## 1. Product scope (v1)

- Onboarding: pick topics from a curated list; set items per session (default 7) and cooldown after a session (default 10 min, configurable).
- Session: N cards, scroll/swipe; when N is reached the app locks and shows a countdown. Soft-enforced in-app (no OS-level blocking in v1).
- Card: title, 2–4 sentence body, optional image, source name + link.
- Card actions: save/bookmark, thumbs up/down (tunes ranking), open source link, share.
- Screens: Feed, Locked, Saved, Settings (topics, N, cooldown, per-topic source toggles, "prefer short cards").
- Out of scope for v1: video/audio, cross-device sync, embeddings, user-added feeds, web build.
- Goal: personal side project; correctness and calm UX over growth.

## 2. Architecture (Expo / React Native, mobile first, no backend)

Monorepo layout:

```
packages/
  core/      pure TS, no React/Expo. Entities (Card, Series, Topic, Source), use-cases
             (buildSession, rankCards, splitIntoSeries, refillBuffer), ports (SourcePort, CardRepo, Clock)
  sources/   one adapter per source implementing SourcePort (wikipedia.adapter.ts, arxiv.adapter.ts ...)
             + shared utils (html strip, sentence truncate, canonical URL, image extraction) + splitters
  data/      SQLite repositories (expo-sqlite + drizzle), migrations, seen-set, dedupe index
apps/
  mobile/    Expo Router app: screens, hooks, background tasks. Depends on core only (never on sources directly);
             wiring of adapters happens in one composition root file.
```

Rules: core has zero React/Expo imports. Adapters never touch the DB. UI never calls adapters directly.

Storage (SQLite tables): items (normalized cards), series, user_items (seen_at, saved, vote), topics, topic_sources (enabled, weight, health), settings, fetch_log.

Card synthesis: deterministic transformer per source → Card. No LLM. Shared utils: strip HTML, truncate at sentence boundary, pick image (og:image / first `<img>` / API thumbnail), canonical URL + normalized-title hashing for dedupe.

Fetch strategy (hybrid): background prefetch keeps a per-topic buffer; on session start, if buffer < N do a live top-up in parallel with a timeout; fall back to cache. Every source declares rate limit, User-Agent, TTL, quality score, topic tags.

Ranking (v1 rules): score = topicWeight × sourceQuality × freshnessDecay × voteBoost − recentSourcePenalty. Thumbs up/down nudge the user's topicWeight and sourceQuality with a small learning rate. Diversity constraints: max 2 cards per source per session, no two consecutive cards from the same topic.

## 2b. Content availability — never show an empty session

- Buffer target, not fetch-on-demand: keep ≥5 sessions × N unseen cards per active topic on disk. Refill when buffer < 3 sessions; live top-up only closes the last gap.
- Fetch triggers: app foreground on wifi; end of each session (the cooldown is free time to prefetch); OS background task (expo-background-task / task-manager) as a floor.
- Tiered fallback per topic, walked until N is filled:
  1. fresh unseen cards from primary sources
  2. older cached unseen cards
  3. evergreen pool (Wikipedia random-by-category, featured articles, "on this day") — effectively infinite
  4. high-quality seen cards older than 30 days, marked "revisit"
- Evergreen is a first-class source: periodically bulk-fetch a few hundred Wikipedia extracts per topic so tier 3 works fully offline.
- Adaptive fetching: track per-topic burn rate (cards consumed/day) and per-source yield (accepted after dedupe/filter); allocate fetch quota by burn rate; auto-disable a source after repeated failures (health flag from fetch_log).
- Images cached to disk at fetch time (expo-file-system), not at render time, so cached cards are fully offline.
- Cross-topic borrowing: thin topics borrow from adjacent ones (space→science, AI→tech) at a lower weight.
- Cache hygiene: TTL per source, cap per topic (~300 items), evict seen+unsaved first.

## 2c. Splitting content into item series ("threads")

- Model: Series { id, sourceItemId, cards[] }; each Card carries seriesId + index so the feed can render "1/3 · 2/3 · 3/3" consecutively (or a "continue" chip).
- Deterministic splitters (pure functions, no LLM), chosen per source:
  - Wikipedia article → lead paragraph = card 1; then top 2–3 sections by size, each truncated at sentence boundary; infobox facts can become a "quick facts" card.
  - arXiv paper → title + first sentences of abstract; card 2 = rest of abstract. No generated "why it matters" text.
  - Long RSS article → split by `<h2>`/`<h3>` if present, else paragraph clusters of ~60–100 words; first image goes with card 1. Be conservative: if structure is unclear, single card.
  - Wikipedia "On this day" / lists → each entry is its own card, sequenced chronologically.
  - Museum / NASA items → image card first, description card second.
- Rules: max 3–4 cards per series; every card must stand alone (title carries context, e.g. "Black holes · 2/3"); series only when the source item passes a length threshold, else single card.
- Session builder: a series counts as one slot for diversity but consumes k of the N items; never split a series across the lock boundary — if k > remaining, pick a shorter item.
- Feedback: skipping card 2 of a series lowers that source's series-worthiness; finishing all raises it. Setting "prefer short cards" disables series.
- Testing: splitters and adapters are pure → fixture files per source (raw payload → expected cards).

## 3. Topics → sources (phased)

Waves are ordered by how free/structured the sources are.

v1 (5 topics)

- Space & astronomy: NASA APOD, arXiv astro-ph, Wikipedia
- Science & nature: arXiv, Wikipedia featured / random-by-category, PubMed
- Tech & programming: Hacker News API, Lobste.rs, curated blog RSS
- AI & machine learning: arXiv cs.AI/cs.LG, HN, research-lab RSS
- History: Wikipedia On This Day, Wikipedia extracts, Project Gutenberg

v1.1

- Art & design: Met Museum + Art Institute of Chicago open APIs, Wikipedia
- Geography & travel: Wikipedia Geo API, Wikivoyage, NASA Earth Observatory RSS
- Math & puzzles: arXiv math, Wikipedia, math blogs RSS
- Philosophy & ideas: Stanford Encyclopedia of Philosophy, Aeon RSS, Wikipedia
- Psychology & behavior: PubMed, reputable RSS, Wikipedia

v1.2

- Economics & business / Markets & macro / Personal finance & investing: FRED, Our World in Data, curated RSS, Wikipedia
- Startups & entrepreneurship: HN, YC blog RSS, selected newsletters RSS
- Crypto & web3: CoinGecko free tier, explainer RSS (avoid price noise)
- Health & medicine / Nutrition & food science / Longevity & sleep / Mental health & mindfulness: PubMed E-utilities, NIH news RSS, Examine RSS, Wikipedia
- Music: Wikipedia, MusicBrainz, few curated RSS
- Sports & fitness: PubMed (exercise science), RSS
- Games & interactive: RSS (Steam/IGDB need keys — later)

Notes: Medium's public API is effectively write-only; use per-tag/author RSS only. Reddit API is restricted/paid — verify terms before relying on it. Health and finance cards link out and carry no advice framing.

## 2d. Gamification (rewards finishing and remembering, never opening more)

Design principle: never reward frequency or volume. No streaks for daily opens, no points per card, no "you're missing out" nudges. Reward completion, depth and recall.

- Session completion, not consumption: a session "counts" only when the user reaches the lock. Show a calm end screen: cards read, topics covered, one card they saved.
- Recall cards: 1 of the N cards in a session can be a "do you remember?" card built from something saved or upvoted 3–14 days earlier (spaced repetition style). Answering (tap "yes I remember" / "show me again") is the only quiz-like interaction. Recall success is the main progression metric.
- Topic depth badges: earned by cumulative unique cards read and recalled in a topic (e.g. Explorer → Reader → Curious → Nerd). Progress shown per topic, not globally, so it maps to knowledge rather than screen time.
- Collections: saved cards can be grouped into user-named collections; a completed series is auto-collected. Sharing a collection is the social hook (a static, shareable text/image), not a leaderboard.
- Discipline stat (optional, off by default): number of sessions ended at the lock without reopening during cooldown. Shown as a quiet number, never as a streak that "breaks".
- Anti-patterns to avoid: streaks tied to days, notifications to "come back", variable rewards, badges for volume, timers that pressure.

## 2e. Insights (local-only analytics for the user)

All computed on device from user_items, series, fetch_log. Presented in a Stats screen and a short weekly summary card that appears once as the first card of a session.

- Reading profile: cards per topic (7/30/all-time), share of saved vs skipped per topic → suggests topics to add or mute.
- Recall curve: % of recall cards answered "remember" per topic over time → the app's real success metric.
- Series completion rate per source → also feeds the ranking's series-worthiness score.
- Source quality view: which sources you upvote/downvote most; one-tap mute a source from here.
- Time honesty: sessions per day, average session length, sessions where cooldown was respected. Framed neutrally (no red numbers).
- Weekly summary card: "This week: 42 cards, 6 topics, top source arXiv, 3 series finished, recall 78%." One card, no charts, dismissible.
- Data ownership: export insights + saves as JSON/Markdown; everything is local, nothing leaves the device.

## 4. Milestones

1. Skeleton monorepo, core types, Wikipedia adapter, SQLite repo, feed screen with a hard-coded topic — proves the pipeline end to end.
2. Session/lock loop (N + cooldown), settings, saved list.
3. Remaining v1 adapters, background prefetch + buffer/tier logic, ranking + votes.
4. Series splitters (Wikipedia, arXiv, RSS) with fixtures; share; image caching; empty/offline states.
5. Recall cards + topic depth badges + Stats screen + weekly summary card (2d/2e). Collections + export.
6. v1.1 and v1.2 topic waves. Web build afterwards (CORS may push some sources through a static CDN JSON cron — decide then).

## 5. Progressive disclosure for AI agents

- Root AGENTS.md (~40 lines): what the app is, the layer rules, where to start reading, how to run/test.
- One README per package: purpose, public API, invariants ("adapters never touch DB", "core has no React"), and a checklist for adding a source (adapter + fixture + test + topic mapping + rate-limit config).
- Small files, literal names (nasa-apod.adapter.ts, build-session.usecase.ts), one adapter per file with its fixture beside it. Adding a source becomes a self-contained task an agent can do without reading the whole repo.

## 6. Risks

- Feels like doomscrolling anyway → lock + finite N is the differentiator; no "one more" buttons.
- Gamification drifts into engagement bait → only reward completion and recall; review every new mechanic against the anti-patterns list in 2d.
- Source rot → per-source health from fetch_log, auto-disable, evergreen fallback keeps topics non-empty.
- RSS splitting flakiness → conservative heading-based splits, single card otherwise.
- Rate limits at scale → respect per-source limits, proper User-Agent, and move to a static CDN JSON job if needed.
