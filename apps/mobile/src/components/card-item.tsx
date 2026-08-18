import type { Card } from '@heal-scroll/core';
import { Image } from 'expo-image';
import { Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';

interface CardItemProps {
  card: Card;
  revisit?: boolean;
  saved?: boolean;
  vote?: -1 | 0 | 1;
  onToggleSave?: (card: Card) => void;
  onVote?: (card: Card, direction: -1 | 1) => void;
}

function shareCard(card: Card): void {
  void Share.share({ message: `${card.title}\n\n${card.body}\n\n${card.sourceUrl}` });
}

export function CardItem({ card, revisit, saved, vote, onToggleSave, onVote }: CardItemProps) {
  return (
    <View style={styles.card}>
      {card.imageUrl ? (
        <Image source={{ uri: card.imageUrl }} style={styles.image} contentFit="cover" transition={150} />
      ) : null}
      <View style={styles.content}>
        {revisit ? <Text style={styles.revisitTag}>Worth revisiting</Text> : null}
        {card.seriesIndex && card.seriesCount ? (
          <Text style={styles.seriesTag}>{`${card.seriesIndex}/${card.seriesCount}`}</Text>
        ) : null}
        <Text style={styles.title}>{card.title}</Text>
        <Text style={styles.body}>{card.body}</Text>
        <View style={styles.footer}>
          <Pressable onPress={() => void Linking.openURL(card.sourceUrl)} hitSlop={8}>
            <Text style={styles.source}>{card.sourceName} ↗</Text>
          </Pressable>
          <View style={styles.actions}>
            {onVote ? (
              <>
                <Pressable onPress={() => onVote(card, 1)} hitSlop={8}>
                  <Text style={[styles.action, vote === 1 && styles.actionActive]}>▲</Text>
                </Pressable>
                <Pressable onPress={() => onVote(card, -1)} hitSlop={8}>
                  <Text style={[styles.action, vote === -1 && styles.actionActive]}>▼</Text>
                </Pressable>
              </>
            ) : null}
            <Pressable onPress={() => shareCard(card)} hitSlop={8}>
              <Text style={styles.action}>Share</Text>
            </Pressable>
            {onToggleSave ? (
              <Pressable onPress={() => onToggleSave(card)} hitSlop={8}>
                <Text style={[styles.action, saved && styles.actionActive]}>{saved ? 'Saved' : 'Save'}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
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
  image: { width: '100%', height: 180, backgroundColor: '#eee' },
  content: { padding: 16, gap: 8 },
  revisitTag: { fontSize: 12, color: '#8a6d1a', fontWeight: '600' },
  seriesTag: { fontSize: 12, color: '#666', fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  body: { fontSize: 15, lineHeight: 22, color: '#333' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  source: { fontSize: 13, color: '#666' },
  actions: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  action: { fontSize: 13, color: '#666' },
  actionActive: { color: '#1a1a1a', fontWeight: '700' },
});
