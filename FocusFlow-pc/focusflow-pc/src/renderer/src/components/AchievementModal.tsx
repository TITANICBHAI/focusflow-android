import React, { useEffect, useState } from 'react'

const MILESTONES: Record<number, { title: string; subtitle: string; emoji: string }> = {
  3:   { title: 'Three Days Strong!',    subtitle: 'You showed up three days running. Habits start here.',                  emoji: '🔥' },
  7:   { title: 'A Full Week!',          subtitle: 'Seven days of focus. Your future self is paying attention.',             emoji: '⚡' },
  14:  { title: 'Two-Week Streak',       subtitle: "Two weeks. This isn't luck anymore — it's discipline.",                  emoji: '💪' },
  30:  { title: 'A Whole Month!',        subtitle: "Thirty days. You've rewritten what you thought you were capable of.",    emoji: '🏆' },
  60:  { title: 'Sixty-Day Streak',      subtitle: "Two months of intent. The version of you that started is gone.",         emoji: '🚀' },
  90:  { title: 'Ninety. Days.',         subtitle: "A quarter of a year of focus. Almost no one gets here.",                 emoji: '👑' },
  180: { title: 'Half a Year of Focus',  subtitle: "Six months. You've quietly become someone different.",                   emoji: '🌟' },
  365: { title: 'A Full Year',           subtitle: 'Three hundred and sixty-five days. Read that again.',                    emoji: '🎆' },
}

const CONFETTI = ['✨', '⭐', '🎉', '🎊', '💫', '🌟', '⚡', '🎁', '🥳', '🎈']

interface Props {
  milestone: number | null
  onDismiss: () => void
}

export default function AchievementModal({ milestone, onDismiss }: Props) {
  const [visible, setVisible] = useState(false)
  const [pieces] = useState(() =>
    Array.from({ length: 16 }, (_, i) => ({
      emoji: CONFETTI[i % CONFETTI.length],
      left: `${Math.random() * 90 + 5}%`,
      delay: `${Math.random() * 0.8}s`,
      duration: `${1.4 + Math.random() * 0.8}s`,
    }))
  )

  useEffect(() => {
    if (milestone != null) {
      setVisible(true)
    }
  }, [milestone])

  if (!milestone || !MILESTONES[milestone]) return null

  const copy = MILESTONES[milestone]

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 transition-opacity ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={onDismiss}>
      {/* Confetti rain */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {pieces.map((p, i) => (
          <div
            key={i}
            className="absolute text-xl animate-bounce"
            style={{
              left: p.left,
              top: '-2rem',
              animationDelay: p.delay,
              animationDuration: p.duration,
              animation: `confettiFall ${p.duration} ${p.delay} ease-in forwards`
            }}
          >
            {p.emoji}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
        @keyframes bounceIn {
          0%   { transform: scale(0.3); opacity: 0; }
          50%  { transform: scale(1.1); }
          80%  { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div
        className="relative bg-white dark:bg-gray-800 rounded-3xl p-10 max-w-sm w-full mx-4 text-center shadow-2xl"
        style={{ animation: 'bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Glow ring */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 pointer-events-none" />

        <div className="relative">
          {/* Badge */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-5 shadow-xl">
            <span className="text-5xl">{copy.emoji}</span>
          </div>

          {/* Streak badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{milestone}-Day Streak</span>
          </div>

          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3">{copy.title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-7">{copy.subtitle}</p>

          <button
            onClick={onDismiss}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-base shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Keep Going 🚀
          </button>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3">You earned this — celebrate it, then get back to work.</p>
        </div>
      </div>
    </div>
  )
}
