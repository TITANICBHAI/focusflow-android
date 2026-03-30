/**
 * Android Foreground Launch Module
 *
 * Provides app-switching utilities used during focus mode.
 *
 * ─── Kotlin Implementation ────────────────────────────────────────────────────
 * File: android-native/app/.../modules/ForegroundLaunchModule.kt
 *
 * Methods:
 *   - goHome()                      — send device to home screen (no permission needed)
 *   - bringToFront()                — re-launch FocusFlow over blocked app
 *   - showOverlay(message: String)  — placeholder for future full-screen overlay
 *   - hasOverlayPermission()        — returns true if SYSTEM_ALERT_WINDOW is granted
 *   - requestOverlayPermission()    — opens system settings for SYSTEM_ALERT_WINDOW
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * DEFERRED: Full-screen lock overlay
 * See ForegroundLaunchModule.kt for the implementation plan (requires
 * a FocusLockActivity + USE_FULL_SCREEN_INTENT or SYSTEM_ALERT_WINDOW).
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { NativeModules } from 'react-native';

const { ForegroundLaunch } = NativeModules;

export const ForegroundLaunchModule = {
  /**
   * Sends the device to the home screen.
   * Called after Activate Focus so the user lands on their home screen
   * while FocusFlow continues enforcing in the background.
   */
  async goHome(): Promise<void> {
    if (!ForegroundLaunch) {
      console.warn('[ForegroundLaunchModule] Native module not linked. Run EAS build.');
      return;
    }
    return ForegroundLaunch.goHome();
  },

  async bringToFront(): Promise<void> {
    if (!ForegroundLaunch) {
      console.warn('[ForegroundLaunchModule] Native module not linked. Run EAS build.');
      return;
    }
    return ForegroundLaunch.bringToFront();
  },

  async showOverlay(message: string): Promise<void> {
    if (!ForegroundLaunch) {
      console.warn('[ForegroundLaunchModule] Native module not linked. Run EAS build.');
      return;
    }
    return ForegroundLaunch.showOverlay(message);
  },

  async hasOverlayPermission(): Promise<boolean> {
    if (!ForegroundLaunch) return false;
    return ForegroundLaunch.hasOverlayPermission();
  },

  async requestOverlayPermission(): Promise<void> {
    if (!ForegroundLaunch) {
      console.warn('[ForegroundLaunchModule] Native module not linked. Run EAS build.');
      return;
    }
    return ForegroundLaunch.requestOverlayPermission();
  },
};
