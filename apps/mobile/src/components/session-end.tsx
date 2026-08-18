import type { SessionSummary } from '@heal-scroll/core';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useCountdown } from '@/hooks/use-countdown';

interface SessionEndProps {
  summary: SessionSummary;
  unlockAt: number;
  onCooldownOver: () => void;
}

/** Calm end screen (PLAN §2d): cards read, topics covered, one saved card. */
export function SessionEnd({ summary, unlockAt, onCooldownOver }: SessionEndProps) {
  const remaining = useCountdown(unlockAt);

  useEffect(() => {
    if (remaining === null) onCooldownOver();
  }, [remaining, onCooldownOver]);

  if (remaining === null) return null;

  return (
    <View style={styles.center}>
      <Text style={styles.title}>That’s your session.</Text>
      <Text style={styles.stat}>
        {summary.cardsRead} card{summary.cardsRead === 1 ? '' : 's'} across {summary.topicIds.length}{' '}
        topic{summary.topicIds.length === 1 ? '' : 's'}
      </Text>
      {summary.savedCard ? (
        <Text style={styles.saved}>Saved for later: “{summary.savedCard.title}”</Text>
      ) : null}
      <Text style={styles.countdown}>{remaining}</Text>
      <Text style={styles.hint}>until the next one</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  title: { fontSize: 22, fontWeight: '600', color: '#1a1a1a' },
  stat: { fontSize: 15, color: '#333' },
  saved: { fontSize: 14, color: '#666', fontStyle: 'italic', textAlign: 'center' },
  countdown: { fontSize: 44, fontWeight: '200', color: '#1a1a1a', marginTop: 16, fontVariant: ['tabular-nums'] },
  hint: { fontSize: 13, color: '#999' },
});
