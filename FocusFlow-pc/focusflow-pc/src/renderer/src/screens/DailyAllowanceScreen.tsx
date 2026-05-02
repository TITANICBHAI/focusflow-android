import React, { useState, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import type { AppSettings, DailyAllowanceEntry, DailyAllowanceUsage } from '../data/types'
import dayjs from 'dayjs'

type Page = 'today' | 'week' | 'focus' | 'stats' | 'settings' | 'profile' | 'reports' | 'active' | 'notes' | 'block-defense' | 'keyword-blocker' | 'always-on' | 'changelog' | 'how-to-use' | 'privacy' | 'standalone-block' | 'import-blocklist' | 'daily-allowance'

function makeid() { return Math.random().toString(36).slice(2, 10) }
const TODAY = dayjs().format('YYYY-MM-DD')

function getUsage(usage: DailyAllowanceUsage[] | undefined, id: string): DailyAllowanceUsage {
  return usage?.find(u => u.id === id && u.date === TODAY) ?? { id, date: TODAY, usedMinutes: 0, lastStarted: null }
}

function formatMins(m: number): string {
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function CircleGauge({ pct, color, size = 56, children }: { pct: number; color: string; size?: number; children?: React.ReactNode }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(1, Math.max(0, pct)))
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={6} className="text-gray-100 dark:text-gray-700" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black" style={{ color }}>
        {children}
      </div>
    </div>
  )
}

export default function DailyAllowanceScreen({ navigate }: { navigate: (p: Page) => void }) {
  const { state, updateSettings } = useApp()
  const { settings } = state
  const [now, setNow] = useState(Date.now())
  const [showAdd, setShowAdd] = useState(false)
  const [addDomain, setAddDomain] = useState('')
  const [addMode, setAddMode] = useState<'time_budget' | 'interval'>('time_budget')
  const [addBudget, setAddBudget] = useState(30)
  const [addInterval, setAddInterval] = useState(10)
  const [addIntervalGap, setAddIntervalGap] = useState(2)

  const update = useCallback((partial: Partial<AppSettings>) => updateSettings({ ...settings, ...partial }), [settings, updateSettings])

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(iv)
  }, [])

  const allowances = settings.dailyAllowances ?? []
  const usages = settings.dailyAllowanceUsage ?? []

  const getUsageForEntry = (id: string) => getUsage(usages, id)

  const updateUsage = (id: string, partial: Partial<DailyAllowanceUsage>) => {
    const existing = getUsageForEntry(id)
    const updated = { ...existing, ...partial }
    const newUsages = usages.filter(u => !(u.id === id && u.date === TODAY))
    update({ dailyAllowanceUsage: [...newUsages, updated] })
  }

  const startVisit = (id: string) => {
    const u = getUsageForEntry(id)
    if (u.lastStarted) return
    updateUsage(id, { lastStarted: new Date().toISOString() })
  }

  const stopVisit = (id: string) => {
    const u = getUsageForEntry(id)
    if (!u.lastStarted) return
    const elapsed = Math.round((Date.now() - new Date(u.lastStarted).getTime()) / 60000)
    updateUsage(id, { usedMinutes: u.usedMinutes + Math.max(0, elapsed), lastStarted: null })
  }

  const getLiveMinutes = (id: string): number => {
    const u = getUsageForEntry(id)
    if (u.lastStarted) {
      return u.usedMinutes + Math.round((now - new Date(u.lastStarted).getTime()) / 60000)
    }
    return u.usedMinutes
  }

  const addEntry = () => {
    const domain = addDomain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '')
    if (!domain || !domain.includes('.')) return
    const entry: DailyAllowanceEntry = {
      id: makeid(), domain, mode: addMode, budgetMinutes: addBudget,
      intervalMinutes: addInterval, intervalHours: addIntervalGap, enabled: true
    }
    update({ dailyAllowances: [...allowances, entry] })
    setShowAdd(false); setAddDomain('')
  }

  const removeEntry = (id: string) => {
    stopVisit(id)
    update({ dailyAllowances: allowances.filter(a => a.id !== id) })
  }

  const toggleEntry = (id: string) => {
    update({ dailyAllowances: allowances.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a) })
  }

  const canStartInteval = (entry: DailyAllowanceEntry): boolean => {
    const u = getUsageForEntry(entry.id)
    if (entry.mode !== 'interval') return true
    const lastStop = usages.find(u2 => u2.id === entry.id && u2.date === TODAY)
    if (!lastStop || lastStop.usedMinutes === 0) return true
    return false
  }

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Left — entry list */}
      <div className="flex flex-col w-1/2 border-r border-gray-200 dark:border-gray-700">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-3 mb-0.5">
            <button onClick={() => navigate('settings')} className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">← Back</button>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Daily Allowance</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Set daily time budgets for specific websites and track usage manually.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {allowances.length === 0 && !showAdd && (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <div className="text-4xl mb-3">⏳</div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No daily allowances set</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Add a site to set how long you allow yourself to visit it each day</p>
            </div>
          )}

          {allowances.map(entry => {
            const usedMins = getLiveMinutes(entry.id)
            const budgetMins = entry.mode === 'time_budget' ? entry.budgetMinutes : entry.intervalMinutes
            const pct = Math.min(1, usedMins / budgetMins)
            const exceeded = usedMins >= budgetMins
            const u = getUsageForEntry(entry.id)
            const isRunning = !!u.lastStarted
            const color = exceeded ? '#ef4444' : usedMins >= budgetMins * 0.8 ? '#f59e0b' : '#6366f1'

            return (
              <div key={entry.id} className={`bg-white dark:bg-gray-800 rounded-2xl border p-4 transition-all ${
                !entry.enabled ? 'opacity-50 border-gray-200 dark:border-gray-700' :
                exceeded ? 'border-red-300 dark:border-red-700' :
                isRunning ? 'border-indigo-400 dark:border-indigo-600 shadow-sm' :
                'border-gray-200 dark:border-gray-700'
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  <CircleGauge pct={pct} color={color} size={52}>
                    {Math.round(pct * 100)}%
                  </CircleGauge>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{entry.domain}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        entry.mode === 'time_budget' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                      }`}>{entry.mode === 'time_budget' ? 'Budget' : 'Interval'}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {entry.mode === 'time_budget'
                        ? `${formatMins(usedMins)} of ${formatMins(entry.budgetMinutes)} used today`
                        : `${formatMins(usedMins)} / ${formatMins(entry.intervalMinutes)} this visit · every ${entry.intervalHours}h`}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => toggleEntry(entry.id)}
                      className={`text-[9px] font-bold px-2 py-1 rounded-lg border transition-colors ${
                        entry.enabled ? 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-red-300 hover:text-red-500' : 'border-green-300 text-green-600 hover:bg-green-50'
                      }`}>
                      {entry.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => removeEntry(entry.id)}
                      className="text-[9px] font-bold px-2 py-1 rounded-lg border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      Remove
                    </button>
                  </div>
                </div>

                {exceeded && (
                  <div className="mb-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-xs font-bold text-red-600 dark:text-red-400">⚠️ Daily limit reached for today</p>
                  </div>
                )}

                {entry.enabled && (
                  <div className="flex gap-2">
                    {isRunning ? (
                      <button onClick={() => stopVisit(entry.id)}
                        className="flex-1 py-2 rounded-xl bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        Stop Timer — {formatMins(usedMins - getUsageForEntry(entry.id).usedMinutes)} logged
                      </button>
                    ) : (
                      <button onClick={() => startVisit(entry.id)}
                        disabled={exceeded && entry.mode === 'time_budget'}
                        className="flex-1 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
                        ▶ Start Visit Timer
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Add entry form */}
          {showAdd ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-indigo-400 p-4 space-y-3">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Add Daily Allowance</h3>
              <input value={addDomain} onChange={e => setAddDomain(e.target.value)}
                placeholder="youtube.com"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400" />

              <div className="flex gap-2">
                {(['time_budget', 'interval'] as const).map(m => (
                  <button key={m} onClick={() => setAddMode(m)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${addMode === m ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'}`}>
                    {m === 'time_budget' ? '⏱ Time Budget' : '🔁 Interval'}
                  </button>
                ))}
              </div>

              {addMode === 'time_budget' ? (
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-24">Daily budget</label>
                  <input type="number" min={5} max={480} value={addBudget} onChange={e => setAddBudget(Number(e.target.value))}
                    className="w-20 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm font-bold text-center text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <span className="text-xs text-gray-400">minutes</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-24">Visit length</label>
                    <input type="number" min={5} max={120} value={addInterval} onChange={e => setAddInterval(Number(e.target.value))}
                      className="w-20 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm font-bold text-center text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    <span className="text-xs text-gray-400">minutes</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-24">Every</label>
                    <input type="number" min={1} max={24} value={addIntervalGap} onChange={e => setAddIntervalGap(Number(e.target.value))}
                      className="w-20 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm font-bold text-center text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    <span className="text-xs text-gray-400">hours</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                <button onClick={addEntry} className="flex-1 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold transition-colors">Add Allowance</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)}
              className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-400 dark:text-gray-500 hover:border-indigo-400 hover:text-indigo-500 transition-colors">
              + Add Website Allowance
            </button>
          )}
        </div>
      </div>

      {/* Right — today's summary + how it works */}
      <div className="flex flex-col w-1/2 overflow-y-auto p-6 space-y-4">
        {/* Today's overview */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Today — {dayjs().format('MMMM D, YYYY')}</h2>
          {allowances.filter(a => a.enabled).length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No active allowances yet</p>
          ) : (
            <div className="space-y-3">
              {allowances.filter(a => a.enabled).map(entry => {
                const used = getLiveMinutes(entry.id)
                const budget = entry.mode === 'time_budget' ? entry.budgetMinutes : entry.intervalMinutes
                const pct = Math.min(1, used / budget)
                const color = pct >= 1 ? '#ef4444' : pct >= 0.8 ? '#f59e0b' : '#10b981'
                const u = getUsageForEntry(entry.id)
                return (
                  <div key={entry.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{entry.domain}</span>
                      <span className="text-xs font-bold tabular-nums" style={{ color }}>
                        {formatMins(used)} / {formatMins(budget)}
                        {u.lastStarted && <span className="ml-1 text-indigo-500 animate-pulse">● live</span>}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ backgroundColor: color, width: `${pct * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">How It Works</h2>
          <div className="space-y-3">
            {[
              { icon: '➕', title: 'Add a domain', desc: 'Set a daily time budget (e.g. YouTube: 30 min/day) or an interval limit (e.g. Reddit: 10 min every 2 hours).' },
              { icon: '▶', title: 'Start a timer when you visit', desc: 'When you go to that site, click "Start Visit Timer" in FocusFlow. It tracks elapsed time.' },
              { icon: '⏹', title: 'Stop when you leave', desc: 'Click "Stop Timer" when you close the tab. Used minutes are logged against today\'s budget.' },
              { icon: '⚠️', title: 'Budget exceeded', desc: 'When you hit your limit, FocusFlow shows a warning. Enforcement requires a browser extension — this is a self-accountability tool.' },
            ].map(step => (
              <div key={step.title} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-sm flex-shrink-0">{step.icon}</div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{step.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modes explanation */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Allowance Modes</h2>
          <div className="space-y-3">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
              <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300 mb-1">⏱ Time Budget</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">Total minutes allowed per day across all visits. Once the budget is consumed, no more time for that site today. Best for: YouTube, Netflix, Reddit.</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <p className="text-sm font-bold text-amber-700 dark:text-amber-300 mb-1">🔁 Interval</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">Allows short visits of a fixed duration, spaced out by a minimum gap. E.g. "10 minutes every 2 hours". Best for: email, news, social checking.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
