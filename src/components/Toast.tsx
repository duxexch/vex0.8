import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { EASE, MOTION } from '../motion/tokens';

interface ToastProps {
  message?: string | null;
  lang?: Language;
  onClose?: () => void;
}

/**
 * Toast (Phase 56): slide + fade + subtle scale in, clean exit.
 * Reduced-motion users get instant opacity-only transitions (MotionConfig reducedMotion="user").
 * Never bounces continuously; auto-dismiss behavior owned by the parent (message lifecycle).
 */
export const Toast: React.FC<ToastProps> = ({ message, lang = 'ar', onClose }) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS['ar'];
  const displayMsg = message === 'copied' ? t.copied : message;

  return (
    <div
      className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence>
        {displayMsg && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: MOTION.normal, ease: EASE.standard }}
            className="bg-slate-900/95 dark:bg-slate-800/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 dark:border-slate-700 flex items-center gap-3 backdrop-blur-md pointer-events-auto"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />
            </div>
            <span className="text-xs sm:text-sm font-bold tracking-tight text-white whitespace-nowrap">
              {displayMsg}
            </span>
            {onClose && (
              <button
                onClick={onClose}
                aria-label="Close"
                className="ms-1 w-5 h-5 rounded-md text-slate-400 hover:text-white transition-colors"
              >
                ×
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
