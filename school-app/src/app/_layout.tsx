import '@/sync/background'; // מגדיר את משימת הרקע ב-scope הגלובלי
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { configureNotifications, ensureNotificationSetup } from '@/notify/notify';
import { getPrefs } from '@/state/prefs';
import { DataProvider } from '@/state/DataContext';
import { setBackgroundSync } from '@/sync/background';
import { useTheme } from '@/theme/theme';

configureNotifications();

export default function RootLayout() {
  const t = useTheme();
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    (async () => {
      await ensureNotificationSetup();
      const prefs = await getPrefs();
      await setBackgroundSync(prefs.backgroundSync).catch(() => {});
    })();
  }, []);

  // לחיצה על התראה → פתיחת המשימה
  useEffect(() => {
    const taskId = lastResponse?.notification.request.content.data?.taskId;
    if (typeof taskId === 'string') router.push({ pathname: '/task/[id]', params: { id: taskId } });
  }, [lastResponse]);

  return (
    <SafeAreaProvider>
      <DataProvider>
        <StatusBar style={t.dark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: t.bg },
            headerTintColor: t.text,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: t.bg },
            headerTitleStyle: { fontWeight: '700' },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="task/[id]" options={{ title: 'משימה' }} />
          <Stack.Screen name="help/[id]" options={{ title: 'עזרה במשימה' }} />
          <Stack.Screen name="login/amit" options={{ title: 'חיבור לאמי"ת' }} />
        </Stack>
      </DataProvider>
    </SafeAreaProvider>
  );
}
