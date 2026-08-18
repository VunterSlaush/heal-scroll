import type { Card } from '@heal-scroll/core';
import { hashTitle } from '../utils/hash-title';

export const MAX_SERIES_CARDS = 4;

type BaseCard = Omit<Card, 'body' | 'hash' | 'seriesId' | 'seriesIndex' | 'seriesCount'>;

/**
 * Turns one source item with 1+ bodies into a single card or a series
 * (PLAN §2c): max 4 cards, later titles carry "· i/n" context, the image
 * stays on card 1, and each card gets its own dedupe hash.
 */
export function makeSeriesCards(base: BaseCard, bodies: string[]): Card[] {
  const parts = bodies.filter((b) => b.length > 0).slice(0, MAX_SERIES_CARDS);
  if (parts.length === 0) return [];
  if (parts.length === 1) {
    return [{ ...base, body: parts[0]!, hash: hashTitle(base.title) }];
  }
  return parts.map((body, index) => {
    const card: Card = {
      ...base,
      id: `${base.id}#${index + 1}`,
      title: index === 0 ? base.title : `${base.title} · ${index + 1}/${parts.length}`,
      body,
      hash: hashTitle(`${base.title} ${index + 1}/${parts.length}`),
      seriesId: base.id,
      seriesIndex: index + 1,
      seriesCount: parts.length,
    };
    if (index > 0) delete card.imageUrl;
    return card;
  });
}
