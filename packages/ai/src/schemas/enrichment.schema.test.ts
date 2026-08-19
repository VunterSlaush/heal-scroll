import { describe, expect, it } from 'vitest';
import {
  recallQuestionSchema,
  sessionRecapSchema,
  topicTagSchema,
  whyInterestingSchema,
} from './enrichment.schema';

describe('enrichment schemas', () => {
  it('accepts well-formed outputs', () => {
    expect(whyInterestingSchema.parse({ why: 'Concrete that heals its own cracks.' })).toBeTruthy();
    expect(
      recallQuestionSchema.parse({ question: 'What sealed Roman concrete?', keyword: 'lime' }),
    ).toBeTruthy();
    expect(topicTagSchema.parse({ topicId: 'history' })).toEqual({ topicId: 'history' });
    expect(sessionRecapSchema.parse({ recap: '7 cards across 4 topics.' })).toBeTruthy();
  });

  it('rejects a why line over 20 words', () => {
    const words = Array.from({ length: 21 }, (_, i) => `w${i}`).join(' ');
    expect(() => whyInterestingSchema.parse({ why: words })).toThrow();
  });

  it('rejects empty or missing fields', () => {
    expect(() => recallQuestionSchema.parse({ question: '', keyword: 'x' })).toThrow();
    expect(() => topicTagSchema.parse({})).toThrow();
  });
});
