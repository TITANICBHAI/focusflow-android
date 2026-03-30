/**
 * Android Foreground Service Module
 *
 * The ForegroundTaskService runs PERSISTENTLY at all times — not only during focus.
 * This keeps the process alive so Android cannot kill the AccessibilityService.
 *
 * Modes:
 *   IDLE   — Quiet "FocusFlow is monitoring" notification shown at all times.
 *   ACTIVE — Focus session running: shows task name + live countdown.
 *
 * ─── Android Implementation ──────────────────────────────────────────────────
 * File: android-native/app/.../services/ForegroundTaskService.kt
 */

import { NativeModules } from 'react-native';

const { ForegroundService } = NativeModules;

export const ForegroundServiceModule = {
  /**
   * Ensures the foreground service is running in idle mode.
   * Call on every app startup to guarantee the persistent notification always exists.
   * Safe to call if the service is already running in active mode — it will stay active.
   */
  async startIdleService(): Promise<void> {
    if (!ForegroundService) {
      console.warn('[ForegroundService] Native module not linked. Run EAS build.');
      return;
    }
    return ForegroundService.startIdleService();
  },

  async startService(taskName: string, endTimeMs: number, nextTaskName: string): Promise<void> {
    if (!ForegroundService) {
      console.warn('[ForegroundService] Native module not linked. Run EAS build.');
      return;
    }
    return ForegroundService.startService(taskName, endTimeMs, nextTaskName);
  },

  /**
   * Switches the service to idle mode (persistent notification stays, countdown stops).
   * Does NOT stop the service — it remains alive to keep the process running.
   */
  async stopService(): Promise<void> {
    if (!ForegroundService) return;
    return ForegroundService.stopService();
  },

  async updateNotification(taskName: string, endTimeMs: number, nextTaskName: string): Promise<void> {
    if (!ForegroundService) return;
    return ForegroundService.updateNotification(taskName, endTimeMs, nextTaskName);
  },

  async requestBatteryOptimizationExemption(): Promise<void> {
    if (!ForegroundService) return;
    return ForegroundService.requestBatteryOptimizationExemption();
  },
};
