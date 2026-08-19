import { describe, expect, it } from 'vitest';
import { createUserTopic, DEFAULT_TOPICS } from './topic';

describe('createUserTopic', () => {
  it('slugs hashtags and terms into stable topic ids', () => {
    expect(createUserTopic('#Quantum Computing!')).toEqual({
      id: 'quantum-computing',
      name: 'Quantum Computing!',
      query: 'Quantum Computing!',
    });
    expect(createUserTopic('  F1 ').id).toBe('f1');
    expect(createUserTopic('fútbol español').id).toBe('futbol-espanol');
    expect(createUserTopic('#ai').id).toBe('ai'); // collides with the default on purpose
  });
});

describe('DEFAULT_TOPICS', () => {
  it('every default carries a non-empty search query', () => {
    expect(DEFAULT_TOPICS).toHaveLength(12);
    for (const topic of DEFAULT_TOPICS) {
      expect(topic.query.length).toBeGreaterThan(0);
    }
  });
});
