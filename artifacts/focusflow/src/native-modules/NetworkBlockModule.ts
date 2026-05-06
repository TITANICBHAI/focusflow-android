/**
 * NetworkBlockModule — Old Architecture (NativeModules bridge)
 *
 * Controls the VPN-based network blocking layer that intercepts traffic from
 * blocked apps. When a blocked app is foregrounded the AccessibilityService
 * also disables Wi-Fi and mobile data as a belt-and-suspenders measure.
 *
 * stopNetworkBlock is a session-ending action — it requires a session PIN hash
 * if a PIN has been configured, otherwise native rejects the call silently.
 *
 * Kotlin: android-native/app/.../modules/NetworkBlockModule.kt
 * Registered via: FocusDayPackage → createNativeModules()
 */

import { NativeModules, Platform } from 'react-native';

const NetworkBlock = Platform.OS === 'android' ? NativeModules.NetworkBlock : null;

if (Platform.OS === 'android' && !NetworkBlock) {
  console.warn('[NetworkBlockModule] NativeModules.NetworkBlock not found. Network blocking is unavailable.');
}

function has(name: string): boolean {
  return !!NetworkBlock && typeof NetworkBlock[name] === 'function';
}

export const NetworkBlockModule = {
  async startNetworkBlock(packagesJson: string): Promise<void> {
    if (!has('startNetworkBlock')) return;
    return NetworkBlock.startNetworkBlock(packagesJson);
  },

  /**
   * Tears down the VPN and re-enables Wi-Fi/mobile data.
   * If a session PIN is configured, pinHash must be the SHA-256 hex digest of
   * the PIN — otherwise native silently rejects the call.
   */
  async stopNetworkBlock(pinHash: string | null = null): Promise<void> {
    if (!has('stopNetworkBlock')) return;
    return NetworkBlock.stopNetworkBlock(pinHash);
  },

  async isNetworkBlockActive(): Promise<boolean> {
    if (!has('isNetworkBlockActive')) return false;
    return NetworkBlock.isNetworkBlockActive();
  },

  /**
   * Returns true if the system VPN permission has already been granted.
   * VpnService.prepare() returns null when permission is held.
   */
  async isVpnPermissionGranted(): Promise<boolean> {
    if (!has('isVpnPermissionGranted')) return false;
    return NetworkBlock.isVpnPermissionGranted();
  },

  /**
   * Shows the system "FocusFlow wants to set up a VPN" consent dialog.
   * Must be called from a foregrounded activity — resolves immediately after
   * the dialog Intent is launched. Re-check isVpnPermissionGranted() after
   * the user returns to the app.
   */
  async requestVpnPermission(): Promise<void> {
    if (!has('requestVpnPermission')) return;
    return NetworkBlock.requestVpnPermission();
  },
};
