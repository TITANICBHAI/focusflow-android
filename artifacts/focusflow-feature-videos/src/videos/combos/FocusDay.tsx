import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { sceneTransitions } from '@/lib/video/animations';
import { Sun, Timer, Ban, CheckCircle2, Flame, Trophy } from 'lucide-react';

function Scene1({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.scaleFade}>
      <Sun size={80} className="text-cyan-500 mb-8" strokeWidth={1} />
      <h1 className="text-6xl font-display font-bold tracking-tight mb-4">
        Your <span className="text-cyan-500">Focus Day</span>
      </h1>
      <p className="text-2xl text-white/50">Morning to night, perfectly structured.</p>
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
      <h2 className="text-4xl font-display font-bold mb-12 text-cyan-400">9:00 AM</h2>
      <Timer size={64} className="text-white/50 mb-8" />
      <h3 className="text-5xl font-display font-bold mb-8">Start Focus Session</h3>
      
      <motion.div className="glass-panel p-8 rounded-full border border-cyan-500/30 w-80 h-80 flex flex-col items-center justify-center relative"
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring" }}>
        {phase >= 1 && (
          <motion.svg className="absolute inset-0 w-full h-full transform -rotate-90">
            <motion.circle cx="160" cy="160" r="150" stroke="#06b6d4" strokeWidth="8" fill="none"
              strokeDasharray="942" initial={{ strokeDashoffset: 942 }} animate={{ strokeDashoffset: 942 * 0.1 }} transition={{ duration: 4, ease: "linear" }} strokeLinecap="round" />
          </motion.svg>
        )}
        <span className="text-6xl font-mono font-bold">25:00</span>
        <span className="text-cyan-400 font-mono tracking-widest mt-2 uppercase">Deep Work</span>
      </motion.div>
    </motion.div>
  );
}

function Scene3({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.splitHorizontal}>
      <h2 className="text-4xl font-display font-bold mb-12 text-indigo-400">10:15 AM</h2>
      <h3 className="text-6xl font-display font-black tracking-tighter mb-16">Distractions Blocked</h3>
      
      <div className="flex gap-8">
        {['Instagram', 'TikTok', 'Twitter'].map((app, i) => (
          <motion.div key={app} className="w-40 h-40 glass-panel rounded-3xl flex flex-col items-center justify-center relative overflow-hidden"
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.2 }}>
            <span className="text-lg font-mono mb-4">{app}</span>
            <motion.div className="absolute inset-0 bg-indigo-600/40 backdrop-blur-sm flex items-center justify-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 + i * 0.2 }}>
              <Ban size={48} className="text-indigo-400" />
            </motion.div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function Scene4({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.clipCircle}>
      <CheckCircle2 size={100} className="text-emerald-500 mb-8" />
      <h2 className="text-4xl font-display font-bold mb-4 text-emerald-400">12:00 PM</h2>
      <h3 className="text-7xl font-display font-black tracking-tighter">Session Complete</h3>
      <p className="text-2xl text-white/50 mt-4">+120 Focus Minutes</p>
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
      <h2 className="text-4xl font-display font-bold mb-12 text-emerald-400">5:00 PM</h2>
      <h3 className="text-5xl font-display font-bold mb-16">Stats Update</h3>
      
      <div className="flex gap-16">
        <div className="flex flex-col items-center">
          <div className="relative w-48 h-48 flex items-center justify-center mb-4">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle cx="96" cy="96" r="80" stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="none" />
              <motion.circle cx="96" cy="96" r="80" stroke="#10b981" strokeWidth="12" fill="none"
                strokeDasharray="502" initial={{ strokeDashoffset: 502 }} animate={phase >= 1 ? { strokeDashoffset: 502 * 0.2 } : {}} transition={{ duration: 1.5 }} strokeLinecap="round" />
            </svg>
            <span className="text-4xl font-bold font-mono">80%</span>
          </div>
          <span className="text-white/50 uppercase tracking-widest text-sm font-mono">Productivity</span>
        </div>
        
        <div className="flex flex-col items-center justify-center">
          <div className="glass-panel p-8 rounded-full border border-emerald-500 flex flex-col items-center justify-center w-48 h-48">
            <Flame size={40} className="text-emerald-500 mb-2" />
            <motion.span className="text-5xl font-bold font-mono"
              initial={{ scale: 1 }} animate={phase >= 1 ? { scale: [1, 1.2, 1], color: '#10b981' } : {}}>
              {phase >= 1 ? 15 : 14}
            </motion.span>
            <span className="text-white/50 text-sm mt-1">Day Streak</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Scene6({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#08080f]" {...sceneTransitions.scaleFade}>
      <motion.div className="w-24 h-24 rounded-3xl bg-emerald-500 flex items-center justify-center mb-6 shadow-[0_0_60px_rgba(16,185,129,0.4)]"
        animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity }}>
        <Trophy size={48} className="text-black" />
      </motion.div>
      <h1 className="text-5xl font-display font-bold tracking-tight text-white mb-4">Day Complete.</h1>
      <p className="text-xl text-emerald-300 font-mono">FocusFlow Discipline System</p>
    </motion.div>
  );
}

const SCENE_DURATIONS = { open: 4000, morning: 5000, block: 5000, complete: 4500, stats: 5000, close: 5000 };

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#08080f] text-white">
      <div className="absolute inset-0">
        <div className="noise-overlay" />
        <motion.div className="absolute inset-0"
          animate={{
            backgroundColor: currentScene <= 1 ? 'rgba(6,182,212,0.1)' : currentScene === 2 ? 'rgba(99,102,241,0.1)' : 'rgba(16,185,129,0.1)'
          }}
          transition={{ duration: 2 }} />
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
