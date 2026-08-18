import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/apod-batch.json';
import { apodToCards, type ApodItem } from './nasa-apod.adapter';

const items = fixture as ApodItem[];

describe('nasa-apod adapter', () => {
  const cards = apodToCards(items, 'space');

  it('creates image-first cards with the archive page as source url', () => {
    expect(cards.length).toBeGreaterThan(0);
    const first = cards[0]!;
    expect(first.id).toMatch(/^nasa-apod:\d{4}-\d{2}-\d{2}/);
    expect(first.imageUrl).toMatch(/^https:\/\//);
    expect(first.sourceUrl).toMatch(/^https:\/\/apod\.nasa\.gov\/apod\/ap\d{6}\.html$/);
    expect(first.publishedAt).toMatch(/T00:00:00Z$/);
  });

  it('splits long explanations image-card-first, description second', () => {
    const seriesLeads = cards.filter((c) => c.seriesIndex === 1);
    for (const lead of seriesLeads) {
      expect(lead.imageUrl).toBeDefined();
      const second = cards.find((c) => c.seriesId === lead.seriesId && c.seriesIndex === 2);
      expect(second).toBeDefined();
      expect(second!.imageUrl).toBeUndefined();
    }
  });

  it('skips video items and incomplete payloads', () => {
    expect(
      apodToCards(
        [
          { date: '2026-01-01', title: 'V', explanation: 'x', media_type: 'video', url: 'https://youtu.be/x' },
          { title: 'incomplete' },
        ],
        'space',
      ),
    ).toEqual([]);
  });
});
