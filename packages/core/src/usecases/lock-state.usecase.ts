export interface LockState {
  locked: boolean;
  remainingMs: number;
}

/** Soft lock after a finished session (PLAN §1): locked until endedAt + cooldown. */
export function getLockState(
  now: Date,
  lastSessionEndedAt: Date | undefined,
  cooldownMinutes: number,
): LockState {
  if (!lastSessionEndedAt) return { locked: false, remainingMs: 0 };
  const unlockAt = lastSessionEndedAt.getTime() + cooldownMinutes * 60_000;
  const remainingMs = unlockAt - now.getTime();
  if (remainingMs <= 0) return { locked: false, remainingMs: 0 };
  return { locked: true, remainingMs };
}
