import type { Insights, Settings, TopicBadge } from '@heal-scroll/core';
import { computeInsights, computeTopicBadges } from '@heal-scroll/core';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  clock,
  insightsRepo,
  settingsRepo,
  sourceNames,
  topicRepo,
  topicSourceRepo,
} from '@/composition-root';

const BADGE_LABELS: Record<string, string> = {
  explorer: 'Explorer',
  reader: 'Reader',
  curious: 'Curious',
  nerd: 'Nerd',
};

export default function StatsScreen() {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [badges, setBadges] = useState<TopicBadge[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [topicNames, setTopicNames] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const now = clock();
    const [insightData, badgeData, settingsData, topics] = await Promise.all([
      computeInsights(insightsRepo, now),
      computeTopicBadges(insightsRepo, now),
      settingsRepo.getSettings(),
      topicRepo.getTopics(),
    ]);
    setInsights(insightData);
    setBadges(badgeData);
    setSettings(settingsData);
    setTopicNames(Object.fromEntries(topics.map((t) => [t.id, t.name])));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with SQLite on mount; state set in async continuations
    void load();
  }, [load]);

  const muteSource = async (sourceId: string) => {
    const topics = await topicRepo.getTopics();
    for (const topic of topics) {
      await topicSourceRepo.setEnabled(topic.id, sourceId, false);
    }
    await load();
  };

  if (!insights) return <View style={styles.screen} />;

  const topicName = (id: string) => topicNames[id] ?? id;
  const sourceName = (id: string) => sourceNames[id] ?? id;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Reading profile</Text>
      {insights.last30Days.length === 0 ? (
        <Text style={styles.empty}>Finish a session and your reading profile appears here.</Text>
      ) : (
        insights.last30Days.map((topic) => (
          <View key={topic.topicId} style={styles.row}>
            <Text style={styles.rowLabel}>{topicName(topic.topicId)}</Text>
            <Text style={styles.rowValue}>
              {topic.seen} read · {topic.saved} saved
            </Text>
          </View>
        ))
      )}

      <Text style={styles.heading}>Topic depth</Text>
      {badges.map((badge) => (
        <View key={badge.topicId} style={styles.row}>
          <Text style={styles.rowLabel}>{topicName(badge.topicId)}</Text>
          <Text style={styles.rowValue}>
            {badge.level ? BADGE_LABELS[badge.level] : '—'}
            {badge.next ? `  (${badge.cardsRead}/${badge.next.read} to ${BADGE_LABELS[badge.next.level]})` : ''}
          </Text>
        </View>
      ))}

      <Text style={styles.heading}>Recall</Text>
      {insights.recall.length === 0 ? (
        <Text style={styles.empty}>Save or upvote cards; recall cards appear a few days later.</Text>
      ) : (
        insights.recall.map((topic) => (
          <View key={topic.topicId} style={styles.row}>
            <Text style={styles.rowLabel}>{topicName(topic.topicId)}</Text>
            <Text style={styles.rowValue}>
              {topic.shown === 0 ? '—' : `${Math.round((topic.remembered / topic.shown) * 100)}% remembered`}
            </Text>
          </View>
        ))
      )}

      {insights.series.length > 0 ? (
        <>
          <Text style={styles.heading}>Series completion</Text>
          {insights.series.map((source) => (
            <View key={source.sourceId} style={styles.row}>
              <Text style={styles.rowLabel}>{sourceName(source.sourceId)}</Text>
              <Text style={styles.rowValue}>
                {source.completed}/{source.started} finished
              </Text>
            </View>
          ))}
        </>
      ) : null}

      {insights.votes.length > 0 ? (
        <>
          <Text style={styles.heading}>Sources you vote on</Text>
          {insights.votes.map((source) => (
            <View key={source.sourceId} style={styles.row}>
              <Text style={styles.rowLabel}>{sourceName(source.sourceId)}</Text>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>
                  ▲ {source.up} · ▼ {source.down}
                </Text>
                <Pressable onPress={() => void muteSource(source.sourceId)} hitSlop={8}>
                  <Text style={styles.mute}>Mute</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      ) : null}

      <Text style={styles.heading}>Time honesty</Text>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Sessions (30 days)</Text>
        <Text style={styles.rowValue}>{insights.sessions.sessions}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Average session</Text>
        <Text style={styles.rowValue}>
          {insights.sessions.averageCardsPerSession.toFixed(0)} cards ·{' '}
          {insights.sessions.averageMinutesPerSession.toFixed(1)} min
        </Text>
      </View>
      {settings?.disciplineStatEnabled && insights.sessions.cooldownRespectedRate !== null ? (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Cooldowns respected</Text>
          <Text style={styles.rowValue}>{Math.round(insights.sessions.cooldownRespectedRate * 100)}%</Text>
        </View>
      ) : null}
      <Text style={styles.footnote}>Numbers, not judgments. All computed on this device.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f4f5' },
  content: { paddingVertical: 12, paddingBottom: 48 },
  heading: { fontSize: 13, fontWeight: '700', color: '#666', textTransform: 'uppercase', marginHorizontal: 16, marginTop: 20, marginBottom: 6 },
  empty: { fontSize: 14, color: '#666', marginHorizontal: 16, marginVertical: 4 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 3,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  rowLabel: { fontSize: 14, color: '#1a1a1a', flexShrink: 1 },
  rowValue: { fontSize: 13, color: '#666' },
  rowRight: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  mute: { fontSize: 13, color: '#b00020', fontWeight: '600' },
  footnote: { fontSize: 12, color: '#999', marginHorizontal: 16, marginTop: 16 },
});
