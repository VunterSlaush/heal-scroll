import { describe, expect, it } from 'vitest';
import type { SessionItem } from '../entities/session';
import { FakeCardRepo, FakeSessionRepo, makeCard } from '../testing/fakes';
import { finishSession } from './finish-session.usecase';

const NOW = new Date('2026-08-18T12:00:00Z');

describe('finishSession', () => {
  it('marks served cards seen, closes the session and builds the calm recap', async () => {
    const cardRepo = new FakeCardRepo();
    const sessionRepo = new FakeSessionRepo();
    const cards = [
      makeCard('a', { topicId: 'space' }),
      makeCard('b', { topicId: 'history' }),
      makeCard('recalled'),
    ];
    await cardRepo.upsertCards(cards);
    await cardRepo.setSaved('b', true, NOW);
    const sessionId = await sessionRepo.startSession(new Date('2026-08-18T11:50:00Z'), 3);

    const items: SessionItem[] = [
      { kind: 'summary', text: 'This week: …' },
      { kind: 'card', card: cards[0]!, revisit: false },
      { kind: 'card', card: cards[1]!, revisit: false },
      { kind: 'recall', card: cards[2]! },
    ];
    const summary = await finishSession({ cardRepo, sessionRepo, clock: () => NOW }, sessionId, items);

    expect(cardRepo.seen.size).toBe(3); // summary card is not an item
    expect(sessionRepo.sessions[0]).toMatchObject({ endedAt: NOW, seenCount: 3, respectedCooldown: true });
    expect(summary).toEqual({
      cardsRead: 2,
      topicIds: ['space', 'history'],
      savedCard: cards[1],
    });
  });
});
