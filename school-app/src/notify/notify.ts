import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { isDone, type SyncEvent, type Task } from '@/models/types';
import type { Prefs } from '@/state/prefs';
import { relativeDue } from '@/util/date';

const CH_UPDATES = 'updates';
const CH_DEADLINES = 'deadlines';
const DUE_PREFIX = 'due:';
const DAY_MS = 24 * 60 * 60 * 1000;

export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureNotificationSetup(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CH_UPDATES, {
      name: 'עדכונים (משימות, ציונים, הערות)',
      importance: Notifications.AndroidImportance.HIGH,
    });
    await Notifications.setNotificationChannelAsync(CH_DEADLINES, {
      name: 'תזכורות דדליין',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

function contentFor(e: SyncEvent): Notifications.NotificationContentInput {
  switch (e.kind) {
    case 'newTask':
      return {
        title: `📚 משימה חדשה ב${e.task.courseName}`,
        body: `${e.task.title}\nדדליין: ${relativeDue(e.task.dueAt)}`,
        data: { taskId: e.task.id },
      };
    case 'newGrade':
      return {
        title: `🎯 ציון חדש ב${e.courseName}`,
        body: `${e.title}: ${e.score}${e.maxScore !== 100 ? `/${e.maxScore}` : ''}`,
        data: e.taskId ? { taskId: e.taskId } : {},
      };
    case 'newComment':
      return {
        title: `💬 ${e.courseName}: ${e.title}`,
        body: e.text.slice(0, 200),
        data: e.taskId ? { taskId: e.taskId } : {},
      };
  }
}

export async function notifyEvents(events: SyncEvent[], prefs: Prefs) {
  const allowed = events.filter((e) =>
    e.kind === 'newTask' ? prefs.notifyNewTask : prefs.notifyGrade,
  );
  // הרבה אירועים בבת אחת → התראה מסכמת אחת במקום הצפה
  if (allowed.length > 5) {
    const newTasks = allowed.filter((e) => e.kind === 'newTask').length;
    const other = allowed.length - newTasks;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📚 עדכונים חדשים',
        body: [newTasks && `${newTasks} משימות חדשות`, other && `${other} ציונים/הערות`].filter(Boolean).join(' · '),
      },
      trigger: { channelId: CH_UPDATES },
    });
    return;
  }
  for (const e of allowed) {
    await Notifications.scheduleNotificationAsync({ content: contentFor(e), trigger: { channelId: CH_UPDATES } });
  }
}

/** תזכורת יום לפני דדליין לכל משימה פתוחה. מתוזמנת מחדש אחרי כל סנכרון. */
export async function rescheduleDeadlineReminders(tasks: Task[], prefs: Prefs) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(DUE_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if (!prefs.notifyDeadline) return;
  const now = Date.now();
  for (const t of tasks) {
    if (!t.dueAt || isDone(t)) continue;
    const fireAt = new Date(t.dueAt).getTime() - DAY_MS;
    if (fireAt <= now) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `${DUE_PREFIX}${t.id}`,
      content: {
        title: `⏰ מחר להגיש: ${t.courseName}`,
        body: t.title,
        data: { taskId: t.id },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(fireAt), channelId: CH_DEADLINES },
    });
  }
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
