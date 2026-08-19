import type { Card } from '@heal-scroll/core';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface RecallCardProps {
  card: Card;
  topInset?: number;
  onAnswer: (card: Card, remembered: boolean) => void;
}

/** The one quiz-like interaction (PLAN §2d): body hidden until answered. */
export function RecallCard({ card, topInset = 0, onAnswer }: RecallCardProps) {
  const [answered, setAnswered] = useState<'remembered' | 'again' | null>(null);

  const answer = (remembered: boolean) => {
    if (answered) return;
    setAnswered(remembered ? 'remembered' : 'again');
    onAnswer(card, remembered);
  };

  return (
    <View style={[styles.slide, { paddingTop: topInset + 24 }]}>
      <Text style={styles.prompt}>Do you remember?</Text>
      {card.imageUrl ? (
        <Image source={{ uri: card.imageUrl }} style={styles.image} contentFit="cover" />
      ) : null}
      <Text style={styles.title}>{card.title}</Text>
      {answered ? (
        <>
          <Text style={styles.body} numberOfLines={10} ellipsizeMode="tail">
            {card.body}
          </Text>
          <Text style={styles.feedback}>
            {answered === 'remembered' ? 'Nice — it stuck.' : 'Here it is again.'}
          </Text>
        </>
      ) : (
        <View style={styles.buttons}>
          <Pressable style={styles.button} onPress={() => answer(true)}>
            <Text style={styles.buttonLabel}>Yes, I remember</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.buttonSecondary]} onPress={() => answer(false)}>
            <Text style={styles.buttonSecondaryLabel}>Show me again</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  slide: { flex: 1, backgroundColor: '#f0ede4', paddingHorizontal: 28, gap: 16 },
  prompt: { fontSize: 14, fontWeight: '700', color: '#8a6d1a', textTransform: 'uppercase' },
  image: { width: '100%', height: 220, borderRadius: 16, backgroundColor: '#e5e0d2' },
  title: { fontSize: 26, fontWeight: '700', color: '#1a1a1a', lineHeight: 32 },
  body: { fontSize: 17, lineHeight: 26, color: '#333' },
  feedback: { fontSize: 14, color: '#666', fontStyle: 'italic' },
  buttons: { gap: 12, marginTop: 12 },
  button: {
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
  },
  buttonLabel: { color: '#fff', fontWeight: '600', fontSize: 15 },
  buttonSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#1a1a1a' },
  buttonSecondaryLabel: { color: '#1a1a1a', fontWeight: '600', fontSize: 15 },
});
