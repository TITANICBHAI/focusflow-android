import React, { useState, useEffect, useRef, useCallback } from 'react'
import dayjs from 'dayjs'

const PROMPTS = [
  "What's your main focus for today?",
  "What are you grateful for right now?",
  "What's one thing you want to accomplish?",
  "How is your energy level today?",
  "What's blocking you right now?",
  "What went well yesterday?",
]

function getPrompt(date: string): string {
  const hash = date.split('-').reduce((a, b) => a + parseInt(b, 10), 0)
  return PROMPTS[hash % PROMPTS.length]
}

export default function NotesScreen() {
  const today = dayjs().format('YYYY-MM-DD')
  const [selectedDate, setSelectedDate] = useState(today)
  const [noteText, setNoteText] = useState('')
  const [savedText, setSavedText] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [recentDates, setRecentDates] = useState<string[]>([])
  const [charCount, setCharCount] = useState(0)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const loadNote = useCallback(async (date: string) => {
    try {
      const text = await window.api.notes.get(date)
      setNoteText(text ?? '')
      setSavedText(text ?? '')
      setCharCount((text ?? '').length)
    } catch {
      setNoteText('')
      setSavedText('')
      setCharCount(0)
    }
  }, [])

  const loadRecentDates = useCallback(async () => {
    try {
      const dates = await window.api.notes.getRecentDates(14)
      setRecentDates(dates ?? [])
    } catch {
      setRecentDates([])
    }
  }, [])

  useEffect(() => {
    loadNote(selectedDate)
    loadRecentDates()
  }, [selectedDate, loadNote, loadRecentDates])

  const saveNote = useCallback(async (text: string) => {
    setSaving(true)
    try {
      await window.api.notes.save(selectedDate, text)
      setSavedText(text)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      loadRecentDates()
    } catch {}
    setSaving(false)
  }, [selectedDate, loadRecentDates])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setNoteText(val)
    setCharCount(val.length)
    setSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveNote(val), 800)
  }

  const handleManualSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveNote(noteText)
  }

  const hasChanges = noteText !== savedText

  const dateLabel = (d: string) => {
    if (d === today) return 'Today'
    if (d === dayjs().subtract(1, 'day').format('YYYY-MM-DD')) return 'Yesterday'
    return dayjs(d).format('MMM D')
  }

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Sidebar — recent notes */}
      <div className="w-48 shrink-0 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 py-4">
        <div className="px-4 mb-3">
          <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Daily Notes</div>
        </div>

        {/* Today button always first */}
        <button
          onClick={() => setSelectedDate(today)}
          className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all ${
            selectedDate === today
              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-r-2 border-indigo-500'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }`}
        >
          <span>📝</span>
          <span>Today</span>
        </button>

        {/* Separator */}
        <div className="mx-4 my-2 border-t border-gray-100 dark:border-gray-700" />
        <div className="px-4 mb-1">
          <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Past Notes</div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {recentDates.filter(d => d !== today).map(d => (
            <button
              key={d}
              onClick={() => setSelectedDate(d)}
              className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-all ${
                selectedDate === d
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-r-2 border-indigo-500 font-semibold'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <span>{dateLabel(d)}</span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">{dayjs(d).format('MMM D')}</span>
            </button>
          ))}
          {recentDates.filter(d => d !== today).length === 0 && (
            <div className="px-4 py-3 text-[11px] text-gray-400 dark:text-gray-500 italic">No past notes yet</div>
          )}
        </div>
      </div>

      {/* Main editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {selectedDate === today ? `📝 Today's Notes` : `📖 ${dayjs(selectedDate).format('MMMM D, YYYY')}`}
            </h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{dayjs(selectedDate).format('dddd')}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 dark:text-gray-500">{charCount} chars</span>
            {saving && <span className="text-xs text-gray-400 dark:text-gray-500 animate-pulse">Saving…</span>}
            {saved && <span className="text-xs font-semibold text-green-500">✓ Saved</span>}
            {hasChanges && !saving && (
              <button onClick={handleManualSave} className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-600 transition-colors">Save</button>
            )}
          </div>
        </div>

        {/* Prompt */}
        {selectedDate === today && noteText.length === 0 && (
          <div className="mx-6 mt-4 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
            <p className="text-sm text-indigo-700 dark:text-indigo-300 italic">💡 {getPrompt(selectedDate)}</p>
          </div>
        )}

        {/* Text editor */}
        <div className="flex-1 px-6 py-4 flex flex-col">
          <textarea
            ref={textareaRef}
            value={noteText}
            onChange={handleChange}
            placeholder={`Write anything about ${selectedDate === today ? 'today' : dayjs(selectedDate).format('this day')}…\n\n• What went well?\n• What are you working on?\n• Any blockers?\n• Thoughts & reflections`}
            className="flex-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-4 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none font-mono leading-relaxed shadow-sm"
            style={{ minHeight: 320 }}
          />

          {/* Markdown shortcuts hint */}
          <div className="mt-3 flex items-center gap-4 text-[11px] text-gray-400 dark:text-gray-500">
            <span>Tip: Use <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">•</code> for bullets</span>
            <span><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">Ctrl+S</code> to save</span>
            <span className="ml-auto">{selectedDate !== today ? '📖 Read-only history — still editable' : ''}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
