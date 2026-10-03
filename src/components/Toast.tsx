import React from 'react';
import { Check } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface ToastProps {
  message?: string | null;
  lang?: Language;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, lang = 'ar', onClose }) => {
  if (!message) return null;

  const t = TRANSLATIONS[lang] || TRANSLATIONS['ar'];
  const displayMsg = message === 'copied' ? t.copied : message;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-[100] animate-fade-in pointer-events-none"
    >
      <div className="bg-slate-900/95 dark:bg-slate-800/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 dark:border-slate-700 flex items-center gap-3 backdrop-blur-md pointer-events-auto">
        <div className="w-6 h-6 rounded-full bg-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </div>
        <span className="text-xs sm:text-sm font-bold tracking-tight text-white whitespace-nowrap">
          {displayMsg}
        </span>
      </div>
    </div>
  );
};
