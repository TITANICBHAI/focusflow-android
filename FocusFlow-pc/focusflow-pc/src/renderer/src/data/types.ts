export type TaskStatus = 'scheduled' | 'active' | 'completed' | 'skipped' | 'overdue'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export interface Task {
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  durationMinutes: number
  status: TaskStatus
  priority: TaskPriority
  tags: string[]
  reminders: Reminder[]
  color: string
  focusMode: boolean
  focusAllowedPackages?: string[]
  createdAt: string
  updatedAt: string
}

export interface Reminder {
  id: string
  taskId: string
  offsetMinutes: number
  type: 'pre-start' | 'at-start' | 'post-start'
}

export interface FocusSession {
  taskId: string
  startedAt: string
  isActive: boolean
  allowedPackages: string[]
}

export interface BlockedWebsite {
  id: string
  domain: string
  enabled: boolean
}

export interface RecurringBlockSchedule {
  id: string
  name: string
  packages: string[]
  days: number[]
  startHour: number
  startMin: number
  endHour: number
  endMin: number
  enabled: boolean
}

export interface UserProfile {
  name?: string
  occupation?: string
  dailyGoalHours?: number
  wakeUpTime?: string
  sleepTime?: string
  focusGoals?: string[]
  chronotype?: 'morning' | 'midday' | 'afternoon' | 'evening' | 'night' | 'flexible'
  focusSessionLength?: number
  breakStyle?: 'short_frequent' | 'balanced' | 'long_infrequent' | 'no_break'
  distractionTriggers?: string[]
  motivationStyle?: string[]
  weeklyReviewDay?: string
}

export interface AppSettings {
  darkMode: boolean
  defaultDuration: number
  defaultReminderOffsets: number[]
  focusModeEnabled: boolean
  allowedInFocus: string[]
  pomodoroEnabled: boolean
  pomodoroDuration: number
  pomodoroBreak: number
  notificationsEnabled: boolean
  onboardingComplete: boolean
  privacyAccepted: boolean
  standaloneBlockPackages: string[]
  standaloneBlockUntil: string | null
  blockedWords: string[]
  recurringBlockSchedules: RecurringBlockSchedule[]
  keepFocusActiveUntilTaskEnd: boolean
  userProfile?: UserProfile
  beginnerMode?: boolean
  lastShownStreakMilestone?: number
  // Always-On enforcement
  alwaysOnEnforcementEnabled?: boolean
  alwaysOnPackages?: string[]
  autoCopyToAlwaysOn?: boolean
  // PC-specific
  blockedWebsites: BlockedWebsite[]
  blockedWebsitesEnabled: boolean
  weeklyReportEnabled: boolean
  aversionSoundEnabled: boolean
  tipsCardDismissed?: boolean
  sessionPin?: string | null        // SHA-256 hex of 4–6 digit PIN; null = no PIN set
  showBlockedSitesList?: boolean    // show domains in block overlay (default true)
  // Overlay appearance
  overlayQuotes?: string[]          // custom motivational quotes shown on block overlay
  overlayTheme?: 'dark' | 'midnight' | 'forest' | 'ocean' | 'sunset'
  // Daily Allowance
  dailyAllowances?: DailyAllowanceEntry[]
  dailyAllowanceUsage?: DailyAllowanceUsage[]
}

export interface DailyAllowanceEntry {
  id: string
  domain: string
  mode: 'time_budget' | 'interval'
  budgetMinutes: number      // for time_budget: total minutes allowed per day
  intervalMinutes: number    // for interval: allowed duration each visit
  intervalHours: number      // for interval: minimum hours between visits
  enabled: boolean
}

export interface DailyAllowanceUsage {
  id: string                 // allowance entry id
  date: string               // YYYY-MM-DD
  usedMinutes: number
  lastStarted: string | null // ISO timestamp of current active visit start
}
