import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Trophy, Sparkles, Flame, Gift, ChevronLeft, ChevronRight, Zap, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { lotteryService } from '../services/lotteryService';
import { LotteryDraw } from '../types';
import { triggerHaptic } from '../utils/haptics';

interface LotteryTickerBarProps {
  lang: string;
  onOpenLottery: () => void;
}

interface TickerItem {
  id: string;
  type: 'jackpot' | 'winner' | 'new_draw' | 'promo' | 'hot_numbers';
  icon: React.ReactNode;
  badgeText: string;
  badgeColor: string;
  mainText: string;
  highlightText?: string;
  subText?: string;
  isNew?: boolean;
}

export const LotteryTickerBar: React.FC<LotteryTickerBarProps> = ({
  lang,
  onOpenLottery,
}) => {
  const isAr = lang === 'ar';
  const [activeDraw, setActiveDraw] = useState<LotteryDraw | null>(null);
  const [jackpotAmount, setJackpotAmount] = useState<number>(18500);
  const [dynamicItems, setDynamicItems] = useState<TickerItem[]>([]);
  const [showSuccessCheck, setShowSuccessCheck] = useState(false);

  // Initial base items
  const baseItems: TickerItem[] = useMemo(() => [
    {
      id: '1',
      type: 'jackpot',
      icon: <Trophy className="w-3.5 h-3.5 text-amber-300" />,
      badgeText: isAr ? 'الجائزة الكبرى المتراكمة' : 'JACKPOT POOL',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      mainText: isAr ? 'مجمع السحب المباشر وصل إلى' : 'Current Mega Jackpot:',
      highlightText: `$${jackpotAmount.toLocaleString('en-US')}`,
      subText: isAr ? 'فرصة الفوز بـ 5 أرقام + 2 نجوم' : 'Match 5 + 2 Lucky Stars',
    },
    {
      id: '2',
      type: 'winner',
      icon: <Sparkles className="w-3.5 h-3.5 text-yellow-300" />,
      badgeText: isAr ? 'أحدث الفائزين 👑' : 'LATEST WINNER 👑',
      badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      mainText: isAr ? 'مستخدم (+2010****)' : 'Player (+2010****)',
      highlightText: '$2,500.00',
      subText: isAr ? 'مطابقة 5 أرقام (المستوى الثاني)' : 'Match 5 Main Numbers',
    },
    {
      id: '3',
      type: 'new_draw',
      icon: <Flame className="w-3.5 h-3.5 text-rose-300" />,
      badgeText: isAr ? 'سحب جديد متاح الآن 🎟️' : 'NEW DRAW ACTIVE 🎟️',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      mainText: isAr ? (activeDraw?.titleAr || 'سحب VEX الذهبي الأسبوعي #88') : (activeDraw?.titleEn || 'VEX Weekly Mega Draw #88'),
      highlightText: '$1.00',
      subText: isAr ? 'سعر التذكرة $1 فقط' : 'Only $1 per ticket',
    },
    {
      id: '5',
      type: 'promo',
      icon: <Gift className="w-3.5 h-3.5 text-purple-300" />,
      badgeText: isAr ? 'بونص التكافل 🎁' : 'FREE TICKET PERK 🎁',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      mainText: isAr ? 'تذكرة لوتري مجانية هدية' : 'Free lottery ticket gifted',
      highlightText: isAr ? 'مع كل تعويض خسارة' : 'with every loss compensation',
      subText: isAr ? 'شبكة أمان واسترداد 100%' : '100% cashback guarantee',
    },
  ], [isAr, jackpotAmount, activeDraw]);

  // Set initial state
  useEffect(() => {
    setDynamicItems(baseItems);
  }, [baseItems]);

  useEffect(() => {
    let isMounted = true;
    lotteryService
      .getActiveDraw()
      .then((current) => {
        if (isMounted && current) {
          setActiveDraw(current);
          if (current.jackpotAmount) {
            setJackpotAmount(current.jackpotAmount);
          }
        }
      })
      .catch(() => {});

    // Dynamic subtle jackpot increase
    const jackpotInterval = setInterval(() => {
      setJackpotAmount((prev) => prev + Math.floor(Math.random() * 3) + 1);
    }, 4000);

    // Periodic simulation of new winners
    const winnerInterval = setInterval(() => {
      if (!isMounted) return;

      const randomId = Math.random().toString(36).substring(7);
      const newWinner: TickerItem = {
        id: `new-winner-${randomId}`,
        type: 'winner',
        icon: <Trophy className="w-3.5 h-3.5 text-emerald-300" />,
        badgeText: isAr ? 'فائز جديد! 🎊' : 'NEW WINNER! 🎊',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        mainText: isAr ? `مستخدم (+${Math.floor(Math.random() * 900) + 100}****)` : `Player (+${Math.floor(Math.random() * 900) + 100}****)`,
        highlightText: `$${(Math.floor(Math.random() * 10) * 100 + 50).toLocaleString()}.00`,
        subText: isAr ? 'فوز فوري في السحب' : 'Instant draw win',
        isNew: true,
      };

      setDynamicItems(prev => {
        const next = [newWinner, ...prev];
        // Keep it reasonably sized
        if (next.length > 10) return next.slice(0, 10);
        return next;
      });

      // Trigger success animation
      setShowSuccessCheck(true);
      triggerHaptic('success');
      setTimeout(() => setShowSuccessCheck(false), 3000);

    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(jackpotInterval);
      clearInterval(winnerInterval);
    };
  }, [isAr]);

  const handleTickerClick = () => {
    triggerHaptic('light');
    onOpenLottery();
  };

  const tickerAnimationClass = isAr ? 'animate-ticker-rtl' : 'animate-ticker-ltr';

  // Duplicate items for seamless loop
  const duplicatedItems = useMemo(() => [...dynamicItems, ...dynamicItems], [dynamicItems]);

  return (
    <div
      onClick={handleTickerClick}
      className="relative z-30 w-full h-8.5 bg-gradient-to-r from-slate-950 via-amber-950 to-slate-950 text-white border-b border-amber-500/25 shadow-xs select-none overflow-hidden flex items-center cursor-pointer group"
      role="marquee"
      aria-label={isAr ? 'شريط أخبار اليانصيب والفائزين المباشر' : 'Live Lottery and Winners Ticker'}
    >
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-yellow-500/10 to-amber-500/5 pointer-events-none" />

      {/* Leading Fixed Badge */}
      <div className="relative z-20 shrink-0 h-full flex items-center gap-1.5 px-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-[10px] sm:text-[11px] tracking-tight shadow-md border-r rtl:border-r-0 rtl:border-l border-amber-400">
        <AnimatePresence mode="wait">
          {showSuccessCheck ? (
            <motion.div
              key="success-check"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1.2, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              className="relative flex items-center justify-center"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-900" />
            </motion.div>
          ) : (
            <motion.div
              key="live-dot"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              <Trophy className="w-3.5 h-3.5 text-slate-950 shrink-0" />
            </motion.div>
          )}
        </AnimatePresence>
        <span className="whitespace-nowrap uppercase">
          {isAr ? 'مباشر | اللوتري' : 'LIVE LOTTERY'}
        </span>
      </div>

      {/* Scrolling Content Track */}
      <div className="relative flex-1 overflow-hidden h-full flex items-center">
        <div className={`${tickerAnimationClass} flex items-center py-1`}>
          {duplicatedItems.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              className="inline-flex items-center gap-2 px-4 whitespace-nowrap text-xs text-slate-200 border-r rtl:border-r-0 rtl:border-l border-white/10"
            >
              <motion.span
                animate={item.isNew && showSuccessCheck ? {
                  backgroundColor: ['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.3)', 'rgba(16, 185, 129, 0.1)'],
                  scale: [1, 1.05, 1],
                } : {}}
                transition={{ duration: 2, repeat: 1 }}
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${item.badgeColor}`}
              >
                {item.isNew && showSuccessCheck ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 animate-bounce" />
                ) : (
                  item.icon
                )}
                <span>{item.badgeText}</span>
              </motion.span>

              <span className="text-[11px] font-medium text-slate-300">
                {item.mainText}
              </span>

              {item.highlightText && (
                <span className="font-mono font-black text-amber-300 text-xs px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 tabular-nums">
                  {item.highlightText}
                </span>
              )}

              {item.subText && (
                <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                  ({item.subText})
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Trailing CTA */}
      <div className="relative z-20 shrink-0 h-full flex items-center px-2 bg-gradient-to-l from-slate-950 via-slate-950/90 to-transparent text-amber-400 font-bold text-[10px] gap-1 group-hover:text-amber-300 transition-colors">
        <span className="hidden xs:inline">{isAr ? 'العب الآن' : 'Play Now'}</span>
        {isAr ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </div>
    </div>
  );
};
