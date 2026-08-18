# @heal-scroll/core

Pure TypeScript domain layer. No React, no Expo, no database, no network —
just entities, ports, and use-cases. Everything else depends on this package;
this package depends on nothing.

## Public API (`src/index.ts`)

- Entities: `Card` (with optional series fields), `Topic`, `Source`, `Settings`,
  `SessionItem`/`SessionSummary`, `TopicSourceState`, `TopicBadge`, `Insights`, `Collection`
- Ports: `SourcePort`, `CardRepo`, `SettingsRepo`, `TopicRepo`, `TopicSourceRepo`,
  `SessionRepo`, `RecallRepo`, `CollectionRepo`, `InsightsPort`, `Clock`
- Use-cases:
  - `buildSession(deps)` — lock check → ranked pool (live top-up when thin) →
    diversity/series selection → revisit tier → recall card → weekly summary
  - `finishSession` (mark seen + calm recap), `getLockState`
  - `rankCards` (topicWeight × quality × learned weight × freshness − recent-source penalty)
  - `applyVote` (nudges topic + source weights, lr 0.05, clamp [0.2, 3])
  - `refillBuffer` (5-session target, 3-session threshold, health-aware)
  - `pickRecallCard`/`recordRecall`, `computeTopicBadges`, `computeInsights`,
    `computeWeeklyStats`/`buildWeeklySummaryText`, `exportAsJson`/`exportAsMarkdown`

## Invariants

- Zero runtime dependencies. ESLint blocks React/Expo/drizzle imports.
- Use-cases receive ports as arguments — no globals, no service locator.
- Time comes in through `Clock`/`now` parameters; nothing here calls `Date.now()` implicitly.
- `Card.hash` is the dedupe key (computed by adapters).
- Gamification never rewards volume or frequency — review changes against PLAN §2d.
- Tests use the in-memory fakes in `src/testing/fakes.ts`, never real infrastructure.
