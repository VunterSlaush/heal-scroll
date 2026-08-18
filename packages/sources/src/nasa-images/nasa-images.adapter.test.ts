import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/nasa-images-nebula.json';
import { itemsToCards, type NasaImagesResponse } from './nasa-images.adapter';

const response = fixture as NasaImagesResponse;

describe('nasa-images adapter — itemsToCards', () => {
  const cards = itemsToCards(response, 'space');

  it('creates image-first cards linking to the archive detail page', () => {
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(card.id).toMatch(/^nasa-images:/);
      expect(card.imageUrl).toMatch(/^https:\/\//);
      expect(card.sourceUrl).toMatch(/^https:\/\/images\.nasa\.gov\/details\//);
      expect(card.body.length).toBeGreaterThanOrEqual(40);
      expect(card.body).not.toMatch(/<[^>]+>/);
      expect(card.popularity).toBe(0.75);
    }
  });

  it('skips items missing description or image', () => {
    expect(
      itemsToCards(
        { collection: { items: [{ data: [{ nasa_id: 'x', title: 'T' }] }] } },
        'space',
      ),
    ).toEqual([]);
  });
});
