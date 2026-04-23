package com.tbtechs.focusflow.modules

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.tbtechs.focusflow.services.ForegroundTaskService
import com.tbtechs.focusflow.services.TaskAlarmActivity

/**
 * TaskAlarmModule
 *
 * JS name: NativeModules.TaskAlarm
 *
 * Thin wrapper exposed to the JS layer so the React side can dismiss the
 * full-screen [TaskAlarmActivity] when the user resolves the task from inside
 * the app (Done / Extend / Skip in the focus screen) rather than from the
 * alarm UI itself.
 *
 * The native alarm activity listens for [TaskAlarmActivity.ACTION_DISMISS_ALARM]
 * and finishes itself.  We also cancel the heads-up alarm notification so a
 * stale entry does not linger in the shade.
 *
 * Methods:
 *   dismissAlarm(taskId?: string) — finish the alarm activity for the given
 *     task (or any active alarm if taskId is null) and remove the heads-up
 *     notification.  Always resolves — never throws.
 */
class TaskAlarmModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "TaskAlarm"
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun dismissAlarm(taskId: String?, promise: Promise) {
        try {
            val intent = Intent(TaskAlarmActivity.ACTION_DISMISS_ALARM).apply {
                `package` = reactContext.packageName
                if (!taskId.isNullOrEmpty()) {
                    putExtra(TaskAlarmActivity.EXTRA_TASK_ID, taskId)
                }
            }
            reactContext.sendBroadcast(intent)

            val nm = reactContext.getSystemService(Context.NOTIFICATION_SERVICE)
                as? NotificationManager
            nm?.cancel(ForegroundTaskService.TASK_ALARM_NOTIF_ID)

            promise.resolve(true)
        } catch (e: Exception) {
            // Best-effort — never surface failures to JS.  Resolving false
            // lets the caller log without breaking the resolution flow.
            promise.resolve(false)
        }
    }
}
