# Project Notes

## Artifacts
- FocusFlow: Expo mobile app in `artifacts/focusflow`, preview path `/`.
- FocusFlow Commercial Ad: video artifact in `artifacts/focusflow-ad`, preview path `/focusflow-ad/`.
- Canvas mockup sandbox in `artifacts/mockup-sandbox`.

## Recent Changes
- Added a manual GitHub Actions AAB-only Android release workflow at `.github/workflows/build-aab.yml`, alongside the existing APK × 3 + AAB release workflow.
- Hardened FocusFlow onboarding and settings sync paths so optional Android native modules or Samsung battery settings failures do not crash first-run onboarding.
- Daily allowance supports three per-app modes: count, time budget, and interval, enforced by the Android accessibility service through SharedPreferences config.
- **Keyword/URL/DNS blocker upgrade**: `AppBlockerAccessibilityService` now subscribes to `TYPE_WINDOW_CONTENT_CHANGED` + `TYPE_VIEW_TEXT_CHANGED` (with per-app debouncing), scans browser URL bars for blocked domains (Chrome, Firefox, Edge, Brave, DuckDuckGo, etc.), and uses adaptive scan depths per app. `NetworkBlockerVpnService` DNS proxy intercepts DNS queries and responds with NXDOMAIN for blocked domains. `BlockedWordsModal` redesigned as 3-tab modal: Keywords, Categories (7 pre-built bundles), Domains.
- **FocusLauncherActivity** (`android-native/.../launcher/FocusLauncherActivity.kt`): pure Kotlin custom home screen (CATEGORY_HOME). Registers with Android launcher chooser. Two modes: UNLOCKED (editable app grid) and LOCKED (block active — grid is frozen, "Locked until HH:MM" shown, power long-press consumed). Permanent dock always shows Phone, WhatsApp, VLC, Settings (OEM-variant resolved at runtime). App selection uses native multi-select dialog. Auto-unlocks when block expiry is reached (checked on every clock tick). `install.sh` copies launcher/ Kotlin files and patches the manifest.
- **Power menu suppression**: `AppBlockerAccessibilityService` detects `GlobalActionsDialog` (and OEM variants like `PowerMenuDialog`) from `com.android.systemui` during any active block session and calls `GLOBAL_ACTION_BACK` to dismiss it. Emergency carve-out: if TelephonyManager reports CALL_STATE_OFFHOOK or CALL_STATE_RINGING, the power menu is left alone. Requires `READ_PHONE_STATE` permission (added to `install.sh`).
- **Launcher settings in JS**: `SharedPrefsModule.setLauncherApps()` syncs the user's selected app list to SharedPrefs. `LauncherSetupModal.tsx` provides a UI for configuring launcher apps and opening the system "default home app" chooser. Settings screen has new "Focus Launcher" section. `AppSettings.launcherApps` field added to types and context.
