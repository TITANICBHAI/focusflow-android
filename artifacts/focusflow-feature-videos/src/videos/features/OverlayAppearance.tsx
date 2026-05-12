import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { sceneTransitions } from '@/lib/video/animations';
import { Palette, Quote, Volume2, SwatchBook, ShieldAlert } from 'lucide-react';

const ACCENT = '#8b5cf6'; // Violet

function Scene1({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.scaleFade}>
      <Palette size={80} className="text-white/30 mb-8" strokeWidth={1} />
      <h1 className="text-6xl font-display font-bold tracking-tight mb-4">
        The Block Screen is <span style={{ color: ACCENT }}>Yours.</span>
      </h1>
      <p className="text-2xl text-white/50 text-center">Customize your discipline environment.</p>
    </motion.div>
  );
}

function Scene2({ currentScene }: { currentScene: number }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000),
      setTimeout(() => setPhase(2), 2500),
      setTimeout(() => setPhase(3), 4000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const themes = [
    { name: 'Obsidian', color: '#111111' },
    { name: 'Midnight', color: '#1e1b4b' },
    { name: 'Forest', color: '#064e3b' },
    { name: 'Ocean', color: '#0c4a6e' },
    { name: 'Dusk', color: '#4c1d95' }
  ];

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.wipe}>
      <motion.div className="absolute inset-0"
        animate={{ backgroundColor: phase === 0 ? themes[0].color : phase === 1 ? themes[1].color : phase === 2 ? themes[2].color : themes[4].color }}
        transition={{ duration: 1 }} />
      
      <h2 className="text-5xl font-display font-bold mb-16 relative z-10">Premium Themes</h2>
      
      <div className="flex gap-6 relative z-10">
        {themes.map((t, i) => (
          <motion.div key={t.name} className="flex flex-col items-center gap-3"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <div className="w-16 h-16 rounded-full border-2 border-white/20" style={{ backgroundColor: t.color }} />
            <span className="text-sm font-mono text-white/70">{t.name}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function Scene3({ currentScene }: { currentScene: number }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 2000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.splitHorizontal}>
      <div className="absolute inset-0">
        <img src={`${import.meta.env.BASE_URL}images/bg-focus.png`} className="w-full h-full object-cover opacity-30" alt="bg" />
        <div className="absolute inset-0 bg-violet-900/40 backdrop-blur-sm" />
      </div>
      
      <Quote size={64} className="text-violet-400 mb-8 relative z-10" />
      
      <motion.div className="glass-panel p-12 rounded-3xl max-w-3xl text-center relative z-10 border-l-4 border-violet-500"
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <motion.p className="text-4xl font-display font-bold leading-tight"
          initial={{ opacity: 0 }} animate={phase >= 1 ? { opacity: 1 } : {}}>
          "The cost of discipline is always less than the price of regret."
        </motion.p>
        {phase >= 2 && (
          <motion.p className="text-xl text-violet-300 mt-6 font-mono" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            — Nido Qubein
          </motion.p>
        )}
      </motion.div>
      
      <h2 className="text-2xl font-bold mt-12 relative z-10 text-white/50 uppercase tracking-widest">Custom Wallpapers & Quotes</h2>
    </motion.div>
  );
}

function Scene4({ currentScene }: { currentScene: number }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.morphExpand}>
      <h2 className="text-5xl font-display font-bold mb-16">Sound Deterrents</h2>
      
      <div className="flex flex-col gap-6 w-full max-w-2xl">
        {[
          { icon: Volume2, name: 'Warning Siren', active: phase >= 1 },
          { icon: Volume2, name: 'Disappointment Sigh', active: phase >= 2 },
          { icon: Volume2, name: 'Custom Voice Note', active: phase >= 3 },
        ].map((s, i) => (
          <motion.div key={i} className="glass-panel p-6 rounded-2xl flex items-center gap-6"
            initial={{ opacity: 0, x: -50 }} animate={s.active ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }} transition={{ type: "spring" }}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${i === 0 ? 'bg-red-500/20 text-red-400' : 'bg-violet-500/20 text-violet-400'}`}>
              <s.icon size={24} />
            </div>
            <span className="text-2xl font-bold">{s.name}</span>
            <div className="flex-grow" />
            {s.active && (
              <motion.div className="flex gap-1"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {[1,2,3].map(bar => (
                  <motion.div key={bar} className={`w-2 rounded-full ${i === 0 ? 'bg-red-400' : 'bg-violet-400'}`}
                    animate={{ height: [10, 30, 10] }} transition={{ duration: 0.5, repeat: Infinity, delay: bar * 0.1 }} />
                ))}
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function Scene5({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#08080f]" {...sceneTransitions.scaleFade}>
      <motion.div className="w-24 h-24 rounded-3xl bg-violet-500 flex items-center justify-center mb-6 shadow-[0_0_60px_rgba(139,92,246,0.4)]"
        animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity }}>
        <ShieldAlert size={48} className="text-white" />
      </motion.div>
      <h1 className="text-4xl font-display font-bold tracking-widest text-white mb-2 uppercase">FocusFlow</h1>
      <p className="text-violet-300 font-mono">Discipline Operating System</p>
    </motion.div>
  );
}

const SCENE_DURATIONS = { open: 4000, themes: 5500, quote: 5500, sounds: 5000, close: 4500 };

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#08080f] text-white">
      <div className="absolute inset-0">
        <div className="noise-overlay" />
      </div>

      <AnimatePresence mode="popLayout">
        {currentScene === 0 && <Scene1 key="s1" currentScene={currentScene} />}
        {currentScene === 1 && <Scene2 key="s2" currentScene={currentScene} />}
        {currentScene === 2 && <Scene3 key="s3" currentScene={currentScene} />}
        {currentScene === 3 && <Scene4 key="s4" currentScene={currentScene} />}
        {currentScene === 4 && <Scene5 key="s5" currentScene={currentScene} />}
      </AnimatePresence>
    </div>
  );
}
