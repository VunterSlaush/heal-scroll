# AI_ON_DEVICE_PLAN.md — On-device curation layer

Companion to PLAN.md (Milestone 7). Scope: how the app uses on-device AI to curate content, with **no backend, no cloud calls, no bundled model in the store binary**.

Policy: **use the system model when present; otherwise fall back to a small embedding model (Tier A). Never block a feature on AI being available.**

> Amended from the original draft after implementation research: Apple NLContextualEmbedding needs iOS 17+ (not 26+ — only Foundation Models are 26+), so MiniLM is effectively Android-only; embeddings live in an `item_embeddings` table rather than a column on `items`; the app has no onboarding screen, so download consent lives in Settings plus a one-time feed banner; milestones are renumbered 7a–7g to follow PLAN.md's flat numbering (1–5 shipped before this layer existed).

## 1. Goals and non-goals

Goals
- Rank cards by semantic fit to the user's tastes (likes/saves/skips), not just topic tags.
- Dedupe near-duplicate items across sources.
- Optionally enrich cards (one-line "why this is interesting", recall-card questions, topic tags for untagged RSS) when a system model exists.
- Keep app store size small; download extras only with consent, on wifi.

Non-goals
- No generation of card bodies. Card text always comes from the deterministic per-source adapters.
- No cloud fallback. If neither system model nor embeddings are available, rules-based ranking from PLAN.md §2 runs alone.
- No 1B+ generative model in v1.

## 2. Capability model

Two independent ports in `packages/core`:

```
Embedder        embed(texts: string[]): Promise<Float32Array[]>   // always resolvable (noop stand-in)
TextGenerator   generate(prompt, schema): Promise<T | null>       // may be absent
```

Resolved by `detectAiCapabilities` in `packages/ai` from native bindings the composition root builds (a binding exists only when its platform probe succeeded):

| Platform / condition                          | Embedder                              | TextGenerator                       |
|-----------------------------------------------|---------------------------------------|-------------------------------------|
| iOS 17+ (NL assets available)                 | Apple NLContextualEmbedding (0 MB, 512-d) | Apple Foundation Models on iOS 26+ with Apple Intelligence (0 MB) |
| iOS 17+ NL assets failed, MiniLM downloaded   | MiniLM via ExecuTorch (~23 MB dl, 384-d) | as above                          |
| Android with MiniLM downloaded                | MiniLM via ExecuTorch (~23 MB dl)     | Gemini Nano via ML Kit (0 MB) — flagged, may slip |
| Android without the download                  | none → rules-only ranking             | none                                |
| User declined model download / low storage    | none → rules-only ranking             | none                                |

iOS < 17 can't run either embedder (and the app's deployment target is 17.0, required by ExecuTorch ≥ 0.9). Detection is runtime, cached per app launch, re-checked on app foreground, download completion, and model deletion. UI shows the current mode in Settings ("System AI", "Local embeddings", "Rules only").

## 3. Package layout

```
packages/ai/
  README.md                       # purpose, ports, invariants, how to add a provider
  src/capabilities/
    types.ts                      # AiMode, AiCapabilities
    native-bindings.ts            # injected raw native surfaces (no expo/RN imports here)
    detect.ts                     # pure priority ladder → { embedder, generator, mode }
  src/embedders/
    wrap-native.ts                # number[][] → normalized Float32Array, never rejects
    apple-nl.embedder.ts          # iOS 17+ built-in
    minilm-executorch.embedder.ts # downloadable cross-platform fallback
    noop.embedder.ts
  src/generators/
    wrap-native.ts                # timeout + JSON extraction + zod parse + retry-once
    with-timeout.ts
    apple-foundation.generator.ts
    mlkit-nano.generator.ts
    absent.generator.ts
  src/download/                   # MiniLM download state machine (wifi gate, resume, versioning)
  src/schemas/                    # zod schemas for structured outputs
  src/cold-start/exemplars.ts     # onboarding exemplar titles
  src/fixtures/ + tests           # recorded outputs, no network
```

Invariants: `packages/ai` depends only on `core` (+ zod), ESLint-enforced; UI never imports `ai`; only the composition root builds native bindings; `core` use-cases receive ports, never providers.

## 4. Features and their fallbacks

| Feature                        | With TextGenerator                          | Embeddings only                                | Rules only            |
|--------------------------------|---------------------------------------------|------------------------------------------------|-----------------------|
| Semantic ranking               | embeddings (same as middle column)          | cosine(card, tasteVector) as `semanticMatch`   | topic × source × votes|
| Near-duplicate dedupe          | embedding similarity > 0.92                 | same                                           | URL/title hash only   |
| Topic tag for untagged RSS     | JSON classify into topic list               | nearest topic centroid                         | feed = topic          |
| "Why interesting" line         | one sentence, ≤ 20 words, JSON               | hidden                                         | hidden                |
| Recall-card question           | one question + expected keyword, JSON       | show original card title as prompt             | same as middle        |
| Session end summary            | 1-sentence recap                            | template ("7 cards · 4 topics")                | same                  |

Rules: generated text is decoration and is labelled as on-device generated in Settings; card title/body/source are never generated; any generation failure or timeout (> 2 s) silently degrades to the next column.

## 5. Ranking with embeddings

- At ingest, embed `title + first 300 chars` once; store the vector in the `item_embeddings` table (BLOB, tagged with the embedder model id — 384-d MiniLM / 512-d Apple; a model switch prunes and re-embeds without touching `items`).
- Taste vector per user: EMA of embeddings of saved + upvoted cards; downvoted cards subtract with lower weight. Store per topic and one global.
- Score: the existing `scoreCard` factors gain `× (0.5 + 0.5·semanticMatch)` and a novelty factor, both exactly 1 when semantic context is absent. Same diversity constraints as PLAN.md.
- Cold start: taste vector = centroid of the topic's own cards until 5 votes exist.
- Novelty: penalise cards too close (> 0.85) to the last 30 seen — keeps the feed from collapsing into one niche.

## 6. Structured generation contract (system models only)

- Every call is single-pass, small context (< 1K tokens), JSON output validated with zod; on parse failure retry once, then degrade.
- Prompt discipline: system prompt < 120 tokens, no chat history, no tools.
- Batching: generate enrichments during prefetch/cooldown, never on scroll. Cap per session (e.g. 20 calls) and skip when battery < 20% or Low Power Mode.
- Cache results by `itemId` so a card is enriched at most once.

## 7. Model download and storage

- MiniLM `.pte` (~23 MB) is downloaded after a one-line consent — an Android-only row in Settings plus a one-time dismissible banner on the feed's first-load screen (the app has no onboarding flow). If it hasn't landed by the first session, run rules-only ranking and switch to embeddings automatically once the file is ready.
- Wifi-gated by default, resumable, stored under app documents, versioned; deletable in Settings. Skipped entirely on iOS 17+ where Apple NLContextualEmbedding covers the role with OS-managed assets.
- Larger optional models (any generative download) are fetched lazily, only when the user enables that feature in Settings.
- Never bundle models in the store binary. Base app stays ~30–50 MB.
- Show "Rules only" mode if download declined; offer again later, never nag.

## 8. Milestones (PLAN.md Milestone 7)

- **7a** — core ports (`Embedder`, `TextGenerator`, embedding/taste/interaction-log repos), vector/taste math, deterministic k-means, `packages/ai` skeleton with capability detection, noop/absent providers, provider wrappers, zod schemas, exemplars. Fixtures + tests; ESLint layer rule; docs.
- **7b** — schema migration 0004 (`item_embeddings`, `interaction_log`, `taste_centroids`), vector codec, SQLite repos, embed-at-ingest backfill, composition-root `initAi()`.
- **7c** — taste profile: signal recording + EMA, nightly k-means centroids with 30-day decay, dislike centroids, pinned interest phrases, rebuild-from-history / reset.
- **7d** — semantic ranking in `buildSession` behind a Settings toggle: semanticMatch, novelty penalty, near-dup dedupe, cold start; silent rules fallback.
- **7e** — evaluation: `sessions.ranking_mode`, per-mode upvote/save rates in Insights; semantic becomes the default only when it measurably wins.
- **7f** — native providers: MiniLM ExecuTorch embedder + download manager (Android), Apple NLContextualEmbedding (iOS 17+), consent UX, model unload on background, iOS 17 deployment target.
- **7g** — generators: Apple Foundation Models (iOS 26+) for "why interesting", recall questions, RSS tagging, recap, behind opt-in + battery/timeout guards; ML Kit Nano behind a local flag, acceptable to slip.
- Later — evaluate LFM2.5 350M/1.2B (ExecuTorch) as an optional downloadable generator for devices without a system model. Only if 7g proves the features are worth it.

## 9. Constraints and risks

- Requires RN New Architecture, custom dev build (no Expo Go for AI paths), iOS deployment target 17.0, real devices for release testing.
- Gemini Nano access on Android is uneven (device/OS gated) and the ML Kit Prompt API is alpha; treat as bonus.
- Library maturity: react-native-executorch and @react-native-ai/apple are pre-1.0 — pin exact versions; the port layer isolates churn.
- Memory: MiniLM is fine on 4 GB devices; unload the model when the app backgrounds.
- Quality: measure semantic ranking against rules-only via the vote signals already collected (upvote rate per session) before making it default.
- Progressive disclosure: `packages/ai/README.md` documents ports, mode table, and "how to add a provider" so an agent can add e.g. a BGE embedder without reading the rest.

## 10. Learning the user (taste profile)

The embedding model is frozen and never trained on device. What learns is a small, rebuildable **taste profile** computed from its outputs — cheap, deterministic, explainable, all local.

### 10.1 Taste vectors
- Every card is embedded once at ingest (`item_embeddings`).
- Keep one global vector plus one per topic. On each signal apply an exponential moving average:
  `taste = normalize((1−α)·taste + α·w·cardVec)`, α ≈ 0.1, w = signed signal weight.
- Signal weights (constants in `core`): save 1.0 · upvote 0.7 · finished a series 0.5 · opened link 0.4 · dwell ≥ 8 s 0.2 · downvote −0.8 · fast skip (< 1.5 s) −0.2.
- Cold start: seed each topic vector from curated exemplar card titles shipped in the app (`packages/ai/src/cold-start/exemplars.ts`); a future first-run screen asks the user to pick 3 of 9 sample cards to add first signals before any session.

### 10.2 Multi-interest centroids
- Averaging everything into one vector blurs distinct interests. Cluster positive signals into k centroids (deterministic seeded k-means, k ≈ 3–6, recomputed nightly during cooldown/prefetch; a few hundred vectors → milliseconds).
- `semanticMatch(card) = max cosine(card, centroid_i)`. This is what makes the feed feel personal instead of pushing to the average.

### 10.3 Negative signal, decay, novelty
- Maintain a separate list of dislike centroids; penalise cards near them.
- Signals decay with a ~30-day half-life so old obsessions fade and the profile stays alive.
- Novelty penalty against the last N seen cards prevents collapse into one niche — the anti-doomscroll guardrail applied to the ranker.

### 10.4 Explicit interests as text
- Settings lets the user type free-form interests ("Roman engineering", "sleep science", "Three.js"). Each phrase is embedded and pinned as a centroid with fixed weight — instant personalisation without behavioural data.
- The same phrases feed source queries (arXiv / Wikipedia / HN search) so ingest also follows stated interests.

### 10.5 System-model assist (optional, when TextGenerator exists)
- Weekly, summarise the user's top saves into 5–8 short interest phrases (JSON, zod-validated) → embed → merge as centroids.
- Show them in Insights as "You seem into: …", editable. Corrections are themselves a strong signal.

### 10.6 Signals to log (`interaction_log`, append-only)
- Votes, saves, shares, link opens, dwell-time bucket, series completion, source mutes, recall-card success per topic (remembering ≈ genuine interest).
- The log is the single replay source: "Rebuild from history" replays it in order; "Reset taste profile" clears centroids but keeps the log.

### 10.7 Evaluation
- Track per-session upvote/save rate for rules-only vs semantic ranking (`sessions.ranking_mode`). Ship semantic ranking as default only when it measurably wins; keep a Settings toggle either way.
- Provide "Reset taste profile" and "Rebuild from history" actions; the profile must always be reconstructible from logged signals.

### 10.8 Milestone mapping
- 7a–7c: taste vectors, signal weights, cold-start exemplars, centroids, decay, pinned phrases.
- 7d–7e: semantic ranking + novelty in sessions, evaluation logging.
- 7g gains: weekly interest summary via system model, editable in Insights.
