/**
 * Taste profile (AI_ON_DEVICE_PLAN §10): the embedding model is frozen; what
 * learns is a small, rebuildable set of vectors computed from logged signals.
 */
import { normalize } from './vector';

export type SignalType =
  | 'save'
  | 'upvote'
  | 'downvote'
  | 'finished_series'
  | 'opened_link'
  | 'dwell'
  | 'fast_skip';

/** Signed contribution of each signal to the taste vectors. */
export const SIGNAL_WEIGHTS: Record<SignalType, number> = {
  save: 1.0,
  upvote: 0.7,
  finished_series: 0.5,
  opened_link: 0.4,
  dwell: 0.2,
  downvote: -0.8,
  fast_skip: -0.2,
};

export const TASTE_EMA_ALPHA = 0.1;
/** Signals decay so old obsessions fade and the profile stays alive. */
export const TASTE_HALF_LIFE_DAYS = 30;
/** Below this many votes, ranking uses per-topic cold-start centroids. */
export const COLD_START_MIN_VOTES = 5;
/** Dwelling at least this long on a card counts as quiet interest. */
export const DWELL_SIGNAL_MS = 8_000;
/** Leaving a card faster than this counts as mild disinterest. */
export const FAST_SKIP_MS = 1_500;

export interface InteractionEvent {
  itemId: string;
  type: SignalType;
  at: Date;
  /** Extra measurement, e.g. dwell milliseconds. */
  value?: number;
}

export type TasteCentroidKind = 'ema' | 'interest' | 'dislike' | 'pinned';

export interface TasteCentroid {
  /** 'ema:global' | `ema:topic:<topicId>` | 'interest:N' | 'dislike:N' | `pinned:<phrase>`. */
  id: string;
  kind: TasteCentroidKind;
  topicId?: string;
  /** Embedder id whose space the vector lives in — never mix models. */
  model: string;
  /** Unit-normalized. */
  vector: Float32Array;
  /** Accumulated signal mass; decayed on the nightly recompute. */
  weight: number;
  /** Pinned phrase text, shown in Settings. */
  label?: string;
  updatedAt: Date;
}

/**
 * taste ← normalize((1−α)·taste + α·w·cardVec), where w is the signed signal
 * weight. Without a current taste (or on dimension change) the card vector
 * itself seeds the taste, flipped for negative signals.
 */
export function emaUpdate(
  current: Float32Array | undefined,
  cardVec: Float32Array,
  signalWeight: number,
  alpha: number = TASTE_EMA_ALPHA,
): Float32Array {
  if (!current || current.length !== cardVec.length) {
    const sign = signalWeight < 0 ? -1 : 1;
    const seeded = new Float32Array(cardVec.length);
    for (let i = 0; i < cardVec.length; i++) seeded[i] = (cardVec[i] ?? 0) * sign;
    return normalize(seeded);
  }
  const next = new Float32Array(cardVec.length);
  for (let i = 0; i < cardVec.length; i++) {
    next[i] = (1 - alpha) * (current[i] ?? 0) + alpha * signalWeight * (cardVec[i] ?? 0);
  }
  return normalize(next);
}

/** Exponential decay of a signal/centroid weight by age. */
export function decayWeight(
  weight: number,
  ageDays: number,
  halfLifeDays: number = TASTE_HALF_LIFE_DAYS,
): number {
  if (ageDays <= 0) return weight;
  return weight * Math.exp((-Math.LN2 * ageDays) / halfLifeDays);
}

/**
 * Maps a measured dwell time to a signal: long dwell = interest, a fast skip =
 * disinterest, the middle band = no signal.
 */
export function dwellToSignal(dwellMs: number): SignalType | undefined {
  if (dwellMs >= DWELL_SIGNAL_MS) return 'dwell';
  if (dwellMs >= 0 && dwellMs < FAST_SKIP_MS) return 'fast_skip';
  return undefined;
}
