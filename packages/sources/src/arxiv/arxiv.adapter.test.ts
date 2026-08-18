import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { entriesToCards, parseArxivFeed } from './arxiv.adapter';
import { splitAbstract } from './split-abstract';

const xml = readFileSync(fileURLToPath(new URL('./__fixtures__/arxiv-space.xml', import.meta.url)), 'utf8');

describe('arxiv adapter', () => {
  const entries = parseArxivFeed(xml);
  const cards = entriesToCards(entries, 'space');

  it('parses all fixture entries', () => {
    expect(entries).toHaveLength(6);
    expect(cards.length).toBeGreaterThanOrEqual(6);
  });

  it('maps ids, urls and dates from the Atom feed', () => {
    const first = cards[0]!;
    expect(first.id).toMatch(/^arxiv:\d{4}\.\d{4,5}v\d/);
    expect(first.sourceId).toBe('arxiv');
    expect(first.sourceUrl).toMatch(/^https:\/\/arxiv\.org\/abs\//);
    expect(first.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(first.title).not.toMatch(/\s{2}/);
  });

  it('splits long abstracts into a 2-card series with context titles', () => {
    const seriesCards = cards.filter((c) => c.seriesId);
    expect(seriesCards.length).toBeGreaterThan(0);
    const bySeries = new Map<string, typeof cards>();
    for (const card of seriesCards) {
      bySeries.set(card.seriesId!, [...(bySeries.get(card.seriesId!) ?? []), card]);
    }
    for (const members of bySeries.values()) {
      expect(members).toHaveLength(2);
      expect(members[0]!.seriesIndex).toBe(1);
      expect(members[1]!.title).toMatch(/· 2\/2$/);
      expect(members[0]!.hash).not.toBe(members[1]!.hash);
    }
  });

  it('handles empty and single-entry feeds', () => {
    expect(parseArxivFeed('<feed xmlns="http://www.w3.org/2005/Atom"></feed>')).toEqual([]);
  });
});

describe('splitAbstract', () => {
  it('keeps short abstracts as one card', () => {
    expect(splitAbstract('A short abstract. It fits easily.')).toHaveLength(1);
  });

  it('splits long abstracts at a sentence boundary', () => {
    const long = Array.from(
      { length: 16 },
      (_, i) => `Sentence number ${i} carries a rather detailed set of experimental findings.`,
    ).join(' ');
    const parts = splitAbstract(long);
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatch(/\.$/);
    expect(parts[0]!.length).toBeLessThanOrEqual(600);
  });
});
