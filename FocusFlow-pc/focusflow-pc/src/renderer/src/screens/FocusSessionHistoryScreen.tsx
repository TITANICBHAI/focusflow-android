import React, { useEffect, useState, useMemo } from 'react'

type Page =
  | 'today' | 'week' | 'focus' | 'stats' | 'settings' | 'profile' | 'reports'
  | 'active' | 'notes' | 'block-defense' | 'keyword-blocker' | 'always-on'
  | 'changelog' | 'how-to-use' | 'privacy' | 'standalone-block' | 'import-blocklist'
  | 'daily-allowance' | 'weekly-report' | 'overlay-appearance' | 'allowed-in-focus'
  | 'session-history'

interface SessionRecord {
  id: number
  taskId: string
  taskTitle: string
  startedAt: string
  endedAt: string | null
  durationMinutes: number
  overrideCount: number
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function fmtDuration(mins: number): string {
  if (mins < 1) return '<1 min'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function groupByDate(sessions: SessionRecord[]): { label: string; items: SessionRecord[] }[] {
  const map = new Map<string, SessionRecord[]>()
  for (const s of sessions) {
    const key = s.startedAt.slice(0, 10)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(s)
  }
  return Array.from(map.entries()).map(([key, items]) => ({
    label: fmtDate(key + 'T12:00:00'),
    items,
  }))
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`flex flex-col items-center px-4 py-3 rounded-2xl ${color}`}>
      <span className="text-xl font-bold text-gray-800 dark:text-gray-100">{value}</span>
      <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</span>
    </div>
  )
}

export default function FocusSessionHistoryScreen({ navigate }: { navigate: (p: Page) => void }) {
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [selected, setSelected] = useState<SessionRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'clean' | 'interrupted'>('all')

  useEffect(() => {
    setLoading(true)
    window.api.stats.getRecentSessions(200).then((data: SessionRecord[]) => {
      setSessions(data)
      if (data.length > 0) setSelected(data[0])
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    return sessions.filter(s => {
      const matchSearch = search === '' || s.taskTitle.toLowerCase().includes(search.toLowerCase())
      const matchFilter =
        filter === 'all' ? true :
        filter === 'clean' ? s.overrideCount === 0 :
        s.overrideCount > 0
      return matchSearch && matchFilter
    })
  }, [sessions, search, filter])

  const grouped = useMemo(() => groupByDate(filtered), [filtered])

  const totalMins = useMemo(() => sessions.reduce((a, s) => a + s.durationMinutes, 0), [sessions])
  const cleanSessions = useMemo(() => sessions.filter(s => s.overrideCount === 0).length, [sessions])
  const totalOverrides = useMemo(() => sessions.reduce((a, s) => a + s.overrideCount, 0), [sessions])

  const cleanPct = sessions.length > 0 ? Math.round((cleanSessions / sessions.length) * 100) : 0

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('stats')} className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Session History</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sessions.length} completed session{sessions.length !== 1 ? 's' : ''} recorded</p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-400 dark:text-gray-500">Loading sessions…</p>
          </div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-8">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🛡</span>
            </div>
            <h3 className="text-base font-bold text-gray-700 dark:text-gray-300 mb-2">No Sessions Yet</h3>
            <p className="text-sm text-gray-400 dark:text-gray-500">Complete your first focus session to start building your history.</p>
            <button onClick={() => navigate('focus')} className="mt-5 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition-colors">
              Start a Focus Session
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT — list */}
          <div className="w-80 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            {/* search + filter */}
            <div className="p-3 space-y-2 border-b border-gray-100 dark:border-gray-700">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by task name…"
                className="w-full text-sm px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-indigo-400 transition-colors"
              />
              <div className="flex gap-1">
                {(['all', 'clean', 'interrupted'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${filter === f ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* grouped list */}
            <div className="flex-1 overflow-y-auto">
              {grouped.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-400 dark:text-gray-500">No sessions match your filter.</div>
              ) : (
                grouped.map(group => (
                  <div key={group.label}>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                      <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{group.label}</p>
                    </div>
                    {group.items.map(s => (
                      <button key={s.id} onClick={() => setSelected(s)}
                        className={`w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors ${selected?.id === s.id ? 'bg-indigo-50 dark:bg-indigo-900/30 border-l-2 border-l-indigo-500' : ''}`}>
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate flex-1">{s.taskTitle}</p>
                          <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 shrink-0">{fmtDuration(s.durationMinutes)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 dark:text-gray-500">{fmtTime(s.startedAt)}</span>
                          {s.overrideCount > 0 ? (
                            <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 px-1.5 py-0.5 rounded-md font-semibold">
                              {s.overrideCount} override{s.overrideCount !== 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-md font-semibold">
                              Clean ✓
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT — detail / summary */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* All-time summary pills */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">All-Time Summary</p>
              <div className="grid grid-cols-4 gap-3">
                <StatPill label="Sessions" value={String(sessions.length)} color="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
                <StatPill label="Total Focus" value={fmtDuration(totalMins)} color="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800" />
                <StatPill label="Clean Rate" value={`${cleanPct}%`} color="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800" />
                <StatPill label="Overrides" value={String(totalOverrides)} color="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800" />
              </div>
            </div>

            {/* Selected session detail */}
            {selected && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Selected Session</p>
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 truncate">{selected.taskTitle}</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{fmtDate(selected.startedAt)}</p>
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl text-xs font-bold ${selected.overrideCount === 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400'}`}>
                      {selected.overrideCount === 0 ? '✓ Clean' : `${selected.overrideCount} override${selected.overrideCount !== 1 ? 's' : ''}`}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Started</p>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{fmtTime(selected.startedAt)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Ended</p>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{selected.endedAt ? fmtTime(selected.endedAt) : '—'}</p>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3">
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Duration</p>
                      <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{fmtDuration(selected.durationMinutes)}</p>
                    </div>
                  </div>

                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Focus Quality</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {selected.overrideCount === 0 ? 'No distractions — great work!' : `${selected.overrideCount} distraction attempt${selected.overrideCount !== 1 ? 's' : ''} logged`}
                      </p>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${selected.overrideCount === 0 ? 'bg-green-500' : selected.overrideCount <= 2 ? 'bg-yellow-400' : 'bg-red-500'}`}
                        style={{ width: selected.overrideCount === 0 ? '100%' : `${Math.max(10, 100 - selected.overrideCount * 20)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Motivational note */}
            {sessions.length > 0 && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-4">
                <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-1">
                  {cleanPct >= 80 ? '🏆 Outstanding focus discipline!' :
                   cleanPct >= 60 ? '💪 Solid focus habit — keep it up!' :
                   '🎯 Every clean session builds the habit.'}
                </p>
                <p className="text-xs text-indigo-500 dark:text-indigo-400">
                  {cleanSessions} of your {sessions.length} sessions were completely distraction-free.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
