import type { InteractionEvent, SignalType } from '../entities/taste';

/**
 * Append-only log of taste signals — the replay source for "Rebuild from
 * history", so the profile is always reconstructible.
 */
export interface InteractionLogRepo {
  log(events: InteractionEvent[]): Promise<void>;
  /** Oldest first; `since === undefined` reads from the beginning (rebuild). */
  getEvents(since: Date | undefined, limit?: number): Promise<InteractionEvent[]>;
  countByTypes(types: SignalType[]): Promise<number>;
}
