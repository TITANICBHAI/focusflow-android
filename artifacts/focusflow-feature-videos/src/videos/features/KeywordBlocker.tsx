import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { sceneTransitions } from '@/lib/video/animations';
import { TextSelect, ShieldAlert, ScanSearch, Lock } from 'lucide-react';

const ACCENT = '#ec4899'; // Pink

function Scene1({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.scaleFade}>
      <TextSelect size={80} className="text-white/30 mb-8" strokeWidth={1} />
      <h1 className="text-5xl font-display font-bold tracking-tight mb-4 text-center max-w-3xl">
        Sometimes an app is fine... <br/>
        <span className="text-white/50">until it's not.</span>
      </h1>
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
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.perspectiveFlip}>
      <ScanSearch size={64} className="text-pink-500 mb-12" />
      
      <div className="glass-panel p-8 rounded-3xl max-w-2xl w-full text-2xl font-mono leading-relaxed">
        <p>I just started reading about </p>
        <div className="flex items-center gap-2 mt-2">
          <span>the latest </span>
          <span className="relative inline-block">
            <span className="relative z-10 text-white">#drama</span>
            {phase >= 1 && (
              <motion.span className="absolute inset-0 bg-red-500 rounded"
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.3 }} />
            )}
          </span>
          <span> on Twitter.</span>
        </div>
      </div>
      
      {phase >= 2 && (
        <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.6 }}>
          <div className="bg-red-500 text-white px-8 py-4 rounded-2xl font-bold text-3xl shadow-2xl flex items-center gap-4">
            <ShieldAlert /> KEYWORD DETECTED
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function Scene3({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.wipe}>
      <h2 className="text-5xl font-display font-bold mb-16">Trigger Instant Blocks</h2>
      
      <div className="flex gap-12">
        <motion.div className="flex flex-col items-center gap-4"
          initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <div className="w-24 h-24 rounded-2xl bg-white/10 flex items-center justify-center text-pink-400 font-mono text-xl">
            "reels"
          </div>
        </motion.div>
        <motion.div className="flex flex-col items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
          <div className="w-16 h-2 bg-pink-500 rounded-full" />
        </motion.div>
        <motion.div className="flex flex-col items-center gap-4"
          initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.2 }}>
          <div className="w-24 h-24 rounded-2xl bg-red-500/20 border border-red-500 flex items-center justify-center text-red-500">
            <Lock size={40} />
          </div>
        </motion.div>
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
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...sceneTransitions.clipCircle}>
      <h2 className="text-5xl font-display font-bold mb-12">Add Your Own Triggers</h2>
      
      <div className="glass-panel p-8 rounded-3xl w-full max-w-md">
        <div className="flex flex-col gap-4">
          {['tiktok', 'shorts', 'news', 'gossip', 'doomscroll'].map((word, i) => (
            <motion.div key={word} className="bg-white/5 px-6 py-4 rounded-xl flex justify-between items-center"
              initial={{ opacity: 0, x: -20 }}
              animate={phase >= 1 ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: i * 0.1 }}>
              <span className="font-mono text-pink-400">{word}</span>
              <div className="w-3 h-3 rounded-full bg-red-500" />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Scene5({ currentScene }: { currentScene: number }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#08080f]" {...sceneTransitions.scaleFade}>
      <motion.div className="w-24 h-24 rounded-3xl bg-pink-500 flex items-center justify-center mb-6 shadow-[0_0_60px_rgba(236,72,153,0.4)]"
        animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity }}>
        <ShieldAlert size={48} className="text-white" />
      </motion.div>
      <h1 className="text-4xl font-display font-bold tracking-widest text-white mb-2 uppercase">FocusFlow</h1>
      <p className="text-pink-300 font-mono">Discipline Operating System</p>
    </motion.div>
  );
}

const SCENE_DURATIONS = { open: 4000, trigger: 5500, mechanism: 5000, list: 5000, close: 4500 };

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#08080f] text-white">
      <div className="absolute inset-0">
        <div className="noise-overlay opacity-[0.05]" />
        <motion.div className="absolute bottom-0 left-[20%] w-[50vw] h-[50vw] opacity-10 bg-pink-600 blur-[100px] rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
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
