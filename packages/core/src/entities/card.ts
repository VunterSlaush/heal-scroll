/** A single feed card — fully self-contained and renderable offline. */
export interface Card {
  /** `<sourceId>:<externalId>`, e.g. `wikipedia:27667`. */
  id: string;
  topicId: string;
  sourceId: string;
  title: string;
  /** 2–4 sentences of plain text, already stripped and truncated. */
  body: string;
  imageUrl?: string;
  sourceName: string;
  /** Canonical link to the original item. */
  sourceUrl: string;
  /** ISO 8601. Optional: evergreen content has no meaningful date. */
  publishedAt?: string;
  /** Normalized-title hash used for cross-source dedupe. */
  hash: string;
  /**
   * Interest prior from the source, 0..1 (Wikipedia pageviews, HN points,
   * likes…). Undefined means neutral (0.5). A ranking input, not a rating.
   */
  popularity?: number;
  /** Set when the card belongs to a multi-card series (PLAN §2c). */
  seriesId?: string;
  /** 1-based position within the series. */
  seriesIndex?: number;
  /** Total cards in the series (3–4 max). */
  seriesCount?: number;
}
