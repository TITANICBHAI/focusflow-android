package com.tbtechs.focusflow.services

import android.app.Activity
import android.app.AlertDialog
import android.app.WallpaperManager
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.LayerDrawable
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
import android.view.WindowManager
import android.view.animation.AccelerateInterpolator
import android.view.animation.DecelerateInterpolator
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.GridLayout
import android.widget.HorizontalScrollView
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * LauncherActivity — FocusFlow's full home-screen replacement.
 *
 * Layout (top → bottom):
 *   ┌─────────────────────────────────┐
 *   │  Date (small, muted)            │
 *   │  Clock (large, bold)            │
 *   │  AM/PM + day-of-week            │
 *   │                                 │
 *   │  ┌── Home screen grid ───────┐  │
 *   │  │  4-column icon grid of    │  │
 *   │  │  home-screen shortcuts    │  │
 *   │  └───────────────────────────┘  │
 *   │                                 │
 *   │  ─── ─── ─── (divider) ─── ─── │
 *   │  [ dock: up to 5 apps ]         │
 *   └─────────────────────────────────┘
 *
 * Swipe UP → opens full-screen app drawer (bottom-sheet style, animated).
 * App drawer has: search bar + alphabetical sections + 5-column grid.
 * Long-press home icon → Remove / Add to Dock / App Info.
 * Long-press dock icon → Remove from Dock / App Info.
 * Long-press empty space → Add Apps to Home Screen dialog.
 * Long-press drawer icon → Add to Home / Add to Dock / App Info.
 */
class LauncherActivity : Activity() {

    companion object {
        private const val PREFS_NAME            = AppBlockerAccessibilityService.PREFS_NAME
        private const val PREF_LAUNCHER_HIDDEN  = "launcher_hidden_packages"
        private const val PREF_LAUNCHER_PINNED  = "launcher_pinned_packages"
        private const val PREF_LAUNCHER_DOCK    = "launcher_dock_packages"
        private const val PREF_SA_ACTIVE        = AppBlockerAccessibilityService.PREF_SA_ACTIVE
        private const val PREF_SA_PKGS          = AppBlockerAccessibilityService.PREF_SA_PKGS
        private const val PREF_SA_UNTIL         = AppBlockerAccessibilityService.PREF_SA_UNTIL
        private const val PREF_ALWAYS_BLOCK     = AppBlockerAccessibilityService.PREF_ALWAYS_BLOCK
        private const val PREF_ALWAYS_BLOCK_PKGS = AppBlockerAccessibilityService.PREF_ALWAYS_BLOCK_PKGS
        private const val OWN_PACKAGE           = "com.tbtechs.focusflow"

        private val ACCENT      = Color.parseColor("#6366f1")
        private val SCRIM_COLOR = Color.parseColor("#99000000")
        private val DRAWER_BG   = Color.parseColor("#F2111827")
        private val TEXT_DIM    = Color.parseColor("#AAAACC")
        private val TEXT_MUTED  = Color.parseColor("#667799")
        private val DOCK_DIVIDER = Color.parseColor("#33FFFFFF")
    }

    private lateinit var prefs: SharedPreferences
    private val handler = Handler(Looper.getMainLooper())
    private var clockRunnable: Runnable? = null

    private lateinit var rootFrame: FrameLayout
    private var clockView: TextView? = null
    private var ampmView: TextView? = null
    private var dateView: TextView? = null
    private var homeGrid: GridLayout? = null
    private var dockRow: LinearLayout? = null
    private var drawerOverlay: FrameLayout? = null
    private var isDrawerOpen = false
    private var swipeTouchStartY = 0f

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WALLPAPER)
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        rootFrame = FrameLayout(this)
        setContentView(rootFrame)

        buildHomeLayout()
        startClock()
    }

    override fun onResume() {
        super.onResume()
        refreshHomeGrid()
        refreshDock()
    }

    override fun onDestroy() {
        super.onDestroy()
        clockRunnable?.let { handler.removeCallbacks(it) }
    }

    override fun onBackPressed() {
        if (isDrawerOpen) closeDrawer()
        // Intentionally swallow back — no parent activity on home screen
    }

    // ── Home layout ───────────────────────────────────────────────────────────

    private fun buildHomeLayout() {
        // Wallpaper scrim — dark translucent overlay so text is always readable
        // The actual wallpaper is shown by FLAG_SHOW_WALLPAPER above.
        val scrim = View(this).apply {
            setBackgroundColor(SCRIM_COLOR)
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }
        rootFrame.addView(scrim)

        // Root column
        val column = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }

        // ── Clock widget ──────────────────────────────────────────────────────
        val clockWidget = buildClockWidget()
        column.addView(clockWidget)

        // ── Home screen grid (scrollable) ─────────────────────────────────────
        val gridScroll = ScrollView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f
            )
            isVerticalScrollBarEnabled = false
        }

        homeGrid = GridLayout(this).apply {
            columnCount = 4
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            setPadding(dp(12), dp(16), dp(12), dp(16))
        }
        gridScroll.addView(homeGrid)

        // Long-press on scroll area (empty space) → add apps dialog
        gridScroll.setOnLongClickListener {
            showAddToHomeDialog()
            true
        }

        column.addView(gridScroll)

        // ── Dock area ─────────────────────────────────────────────────────────
        column.addView(buildDockArea())

        rootFrame.addView(column)

        // ── Swipe-up gesture to open drawer ───────────────────────────────────
        rootFrame.setOnTouchListener { _, ev ->
            when (ev.action) {
                MotionEvent.ACTION_DOWN -> {
                    swipeTouchStartY = ev.rawY
                    false
                }
                MotionEvent.ACTION_UP -> {
                    val dy = swipeTouchStartY - ev.rawY
                    if (dy > dp(60) && !isDrawerOpen) {
                        openDrawer()
                        true
                    } else false
                }
                else -> false
            }
        }

        refreshHomeGrid()
        refreshDock()
    }

    private fun buildClockWidget(): LinearLayout {
        val wrap = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).also { it.topMargin = dp(48); it.bottomMargin = dp(12) }
        }

        // Day of week + date
        dateView = TextView(this).apply {
            textSize = 13f
            setTextColor(TEXT_DIM)
            gravity = Gravity.CENTER
            letterSpacing = 0.12f
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }
        wrap.addView(dateView)

        // Time row (clock + AM/PM)
        val timeRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL or Gravity.CENTER_HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).also { it.topMargin = dp(4) }
        }

        clockView = TextView(this).apply {
            textSize = 72f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        ampmView = TextView(this).apply {
            textSize = 20f
            setTextColor(TEXT_DIM)
            gravity = Gravity.BOTTOM
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).also { it.bottomMargin = dp(14); it.leftMargin = dp(6) }
        }

        timeRow.addView(clockView)
        timeRow.addView(ampmView)
        wrap.addView(timeRow)

        updateClockText()
        return wrap
    }

    private fun buildDockArea(): LinearLayout {
        val dockWrapper = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        // Divider line above dock
        val divider = View(this).apply {
            setBackgroundColor(DOCK_DIVIDER)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(1)
            ).also { it.setMargins(dp(24), 0, dp(24), 0) }
        }
        dockWrapper.addView(divider)

        // Swipe-up hint row
        val hintRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).also { it.topMargin = dp(6) }
        }
        val hint = TextView(this).apply {
            text = "⌃  All Apps"
            textSize = 11f
            setTextColor(TEXT_MUTED)
            gravity = Gravity.CENTER
        }
        hintRow.addView(hint)
        dockWrapper.addView(hintRow)

        // Dock icon row
        dockRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).also {
                it.topMargin = dp(8)
                it.bottomMargin = dp(20)
            }
        }
        dockWrapper.addView(dockRow)

        return dockWrapper
    }

    // ── Refresh home grid ──────────────────────────────────────────────────────

    private fun refreshHomeGrid() {
        val grid = homeGrid ?: return
        grid.removeAllViews()

        val pinnedJson = prefs.getString(PREF_LAUNCHER_PINNED, "[]") ?: "[]"
        val pinned = parseJsonArray(pinnedJson)
        val blocked = getBlockedPackages()

        for (pkg in pinned) {
            addHomeGridIcon(grid, pkg, blocked.contains(pkg))
        }
    }

    private fun addHomeGridIcon(parent: GridLayout, pkg: String, isBlocked: Boolean) {
        val pm = packageManager
        val appInfo = try { pm.getApplicationInfo(pkg, 0) } catch (_: Exception) { return }
        val label = pm.getApplicationLabel(appInfo).toString()
        val icon  = try { pm.getApplicationIcon(pkg) } catch (_: Exception) { return }

        val colSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f)
        val item = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            val lp = GridLayout.LayoutParams(colSpec, colSpec)
            lp.width = 0
            lp.height = GridLayout.LayoutParams.WRAP_CONTENT
            lp.setMargins(dp(6), dp(10), dp(6), dp(10))
            layoutParams = lp
        }

        val iconBg = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(Color.parseColor(if (isBlocked) "#33FFFFFF" else "#22FFFFFF"))
        }

        val iconFrame = FrameLayout(this).apply {
            background = iconBg
            layoutParams = LinearLayout.LayoutParams(dp(56), dp(56))
        }

        val iconView = ImageView(this).apply {
            setImageDrawable(icon)
            alpha = if (isBlocked) 0.32f else 1f
            layoutParams = FrameLayout.LayoutParams(dp(44), dp(44)).also {
                it.gravity = Gravity.CENTER
            }
        }
        iconFrame.addView(iconView)

        // Blocked badge dot
        if (isBlocked) {
            val dot = View(this).apply {
                background = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setColor(Color.parseColor("#EF4444"))
                }
                layoutParams = FrameLayout.LayoutParams(dp(8), dp(8)).also {
                    it.gravity = Gravity.TOP or Gravity.END
                    it.topMargin = dp(2); it.rightMargin = dp(2)
                }
            }
            iconFrame.addView(dot)
        }

        val labelView = TextView(this).apply {
            text = label
            textSize = 11f
            setTextColor(if (isBlocked) TEXT_MUTED else Color.WHITE)
            gravity = Gravity.CENTER
            maxLines = 1
            ellipsize = TextUtils.TruncateAt.END
            setShadowLayer(2f, 0f, 1f, Color.parseColor("#88000000"))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).also { it.topMargin = dp(4) }
        }

        item.addView(iconFrame)
        item.addView(labelView)

        item.setOnClickListener {
            if (isBlocked) launchBlockOverlay(pkg) else launchApp(pkg)
        }

        item.setOnLongClickListener {
            showHomeIconMenu(pkg, label)
            true
        }

        parent.addView(item)
    }

    // ── Refresh dock ──────────────────────────────────────────────────────────

    private fun refreshDock() {
        val row = dockRow ?: return
        row.removeAllViews()

        val dockJson = prefs.getString(PREF_LAUNCHER_DOCK, "[]") ?: "[]"
        val dockPkgs = parseJsonArray(dockJson)
        val blocked  = getBlockedPackages()

        for (pkg in dockPkgs.take(5)) {
            addDockIcon(row, pkg, blocked.contains(pkg))
        }
    }

    private fun addDockIcon(parent: LinearLayout, pkg: String, isBlocked: Boolean) {
        val pm = packageManager
        val appInfo = try { pm.getApplicationInfo(pkg, 0) } catch (_: Exception) { return }
        val label = pm.getApplicationLabel(appInfo).toString()
        val icon  = try { pm.getApplicationIcon(pkg) } catch (_: Exception) { return }

        val item = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }

        val bgDrawable = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(Color.parseColor(if (isBlocked) "#22FFFFFF" else "#33FFFFFF"))
        }

        val iconFrame = FrameLayout(this).apply {
            background = bgDrawable
            layoutParams = LinearLayout.LayoutParams(dp(58), dp(58)).also {
                it.gravity = Gravity.CENTER_HORIZONTAL
            }
        }

        val iconView = ImageView(this).apply {
            setImageDrawable(icon)
            alpha = if (isBlocked) 0.32f else 1f
            layoutParams = FrameLayout.LayoutParams(dp(44), dp(44)).also {
                it.gravity = Gravity.CENTER
            }
        }
        iconFrame.addView(iconView)

        val labelView = TextView(this).apply {
            text = label
            textSize = 10f
            setTextColor(if (isBlocked) TEXT_MUTED else TEXT_DIM)
            gravity = Gravity.CENTER
            maxLines = 1
            ellipsize = TextUtils.TruncateAt.END
            setShadowLayer(2f, 0f, 1f, Color.parseColor("#88000000"))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).also { it.topMargin = dp(3) }
        }

        item.addView(iconFrame)
        item.addView(labelView)

        item.setOnClickListener {
            if (isBlocked) launchBlockOverlay(pkg) else launchApp(pkg)
        }

        item.setOnLongClickListener {
            showDockIconMenu(pkg, label)
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
            setBackgroundColor(Color.TRANSPARENT)
            alpha = 0f
        }

        val sheet = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                intArrayOf(Color.parseColor("#EE111827"), Color.parseColor("#FF0A0E1A"))
            ).also { it.cornerRadii = floatArrayOf(dp(24).toFloat(), dp(24).toFloat(), 0f, 0f, 0f, 0f, dp(24).toFloat(), dp(24).toFloat()) }
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                (resources.displayMetrics.heightPixels * 0.92).toInt()
            ).also { it.gravity = Gravity.BOTTOM }
            translationY = resources.displayMetrics.heightPixels.toFloat()
        }

        // Drag handle
        val handle = View(this).apply {
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(3).toFloat()
                setColor(Color.parseColor("#55AABBDD"))
            }
            layoutParams = LinearLayout.LayoutParams(dp(36), dp(4)).also {
                it.gravity = Gravity.CENTER_HORIZONTAL
                it.topMargin = dp(12); it.bottomMargin = dp(14)
            }
        }
        sheet.addView(handle)

        // Drawer title
        val drawerTitle = TextView(this).apply {
            text = "All Apps"
            textSize = 16f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).also { it.bottomMargin = dp(10) }
        }
        sheet.addView(drawerTitle)

        // Search bar
        val searchBar = EditText(this).apply {
            hint = "Search apps…"
            setHintTextColor(Color.parseColor("#556688AA"))
            setTextColor(Color.WHITE)
            textSize = 15f
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(14).toFloat()
                setColor(Color.parseColor("#1AFFFFFF"))
                setStroke(dp(1), Color.parseColor("#22FFFFFF"))
            }
            setPadding(dp(16), dp(12), dp(16), dp(12))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
            ).also { it.setMargins(dp(16), 0, dp(16), dp(12)) }
        }
        sheet.addView(searchBar)

        // App grid in scroll view
        val scroll = ScrollView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f
            )
            isVerticalScrollBarEnabled = false
        }

        val gridContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            setPadding(dp(8), 0, dp(8), dp(24))
        }

        val hiddenPkgs = parseJsonArray(prefs.getString(PREF_LAUNCHER_HIDDEN, "[]") ?: "[]").toSet()
        val blocked    = getBlockedPackages()
        val pm         = packageManager
        val intent     = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)

        val allApps = pm.queryIntentActivities(intent, 0)
            .filter { it.activityInfo.packageName != OWN_PACKAGE }
            .filter { !hiddenPkgs.contains(it.activityInfo.packageName) }
            .sortedBy { pm.getApplicationLabel(it.activityInfo.applicationInfo).toString().lowercase(Locale.getDefault()) }

        // Group by first letter for section headers
        val sections = allApps.groupBy { info ->
            val first = pm.getApplicationLabel(info.activityInfo.applicationInfo).toString()
                .firstOrNull()?.uppercaseChar() ?: '#'
            if (first.isLetter()) first else '#'
        }.toSortedMap(compareBy { if (it == '#') '\uFFFF' else it })

        // Track all grid views for search filtering
        data class AppEntry(val view: View, val searchKey: String)
        val allEntries = mutableListOf<AppEntry>()

        for ((letter, apps) in sections) {
            // Section letter header
            val sectionHeader = TextView(this).apply {
                text = letter.toString()
                textSize = 12f
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                setTextColor(ACCENT)
                setPadding(dp(12), dp(8), dp(12), dp(4))
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )
                tag = "header_$letter"
            }
            gridContainer.addView(sectionHeader)
            allEntries.add(AppEntry(sectionHeader, "header_$letter"))

            // Grid row for this section
            val sectionGrid = GridLayout(this).apply {
                columnCount = 5
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )
                tag = "grid_$letter"
            }

            for (info in apps) {
                addDrawerIcon(sectionGrid, info, pm, blocked)
            }

            gridContainer.addView(sectionGrid)
            allEntries.add(AppEntry(sectionGrid, "grid_$letter"))
        }

        scroll.addView(gridContainer)
        sheet.addView(scroll)
        overlay.addView(sheet)

        // Search filter
        searchBar.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                val q = s?.toString()?.lowercase(Locale.getDefault())?.trim() ?: ""
                if (q.isEmpty()) {
                    // Restore all
                    for (entry in allEntries) entry.view.visibility = View.VISIBLE
                } else {
                    // Hide section headers, show only matching apps in a flat way
                    for (entry in allEntries) {
                        if ((entry.view.tag as? String)?.startsWith("header_") == true) {
                            entry.view.visibility = View.GONE
                        }
                    }
                    for (i in 0 until gridContainer.childCount) {
                        val child = gridContainer.getChildAt(i)
                        val tag = child.tag as? String ?: continue
                        if (!tag.startsWith("grid_")) continue
                        val grid = child as? GridLayout ?: continue
                        var hasVisible = false
                        for (j in 0 until grid.childCount) {
                            val iconItem = grid.getChildAt(j)
                            val itemTag = iconItem.tag as? String ?: ""
                            val visible = q.isEmpty() || itemTag.contains(q)
                            iconItem.visibility = if (visible) View.VISIBLE else View.GONE
                            if (visible) hasVisible = true
                        }
                        grid.visibility = if (hasVisible) View.VISIBLE else View.GONE
                    }
                }
            }
        })

        // Swipe-down to close
        var swipeDownY = 0f
        sheet.setOnTouchListener { _, ev ->
            when (ev.action) {
                MotionEvent.ACTION_DOWN -> { swipeDownY = ev.rawY; false }
                MotionEvent.ACTION_UP   -> {
                    if (ev.rawY - swipeDownY > dp(80)) { closeDrawer(); true } else false
                }
                else -> false
            }
        }

        drawerOverlay = overlay
        rootFrame.addView(overlay)

        // Animate in
        overlay.animate().alpha(1f).setDuration(200).setInterpolator(DecelerateInterpolator()).start()
        sheet.animate().translationY(0f).setDuration(280).setInterpolator(DecelerateInterpolator(1.5f)).start()
    }

    private fun addDrawerIcon(grid: GridLayout, info: ResolveInfo, pm: PackageManager, blocked: Set<String>) {
        val pkg       = info.activityInfo.packageName
        val label     = pm.getApplicationLabel(info.activityInfo.applicationInfo).toString()
        val icon      = try { pm.getApplicationIcon(pkg) } catch (_: Exception) { return }
        val isBlocked = blocked.contains(pkg)

        val colSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f)
        val item = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            val lp = GridLayout.LayoutParams(colSpec, colSpec)
            lp.width = 0
            lp.height = GridLayout.LayoutParams.WRAP_CONTENT
            lp.setMargins(dp(4), dp(8), dp(4), dp(2))
            layoutParams = lp
            tag = label.lowercase(Locale.getDefault())
        }

        val iconView = ImageView(this).apply {
            setImageDrawable(icon)
            alpha = if (isBlocked) 0.28f else 1f
            layoutParams = LinearLayout.LayoutParams(dp(44), dp(44)).also {
                it.gravity = Gravity.CENTER_HORIZONTAL
            }
        }

        val labelView = TextView(this).apply {
            text = label
            textSize = 10f
            setTextColor(if (isBlocked) TEXT_MUTED else TEXT_DIM)
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

        item.setOnLongClickListener {
            showDrawerIconMenu(pkg, label)
            true
        }

        grid.addView(item)
    }

    private fun closeDrawer() {
        val overlay = drawerOverlay ?: return
        val sheet = overlay.getChildAt(0)
        isDrawerOpen = false

        sheet?.animate()
            ?.translationY(resources.displayMetrics.heightPixels.toFloat())
            ?.setDuration(220)
            ?.setInterpolator(AccelerateInterpolator())
            ?.start()

        overlay.animate()
            .alpha(0f)
            .setDuration(220)
            .setInterpolator(AccelerateInterpolator())
            .withEndAction {
                rootFrame.removeView(overlay)
                drawerOverlay = null
            }
            .start()
    }

    // ── Long-press context menus ───────────────────────────────────────────────

    private fun showHomeIconMenu(pkg: String, label: String) {
        AlertDialog.Builder(this)
            .setTitle(label)
            .setItems(arrayOf("Remove from Home", "Add to Dock", "App Info")) { _, which ->
                when (which) {
                    0 -> removeFromHome(pkg)
                    1 -> addToDock(pkg)
                    2 -> openAppInfo(pkg)
                }
            }
            .create()
            .show()
    }

    private fun showDockIconMenu(pkg: String, label: String) {
        AlertDialog.Builder(this)
            .setTitle(label)
            .setItems(arrayOf("Remove from Dock", "App Info")) { _, which ->
                when (which) {
                    0 -> removeFromDock(pkg)
                    1 -> openAppInfo(pkg)
                }
            }
            .create()
            .show()
    }

    private fun showDrawerIconMenu(pkg: String, label: String) {
        AlertDialog.Builder(this)
            .setTitle(label)
            .setItems(arrayOf("Add to Home Screen", "Add to Dock", "App Info")) { _, which ->
                when (which) {
                    0 -> addToHome(pkg)
                    1 -> addToDock(pkg)
                    2 -> openAppInfo(pkg)
                }
            }
            .create()
            .show()
    }

    private fun showAddToHomeDialog() {
        val pm     = packageManager
        val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        val apps   = pm.queryIntentActivities(intent, 0)
            .filter { it.activityInfo.packageName != OWN_PACKAGE }
            .sortedBy { pm.getApplicationLabel(it.activityInfo.applicationInfo).toString() }

        val names = apps.map {
            pm.getApplicationLabel(it.activityInfo.applicationInfo).toString()
        }.toTypedArray()

        AlertDialog.Builder(this)
            .setTitle("Add to Home Screen")
            .setItems(names) { _, idx ->
                addToHome(apps[idx].activityInfo.packageName)
            }
            .create()
            .show()
    }

    // ── Home / Dock management ─────────────────────────────────────────────────

    private fun addToHome(pkg: String) {
        val json    = prefs.getString(PREF_LAUNCHER_PINNED, "[]") ?: "[]"
        val current = parseJsonArray(json).toMutableList()
        if (!current.contains(pkg)) {
            current.add(pkg)
            saveJsonArray(PREF_LAUNCHER_PINNED, current)
            refreshHomeGrid()
        }
    }

    private fun removeFromHome(pkg: String) {
        val json    = prefs.getString(PREF_LAUNCHER_PINNED, "[]") ?: "[]"
        val updated = parseJsonArray(json).filter { it != pkg }
        saveJsonArray(PREF_LAUNCHER_PINNED, updated)
        refreshHomeGrid()
    }

    private fun addToDock(pkg: String) {
        val json    = prefs.getString(PREF_LAUNCHER_DOCK, "[]") ?: "[]"
        val current = parseJsonArray(json).toMutableList()
        if (!current.contains(pkg) && current.size < 5) {
            current.add(pkg)
            saveJsonArray(PREF_LAUNCHER_DOCK, current)
            refreshDock()
        } else if (current.size >= 5) {
            AlertDialog.Builder(this)
                .setTitle("Dock is full")
                .setMessage("Remove an existing dock app first (long-press it on the home screen).")
                .setPositiveButton("OK", null)
                .show()
        }
    }

    private fun removeFromDock(pkg: String) {
        val json    = prefs.getString(PREF_LAUNCHER_DOCK, "[]") ?: "[]"
        val updated = parseJsonArray(json).filter { it != pkg }
        saveJsonArray(PREF_LAUNCHER_DOCK, updated)
        refreshDock()
    }

    private fun openAppInfo(pkg: String) {
        val i = Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = android.net.Uri.parse("package:$pkg")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        try { startActivity(i) } catch (_: Exception) {}
    }

    // ── Launch helpers ────────────────────────────────────────────────────────

    private fun launchApp(pkg: String) {
        val i = packageManager.getLaunchIntentForPackage(pkg) ?: return
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try { startActivity(i) } catch (_: Exception) {}
    }

    private fun launchBlockOverlay(pkg: String) {
        val i = Intent(this, BlockOverlayActivity::class.java).apply {
            putExtra("blocked_package", pkg)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        try { startActivity(i) } catch (_: Exception) {}
    }

    // ── Block-state helpers ───────────────────────────────────────────────────

    private fun getBlockedPackages(): Set<String> {
        val now    = System.currentTimeMillis()
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
                // Update every second for accurate display
                handler.postDelayed(this, 1_000L)
            }
        }
        handler.post(clockRunnable!!)
    }

    private fun updateClockText() {
        val now = Date()
        val use24h = android.text.format.DateFormat.is24HourFormat(this)

        if (use24h) {
            clockView?.text = SimpleDateFormat("HH:mm", Locale.getDefault()).format(now)
            ampmView?.text  = ""
        } else {
            clockView?.text = SimpleDateFormat("h:mm", Locale.getDefault()).format(now)
            ampmView?.text  = SimpleDateFormat("a", Locale.getDefault()).format(now)
        }

        dateView?.text = SimpleDateFormat("EEEE, MMMM d", Locale.getDefault()).format(now)
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

    private fun parseJsonArray(json: String): List<String> {
        return try {
            val arr = JSONArray(json)
            (0 until arr.length()).map { arr.getString(it) }
        } catch (_: Exception) { emptyList() }
    }

    private fun saveJsonArray(key: String, list: List<String>) {
        val json = "[${list.joinToString(",") { "\"$it\"" }}]"
        prefs.edit().putString(key, json).apply()
    }

    private fun dp(v: Int) = (v * resources.displayMetrics.density + 0.5f).toInt()
}
