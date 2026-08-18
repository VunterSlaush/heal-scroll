/**
 * Hash a title for cross-source dedupe: lowercase, strip accents and
 * punctuation, then FNV-1a 32-bit. Pure JS so it runs on Hermes.
 */
export function hashTitle(title: string): string {
  const normalized = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
