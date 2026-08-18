import { describe, expect, it } from 'vitest';
import {
  FakeCardRepo,
  FakeSettingsRepo,
  FakeTopicRepo,
  FakeTopicSourceRepo,
  fakeSource,
  makeCard,
} from '../testing/fakes';
import { refillBuffer, type RefillBufferDeps } from './refill-buffer.usecase';

const NOW = new Date('2026-08-18T12:00:00Z');

function makeDeps(overrides: Partial<RefillBufferDeps> = {}): RefillBufferDeps & {
  cardRepo: FakeCardRepo;
  topicSourceRepo: FakeTopicSourceRepo;
} {
  return {
    cardRepo: new FakeCardRepo(),
    settingsRepo: new FakeSettingsRepo(),
    topicRepo: new FakeTopicRepo(),
    topicSourceRepo: new FakeTopicSourceRepo(),
    sources: [],
    clock: () => NOW,
    ...overrides,
  } as RefillBufferDeps & { cardRepo: FakeCardRepo; topicSourceRepo: FakeTopicSourceRepo };
}

describe('refillBuffer', () => {
  it('fetches up to the 5-session target when below the 3-session threshold', async () => {
    const deps = makeDeps({
      sources: [
        fakeSource('src', ['space'], (_topic, limit) =>
          Promise.resolve(Array.from({ length: limit }, (_, i) => makeCard(`c${i}`, { sourceId: 'src' }))),
        ),
      ],
    });

    const { inserted } = await refillBuffer(deps);

    // target = 7 × 5 = 35, buffer was empty
    expect(inserted).toBe(35);
    expect(deps.topicSourceRepo.fetchResults).toEqual([
      { topicId: 'space', sourceId: 'src', ok: true, cardCount: 35, at: NOW },
    ]);
  });

  it('skips topics whose buffer is already above the threshold', async () => {
    const cardRepo = new FakeCardRepo();
    await cardRepo.upsertCards(Array.from({ length: 25 }, (_, i) => makeCard(`c${i}`)));
    let called = false;
    const deps = makeDeps({
      cardRepo,
      sources: [
        fakeSource('src', ['space'], () => {
          called = true;
          return Promise.resolve([]);
        }),
      ],
    });

    await refillBuffer(deps);
    expect(called).toBe(false);
  });

  it('records failures and skips sources with 3+ consecutive failures', async () => {
    const failing = fakeSource('flaky', ['space'], () => Promise.reject(new Error('boom')));
    const deps = makeDeps({ sources: [failing] });
    deps.topicSourceRepo.states.push({
      topicId: 'space',
      sourceId: 'dead',
      enabled: true,
      weight: 1,
      consecutiveFailures: 3,
    });
    let deadCalled = false;
    deps.sources.push(
      fakeSource('dead', ['space'], () => {
        deadCalled = true;
        return Promise.resolve([]);
      }),
    );

    await refillBuffer(deps);

    expect(deadCalled).toBe(false);
    expect(deps.topicSourceRepo.fetchResults[0]).toMatchObject({ sourceId: 'flaky', ok: false, error: 'boom' });
    expect(deps.topicSourceRepo.states.find((s) => s.sourceId === 'flaky')?.consecutiveFailures).toBe(1);
  });

  it('filters insubstantial cards before they reach the buffer', async () => {
    const deps = makeDeps({
      sources: [
        fakeSource('thin', ['space'], () =>
          Promise.resolve([
            makeCard('short', { body: '12 points and 3 comments.' }),
            makeCard('fine'),
          ]),
        ),
      ],
    });
    const { inserted } = await refillBuffer(deps);
    expect(inserted).toBe(1);
  });

  it('splits the needed amount across eligible sources', async () => {
    const limits: number[] = [];
    const source = (id: string) =>
      fakeSource(id, ['space'], (_t, limit) => {
        limits.push(limit);
        return Promise.resolve([]);
      });
    await refillBuffer(makeDeps({ sources: [source('a'), source('b')] }));
    expect(limits).toEqual([18, 18]); // ceil(35 / 2)
  });
});
