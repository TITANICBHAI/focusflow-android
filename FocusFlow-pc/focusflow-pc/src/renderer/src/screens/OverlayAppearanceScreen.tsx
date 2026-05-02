import React, { useState, useCallback } from 'react'
import { useApp } from '../context/AppContext'

type OverlayTheme = 'dark' | 'midnight' | 'forest' | 'ocean' | 'sunset'
type Page = 'today' | 'week' | 'focus' | 'stats' | 'settings' | 'profile' | 'reports' | 'active' | 'notes' | 'block-defense' | 'keyword-blocker' | 'always-on' | 'changelog' | 'how-to-use' | 'privacy' | 'standalone-block' | 'import-blocklist' | 'daily-allowance' | 'weekly-report' | 'overlay-appearance' | 'allowed-in-focus'

const BUILT_IN_QUOTES = [
  "Stay the course — your future self is watching.",
  "Distraction is the enemy of greatness.",
  "One hour of deep focus beats three of scattered effort.",
  "This site can wait. Your goals cannot.",
  "Focus is the gateway to all achievement.",
  "The work you avoid is usually the work that matters most.",
  "Close the tab. Open your potential.",
  "Every block is a step toward discipline.",
  "Do the hard thing first. Everything else is easy after.",
  "You chose this. Stay chosen.",
]

const THEMES: { id: OverlayTheme; label: string; gradient: string; preview: string }[] = [
  { id: 'dark',     label: 'Obsidian',  gradient: 'from-gray-900 to-gray-800',       preview: '#1f2937' },
  { id: 'midnight', label: 'Midnight',  gradient: 'from-indigo-950 to-gray-900',     preview: '#1e1b4b' },
  { id: 'forest',   label: 'Forest',    gradient: 'from-emerald-950 to-gray-900',    preview: '#022c22' },
  { id: 'ocean',    label: 'Ocean',     gradient: 'from-blue-950 to-gray-900',       preview: '#172554' },
  { id: 'sunset',   label: 'Dusk',      gradient: 'from-rose-950 to-orange-950',     preview: '#4c0519' },
]

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${value ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

function PreviewPanel({ theme, quotes, showSite }: { theme: OverlayTheme; quotes: string[]; showSite: boolean }) {
  const t = THEMES.find(x => x.id === theme) ?? THEMES[0]
  const allQuotes = quotes.length > 0 ? quotes : BUILT_IN_QUOTES
  const quote = allQuotes[Math.floor(allQuotes.length / 2)]
  const gradMap: Record<OverlayTheme, string> = {
    dark:     'linear-gradient(135deg, #111827, #1f2937)',
    midnight: 'linear-gradient(135deg, #0f0a2e, #1e1b4b)',
    forest:   'linear-gradient(135deg, #011a10, #022c22)',
    ocean:    'linear-gradient(135deg, #0a1628, #172554)',
    sunset:   'linear-gradient(135deg, #3b0a1e, #4c0519)',
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg" style={{ background: gradMap[theme] }}>
      <div className="p-6 flex flex-col items-center text-center min-h-48 justify-center gap-4">
        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-2xl">🚫</div>
        <div>
          <p className="text-white font-black text-lg">Site Blocked</p>
          {showSite && <p className="text-white/60 text-xs mt-1">youtube.com</p>}
        </div>
        <p className="text-white/80 text-sm italic max-w-xs leading-relaxed">"{quote}"</p>
        <div className="w-24 h-1.5 rounded-full bg-white/20 mt-2">
          <div className="h-full w-1/2 rounded-full bg-indigo-400" />
        </div>
        <p className="text-white/50 text-xs">Focus session active — 25:00 remaining</p>
      </div>
    </div>
  )
}

export default function OverlayAppearanceScreen({ navigate }: { navigate: (p: Page) => void }) {
  const { state, updateSettings } = useApp()
  const { settings } = state
  const [draftQuote, setDraftQuote] = useState('')

  const update = useCallback((partial: Partial<typeof settings>) => {
    updateSettings({ ...settings, ...partial })
  }, [settings, updateSettings])

  const quotes = settings.overlayQuotes ?? []
  const theme = (settings.overlayTheme ?? 'dark') as OverlayTheme
  const showSite = settings.showBlockedSitesList !== false

  const addQuote = () => {
    const trimmed = draftQuote.trim()
    if (!trimmed || quotes.includes(trimmed)) return
    update({ overlayQuotes: [...quotes, trimmed] })
    setDraftQuote('')
  }

  const removeQuote = (i: number) => {
    update({ overlayQuotes: quotes.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Left — settings */}
      <div className="flex flex-col w-1/2 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-3 mb-0.5">
            <button onClick={() => navigate('block-defense')}
              className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              ← Block Defense
            </button>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Overlay Appearance</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Customize what the block screen looks like.</p>
        </div>

        <div className="flex-1 p-5 space-y-5">

          {/* Color Theme */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Color Theme</p>
            <div className="flex gap-3 flex-wrap">
              {THEMES.map(t => (
                <button key={t.id} onClick={() => update({ overlayTheme: t.id })}
                  className={`flex flex-col items-center gap-1.5 transition-all ${theme === t.id ? 'scale-105' : 'opacity-70 hover:opacity-100'}`}>
                  <div className="w-12 h-12 rounded-xl border-2 transition-all"
                    style={{ background: t.preview, borderColor: theme === t.id ? '#6366f1' : 'transparent' }}>
                    {theme === t.id && (
                      <div className="w-full h-full rounded-xl flex items-center justify-center">
                        <span className="text-white text-lg">✓</span>
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold ${theme === t.id ? 'text-indigo-500' : 'text-gray-500 dark:text-gray-400'}`}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Display Options */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Display Options</p>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Show blocked site name</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Display the domain name on the overlay so you know what was blocked</p>
                </div>
                <Toggle value={showSite} onChange={v => update({ showBlockedSitesList: v })} />
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Aversion sound</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Play a startling sound when a blocked site is accessed</p>
                </div>
                <Toggle value={settings.aversionSoundEnabled ?? false} onChange={v => update({ aversionSoundEnabled: v })} />
              </div>
            </div>
          </div>

          {/* Custom Quotes */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Custom Quotes</p>
              {quotes.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">{quotes.length} custom</span>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
              {quotes.length === 0
                ? 'No custom quotes — rotating through 10 built-in focus quotes'
                : `Your custom quotes rotate on the overlay. Built-ins are hidden while you have custom ones.`}
            </p>

            {/* Add row */}
            <div className="flex gap-2 mb-3">
              <input value={draftQuote} onChange={e => setDraftQuote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addQuote()}
                placeholder="Type a motivating quote…"
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <button onClick={addQuote} disabled={!draftQuote.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-sm font-bold transition-colors">
                Add
              </button>
            </div>

            {quotes.length > 0 && (
              <div className="space-y-2">
                {quotes.map((q, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2">
                    <span className="text-gray-300 dark:text-gray-600 mt-0.5 flex-shrink-0">"</span>
                    <p className="flex-1 text-sm text-gray-700 dark:text-gray-300 italic leading-snug">{q}</p>
                    <button onClick={() => removeQuote(i)} className="text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors flex-shrink-0">✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Built-in preview */}
            {quotes.length === 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-300 dark:text-gray-600 mb-2">Built-in pool (active)</p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {BUILT_IN_QUOTES.slice(0, 5).map((q, i) => (
                    <p key={i} className="text-xs text-gray-400 dark:text-gray-500 italic border-l-2 border-gray-200 dark:border-gray-700 pl-2">"{q}"</p>
                  ))}
                  <p className="text-[10px] text-gray-300 dark:text-gray-600 pl-2">+{BUILT_IN_QUOTES.length - 5} more…</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right — live preview */}
      <div className="w-1/2 overflow-y-auto p-6 space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Live Preview</p>
          <PreviewPanel theme={theme} quotes={quotes} showSite={showSite} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
          <p className="text-sm font-bold text-gray-700 dark:text-gray-200">How the overlay works</p>
          {[
            { icon: '🚫', title: 'Triggered automatically', desc: 'When you visit a blocked domain, FocusFlow intercepts the request and shows this overlay instead.' },
            { icon: '💬', title: 'Rotating quotes', desc: 'A random quote from your pool (or the built-in list) appears to reinforce your commitment.' },
            { icon: '⏱', title: 'Session timer', desc: 'The remaining focus time is shown so you stay aware of how long you\'ve committed to stay on task.' },
            { icon: '🎨', title: 'Theme applies globally', desc: 'The selected theme applies to all block overlays — both focus-session blocks and always-on blocks.' },
          ].map(item => (
            <div key={item.title} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-sm flex-shrink-0">{item.icon}</div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{item.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
