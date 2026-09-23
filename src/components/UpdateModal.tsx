import { FC } from 'react';
import { Sparkles, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpdateModal: FC<UpdateModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-sm rounded-3xl border border-white/20 bg-[#0d1017] p-6 shadow-2xl z-10 text-center select-none"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="close"
          >
            <X size={16} />
          </button>

          {/* App icon badge */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 border border-white/20 shadow-inner">
            <Sparkles size={26} className="text-white" />
          </div>

          {/* Version badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/25 text-[11px] font-mono font-semibold mb-2">
            <span>v1.01</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          {/* Title */}
          <h2 className="text-lg font-bold text-white tracking-tight mb-2.5">
            naisuru is live!
          </h2>

          {/* Exact requested text */}
          <p className="text-xs text-gray-300 leading-relaxed font-sans px-2 mb-6">
            v1.01 came, so all minor bugs are fixed and the app is ready for use. enjoy!{' '}
            <span className="text-white font-mono font-semibold">(- @misiori)</span>
          </p>

          {/* Action button */}
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-white text-black hover:bg-gray-100 font-semibold text-xs tracking-tight transition active:scale-98 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer font-sans"
          >
            <Check size={14} />
            <span>let&apos;s go!</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
