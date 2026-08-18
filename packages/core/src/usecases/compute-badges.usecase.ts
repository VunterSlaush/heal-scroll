import { BADGE_LEVELS, type TopicBadge } from '../entities/badge';
import type { InsightsPort } from '../ports/insights-port';

export function computeBadge(topicId: string, cardsRead: number, recallSuccesses: number): TopicBadge {
  const badge: TopicBadge = { topicId, cardsRead, recallSuccesses };
  for (const level of BADGE_LEVELS) {
    if (cardsRead >= level.read && recallSuccesses >= level.recalled) {
      badge.level = level.level;
    } else {
      badge.next = level;
      break;
    }
  }
  return badge;
}

/** Per-topic depth badges from cumulative reads + recall successes (PLAN §2d). */
export async function computeTopicBadges(port: InsightsPort, now: Date): Promise<TopicBadge[]> {
  const [reading, recall] = await Promise.all([
    port.cardsPerTopic(null, now),
    port.recallStats(null, now),
  ]);
  const recallByTopic = new Map(recall.map((r) => [r.topicId, r.remembered]));
  return reading.map((topic) =>
    computeBadge(topic.topicId, topic.seen, recallByTopic.get(topic.topicId) ?? 0),
  );
}
