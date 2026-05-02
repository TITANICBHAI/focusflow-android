import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import type { UserProfile } from '../data/types'

const FOCUS_GOALS = [
  { id: 'deep_work', label: 'Deep Work', icon: '⚡' },
  { id: 'study', label: 'Study', icon: '📖' },
  { id: 'no_social', label: 'No Social Media', icon: '📵' },
  { id: 'coding', label: 'Coding', icon: '👨‍💻' },
  { id: 'writing', label: 'Writing', icon: '✍️' },
  { id: 'creative', label: 'Creative', icon: '🎨' },
]

const OCCUPATIONS = [
  { id: 'student', label: 'Student', icon: '🎓' },
  { id: 'professional', label: 'Professional', icon: '💼' },
  { id: 'freelancer', label: 'Freelancer', icon: '💻' },
  { id: 'creator', label: 'Creator', icon: '🎨' },
  { id: 'other', label: 'Other', icon: '🙋' },
]

const STEPS = [
  { title: 'Welcome to FocusFlow', subtitle: "Your productivity companion for PC. Let's set you up in 60 seconds." },
  { title: 'Who are you?', subtitle: 'This helps us tailor your experience.' },
  { title: 'What do you want to focus on?', subtitle: 'Pick your main goals. You can change these later.' },
  { title: 'Set your daily goal', subtitle: 'How many hours of focused work per day?' },
  { title: "You're all set!", subtitle: 'FocusFlow is ready. Start by adding your first task.' },
]

function Chip({ label, icon, active, onClick }: { label: string; icon?: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${active ? 'bg-indigo-500 border-indigo-500 text-white scale-105 shadow-md shadow-indigo-200' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 hover:border-indigo-300 dark:hover:border-indigo-600'}`}>
      {icon && <span className="text-lg">{icon}</span>}{label}
    </button>
  )
}

export default function OnboardingScreen() {
  const { state, updateSettings } = useApp()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [occupation, setOccupation] = useState('')
  const [focusGoals, setFocusGoals] = useState<string[]>([])
  const [dailyGoalHours, setDailyGoalHours] = useState(4)

  const toggleGoal = (id: string) => setFocusGoals(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleFinish = async () => {
    const profile: UserProfile = { name: name.trim() || undefined, occupation: occupation || undefined, focusGoals, dailyGoalHours }
    await updateSettings({ ...state.settings, onboardingComplete: true, userProfile: profile })
  }

  const isNextDisabled = (step === 1 && !name.trim()) || (step === 2 && focusGoals.length === 0)

  const bgGradients = ['from-indigo-600 to-purple-600', 'from-purple-500 to-pink-500', 'from-blue-500 to-indigo-600', 'from-indigo-500 to-teal-500', 'from-green-500 to-emerald-600']

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Hero */}
      <div className={`bg-gradient-to-br ${bgGradients[step]} px-8 py-10 text-white`}>
        {/* Step indicator */}
        <div className="flex gap-1.5 mb-8">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-white' : 'bg-white/30'}`} />
          ))}
        </div>
        <div className="text-4xl mb-3">{['🚀','👤','🎯','⏱','🎉'][step]}</div>
        <h1 className="text-2xl font-black mb-2">{STEPS[step].title}</h1>
        <p className="text-white/80 text-sm">{STEPS[step].subtitle}</p>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 py-6 overflow-y-auto animate-fade-in">
        {step === 0 && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">What FocusFlow does:</p>
              {[
                ['📅', 'Schedule your day with smart task blocks'],
                ['🛡', 'Focus mode to protect your work time'],
                ['📊', 'Track your streaks & productivity'],
                ['🔥', 'Build deep-work habits that stick'],
              ].map(([icon, text]) => (
                <div key={text} className="flex items-center gap-3 py-2">
                  <span className="text-xl">{icon}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-200">{text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 block">Your name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name…"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" autoFocus />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 block">I'm a…</label>
              <div className="grid grid-cols-2 gap-2">
                {OCCUPATIONS.map(o => <Chip key={o.id} label={o.label} icon={o.icon} active={occupation === o.id} onClick={() => setOccupation(occupation === o.id ? '' : o.id)} />)}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="grid grid-cols-2 gap-2">
              {FOCUS_GOALS.map(g => <Chip key={g.id} label={g.label} icon={g.icon} active={focusGoals.includes(g.id)} onClick={() => toggleGoal(g.id)} />)}
            </div>
            {focusGoals.length === 0 && <p className="text-xs text-orange-500 mt-3 text-center">Pick at least one goal to continue</p>}
          </div>
        )}

        {step === 3 && (
          <div className="text-center">
            <div className="text-6xl font-black text-indigo-500 mb-2">{dailyGoalHours}h</div>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">per day of deep focus</p>
            <input type="range" min={1} max={12} step={0.5} value={dailyGoalHours} onChange={e => setDailyGoalHours(Number(e.target.value))} className="w-full max-w-sm accent-indigo-500" />
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 max-w-sm mx-auto mt-1">
              <span>1h</span><span>6h</span><span>12h</span>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="text-center space-y-4">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-6">
              <p className="text-xl font-bold text-gray-800 dark:text-gray-100">Welcome, {name || 'Achiever'}! 👋</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Your goal: <span className="font-bold text-indigo-500">{dailyGoalHours}h</span> of focused work per day</p>
              {focusGoals.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                  {focusGoals.map(g => {
                    const goal = FOCUS_GOALS.find(f => f.id === g)
                    return goal ? <span key={g} className="px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">{goal.icon} {goal.label}</span> : null
                  })}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500">Add your first task to the "Today" tab to begin!</p>
          </div>
        )}
      </div>

      {/* Nav buttons */}
      <div className="px-8 pb-8 flex gap-3">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} className="flex-none px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">← Back</button>
        )}
        {step < STEPS.length - 1 ? (
          <button disabled={isNextDisabled} onClick={() => setStep(s => s + 1)}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${isNextDisabled ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30'}`}>
            Continue →
          </button>
        ) : (
          <button onClick={handleFinish} className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-bold transition-colors shadow-lg shadow-green-200 dark:shadow-green-900/30">
            🚀 Let's Go!
          </button>
        )}
      </div>
    </div>
  )
}
