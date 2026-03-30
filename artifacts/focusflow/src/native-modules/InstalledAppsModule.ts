/**
 * Android InstalledApps Native Module
 *
 * Returns all apps that appear in the device's app drawer — including user-installed
 * apps AND pre-installed/updated system apps that have a launcher icon (Chrome, YouTube,
 * Gmail, Samsung apps, etc.). Uses getLaunchIntentForPackage() as the filter, which is
 * exactly the signal the Android launcher uses to populate the app drawer.
 *
 * ─── Kotlin Implementation ────────────────────────────────────────────────────
 * File: android-native/app/src/main/java/com/tbtechs/focusflow/modules/InstalledAppsModule.kt
 *
 * Exposes one method to JS:
 *   - getInstalledApps(): Array<InstalledApp>
 */

import { TurboModuleRegistry, TurboModule } from 'react-native';

export interface InstalledApp {
  packageName: string;
  appName: string;
  iconBase64?: string;
}

interface InstalledAppsSpec extends TurboModule {
  getInstalledApps(): Promise<InstalledApp[]>;
}

const InstalledApps = TurboModuleRegistry.get<InstalledAppsSpec>('InstalledApps');
console.log('[InstalledAppsModule] resolved:', !!InstalledApps);

export const InstalledAppsModule = {
  async getInstalledApps(): Promise<InstalledApp[]> {
    if (!InstalledApps) {
      console.error('[InstalledAppsModule] Native module "InstalledApps" not found. Ensure FocusDayPackage is registered and an EAS build was used.');
      return [];
    }
    return InstalledApps.getInstalledApps();
  },
};
