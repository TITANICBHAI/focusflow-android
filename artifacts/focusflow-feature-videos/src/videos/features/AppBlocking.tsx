import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { sceneTransitions } from '@/lib/video/animations';
import { Smartphone, Ban, ShieldAlert, CheckCircle2 } from 'lucide-react';

const ACCENT = '#6366f1'; // Indigo

function Scene1({ currentScene }: { currentScene: number }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 4500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.scaleFade}>
      <motion.div className="flex flex-col items-center" animate={phase >= 2 ? { y: -80 } : { y: 0 }} transition={{ duration: 1, ease: "circOut" }}>
        <Smartphone size={80} className="text-white/20 mb-6" strokeWidth={1} />
        <h1 className="text-6xl font-display font-bold tracking-tight mb-4 text-center">
          Distractions are <span className="text-brand-500">Everywhere</span>
        </h1>
      </motion.div>
      <motion.p className="text-2xl text-white/50 absolute top-[60%]"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.8 }}>
        Social media, games, infinite feeds.
      </motion.p>
    </motion.div>
  );
}

function Scene2({ currentScene }: { currentScene: number }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 4500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.wipe}>
      <div className="absolute inset-0 bg-brand-900/40" />
      <motion.h2 className="text-5xl font-display font-bold mb-12 relative z-10"
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        FocusFlow <span style={{ color: ACCENT }}>App Blocking</span>
      </motion.h2>
      
      <div className="flex gap-8 relative z-10">
        {['Instagram', 'TikTok', 'YouTube'].map((app, i) => (
          <motion.div key={app} 
            className="w-32 h-32 glass-panel rounded-2xl flex flex-col items-center justify-center gap-3 relative overflow-hidden"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.2 }}>
            <div className="w-12 h-12 rounded-xl bg-white/10" />
            <span className="text-sm font-mono">{app}</span>
            {phase >= 2 && (
              <motion.div className="absolute inset-0 bg-red-500/20 backdrop-blur-sm flex items-center justify-center"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.2 }}>
                <Ban className="text-red-500" size={40} />
              </motion.div>
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
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center z-10" {...sceneTransitions.morphExpand}>
      <motion.div className="w-[320px] h-[600px] border-[8px] border-white/10 rounded-[3rem] overflow-hidden relative bg-[#111]"
        initial={{ scale: 0.8, rotateY: 30, transformPerspective: 1000 }}
        animate={{ scale: 1.2, rotateY: 0 }}
        transition={{ duration: 1.5, ease: "circOut" }}>
        
        {/* Fake phone UI */}
        <div className="absolute inset-0 p-6 flex flex-col items-center justify-center">
          <motion.div className="w-20 h-20 bg-brand-500 rounded-3xl mb-8 flex items-center justify-center"
            initial={{ scale: 0 }} animate={phase >= 1 ? { scale: 1 } : { scale: 0 }} transition={{ type: "spring", bounce: 0.5 }}>
            <ShieldAlert size={40} className="text-white" />
          </motion.div>
          <motion.h3 className="text-2xl font-bold text-center mb-2"
            initial={{ opacity: 0, y: 10 }} animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}>
            App Blocked
          </motion.h3>
          <motion.p className="text-white/50 text-center text-sm mb-12"
            initial={{ opacity: 0 }} animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }} transition={{ delay: 0.2 }}>
            This app is restricted during your Focus Session.
          </motion.p>
        </div>
        
      </motion.div>
    </motion.div>
  );
}

function Scene4({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.clipCircle}>
      <motion.div className="absolute inset-0 bg-brand-600" />
      <CheckCircle2 size={100} className="text-white mb-8" />
      <h2 className="text-7xl font-display font-black tracking-tighter text-white">
        No Bypass.
      </h2>
      <h2 className="text-7xl font-display font-black tracking-tighter text-white/50 mt-2">
        No Excuses.
      </h2>
    </motion.div>
  );
}

function Scene5({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#08080f]" {...sceneTransitions.scaleFade}>
      <motion.div className="w-24 h-24 rounded-3xl bg-brand-500 flex items-center justify-center mb-6 shadow-[0_0_60px_rgba(99,102,241,0.4)]"
        animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity }}>
        <ShieldAlert size={48} className="text-white" />
      </motion.div>
      <h1 className="text-4xl font-display font-bold tracking-widest text-white mb-2 uppercase">FocusFlow</h1>
      <p className="text-brand-300 font-mono">Discipline Operating System</p>
    </motion.div>
  );
}

const SCENE_DURATIONS = { open: 5500, middle1: 6000, middle2: 6000, climax: 5000, close: 5000 };

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#08080f] text-white">
      {/* Background layer */}
      <div className="absolute inset-0">
        <motion.div className="absolute w-[80vw] h-[80vw] rounded-full opacity-20 blur-[100px]"
          style={{ background: `radial-gradient(circle, ${ACCENT}, transparent)` }}
          animate={{ x: ['-20%', '20%', '-10%'], y: ['-10%', '30%', '10%'] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }} />
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
