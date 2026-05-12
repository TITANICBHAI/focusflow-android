import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { sceneTransitions } from '@/lib/video/animations';
import { Wifi, ShieldAlert, Zap, Globe, Router } from 'lucide-react';

const ACCENT = '#ef4444'; // Red

function Scene1({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.scaleFade}>
      <Wifi size={80} className="text-white/30 mb-8" strokeWidth={1} />
      <h1 className="text-5xl font-display font-bold tracking-tight mb-4 text-center">
        Apps try to bypass <span style={{ color: ACCENT }}>Screen Blockers.</span>
      </h1>
      <p className="text-2xl text-white/50 text-center">Using notifications to pull you back in.</p>
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
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.splitHorizontal}>
      <h2 className="text-5xl font-display font-bold mb-16">Cut The Internet.</h2>
      
      <div className="flex items-center gap-8 relative">
        <div className="w-24 h-24 glass-panel rounded-2xl flex items-center justify-center">
          <Globe size={40} className="text-blue-400" />
        </div>
        
        {/* Connection lines */}
        <div className="flex flex-col gap-4 relative">
          <div className="w-48 h-1 bg-white/20 relative overflow-hidden">
            <motion.div className="absolute inset-y-0 left-0 bg-blue-400 w-1/3"
              animate={{ x: ['0%', '300%'] }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
          </div>
          <div className="w-48 h-1 bg-white/20 relative overflow-hidden">
            <motion.div className="absolute inset-y-0 left-0 bg-blue-400 w-1/3"
              animate={{ x: ['0%', '300%'] }} transition={{ duration: 1, repeat: Infinity, ease: 'linear', delay: 0.3 }} />
          </div>
          
          {phase >= 1 && (
            <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500 z-10"
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.6 }}>
              <ShieldAlert size={64} className="bg-[#08080f] rounded-full" />
            </motion.div>
          )}
        </div>
        
        <div className="w-24 h-24 glass-panel rounded-2xl flex items-center justify-center">
          <Router size={40} className="text-white/50" />
        </div>
      </div>
      
      {phase >= 2 && (
        <motion.p className="text-red-400 font-mono text-xl mt-12"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          CONNECTION SEVERED AT VPN LEVEL
        </motion.p>
      )}
    </motion.div>
  );
}

function Scene3({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.wipe}>
      <motion.div className="absolute inset-0 bg-red-900/20" />
      <Zap size={80} className="text-red-500 mb-8 relative z-10" />
      <h2 className="text-7xl font-display font-black tracking-tighter text-white relative z-10">
        Zero Bypass Possible.
      </h2>
      <p className="text-2xl text-red-200 mt-6 relative z-10">Works Offline. Total Lockdown.</p>
    </motion.div>
  );
}

function Scene4({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#08080f]" {...sceneTransitions.scaleFade}>
      <motion.div className="w-24 h-24 rounded-3xl bg-red-500 flex items-center justify-center mb-6 shadow-[0_0_60px_rgba(239,68,68,0.4)]"
        animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity }}>
        <ShieldAlert size={48} className="text-white" />
      </motion.div>
      <h1 className="text-4xl font-display font-bold tracking-widest text-white mb-2 uppercase">FocusFlow</h1>
      <p className="text-red-300 font-mono">Discipline Operating System</p>
    </motion.div>
  );
}

const SCENE_DURATIONS = { open: 4500, diagram: 6000, climax: 5000, close: 4500 };

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#08080f] text-white">
      <div className="absolute inset-0">
        <div className="noise-overlay" />
        <img src={`${import.meta.env.BASE_URL}images/bg-tech.png`} className="w-full h-full object-cover opacity-30 mix-blend-screen" alt="bg" />
        <motion.div className="absolute inset-0 bg-gradient-to-t from-[#08080f] via-transparent to-[#08080f]" />
      </div>

      <AnimatePresence mode="popLayout">
        {currentScene === 0 && <Scene1 key="s1" currentScene={currentScene} />}
        {currentScene === 1 && <Scene2 key="s2" currentScene={currentScene} />}
        {currentScene === 2 && <Scene3 key="s3" currentScene={currentScene} />}
        {currentScene === 3 && <Scene4 key="s4" currentScene={currentScene} />}
      </AnimatePresence>
    </div>
  );
}
