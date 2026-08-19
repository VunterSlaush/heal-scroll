import Ionicons from '@expo/vector-icons/Ionicons';
import type { Card } from '@heal-scroll/core';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';

const BODY_LINE_HEIGHT = 26;

interface CardItemProps {
  card: Card;
  /** Full-screen slide (feed) vs compact row (saved/collections). */
  fullScreen?: boolean;
  topInset?: number;
  /** Display name of the card's topic, shown as a hashtag chip. */
  topicLabel?: string;
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
  topicLabel,
  revisit,
  saved,
  vote,
  onToggleSave,
  onVote,
}: CardItemProps) {
  // The body gets whatever space is left between title and footer; measuring it
  // lets the text end on a clean ellipsis instead of bleeding past the page.
  const [bodyLines, setBodyLines] = useState<number | undefined>(undefined);

  const iconSize = fullScreen ? 24 : 18;
  const idleColor = '#666';
  const activeColor = '#1a1a1a';

  const actions = (
    <View style={styles.footer}>
      {topicLabel ? (
        <View style={styles.topicChip}>
          <Text style={styles.topicChipLabel} numberOfLines={1}>
            #{topicLabel}
          </Text>
        </View>
      ) : (
        <View />
      )}
      <View style={styles.actions}>
        <Pressable onPress={() => void Linking.openURL(card.sourceUrl)} hitSlop={10}>
          <Ionicons name="open-outline" size={iconSize} color={idleColor} />
        </Pressable>
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
        <View
          style={styles.bodyWrap}
          onLayout={(event) =>
            setBodyLines(Math.max(2, Math.floor(event.nativeEvent.layout.height / BODY_LINE_HEIGHT)))
          }
        >
          <Text style={styles.slideBody} numberOfLines={bodyLines} ellipsizeMode="tail">
            {card.body}
          </Text>
        </View>
        {actions}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Full-screen slide
  slide: { flex: 1, backgroundColor: '#fff', overflow: 'hidden' },
  slideImage: { width: '100%', height: '42%', backgroundColor: '#e8e8e8' },
  slideContent: { flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 18, gap: 12 },
  slideTitle: { fontSize: 26, fontWeight: '700', color: '#1a1a1a', lineHeight: 32 },
  bodyWrap: { flex: 1, overflow: 'hidden' },
  slideBody: { fontSize: 17, lineHeight: BODY_LINE_HEIGHT, color: '#333' },
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
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, gap: 12 },
  topicChip: {
    backgroundColor: '#eef1f4',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    flexShrink: 1,
  },
  topicChipLabel: { fontSize: 13, color: '#44515c', fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 22, alignItems: 'center' },
});
