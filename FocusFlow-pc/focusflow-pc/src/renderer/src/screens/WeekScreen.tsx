import React, { useState, useMemo, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { formatTime, isAwaitingDecision } from '../services/taskService'
import { TASK_COLORS } from '../styles/theme'
import type { Task } from '../data/types'
import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
dayjs.extend(isSameOrAfter)

type Page = 'today' | 'week' | 'focus' | 'stats' | 'settings' | 'profile' | 'reports' | 'active' | 'notes' | 'block-defense' | 'keyword-blocker' | 'always-on' | 'changelog' | 'how-to-use' | 'privacy' | 'standalone-block' | 'import-blocklist'

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#ef4444', high: '#f59e0b', medium: '#6366f1', low: '#10b981'
}

function MiniTaskCard({ task, onComplete, onSkip }: {
  task: Task
  onComplete: (id: string) => void
  onSkip: (id: string) => void
}) {
  const isNow = task.status !== 'completed' && task.status !== 'skipped' &&
    new Date(task.startTime) <= new Date() && new Date(task.endTime) >= new Date()
  const awaiting = isAwaitingDecision(task)

  return (
    <div
      className={`group text-left rounded-xl border px-2.5 py-2 mb-1.5 transition-all hover:shadow-sm ${
        task.status === 'completed'
          ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 opacity-60'
          : task.status === 'skipped'
          ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 opacity-40'
          : isNow
          ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
          : awaiting
          ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      }`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: task.color }} />
        <span className={`text-xs font-semibold truncate flex-1 ${
          task.status === 'completed' ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'
        }`}>{task.title}</span>
        <span className="text-[10px] font-bold px-1 py-0.5 rounded shrink-0" style={{ backgroundColor: PRIORITY_COLOR[task.priority] + '20', color: PRIORITY_COLOR[task.priority] }}>
          {task.priority[0].toUpperCase()}
        </span>
      </div>
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          {formatTime(task.startTime)} · {task.durationMinutes}m
        </span>
        {task.status !== 'completed' && task.status !== 'skipped' && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onComplete(task.id)} className="text-[10px] font-bold text-green-600 dark:text-green-400 hover:underline">✓</button>
            <button onClick={() => onSkip(task.id)} className="text-[10px] font-bold text-gray-400 hover:underline">↷</button>
          </div>
        )}
        {task.status === 'completed' && <span className="text-[10px] text-green-500">✓ Done</span>}
      </div>
    </div>
  )
}

function AddTaskModal({ defaultDate, onClose, onSave, settings }: {
  defaultDate: string
  onClose: () => void
  onSave: (data: Record<string, unknown>) => void
  settings: import('../data/types').AppSettings
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startTime, setStartTime] = useState(() => {
    const base = dayjs(defaultDate).hour(9).minute(0)
    const now = dayjs()
    const t = base.isBefore(now) ? now.add(5, 'minute') : base
    return t.format('YYYY-MM-DDTHH:mm')
  })
  const [duration, setDuration] = useState(settings.defaultDuration || 60)
  const [priority, setPriority] = useState('medium')
  const [color, setColor] = useState(TASK_COLORS[0])
  const [tags, setTags] = useState('')
  const [focusMode, setFocusMode] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave({
      title: title.trim(), description: description.trim() || undefined,
      startTime: new Date(startTime).toISOString(), durationMinutes: duration,
      priority, color, tags: tags.split(',').map(t => t.trim()).filter(Boolean), focusMode
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Add Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title *" required autoFocus
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Optional notes…"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Start Time</label>
              <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Duration (min)</label>
              <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} min={5} max={480}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Color</label>
              <div className="flex gap-1.5 flex-wrap pt-1">
                {TASK_COLORS.slice(0,8).map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-1 ring-indigo-400 scale-110' : ''}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          <input value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags: work, study, health"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`relative w-10 h-5 rounded-full transition-colors ${focusMode ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`} onClick={() => setFocusMode(v => !v)}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${focusMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Focus Mode</span>
          </label>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold transition-colors">Add Task</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function WeekScreen({ navigate }: { navigate: (p: Page) => void }) {
  const { state, addTask, completeTask, skipTask } = useApp()
  const [weekOffset, setWeekOffset] = useState(0)
  const [addForDate, setAddForDate] = useState<string | null>(null)
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)

  const days = useMemo(() => {
    const today = dayjs().startOf('day')
    const startOfWeek = today.add(weekOffset * 7, 'day').startOf('week').add(1, 'day') // Mon
    return Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, 'day'))
  }, [weekOffset])

  const tasksByDay = useMemo(() => {
    return days.map(day => {
      const start = day.startOf('day')
      const end = day.endOf('day')
      return state.tasks.filter(t => {
        const st = dayjs(t.startTime)
        return st.isSameOrAfter(start) && st.isBefore(end)
      }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    })
  }, [days, state.tasks])

  const weekLabel = useMemo(() => {
    const start = days[0]
    const end = days[6]
    if (weekOffset === 0) return 'This Week'
    if (weekOffset === -1) return 'Last Week'
    if (weekOffset === 1) return 'Next Week'
    if (start.month() === end.month()) return `${start.format('MMM D')} – ${end.format('D, YYYY')}`
    return `${start.format('MMM D')} – ${end.format('MMM D, YYYY')}`
  }, [days, weekOffset])

  const handleComplete = useCallback((id: string) => { if (confirm('Mark task as done?')) completeTask(id) }, [completeTask])
  const handleSkip = useCallback((id: string) => { if (confirm('Skip this task?')) skipTask(id) }, [skipTask])

  const weekTotal = tasksByDay.flat()
  const weekDone = weekTotal.filter(t => t.status === 'completed').length
  const weekPct = weekTotal.length > 0 ? Math.round((weekDone / weekTotal.length) * 100) : 0

  const today = dayjs().startOf('day')

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setWeekOffset(o => o - 1)} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors font-bold">‹</button>
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{weekLabel}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm text-gray-500 dark:text-gray-400">{weekDone}/{weekTotal.length} tasks done</p>
                {weekTotal.length > 0 && (
                  <>
                    <div className="w-20 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${weekPct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-indigo-500">{weekPct}%</span>
                  </>
                )}
              </div>
            </div>
            <button onClick={() => setWeekOffset(o => o + 1)} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors font-bold">›</button>
          </div>
          <div className="flex items-center gap-2">
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Today</button>
            )}
            <button onClick={() => navigate('today')} className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold transition-colors shadow-sm">Today View →</button>
          </div>
        </div>
      </div>

      {/* Week grid */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-x-auto">
          <div className="flex gap-3 p-4 h-full min-w-[700px]">
            {days.map((day, i) => {
              const tasks = tasksByDay[i]
              const isToday = day.isSame(today, 'day')
              const isPast = day.isBefore(today, 'day')
              const done = tasks.filter(t => t.status === 'completed').length
              const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0

              return (
                <div
                  key={day.toISOString()}
                  className={`flex flex-col rounded-2xl border transition-all flex-1 min-w-[130px] ${
                    isToday
                      ? 'border-indigo-400 bg-white dark:bg-gray-800 shadow-md shadow-indigo-100 dark:shadow-indigo-900/20'
                      : isPast
                      ? 'border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/50'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  } ${hoveredDay === i ? 'shadow-lg' : ''}`}
                  onMouseEnter={() => setHoveredDay(i)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  {/* Day header */}
                  <div className={`px-3 py-2.5 border-b rounded-t-2xl ${
                    isToday
                      ? 'bg-indigo-500 border-indigo-400'
                      : isPast
                      ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                  }`}>
                    <div className={`text-xs font-bold uppercase tracking-wider ${isToday ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                      {day.format('ddd')}
                    </div>
                    <div className={`text-xl font-black leading-tight ${isToday ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
                      {day.format('D')}
                    </div>
                    {tasks.length > 0 && (
                      <div className="mt-1.5">
                        <div className={`w-full h-1 rounded-full ${isToday ? 'bg-white/30' : 'bg-gray-200 dark:bg-gray-700'} overflow-hidden`}>
                          <div className={`h-full rounded-full transition-all ${isToday ? 'bg-white' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className={`text-[10px] font-semibold mt-0.5 ${isToday ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}>{done}/{tasks.length}</div>
                      </div>
                    )}
                  </div>

                  {/* Tasks */}
                  <div className="flex-1 overflow-y-auto px-2 py-2">
                    {tasks.length === 0 ? (
                      <div className={`text-center py-4 ${isPast ? 'opacity-40' : 'opacity-60'}`}>
                        <div className="text-2xl mb-1">{isPast ? '○' : '+'}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">{isPast ? 'No tasks' : 'Empty'}</div>
                      </div>
                    ) : (
                      tasks.map(task => (
                        <MiniTaskCard key={task.id} task={task} onComplete={handleComplete} onSkip={handleSkip} />
                      ))
                    )}
                  </div>

                  {/* Add button */}
                  <div className="px-2 pb-2">
                    <button
                      onClick={() => setAddForDate(day.toISOString())}
                      className={`w-full py-1.5 rounded-xl text-[11px] font-bold border-2 border-dashed transition-all ${
                        isToday
                          ? 'border-indigo-300 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                          : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-500 dark:hover:text-gray-400'
                      }`}
                    >
                      + Add Task
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {addForDate && (
        <AddTaskModal
          defaultDate={addForDate}
          onClose={() => setAddForDate(null)}
          onSave={async (data) => { await addTask(data as Parameters<typeof addTask>[0]); setAddForDate(null) }}
          settings={state.settings}
        />
      )}
    </div>
  )
}
