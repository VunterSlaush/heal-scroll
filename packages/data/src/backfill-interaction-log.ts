import type { InteractionEvent } from '@heal-scroll/core';
import { eq, ne, or } from 'drizzle-orm';
import { interactionLog, userItems } from './schema';
import type { Database } from './sqlite-card-repo';

/**
 * One-time backfill for installs that predate the interaction log: synthesizes
 * upvote/downvote/save events from `user_items` so old signals aren't lost on
 * "Rebuild from history". Timestamps are approximate (saved_at ?? seen_at) —
 * good enough for EMA replay. The caller guards this with the
 * `ai.log.backfilled` settings flag; returns the number of events written.
 */
export async function backfillInteractionLogFromUserItems(db: Database): Promise<number> {
  const rows = await db
    .select()
    .from(userItems)
    .where(or(ne(userItems.vote, 0), eq(userItems.saved, true)));
  const events: InteractionEvent[] = [];
  for (const row of rows) {
    const at = row.savedAt ?? row.seenAt;
    if (!at) continue;
    if (row.vote === 1) events.push({ itemId: row.itemId, type: 'upvote', at });
    if (row.vote === -1) events.push({ itemId: row.itemId, type: 'downvote', at });
    if (row.saved) events.push({ itemId: row.itemId, type: 'save', at });
  }
  if (events.length > 0) {
    await db.insert(interactionLog).values(
      events.map((e) => ({ itemId: e.itemId, type: e.type, value: null, at: e.at })),
    );
  }
  return events.length;
}
