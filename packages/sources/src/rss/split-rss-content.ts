import { stripHtml } from '../utils/strip-html';
import { truncateAtSentence } from '../utils/truncate-at-sentence';

const CARD_CHARS = 480;
const SINGLE_CARD_THRESHOLD = 700;
const MIN_SECTION_CHARS = 80;
const CLUSTER_MIN_WORDS = 60;
const MAX_PARTS = 4;

/**
 * RSS splitter (PLAN §2c): split on <h2>/<h3> when the article has real
 * sections, else cluster paragraphs of ~60–100 words. Conservative on
 * purpose — when the structure is unclear the item stays a single card.
 */
export function splitRssContent(html: string): string[] {
  const sections = html.split(/<h[23][^>]*>/i);
  if (sections.length >= 3) {
    const parts = sections
      .map((section) => truncateAtSentence(stripHtml(section), CARD_CHARS))
      .filter((part) => part.length >= MIN_SECTION_CHARS)
      .slice(0, MAX_PARTS);
    if (parts.length >= 2) return parts;
  }

  const fullText = stripHtml(html);
  if (fullText.length <= SINGLE_CARD_THRESHOLD) {
    return [truncateAtSentence(fullText, CARD_CHARS)];
  }

  const paragraphs = html
    .split(/<\/p>/i)
    .map((p) => stripHtml(p))
    .filter((p) => p.length > 0);
  if (paragraphs.length < 2) return [truncateAtSentence(fullText, CARD_CHARS)];

  const clusters: string[] = [];
  let current = '';
  for (const paragraph of paragraphs) {
    current = current ? `${current} ${paragraph}` : paragraph;
    if (current.split(' ').length >= CLUSTER_MIN_WORDS) {
      clusters.push(truncateAtSentence(current, CARD_CHARS));
      current = '';
      if (clusters.length === MAX_PARTS) break;
    }
  }
  return clusters.length >= 2 ? clusters : [truncateAtSentence(fullText, CARD_CHARS)];
}
