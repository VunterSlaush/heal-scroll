import migrations from '@heal-scroll/data/migrations';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { registerBackgroundRefill } from '@/background/background-refill';
import { db } from '@/composition-root';

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    if (success) void registerBackgroundRefill();
  }, [success]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Database migration failed: {error.message}</Text>
      </View>
    );
  }
  if (!success) {
    return <View style={styles.center} />;
  }

  return (
    <>
      <StatusBar style="auto" />
      <Tabs screenOptions={{ tabBarActiveTintColor: '#1a1a1a' }}>
        <Tabs.Screen name="index" options={{ title: 'Feed', tabBarIcon: () => null }} />
        <Tabs.Screen name="saved" options={{ title: 'Saved', tabBarIcon: () => null }} />
        <Tabs.Screen name="stats" options={{ title: 'Stats', tabBarIcon: () => null }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: () => null }} />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: '#b00020', textAlign: 'center' },
});
