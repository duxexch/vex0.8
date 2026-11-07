import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BellRing,
  Check,
  CheckCircle2,
  Gift,
  Info,
  ShieldAlert,
  Sparkles,
  Trophy,
  XCircle,
} from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { EASE, MOTION } from '../motion/tokens';

export interface ToastMeta {
  /** Big line — usually the notification title. */
  title?: string;
  /** Secondary line — the notification body. */
  message?: string;
  /** Notification category → picks icon + accent color. */
  category?: string;
  /** 'success' (default) | 'info' | 'error' | 'warning' */
  variant?: 'success' | 'info' | 'error' | 'warning';
}

interface ToastProps {
  message?: string | null;
  meta?: ToastMeta | null;
  lang?: Language;
  onClose?: () => void;
}

interface Skin {
  icon: React.ComponentType<{ className?: string }>;
  tile: string;
}

const SKINS: Record<string, Skin> = {
  success: { icon: Check, tile: 'bg-emerald-500/20 text-emerald-400' },
  info: { icon: Info, tile: 'bg-sky-500/20 text-sky-400' },
  error: { icon: XCircle, tile: 'bg-rose-500/20 text-rose-400' },
  warning: { icon: ShieldAlert, tile: 'bg-amber-500/20 text-amber-400' },
  // Notification-category skins (professional alert cards)
  ai_prediction: { icon: Sparkles, tile: 'bg-violet-500/20 text-violet-300' },
  prediction_settlement: { icon: Trophy, tile: 'bg-amber-500/20 text-amber-300' },
  promotion: { icon: Gift, tile: 'bg-fuchsia-500/20 text-fuchsia-300' },
  bonus: { icon: Gift, tile: 'bg-fuchsia-500/20 text-fuchsia-300' },
  compensation: { icon: CheckCircle2, tile: 'bg-emerald-500/20 text-emerald-300' },
  security: { icon: ShieldAlert, tile: 'bg-rose-500/20 text-rose-300' },
  general: { icon: BellRing, tile: 'bg-sky-500/20 text-sky-300' },
};

/**
 * Toast: one card, two rendering modes —
 *   • plain copy-confirm (message only, legacy behavior unchanged)
 *   • professional notification card (title + body + category icon/accent)
 * Slide + fade + subtle scale in, clean exit; reduced-motion gets opacity-only.
 */
export const Toast: React.FC<ToastProps> = ({ message, meta, lang = 'ar', onClose }) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS['ar'];
  const legacyMsg = message === 'copied' ? t.copied : message;

  const title = meta?.title?.trim();
  const body = meta?.message?.trim();
  const isAlert = Boolean(title || body);

  // Category wins over generic variant for the skin.
  const skinKey =
    (meta?.category && SKINS[meta.category] && meta.category) ||
    (meta?.variant && SKINS[meta.variant]) ||
    (isAlert ? 'general' : 'success');
  const skin = SKINS[skinKey] || SKINS.success;
  const Icon = skin.icon;

  const displayMsg = isAlert ? null : legacyMsg;
  const visible = Boolean(displayMsg || (isAlert && (title || body)));

  return (
    <div
      className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-[100] pointer-events-none w-[min(92vw,420px)]"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence>
        {visible && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: MOTION.normal, ease: EASE.standard }}
            className={`bg-slate-900/95 dark:bg-slate-800/95 text-white rounded-2xl shadow-2xl border border-slate-700/80 dark:border-slate-700 flex items-start gap-3 backdrop-blur-md pointer-events-auto overflow-hidden ${
              isAlert ? 'p-3.5' : 'px-5 py-3 items-center'
            }`}
          >
            {/* Accent rail — color follows the category */}
            {isAlert && <div className={`w-1 self-stretch rounded-full shrink-0 ${skin.tile.split(' ')[0]}`} />}

            <div
              className={`shrink-0 flex items-center justify-center rounded-full ${
                isAlert ? 'w-9 h-9 ' + skin.tile : 'w-6 h-6 ' + skin.tile
              }`}
            >
              <Icon className={isAlert ? 'w-4.5 h-4.5' : 'w-3.5 h-3.5 stroke-[3]'} aria-hidden="true" />
            </div>

            <div className="min-w-0 flex-1">
              {isAlert && title && (
                <p className="text-[13px] font-black tracking-tight text-white leading-snug truncate">{title}</p>
              )}
              <p
                className={`text-white leading-snug text-balance ${
                  isAlert
                    ? `${title ? 'text-[11.5px] font-medium text-slate-300 mt-0.5' : 'text-xs font-bold'} line-clamp-3`
                    : 'text-xs sm:text-sm font-bold tracking-tight max-w-[80vw]'
                }`}
              >
                {isAlert ? body || title : displayMsg}
              </p>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                aria-label="Close"
                className="ms-1 w-5 h-5 rounded-md text-slate-400 hover:text-white transition-colors shrink-0"
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
