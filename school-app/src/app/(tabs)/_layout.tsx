import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useData } from '@/state/DataContext';
import { isDone } from '@/models/types';
import { useTheme } from '@/theme/theme';

const icon = (emoji: string) => ({ focused }: { focused: boolean }) => (
  <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>
);

export default function TabsLayout() {
  const t = useTheme();
  const { tasks } = useData();
  const overdue = tasks.filter((x) => !isDone(x) && x.dueAt && new Date(x.dueAt).getTime() < Date.now()).length;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.textDim,
        tabBarStyle: { backgroundColor: t.card, borderTopColor: t.border, height: 64, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'ראשי', tabBarIcon: icon('🏠') }} />
      <Tabs.Screen
        name="tasks"
        options={{ title: 'משימות', tabBarIcon: icon('📋'), tabBarBadge: overdue || undefined, tabBarBadgeStyle: { backgroundColor: t.danger } }}
      />
      <Tabs.Screen name="grades" options={{ title: 'ציונים', tabBarIcon: icon('🎯') }} />
      <Tabs.Screen name="settings" options={{ title: 'הגדרות', tabBarIcon: icon('⚙️') }} />
    </Tabs>
  );
}
