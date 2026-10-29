import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bot, User, X, ArrowLeft, MessageCircle } from 'lucide-react';
import type { Language } from '../types';
import { triggerHaptic } from '../utils/haptics';

export const TELEGRAM_BOT_URL = 'https://t.me/Vex_wallet_bot';
export const TELEGRAM_ACCOUNT_URL = 'https://t.me/doitxman';
export const WHATSAPP_URL = 'https://wa.me/201096849170?text=' + encodeURIComponent('أهلاً VEX 👋 عايز أتواصل معاكم');

interface TelegramContactButtonProps {
  lang: Language;
  /** Trigger button classes — the caller keeps its original styling. */
  className?: string;
  children: React.ReactNode;
}

/**
 * Contact trigger: instead of opening a single hardcoded target it shows a
 * chooser dialog so the client picks WhatsApp, the official Telegram bot
 * (@Vex_wallet_bot) or the direct account (@doitxman).
 */
export const TelegramContactButton: React.FC<TelegramContactButtonProps> = ({ lang, className, children }) => {
  const [open, setOpen] = useState(false);
  const isAr = lang === 'ar';

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          triggerHaptic('light');
          setOpen(true);
        }}
      >
        {children}
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[90] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true">
            <button
              type="button"
              aria-label={isAr ? 'إغلاق' : 'Close'}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
              onClick={close}
            />
            <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/70 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                  {isAr ? 'اختر طريقة التواصل' : 'Choose how to contact us'}
                </h3>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                  aria-label={isAr ? 'إغلاق' : 'Close'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    triggerHaptic('medium');
                    close();
                  }}
                  className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 px-4 py-3 text-white shadow-md transition-all active:scale-[0.98]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
                    <MessageCircle className="w-5 h-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black">
                      {isAr ? 'واتساب' : 'WhatsApp'}
                    </span>
                    <span className="block truncate text-[11px] font-bold text-white/85">
                      {isAr ? 'ردود فورية على مدار الساعة' : 'Instant replies, around the clock'} · +20 109 684 9170
                    </span>
                  </span>
                  <ArrowLeft className="w-4 h-4 shrink-0 opacity-80" />
                </a>

                <a
                  href={TELEGRAM_BOT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    triggerHaptic('medium');
                    close();
                  }}
                  className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 px-4 py-3 text-white shadow-md transition-all active:scale-[0.98]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
                    <Bot className="w-5 h-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black">
                      {isAr ? 'بوت VEX الرسمي' : 'Official VEX Bot'}
                    </span>
                    <span className="block truncate text-[11px] font-bold text-white/85">
                      {isAr ? 'ردود فورية وتحليلات مباريات' : 'Instant replies & match analysis'} · @Vex_wallet_bot
                    </span>
                  </span>
                  <ArrowLeft className="w-4 h-4 shrink-0 opacity-80" />
                </a>

                <a
                  href={TELEGRAM_ACCOUNT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    triggerHaptic('medium');
                    close();
                  }}
                  className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 px-4 py-3 text-white shadow-md transition-all active:scale-[0.98]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
                    <User className="w-5 h-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black">{isAr ? 'حساب مباشر' : 'Direct account'}</span>
                    <span className="block truncate text-[11px] font-bold text-white/85">
                      {isAr ? 'تواصل شخصي مع فريقنا' : 'Talk to a person'} · @doitxman
                    </span>
                  </span>
                  <ArrowLeft className="w-4 h-4 shrink-0 opacity-80" />
                </a>
              </div>

              <button
                type="button"
                onClick={close}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-black text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default TelegramContactButton;
