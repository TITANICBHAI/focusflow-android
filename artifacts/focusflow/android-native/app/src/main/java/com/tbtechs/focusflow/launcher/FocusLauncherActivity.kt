package com.tbtechs.focusflow.launcher

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.Drawable
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.*
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.*

/**
 * FocusLauncherActivity
 *
 * A locked-down Android home screen (launcher) that restricts which apps the
 * user can open.  Two operating modes:
 *
 *   UNLOCKED — no active block/focus session:
 *     - Shows user-selected apps + always-present pinned apps in the dock.
 *     - Gear icon lets the user add/remove launcher apps.
 *     - Long-press power key is NOT consumed (normal system behaviour).
 *
 *   LOCKED — focus_active OR standalone_block_active is true:
 *     - Same grid but the gear icon is hidden.
 *     - Displays a "Locked until HH:MM" status banner.
 *     - Long-press power key is consumed → prevents the power menu appearing.
 *     - List of launcher apps cannot be changed from within the launcher.
 *
 * Permanent dock apps (Phone, WhatsApp, VLC, Settings) are ALWAYS shown
 * regardless of lock state.  They cannot be blocked or removed by the user.
 *
 * SharedPreferences (file: "focusday_prefs"):
 *   launcher_apps      String (JSON array)  — user-selected package names
 *   focus_active       Boolean              — task focus running?
 *   standalone_block_active Boolean         — standalone block running?
 *   task_end_ms        Long                 — task session expiry
 *   standalone_block_until_ms Long          — standalone block expiry
 */
class FocusLauncherActivity : Activity() {

    // ─── Constants ────────────────────────────────────────────────────────────

    companion object {
        const val PREFS_NAME       = "focusday_prefs"
        const val KEY_LAUNCHER_APPS = "launcher_apps"

        // Ordered candidate lists for pinned dock apps — first installed one wins.
        val PHONE_PKGS: List<String> = listOf(
            "com.google.android.dialer",
            "com.android.dialer",
            "com.samsung.android.app.telephonyui",
            "com.miui.dialer",
            "com.oneplus.dialer",
            "com.coloros.dialer",
            "com.vivo.phone",
        )
        val WHATSAPP_PKGS: List<String> = listOf("com.whatsapp", "com.whatsapp.w4b")
        val VLC_PKGS: List<String>      = listOf("org.videolan.vlc", "org.videolan.vlc.betav")
        val SETTINGS_PKGS: List<String> = listOf(
            "com.android.settings",
            "com.samsung.android.app.settings",
            "com.miui.settings",
        )

        private val PINNED_GROUPS: List<List<String>> = listOf(
            PHONE_PKGS, WHATSAPP_PKGS, VLC_PKGS, SETTINGS_PKGS
        )

        // Colour palette
        private const val BG_COLOR       = 0xFF0D0D0F.toInt()
        private const val CARD_COLOR     = 0xFF1A1A1F.toInt()
        private const val ACCENT_COLOR   = 0xFF6366F1.toInt()
        private const val TEXT_PRIMARY   = 0xFFFFFFFF.toInt()
        private const val TEXT_SECONDARY = 0xFF9CA3AF.toInt()
        private const val LOCKED_COLOR   = 0xFFEF4444.toInt()
    }

    // ─── State ────────────────────────────────────────────────────────────────

    private lateinit var prefs: SharedPreferences
    private var isBlocked = false

    // Views
    private lateinit var timeView:    TextView
    private lateinit var dateView:    TextView
    private lateinit var statusBadge: TextView
    private lateinit var editBtn:     TextView
    private lateinit var appGrid:     RecyclerView
    private lateinit var dockRow:     LinearLayout

    // Data
    private var userApps:   List<AppInfo> = emptyList()
    private var pinnedApps: List<AppInfo> = emptyList()
    private var adapter:    AppGridAdapter? = null

    // Clock
    private val handler     = Handler(Looper.getMainLooper())
    private val clockTick   = object : Runnable {
        override fun run() {
            updateClock()
            handler.postDelayed(this, 1_000L)
        }
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
          or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
          or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        )
        window.statusBarColor     = BG_COLOR
        window.navigationBarColor = BG_COLOR

        prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        buildUI()
    }

    override fun onResume() {
        super.onResume()
        refreshAll()
        handler.post(clockTick)
    }

    override fun onPause() {
        super.onPause()
        handler.removeCallbacks(clockTick)
    }

    override fun onBackPressed() {
        // Swallow back — never exit the launcher
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        if (keyCode == KeyEvent.KEYCODE_POWER) {
            event.startTracking()
            return isBlocked  // consume only when locked
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onKeyLongPress(keyCode: Int, event: KeyEvent): Boolean {
        if (keyCode == KeyEvent.KEYCODE_POWER && isBlocked) {
            return true  // consume long-press power → suppresses power menu in launcher
        }
        return super.onKeyLongPress(keyCode, event)
    }

    // ─── UI construction ──────────────────────────────────────────────────────

    private fun buildUI() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(BG_COLOR)
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        // ── Top bar: time, date, status ────────────────────────────────────────
        val topBar = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity     = Gravity.CENTER_HORIZONTAL
            setPadding(dp(24), dp(48), dp(24), dp(20))
        }

        timeView = TextView(this).apply {
            textSize  = 64f
            setTextColor(TEXT_PRIMARY)
            typeface  = Typeface.DEFAULT_BOLD
            gravity   = Gravity.CENTER
        }
        dateView = TextView(this).apply {
            textSize  = 16f
            setTextColor(TEXT_SECONDARY)
            gravity   = Gravity.CENTER
            setPadding(0, dp(4), 0, 0)
        }
        statusBadge = TextView(this).apply {
            textSize  = 13f
            setTextColor(LOCKED_COLOR)
            gravity   = Gravity.CENTER
            setPadding(dp(16), dp(6), dp(16), dp(6))
            visibility = View.GONE
        }

        topBar.addView(timeView)
        topBar.addView(dateView)
        topBar.addView(statusBadge)

        // ── Edit / gear button ─────────────────────────────────────────────────
        editBtn = TextView(this).apply {
            text      = "⚙  Edit Apps"
            textSize  = 13f
            setTextColor(ACCENT_COLOR.toLong().toInt())
            gravity   = Gravity.CENTER
            setPadding(dp(16), dp(8), dp(16), dp(8))
            setOnClickListener { showAppPicker() }
        }
        topBar.addView(editBtn)
        root.addView(topBar)

        // ── Divider ────────────────────────────────────────────────────────────
        root.addView(View(this).apply {
            setBackgroundColor(0x1AFFFFFF)
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 1
            )
        })

        // ── App grid ───────────────────────────────────────────────────────────
        appGrid = RecyclerView(this).apply {
            layoutManager = GridLayoutManager(context, 4)
            layoutParams  = LinearLayout.LayoutParams(0, 0).apply {
                width  = ViewGroup.LayoutParams.MATCH_PARENT
                height = 0
                weight = 1f
            }
            setPadding(dp(8), dp(12), dp(8), dp(12))
            clipToPadding = false
        }
        root.addView(appGrid)

        // ── Divider ────────────────────────────────────────────────────────────
        root.addView(View(this).apply {
            setBackgroundColor(0x1AFFFFFF)
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 1
            )
        })

        // ── Dock ──────────────────────────────────────────────────────────────
        dockRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity     = Gravity.CENTER
            setPadding(dp(8), dp(12), dp(8), dp(28))
            setBackgroundColor(CARD_COLOR)
        }
        root.addView(dockRow)

        setContentView(root)
    }

    // ─── State refresh ────────────────────────────────────────────────────────

    private fun refreshAll() {
        checkBlockState()
        loadApps()
        refreshGrid()
        refreshDock()
        updateBlockUI()
    }

    private fun checkBlockState() {
        val now        = System.currentTimeMillis()
        var focus      = prefs.getBoolean("focus_active", false)
        var sa         = prefs.getBoolean("standalone_block_active", false)

        // Auto-expire focus
        if (focus) {
            val endMs = prefs.getLong("task_end_ms", 0L)
            if (endMs > 0L && now > endMs) {
                prefs.edit().putBoolean("focus_active", false).apply()
                focus = false
            }
        }
        // Auto-expire standalone
        if (sa) {
            val untilMs = prefs.getLong("standalone_block_until_ms", 0L)
            if (untilMs > 0L && now > untilMs) {
                prefs.edit().putBoolean("standalone_block_active", false).apply()
                sa = false
            }
        }
        isBlocked = focus || sa
    }

    private fun loadApps() {
        val pm = packageManager

        // User-selected apps from SharedPrefs
        val json = prefs.getString(KEY_LAUNCHER_APPS, "[]") ?: "[]"
        val pkgs = parseJsonArray(json)
        userApps = pkgs.mapNotNull { pkg -> resolveApp(pm, pkg) }

        // Pinned dock apps
        pinnedApps = PINNED_GROUPS.mapNotNull { candidates ->
            candidates.firstNotNullOfOrNull { pkg -> resolveApp(pm, pkg) }
        }
    }

    private fun resolveApp(pm: PackageManager, pkg: String): AppInfo? {
        return try {
            val info  = pm.getApplicationInfo(pkg, 0)
            val label = pm.getApplicationLabel(info).toString()
            val icon  = pm.getApplicationIcon(info)
            AppInfo(label, pkg, icon)
        } catch (_: PackageManager.NameNotFoundException) { null }
    }

    private fun refreshGrid() {
        if (adapter == null) {
            adapter = AppGridAdapter(userApps) { pkg -> launchApp(pkg) }
            appGrid.adapter = adapter
        } else {
            adapter?.update(userApps)
        }
    }

    private fun refreshDock() {
        dockRow.removeAllViews()
        pinnedApps.forEach { app ->
            dockRow.addView(buildAppCell(app, size = dp(56), labelSize = 10f))
        }
    }

    private fun updateBlockUI() {
        editBtn.visibility = if (isBlocked) View.GONE else View.VISIBLE

        if (isBlocked) {
            val untilMs = maxOf(
                prefs.getLong("task_end_ms", 0L),
                prefs.getLong("standalone_block_until_ms", 0L)
            )
            val label = if (untilMs > 0L) {
                val fmt = SimpleDateFormat("HH:mm, MMM d", Locale.getDefault())
                "🔒  Locked until ${fmt.format(Date(untilMs))}"
            } else {
                "🔒  Locked"
            }
            statusBadge.text       = label
            statusBadge.visibility = View.VISIBLE
        } else {
            statusBadge.visibility = View.GONE
        }
    }

    // ─── Clock ────────────────────────────────────────────────────────────────

    private fun updateClock() {
        val now  = Date()
        timeView.text = SimpleDateFormat("HH:mm", Locale.getDefault()).format(now)
        dateView.text = SimpleDateFormat("EEEE, MMMM d", Locale.getDefault()).format(now)

        // Re-check block expiry every clock tick so the UI unlocks automatically
        val wasBlocked = isBlocked
        checkBlockState()
        if (wasBlocked != isBlocked) {
            loadApps()
            refreshGrid()
            refreshDock()
            updateBlockUI()
        }
    }

    // ─── App launching ────────────────────────────────────────────────────────

    private fun launchApp(pkg: String) {
        val intent = packageManager.getLaunchIntentForPackage(pkg) ?: return
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try { startActivity(intent) } catch (_: Exception) {}
    }

    // ─── App picker (UNLOCKED only) ───────────────────────────────────────────

    private fun showAppPicker() {
        if (isBlocked) return

        val pm        = packageManager
        val allApps   = pm.getInstalledApplications(PackageManager.GET_META_DATA)
            .filter { it.flags and ApplicationInfo.FLAG_SYSTEM == 0 || pm.getLaunchIntentForPackage(it.packageName) != null }
            .mapNotNull { info ->
                val label  = pm.getApplicationLabel(info).toString()
                val intent = pm.getLaunchIntentForPackage(info.packageName) ?: return@mapNotNull null
                AppInfo(label, info.packageName, pm.getApplicationIcon(info))
            }
            .sortedBy { it.label.lowercase() }

        // Current selection
        val currentPkgs = parseJsonArray(prefs.getString(KEY_LAUNCHER_APPS, "[]") ?: "[]").toMutableSet()
        // Exclude pinned apps — they're always there
        val pinnedPkgSet = pinnedApps.map { it.packageName }.toSet()

        val filteredApps = allApps.filter { it.packageName !in pinnedPkgSet }
        val labels       = filteredApps.map { it.label }.toTypedArray()
        val checked      = filteredApps.map { it.packageName in currentPkgs }.toBooleanArray()
        val selected     = checked.toMutableList()

        AlertDialog.Builder(this, android.R.style.Theme_Material_Dialog_Alert)
            .setTitle("Select Launcher Apps")
            .setMultiChoiceItems(labels, checked) { _, which, isChecked ->
                selected[which] = isChecked
            }
            .setPositiveButton("Save") { _, _ ->
                val newPkgs = filteredApps.indices
                    .filter { selected[it] }
                    .map { filteredApps[it].packageName }
                saveSelectedApps(newPkgs)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun saveSelectedApps(packages: List<String>) {
        val json = JSONArray(packages).toString()
        prefs.edit().putString(KEY_LAUNCHER_APPS, json).apply()
        loadApps()
        refreshGrid()
    }

    // ─── View helpers ─────────────────────────────────────────────────────────

    private fun buildAppCell(app: AppInfo, size: Int = dp(52), labelSize: Float = 11f): LinearLayout {
        val cell = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity     = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
            setPadding(dp(4), dp(8), dp(4), dp(8))
            setOnClickListener { launchApp(app.packageName) }
        }
        val icon = ImageView(this).apply {
            setImageDrawable(app.icon)
            layoutParams = LinearLayout.LayoutParams(size, size)
            scaleType    = ImageView.ScaleType.FIT_CENTER
        }
        val label = TextView(this).apply {
            text      = app.label
            textSize  = labelSize
            setTextColor(TEXT_PRIMARY)
            gravity   = Gravity.CENTER
            maxLines  = 1
            ellipsize = android.text.TextUtils.TruncateAt.END
            setPadding(0, dp(4), 0, 0)
        }
        cell.addView(icon)
        cell.addView(label)
        return cell
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density + 0.5f).toInt()

    private fun parseJsonArray(json: String): List<String> {
        return try {
            val arr = JSONArray(json)
            (0 until arr.length()).map { arr.getString(it) }
        } catch (_: Exception) { emptyList() }
    }

    // ─── Data ─────────────────────────────────────────────────────────────────

    data class AppInfo(val label: String, val packageName: String, val icon: Drawable)

    // ─── RecyclerView adapter ─────────────────────────────────────────────────

    inner class AppGridAdapter(
        private var items: List<AppInfo>,
        private val onClick: (String) -> Unit,
    ) : RecyclerView.Adapter<AppGridAdapter.VH>() {

        fun update(newItems: List<AppInfo>) {
            items = newItems
            notifyDataSetChanged()
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
            val cell = LinearLayout(parent.context).apply {
                orientation = LinearLayout.VERTICAL
                gravity     = Gravity.CENTER
                layoutParams = RecyclerView.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                )
                setPadding(dp(4), dp(10), dp(4), dp(10))
            }
            val icon = ImageView(parent.context).apply {
                layoutParams = LinearLayout.LayoutParams(dp(52), dp(52))
                scaleType    = ImageView.ScaleType.FIT_CENTER
            }
            val label = TextView(parent.context).apply {
                textSize  = 11f
                setTextColor(TEXT_PRIMARY)
                gravity   = Gravity.CENTER
                maxLines  = 1
                ellipsize = android.text.TextUtils.TruncateAt.END
                setPadding(0, dp(4), 0, 0)
            }
            cell.addView(icon)
            cell.addView(label)
            return VH(cell, icon, label)
        }

        override fun onBindViewHolder(holder: VH, position: Int) {
            val app = items[position]
            holder.icon.setImageDrawable(app.icon)
            holder.label.text = app.label
            holder.root.setOnClickListener { onClick(app.packageName) }
        }

        override fun getItemCount() = items.size

        inner class VH(val root: LinearLayout, val icon: ImageView, val label: TextView) :
            RecyclerView.ViewHolder(root)
    }
}
