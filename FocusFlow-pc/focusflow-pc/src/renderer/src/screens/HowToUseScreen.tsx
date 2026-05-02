import React, { useState } from 'react'

type Page = 'today' | 'week' | 'focus' | 'stats' | 'settings' | 'profile' | 'reports' | 'active' | 'notes' | 'block-defense' | 'keyword-blocker' | 'always-on' | 'changelog' | 'how-to-use' | 'privacy' | 'standalone-block' | 'import-blocklist'

interface Step { heading: string; body: string }

interface GuideSection {
  icon: string
  title: string
  color: string
  tag: string
  steps: Step[]
}

const GUIDE: GuideSection[] = [
  {
    icon: '📅',
    title: 'Schedule Your Focus',
    color: '#6366f1',
    tag: 'Core',
    steps: [
      { heading: 'Add a task', body: 'Click the + button on the Today screen. Give it a name, set a start time and duration, choose a priority level, and press Save. Tasks appear on both the list view and the timeline.' },
      { heading: 'Set priority', body: 'Tasks are colour-coded: critical (red), high (orange), medium (indigo), low (grey). Higher-priority tasks surface first in the Today list and in the Focus tab.' },
      { heading: 'Timeline view', body: 'Switch to Timeline mode on the Today screen to see all tasks on a 6am–11pm time axis. Click any empty slot to add a task at that time. Overlapping tasks appear side-by-side.' },
      { heading: 'Start focusing', body: 'When a task is active, the Focus tab lights up. Open Focus and press "Start Focus Mode" to activate enforcement and start the countdown timer.' },
      { heading: 'Keyboard shortcut', body: 'Press 1 to jump to Today, 3 to jump to Focus. Press N on the Today screen to quick-add a task without opening the full modal.' },
    ],
  },
  {
    icon: '🛡',
    title: 'Block Distracting Websites',
    color: '#ef4444',
    tag: 'Blocking',
    steps: [
      { heading: 'Website block list (focus-only)', body: 'Open Block Defense → Website Blocking. Add domains (e.g. twitter.com) and toggle blocking on. These sites are only blocked while "Website Blocking" is enabled.' },
      { heading: 'Always-On Block List', body: 'For sites you want blocked 24/7 with no session needed — go to Block Defense → Always-On Block List, or Settings → Always-On Block List. Domains stay blocked until you remove them.' },
      { heading: 'Bulk paste', body: 'On the Always-On screen, click "Bulk Paste" on the right panel and paste any list of URLs or domains — the app extracts the domains and skips duplicates automatically.' },
      { heading: 'Block Schedules', body: 'Create recurring time windows (e.g. Mon–Fri 9:00–17:00) that block specific sites automatically — no session needed. Each schedule runs independently.' },
      { heading: 'How PC blocking works', body: 'FocusFlow-PC enforces domain blocks by modifying the system hosts file or routing through a companion browser extension. Grant file-write permissions on first use. No traffic leaves your device.' },
    ],
  },
  {
    icon: '♾️',
    title: 'Always-On Enforcement',
    color: '#f43f5e',
    tag: 'Blocking',
    steps: [
      { heading: 'What "always-on" means', body: 'The Always-On Block List enforces website blocking continuously — 24/7 — regardless of whether you have an active task, focus session, or timed block. It is the most aggressive layer.' },
      { heading: 'Toggle without losing the list', body: 'The "Always-On Enforcement" toggle in the header of the Always-On screen pauses enforcement without deleting any domains. Turn it back on to resume instantly.' },
      { heading: 'Preset groups', body: 'Use the preset groups on the right panel (Social Media, Short-form Video, Streaming, News/Outrage, Shopping, Gambling) to add a whole category in one click.' },
      { heading: 'Difference from focus blocking', body: 'Focus Blocking (Block Defense → Website Blocking) only activates when a focus session or standalone block is running. Always-On blocking never turns off unless you toggle it.' },
    ],
  },
  {
    icon: '⏱',
    title: 'Standalone Block',
    color: '#8b5cf6',
    tag: 'Blocking',
    steps: [
      { heading: 'What is a standalone block?', body: 'A standalone block is a timed website block that runs independently of any task or focus session. Open "Standalone Block" from the sidebar and set a duration (15 min – 8 hours).' },
      { heading: 'Quick durations', body: 'Use the quick-pick buttons (25m, 45m, 1h, 2h, 4h) or type a custom duration. Press Start Block to begin.' },
      { heading: 'What gets blocked', body: 'During a standalone block, the same website block list as your focus sessions is enforced — all sites with "ON" in Block Defense → Website Blocking.' },
      { heading: 'Stopping early', body: 'You can stop a block early using the Stop Block button. If a session PIN is configured in settings, you will need to enter it to confirm.' },
    ],
  },
  {
    icon: '⚡',
    title: 'Enforcement Layers',
    color: '#f59e0b',
    tag: 'Enforcement',
    steps: [
      { heading: 'Active Status screen', body: 'Open Active Status from the sidebar (or press the ⚡ icon) to see all 6 enforcement layers at once: Focus Session, Website Blocking, Keyword Blocker, Block Schedules, Always-On, and Pomodoro.' },
      { heading: 'Live schedule detection', body: 'If a block schedule is running right now, the Active Status screen shows an amber alert with the schedule name and when it ends. A "LIVE" badge appears on schedules currently inside their time window.' },
      { heading: 'Aversion Sound', body: 'Turn on Aversion Sound in Block Defense to play a startling audio cue when you visit a blocked site. This builds a conditioned reflex over time.' },
      { heading: 'Focus Session Behaviour', body: 'In Block Defense, toggle "Keep focus active for the full duration" to keep enforcement running until the original task end time — even if you finish the task early.' },
    ],
  },
  {
    icon: '🔤',
    title: 'Keyword Blocker',
    color: '#3b82f6',
    tag: 'Blocking',
    steps: [
      { heading: 'What it does', body: 'The Keyword Blocker monitors browser window titles and tab URLs for words you configure. When a match is found, FocusFlow logs it as a distraction event. For the PC version, full-page redirect is optional.' },
      { heading: 'Quick presets', body: 'Open the Keyword Blocker from the sidebar or Settings. Six one-click presets are available: Doomscroll bait, Social-media drama, Shorts/Reels bait, Impulse-buy traps, Gambling triggers, NSFW content.' },
      { heading: 'Custom keywords', body: 'Click "Add Custom" to open the keyword editor. Type your words and click Add — they appear as chips. All matching is done locally, nothing is sent anywhere.' },
      { heading: 'Privacy', body: 'The keyword blocker never records which specific page triggered a match — only the fact that a match occurred is stored locally for your distraction count.' },
    ],
  },
  {
    icon: '🍅',
    title: 'Pomodoro Timer',
    color: '#ef4444',
    tag: 'Focus',
    steps: [
      { heading: 'Enable Pomodoro', body: 'Go to Settings → Focus & Pomodoro and toggle Pomodoro Mode on. Set your work duration (default 25m) and break duration (default 5m).' },
      { heading: 'Automatic intervals', body: 'The Focus screen cycles through work and break intervals automatically. A beep plays at each transition. After 4 work intervals, a longer break begins.' },
      { heading: 'Pair with a task', body: 'Start focus from a task card on the Today screen — the Pomodoro timer runs alongside the task timer. Both are visible on the Focus screen.' },
      { heading: 'Session log', body: 'Each completed Pomodoro interval is counted in your daily focus time stats. Cancelled intervals are not counted.' },
    ],
  },
  {
    icon: '📊',
    title: 'Stats & Reports',
    color: '#10b981',
    tag: 'Analytics',
    steps: [
      { heading: 'Stats screen', body: 'Shows today, yesterday, this-week, and all-time focus minutes, completion rate, override count, and a Productivity Score (A+–F graded). Open with the keyboard shortcut 4.' },
      { heading: 'Productivity Score', body: 'Calculated from your task completion %, focus time vs daily goal, and number of focus overrides. An A+ requires 90%+ completion, reaching your goal, and zero overrides.' },
      { heading: 'Reports screen', body: 'Detailed view with a focus-time hero, task breakdown (on-time / late / early / extended / skipped), daily completion bar chart, and weekly heatmap. Access from the sidebar or Stats screen.' },
      { heading: 'Streak tracking', body: 'A streak chip in the sidebar shows your consecutive-day completion streak. Your best streak and all-time focus hours are shown in the Reports screen.' },
    ],
  },
  {
    icon: '⌨️',
    title: 'Keyboard & System',
    color: '#6366f1',
    tag: 'PC',
    steps: [
      { heading: 'In-window shortcuts', body: 'Press 1 (Today), 2 (Week), 3 (Focus), 4 (Stats), 5 (Settings). Press ? to open the full shortcuts panel at any time. Press N on Today to quick-add a task.' },
      { heading: 'Global shortcuts', body: 'Ctrl+Shift+Space shows/hides the window from anywhere on your desktop. Ctrl+Shift+1–4 navigate directly to a tab while the window is hidden.' },
      { heading: 'System tray', body: 'FocusFlow-PC lives in the system tray when you close the window. Right-click the tray icon for quick access to focus controls without bringing up the full window.' },
      { heading: 'Window controls', body: 'The custom title bar has Minimise, Maximise/Restore, and Close buttons. Closing sends FocusFlow to the tray — it stays running so scheduled blocks and always-on enforcement continue.' },
    ],
  },
  {
    icon: '⚙️',
    title: 'Settings & Profile',
    color: '#8b5cf6',
    tag: 'Config',
    steps: [
      { heading: 'Profile', body: 'Set your name, occupation, chronotype, daily focus goal, sleep time, distraction triggers, and preferred focus block length. Profile data shapes smart defaults throughout the app.' },
      { heading: 'Backup & Export', body: 'Go to Settings → Backup → Export Backup to save all tasks and settings to a JSON file. Keep a copy somewhere safe — this is your only backup mechanism.' },
      { heading: 'Dark mode', body: 'Toggle dark mode in Settings → Appearance. Dark mode is recommended for long focus sessions to reduce eye strain. The setting persists across restarts.' },
      { heading: 'Data stays local', body: 'All data is stored in a local SQLite database on your device (WAL mode for performance). Nothing is ever sent to any server, cloud, or analytics service.' },
    ],
  },
]

const TAG_COLORS: Record<string, string> = {
  Core: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
  Blocking: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  Enforcement: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  Focus: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  Analytics: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  PC: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  Config: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
}

export default function HowToUseScreen({ navigate }: { navigate: (p: Page) => void }) {
  const [selected, setSelected] = useState(0)
  const section = GUIDE[selected]

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('settings')}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          ←
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">How to Use FocusFlow</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Your discipline operating system — explained</p>
        </div>
        <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">{GUIDE.length} topics</span>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 overflow-hidden flex">

        {/* LEFT — topic index */}
        <div className="w-56 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto py-2">
          {GUIDE.map((s, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b border-gray-50 dark:border-gray-750 transition-all ${
                selected === i
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-l-indigo-500'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-750 border-l-2 border-l-transparent'
              }`}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                style={{ backgroundColor: s.color + '18' }}
              >
                {s.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] font-semibold leading-tight truncate ${selected === i ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'}`}>
                  {s.title}
                </p>
                <span className={`text-[10px] font-semibold mt-0.5 inline-block px-1.5 py-0.5 rounded ${TAG_COLORS[s.tag]}`}>
                  {s.tag}
                </span>
              </div>
              {selected === i && <span className="text-indigo-400 text-sm flex-shrink-0">›</span>}
            </button>
          ))}
        </div>

        {/* RIGHT — detail view */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-2xl">
            {/* Section title */}
            <div className="flex items-center gap-4 mb-6">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                style={{ backgroundColor: section.color + '18' }}
              >
                {section.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{section.title}</h2>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TAG_COLORS[section.tag]}`}>
                    {section.tag}
                  </span>
                </div>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{section.steps.length} steps</p>
              </div>
            </div>

            {/* Steps — all shown, numbered */}
            <div className="space-y-3">
              {section.steps.map((step, j) => (
                <div
                  key={j}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex gap-4"
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: section.color }}
                  >
                    <span className="text-white text-xs font-black">{j + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">{step.heading}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Prev / Next navigation */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setSelected(i => Math.max(0, i - 1))}
                disabled={selected === 0}
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 font-semibold transition-colors"
              >
                ← {selected > 0 ? GUIDE[selected - 1].title : 'Previous'}
              </button>
              <span className="text-xs text-gray-300 dark:text-gray-600">{selected + 1} / {GUIDE.length}</span>
              <button
                onClick={() => setSelected(i => Math.min(GUIDE.length - 1, i + 1))}
                disabled={selected === GUIDE.length - 1}
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 font-semibold transition-colors"
              >
                {selected < GUIDE.length - 1 ? GUIDE[selected + 1].title : 'Next'} →
              </button>
            </div>

            <p className="text-xs text-center text-gray-300 dark:text-gray-600 mt-4">
              All data stays on your device — nothing is sent to any server.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
