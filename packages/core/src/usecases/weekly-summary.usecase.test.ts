import { describe, expect, it } from 'vitest';
import { FakeInsights } from '../testing/fakes';
import {
  buildWeeklySummaryText,
  computeWeeklyStats,
  shouldShowWeeklySummary,
} from './weekly-summary.usecase';

const NOW = new Date('2026-08-18T12:00:00Z');

describe('shouldShowWeeklySummary', () => {
  it('shows on first ever session, then at most weekly', () => {
    expect(shouldShowWeeklySummary(undefined, NOW)).toBe(true);
    expect(shouldShowWeeklySummary(new Date('2026-08-15T12:00:00Z'), NOW)).toBe(false);
    expect(shouldShowWeeklySummary(new Date('2026-08-11T12:00:00Z'), NOW)).toBe(true);
  });
});

describe('computeWeeklyStats + buildWeeklySummaryText', () => {
  it('assembles the one-line summary from the insight queries', async () => {
    const insights = new FakeInsights();
    insights.topicStats = [
      { topicId: 'space', seen: 30, saved: 4 },
      { topicId: 'history', seen: 12, saved: 1 },
      { topicId: 'muted', seen: 0, saved: 0 },
    ];
    insights.sourceCounts = [
      { sourceId: 'arxiv', seen: 20 },
      { sourceId: 'wikipedia', seen: 15 },
    ];
    insights.recall = [{ topicId: 'space', shown: 9, remembered: 7 }];
    insights.finishedSeries = 3;

    const stats = await computeWeeklyStats(insights, NOW);
    expect(stats).toEqual({
      cardsRead: 42,
      topicsCovered: 2,
      topSourceId: 'arxiv',
      seriesFinished: 3,
      recallRate: 7 / 9,
    });
    expect(buildWeeklySummaryText(stats)).toBe(
      'This week: 42 cards, 2 topics, top source arxiv, 3 series finished, recall 78%.',
    );
  });

  it('omits empty segments instead of showing zeros', async () => {
    const stats = await computeWeeklyStats(new FakeInsights(), NOW);
    expect(buildWeeklySummaryText(stats)).toBe('This week: 0 cards, 0 topics.');
  });
});
