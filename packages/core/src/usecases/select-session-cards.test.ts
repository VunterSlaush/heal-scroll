import { describe, expect, it } from 'vitest';
import type { Card } from '../entities/card';
import { makeCard } from '../testing/fakes';
import { selectSessionCards } from './select-session-cards';

function series(baseId: string, count: number, overrides: Partial<Card> = {}): Card[] {
  return Array.from({ length: count }, (_, i) =>
    makeCard(`${baseId}#${i + 1}`, {
      seriesId: baseId,
      seriesIndex: i + 1,
      seriesCount: count,
      hash: `hash-${baseId}-${i + 1}`,
      ...overrides,
    }),
  );
}

describe('selectSessionCards', () => {
  it('caps a source at 2 units when other sources can fill the session', () => {
    const cards = [
      ...['a1', 'a2', 'a3', 'a4'].map((id) => makeCard(id, { sourceId: 'busy' })),
      ...['b1', 'b2'].map((id) => makeCard(id, { sourceId: 'other', topicId: 'history' })),
    ];
    const picked = selectSessionCards(cards, { n: 4, preferShortCards: false });
    expect(picked).toHaveLength(4);
    expect(picked.filter((c) => c.sourceId === 'busy')).toHaveLength(2);
  });

  it('relaxes the source cap rather than shortening the session (regression)', () => {
    // Pool dominated by two sources across four topics: the old hard cap
    // stopped the session at 4 cards (2 per source) — exactly minTopics.
    const cards = Array.from({ length: 12 }, (_, i) =>
      makeCard(`c${String(i).padStart(2, '0')}`, {
        sourceId: i % 2 === 0 ? 'wikipedia' : 'reddit',
        topicId: ['space', 'history', 'finance', 'health'][i % 4]!,
      }),
    );
    const picked = selectSessionCards(cards, { n: 7, preferShortCards: false });
    expect(picked).toHaveLength(7);
    expect(new Set(picked.map((c) => c.topicId)).size).toBeGreaterThanOrEqual(4);
  });

  it('fills entirely from one source when nothing else exists', () => {
    const cards = ['a', 'b', 'c', 'd'].map((id) => makeCard(id, { sourceId: 'one' }));
    expect(selectSessionCards(cards, { n: 4, preferShortCards: false })).toHaveLength(4);
  });

  it('avoids two consecutive cards from the same topic when possible', () => {
    const cards = [
      makeCard('s1', { topicId: 'space', sourceId: 'a' }),
      makeCard('s2', { topicId: 'space', sourceId: 'b' }),
      makeCard('h1', { topicId: 'history', sourceId: 'c' }),
    ];
    const picked = selectSessionCards(cards, { n: 3, preferShortCards: false });
    expect(picked.map((c) => c.topicId)).toEqual(['space', 'history', 'space']);
  });

  it('relaxes topic adjacency rather than under-filling a thin pool', () => {
    const cards = [makeCard('a', { sourceId: 's1' }), makeCard('b', { sourceId: 's2' })];
    expect(selectSessionCards(cards, { n: 2, preferShortCards: false })).toHaveLength(2);
  });

  it('keeps a complete series together, consuming k slots as one unit', () => {
    const picked = selectSessionCards([...series('arxiv:1', 3), makeCard('x', { sourceId: 'other' })], {
      n: 4,
      preferShortCards: false,
    });
    expect(picked.map((c) => c.id)).toEqual(['arxiv:1#1', 'arxiv:1#2', 'arxiv:1#3', 'x']);
  });

  it('never splits a series across the lock boundary', () => {
    const picked = selectSessionCards([...series('arxiv:1', 3), makeCard('x', { sourceId: 'other' })], {
      n: 2,
      preferShortCards: false,
    });
    // series (3 cards) does not fit in 2 remaining slots → skipped, shorter items picked
    expect(picked.map((c) => c.id)).toEqual(['x']);
  });

  it('uses only the lead card when preferShortCards is on', () => {
    const picked = selectSessionCards(series('arxiv:1', 3), { n: 3, preferShortCards: true });
    expect(picked.map((c) => c.id)).toEqual(['arxiv:1#1']);
  });

  it('always spreads across every available topic before repeating one', () => {
    const cards = [
      ...['a', 'b', 'c', 'd'].map((id, i) => makeCard(id, { topicId: 'space', sourceId: `s${i}` })),
      makeCard('h', { topicId: 'history', sourceId: 'sh' }),
      makeCard('f', { topicId: 'finance', sourceId: 'sf' }),
    ];
    const picked = selectSessionCards(cards, { n: 5, preferShortCards: false });
    expect(new Set(picked.map((c) => c.topicId)).size).toBe(3);
    expect(picked).toHaveLength(5);
  });

  it('coverage degrades gracefully when the pool has few topics', () => {
    const cards = [makeCard('a', { sourceId: 's1' }), makeCard('b', { sourceId: 's2' })];
    const picked = selectSessionCards(cards, { n: 2, preferShortCards: false });
    expect(picked).toHaveLength(2);
  });

  it('uses the earliest remaining card standalone when a series is partial', () => {
    const [, second, third] = series('arxiv:1', 3);
    const picked = selectSessionCards([second!, third!], { n: 3, preferShortCards: false });
    expect(picked.map((c) => c.id)).toEqual(['arxiv:1#2']);
  });
});
