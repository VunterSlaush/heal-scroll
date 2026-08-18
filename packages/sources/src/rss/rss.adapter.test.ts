import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { feedItemsToCards, parseFeed } from './rss.adapter';
import { splitRssContent } from './split-rss-content';

const xml = readFileSync(fileURLToPath(new URL('./__fixtures__/rss-tech-blog.xml', import.meta.url)), 'utf8');

describe('rss adapter', () => {
  const { feedTitle, items } = parseFeed(xml);
  const cards = feedItemsToCards(items, 'tech', feedTitle ?? 'Feed');

  it('parses the RSS 2.0 fixture with its feed title', () => {
    expect(feedTitle).toBe('Coding Horror');
    expect(items.length).toBeGreaterThan(0);
    expect(cards.length).toBeGreaterThan(0);
  });

  it('produces plain-text bodies, canonical urls and ISO dates', () => {
    for (const card of cards) {
      expect(card.body).not.toMatch(/<[^>]+>/);
      expect(card.sourceUrl).toMatch(/^https:\/\/blog\.codinghorror\.com/);
      expect(card.sourceName).toBe('Coding Horror');
      if (card.publishedAt) expect(card.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it('long articles become bounded series, never split past 4 cards', () => {
    const seriesIds = new Set(cards.filter((c) => c.seriesId).map((c) => c.seriesId));
    for (const seriesId of seriesIds) {
      const members = cards.filter((c) => c.seriesId === seriesId);
      expect(members.length).toBeGreaterThanOrEqual(2);
      expect(members.length).toBeLessThanOrEqual(4);
      expect(members[0]!.seriesCount).toBe(members.length);
    }
  });

  it('parses Atom feeds too', () => {
    const atom = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
      <title>Atom Blog</title>
      <entry><title>Post</title><link rel="alternate" href="https://a.example/p"/>
        <content type="html">&lt;p&gt;Short body here.&lt;/p&gt;</content>
        <updated>2026-08-01T00:00:00Z</updated></entry></feed>`;
    const parsed = parseFeed(atom);
    expect(parsed.feedTitle).toBe('Atom Blog');
    const atomCards = feedItemsToCards(parsed.items, 'tech', parsed.feedTitle!);
    expect(atomCards).toHaveLength(1);
    expect(atomCards[0]!.body).toBe('Short body here.');
  });
});

describe('splitRssContent', () => {
  it('keeps short content as a single card', () => {
    expect(splitRssContent('<p>Short.</p>')).toEqual(['Short.']);
  });

  it('splits on h2/h3 sections when they are substantial', () => {
    const section = `<p>${'A sentence with several words in it. '.repeat(4)}</p>`;
    const html = `<p>Intro paragraph with enough words to stand alone as a section here.</p><h2>One</h2>${section}<h2>Two</h2>${section}`;
    const parts = splitRssContent(html);
    expect(parts.length).toBeGreaterThanOrEqual(2);
    expect(parts.length).toBeLessThanOrEqual(4);
  });

  it('is conservative when structure is unclear', () => {
    expect(splitRssContent(`<div>${'word '.repeat(400)}</div>`)).toHaveLength(1);
  });
});
