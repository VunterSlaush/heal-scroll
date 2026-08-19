import { describe, expect, it } from 'vitest';
import { ONBOARDING_EXEMPLARS, pickOnboardingSet } from './exemplars';

describe('onboarding exemplars', () => {
  it('ships at least 9 unique exemplars spanning several topics', () => {
    expect(ONBOARDING_EXEMPLARS.length).toBeGreaterThanOrEqual(9);
    expect(new Set(ONBOARDING_EXEMPLARS.map((e) => e.id)).size).toBe(ONBOARDING_EXEMPLARS.length);
    expect(new Set(ONBOARDING_EXEMPLARS.map((e) => e.topicId)).size).toBeGreaterThanOrEqual(5);
  });

  it('pickOnboardingSet is deterministic per seed and always returns 9', () => {
    expect(pickOnboardingSet(3)).toEqual(pickOnboardingSet(3));
    expect(pickOnboardingSet(0)).toHaveLength(9);
    expect(pickOnboardingSet(4)).toHaveLength(9);
    expect(pickOnboardingSet(4)).not.toEqual(pickOnboardingSet(0));
  });
});
