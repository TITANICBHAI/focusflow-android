import Database from 'better-sqlite3'
import { join } from 'path'
import { app } from 'electron'

let db: Database.Database

const DEFAULT_SETTINGS = {
  darkMode: false,
  defaultDuration: 60,
  defaultReminderOffsets: [-10, -5, 0],
  focusModeEnabled: true,
  allowedInFocus: [],
  allowedAppPresets: [],
  blockPresets: [],
  pomodoroEnabled: false,
  pomodoroDuration: 25,
  pomodoroBreak: 5,
  notificationsEnabled: true,
  privacyAccepted: true,
  standaloneBlockPackages: [],
  standaloneBlockUntil: null,
  dailyAllowanceEntries: [],
  onboardingComplete: false,
  blockedWords: [],
  aversionDimmerEnabled: false,
  aversionVibrateEnabled: false,
  aversionSoundEnabled: false,
  weeklyReportEnabled: false,
  greyoutSchedule: [],
  systemGuardEnabled: false,
  blockInstallActionsEnabled: false,
  blockYoutubeShortsEnabled: false,
  blockInstagramReelsEnabled: false,
  keepFocusActiveUntilTaskEnd: false,
  customNodeRules: [],
  recurringBlockSchedules: [],
  beginnerMode: false,
  tipsCardDismissed: false,
  alwaysOnEnforcementEnabled: true,
  lastShownStreakMilestone: 0,
  blockedWebsites: [],
  blockedWebsitesEnabled: false,
}

export function initDatabase(): void {
  const dbPath = join(app.getPath('userData'), 'focusflow.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      priority TEXT NOT NULL DEFAULT 'medium',
      tags TEXT NOT NULL DEFAULT '[]',
      reminders TEXT NOT NULL DEFAULT '[]',
      color TEXT NOT NULL DEFAULT '#6366f1',
      focus_mode INTEGER NOT NULL DEFAULT 0,
      focus_allowed_packages TEXT,
      repeat_rule TEXT NOT NULL DEFAULT 'none',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS focus_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      allowed_packages TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS focus_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL,
      app_name TEXT NOT NULL,
      overridden_at TEXT NOT NULL,
      reason TEXT
    );

    CREATE TABLE IF NOT EXISTS daily_completions (
      date TEXT PRIMARY KEY,
      completed INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS daily_notes (
      date TEXT PRIMARY KEY,
      content TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );
  `)

  // Migrations: safely add columns if they don't exist
  const taskCols = (db.prepare("PRAGMA table_info(tasks)").all() as { name: string }[]).map(c => c.name)
  if (!taskCols.includes('repeat_rule')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN repeat_rule TEXT NOT NULL DEFAULT 'none'`)
  }
}

function rowToTask(row: Record<string, unknown>) {
  const rawFap = row.focus_allowed_packages as string | null | undefined
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    startTime: row.start_time,
    endTime: row.end_time,
    durationMinutes: row.duration_minutes,
    status: row.status,
    priority: row.priority,
    tags: JSON.parse(row.tags as string || '[]'),
    reminders: JSON.parse(row.reminders as string || '[]'),
    color: row.color,
    focusMode: (row.focus_mode as number) === 1,
    focusAllowedPackages: rawFap ? JSON.parse(rawFap) : undefined,
    repeatRule: (row.repeat_rule as string) || 'none',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function getAllTasks() {
  const rows = db.prepare('SELECT * FROM tasks ORDER BY start_time ASC').all() as Record<string, unknown>[]
  return rows.map(rowToTask)
}

export function getRecentUnresolvedTasks() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const now = new Date().toISOString()
  const rows = db.prepare(
    `SELECT * FROM tasks WHERE end_time >= ? AND end_time < ? AND status NOT IN ('completed','skipped') ORDER BY end_time DESC`
  ).all(cutoff, now) as Record<string, unknown>[]
  return rows.map(rowToTask)
}

export function getTasksInDateRange(startISO: string, endISO: string) {
  const toLocal = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }
  const rows = db.prepare(
    `SELECT * FROM tasks WHERE date(datetime(start_time,'localtime')) BETWEEN ? AND ? ORDER BY start_time ASC`
  ).all(toLocal(startISO), toLocal(endISO)) as Record<string, unknown>[]
  return rows.map(rowToTask)
}

export function insertTask(task: Record<string, unknown>): void {
  db.prepare(
    `INSERT INTO tasks (id,title,description,start_time,end_time,duration_minutes,status,priority,tags,reminders,color,focus_mode,focus_allowed_packages,repeat_rule,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    task.id, task.title, task.description ?? null, task.startTime, task.endTime,
    task.durationMinutes, task.status, task.priority,
    JSON.stringify(task.tags ?? []), JSON.stringify(task.reminders ?? []),
    task.color, task.focusMode ? 1 : 0,
    task.focusAllowedPackages !== undefined ? JSON.stringify(task.focusAllowedPackages) : null,
    task.repeat ?? task.repeatRule ?? 'none',
    task.createdAt, task.updatedAt
  )

  // Auto-schedule recurring: create next occurrence immediately
  const repeat = (task.repeat ?? task.repeatRule ?? 'none') as string
  if (repeat && repeat !== 'none') {
    scheduleNextRecurrence(task, repeat)
  }
}

function scheduleNextRecurrence(task: Record<string, unknown>, repeat: string): void {
  const start = new Date(task.startTime as string)
  const end = new Date(task.endTime as string)
  const dur = task.durationMinutes as number

  let nextStart: Date | null = null

  if (repeat === 'daily') {
    nextStart = new Date(start); nextStart.setDate(nextStart.getDate() + 1)
  } else if (repeat === 'weekdays') {
    nextStart = new Date(start)
    do { nextStart.setDate(nextStart.getDate() + 1) } while ([0, 6].includes(nextStart.getDay()))
  } else if (repeat === 'weekly') {
    nextStart = new Date(start); nextStart.setDate(nextStart.getDate() + 7)
  } else if (repeat === 'monthly') {
    nextStart = new Date(start); nextStart.setMonth(nextStart.getMonth() + 1)
  }

  if (!nextStart) return

  const nextEnd = new Date(nextStart.getTime() + (end.getTime() - start.getTime()))
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36)
  const now = new Date().toISOString()

  db.prepare(
    `INSERT OR IGNORE INTO tasks (id,title,description,start_time,end_time,duration_minutes,status,priority,tags,reminders,color,focus_mode,focus_allowed_packages,repeat_rule,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id, task.title, task.description ?? null,
    nextStart.toISOString(), nextEnd.toISOString(), dur,
    'scheduled', task.priority,
    JSON.stringify(task.tags ?? []), JSON.stringify(task.reminders ?? []),
    task.color, task.focusMode ? 1 : 0, null,
    repeat, now, now
  )
}

export function updateTask(task: Record<string, unknown>): void {
  db.prepare(
    `UPDATE tasks SET title=?,description=?,start_time=?,end_time=?,duration_minutes=?,status=?,priority=?,tags=?,reminders=?,color=?,focus_mode=?,focus_allowed_packages=?,repeat_rule=?,updated_at=? WHERE id=?`
  ).run(
    task.title, task.description ?? null, task.startTime, task.endTime,
    task.durationMinutes, task.status, task.priority,
    JSON.stringify(task.tags ?? []), JSON.stringify(task.reminders ?? []),
    task.color, task.focusMode ? 1 : 0,
    task.focusAllowedPackages !== undefined ? JSON.stringify(task.focusAllowedPackages) : null,
    task.repeatRule ?? 'none',
    task.updatedAt, task.id
  )
}

export function deleteTask(id: string): void {
  db.prepare('DELETE FROM tasks WHERE id=?').run(id)
}

export function getSettings() {
  const row = db.prepare(`SELECT value FROM settings WHERE key='app_settings'`).get() as { value: string } | undefined
  if (!row) return DEFAULT_SETTINGS
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(row.value) }
  } catch { return DEFAULT_SETTINGS }
}

export function saveSettings(settings: unknown): void {
  db.prepare(`INSERT OR REPLACE INTO settings (key,value) VALUES ('app_settings',?)`).run(JSON.stringify(settings))
}

export function startFocusSession(session: { taskId: string; startedAt: string; allowedPackages: string[] }): void {
  db.prepare(`INSERT INTO focus_sessions (task_id,started_at,is_active,allowed_packages) VALUES (?,?,1,?)`).run(session.taskId, session.startedAt, JSON.stringify(session.allowedPackages))
}

export function endFocusSession(taskId: string): void {
  db.prepare(`UPDATE focus_sessions SET is_active=0, ended_at=? WHERE task_id=? AND is_active=1`).run(new Date().toISOString(), taskId)
}

export function getActiveFocusSession() {
  const row = db.prepare(`SELECT * FROM focus_sessions WHERE is_active=1 ORDER BY id DESC LIMIT 1`).get() as Record<string, unknown> | undefined
  if (!row) return null
  return { taskId: row.task_id, startedAt: row.started_at, isActive: true, allowedPackages: JSON.parse(row.allowed_packages as string || '[]') }
}

export function getTodayFocusMinutes(): number {
  const startOfDay = new Date(); startOfDay.setHours(0,0,0,0)
  const rows = db.prepare(`SELECT started_at, ended_at FROM focus_sessions WHERE started_at >= ?`).all(startOfDay.toISOString()) as { started_at: string; ended_at: string|null }[]
  let total = 0; const now = Date.now()
  for (const r of rows) { const s = new Date(r.started_at).getTime(); const e = r.ended_at ? new Date(r.ended_at).getTime() : now; total += Math.max(0, e-s) }
  return Math.floor(total / 60000)
}

export function logFocusOverride(taskId: string, appName: string, reason?: string): void {
  db.prepare(`INSERT INTO focus_overrides (task_id,app_name,overridden_at,reason) VALUES (?,?,?,?)`).run(taskId, appName, new Date().toISOString(), reason ?? null)
}

export function getTodayOverrideCount(): number {
  const start = new Date(); start.setHours(0,0,0,0)
  const row = db.prepare(`SELECT COUNT(*) as count FROM focus_overrides WHERE overridden_at >= ?`).get(start.toISOString()) as { count: number }
  return row?.count ?? 0
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function recordDayCompletion(completed: number, total: number): void {
  const date = localDateStr(new Date())
  db.prepare(`INSERT OR REPLACE INTO daily_completions (date,completed,total) VALUES (?,?,?)`).run(date, completed, total)
}

export function backfillDayCompletions(daysBack = 30): void {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - daysBack + 1); cutoff.setHours(0,0,0,0)
  const rows = db.prepare(`SELECT start_time, status FROM tasks WHERE start_time >= ?`).all(cutoff.toISOString()) as { start_time: string; status: string }[]
  const buckets = new Map<string, { completed: number; total: number }>()
  for (const r of rows) {
    const d = localDateStr(new Date(r.start_time)); const b = buckets.get(d) ?? { completed: 0, total: 0 }
    b.total += 1; if (r.status === 'completed') b.completed += 1; buckets.set(d, b)
  }
  const stmt = db.prepare(`INSERT OR REPLACE INTO daily_completions (date,completed,total) VALUES (?,?,?)`)
  for (const [date, b] of buckets) stmt.run(date, b.completed, b.total)
}

export function getStreak(): number {
  const rows = db.prepare(`SELECT date,completed,total FROM daily_completions ORDER BY date DESC LIMIT 60`).all() as { date: string; completed: number; total: number }[]
  let streak = 0; let checkDate = new Date(); checkDate.setHours(0,0,0,0)
  for (const row of rows) {
    const rowDate = new Date(row.date); const diff = Math.round((checkDate.getTime() - rowDate.getTime()) / 86400000)
    if (diff > 1) break
    if (row.total > 0 && row.completed / row.total >= 0.5) { streak++; checkDate = rowDate } else break
  }
  return streak
}

export function getBestStreak(): number {
  const rows = db.prepare(`SELECT date,completed,total FROM daily_completions ORDER BY date ASC`).all() as { date: string; completed: number; total: number }[]
  let best = 0, current = 0; let prev: Date|null = null
  for (const r of rows) {
    const d = new Date(r.date); const isGood = r.total > 0 && r.completed / r.total >= 0.5
    if (!isGood) { best = Math.max(best, current); current = 0; prev = null; continue }
    if (!prev) current = 1
    else { const diff = Math.round((d.getTime() - prev.getTime()) / 86400000); if (diff === 1) current++; else { best = Math.max(best, current); current = 1 } }
    prev = d
  }
  return Math.max(best, current)
}

export function getAllTimeFocusMinutes(): number {
  const rows = db.prepare(`SELECT started_at, ended_at FROM focus_sessions WHERE is_active=0`).all() as { started_at: string; ended_at: string|null }[]
  let total = 0
  for (const r of rows) { if (!r.ended_at) continue; const ms = new Date(r.ended_at).getTime() - new Date(r.started_at).getTime(); if (ms > 0) total += ms/60000 }
  return Math.round(total)
}

export function getAllTimeFocusSessions(): number {
  const row = db.prepare(`SELECT COUNT(*) as count FROM focus_sessions WHERE is_active=0`).get() as { count: number }
  return row?.count ?? 0
}

export function getRecentDayCompletions(days: number): { date: string; completed: number; total: number }[] {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days + 1); cutoff.setHours(0,0,0,0)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  return db.prepare(`SELECT date,completed,total FROM daily_completions WHERE date >= ? ORDER BY date ASC`).all(cutoffStr) as { date: string; completed: number; total: number }[]
}

export interface FocusSessionRecord {
  id: number
  taskId: string
  taskTitle: string
  startedAt: string
  endedAt: string | null
  durationMinutes: number
  overrideCount: number
}

export function getRecentFocusSessions(limit = 100): FocusSessionRecord[] {
  const rows = db.prepare(`
    SELECT
      fs.id,
      fs.task_id,
      COALESCE(t.title, 'Unknown Task') AS task_title,
      fs.started_at,
      fs.ended_at,
      (SELECT COUNT(*) FROM focus_overrides fo
        WHERE fo.task_id = fs.task_id
          AND fo.overridden_at >= fs.started_at
          AND (fs.ended_at IS NULL OR fo.overridden_at <= fs.ended_at)
      ) AS override_count
    FROM focus_sessions fs
    LEFT JOIN tasks t ON t.id = fs.task_id
    WHERE fs.is_active = 0
    ORDER BY fs.started_at DESC
    LIMIT ?
  `).all(limit) as { id: number; task_id: string; task_title: string; started_at: string; ended_at: string | null; override_count: number }[]

  return rows.map(r => {
    const ms = r.ended_at
      ? new Date(r.ended_at).getTime() - new Date(r.started_at).getTime()
      : 0
    return {
      id: r.id,
      taskId: r.task_id,
      taskTitle: r.task_title,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      durationMinutes: Math.round(ms / 60000),
      overrideCount: r.override_count,
    }
  })
}

// ── Daily Notes ───────────────────────────────────────────────────────────────

export function getNoteForDate(date: string): string {
  const row = db.prepare(`SELECT content FROM daily_notes WHERE date=?`).get(date) as { content: string } | undefined
  return row?.content ?? ''
}

export function saveNote(date: string, content: string): void {
  const now = new Date().toISOString()
  db.prepare(`INSERT OR REPLACE INTO daily_notes (date,content,updated_at) VALUES (?,?,?)`).run(date, content, now)
}

export function getRecentNoteDates(days: number): string[] {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days + 1); cutoff.setHours(0,0,0,0)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  const rows = db.prepare(`SELECT date FROM daily_notes WHERE date >= ? AND content != '' ORDER BY date DESC`).all(cutoffStr) as { date: string }[]
  return rows.map(r => r.date)
}
