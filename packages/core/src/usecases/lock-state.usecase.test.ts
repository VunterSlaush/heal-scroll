import { describe, expect, it } from 'vitest';
import { getLockState } from './lock-state.usecase';

const NOW = new Date('2026-08-18T12:00:00Z');

describe('getLockState', () => {
  it('is unlocked when no session has finished yet', () => {
    expect(getLockState(NOW, undefined, 10)).toEqual({ locked: false, remainingMs: 0 });
  });

  it('locks during the cooldown with the remaining time', () => {
    const endedAt = new Date('2026-08-18T11:55:00Z');
    expect(getLockState(NOW, endedAt, 10)).toEqual({ locked: true, remainingMs: 5 * 60_000 });
  });

  it('unlocks exactly when the cooldown expires', () => {
    const endedAt = new Date('2026-08-18T11:50:00Z');
    expect(getLockState(NOW, endedAt, 10)).toEqual({ locked: false, remainingMs: 0 });
  });
});
