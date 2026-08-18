import { describe, expect, it } from 'vitest';
import { makeCard } from '../testing/fakes';
import { freshnessDecay, rankCards, scoreCard, type RankContext } from './rank-cards.usecase';

const NOW = new Date('2026-08-18T12:00:00Z');

function ctx(overrides: Partial<RankContext> = {}): RankContext {
  return {
    topicWeights: {},
    sourceWeights: {},
    sourceQuality: {},
    recentSourceCounts: {},
    now: NOW,
    ...overrides,
  };
}

describe('freshnessDecay', () => {
  it('halves every 7 days and floors at 0.05', () => {
    expect(freshnessDecay(NOW.toISOString(), NOW)).toBeCloseTo(1);
    expect(freshnessDecay('2026-08-11T12:00:00Z', NOW)).toBeCloseTo(0.5);
    expect(freshnessDecay('2020-01-01T00:00:00Z', NOW)).toBe(0.05);
  });

  it('gives evergreen (undated) content a fixed mid value', () => {
    expect(freshnessDecay(undefined, NOW)).toBe(0.6);
  });
});

describe('rankCards', () => {
  it('prefers higher topic weight, learned source weight and quality', () => {
    const a = makeCard('a', { topicId: 'space', sourceId: 's1' });
    const b = makeCard('b', { topicId: 'history', sourceId: 's2' });
    const ranked = rankCards([a, b], ctx({ topicWeights: { history: 2 } }));
    expect(ranked[0]?.id).toBe('b');
    const ranked2 = rankCards([a, b], ctx({ sourceWeights: { 'space/s1': 3 } }));
    expect(ranked2[0]?.id).toBe('a');
  });

  it('penalizes sources served recently', () => {
    const a = makeCard('a', { sourceId: 'busy' });
    const b = makeCard('b', { sourceId: 'quiet' });
    const ranked = rankCards([a, b], ctx({ recentSourceCounts: { busy: 10 } }));
    expect(ranked[0]?.id).toBe('b');
  });

  it('prefers fresher cards from otherwise equal sources', () => {
    const fresh = makeCard('fresh', { publishedAt: NOW.toISOString() });
    const stale = makeCard('stale', { publishedAt: '2026-07-01T00:00:00Z' });
    expect(rankCards([stale, fresh], ctx())[0]?.id).toBe('fresh');
  });

  it('is deterministic on ties (by id)', () => {
    const cards = [makeCard('b'), makeCard('a')];
    expect(rankCards(cards, ctx()).map((c) => c.id)).toEqual(['a', 'b']);
    expect(scoreCard(cards[0]!, ctx())).toBe(scoreCard(cards[1]!, ctx()));
  });
});
