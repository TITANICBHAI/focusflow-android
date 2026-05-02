import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import type { AppSettings } from '../data/types'

type Page = 'today' | 'week' | 'focus' | 'stats' | 'settings' | 'profile' | 'reports' | 'active' | 'notes' | 'block-defense' | 'keyword-blocker' | 'always-on' | 'changelog' | 'how-to-use' | 'privacy' | 'standalone-block' | 'import-blocklist'

interface QuickPreset {
  id: string
  label: string
  emoji: string
  description: string
  words: string[]
}

const QUICK_PRESETS: QuickPreset[] = [
  {
    id: 'doomscroll',
    label: 'Doomscroll bait',
    emoji: '📰',
    description: 'Outrage headlines, viral controversy, breaking-news loops',
    words: ['breaking', 'shocking', 'must see', 'gone wrong', 'you wont believe', 'controversy', 'drama', 'reaction'],
  },
  {
    id: 'social-drama',
    label: 'Social-media drama',
    emoji: '🎭',
    description: 'Celebrity feuds, beef tracks, trending arguments',
    words: ['cancelled', 'feud', 'expose', 'beef', 'callout', 'roasted', 'clapback', 'tea'],
  },
  {
    id: 'shorts-bait',
    label: 'Shorts / Reels bait',
    emoji: '📱',
    description: 'Words that show up next to short-form-video rabbit holes',
    words: ['short', 'reel', 'tiktok', 'fyp', 'viral', 'trending', 'compilation', 'pov'],
  },
  {
    id: 'shopping',
    label: 'Impulse-buy traps',
    emoji: '🛒',
    description: 'Sale-pressure words that pull you into shopping apps',
    words: ['flash sale', 'deal of the day', 'limited time', 'lightning deal', 'cart', 'buy now', 'discount'],
  },
  {
    id: 'gambling',
    label: 'Gambling triggers',
    emoji: '🎰',
    description: 'Betting lines, casino lure, loot-box language',
    words: ['bet', 'odds', 'spin', 'jackpot', 'casino', 'parlay', 'wager', 'free spins'],
  },
  {
    id: 'adult',
    label: 'NSFW content',
    emoji: '🚫',
    description: 'Adult-content terms across browsers, search, and feeds',
    words: ['nsfw', 'porn', 'xxx', 'onlyfans', 'adult', 'nude'],
  },
]

function KeywordEditModal({ words, onSave, onClose }: {
  words: string[]
  onSave: (words: string[]) => void
  onClose: () => void
}) {
  const [list, setList] = useState<string[]>(words)
  const [input, setInput] = useState('')

  const add = () => {
    const w = input.trim().toLowerCase()
    if (w && !list.includes(w)) { setList(prev => [...prev, w]); setInput('') }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Manage Keywords</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
        </div>
        <div className="p-5">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Add words to monitor. When these appear in browser URLs or window titles, they're flagged in your reports.
          </p>
          <div className="flex gap-2 mb-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              placeholder="breaking news, viral, casino…"
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              autoFocus
            />
            <button onClick={add} className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600 transition-colors">Add</button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto min-h-[40px]">
            {list.map(w => (
              <span key={w} className="flex items-center gap-1 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {w}
                <button onClick={() => setList(prev => prev.filter(x => x !== w))} className="hover:text-red-500 transition-colors">✕</button>
              </span>
            ))}
            {list.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-500">No keywords yet — type above and press Enter or Add</p>}
          </div>
          <button
            onClick={() => { onSave(list); onClose() }}
            className="w-full mt-4 py-2.5 rounded-xl bg-indigo-500 text-white font-bold text-sm hover:bg-indigo-600 transition-colors"
          >
            Save Keywords
          </button>
        </div>
      </div>
    </div>
  )
}

export default function KeywordBlockerScreen({ navigate }: { navigate: (p: Page) => void }) {
  const { state, updateSettings } = useApp()
  const { settings } = state
  const [modalOpen, setModalOpen] = useState(false)

  const blockedWords = settings.blockedWords ?? []
  const isOn = blockedWords.length > 0

  const update = (partial: Partial<AppSettings>) => updateSettings({ ...settings, ...partial })

  const handleAddPreset = (preset: QuickPreset) => {
    const existing = new Set(blockedWords.map(w => w.toLowerCase()))
    const additions = preset.words.filter(w => !existing.has(w.toLowerCase()))
    if (additions.length === 0) {
      alert(`All keywords in "${preset.label}" are already on your list.`)
      return
    }
    if (confirm(`Add ${additions.length} keyword${additions.length !== 1 ? 's' : ''} from "${preset.label}"?\n\nKeywords: ${additions.join(', ')}`)) {
      update({ blockedWords: [...blockedWords, ...additions] })
    }
  }

  const handleClearAll = () => {
    if (blockedWords.length === 0) return
    if (confirm(`Remove all ${blockedWords.length} keywords from the block list? This cannot be undone.`)) {
      update({ blockedWords: [] })
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('block-defense')}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          ←
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Keyword Blocker</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Monitor distraction keywords in browser URLs and window titles</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

        {/* Explainer card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex gap-3 items-start">
          <span className="text-2xl">🔤</span>
          <div>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">Block by keyword</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              When any of your blocked words appear in browser tab URLs or window titles, FocusFlow flags them as distraction events and logs them in your focus reports. Add presets below or build your own custom list.
            </p>
          </div>
        </div>

        {/* Status card */}
        <div className={`bg-white dark:bg-gray-800 rounded-2xl border-2 p-4 flex items-center gap-3 ${isOn ? 'border-green-300 dark:border-green-700' : 'border-gray-200 dark:border-gray-700'}`}>
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isOn ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{isOn ? 'Active' : 'Inactive'}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {isOn ? `${blockedWords.length} keyword${blockedWords.length !== 1 ? 's' : ''} on the block list` : 'Add keywords below to start filtering content'}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setModalOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm transition-colors"
          >
            <span>{isOn ? '✏️' : '+'}</span>
            {isOn ? 'Manage Keywords' : 'Add Keywords'}
          </button>
          {isOn && (
            <button
              onClick={handleClearAll}
              className="px-4 py-2.5 rounded-2xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-500 font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              🗑 Clear all
            </button>
          )}
        </div>

        {/* Current keywords preview */}
        {isOn && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Current Keywords</p>
            <div className="flex flex-wrap gap-1.5">
              {blockedWords.map(w => (
                <span
                  key={w}
                  className="flex items-center gap-1 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400"
                >
                  {w}
                  <button
                    onClick={() => update({ blockedWords: blockedWords.filter(x => x !== w) })}
                    className="hover:text-red-500 transition-colors"
                  >✕</button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Quick presets */}
        <div>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Quick Presets</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Tap a category to add a curated set of keywords in one click.</p>
          <div className="space-y-2">
            {QUICK_PRESETS.map(preset => {
              const existing = new Set(blockedWords.map(w => w.toLowerCase()))
              const newCount = preset.words.filter(w => !existing.has(w.toLowerCase())).length
              const allAdded = newCount === 0
              return (
                <button
                  key={preset.id}
                  onClick={() => handleAddPreset(preset)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all hover:shadow-sm ${
                    allAdded
                      ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-200 dark:hover:border-indigo-700'
                  }`}
                >
                  <span className="text-2xl">{preset.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{preset.label}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{preset.description}</p>
                    <p className={`text-xs font-bold mt-0.5 ${allAdded ? 'text-green-500' : 'text-indigo-500'}`}>
                      {allAdded ? '✓ All added' : `+${newCount} keyword${newCount !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  {!allAdded && <span className="text-indigo-400 text-lg flex-shrink-0">+</span>}
                  {allAdded && <span className="text-green-500 text-base flex-shrink-0">✓</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex gap-3 items-start">
          <span className="text-base mt-0.5">ℹ️</span>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Keyword detection runs locally on your device — nothing is sent to the cloud. Matches are logged as distraction events in your focus reports, helping you identify patterns over time.
          </p>
        </div>

      </div>

      {modalOpen && (
        <KeywordEditModal
          words={blockedWords}
          onSave={words => update({ blockedWords: words })}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
