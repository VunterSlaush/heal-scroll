import type { WeeklyStats } from '../entities/insights';
import type { InsightsPort } from '../ports/insights-port';

const WEEK_MS = 7 * 86_400_000;

export function shouldShowWeeklySummary(lastShownAt: Date | undefined, now: Date): boolean {
  if (!lastShownAt) return true;
  return now.getTime() - lastShownAt.getTime() >= WEEK_MS;
}

export async function computeWeeklyStats(port: InsightsPort, now: Date): Promise<WeeklyStats> {
  const [perTopic, perSource, recall, seriesFinished] = await Promise.all([
    port.cardsPerTopic(7, now),
    port.cardsPerSource(7, now),
    port.recallStats(7, now),
    port.seriesFinished(7, now),
  ]);
  const cardsRead = perTopic.reduce((sum, t) => sum + t.seen, 0);
  const topicsCovered = perTopic.filter((t) => t.seen > 0).length;
  const topSource = [...perSource].sort((a, b) => b.seen - a.seen)[0];
  const shown = recall.reduce((sum, t) => sum + t.shown, 0);
  const remembered = recall.reduce((sum, t) => sum + t.remembered, 0);
  const stats: WeeklyStats = {
    cardsRead,
    topicsCovered,
    seriesFinished,
    recallRate: shown > 0 ? remembered / shown : null,
  };
  if (topSource && topSource.seen > 0) stats.topSourceId = topSource.sourceId;
  return stats;
}

/** One calm sentence, no charts, dismissible (PLAN §2e). */
export function buildWeeklySummaryText(stats: WeeklyStats): string {
  const parts = [
    `${stats.cardsRead} card${stats.cardsRead === 1 ? '' : 's'}`,
    `${stats.topicsCovered} topic${stats.topicsCovered === 1 ? '' : 's'}`,
  ];
  if (stats.topSourceId) parts.push(`top source ${stats.topSourceId}`);
  if (stats.seriesFinished > 0) {
    parts.push(`${stats.seriesFinished} series finished`);
  }
  if (stats.recallRate !== null) {
    parts.push(`recall ${Math.round(stats.recallRate * 100)}%`);
  }
  return `This week: ${parts.join(', ')}.`;
}
