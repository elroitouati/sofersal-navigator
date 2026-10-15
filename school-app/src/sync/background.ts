// סנכרון ברקע כל ~30 דקות דרך WorkManager (expo-background-task).
// אנדרואיד קובע את הזמן המדויק: המינימום 15 דקות, ובמצב חיסכון בסוללה זה יכול להתארך.
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { runSync } from './engine';

export const BACKGROUND_SYNC = 'school-background-sync';

// חייב להיות מוגדר ב-scope הגלובלי (נטען מ-_layout)
TaskManager.defineTask(BACKGROUND_SYNC, async () => {
  try {
    await runSync();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function setBackgroundSync(enabled: boolean) {
  const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC);
  if (enabled && !registered) {
    await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC, { minimumInterval: 30 });
  } else if (!enabled && registered) {
    await BackgroundTask.unregisterTaskAsync(BACKGROUND_SYNC);
  }
}
