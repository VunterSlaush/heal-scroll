import { describe, expect, it } from 'vitest';
import { FakeInsights } from '../testing/fakes';
import { computeBadge, computeTopicBadges } from './compute-badges.usecase';

describe('computeBadge', () => {
  it('awards no level below the first threshold and reports the next one', () => {
    const badge = computeBadge('space', 5, 0);
    expect(badge.level).toBeUndefined();
    expect(badge.next).toMatchObject({ level: 'explorer', read: 10 });
  });

  it('requires both read and recall thresholds', () => {
    expect(computeBadge('space', 200, 0).level).toBe('explorer'); // recall gate blocks reader
    expect(computeBadge('space', 45, 4).level).toBe('reader');
    expect(computeBadge('space', 500, 100).level).toBe('nerd');
    expect(computeBadge('space', 500, 100).next).toBeUndefined();
  });
});

describe('computeTopicBadges', () => {
  it('joins reading and recall stats per topic', async () => {
    const insights = new FakeInsights();
    insights.topicStats = [
      { topicId: 'space', seen: 45, saved: 2 },
      { topicId: 'history', seen: 12, saved: 0 },
    ];
    insights.recall = [{ topicId: 'space', shown: 6, remembered: 5 }];

    const badges = await computeTopicBadges(insights, new Date());

    expect(badges).toEqual([
      expect.objectContaining({ topicId: 'space', level: 'reader' }),
      expect.objectContaining({ topicId: 'history', level: 'explorer' }),
    ]);
  });
});
