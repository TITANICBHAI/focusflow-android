package com.tbtechs.focusflow.launcher

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Typeface
import android.graphics.drawable.Drawable
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.Editable
import android.text.TextWatcher
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.view.inputmethod.InputMethodManager
import android.widget.*
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.*

/**
 * FocusLauncherActivity
 *
 * Custom Android home screen.  Two operating modes:
 *
 *   UNLOCKED — no active block/focus session:
 *     - Shows user-selected app grid + permanent dock.
 *     - "All Apps" button opens a full alphabetical app drawer (with live search).
 *     - ⚙ Edit button lets the user add/remove apps from the curated grid.
 *     - Long-press power key passes through (normal system behaviour).
 *
 *   LOCKED — focus_active OR standalone_block_active is true:
 *     - App grid is shown but gear / All-Apps buttons are HIDDEN.
 *     - "🔒 Locked until HH:MM" banner shown.
 *     - Long-press power key is consumed → power menu cannot open.
 *
 * Permanent dock apps (Phone, WhatsApp, VLC, Settings) are always shown.
 * They are OEM-resolved at runtime (first installed variant wins).
 *
 * SharedPreferences (file: "focusday_prefs"):
 *   launcher_apps            String (JSON array) — user-selected grid packages
 *   focus_active             Boolean
 *   standalone_block_active  Boolean
 *   task_end_ms              Long
 *   standalone_block_until_ms Long
 */
class FocusLauncherActivity : Activity() {

    // ─── Constants ────────────────────────────────────────────────────────────

    companion object {
        const val PREFS_NAME        = "focusday_prefs"
        const val KEY_LAUNCHER_APPS = "launcher_apps"

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
        private const val SURFACE_COLOR  = 0xFF22222A.toInt()
    }

    // ─── State ────────────────────────────────────────────────────────────────

    private lateinit var prefs: SharedPreferences
    private var isBlocked = false

    private lateinit var timeView:    TextView
    private lateinit var dateView:    TextView
    private lateinit var statusBadge: TextView
    private lateinit var editBtn:     TextView
    private lateinit var allAppsBtn:  TextView
    private lateinit var appGrid:     RecyclerView
    private lateinit var dockRow:     LinearLayout

    private var userApps:   List<AppInfo> = emptyList()
    private var pinnedApps: List<AppInfo> = emptyList()
    private var allApps:    List<AppInfo> = emptyList()   // full device app list (loaded once)
    private var adapter:    AppGridAdapter? = null

    private val handler   = Handler(Looper.getMainLooper())
    private val clockTick = object : Runnable {
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

    override fun onBackPressed() { /* swallow — never exit the launcher */ }

    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        if (keyCode == KeyEvent.KEYCODE_POWER) {
            event.startTracking()
            return isBlocked
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onKeyLongPress(keyCode: Int, event: KeyEvent): Boolean {
        if (keyCode == KeyEvent.KEYCODE_POWER && isBlocked) return true
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

        // ── Clock / date / status ──────────────────────────────────────────────
        val topBar = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity     = Gravity.CENTER_HORIZONTAL
            setPadding(dp(24), dp(48), dp(24), dp(16))
        }

        timeView = TextView(this).apply {
            textSize = 64f
            setTextColor(TEXT_PRIMARY)
            typeface = Typeface.DEFAULT_BOLD
            gravity  = Gravity.CENTER
        }
        dateView = TextView(this).apply {
            textSize = 16f
            setTextColor(TEXT_SECONDARY)
            gravity  = Gravity.CENTER
            setPadding(0, dp(4), 0, 0)
        }
        statusBadge = TextView(this).apply {
            textSize   = 13f
            setTextColor(LOCKED_COLOR)
            gravity    = Gravity.CENTER
            setPadding(dp(16), dp(6), dp(16), dp(6))
            visibility = View.GONE
        }

        topBar.addView(timeView)
        topBar.addView(dateView)
        topBar.addView(statusBadge)

        // ── Action row: All Apps  |  Edit ─────────────────────────────────────
        val actionRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity     = Gravity.CENTER
            setPadding(dp(16), 0, dp(16), dp(8))
        }

        allAppsBtn = TextView(this).apply {
            text     = "⊞  All Apps"
            textSize = 13f
            setTextColor(ACCENT_COLOR)
            gravity  = Gravity.CENTER
            setPadding(dp(20), dp(10), dp(20), dp(10))
            setBackgroundColor(SURFACE_COLOR)
            setOnClickListener { openAllAppsDrawer() }
        }
        allAppsBtn.layoutParams = LinearLayout.LayoutParams(0,
            ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { marginEnd = dp(8) }

        editBtn = TextView(this).apply {
            text     = "⚙  Edit Grid"
            textSize = 13f
            setTextColor(TEXT_SECONDARY)
            gravity  = Gravity.CENTER
            setPadding(dp(20), dp(10), dp(20), dp(10))
            setBackgroundColor(SURFACE_COLOR)
            setOnClickListener { showAppPicker() }
        }
        editBtn.layoutParams = LinearLayout.LayoutParams(0,
            ViewGroup.LayoutParams.WRAP_CONTENT, 1f)

        actionRow.addView(allAppsBtn)
        actionRow.addView(editBtn)
        topBar.addView(actionRow)
        root.addView(topBar)

        // ── Divider ────────────────────────────────────────────────────────────
        root.addView(hairline())

        // ── App grid ───────────────────────────────────────────────────────────
        appGrid = RecyclerView(this).apply {
            layoutManager = GridLayoutManager(context, 4)
            layoutParams  = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0
            ).apply { weight = 1f }
            setPadding(dp(8), dp(12), dp(8), dp(12))
            clipToPadding = false
        }
        root.addView(appGrid)

        // ── Divider ────────────────────────────────────────────────────────────
        root.addView(hairline())

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

    private fun hairline() = View(this).apply {
        setBackgroundColor(0x1AFFFFFF)
        layoutParams = LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 1
        )
    }

    // ─── State refresh ────────────────────────────────────────────────────────

    private fun refreshAll() {
        checkBlockState()
        loadUserAndPinnedApps()
        refreshGrid()
        refreshDock()
        updateBlockUI()
    }

    private fun checkBlockState() {
        val now = System.currentTimeMillis()
        var focus = prefs.getBoolean("focus_active", false)
        var sa    = prefs.getBoolean("standalone_block_active", false)

        if (focus) {
            val endMs = prefs.getLong("task_end_ms", 0L)
            if (endMs > 0L && now > endMs) {
                prefs.edit().putBoolean("focus_active", false).apply()
                focus = false
            }
        }
        if (sa) {
            val untilMs = prefs.getLong("standalone_block_until_ms", 0L)
            if (untilMs > 0L && now > untilMs) {
                prefs.edit().putBoolean("standalone_block_active", false).apply()
                sa = false
            }
        }
        isBlocked = focus || sa
    }

    private fun loadUserAndPinnedApps() {
        val pm   = packageManager
        val json = prefs.getString(KEY_LAUNCHER_APPS, "[]") ?: "[]"
        userApps   = parseJsonArray(json).mapNotNull { resolveApp(pm, it) }
        pinnedApps = PINNED_GROUPS.mapNotNull { candidates ->
            candidates.firstNotNullOfOrNull { resolveApp(pm, it) }
        }
    }

    /** Loads all launchable apps sorted alphabetically — called lazily on first drawer open. */
    private fun ensureAllAppsLoaded() {
        if (allApps.isNotEmpty()) return
        val pm = packageManager
        allApps = pm.getInstalledApplications(PackageManager.GET_META_DATA)
            .filter { pm.getLaunchIntentForPackage(it.packageName) != null }
            .mapNotNull { info ->
                val label = pm.getApplicationLabel(info).toString()
                val icon  = try { pm.getApplicationIcon(info) } catch (_: Exception) { return@mapNotNull null }
                AppInfo(label, info.packageName, icon)
            }
            .sortedBy { it.label.lowercase(Locale.getDefault()) }
    }

    private fun resolveApp(pm: PackageManager, pkg: String): AppInfo? = try {
        val info  = pm.getApplicationInfo(pkg, 0)
        val label = pm.getApplicationLabel(info).toString()
        val icon  = pm.getApplicationIcon(info)
        AppInfo(label, pkg, icon)
    } catch (_: PackageManager.NameNotFoundException) { null }

    private fun refreshGrid() {
        if (adapter == null) {
            adapter = AppGridAdapter(userApps) { launchApp(it) }
            appGrid.adapter = adapter
        } else {
            adapter?.update(userApps)
        }
    }

    private fun refreshDock() {
        dockRow.removeAllViews()
        pinnedApps.forEach { dockRow.addView(buildDockCell(it)) }
    }

    private fun updateBlockUI() {
        // All Apps only available when unlocked
        allAppsBtn.visibility = if (!isBlocked) View.VISIBLE else View.GONE

        // Edit Grid is ALWAYS visible, but its label changes:
        //   Unlocked → "⚙  Edit Grid"  (add or remove)
        //   Locked   → "✕  Remove Apps" (remove-only)
        editBtn.visibility = View.VISIBLE
        if (isBlocked) {
            editBtn.text = "✕  Remove Apps"
            editBtn.setTextColor(LOCKED_COLOR)

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
            editBtn.text = "⚙  Edit Grid"
            editBtn.setTextColor(TEXT_SECONDARY)
            statusBadge.visibility = View.GONE
        }
    }

    // ─── Clock ────────────────────────────────────────────────────────────────

    private fun updateClock() {
        val now = Date()
        timeView.text = SimpleDateFormat("HH:mm",             Locale.getDefault()).format(now)
        dateView.text = SimpleDateFormat("EEEE, MMMM d",      Locale.getDefault()).format(now)

        val wasBlocked = isBlocked
        checkBlockState()
        if (wasBlocked != isBlocked) {
            loadUserAndPinnedApps()
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

    // ─── All-Apps drawer (UNLOCKED only) ─────────────────────────────────────

    private fun openAllAppsDrawer() {
        if (isBlocked) return
        ensureAllAppsLoaded()

        // Build the drawer dialog
        val ctx  = this
        val root = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(BG_COLOR)
        }

        // Search bar
        val searchBox = EditText(ctx).apply {
            hint        = "Search apps…"
            setHintTextColor(TEXT_SECONDARY)
            setTextColor(TEXT_PRIMARY)
            textSize    = 15f
            setBackgroundColor(SURFACE_COLOR)
            setPadding(dp(16), dp(12), dp(16), dp(12))
            maxLines    = 1
        }
        root.addView(searchBox)

        // App list
        val listView = RecyclerView(ctx).apply {
            layoutManager = androidx.recyclerview.widget.LinearLayoutManager(ctx)
        }
        root.addView(listView)

        var currentList = allApps.toList()
        val drawerAdapter = DrawerAdapter(currentList) { pkg ->
            launchApp(pkg)
        }
        listView.adapter = drawerAdapter

        searchBox.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, st: Int, c: Int, a: Int) {}
            override fun onTextChanged(s: CharSequence?, st: Int, b: Int, c: Int) {}
            override fun afterTextChanged(s: Editable?) {
                val q = s?.toString()?.lowercase(Locale.getDefault()) ?: ""
                currentList = if (q.isEmpty()) allApps
                              else allApps.filter { it.label.lowercase(Locale.getDefault()).contains(q) }
                drawerAdapter.update(currentList)
            }
        })

        val dialog = AlertDialog.Builder(ctx, android.R.style.Theme_Material_Dialog_Alert)
            .setView(root)
            .setNegativeButton("Close", null)
            .create()

        dialog.window?.apply {
            setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
            setBackgroundDrawableResource(android.R.color.transparent)
        }

        dialog.setOnDismissListener {
            // Hide keyboard if open
            val imm = getSystemService(INPUT_METHOD_SERVICE) as? InputMethodManager
            imm?.hideSoftInputFromWindow(searchBox.windowToken, 0)
        }

        dialog.show()
    }

    // ─── App grid editor ──────────────────────────────────────────────────────
    //
    //   UNLOCKED: full add + remove (all installed apps shown, any can be toggled)
    //   LOCKED:   remove-only — only currently-selected apps are shown, and they
    //             can only be unchecked (not new ones checked in)

    private fun showAppPicker() {
        val pm           = packageManager
        val pinnedPkgSet = pinnedApps.map { it.packageName }.toSet()
        val currentPkgs  = parseJsonArray(prefs.getString(KEY_LAUNCHER_APPS, "[]") ?: "[]").toMutableSet()

        // Which apps to display in the list depends on lock state:
        //   Unlocked → every launchable app (minus pinned dock apps)
        //   Locked   → only the apps already in the grid (so user can only uncheck)
        val candidateApps: List<AppInfo> = if (!isBlocked) {
            pm.getInstalledApplications(PackageManager.GET_META_DATA)
                .filter { pm.getLaunchIntentForPackage(it.packageName) != null }
                .mapNotNull { info ->
                    val label = pm.getApplicationLabel(info).toString()
                    val icon  = try { pm.getApplicationIcon(info) } catch (_: Exception) { return@mapNotNull null }
                    AppInfo(label, info.packageName, icon)
                }
                .filter { it.packageName !in pinnedPkgSet }
                .sortedBy { it.label.lowercase(Locale.getDefault()) }
        } else {
            // Locked: only show apps already in the grid
            userApps.filter { it.packageName !in pinnedPkgSet }
                .sortedBy { it.label.lowercase(Locale.getDefault()) }
        }

        if (candidateApps.isEmpty()) {
            android.widget.Toast.makeText(
                this,
                if (isBlocked) "No apps in your grid to remove." else "No apps found.",
                android.widget.Toast.LENGTH_SHORT
            ).show()
            return
        }

        val labels   = candidateApps.map { it.label }.toTypedArray()
        val checked  = candidateApps.map { it.packageName in currentPkgs }.toBooleanArray()
        val selected = checked.toMutableList()

        val title = if (isBlocked) "Remove Apps from Grid" else "Edit Grid Apps"

        val builder = AlertDialog.Builder(this, android.R.style.Theme_Material_Dialog_Alert)
            .setTitle(title)
            .setMultiChoiceItems(labels, checked) { _, which, isChecked ->
                if (isBlocked && isChecked) {
                    // During lock: silently refuse to add; keep it unchecked.
                    // The dialog doesn't expose a direct way to set the check state here,
                    // so we revert immediately in onDismiss via the saved `selected` list.
                    selected[which] = false
                } else {
                    selected[which] = isChecked
                }
            }
            .setPositiveButton("Save") { _, _ ->
                val newPkgs = candidateApps.indices
                    .filter { selected[it] }
                    .map { candidateApps[it].packageName }

                if (isBlocked) {
                    // Merge: keep any existing app that isn't in candidateApps
                    // (i.e., items the locked list didn't show), then add what's still checked.
                    val shown     = candidateApps.map { it.packageName }.toSet()
                    val untouched = currentPkgs.filter { it !in shown }
                    saveSelectedApps(untouched + newPkgs)
                } else {
                    saveSelectedApps(newPkgs)
                }
            }
            .setNegativeButton("Cancel", null)

        if (isBlocked) {
            builder.setMessage("You can only remove apps while a block is active.")
        }

        builder.show()
    }

    private fun saveSelectedApps(packages: List<String>) {
        val json = JSONArray(packages).toString()
        prefs.edit().putString(KEY_LAUNCHER_APPS, json).apply()
        loadUserAndPinnedApps()
        refreshGrid()
    }

    // ─── View helpers ─────────────────────────────────────────────────────────

    private fun buildDockCell(app: AppInfo): LinearLayout {
        val size = dp(56)
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity     = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
            setPadding(dp(4), dp(8), dp(4), dp(8))
            setOnClickListener { launchApp(app.packageName) }
            addView(ImageView(context).apply {
                setImageDrawable(app.icon)
                layoutParams = LinearLayout.LayoutParams(size, size)
                scaleType    = ImageView.ScaleType.FIT_CENTER
            })
            addView(TextView(context).apply {
                text      = app.label
                textSize  = 10f
                setTextColor(TEXT_PRIMARY)
                gravity   = Gravity.CENTER
                maxLines  = 1
                ellipsize = android.text.TextUtils.TruncateAt.END
                setPadding(0, dp(4), 0, 0)
            })
        }
    }

    private fun dp(v: Int) = (v * resources.displayMetrics.density + 0.5f).toInt()

    private fun parseJsonArray(json: String): List<String> = try {
        val arr = JSONArray(json)
        (0 until arr.length()).map { arr.getString(it) }
    } catch (_: Exception) { emptyList() }

    // ─── Data ─────────────────────────────────────────────────────────────────

    data class AppInfo(val label: String, val packageName: String, val icon: Drawable)

    // ─── Grid adapter ─────────────────────────────────────────────────────────

    inner class AppGridAdapter(
        private var items: List<AppInfo>,
        private val onClick: (String) -> Unit,
    ) : RecyclerView.Adapter<AppGridAdapter.VH>() {

        fun update(newItems: List<AppInfo>) { items = newItems; notifyDataSetChanged() }

        override fun onCreateViewHolder(parent: ViewGroup, vt: Int): VH {
            val cell = LinearLayout(parent.context).apply {
                orientation = LinearLayout.VERTICAL
                gravity     = Gravity.CENTER
                layoutParams = RecyclerView.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
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
            cell.addView(icon); cell.addView(label)
            return VH(cell, icon, label)
        }

        override fun onBindViewHolder(h: VH, pos: Int) {
            val app = items[pos]
            h.icon.setImageDrawable(app.icon)
            h.label.text = app.label
            h.root.setOnClickListener { onClick(app.packageName) }
        }

        override fun getItemCount() = items.size

        inner class VH(val root: LinearLayout, val icon: ImageView, val label: TextView) :
            RecyclerView.ViewHolder(root)
    }

    // ─── Drawer list adapter (row layout: icon + label) ───────────────────────

    inner class DrawerAdapter(
        private var items: List<AppInfo>,
        private val onClick: (String) -> Unit,
    ) : RecyclerView.Adapter<DrawerAdapter.VH>() {

        fun update(newItems: List<AppInfo>) { items = newItems; notifyDataSetChanged() }

        override fun onCreateViewHolder(parent: ViewGroup, vt: Int): VH {
            val row = LinearLayout(parent.context).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity     = Gravity.CENTER_VERTICAL
                layoutParams = RecyclerView.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, dp(64)
                )
                setPadding(dp(16), 0, dp(16), 0)
            }
            val icon = ImageView(parent.context).apply {
                layoutParams = LinearLayout.LayoutParams(dp(40), dp(40))
                scaleType    = ImageView.ScaleType.FIT_CENTER
            }
            val label = TextView(parent.context).apply {
                textSize = 15f
                setTextColor(TEXT_PRIMARY)
                maxLines = 1
                ellipsize = android.text.TextUtils.TruncateAt.END
                setPadding(dp(16), 0, 0, 0)
            }
            row.addView(icon); row.addView(label)
            return VH(row, icon, label)
        }

        override fun onBindViewHolder(h: VH, pos: Int) {
            val app = items[pos]
            h.icon.setImageDrawable(app.icon)
            h.label.text = app.label
            h.row.setOnClickListener { onClick(app.packageName) }
        }

        override fun getItemCount() = items.size

        inner class VH(val row: LinearLayout, val icon: ImageView, val label: TextView) :
            RecyclerView.ViewHolder(row)
    }
}
