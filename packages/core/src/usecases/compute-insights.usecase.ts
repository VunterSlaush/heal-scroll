import type { Insights } from '../entities/insights';
import type { InsightsPort } from '../ports/insights-port';

export async function computeInsights(port: InsightsPort, now: Date): Promise<Insights> {
  const [last7Days, last30Days, allTime, recall, series, votes, sessions] = await Promise.all([
    port.cardsPerTopic(7, now),
    port.cardsPerTopic(30, now),
    port.cardsPerTopic(null, now),
    port.recallStats(null, now),
    port.seriesCompletion(),
    port.voteProfile(),
    port.sessionStats(30, now),
  ]);
  return { last7Days, last30Days, allTime, recall, series, votes, sessions };
}
