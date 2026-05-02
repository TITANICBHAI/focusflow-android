import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { formatTime } from '../services/taskService'
import dayjs from 'dayjs'

type Page = 'today' | 'week' | 'focus' | 'stats' | 'settings' | 'profile' | 'reports' | 'active' | 'notes' | 'block-defense' | 'keyword-blocker' | 'always-on' | 'changelog' | 'how-to-use' | 'privacy' | 'standalone-block' | 'import-blocklist'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function ActiveScreen({ navigate }: { navigate: (p: Page) => void }) {
  const { state, stopFocusMode, todayTasks } = useApp()
  const { settings } = state
  const [focusMinutes, setFocusMinutes] = useState(0)
  const [overrideCount, setOverrideCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      const [fm, ov] = await Promise.all([
        window.api.focus.getTodayMinutes().catch(() => 0),
        window.api.stats.getTodayOverrides().catch(() => 0),
      ])
      setFocusMinutes(fm); setOverrideCount(ov)
    }
    load()
    const iv = setInterval(load, 30000)
    return () => clearInterval(iv)
  }, [state.focusSession])

  const focusActive = state.focusSession?.isActive === true
  const focusTask = focusActive ? state.tasks.find(t => t.id === state.focusSession?.taskId) : null

  const done = todayTasks.filter(t => t.status === 'completed').length
  const total = todayTasks.length
  const rate = total > 0 ? Math.round((done / total) * 100) : 0

  const schedules = settings.recurringBlockSchedules ?? []
  const activeScheduleCount = schedules.filter(s => s.enabled).length

  // Determine which schedules are currently active (within their time window today)
  const now = new Date()
  const currentDay = now.getDay()
  const currentHour = now.getHours()
  const currentMin = now.getMinutes()
  const currentMins = currentHour * 60 + currentMin

  const liveSchedules = schedules.filter(s => {
    if (!s.enabled) return false
    if (!s.days.includes(currentDay)) return false
    const start = s.startHour * 60 + s.startMin
    const end = s.endHour * 60 + s.endMin
    return currentMins >= start && currentMins < end
  })

  const standaloneUntil = settings.standaloneBlockUntil ? new Date(settings.standaloneBlockUntil) : null
  const standaloneActive = standaloneUntil !== null && standaloneUntil > new Date()
  const standaloneRemaining = standaloneActive && standaloneUntil
    ? Math.max(0, Math.round((standaloneUntil.getTime() - Date.now()) / 60000))
    : 0

  const layers = [
    {
      label: 'Focus Session',
      on: focusActive,
      icon: '🛡',
      desc: focusTask ? `"${focusTask.title}"` : 'No active session',
      color: '#6366f1',
      action: focusActive ? undefined : () => navigate('focus'),
      actionLabel: 'Start',
    },
    {
      label: 'Standalone Block',
      on: standaloneActive,
      icon: '⏱',
      desc: standaloneActive
        ? `Running — ${standaloneRemaining}m remaining (ends ${standaloneUntil ? new Date(standaloneUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''})`
        : 'No timed block active',
      color: '#f43f5e',
      action: () => navigate('standalone-block' | 'import-blocklist'),
      actionLabel: standaloneActive ? 'View' : 'Start',
    },
    {
      label: 'Website Blocking',
      on: settings.blockedWebsitesEnabled && (settings.blockedWebsites?.length ?? 0) > 0,
      icon: '🌐',
      desc: settings.blockedWebsitesEnabled
        ? `${settings.blockedWebsites?.length ?? 0} site${(settings.blockedWebsites?.length ?? 0) !== 1 ? 's' : ''} blocked`
        : `${settings.blockedWebsites?.length ?? 0} sites saved (disabled)`,
      color: '#3b82f6',
      action: () => navigate('block-defense'),
      actionLabel: 'Edit',
    },
    {
      label: 'Keyword Blocker',
      on: (settings.blockedWords?.length ?? 0) > 0,
      icon: '🔤',
      desc: (settings.blockedWords?.length ?? 0) > 0
        ? `${settings.blockedWords?.length ?? 0} keywords monitored`
        : 'No keywords set',
      color: '#8b5cf6',
      action: () => navigate('keyword-blocker'),
      actionLabel: 'Edit',
    },
    {
      label: 'Block Schedules',
      on: activeScheduleCount > 0,
      icon: '⏰',
      desc: activeScheduleCount > 0
        ? `${activeScheduleCount}/${schedules.length} schedule${schedules.length !== 1 ? 's' : ''} enabled${liveSchedules.length > 0 ? ` (${liveSchedules.length} live now)` : ''}`
        : schedules.length > 0 ? 'All schedules disabled' : 'No schedules configured',
      color: '#f59e0b',
      action: () => navigate('block-defense'),
      actionLabel: 'Edit',
    },
    {
      label: 'Always-On Block List',
      on: (settings.alwaysOnEnforcementEnabled ?? false) && (settings.alwaysOnPackages?.length ?? 0) > 0,
      icon: '♾️',
      desc: (settings.alwaysOnPackages?.length ?? 0) > 0
        ? `${settings.alwaysOnPackages?.length ?? 0} domain${(settings.alwaysOnPackages?.length ?? 0) !== 1 ? 's' : ''} blocked 24/7${settings.alwaysOnEnforcementEnabled ? '' : ' (enforcement off)'}`
        : 'No domains added',
      color: '#ef4444',
      action: () => navigate('always-on'),
      actionLabel: 'Edit',
    },
    {
      label: 'Pomodoro Timer',
      on: settings.pomodoroEnabled,
      icon: '🍅',
      desc: settings.pomodoroEnabled
        ? `${settings.pomodoroDuration}m focus / ${settings.pomodoroBreak}m break`
        : 'Off',
      color: '#ef4444',
      action: () => navigate('settings'),
      actionLabel: 'Edit',
    },
  ]

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Active Status</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Live view of all enforcement layers</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

        {/* Focus session card */}
        <div className={`rounded-2xl p-4 border-2 ${focusActive ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 shadow-md shadow-indigo-100 dark:shadow-indigo-900/30' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${focusActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`} />
              <span className="text-sm font-bold text-gray-800 dark:text-gray-100">Focus Session</span>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${focusActive ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'}`}>
              {focusActive ? '● LIVE' : '○ OFF'}
            </span>
          </div>
          {focusActive && focusTask ? (
            <div>
              <p className="text-base font-bold text-indigo-600 dark:text-indigo-400 mb-1">"{focusTask.title}"</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{formatTime(focusTask.startTime)} → {formatTime(focusTask.endTime)}</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => navigate('focus')} className="flex-1 py-1.5 rounded-xl bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-600 transition-colors">Open Focus</button>
                <button onClick={() => { if (confirm('Stop focus mode?')) stopFocusMode() }} className="flex-1 py-1.5 rounded-xl border border-red-300 dark:border-red-700 text-red-500 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Stop</button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-2">No active focus session</p>
              <button onClick={() => navigate('focus')} className="px-4 py-1.5 rounded-xl bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-600 transition-colors">Start Focus</button>
            </div>
          )}
        </div>

        {/* Live block schedule alert */}
        {liveSchedules.length > 0 && (
          <div className="rounded-2xl p-3 border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 flex items-start gap-3 animate-fade-in">
            <span className="text-lg mt-0.5">⏰</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                {liveSchedules.length} Block Schedule{liveSchedules.length !== 1 ? 's' : ''} Active Right Now
              </p>
              {liveSchedules.map(s => (
                <p key={s.id} className="text-xs text-amber-600 dark:text-amber-400/80 mt-0.5">
                  {s.name} — until {s.endHour % 12 === 0 ? 12 : s.endHour % 12}:{String(s.endMin).padStart(2, '0')} {s.endHour >= 12 ? 'PM' : 'AM'}
                  {s.packages.length > 0 && ` · ${s.packages.slice(0, 3).join(', ')}${s.packages.length > 3 ? ` +${s.packages.length - 3}` : ''}`}
                </p>
              ))}
            </div>
            <button onClick={() => navigate('block-defense')} className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline">Edit →</button>
          </div>
        )}

        {/* Today's stats */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Today's Stats</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-black text-indigo-500">{focusMinutes >= 60 ? `${Math.floor(focusMinutes/60)}h${focusMinutes%60>0?`${focusMinutes%60}m`:''}` : `${focusMinutes}m`}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Focus time</p>
            </div>
            <div>
              <p className="text-2xl font-black" style={{ color: rate >= 80 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#ef4444' }}>{rate}%</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Completion</p>
            </div>
            <div>
              <p className="text-2xl font-black text-orange-500">{overrideCount}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Overrides</p>
            </div>
          </div>
          {total > 0 && (
            <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${rate}%` }} />
            </div>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 text-center">{done}/{total} tasks done today</p>
        </div>

        {/* Enforcement layers */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
          <div className="px-4 py-2.5 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Enforcement Layers</p>
            <button onClick={() => navigate('block-defense')} className="text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold">Configure →</button>
          </div>
          {layers.map(layer => (
            <div key={layer.label} className="flex items-center gap-3 px-4 py-3">
              <span className="text-lg">{layer.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{layer.label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{layer.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full ${layer.on ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${layer.on ? 'bg-green-500' : 'bg-gray-400'}`} />
                  {layer.on ? 'ON' : 'OFF'}
                </div>
                {layer.action && (
                  <button onClick={layer.action} className="text-xs text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 font-semibold">
                    {layer.actionLabel}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Block Schedules detail (collapsed by default) */}
        {schedules.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-2.5 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Block Schedules</p>
              <button onClick={() => navigate('block-defense')} className="text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold">Manage →</button>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {schedules.map(sched => {
                const isLive = liveSchedules.some(s => s.id === sched.id)
                const startLabel = `${sched.startHour % 12 === 0 ? 12 : sched.startHour % 12}:${String(sched.startMin).padStart(2,'0')} ${sched.startHour >= 12 ? 'PM' : 'AM'}`
                const endLabel   = `${sched.endHour   % 12 === 0 ? 12 : sched.endHour   % 12}:${String(sched.endMin).padStart(2,'0')} ${sched.endHour   >= 12 ? 'PM' : 'AM'}`
                const daysLabel = sched.days.length === 7 ? 'Every day' : JSON.stringify(sched.days.sort()) === JSON.stringify([1,2,3,4,5]) ? 'Weekdays' : sched.days.map(d => DAYS[d]).join(', ')
                return (
                  <div key={sched.id} className={`flex items-center gap-3 px-4 py-3 ${isLive ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isLive ? 'bg-amber-500 animate-pulse' : sched.enabled ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{sched.name}</p>
                        {isLive && <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">LIVE</span>}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                        {daysLabel} · {startLabel} – {endLabel}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sched.enabled ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                      {sched.enabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Quick Actions</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => navigate('today')} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
              <span>📅</span><span className="text-sm font-semibold text-gray-700 dark:text-gray-300">View Today</span>
            </button>
            <button onClick={() => navigate('focus')} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors">
              <span>🛡</span><span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Focus Mode</span>
            </button>
            <button onClick={() => navigate('block-defense')} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
              <span>🛡</span><span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Block Defense</span>
            </button>
            <button onClick={() => navigate('reports')} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
              <span>📋</span><span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Reports</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
