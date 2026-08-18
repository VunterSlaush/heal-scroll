import type { SessionItem } from '@heal-scroll/core';
import { FlashList } from '@shopify/flash-list';
import { useCallback, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CardItem } from '@/components/card-item';
import { LockedView } from '@/components/locked-view';
import { RecallCard } from '@/components/recall-card';
import { SessionEnd } from '@/components/session-end';
import { useSession } from '@/hooks/use-session';

/** The last page of every session; scrolling onto it ends the session. */
type Page = SessionItem | { kind: 'end' };

export default function FeedScreen() {
  const { state, savedIds, votes, reload, endSession, toggleSave, vote, answerRecall } = useSession();
  const insets = useSafeAreaInsets();
  const [pageHeight, setPageHeight] = useState(0);

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (pageHeight === 0 || state.phase !== 'active') return;
      const index = Math.round(event.nativeEvent.contentOffset.y / pageHeight);
      if (index >= state.items.length) void endSession();
    },
    [pageHeight, state, endSession],
  );

  if (state.phase === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (state.phase === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.messageTitle}>Could not load the feed.</Text>
        <Text style={styles.messageDetail}>{state.message}</Text>
        <Pressable onPress={() => void reload()} style={styles.primaryButton}>
          <Text style={styles.primaryButtonLabel}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (state.phase === 'locked') {
    return <LockedView unlockAt={state.unlockAt} onCooldownOver={() => void reload()} />;
  }

  if (state.phase === 'ended') {
    return (
      <SessionEnd summary={state.summary} unlockAt={state.unlockAt} onCooldownOver={() => void reload()} />
    );
  }

  if (state.items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.messageTitle}>No cards yet.</Text>
        <Text style={styles.messageDetail}>Check your connection, then retry.</Text>
        <Pressable onPress={() => void reload()} style={styles.primaryButton}>
          <Text style={styles.primaryButtonLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const pages: Page[] = [...state.items, { kind: 'end' }];

  const renderPage = (page: Page) => {
    switch (page.kind) {
      case 'end':
        return (
          <View style={styles.endPage}>
            <ActivityIndicator />
            <Text style={styles.messageDetail}>Closing the session…</Text>
          </View>
        );
      case 'summary':
        return (
          <View style={[styles.summaryPage, { paddingTop: insets.top + 24 }]}>
            <Text style={styles.summaryKicker}>Your week</Text>
            <Text style={styles.summaryText}>{page.text}</Text>
            <Text style={styles.swipeHint}>Swipe up for today’s cards</Text>
          </View>
        );
      case 'recall':
        return (
          <RecallCard
            card={page.card}
            topInset={insets.top}
            onAnswer={(card, remembered) => void answerRecall(card, remembered)}
          />
        );
      case 'card':
        return (
          <CardItem
            card={page.card}
            fullScreen
            topInset={insets.top}
            revisit={page.revisit}
            saved={savedIds.has(page.card.id)}
            vote={votes[page.card.id] ?? 0}
            onToggleSave={(card) => void toggleSave(card)}
            onVote={(card, direction) => void vote(card, direction)}
          />
        );
    }
  };

  return (
    <View
      style={styles.screen}
      onLayout={(event) => setPageHeight(Math.round(event.nativeEvent.layout.height))}
    >
      {pageHeight > 0 ? (
        <FlashList
          data={pages}
          keyExtractor={(page) => (page.kind === 'end' ? 'session-end' : page.kind === 'summary' ? 'weekly-summary' : page.card.id)}
          renderItem={({ item }) => <View style={{ height: pageHeight }}>{renderPage(item)}</View>}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumEnd}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8, backgroundColor: '#fff' },
  messageTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', textAlign: 'center' },
  messageDetail: { fontSize: 13, color: '#666', textAlign: 'center' },
  primaryButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#1a1a1a',
  },
  primaryButtonLabel: { color: '#fff', fontWeight: '600' },
  endPage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#fff' },
  summaryPage: { flex: 1, backgroundColor: '#e8eef2', paddingHorizontal: 28, gap: 16 },
  summaryKicker: { fontSize: 13, fontWeight: '700', color: '#5a6b78', textTransform: 'uppercase' },
  summaryText: { fontSize: 24, lineHeight: 34, color: '#1a1a1a', fontWeight: '600' },
  swipeHint: { fontSize: 14, color: '#5a6b78', marginTop: 'auto', marginBottom: 32, textAlign: 'center' },
});
