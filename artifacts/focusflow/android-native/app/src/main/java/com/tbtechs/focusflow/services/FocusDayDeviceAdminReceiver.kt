package com.tbtechs.focusflow.services

import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.UserManager

/**
 * FocusDayDeviceAdminReceiver
 *
 * Device Admin receiver for FocusFlow — two enforcement layers:
 *
 *   1. Persistence guard: Being a Device Admin prevents aggressive OEM battery killers
 *      (MIUI, ColorOS, etc.) from force-stopping the app, protecting ForegroundTaskService
 *      and AppBlockerAccessibilityService.
 *
 *   2. Install/uninstall restriction: On activation we attempt to set
 *      DISALLOW_INSTALL_APPS and DISALLOW_UNINSTALL_APPS via DevicePolicyManager.
 *      This works as a second blocking layer on top of the AccessibilityService enforcer.
 *      The call is wrapped in try/catch — on devices where it requires Device Owner the
 *      exception is swallowed silently (AccessibilityService remains the primary guard).
 *
 * Declared in AndroidManifest.xml via withFocusDayAndroid config plugin.
 * Policy file: res/xml/device_admin.xml
 *
 * To activate:   Settings → Security → Device admin apps → FocusFlow → Activate
 * To deactivate: same path → Deactivate (must deactivate before uninstalling)
 */
class FocusDayDeviceAdminReceiver : DeviceAdminReceiver() {

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        applyInstallRestrictions(context, enable = true)
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        applyInstallRestrictions(context, enable = false)
    }

    private fun applyInstallRestrictions(context: Context, enable: Boolean) {
        try {
            val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
            val adminComponent = ComponentName(context, FocusDayDeviceAdminReceiver::class.java)
            if (enable) {
                dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_INSTALL_APPS)
                dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_UNINSTALL_APPS)
            } else {
                dpm.clearUserRestriction(adminComponent, UserManager.DISALLOW_INSTALL_APPS)
                dpm.clearUserRestriction(adminComponent, UserManager.DISALLOW_UNINSTALL_APPS)
            }
        } catch (_: SecurityException) {
            // Requires Device Owner or Profile Owner on most Android versions.
            // Accessibility Service remains the primary enforcement layer.
        } catch (_: Exception) {
            // Defensive catch — never crash the admin receiver.
        }
    }
}
