import type { Settings, TopicSourceState, TopicWithState } from '@heal-scroll/core';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { settingsRepo, sources, topicRepo, topicSourceRepo } from '@/composition-root';

const SESSION_SIZES = [3, 5, 7, 10, 15];
const COOLDOWNS = [5, 10, 15, 20, 30, 60];

export default function SettingsScreen() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [topics, setTopics] = useState<TopicWithState[]>([]);
  const [sourceStates, setSourceStates] = useState<TopicSourceState[]>([]);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [settingsData, topicList] = await Promise.all([
      settingsRepo.getSettings(),
      topicRepo.getTopics(),
    ]);
    setSettings(settingsData);
    setTopics(topicList);
    setSourceStates(await topicSourceRepo.getStates(topicList.map((t) => t.id)));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with SQLite on mount; state set in async continuations
    void load();
  }, [load]);

  const update = async (patch: Partial<Settings>) => {
    await settingsRepo.saveSettings(patch);
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const toggleTopic = async (topic: TopicWithState) => {
    await topicRepo.setEnabled(topic.id, !topic.enabled);
    await load();
  };

  const toggleSource = async (topicId: string, sourceId: string, enabled: boolean) => {
    await topicSourceRepo.setEnabled(topicId, sourceId, enabled);
    await load();
  };

  const sourceEnabled = (topicId: string, sourceId: string): boolean =>
    sourceStates.find((s) => s.topicId === topicId && s.sourceId === sourceId)?.enabled ?? true;

  if (!settings) return <View style={styles.screen} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Session</Text>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Cards per session</Text>
        <View style={styles.chips}>
          {SESSION_SIZES.map((n) => (
            <Pressable
              key={n}
              style={[styles.chip, settings.itemsPerSession === n && styles.chipActive]}
              onPress={() => void update({ itemsPerSession: n })}
            >
              <Text style={[styles.chipLabel, settings.itemsPerSession === n && styles.chipLabelActive]}>{n}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Cooldown (minutes)</Text>
        <View style={styles.chips}>
          {COOLDOWNS.map((minutes) => (
            <Pressable
              key={minutes}
              style={[styles.chip, settings.cooldownMinutes === minutes && styles.chipActive]}
              onPress={() => void update({ cooldownMinutes: minutes })}
            >
              <Text style={[styles.chipLabel, settings.cooldownMinutes === minutes && styles.chipLabelActive]}>
                {minutes}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Prefer short cards</Text>
        <Switch
          value={settings.preferShortCards}
          onValueChange={(value) => void update({ preferShortCards: value })}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Discipline stat</Text>
        <Switch
          value={settings.disciplineStatEnabled}
          onValueChange={(value) => void update({ disciplineStatEnabled: value })}
        />
      </View>

      <Text style={styles.heading}>Topics</Text>
      {topics.map((topic) => (
        <View key={topic.id}>
          <View style={styles.row}>
            <Pressable
              style={styles.topicLabelWrap}
              onPress={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
            >
              <Text style={styles.rowLabel}>{topic.name}</Text>
              <Text style={styles.expandHint}>{expandedTopic === topic.id ? 'hide sources' : 'sources'}</Text>
            </Pressable>
            <Switch value={topic.enabled} onValueChange={() => void toggleTopic(topic)} />
          </View>
          {expandedTopic === topic.id
            ? sources
                .filter((source) => source.config.topicIds.includes(topic.id))
                .map((source) => (
                  <View key={source.id} style={[styles.row, styles.subRow]}>
                    <Text style={styles.rowLabel}>{source.name}</Text>
                    <Switch
                      value={sourceEnabled(topic.id, source.id)}
                      onValueChange={(value) => void toggleSource(topic.id, source.id, value)}
                    />
                  </View>
                ))
            : null}
        </View>
      ))}
      <Text style={styles.footnote}>
        NASA APOD uses DEMO_KEY by default; set EXPO_PUBLIC_NASA_API_KEY for a personal key.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f4f5' },
  content: { paddingVertical: 12, paddingBottom: 48 },
  heading: { fontSize: 13, fontWeight: '700', color: '#666', textTransform: 'uppercase', marginHorizontal: 16, marginTop: 20, marginBottom: 6 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 3,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  subRow: { marginLeft: 32, backgroundColor: '#fafafa' },
  rowLabel: { fontSize: 14, color: '#1a1a1a' },
  topicLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  expandHint: { fontSize: 12, color: '#999' },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#ccc' },
  chipActive: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  chipLabel: { fontSize: 13, color: '#333' },
  chipLabelActive: { color: '#fff', fontWeight: '600' },
  footnote: { fontSize: 12, color: '#999', marginHorizontal: 16, marginTop: 16 },
});
