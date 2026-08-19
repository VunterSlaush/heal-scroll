import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { feedItemsToCards, parseFeed } from '../rss/rss.adapter';
import { cleanMediumCards, MEDIUM_TAGS, mediumAdapter, mediumTag } from './medium.adapter';

const xml = readFileSync(fileURLToPath(new URL('./__fixtures__/medium-space.xml', import.meta.url)), 'utf8');

describe('medium adapter', () => {
  it('covers all default topics and slugs user topics into tags', () => {
    expect(mediumAdapter.id).toBe('medium');
    expect(mediumAdapter.config.dynamicTopics).toBe(true);
    for (const topic of ['space', 'science', 'tech', 'ai', 'history', 'economics', 'markets', 'finance', 'health', 'nutrition', 'longevity', 'mindfulness']) {
      expect(MEDIUM_TAGS[topic]).toBeTruthy();
    }
    expect(mediumTag({ id: 'quantum-computing', name: 'Quantum Computing', query: 'Quantum Computing' })).toBe('quantum-computing');
    expect(mediumTag({ id: 'x', name: 'x', query: '' })).toBeUndefined();
  });

  it('keeps only teasers with a real subtitle, boilerplate stripped', () => {
    const { feedTitle, items } = parseFeed(xml);
    expect(feedTitle).toBe('Space on Medium');
    const raw = feedItemsToCards(items, 'space', feedTitle ?? 'Medium', 'medium');
    const cards = cleanMediumCards(raw);

    // The fixture holds 10 items; only the 4 with a real subtitle
    // (>=120 chars) survive — a cover image alone no longer qualifies.
    expect(raw).toHaveLength(10);
    expect(cards).toHaveLength(4);
    for (const card of cards) {
      expect(card.id).toMatch(/^medium:/);
      expect(card.sourceId).toBe('medium');
      expect(card.body).not.toMatch(/Continue reading/);
      expect(card.body).not.toMatch(/<[^>]+>/);
      expect(card.body.length).toBeGreaterThanOrEqual(120);
    }
  });
});
