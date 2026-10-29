import React from 'react';
import { Language, TabType } from '../types';
import { triggerHaptic } from '../utils/haptics';
import {
  Building2,
  Wallet,
  TrendingUp,
  Trophy,
  Grid,
  History,
} from 'lucide-react';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  onOpenMoreSheet: () => void;
  lang: Language;
  pendingRequestsCount?: number;
  /** Wallet-app mode: only these sections are reachable from the bar. */
  allowedTabs?: TabType[];
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  onOpenMoreSheet,
  lang,
  pendingRequestsCount = 0,
  allowedTabs,
}) => {
  const isAr = lang === 'ar';

  const isMoreActive =
    activeTab === 'transfers' ||
    activeTab === 'activity' ||
    activeTab === 'referrals' ||
    activeTab === 'unlucky-wall';

  const navItems = [
    {
      id: 'companies' as TabType,
      label: isAr ? 'الشركات' : lang === 'es' ? 'Casas' : lang === 'ru' ? 'Компании' : 'Companies',
      icon: Building2,
      isActive: activeTab === 'companies',
      onClick: () => {
        triggerHaptic('light');
        onChangeTab('companies');
      },
    },
    {
      id: 'wallets' as TabType,
      label: isAr ? 'المحفظة' : lang === 'es' ? 'Billetera' : lang === 'ru' ? 'Кошелек' : 'Wallets',
      icon: Wallet,
      isActive: activeTab === 'wallets',
      onClick: () => {
        triggerHaptic('light');
        onChangeTab('wallets');
      },
    },
    {
      id: 'ai-sports' as TabType,
      label: isAr ? 'المباريات' : lang === 'es' ? 'Partidos' : lang === 'ru' ? 'Матчи' : 'Sports AI',
      icon: TrendingUp,
      isActive: activeTab === 'ai-sports',
      onClick: () => {
        triggerHaptic('light');
        onChangeTab('ai-sports');
      },
    },
    {
      id: 'lottery' as TabType,
      label: isAr ? 'اليانصيب' : lang === 'es' ? 'Lotería' : lang === 'ru' ? 'Лотерея' : 'Lottery',
      icon: Trophy,
      isActive: activeTab === 'lottery',
      onClick: () => {
        triggerHaptic('light');
        onChangeTab('lottery');
      },
    },
    {
      // Wallet-app home: the activity/claims log lives one tap away instead of
      // behind the hub sheet, since claims are the whole point of this build.
      // Only added when a restricted bar (wallet mode) is requested — the full
      // site keeps its original five cells with activity inside the hub sheet.
      id: 'activity' as TabType,
      label: isAr ? 'السجل' : lang === 'es' ? 'Historial' : lang === 'ru' ? 'История' : 'Activity',
      icon: History,
      isActive: activeTab === 'activity',
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
      onClick: () => {
        triggerHaptic('light');
        onChangeTab('activity');
      },
      walletOnly: true,
    },
    {
      id: 'more' as any,
      label: isAr ? 'المزيد' : lang === 'es' ? 'Más' : lang === 'ru' ? 'Ещё' : 'Hub',
      icon: Grid,
      isActive: isMoreActive,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
      onClick: () => {
        triggerHaptic('light');
        onOpenMoreSheet();
      },
    },
  ].filter((item) => {
    // The hub sheet stays reachable in wallet mode — it carries contact,
    // settings and account items the wallet needs. Only real sections clamp.
    if (item.id === 'more') return true;
    if ((item as any).walletOnly && !allowedTabs) return false;
    return !allowedTabs || allowedTabs.includes(item.id as TabType);
  });

  return (
    <nav
      id="bottom-nav"
      role="tablist"
      aria-label="App Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white w-full select-none border-t border-slate-200/70 shadow-[0_-0.5px_0_rgba(0,0,0,0.04)]"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 6px)',
      }}
    >
      {/* Telegram-style tab bar: equal cells, icon over label, color-only active state */}
      <div className="w-full flex items-stretch max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;

          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={active}
              aria-label={item.label}
              onClick={item.onClick}
              className={`relative flex-1 min-w-0 h-[54px] flex flex-col items-center justify-center gap-[3px] transition-colors duration-150 cursor-pointer active:opacity-50 ${
                active ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-500'
              }`}
            >
              {/* Icon */}
              <span className="relative flex items-center justify-center">
                <Icon
                  className={`w-[25px] h-[25px] transition-all duration-150 ${
                    active ? 'stroke-[2.4]' : 'stroke-[1.7]'
                  }`}
                />

                {/* Telegram-style red badge */}
                {item.badge && (
                  <span className="absolute -top-1 -right-2.5 min-w-[16px] h-[16px] px-1 bg-[#FF3B30] text-white text-[10px] font-semibold rounded-full flex items-center justify-center tabular-nums ring-2 ring-white">
                    {item.badge}
                  </span>
                )}
              </span>

              {/* Label */}
              <span
                className={`text-[10.5px] leading-none whitespace-nowrap ${
                  active ? 'font-semibold' : 'font-normal'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
