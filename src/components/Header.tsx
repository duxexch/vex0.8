import React, { useState, useEffect } from 'react';
import { Language, UserProfile, AppBranding, TabType } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { AppIconRenderer } from './AppIconRenderer';
import { triggerHaptic } from '../utils/haptics';
import { ShieldCheck, Phone, Menu } from 'lucide-react';

interface HeaderProps {
  userId: string;
  userProfile: UserProfile | null;
  lang: Language;
  themeMode?: string;
  appBranding: AppBranding;
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
  onOpenResponsibleGaming: () => void;
  onToggleTheme?: () => void;
  onSelectLang: (lang: Language) => void;
  onOpenPhoneModal: () => void;
  onOpenSettings: () => void;
  onOpenSecurityAnalysis: () => void;
  canInstallPwa?: boolean;
  onInstallPwa?: () => void;
  isStandalone?: boolean;
  activeTab?: TabType;
  onChangeTab?: (tab: TabType) => void;
  pendingRequestsCount?: number;
  onOpenMenu?: () => void;
}

export const LANGUAGES: { code: Language; label: string; flag: string; short: string }[] = [
  { code: 'ar', label: 'العربية', flag: '🇸🇦', short: 'عربي' },
  { code: 'en', label: 'English', flag: '🇺🇸', short: 'EN' },
  { code: 'es', label: 'Español', flag: '🇪🇸', short: 'ES' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺', short: 'RU' },
];

export const Header: React.FC<HeaderProps> = ({
  userId,
  userProfile,
  lang,
  appBranding,
  unreadNotificationsCount,
  onOpenResponsibleGaming,
  onOpenPhoneModal,
  onOpenMenu,
}) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS['ar'];
  const isAr = lang === 'ar';
  const isVerified = userProfile?.is_phone_verified;

  // Smart header (Phase 30): elevation state when content scrolls beneath.
  // Capture-phase listener catches the inner scroll container (scroll events don't bubble).
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let raf = 0;
    const onScrollCapture = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const top =
          typeof document.scrollingElement?.scrollTop === 'number'
            ? document.scrollingElement.scrollTop
            : 0;
        // Find any actively scrolling ancestor region: check the primary app scroller
        const scroller = document.querySelector<HTMLElement>('.overflow-y-auto');
        const st = scroller ? scroller.scrollTop : top;
        setScrolled(st > 6);
      });
    };
    window.addEventListener('scroll', onScrollCapture, { capture: true, passive: true });
    return () => {
      window.removeEventListener('scroll', onScrollCapture, { capture: true });
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
      <header
        className={`sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 text-slate-900 safe-area-top shadow-xs select-none transition-shadow duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          scrolled ? 'header-elevated' : ''
        }`}
      >
      {/* 1. Main Top App Bar Row: hamburger + brand (all actions live in the side drawer) */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 flex items-center gap-2 sm:gap-3">
        {/* Menu Trigger (Side Drawer) */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onOpenMenu?.();
          }}
          aria-label={isAr ? 'فتح القائمة' : 'Open menu'}
          className="relative w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-2xs shrink-0"
          title={isAr ? 'القائمة' : 'Menu'}
        >
          <Menu className="w-4.5 h-4.5" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-rose-600 text-white font-mono text-[9px] font-black flex items-center justify-center shadow-xs tabular-nums">
              {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
            </span>
          )}
        </button>

        {/* Left: Branding & Status Badges */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink-0">
          <div className="w-8 h-8 rounded-xl border border-slate-200/90 overflow-hidden shadow-xs shrink-0 flex items-center justify-center bg-slate-50">
            <AppIconRenderer branding={appBranding} size="sm" />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <h1 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight truncate max-w-[95px] sm:max-w-[180px] md:max-w-none">
              {appBranding?.appName || t.appName}
            </h1>

            {/* Responsible 18+ Badge */}
            <button
              onClick={onOpenResponsibleGaming}
              className="px-1.5 py-0.5 rounded-md bg-amber-50 text-[10px] font-black text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors shrink-0 cursor-pointer"
              title={t.responsibleGamingTitle}
            >
              18+
            </button>

            {/* Phone Verification Status Pill */}
            <button
              onClick={onOpenPhoneModal}
              className={`inline-flex items-center gap-1 h-6 text-[10px] px-2 rounded-full font-bold transition-all active:scale-95 shrink-0 cursor-pointer ${
                isVerified
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 animate-pulse'
              }`}
              title={isVerified ? (isAr ? 'حساب موثق برقم الهاتف' : 'Verified Phone') : (isAr ? 'اضغط لتوثيق رقم الهاتف' : 'Verify Phone')}
            >
              {isVerified ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Phone className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span className="hidden sm:inline">
                {isVerified ? (isAr ? 'موثق' : 'Verified') : (isAr ? 'توثيق' : 'Verify')}
              </span>
            </button>

            {/* ID Snippet */}
            <span className="hidden md:inline text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">
              #{userId.slice(0, 5)}
            </span>
          </div>
        </div>

      </div>
    </header>
  );
};
