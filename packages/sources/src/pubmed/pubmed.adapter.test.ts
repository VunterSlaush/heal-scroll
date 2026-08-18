import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import esearchFixture from './__fixtures__/pubmed-esearch.json';
import { articlesToCards, parseEfetch, type EsearchResponse } from './pubmed.adapter';

const efetchXml = readFileSync(
  fileURLToPath(new URL('./__fixtures__/pubmed-efetch.xml', import.meta.url)),
  'utf8',
);

describe('pubmed adapter', () => {
  const articles = parseEfetch(efetchXml);
  const cards = articlesToCards(articles, 'nutrition');

  it('the esearch fixture yields the ids the efetch fixture was recorded with', () => {
    const ids = (esearchFixture as EsearchResponse).esearchresult?.idlist ?? [];
    expect(ids).toHaveLength(5);
    expect(articles.map((a) => a.pmid).every((pmid) => ids.includes(pmid))).toBe(true);
  });

  it('parses titles, abstracts and dates from the efetch XML', () => {
    expect(articles.length).toBeGreaterThanOrEqual(4);
    for (const article of articles) {
      expect(article.title.length).toBeGreaterThan(10);
      expect(article.abstract.length).toBeGreaterThan(100);
      expect(article.title).not.toMatch(/<[^>]+>/);
      if (article.publishedAt) expect(article.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it('long abstracts become 2-card series linking to pubmed.ncbi.nlm.nih.gov', () => {
    expect(cards.some((c) => c.seriesId)).toBe(true);
    for (const card of cards) {
      expect(card.sourceId).toBe('pubmed');
      expect(card.sourceUrl).toMatch(/^https:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/\d+\/$/);
      expect(card.body.length).toBeLessThanOrEqual(481);
    }
    expect(new Set(cards.map((c) => c.hash)).size).toBe(cards.length);
  });

  it('handles empty payloads', () => {
    expect(parseEfetch('<PubmedArticleSet></PubmedArticleSet>')).toEqual([]);
  });
});
