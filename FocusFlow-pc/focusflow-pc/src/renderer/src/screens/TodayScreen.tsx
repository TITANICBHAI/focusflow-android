import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { formatTime, isAwaitingDecision } from '../services/taskService'
import { TASK_COLORS } from '../styles/theme'
import type { Task } from '../data/types'
import dayjs from 'dayjs'

type Page = 'today' | 'week' | 'focus' | 'stats' | 'settings' | 'profile' | 'reports' | 'active' | 'notes' | 'block-defense' | 'keyword-blocker' | 'always-on' | 'changelog' | 'how-to-use' | 'privacy' | 'standalone-block' | 'import-blocklist'
type ViewMode = 'list' | 'timeline'
type FilterStatus = 'all' | 'active' | 'scheduled' | 'completed' | 'skipped'

interface Props { navigate: (p: Page) => void }

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#ef4444', high: '#f59e0b', medium: '#6366f1', low: '#10b981'
}
const STATUS_ICON: Record<string, string> = {
  scheduled: '⏳', active: '▶️', completed: '✅', skipped: '⏭', overdue: '⚠️'
}

// ── Task Templates ────────────────────────────────────────────────────────────
const TEMPLATES = [
  { label: '🧠 Deep Work', duration: 90, priority: 'high', color: '#6366f1', tags: ['deep-focus'] },
  { label: '📧 Email/Admin', duration: 30, priority: 'medium', color: '#f59e0b', tags: ['admin'] },
  { label: '📅 Meeting', duration: 60, priority: 'medium', color: '#3b82f6', tags: ['meeting'] },
  { label: '💪 Exercise', duration: 45, priority: 'low', color: '#10b981', tags: ['health'] },
  { label: '☕ Break', duration: 15, priority: 'low', color: '#8b5cf6', tags: ['break'] },
  { label: '📖 Learning', duration: 60, priority: 'high', color: '#ec4899', tags: ['study'] },
] as const

// ── Timeline View ─────────────────────────────────────────────────────────────
const START_HOUR = 6
const END_HOUR = 23
const PX_PER_HOUR = 72

function TimelineView({
  tasks, onComplete, onSkip, onEdit, onAddAt
}: {
  tasks: Task[]
  onComplete: (id: string) => void
  onSkip: (id: string) => void
  onEdit: (t: Task) => void
  onAddAt: (isoTime: string) => void
}) {
  const [now, setNow] = useState(new Date())
  const [hoveredHour, setHoveredHour] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(iv)
  }, [])

  // Auto-scroll to current time
  useEffect(() => {
    const h = new Date().getHours()
    const m = new Date().getMinutes()
    const top = ((h - START_HOUR) + m / 60) * PX_PER_HOUR - 120
    setTimeout(() => scrollRef.current?.scrollTo({ top: Math.max(0, top), behavior: 'smooth' }), 100)
  }, [])

  const nowH = now.getHours()
  const nowM = now.getMinutes()
  const nowTop = ((nowH - START_HOUR) + nowM / 60) * PX_PER_HOUR
  const isNowVisible = nowH >= START_HOUR && nowH < END_HOUR

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)

  return (
    <div ref={scrollRef} className="overflow-y-auto h-full px-4 py-3">
      <div className="relative" style={{ height: (END_HOUR - START_HOUR) * PX_PER_HOUR + 40 }}>
        {/* Hour grid */}
        {hours.map((h) => {
          const top = (h - START_HOUR) * PX_PER_HOUR
          const label = h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : h === 0 ? '12 AM' : `${h} AM`
          return (
            <div key={h} style={{ top }} className="absolute w-full flex items-start gap-0 pointer-events-none">
              <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 w-14 text-right pr-3 leading-none pt-0.5 shrink-0">{label}</span>
              <div className="flex-1 border-t border-gray-200 dark:border-gray-700/70" />
            </div>
          )
        })}

        {/* Half-hour dashes */}
        {hours.slice(0, -1).map((h) => {
          const top = (h - START_HOUR) * PX_PER_HOUR + PX_PER_HOUR / 2
          return (
            <div key={`half-${h}`} style={{ top, left: 56 }} className="absolute right-0 pointer-events-none">
              <div className="border-t border-dashed border-gray-100 dark:border-gray-800" />
            </div>
          )
        })}

        {/* Hover add zone */}
        {hours.slice(0, -1).map((h) => {
          const top = (h - START_HOUR) * PX_PER_HOUR
          return (
            <div
              key={`zone-${h}`}
              style={{ top, left: 56, height: PX_PER_HOUR }}
              className="absolute right-0 group cursor-pointer"
              onMouseEnter={() => setHoveredHour(h)}
              onMouseLeave={() => setHoveredHour(null)}
              onClick={() => {
                const d = dayjs().hour(h).minute(0).second(0)
                const t = d.isBefore(dayjs()) ? dayjs().add(1, 'minute') : d
                onAddAt(t.toISOString())
              }}
            >
              {hoveredHour === h && (
                <div className="absolute inset-0 bg-indigo-50 dark:bg-indigo-900/10 rounded-r-xl flex items-center justify-start pl-3 opacity-80">
                  <span className="text-[11px] font-semibold text-indigo-400 dark:text-indigo-500">+ Add task at {h > 12 ? `${h-12}:00 PM` : `${h}:00 AM`}</span>
                </div>
              )}
            </div>
          )
        })}

        {/* Now indicator */}
        {isNowVisible && (
          <div style={{ top: nowTop }} className="absolute w-full flex items-center z-20 pointer-events-none">
            <div className="w-14 flex items-center justify-end pr-2 shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-400" />
            </div>
            <div className="flex-1 h-0.5 bg-red-500 shadow-sm" />
          </div>
        )}

        {/* Task blocks */}
        {tasks.map((task) => {
          const tStart = new Date(task.startTime)
          const tStartH = tStart.getHours()
          const tStartM = tStart.getMinutes()
          if (tStartH < START_HOUR || tStartH >= END_HOUR) return null

          const top = ((tStartH - START_HOUR) + tStartM / 60) * PX_PER_HOUR
          const height = Math.max(22, (task.durationMinutes / 60) * PX_PER_HOUR - 2)
          const isDone = task.status === 'completed'
          const isSkipped = task.status === 'skipped'
          const isActive = !isDone && !isSkipped &&
            new Date(task.startTime) <= new Date() && new Date(task.endTime) >= new Date()

          return (
            <div
              key={task.id}
              style={{
                top,
                left: 58,
                right: 6,
                height,
                backgroundColor: isDone || isSkipped ? '#f3f4f6' : task.color + '22',
                borderLeft: `3px solid ${isDone || isSkipped ? '#d1d5db' : task.color}`,
                borderColor: isActive ? task.color : undefined,
                boxShadow: isActive ? `0 0 0 1px ${task.color}44` : undefined,
              }}
              className={`absolute rounded-r-xl px-2.5 py-1.5 cursor-pointer hover:brightness-95 transition-all group overflow-hidden ${
                isDone ? 'opacity-50' : isSkipped ? 'opacity-30' : ''
              }`}
              onClick={() => onEdit(task)}
            >
              <div className="flex items-start justify-between gap-1 min-w-0">
                <div className="min-w-0 flex-1">
                  <p className={`text-[11px] font-bold leading-tight truncate ${isDone ? 'line-through text-gray-400' : ''}`}
                    style={{ color: isDone || isSkipped ? '#9ca3af' : task.color }}>
                    {STATUS_ICON[task.status]} {task.title}
                  </p>
                  {height > 30 && (
                    <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {formatTime(task.startTime)} · {task.durationMinutes}m
                    </p>
                  )}
                </div>
                {/* Quick actions on hover */}
                {!isDone && !isSkipped && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); onComplete(task.id) }}
                      className="w-5 h-5 rounded-full bg-green-500 text-white text-[10px] flex items-center justify-center hover:bg-green-600"
                      title="Complete"
                    >✓</button>
                    <button
                      onClick={e => { e.stopPropagation(); onSkip(task.id) }}
                      className="w-5 h-5 rounded-full bg-gray-400 text-white text-[10px] flex items-center justify-center hover:bg-gray-500"
                      title="Skip"
                    >↷</button>
                  </div>
                )}
              </div>
              {/* Active pulse */}
              {isActive && (
                <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: task.color }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Task Card (List view) ─────────────────────────────────────────────────────
function TaskCard({ task, onComplete, onSkip, onExtend, onStartFocus, onEdit }: {
  task: Task
  onComplete: (id: string) => void
  onSkip: (id: string) => void
  onExtend: (id: string) => void
  onStartFocus: (id: string) => void
  onEdit: (task: Task) => void
}) {
  const isActive = task.status !== 'completed' && task.status !== 'skipped' &&
    new Date(task.startTime) <= new Date() && new Date(task.endTime) >= new Date()
  const awaiting = isAwaitingDecision(task)

  return (
    <div className={`group relative bg-white dark:bg-gray-800 rounded-2xl border transition-all hover:shadow-md animate-fade-in ${
      isActive ? 'border-indigo-400 shadow-md shadow-indigo-100 dark:shadow-indigo-900/30' :
      awaiting ? 'border-orange-400 shadow-md shadow-orange-100 dark:shadow-orange-900/30' :
      'border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex items-start gap-3 p-4">
        <div className="w-1 self-stretch rounded-full mt-0.5" style={{ backgroundColor: task.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">{STATUS_ICON[task.status] ?? '📌'}</span>
            <span className={`text-sm font-bold truncate ${task.status === 'completed' ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>
              {task.title}
            </span>
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_COLOR[task.priority] + '20', color: PRIORITY_COLOR[task.priority] }}>
              {task.priority}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span>🕐 {formatTime(task.startTime)} – {formatTime(task.endTime)}</span>
            <span>{task.durationMinutes}m</span>
            {task.tags.length > 0 && task.tags.slice(0,2).map(t => (
              <span key={t} className="px-1.5 py-0.5 rounded-md text-indigo-600 dark:text-indigo-400" style={{ backgroundColor: task.color + '18' }}>#{t}</span>
            ))}
          </div>
          {task.description && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 truncate">{task.description}</p>
          )}
          {awaiting && (
            <div className="mt-2 text-xs font-semibold text-orange-500">⏰ Time's up — pick an action below</div>
          )}
        </div>
        <button onClick={() => onEdit(task)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
          ✏️
        </button>
      </div>

      {task.status !== 'completed' && task.status !== 'skipped' && (
        <div className="flex gap-1 px-4 pb-3">
          <button onClick={() => onComplete(task.id)} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors">✓ Done</button>
          <button onClick={() => onExtend(task.id)} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors">+ Extend</button>
          <button onClick={() => onSkip(task.id)} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">↷ Skip</button>
          {(isActive || awaiting) && task.focusMode && (
            <button onClick={() => onStartFocus(task.id)} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors">🛡 Focus</button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Add Task Modal ────────────────────────────────────────────────────────────
function AddTaskModal({ onClose, onSave, settings, defaultStartTime }: {
  onClose: () => void
  onSave: (data: Record<string, unknown>) => void
  settings: import('../data/types').AppSettings
  defaultStartTime?: string
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startTime, setStartTime] = useState(() => {
    if (defaultStartTime) return dayjs(defaultStartTime).format('YYYY-MM-DDTHH:mm')
    return dayjs().add(5, 'minute').format('YYYY-MM-DDTHH:mm')
  })
  const [duration, setDuration] = useState(settings.defaultDuration || 60)
  const [priority, setPriority] = useState<string>('medium')
  const [color, setColor] = useState(TASK_COLORS[0])
  const [tags, setTags] = useState('')
  const [focusMode, setFocusMode] = useState(false)
  const [repeat, setRepeat] = useState('none')
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { titleRef.current?.focus() }, [])

  const applyTemplate = (tpl: typeof TEMPLATES[number]) => {
    setTitle(tpl.label.split(' ').slice(1).join(' '))
    setDuration(tpl.duration)
    setPriority(tpl.priority)
    setColor(tpl.color)
    setTags(tpl.tags.join(', '))
    titleRef.current?.focus()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave({
      title: title.trim(), description: description.trim() || undefined,
      startTime: new Date(startTime).toISOString(), durationMinutes: duration,
      priority, color, tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      focusMode, repeat
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

        {/* Quick templates */}
        <div className="px-5 pt-4 pb-0">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Quick Templates</p>
          <div className="flex gap-1.5 flex-wrap">
            {TEMPLATES.map(tpl => (
              <button
                key={tpl.label}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400 transition-all"
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Title *</label>
            <input ref={titleRef} value={title} onChange={e => setTitle(e.target.value)} placeholder="What are you working on?" required
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Optional notes…"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
          </div>
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
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Repeat 🔁</label>
              <select value={repeat} onChange={e => setRepeat(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="none">No repeat</option>
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Color</label>
            <div className="flex gap-1.5 flex-wrap">
              {TASK_COLORS.slice(0,8).map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-1 ring-indigo-400 scale-110' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Tags (comma-separated)</label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="work, deep-focus, study"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`relative w-10 h-5 rounded-full transition-colors ${focusMode ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`} onClick={() => setFocusMode(v => !v)}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${focusMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Focus Mode for this task</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold transition-colors">
              Add Task {repeat !== 'none' ? `(${repeat})` : ''}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Edit Task Modal ───────────────────────────────────────────────────────────
function EditTaskModal({ task, onClose, onSave, onDelete }: { task: Task; onClose: () => void; onSave: (t: Task) => void; onDelete: (id: string) => void }) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [startTime, setStartTime] = useState(dayjs(task.startTime).format('YYYY-MM-DDTHH:mm'))
  const [duration, setDuration] = useState(task.durationMinutes)
  const [priority, setPriority] = useState(task.priority)
  const [color, setColor] = useState(task.color)
  const [tags, setTags] = useState(task.tags.join(', '))
  const [focusMode, setFocusMode] = useState(task.focusMode)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const start = new Date(startTime)
    const end = new Date(start.getTime() + duration * 60000)
    onSave({ ...task, title: title.trim(), description: description.trim() || undefined, startTime: start.toISOString(), endTime: end.toISOString(), durationMinutes: duration, priority: priority as Task['priority'], color, tags: tags.split(',').map(t => t.trim()).filter(Boolean), focusMode, updatedAt: new Date().toISOString() })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Edit Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <input value={title} onChange={e => setTitle(e.target.value)} required autoFocus className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Notes…" className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Start Time</label>
              <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Duration (min)</label>
              <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} min={5} max={480} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as Task['priority'])} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Color</label>
              <div className="flex gap-1.5 flex-wrap pt-1">
                {TASK_COLORS.slice(0,8).map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)} className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-1 ring-indigo-400 scale-110' : ''}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          <input value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags: work, study" className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`relative w-10 h-5 rounded-full transition-colors ${focusMode ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`} onClick={() => setFocusMode(v => !v)}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${focusMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Focus Mode</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { if (confirm('Delete this task?')) { onDelete(task.id); onClose() } }} className="px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-800 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Delete</button>
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold transition-colors">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ExtendModal({ taskId, onClose, onExtend }: { taskId: string; onClose: () => void; onExtend: (id: string, mins: number) => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-72 animate-slide-up" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4">Extend by how long?</h3>
        <div className="grid grid-cols-3 gap-2">
          {[15,30,45,60,90].map(m => (
            <button key={m} onClick={() => { onExtend(taskId, m); onClose() }}
              className="py-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 text-sm font-bold hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors">
              +{m}m
            </button>
          ))}
        </div>
        <button onClick={onClose} className="w-full mt-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
      </div>
    </div>
  )
}

// ── FocusTimer chip for header ─────────────────────────────────────────────────
function FocusTimerChip({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const update = () => setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
    update()
    const iv = setInterval(update, 1000)
    return () => clearInterval(iv)
  }, [startedAt])
  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60
  const label = h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return (
    <div className="flex items-center gap-1.5 bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-300 dark:border-indigo-700 rounded-xl px-3 py-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">🛡 {label}</span>
    </div>
  )
}

// ── Main TodayScreen ──────────────────────────────────────────────────────────
export default function TodayScreen({ navigate }: Props) {
  const { state, todayTasks, activeTask, completeTask, skipTask, extendTaskTime, addTask, updateTask, deleteTask, startFocusMode } = useApp()
  const [showAdd, setShowAdd] = useState(false)
  const [addDefaultTime, setAddDefaultTime] = useState<string | undefined>(undefined)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [extendId, setExtendId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  const completed = todayTasks.filter(t => t.status === 'completed').length
  const skipped  = todayTasks.filter(t => t.status === 'skipped').length
  const bannerTask = activeTask ?? (todayTasks.find(t => isAwaitingDecision(t)) ?? null)
  const awaiting = bannerTask ? isAwaitingDecision(bannerTask) : false

  const filteredTasks = useMemo(() => {
    let list = todayTasks
    if (filterStatus !== 'all') {
      if (filterStatus === 'active') {
        list = list.filter(t => t.status !== 'completed' && t.status !== 'skipped' &&
          new Date(t.startTime) <= new Date() && new Date(t.endTime) >= new Date())
      } else {
        list = list.filter(t => t.status === filterStatus)
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      )
    }
    return list
  }, [todayTasks, filterStatus, search])

  const handleComplete = useCallback((id: string) => { if (confirm('Mark task as done?')) completeTask(id) }, [completeTask])
  const handleSkip = useCallback((id: string) => { if (confirm('Skip this task?')) skipTask(id) }, [skipTask])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (['INPUT','TEXTAREA','SELECT'].includes(target.tagName) || target.isContentEditable) return
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setAddDefaultTime(undefined); setShowAdd(true) }
      if (e.key === '/' || e.key === 'f' || e.key === 'F') { e.preventDefault(); document.getElementById('task-search')?.focus() }
      if (e.key === 't' || e.key === 'T') setViewMode(v => v === 'list' ? 'timeline' : 'list')
      if (e.key === 'Escape') { setSearch(''); setFilterStatus('all') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const FILTER_TABS: { id: FilterStatus; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: todayTasks.length },
    { id: 'active', label: 'Active', count: todayTasks.filter(t => t.status !== 'completed' && t.status !== 'skipped' && new Date(t.startTime) <= new Date() && new Date(t.endTime) >= new Date()).length },
    { id: 'scheduled', label: 'Scheduled', count: todayTasks.filter(t => t.status === 'scheduled').length },
    { id: 'completed', label: 'Done', count: completed },
    { id: 'skipped', label: 'Skipped', count: skipped },
  ]

  const openAddAt = useCallback((iso: string) => {
    setAddDefaultTime(iso)
    setShowAdd(true)
  }, [])

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-5 py-3">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-tight">{dayjs().format('dddd, MMMM D')}</h1>
              <div className="flex items-center gap-3 mt-0.5">
                <p className="text-xs text-gray-500 dark:text-gray-400">{completed}/{todayTasks.length} done</p>
                {todayTasks.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-20 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(completed / todayTasks.length) * 100}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-indigo-500">{Math.round((completed / todayTasks.length) * 100)}%</span>
                  </div>
                )}
              </div>
            </div>
            {state.focusSession?.isActive && state.focusSession.startedAt && (
              <FocusTimerChip startedAt={state.focusSession.startedAt} />
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setViewMode('list')}
                title="List view (T)"
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              >
                ☰ List
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                title="Timeline view (T)"
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${viewMode === 'timeline' ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              >
                📅 Timeline
              </button>
            </div>
            <button
              onClick={() => { setAddDefaultTime(undefined); setShowAdd(true) }}
              title="Add task (N)"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold transition-colors shadow-sm group"
            >
              <span>+ Add</span>
              <kbd className="bg-indigo-400/50 border-indigo-300/50 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">N</kbd>
            </button>
          </div>
        </div>

        {/* Search + Filter row (list view only) */}
        {viewMode === 'list' && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
              <input
                id="task-search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search… (F)"
                className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>}
            </div>
            <div className="flex gap-1 flex-wrap">
              {FILTER_TABS.map(tab => (
                <button key={tab.id} onClick={() => setFilterStatus(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${filterStatus === tab.id ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                  {tab.label} {tab.count > 0 && <span className={`ml-0.5 ${filterStatus === tab.id ? 'opacity-80' : 'opacity-60'}`}>{tab.count}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'timeline' && (
          <p className="text-xs text-gray-400 dark:text-gray-500">Hover an hour slot to add a task · Click a task to edit · <kbd className="text-[10px]">T</kbd> to toggle view</p>
        )}
      </div>

      {/* Active/awaiting banner */}
      {bannerTask && (
        <div className={`mx-4 mt-3 rounded-2xl p-3.5 flex items-center gap-3 shadow-lg ${awaiting ? 'bg-orange-500' : 'bg-indigo-500'}`}>
          <div className={`w-2 h-2 rounded-full bg-white ${awaiting ? '' : 'animate-pulse'}`} />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold text-white/70 uppercase tracking-wider">{awaiting ? "TIME'S UP" : 'NOW ACTIVE'}</div>
            <div className="text-sm font-bold text-white truncate">{bannerTask.title}</div>
            <div className="text-[10px] text-white/70">{awaiting ? `Ended ${formatTime(bannerTask.endTime)}` : `Until ${formatTime(bannerTask.endTime)}`}</div>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => handleComplete(bannerTask.id)} className="w-8 h-8 rounded-full bg-white/25 hover:bg-white/40 text-white flex items-center justify-center text-sm transition-colors" title="Complete">✓</button>
            <button onClick={() => setExtendId(bannerTask.id)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center text-sm transition-colors" title="Extend">+</button>
            {awaiting && <button onClick={() => handleSkip(bannerTask.id)} className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center text-sm transition-colors" title="Skip">✕</button>}
            {!awaiting && bannerTask.focusMode && <button onClick={() => startFocusMode(bannerTask.id)} className="w-8 h-8 rounded-full bg-yellow-400/30 hover:bg-yellow-400/50 text-white flex items-center justify-center text-sm transition-colors" title="Focus">🛡</button>}
            {!awaiting && <button onClick={() => navigate('focus')} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center text-sm transition-colors" title="View Focus">→</button>}
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'timeline' ? (
          <TimelineView
            tasks={todayTasks}
            onComplete={handleComplete}
            onSkip={handleSkip}
            onEdit={setEditTask}
            onAddAt={openAddAt}
          />
        ) : (
          <div className="h-full overflow-y-auto px-4 py-3 space-y-3">
            {(search || filterStatus !== 'all') && (
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {filteredTasks.length === 0 ? 'No results' : `${filteredTasks.length} task${filteredTasks.length !== 1 ? 's' : ''}${search ? ` for "${search}"` : ''}`}
                </span>
                <button onClick={() => { setSearch(''); setFilterStatus('all') }} className="text-xs text-indigo-500 hover:text-indigo-600 font-semibold">Clear</button>
              </div>
            )}

            {filteredTasks.length === 0 && !search && filterStatus === 'all' ? (
              <div className="flex flex-col items-center justify-center h-56 text-center animate-fade-in">
                <div className="text-6xl mb-4 animate-bounce-in">📅</div>
                <p className="text-base font-bold text-gray-600 dark:text-gray-300">No tasks today</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 mb-4">Plan your day to stay focused</p>
                <div className="flex flex-col items-center gap-3">
                  <button onClick={() => { setAddDefaultTime(undefined); setShowAdd(true) }} className="px-5 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600 transition-colors shadow-sm">
                    + Schedule Your First Task
                  </button>
                  <div className="flex gap-1.5 flex-wrap justify-center">
                    {TEMPLATES.slice(0,3).map(tpl => (
                      <button key={tpl.label} onClick={() => {
                        setAddDefaultTime(undefined); setShowAdd(true)
                      }} className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">Press <kbd>N</kbd> to add · <kbd>T</kbd> to switch views</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center animate-fade-in">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No tasks match</p>
                <button onClick={() => { setSearch(''); setFilterStatus('all') }} className="mt-3 text-xs text-indigo-500 hover:underline font-semibold">Clear filters</button>
              </div>
            ) : (
              filteredTasks.map(task => (
                <TaskCard
                  key={task.id} task={task}
                  onComplete={handleComplete} onSkip={handleSkip}
                  onExtend={(id) => setExtendId(id)}
                  onStartFocus={startFocusMode}
                  onEdit={setEditTask}
                />
              ))
            )}
          </div>
        )}
      </div>

      {showAdd && (
        <AddTaskModal
          onClose={() => { setShowAdd(false); setAddDefaultTime(undefined) }}
          onSave={async (data) => { await addTask(data as Parameters<typeof addTask>[0]) }}
          settings={state.settings}
          defaultStartTime={addDefaultTime}
        />
      )}
      {editTask && (
        <EditTaskModal task={editTask} onClose={() => setEditTask(null)} onSave={updateTask} onDelete={deleteTask} />
      )}
      {extendId && (
        <ExtendModal taskId={extendId} onClose={() => setExtendId(null)} onExtend={extendTaskTime} />
      )}
    </div>
  )
}
