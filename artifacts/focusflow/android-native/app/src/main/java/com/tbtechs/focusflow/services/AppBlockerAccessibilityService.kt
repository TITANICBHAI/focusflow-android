package com.tbtechs.focusflow.services

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.content.SharedPreferences
import android.view.accessibility.AccessibilityEvent
import com.tbtechs.focusflow.modules.FocusDayBridgeModule

/**
 * AppBlockerAccessibilityService
 *
 * Listens for window-state-changed events and enforces two independent blocking systems:
 *
 *   1. TASK-BASED BLOCK (focus_active = true)
 *      - Blocks any app NOT in the "allowed_packages" list.
 *      - Cleared automatically when task_end_ms is passed (native time authority).
 *
 *   2. STANDALONE BLOCK (standalone_block_active = true)
 *      - Blocks specific apps listed in "standalone_blocked_packages".
 *      - Independent of any task — stays active until standalone_block_until_ms.
 *      - Cleared automatically when the expiry timestamp is passed.
 *
 * When BOTH are active at the same time, enforcement is additive (union):
 *   - Task-blocked apps AND standalone-blocked apps are both enforced.
 *
 * SharedPreferences file: "focusday_prefs"
 * Keys:
 *   focus_active                 Boolean — task focus is running
 *   allowed_packages             String  — JSON array of packages allowed during task focus
 *   task_end_ms                  Long    — task session end epoch ms
 *   standalone_block_active      Boolean — standalone block is enabled
 *   standalone_blocked_packages  String  — JSON array of packages to always block
 *   standalone_block_until_ms    Long    — standalone block expiry epoch ms
 */
class AppBlockerAccessibilityService : AccessibilityService() {

    companion object {
        const val PREFS_NAME       = "focusday_prefs"
        const val PREF_ALLOWED_PKG = "allowed_packages"
        const val PREF_FOCUS_ON    = "focus_active"

        const val PREF_SA_ACTIVE   = "standalone_block_active"
        const val PREF_SA_PKGS     = "standalone_blocked_packages"
        const val PREF_SA_UNTIL    = "standalone_block_until_ms"

        /**
         * Package installers / uninstall UIs always blocked during a task focus session.
         * JS settings cannot override this set.
         */
        val ALWAYS_BLOCKED: Set<String> = setOf(
            "com.android.packageinstaller",
            "com.google.android.packageinstaller",
            "com.samsung.android.packageinstaller",
            "com.miui.packageinstaller"
        )
    }

    private lateinit var prefs: SharedPreferences
    private var lastBlockedPkg: String? = null

    override fun onServiceConnected() {
        prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)

        serviceInfo = serviceInfo.apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                         AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            notificationTimeout = 100L
            flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return

        val now = System.currentTimeMillis()

        // ── Task-based focus state ────────────────────────────────────────────
        var focusActive = prefs.getBoolean(PREF_FOCUS_ON, false)
        if (focusActive) {
            val endMs = prefs.getLong("task_end_ms", 0L)
            if (endMs > 0L && now > endMs) {
                // Native authority: task expired but JS didn't clean up — self-correct.
                prefs.edit().putBoolean(PREF_FOCUS_ON, false).apply()
                focusActive = false
                lastBlockedPkg = null
            }
        }

        // ── Standalone block state ────────────────────────────────────────────
        var saActive = prefs.getBoolean(PREF_SA_ACTIVE, false)
        if (saActive) {
            val untilMs = prefs.getLong(PREF_SA_UNTIL, 0L)
            if (untilMs > 0L && now > untilMs) {
                // Standalone block expired — self-correct.
                prefs.edit().putBoolean(PREF_SA_ACTIVE, false).apply()
                saActive = false
            }
        }

        // If neither system is active, nothing to enforce.
        if (!focusActive && !saActive) {
            lastBlockedPkg = null
            return
        }

        val pkg = event.packageName?.toString() ?: return
        if (pkg == packageName) return  // never block our own app

        val isBlocked = isPackageBlocked(pkg, focusActive, saActive)

        if (isBlocked && pkg != lastBlockedPkg) {
            lastBlockedPkg = pkg
            handleBlockedApp(pkg)
        } else if (!isBlocked) {
            lastBlockedPkg = null
        }
    }

    override fun onInterrupt() {
        lastBlockedPkg = null
    }

    // ─── Block determination ──────────────────────────────────────────────────

    private fun isPackageBlocked(pkg: String, focusActive: Boolean, saActive: Boolean): Boolean {
        // 1. Always-blocked installers (only enforced during task focus)
        if (focusActive) {
            val alwaysBlocked = ALWAYS_BLOCKED.any { b ->
                pkg.equals(b, ignoreCase = true) || pkg.contains(b, ignoreCase = true)
            }
            if (alwaysBlocked) return true
        }

        // 2. Task-based block: block any app NOT in the allowed list
        if (focusActive) {
            val allowedJson = prefs.getString(PREF_ALLOWED_PKG, "[]") ?: "[]"
            val allowedList = parseJsonArray(allowedJson)
            val isAllowed = allowedList.any { a ->
                pkg.equals(a, ignoreCase = true) || pkg.contains(a, ignoreCase = true)
            }
            if (!isAllowed) return true
        }

        // 3. Standalone block: block any app explicitly listed
        if (saActive) {
            val saJson = prefs.getString(PREF_SA_PKGS, "[]") ?: "[]"
            val saList = parseJsonArray(saJson)
            val inSaList = saList.any { b ->
                pkg.equals(b, ignoreCase = true) || pkg.contains(b, ignoreCase = true)
            }
            if (inSaList) return true
        }

        return false
    }

    // ─── Enforcement ─────────────────────────────────────────────────────────

    private fun handleBlockedApp(blockedPackage: String) {
        // 1. Notify JS via broadcast → FocusDayBridgeModule → "APP_BLOCKED" event
        val broadcast = Intent(FocusDayBridgeModule.ACTION_APP_BLOCKED).apply {
            `package` = packageName
            putExtra(FocusDayBridgeModule.EXTRA_BLOCKED_PKG, blockedPackage)
        }
        sendBroadcast(broadcast)

        // 2. Press Home immediately to exit the blocked app
        performGlobalAction(GLOBAL_ACTION_HOME)

        // 3. Bring FocusFlow to the front so user sees the block notification
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_SINGLE_TOP or
                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            )
            putExtra("blocked_app", blockedPackage)
        }
        launchIntent?.let { startActivity(it) }
    }

    // ─── JSON helper ──────────────────────────────────────────────────────────

    private fun parseJsonArray(json: String): List<String> {
        return try {
            val arr = org.json.JSONArray(json)
            (0 until arr.length()).map { arr.getString(it) }
        } catch (_: Exception) {
            emptyList()
        }
    }
}
