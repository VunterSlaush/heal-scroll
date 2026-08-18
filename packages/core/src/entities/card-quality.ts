import type { Card } from './card';

/** Every card fills a whole screen — a two-line body looks broken there. */
const MIN_BODY_TEXT_CHARS = 140;
/** A strong image carries a slide; a one-line caption is enough. */
const MIN_BODY_VISUAL_CHARS = 40;
/** Later series cards inherit context from their lead card. */
const MIN_BODY_SERIES_CHARS = 80;

export function isSubstantialCard(card: Card): boolean {
  const length = card.body.trim().length;
  if (card.seriesId) return length >= MIN_BODY_SERIES_CHARS;
  if (card.imageUrl) return length >= MIN_BODY_VISUAL_CHARS;
  return length >= MIN_BODY_TEXT_CHARS;
}
