/** OS background prefetch (PLAN §2b): a floor under the foreground triggers. */
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { refillBufferInBackground } from '@/composition-root';

const TASK_NAME = 'heal-scroll-refill-buffer';

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    await refillBufferInBackground();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundRefill(): Promise<void> {
  try {
    await BackgroundTask.registerTaskAsync(TASK_NAME, {
      minimumInterval: 60, // minutes; the OS decides the actual cadence
    });
  } catch {
    // Unavailable in some environments (e.g. Expo Go on iOS) — foreground triggers still cover us.
  }
}
