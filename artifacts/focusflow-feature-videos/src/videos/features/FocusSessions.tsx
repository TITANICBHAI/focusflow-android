import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { sceneTransitions } from '@/lib/video/animations';
import { Timer, Zap, Play, Trophy } from 'lucide-react';

const ACCENT = '#06b6d4'; // Teal

function Scene1({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.scaleFade}>
      <Timer size={80} className="text-white/30 mb-8" strokeWidth={1} />
      <h1 className="text-6xl font-display font-bold tracking-tight mb-4">
        Master the <span style={{ color: ACCENT }}>Pomodoro Method</span>
      </h1>
      <p className="text-2xl text-white/50 max-w-2xl text-center">
        Work with time, not against it.
      </p>
    </motion.div>
  );
}

function Scene2({ currentScene }: { currentScene: number }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000),
      setTimeout(() => setPhase(2), 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.perspectiveFlip}>
      <h2 className="text-4xl font-display font-bold mb-16 absolute top-24">Set Your Target</h2>
      
      <div className="relative w-80 h-80 flex items-center justify-center">
        {/* Background ring */}
        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
          <circle cx="160" cy="160" r="140" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
          <motion.circle cx="160" cy="160" r="140" stroke={ACCENT} strokeWidth="8" fill="none"
            strokeDasharray="880"
            initial={{ strokeDashoffset: 880 }}
            animate={{ strokeDashoffset: 880 * 0.25 }}
            transition={{ duration: 2, ease: "easeInOut" }}
            strokeLinecap="round" />
        </svg>
        
        <div className="flex flex-col items-center">
          <motion.span className="text-7xl font-mono font-bold"
            animate={phase >= 1 ? { scale: [1, 1.1, 1], color: [ '#fff', ACCENT, '#fff' ] } : {}}>
            25:00
          </motion.span>
          <span className="text-white/40 font-mono tracking-widest mt-2 uppercase">Deep Work</span>
        </div>
      </div>
      
      <motion.button className="mt-16 px-8 py-4 bg-teal-500 rounded-full font-bold text-black flex items-center gap-2"
        initial={{ opacity: 0, y: 20 }} animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}>
        <Play fill="currentColor" size={20} /> START SESSION
      </motion.button>
    </motion.div>
  );
}

function Scene3({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.morphExpand}>
      <div className="absolute inset-0 bg-teal-900/30 backdrop-blur-md" />
      <motion.div className="relative z-10 flex flex-col items-center"
        animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 2, repeat: Infinity }}>
        <Zap size={64} style={{ color: ACCENT }} className="mb-8" />
        <h2 className="text-6xl font-display font-black tracking-tighter text-white mb-6">Session Active</h2>
        <div className="glass-panel px-8 py-4 rounded-full border border-teal-500/30 flex gap-6 items-center">
          <span className="text-teal-400 font-mono text-2xl">24:59</span>
          <div className="w-px h-6 bg-white/20" />
          <span className="text-white/60">Apps Blocked</span>
        </div>
      </motion.div>
      
      {/* Pulse rings */}
      <motion.div className="absolute w-[600px] h-[600px] rounded-full border border-teal-500/20"
        animate={{ scale: [1, 1.5], opacity: [0.5, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }} />
      <motion.div className="absolute w-[600px] h-[600px] rounded-full border border-teal-500/20"
        animate={{ scale: [1, 1.5], opacity: [0.5, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeOut", delay: 1.5 }} />
    </motion.div>
  );
}

function Scene4({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.clipCircle}>
      <Trophy size={100} style={{ color: ACCENT }} className="mb-8" />
      <h2 className="text-7xl font-display font-black tracking-tighter text-white">
        Session Complete
      </h2>
      <p className="text-2xl text-teal-300 mt-6 font-mono">+25 Focus Minutes</p>
    </motion.div>
  );
}

function Scene5({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#08080f]" {...sceneTransitions.scaleFade}>
      <motion.div className="w-24 h-24 rounded-3xl bg-teal-500 flex items-center justify-center mb-6 shadow-[0_0_60px_rgba(20,184,166,0.4)]"
        animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity }}>
        <Timer size={48} className="text-black" />
      </motion.div>
      <h1 className="text-4xl font-display font-bold tracking-widest text-white mb-2 uppercase">FocusFlow</h1>
      <p className="text-teal-300 font-mono">Discipline Operating System</p>
    </motion.div>
  );
}

const SCENE_DURATIONS = { open: 4000, build: 6000, active: 5500, complete: 4500, close: 5000 };

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#08080f] text-white">
      <div className="absolute inset-0">
        <motion.div className="absolute w-[100vw] h-[100vh] opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #06b6d4 0%, transparent 60%)' }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />
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
