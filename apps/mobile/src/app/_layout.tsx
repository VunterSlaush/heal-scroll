import Ionicons from '@expo/vector-icons/Ionicons';
import migrations from '@heal-scroll/data/migrations';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ComponentProps } from 'react';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { registerBackgroundRefill } from '@/background/background-refill';
import { db } from '@/composition-root';

type PressableProps = ComponentProps<typeof Pressable>;

/** Plain Pressable with opacity feedback — no Android ripple circle. */
function TabButton({ style, ...rest }: PressableProps) {
  return (
    <Pressable
      {...rest}
      style={({ pressed }) => [style as object, pressed && styles.tabPressed]}
    />
  );
}

/** Maps react-navigation's button props onto a ripple-free Pressable. */
const renderTabButton: ComponentProps<typeof Tabs>['screenOptions'] = {
  tabBarActiveTintColor: '#1a1a1a',
  tabBarButton: ({ children, style, onPress, onLongPress, accessibilityState, accessibilityLabel, testID }) => (
    <TabButton
      style={style as PressableProps['style']}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {children}
    </TabButton>
  ),
};

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
      <Tabs screenOptions={renderTabButton}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Feed',
            headerShown: false,
            tabBarIcon: ({ color, size }) => <Ionicons name="albums-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="saved"
          options={{
            title: 'Saved',
            tabBarIcon: ({ color, size }) => <Ionicons name="bookmark-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: 'Stats',
            tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: '#b00020', textAlign: 'center' },
  tabPressed: { opacity: 0.55 },
});
