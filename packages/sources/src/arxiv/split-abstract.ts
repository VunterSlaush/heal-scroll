import { truncateAtSentence } from '../utils/truncate-at-sentence';

const SERIES_THRESHOLD_CHARS = 1100;
const LEAD_CHARS = 600;
const REST_CHARS = 1000;

/**
 * arXiv splitter (PLAN §2c): short abstracts stay one card; long ones become
 * [first sentences, rest of abstract]. No generated "why it matters" text.
 */
export function splitAbstract(abstract: string): string[] {
  const text = abstract.replace(/\s+/g, ' ').trim();
  if (text.length <= SERIES_THRESHOLD_CHARS) {
    return [truncateAtSentence(text, REST_CHARS)];
  }
  const lead = truncateAtSentence(text, LEAD_CHARS);
  const rest = text.slice(lead.length).trim();
  if (rest.length < 80) return [truncateAtSentence(text, REST_CHARS)];
  return [lead, truncateAtSentence(rest, REST_CHARS)];
}
