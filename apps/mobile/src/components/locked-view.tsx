import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useCountdown } from '@/hooks/use-countdown';

interface LockedViewProps {
  unlockAt: number;
  onCooldownOver: () => void;
}

/** Calm lock screen: a countdown, no pressure, no "one more" buttons. */
export function LockedView({ unlockAt, onCooldownOver }: LockedViewProps) {
  const remaining = useCountdown(unlockAt);

  useEffect(() => {
    if (remaining === null) onCooldownOver();
  }, [remaining, onCooldownOver]);

  if (remaining === null) return null;

  return (
    <View style={styles.center}>
      <Text style={styles.title}>Session complete</Text>
      <Text style={styles.countdown}>{remaining}</Text>
      <Text style={styles.hint}>The feed reopens when the countdown ends.{'\n'}A good moment to look away.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  title: { fontSize: 20, fontWeight: '600', color: '#1a1a1a' },
  countdown: { fontSize: 56, fontWeight: '200', color: '#1a1a1a', fontVariant: ['tabular-nums'] },
  hint: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
});
