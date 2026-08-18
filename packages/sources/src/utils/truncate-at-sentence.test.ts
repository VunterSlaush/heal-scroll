import { describe, expect, it } from 'vitest';
import { truncateAtSentence } from './truncate-at-sentence';

describe('truncateAtSentence', () => {
  it('returns short text unchanged (trimmed)', () => {
    expect(truncateAtSentence('  One. Two.  ', 100)).toBe('One. Two.');
  });

  it('cuts at the last full sentence that fits', () => {
    expect(truncateAtSentence('First one. Second one. Third one is long.', 25)).toBe('First one. Second one.');
  });

  it('does not treat decimal points as sentence ends', () => {
    expect(truncateAtSentence('Pi is 3.14159 and more digits follow. Next sentence here.', 45)).toBe(
      'Pi is 3.14159 and more digits follow.',
    );
  });

  it('falls back to a word cut with ellipsis when no sentence fits', () => {
    expect(truncateAtSentence('no sentence boundary anywhere in this text', 20)).toBe('no sentence…');
  });

  it('handles question and exclamation marks', () => {
    expect(truncateAtSentence('Really? Yes! And then some trailing words', 12)).toBe('Really? Yes!');
  });
});
