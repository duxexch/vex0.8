import React, { useEffect, useState, useMemo } from 'react';
import { Trophy, Sparkles, Flame, Gift, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
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
      badgeColor: 'text-amber-300 border-amber-500/40',
      mainText: isAr ? 'مجمع السحب المباشر وصل إلى' : 'Current Mega Jackpot:',
      highlightText: `$${jackpotAmount.toLocaleString('en-US')}`,
      subText: isAr ? 'فرصة الفوز بـ 5 أرقام + 2 نجوم' : 'Match 5 + 2 Lucky Stars',
    },
    {
      id: '2',
      type: 'winner',
      icon: <Sparkles className="w-3.5 h-3.5 text-yellow-300" />,
      badgeText: isAr ? 'أحدث الفائزين 👑' : 'LATEST WINNER 👑',
      badgeColor: 'text-yellow-300 border-yellow-500/40',
      mainText: isAr ? 'مستخدم (+2010****)' : 'Player (+2010****)',
      highlightText: '$2,500.00',
      subText: isAr ? 'مطابقة 5 أرقام (المستوى الثاني)' : 'Match 5 Main Numbers',
    },
    {
      id: '3',
      type: 'new_draw',
      icon: <Flame className="w-3.5 h-3.5 text-rose-300" />,
      badgeText: isAr ? 'سحب جديد متاح الآن 🎟️' : 'NEW DRAW ACTIVE 🎟️',
      badgeColor: 'text-rose-300 border-rose-500/40',
      mainText: isAr ? (activeDraw?.titleAr || 'سحب VEX الذهبي الأسبوعي #88') : (activeDraw?.titleEn || 'VEX Weekly Mega Draw #88'),
      highlightText: '$1.00',
      subText: isAr ? 'سعر التذكرة $1 فقط' : 'Only $1 per ticket',
    },
    {
      id: '5',
      type: 'promo',
      icon: <Gift className="w-3.5 h-3.5 text-purple-300" />,
      badgeText: isAr ? 'بونص التكافل 🎁' : 'FREE TICKET PERK 🎁',
      badgeColor: 'text-purple-300 border-purple-500/40',
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
        badgeColor: 'text-emerald-300 border-emerald-500/40',
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
      className="relative z-30 w-full h-9 bg-slate-950 text-white border-b border-amber-500/20 shadow-xs select-none overflow-hidden flex items-center cursor-pointer group"
      role="marquee"
      aria-label={isAr ? 'شريط أخبار اليانصيب والفائزين المباشر' : 'Live Lottery and Winners Ticker'}
    >
      {/* Premium gold hairline + ambient top glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(130%_160%_at_50%_-60%,rgba(245,158,11,0.14),transparent_62%)] pointer-events-none" />

      {/* Scrolling Content Track */}
      <div className="relative flex-1 overflow-hidden h-full flex items-center">
        {/* Start edge fade */}
        <div className="absolute inset-y-0 start-0 w-10 sm:w-14 z-10 pointer-events-none bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent rtl:bg-gradient-to-l" />

        <div className={`${tickerAnimationClass} flex items-center`}>
          {duplicatedItems.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              className="inline-flex items-center gap-2.5 px-4 whitespace-nowrap"
            >
              <motion.span
                animate={
                  item.isNew && showSuccessCheck
                    ? {
                        backgroundColor: ['rgba(255,255,255,0.06)', 'rgba(16,185,129,0.22)', 'rgba(255,255,255,0.06)'],
                        scale: [1, 1.05, 1],
                      }
                    : {}
                }
                transition={{ duration: 2, repeat: 1 }}
                className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide px-2 py-[3px] rounded-full border bg-white/[0.06] backdrop-blur-sm ${item.badgeColor}`}
              >
                {item.isNew && showSuccessCheck ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : (
                  item.icon
                )}
                <span>{item.badgeText}</span>
              </motion.span>

              <span className="text-[11.5px] font-medium text-slate-300">
                {item.mainText}
              </span>

              {item.highlightText && (
                <span className="font-mono font-black text-[12px] px-2 py-0.5 rounded-md bg-gradient-to-b from-amber-300 to-amber-400 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_6px_rgba(245,158,11,0.3)] tabular-nums">
                  {item.highlightText}
                </span>
              )}

              {item.subText && (
                <span className="text-[10.5px] text-slate-400 font-medium hidden sm:inline">
                  ({item.subText})
                </span>
              )}

              {/* Separator dot */}
              <span className="w-1 h-1 rounded-full bg-amber-400/55 ms-1.5" />
            </div>
          ))}
        </div>
      </div>

      {/* Trailing CTA */}
      <div className="relative z-20 shrink-0 h-full flex items-center gap-1 px-3 bg-gradient-to-r from-slate-950 via-slate-950/95 to-transparent rtl:bg-gradient-to-l text-amber-300 group-hover:text-amber-200 transition-colors">
        <span className="hidden sm:inline text-[10.5px] font-black tracking-wide">
          {isAr ? 'العب الآن' : 'Play Now'}
        </span>
        <motion.span
          animate={{ x: isAr ? [-1.5, 1.5, -1.5] : [1.5, -1.5, 1.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="flex items-center"
        >
          {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </motion.span>
      </div>
    </div>
  );
};
