import type { Card, SourceConfig, SourcePort, Topic } from '@heal-scroll/core';
import { XMLParser } from 'fast-xml-parser';
import { splitAbstract } from '../arxiv/split-abstract';
import { makeSeriesCards } from '../splitters/make-series';
import { stripHtml } from '../utils/strip-html';

export const PUBMED_CONFIG: SourceConfig = {
  userAgent: 'heal-scroll/0.1 (personal project; jesus.mota@monalee.co)',
  // NCBI allows 3 req/s without a key; each fetch uses two (esearch + efetch).
  rateLimitPerMinute: 20,
  ttlHours: 24 * 7,
  quality: 0.85,
  topicIds: ['science', 'health', 'nutrition', 'longevity', 'mindfulness'],
  dynamicTopics: true,
};

const ESEARCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const EFETCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';

/** Review articles only — digestible summaries, not raw trial reports. */
const TOPIC_QUERIES: Record<string, string> = {
  science: 'biology AND hasabstract[text] AND review[pt]',
  health: 'medicine AND hasabstract[text] AND review[pt]',
  nutrition: 'nutrition AND hasabstract[text] AND review[pt]',
  longevity: '(longevity OR sleep) AND hasabstract[text] AND review[pt]',
  mindfulness: '(mindfulness OR "mental health") AND hasabstract[text] AND review[pt]',
};

export interface EsearchResponse {
  esearchresult?: { idlist?: string[] };
}

export interface PubmedArticle {
  pmid: string;
  title: string;
  abstract: string;
  publishedAt?: string;
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** Mixed-content XML nodes come back as strings, numbers, or {'#text': …}. */
function textOf(node: unknown): string {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (typeof node === 'object' && '#text' in node) {
    return textOf((node as Record<string, unknown>)['#text']);
  }
  return '';
}

function parseDate(pubDate: Record<string, unknown> | undefined): string | undefined {
  const year = textOf(pubDate?.Year);
  if (!/^\d{4}$/.test(year)) return undefined;
  const monthRaw = textOf(pubDate?.Month).toLowerCase();
  const month = MONTHS[monthRaw.slice(0, 3)] ?? (/^\d{1,2}$/.test(monthRaw) ? monthRaw.padStart(2, '0') : '01');
  const dayRaw = textOf(pubDate?.Day);
  const day = /^\d{1,2}$/.test(dayRaw) ? dayRaw.padStart(2, '0') : '01';
  return `${year}-${month}-${day}T00:00:00Z`;
}

interface EfetchArticleNode {
  MedlineCitation?: {
    PMID?: unknown;
    Article?: {
      ArticleTitle?: unknown;
      Abstract?: { AbstractText?: unknown | unknown[] };
      Journal?: { JournalIssue?: { PubDate?: Record<string, unknown> } };
    };
  };
}

/** efetch XML → normalized articles. Exported for the fixture test. */
export function parseEfetch(xml: string): PubmedArticle[] {
  const parsed = parser.parse(xml) as {
    PubmedArticleSet?: { PubmedArticle?: EfetchArticleNode | EfetchArticleNode[] };
  };
  return asArray(parsed.PubmedArticleSet?.PubmedArticle).flatMap((entry) => {
    const citation = entry.MedlineCitation;
    const article = citation?.Article;
    if (!citation || !article) return [];
    const pmid = textOf(citation.PMID);
    const title = stripHtml(textOf(article.ArticleTitle)).replace(/\.$/, '');
    const abstract = asArray(article.Abstract?.AbstractText)
      .map((part) => stripHtml(textOf(part)))
      .filter(Boolean)
      .join(' ');
    if (!pmid || !title || !abstract) return [];
    const result: PubmedArticle = { pmid, title, abstract };
    const publishedAt = parseDate(article.Journal?.JournalIssue?.PubDate);
    if (publishedAt) result.publishedAt = publishedAt;
    return [result];
  });
}

export function articlesToCards(articles: PubmedArticle[], topicId: string): Card[] {
  return articles.flatMap((article) => {
    const base: Omit<Card, 'body' | 'hash'> = {
      id: `pubmed:${article.pmid}`,
      topicId,
      sourceId: 'pubmed',
      title: article.title,
      sourceName: 'PubMed',
      // Links out, no advice framing (PLAN §3 notes).
      sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`,
    };
    if (article.publishedAt) base.publishedAt = article.publishedAt;
    return makeSeriesCards(base, splitAbstract(article.abstract));
  });
}

export const pubmedAdapter: SourcePort = {
  id: 'pubmed',
  name: 'PubMed',
  config: PUBMED_CONFIG,

  async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
    const term =
      TOPIC_QUERIES[topic.id] ??
      (topic.query ? `${topic.query} AND hasabstract[text] AND review[pt]` : undefined);
    if (!term || limit <= 0) return [];
    const headers = { 'User-Agent': PUBMED_CONFIG.userAgent };

    const searchResponse = await fetch(
      `${ESEARCH_URL}?db=pubmed&retmode=json&sort=date&retmax=${Math.min(limit, 20)}&term=${encodeURIComponent(term)}`,
      { headers },
    );
    if (!searchResponse.ok) throw new Error(`pubmed: HTTP ${searchResponse.status} (esearch)`);
    const ids = ((await searchResponse.json()) as EsearchResponse).esearchresult?.idlist ?? [];
    if (ids.length === 0) return [];

    const fetchResponse = await fetch(
      `${EFETCH_URL}?db=pubmed&retmode=xml&rettype=abstract&id=${ids.join(',')}`,
      { headers },
    );
    if (!fetchResponse.ok) throw new Error(`pubmed: HTTP ${fetchResponse.status} (efetch)`);
    return articlesToCards(parseEfetch(await fetchResponse.text()), topic.id);
  },
};
