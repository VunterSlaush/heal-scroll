import type { Card } from '../entities/card';

/**
 * Ranking inputs (PLAN §2):
 * score = topicWeight × sourceQuality × freshnessDecay × learnedSourceWeight − recentSourcePenalty
 * Missing entries default to 1 (neutral).
 */
export interface RankContext {
  topicWeights: Record<string, number>;
  /** Learned weight per `${topicId}/${sourceId}`, nudged by votes. */
  sourceWeights: Record<string, number>;
  /** Static editorial quality per sourceId (from adapter configs). */
  sourceQuality: Record<string, number>;
  /** Cards served per source in the recent past, for the repetition penalty. */
  recentSourceCounts: Record<string, number>;
  now: Date;
}

const FRESHNESS_HALF_LIFE_DAYS = 7;
const EVERGREEN_FRESHNESS = 0.6;
const MIN_FRESHNESS = 0.05;
const RECENT_SOURCE_PENALTY = 0.05;

/** Exponential decay by age; undated (evergreen) content gets a fixed mid value. */
export function freshnessDecay(publishedAt: string | undefined, now: Date): number {
  if (!publishedAt) return EVERGREEN_FRESHNESS;
  const ageMs = now.getTime() - new Date(publishedAt).getTime();
  if (Number.isNaN(ageMs) || ageMs < 0) return 1;
  const ageDays = ageMs / 86_400_000;
  const decay = Math.exp((-Math.LN2 * ageDays) / FRESHNESS_HALF_LIFE_DAYS);
  return Math.max(decay, MIN_FRESHNESS);
}

export function scoreCard(card: Card, ctx: RankContext): number {
  const topicWeight = ctx.topicWeights[card.topicId] ?? 1;
  const quality = ctx.sourceQuality[card.sourceId] ?? 1;
  const learned = ctx.sourceWeights[`${card.topicId}/${card.sourceId}`] ?? 1;
  const freshness = freshnessDecay(card.publishedAt, ctx.now);
  const penalty = (ctx.recentSourceCounts[card.sourceId] ?? 0) * RECENT_SOURCE_PENALTY;
  return topicWeight * quality * learned * freshness - penalty;
}

/** Highest score first; ties broken by id so the order is fully deterministic. */
export function rankCards(cards: Card[], ctx: RankContext): Card[] {
  return cards
    .map((card) => ({ card, score: scoreCard(card, ctx) }))
    .sort((a, b) => b.score - a.score || a.card.id.localeCompare(b.card.id))
    .map((entry) => entry.card);
}
