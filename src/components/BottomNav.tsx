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
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 w-full select-none"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
      }}
    >
      <div className="w-full flex justify-around items-center max-w-md mx-auto px-1 pt-1.5 pb-0.5">
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
              className={`relative flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-1 rounded-xl transition-all duration-150 cursor-pointer active:scale-90 ${
                active ? 'text-emerald-700 font-extrabold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {/* Icon Container with subtle active pill */}
              <div
                className={`relative flex items-center justify-center w-10 h-7 rounded-full transition-all duration-150 ${
                  active ? 'bg-emerald-100/90 text-emerald-700 shadow-2xs' : 'text-slate-500'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-150 ${
                    active ? 'stroke-[2.5] scale-105' : 'stroke-[1.8]'
                  }`}
                />

                {/* Badge for notifications or pending requests */}
                {item.badge && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-xs tabular-nums">
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] mt-0.5 tracking-tight truncate max-w-[64px] ${
                  active ? 'font-black text-emerald-800' : 'font-medium text-slate-500'
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
