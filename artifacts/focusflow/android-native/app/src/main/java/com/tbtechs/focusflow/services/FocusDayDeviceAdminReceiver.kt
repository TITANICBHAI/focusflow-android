package com.tbtechs.focusflow.services

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent

/**
 * FocusDayDeviceAdminReceiver
 *
 * Minimal Device Admin receiver for FocusFlow.
 * Being a Device Admin prevents aggressive OEM battery killers (MIUI, ColorOS, etc.)
 * from force-stopping the app, which would kill the ForegroundTaskService and
 * AppBlockerAccessibilityService.
 *
 * Declared in AndroidManifest.xml via withFocusDayAndroid config plugin.
 * Policy file: res/xml/device_admin.xml
 *
 * To activate: Settings → Security → Device admin apps → FocusFlow → Activate
 * To deactivate: same path → Deactivate (must deactivate before uninstalling)
 */
class FocusDayDeviceAdminReceiver : DeviceAdminReceiver() {

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
    }
}
