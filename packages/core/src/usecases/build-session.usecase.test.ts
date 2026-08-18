import { describe, expect, it } from 'vitest';
import {
  FakeCardRepo,
  FakeInsights,
  FakeSessionRepo,
  FakeSettingsRepo,
  FakeTopicRepo,
  FakeTopicSourceRepo,
  makeCard,
} from '../testing/fakes';
import { buildSession, WEEKLY_SUMMARY_KEY, type BuildSessionDeps } from './build-session.usecase';

const NOW = new Date('2026-08-18T12:00:00Z');

function makeDeps() {
  const cardRepo = new FakeCardRepo();
  const settingsRepo = new FakeSettingsRepo();
  const sessionRepo = new FakeSessionRepo();
  const topicRepo = new FakeTopicRepo();
  const topicSourceRepo = new FakeTopicSourceRepo();
  const deps: BuildSessionDeps = {
    cardRepo,
    settingsRepo,
    sessionRepo,
    topicRepo,
    topicSourceRepo,
    clock: () => NOW,
    sourceQuality: {},
  };
  return { deps, cardRepo, settingsRepo, sessionRepo, topicRepo };
}

describe('buildSession', () => {
  it('serves n cards from the unseen pool and starts a session record', async () => {
    const { deps, cardRepo, sessionRepo } = makeDeps();
    await cardRepo.upsertCards(
      Array.from({ length: 20 }, (_, i) => makeCard(`c${String(i).padStart(2, '0')}`, { sourceId: `s${i % 5}` })),
    );

    const result = await buildSession(deps);

    expect(result.locked).toBe(false);
    if (result.locked) return;
    expect(result.items).toHaveLength(7);
    expect(result.items.every((i) => i.kind === 'card')).toBe(true);
    expect(sessionRepo.sessions).toHaveLength(1);
  });

  it('returns locked with remaining time during the cooldown and records the attempt', async () => {
    const { deps, sessionRepo } = makeDeps();
    const id = await sessionRepo.startSession(new Date('2026-08-18T11:40:00Z'), 7);
    await sessionRepo.finishSession(id, new Date('2026-08-18T11:55:00Z'), 7);

    const result = await buildSession(deps);

    expect(result).toEqual({ locked: true, remainingMs: 5 * 60_000 });
    expect(sessionRepo.sessions[0]?.respectedCooldown).toBe(false);
  });

  it('falls back to revisit cards when the unseen pool is thin', async () => {
    const { deps, cardRepo } = makeDeps();
    await cardRepo.upsertCards([makeCard('fresh')]);
    cardRepo.revisitCandidates = [makeCard('old1'), makeCard('old2')];

    const result = await buildSession(deps);
    if (result.locked) throw new Error('unexpected lock');

    const revisits = result.items.filter((i) => i.kind === 'card' && i.revisit);
    expect(revisits).toHaveLength(2);
  });

  it('runs the live top-up when the pool is thin and tolerates its failure', async () => {
    const { deps, cardRepo } = makeDeps();
    deps.liveTopUp = async () => {
      await cardRepo.upsertCards(Array.from({ length: 10 }, (_, i) => makeCard(`t${i}`, { sourceId: `s${i % 4}` })));
    };
    const result = await buildSession(deps);
    if (result.locked) throw new Error('unexpected lock');
    expect(result.items).toHaveLength(7);

    const { deps: deps2 } = makeDeps();
    deps2.liveTopUp = () => Promise.reject(new Error('offline'));
    const result2 = await buildSession(deps2);
    expect(result2.locked).toBe(false);
  });

  it('replaces the last slot with a recall card when a candidate exists', async () => {
    const { deps, cardRepo } = makeDeps();
    await cardRepo.upsertCards(
      Array.from({ length: 20 }, (_, i) => makeCard(`c${String(i).padStart(2, '0')}`, { sourceId: `s${i % 5}` })),
    );
    cardRepo.recallCandidates = [makeCard('remember-me')];

    const result = await buildSession(deps);
    if (result.locked) throw new Error('unexpected lock');

    expect(result.items).toHaveLength(7);
    const last = result.items[result.items.length - 1];
    expect(last).toEqual({ kind: 'recall', card: cardRepo.recallCandidates[0] });
  });

  it('prepends the weekly summary once per week when insights are wired', async () => {
    const { deps, cardRepo, settingsRepo } = makeDeps();
    await cardRepo.upsertCards(
      Array.from({ length: 20 }, (_, i) => makeCard(`c${String(i).padStart(2, '0')}`, { sourceId: `s${i % 5}` })),
    );
    const insights = new FakeInsights();
    insights.topicStats = [{ topicId: 'space', seen: 42, saved: 3 }];
    deps.insights = insights;

    const first = await buildSession(deps);
    if (first.locked) throw new Error('unexpected lock');
    expect(first.items[0]?.kind).toBe('summary');
    expect(await settingsRepo.getValue(WEEKLY_SUMMARY_KEY)).toBe(NOW.toISOString());

    const second = await buildSession(deps);
    if (second.locked) throw new Error('unexpected lock');
    expect(second.items[0]?.kind).toBe('card');
  });

  it('returns an empty session when no topics are enabled', async () => {
    const { deps, topicRepo } = makeDeps();
    await topicRepo.setEnabled('space', false);
    const result = await buildSession(deps);
    if (result.locked) throw new Error('unexpected lock');
    expect(result.items).toEqual([]);
  });
});
