import { describe, expect, it } from 'vitest';
import { cosineSimilarity, meanVector, normalize } from './vector';

const vec = (...values: number[]) => Float32Array.from(values);

describe('cosineSimilarity', () => {
  it('is 1 for identical directions and -1 for opposite ones', () => {
    expect(cosineSimilarity(vec(1, 2, 3), vec(2, 4, 6))).toBeCloseTo(1);
    expect(cosineSimilarity(vec(1, 0), vec(-1, 0))).toBeCloseTo(-1);
  });

  it('is 0 for orthogonal vectors', () => {
    expect(cosineSimilarity(vec(1, 0), vec(0, 1))).toBeCloseTo(0);
  });

  it('returns 0 on dimension mismatch, zero norm, or empty input', () => {
    expect(cosineSimilarity(vec(1, 2), vec(1, 2, 3))).toBe(0);
    expect(cosineSimilarity(vec(0, 0), vec(1, 2))).toBe(0);
    expect(cosineSimilarity(vec(), vec())).toBe(0);
  });
});

describe('normalize', () => {
  it('produces a unit vector', () => {
    const out = normalize(vec(3, 4));
    expect(out[0]).toBeCloseTo(0.6);
    expect(out[1]).toBeCloseTo(0.8);
  });

  it('leaves a zero vector as zero instead of dividing by zero', () => {
    expect([...normalize(vec(0, 0, 0))]).toEqual([0, 0, 0]);
  });
});

describe('meanVector', () => {
  it('averages vectors, honouring weights', () => {
    const mean = meanVector([vec(0, 0), vec(4, 8)], [1, 3]);
    expect(mean?.[0]).toBeCloseTo(3);
    expect(mean?.[1]).toBeCloseTo(6);
  });

  it('skips vectors with a different length than the first', () => {
    const mean = meanVector([vec(2, 2), vec(1, 2, 3)]);
    expect(mean?.[0]).toBeCloseTo(2);
    expect(mean?.[1]).toBeCloseTo(2);
  });

  it('returns undefined for empty input or all-zero weights', () => {
    expect(meanVector([])).toBeUndefined();
    expect(meanVector([vec(1, 1)], [0])).toBeUndefined();
  });
});
