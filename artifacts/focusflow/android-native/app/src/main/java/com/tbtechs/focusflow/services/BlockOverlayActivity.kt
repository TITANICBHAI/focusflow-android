package com.tbtechs.focusflow.services

import android.app.Activity
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import com.tbtechs.focusflow.MainActivity
import org.json.JSONArray
import java.io.File

/**
 * BlockOverlayActivity
 *
 * Full-screen blocking overlay launched by AppBlockerAccessibilityService the
 * instant a blocked package is detected. Occupying the foreground as an Activity
 * means the blocked app never finishes rendering — Android stops drawing it the
 * moment our Activity takes focus. The AccessibilityService can then back off
 * (no repeated HOME presses needed) while this overlay holds the screen.
 *
 * Enforcement layers:
 *   1. Covers the entire screen including status/nav bars (FLAG_LAYOUT_NO_LIMITS)
 *   2. Shows even over the lock screen (FLAG_SHOW_WHEN_LOCKED)
 *   3. Keeps screen on (FLAG_KEEP_SCREEN_ON) — no sneaking past by letting it sleep
 *   4. onBackPressed() redirects to FocusFlow instead of resuming the blocked app
 *   5. onPause() re-raises the overlay if a session is still active and the
 *      activity is not intentionally finishing (slow-phone bypass counter)
 *
 * Customisation (read from SharedPrefs "focusday_prefs"):
 *   block_overlay_quote     — fixed quote string; empty = pick random each time
 *   block_overlay_quotes    — JSON array of custom quotes (fallback: built-in set)
 *   block_overlay_wallpaper — absolute path to a JPEG/PNG wallpaper image
 *
 * Intent extras:
 *   EXTRA_BLOCKED_PKG  — package name of the blocked app (e.g. "com.instagram.android")
 *   EXTRA_BLOCKED_NAME — human-readable app name (e.g. "Instagram")
 */
class BlockOverlayActivity : Activity() {

    companion object {
        const val EXTRA_BLOCKED_PKG  = "blocked_pkg"
        const val EXTRA_BLOCKED_NAME = "blocked_name"

        private val DEFAULT_QUOTES = listOf(
            "The present moment is the only time over which we have dominion.",
            "Focus is the art of knowing what to ignore.",
            "Deep work is the superpower of the 21st century.",
            "Your future self is watching. Don't let them down.",
            "One task at a time. One step at a time. One breath at a time.",
            "Discipline is choosing between what you want now and what you want most.",
            "The successful warrior is the average person with laser-like focus.",
            "Where attention goes, energy flows.",
            "Distraction is the enemy of vision.",
            "Every time you resist the urge to check, you grow stronger.",
            "You don't need to check your phone. The world can wait.",
            "Protect your attention like you protect your money.",
            "Clarity comes from action, not thought.",
            "Small disciplines repeated with consistency lead to great achievements.",
            "The cost of distraction is the loss of the life you could have built."
        )
    }

    private lateinit var prefs: SharedPreferences
    private val handler = Handler(Looper.getMainLooper())
    private var blockedName: String = ""
    private var intentionalFinish = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = getSharedPreferences(AppBlockerAccessibilityService.PREFS_NAME, MODE_PRIVATE)
        blockedName = intent?.getStringExtra(EXTRA_BLOCKED_NAME) ?: ""

        applyWindowFlags()
        buildUI()
    }

    // ─── Window flags ─────────────────────────────────────────────────────────

    private fun applyWindowFlags() {
        window.apply {
            addFlags(
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_FULLSCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
            )
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false)
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_FULLSCREEN or
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            )
        }
    }

    // ─── UI construction ──────────────────────────────────────────────────────

    private fun buildUI() {
        val root = FrameLayout(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.parseColor("#0A0A0F"))
        }

        // Optional wallpaper behind content at reduced opacity
        val wallpaperPath = prefs.getString("block_overlay_wallpaper", "") ?: ""
        if (wallpaperPath.isNotEmpty()) {
            val file = File(wallpaperPath)
            if (file.exists()) {
                try {
                    val bmp = BitmapFactory.decodeFile(wallpaperPath)
                    if (bmp != null) {
                        val iv = ImageView(this).apply {
                            layoutParams = FrameLayout.LayoutParams(
                                FrameLayout.LayoutParams.MATCH_PARENT,
                                FrameLayout.LayoutParams.MATCH_PARENT
                            )
                            setImageBitmap(bmp)
                            scaleType = ImageView.ScaleType.CENTER_CROP
                            alpha = 0.30f
                        }
                        root.addView(iv)
                    }
                } catch (_: Exception) { /* bad image — use solid background */ }
            }
        }

        // Semi-transparent dark scrim so text is always readable
        val scrim = View(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.parseColor("#CC0A0A0F"))
        }
        root.addView(scrim)

        // Content column
        val col = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            gravity = Gravity.CENTER
            setPadding(dp(32), dp(80), dp(32), dp(80))
        }

        col.addView(buildLockEmoji())
        col.addView(buildBlockedLabel())
        col.addView(buildQuoteView())
        col.addView(buildSubLabel())
        col.addView(buildBackButton())
        root.addView(col)

        setContentView(root)
    }

    private fun buildLockEmoji(): TextView = TextView(this).apply {
        text = "\uD83D\uDD12"          // 🔒
        textSize = 52f
        gravity = Gravity.CENTER
        layoutParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { bottomMargin = dp(20) }
    }

    private fun buildBlockedLabel(): TextView = TextView(this).apply {
        text = if (blockedName.isNotEmpty()) "\u201C$blockedName\u201D is blocked"
               else "App Blocked"
        textSize = 15f
        setTextColor(Color.parseColor("#FF6B6B"))
        gravity = Gravity.CENTER
        letterSpacing = 0.12f
        layoutParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { bottomMargin = dp(36) }
    }

    private fun buildQuoteView(): TextView = TextView(this).apply {
        text = "\u201C${resolveQuote()}\u201D"
        textSize = 20f
        setTextColor(Color.parseColor("#E8E8F0"))
        gravity = Gravity.CENTER
        lineSpacingMultiplier = 1.55f
        layoutParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { bottomMargin = dp(48) }
    }

    private fun buildSubLabel(): TextView = TextView(this).apply {
        text = "Stay focused. You\u2019ve got this."
        textSize = 13f
        setTextColor(Color.parseColor("#55556A"))
        gravity = Gravity.CENTER
        layoutParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { bottomMargin = dp(36) }
    }

    private fun buildBackButton(): TextView = TextView(this).apply {
        text = "\u2190 Back to FocusFlow"
        textSize = 15f
        setTextColor(Color.parseColor("#7C6AFF"))
        gravity = Gravity.CENTER
        setPadding(dp(28), dp(14), dp(28), dp(14))
        background = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dp(12).toFloat()
            setColor(Color.parseColor("#1A1A2E"))
            setStroke(dp(1), Color.parseColor("#7C6AFF"))
        }
        layoutParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { gravity = Gravity.CENTER_HORIZONTAL }
        setOnClickListener { finishAndOpenFocusFlow() }
    }

    // ─── Quote resolution ─────────────────────────────────────────────────────

    private fun resolveQuote(): String {
        val fixed = prefs.getString("block_overlay_quote", "") ?: ""
        if (fixed.isNotEmpty()) return fixed

        val customJson = prefs.getString("block_overlay_quotes", "") ?: ""
        val pool: List<String> = if (customJson.isNotEmpty()) {
            try {
                val arr = JSONArray(customJson)
                (0 until arr.length()).map { arr.getString(it) }.takeIf { it.isNotEmpty() }
                    ?: DEFAULT_QUOTES
            } catch (_: Exception) { DEFAULT_QUOTES }
        } else DEFAULT_QUOTES

        return pool.random()
    }

    // ─── Navigation ───────────────────────────────────────────────────────────

    private fun finishAndOpenFocusFlow() {
        intentionalFinish = true
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        startActivity(intent)
        finish()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        finishAndOpenFocusFlow()
    }

    // ─── Slow-phone bypass counter ────────────────────────────────────────────
    //
    // If something else covers the overlay while a session is active (e.g. the
    // blocked app finishes animating in before our overlay could take focus on a
    // slow device), re-raise ourselves after a short delay. This gives the
    // AccessibilityService a window to trigger but is NOT a replacement for it.

    override fun onPause() {
        super.onPause()
        if (intentionalFinish || isFinishing) return

        val focusActive = prefs.getBoolean(AppBlockerAccessibilityService.PREF_FOCUS_ON, false)
        val saActive    = prefs.getBoolean(AppBlockerAccessibilityService.PREF_SA_ACTIVE, false)
        if (!focusActive && !saActive) return

        handler.postDelayed({
            if (!isFinishing && !isDestroyed && !intentionalFinish) {
                try {
                    val reRaise = Intent(applicationContext, BlockOverlayActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                        putExtra(EXTRA_BLOCKED_NAME, blockedName)
                    }
                    applicationContext.startActivity(reRaise)
                } catch (_: Exception) { /* overlay re-raise failed — service will catch it */ }
            }
        }, 550L)
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        super.onDestroy()
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density + 0.5f).toInt()
}
