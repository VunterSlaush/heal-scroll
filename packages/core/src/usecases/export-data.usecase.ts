import type { Card } from '../entities/card';
import type { Collection } from '../entities/collection';
import type { Insights } from '../entities/insights';

/** Everything the user owns, exportable as JSON or Markdown (PLAN §2e). */
export interface ExportData {
  exportedAt: string;
  savedCards: Card[];
  collections: Array<{ collection: Collection; cards: Card[] }>;
  insights: Insights;
}

export function exportAsJson(data: ExportData): string {
  return JSON.stringify(data, null, 2);
}

export function exportAsMarkdown(data: ExportData): string {
  const lines: string[] = [`# heal-scroll export`, ``, `Exported ${data.exportedAt}`, ``];

  lines.push(`## Saved cards (${data.savedCards.length})`, ``);
  for (const card of data.savedCards) {
    lines.push(`### ${card.title}`, ``, card.body, ``, `[${card.sourceName}](${card.sourceUrl})`, ``);
  }

  for (const { collection, cards } of data.collections) {
    lines.push(`## Collection: ${collection.name} (${cards.length})`, ``);
    for (const card of cards) {
      lines.push(`- [${card.title}](${card.sourceUrl}) — ${card.sourceName}`);
    }
    lines.push(``);
  }

  lines.push(`## Reading profile (all time)`, ``);
  for (const topic of data.insights.allTime) {
    lines.push(`- ${topic.topicId}: ${topic.seen} read, ${topic.saved} saved`);
  }
  return lines.join('\n');
}
