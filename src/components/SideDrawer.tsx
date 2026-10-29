import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  Wallet,
  TrendingUp,
  Trophy,
  ArrowRightLeft,
  Users,
  History,
  TrendingDown,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Phone,
  FileText,
  BellRing,
  Download,
  X,
  Check,
  MessageCircle,
  Send,
} from 'lucide-react';
import { Language, TabType } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { ensureWebPushSubscription } from '../services/pushService';
import { LANGUAGES } from './Header';
import TelegramContactButton from './TelegramContactButton';

const WA_CONTACT_URL = 'https://wa.me/201096849170?text=' + encodeURIComponent('أهلاً VEX 👋 عايز أتواصل معاكم');

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  activeTab: TabType;
  isPhoneVerified?: boolean;
  onSelectTab: (tab: TabType) => void;
  onOpenSettings: () => void;
  onOpenResponsibleGaming: () => void;
  onOpenLegalTerms: () => void;
  onOpenSecurityAnalysis: () => void;
  onOpenPhoneModal: () => void;
  onOpenNotifications: () => void;
  onInstallPwa?: () => void;
  isStandalone?: boolean;
  canInstallPwa?: boolean;
  onSelectLang: (lang: Language) => void;
  unreadNotificationsCount?: number;
  pendingRequestsCount?: number;
  /** Wallet-app mode: only these sections are offered in the menu. */
  allowedTabs?: TabType[];
}

/**
 * SideDrawer (redesign): the single menu that holds every navigation +
 * account / notifications / language control. The header only shows the
 * hamburger + brand; the bottom nav keeps the 5 primary tabs.
 * Light panel, slides from the inline-start edge (RTL aware).
 */
export const SideDrawer: React.FC<SideDrawerProps> = ({
  isOpen,
  onClose,
  lang,
  activeTab,
  isPhoneVerified = false,
  onSelectTab,
  onOpenSettings,
  onOpenResponsibleGaming,
  onOpenLegalTerms,
  onOpenSecurityAnalysis,
  onOpenPhoneModal,
  onOpenNotifications,
  onInstallPwa,
  isStandalone = false,
  canInstallPwa = true,
  onSelectLang,
  unreadNotificationsCount = 0,
  pendingRequestsCount = 0,
  allowedTabs,
}) => {
  const isAr = lang === 'ar';
  const isRtl = lang === 'ar';

  const [notifPerm, setNotifPerm] = useState<string>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  const togglePush = async () => {
    triggerHaptic('medium');
    if (!('Notification' in window)) return;
    try {
      const perm = await Notification.requestPermission();
      setNotifPerm(perm);
      if (perm === 'granted') {
        void ensureWebPushSubscription();
        new Notification('VEX Deals ⚡', {
          body: isAr
            ? 'تم تفعيل الإشعارات الفورية لتوقعات الذكاء الاصطناعي بنجاح!'
            : 'Push notifications for AI predictions activated successfully!',
          icon: '/icon-192.svg',
        });
      }
    } catch (err) {
      console.error('Notification permission error', err);
    }
  };

  const go = (tab: TabType) => {
    triggerHaptic('light');
    onSelectTab(tab);
    onClose();
  };

  const sectionTitle = (label: string) => (
    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 block">
      {label}
    </span>
  );

  const allTabItems: {
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    tile: string;
    badge?: number;
  }[] = [
    { id: 'companies', label: isAr ? 'الشركات' : 'Companies', icon: Building2, tile: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { id: 'wallets', label: isAr ? 'المحفظة' : 'Wallets', icon: Wallet, tile: 'text-sky-600 bg-sky-50 border-sky-200' },
    { id: 'ai-sports', label: isAr ? 'المباريات والذكاء' : 'Sports AI', icon: TrendingUp, tile: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { id: 'lottery', label: isAr ? 'اليانصيب' : 'Lottery', icon: Trophy, tile: 'text-amber-600 bg-amber-50 border-amber-200' },
    { id: 'transfers', label: isAr ? 'تحويل الرصيد الفوري' : 'Instant Transfers', icon: ArrowRightLeft, tile: 'text-teal-600 bg-teal-50 border-teal-200' },
    { id: 'referrals', label: isAr ? 'نظام الإحالات (10%)' : 'Referrals (10%)', icon: Users, tile: 'text-orange-600 bg-orange-50 border-orange-200' },
    { id: 'activity', label: isAr ? 'سجل النشاط وطلبات التعويض' : 'Activity & Claims', icon: History, tile: 'text-sky-600 bg-sky-50 border-sky-200', badge: pendingRequestsCount },
    { id: 'unlucky-wall', label: isAr ? 'مجتمع المنحوسين 😭' : 'Unlucky Wall 😭', icon: TrendingDown, tile: 'text-rose-600 bg-rose-50 border-rose-200' },
  ];
  // Wallet app build shows only its own sections; "more" stays reachable everywhere.
  const tabItems = allowedTabs ? allTabItems.filter((item) => allowedTabs.includes(item.id)) : allTabItems;

  const accountItems: {
    id: string;
    label: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
    tile: string;
    right?: React.ReactNode;
    onClick: () => void;
  }[] = [
    {
      id: 'settings',
      label: isAr ? 'إعدادات الحساب والعملة' : 'Account & Currency',
      desc: isAr ? 'تخصيص العملة، رمز PIN، وإدارة الحساب' : 'Currency, PIN code & preferences',
      icon: Settings,
      tile: 'text-slate-600 bg-slate-100 border-slate-200',
      onClick: () => { onClose(); onOpenSettings(); },
    },
    {
      id: 'security',
      label: isAr ? 'تدقيق الأمان المصرفي' : 'Security Audit',
      desc: isAr ? 'تشفير SHA-256 وحماية ضد الهجمات' : 'SHA-256 encryption & hardening',
      icon: ShieldAlert,
      tile: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      onClick: () => { onClose(); onOpenSecurityAnalysis(); },
    },
    {
      id: 'phone',
      label: isAr ? 'توثيق رقم الهاتف' : 'Phone Verification',
      desc: isPhoneVerified
        ? (isAr ? 'رقمك موثق بالفعل ✓' : 'Your phone is verified ✓')
        : (isAr ? 'وثق رقمك لتفعيل كل المزايا' : 'Verify your number to unlock features'),
      icon: Phone,
      tile: isPhoneVerified
        ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
        : 'text-amber-600 bg-amber-50 border-amber-200',
      right: isPhoneVerified ? (
        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
      ) : (
        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 shrink-0">
          {isAr ? 'الآن' : 'Now'}
        </span>
      ),
      onClick: () => { onClose(); onOpenPhoneModal(); },
    },
    {
      id: 'responsible',
      label: isAr ? 'اللعب المسؤول (+18)' : 'Responsible Gaming (18+)',
      desc: isAr ? 'معايير النزاهة وحماية اللاعبين' : 'Player safety & self-exclusion',
      icon: ShieldCheck,
      tile: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      onClick: () => { onClose(); onOpenResponsibleGaming(); },
    },
    {
      id: 'terms',
      label: isAr ? 'الشروط والسياسات' : 'Terms & Privacy',
      desc: isAr ? 'امتثال متجر التطبيقات وسياسة الخصوصية' : 'Store compliance & privacy policy',
      icon: FileText,
      tile: 'text-slate-600 bg-slate-100 border-slate-200',
      onClick: () => { onClose(); onOpenLegalTerms(); },
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] select-none" dir={isRtl ? 'rtl' : 'ltr'}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/55 backdrop-blur-[2px]"
          />

          {/* Panel — slides from the start edge */}
          <motion.aside
            initial={{ x: isRtl ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: isRtl ? '100%' : '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed inset-y-0 start-0 w-[87%] max-w-sm bg-white shadow-2xl border-e border-slate-200 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-900 tracking-tight truncate">
                  {isAr ? 'قائمة VEX' : 'VEX Menu'}
                </h3>
                <p className="text-[11px] text-slate-500 truncate">
                  {isAr ? 'كل الأقسام والأدوات في مكان واحد' : 'All sections & tools in one place'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={isAr ? 'إغلاق القائمة' : 'Close menu'}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
              {/* 1. Navigation */}
              <div className="space-y-1.5">
                {sectionTitle(isAr ? 'الأقسام' : 'Sections')}
                <div className="space-y-1">
                  {tabItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => go(item.id)}
                        className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-3 transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                          isActive
                            ? 'bg-emerald-50/90 border border-emerald-200 ring-1 ring-emerald-100'
                            : 'hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <span className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${item.tile}`}>
                          <Icon className="w-4.5 h-4.5" />
                        </span>
                        <span className={`text-xs truncate flex-1 text-start ${isActive ? 'font-black text-emerald-800' : 'font-bold text-slate-700'}`}>
                          {item.label}
                        </span>
                        {item.badge ? (
                          <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-black tabular-nums shrink-0">
                            {item.badge}
                          </span>
                        ) : (
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Account & Protection */}
              <div className="space-y-1.5">
                {sectionTitle(isAr ? 'الحساب والحماية' : 'Account & Protection')}
                <div className="space-y-1">
                  {accountItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={item.onClick}
                        className="w-full px-2.5 py-2 rounded-xl flex items-center gap-3 hover:bg-slate-50 border border-transparent transition-all duration-150 cursor-pointer active:scale-[0.98]"
                      >
                        <span className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${item.tile}`}>
                          <Icon className="w-4.5 h-4.5" />
                        </span>
                        <span className="min-w-0 flex-1 text-start">
                          <span className="text-xs font-bold text-slate-800 block truncate">{item.label}</span>
                          <span className="text-[10px] text-slate-500 block truncate">{item.desc}</span>
                        </span>
                        {item.right}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Notifications & App */}
              <div className="space-y-1.5">
                {sectionTitle(isAr ? 'الإشعارات والتطبيق' : 'Notifications & App')}
                <div className="space-y-1">
                  {/* Push toggle */}
                  <button
                    type="button"
                    onClick={togglePush}
                    className="w-full px-2.5 py-2 rounded-xl flex items-center gap-3 hover:bg-slate-50 border border-transparent transition-all duration-150 cursor-pointer active:scale-[0.98]"
                  >
                    <span className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 text-rose-600 bg-rose-50 border-rose-200">
                      <BellRing className="w-4.5 h-4.5" />
                    </span>
                    <span className="min-w-0 flex-1 text-start">
                      <span className="text-xs font-bold text-slate-800 block truncate">
                        {isAr ? 'الإشعارات الفورية' : 'Push Notifications'}
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate">
                        {notifPerm === 'granted'
                          ? (isAr ? 'مفعّلة على هذا الجهاز ✓' : 'Enabled on this device ✓')
                          : (isAr ? 'اضغط للتفعيل على الجهاز' : 'Tap to enable on device')}
                      </span>
                    </span>
                    <span
                      className={`w-9 h-5 rounded-full transition-all relative shrink-0 flex items-center ${
                        notifPerm === 'granted' ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full bg-white shadow-xs transition-all absolute ${
                          isRtl
                            ? notifPerm === 'granted' ? 'right-0.5' : 'right-[18px]'
                            : notifPerm === 'granted' ? 'left-[18px]' : 'left-0.5'
                        }`}
                      />
                    </span>
                  </button>

                  {/* Notification center */}
                  <button
                    type="button"
                    onClick={() => { triggerHaptic('light'); onClose(); onOpenNotifications(); }}
                    className="w-full px-2.5 py-2 rounded-xl flex items-center gap-3 hover:bg-slate-50 border border-transparent transition-all duration-150 cursor-pointer active:scale-[0.98]"
                  >
                    <span className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 text-sky-600 bg-sky-50 border-sky-200">
                      <BellRing className="w-4.5 h-4.5" />
                    </span>
                    <span className="min-w-0 flex-1 text-start">
                      <span className="text-xs font-bold text-slate-800 block truncate">
                        {isAr ? 'مركز الإشعارات' : 'Notification Center'}
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate">
                        {unreadNotificationsCount > 0
                          ? (isAr ? `لديك ${unreadNotificationsCount} غير مقروءة` : `${unreadNotificationsCount} unread`)
                          : (isAr ? 'آخر التوقعات والعروض' : 'Latest predictions & offers')}
                      </span>
                    </span>
                    {unreadNotificationsCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-black tabular-nums shrink-0">
                        {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                      </span>
                    )}
                  </button>

                  {/* Install app */}
                  {!isStandalone && canInstallPwa && onInstallPwa && (
                    <button
                      type="button"
                      onClick={() => { triggerHaptic('medium'); onClose(); onInstallPwa(); }}
                      className="w-full px-2.5 py-2 rounded-xl flex items-center gap-3 hover:bg-slate-50 border border-transparent transition-all duration-150 cursor-pointer active:scale-[0.98]"
                    >
                      <span className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 text-white bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-200">
                        <Download className="w-4.5 h-4.5" />
                      </span>
                      <span className="min-w-0 flex-1 text-start">
                        <span className="text-xs font-bold text-slate-800 block truncate">
                          {isAr ? 'تحميل التطبيق' : 'Download App'}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {isAr ? 'ثبّت VEX على شاشتك الرئيسية' : 'Install VEX on your home screen'}
                        </span>
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* 4. Contact Us — WhatsApp & Telegram */}
              <div className="space-y-1.5">
                {sectionTitle(isAr ? 'تواصل معنا' : 'Contact Us')}
                <div className="grid grid-cols-2 gap-2 px-0.5">
                  <a
                    href={WA_CONTACT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-gradient-to-br from-[#25D366] to-[#0f8f5a] text-white text-xs font-black shadow-xs shadow-black/10 [text-shadow:0_1px_1px_rgba(0,0,0,0.18)] transition-all active:scale-95 hover:brightness-110 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" />
                    <span>{isAr ? 'واتساب' : 'WhatsApp'}</span>
                  </a>
                  <TelegramContactButton
                    lang={lang}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white text-xs font-black shadow-xs shadow-black/10 [text-shadow:0_1px_1px_rgba(0,0,0,0.18)] transition-all active:scale-95 hover:brightness-110 cursor-pointer"
                  >
                    <Send className="w-4 h-4 shrink-0" />
                    <span>{isAr ? 'تيليجرام' : 'Telegram'}</span>
                  </TelegramContactButton>
                </div>
              </div>

              {/* 5. Language */}
              <div className="space-y-1.5">
                {sectionTitle(isAr ? 'اللغة' : 'Language')}
                <div className="grid grid-cols-4 gap-1.5 px-1">
                  {LANGUAGES.map((l) => {
                    const isActive = lang === l.code;
                    return (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          onSelectLang(l.code);
                        }}
                        className={`flex flex-col items-center gap-1 py-2 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                          isActive
                            ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-200'
                            : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-base leading-none">{l.flag}</span>
                        <span className={`text-[9px] font-black truncate max-w-full ${isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                          {l.short}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 18+ footer note */}
              <div className="pt-1 pb-2 text-center">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                  <span className="px-1 py-0.5 rounded border border-slate-300 font-black text-slate-500">18+</span>
                  {isAr ? 'العب بمسؤولية' : 'Play responsibly'}
                </span>
              </div>
            </div>

            {/* Safe-area spacer */}
            <div className="shrink-0" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }} />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SideDrawer;
