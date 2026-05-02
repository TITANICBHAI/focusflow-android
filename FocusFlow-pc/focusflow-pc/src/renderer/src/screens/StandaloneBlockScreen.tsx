import React, { useState, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import type { AppSettings } from '../data/types'
import PinModal from '../components/PinModal'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
dayjs.extend(duration)

type Page = 'today' | 'week' | 'focus' | 'stats' | 'settings' | 'profile' | 'reports' | 'active' | 'notes' | 'block-defense' | 'keyword-blocker' | 'always-on' | 'changelog' | 'how-to-use' | 'privacy' | 'standalone-block' | 'import-blocklist'

const QUICK_DURATIONS = [
  { label: '25m', minutes: 25 },
  { label: '45m', minutes: 45 },
  { label: '1h',  minutes: 60 },
  { label: '90m', minutes: 90 },
  { label: '2h',  minutes: 120 },
  { label: '4h',  minutes: 240 },
]

function pad(n: number) { return String(Math.floor(n)).padStart(2, '0') }

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

function CircleProgress({ pct, color, size = 200, strokeWidth = 14, children }: {
  pct: number; color: string; size?: number; strokeWidth?: number; children?: React.ReactNode
}) {
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - Math.max(0, Math.min(1, pct)))
  const cx = size / 2
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-gray-100 dark:text-gray-700" />
        <circle
          cx={cx} cy={cx} r={r} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  )
}

export default function StandaloneBlockScreen({ navigate }: { navigate: (p: Page) => void }) {
  const { state, updateSettings } = useApp()
  const { settings } = state

  const [now, setNow] = useState(Date.now())
  const [selectedMinutes, setSelectedMinutes] = useState(60)
  const [customInput, setCustomInput] = useState('')
  const [confirmStop, setConfirmStop] = useState(false)
  const [showPin, setShowPin] = useState(false)

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(iv)
  }, [])

  const update = useCallback((partial: Partial<AppSettings>) => {
    updateSettings({ ...settings, ...partial })
  }, [settings, updateSettings])

  const blockUntil = settings.standaloneBlockUntil ? dayjs(settings.standaloneBlockUntil).valueOf() : null
  const isActive = blockUntil !== null && blockUntil > now
  const remaining = isActive ? blockUntil! - now : 0
  const totalMs = isActive && blockUntil ? blockUntil - (blockUntil - remaining) : selectedMinutes * 60000
  const pct = isActive ? remaining / (selectedMinutes * 60000) : 0

  const blockedSites = (settings.blockedWebsites ?? []).filter(s => s.enabled)
  const totalSites = settings.blockedWebsites?.length ?? 0

  const startBlock = () => {
    const mins = customInput.trim() ? parseInt(customInput, 10) : selectedMinutes
    if (!mins || isNaN(mins) || mins <= 0) return
    const until = dayjs().add(mins, 'minute').toISOString()
    update({ standaloneBlockUntil: until, blockedWebsitesEnabled: true })
    setCustomInput('')
  }

  const doStop = () => {
    update({ standaloneBlockUntil: null })
    setConfirmStop(false)
    setShowPin(false)
  }

  const stopBlock = () => {
    if (settings.sessionPin) { setShowPin(true); return }
    if (!confirmStop) { setConfirmStop(true); setTimeout(() => setConfirmStop(false), 4000); return }
    doStop()
  }

  const effectiveMinutes = customInput.trim() ? (parseInt(customInput, 10) || selectedMinutes) : selectedMinutes

  // When block expires, clear it automatically
  useEffect(() => {
    if (blockUntil && now >= blockUntil && settings.standaloneBlockUntil) {
      update({ standaloneBlockUntil: null })
    }
  }, [now, blockUntil, settings.standaloneBlockUntil, update])

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('today')}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          ←
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Standalone Block</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Timed website block — no task or focus session needed
          </p>
        </div>
        {isActive && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-bold text-red-600 dark:text-red-400">Block Active</span>
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="flex-1 overflow-hidden flex">

        {/* LEFT — timer + controls (50%) */}
        <div className="w-1/2 flex flex-col items-center justify-center px-8 py-6 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">

          {isActive ? (
            /* ── Active state ────────────────────────────────── */
            <div className="flex flex-col items-center gap-6 w-full max-w-xs">
              <CircleProgress pct={remaining / (effectiveMinutes * 60000)} color="#ef4444" size={200}>
                <span className="text-3xl font-black text-gray-800 dark:text-gray-100 tabular-nums">
                  {formatCountdown(remaining)}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">remaining</span>
              </CircleProgress>

              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Block ends at{' '}
                  <span className="font-bold text-gray-700 dark:text-gray-200">
                    {dayjs(blockUntil!).format('h:mm A')}
                  </span>
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {blockedSites.length} website{blockedSites.length !== 1 ? 's' : ''} blocked right now
                </p>
              </div>

              <button
                onClick={stopBlock}
                className={`w-full py-3 rounded-2xl font-bold text-sm transition-all ${
                  confirmStop
                    ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30'
                }`}
              >
                {confirmStop ? '⚠️ Click again to confirm stop' : 'Stop Block Early'}
              </button>

              {confirmStop && (
                <button
                  onClick={() => setConfirmStop(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          ) : (
            /* ── Setup state ─────────────────────────────────── */
            <div className="flex flex-col items-center gap-6 w-full max-w-sm">
              <div className="text-center">
                <div className="text-4xl mb-2">⏱</div>
                <p className="text-lg font-bold text-gray-800 dark:text-gray-100">Set a Block Duration</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Websites in your block list will be blocked for this long
                </p>
              </div>

              {/* Quick picks */}
              <div className="w-full">
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Quick pick</p>
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_DURATIONS.map(d => (
                    <button
                      key={d.minutes}
                      onClick={() => { setSelectedMinutes(d.minutes); setCustomInput('') }}
                      className={`py-2.5 rounded-xl text-sm font-bold transition-all border ${
                        selectedMinutes === d.minutes && !customInput.trim()
                          ? 'bg-indigo-500 border-indigo-500 text-white shadow-md'
                          : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-indigo-300 dark:hover:border-indigo-600'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom */}
              <div className="w-full">
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Custom (minutes)</p>
                <input
                  type="number"
                  min={1} max={480}
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && startBlock()}
                  placeholder="e.g. 35"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Ready to block for{' '}
                  <span className="font-bold text-gray-700 dark:text-gray-200">
                    {effectiveMinutes >= 60
                      ? `${effectiveMinutes / 60}h${effectiveMinutes % 60 > 0 ? ` ${effectiveMinutes % 60}m` : ''}`
                      : `${effectiveMinutes}m`
                    }
                  </span>
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Ends at {dayjs().add(effectiveMinutes, 'minute').format('h:mm A')}
                </p>
              </div>

              <button
                onClick={startBlock}
                disabled={blockedSites.length === 0 && totalSites === 0}
                className="w-full py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-bold text-base transition-all shadow-lg shadow-red-500/20 hover:-translate-y-0.5"
              >
                🚫 Start Block
              </button>

              {blockedSites.length === 0 && totalSites === 0 && (
                <p className="text-xs text-center text-amber-600 dark:text-amber-400">
                  No blocked websites configured.{' '}
                  <button onClick={() => navigate('block-defense')} className="underline font-semibold">
                    Add sites in Block Defense →
                  </button>
                </p>
              )}
              {blockedSites.length === 0 && totalSites > 0 && (
                <p className="text-xs text-center text-amber-600 dark:text-amber-400">
                  You have {totalSites} site{totalSites !== 1 ? 's' : ''} saved but none are enabled.{' '}
                  <button onClick={() => navigate('block-defense')} className="underline font-semibold">
                    Enable in Block Defense →
                  </button>
                </p>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — status + blocked list + tips (50%) */}
        <div className="w-1/2 overflow-y-auto px-6 py-5 space-y-4">

          {/* Status strip */}
          <div className={`rounded-2xl border p-4 flex items-center gap-4 ${
            isActive
              ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
              : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
          }`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
              isActive ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'
            }`}>
              {isActive ? '🔴' : '⚪'}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-bold ${isActive ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                {isActive ? 'Block is running' : 'No block active'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {isActive
                  ? `${blockedSites.length} site${blockedSites.length !== 1 ? 's' : ''} blocked · ends ${dayjs(blockUntil!).format('h:mm A')}`
                  : 'Start a block on the left — pick any duration'}
              </p>
            </div>
          </div>

          {/* What gets blocked */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-700">
              <span className="text-base">🌐</span>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200">What gets blocked</span>
              <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                {blockedSites.length}/{totalSites} sites enabled
              </span>
              <button
                onClick={() => navigate('block-defense')}
                className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold ml-2"
              >
                Edit →
              </button>
            </div>
            {blockedSites.length === 0 ? (
              <div className="px-4 py-4 text-center">
                <p className="text-sm text-gray-400 dark:text-gray-500">No websites enabled in your block list</p>
                <button
                  onClick={() => navigate('block-defense')}
                  className="mt-2 text-sm text-indigo-500 hover:text-indigo-700 font-bold"
                >
                  Add websites in Block Defense →
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-700 max-h-40 overflow-y-auto">
                {blockedSites.map(s => (
                  <div key={s.id} className="flex items-center gap-2 px-4 py-2">
                    <span className="text-red-400 text-xs">🚫</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{s.domain}</span>
                  </div>
                ))}
                {totalSites > blockedSites.length && (
                  <p className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500">
                    +{totalSites - blockedSites.length} disabled site{totalSites - blockedSites.length !== 1 ? 's' : ''} (not blocked during this session)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Always-On reminder */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Other enforcement layers</p>
            <div className="space-y-2">
              {[
                {
                  icon: '♾️',
                  label: 'Always-On Block List',
                  desc: `${settings.alwaysOnPackages?.length ?? 0} domains — always active`,
                  active: (settings.alwaysOnEnforcementEnabled ?? false) && (settings.alwaysOnPackages?.length ?? 0) > 0,
                  action: () => navigate('always-on'),
                },
                {
                  icon: '⏰',
                  label: 'Block Schedules',
                  desc: `${(settings.recurringBlockSchedules ?? []).filter(s => s.enabled).length} schedules active`,
                  active: (settings.recurringBlockSchedules ?? []).filter(s => s.enabled).length > 0,
                  action: () => navigate('block-defense'),
                },
                {
                  icon: '🔤',
                  label: 'Keyword Blocker',
                  desc: `${settings.blockedWords?.length ?? 0} keywords`,
                  active: (settings.blockedWords?.length ?? 0) > 0,
                  action: () => navigate('keyword-blocker'),
                },
              ].map(layer => (
                <div key={layer.label} className="flex items-center gap-3">
                  <span className="text-base w-6 text-center flex-shrink-0">{layer.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{layer.label}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">{layer.desc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      layer.active
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                    }`}>
                      {layer.active ? 'ON' : 'OFF'}
                    </span>
                    <button onClick={layer.action} className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold">Edit</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">💡 Tips</p>
            <ul className="space-y-1.5">
              {[
                'A standalone block uses the same website list as your focus sessions — enable sites in Block Defense first.',
                'For 24/7 blocking with no timer, use the Always-On Block List instead.',
                'Block schedules run independently of standalone blocks — both can run simultaneously.',
                'If you finish early, click "Stop Block Early" and confirm. Closing the app keeps the block running.',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                  <span className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {showPin && settings.sessionPin && (
        <PinModal
          storedHash={settings.sessionPin}
          title="PIN Required"
          subtitle="Enter your session PIN to stop this block early."
          onSuccess={doStop}
          onCancel={() => setShowPin(false)}
        />
      )}
    </div>
  )
}
