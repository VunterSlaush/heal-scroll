import { describe, expect, it } from 'vitest';
import { canonicalUrl } from './canonical-url';

describe('canonicalUrl', () => {
  it('upgrades http, lowercases host, strips www and trailing slash', () => {
    expect(canonicalUrl('http://WWW.Example.COM/Path/')).toBe('https://example.com/Path');
  });

  it('drops fragments', () => {
    expect(canonicalUrl('https://en.wikipedia.org/wiki/Space#History')).toBe('https://en.wikipedia.org/wiki/Space');
  });

  it('removes tracking params but keeps meaningful ones', () => {
    expect(canonicalUrl('https://example.com/a?utm_source=x&id=42&fbclid=abc')).toBe('https://example.com/a?id=42');
  });

  it('removes the query entirely when only tracking params remain', () => {
    expect(canonicalUrl('https://example.com/a?utm_source=x&utm_medium=y')).toBe('https://example.com/a');
  });

  it('keeps the path case intact and is idempotent', () => {
    const once = canonicalUrl('https://en.wikipedia.org/wiki/BOTSAT%E2%80%911');
    expect(canonicalUrl(once)).toBe(once);
  });
});
