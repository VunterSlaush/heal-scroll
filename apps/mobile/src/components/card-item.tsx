import Ionicons from '@expo/vector-icons/Ionicons';
import type { Card } from '@heal-scroll/core';
import { Image } from 'expo-image';
import { Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';

interface CardItemProps {
  card: Card;
  /** Full-screen slide (feed) vs compact row (saved/collections). */
  fullScreen?: boolean;
  topInset?: number;
  revisit?: boolean;
  saved?: boolean;
  vote?: -1 | 0 | 1;
  onToggleSave?: (card: Card) => void;
  onVote?: (card: Card, direction: -1 | 1) => void;
}

function shareCard(card: Card): void {
  void Share.share({ message: `${card.title}\n\n${card.body}\n\n${card.sourceUrl}` });
}

export function CardItem({
  card,
  fullScreen = false,
  topInset = 0,
  revisit,
  saved,
  vote,
  onToggleSave,
  onVote,
}: CardItemProps) {
  const iconSize = fullScreen ? 24 : 18;
  const idleColor = '#666';
  const activeColor = '#1a1a1a';

  const actions = (
    <View style={styles.footer}>
      <Pressable onPress={() => void Linking.openURL(card.sourceUrl)} hitSlop={8} style={styles.sourceLink}>
        <Text style={[styles.source, fullScreen && styles.sourceBig]}>{card.sourceName}</Text>
        <Ionicons name="open-outline" size={iconSize - 6} color={idleColor} />
      </Pressable>
      <View style={styles.actions}>
        {onVote ? (
          <>
            <Pressable onPress={() => onVote(card, 1)} hitSlop={10}>
              <Ionicons
                name={vote === 1 ? 'thumbs-up' : 'thumbs-up-outline'}
                size={iconSize}
                color={vote === 1 ? activeColor : idleColor}
              />
            </Pressable>
            <Pressable onPress={() => onVote(card, -1)} hitSlop={10}>
              <Ionicons
                name={vote === -1 ? 'thumbs-down' : 'thumbs-down-outline'}
                size={iconSize}
                color={vote === -1 ? activeColor : idleColor}
              />
            </Pressable>
          </>
        ) : null}
        <Pressable onPress={() => shareCard(card)} hitSlop={10}>
          <Ionicons name="share-social-outline" size={iconSize} color={idleColor} />
        </Pressable>
        {onToggleSave ? (
          <Pressable onPress={() => onToggleSave(card)} hitSlop={10}>
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={iconSize}
              color={saved ? activeColor : idleColor}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const tags = (
    <>
      {revisit ? <Text style={styles.revisitTag}>Worth revisiting</Text> : null}
      {card.seriesIndex && card.seriesCount ? (
        <Text style={styles.seriesTag}>{`${card.seriesIndex}/${card.seriesCount}`}</Text>
      ) : null}
    </>
  );

  if (!fullScreen) {
    return (
      <View style={styles.compactCard}>
        {card.imageUrl ? (
          <Image source={{ uri: card.imageUrl }} style={styles.compactImage} contentFit="cover" transition={150} />
        ) : null}
        <View style={styles.compactContent}>
          {tags}
          <Text style={styles.compactTitle}>{card.title}</Text>
          <Text style={styles.compactBody}>{card.body}</Text>
          {actions}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.slide}>
      {card.imageUrl ? (
        <Image source={{ uri: card.imageUrl }} style={styles.slideImage} contentFit="cover" transition={200} />
      ) : (
        <View style={{ height: topInset + 12 }} />
      )}
      <View style={styles.slideContent}>
        {tags}
        <Text style={styles.slideTitle}>{card.title}</Text>
        <Text style={styles.slideBody}>{card.body}</Text>
        <View style={styles.spacer} />
        {actions}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Full-screen slide
  slide: { flex: 1, backgroundColor: '#fff' },
  slideImage: { width: '100%', height: '42%', backgroundColor: '#e8e8e8' },
  slideContent: { flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 18, gap: 12 },
  slideTitle: { fontSize: 26, fontWeight: '700', color: '#1a1a1a', lineHeight: 32 },
  slideBody: { fontSize: 17, lineHeight: 26, color: '#333' },
  spacer: { flex: 1 },
  // Compact row (saved list)
  compactCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  compactImage: { width: '100%', height: 160, backgroundColor: '#eee' },
  compactContent: { padding: 16, gap: 8 },
  compactTitle: { fontSize: 17, fontWeight: '600', color: '#1a1a1a' },
  compactBody: { fontSize: 14, lineHeight: 21, color: '#333' },
  // Shared
  revisitTag: { fontSize: 12, color: '#8a6d1a', fontWeight: '600' },
  seriesTag: { fontSize: 12, color: '#666', fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sourceLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  source: { fontSize: 13, color: '#666' },
  sourceBig: { fontSize: 15 },
  actions: { flexDirection: 'row', gap: 22, alignItems: 'center' },
});
