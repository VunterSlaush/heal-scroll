import {
  computeInsights,
  exportAsJson,
  exportAsMarkdown,
  type Card,
  type Collection,
  type ExportData,
} from '@heal-scroll/core';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { cardRepo, clock, collectionRepo, insightsRepo } from '@/composition-root';
import { CardItem } from '@/components/card-item';

async function buildExport(): Promise<ExportData> {
  const [savedCards, collections, insights] = await Promise.all([
    cardRepo.getSavedCards(),
    collectionRepo.listCollections(),
    computeInsights(insightsRepo, clock()),
  ]);
  const withCards = await Promise.all(
    collections.map(async (collection) => ({ collection, cards: await collectionRepo.getItems(collection.id) })),
  );
  return { exportedAt: clock().toISOString(), savedCards, collections: withCards, insights };
}

export default function SavedScreen() {
  const [saved, setSaved] = useState<Card[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [expandedCards, setExpandedCards] = useState<Card[]>([]);
  const [collectTarget, setCollectTarget] = useState<Card | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');

  const load = useCallback(async () => {
    const [savedCards, collectionList] = await Promise.all([
      cardRepo.getSavedCards(),
      collectionRepo.listCollections(),
    ]);
    setSaved(savedCards);
    setCollections(collectionList);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with SQLite on focus; state set in async continuations
    void load();
  }, [load]);

  const unsave = async (card: Card) => {
    await cardRepo.setSaved(card.id, false, clock());
    await load();
  };

  const toggleExpand = async (collection: Collection) => {
    if (expanded === collection.id) {
      setExpanded(null);
      return;
    }
    setExpandedCards(await collectionRepo.getItems(collection.id));
    setExpanded(collection.id);
  };

  const addToCollection = async (collectionId: number) => {
    if (!collectTarget) return;
    await collectionRepo.addItem(collectionId, collectTarget.id, clock());
    setCollectTarget(null);
    await load();
  };

  const createAndAdd = async () => {
    const name = newCollectionName.trim();
    if (!name || !collectTarget) return;
    const id = await collectionRepo.createCollection(name, clock());
    setNewCollectionName('');
    await addToCollection(id);
  };

  const exportData = async (format: 'json' | 'markdown') => {
    const data = await buildExport();
    await Share.share({
      message: format === 'json' ? exportAsJson(data) : exportAsMarkdown(data),
    });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {collections.length > 0 ? <Text style={styles.heading}>Collections</Text> : null}
      {collections.map((collection) => (
        <View key={collection.id}>
          <Pressable style={styles.collectionRow} onPress={() => void toggleExpand(collection)}>
            <Text style={styles.collectionName}>{collection.name}</Text>
            <Text style={styles.collectionCount}>{collection.itemCount}</Text>
          </Pressable>
          {expanded === collection.id
            ? expandedCards.map((card) => <CardItem key={card.id} card={card} />)
            : null}
        </View>
      ))}

      <Text style={styles.heading}>Saved cards</Text>
      {saved.length === 0 ? (
        <Text style={styles.empty}>Cards you save in the feed show up here.</Text>
      ) : (
        saved.map((card) => (
          <View key={card.id}>
            <CardItem card={card} />
            <View style={styles.rowActions}>
              <Pressable onPress={() => setCollectTarget(card)} hitSlop={8}>
                <Text style={styles.rowAction}>Add to collection</Text>
              </Pressable>
              <Pressable onPress={() => void unsave(card)} hitSlop={8}>
                <Text style={styles.rowAction}>Remove</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      <Text style={styles.heading}>Your data</Text>
      <View style={styles.exportRow}>
        <Pressable style={styles.exportButton} onPress={() => void exportData('markdown')}>
          <Text style={styles.exportLabel}>Export Markdown</Text>
        </Pressable>
        <Pressable style={styles.exportButton} onPress={() => void exportData('json')}>
          <Text style={styles.exportLabel}>Export JSON</Text>
        </Pressable>
      </View>
      <Text style={styles.footnote}>Everything is local. Nothing leaves the device unless you share it.</Text>

      <Modal visible={collectTarget !== null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add to collection</Text>
            {collections.map((collection) => (
              <Pressable
                key={collection.id}
                style={styles.modalOption}
                onPress={() => void addToCollection(collection.id)}
              >
                <Text style={styles.modalOptionLabel}>{collection.name}</Text>
              </Pressable>
            ))}
            <View style={styles.newCollectionRow}>
              <TextInput
                style={styles.input}
                placeholder="New collection…"
                value={newCollectionName}
                onChangeText={setNewCollectionName}
              />
              <Pressable onPress={() => void createAndAdd()} hitSlop={8}>
                <Text style={styles.rowAction}>Create</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => setCollectTarget(null)} style={styles.modalCancel}>
              <Text style={styles.rowAction}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f4f5' },
  content: { paddingVertical: 12, paddingBottom: 48 },
  heading: { fontSize: 13, fontWeight: '700', color: '#666', textTransform: 'uppercase', marginHorizontal: 16, marginTop: 16, marginBottom: 4 },
  empty: { fontSize: 14, color: '#666', marginHorizontal: 16, marginVertical: 8 },
  collectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 14,
    borderRadius: 12,
  },
  collectionName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  collectionCount: { fontSize: 15, color: '#666' },
  rowActions: { flexDirection: 'row', gap: 20, marginHorizontal: 24, marginTop: -4, marginBottom: 8 },
  rowAction: { fontSize: 13, color: '#666', fontWeight: '600' },
  exportRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16 },
  exportButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: '#1a1a1a' },
  exportLabel: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  footnote: { fontSize: 12, color: '#999', marginHorizontal: 16, marginTop: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 32 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 4 },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  modalOption: { paddingVertical: 10 },
  modalOptionLabel: { fontSize: 15, color: '#1a1a1a' },
  newCollectionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  modalCancel: { marginTop: 12, alignSelf: 'center' },
});
