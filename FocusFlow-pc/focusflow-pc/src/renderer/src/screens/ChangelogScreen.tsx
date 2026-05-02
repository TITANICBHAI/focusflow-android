import React, { useState } from 'react'

type Page = 'today' | 'week' | 'focus' | 'stats' | 'settings' | 'profile' | 'reports' | 'active' | 'notes' | 'block-defense' | 'keyword-blocker' | 'always-on' | 'changelog' | 'how-to-use' | 'privacy' | 'standalone-block' | 'import-blocklist'

interface ChangelogSection {
  heading: string
  icon: string
  items: string[]
}

interface ChangelogEntry {
  version: string
  date: string
  label?: string
  labelColor?: string
  sections: ChangelogSection[]
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.1.0',
    date: 'May 2026',
    label: 'Latest',
    labelColor: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
    sections: [
      {
        heading: 'Standalone Block Screen',
        icon: '⏱',
        items: [
          'New Standalone Block screen — start a timed website block without any task or focus session',
          'Choose a custom duration (15m – 8h) or use quick-pick buttons',
          'Block schedules, always-on list, and keyword blocker are all compatible with standalone blocks',
          'Live countdown with one-click stop (with PIN confirmation if session PIN is enabled)',
        ],
      },
      {
        heading: 'Block Defense Screen',
        icon: '🛡',
        items: [
          'Dedicated Block Enforcement screen — all enforcement layers in one place',
          'Full website blocking list with per-site enable/disable toggle',
          'Recurring Block Schedules — set time windows (e.g. Mon–Fri 9–17) that block sites automatically, no session needed',
          'Focus Session Behaviour toggle — keep blocking active for the full task duration even if you finish early',
          'Aversion Sound deterrent — a startling audio cue fires when you visit a blocked site',
        ],
      },
      {
        heading: 'Keyword Blocker Screen',
        icon: '🔤',
        items: [
          '6 quick-add presets: Doomscroll bait, Social-media drama, Shorts/Reels bait, Impulse-buy traps, Gambling triggers, NSFW content',
          'Custom keyword editor with real-time chip display',
          'One-tap remove any keyword from the main list',
        ],
      },
      {
        heading: 'Always-On Block List',
        icon: '♾️',
        items: [
          'Two-column desktop layout — blocked list on the left, presets + bulk-paste on the right',
          'Bulk-paste panel — paste a list of URLs/domains to block them all at once',
          'Quick preset groups: Social Media, Short-form Video, Streaming, News, Shopping, Gambling',
          'Enable/disable toggle in header — pauses enforcement without clearing the list',
        ],
      },
      {
        heading: 'Active Status Screen',
        icon: '⚡',
        items: [
          '6 enforcement layers with live status badges (focus session, website blocking, keyword blocker, block schedules, always-on, Pomodoro)',
          'Live schedule detection — amber banner shows when a scheduled block is running right now',
          '"LIVE" badge on any schedule currently inside its active window',
        ],
      },
    ],
  },
  {
    version: '1.0.0',
    date: 'April 2026',
    label: 'Initial Release',
    labelColor: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
    sections: [
      {
        heading: 'Core Productivity Engine',
        icon: '⏱',
        items: [
          'Task-based focus sessions with start time and configurable duration',
          'Priority levels: critical, high, medium, low — colour-coded throughout',
          'Pomodoro timer with configurable work/break intervals',
          'Today timeline view — drag tasks, see overlaps, click empty slots to add tasks',
          'Week view with daily task summary cards',
        ],
      },
      {
        heading: 'Focus & Blocking',
        icon: '🛡',
        items: [
          'Focus Mode activates enforcement for the duration of a task',
          'Website blocking list — track and block distracting domains during sessions',
          'Keyword blocker — flag content matching specific words',
          'Aversion Sound deterrent',
        ],
      },
      {
        heading: 'Stats & Reports',
        icon: '📊',
        items: [
          'Stats screen: today, yesterday, week, all-time focus minutes, completion rate, override count',
          'Productivity Score (A+–F) based on completion %, focus time, and override penalties',
          'Streak tracking — consecutive days with completed tasks',
          'Reports screen: focus-time hero, task breakdown (on-time / late / skipped), weekly heatmap',
        ],
      },
      {
        heading: 'Settings & Profile',
        icon: '⚙️',
        items: [
          'Full user profile: name, occupation, chronotype, sleep time, focus goals, distraction triggers',
          'Dark mode support',
          'Backup export to JSON',
          'Weekly report notification',
          'Onboarding flow for first-run setup',
        ],
      },
      {
        heading: 'PC-Specific Features',
        icon: '🖥',
        items: [
          'Electron 29 desktop app — native window controls, system tray',
          'SQLite database (WAL mode) for fast local storage',
          'Global keyboard shortcuts (Ctrl+Shift+1–4, Ctrl+Shift+Space)',
          'Frameless window with custom title bar',
          'Daily Notes screen with local persistence',
        ],
      },
    ],
  },
]

export default function ChangelogScreen({ navigate }: { navigate: (p: Page) => void }) {
  const [selected, setSelected] = useState(0)
  const entry = CHANGELOG[selected]

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
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">What's New</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">FocusFlow-PC — version history</p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 overflow-hidden flex">

        {/* LEFT — version list */}
        <div className="w-56 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto py-3">
          {CHANGELOG.map((e, i) => (
            <button
              key={e.version}
              onClick={() => setSelected(i)}
              className={`w-full text-left px-4 py-4 border-b border-gray-50 dark:border-gray-750 transition-all ${
                selected === i
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-l-indigo-500'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-750 border-l-2 border-l-transparent'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${selected === i ? 'bg-indigo-500' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  <span className={`text-[10px] font-black ${selected === i ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                    v{e.version}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-bold truncate ${selected === i ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'}`}>
                    v{e.version}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{e.date}</p>
                  {e.label && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border inline-block mt-1 ${e.labelColor}`}>
                      {e.label}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}

          <div className="px-4 py-4 text-center">
            <p className="text-[10px] text-gray-300 dark:text-gray-600">All data stored locally — no servers</p>
          </div>
        </div>

        {/* RIGHT — entry detail */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-black">v{entry.version}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Version {entry.version}</h2>
                  {entry.label && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${entry.labelColor}`}>
                      {entry.label}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{entry.date}</p>
              </div>
            </div>

            <div className="space-y-5">
              {entry.sections.map((section, si) => (
                <div key={si} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-xl">{section.icon}</span>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{section.heading}</span>
                    <span className="ml-auto text-xs text-gray-300 dark:text-gray-600">{section.items.length} changes</span>
                  </div>
                  <ul className="px-5 py-3 space-y-2">
                    {section.items.map((item, ii) => (
                      <li key={ii} className="flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                        <span className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {selected < CHANGELOG.length - 1 && (
              <button
                onClick={() => setSelected(selected + 1)}
                className="mt-4 flex items-center gap-2 text-sm text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold transition-colors"
              >
                ← See v{CHANGELOG[selected + 1].version}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
