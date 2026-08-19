import Ionicons from '@expo/vector-icons/Ionicons';
import Slider from '@react-native-community/slider';
import type { Settings, TopicWithState } from '@heal-scroll/core';
import { createUserTopic, SESSION_SIZE_LIMITS } from '@heal-scroll/core';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { cardRepo, settingsRepo, sources, topicRepo } from '@/composition-root';

const COOLDOWNS = [5, 10, 15, 20, 30, 60];
const LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
];

export default function SettingsScreen() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [topics, setTopics] = useState<TopicWithState[]>([]);
  const [sessionSizePreview, setSessionSizePreview] = useState<number | null>(null);
  const [newTopicTerm, setNewTopicTerm] = useState('');

  const load = useCallback(async () => {
    const [settingsData, topicList] = await Promise.all([
      settingsRepo.getSettings(),
      topicRepo.getTopics(),
    ]);
    setSettings(settingsData);
    setTopics(topicList);
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

  const addTopic = async () => {
    const topic = createUserTopic(newTopicTerm);
    if (!topic.id) return;
    await topicRepo.upsertTopics([topic]);
    setNewTopicTerm('');
    await load();
  };

  const removeTopic = async (topicId: string) => {
    await topicRepo.deleteTopic(topicId);
    await cardRepo.purgeTopicCards(topicId);
    await load();
  };

  // A source serves items across topics, so muting a source is global.
  const toggleSource = async (sourceId: string, enabled: boolean) => {
    if (!settings) return;
    const disabledSources = enabled
      ? settings.disabledSources.filter((id) => id !== sourceId)
      : [...new Set([...settings.disabledSources, sourceId])];
    await update({ disabledSources });
  };

  if (!settings) return <View style={styles.screen} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Session</Text>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Cards per session</Text>
        <Text style={styles.sliderValue}>{sessionSizePreview ?? settings.itemsPerSession}</Text>
        <Slider
          style={styles.slider}
          minimumValue={SESSION_SIZE_LIMITS.min}
          maximumValue={SESSION_SIZE_LIMITS.max}
          step={1}
          value={settings.itemsPerSession}
          minimumTrackTintColor="#1a1a1a"
          maximumTrackTintColor="#d4d4d4"
          thumbTintColor="#1a1a1a"
          onValueChange={(value) => setSessionSizePreview(Math.round(value))}
          onSlidingComplete={(value) => {
            setSessionSizePreview(null);
            void update({ itemsPerSession: Math.round(value) });
          }}
        />
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
        <Text style={styles.rowLabel}>Content language</Text>
        <View style={styles.chips}>
          {LANGUAGES.map(({ code, label }) => (
            <Pressable
              key={code}
              style={[styles.chip, settings.language === code && styles.chipActive]}
              onPress={() => void update({ language: code })}
            >
              <Text style={[styles.chipLabel, settings.language === code && styles.chipLabelActive]}>{label}</Text>
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
      <View style={styles.row}>
        <TextInput
          style={styles.topicInput}
          placeholder="Add a topic or #hashtag…"
          placeholderTextColor="#999"
          value={newTopicTerm}
          onChangeText={setNewTopicTerm}
          onSubmitEditing={() => void addTopic()}
          returnKeyType="done"
        />
        <Pressable
          style={[styles.addButton, !newTopicTerm.trim() && styles.addButtonDisabled]}
          onPress={() => void addTopic()}
          disabled={!newTopicTerm.trim()}
        >
          <Text style={styles.addButtonLabel}>Add</Text>
        </Pressable>
      </View>
      {topics.map((topic) => (
        <View key={topic.id} style={styles.row}>
          <Text style={[styles.rowLabel, styles.topicLabelWrap]}>{topic.name}</Text>
          <View style={styles.topicControls}>
            <Switch value={topic.enabled} onValueChange={() => void toggleTopic(topic)} />
            <Pressable onPress={() => void removeTopic(topic.id)} hitSlop={10}>
              <Ionicons name="trash-outline" size={18} color="#b00020" />
            </Pressable>
          </View>
        </View>
      ))}

      <Text style={styles.heading}>Sources</Text>
      {sources.map((source) => (
        <View key={source.id} style={styles.row}>
          <Text style={styles.rowLabel}>{source.name}</Text>
          <Switch
            value={!settings.disabledSources.includes(source.id)}
            onValueChange={(value) => void toggleSource(source.id, value)}
          />
        </View>
      ))}
      <Text style={styles.footnote}>
        Sources apply across every topic. NASA APOD uses DEMO_KEY by default; set
        EXPO_PUBLIC_NASA_API_KEY for a personal key.
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
  rowLabel: { fontSize: 14, color: '#1a1a1a' },
  topicLabelWrap: { flexShrink: 1 },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  topicInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1a1a1a',
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#1a1a1a',
  },
  addButtonDisabled: { opacity: 0.35 },
  addButtonLabel: { color: '#fff', fontWeight: '600', fontSize: 13 },
  topicControls: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  slider: { width: '100%', height: 36 },
  sliderValue: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', fontVariant: ['tabular-nums'] },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#ccc' },
  chipActive: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  chipLabel: { fontSize: 13, color: '#333' },
  chipLabelActive: { color: '#fff', fontWeight: '600' },
  footnote: { fontSize: 12, color: '#999', marginHorizontal: 16, marginTop: 16 },
});
