import type { Card } from '@heal-scroll/core';
import { buildSession } from '@heal-scroll/core';
import { useCallback, useEffect, useState } from 'react';
import { cardRepo, seedInitialData, SPACE_TOPIC, topUpTopic } from '@/composition-root';

const SESSION_SIZE = 7;
const TOP_UP_FETCH_SIZE = 20;

type FeedStatus = 'loading' | 'ready' | 'error';

export function useFeed() {
  const [cards, setCards] = useState<Card[]>([]);
  const [status, setStatus] = useState<FeedStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      await seedInitialData();
      let session = await buildSession(cardRepo, [SPACE_TOPIC.id], SESSION_SIZE);
      if (session.length < SESSION_SIZE) {
        try {
          await topUpTopic(SPACE_TOPIC, TOP_UP_FETCH_SIZE);
          session = await buildSession(cardRepo, [SPACE_TOPIC.id], SESSION_SIZE);
        } catch (fetchError) {
          // Offline is fine as long as the cache has something to show.
          if (session.length === 0) throw fetchError;
        }
      }
      setCards(session);
      setStatus('ready');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
      setStatus('error');
    }
  }, []);

  const reload = useCallback(() => {
    setStatus('loading');
    setError(null);
    void load();
  }, [load]);

  useEffect(() => {
    // Legitimate effect: sync with an external system (SQLite + network) on
    // mount; state is only set in async continuations, never synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return { cards, status, error, reload };
}
