import React, { useEffect, useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { formatDuration } from '../services/taskService'
import dayjs from 'dayjs'

type Range = 'yesterday' | 'today' | 'week' | 'alltime'

export default function ReportsScreen({ onBack }: { onBack: () => void }) {
  const { state } = useApp()
  const [range, setRange] = useState<Range>('today')
  const [loading, setLoading] = useState(true)
  const [focusMinsToday, setFocusMinsToday] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [allTimeFocus, setAllTimeFocus] = useState(0)
  const [allTimeSessions, setAllTimeSessions] = useState(0)
  const [todayOverrides, setTodayOverrides] = useState(0)
  const [dayCompletions, setDayCompletions] = useState<{ date: string; completed: number; total: number }[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [fm, s, bs, atm, ats, ov, days] = await Promise.all([
        window.api.focus.getTodayMinutes().catch(() => 0),
        window.api.stats.getStreak().catch(() => 0),
        window.api.stats.getBestStreak().catch(() => 0),
        window.api.stats.getAllTimeFocusMins().catch(() => 0),
        window.api.stats.getAllTimeSessions().catch(() => 0),
        window.api.stats.getTodayOverrides().catch(() => 0),
        window.api.stats.getRecentDayCompletions(30).catch(() => []),
      ])
      setFocusMinsToday(fm); setStreak(s); setBestStreak(bs)
      setAllTimeFocus(atm); setAllTimeSessions(ats); setTodayOverrides(ov); setDayCompletions(days)
      setLoading(false)
    }
    load()
  }, [])

  const tasks = state.tasks

  const breakdown = useMemo(() => {
    let source: typeof tasks = []
    if (range === 'today') {
      const today = dayjs().startOf('day'); const tomorrow = today.add(1, 'day')
      source = tasks.filter(t => dayjs(t.startTime).isSameOrAfter(today) && dayjs(t.startTime).isBefore(tomorrow))
    } else if (range === 'yesterday') {
      const yesterday = dayjs().subtract(1,'day').startOf('day'); const today = dayjs().startOf('day')
      source = tasks.filter(t => dayjs(t.startTime).isSameOrAfter(yesterday) && dayjs(t.startTime).isBefore(today))
    } else if (range === 'week') {
      const weekAgo = dayjs().subtract(7,'day').startOf('day')
      source = tasks.filter(t => dayjs(t.startTime).isSameOrAfter(weekAgo))
    } else {
      source = tasks
    }
    const total = source.length
    const completed = source.filter(t => t.status === 'completed').length
    const skipped = source.filter(t => t.status === 'skipped').length
    const remaining = source.filter(t => t.status === 'scheduled').length
    const actualMins = source.reduce((sum, t) => sum + t.durationMinutes, 0)
    return { total, completed, skipped, remaining, actualMins }
  }, [tasks, range])

  const last30Days = useMemo(() => {
    const days = []
    for (let i = 29; i >= 0; i--) {
      const d = dayjs().subtract(i, 'day')
      const dateStr = d.format('YYYY-MM-DD')
      const comp = dayCompletions.find(c => c.date === dateStr)
      days.push({ day: d.format('ddd'), date: dateStr, label: d.format('M/D'), completed: comp?.completed ?? 0, total: comp?.total ?? 0 })
    }
    return days
  }, [dayCompletions])

  const weeklySummary = last30Days.slice(-7)

  const focusFeedback = useMemo(() => {
    const h = Math.floor(focusMinsToday / 60)
    if (focusMinsToday === 0) return { icon: '😴', message: 'No focus time logged today. Start a task to begin.' }
    if (h >= 4) return { icon: '🚀', message: `Incredible — ${h}h of focused work today! Deep-work zone.` }
    if (h >= 2) return { icon: '💪', message: `Great work! ${h}h ${focusMinsToday % 60}m of focus. Keep pushing.` }
    return { icon: '🌱', message: `${focusMinsToday}m of focus so far. Every minute counts!` }
  }, [focusMinsToday])

  const completionRate = breakdown.total > 0 ? Math.round((breakdown.completed / breakdown.total) * 100) : 0
  const avgDailyFocus = last30Days.length > 0
    ? Math.round(dayCompletions.reduce((s, d) => s + (d.completed || 0), 0) / Math.max(1, dayCompletions.length))
    : 0

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">‹</button>
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Reports</h1>
        <div className="ml-auto flex gap-2">
          {(['today','yesterday','week','alltime'] as Range[]).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${range === r ? 'bg-indigo-500 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
              {r === 'alltime' ? 'All Time' : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left column — focus summary + task breakdown */}
        <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 overflow-y-auto px-6 py-5 space-y-4">

          {/* Focus hero */}
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-5 text-white">
            <div className="flex items-start gap-3">
              <span className="text-4xl">{focusFeedback.icon}</span>
              <div className="flex-1">
                <p className="text-xs font-bold opacity-70 uppercase tracking-wider mb-0.5">Focus Time Today</p>
                <p className="text-3xl font-black tabular-nums">
                  {focusMinsToday >= 60 ? `${Math.floor(focusMinsToday/60)}h ${focusMinsToday%60}m` : `${focusMinsToday}m`}
                </p>
                <p className="text-xs opacity-80 mt-1">{focusFeedback.message}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/20">
              {[
                { val: streak, label: 'Streak', suffix: 'd' },
                { val: bestStreak, label: 'Best', suffix: 'd' },
                { val: allTimeSessions, label: 'Sessions', suffix: '' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-xl font-black">{s.val}{s.suffix}</p>
                  <p className="text-[10px] opacity-70 uppercase tracking-wide">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Overrides warning */}
          {todayOverrides > 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-sm font-bold text-orange-600 dark:text-orange-400">{todayOverrides} focus override{todayOverrides !== 1 ? 's' : ''} today</p>
                <p className="text-xs text-orange-500/70">Each override breaks flow. Aim for zero.</p>
              </div>
            </div>
          )}

          {/* Task breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
              Task Breakdown — {range === 'alltime' ? 'All Time' : range.charAt(0).toUpperCase() + range.slice(1)}
            </p>
            {breakdown.total === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">No tasks in this range</p>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'Completed', value: breakdown.completed, icon: '✅', color: '#10b981' },
                  { label: 'Remaining', value: breakdown.remaining, icon: '⏳', color: '#3b82f6' },
                  { label: 'Skipped', value: breakdown.skipped, icon: '⏭', color: '#9ca3af' },
                ].filter(r => r.value > 0).map(r => (
                  <div key={r.label} className="flex items-center gap-3">
                    <span className="text-sm w-5">{r.icon}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-20">{r.label}</span>
                    <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ backgroundColor: r.color, width: `${(r.value / breakdown.total) * 100}%` }} />
                    </div>
                    <span className="text-xs font-black w-5 text-right tabular-nums" style={{ color: r.color }}>{r.value}</span>
                  </div>
                ))}
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Scheduled Time</p>
                    <p className="text-base font-black text-gray-700 dark:text-gray-200">{formatDuration(breakdown.actualMins)}</p>
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Completion</p>
                    <p className="text-base font-black text-indigo-600 dark:text-indigo-400">{completionRate}%</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* All-time focus total */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Lifetime Stats</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Focus Hours', value: `${Math.floor(allTimeFocus/60)}h ${allTimeFocus%60}m`, icon: '⏱', color: '#6366f1' },
                { label: 'Sessions', value: String(allTimeSessions), icon: '🎯', color: '#10b981' },
                { label: 'Best Streak', value: `${bestStreak}d`, icon: '🔥', color: '#f59e0b' },
                { label: 'Avg / Day', value: `${avgDailyFocus} tasks`, icon: '📈', color: '#8b5cf6' },
              ].map(stat => (
                <div key={stat.label} className="rounded-xl p-3" style={{ backgroundColor: stat.color + '15' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-base">{stat.icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: stat.color }}>{stat.label}</span>
                  </div>
                  <p className="text-xl font-black text-gray-800 dark:text-gray-100">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column — charts + trends */}
        <div className="w-1/2 overflow-y-auto px-6 py-5 space-y-4">

          {/* 7-day bar chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">Last 7 Days — Completion</p>
            <div className="flex items-end gap-2 h-28">
              {weeklySummary.map(d => {
                const rate = d.total > 0 ? d.completed / d.total : 0
                const isToday = d.date === dayjs().format('YYYY-MM-DD')
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] font-bold tabular-nums" style={{ color: rate > 0 ? '#6366f1' : '#9ca3af' }}>
                      {d.total > 0 ? `${Math.round(rate * 100)}%` : '–'}
                    </span>
                    <div className="w-full rounded-t-lg overflow-hidden flex flex-col justify-end" style={{ height: 72, backgroundColor: '#e0e7ff' }}>
                      <div
                        className="w-full rounded-t-lg transition-all"
                        style={{
                          backgroundColor: isToday ? '#6366f1' : '#a5b4fc',
                          height: `${Math.max(rate * 100, d.completed > 0 ? 5 : 0)}%`
                        }}
                      />
                    </div>
                    <span className={`text-[9px] font-bold ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`}>{d.day}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-indigo-500" />
                <span className="text-[10px] text-gray-400">Today</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#a5b4fc' }} />
                <span className="text-[10px] text-gray-400">Past days</span>
              </div>
            </div>
          </div>

          {/* 30-day heatmap */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">30-Day Activity</p>
            <div className="flex flex-wrap gap-1">
              {last30Days.map(d => {
                const rate = d.total > 0 ? d.completed / d.total : -1
                const isToday = d.date === dayjs().format('YYYY-MM-DD')
                const bg = rate < 0 ? '#f3f4f6' : rate === 0 ? '#fef3c7' : rate < 0.5 ? '#c7d2fe' : rate < 1 ? '#818cf8' : '#4f46e5'
                const bgDark = rate < 0 ? '#374151' : rate === 0 ? '#451a03' : rate < 0.5 ? '#312e81' : rate < 1 ? '#4338ca' : '#6366f1'
                return (
                  <div key={d.date} title={`${d.label}: ${d.completed}/${d.total} tasks${isToday ? ' (today)' : ''}`}
                    className={`w-6 h-6 rounded-sm cursor-default transition-all ${isToday ? 'ring-2 ring-indigo-500' : ''}`}
                    style={{ backgroundColor: bg }}
                  />
                )
              })}
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              {[
                { label: 'No tasks', bg: '#f3f4f6' },
                { label: 'Partial', bg: '#c7d2fe' },
                { label: 'Good', bg: '#818cf8' },
                { label: 'Perfect', bg: '#4f46e5' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.bg }} />
                  <span className="text-[9px] text-gray-400">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Focus Insights */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Insights</p>
            <div className="space-y-3">
              {[
                {
                  icon: streak >= 3 ? '🔥' : '💡',
                  title: streak >= 3 ? `${streak}-day streak active` : 'Build your streak',
                  desc: streak >= 3
                    ? `You've completed tasks for ${streak} days straight. Keep going!`
                    : `Complete tasks today to start a streak. Current: ${streak}d`,
                  color: streak >= 3 ? '#f59e0b' : '#6366f1',
                },
                {
                  icon: completionRate >= 80 ? '🎯' : completionRate >= 50 ? '📈' : '📉',
                  title: `${completionRate}% completion (${range})`,
                  desc: completionRate >= 80
                    ? 'Excellent focus discipline. You\'re hitting your targets consistently.'
                    : completionRate >= 50
                    ? 'Good progress. Try reducing scheduled tasks or increasing focus sessions.'
                    : 'Room to improve. Consider shorter tasks or fewer distractions.',
                  color: completionRate >= 80 ? '#10b981' : completionRate >= 50 ? '#3b82f6' : '#ef4444',
                },
                {
                  icon: todayOverrides > 0 ? '⚠️' : '✅',
                  title: todayOverrides > 0 ? `${todayOverrides} override${todayOverrides > 1 ? 's' : ''} today` : 'No overrides today',
                  desc: todayOverrides > 0
                    ? 'Overrides break your flow and signal distraction triggers. Investigate what caused them.'
                    : 'Clean focus session — no emergency interruptions logged.',
                  color: todayOverrides > 0 ? '#f59e0b' : '#10b981',
                },
              ].map(ins => (
                <div key={ins.title} className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: ins.color + '12' }}>
                  <span className="text-xl">{ins.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{ins.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{ins.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
