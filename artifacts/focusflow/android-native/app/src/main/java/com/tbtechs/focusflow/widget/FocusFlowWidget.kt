package com.tbtechs.focusflow.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.tbtechs.focusflow.MainActivity
import com.tbtechs.focusflow.R
import android.app.PendingIntent

/**
 * FocusFlowWidget
 *
 * Home screen widget that shows the current focus session state.
 * Reads from the same SharedPreferences that ForegroundTaskService writes,
 * so it always reflects live session data without any extra bridge.
 *
 * Update path:
 *   - System triggers onUpdate() every 30 min (minimum Android allows)
 *   - ForegroundTaskService calls pushWidgetUpdate() on its 30s tick for live data
 */
class FocusFlowWidget : AppWidgetProvider() {

    companion object {
        private const val PREFS_NAME = "focusday_prefs"

        /**
         * Called by ForegroundTaskService on every tick to push live data to
         * all instances of this widget. No AlarmManager needed.
         */
        fun pushWidgetUpdate(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(
                ComponentName(context, FocusFlowWidget::class.java)
            )
            if (ids.isEmpty()) return
            val views = buildViews(context)
            manager.updateAppWidget(ids, views)
        }

        private fun buildViews(context: Context): RemoteViews {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val focusActive = prefs.getBoolean("focus_active", false)
            val taskName    = prefs.getString("task_name", "") ?: ""
            val endTimeMs   = prefs.getLong("task_end_ms", 0L)

            val views = RemoteViews(context.packageName, R.layout.widget_focusflow)

            // Tap anywhere → open app
            val tapIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val tapPending = PendingIntent.getActivity(
                context, 0, tapIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root, tapPending)

            if (focusActive && taskName.isNotBlank() && endTimeMs > System.currentTimeMillis()) {
                val remainingMs   = endTimeMs - System.currentTimeMillis()
                val totalMs       = prefs.getLong("task_start_ms", 0L).let { start ->
                    if (start > 0L) endTimeMs - start else remainingMs
                }
                val progressPct   = if (totalMs > 0L) {
                    ((totalMs - remainingMs) * 100L / totalMs).toInt().coerceIn(0, 100)
                } else 0

                val remainingMins = (remainingMs / 60_000).coerceAtLeast(0)
                val timeStr = when {
                    remainingMins < 1  -> "< 1m remaining"
                    remainingMins == 1L -> "1m remaining"
                    else               -> "${remainingMins}m remaining"
                }

                views.setTextViewText(R.id.widget_header_label, "🎯 FOCUS MODE")
                views.setTextViewText(R.id.widget_task_name, taskName)
                views.setTextViewText(R.id.widget_time_remaining, timeStr)
                views.setProgressBar(R.id.widget_progress, 100, progressPct, false)
            } else {
                views.setTextViewText(R.id.widget_header_label, "FOCUSFLOW")
                views.setTextViewText(R.id.widget_task_name, "No active session")
                views.setTextViewText(R.id.widget_time_remaining, "Tap to open")
                views.setProgressBar(R.id.widget_progress, 100, 0, false)
            }

            return views
        }
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        val views = buildViews(context)
        for (id in appWidgetIds) {
            appWidgetManager.updateAppWidget(id, views)
        }
    }
}
