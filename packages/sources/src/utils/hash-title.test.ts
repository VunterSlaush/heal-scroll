import { describe, expect, it } from 'vitest';
import { hashTitle } from './hash-title';

describe('hashTitle', () => {
  it('is stable and hex-formatted', () => {
    expect(hashTitle('Space')).toMatch(/^[0-9a-f]{8}$/);
    expect(hashTitle('Space')).toBe(hashTitle('Space'));
  });

  it('normalizes case, punctuation and accents', () => {
    expect(hashTitle('Café: Wars!')).toBe(hashTitle('cafe wars'));
    expect(hashTitle('Human presence in space')).toBe(hashTitle('  HUMAN   PRESENCE—in space?! '));
  });

  it('differs for different titles', () => {
    expect(hashTitle('Space')).not.toBe(hashTitle('Spice'));
  });
});
