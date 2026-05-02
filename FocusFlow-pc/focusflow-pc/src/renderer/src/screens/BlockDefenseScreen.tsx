import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import type { AppSettings, BlockedWebsite, RecurringBlockSchedule } from '../data/types'

type Page = 'today' | 'week' | 'focus' | 'stats' | 'settings' | 'profile' | 'reports' | 'active' | 'notes' | 'block-defense' | 'keyword-blocker' | 'always-on' | 'changelog' | 'how-to-use' | 'privacy' | 'standalone-block' | 'import-blocklist' | 'overlay-appearance' | 'allowed-in-focus'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`relative w-10 h-5 rounded-full transition-colors ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      } ${value ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

function Section({ icon, title, description, children }: {
  icon: string; title: string; description: string; children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-sm">{icon}</div>
        <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{title}</span>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 pl-9">{description}</p>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
        {children}
      </div>
    </div>
  )
}

function SwitchRow({ label, desc, value, onChange, disabled }: {
  label: string; desc: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{label}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{desc}</p>
      </div>
      <Toggle value={value} onChange={onChange} disabled={disabled} />
    </div>
  )
}

function WebsiteRow({ site, onRemove, onToggle }: {
  site: BlockedWebsite; onRemove: () => void; onToggle: () => void
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="text-red-500 text-sm">🚫</span>
      <span className="flex-1 text-sm text-gray-700 dark:text-gray-200 font-medium">{site.domain}</span>
      <button
        onClick={onToggle}
        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
          site.enabled
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-600 dark:text-green-400'
            : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-400'
        }`}
      >
        {site.enabled ? 'ON' : 'OFF'}
      </button>
      <button onClick={onRemove} className="text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors text-sm ml-1">✕</button>
    </div>
  )
}

function ScheduleModal({ schedule, onSave, onClose }: {
  schedule: RecurringBlockSchedule | null
  onSave: (s: RecurringBlockSchedule) => void
  onClose: () => void
}) {
  const [name, setName] = useState(schedule?.name ?? '')
  const [domains, setDomains] = useState<string[]>(schedule?.packages ?? [])
  const [domainInput, setDomainInput] = useState('')
  const [days, setDays] = useState<number[]>(schedule?.days ?? [1, 2, 3, 4, 5])
  const [startHour, setStartHour] = useState(schedule?.startHour ?? 9)
  const [startMin, setStartMin] = useState(schedule?.startMin ?? 0)
  const [endHour, setEndHour] = useState(schedule?.endHour ?? 17)
  const [endMin, setEndMin] = useState(schedule?.endMin ?? 0)

  const addDomain = () => {
    const d = domainInput.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    if (d && !domains.includes(d)) { setDomains(prev => [...prev, d]); setDomainInput('') }
  }

  const toggleDay = (d: number) => setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])

  const fmt = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

  const save = () => {
    if (!name.trim()) { alert('Enter a schedule name'); return }
    if (days.length === 0) { alert('Select at least one day'); return }
    onSave({
      id: schedule?.id ?? `sched-${Date.now()}`,
      name: name.trim(),
      packages: domains,
      days,
      startHour, startMin, endHour, endMin,
      enabled: schedule?.enabled ?? true,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{schedule ? 'Edit Schedule' : 'New Block Schedule'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Schedule Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Deep Work Hours"
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Active Days</label>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {DAYS.map((d, i) => (
                <button key={d} onClick={() => toggleDay(i)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                    days.includes(i)
                      ? 'bg-indigo-500 text-white border-indigo-500'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Start Time</label>
              <input type="time" value={fmt(startHour, startMin)}
                onChange={e => { const [h, m] = e.target.value.split(':').map(Number); setStartHour(h); setStartMin(m) }}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">End Time</label>
              <input type="time" value={fmt(endHour, endMin)}
                onChange={e => { const [h, m] = e.target.value.split(':').map(Number); setEndHour(h); setEndMin(m) }}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Blocked Websites / Apps (optional)</label>
            <div className="flex gap-2 mt-1">
              <input value={domainInput} onChange={e => setDomainInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addDomain()}
                placeholder="twitter.com"
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <button onClick={addDomain} className="px-3 py-2 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600 transition-colors">Add</button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {domains.map(d => (
                <span key={d} className="flex items-center gap-1 px-2 py-0.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-xs text-red-600 dark:text-red-400 font-semibold">
                  {d} <button onClick={() => setDomains(prev => prev.filter(x => x !== d))} className="hover:text-red-700">✕</button>
                </span>
              ))}
              {domains.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">No specific sites — this schedule will apply globally as a focus reminder</p>}
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-gray-200 dark:border-gray-700">
          <button onClick={save} className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-bold text-sm hover:bg-indigo-600 transition-colors">
            {schedule ? 'Save Changes' : 'Create Schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BlockDefenseScreen({ navigate }: { navigate: (p: Page) => void }) {
  const { state, updateSettings } = useApp()
  const { settings } = state

  const [siteInput, setSiteInput] = useState('')
  const [scheduleModal, setScheduleModal] = useState<{ open: boolean; schedule: RecurringBlockSchedule | null }>({ open: false, schedule: null })

  const focusActive = !!state.focusSession?.isActive
  const websiteCount = settings.blockedWebsites?.length ?? 0
  const keywordCount = settings.blockedWords?.length ?? 0
  const scheduleCount = settings.recurringBlockSchedules?.length ?? 0
  const activeScheduleCount = (settings.recurringBlockSchedules ?? []).filter(s => s.enabled).length
  const alwaysOnCount = settings.alwaysOnPackages?.length ?? 0

  const update = (partial: Partial<AppSettings>) => updateSettings({ ...settings, ...partial })

  const addSite = () => {
    const domain = siteInput.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    if (!domain) return
    const existing = settings.blockedWebsites ?? []
    if (existing.some(s => s.domain === domain)) { setSiteInput(''); return }
    update({ blockedWebsites: [...existing, { id: `site-${Date.now()}`, domain, enabled: true }] })
    setSiteInput('')
  }

  const removeSite = (id: string) => {
    update({ blockedWebsites: (settings.blockedWebsites ?? []).filter(s => s.id !== id) })
  }

  const toggleSite = (id: string) => {
    update({ blockedWebsites: (settings.blockedWebsites ?? []).map(s => s.id === id ? { ...s, enabled: !s.enabled } : s) })
  }

  const saveSchedule = (sched: RecurringBlockSchedule) => {
    const existing = settings.recurringBlockSchedules ?? []
    const idx = existing.findIndex(s => s.id === sched.id)
    if (idx >= 0) {
      update({ recurringBlockSchedules: existing.map(s => s.id === sched.id ? sched : s) })
    } else {
      update({ recurringBlockSchedules: [...existing, sched] })
    }
  }

  const deleteSchedule = (id: string) => {
    if (!confirm('Delete this block schedule?')) return
    update({ recurringBlockSchedules: (settings.recurringBlockSchedules ?? []).filter(s => s.id !== id) })
  }

  const toggleSchedule = (id: string) => {
    update({ recurringBlockSchedules: (settings.recurringBlockSchedules ?? []).map(s => s.id === id ? { ...s, enabled: !s.enabled } : s) })
  }

  const fmtTime = (h: number, m: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 === 0 ? 12 : h % 12
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
  }

  const fmtDays = (days: number[]) => {
    if (days.length === 7) return 'Every day'
    if (JSON.stringify(days.sort()) === JSON.stringify([1, 2, 3, 4, 5])) return 'Weekdays'
    if (JSON.stringify(days.sort()) === JSON.stringify([0, 6])) return 'Weekends'
    return days.map(d => DAYS[d]).join(', ')
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('settings')}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          ←
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Block Enforcement</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">The layers that make your blocks impossible to bypass</p>
        </div>
      </div>

      {/* Intro banner */}
      <div className="mx-6 mt-4 p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 flex items-start gap-3">
        <span className="text-lg mt-0.5">🛡</span>
        <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
          These tools enforce your focus commitments. Website blocking and schedules run continuously while active — they don't need a Focus session to be on.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

        {/* ── Focus Session Behaviour ─────────────────────────── */}
        <Section icon="⏳" title="Focus Session Behaviour" description="Controls what happens to a running focus session when you finish a task early.">
          <SwitchRow
            label="Keep focus active for the full duration"
            desc={settings.keepFocusActiveUntilTaskEnd ? 'On — completing a task early keeps enforcement running until the original end time' : 'Off — completing a task immediately ends the focus session (default)'}
            value={settings.keepFocusActiveUntilTaskEnd ?? false}
            onChange={v => update({ keepFocusActiveUntilTaskEnd: v })}
          />
        </Section>

        {/* ── Website Blocking ────────────────────────────────── */}
        <Section
          icon="🌐"
          title="Website Blocking"
          description={`Track and block distracting websites. ${websiteCount > 0 ? `${websiteCount} site${websiteCount !== 1 ? 's' : ''} on the list.` : 'No sites added yet.'}`}
        >
          <SwitchRow
            label="Enable website blocking"
            desc={settings.blockedWebsitesEnabled ? `On — ${websiteCount} site${websiteCount !== 1 ? 's' : ''} being tracked` : 'Off — list is saved but not enforced'}
            value={settings.blockedWebsitesEnabled ?? false}
            onChange={v => update({ blockedWebsitesEnabled: v })}
          />
          <div className="px-4 py-3">
            <div className="flex gap-2 mb-3">
              <input
                value={siteInput}
                onChange={e => setSiteInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSite()}
                placeholder="twitter.com, reddit.com…"
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button onClick={addSite} className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600 transition-colors">Add</button>
            </div>
            {websiteCount > 0 ? (
              <div className="space-y-0 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
                {(settings.blockedWebsites ?? []).map(site => (
                  <WebsiteRow key={site.id} site={site} onRemove={() => removeSite(site.id)} onToggle={() => toggleSite(site.id)} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">No websites added yet</p>
            )}
          </div>
        </Section>

        {/* ── Keyword Blocker ─────────────────────────────────── */}
        <Section
          icon="🔤"
          title="Keyword Blocker"
          description="Flag and track content with specific keywords — helps identify distraction patterns in your reports."
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Manage Keywords</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {keywordCount > 0 ? `${keywordCount} keyword${keywordCount !== 1 ? 's' : ''} on the block list` : 'No keywords added — add presets or custom words'}
              </p>
            </div>
            <button
              onClick={() => navigate('keyword-blocker')}
              className="px-3 py-1.5 rounded-xl bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-600 transition-colors"
            >
              Manage →
            </button>
          </div>
          {keywordCount > 0 && (
            <div className="px-4 pb-3">
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {(settings.blockedWords ?? []).slice(0, 20).map(w => (
                  <span key={w} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    {w}
                  </span>
                ))}
                {keywordCount > 20 && <span className="text-xs text-gray-400 dark:text-gray-500">+{keywordCount - 20} more</span>}
              </div>
            </div>
          )}
        </Section>

        {/* ── Always-On Block List ─────────────────────────────── */}
        <Section
          icon="♾️"
          title="Always-On Block List"
          description="Domains blocked 24/7 — no focus session or timer needed. Stays active until you remove them."
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Manage Always-On Domains</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {alwaysOnCount > 0
                  ? `${alwaysOnCount} domain${alwaysOnCount !== 1 ? 's' : ''} blocked permanently`
                  : 'No domains added — add sites to block them 24/7'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('import-blocklist')}
                className="px-3 py-1.5 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-200 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-700 transition-colors"
              >
                📥 Import
              </button>
              <button
                onClick={() => navigate('always-on')}
                className="px-3 py-1.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors"
              >
                Manage →
              </button>
            </div>
          </div>
          {alwaysOnCount > 0 && (
            <div className="px-4 pb-3">
              <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                {(settings.alwaysOnPackages ?? []).slice(0, 12).map(d => (
                  <span key={d} className="px-2 py-0.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400">
                    {d}
                  </span>
                ))}
                {alwaysOnCount > 12 && <span className="text-xs text-gray-400 dark:text-gray-500">+{alwaysOnCount - 12} more</span>}
              </div>
            </div>
          )}
        </Section>

        {/* ── Block Schedules ─────────────────────────────────── */}
        <Section
          icon="⏰"
          title="Block Schedules"
          description={`Set recurring time windows when specific websites are blocked automatically — no focus session needed. ${scheduleCount > 0 ? `${activeScheduleCount}/${scheduleCount} schedule${scheduleCount !== 1 ? 's' : ''} active.` : ''}`}
        >
          <div className="px-4 py-3 space-y-2">
            {(settings.recurringBlockSchedules ?? []).length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">No schedules yet — create one to block sites automatically on a recurring basis</p>
            ) : (
              (settings.recurringBlockSchedules ?? []).map(sched => (
                <div key={sched.id} className={`rounded-xl border p-3 ${sched.enabled ? 'border-indigo-200 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/10' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{sched.name}</span>
                    <div className="flex items-center gap-2">
                      <Toggle value={sched.enabled} onChange={() => toggleSchedule(sched.id)} />
                      <button onClick={() => setScheduleModal({ open: true, schedule: sched })} className="text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold">Edit</button>
                      <button onClick={() => deleteSchedule(sched.id)} className="text-xs text-red-400 hover:text-red-600 font-semibold">Del</button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {fmtDays(sched.days)} · {fmtTime(sched.startHour, sched.startMin)} – {fmtTime(sched.endHour, sched.endMin)}
                    {sched.packages.length > 0 && ` · ${sched.packages.slice(0, 3).join(', ')}${sched.packages.length > 3 ? ` +${sched.packages.length - 3}` : ''}`}
                  </p>
                </div>
              ))
            )}
            <button
              onClick={() => setScheduleModal({ open: true, schedule: null })}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 text-indigo-500 dark:text-indigo-400 text-sm font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            >
              + Add Schedule
            </button>
          </div>
        </Section>

        {/* ── Aversion Deterrents (PC) ─────────────────────────── */}
        <Section
          icon="🔔"
          title="Aversion Deterrents"
          description="Pair a negative stimulus with distraction to build a stronger focus reflex."
        >
          <SwitchRow
            label="Sound Alert"
            desc={settings.aversionSoundEnabled ? 'On — a startling sound plays when you open a blocked site' : 'Off — no sound when blocked sites are visited'}
            value={settings.aversionSoundEnabled ?? false}
            onChange={v => update({ aversionSoundEnabled: v })}
            disabled={focusActive && (settings.aversionSoundEnabled ?? false)}
          />
        </Section>

        {/* ── Overlay Appearance ───────────────────────────────── */}
        <Section
          icon="🎨"
          title="Overlay Appearance"
          description={`Customize the block screen — color theme, custom quotes, and display options. Theme: ${(settings.overlayTheme ?? 'dark').charAt(0).toUpperCase() + (settings.overlayTheme ?? 'dark').slice(1)}.`}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Customize Overlay</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {(settings.overlayQuotes ?? []).length > 0
                  ? `${(settings.overlayQuotes ?? []).length} custom quote${(settings.overlayQuotes ?? []).length !== 1 ? 's' : ''} · ${(settings.overlayTheme ?? 'dark')} theme`
                  : 'Built-in quotes · ' + (settings.overlayTheme ?? 'dark') + ' theme'}
              </p>
            </div>
            <button
              onClick={() => navigate('overlay-appearance')}
              className="px-3 py-1.5 rounded-xl bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-600 transition-colors"
            >
              Customize →
            </button>
          </div>
        </Section>

        {/* ── Allowed in Focus ─────────────────────────────────── */}
        <Section
          icon="🔓"
          title="Allowed in Focus"
          description="Domains that bypass the block rules while a focus session is active — for work tools you genuinely need."
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Manage Allowlist</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {(settings.allowedInFocus ?? []).length > 0
                  ? `${(settings.allowedInFocus ?? []).length} domain${(settings.allowedInFocus ?? []).length !== 1 ? 's' : ''} exempted during focus sessions`
                  : 'No exceptions — all blocked sites stay blocked during focus'}
              </p>
            </div>
            <button
              onClick={() => navigate('allowed-in-focus')}
              className="px-3 py-1.5 rounded-xl bg-green-500 text-white text-xs font-bold hover:bg-green-600 transition-colors"
            >
              Manage →
            </button>
          </div>
          {(settings.allowedInFocus ?? []).length > 0 && (
            <div className="px-4 pb-3">
              <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                {(settings.allowedInFocus ?? []).slice(0, 10).map(d => (
                  <span key={d} className="px-2 py-0.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-xs font-semibold text-green-600 dark:text-green-400">
                    {d}
                  </span>
                ))}
                {(settings.allowedInFocus ?? []).length > 10 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">+{(settings.allowedInFocus ?? []).length - 10} more</span>
                )}
              </div>
            </div>
          )}
        </Section>

      </div>

      {scheduleModal.open && (
        <ScheduleModal
          schedule={scheduleModal.schedule}
          onSave={saveSchedule}
          onClose={() => setScheduleModal({ open: false, schedule: null })}
        />
      )}
    </div>
  )
}
