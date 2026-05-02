import React, { useEffect, useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { getTodayTasks, formatDuration } from '../services/taskService'
import dayjs from 'dayjs'

type Filter = 'today' | 'yesterday' | 'week' | 'alltime'

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, sub }: {
  label: string; value: string | number; icon: string; color: string; sub?: string
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-1 animate-fade-in">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</span>
      </div>
      <span className="text-2xl font-black" style={{ color }}>{value}</span>
      {sub && <span className="text-[10px] text-gray-400 dark:text-gray-500">{sub}</span>}
    </div>
  )
}

// ── Productivity Score ────────────────────────────────────────────────────────
function ProductivityScore({
  completionRate, focusMinutes, goalMinutes, overrides, streak
}: {
  completionRate: number   // 0-100
  focusMinutes: number
  goalMinutes: number      // daily goal in minutes
  overrides: number
  streak: number
}) {
  // Scoring: completion 0-45, focus 0-40, no overrides 0-15
  const compPoints  = Math.round(completionRate * 0.45)
  const focusPoints = goalMinutes > 0
    ? Math.min(40, Math.round((focusMinutes / goalMinutes) * 40))
    : Math.min(40, focusMinutes > 0 ? 40 : 0)
  const overridePoints = Math.max(0, 15 - overrides * 5)
  const score = compPoints + focusPoints + overridePoints

  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 45 ? 'D' : 'F'
  const gradeColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 45 ? '#f97316' : '#ef4444'
  const gradeBg    = score >= 80 ? '#10b98115' : score >= 60 ? '#f59e0b15' : score >= 45 ? '#f9731615' : '#ef444415'
  const msg =
    score >= 90 ? "Outstanding! You're crushing it today 🚀" :
    score >= 80 ? "Excellent focus — great day! 🎯" :
    score >= 70 ? "Good progress, keep the momentum 💪" :
    score >= 60 ? "Decent effort — a bit more focus will help 🔧" :
    score >= 45 ? "You're getting there — stay consistent 📈" :
    "Rough day? Tomorrow is a fresh start 🌱"

  const breakdown = [
    { label: 'Task Completion', pts: compPoints, max: 45, color: '#6366f1' },
    { label: 'Focus Time', pts: focusPoints, max: 40, color: '#10b981' },
    { label: 'No Overrides', pts: overridePoints, max: 15, color: '#f59e0b' },
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Productivity Score</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{msg}</p>
        </div>
        <div className="flex flex-col items-center px-4 py-2 rounded-2xl" style={{ backgroundColor: gradeBg }}>
          <span className="text-3xl font-black leading-none" style={{ color: gradeColor }}>{grade}</span>
          <span className="text-xs font-bold mt-0.5" style={{ color: gradeColor }}>{score}/100</span>
        </div>
      </div>
      {/* Score gauge */}
      <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${score}%`,
            background: `linear-gradient(90deg, ${gradeColor}88, ${gradeColor})`
          }}
        />
      </div>
      {/* Breakdown */}
      <div className="space-y-2.5">
        {breakdown.map(b => (
          <div key={b.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{b.label}</span>
              <span className="text-[11px] font-bold" style={{ color: b.color }}>{b.pts}/{b.max}</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(b.pts / b.max) * 100}%`, backgroundColor: b.color }} />
            </div>
          </div>
        ))}
      </div>
      {streak > 0 && (
        <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
          <span className="text-base">🔥</span>
          <div>
            <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{streak}-day streak</span>
            <span className="text-xs text-orange-400/70 dark:text-orange-500/60 ml-1.5">Keep it going!</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tag Breakdown ─────────────────────────────────────────────────────────────
function TagBreakdown({ tasks }: { tasks: Array<{ tags: string[]; durationMinutes: number; status: string }> }) {
  const tagData = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>()
    for (const t of tasks) {
      for (const tag of t.tags) {
        if (!map.has(tag)) map.set(tag, { total: 0, done: 0 })
        const entry = map.get(tag)!
        entry.total += t.durationMinutes
        if (t.status === 'completed') entry.done += t.durationMinutes
      }
    }
    return Array.from(map.entries())
      .map(([tag, { total, done }]) => ({ tag, total, done, rate: total > 0 ? done / total : 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [tasks])

  if (tagData.length === 0) return null

  const maxMins = Math.max(...tagData.map(d => d.total), 1)
  const TAG_COLORS = ['#6366f1','#10b981','#f59e0b','#3b82f6','#ec4899','#8b5cf6','#14b8a6','#f97316']

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 animate-fade-in">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Time by Tag</p>
      <div className="space-y-2.5">
        {tagData.map((d, i) => (
          <div key={d.tag}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TAG_COLORS[i % TAG_COLORS.length] }} />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">#{d.tag}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                <span className="font-bold">{formatDuration(d.done)}</span>
                <span className="text-gray-300 dark:text-gray-600">/</span>
                <span>{formatDuration(d.total)}</span>
              </div>
            </div>
            {/* Stacked bar: done (solid) + remaining (lighter) */}
            <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden relative">
              {/* total background */}
              <div className="absolute inset-0 rounded-full" style={{ width: `${(d.total / maxMins) * 100}%`, backgroundColor: TAG_COLORS[i % TAG_COLORS.length] + '30' }} />
              {/* done foreground */}
              <div className="absolute inset-0 rounded-full transition-all duration-500" style={{ width: `${(d.done / maxMins) * 100}%`, backgroundColor: TAG_COLORS[i % TAG_COLORS.length] }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────
function BarChart({ data, maxVal, color }: { data: { label: string; value: number }[]; maxVal: number; color: string }) {
  return (
    <div className="flex items-end gap-1 h-24 mt-3">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <span className="text-[9px] font-bold text-gray-500">{d.value > 0 ? d.value : ''}</span>
          <div className="w-full rounded-t-sm" style={{ backgroundColor: color + '25', height: '100%', position: 'relative' }}>
            <div className="absolute bottom-0 w-full rounded-t-sm transition-all duration-500" style={{ backgroundColor: color, height: maxVal > 0 ? `${(d.value / maxVal) * 100}%` : '0%' }} />
          </div>
          <span className="text-[9px] text-gray-400 dark:text-gray-500">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Heatmap ───────────────────────────────────────────────────────────────────
function Heatmap({ completions }: { completions: { date: string; completed: number; total: number }[] }) {
  const weeks: { date: string; rate: number }[][] = []
  const byDate = new Map(completions.map(c => [c.date, c.completed / Math.max(c.total, 1)]))
  const start = dayjs().subtract(11, 'week').startOf('week')
  let week: { date: string; rate: number }[] = []
  for (let d = start; d.isBefore(dayjs().add(1, 'day')); d = d.add(1, 'day')) {
    const dateStr = d.format('YYYY-MM-DD')
    week.push({ date: dateStr, rate: byDate.get(dateStr) ?? -1 })
    if (d.day() === 6) { weeks.push(week); week = [] }
  }
  if (week.length) weeks.push(week)

  const isDark = document.documentElement.classList.contains('dark')
  const getColor = (rate: number) => {
    if (rate < 0) return isDark ? '#374151' : '#f3f4f6'
    if (rate === 0) return '#e0e7ff'
    if (rate < 0.5) return '#a5b4fc'
    if (rate < 0.8) return '#6366f1'
    return '#4338ca'
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wider">12-Week Activity</p>
      <div className="flex gap-0.5 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((day, di) => (
              <div key={di} title={`${day.date}: ${day.rate >= 0 ? Math.round(day.rate * 100) + '% done' : 'No data'}`}
                className="w-3 h-3 rounded-sm cursor-pointer hover:opacity-80 transition-opacity"
                style={{ backgroundColor: getColor(day.rate) }} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-1 justify-end">
        {['None','0%','50%','80%','100%'].map((l, i) => (
          <div key={l} className="flex items-center gap-0.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: [isDark ? '#374151' : '#f3f4f6','#e0e7ff','#a5b4fc','#6366f1','#4338ca'][i] }} />
            {(i === 0 || i === 4) && <span className="text-[8px] text-gray-400 mr-0.5">{l}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Milestones ────────────────────────────────────────────────────────────────
function Milestones({ allTimeMins, allTimeSessions, streak }: { allTimeMins: number; allTimeSessions: number; streak: number }) {
  const badges = [
    { icon: '⏱', label: '1 Hour', sub: 'focus time', earned: allTimeMins >= 60, color: '#6366f1' },
    { icon: '🕐', label: '10 Hours', sub: 'focus time', earned: allTimeMins >= 600, color: '#6366f1' },
    { icon: '🏅', label: '10 Sessions', sub: 'completed', earned: allTimeSessions >= 10, color: '#10b981' },
    { icon: '🥇', label: '100 Sessions', sub: 'completed', earned: allTimeSessions >= 100, color: '#10b981' },
    { icon: '🔥', label: '7-Day Streak', sub: 'in a row', earned: streak >= 7, color: '#f59e0b' },
    { icon: '💪', label: '30-Day Streak', sub: 'in a row', earned: streak >= 30, color: '#f59e0b' },
  ]
  return (
    <div className="grid grid-cols-3 gap-2">
      {badges.map(b => (
        <div key={b.label} className={`flex flex-col items-center py-3 px-2 rounded-xl border text-center transition-all ${b.earned ? 'border-transparent shadow-sm' : 'border-gray-200 dark:border-gray-700 opacity-40 grayscale'}`}
          style={b.earned ? { backgroundColor: b.color + '15', borderColor: b.color + '30' } : {}}>
          <span className="text-2xl mb-1">{b.icon}</span>
          <span className="text-xs font-bold" style={{ color: b.earned ? b.color : undefined }}>{b.label}</span>
          <span className="text-[10px] text-gray-400">{b.sub}</span>
        </div>
      ))}
    </div>
  )
}

// ── Focus Time Ring ───────────────────────────────────────────────────────────
function FocusRing({ minutes, goalMinutes }: { minutes: number; goalMinutes: number }) {
  const pct = goalMinutes > 0 ? Math.min(100, Math.round((minutes / goalMinutes) * 100)) : 0
  const radius = 44, circumference = 2 * Math.PI * radius
  const dash = (pct / 100) * circumference
  const color = pct >= 100 ? '#10b981' : pct >= 60 ? '#6366f1' : pct >= 30 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex items-center gap-5">
      <div className="relative w-28 h-28 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" className="dark:stroke-gray-700" />
          <circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            style={{ transition: 'stroke-dasharray 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black" style={{ color }}>{pct}%</span>
          <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">of goal</span>
        </div>
      </div>
      <div className="flex-1">
        <p className="text-2xl font-black text-gray-800 dark:text-gray-100">
          {Math.floor(minutes / 60) > 0 ? `${Math.floor(minutes / 60)}h ` : ''}{minutes % 60}m
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">focused today</p>
        {goalMinutes > 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Goal: {Math.floor(goalMinutes / 60)}h {goalMinutes % 60 > 0 ? `${goalMinutes % 60}m` : ''}
          </p>
        )}
        <p className="text-sm font-semibold mt-2" style={{ color }}>
          {pct >= 100 ? '🎉 Goal reached!' : pct >= 60 ? '💪 Almost there' : pct >= 30 ? '📈 Making progress' : '🚀 Get focused!'}
        </p>
      </div>
    </div>
  )
}

// ── Weekly Comparison ─────────────────────────────────────────────────────────
function WeeklyComparison({ completions }: { completions: { date: string; completed: number; total: number }[] }) {
  const thisWeek = useMemo(() => {
    let done = 0, total = 0
    for (let i = 0; i < 7; i++) {
      const d = dayjs().subtract(i, 'day').format('YYYY-MM-DD')
      const c = completions.find(x => x.date === d)
      if (c) { done += c.completed; total += c.total }
    }
    return { done, total, rate: total > 0 ? Math.round((done / total) * 100) : 0 }
  }, [completions])

  const lastWeek = useMemo(() => {
    let done = 0, total = 0
    for (let i = 7; i < 14; i++) {
      const d = dayjs().subtract(i, 'day').format('YYYY-MM-DD')
      const c = completions.find(x => x.date === d)
      if (c) { done += c.completed; total += c.total }
    }
    return { done, total, rate: total > 0 ? Math.round((done / total) * 100) : 0 }
  }, [completions])

  const diff = thisWeek.rate - lastWeek.rate
  const diffColor = diff > 0 ? '#10b981' : diff < 0 ? '#ef4444' : '#9ca3af'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 animate-fade-in">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Week vs Last Week</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center">
          <p className="text-2xl font-black text-gray-800 dark:text-gray-100">{thisWeek.rate}%</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{thisWeek.done}/{thisWeek.total} tasks</p>
          <p className="text-[10px] font-bold text-indigo-500 mt-1">This Week</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-gray-500 dark:text-gray-400">{lastWeek.rate}%</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{lastWeek.done}/{lastWeek.total} tasks</p>
          <p className="text-[10px] font-bold text-gray-400 mt-1">Last Week</p>
        </div>
      </div>
      <div className="mt-3 text-center">
        <span className="text-sm font-bold" style={{ color: diffColor }}>
          {diff > 0 ? `↑ ${diff}% better` : diff < 0 ? `↓ ${Math.abs(diff)}% lower` : '= Same as last week'}
        </span>
      </div>
    </div>
  )
}

// ── Main StatsScreen ──────────────────────────────────────────────────────────
export default function StatsScreen() {
  const { state } = useApp()
  const [filter, setFilter] = useState<Filter>('today')
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [focusMinutes, setFocusMinutes] = useState(0)
  const [allTimeMins, setAllTimeMins] = useState(0)
  const [allTimeSessions, setAllTimeSessions] = useState(0)
  const [completions, setCompletions] = useState<{ date: string; completed: number; total: number }[]>([])
  const [overrideCount, setOverrideCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [s, bs, fm, atm, ats, ov, comps] = await Promise.all([
        window.api.stats.getStreak().catch(() => 0),
        window.api.stats.getBestStreak().catch(() => 0),
        window.api.focus.getTodayMinutes().catch(() => 0),
        window.api.stats.getAllTimeFocusMins().catch(() => 0),
        window.api.stats.getAllTimeSessions().catch(() => 0),
        window.api.stats.getTodayOverrides().catch(() => 0),
        window.api.stats.getRecentDayCompletions(84).catch(() => []),
      ])
      setStreak(s); setBestStreak(bs); setFocusMinutes(fm)
      setAllTimeMins(atm); setAllTimeSessions(ats); setOverrideCount(ov); setCompletions(comps)
      setLoading(false)
    }
    load()
  }, [state.tasks, state.focusSession])

  const todayTasks = getTodayTasks(state.tasks)
  const todayDone  = todayTasks.filter(t => t.status === 'completed').length
  const todayTotal = todayTasks.length
  const todayRate  = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0
  const dailyGoalMins = (state.settings as { dailyGoalHours?: number }).dailyGoalHours
    ? ((state.settings as { dailyGoalHours?: number }).dailyGoalHours! * 60)
    : 240 // default 4h

  const weekDays = useMemo(() => {
    const days: { label: string; value: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = dayjs().subtract(i, 'day')
      const dateStr = d.format('YYYY-MM-DD')
      const comp = completions.find(c => c.date === dateStr)
      days.push({ label: d.format('dd'), value: comp?.completed ?? 0 })
    }
    return days
  }, [completions])

  const maxWeek = Math.max(...weekDays.map(d => d.value), 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const FILTER_TABS = ['today', 'yesterday', 'week', 'alltime'] as Filter[]

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header + filter tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Stats</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500">Your focus & productivity overview</p>
        </div>
        <div className="flex gap-2">
          {FILTER_TABS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${filter === f ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
              {f === 'alltime' ? 'All Time' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Two-column body */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT — primary metrics */}
        <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-4 space-y-4">

          {/* ── TODAY left ── */}
          {filter === 'today' && (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 animate-fade-in">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 dark:text-indigo-500 mb-4">Focus Time</p>
                {focusMinutes > 0 ? (
                  <FocusRing minutes={focusMinutes} goalMinutes={dailyGoalMins} />
                ) : (
                  <div className="text-center py-4">
                    <p className="text-3xl mb-2">🎯</p>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No focus sessions yet today</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Start a task in Focus mode to track time</p>
                  </div>
                )}
              </div>
              <ProductivityScore
                completionRate={todayRate}
                focusMinutes={focusMinutes}
                goalMinutes={dailyGoalMins}
                overrides={overrideCount}
                streak={streak}
              />
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Tasks Done" value={`${todayDone}/${todayTotal}`} icon="✅" color={todayRate >= 70 ? '#10b981' : todayRate >= 40 ? '#f59e0b' : '#ef4444'} />
                <StatCard label="Completion" value={`${todayRate}%`} icon="📈" color={todayRate >= 70 ? '#10b981' : todayRate >= 40 ? '#f59e0b' : '#ef4444'} />
                <StatCard label="Streak" value={`${streak}d`} icon="🔥" color={streak > 0 ? '#f97316' : '#9ca3af'} />
                <StatCard label="Overrides" value={overrideCount} icon="🚫" color={overrideCount === 0 ? '#10b981' : '#ef4444'} />
              </div>
            </>
          )}

          {/* ── YESTERDAY left ── */}
          {filter === 'yesterday' && (() => {
            const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
            const comp = completions.find(c => c.date === yesterday)
            const rate = comp && comp.total > 0 ? Math.round((comp.completed / comp.total) * 100) : 0
            const rateColor = rate >= 70 ? '#10b981' : rate >= 40 ? '#f59e0b' : '#ef4444'
            return (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 text-center animate-fade-in">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{dayjs().subtract(1,'day').format('dddd, MMM D')}</p>
                  <p className="text-6xl font-black" style={{ color: rateColor }}>{rate}%</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{comp?.completed ?? 0}/{comp?.total ?? 0} tasks completed</p>
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mt-3">
                    <div className="h-full rounded-full transition-all" style={{ backgroundColor: rateColor, width: `${rate}%` }} />
                  </div>
                </div>
                {comp && (
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Done" value={comp.completed} icon="✅" color="#10b981" />
                    <StatCard label="Total" value={comp.total} icon="📋" color="#6366f1" />
                  </div>
                )}
              </>
            )
          })()}

          {/* ── WEEK left ── */}
          {filter === 'week' && (
            <>
              <WeeklyComparison completions={completions} />
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 animate-fade-in">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Tasks Completed — Last 7 Days</p>
                <BarChart data={weekDays} maxVal={maxWeek} color="#6366f1" />
              </div>
            </>
          )}

          {/* ── ALL TIME left ── */}
          {filter === 'alltime' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Focus Hours" value={`${Math.floor(allTimeMins/60)}h`} icon="⏱" color="#6366f1"
                  sub={allTimeMins > 0 ? `${allTimeMins % 60}m total` : undefined} />
                <StatCard label="Sessions" value={allTimeSessions} icon="🎯" color="#10b981"
                  sub={allTimeSessions > 0 ? 'focus sessions' : undefined} />
                <StatCard label="Best Streak" value={`${bestStreak}d`} icon="🏆" color="#f59e0b" />
                <StatCard label="Current Streak" value={`${streak}d`} icon="🔥" color={streak > 0 ? '#f97316' : '#9ca3af'} />
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 animate-fade-in">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Milestones</p>
                <Milestones allTimeMins={allTimeMins} allTimeSessions={allTimeSessions} streak={streak} />
              </div>
            </>
          )}
        </div>

        {/* RIGHT — charts & breakdowns */}
        <div className="w-1/2 overflow-y-auto p-4 space-y-4">

          {filter === 'today' && (
            <>
              {todayTotal > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 animate-fade-in">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Task Breakdown</p>
                  {[
                    { label: 'Completed', value: todayTasks.filter(t => t.status === 'completed').length, color: '#10b981' },
                    { label: 'Remaining', value: todayTasks.filter(t => t.status === 'scheduled').length, color: '#6366f1' },
                    { label: 'Skipped', value: todayTasks.filter(t => t.status === 'skipped').length, color: '#9ca3af' },
                    { label: 'Overdue', value: todayTasks.filter(t => t.status === 'overdue').length, color: '#ef4444' },
                  ].filter(r => r.value > 0).map(r => (
                    <div key={r.label} className="flex items-center gap-3 mb-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-20">{r.label}</span>
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ backgroundColor: r.color, width: `${(r.value / todayTotal) * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold w-4 text-right" style={{ color: r.color }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              )}
              <TagBreakdown tasks={todayTasks} />
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 animate-fade-in">
                <Heatmap completions={completions} />
              </div>
            </>
          )}

          {filter === 'yesterday' && (
            <>
              <WeeklyComparison completions={completions} />
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 animate-fade-in">
                <Heatmap completions={completions} />
              </div>
            </>
          )}

          {filter === 'week' && (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 animate-fade-in">
                <Heatmap completions={completions} />
              </div>
              <TagBreakdown tasks={todayTasks} />
            </>
          )}

          {filter === 'alltime' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 animate-fade-in">
              <Heatmap completions={completions} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
