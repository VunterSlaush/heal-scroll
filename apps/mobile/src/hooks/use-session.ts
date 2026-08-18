import type { Card, SessionItem, SessionSummary } from '@heal-scroll/core';
import { applyVote, buildSession, finishSession, recordRecall } from '@heal-scroll/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildSessionDeps,
  cardRepo,
  clock,
  recallRepo,
  refillBufferInBackground,
  seedInitialData,
  topicRepo,
  topicSourceRepo,
} from '@/composition-root';

export type SessionState =
  | { phase: 'loading' }
  | { phase: 'locked'; unlockAt: number }
  | { phase: 'active'; sessionId: number; items: SessionItem[] }
  | { phase: 'ended'; summary: SessionSummary; unlockAt: number }
  | { phase: 'error'; message: string };

export function useSession() {
  const [state, setState] = useState<SessionState>({ phase: 'loading' });
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [votes, setVotes] = useState<Record<string, -1 | 0 | 1>>({});
  const cooldownRef = useRef(10);

  const load = useCallback(async () => {
    try {
      await seedInitialData();
      void refillBufferInBackground();
      const settings = await buildSessionDeps.settingsRepo.getSettings();
      cooldownRef.current = settings.cooldownMinutes;
      const result = await buildSession(buildSessionDeps);
      if (result.locked) {
        setState({ phase: 'locked', unlockAt: clock().getTime() + result.remainingMs });
        return;
      }
      const saved = await cardRepo.getSavedCards();
      setSavedIds(new Set(saved.map((c) => c.id)));
      setVotes({});
      setState({ phase: 'active', sessionId: result.sessionId, items: result.items });
    } catch (error) {
      setState({ phase: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with SQLite/network on mount; state is set only in async continuations
    void load();
  }, [load]);

  const endSession = useCallback(async () => {
    if (state.phase !== 'active') return;
    const summary = await finishSession(
      { cardRepo, sessionRepo: buildSessionDeps.sessionRepo, clock },
      state.sessionId,
      state.items,
    );
    // The cooldown is free time to prefetch (PLAN §2b).
    void refillBufferInBackground();
    setState({
      phase: 'ended',
      summary,
      unlockAt: clock().getTime() + cooldownRef.current * 60_000,
    });
  }, [state]);

  const toggleSave = useCallback(async (card: Card) => {
    let nowSaved = false;
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(card.id)) next.delete(card.id);
      else {
        next.add(card.id);
        nowSaved = true;
      }
      return next;
    });
    await cardRepo.setSaved(card.id, nowSaved, clock());
  }, []);

  const vote = useCallback(async (card: Card, direction: -1 | 1) => {
    let next: -1 | 0 | 1 = direction;
    setVotes((prev) => {
      next = prev[card.id] === direction ? 0 : direction;
      return { ...prev, [card.id]: next };
    });
    await applyVote({ cardRepo, topicRepo, topicSourceRepo }, card, next);
  }, []);

  const answerRecall = useCallback(async (card: Card, remembered: boolean) => {
    await recordRecall(recallRepo, card.id, remembered, clock());
  }, []);

  return { state, savedIds, votes, reload: load, endSession, toggleSave, vote, answerRecall };
}
