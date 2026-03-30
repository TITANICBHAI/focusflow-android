package com.tbtechs.focusflow.modules

import android.app.AppOpsManager
import android.app.admin.DevicePolicyManager
import android.app.usage.UsageStatsManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.os.Process
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * UsageStatsModule
 *
 * JS name: NativeModules.UsageStats
 * Methods:
 *   - getForegroundApp()             → Promise<String?>
 *   - hasPermission()                → Promise<Boolean>  — Usage Access (AppOps)
 *   - openUsageAccessSettings()      → Promise<null>
 *   - hasAccessibilityPermission()   → Promise<Boolean>  — Accessibility Service enabled
 *   - isIgnoringBatteryOptimizations() → Promise<Boolean>
 *
 * Permission required: android.permission.PACKAGE_USAGE_STATS
 * Must be granted manually: Settings → Apps → Special app access → Usage access
 */
class UsageStatsModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "UsageStats"
        private const val ACCESSIBILITY_SERVICE_ID =
            "com.tbtechs.focusflow/com.tbtechs.focusflow.services.AppBlockerAccessibilityService"
        private const val DEVICE_ADMIN_RECEIVER =
            "com.tbtechs.focusflow/com.tbtechs.focusflow.services.FocusDayDeviceAdminReceiver"
    }

    override fun getName(): String = NAME

    /**
     * Returns the package name of the current foreground app.
     * Queries the last 10 seconds of usage data and picks the most-recently-used entry.
     */
    @ReactMethod
    fun getForegroundApp(promise: Promise) {
        try {
            val usm = reactContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val now = System.currentTimeMillis()
            val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, now - 10_000, now)

            if (stats.isNullOrEmpty()) {
                promise.resolve(null)
                return
            }

            val foreground = stats.maxByOrNull { it.lastTimeUsed }?.packageName
            promise.resolve(foreground)
        } catch (e: Exception) {
            promise.reject("USAGE_STATS_ERROR", e.message, e)
        }
    }

    /**
     * Returns whether the PACKAGE_USAGE_STATS permission has been granted.
     */
    @ReactMethod
    fun hasPermission(promise: Promise) {
        try {
            val appOps = reactContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            val mode = appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                reactContext.packageName
            )
            promise.resolve(mode == AppOpsManager.MODE_ALLOWED)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    /**
     * Opens the Usage Access settings list.
     *
     * Samsung One UI does NOT reliably handle the package-URI variant of
     * ACTION_USAGE_ACCESS_SETTINGS (the deep-link silently opens an empty screen
     * on many One UI 5/6 builds). We therefore always open the full list and let
     * the user tap FocusFlow manually — this is universally compatible.
     *
     * Uses currentActivity when available for reliable foreground-launch on API 34+.
     */
    @ReactMethod
    fun openUsageAccessSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            val activity = reactContext.currentActivity
            if (activity != null && !activity.isFinishing) {
                activity.startActivity(intent)
            } else {
                reactContext.startActivity(intent)
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SETTINGS_ERROR", e.message, e)
        }
    }

    /**
     * Opens the Device Admin activation dialog for FocusDayDeviceAdminReceiver.
     *
     * Tries ACTION_ADD_DEVICE_ADMIN first (shows the system activation dialog).
     * On Samsung One UI the dialog may not appear if startActivity is called from
     * the application context; using currentActivity fixes this.
     * Falls back to the Samsung-specific security/device-admin path, then the
     * generic security settings, so the user always lands somewhere useful.
     */
    @ReactMethod
    fun openDeviceAdminSettings(promise: Promise) {
        val component = ComponentName(
            reactContext.packageName,
            "com.tbtechs.focusflow.services.FocusDayDeviceAdminReceiver"
        )
        val adminIntent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
            putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, component)
            putExtra(
                DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                "Prevents aggressive battery killers from stopping FocusFlow's blocking service."
            )
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }

        val activity = reactContext.currentActivity
        val launched = if (activity != null && !activity.isFinishing) {
            try { activity.startActivity(adminIntent); true } catch (_: Exception) { false }
        } else {
            try { reactContext.startActivity(adminIntent); true } catch (_: Exception) { false }
        }

        if (launched) {
            promise.resolve(null)
            return
        }

        // Fallback chain for Samsung One UI and other OEMs
        val fallbacks = listOf(
            // Samsung One UI 5+: Biometrics & Security → Device admin apps
            "com.android.settings.DeviceAdminSettings",
            Settings.ACTION_SECURITY_SETTINGS
        )
        for (fb in fallbacks) {
            try {
                val fbIntent = Intent(fb).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
                reactContext.startActivity(fbIntent)
                promise.resolve(null)
                return
            } catch (_: Exception) { /* try next */ }
        }

        promise.reject("DEVICE_ADMIN_ERROR", "Could not open device admin settings")
    }

    /**
     * Returns whether the FocusDay AppBlockerAccessibilityService is enabled.
     *
     * Reads the system's enabled accessibility services list from Settings.Secure
     * and checks if our service ID is present. This is the correct runtime check
     * for accessibility service status.
     */
    @ReactMethod
    fun hasAccessibilityPermission(promise: Promise) {
        try {
            val enabledServices = Settings.Secure.getString(
                reactContext.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ) ?: ""
            promise.resolve(enabledServices.contains(ACCESSIBILITY_SERVICE_ID, ignoreCase = true))
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    /**
     * Returns whether the app is exempted from battery optimization.
     * On Android M+ this is checked via PowerManager.isIgnoringBatteryOptimizations().
     * On older versions returns true (no battery optimization enforcement).
     */
    @ReactMethod
    fun isIgnoringBatteryOptimizations(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val pm = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
                promise.resolve(pm.isIgnoringBatteryOptimizations(reactContext.packageName))
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    /**
     * Returns whether the app has an active Device Admin component registered.
     * Uses DevicePolicyManager.isAdminActive() with our FocusDayDeviceAdminReceiver
     * component. If the receiver class does not exist, returns false gracefully.
     *
     * Note: FocusDayDeviceAdminReceiver is a lightweight optional component.
     * If it is not declared in the manifest, this always returns false.
     */
    @ReactMethod
    fun isDeviceAdminActive(promise: Promise) {
        try {
            val dpm = reactContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
            val parts = DEVICE_ADMIN_RECEIVER.split("/")
            if (parts.size == 2) {
                val component = ComponentName(parts[0], parts[1])
                promise.resolve(dpm.isAdminActive(component))
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }
}
