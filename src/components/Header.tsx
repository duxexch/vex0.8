import React, { useState, useRef, useEffect } from 'react';
import { Language, UserProfile, AppBranding, TabType } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { AppIconRenderer } from './AppIconRenderer';
import { triggerHaptic } from '../utils/haptics';
import {
  ShieldCheck,
  Phone,
  Settings,
  Globe,
  Download,
  Bell,
  Check,
  Building2,
  Wallet,
  TrendingUp,
  ArrowRightLeft,
  Users,
  History,
  Trophy,
  Flame,
  ChevronDown,
} from 'lucide-react';

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
}

const LANGUAGES: { code: Language; label: string; flag: string; short: string }[] = [
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
  onOpenNotifications,
  onOpenResponsibleGaming,
  onSelectLang,
  onOpenPhoneModal,
  onOpenSettings,
  canInstallPwa,
  onInstallPwa,
  isStandalone = false,
  activeTab,
  onChangeTab,
  pendingRequestsCount = 0,
}) => {
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const tabButtonsRef = useRef<Record<string, HTMLButtonElement | null>>({});

  const t = TRANSLATIONS[lang] || TRANSLATIONS['ar'];
  const isAr = lang === 'ar';
  const isVerified = userProfile?.is_phone_verified;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Smoothly center the active category icon in the scrollable flex-row
  useEffect(() => {
    if (activeTab && tabButtonsRef.current[activeTab]) {
      tabButtonsRef.current[activeTab]?.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activeTab]);

  const currentLangObj = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  // All 8 sections - icons only, no scrolling, full access
  const navItems = [
    {
      id: 'companies' as TabType,
      label: isAr ? 'الشركات' : lang === 'es' ? 'Casas' : lang === 'ru' ? 'Компании' : 'Companies',
      icon: Building2,
      active: activeTab === 'companies',
    },
    {
      id: 'wallets' as TabType,
      label: isAr ? 'المحفظة' : lang === 'es' ? 'Billetera' : lang === 'ru' ? 'Кошелек' : 'Wallets',
      icon: Wallet,
      active: activeTab === 'wallets',
    },
    {
      id: 'ai-sports' as TabType,
      label: isAr ? 'المباريات والذكاء' : lang === 'es' ? 'Partidos e IA' : lang === 'ru' ? 'Матчи и ИИ' : 'Sports AI',
      icon: TrendingUp,
      active: activeTab === 'ai-sports',
    },
    {
      id: 'lottery' as TabType,
      label: isAr ? 'اليانصيب' : lang === 'es' ? 'Lotería' : lang === 'ru' ? 'Лотерея' : 'Lottery',
      icon: Trophy,
      active: activeTab === 'lottery',
      isGold: true,
    },
    {
      id: 'transfers' as TabType,
      label: isAr ? 'التحويلات' : lang === 'es' ? 'Transferencias' : lang === 'ru' ? 'Переводы' : 'Transfers',
      icon: ArrowRightLeft,
      active: activeTab === 'transfers',
    },
    {
      id: 'referrals' as TabType,
      label: isAr ? 'الإحالات (10%)' : lang === 'es' ? 'Referidos' : lang === 'ru' ? 'Рефералы' : 'Referrals (10%)',
      icon: Users,
      active: activeTab === 'referrals',
    },
    {
      id: 'activity' as TabType,
      label: isAr ? 'سجل النشاط' : lang === 'es' ? 'Actividad' : lang === 'ru' ? 'История' : 'Activity',
      icon: History,
      active: activeTab === 'activity',
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
    },
    {
      id: 'unlucky-wall' as TabType,
      label: isAr ? 'جدار النحس' : lang === 'es' ? 'Muro Pérdidas' : lang === 'ru' ? 'Стена неудач' : 'Unlucky Wall',
      icon: Flame,
      active: activeTab === 'unlucky-wall',
      isHot: true,
    },
  ];

  const handleTabClick = (tabId: TabType) => {
    triggerHaptic('light');
    if (onChangeTab) {
      onChangeTab(tabId);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 text-slate-900 safe-area-top shadow-xs select-none">
      {/* 1. Main Top App Bar Row */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Branding & Status Badges */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink-0">
          <div className="w-8 h-8 rounded-xl border border-slate-200/90 overflow-hidden shadow-xs shrink-0 flex items-center justify-center bg-slate-50">
            <AppIconRenderer branding={appBranding} size="sm" />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <h1 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight truncate max-w-[95px] xs:max-w-[130px] sm:max-w-[180px] md:max-w-none">
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
              <span className="hidden xs:inline">
                {isVerified ? (isAr ? 'موثق' : 'Verified') : (isAr ? 'توثيق' : 'Verify')}
              </span>
            </button>

            {/* ID Snippet */}
            <span className="hidden md:inline text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">
              #{userId.slice(0, 5)}
            </span>
          </div>
        </div>

        {/* Center: Desktop Navigation Bar (Large screens) */}
        {onChangeTab && (
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabClick(item.id)}
                  title={item.label}
                  className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    item.active
                      ? item.isHot
                        ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-xs font-black'
                        : item.isGold
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-xs font-black'
                        : 'bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200/80 font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      item.active
                        ? item.isHot || item.isGold
                          ? 'text-current'
                          : 'text-emerald-600'
                        : item.isHot
                        ? 'text-rose-500'
                        : item.isGold
                        ? 'text-amber-500'
                        : 'text-slate-500'
                    }`}
                  />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="min-w-[15px] h-[15px] px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Multi-Language Switcher */}
          <div ref={langMenuRef} className="relative">
            <button
              onClick={() => {
                triggerHaptic('light');
                setLangMenuOpen(!langMenuOpen);
              }}
              aria-label={t.languageSelect || 'Select Language'}
              className="h-8 px-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs"
              title={t.languageSelect}
            >
              <span>{currentLangObj.flag}</span>
              <span className="font-mono uppercase text-[10px]">{currentLangObj.short}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {langMenuOpen && (
              <div className="absolute top-full right-0 rtl:right-auto rtl:left-0 mt-1.5 w-36 bg-white border border-slate-200 rounded-xl shadow-xl p-1 z-50 animate-fade-in space-y-0.5">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      triggerHaptic('light');
                      onSelectLang(l.code);
                      setLangMenuOpen(false);
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-left rtl:text-right text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      lang === l.code
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{l.flag}</span>
                      <span>{l.label}</span>
                    </span>
                    {lang === l.code && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notification Bell */}
          <button
            onClick={() => {
              triggerHaptic('light');
              onOpenNotifications();
            }}
            aria-label={isAr ? 'الإشعارات والتنبيهات' : 'Notifications & Alerts'}
            className="relative w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all active:scale-95 border border-slate-200 flex items-center justify-center cursor-pointer shadow-2xs"
            title={isAr ? 'الإشعارات' : 'Notifications'}
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-rose-600 text-white font-mono text-[9px] font-black flex items-center justify-center shadow-xs tabular-nums animate-pulse">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* PWA Install Button (Shown on mobile browser, hidden in standalone) */}
          {!isStandalone && onInstallPwa && (
            <button
              onClick={() => {
                triggerHaptic('medium');
                onInstallPwa();
              }}
              aria-label={isAr ? 'تثبيت التطبيق على الهاتف' : 'Download App to Device'}
              className="w-8 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-xs transition-all active:scale-95 cursor-pointer"
              title={isAr ? 'تحميل التطبيق على الهاتف' : 'Download App'}
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Settings Modal Button */}
          <button
            onClick={() => {
              triggerHaptic('light');
              onOpenSettings();
            }}
            aria-label={isAr ? 'الإعدادات وإدارة الحساب' : 'Settings and Account'}
            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-2xs"
            title="Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Category Navigation Bar (Horizontal flex-row with overflow-x-auto & Icon Sets, No Text Labels) */}
      {onChangeTab && (
        <nav
          id="category-navigation"
          role="navigation"
          aria-label={isAr ? 'أقسام المنصة' : 'Category Navigation'}
          className="w-full bg-slate-50/95 border-t border-slate-200/80 px-2 py-1.5 select-none overflow-x-auto scrollbar-none overscroll-x-contain lg:hidden"
        >
          <div className="flex flex-row items-center gap-2 min-w-max mx-auto px-1 sm:justify-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.active;

              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    tabButtonsRef.current[item.id] = el;
                  }}
                  type="button"
                  onClick={() => handleTabClick(item.id)}
                  title={item.label}
                  aria-label={item.label}
                  className={`relative flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 rounded-2xl shrink-0 transition-all duration-150 cursor-pointer active:scale-90 ${
                    isActive
                      ? item.isHot
                        ? 'bg-gradient-to-tr from-rose-600 to-amber-500 text-white shadow-xs ring-2 ring-rose-400/40'
                        : item.isGold
                        ? 'bg-gradient-to-tr from-amber-400 to-yellow-400 text-slate-950 shadow-xs ring-2 ring-amber-400/40'
                        : 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/40'
                      : item.isHot
                      ? 'bg-rose-50/80 text-rose-600 hover:bg-rose-100 border border-rose-200/80 shadow-2xs'
                      : item.isGold
                      ? 'bg-amber-50/80 text-amber-700 hover:bg-amber-100 border border-amber-200/80 shadow-2xs'
                      : 'bg-white text-slate-600 hover:text-slate-950 hover:bg-slate-100 border border-slate-200/90 shadow-2xs'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-transform ${
                      isActive ? 'scale-110 stroke-[2.2]' : 'stroke-[1.8]'
                    }`}
                  />

                  {/* Active Indicator Underline Dot */}
                  {isActive && (
                    <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                  )}

                  {/* Pending Badge */}
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-0.5 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-xs tabular-nums border-2 border-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
};
