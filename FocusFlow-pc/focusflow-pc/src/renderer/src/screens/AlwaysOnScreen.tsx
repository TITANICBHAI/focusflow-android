import React, { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import type { AppSettings } from '../data/types'

type Page = 'today' | 'week' | 'focus' | 'stats' | 'settings' | 'profile' | 'reports' | 'active' | 'notes' | 'block-defense' | 'keyword-blocker' | 'always-on' | 'changelog' | 'how-to-use' | 'privacy' | 'standalone-block' | 'import-blocklist'

const SUGGESTED_GROUPS = [
  {
    label: 'Social Media',
    icon: '📱',
    color: '#6366f1',
    sites: ['twitter.com', 'x.com', 'instagram.com', 'facebook.com', 'tiktok.com', 'snapchat.com', 'reddit.com', 'tumblr.com', 'linkedin.com'],
  },
  {
    label: 'Short-form Video',
    icon: '📺',
    color: '#ef4444',
    sites: ['youtube.com', 'twitch.tv', 'dailymotion.com', 'vimeo.com'],
  },
  {
    label: 'Streaming',
    icon: '🎬',
    color: '#8b5cf6',
    sites: ['netflix.com', 'disneyplus.com', 'primevideo.amazon.com', 'hulu.com', 'hbomax.com'],
  },
  {
    label: 'News / Outrage',
    icon: '📰',
    color: '#f59e0b',
    sites: ['buzzfeed.com', 'dailymail.co.uk', 'tmz.com', 'huffpost.com', 'vice.com'],
  },
  {
    label: 'Shopping',
    icon: '🛒',
    color: '#10b981',
    sites: ['amazon.com', 'ebay.com', 'etsy.com', 'alibaba.com', 'wish.com'],
  },
  {
    label: 'Gambling / Games',
    icon: '🎲',
    color: '#f43f5e',
    sites: ['bet365.com', 'draftkings.com', 'fanduel.com', 'pokerstars.com'],
  },
]

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

export default function AlwaysOnScreen({ navigate }: { navigate: (p: Page) => void }) {
  const { state, updateSettings } = useApp()
  const { settings } = state

  const alwaysOnDomains: string[] = settings.alwaysOnPackages ?? []
  const [search, setSearch] = useState('')
  const [domainInput, setDomainInput] = useState('')
  const [justAdded, setJustAdded] = useState<string[]>([])

  const update = (partial: Partial<AppSettings>) => updateSettings({ ...settings, ...partial })

  const normaliseDomain = (raw: string) =>
    raw.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase()

  const addDomain = () => {
    const d = normaliseDomain(domainInput)
    if (!d) return
    if (!alwaysOnDomains.includes(d)) {
      update({ alwaysOnPackages: [...alwaysOnDomains, d] })
      setJustAdded(prev => [...prev, d])
      setTimeout(() => setJustAdded(prev => prev.filter(x => x !== d)), 1500)
    }
    setDomainInput('')
  }

  const removeDomain = (d: string) => {
    update({ alwaysOnPackages: alwaysOnDomains.filter(x => x !== d) })
  }

  const addGroup = (sites: string[]) => {
    const existing = new Set(alwaysOnDomains)
    const additions = sites.filter(s => !existing.has(s))
    if (additions.length === 0) return
    update({ alwaysOnPackages: [...alwaysOnDomains, ...additions] })
    setJustAdded(prev => [...prev, ...additions])
    setTimeout(() => setJustAdded(prev => prev.filter(x => !additions.includes(x))), 1500)
  }

  const clearAll = () => {
    if (alwaysOnDomains.length === 0) return
    if (confirm(`Remove all ${alwaysOnDomains.length} domains from the always-on block list?`)) {
      update({ alwaysOnPackages: [] })
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? alwaysOnDomains.filter(d => d.includes(q)) : alwaysOnDomains
  }, [alwaysOnDomains, search])

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('block-defense')}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Back to Block Defense"
        >
          ←
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Always-On Block List</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Domains blocked 24/7 — no timer or focus session needed
          </p>
        </div>

        {/* Enable toggle — prominent in header */}
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Always-On Enforcement</span>
          <Toggle
            value={settings.alwaysOnEnforcementEnabled ?? false}
            onChange={v => update({ alwaysOnEnforcementEnabled: v })}
          />
          <span className={`text-xs font-bold ${settings.alwaysOnEnforcementEnabled ? 'text-green-500' : 'text-gray-400'}`}>
            {settings.alwaysOnEnforcementEnabled ? 'ON' : 'OFF'}
          </span>
        </div>

        {alwaysOnDomains.length > 0 && (
          <button onClick={clearAll} className="text-sm text-red-400 hover:text-red-600 font-semibold transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
            Clear all
          </button>
        )}
      </div>

      {/* Two-column PC layout */}
      <div className="flex-1 overflow-hidden flex gap-0">

        {/* LEFT COLUMN — blocked domain list (40%) */}
        <div className="w-[42%] flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
              {alwaysOnDomains.length > 0
                ? `${alwaysOnDomains.length} domain${alwaysOnDomains.length !== 1 ? 's' : ''} blocked`
                : 'No domains added yet'}
            </span>
            {alwaysOnDomains.length > 0 && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                settings.alwaysOnEnforcementEnabled
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-500'
                  : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400'
              }`}>
                {settings.alwaysOnEnforcementEnabled ? 'ENFORCING' : 'PAUSED'}
              </span>
            )}
          </div>

          {/* Add input */}
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                value={domainInput}
                onChange={e => setDomainInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addDomain()}
                placeholder="reddit.com, twitter.com…"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                onClick={addDomain}
                disabled={!domainInput.trim()}
                className="px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white text-sm font-bold transition-colors flex-shrink-0"
              >
                + Block
              </button>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Press Enter or click + Block. Paste a full URL — the domain is extracted automatically.</p>
          </div>

          {/* Search */}
          {alwaysOnDomains.length > 4 && (
            <div className="px-5 py-2 border-b border-gray-100 dark:border-gray-700">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && setSearch('')}
                placeholder="Filter domains…"
                className="w-full text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>
          )}

          {/* Domain list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && alwaysOnDomains.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center px-6">
                <p className="text-3xl mb-3">🚫</p>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No always-blocked domains yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Type a domain above or use a preset from the right</p>
              </div>
            )}
            {filtered.length === 0 && alwaysOnDomains.length > 0 && (
              <p className="text-xs text-gray-400 text-center py-6">No domains match "{search}"</p>
            )}
            {filtered.map(d => (
              <div
                key={d}
                className={`flex items-center gap-3 px-5 py-2.5 group border-b border-gray-50 dark:border-gray-750 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${justAdded.includes(d) ? 'bg-green-50 dark:bg-green-900/10' : ''}`}
              >
                <span className="text-red-400 text-sm flex-shrink-0">🚫</span>
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-200 font-medium truncate">{d}</span>
                {justAdded.includes(d) && (
                  <span className="text-[10px] text-green-500 font-bold flex-shrink-0">✓ Added</span>
                )}
                <button
                  onClick={() => removeDomain(d)}
                  className="text-gray-200 dark:text-gray-700 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-sm flex-shrink-0"
                  title={`Unblock ${d}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Explanation footer */}
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              <div className="flex-1 p-2.5 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="font-bold text-red-600 dark:text-red-400 mb-0.5">♾️ Always-On (here)</p>
                <p>Blocked 24/7. No session needed. Stays blocked until removed.</p>
              </div>
              <div className="flex-1 p-2.5 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                <p className="font-bold text-indigo-600 dark:text-indigo-400 mb-0.5">🛡 Focus Block</p>
                <p>Only active during a focus session or timed block.</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — presets (60%) */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-0.5">Quick Presets</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Add a whole category of distracting sites in one click.</p>
            <div className="grid grid-cols-2 gap-3">
              {SUGGESTED_GROUPS.map(group => {
                const existing = new Set(alwaysOnDomains)
                const newCount = group.sites.filter(s => !existing.has(s)).length
                const allAdded = newCount === 0
                return (
                  <button
                    key={group.label}
                    onClick={() => addGroup(group.sites)}
                    disabled={allAdded}
                    className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
                      allAdded
                        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 cursor-default'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-red-200 dark:hover:border-red-700 hover:shadow-md hover:-translate-y-0.5'
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ backgroundColor: group.color + '18' }}
                    >
                      {group.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{group.label}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                        {group.sites.slice(0, 3).join(', ')}{group.sites.length > 3 ? ` +${group.sites.length - 3}` : ''}
                      </p>
                      <p className={`text-[11px] font-bold mt-1.5 ${allAdded ? 'text-green-500' : 'text-red-500'}`}>
                        {allAdded ? '✓ All added' : `+ ${newCount} domain${newCount !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Bulk-paste section */}
          <BulkPastePanel alwaysOnDomains={alwaysOnDomains} update={update} />

          {/* Info panel */}
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex gap-3">
            <span className="text-xl flex-shrink-0 mt-0.5">💡</span>
            <div>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-1">How PC website blocking works</p>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                FocusFlow-PC enforces domain blocks by adding entries to your system's <strong>hosts file</strong> or via a companion browser extension. Domains in this list are blocked continuously regardless of whether the app is in focus mode. You must grant file-write permissions on first use.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BulkPastePanel({
  alwaysOnDomains,
  update,
}: {
  alwaysOnDomains: string[]
  update: (p: Partial<AppSettings>) => void
}) {
  const [raw, setRaw] = useState('')
  const [preview, setPreview] = useState<string[]>([])
  const [expanded, setExpanded] = useState(false)

  const parseDomains = (text: string) =>
    text
      .split(/[\n,\s;]+/)
      .map(s => s.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase())
      .filter(s => s.length > 0 && s.includes('.'))

  const handlePreview = () => {
    const parsed = parseDomains(raw)
    const existing = new Set(alwaysOnDomains)
    setPreview(parsed.filter(d => !existing.has(d)))
  }

  const handleAdd = () => {
    if (preview.length === 0) return
    update({ alwaysOnPackages: [...alwaysOnDomains, ...preview] })
    setPreview([])
    setRaw('')
    setExpanded(false)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <span className="text-lg">📋</span>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Bulk Paste</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Paste a list of domains or URLs to block them all at once</p>
        </div>
        <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-4 space-y-3">
          <textarea
            value={raw}
            onChange={e => { setRaw(e.target.value); setPreview([]) }}
            placeholder={`One domain per line, or comma/space separated:\n\ntwitter.com\nhttps://www.reddit.com/r/something\nfacebook.com, instagram.com`}
            rows={5}
            className="w-full text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
          />
          <div className="flex gap-2">
            <button
              onClick={handlePreview}
              disabled={!raw.trim()}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              Preview
            </button>
            {preview.length > 0 && (
              <button
                onClick={handleAdd}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors"
              >
                Block {preview.length} domain{preview.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>
          {preview.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">New domains to add ({preview.length}):</p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {preview.map(d => (
                  <span key={d} className="px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-600 dark:text-red-400">{d}</span>
                ))}
              </div>
            </div>
          )}
          {raw.trim() && preview.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">Click Preview to parse — duplicates are automatically skipped.</p>
          )}
        </div>
      )}
    </div>
  )
}
