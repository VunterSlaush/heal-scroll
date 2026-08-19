/** In-memory fakes for core ports — test-support only, not exported from the package. */
import type { Card } from '../entities/card';
import type { InteractionEvent, SignalType, TasteCentroid, TasteCentroidKind } from '../entities/taste';
import { normalize, meanVector } from '../entities/vector';
import type { Embedder } from '../ports/embedder';
import type { EmbeddingRepo } from '../ports/embedding-repo';
import type { InteractionLogRepo } from '../ports/interaction-log-repo';
import type { TasteRepo } from '../ports/taste-repo';
import type {
  SessionStats,
  SourceSeriesStats,
  SourceVoteStats,
  TopicReadingStats,
  TopicRecallStats,
} from '../entities/insights';
import type { SessionRecord } from '../entities/session';
import type { Settings } from '../entities/settings';
import { DEFAULT_SETTINGS } from '../entities/settings';
import type { TopicSourceState } from '../entities/topic-source';
import type { CardRepo, RecallWindow } from '../ports/card-repo';
import type { InsightsPort } from '../ports/insights-port';
import type { SessionRepo } from '../ports/session-repo';
import type { SettingsRepo } from '../ports/settings-repo';
import type { SourcePort } from '../ports/source-port';
import type { Topic } from '../entities/topic';
import type { TopicRepo, TopicWithState } from '../ports/topic-repo';
import type { TopicSourceRepo } from '../ports/topic-source-repo';

export function makeCard(id: string, overrides: Partial<Card> = {}): Card {
  return {
    id,
    topicId: 'space',
    sourceId: 'wikipedia',
    title: `Title ${id}`,
    body: `A body for card ${id} that is comfortably long enough to fill a whole screen slide, passing the substance gate with several sentences of plausible interesting content.`,
    sourceName: 'Wikipedia',
    sourceUrl: `https://example.org/${id}`,
    hash: `hash-${id}`,
    ...overrides,
  };
}

export class FakeCardRepo implements CardRepo {
  cards: Card[] = [];
  seen = new Map<string, Date>();
  saved = new Set<string>();
  votes = new Map<string, number>();
  recallCandidates: Card[] = [];
  revisitCandidates: Card[] = [];

  upsertCards(cards: Card[]): Promise<number> {
    const known = new Set(this.cards.map((c) => c.hash));
    const fresh = cards.filter((c) => !known.has(c.hash));
    this.cards.push(...fresh);
    return Promise.resolve(fresh.length);
  }

  getUnseenCards(topicIds: string[], limit: number): Promise<Card[]> {
    return Promise.resolve(
      this.cards
        .filter((c) => topicIds.includes(c.topicId) && !this.seen.has(c.id))
        .slice(0, limit),
    );
  }

  countUnseen(topicIds: string[]): Promise<number> {
    return this.getUnseenCards(topicIds, Number.MAX_SAFE_INTEGER).then((cards) => cards.length);
  }

  markSeen(cardIds: string[], seenAt: Date): Promise<void> {
    for (const id of cardIds) this.seen.set(id, seenAt);
    return Promise.resolve();
  }

  getCards(cardIds: string[]): Promise<Card[]> {
    return Promise.resolve(this.cards.filter((c) => cardIds.includes(c.id)));
  }

  setSaved(cardId: string, saved: boolean, _at?: Date): Promise<void> {
    if (saved) this.saved.add(cardId);
    else this.saved.delete(cardId);
    return Promise.resolve();
  }

  setVote(cardId: string, vote: -1 | 0 | 1): Promise<void> {
    this.votes.set(cardId, vote);
    return Promise.resolve();
  }

  getSavedCards(): Promise<Card[]> {
    return Promise.resolve(this.cards.filter((c) => this.saved.has(c.id)));
  }

  getRevisitCandidates(_topicIds: string[], _olderThanDays: number, limit: number): Promise<Card[]> {
    return Promise.resolve(this.revisitCandidates.slice(0, limit));
  }

  getRecallCandidates(_window: RecallWindow, _now: Date): Promise<Card[]> {
    return Promise.resolve([...this.recallCandidates]);
  }

  purgeTopicCards(topicId: string): Promise<void> {
    this.cards = this.cards.filter(
      (c) => c.topicId !== topicId || this.seen.has(c.id) || this.saved.has(c.id),
    );
    return Promise.resolve();
  }
}

export class FakeSettingsRepo implements SettingsRepo {
  settings: Settings = { ...DEFAULT_SETTINGS };
  values = new Map<string, string>();

  getSettings(): Promise<Settings> {
    return Promise.resolve({ ...this.settings });
  }
  saveSettings(patch: Partial<Settings>): Promise<void> {
    this.settings = { ...this.settings, ...patch };
    return Promise.resolve();
  }
  getValue(key: string): Promise<string | undefined> {
    return Promise.resolve(this.values.get(key));
  }
  setValue(key: string, value: string): Promise<void> {
    this.values.set(key, value);
    return Promise.resolve();
  }
}

export class FakeTopicRepo implements TopicRepo {
  topics: TopicWithState[] = [{ id: 'space', name: 'Space', query: 'space astronomy', enabled: true, weight: 1 }];

  getTopics(): Promise<TopicWithState[]> {
    return Promise.resolve([...this.topics]);
  }
  getEnabledTopics(): Promise<TopicWithState[]> {
    return Promise.resolve(this.topics.filter((t) => t.enabled));
  }
  setEnabled(topicId: string, enabled: boolean): Promise<void> {
    const topic = this.topics.find((t) => t.id === topicId);
    if (topic) topic.enabled = enabled;
    return Promise.resolve();
  }
  adjustWeight(topicId: string, delta: number): Promise<void> {
    const topic = this.topics.find((t) => t.id === topicId);
    if (topic) topic.weight = Math.min(3, Math.max(0.2, topic.weight + delta));
    return Promise.resolve();
  }
  deleteTopic(topicId: string): Promise<void> {
    this.topics = this.topics.filter((t) => t.id !== topicId);
    return Promise.resolve();
  }
  upsertTopics(topics: Topic[]): Promise<void> {
    for (const t of topics) {
      if (!this.topics.some((existing) => existing.id === t.id)) {
        this.topics.push({ ...t, enabled: true, weight: 1 });
      }
    }
    return Promise.resolve();
  }
}

export class FakeTopicSourceRepo implements TopicSourceRepo {
  states: TopicSourceState[] = [];
  fetchResults: Array<{ topicId: string; sourceId: string; ok: boolean; cardCount: number; error?: string }> = [];

  getStates(topicIds: string[]): Promise<TopicSourceState[]> {
    return Promise.resolve(this.states.filter((s) => topicIds.includes(s.topicId)));
  }
  setEnabled(topicId: string, sourceId: string, enabled: boolean): Promise<void> {
    this.upsert(topicId, sourceId).enabled = enabled;
    return Promise.resolve();
  }
  adjustWeight(topicId: string, sourceId: string, delta: number): Promise<void> {
    const state = this.upsert(topicId, sourceId);
    state.weight = Math.min(3, Math.max(0.2, state.weight + delta));
    return Promise.resolve();
  }
  recordFetchResult(result: {
    topicId: string;
    sourceId: string;
    ok: boolean;
    cardCount: number;
    error?: string;
    at: Date;
  }): Promise<void> {
    this.fetchResults.push(result);
    const state = this.upsert(result.topicId, result.sourceId);
    state.consecutiveFailures = result.ok ? 0 : state.consecutiveFailures + 1;
    state.lastFetchedAt = result.at;
    return Promise.resolve();
  }
  private upsert(topicId: string, sourceId: string): TopicSourceState {
    let state = this.states.find((s) => s.topicId === topicId && s.sourceId === sourceId);
    if (!state) {
      state = { topicId, sourceId, enabled: true, weight: 1, consecutiveFailures: 0 };
      this.states.push(state);
    }
    return state;
  }
}

export class FakeSessionRepo implements SessionRepo {
  sessions: SessionRecord[] = [];
  private nextId = 1;

  startSession(at: Date, plannedCount: number): Promise<number> {
    const id = this.nextId++;
    this.sessions.push({ id, startedAt: at, plannedCount, seenCount: 0 });
    return Promise.resolve(id);
  }
  finishSession(sessionId: number, at: Date, seenCount: number): Promise<void> {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (session) {
      session.endedAt = at;
      session.seenCount = seenCount;
      session.respectedCooldown = session.respectedCooldown ?? true;
    }
    return Promise.resolve();
  }
  markCooldownAttempt(sessionId: number): Promise<void> {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (session) session.respectedCooldown = false;
    return Promise.resolve();
  }
  getLastFinished(): Promise<SessionRecord | undefined> {
    return Promise.resolve(
      [...this.sessions]
        .filter((s) => s.endedAt)
        .sort((a, b) => (b.endedAt?.getTime() ?? 0) - (a.endedAt?.getTime() ?? 0))[0],
    );
  }
}

export class FakeInsights implements InsightsPort {
  topicStats: TopicReadingStats[] = [];
  recall: TopicRecallStats[] = [];
  series: SourceSeriesStats[] = [];
  votes: SourceVoteStats[] = [];
  sourceCounts: Array<{ sourceId: string; seen: number }> = [];
  finishedSeries = 0;
  sessions: SessionStats = {
    sessions: 0,
    averageCardsPerSession: 0,
    averageMinutesPerSession: 0,
    cooldownRespectedRate: null,
  };

  cardsPerTopic(): Promise<TopicReadingStats[]> {
    return Promise.resolve([...this.topicStats]);
  }
  recallStats(): Promise<TopicRecallStats[]> {
    return Promise.resolve([...this.recall]);
  }
  seriesCompletion(): Promise<SourceSeriesStats[]> {
    return Promise.resolve([...this.series]);
  }
  voteProfile(): Promise<SourceVoteStats[]> {
    return Promise.resolve([...this.votes]);
  }
  sessionStats(): Promise<SessionStats> {
    return Promise.resolve({ ...this.sessions });
  }
  cardsPerSource(): Promise<Array<{ sourceId: string; seen: number }>> {
    return Promise.resolve([...this.sourceCounts]);
  }
  seriesFinished(): Promise<number> {
    return Promise.resolve(this.finishedSeries);
  }
}

/**
 * Deterministic embedder: hashed character trigrams → normalized 8-d vector.
 * Texts sharing words get high cosine similarity, unrelated texts low.
 */
export class FakeEmbedder implements Embedder {
  readonly id = 'fake';
  readonly dim = 8;

  embed(texts: string[]): Promise<Float32Array[]> {
    return Promise.resolve(texts.map((t) => this.vectorFor(t)));
  }

  vectorFor(text: string): Float32Array {
    const v = new Float32Array(this.dim);
    const lower = text.toLowerCase();
    for (let i = 0; i <= lower.length - 3; i++) {
      let h = 0;
      for (let j = i; j < i + 3; j++) h = (h * 31 + lower.charCodeAt(j)) >>> 0;
      const idx = h % this.dim;
      v[idx] = (v[idx] ?? 0) + 1;
    }
    return normalize(v);
  }
}

export class FakeEmbeddingRepo implements EmbeddingRepo {
  /** Cards visible to `getCardsMissingEmbedding` / `getTopicCentroid`. */
  cards: Card[] = [];
  vectors = new Map<string, Float32Array>(); // key: `${model}/${itemId}`
  recentSeen: Float32Array[] = [];

  setEmbeddings(
    model: string,
    entries: ReadonlyArray<{ itemId: string; vector: Float32Array }>,
  ): Promise<void> {
    for (const e of entries) this.vectors.set(`${model}/${e.itemId}`, e.vector);
    return Promise.resolve();
  }
  getEmbeddings(model: string, itemIds: string[]): Promise<Map<string, Float32Array>> {
    const out = new Map<string, Float32Array>();
    for (const id of itemIds) {
      const v = this.vectors.get(`${model}/${id}`);
      if (v) out.set(id, v);
    }
    return Promise.resolve(out);
  }
  getRecentSeenVectors(_model: string, limit: number): Promise<Float32Array[]> {
    return Promise.resolve(this.recentSeen.slice(0, limit));
  }
  getCardsMissingEmbedding(
    model: string,
    limit: number,
  ): Promise<Array<Pick<Card, 'id' | 'title' | 'body' | 'topicId'>>> {
    return Promise.resolve(
      this.cards.filter((c) => !this.vectors.has(`${model}/${c.id}`)).slice(0, limit),
    );
  }
  pruneOtherModels(model: string): Promise<number> {
    let removed = 0;
    for (const key of [...this.vectors.keys()]) {
      if (!key.startsWith(`${model}/`)) {
        this.vectors.delete(key);
        removed++;
      }
    }
    return Promise.resolve(removed);
  }
  getTopicCentroid(
    model: string,
    topicId: string,
    limit: number,
  ): Promise<Float32Array | undefined> {
    const vectors = this.cards
      .filter((c) => c.topicId === topicId)
      .map((c) => this.vectors.get(`${model}/${c.id}`))
      .filter((v): v is Float32Array => v !== undefined)
      .slice(0, limit);
    return Promise.resolve(meanVector(vectors));
  }
}

export class FakeTasteRepo implements TasteRepo {
  centroids: TasteCentroid[] = [];

  getCentroids(model: string): Promise<TasteCentroid[]> {
    return Promise.resolve(this.centroids.filter((c) => c.model === model));
  }
  upsertCentroids(centroids: TasteCentroid[]): Promise<void> {
    for (const next of centroids) {
      const index = this.centroids.findIndex((c) => c.id === next.id);
      if (index >= 0) this.centroids[index] = next;
      else this.centroids.push(next);
    }
    return Promise.resolve();
  }
  replaceCentroids(
    model: string,
    kinds: TasteCentroidKind[],
    next: TasteCentroid[],
  ): Promise<void> {
    this.centroids = this.centroids.filter(
      (c) => c.model !== model || !kinds.includes(c.kind),
    );
    this.centroids.push(...next);
    return Promise.resolve();
  }
  deleteAll(): Promise<void> {
    this.centroids = [];
    return Promise.resolve();
  }
}

export class FakeInteractionLog implements InteractionLogRepo {
  events: InteractionEvent[] = [];

  log(events: InteractionEvent[]): Promise<void> {
    this.events.push(...events);
    return Promise.resolve();
  }
  getEvents(since: Date | undefined, limit?: number): Promise<InteractionEvent[]> {
    const events = this.events
      .filter((e) => !since || e.at.getTime() >= since.getTime())
      .sort((a, b) => a.at.getTime() - b.at.getTime());
    return Promise.resolve(limit === undefined ? events : events.slice(0, limit));
  }
  countByTypes(types: SignalType[]): Promise<number> {
    return Promise.resolve(this.events.filter((e) => types.includes(e.type)).length);
  }
}

export function fakeSource(
  id: string,
  topicIds: string[],
  fetcher: (topic: Topic, limit: number) => Promise<Card[]>,
  dynamicTopics = false,
): SourcePort {
  return {
    id,
    name: id,
    config: { userAgent: 'test', rateLimitPerMinute: 60, ttlHours: 24, quality: 0.5, topicIds, dynamicTopics },
    fetchCards: fetcher,
  };
}
