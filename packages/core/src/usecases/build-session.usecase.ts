import type { Card } from '../entities/card';
import { isSubstantialCard } from '../entities/card-quality';
import type { SessionItem } from '../entities/session';
import type { CardRepo } from '../ports/card-repo';
import type { Clock } from '../ports/clock';
import type { InsightsPort } from '../ports/insights-port';
import type { SessionRepo } from '../ports/session-repo';
import type { SettingsRepo } from '../ports/settings-repo';
import type { TopicRepo } from '../ports/topic-repo';
import type { TopicSourceRepo } from '../ports/topic-source-repo';
import { getLockState } from './lock-state.usecase';
import { pickRecallCard } from './pick-recall-card.usecase';
import { rankCards, type RankContext } from './rank-cards.usecase';
import { selectSessionCards } from './select-session-cards';
import {
  buildWeeklySummaryText,
  computeWeeklyStats,
  shouldShowWeeklySummary,
} from './weekly-summary.usecase';

export interface BuildSessionDeps {
  cardRepo: CardRepo;
  settingsRepo: SettingsRepo;
  sessionRepo: SessionRepo;
  topicRepo: TopicRepo;
  topicSourceRepo: TopicSourceRepo;
  /** Optional: enables the weekly summary card and the recent-source penalty. */
  insights?: InsightsPort;
  clock: Clock;
  /** Static quality per sourceId, from the adapter configs (composition root). */
  sourceQuality: Record<string, number>;
  /** Last-resort live fetch (tier 3, evergreen) wired in the composition root. */
  liveTopUp?: (topicIds: string[], needed: number) => Promise<void>;
}

export type BuildSessionResult =
  | { locked: true; remainingMs: number }
  | { locked: false; sessionId: number; items: SessionItem[] };

const POOL_MULTIPLIER = 4;
const REVISIT_AFTER_DAYS = 30;
export const WEEKLY_SUMMARY_KEY = 'weeklySummary.lastShownAt';

/**
 * Builds one finite session (PLAN §2, §2b, §2d, §2e):
 * lock check → ranked unseen pool (live top-up when thin) → diversity/series
 * selection → revisit fallback → recall card (1 of N) → weekly summary first.
 */
export async function buildSession(deps: BuildSessionDeps): Promise<BuildSessionResult> {
  const now = deps.clock();
  const settings = await deps.settingsRepo.getSettings();
  const lastSession = await deps.sessionRepo.getLastFinished();

  const lock = getLockState(now, lastSession?.endedAt, settings.cooldownMinutes);
  if (lock.locked) {
    if (lastSession) await deps.sessionRepo.markCooldownAttempt(lastSession.id);
    return { locked: true, remainingMs: lock.remainingMs };
  }

  const topics = await deps.topicRepo.getEnabledTopics();
  const topicIds = topics.map((t) => t.id);
  const n = settings.itemsPerSession;

  // Substance and muted-source gates run here too, so cards cached before a
  // gate existed (or before a source was muted) never surface.
  const servable = (card: Card) =>
    isSubstantialCard(card) && !settings.disabledSources.includes(card.sourceId);
  let pool =
    topicIds.length > 0 && n > 0
      ? (await deps.cardRepo.getUnseenCards(topicIds, n * POOL_MULTIPLIER)).filter(servable)
      : [];
  if (pool.length < n && deps.liveTopUp && topicIds.length > 0) {
    try {
      await deps.liveTopUp(topicIds, n - pool.length);
      pool = (await deps.cardRepo.getUnseenCards(topicIds, n * POOL_MULTIPLIER)).filter(servable);
    } catch {
      // Offline: continue with whatever the cache tiers can serve.
    }
  }

  const states = await deps.topicSourceRepo.getStates(topicIds);
  const context: RankContext = {
    topicWeights: Object.fromEntries(topics.map((t) => [t.id, t.weight])),
    sourceWeights: Object.fromEntries(
      states.map((s) => [`${s.topicId}/${s.sourceId}`, s.weight]),
    ),
    sourceQuality: deps.sourceQuality,
    recentSourceCounts: deps.insights
      ? Object.fromEntries((await deps.insights.cardsPerSource(1, now)).map((r) => [r.sourceId, r.seen]))
      : {},
    now,
  };

  let selected: SessionItem[] = selectSessionCards(rankCards(pool, context), {
    n,
    preferShortCards: settings.preferShortCards,
  }).map((card) => ({ kind: 'card', card, revisit: false }));

  if (selected.length < n && topicIds.length > 0) {
    // Tier 4: high-quality seen cards older than 30 days, marked "revisit".
    const revisit = await deps.cardRepo.getRevisitCandidates(
      topicIds,
      REVISIT_AFTER_DAYS,
      n - selected.length,
      now,
    );
    selected.push(...revisit.map((card) => ({ kind: 'card' as const, card, revisit: true })));
  }

  const recall = await pickRecallCard(deps.cardRepo, now);
  if (recall) {
    const recallItem: SessionItem = { kind: 'recall', card: recall };
    selected = selected.length >= n ? [...selected.slice(0, -1), recallItem] : [...selected, recallItem];
  }

  const items: SessionItem[] = [];
  if (deps.insights && selected.length > 0) {
    const lastShownRaw = await deps.settingsRepo.getValue(WEEKLY_SUMMARY_KEY);
    const lastShown = lastShownRaw ? new Date(lastShownRaw) : undefined;
    if (shouldShowWeeklySummary(lastShown, now)) {
      const stats = await computeWeeklyStats(deps.insights, now);
      if (stats.cardsRead > 0) {
        items.push({ kind: 'summary', text: buildWeeklySummaryText(stats) });
        await deps.settingsRepo.setValue(WEEKLY_SUMMARY_KEY, now.toISOString());
      }
    }
  }
  items.push(...selected);

  const sessionId = await deps.sessionRepo.startSession(now, n);
  return { locked: false, sessionId, items };
}
