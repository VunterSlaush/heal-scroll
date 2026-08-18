import migrations from '@heal-scroll/data/migrations';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { db } from '@/composition-root';

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);

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
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Feed' }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: '#b00020',
    textAlign: 'center',
  },
});
