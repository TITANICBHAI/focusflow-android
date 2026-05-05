package com.tbtechs.focusflow.services

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.Editable
import android.text.TextUtils
import android.text.TextWatcher
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.GridLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * LauncherActivity — FocusFlow's built-in home-screen replacement.
 *
 * Declared with HOME + DEFAULT intent-filter so Android can set it as the
 * default home app. When set, every press of the Home button and every
 * cold-start of an app goes through this Activity first.
 *
 * Key behaviours:
 *  - Reads standalone_block_active + always_block_active from SharedPrefs to
 *    determine which apps are currently blocked.
 *  - Reads launcher_hidden_packages to filter the app drawer completely.
 *  - Tapping a blocked app fires BlockOverlayActivity instead of launching it.
 *  - Tapping any app in the pinned grid or drawer uses ACTION_MAIN + CATEGORY_LAUNCHER.
 *  - Long-press on a pinned app shows "Remove from home" (no Uninstall option).
 *  - Swiping up from anywhere on the home screen opens the full app drawer.
 *  - The home screen shows a large digital clock + date + pinned apps row.
 *  - FocusFlow itself is excluded from the app drawer (user can still open
 *    it from the persistent notification or block overlay).
 */
class LauncherActivity : Activity() {

    companion object {
        private const val PREFS_NAME = AppBlockerAccessibilityService.PREFS_NAME
        private const val PREF_LAUNCHER_HIDDEN = "launcher_hidden_packages"
        private const val PREF_LAUNCHER_PINNED = "launcher_pinned_packages"
        private const val PREF_SA_ACTIVE       = AppBlockerAccessibilityService.PREF_SA_ACTIVE
        private const val PREF_SA_PKGS         = AppBlockerAccessibilityService.PREF_SA_PKGS
        private const val PREF_SA_UNTIL        = AppBlockerAccessibilityService.PREF_SA_UNTIL
        private const val PREF_ALWAYS_BLOCK     = AppBlockerAccessibilityService.PREF_ALWAYS_BLOCK
        private const val PREF_ALWAYS_BLOCK_PKGS = AppBlockerAccessibilityService.PREF_ALWAYS_BLOCK_PKGS
        private const val OWN_PACKAGE           = "com.tbtechs.focusflow"

        private val BG_TOP    = Color.parseColor("#0D0D0D")
        private val BG_BOTTOM = Color.parseColor("#1A1A2E")
        private val TEXT_DIM  = Color.parseColor("#888888")
        private val TEXT_MUTED = Color.parseColor("#555555")
        private val ACCENT    = Color.parseColor("#6366f1")
    }

    private lateinit var prefs: SharedPreferences
    private val handler = Handler(Looper.getMainLooper())
    private var clockRunnable: Runnable? = null

    private lateinit var rootFrame: FrameLayout
    private var clockView: TextView? = null
    private var dateView: TextView? = null
    private var pinnedRow: LinearLayout? = null
    private var drawerOverlay: FrameLayout? = null
    private var isDrawerOpen = false
    private var swipeTouchStartY = 0f

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        window.decorView.setBackgroundColor(BG_TOP)

        rootFrame = FrameLayout(this)
        setContentView(rootFrame)

        buildHomeLayout()
        startClock()
    }

    override fun onResume() {
        super.onResume()
        refreshPinnedGrid()
    }

    override fun onDestroy() {
        super.onDestroy()
        clockRunnable?.let { handler.removeCallbacks(it) }
    }

    override fun onBackPressed() {
        if (isDrawerOpen) {
            closeDrawer()
        }
        // Intentionally swallow back in home launcher — no parent activity to go to
    }

    // ── Home screen layout ────────────────────────────────────────────────────

    private fun buildHomeLayout() {
        // Gradient background
        val bgDrawable = GradientDrawable(
            GradientDrawable.Orientation.TOP_BOTTOM,
            intArrayOf(BG_TOP, BG_BOTTOM)
        )
        rootFrame.background = bgDrawable

        val column = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }

        // Top spacer (takes ~30 % of screen height)
        column.addView(View(this).apply {
            layoutParams = LinearLayout.LayoutParams(1, 0, 3f)
        })

        // Large digital clock
        clockView = TextView(this).apply {
            textSize = 68f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            typeface = Typeface.DEFAULT_BOLD
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }
        column.addView(clockView)

        // Date text
        dateView = TextView(this).apply {
            textSize = 15f
            setTextColor(TEXT_DIM)
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).also { it.topMargin = dp(6) }
        }
        column.addView(dateView)

        updateClockText()

        // Middle spacer
        column.addView(View(this).apply {
            layoutParams = LinearLayout.LayoutParams(1, 0, 4f)
        })

        // Pinned apps row (horizontal, centered)
        pinnedRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).also { it.bottomMargin = dp(20) }
        }
        column.addView(pinnedRow)

        // Swipe-up hint
        val hint = TextView(this).apply {
            text = "↑   App Drawer"
            textSize = 12f
            setTextColor(TEXT_MUTED)
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).also { it.bottomMargin = dp(32) }
        }
        column.addView(hint)

        rootFrame.addView(column)

        // Swipe-up gesture on root to open drawer
        rootFrame.setOnTouchListener { _, ev ->
            when (ev.action) {
                MotionEvent.ACTION_DOWN -> {
                    swipeTouchStartY = ev.rawY
                    false
                }
                MotionEvent.ACTION_UP -> {
                    val dy = swipeTouchStartY - ev.rawY
                    if (dy > dp(72)) {
                        openDrawer()
                        true
                    } else {
                        false
                    }
                }
                else -> false
            }
        }

        refreshPinnedGrid()
    }

    private fun refreshPinnedGrid() {
        val row = pinnedRow ?: return
        row.removeAllViews()
        val pinnedJson = prefs.getString(PREF_LAUNCHER_PINNED, "[]") ?: "[]"
        val blocked = getBlockedPackages()

        for (pkg in parseJsonArray(pinnedJson)) {
            addPinnedIcon(row, pkg, blocked.contains(pkg))
        }
    }

    private fun addPinnedIcon(parent: LinearLayout, pkg: String, isBlocked: Boolean) {
        val pm = packageManager
        val appInfo = try { pm.getApplicationInfo(pkg, 0) } catch (e: Exception) { return }
        val label = pm.getApplicationLabel(appInfo).toString()
        val icon  = try { pm.getApplicationIcon(pkg) } catch (e: Exception) { return }

        val item = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(dp(72), LinearLayout.LayoutParams.WRAP_CONTENT)
                .also { it.setMargins(dp(8), 0, dp(8), 0) }
        }

        val iconView = ImageView(this).apply {
            setImageDrawable(icon)
            alpha = if (isBlocked) 0.35f else 1f
            layoutParams = LinearLayout.LayoutParams(dp(52), dp(52))
        }

        val labelView = TextView(this).apply {
            text = label
            textSize = 11f
            setTextColor(if (isBlocked) TEXT_MUTED else Color.WHITE)
            gravity = Gravity.CENTER
            maxLines = 1
            ellipsize = TextUtils.TruncateAt.END
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).also { it.topMargin = dp(4) }
        }

        item.addView(iconView)
        item.addView(labelView)

        item.setOnClickListener {
            if (isBlocked) launchBlockOverlay(pkg) else launchApp(pkg)
        }

        item.setOnLongClickListener {
            showPinnedLongPressMenu(pkg, label)
            true
        }

        parent.addView(item)
    }

    // ── App drawer ────────────────────────────────────────────────────────────

    private fun openDrawer() {
        if (isDrawerOpen) return
        isDrawerOpen = true

        val overlay = FrameLayout(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.parseColor("#F01A1A2E"))
        }

        val column = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }

        // Drag handle bar
        val handle = View(this).apply {
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(4).toFloat()
                setColor(Color.parseColor("#444466"))
            }
            layoutParams = LinearLayout.LayoutParams(dp(40), dp(4)).also {
                it.gravity = Gravity.CENTER_HORIZONTAL
                it.topMargin = dp(12)
                it.bottomMargin = dp(12)
            }
        }
        column.addView(handle)

        // Search bar
        val searchBar = EditText(this).apply {
            hint = "Search apps"
            setHintTextColor(Color.parseColor("#666688"))
            setTextColor(Color.WHITE)
            textSize = 15f
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(24).toFloat()
                setColor(Color.parseColor("#2A2A42"))
            }
            setPadding(dp(18), 0, dp(18), 0)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dp(46)
            ).also { it.setMargins(dp(16), 0, dp(16), dp(12)) }
        }
        column.addView(searchBar)

        // App grid inside a scroll view
        val scroll = ScrollView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f
            )
        }

        val grid = GridLayout(this).apply {
            columnCount = 4
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }

        val hiddenJson = prefs.getString(PREF_LAUNCHER_HIDDEN, "[]") ?: "[]"
        val hiddenPkgs = parseJsonArray(hiddenJson).toSet()
        val blocked    = getBlockedPackages()

        val pm    = packageManager
        val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        val appList = pm.queryIntentActivities(intent, 0)
            .filter { it.activityInfo.packageName != OWN_PACKAGE }
            .filter { !hiddenPkgs.contains(it.activityInfo.packageName) }
            .sortedBy { pm.getApplicationLabel(it.activityInfo.applicationInfo).toString().lowercase(Locale.getDefault()) }

        for (info in appList) {
            addDrawerIcon(grid, info, pm, blocked)
        }

        scroll.addView(grid)
        column.addView(scroll)
        overlay.addView(column)

        // Search filter
        searchBar.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                val q = s?.toString()?.lowercase(Locale.getDefault()) ?: ""
                for (i in 0 until grid.childCount) {
                    val child = grid.getChildAt(i)
                    val tag   = child.tag as? String ?: ""
                    child.visibility = if (q.isEmpty() || tag.contains(q)) View.VISIBLE else View.GONE
                }
            }
        })

        // Swipe-down to close drawer
        var downY = 0f
        overlay.setOnTouchListener { _, ev ->
            when (ev.action) {
                MotionEvent.ACTION_DOWN -> { downY = ev.rawY; false }
                MotionEvent.ACTION_UP   -> {
                    if (ev.rawY - downY > dp(100)) { closeDrawer(); true } else false
                }
                else -> false
            }
        }

        drawerOverlay = overlay
        rootFrame.addView(overlay)
    }

    private fun addDrawerIcon(grid: GridLayout, info: ResolveInfo, pm: PackageManager, blocked: Set<String>) {
        val pkg   = info.activityInfo.packageName
        val label = pm.getApplicationLabel(info.activityInfo.applicationInfo).toString()
        val icon  = try { pm.getApplicationIcon(pkg) } catch (e: Exception) { return }
        val isBlocked = blocked.contains(pkg)

        val colSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f)
        val item = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            val lp = GridLayout.LayoutParams(colSpec, colSpec)
            lp.width = 0
            lp.height = GridLayout.LayoutParams.WRAP_CONTENT
            lp.setMargins(dp(8), dp(10), dp(8), dp(4))
            layoutParams = lp
            tag = label.lowercase(Locale.getDefault())
        }

        val iconView = ImageView(this).apply {
            setImageDrawable(icon)
            alpha = if (isBlocked) 0.3f else 1f
            layoutParams = LinearLayout.LayoutParams(dp(46), dp(46))
        }

        val labelView = TextView(this).apply {
            text = label
            textSize = 10f
            setTextColor(if (isBlocked) TEXT_MUTED else Color.parseColor("#CCCCDD"))
            gravity = Gravity.CENTER
            maxLines = 1
            ellipsize = TextUtils.TruncateAt.END
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).also { it.topMargin = dp(3) }
        }

        item.addView(iconView)
        item.addView(labelView)
        item.setOnClickListener {
            if (isBlocked) {
                closeDrawer()
                launchBlockOverlay(pkg)
            } else {
                closeDrawer()
                launchApp(pkg)
            }
        }

        grid.addView(item)
    }

    private fun closeDrawer() {
        isDrawerOpen = false
        drawerOverlay?.let { rootFrame.removeView(it) }
        drawerOverlay = null
    }

    // ── Long-press on pinned app ───────────────────────────────────────────────

    private fun showPinnedLongPressMenu(pkg: String, label: String) {
        val dialog = android.app.AlertDialog.Builder(this)
            .setTitle(label)
            .setItems(arrayOf("Remove from Home", "App Info")) { _, which ->
                when (which) {
                    0 -> removePinnedApp(pkg)
                    1 -> openAppInfo(pkg)
                }
            }
            .create()
        dialog.show()
    }

    private fun removePinnedApp(pkg: String) {
        val pinnedJson = prefs.getString(PREF_LAUNCHER_PINNED, "[]") ?: "[]"
        val updated = parseJsonArray(pinnedJson).filter { it != pkg }
        val newJson = "[${updated.joinToString(",") { "\"$it\"" }}]"
        prefs.edit().putString(PREF_LAUNCHER_PINNED, newJson).apply()
        refreshPinnedGrid()
    }

    private fun openAppInfo(pkg: String) {
        val intent = Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = android.net.Uri.parse("package:$pkg")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        try { startActivity(intent) } catch (_: Exception) {}
    }

    // ── Launch helpers ────────────────────────────────────────────────────────

    private fun launchApp(pkg: String) {
        val intent = packageManager.getLaunchIntentForPackage(pkg) ?: return
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try { startActivity(intent) } catch (_: Exception) {}
    }

    private fun launchBlockOverlay(pkg: String) {
        val intent = Intent(this, BlockOverlayActivity::class.java).apply {
            putExtra("blocked_package", pkg)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        try { startActivity(intent) } catch (_: Exception) {}
    }

    // ── Block-state helpers ───────────────────────────────────────────────────

    private fun getBlockedPackages(): Set<String> {
        val now = System.currentTimeMillis()
        val result = mutableSetOf<String>()

        val saActive = prefs.getBoolean(PREF_SA_ACTIVE, false)
        if (saActive) {
            val until = prefs.getLong(PREF_SA_UNTIL, 0L)
            if (until == 0L || now <= until) {
                result.addAll(parseJsonArray(prefs.getString(PREF_SA_PKGS, "[]") ?: "[]"))
            }
        }

        val alwaysActive = prefs.getBoolean(PREF_ALWAYS_BLOCK, false)
        if (alwaysActive) {
            result.addAll(parseJsonArray(prefs.getString(PREF_ALWAYS_BLOCK_PKGS, "[]") ?: "[]"))
        }

        return result
    }

    // ── Clock ─────────────────────────────────────────────────────────────────

    private fun startClock() {
        clockRunnable = object : Runnable {
            override fun run() {
                updateClockText()
                handler.postDelayed(this, 30_000L)
            }
        }
        handler.post(clockRunnable!!)
    }

    private fun updateClockText() {
        val now = Date()
        clockView?.text = SimpleDateFormat("h:mm", Locale.getDefault()).format(now)
        dateView?.text  = SimpleDateFormat("EEEE, MMMM d", Locale.getDefault()).format(now)
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

    private fun parseJsonArray(json: String): List<String> {
        return try {
            val arr = JSONArray(json)
            (0 until arr.length()).map { arr.getString(it) }
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density + 0.5f).toInt()
}
