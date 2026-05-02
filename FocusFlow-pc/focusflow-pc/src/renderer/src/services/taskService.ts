import type { Task, TaskPriority, TaskStatus } from '../data/types'
import dayjs from 'dayjs'

let _nanoid: (size?: number) => string
const nanoidPromise = import('nanoid').then(m => { _nanoid = m.nanoid })
nanoidPromise.catch(() => {})

function genId(): string {
  if (_nanoid) return _nanoid(21)
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function createTask(data: {
  title: string; description?: string; startTime: string; durationMinutes: number
  priority?: TaskPriority; tags?: string[]; color?: string; focusMode?: boolean; focusAllowedPackages?: string[]
}): Task {
  const start = dayjs(data.startTime)
  const end = start.add(data.durationMinutes, 'minute')
  return {
    id: genId(),
    title: data.title,
    description: data.description,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    durationMinutes: data.durationMinutes,
    status: 'scheduled',
    priority: data.priority ?? 'medium',
    tags: data.tags ?? [],
    reminders: [],
    color: data.color ?? '#6366f1',
    focusMode: data.focusMode ?? false,
    focusAllowedPackages: data.focusAllowedPackages,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function updateTaskStatus(task: Task, status: TaskStatus): Task {
  return { ...task, status, updatedAt: new Date().toISOString() }
}

export function extendTask(task: Task, extraMinutes: number): Task {
  const newEnd = dayjs(task.endTime).add(extraMinutes, 'minute')
  return { ...task, endTime: newEnd.toISOString(), durationMinutes: task.durationMinutes + extraMinutes, updatedAt: new Date().toISOString() }
}

export function getActiveTask(tasks: Task[]): Task | null {
  const now = dayjs()
  return tasks.find(t =>
    t.status !== 'completed' && t.status !== 'skipped' &&
    dayjs(t.startTime).isBefore(now) && dayjs(t.endTime).isAfter(now)
  ) ?? null
}

export function getCurrentTask(tasks: Task[]): Task | null {
  const now = dayjs()
  const active = getActiveTask(tasks)
  if (active) return active
  const ended = tasks.filter(t =>
    t.status !== 'completed' && t.status !== 'skipped' &&
    dayjs(t.startTime).isBefore(now) && dayjs(t.endTime).isBefore(now)
  ).sort((a, b) => dayjs(b.endTime).unix() - dayjs(a.endTime).unix())
  return ended[0] ?? null
}

export function getAllActiveTasks(tasks: Task[]): Task[] {
  const now = dayjs()
  return tasks.filter(t =>
    t.status !== 'completed' && t.status !== 'skipped' &&
    dayjs(t.startTime).isBefore(now) && dayjs(t.endTime).isAfter(now)
  )
}

export function getTodayTasks(tasks: Task[]): Task[] {
  const today = dayjs().startOf('day')
  const tomorrow = today.add(1, 'day')
  return tasks.filter(t => {
    const start = dayjs(t.startTime)
    return start.isSameOrAfter(today) && start.isBefore(tomorrow)
  })
}

export function getUpcomingTask(tasks: Task[]): Task | null {
  const now = dayjs()
  return tasks
    .filter(t => t.status !== 'completed' && t.status !== 'skipped' && dayjs(t.startTime).isAfter(now))
    .sort((a, b) => dayjs(a.startTime).unix() - dayjs(b.startTime).unix())[0] ?? null
}

export function isAwaitingDecision(task: Task): boolean {
  const now = dayjs()
  return task.status !== 'completed' && task.status !== 'skipped' &&
    dayjs(task.startTime).isBefore(now) && dayjs(task.endTime).isBefore(now)
}

export function formatTime(iso: string): string {
  return dayjs(iso).format('h:mm A')
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60), m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function formatDate(iso: string): string {
  return dayjs(iso).format('MMM D, YYYY')
}
