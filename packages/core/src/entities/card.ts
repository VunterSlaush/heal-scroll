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
}
