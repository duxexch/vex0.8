import React from 'react';
import { Language, TabType } from '../types';
import { triggerHaptic } from '../utils/haptics';
import {
  Building2,
  Wallet,
  TrendingUp,
  Trophy,
  Grid,
} from 'lucide-react';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  onOpenMoreSheet: () => void;
  lang: Language;
  pendingRequestsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  onOpenMoreSheet,
  lang,
  pendingRequestsCount = 0,
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
  ];

  return (
    <nav
      id="bottom-nav"
      role="tablist"
      aria-label="App Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 w-full select-none"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
      }}
    >
      <div className="w-full flex justify-around items-stretch max-w-lg mx-auto px-1 pt-1.5 pb-0.5">
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
              className={`relative flex-1 min-w-0 flex flex-col items-center justify-center gap-1 min-h-[50px] py-1.5 px-0.5 rounded-lg transition-all duration-150 cursor-pointer active:scale-90 ${
                active ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {/* Icon (Telegram-style: color-only active state, no pill) */}
              <span className="relative flex items-center justify-center">
                <Icon
                  className={`w-[22px] h-[22px] transition-all duration-150 ${
                    active ? 'stroke-[2.3] scale-105' : 'stroke-[1.7]'
                  }`}
                />

                {/* Badge for notifications or pending requests */}
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-0.5 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-xs tabular-nums">
                    {item.badge}
                  </span>
                )}
              </span>

              {/* Label */}
              <span
                className={`text-[10px] leading-none tracking-tight truncate max-w-[72px] ${
                  active ? 'font-bold text-emerald-700' : 'font-medium text-slate-400'
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
