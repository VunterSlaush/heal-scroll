/** First <img src> in an HTML fragment, if any (PLAN §2: og:image / first img / API thumbnail). */
export function extractFirstImage(html: string): string | undefined {
  const match = /<img[^>]*\ssrc=["']([^"']+)["']/i.exec(html);
  const src = match?.[1];
  if (!src || !/^https?:\/\//i.test(src)) return undefined;
  return src;
}
