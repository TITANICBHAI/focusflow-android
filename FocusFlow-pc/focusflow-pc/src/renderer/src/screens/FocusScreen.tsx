import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { formatTime, getActiveTask, isAwaitingDecision } from '../services/taskService'
import PinModal from '../components/PinModal'
import dayjs from 'dayjs'

type Page = 'today' | 'week' | 'focus' | 'stats' | 'settings' | 'profile' | 'reports' | 'active' | 'notes' | 'block-defense' | 'keyword-blocker' | 'always-on' | 'changelog' | 'how-to-use' | 'privacy' | 'standalone-block' | 'import-blocklist'

// ── Web Audio beep ──────────────────────────────────────────────────────────
function beep(type: 'work' | 'break' | 'done') {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    if (type === 'done') {
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.2)
      gain.gain.setValueAtTime(0.35, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
      osc.start(); osc.stop(ctx.currentTime + 0.8)
    } else if (type === 'break') {
      osc.frequency.setValueAtTime(660, ctx.currentTime)
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15)
      gain.gain.setValueAtTime(0.25, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start(); osc.stop(ctx.currentTime + 0.5)
    } else {
      osc.frequency.setValueAtTime(440, ctx.currentTime)
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.25, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(); osc.stop(ctx.currentTime + 0.4)
    }
  } catch {}
}

// ── Pomodoro logic ───────────────────────────────────────────────────────────
interface PomodoroState {
  phase: 'work' | 'break'
  interval: number      // 1-based work interval count
  phaseStart: number    // ms timestamp when phase started
}

function usePomodoroTimer(
  taskId: string | null,
  isFocusing: boolean,
  workMins: number,
  breakMins: number
) {
  const WORK_MS = workMins * 60 * 1000
  const BREAK_MS = breakMins * 60 * 1000
  const MAX_INTERVALS = 4

  const [pomo, setPomo] = useState<PomodoroState>({ phase: 'work', interval: 1, phaseStart: Date.now() })
  const [now, setNow] = useState(Date.now())
  const prevTaskRef = useRef<string | null>(null)
  const prevFocusing = useRef(false)

  // Reset when task or focus state changes
  useEffect(() => {
    if (taskId !== prevTaskRef.current || (!prevFocusing.current && isFocusing)) {
      setPomo({ phase: 'work', interval: 1, phaseStart: Date.now() })
      prevTaskRef.current = taskId
    }
    prevFocusing.current = isFocusing
  }, [taskId, isFocusing])

  // Tick
  useEffect(() => {
    if (!isFocusing) return
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [isFocusing])

  // Phase transitions
  useEffect(() => {
    if (!isFocusing) return
    const elapsed = now - pomo.phaseStart
    const duration = pomo.phase === 'work' ? WORK_MS : BREAK_MS

    if (elapsed >= duration) {
      if (pomo.phase === 'work') {
        const nextInterval = pomo.interval
        const isDone = nextInterval >= MAX_INTERVALS
        beep(isDone ? 'done' : 'break')
        window.api.app.showNotification(
          isDone ? '🎉 4 Pomodoros done!' : `☕ Break time! (${nextInterval}/${MAX_INTERVALS})`,
          isDone ? 'Take a long break — amazing work!' : `Take a ${breakMins}-min break.`
        )
        setPomo({ phase: 'break', interval: nextInterval, phaseStart: now })
      } else {
        const nextInterval = pomo.interval >= MAX_INTERVALS ? 1 : pomo.interval + 1
        beep('work')
        window.api.app.showNotification(
          `🛡 Pomodoro ${nextInterval} starting!`,
          `Time to focus for ${workMins} minutes.`
        )
        setPomo({ phase: 'work', interval: nextInterval, phaseStart: now })
      }
    }
  }, [now, pomo, isFocusing, WORK_MS, BREAK_MS, workMins, breakMins])

  const elapsed = now - pomo.phaseStart
  const duration = pomo.phase === 'work' ? WORK_MS : BREAK_MS
  const remaining = Math.max(0, duration - elapsed)
  const progress = Math.min(1, elapsed / duration)
  const remMins = Math.floor(remaining / 60000)
  const remSecs = Math.floor((remaining % 60000) / 1000)

  const skipPhase = useCallback(() => {
    if (pomo.phase === 'work') {
      setPomo({ phase: 'break', interval: pomo.interval, phaseStart: Date.now() })
    } else {
      const nextInterval = pomo.interval >= MAX_INTERVALS ? 1 : pomo.interval + 1
      setPomo({ phase: 'work', interval: nextInterval, phaseStart: Date.now() })
    }
  }, [pomo])

  return { pomo, remMins, remSecs, progress, skipPhase, MAX_INTERVALS }
}

// ── Task Ring Timer ──────────────────────────────────────────────────────────
function TimerRing({ startTime, endTime, color, isFocusing }: {
  startTime: string; endTime: string; color: string; isFocusing: boolean
}) {
  const [now, setNow] = useState(Date.now())
  const size = 220
  const stroke = 12
  const radius = (size - stroke * 2) / 2
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [])

  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  const total = end - start
  const elapsedMs = Math.max(0, now - start)
  const progress = Math.min(1, elapsedMs / total)
  const remaining = Math.max(0, end - now)
  const remMins = Math.floor(remaining / 60000)
  const remSecs = Math.floor((remaining % 60000) / 1000)
  const dashOffset = circumference * (1 - progress)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {isFocusing && [0.85, 0.92, 1].map((scale, i) => (
        <div key={i} className="absolute rounded-full border-2 animate-ripple pointer-events-none"
          style={{ width: size * scale, height: size * scale, borderColor: color + '40', animationDelay: `${i * 0.5}s`, animationDuration: '2s' }} />
      ))}
      <svg width={size} height={size} style={{ position: 'absolute' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color + '22'} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 1s linear' }} />
      </svg>
      <div className="relative flex flex-col items-center justify-center rounded-full shadow-2xl"
        style={{ width: size * 0.7, height: size * 0.7, backgroundColor: color }}>
        <span className="text-3xl font-black text-white tabular-nums">
          {String(remMins).padStart(2,'0')}:{String(remSecs).padStart(2,'0')}
        </span>
        <span className="text-xs font-semibold text-white/70 mt-1">{progress >= 1 ? "TIME'S UP" : `${Math.round(progress * 100)}% done`}</span>
      </div>
    </div>
  )
}

// ── Pomodoro Ring ────────────────────────────────────────────────────────────
function PomodoroRing({ remMins, remSecs, progress, phase, interval, maxIntervals, color }: {
  remMins: number; remSecs: number; progress: number
  phase: 'work' | 'break'; interval: number; maxIntervals: number; color: string
}) {
  const size = 220
  const stroke = 12
  const radius = (size - stroke * 2) / 2
  const circumference = 2 * Math.PI * radius
  const ringColor = phase === 'work' ? color : '#10b981'
  const dashOffset = circumference * (1 - progress)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {phase === 'work' && [0.85, 0.92, 1].map((scale, i) => (
        <div key={i} className="absolute rounded-full border-2 animate-ripple pointer-events-none"
          style={{ width: size * scale, height: size * scale, borderColor: ringColor + '40', animationDelay: `${i * 0.5}s`, animationDuration: '2s' }} />
      ))}
      <svg width={size} height={size} style={{ position: 'absolute' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={ringColor + '22'} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={ringColor} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 1s linear' }} />
      </svg>
      <div className="relative flex flex-col items-center justify-center rounded-full shadow-2xl"
        style={{ width: size * 0.7, height: size * 0.7, backgroundColor: ringColor }}>
        <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider mb-0.5">
          {phase === 'work' ? `Pomodoro ${interval}/${maxIntervals}` : 'Break Time ☕'}
        </span>
        <span className="text-3xl font-black text-white tabular-nums">
          {String(remMins).padStart(2,'0')}:{String(remSecs).padStart(2,'0')}
        </span>
        <div className="flex gap-1 mt-2">
          {Array.from({ length: maxIntervals }, (_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-colors ${
              i < interval - 1 ? 'bg-white' : i === interval - 1 && phase === 'work' ? 'bg-white/70 animate-pulse' : 'bg-white/25'
            }`} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main FocusScreen ─────────────────────────────────────────────────────────
export default function FocusScreen({ navigate }: { navigate: (p: Page) => void }) {
  const { state, todayTasks, activeTask, currentTask, activeTasks, startFocusMode, stopFocusMode, completeTask, skipTask, extendTaskTime } = useApp()
  const task = currentTask ?? activeTask ?? activeTasks[0] ?? null
  const isFocusing = state.focusSession?.isActive === true && state.focusSession?.taskId === task?.id
  const awaiting = task ? isAwaitingDecision(task) : false
  const otherActiveCount = activeTasks.filter(t => t.id !== task?.id).length
  const [showExtend, setShowExtend] = useState(false)
  const [showPomoSettings, setShowPomoSettings] = useState(false)
  const [showStopPin, setShowStopPin] = useState(false)
  const pomodoroEnabled = state.settings.pomodoroEnabled
  const workMins = state.settings.pomodoroDuration || 25
  const breakMins = state.settings.pomodoroBreak || 5

  const { pomo, remMins, remSecs, progress, skipPhase, MAX_INTERVALS } = usePomodoroTimer(
    task?.id ?? null, isFocusing && pomodoroEnabled, workMins, breakMins
  )

  // Ctrl+S = save / quick-complete
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && task && !awaiting) {
        e.preventDefault()
        if (confirm('Mark task as done?')) completeTask(task.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [task, awaiting, completeTask])

  if (!task) {
    const upcoming = todayTasks
      .filter(t => t.status === 'scheduled' && new Date(t.startTime) > new Date())
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0]
    const standaloneUntil = state.settings.standaloneBlockUntil ? new Date(state.settings.standaloneBlockUntil) : null
    const standaloneActive = standaloneUntil !== null && standaloneUntil > new Date()
    const standaloneRemaining = standaloneActive && standaloneUntil
      ? Math.max(0, Math.round((standaloneUntil.getTime() - Date.now()) / 60000))
      : 0
    return (
      <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-5 text-4xl">🛡</div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">No active task</h2>
        {upcoming ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">Next up: <span className="font-semibold text-indigo-500">{upcoming.title}</span> at {formatTime(upcoming.startTime)}</p>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">Schedule tasks on the Today tab to get started.</p>
        )}
        <div className="flex gap-3 mt-5 flex-wrap justify-center">
          <button onClick={() => navigate('today')} className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl text-sm transition-colors">Go to Today →</button>
          <button onClick={() => navigate('standalone-block')}
            className={`px-5 py-2.5 font-bold rounded-xl text-sm transition-colors border-2 ${
              standaloneActive
                ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-500'
                : 'border-rose-400 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20'
            }`}>
            {standaloneActive ? `⏱ Block Active — ${standaloneRemaining}m left` : '⏱ Standalone Block'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-y-auto">
      {/* Status bar */}
      <div className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className={`w-2 h-2 rounded-full ${isFocusing ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          {isFocusing
            ? pomodoroEnabled ? `Pomodoro Mode — ${pomo.phase === 'work' ? `Work ${pomo.interval}/${MAX_INTERVALS}` : 'Break ☕'}` : 'Focus Mode Active'
            : 'Task In Progress'}
        </span>
        {otherActiveCount > 0 && (
          <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">+{otherActiveCount} more active</span>
        )}
        {isFocusing && pomodoroEnabled && (
          <button onClick={() => setShowPomoSettings(true)} className="ml-auto text-[10px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">⚙ Pomodoro</button>
        )}
      </div>

      <div className="flex flex-col items-center px-6 py-8 gap-6 flex-1">
        {/* Timer Ring — pomodoro or task */}
        {isFocusing && pomodoroEnabled ? (
          <PomodoroRing
            remMins={remMins} remSecs={remSecs} progress={progress}
            phase={pomo.phase} interval={pomo.interval} maxIntervals={MAX_INTERVALS}
            color={task.color}
          />
        ) : (
          <TimerRing startTime={task.startTime} endTime={task.endTime} color={task.color} isFocusing={isFocusing} />
        )}

        {/* Pomodoro phase skip button */}
        {isFocusing && pomodoroEnabled && (
          <button onClick={skipPhase} className="text-xs font-semibold text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
            {pomo.phase === 'work' ? '⏭ Skip to Break' : '⏭ Skip Break → Work'}
          </button>
        )}

        {/* Task info */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">{task.title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{formatTime(task.startTime)} – {formatTime(task.endTime)}</p>
          {task.tags.length > 0 && (
            <div className="flex gap-1.5 justify-center mt-2 flex-wrap">
              {task.tags.map(tag => (
                <span key={tag} className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: task.color + '20', color: task.color }}>#{tag}</span>
              ))}
            </div>
          )}
          {isFocusing && pomodoroEnabled && pomo.phase === 'break' && (
            <div className="mt-3 px-4 py-2 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-xl">
              <p className="text-xs font-semibold text-green-700 dark:text-green-400">☕ Break time! Step away, stretch, hydrate.</p>
            </div>
          )}
        </div>

        {/* Time's up prompt */}
        {awaiting && (
          <div className="w-full max-w-sm bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-orange-500">⏰</span>
              <span className="text-sm font-bold text-orange-600 dark:text-orange-400">Time's up — what next?</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">This task ran past its scheduled end. Pick one to clear it.</p>
            <div className="flex gap-2">
              <button onClick={() => completeTask(task.id)} className="flex-1 py-2 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 transition-colors">✓ Done</button>
              <button onClick={() => setShowExtend(true)} className="flex-1 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors">+ Extend</button>
              <button onClick={() => { if (confirm('Skip this task?')) skipTask(task.id) }} className="flex-1 py-2 rounded-xl bg-gray-400 text-white text-sm font-bold hover:bg-gray-500 transition-colors">✕ Skip</button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="w-full max-w-sm space-y-3">
          {!isFocusing ? (
            <button onClick={() => startFocusMode(task.id)}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
              style={{ backgroundColor: task.color }}>
              🛡 {pomodoroEnabled ? 'Start Pomodoro Focus' : 'Activate Focus Mode'}
            </button>
          ) : (
            <button
              onClick={() => {
                if (state.settings.sessionPin) { setShowStopPin(true) }
                else if (confirm('End focus mode for this task?')) { stopFocusMode() }
              }}
              className="w-full py-3.5 rounded-2xl bg-gray-400 hover:bg-gray-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors">
              ⏹ Stop Focus Mode {state.settings.sessionPin ? '🔒' : ''}
            </button>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { if (confirm('Mark task as done?')) completeTask(task.id) }}
              className="py-2.5 rounded-xl border-2 border-green-500 text-green-600 dark:text-green-400 font-semibold text-sm hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
              ✓ Done <span className="text-[10px] opacity-60">Ctrl+↵</span>
            </button>
            <button onClick={() => setShowExtend(true)}
              className="py-2.5 rounded-xl border-2 border-orange-400 text-orange-600 dark:text-orange-400 font-semibold text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
              + Extend
            </button>
          </div>
          {isFocusing && (
            <button onClick={async () => {
              if (confirm('Emergency override will stop focus and be logged. Only in genuine emergencies.')) {
                await window.api.focus.logOverride(task.id, 'emergency')
                stopFocusMode()
              }
            }} className="w-full py-2 rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10 text-red-500 text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">
              🚨 Emergency Override
            </button>
          )}
        </div>

        {/* Description */}
        {task.description && (
          <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wider">Notes</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">{task.description}</p>
          </div>
        )}

        {/* Pomodoro tip when not in focus */}
        {!isFocusing && pomodoroEnabled && (
          <div className="w-full max-w-sm bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3 text-center">
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">🍅 Pomodoro mode: {workMins}m work / {breakMins}m break × 4 intervals</p>
          </div>
        )}
      </div>

      {/* Extend modal */}
      {showExtend && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowExtend(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-72 animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4">Extend by how long?</h3>
            <div className="grid grid-cols-3 gap-2">
              {[15,30,45,60,90].map(m => (
                <button key={m} onClick={() => { extendTaskTime(task.id, m); setShowExtend(false) }}
                  className="py-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-400 text-sm font-bold hover:bg-orange-100 transition-colors">
                  +{m}m
                </button>
              ))}
            </div>
            <button onClick={() => setShowExtend(false)} className="w-full mt-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Pomodoro settings mini-modal */}
      {showPomoSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowPomoSettings(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-72 animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">🍅 Pomodoro Settings</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Changes apply from next interval. Go to Settings to adjust.</p>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex justify-between"><span>Work duration</span><strong>{workMins} min</strong></div>
              <div className="flex justify-between"><span>Break duration</span><strong>{breakMins} min</strong></div>
              <div className="flex justify-between"><span>Current phase</span><strong className={pomo.phase === 'work' ? 'text-indigo-500' : 'text-green-500'}>{pomo.phase === 'work' ? `Work ${pomo.interval}/${MAX_INTERVALS}` : 'Break ☕'}</strong></div>
            </div>
            <button onClick={() => { skipPhase(); setShowPomoSettings(false) }} className="w-full mt-4 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600 transition-colors">
              {pomo.phase === 'work' ? '⏭ Skip to Break' : '⏭ Skip to Next Work'}
            </button>
            <button onClick={() => setShowPomoSettings(false)} className="w-full mt-2 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Close</button>
          </div>
        </div>
      )}

      {showStopPin && state.settings.sessionPin && (
        <PinModal
          storedHash={state.settings.sessionPin}
          title="PIN Required"
          subtitle="Enter your session PIN to stop focus mode."
          onSuccess={() => { stopFocusMode(); setShowStopPin(false) }}
          onCancel={() => setShowStopPin(false)}
        />
      )}
    </div>
  )
}
