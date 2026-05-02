import React, { useState, useCallback, useMemo } from 'react'
import { useApp } from '../context/AppContext'

type Page = 'today' | 'week' | 'focus' | 'stats' | 'settings' | 'profile' | 'reports' | 'active' | 'notes' | 'block-defense' | 'keyword-blocker' | 'always-on' | 'changelog' | 'how-to-use' | 'privacy' | 'standalone-block' | 'import-blocklist' | 'daily-allowance' | 'weekly-report' | 'overlay-appearance' | 'allowed-in-focus'

const PRESET_GROUPS: { label: string; icon: string; domains: string[] }[] = [
  {
    label: 'Work Essentials',
    icon: '💼',
    domains: ['github.com', 'gitlab.com', 'jira.atlassian.com', 'notion.so', 'linear.app', 'figma.com', 'trello.com'],
  },
  {
    label: 'Productivity Docs',
    icon: '📄',
    domains: ['docs.google.com', 'sheets.google.com', 'drive.google.com', 'dropbox.com', 'confluence.atlassian.com'],
  },
  {
    label: 'Communication',
    icon: '💬',
    domains: ['mail.google.com', 'outlook.live.com', 'slack.com', 'teams.microsoft.com', 'zoom.us'],
  },
  {
    label: 'Learning',
    icon: '📚',
    domains: ['stackoverflow.com', 'developer.mozilla.org', 'docs.python.org', 'npmjs.com', 'medium.com'],
  },
]

function parseDomain(raw: string): string {
  try {
    const input = raw.trim()
    if (input.includes('://')) {
      return new URL(input).hostname.replace(/^www\./, '')
    }
    return input.replace(/^www\./, '').replace(/\/.*$/, '').toLowerCase()
  } catch {
    return raw.trim().replace(/^www\./, '').toLowerCase()
  }
}

function DomainPill({ domain, onRemove }: { domain: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl px-3 py-1.5 group">
      <span className="text-green-500 text-xs">✓</span>
      <span className="text-sm font-semibold text-green-700 dark:text-green-300">{domain}</span>
      <button onClick={onRemove}
        className="text-green-300 dark:text-green-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 ml-0.5 text-xs leading-none">
        ✕
      </button>
    </div>
  )
}

export default function AllowedInFocusScreen({ navigate }: { navigate: (p: Page) => void }) {
  const { state, updateSettings } = useApp()
  const { settings } = state
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')

  const allowed = useMemo(() => settings.allowedInFocus ?? [], [settings.allowedInFocus])

  const update = useCallback((list: string[]) => {
    updateSettings({ ...settings, allowedInFocus: list })
  }, [settings, updateSettings])

  const addDomain = () => {
    const d = parseDomain(input)
    if (!d || !d.includes('.')) return
    if (!allowed.includes(d)) update([...allowed, d])
    setInput('')
  }

  const remove = (d: string) => update(allowed.filter(x => x !== d))

  const addPreset = (domains: string[]) => {
    const toAdd = domains.filter(d => !allowed.includes(d))
    if (toAdd.length > 0) update([...allowed, ...toAdd])
  }

  const removeAll = () => {
    if (!confirm('Remove all allowed domains?')) return
    update([])
  }

  const filtered = search.trim()
    ? allowed.filter(d => d.includes(search.toLowerCase()))
    : allowed

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">

      {/* Left — manage list */}
      <div className="flex flex-col w-1/2 border-r border-gray-200 dark:border-gray-700">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-3 mb-0.5">
            <button onClick={() => navigate('block-defense')}
              className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              ← Block Defense
            </button>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Allowed in Focus</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Domains exempt from blocking while a focus session is active.</p>
        </div>

        {/* Add input */}
        <div className="px-5 pt-4 pb-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addDomain()}
              placeholder="github.com, docs.google.com…"
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400" />
            <button onClick={addDomain}
              className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-bold transition-colors">
              Allow
            </button>
          </div>
        </div>

        {/* Search + list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {allowed.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <p className="text-4xl mb-3">🔓</p>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No allowed domains yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Add sites that should stay accessible during focus</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="flex-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-300" />
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{allowed.length} domain{allowed.length !== 1 ? 's' : ''}</span>
                <button onClick={removeAll} className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">Clear all</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {filtered.map(d => (
                  <DomainPill key={d} domain={d} onRemove={() => remove(d)} />
                ))}
                {filtered.length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">No matches for "{search}"</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right — presets + explanation */}
      <div className="w-1/2 overflow-y-auto p-5 space-y-4">

        {/* Quick presets */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Quick Presets</p>
          <div className="space-y-2">
            {PRESET_GROUPS.map(group => {
              const alreadyAdded = group.domains.filter(d => allowed.includes(d)).length
              const allAdded = alreadyAdded === group.domains.length
              return (
                <div key={group.label}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{group.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{group.label}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{group.domains.length} sites</p>
                      </div>
                    </div>
                    <button onClick={() => addPreset(group.domains)} disabled={allAdded}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border-2 transition-all ${
                        allAdded
                          ? 'border-green-200 dark:border-green-800 text-green-500 dark:text-green-400 bg-green-50 dark:bg-green-900/20 cursor-default'
                          : 'border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                      }`}>
                      {allAdded ? '✓ Added' : `+ Add ${group.domains.length - alreadyAdded}`}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.domains.map(d => (
                      <span key={d}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          allowed.includes(d)
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}>
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">How Allowed Domains Work</p>
          <div className="space-y-3">
            {[
              { icon: '🛡', title: 'Exception to the block rule', desc: 'If a domain is on your blocked list AND on this allowed list, the allowed list wins during an active focus session.' },
              { icon: '🎯', title: 'Focus sessions only', desc: 'Allowed domains are only exempted while a focus timer is running. Always-On and schedule blocks still apply outside sessions.' },
              { icon: '✏️', title: 'Use for work tools', desc: 'Add GitHub, Figma, Jira, or any tool you genuinely need access to while focused, so blocking doesn\'t interrupt real work.' },
              { icon: '⚠️', title: 'Use with discipline', desc: 'Keep this list short. Every domain you add is a potential distraction vector — only add what you truly need.' },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-sm flex-shrink-0">{item.icon}</div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{item.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats summary */}
        {allowed.length > 0 && (
          <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔓</span>
              <div>
                <p className="text-sm font-bold text-green-700 dark:text-green-300">{allowed.length} domain{allowed.length !== 1 ? 's' : ''} allowed during focus</p>
                <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">These stay accessible even while blocking is active</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
