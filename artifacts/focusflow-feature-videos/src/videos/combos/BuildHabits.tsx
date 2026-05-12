import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { sceneTransitions } from '@/lib/video/animations';
import { Repeat, Hourglass, CalendarDays, BarChart3, TrendingUp, Sparkles } from 'lucide-react';

const ACCENT = '#10b981'; // Emerald

function Scene1({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.scaleFade}>
      <Repeat size={80} className="text-emerald-500 mb-8" strokeWidth={1} />
      <h1 className="text-6xl font-display font-bold tracking-tight mb-4 text-center">
        Small Changes <span style={{ color: ACCENT }}>Compound.</span>
      </h1>
      <p className="text-2xl text-white/50">Build better habits, automatically.</p>
    </motion.div>
  );
}

function Scene2({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.wipe}>
      <h2 className="text-5xl font-display font-bold mb-16 text-center">1. Set Limits</h2>
      <div className="glass-panel p-12 rounded-[2rem] border border-emerald-500/20 flex flex-col items-center w-full max-w-xl">
        <Hourglass size={48} className="text-emerald-400 mb-6" />
        <h3 className="text-3xl font-bold mb-2">Daily Allowance</h3>
        <p className="text-white/50 text-center mb-8">Restrict social media to 30 mins per day.</p>
        <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden">
          <motion.div className="h-full bg-emerald-500" initial={{ width: 0 }} animate={{ width: '60%' }} transition={{ duration: 1.5, delay: 0.5 }} />
        </div>
      </div>
    </motion.div>
  );
}

function Scene3({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.splitHorizontal}>
      <h2 className="text-5xl font-display font-bold mb-16 text-center">2. Schedule Windows</h2>
      <div className="glass-panel p-12 rounded-[2rem] border border-emerald-500/20 flex flex-col items-center w-full max-w-xl">
        <CalendarDays size={48} className="text-emerald-400 mb-6" />
        <h3 className="text-3xl font-bold mb-2">Focus Blocks</h3>
        <p className="text-white/50 text-center mb-8">Auto-block apps during work hours.</p>
        <div className="w-full flex justify-between px-4 text-emerald-300 font-mono font-bold">
          <span>9:00 AM</span>
          <span>→</span>
          <span>5:00 PM</span>
        </div>
      </div>
    </motion.div>
  );
}

function Scene4({ currentScene }: { currentScene: number }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.perspectiveFlip}>
      <h2 className="text-5xl font-display font-bold mb-16 text-center">3. Week 1 Stats</h2>
      <div className="glass-panel p-12 rounded-[2rem] border border-emerald-500/20 flex flex-col items-center w-full max-w-xl">
        <BarChart3 size={48} className="text-emerald-400 mb-6" />
        <h3 className="text-3xl font-bold mb-8">Screen Time Dropping</h3>
        <div className="flex items-end gap-4 h-32 w-full justify-center">
          {[80, 75, 60, 50, 45, 40, 30].map((h, i) => (
            <motion.div key={i} className="w-8 bg-emerald-500 rounded-t-sm"
              initial={{ height: 0 }} animate={phase >= 1 ? { height: `${h}%` } : {}} transition={{ duration: 1, delay: i * 0.1 }} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Scene5({ currentScene }: { currentScene: number }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.morphExpand}>
      <h2 className="text-5xl font-display font-bold mb-16 text-center">4. Week 4 Transformation</h2>
      <div className="flex flex-col items-center justify-center">
        <TrendingUp size={100} className="text-emerald-500 mb-8" />
        <div className="flex items-baseline gap-4 mb-4">
          <motion.span className="text-8xl font-mono font-black"
            initial={{ opacity: 0 }} animate={phase >= 1 ? { opacity: 1 } : {}}>30</motion.span>
          <span className="text-3xl text-emerald-400 font-mono">Day Streak</span>
        </div>
        <p className="text-2xl text-white/50">Habit Formed.</p>
      </div>
    </motion.div>
  );
}

function Scene6({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#08080f]" {...sceneTransitions.scaleFade}>
      <motion.div className="w-32 h-32 rounded-[2rem] bg-emerald-500 flex items-center justify-center mb-8 shadow-[0_0_100px_rgba(16,185,129,0.5)]"
        animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity }}>
        <Sparkles size={64} className="text-black" />
      </motion.div>
      <h1 className="text-6xl font-display font-black tracking-tighter text-white mb-4">FocusFlow</h1>
      <p className="text-2xl text-emerald-300 font-mono uppercase tracking-widest">Discipline Operating System</p>
    </motion.div>
  );
}

const SCENE_DURATIONS = { open: 4500, s1: 4500, s2: 4500, s3: 4500, s4: 5000, close: 5000 };

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#08080f] text-white">
      <div className="absolute inset-0">
        <div className="noise-overlay" />
        <img src={`${import.meta.env.BASE_URL}images/bg-focus.png`} className="w-full h-full object-cover opacity-20 mix-blend-screen" alt="bg" />
        <motion.div className="absolute inset-0 bg-gradient-to-t from-[#08080f] via-transparent to-[#08080f]" />
      </div>

      <AnimatePresence mode="popLayout">
        {currentScene === 0 && <Scene1 key="s1" currentScene={currentScene} />}
        {currentScene === 1 && <Scene2 key="s2" currentScene={currentScene} />}
        {currentScene === 2 && <Scene3 key="s3" currentScene={currentScene} />}
        {currentScene === 3 && <Scene4 key="s4" currentScene={currentScene} />}
        {currentScene === 4 && <Scene5 key="s5" currentScene={currentScene} />}
        {currentScene === 5 && <Scene6 key="s6" currentScene={currentScene} />}
      </AnimatePresence>
    </div>
  );
}
