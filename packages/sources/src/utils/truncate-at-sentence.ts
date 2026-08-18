/**
 * Cut plain text at the last sentence boundary (. ! ?) that fits in `maxChars`.
 * Falls back to a word-boundary cut with an ellipsis when no sentence fits.
 */
export function truncateAtSentence(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;

  const window = trimmed.slice(0, maxChars);
  const sentenceEnds = [...window.matchAll(/[.!?](?=\s|$)/g)];
  const last = sentenceEnds[sentenceEnds.length - 1];
  if (last && last.index > 0) {
    return window.slice(0, last.index + 1);
  }

  const lastSpace = window.lastIndexOf(' ');
  const cut = lastSpace > 0 ? window.slice(0, lastSpace) : window;
  return `${cut.trimEnd()}…`;
}
