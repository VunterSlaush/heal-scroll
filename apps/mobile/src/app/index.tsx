import { FlashList } from '@shopify/flash-list';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CardItem } from '@/components/card-item';
import { useFeed } from '@/hooks/use-feed';

export default function FeedScreen() {
  const { cards, status, error, reload } = useFeed();

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Could not load the feed.</Text>
        <Text style={styles.errorDetail}>{error}</Text>
        <Pressable onPress={reload} style={styles.retryButton}>
          <Text style={styles.retryLabel}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlashList
        data={cards}
        keyExtractor={(card) => card.id}
        renderItem={({ item }) => <CardItem card={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.errorText}>No cards yet — check your connection and retry.</Text>
            <Pressable onPress={reload} style={styles.retryButton}>
              <Text style={styles.retryLabel}>Retry</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  list: {
    paddingVertical: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  errorDetail: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#1a1a1a',
  },
  retryLabel: {
    color: '#fff',
    fontWeight: '600',
  },
});
