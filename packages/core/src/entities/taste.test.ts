import { describe, expect, it } from 'vitest';
import {
  decayWeight,
  DWELL_SIGNAL_MS,
  dwellToSignal,
  emaUpdate,
  FAST_SKIP_MS,
  SIGNAL_WEIGHTS,
  TASTE_HALF_LIFE_DAYS,
} from './taste';
import { cosineSimilarity, normalize } from './vector';

const vec = (...values: number[]) => Float32Array.from(values);

describe('emaUpdate', () => {
  it('applies the EMA formula and re-normalizes', () => {
    const current = normalize(vec(1, 0));
    const card = normalize(vec(0, 1));
    const next = emaUpdate(current, card, SIGNAL_WEIGHTS.save, 0.1);
    // (1−α)·(1,0) + α·1.0·(0,1) = (0.9, 0.1), then unit-normalized.
    const expected = normalize(vec(0.9, 0.1));
    expect(next[0]).toBeCloseTo(expected[0] ?? 0);
    expect(next[1]).toBeCloseTo(expected[1] ?? 0);
  });

  it('moves away from the card on a negative signal', () => {
    const current = normalize(vec(1, 1));
    const card = normalize(vec(0, 1));
    const next = emaUpdate(current, card, SIGNAL_WEIGHTS.downvote);
    expect(cosineSimilarity(next, card)).toBeLessThan(cosineSimilarity(current, card));
  });

  it('seeds from the card when there is no current taste, flipped for negatives', () => {
    const card = normalize(vec(1, 2));
    const positive = emaUpdate(undefined, card, SIGNAL_WEIGHTS.upvote);
    expect(cosineSimilarity(positive, card)).toBeCloseTo(1);
    const negative = emaUpdate(undefined, card, SIGNAL_WEIGHTS.downvote);
    expect(cosineSimilarity(negative, card)).toBeCloseTo(-1);
  });

  it('reseeds on dimension change instead of mixing spaces', () => {
    const next = emaUpdate(vec(1, 0, 0), vec(0, 1), 1);
    expect(next.length).toBe(2);
    expect(next[1]).toBeCloseTo(1);
  });
});

describe('decayWeight', () => {
  it('halves after one half-life and leaves fresh weights alone', () => {
    expect(decayWeight(1, TASTE_HALF_LIFE_DAYS)).toBeCloseTo(0.5);
    expect(decayWeight(0.8, 0)).toBe(0.8);
    expect(decayWeight(0.8, -3)).toBe(0.8);
  });
});

describe('dwellToSignal', () => {
  it('maps long dwell to interest and fast skips to disinterest', () => {
    expect(dwellToSignal(DWELL_SIGNAL_MS)).toBe('dwell');
    expect(dwellToSignal(DWELL_SIGNAL_MS + 5_000)).toBe('dwell');
    expect(dwellToSignal(FAST_SKIP_MS - 1)).toBe('fast_skip');
    expect(dwellToSignal(0)).toBe('fast_skip');
  });

  it('emits nothing for the neutral middle band or bogus values', () => {
    expect(dwellToSignal(FAST_SKIP_MS)).toBeUndefined();
    expect(dwellToSignal(DWELL_SIGNAL_MS - 1)).toBeUndefined();
    expect(dwellToSignal(-100)).toBeUndefined();
  });
});
