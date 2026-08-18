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
  it('caps a single source at 2 units per session', () => {
    const cards = ['a', 'b', 'c', 'd'].map((id) => makeCard(id, { sourceId: 'one' }));
    expect(selectSessionCards(cards, { n: 4, preferShortCards: false })).toHaveLength(2);
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

  it('uses the earliest remaining card standalone when a series is partial', () => {
    const [, second, third] = series('arxiv:1', 3);
    const picked = selectSessionCards([second!, third!], { n: 3, preferShortCards: false });
    expect(picked.map((c) => c.id)).toEqual(['arxiv:1#2']);
  });
});
