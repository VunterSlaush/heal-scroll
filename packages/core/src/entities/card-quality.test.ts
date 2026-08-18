import { describe, expect, it } from 'vitest';
import { makeCard } from '../testing/fakes';
import { isSubstantialCard } from './card-quality';

const SHORT = '42 points and 7 comments on Hacker News.';
const MEDIUM = 'A caption of moderate length that says something genuinely real about the image shown here.';

describe('isSubstantialCard', () => {
  it('rejects short text-only cards (a full screen needs substance)', () => {
    expect(isSubstantialCard(makeCard('a', { body: SHORT }))).toBe(false);
    expect(isSubstantialCard(makeCard('b'))).toBe(true);
  });

  it('allows shorter bodies when an image carries the slide', () => {
    expect(isSubstantialCard(makeCard('a', { body: MEDIUM, imageUrl: 'https://x.example/i.jpg' }))).toBe(true);
    expect(isSubstantialCard(makeCard('b', { body: 'Too thin.', imageUrl: 'https://x.example/i.jpg' }))).toBe(false);
  });

  it('exempts series members down to the series minimum', () => {
    expect(
      isSubstantialCard(makeCard('a', { body: MEDIUM, seriesId: 's', seriesIndex: 2, seriesCount: 2 })),
    ).toBe(true);
  });
});
