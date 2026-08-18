import type { Card } from '@heal-scroll/core';
import { Image } from 'expo-image';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

export function CardItem({ card }: { card: Card }) {
  return (
    <View style={styles.card}>
      {card.imageUrl ? (
        <Image source={{ uri: card.imageUrl }} style={styles.image} contentFit="cover" transition={150} />
      ) : null}
      <View style={styles.content}>
        <Text style={styles.title}>{card.title}</Text>
        <Text style={styles.body}>{card.body}</Text>
        <Pressable onPress={() => void Linking.openURL(card.sourceUrl)} hitSlop={8}>
          <Text style={styles.source}>{card.sourceName} ↗</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: '#eee',
  },
  content: {
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  source: {
    fontSize: 13,
    color: '#666',
  },
});
