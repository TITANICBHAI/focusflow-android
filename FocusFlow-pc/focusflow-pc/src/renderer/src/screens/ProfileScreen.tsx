import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import type { UserProfile } from '../data/types'

const OCCUPATIONS = [
  { id: 'student', label: 'Student', icon: '🎓' },
  { id: 'professional', label: 'Professional', icon: '💼' },
  { id: 'freelancer', label: 'Freelancer', icon: '💻' },
  { id: 'creator', label: 'Creator', icon: '🎨' },
  { id: 'other', label: 'Other', icon: '🙋' },
]
const WAKE_TIMES = ['05:00','06:00','07:00','08:00','09:00','10:00','11:00']
const SLEEP_TIMES = ['21:00','22:00','23:00','00:00','01:00','02:00']
const FOCUS_GOALS = [
  { id: 'deep_work', label: 'Deep Work', icon: '⚡' },
  { id: 'study', label: 'Study', icon: '📖' },
  { id: 'no_social', label: 'No Social Media', icon: '📵' },
  { id: 'reading', label: 'Reading', icon: '📚' },
  { id: 'exercise', label: 'Exercise', icon: '💪' },
  { id: 'creative', label: 'Creative', icon: '🎨' },
  { id: 'coding', label: 'Coding', icon: '👨‍💻' },
  { id: 'writing', label: 'Writing', icon: '✍️' },
]
const CHRONOTYPES: { id: UserProfile['chronotype']; label: string; icon: string }[] = [
  { id: 'morning', label: 'Early morning (5–9 am)', icon: '🌅' },
  { id: 'midday', label: 'Late morning (9–12)', icon: '☀️' },
  { id: 'afternoon', label: 'Afternoon (12–5 pm)', icon: '⛅' },
  { id: 'evening', label: 'Evening (5–9 pm)', icon: '🌇' },
  { id: 'night', label: 'Late night (9 pm+)', icon: '🌙' },
  { id: 'flexible', label: 'Varies day to day', icon: '🔀' },
]
const DISTRACTION_TRIGGERS = [
  'Social Media', 'YouTube', 'News', 'Email', 'Messaging', 'Boredom', 'Stress', 'Noise'
]
const MOTIVATION_STYLES = [
  { id: 'milestone', label: 'Milestones', icon: '🏅' },
  { id: 'streak', label: 'Streaks', icon: '🔥' },
  { id: 'freedom', label: 'Freedom first', icon: '🕊' },
  { id: 'challenge', label: 'Challenge', icon: '🏔' },
]

function Chip({ label, icon, active, onClick }: { label: string; icon?: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${active ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-600 bg-white dark:bg-gray-800'}`}>
      {icon && <span>{icon}</span>}{label}
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 px-1">{title}</p>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">{children}</div>
    </div>
  )
}

export default function ProfileScreen({ onBack }: { onBack: () => void }) {
  const { state, updateSettings } = useApp()
  const profile = state.settings.userProfile ?? {}
  const [name, setName] = useState(profile.name ?? '')
  const [occupation, setOccupation] = useState(profile.occupation ?? '')
  const [wakeUpTime, setWakeUpTime] = useState(profile.wakeUpTime ?? '07:00')
  const [sleepTime, setSleepTime] = useState(profile.sleepTime ?? '23:00')
  const [dailyGoalHours, setDailyGoalHours] = useState(profile.dailyGoalHours ?? 4)
  const [focusGoals, setFocusGoals] = useState<string[]>(profile.focusGoals ?? [])
  const [chronotype, setChronotype] = useState(profile.chronotype ?? undefined)
  const [distractionTriggers, setDistractionTriggers] = useState<string[]>(profile.distractionTriggers ?? [])
  const [motivationStyle, setMotivationStyle] = useState<string[]>(profile.motivationStyle ?? [])
  const [saved, setSaved] = useState(false)

  const toggleFocusGoal = (id: string) => setFocusGoals(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const toggleTrigger = (t: string) => setDistractionTriggers(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  const toggleMotivation = (id: string) => setMotivationStyle(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleSave = async () => {
    const updatedProfile: UserProfile = { name: name.trim() || undefined, occupation: occupation || undefined, wakeUpTime, sleepTime, dailyGoalHours, focusGoals, chronotype: chronotype as UserProfile['chronotype'], distractionTriggers, motivationStyle }
    await updateSettings({ ...state.settings, userProfile: updatedProfile })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">‹</button>
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Profile</h1>
        <button onClick={handleSave} className={`ml-auto px-4 py-1.5 rounded-xl text-sm font-bold transition-colors ${saved ? 'bg-green-500 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white'}`}>
          {saved ? '✓ Saved!' : 'Save'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        <Section title="About You">
          <div>
            <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1 block">Your Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Add your name…"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 block">Occupation</label>
            <div className="flex flex-wrap gap-2">
              {OCCUPATIONS.map(o => <Chip key={o.id} label={o.label} icon={o.icon} active={occupation === o.id} onClick={() => setOccupation(occupation === o.id ? '' : o.id)} />)}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1 block">Daily Focus Goal — {dailyGoalHours}h</label>
            <input type="range" min={1} max={12} step={0.5} value={dailyGoalHours} onChange={e => setDailyGoalHours(Number(e.target.value))} className="w-full accent-indigo-500" />
          </div>
        </Section>

        <Section title="Schedule">
          <div>
            <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 block">Wake-up Time</label>
            <div className="flex flex-wrap gap-1.5">
              {WAKE_TIMES.map(t => <Chip key={t} label={t} active={wakeUpTime === t} onClick={() => setWakeUpTime(t)} />)}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 block">Sleep Time</label>
            <div className="flex flex-wrap gap-1.5">
              {SLEEP_TIMES.map(t => <Chip key={t} label={t} active={sleepTime === t} onClick={() => setSleepTime(t)} />)}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 block">Chronotype — When do you focus best?</label>
            <div className="flex flex-wrap gap-1.5">
              {CHRONOTYPES.map(c => <Chip key={c.id} label={c.label} icon={c.icon} active={chronotype === c.id} onClick={() => setChronotype(chronotype === c.id ? undefined : c.id as UserProfile['chronotype'])} />)}
            </div>
          </div>
        </Section>

        <Section title="Focus Goals">
          <div className="flex flex-wrap gap-2">
            {FOCUS_GOALS.map(g => <Chip key={g.id} label={g.label} icon={g.icon} active={focusGoals.includes(g.id)} onClick={() => toggleFocusGoal(g.id)} />)}
          </div>
        </Section>

        <Section title="Distraction Triggers">
          <div className="flex flex-wrap gap-2">
            {DISTRACTION_TRIGGERS.map(t => <Chip key={t} label={t} active={distractionTriggers.includes(t)} onClick={() => toggleTrigger(t)} />)}
          </div>
        </Section>

        <Section title="Motivation Style">
          <div className="flex flex-wrap gap-2">
            {MOTIVATION_STYLES.map(m => <Chip key={m.id} label={m.label} icon={m.icon} active={motivationStyle.includes(m.id)} onClick={() => toggleMotivation(m.id)} />)}
          </div>
        </Section>
      </div>
    </div>
  )
}
