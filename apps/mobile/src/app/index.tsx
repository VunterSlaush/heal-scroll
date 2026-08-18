import type { SessionItem } from '@heal-scroll/core';
import { FlashList } from '@shopify/flash-list';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CardItem } from '@/components/card-item';
import { LockedView } from '@/components/locked-view';
import { RecallCard } from '@/components/recall-card';
import { SessionEnd } from '@/components/session-end';
import { useSession } from '@/hooks/use-session';

export default function FeedScreen() {
  const { state, savedIds, votes, reload, endSession, toggleSave, vote, answerRecall } = useSession();

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
        <Text style={styles.errorTitle}>Could not load the feed.</Text>
        <Text style={styles.errorDetail}>{state.message}</Text>
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

  const renderItem = ({ item }: { item: SessionItem }) => {
    if (item.kind === 'summary') {
      return (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>{item.text}</Text>
        </View>
      );
    }
    if (item.kind === 'recall') {
      return <RecallCard card={item.card} onAnswer={(card, remembered) => void answerRecall(card, remembered)} />;
    }
    return (
      <CardItem
        card={item.card}
        revisit={item.revisit}
        saved={savedIds.has(item.card.id)}
        vote={votes[item.card.id] ?? 0}
        onToggleSave={(card) => void toggleSave(card)}
        onVote={(card, direction) => void vote(card, direction)}
      />
    );
  };

  return (
    <View style={styles.screen}>
      <FlashList
        data={state.items}
        keyExtractor={(item) => (item.kind === 'summary' ? 'weekly-summary' : item.card.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.errorTitle}>No cards yet.</Text>
            <Text style={styles.errorDetail}>Check your connection, then retry.</Text>
            <Pressable onPress={() => void reload()} style={styles.primaryButton}>
              <Text style={styles.primaryButtonLabel}>Retry</Text>
            </Pressable>
          </View>
        }
        ListFooterComponent={
          state.items.length > 0 ? (
            <Pressable onPress={() => void endSession()} style={styles.endButton}>
              <Text style={styles.endButtonLabel}>End session</Text>
            </Pressable>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f4f5' },
  list: { paddingVertical: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  errorTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', textAlign: 'center' },
  errorDetail: { fontSize: 13, color: '#666', textAlign: 'center' },
  primaryButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#1a1a1a',
  },
  primaryButtonLabel: { color: '#fff', fontWeight: '600' },
  summaryCard: {
    backgroundColor: '#e8eef2',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
  },
  summaryText: { fontSize: 15, color: '#1a1a1a', lineHeight: 22 },
  endButton: {
    marginHorizontal: 16,
    marginVertical: 24,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
  },
  endButtonLabel: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
