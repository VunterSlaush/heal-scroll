import { useEffect, useState } from 'react';

/** Remaining "m:ss" until `unlockAt` (epoch ms); returns null once elapsed. */
export function useCountdown(unlockAt: number): string | null {
  const [remainingMs, setRemainingMs] = useState(() => unlockAt - Date.now());

  useEffect(() => {
    const timer = setInterval(() => setRemainingMs(unlockAt - Date.now()), 1000);
    return () => clearInterval(timer);
  }, [unlockAt]);

  if (remainingMs <= 0) return null;
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
