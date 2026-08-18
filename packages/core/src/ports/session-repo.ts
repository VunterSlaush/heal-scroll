import type { SessionRecord } from '../entities/session';

export interface SessionRepo {
  startSession(at: Date, plannedCount: number): Promise<number>;
  /** Closes the session; the cooldown counts as respected until an attempt is recorded. */
  finishSession(sessionId: number, at: Date, seenCount: number): Promise<void>;
  /** The user tried to open a session during this session's cooldown (discipline stat). */
  markCooldownAttempt(sessionId: number): Promise<void>;
  getLastFinished(): Promise<SessionRecord | undefined>;
}
