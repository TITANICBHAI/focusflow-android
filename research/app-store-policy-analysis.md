# FocusFlow: App Store Policy Analysis
**Research Date:** May 2025  
**Depth:** Standard  
**Sources Consulted:** 18+

---

## Executive Summary

FocusFlow is an Android app blocker that uses `BIND_ACCESSIBILITY_SERVICE` to intercept window events, `SYSTEM_ALERT_WINDOW` to display overlays, `QUERY_ALL_PACKAGES` to enumerate installed apps, and `PACKAGE_USAGE_STATS` to monitor app usage. This combination of permissions places the app in a **high-scrutiny category** on the Google Play Store.

The short verdict: **FocusFlow can be submitted to Google Play, but approval is far from guaranteed and requires deliberate policy compliance work before submission.** Several of its permissions require formal declaration forms to be filed with Google, and its core blocking mechanism — using the Accessibility Service to detect and suppress foreground apps — walks a fine line between what is explicitly permitted (deterministic, rule-based automation) and what Google is actively restricting (autonomous or non-transparent API use).

Competing apps like AppBlock, BlockSite, and Freedom are all live on the Play Store and use the same Accessibility Service mechanism — which is the strongest evidence that FocusFlow's approach is viable. However, the policy landscape is actively tightening, with a major enforcement update beginning January 2026 and credible reports of Android 17 potentially closing this pathway entirely.

On the Apple side, an iOS port would require Apple's approval for the `FamilyControls` entitlement, which involves a manual review process taking weeks to months. The iOS implementation would also have to be rebuilt from scratch using Apple's Screen Time API — none of FocusFlow's current Kotlin-based blocking code would transfer.

The most actionable path forward is to submit to Google Play with all required declarations properly filed, and begin monitoring Google's policy trajectory closely given the Android 17 risk on the horizon.

---

## Background

FocusFlow is an Android productivity application built with React Native (Expo SDK 54) and custom Kotlin native modules. Its core value proposition is enforced app blocking: when a user sets a focus session, the app prevents access to distracting apps for the duration of that session. It achieves this through a combination of native Android mechanisms:

- **`AppBlockerAccessibilityService`** (Kotlin): monitors foreground window changes via `AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED` and either closes or overlays the targeted app
- **`ForegroundTaskService`** (Kotlin): maintains a persistent notification and countdown timer using `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_SPECIAL_USE`
- **`BootReceiver`**: restores blocking state after device reboot

The permissions declared in `app.json` include: `BIND_ACCESSIBILITY_SERVICE`, `SYSTEM_ALERT_WINDOW`, `QUERY_ALL_PACKAGES`, `PACKAGE_USAGE_STATS`, `USE_FULL_SCREEN_INTENT`, `FOREGROUND_SERVICE_SPECIAL_USE`, `SCHEDULE_EXACT_ALARM`, `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`, and `RECEIVE_BOOT_COMPLETED`. This is a significant permission footprint — several of these are individually flagged by Google as "sensitive" or "restricted" and require formal justification.

---

## Key Findings

### Finding 1: Google Play Allows App Blockers Using Accessibility Service — With Strict Conditions

Google Play does not categorically ban the use of `AccessibilityService` by non-accessibility apps. Its official policy [1] explicitly acknowledges that apps whose primary purpose is not to assist users with disabilities may still use the API, provided they meet two core requirements: (a) prominent disclosure to the user about what the service does before it is enabled, and (b) filing a declaration form with Google that justifies the use case.

The critical constraint is the `isAccessibilityTool` attribute. FocusFlow must **not** set `android:isAccessibilityTool="true"` in its accessibility service declaration. That flag is exclusively reserved for apps whose primary function is to assist users with disabilities — screen readers, switch access, etc. Setting it fraudulently to gain system trust is treated as a policy violation and is grounds for removal [1, 3].

What FocusFlow does — detecting a foreground window change and triggering a deterministic overlay or close action — falls into the category Google explicitly permits: **rule-based, user-configured automation**. The October 2025 policy update [2] tightened restrictions on "autonomous" accessibility actions (those driven by AI or operating without user-defined rules), but deterministic "if blocked app opens, then show overlay" logic is not affected. FocusFlow's architecture is deterministic by design: the user chooses which apps to block and when. This is the right approach.

The practical risk is reviewer discretion. Google does not publish an exhaustive list of permitted use cases, and reviewers have been inconsistent in how they interpret "excessive" permission use. The 2024 enforcement wave that blocked 2.36 million apps [4] was primarily targeting malware and spyware, but productivity apps with broad permissions were caught in the net. A clean, well-documented declaration form significantly reduces this risk.

### Finding 2: Multiple Sensitive Permissions Require Individual Declaration Forms

FocusFlow's permission footprint is broad, and several of its permissions are in Google's "sensitive" or "restricted" categories that require explicit justification beyond what appears in the app's manifest or Play Store listing. The permissions of greatest concern are:

**`BIND_ACCESSIBILITY_SERVICE`**: Requires a declaration form explaining the use case. The form asks for the specific accessibility need, how the API is used, and confirmation that `isAccessibilityTool` is not set. FocusFlow has a clear, legitimate answer: app blocking for focus sessions. This declaration should be submitted before or immediately upon first submission [1].

**`QUERY_ALL_PACKAGES`**: Since Android 11, apps that need to enumerate all installed packages must declare this permission and justify it. Google requires a declaration form for Play Store distribution. FocusFlow needs it to show the user a list of apps to block — a straightforward justification, but the form must be filed [5].

**`SYSTEM_ALERT_WINDOW`** (draw over other apps): Required for FocusFlow's blocking overlay. Google flags this permission as sensitive because it has been heavily abused by adware. Apps with a clear functional need (overlays that directly serve the user's chosen purpose) are approved, but the use must be disclosed prominently in the app [1].

**`PACKAGE_USAGE_STATS`**: Requires the user to manually grant access through Settings > Apps > Special App Access > Usage Access. This is not a standard runtime permission and cannot be requested via the normal permission dialog. The Play Store allows apps to require this, but the onboarding flow must guide users to enable it explicitly.

**`FOREGROUND_SERVICE_SPECIAL_USE`**: Introduced in Android 14, this permission requires a `<uses-permission>` declaration and a `foregroundServiceType` attribute on the service declaration in `AndroidManifest.xml`. As of 2024, apps targeting SDK 34+ must declare the specific type. FocusFlow targets SDK 35, so this must be properly configured in the manifest generated by the Expo config plugin [6].

**`USE_FULL_SCREEN_INTENT`**: Also restricted in Android 14+. Only apps in specific categories (alarms, call apps) get automatic access. FocusFlow would need to justify this to Google and may find it unnecessary if the blocking overlay uses `SYSTEM_ALERT_WINDOW` instead [6].

**`SCHEDULE_EXACT_ALARM` / `USE_EXACT_ALARM`**: Android 12+ restricts exact alarms. `SCHEDULE_EXACT_ALARM` can be revoked by the user; `USE_EXACT_ALARM` is restricted to specific app categories. For a focus timer, inexact alarms may be sufficient, which would eliminate this permission entirely and reduce scrutiny.

### Finding 3: Direct Competitors Are Live on Google Play — Using the Exact Same Mechanism

This is the most important precedent for FocusFlow. Three major app blockers are currently available on Google Play and all use the Accessibility Service as their primary blocking mechanism:

**AppBlock** [7] is one of the most popular app blockers on Google Play with millions of downloads. Its help documentation explicitly describes using the Accessibility Service to detect when a blocked app comes to the foreground and display an overlay. It also uses `UsageStatsManager` for usage tracking. This is structurally identical to FocusFlow's approach.

**BlockSite** and **Stay Focused** follow the same pattern. Both apps request `BIND_ACCESSIBILITY_SERVICE`, `SYSTEM_ALERT_WINDOW`, and `PACKAGE_USAGE_STATS`, and both are in good standing on the Play Store.

**Freedom** [8] takes an additional step by combining the Accessibility Service with a local VPN for DNS-level website blocking. Freedom's presence on the Play Store demonstrates that Google even permits the combination of Accessibility Service + VPN for blocking purposes when the use case is clearly communicated.

The existence of these apps — some with 10+ million downloads and years of Play Store history — is strong evidence that FocusFlow's technical approach is viable under current policy. The key differentiator between apps that get approved and apps that get rejected is not the mechanism itself, but the quality of the policy declarations and the transparency of disclosures to users.

### Finding 4: The Policy Horizon Poses a Real Long-Term Risk

While FocusFlow's approach is currently viable, there are two developments that represent genuine future risks and should be monitored closely.

**Advanced Protection Mode (Android, 2025-2026)**: Google is rolling out an "Advanced Protection Mode" for Android — a high-security mode designed for users at elevated risk of targeted attacks (journalists, activists, executives). When enabled, this mode may automatically revoke or block Accessibility Service permissions for apps that have not set `isAccessibilityTool="true"` [3]. Since FocusFlow correctly should not set that flag, users who enable Advanced Protection Mode would have FocusFlow's blocking functionality silently broken. This is not a Play Store policy issue — the app would not be removed — but it is a reliability issue for a subset of users.

**Android 17 Accessibility Restrictions**: Multiple technology publications are reporting that Android 17 (expected late 2025 or 2026) may restrict `AccessibilityService` to verified accessibility tools only, forcing third-party app blockers off of this API entirely [9]. If accurate, this would be the most disruptive change in this space since Android 11's `QUERY_ALL_PACKAGES` restriction. The Digital Wellbeing API does not currently offer equivalent functionality to third-party developers, and there is no confirmed alternative pathway. This risk is speculative but worth tracking through Google I/O announcements and Android developer previews.

### Finding 5: Apple App Store Requires a Completely Different Architecture and Approval Process

An iOS version of FocusFlow is technically possible but would require a complete architectural rewrite and a separate approval process with Apple. None of FocusFlow's current native Kotlin blocking code would transfer.

Apple provides the **Screen Time API** — a collection of frameworks (`FamilyControls`, `ManagedSettings`, `DeviceActivity`) introduced in iOS 15 [10]. This is the only officially supported way to build an app blocker on iOS. Third-party developers cannot use undocumented system hooks or background processes to block apps; the Screen Time API is the designated pathway.

Access to this API requires Apple to approve a **`Family Controls Distribution Entitlement`** for the developer's account [11]. This is a manual review process — Apple evaluates whether the app genuinely serves a parental control or self-regulation use case. Approval can take days to months. The entitlement must be requested by the Account Holder of the Apple Developer account.

The architecture on iOS would be fundamentally different from Android. Apple's Screen Time API uses **opaque tokens** rather than app identifiers — developers never see the names or bundle IDs of blocked apps, only anonymous tokens. This is a deliberate privacy design choice. The blocking logic runs through `ManagedSettings.Store.shield.applications`, and the "block screen" (called a Shield) has limited customization options with only a handful of permitted actions [12].

A significant limitation of the iOS API is that there is currently no way to prevent users from toggling off the app blocker from Settings > Screen Time without a passcode — meaning a user under a self-imposed block can trivially disable it. This is a hard platform constraint, not something FocusFlow could work around.

---

## Analysis

FocusFlow sits in a category that Google Play tolerates but watches closely. The app is not doing anything that competitors haven't already proven is acceptable — AppBlock, BlockSite, and Freedom have all normalized the Accessibility Service + overlay model for app blocking. However, FocusFlow's permission list is notably long, and submitting to Google Play without first filing the required declaration forms would almost certainly result in rejection.

The most immediate action required before any Play Store submission is: (1) file the Accessibility Service declaration form explaining the focus-session use case, (2) file the `QUERY_ALL_PACKAGES` declaration, (3) review whether `USE_FULL_SCREEN_INTENT` and both exact alarm permissions are truly necessary, and (4) ensure the app's onboarding flow includes prominent, specific disclosure of what the Accessibility Service does and how it is used — not just a generic permission request.

The long-term structural risk is real but not imminent. Android 17 is not yet confirmed, and even if it restricts AccessibilityService, Google would likely provide a migration path or a new dedicated API for the productivity app-blocking category, given how established that category now is. FocusFlow should track Android developer previews beginning in early 2026.

For Apple, a port is a separate product decision. The Screen Time API is capable enough and the entitlement is obtainable, but it represents a significant engineering investment with a different user experience — particularly around enforcement strength — than the Android version.

---

## Limitations

This research reflects policy documentation and third-party reporting as of May 2025. Google Play policy updates frequently and does not always announce changes in advance. The Android 17 reports on AccessibilityService restrictions come from technology publications, not official Google documentation, and should be treated as unconfirmed. The actual outcome of any Google Play submission depends in part on human reviewer discretion, which cannot be predicted from policy text alone. Apple entitlement approval timelines vary and are not publicly documented.

---

## Recommendations

1. **Before submitting to Google Play**, file the Accessibility Service declaration form and the `QUERY_ALL_PACKAGES` declaration through the Google Play Console. Both are required and the absence of either will result in rejection.

2. **Audit the permission list** and remove any permissions that are not strictly necessary. `USE_FULL_SCREEN_INTENT` can likely be dropped if the blocking overlay uses `SYSTEM_ALERT_WINDOW`. `SCHEDULE_EXACT_ALARM` may be replaceable with inexact alarms. A shorter permission list means less scrutiny.

3. **Add a detailed onboarding disclosure screen** that explains precisely what the Accessibility Service does — "This app uses the Accessibility Service to detect when a blocked app opens and display a blocking overlay." Generic permission language will not satisfy Google's "prominent disclosure" requirement.

4. **Do not set `android:isAccessibilityTool="true"`** in the accessibility service declaration. This is correct current behavior but worth confirming in the generated AndroidManifest.

5. **Monitor the Android 17 developer preview** (expected early-to-mid 2026). If Google restricts the Accessibility Service for non-accessibility tools, evaluate whether `UsageStatsManager` alone can provide a viable (if less reliable) alternative blocking mechanism.

6. **For alternative distribution**, Samsung Galaxy Store and Amazon Appstore are both viable secondary options with less restrictive policies than Google Play. F-Droid is an option for an open-source release and has no policy restrictions on Accessibility Service usage. These should be considered as supplement to, not replacement for, a Google Play listing.

7. **Defer Apple App Store to a later phase.** It requires a full rewrite of the native blocking layer, a separate entitlement approval from Apple, and produces a weaker enforcement model than the Android version. It is viable but not the right first step.

---

## Sources

1. **Use of the AccessibilityService API** — Google Play Console Help — https://support.google.com/googleplay/android-developer/answer/10964491 (2024, Tier 1)
2. **Policy Announcement: October 30, 2025** — Google Play Console Help — https://support.google.com/googleplay/android-developer/answer/16550159 (Oct 2025, Tier 1)
3. **Android's Security Mode Update May Break Your Favorite Customization Apps** — Android Headlines — https://www.androidheadlines.com/2026/02/android-advanced-protection-accessibility-api-restrictions-customization-automation.html (Feb 2026, Tier 2)
4. **Google blocked 2.36 million risky Android apps from Play Store in 2024** — BleepingComputer — https://www.bleepingcomputer.com/news/security/google-blocked-236-million-risky-android-apps-from-play-store-in-2024/ (Apr 2024, Tier 2)
5. **Inquiry About Policy Compliance for an App with App Usage Blocking Features** — Google Play Developer Community — https://support.google.com/googleplay/android-developer/thread/319193084/ (2024, Tier 2)
6. **Android Foreground Service Types** — Android Developer Documentation — https://developer.android.com/about/versions/14/changes/fgs-types-required (2024, Tier 1)
7. **How Blocking Works on Android** — AppBlock Help Center — https://appblock.app/help/android/blocking-android/ (2024, Tier 2)
8. **Android Permissions Explained** — Freedom.to Blog — https://freedom.to/blog/android-permissions-explained/ (2023, Tier 2)
9. **Android 17 Accessibility API Restrictions** — The Hacker News — https://thehackernews.com/2026/03/android-17-blocks-non-accessibility.html (2026, Tier 3)
10. **Screen Time API Documentation** — Apple Developer — https://developer.apple.com/documentation/screentimeapidocumentation (2024, Tier 1)
11. **Family Controls Distribution Entitlement Request** — Apple Developer — https://developer.apple.com/contact/request/family-controls-distribution (2024, Tier 1)
12. **A Developer's Guide to Apple's Screen Time APIs** — Medium/@juliusbrussee — https://medium.com/@juliusbrussee/a-developers-guide-to-apple-s-screen-time-apis-familycontrols-managedsettings-deviceactivity-e660147367d7 (2023, Tier 2)
13. **The State of the Screen Time API (2024)** — riedel.wtf — https://riedel.wtf/state-of-the-screen-time-api-2024/ (Jan 2024, Tier 2)
14. **Apple App Store Review Guidelines** — Apple Developer — https://developer.apple.com/app-store/review/guidelines/ (2025, Tier 1)
15. **UsageStatsManager API Reference** — Android Developers — https://developer.android.com/reference/android/app/usage/UsageStatsManager (2024, Tier 1)
16. **Google Play Developer Policy Center** — Google — https://play.google.com/about/developer-content-policy/ (2024, Tier 1)
17. **AuthorizationCenter API** — Apple Developer — https://developer.apple.com/documentation/familycontrols/authorizationcenter (2024, Tier 1)
18. **Apple Developer Forums: Screen Time API Authorization** — Apple — https://developer.apple.com/forums/thread/727291 (2023-2024, Tier 3)
