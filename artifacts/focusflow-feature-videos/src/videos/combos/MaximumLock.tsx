import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { sceneTransitions } from '@/lib/video/animations';
import { ShieldAlert, Ban, TextSelect, WifiOff, LockKeyhole, ShieldCheck } from 'lucide-react';

const ACCENT = '#ef4444'; // Red

function Scene1({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.scaleFade}>
      <ShieldAlert size={80} className="text-red-500 mb-8" strokeWidth={1} />
      <h1 className="text-6xl font-display font-bold tracking-tight mb-4 text-center">
        For <span style={{ color: ACCENT }}>Extreme Discipline</span> Needs.
      </h1>
      <p className="text-2xl text-white/50">Maximum Lock Mode.</p>
    </motion.div>
  );
}

function Scene2({ currentScene }: { currentScene: number }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.wipe}>
      <h2 className="text-4xl font-display font-bold mb-16 text-white/30">Layer 1</h2>
      <Ban size={80} className="text-red-400 mb-8" />
      <h3 className="text-6xl font-display font-black tracking-tighter mb-8">App Blocking</h3>
      <motion.div className="w-full max-w-2xl h-4 bg-red-500/20 rounded-full overflow-hidden"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {phase >= 1 && <motion.div className="h-full bg-red-500" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1 }} />}
      </motion.div>
      <p className="text-xl mt-8 text-white/50">Blocks distracting apps instantly.</p>
    </motion.div>
  );
}

function Scene3({ currentScene }: { currentScene: number }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.splitHorizontal}>
      <h2 className="text-4xl font-display font-bold mb-16 text-white/30">Layer 2</h2>
      <TextSelect size={80} className="text-red-500 mb-8" />
      <h3 className="text-6xl font-display font-black tracking-tighter mb-8">Keyword Scan</h3>
      <motion.div className="w-full max-w-2xl h-4 bg-red-500/20 rounded-full overflow-hidden flex gap-1"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="h-full bg-red-500 w-full" />
        {phase >= 1 && <motion.div className="h-full bg-red-600" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1 }} />}
      </motion.div>
      <p className="text-xl mt-8 text-white/50">Blocks if bad keywords appear on screen.</p>
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
      <h2 className="text-4xl font-display font-bold mb-16 text-white/30">Layer 3</h2>
      <WifiOff size={80} className="text-red-600 mb-8" />
      <h3 className="text-6xl font-display font-black tracking-tighter mb-8">VPN Shield</h3>
      <motion.div className="w-full max-w-2xl h-4 bg-red-500/20 rounded-full overflow-hidden flex gap-1"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="h-full bg-red-500 w-full" />
        <div className="h-full bg-red-600 w-full" />
        {phase >= 1 && <motion.div className="h-full bg-red-700" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1 }} />}
      </motion.div>
      <p className="text-xl mt-8 text-white/50">Cuts internet at the network level.</p>
    </motion.div>
  );
}

function Scene5({ currentScene }: { currentScene: number }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.morphExpand}>
      <h2 className="text-4xl font-display font-bold mb-16 text-white/30">Layer 4</h2>
      <LockKeyhole size={80} className="text-red-800 mb-8" />
      <h3 className="text-6xl font-display font-black tracking-tighter mb-8">Defense Wall</h3>
      <motion.div className="w-full max-w-2xl h-4 bg-red-500/20 rounded-full overflow-hidden flex gap-1"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="h-full bg-red-500 w-full" />
        <div className="h-full bg-red-600 w-full" />
        <div className="h-full bg-red-700 w-full" />
        {phase >= 1 && <motion.div className="h-full bg-red-900" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1 }} />}
      </motion.div>
      <p className="text-xl mt-8 text-white/50">Prevents uninstalls and bypass attempts.</p>
    </motion.div>
  );
}

function Scene6({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#08080f]" {...sceneTransitions.scaleFade}>
      <motion.div className="w-32 h-32 rounded-[2rem] bg-red-600 flex items-center justify-center mb-8 shadow-[0_0_100px_rgba(239,68,68,0.6)]"
        animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity }}>
        <ShieldCheck size={64} className="text-white" />
      </motion.div>
      <h1 className="text-7xl font-display font-black tracking-tighter text-white mb-4">Impossible To Cheat.</h1>
      <p className="text-2xl text-red-400 font-mono">Maximum Lock Active.</p>
    </motion.div>
  );
}

const SCENE_DURATIONS = { open: 4000, l1: 4500, l2: 4500, l3: 4500, l4: 4500, close: 5000 };

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#08080f] text-white">
      <div className="absolute inset-0">
        <div className="noise-overlay" />
        <motion.div className="absolute inset-0 bg-red-900/10" />
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
