/**
 * Task Alarm Module — Old Architecture (NativeModules bridge)
 *
 * Wraps the native TaskAlarmModule (Kotlin: modules/TaskAlarmModule.kt).
 *
 * The native side fires a full-screen TaskAlarmActivity when a task ends —
 * waking the device, playing the alarm ringtone, vibrating, and showing
 * Done / Extend / Skip buttons backed by the same NotificationActionReceiver
 * flow as the persistent foreground notification.
 *
 * This wrapper exists so the JS layer can dismiss that alarm UI when the user
 * resolves the task from inside the React app (e.g. taps "Mark Done" on the
 * focus screen) — otherwise the alarm activity would keep ringing on top of
 * the resolved state.
 */

import { NativeModules, Platform } from 'react-native';

const TaskAlarm = Platform.OS === 'android' ? NativeModules.TaskAlarm : null;

export const TaskAlarmModule = {
  /**
   * Stops the ringtone, cancels the heads-up notification, and finishes the
   * full-screen alarm activity if it is currently visible for the given task.
   * Pass `null` (or omit) to dismiss any active alarm regardless of taskId.
   *
   * Always resolves — never throws — so callers can fire-and-forget after
   * completing / extending / skipping a task.
   */
  async dismissAlarm(taskId: string | null = null): Promise<void> {
    if (!TaskAlarm) return;
    try {
      await TaskAlarm.dismissAlarm(taskId);
    } catch (e) {
      console.warn('[TaskAlarmModule] dismissAlarm failed', e);
    }
  },
};
