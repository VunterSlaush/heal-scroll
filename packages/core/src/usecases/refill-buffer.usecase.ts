import { isSubstantialCard } from '../entities/card-quality';
import { isHealthy } from '../entities/topic-source';
import type { CardRepo } from '../ports/card-repo';
import type { Clock } from '../ports/clock';
import type { SettingsRepo } from '../ports/settings-repo';
import type { SourcePort } from '../ports/source-port';
import type { TopicRepo } from '../ports/topic-repo';
import type { TopicSourceRepo } from '../ports/topic-source-repo';

/** Buffer targets from PLAN §2b: keep ≥5 sessions of unseen cards, refill below 3. */
export const BUFFER_TARGET_SESSIONS = 5;
export const BUFFER_REFILL_THRESHOLD_SESSIONS = 3;

export interface RefillBufferDeps {
  cardRepo: CardRepo;
  settingsRepo: SettingsRepo;
  topicRepo: TopicRepo;
  topicSourceRepo: TopicSourceRepo;
  sources: SourcePort[];
  clock: Clock;
}

/**
 * Walks every enabled topic and tops up thin buffers from healthy sources.
 * Every attempt is recorded (fetch_log + health); a source with 3 consecutive
 * failures is skipped until a later success elsewhere resets it.
 */
export async function refillBuffer(deps: RefillBufferDeps): Promise<{ inserted: number }> {
  const settings = await deps.settingsRepo.getSettings();
  const topics = await deps.topicRepo.getEnabledTopics();
  const states = await deps.topicSourceRepo.getStates(topics.map((t) => t.id));
  const stateOf = (topicId: string, sourceId: string) =>
    states.find((s) => s.topicId === topicId && s.sourceId === sourceId);

  const threshold = settings.itemsPerSession * BUFFER_REFILL_THRESHOLD_SESSIONS;
  const target = settings.itemsPerSession * BUFFER_TARGET_SESSIONS;
  let inserted = 0;

  for (const topic of topics) {
    const unseen = await deps.cardRepo.countUnseen([topic.id]);
    if (unseen >= threshold) continue;

    const eligible = deps.sources.filter(
      (source) =>
        source.config.topicIds.includes(topic.id) && isHealthy(stateOf(topic.id, source.id)),
    );
    if (eligible.length === 0) continue;

    const perSource = Math.ceil((target - unseen) / eligible.length);
    for (const source of eligible) {
      const at = deps.clock();
      try {
        const cards = (await source.fetchCards(topic, perSource)).filter(isSubstantialCard);
        const added = await deps.cardRepo.upsertCards(cards);
        inserted += added;
        await deps.topicSourceRepo.recordFetchResult({
          topicId: topic.id,
          sourceId: source.id,
          ok: true,
          cardCount: added,
          at,
        });
      } catch (error) {
        await deps.topicSourceRepo.recordFetchResult({
          topicId: topic.id,
          sourceId: source.id,
          ok: false,
          cardCount: 0,
          error: error instanceof Error ? error.message : String(error),
          at,
        });
      }
    }
  }
  return { inserted };
}
