import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { sceneTransitions } from '@/lib/video/animations';
import { Shield, Smartphone, Trash2, Power, Terminal, LockKeyhole } from 'lucide-react';

const ACCENT = '#f97316'; // Orange

function Scene1({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.scaleFade}>
      <Shield size={80} className="text-white/30 mb-8" strokeWidth={1} />
      <h1 className="text-6xl font-display font-bold tracking-tight mb-4 text-center">
        Clever users try to <br/><span style={{ color: ACCENT }}>Bypass Blockers.</span>
      </h1>
      <p className="text-2xl text-white/50 text-center">We planned for that.</p>
    </motion.div>
  );
}

function Scene2({ currentScene }: { currentScene: number }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.perspectiveFlip}>
      <h2 className="text-5xl font-display font-bold mb-16">The Bypass Attempts</h2>
      
      <div className="flex gap-12">
        <motion.div className="glass-panel p-8 rounded-2xl flex flex-col items-center w-64"
          initial={{ opacity: 0, y: 50 }} animate={phase >= 1 ? { opacity: 1, y: 0 } : {}} transition={{ type: 'spring' }}>
          <Trash2 size={48} className="text-red-500 mb-4" />
          <h3 className="text-xl font-bold">Uninstall</h3>
        </motion.div>
        
        <motion.div className="glass-panel p-8 rounded-2xl flex flex-col items-center w-64"
          initial={{ opacity: 0, y: 50 }} animate={phase >= 2 ? { opacity: 1, y: 0 } : {}} transition={{ type: 'spring' }}>
          <Power size={48} className="text-yellow-500 mb-4" />
          <h3 className="text-xl font-bold">Power Menu</h3>
        </motion.div>
        
        <motion.div className="glass-panel p-8 rounded-2xl flex flex-col items-center w-64"
          initial={{ opacity: 0, y: 50 }} animate={phase >= 3 ? { opacity: 1, y: 0 } : {}} transition={{ type: 'spring' }}>
          <Terminal size={48} className="text-orange-500 mb-4" />
          <h3 className="text-xl font-bold">ADB/Developer</h3>
        </motion.div>
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
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.wipe}>
      <div className="absolute inset-0 bg-orange-900/20" />
      
      <h2 className="text-6xl font-display font-bold mb-16 relative z-10 text-center">
        FocusFlow <span className="text-orange-500">Blocks</span> <br/> All Of These.
      </h2>
      
      <div className="relative z-10 flex items-center justify-center">
        <motion.div className="w-48 h-48 rounded-full border-[12px] border-orange-500 flex items-center justify-center bg-[#111]"
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
          <Shield size={64} className="text-orange-500" />
        </motion.div>
        
        {phase >= 1 && (
          <>
            <motion.div className="absolute left-[-150px] top-[20px] bg-red-500/20 text-red-500 px-6 py-2 rounded-full font-bold"
              initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>Uninstall Blocked</motion.div>
            <motion.div className="absolute right-[-150px] top-[20px] bg-yellow-500/20 text-yellow-500 px-6 py-2 rounded-full font-bold"
              initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>Reboot Blocked</motion.div>
            <motion.div className="absolute bottom-[-80px] bg-orange-500/20 text-orange-500 px-6 py-2 rounded-full font-bold"
              initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>ADB Blocked</motion.div>
          </>
        )}
      </div>
    </motion.div>
  );
}

function Scene4({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex items-center justify-center z-10" {...sceneTransitions.clipCircle}>
      <div className="flex gap-16 items-center w-full max-w-5xl px-12">
        <div className="flex-1">
          <LockKeyhole size={80} className="text-orange-500 mb-8" />
          <h2 className="text-6xl font-display font-black tracking-tighter text-white mb-6 leading-tight">
            Your Willpower, <br/>Locked In.
          </h2>
          <p className="text-2xl text-white/50">Protected by Random PIN generation. No turning back.</p>
        </div>
        
        <motion.div className="w-80 glass-panel rounded-[3rem] p-8 border-t border-white/20"
          initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1 }}>
          <div className="text-center mb-8">
            <h3 className="text-lg font-bold">Enter PIN to Unlock</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[1,2,3,4,5,6,7,8,9].map(n => (
              <div key={n} className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-xl font-mono">{n}</div>
            ))}
            <div className="col-start-2 w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-xl font-mono">0</div>
          </div>
          <div className="h-12 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold border border-orange-500/50">
            RANDOM PIN ACTIVE
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function Scene5({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#08080f]" {...sceneTransitions.scaleFade}>
      <motion.div className="w-24 h-24 rounded-3xl bg-orange-500 flex items-center justify-center mb-6 shadow-[0_0_60px_rgba(249,115,22,0.4)]"
        animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity }}>
        <Shield size={48} className="text-black" />
      </motion.div>
      <h1 className="text-4xl font-display font-bold tracking-widest text-white mb-2 uppercase">FocusFlow</h1>
      <p className="text-orange-300 font-mono">Discipline Operating System</p>
    </motion.div>
  );
}

const SCENE_DURATIONS = { open: 4500, attempts: 5500, blocked: 5500, pin: 5000, close: 4500 };

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#08080f] text-white">
      <div className="absolute inset-0">
        <div className="noise-overlay" />
        <motion.div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] opacity-10 bg-orange-600 blur-[120px] rounded-full"
          animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />
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
