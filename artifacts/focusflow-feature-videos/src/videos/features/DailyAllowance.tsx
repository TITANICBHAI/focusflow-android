import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { sceneTransitions } from '@/lib/video/animations';
import { Clock, Hourglass, Shield, AlertTriangle } from 'lucide-react';

const ACCENT = '#f59e0b'; // Amber

function Scene1({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.scaleFade}>
      <Clock size={80} className="text-white/30 mb-8" strokeWidth={1} />
      <h1 className="text-5xl font-display font-bold tracking-tight mb-4">
        How long do you spend on <span style={{ color: ACCENT }}>Instagram?</span>
      </h1>
      <p className="text-2xl text-white/50">Probably more than you think.</p>
    </motion.div>
  );
}

function Scene2({ currentScene }: { currentScene: number }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 2000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.wipe}>
      <h2 className="text-4xl font-display font-bold mb-16">Set Time Budgets</h2>
      
      <div className="w-full max-w-2xl flex flex-col gap-6">
        {[
          { name: 'Instagram', time: '30 min/day', percent: '60%' },
          { name: 'TikTok', time: '15 min/day', percent: '30%' },
          { name: 'YouTube', time: '60 min/day', percent: '90%' }
        ].map((app, i) => (
          <motion.div key={app.name} className="glass-panel p-6 rounded-2xl flex flex-col gap-4"
            initial={{ opacity: 0, x: -50 }}
            animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            transition={{ delay: i * 0.2, type: 'spring' }}>
            <div className="flex justify-between items-center">
              <span className="font-bold text-xl">{app.name}</span>
              <span className="font-mono text-amber-500">{app.time}</span>
            </div>
            {phase >= 2 && (
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <motion.div className="h-full bg-amber-500"
                  initial={{ width: 0 }}
                  animate={{ width: app.percent }}
                  transition={{ duration: 1.5, delay: i * 0.3, ease: 'easeOut' }} />
              </div>
            )}
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
      setTimeout(() => setPhase(1), 1000),
      setTimeout(() => setPhase(2), 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.splitHorizontal}>
      <Hourglass size={64} className="text-amber-500 mb-8" />
      <h2 className="text-5xl font-display font-bold mb-12">Budget Draining...</h2>
      
      <div className="relative w-full max-w-3xl h-16 glass-panel rounded-full overflow-hidden flex items-center px-6">
        <motion.div className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-600 to-amber-400"
          initial={{ width: '80%' }}
          animate={{ width: '10%' }}
          transition={{ duration: 4, ease: 'linear' }} />
        <div className="relative z-10 flex justify-between w-full font-mono text-xl font-bold text-white mix-blend-difference">
          <span>Instagram Allowance</span>
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1, repeat: Infinity }}>
            2 min remaining
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
}

function Scene4({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.morphExpand}>
      <div className="absolute inset-0 bg-red-900/40" />
      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}>
        <AlertTriangle size={120} className="text-red-500 mb-8" />
      </motion.div>
      <h2 className="text-7xl font-display font-black tracking-tighter text-white">
        Time's Up.
      </h2>
      <p className="text-2xl text-red-300 mt-6">App Auto-Blocked for the rest of the day.</p>
    </motion.div>
  );
}

function Scene5({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#08080f]" {...sceneTransitions.scaleFade}>
      <motion.div className="w-24 h-24 rounded-3xl bg-amber-500 flex items-center justify-center mb-6 shadow-[0_0_60px_rgba(245,158,11,0.4)]"
        animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity }}>
        <Shield size={48} className="text-black" />
      </motion.div>
      <h1 className="text-4xl font-display font-bold tracking-widest text-white mb-2 uppercase">FocusFlow</h1>
      <p className="text-amber-300 font-mono">Discipline Operating System</p>
    </motion.div>
  );
}

const SCENE_DURATIONS = { open: 4000, build: 6000, drain: 6000, locked: 4500, close: 4500 };

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#08080f] text-white">
      <div className="absolute inset-0">
        <motion.div className="absolute top-0 right-0 w-[60vw] h-[60vw] opacity-10 bg-amber-500 blur-[120px] rounded-full"
          animate={{ x: ['10%', '-10%', '10%'], y: ['-10%', '10%', '-10%'] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
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
