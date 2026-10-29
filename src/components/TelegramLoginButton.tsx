import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Send, ShieldCheck, UserCheck } from 'lucide-react';
import type { Language } from '../types';
import { vexApi } from '../services/api';
import { triggerHaptic } from '../utils/haptics';

interface TelegramLoginButtonProps {
  lang: Language;
  /** Fired after the server accepted the widget payload and the session is live. */
  onLoggedIn?: () => void;
  className?: string;
  /** Compact variant for tight cards. */
  compact?: boolean;
}

interface WidgetConfig {
  bot_username: string;
  bot_id: number | string;
  origin: string;
}

interface TgAuthUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

/**
 * "Sign in with a normal Telegram account" — official Telegram Login Widget.
 *
 * Flow: fetch bot config → mount Telegram's own iframe button → Telegram
 * posts a signed payload back → we forward it to POST /api/telegram/login
 * where the HMAC is verified server-side and the session cookie is issued.
 * No phone number, no OTP — the Telegram account itself is the registration.
 */
export const TelegramLoginButton: React.FC<TelegramLoginButtonProps> = ({
  lang,
  onLoggedIn,
  className,
  compact = false,
}) => {
  const isAr = lang === 'ar';
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'signing' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const handledRef = useRef(false);

  // 1) Ask our server for the bot identity the widget must mount against.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/telegram/auth-url');
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !data.success || !data.bot_id) {
          setStatus('error');
          setErrorMsg(
            data.error === 'BOT_NOT_CONFIGURED'
              ? isAr ? 'بوت التليجرام غير مفعّل حالياً.' : 'The Telegram bot is not active right now.'
              : isAr ? 'تعذّر تجهيز تسجيل الدخول، حاول لاحقاً.' : 'Could not prepare sign-in, try again later.'
          );
          return;
        }
        setConfig({ bot_username: data.bot_username || '', bot_id: data.bot_id, origin: data.origin || window.location.origin });
      } catch {
        if (!cancelled) {
          setStatus('error');
          setErrorMsg(isAr ? 'تعذّر الاتصال بالخادم.' : 'Could not reach the server.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAr]);

  const handleAuth = useCallback(
    async (user: TgAuthUser) => {
      if (handledRef.current) return;
      handledRef.current = true;
      setStatus('signing');
      triggerHaptic('medium');
      try {
        await vexApi.loginWithTelegram(user as unknown as Record<string, unknown>);
        setSignedIn(true);
        setStatus('ready');
        onLoggedIn?.();
      } catch (err: any) {
        handledRef.current = false;
        setStatus('error');
        setErrorMsg(
          err?.message === 'TELEGRAM_HASH_INVALID'
            ? isAr ? 'فشل التحقق من هوية تليجرام، حاول مرة أخرى.' : 'Telegram verification failed, please retry.'
            : isAr ? 'تعذّر تسجيل الدخول، حاول مرة أخرى.' : 'Sign-in failed, please retry.'
        );
      }
    },
    [isAr, onLoggedIn]
  );

  // 2) Mount Telegram's widget script once the bot config arrives.
  useEffect(() => {
    if (!config || !mountRef.current || signedIn) return;
    const container = mountRef.current;
    const w = window as any;
    // Telegram's script invokes this global callback with the signed payload.
    w.onTelegramAuth = (user: TgAuthUser) => {
      void handleAuth(user);
    };

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-bot-id', String(config.bot_id));
    if (config.bot_username) script.setAttribute('data-telegram-login', config.bot_username);
    script.setAttribute('data-size', compact ? 'medium' : 'large');
    script.setAttribute('data-userpic', 'false');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-language', isAr ? 'ar' : lang === 'ru' ? 'ru' : lang === 'es' ? 'es' : 'en');
    script.setAttribute('data-radius', '12');

    let cancelled = false;
    script.onload = () => {
      if (!cancelled) setStatus('ready');
    };
    script.onerror = () => {
      if (cancelled) return;
      setStatus('error');
      setErrorMsg(isAr ? 'تعذّر تحميل زر تليجرام، تأكد من الاتصال.' : 'Could not load the Telegram button.');
    };

    container.innerHTML = '';
    container.appendChild(script);
    // The widget needs a beat to render; if nothing appears, surface an error.
    const fallback = window.setTimeout(() => {
      if (!cancelled && status === 'loading' && !container.querySelector('iframe')) {
        setStatus('error');
        setErrorMsg(isAr ? 'تعذّر تحميل زر تليجرام، تأكد من الاتصال.' : 'Could not load the Telegram button.');
      }
    }, 12000);

    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
      delete w.onTelegramAuth;
      container.innerHTML = '';
    };
  }, [config, signedIn, compact, isAr, lang, status, handleAuth]);

  if (signedIn) {
    return (
      <div
        className={`flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-emerald-800 ${className || ''}`}
      >
        <UserCheck className="h-4 w-4 shrink-0" />
        <span className="text-xs font-black">
          {isAr ? 'تم تسجيل الدخول بحساب تليجرام بنجاح ✓' : 'Signed in with Telegram ✓'}
        </span>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-2 flex items-start gap-2">
        <Send className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
        <div className="min-w-0">
          <p className="text-xs font-black text-slate-900">
            {isAr ? 'سجّل دخولك بحساب تليجرام' : 'Sign in with your Telegram account'}
          </p>
          <p className="text-[11px] leading-relaxed text-slate-500">
            {isAr
              ? 'بدون رقم هاتف وبدون رمز تحقق — حساب تليجرام العادي كافي، ومحفظتك تتبعك في أي جهاز.'
              : 'No phone number or OTP needed — your normal Telegram account is enough, and your wallet follows you to any device.'}
          </p>
        </div>
      </div>

      {status === 'loading' && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs font-bold text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
          {isAr ? 'جارٍ تجهيز تسجيل الدخول…' : 'Preparing sign-in…'}
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs font-bold text-amber-800">
          {errorMsg}
        </div>
      )}

      {(status === 'ready' || status === 'signing') && (
        <div className="rounded-xl border border-slate-200 bg-white p-2">
          {status === 'signing' && (
            <div className="mb-1.5 flex items-center gap-2 px-1 text-[11px] font-bold text-sky-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {isAr ? 'جارٍ التحقق من الحساب…' : 'Verifying your account…'}
            </div>
          )}
          {/* Telegram injects its own button into this mount point */}
          <div ref={mountRef} className="flex min-h-[42px] items-center justify-center" />
        </div>
      )}

      <p className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-slate-400">
        <ShieldCheck className="h-3 w-3" />
        {isAr
          ? 'محمي بتوقيع HMAC من تليجرام — لا نرى كلمة مرورك أبداً.'
          : 'Protected by Telegram’s HMAC signature — we never see your password.'}
      </p>
    </div>
  );
};

export default TelegramLoginButton;
