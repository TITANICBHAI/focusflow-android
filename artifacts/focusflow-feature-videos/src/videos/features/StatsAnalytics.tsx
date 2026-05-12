import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { sceneTransitions } from '@/lib/video/animations';
import { BarChart3, Flame, Target, CalendarDays, Activity } from 'lucide-react';

const ACCENT = '#10b981'; // Emerald Green

function Scene1({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.scaleFade}>
      <BarChart3 size={80} className="text-white/30 mb-8" strokeWidth={1} />
      <h1 className="text-6xl font-display font-bold tracking-tight mb-4">
        Your Focus Data <span style={{ color: ACCENT }}>Visualised</span>
      </h1>
      <p className="text-2xl text-white/50">Measure what matters. Improve what you measure.</p>
    </motion.div>
  );
}

function Scene2({ currentScene }: { currentScene: number }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000),
      setTimeout(() => setPhase(2), 2500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.wipe}>
      <h2 className="text-4xl font-display font-bold mb-16">Never Break The Chain</h2>
      
      <div className="glass-panel p-12 rounded-full border border-emerald-500/30 flex flex-col items-center justify-center relative overflow-hidden">
        <motion.div className="absolute inset-0 bg-emerald-500/10"
          animate={{ opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 2, repeat: Infinity }} />
        
        <Flame size={64} className="text-emerald-500 mb-4" />
        <div className="flex items-baseline gap-2">
          <motion.span className="text-8xl font-mono font-bold text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0.5 }}>
            {phase >= 1 ? 14 : 13}
          </motion.span>
          <span className="text-2xl text-white/50 font-mono">Days</span>
        </div>
        
        {phase >= 2 && (
          <motion.div className="absolute inset-0 border-4 border-emerald-500 rounded-full"
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1 }} />
        )}
      </div>
    </motion.div>
  );
}

function Scene3({ currentScene }: { currentScene: number }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.splitHorizontal}>
      <h2 className="text-5xl font-display font-bold mb-16">Weekly Productivity Score</h2>
      
      <div className="relative w-80 h-80 flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
          <circle cx="160" cy="160" r="140" stroke="rgba(255,255,255,0.1)" strokeWidth="16" fill="none" />
          <motion.circle cx="160" cy="160" r="140" stroke={ACCENT} strokeWidth="16" fill="none"
            strokeDasharray="880"
            initial={{ strokeDashoffset: 880 }}
            animate={phase >= 1 ? { strokeDashoffset: 880 * 0.15 } : {}}
            transition={{ duration: 2.5, ease: "circOut" }}
            strokeLinecap="round" />
        </svg>
        
        <div className="flex flex-col items-center">
          <motion.span className="text-7xl font-mono font-bold text-white"
            initial={{ opacity: 0 }} animate={phase >= 1 ? { opacity: 1 } : {}}>
            85%
          </motion.span>
          <span className="text-emerald-400 font-mono tracking-widest mt-2 uppercase">Excellent</span>
        </div>
      </div>
    </motion.div>
  );
}

function Scene4({ currentScene }: { currentScene: number }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.morphExpand}>
      <h2 className="text-5xl font-display font-bold mb-16 text-center max-w-4xl">Find Your Peak Focus Hours</h2>
      
      <div className="flex items-end gap-3 h-64 border-b border-white/20 pb-4 px-8 w-full max-w-3xl">
        {[40, 30, 20, 10, 60, 90, 80, 50, 40, 70, 100, 80, 50, 30].map((h, i) => (
          <motion.div key={i} className="flex-1 bg-emerald-500 rounded-t-sm"
            style={{ opacity: h > 60 ? 1 : h > 30 ? 0.6 : 0.3 }}
            initial={{ height: 0 }}
            animate={phase >= 1 ? { height: `${h}%` } : {}}
            transition={{ duration: 1.5, delay: i * 0.05, ease: "easeOut" }} />
        ))}
      </div>
      <div className="flex justify-between w-full max-w-3xl px-8 mt-4 text-white/40 font-mono text-sm">
        <span>6 AM</span>
        <span>12 PM</span>
        <span>6 PM</span>
        <span>12 AM</span>
      </div>
    </motion.div>
  );
}

function Scene5({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#08080f]" {...sceneTransitions.scaleFade}>
      <motion.div className="w-24 h-24 rounded-3xl bg-emerald-500 flex items-center justify-center mb-6 shadow-[0_0_60px_rgba(16,185,129,0.4)]"
        animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity }}>
        <Activity size={48} className="text-black" />
      </motion.div>
      <h1 className="text-4xl font-display font-bold tracking-widest text-white mb-2 uppercase">FocusFlow</h1>
      <p className="text-emerald-300 font-mono">Discipline Operating System</p>
    </motion.div>
  );
}

const SCENE_DURATIONS = { open: 4000, streak: 5500, score: 5500, heatmap: 5500, close: 4500 };

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#08080f] text-white">
      <div className="absolute inset-0">
        <div className="noise-overlay opacity-10" />
        <motion.div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] opacity-10 bg-emerald-600 blur-[150px] rounded-full"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} />
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
