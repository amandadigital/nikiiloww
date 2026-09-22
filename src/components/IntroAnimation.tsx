import { FC, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface IntroAnimationProps {
  onComplete: () => void;
}

export const IntroAnimation: FC<IntroAnimationProps> = ({ onComplete }) => {
  // Stages: 'welcome' -> 'compressing' -> 'circle' -> 'expanding' -> 'done'
  const [stage, setStage] = useState<'welcome' | 'compressing' | 'circle' | 'expanding' | 'done'>('welcome');

  useEffect(() => {
    // Timeline sequence:
    // 0ms - 1700ms: Welcome text + logo display
    // 1700ms - 2200ms: Compressing into small circle
    // 2200ms - 2500ms: Glowing dot pulse in center
    // 2500ms - 3200ms: App reveal expanding outwards from circle
    const t1 = setTimeout(() => {
      setStage('compressing');
    }, 1700);

    const t2 = setTimeout(() => {
      setStage('circle');
    }, 2200);

    const t3 = setTimeout(() => {
      setStage('expanding');
    }, 2500);

    const t4 = setTimeout(() => {
      setStage('done');
      onComplete();
    }, 3300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  const handleSkip = () => {
    setStage('done');
    onComplete();
  };

  if (stage === 'done') return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto select-none overflow-hidden bg-[#07090e]">
        {/* Background ambient glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.12),transparent_70%)]" />

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-6 right-6 z-20 text-[11px] tracking-widest uppercase font-mono text-gray-400/70 hover:text-gray-200 transition-colors px-3 py-1.5 rounded-full bg-white/5 border border-white/10"
        >
          skip
        </button>

        {/* Welcome content */}
        {(stage === 'welcome' || stage === 'compressing') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, filter: 'blur(8px)' }}
            animate={
              stage === 'welcome'
                ? { opacity: 1, scale: 1, filter: 'blur(0px)' }
                : { opacity: 0, scale: 0.15, filter: 'blur(10px)' }
            }
            transition={{
              duration: stage === 'welcome' ? 0.9 : 0.45,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="flex flex-col items-center justify-center text-center px-6 max-w-sm z-10"
          >
            {/* Logo */}
            <motion.div
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.7 }}
              className="relative w-16 h-16 mb-5"
            >
              <div className="absolute -inset-2 rounded-2xl bg-white/20 blur-lg" />
              <img
                src="https://startorigin2.vercel.app/icon.svg"
                alt="naisuru logo"
                className="relative w-full h-full rounded-2xl shadow-xl border border-white/10"
              />
            </motion.div>

            {/* Welcome title */}
            <motion.h1
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-2"
            >
              welcome to <span className="text-white font-bold">naisuru!</span>
            </motion.h1>

            {/* Subtext */}
            <motion.p
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 0.65 }}
              transition={{ delay: 0.45, duration: 0.7 }}
              className="text-xs font-mono text-gray-400 tracking-wide"
            >
              naisuru
            </motion.p>
          </motion.div>
        )}

        {/* Small glowing circle in the center */}
        {(stage === 'circle' || stage === 'expanding') && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={
              stage === 'circle'
                ? {
                    scale: [0.3, 1.15, 1],
                    opacity: 1,
                    boxShadow: '0 0 35px 8px rgba(255,255,255,0.85)',
                  }
                : {
                    scale: 65,
                    opacity: [1, 1, 0],
                    boxShadow: '0 0 100px 30px rgba(255,255,255,0.4)',
                  }
            }
            transition={
              stage === 'circle'
                ? { duration: 0.35, ease: 'easeOut' }
                : { duration: 0.75, ease: [0.22, 1, 0.36, 1] }
            }
            className="w-4 h-4 rounded-full bg-white z-10"
          />
        )}

        {/* Mask reveal curtain expanding out from the circle */}
        {stage === 'expanding' && (
          <motion.div
            initial={{ clipPath: 'circle(0px at 50% 50%)' }}
            animate={{ clipPath: 'circle(160vmax at 50% 50%)' }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 pointer-events-none bg-transparent"
          />
        )}
      </div>
    </AnimatePresence>
  );
};
