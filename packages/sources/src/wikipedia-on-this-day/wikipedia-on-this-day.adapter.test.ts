import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/onthisday-aug-18.json';
import { eventsToCards, type OtdResponse } from './wikipedia-on-this-day.adapter';

const response = fixture as OtdResponse;

describe('wikipedia on-this-day adapter', () => {
  const cards = eventsToCards(response, 'history', '08-18');

  it('turns every event into a card, sequenced chronologically', () => {
    expect(cards).toHaveLength(response.events!.length);
    const years = cards.map((c) => Number(/:(\d+):/.exec(c.id)?.[1]));
    expect(years).toEqual([...years].sort((a, b) => a - b));
  });

  it('titles carry the year and link to the related article', () => {
    const first = cards[0]!;
    expect(first.title).toMatch(/^\d+: /);
    expect(first.sourceUrl).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//);
    expect(first.publishedAt).toBeUndefined(); // evergreen by design
    expect(first.body.length).toBeGreaterThan(0);
  });

  it('re-running the same day produces identical ids (idempotent refetch)', () => {
    const again = eventsToCards(response, 'history', '08-18');
    expect(again.map((c) => c.id)).toEqual(cards.map((c) => c.id));
    expect(new Set(cards.map((c) => c.hash)).size).toBe(cards.length);
  });
});
