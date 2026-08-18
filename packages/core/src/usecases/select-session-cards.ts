import type { Card } from '../entities/card';

export interface SelectOptions {
  n: number;
  /** Disables multi-card series; the lead card is used standalone instead. */
  preferShortCards: boolean;
}

const MAX_UNITS_PER_SOURCE = 2;

/** A selection unit: one standalone card or one whole series (PLAN §2c). */
interface Unit {
  cards: Card[];
  sourceId: string;
  topicId: string;
}

function toUnits(ranked: Card[], preferShortCards: boolean): Unit[] {
  const units: Unit[] = [];
  const handledSeries = new Set<string>();
  const bySeries = new Map<string, Card[]>();
  for (const card of ranked) {
    if (card.seriesId) {
      const list = bySeries.get(card.seriesId) ?? [];
      list.push(card);
      bySeries.set(card.seriesId, list);
    }
  }

  for (const card of ranked) {
    if (!card.seriesId) {
      units.push({ cards: [card], sourceId: card.sourceId, topicId: card.topicId });
      continue;
    }
    if (handledSeries.has(card.seriesId)) continue;
    handledSeries.add(card.seriesId);
    const members = [...(bySeries.get(card.seriesId) ?? [card])].sort(
      (a, b) => (a.seriesIndex ?? 0) - (b.seriesIndex ?? 0),
    );
    const complete = card.seriesCount !== undefined && members.length === card.seriesCount;
    if (complete && !preferShortCards) {
      units.push({ cards: members, sourceId: card.sourceId, topicId: card.topicId });
    } else {
      // Partial series or "prefer short cards": the earliest unseen card stands alone.
      const lead = members[0];
      if (lead) units.push({ cards: [lead], sourceId: lead.sourceId, topicId: lead.topicId });
    }
  }
  return units;
}

/**
 * Greedy selection with the PLAN §2 diversity rules: max 2 units per source,
 * no two consecutive units from the same topic (relaxed in a second pass when
 * the pool is too thin), and a series never splits across the lock boundary.
 */
export function selectSessionCards(ranked: Card[], opts: SelectOptions): Card[] {
  if (opts.n <= 0) return [];
  const units = toUnits(ranked, opts.preferShortCards);
  const picked: Unit[] = [];
  const sourceCounts = new Map<string, number>();
  let remaining = opts.n;

  const tryTake = (unit: Unit, enforceTopicAdjacency: boolean): boolean => {
    if (unit.cards.length > remaining) return false;
    if ((sourceCounts.get(unit.sourceId) ?? 0) >= MAX_UNITS_PER_SOURCE) return false;
    const previous = picked[picked.length - 1];
    if (enforceTopicAdjacency && previous && previous.topicId === unit.topicId) return false;
    picked.push(unit);
    sourceCounts.set(unit.sourceId, (sourceCounts.get(unit.sourceId) ?? 0) + 1);
    remaining -= unit.cards.length;
    return true;
  };

  const leftover: Unit[] = [];
  for (const unit of units) {
    if (remaining <= 0) break;
    if (!tryTake(unit, true)) leftover.push(unit);
  }
  for (const unit of leftover) {
    if (remaining <= 0) break;
    tryTake(unit, false);
  }

  return picked.flatMap((unit) => unit.cards);
}
