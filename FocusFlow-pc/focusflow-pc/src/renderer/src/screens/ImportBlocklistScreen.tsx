import React, { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'

type Target = 'blockedWebsites' | 'alwaysOn'
type Page = 'today' | 'week' | 'focus' | 'stats' | 'settings' | 'profile' | 'reports' | 'active' | 'notes' | 'block-defense' | 'keyword-blocker' | 'always-on' | 'changelog' | 'how-to-use' | 'privacy' | 'standalone-block' | 'import-blocklist'

function parseDomains(raw: string): string[] {
  const lines = raw.split(/[\n,;|\t]+/).map(l => l.trim()).filter(Boolean)
  const cleaned = lines.map(line => {
    try {
      if (line.includes('://')) {
        return new URL(line).hostname.replace(/^www\./, '')
      }
      return line.replace(/^www\./, '').replace(/\/.*$/, '').toLowerCase()
    } catch {
      return line.toLowerCase().replace(/^www\./, '').replace(/\/.*$/, '')
    }
  })
  return [...new Set(cleaned.filter(d => d.includes('.') && d.length > 3))]
}

const PRESETS: { name: string; domains: string[] }[] = [
  { name: 'Social Media', domains: ['facebook.com','instagram.com','twitter.com','x.com','tiktok.com','snapchat.com','reddit.com','linkedin.com','pinterest.com','tumblr.com'] },
  { name: 'Video Streaming', domains: ['youtube.com','netflix.com','hulu.com','disneyplus.com','twitch.tv','vimeo.com','dailymotion.com','crunchyroll.com','primevideo.com','hbomax.com'] },
  { name: 'News & Clickbait', domains: ['buzzfeed.com','huffpost.com','dailymail.co.uk','mirror.co.uk','tmz.com','thesun.co.uk','nypost.com','foxnews.com','cnn.com','msn.com'] },
  { name: 'Gaming', domains: ['twitch.tv','store.steampowered.com','roblox.com','epicgames.com','discord.com','miniclip.com','kongregate.com','friv.com','gamespot.com','ign.com'] },
  { name: 'Shopping', domains: ['amazon.com','ebay.com','etsy.com','aliexpress.com','wish.com','asos.com','shein.com','zara.com','shopify.com','wayfair.com'] },
]

export default function ImportBlocklistScreen({ navigate }: { navigate: (p: Page) => void }) {
  const { state, update } = useApp()
  const settings = state.settings

  const [raw, setRaw] = useState('')
  const [target, setTarget] = useState<Target>('blockedWebsites')
  const [imported, setImported] = useState(false)
  const [presetToggle, setPresetToggle] = useState<string[]>([])

  const parsed = useMemo(() => parseDomains(raw), [raw])

  const currentAlwaysOn = settings.alwaysOnPackages ?? []
  const currentFocus = (settings.blockedWebsites ?? []).map((b: { domain: string }) => b.domain)

  const existingSet = new Set(target === 'alwaysOn' ? currentAlwaysOn : currentFocus)
  const newDomains = parsed.filter(d => !existingSet.has(d))
  const dupDomains = parsed.filter(d => existingSet.has(d))

  const presetDomains = useMemo(() => {
    const all: string[] = []
    presetToggle.forEach(name => {
      const p = PRESETS.find(x => x.name === name)
      if (p) all.push(...p.domains)
    })
    return [...new Set(all)]
  }, [presetToggle])

  const finalNewFromPreset = presetDomains.filter(d => !existingSet.has(d))

  const handleImportPaste = () => {
    if (newDomains.length === 0 && finalNewFromPreset.length === 0) return
    const allNew = [...new Set([...newDomains, ...finalNewFromPreset])]

    if (target === 'alwaysOn') {
      update({ alwaysOnPackages: [...new Set([...currentAlwaysOn, ...allNew])] })
    } else {
      const existingBlocked = settings.blockedWebsites ?? []
      const existingDomains = new Set(existingBlocked.map((b: { domain: string }) => b.domain))
      const toAdd = allNew.filter(d => !existingDomains.has(d))
      update({
        blockedWebsites: [
          ...existingBlocked,
          ...toAdd.map(d => ({ domain: d, enabled: true, addedAt: new Date().toISOString() }))
        ]
      })
    }
    setImported(true)
    setRaw('')
    setPresetToggle([])
  }

  const totalNew = new Set([...newDomains, ...finalNewFromPreset]).size

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Left column — input area */}
      <div className="flex flex-col w-1/2 border-r border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-3 mb-0.5">
            <button onClick={() => navigate('block-defense')} className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">← Back</button>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Import Blocklist</h1>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wide">Coming from Another Blocker?</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Paste domain names from any source or pick a preset category</p>
        </div>

        {/* Target selector */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Add to list:</p>
          <div className="flex gap-3">
            {([
              { val: 'blockedWebsites', label: '🌐 Focus Block List', desc: `${currentFocus.length} sites` },
              { val: 'alwaysOn', label: '♾️ Always-On List', desc: `${currentAlwaysOn.length} domains` },
            ] as { val: Target; label: string; desc: string }[]).map(opt => (
              <button
                key={opt.val}
                onClick={() => setTarget(opt.val)}
                className={`flex-1 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all text-left ${
                  target === opt.val
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="block">{opt.label}</span>
                <span className="text-[10px] font-normal opacity-60">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Preset categories */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Quick presets — click to select:</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button
                key={p.name}
                onClick={() => setPresetToggle(prev => prev.includes(p.name) ? prev.filter(x => x !== p.name) : [...prev, p.name])}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  presetToggle.includes(p.name)
                    ? 'bg-rose-500 border-rose-500 text-white'
                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-rose-400 hover:text-rose-500'
                }`}
              >
                {p.name} ({p.domains.length})
              </button>
            ))}
          </div>
          {presetToggle.length > 0 && (
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 font-medium">
              {finalNewFromPreset.length} new domain{finalNewFromPreset.length !== 1 ? 's' : ''} from {presetToggle.length} preset{presetToggle.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        {/* Paste area */}
        <div className="flex-1 flex flex-col px-6 py-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Or paste domains directly:</p>
          <textarea
            value={raw}
            onChange={e => { setRaw(e.target.value); setImported(false) }}
            placeholder={'One per line, or comma/space separated:\n\nfacebook.com\nyoutube.com\nhttps://reddit.com/r/all\ntwitter.com, instagram.com\n\nFull URLs are fine — domains are extracted automatically.'}
            className="flex-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            style={{ minHeight: 200 }}
          />
          <div className="mt-2 flex items-center gap-3">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {parsed.length > 0 ? `${parsed.length} domain${parsed.length !== 1 ? 's' : ''} parsed` : 'No domains detected yet'}
            </span>
            {raw && (
              <button onClick={() => { setRaw(''); setImported(false) }} className="text-xs text-red-400 hover:text-red-600 font-semibold ml-auto">Clear</button>
            )}
          </div>
        </div>
      </div>

      {/* Right column — preview + import */}
      <div className="flex flex-col w-1/2">
        {/* Preview header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Preview</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalNew > 0
              ? `${totalNew} new domain${totalNew !== 1 ? 's' : ''} will be added`
              : parsed.length === 0 && presetToggle.length === 0 ? 'Nothing to import yet'
              : 'All pasted domains already exist in this list'}
          </p>
        </div>

        {/* Stats row */}
        {(parsed.length > 0 || presetToggle.length > 0) && (
          <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-700 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            {[
              { label: 'New', val: totalNew, color: 'text-green-600 dark:text-green-400' },
              { label: 'Duplicates', val: dupDomains.length, color: 'text-yellow-600 dark:text-yellow-400' },
              { label: 'Total Parsed', val: parsed.length + finalNewFromPreset.length, color: 'text-gray-700 dark:text-gray-200' },
            ].map(s => (
              <div key={s.label} className="px-5 py-3 text-center">
                <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
                <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Domain list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1.5">
          {[...new Set([...newDomains, ...finalNewFromPreset.filter(d => !newDomains.includes(d))])].map(d => (
            <div key={d} className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/15 border border-green-200 dark:border-green-800 rounded-lg">
              <span className="text-green-500 text-xs">+</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{d}</span>
              <span className="ml-auto text-[10px] text-green-600 dark:text-green-400 font-semibold">NEW</span>
            </div>
          ))}
          {dupDomains.map(d => (
            <div key={d} className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg opacity-60">
              <span className="text-gray-400 text-xs">✓</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{d}</span>
              <span className="ml-auto text-[10px] text-gray-400 font-semibold">EXISTS</span>
            </div>
          ))}
          {parsed.length === 0 && presetToggle.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Paste domains on the left or select a preset</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Full URLs, comma-separated lists, or one per line</p>
            </div>
          )}
        </div>

        {/* Import button */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4">
          {imported ? (
            <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700">
              <span className="text-green-600 dark:text-green-400 font-bold text-sm">✓ Imported successfully!</span>
              <button onClick={() => { navigate(target === 'alwaysOn' ? 'always-on' : 'block-defense') }} className="ml-2 text-xs text-indigo-500 hover:text-indigo-700 font-semibold">View list →</button>
            </div>
          ) : (
            <button
              onClick={handleImportPaste}
              disabled={totalNew === 0}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-sm transition-colors shadow-sm"
            >
              {totalNew > 0
                ? `Import ${totalNew} Domain${totalNew !== 1 ? 's' : ''} → ${target === 'alwaysOn' ? 'Always-On List' : 'Focus Block List'}`
                : 'Nothing new to import'}
            </button>
          )}
          <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-2">
            Duplicates are skipped automatically. You can remove domains later.
          </p>
        </div>
      </div>
    </div>
  )
}
