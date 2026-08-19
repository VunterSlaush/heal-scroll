import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/guardian-science.json';
import { createGuardianAdapter, resultsToCards, type GuardianResponse } from './guardian.adapter';

const response = fixture as GuardianResponse;

describe('guardian adapter — resultsToCards', () => {
  const cards = resultsToCards(response, 'science');

  it('turns every result into cards with full mapping', () => {
    expect(response.response?.results).toHaveLength(5);
    expect(cards.length).toBeGreaterThanOrEqual(5);
    for (const card of cards) {
      expect(card.id).toMatch(/^guardian:/);
      expect(card.sourceId).toBe('guardian');
      expect(card.sourceName).toBe('The Guardian');
      expect(card.body).not.toMatch(/<[^>]+>/);
      expect(card.sourceUrl).toMatch(/^https:\/\/(www\.)?theguardian\.com/);
      expect(card.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it('full article bodies become bounded series through the splitter', () => {
    const seriesIds = new Set(cards.filter((c) => c.seriesId).map((c) => c.seriesId));
    expect(seriesIds.size).toBeGreaterThan(0);
    for (const seriesId of seriesIds) {
      const members = cards.filter((c) => c.seriesId === seriesId);
      expect(members.length).toBeGreaterThanOrEqual(2);
      expect(members.length).toBeLessThanOrEqual(4);
    }
  });

  it('carries thumbnails when the API provides them', () => {
    expect(cards.some((c) => c.imageUrl?.startsWith('https://'))).toBe(true);
  });

  it('serves nothing for topics with neither filters nor a query', async () => {
    const adapter = createGuardianAdapter('test');
    expect(await adapter.fetchCards({ id: 'gardening', name: 'Gardening', query: '' }, 5)).toEqual([]);
  });
});
