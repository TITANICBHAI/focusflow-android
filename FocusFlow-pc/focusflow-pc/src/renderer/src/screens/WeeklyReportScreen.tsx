import React, { useEffect, useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { formatDuration } from '../services/taskService'
import dayjs from 'dayjs'

type Page = 'today' | 'week' | 'focus' | 'stats' | 'settings' | 'profile' | 'reports' | 'active' | 'notes' | 'block-defense' | 'keyword-blocker' | 'always-on' | 'changelog' | 'how-to-use' | 'privacy' | 'standalone-block' | 'import-blocklist' | 'daily-allowance' | 'weekly-report'

interface DayComp { date: string; completed: number; total: number }

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getWeekStart(offset = 0) {
  return dayjs().subtract(offset, 'week').startOf('week')
}

function WeekBar({ days, maxVal }: { days: { label: string; completed: number; total: number; isToday: boolean }[]; maxVal: number }) {
  return (
    <div className="flex items-end gap-2 h-28 mt-2">
      {days.map((d, i) => {
        const pct = maxVal > 0 ? d.completed / maxVal : 0
        const rate = d.total > 0 ? d.completed / d.total : 0
        const color = rate >= 0.8 ? '#10b981' : rate >= 0.5 ? '#6366f1' : rate > 0 ? '#f59e0b' : '#e5e7eb'
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400">{d.completed > 0 ? d.completed : ''}</span>
            <div className="w-full rounded-t-md transition-all duration-700 relative" style={{ height: '80px', backgroundColor: '#f3f4f6' }}>
              <div className="absolute bottom-0 w-full rounded-t-md" style={{ backgroundColor: color, height: `${pct * 100}%`, transition: 'height 0.7s ease' }} />
              {d.isToday && <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-500 rounded-full" />}
            </div>
            <span className={`text-[10px] font-bold ${d.isToday ? 'text-indigo-500' : 'text-gray-400 dark:text-gray-500'}`}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function MetricTile({ label, value, icon, color, sub }: { label: string; value: string | number; icon: string; color: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</span>
      </div>
      <span className="text-2xl font-black" style={{ color }}>{value}</span>
      {sub && <span className="text-[10px] text-gray-400 dark:text-gray-500">{sub}</span>}
    </div>
  )
}

function ScoreRing({ score, grade, color }: { score: number; grade: string; color: string }) {
  const r = 54, circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div className="flex items-center gap-6">
      <div className="relative w-32 h-32 shrink-0">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" className="dark:stroke-gray-700" />
          <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
            strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
            style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black leading-none" style={{ color }}>{grade}</span>
          <span className="text-xs font-bold mt-0.5 text-gray-500 dark:text-gray-400">{score}/100</span>
        </div>
      </div>
      <div>
        <p className="text-lg font-black text-gray-800 dark:text-gray-100">Weekly Score</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {score >= 90 ? "Exceptional week! 🚀" :
           score >= 80 ? "Great week — keep it up 🎯" :
           score >= 70 ? "Solid effort this week 💪" :
           score >= 55 ? "Getting there — be consistent 📈" :
           "Rough week — reset and push forward 🌱"}
        </p>
      </div>
    </div>
  )
}

export default function WeeklyReportScreen({ navigate }: { navigate: (p: Page) => void }) {
  const { state } = useApp()
  const [weekOffset, setWeekOffset] = useState(0)
  const [completions, setCompletions] = useState<DayComp[]>([])
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [comps, s] = await Promise.all([
        window.api.stats.getRecentDayCompletions(84).catch(() => [] as DayComp[]),
        window.api.stats.getStreak().catch(() => 0),
      ])
      setCompletions(comps)
      setStreak(s)
      setLoading(false)
    }
    load()
  }, [state.focusSession])

  const weekStart = useMemo(() => getWeekStart(weekOffset), [weekOffset])
  const weekLabel = weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Last Week' : weekStart.format('MMM D') + ' – ' + weekStart.add(6, 'day').format('MMM D')

  const weekDays = useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD')
    return Array.from({ length: 7 }, (_, i) => {
      const d = weekStart.add(i, 'day')
      const dateStr = d.format('YYYY-MM-DD')
      const comp = completions.find(c => c.date === dateStr)
      return { label: DAYS[d.day()], date: dateStr, completed: comp?.completed ?? 0, total: comp?.total ?? 0, isToday: dateStr === today }
    })
  }, [weekStart, completions])

  const weekStats = useMemo(() => {
    const activeDays = weekDays.filter(d => d.total > 0)
    const totalDone = weekDays.reduce((s, d) => s + d.completed, 0)
    const totalTasks = weekDays.reduce((s, d) => s + d.total, 0)
    const daysHitGoal = weekDays.filter(d => d.total > 0 && d.completed / d.total >= 0.7).length
    const rate = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0
    return { totalDone, totalTasks, rate, activeDays: activeDays.length, daysHitGoal }
  }, [weekDays])

  const prevWeekStats = useMemo(() => {
    const prevStart = getWeekStart(weekOffset + 1)
    let done = 0, total = 0
    for (let i = 0; i < 7; i++) {
      const d = prevStart.add(i, 'day').format('YYYY-MM-DD')
      const comp = completions.find(c => c.date === d)
      if (comp) { done += comp.completed; total += comp.total }
    }
    return { rate: total > 0 ? Math.round((done / total) * 100) : 0, done, total }
  }, [weekOffset, completions])

  const weekScore = useMemo(() => {
    const ratePoints = Math.round(weekStats.rate * 0.5)
    const consistencyPoints = Math.round((weekStats.activeDays / 7) * 30)
    const goalPoints = Math.round((weekStats.daysHitGoal / 7) * 20)
    return Math.min(100, ratePoints + consistencyPoints + goalPoints)
  }, [weekStats])

  const grade = weekScore >= 90 ? 'A+' : weekScore >= 80 ? 'A' : weekScore >= 70 ? 'B' : weekScore >= 55 ? 'C' : 'D'
  const gradeColor = weekScore >= 80 ? '#10b981' : weekScore >= 60 ? '#6366f1' : weekScore >= 45 ? '#f59e0b' : '#ef4444'
  const diff = weekStats.rate - prevWeekStats.rate
  const maxCompleted = Math.max(...weekDays.map(d => d.completed), 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('stats')} className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">← Stats</button>
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Weekly Report</h1>
              <p className="text-xs text-gray-400 dark:text-gray-500">{weekStart.format('MMMM D')} – {weekStart.add(6, 'day').format('MMMM D, YYYY')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(o => o + 1)} className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm">‹</button>
            <span className="text-xs font-bold text-gray-600 dark:text-gray-400 px-2">{weekLabel}</span>
            <button onClick={() => setWeekOffset(o => Math.max(0, o - 1))} disabled={weekOffset === 0}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm disabled:opacity-30">›</button>
          </div>
        </div>
      </div>

      {/* Two-column body */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT */}
        <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-5 space-y-4">
          {/* Score ring */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <ScoreRing score={weekScore} grade={grade} color={gradeColor} />
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-3">
            <MetricTile label="Tasks Done" value={`${weekStats.totalDone}/${weekStats.totalTasks}`} icon="✅"
              color={weekStats.rate >= 70 ? '#10b981' : weekStats.rate >= 40 ? '#f59e0b' : '#ef4444'} />
            <MetricTile label="Completion" value={`${weekStats.rate}%`} icon="📈"
              color={weekStats.rate >= 70 ? '#10b981' : weekStats.rate >= 40 ? '#f59e0b' : '#ef4444'} />
            <MetricTile label="Active Days" value={`${weekStats.activeDays}/7`} icon="📅"
              color={weekStats.activeDays >= 5 ? '#10b981' : weekStats.activeDays >= 3 ? '#6366f1' : '#f59e0b'} />
            <MetricTile label="Goals Hit" value={`${weekStats.daysHitGoal} days`} icon="🎯"
              color={weekStats.daysHitGoal >= 5 ? '#10b981' : weekStats.daysHitGoal >= 3 ? '#6366f1' : '#f59e0b'} />
          </div>

          {/* Streak */}
          {streak > 0 && weekOffset === 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-3xl">🔥</span>
              <div>
                <p className="text-sm font-black text-orange-700 dark:text-orange-300">{streak}-day focus streak</p>
                <p className="text-xs text-orange-500 dark:text-orange-400 mt-0.5">Keep logging tasks to maintain it!</p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="w-1/2 overflow-y-auto p-5 space-y-4">
          {/* Day-by-day bar chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Daily Completions</p>
            <WeekBar days={weekDays} maxVal={maxCompleted} />
          </div>

          {/* Day-by-day list */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Day Breakdown</p>
            <div className="space-y-2">
              {weekDays.map((d, i) => {
                const rate = d.total > 0 ? Math.round((d.completed / d.total) * 100) : null
                const color = rate === null ? '#e5e7eb' : rate >= 80 ? '#10b981' : rate >= 50 ? '#6366f1' : '#f59e0b'
                const isFuture = dayjs(d.date).isAfter(dayjs(), 'day')
                return (
                  <div key={i} className={`flex items-center gap-3 ${isFuture ? 'opacity-35' : ''}`}>
                    <div className={`w-16 text-xs font-bold ${d.isToday ? 'text-indigo-500' : 'text-gray-500 dark:text-gray-400'}`}>
                      {d.isToday ? 'Today' : DAYS[dayjs(d.date).day()]}
                    </div>
                    <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ backgroundColor: color, width: rate !== null ? `${rate}%` : '0%' }} />
                    </div>
                    <div className="w-20 text-right">
                      {isFuture ? (
                        <span className="text-[10px] text-gray-300 dark:text-gray-600">—</span>
                      ) : d.total === 0 ? (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">No tasks</span>
                      ) : (
                        <span className="text-[10px] font-bold" style={{ color }}>{d.completed}/{d.total} ({rate}%)</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* vs previous week */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
              {weekOffset === 0 ? 'vs Last Week' : 'vs Previous Week'}
            </p>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="text-center">
                <p className="text-3xl font-black text-gray-800 dark:text-gray-100">{weekStats.rate}%</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{weekStats.totalDone}/{weekStats.totalTasks}</p>
                <p className="text-[10px] font-bold text-indigo-500 mt-1">{weekOffset === 0 ? 'This Week' : weekLabel}</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black text-gray-500 dark:text-gray-400">{prevWeekStats.rate}%</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{prevWeekStats.done}/{prevWeekStats.total}</p>
                <p className="text-[10px] font-bold text-gray-400 mt-1">Prior Week</p>
              </div>
            </div>
            <div className="text-center">
              <span className="text-sm font-bold" style={{ color: diff > 0 ? '#10b981' : diff < 0 ? '#ef4444' : '#9ca3af' }}>
                {diff > 0 ? `↑ ${diff}% improvement` : diff < 0 ? `↓ ${Math.abs(diff)}% lower` : '= Same pace as before'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
