import React, { useState, useRef, useEffect } from 'react'
import { verifyPin } from '../utils/pin'

interface PinModalProps {
  storedHash: string
  title?: string
  subtitle?: string
  onSuccess: () => void
  onCancel: () => void
}

export default function PinModal({ storedHash, title = 'Enter PIN', subtitle, onSuccess, onCancel }: PinModalProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [])

  const handleSubmit = async () => {
    if (pin.length < 4) { setError('PIN must be at least 4 digits'); return }
    const ok = await verifyPin(pin, storedHash)
    if (ok) {
      onSuccess()
    } else {
      setError('Incorrect PIN. Try again.')
      setShake(true)
      setPin('')
      setTimeout(() => setShake(false), 500)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onCancel}>
      <div
        className={`bg-white dark:bg-gray-800 rounded-2xl p-7 w-80 shadow-2xl animate-slide-up ${shake ? 'animate-shake' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-3 text-3xl">🔒</div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
        </div>

        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          maxLength={8}
          value={pin}
          onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError('') }}
          onKeyDown={handleKey}
          placeholder="Enter PIN"
          className="w-full text-center text-2xl font-bold tracking-[0.5em] border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
        />

        {error && (
          <p className="text-xs text-red-500 text-center mt-2 font-medium">{error}</p>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={pin.length < 4}
            className="flex-1 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-sm font-bold transition-colors"
          >
            Unlock
          </button>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-3">
          The PIN you set in Settings → Focus Enforcement
        </p>
      </div>
    </div>
  )
}
