import type { Card } from '@heal-scroll/core';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface RecallCardProps {
  card: Card;
  onAnswer: (card: Card, remembered: boolean) => void;
}

/** The one quiz-like interaction (PLAN §2d): body hidden until answered. */
export function RecallCard({ card, onAnswer }: RecallCardProps) {
  const [answered, setAnswered] = useState<'remembered' | 'again' | null>(null);

  const answer = (remembered: boolean) => {
    if (answered) return;
    setAnswered(remembered ? 'remembered' : 'again');
    onAnswer(card, remembered);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.prompt}>Do you remember?</Text>
      {card.imageUrl ? (
        <Image source={{ uri: card.imageUrl }} style={styles.image} contentFit="cover" />
      ) : null}
      <Text style={styles.title}>{card.title}</Text>
      {answered ? (
        <>
          <Text style={styles.body}>{card.body}</Text>
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
  card: {
    backgroundColor: '#f0ede4',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    gap: 10,
  },
  prompt: { fontSize: 13, fontWeight: '700', color: '#8a6d1a', textTransform: 'uppercase' },
  image: { width: '100%', height: 140, borderRadius: 12, backgroundColor: '#eee' },
  title: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  body: { fontSize: 15, lineHeight: 22, color: '#333' },
  feedback: { fontSize: 13, color: '#666', fontStyle: 'italic' },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#1a1a1a',
  },
  buttonLabel: { color: '#fff', fontWeight: '600', fontSize: 13 },
  buttonSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#1a1a1a' },
  buttonSecondaryLabel: { color: '#1a1a1a', fontWeight: '600', fontSize: 13 },
});
