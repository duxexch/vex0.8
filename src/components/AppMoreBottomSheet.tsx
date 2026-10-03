import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRightLeft,
  History,
  Users,
  TrendingDown,
  ShieldCheck,
  FileText,
  ShieldAlert,
  Settings,
  X,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Language, TabType } from '../types';

interface AppMoreBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenSettings: () => void;
  onOpenResponsibleGaming: () => void;
  onOpenLegalTerms: () => void;
  onOpenSecurityAnalysis: () => void;
  pendingRequestsCount?: number;
}

export const AppMoreBottomSheet: React.FC<AppMoreBottomSheetProps> = ({
  isOpen,
  onClose,
  lang,
  activeTab,
  onSelectTab,
  onOpenSettings,
  onOpenResponsibleGaming,
  onOpenLegalTerms,
  onOpenSecurityAnalysis,
  pendingRequestsCount = 0,
}) => {
  const isAr = lang === 'ar';

  const menuSections = [
    {
      title: isAr ? 'الخدمات المالية والمعاملات' : 'Financial Hub',
      items: [
        {
          id: 'transfers' as TabType,
          label: isAr ? 'تحويل الرصيد الفوري' : 'Instant Transfers',
          desc: isAr ? 'تحويل آمن بين محافظ المنصات برمز OTP' : 'Transfer balance between partner wallets',
          icon: ArrowRightLeft,
          color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
          onClick: () => {
            onSelectTab('transfers');
            onClose();
          },
        },
        {
          id: 'activity' as TabType,
          label: isAr ? 'سجل النشاط وطلبات التعويض' : 'Activity & History',
          desc: isAr ? 'متابعة تدقيق طلبات فك التجميد واسترداد الخسائر' : 'Track compensation requests & unfreezes',
          icon: History,
          badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
          color: 'text-sky-600 bg-sky-50 border-sky-200',
          onClick: () => {
            onSelectTab('activity');
            onClose();
          },
        },
        {
          id: 'referrals' as TabType,
          label: isAr ? 'نظام الإحالات (10% فك تجميد)' : 'Referral Rewards (10%)',
          desc: isAr ? 'شارك كود إحالتك وافتح 10% من رصيدك المجمد' : 'Earn rewards & unfreeze balance with friends',
          icon: Users,
          color: 'text-amber-600 bg-amber-50 border-amber-200',
          onClick: () => {
            onSelectTab('referrals');
            onClose();
          },
        },
        {
          id: 'unlucky-wall' as TabType,
          label: isAr ? 'مجتمع المنحوسين 😭' : 'Unlucky Bets Wall 😭',
          desc: isAr ? 'شارك أسوأ خسارة في الثواني الأخيرة لتعويضها' : 'Share last-minute losses & win free cashback',
          icon: TrendingDown,
          color: 'text-rose-600 bg-rose-50 border-rose-200',
          onClick: () => {
            onSelectTab('unlucky-wall');
            onClose();
          },
        },
      ],
    },
    {
      title: isAr ? 'الحماية والمعايير الرسمية' : 'Compliance & Settings',
      items: [
        {
          id: 'settings',
          label: isAr ? 'إعدادات الحساب والعملة' : 'Account & Currency Settings',
          desc: isAr ? 'تخصيص العملة، رمز PIN، وإدارة الحساب' : 'Display currency, PIN code, and preferences',
          icon: Settings,
          color: 'text-slate-600 bg-slate-100 border-slate-200',
          onClick: () => {
            onClose();
            onOpenSettings();
          },
        },
        {
          id: 'responsible',
          label: isAr ? 'اللعب المسؤول (+18)' : 'Responsible Gaming (+18)',
          desc: isAr ? 'معايير النزاهة وحماية اللاعبين والإرشاد' : 'Player safety standards and self-exclusion',
          icon: ShieldCheck,
          color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
          onClick: () => {
            onClose();
            onOpenResponsibleGaming();
          },
        },
        {
          id: 'security',
          label: isAr ? 'تدقيق الأمان المصرفي' : 'Security & Vulnerability Audit',
          desc: isAr ? 'حماية ضد الهجمات، تشفير SHA-256، وحصانة' : 'SHA-256 encryption, rate-limiting & integrity',
          icon: ShieldAlert,
          color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
          onClick: () => {
            onClose();
            onOpenSecurityAnalysis();
          },
        },
        {
          id: 'terms',
          label: isAr ? 'الشروط والسياسات' : 'Terms & Privacy Policy',
          desc: isAr ? 'امتثال متجر التطبيقات وإرشادات آبل وجوجل' : 'Store compliance & Apple Guideline 5.1.1',
          icon: FileText,
          color: 'text-slate-600 bg-slate-100 border-slate-200',
          onClick: () => {
            onClose();
            onOpenLegalTerms();
          },
        },
      ],
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
          />

          {/* Bottom Sheet Modal Container */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/90 z-10 max-h-[85vh] flex flex-col overflow-hidden"
            style={{
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
            }}
          >
            {/* Native Drag Handle Bar */}
            <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing">
              <span className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 py-2.5 flex items-center justify-between border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  {isAr ? 'مركز الخدمات والأقسام' : 'App Hub & Services'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isAr ? 'الوصول السريع إلى كافة أدوات وخدمات المنصة' : 'Quick access to all platform features'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {menuSections.map((sec, sIdx) => (
                <div key={sIdx} className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 block">
                    {sec.title}
                  </span>
                  <div className="space-y-1.5">
                    {sec.items.map((item) => {
                      const Icon = item.icon;
                      const isCurrent = activeTab === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.onClick}
                          className={`w-full p-3 rounded-2xl border text-start flex items-center justify-between gap-3 transition-all duration-150 cursor-pointer active:scale-98 ${
                            isCurrent
                              ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-200'
                              : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/80'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${item.color}`}
                            >
                              <Icon className="w-5 h-5" />
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-xs text-slate-900 truncate">
                                  {item.label}
                                </span>
                                {item.badge && (
                                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-black tabular-nums">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 block truncate">
                                {item.desc}
                              </span>
                            </div>
                          </div>

                          <ChevronRight className="w-4 h-4 text-slate-400 rtl:rotate-180 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
