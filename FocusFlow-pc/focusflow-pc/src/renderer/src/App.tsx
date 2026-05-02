import React, { useState, useEffect, useCallback } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import TodayScreen from './screens/TodayScreen'
import WeekScreen from './screens/WeekScreen'
import FocusScreen from './screens/FocusScreen'
import StatsScreen from './screens/StatsScreen'
import SettingsScreen from './screens/SettingsScreen'
import ProfileScreen from './screens/ProfileScreen'
import ReportsScreen from './screens/ReportsScreen'
import ActiveScreen from './screens/ActiveScreen'
import NotesScreen from './screens/NotesScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import BlockDefenseScreen from './screens/BlockDefenseScreen'
import KeywordBlockerScreen from './screens/KeywordBlockerScreen'
import AlwaysOnScreen from './screens/AlwaysOnScreen'
import ChangelogScreen from './screens/ChangelogScreen'
import HowToUseScreen from './screens/HowToUseScreen'
import PrivacyScreen from './screens/PrivacyScreen'
import StandaloneBlockScreen from './screens/StandaloneBlockScreen'
import ImportBlocklistScreen from './screens/ImportBlocklistScreen'
import AchievementModal from './components/AchievementModal'
import DailyAllowanceScreen from './screens/DailyAllowanceScreen'
import WeeklyReportScreen from './screens/WeeklyReportScreen'
import OverlayAppearanceScreen from './screens/OverlayAppearanceScreen'
import AllowedInFocusScreen from './screens/AllowedInFocusScreen'
import FocusSessionHistoryScreen from './screens/FocusSessionHistoryScreen'

type Tab = 'today' | 'week' | 'focus' | 'stats' | 'settings'
export type Page =
  | Tab
  | 'profile'
  | 'reports'
  | 'active'
  | 'notes'
  | 'block-defense'
  | 'keyword-blocker'
  | 'always-on'
  | 'changelog'
  | 'standalone-block'
  | 'how-to-use'
  | 'privacy'
  | 'import-blocklist'
  | 'daily-allowance'
  | 'weekly-report'
  | 'overlay-appearance'
  | 'allowed-in-focus'
  | 'session-history'

const NAV_ITEMS: { id: Tab; label: string; icon: string; shortcut: string }[] = [
  { id: 'today',    label: 'Today',    icon: '📅', shortcut: '1' },
  { id: 'week',     label: 'Week',     icon: '📆', shortcut: '2' },
  { id: 'focus',    label: 'Focus',    icon: '🛡',  shortcut: '3' },
  { id: 'stats',    label: 'Stats',    icon: '📊', shortcut: '4' },
  { id: 'settings', label: 'Settings', icon: '⚙️', shortcut: '5' },
]

// Pages grouped under "block-defense" for active highlight
const BLOCK_PAGES: Page[] = ['block-defense', 'keyword-blocker', 'always-on', 'standalone-block', 'import-blocklist', 'overlay-appearance', 'allowed-in-focus']

function TitleBar({ isFocusing }: { isFocusing: boolean }) {
  const [isMax, setIsMax] = useState(false)

  const handleMaximize = async () => {
    await window.api.window.maximize()
    const max = await window.api.window.isMaximized()
    setIsMax(!!max)
  }

  return (
    <div
      className={`flex items-center border-b px-4 py-2 select-none transition-colors ${
        isFocusing
          ? 'bg-indigo-600 dark:bg-indigo-800 border-indigo-500'
          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
      }`}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isFocusing ? 'bg-white/20' : 'bg-indigo-500'}`}>
          <span className="text-xs font-black text-white">F</span>
        </div>
        <span className={`text-sm font-bold ${isFocusing ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
          FocusFlow {isFocusing && <span className="font-normal opacity-80">— Focus Mode Active</span>}
        </span>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={() => window.api.window.minimize()}
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ${
            isFocusing ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
          }`}
          title="Minimize"
        >─</button>
        <button
          onClick={handleMaximize}
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ${
            isFocusing ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
          }`}
          title={isMax ? 'Restore' : 'Maximize'}
        >{isMax ? '❐' : '□'}</button>
        <button
          onClick={() => window.api.window.close()}
          className="w-6 h-6 rounded-full bg-red-400 hover:bg-red-500 flex items-center justify-center text-xs text-white transition-colors"
          title="Close to tray"
        >✕</button>
      </div>
    </div>
  )
}

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 90, 180, 365]

function AppShell() {
  const { state, updateSettings } = useApp()
  const [page, setPage] = useState<Page>('today')
  const [activeTab, setActiveTab] = useState<Tab>('today')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [pendingMilestone, setPendingMilestone] = useState<number | null>(null)
  const isFocusing = !!state.focusSession

  const navigate = useCallback((p: Page) => {
    setPage(p)
    if (['today', 'week', 'focus', 'stats', 'settings'].includes(p)) setActiveTab(p as Tab)
  }, [])

  useEffect(() => {
    const handler = (p: unknown) => { if (typeof p === 'string') navigate(p as Page) }
    window.api.on('navigate', handler)
    return () => window.api.off('navigate', handler)
  }, [navigate])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
      if (isInput) return

      if (e.key === '?' || (e.key === '/' && e.shiftKey)) { e.preventDefault(); setShowShortcuts(s => !s); return }
      if (e.key === 'Escape') { setShowShortcuts(false); return }

      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === '1') navigate('today')
        else if (e.key === '2') navigate('week')
        else if (e.key === '3') navigate('focus')
        else if (e.key === '4') navigate('stats')
        else if (e.key === '5') navigate('settings')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  // Streak milestone celebration
  useEffect(() => {
    if (!state.isDbReady) return
    const checkStreak = async () => {
      try {
        const streak = await window.api.stats.getStreak()
        const lastShown = state.settings.lastShownStreakMilestone ?? 0
        const nextMilestone = STREAK_MILESTONES.filter(m => m <= streak && m > lastShown).pop()
        if (nextMilestone) setPendingMilestone(nextMilestone)
      } catch { /* ignore */ }
    }
    checkStreak()
  }, [state.isDbReady])

  if (!state.isDbReady) {
    return (
      <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
        <TitleBar isFocusing={false} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Loading FocusFlow…</p>
          </div>
        </div>
      </div>
    )
  }

  if (!state.settings.onboardingComplete) {
    return (
      <div className="flex flex-col h-full">
        <TitleBar isFocusing={false} />
        <OnboardingScreen />
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full bg-gray-50 dark:bg-gray-900 ${isFocusing ? 'focus-mode-active' : ''}`}>
      <TitleBar isFocusing={isFocusing} />

      {isFocusing && (
        <div className="bg-indigo-500 dark:bg-indigo-700 px-4 py-1.5 flex items-center gap-2 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-semibold text-white">Focus session active — stay on track!</span>
          <span className="ml-auto text-xs text-white/70">Press <kbd className="bg-white/20 border-white/30 text-white">3</kbd> to view timer</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`w-52 flex flex-col bg-white dark:bg-gray-900 border-r transition-colors sidebar-nav ${
          isFocusing ? 'border-indigo-300 dark:border-indigo-700' : 'border-gray-200 dark:border-gray-700'
        } py-4`}>
          <div className="px-4 mb-3">
            <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Navigation</div>
          </div>

          <nav className="flex-1 px-2 space-y-0.5">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                title={`${item.label} (${item.shortcut})`}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                  activeTab === item.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                <span className="flex-1 text-left">{item.label}</span>
                {item.id === 'focus' && isFocusing && (
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                )}
                <span className={`text-[10px] font-mono px-1 py-0.5 rounded border opacity-0 group-hover:opacity-60 transition-opacity ${
                  activeTab === item.id
                    ? 'border-indigo-300 dark:border-indigo-600 text-indigo-400'
                    : 'border-gray-300 dark:border-gray-600 text-gray-400'
                }`}>{item.shortcut}</span>
              </button>
            ))}
          </nav>

          <div className="px-2 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-0.5 mt-2">
            <div className="px-3 mb-2">
              <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">More</div>
            </div>
            {([
              { id: 'notes' as Page,             label: 'Daily Notes',      icon: '📝' },
              { id: 'active' as Page,            label: 'Active Status',    icon: '⚡' },
              { id: 'standalone-block' as Page,  label: 'Standalone Block', icon: '⏱' },
              { id: 'block-defense' as Page,     label: 'Block Defense',    icon: '🛡' },
              { id: 'import-blocklist' as Page,  label: 'Import Blocklist', icon: '📥' },
              { id: 'daily-allowance' as Page,   label: 'Daily Allowance',  icon: '⏳' },
              { id: 'weekly-report' as Page,     label: 'Weekly Report',    icon: '📊' },
              { id: 'session-history' as Page,   label: 'Session History',  icon: '🕐' },
              { id: 'reports' as Page,           label: 'Reports',          icon: '📋' },
              { id: 'profile' as Page,           label: 'Profile',          icon: '👤' },
            ]).map(item => (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                  page === item.id || (item.id === 'block-defense' && BLOCK_PAGES.includes(page))
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          <div className="px-4 pt-3 space-y-2">
            <TodayProgressBar />
            <StreakChip />
            <button
              onClick={() => setShowShortcuts(true)}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors py-1"
            >
              <kbd>?</kbd>
              <span>Shortcuts</span>
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-hidden page-enter">
          {page === 'today'           && <TodayScreen navigate={navigate} />}
          {page === 'week'            && <WeekScreen navigate={navigate} />}
          {page === 'focus'           && <FocusScreen navigate={navigate} />}
          {page === 'stats'           && <StatsScreen />}
          {page === 'settings'        && <SettingsScreen navigate={navigate} />}
          {page === 'profile'         && <ProfileScreen onBack={() => navigate('settings')} />}
          {page === 'reports'         && <ReportsScreen onBack={() => navigate('stats')} />}
          {page === 'active'          && <ActiveScreen navigate={navigate} />}
          {page === 'notes'           && <NotesScreen />}
          {page === 'block-defense'   && <BlockDefenseScreen navigate={navigate} />}
          {page === 'keyword-blocker' && <KeywordBlockerScreen navigate={navigate} />}
          {page === 'always-on'       && <AlwaysOnScreen navigate={navigate} />}
          {page === 'changelog'       && <ChangelogScreen navigate={navigate} />}
          {page === 'how-to-use'      && <HowToUseScreen navigate={navigate} />}
          {page === 'privacy'          && <PrivacyScreen navigate={navigate} />}
          {page === 'standalone-block' && <StandaloneBlockScreen navigate={navigate} />}
          {page === 'import-blocklist' && <ImportBlocklistScreen navigate={navigate} />}
          {page === 'daily-allowance'     && <DailyAllowanceScreen navigate={navigate} />}
          {page === 'weekly-report'       && <WeeklyReportScreen navigate={navigate} />}
          {page === 'overlay-appearance'  && <OverlayAppearanceScreen navigate={navigate} />}
          {page === 'allowed-in-focus'    && <AllowedInFocusScreen navigate={navigate} />}
          {page === 'session-history'     && <FocusSessionHistoryScreen navigate={navigate} />}
        </main>
      </div>

      {showShortcuts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowShortcuts(false)}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-80 animate-bounce-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4">⌨️ Keyboard Shortcuts</h3>
            <div className="space-y-2 text-sm">
              {([
                ['1', 'Go to Today'],
                ['2', 'Go to Week View'],
                ['3', 'Go to Focus'],
                ['4', 'Go to Stats'],
                ['5', 'Go to Settings'],
                ['N', 'Quick-add task (Today)'],
                ['F', 'Search tasks'],
                ['?', 'Toggle this panel'],
                ['Esc', 'Close modals / clear search'],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{v}</span>
                  <kbd>{k}</kbd>
                </div>
              ))}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Global shortcuts</p>
                {([
                  ['Ctrl+Shift+Space', 'Show / Hide window'],
                  ['Ctrl+Shift+1', 'Today'],
                  ['Ctrl+Shift+2', 'Week View'],
                  ['Ctrl+Shift+3', 'Focus'],
                  ['Ctrl+Shift+4', 'Stats'],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between mt-1.5">
                    <span className="text-gray-600 dark:text-gray-400 text-xs">{v}</span>
                    <kbd className="text-[10px]">{k}</kbd>
                  </div>
                ))}
              </div>
            </div>
            <button
              className="mt-4 w-full py-2 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors"
              onClick={() => setShowShortcuts(false)}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {pendingMilestone !== null && (
        <AchievementModal
          milestone={pendingMilestone}
          onDismiss={() => {
            updateSettings({ ...state.settings, lastShownStreakMilestone: pendingMilestone })
            setPendingMilestone(null)
          }}
        />
      )}
    </div>
  )
}

function StreakChip() {
  const [streak, setStreak] = React.useState(0)
  React.useEffect(() => {
    window.api.stats.getStreak().then(setStreak).catch(() => {})
  }, [])
  if (streak === 0) return null
  return (
    <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl px-3 py-2">
      <span className="text-base">🔥</span>
      <div>
        <div className="text-xs font-bold text-orange-600 dark:text-orange-400">{streak}-day streak!</div>
        <div className="text-[10px] text-orange-500/70 dark:text-orange-400/60">Keep it up</div>
      </div>
    </div>
  )
}

function TodayProgressBar() {
  const { todayTasks } = useApp()
  const done  = todayTasks.filter(t => t.status === 'completed').length
  const total = todayTasks.length
  if (total === 0) return null
  const pct = Math.round((done / total) * 100)
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#6366f1' : '#f59e0b'
  return (
    <div className="px-3 pb-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold">Today</span>
        <span className="text-[10px] font-bold" style={{ color }}>{done}/{total}</span>
      </div>
      <div className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}
