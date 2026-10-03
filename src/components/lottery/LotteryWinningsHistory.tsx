import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  Calendar,
  Wallet,
  CheckCircle2,
  Clock,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  Receipt,
  X,
  FileCheck,
  Ticket,
  PartyPopper,
  Flame,
  Award
} from 'lucide-react';
import { Language, LotteryUserWonPrize } from '../../types';
import {
  triggerGoldenConfettiBurst,
  triggerJackpotCelebration,
  triggerPrizeWonCelebration
} from '../../utils/lotteryCelebration';

interface LotteryWinningsHistoryProps {
  lang: Language;
  wonPrizes: LotteryUserWonPrize[];
  onPlayClick?: () => void;
  onCopyToast?: (msg: string) => void;
}

export const LotteryWinningsHistory: React.FC<LotteryWinningsHistoryProps> = ({
  lang,
  wonPrizes,
  onPlayClick,
  onCopyToast,
}) => {
  const isAr = lang === 'ar';
  const [selectedReceipt, setSelectedReceipt] = useState<LotteryUserWonPrize | null>(null);
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);

  // Trigger celebratory confetti when winnings history mounts with prizes
  useEffect(() => {
    if (wonPrizes.length > 0) {
      const highestPrize = Math.max(...wonPrizes.map((p) => p.amountWon || 0));
      triggerPrizeWonCelebration(highestPrize);
    }
  }, [wonPrizes.length]);

  const handleOpenReceipt = (prize: LotteryUserWonPrize) => {
    setSelectedReceipt(prize);
    triggerPrizeWonCelebration(prize.amountWon, prize.tierId === 'tier1_jackpot');
  };

  const handleCelebrateManual = (prize: LotteryUserWonPrize, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerPrizeWonCelebration(prize.amountWon, prize.tierId === 'tier1_jackpot');
    if (onCopyToast) {
      onCopyToast(
        isAr
          ? `🎉 مبروك الفوز بجائزة [${prize.prizeNameAr}] بقيمة $${prize.amountWon.toFixed(2)}!`
          : `🎉 Congratulations on winning [${prize.prizeNameEn}] of $${prize.amountWon.toFixed(2)}!`
      );
    }
  };

  const totalWon = wonPrizes.reduce((acc, p) => acc + (p.amountWon || 0), 0);


  const handleCopyTx = (txRef: string) => {
    navigator.clipboard.writeText(txRef);
    setCopiedTxId(txRef);
    if (onCopyToast) {
      onCopyToast(isAr ? 'تم نسخ مرجع المعاملة بنجاح!' : 'Transaction ref copied!');
    }
    setTimeout(() => setCopiedTxId(null), 2000);
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getDeliveryStatusBadge = (status: LotteryUserWonPrize['deliveryStatus']) => {
    switch (status) {
      case 'deposited_to_wallet':
        return {
          label: isAr ? 'تم الإيداع الفوري بالمحفظة' : 'Deposited to Wallet',
          className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          icon: CheckCircle2,
        };
      case 'claimed_cash':
        return {
          label: isAr ? 'تم السحب النقدي' : 'Cash Withdrawn',
          className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
          icon: Wallet,
        };
      case 'claimed_free_tickets':
        return {
          label: isAr ? 'تم استلام تذاكر تكافل' : 'Solidarity Tickets Credited',
          className: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
          icon: Ticket,
        };
      default:
        return {
          label: isAr ? 'قيد المعالجة' : 'Pending Claim',
          className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          icon: Clock,
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner: Stats Overview */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 rounded-2xl p-4.5 border border-amber-500/30 shadow-lg text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-400 bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 rounded-full">
              <Trophy className="w-3.5 h-3.5" />
              {isAr ? 'سجل جوائز المستخدم السابقة' : 'Your Past Winning History'}
            </span>
            <h3 className="text-lg font-black tracking-tight text-white">
              {isAr ? 'الجوائز التي ربحتها في سحوبات VEX التكافلية' : 'Prizes Won in VEX Solidarity Draws'}
            </h3>
            <p className="text-xs text-slate-400 max-w-xl">
              {isAr
                ? 'توثيق كامل لكافة الجوائز التي فزت بها، ومواعيد الاستحقاق، وحالة الإيداع الفوري بدون اقتطاعات.'
                : 'Complete cryptographic log of your past lottery winnings, draw timestamps, and instant payout statuses.'}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2.5 sm:self-center">
            <div className="bg-slate-950/80 rounded-xl px-3.5 py-2 border border-slate-800 text-center min-w-[100px]">
              <span className="text-[10px] text-slate-400 font-bold block">{isAr ? 'إجمالي الأرباح' : 'Total Won'}</span>
              <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                ${totalWon.toFixed(2)}
              </span>
            </div>
            <div className="bg-slate-950/80 rounded-xl px-3.5 py-2 border border-slate-800 text-center min-w-[90px]">
              <span className="text-[10px] text-slate-400 font-bold block">{isAr ? 'عدد مرات الفوز' : 'Total Wins'}</span>
              <span className="text-base sm:text-lg font-black text-amber-400 font-mono">
                {wonPrizes.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* List of Won Prizes */}
      {wonPrizes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Trophy className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">
            {isAr ? 'لم تسجل أي جوائز فائزة حتى الآن' : 'No Previous Winnings Recorded Yet'}
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {isAr
              ? 'شارك في السحب القادم باختيار أرقامك أو استخدام تذاكر التكافل المجانية المتاحة لك لتبدأ بتسجيل أولى جوائزك!'
              : 'Participate in the upcoming draw or use your free compassion tickets to score your first win!'}
          </p>
          {onPlayClick && (
            <button
              onClick={onPlayClick}
              className="mt-2 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              {isAr ? 'العب واشترك في السحب الآن' : 'Play & Enter Next Draw'}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {wonPrizes.map((prize, idx) => {
            const badge = getDeliveryStatusBadge(prize.deliveryStatus);
            const BadgeIcon = badge.icon;

            return (
              <motion.div
                key={prize.id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 hover:border-amber-500/40 shadow-xs transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                          {isAr ? prize.prizeNameAr : prize.prizeNameEn}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          #{prize.drawNumber}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {isAr ? prize.drawTitleAr : prize.drawTitleEn}
                      </p>
                    </div>
                  </div>

                  {/* Won Amount */}
                  <div className="flex items-center gap-2 text-left rtl:text-right sm:text-right sm:rtl:text-left">
                    <button
                      onClick={(e) => handleCelebrateManual(prize, e)}
                      className="py-1 px-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-[10px] font-black flex items-center gap-1 transition-transform active:scale-95 cursor-pointer"
                      title={isAr ? 'احتفل بالفوز وأطلق الكونفيتي الذهبي!' : 'Celebrate win with golden confetti!'}
                    >
                      <PartyPopper className="w-3.5 h-3.5 animate-bounce text-amber-400" />
                      <span>{isAr ? 'احتفل 🎉' : 'Celebrate 🎉'}</span>
                    </button>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">
                        {isAr ? 'قيمة الجائزة' : 'Amount Won'}
                      </span>
                      <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        +${prize.amountWon.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details Grid: Date, Matched Numbers, and Delivery Status */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Date Column */}
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">{isAr ? 'تاريخ الفوز' : 'Date'}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                        {formatDate(prize.date)}
                      </span>
                    </div>
                  </div>

                  {/* Matched Numbers Column */}
                  <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">
                      {isAr ? 'الأرقام المطابقة:' : 'Matched Numbers:'}
                    </span>
                    <div className="flex items-center gap-1">
                      {prize.mainNumbers.map((n, i) => (
                        <span
                          key={i}
                          className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black font-mono flex items-center justify-center shadow-xs"
                        >
                          {n}
                        </span>
                      ))}
                      <span className="text-amber-500 font-bold text-xs">+</span>
                      {prize.luckyNumbers.map((n, i) => (
                        <span
                          key={i}
                          className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black font-mono flex items-center justify-center shadow-xs"
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Status Column */}
                  <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">{isAr ? 'حالة التسليم' : 'Delivery Status'}</span>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${badge.className}`}>
                        <BadgeIcon className="w-3 h-3" />
                        {badge.label}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenReceipt(prize)}
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                      title={isAr ? 'عرض الإيصال الرقمي والاحتفال' : 'View Receipt & Celebrate'}
                    >
                      <Receipt className="w-3.5 h-3.5 text-amber-500" />
                      <span className="hidden sm:inline">{isAr ? 'الإيصال' : 'Receipt'}</span>
                    </button>
                  </div>
                </div>

                {/* Footer Bar: Transaction Ref */}
                {prize.transactionRef && (
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    <div className="flex items-center gap-1.5 font-mono">
                      <span>{isAr ? 'مرجع التحويل:' : 'TX Ref:'}</span>
                      <span className="text-slate-700 dark:text-slate-300 font-bold">{prize.transactionRef}</span>
                      <button
                        onClick={() => handleCopyTx(prize.transactionRef!)}
                        className="p-0.5 hover:text-emerald-500 transition-colors"
                        title={isAr ? 'نسخ' : 'Copy'}
                      >
                        {copiedTxId === prize.transactionRef ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400" />
                        )}
                      </button>
                    </div>

                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      {isAr ? 'معتمد وموثق تشفيرياً' : 'Verified On-Chain/System'}
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Digital Receipt Modal */}
      <AnimatePresence>
        {selectedReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-white overflow-hidden space-y-4"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedReceipt(null)}
                className="absolute top-4 left-4 p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Receipt Header */}
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 mb-2">
                  <FileCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-white">
                  {isAr ? 'إيصال استحقاق وصرف الجائزة الرسمي' : 'Official Prize Payout Voucher'}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  {selectedReceipt.transactionRef || `VEX-TX-${selectedReceipt.id}`}
                </p>
              </div>

              {/* Receipt Body Card */}
              <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 divide-y divide-slate-800/80 text-xs space-y-2.5">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-slate-400">{isAr ? 'اسم الجائزة' : 'Prize Tier'}</span>
                  <span className="font-black text-amber-400">
                    {isAr ? selectedReceipt.prizeNameAr : selectedReceipt.prizeNameEn}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-400">{isAr ? 'السحب ورقم الدورة' : 'Draw & Round'}</span>
                  <span className="font-bold text-slate-200">
                    {isAr ? selectedReceipt.drawTitleAr : selectedReceipt.drawTitleEn} (#{selectedReceipt.drawNumber})
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-400">{isAr ? 'تاريخ ووقت السحب' : 'Draw Timestamp'}</span>
                  <span className="font-mono text-slate-300">{formatDate(selectedReceipt.date)}</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-400">{isAr ? 'المبلغ المودع الصافي' : 'Net Amount Deposited'}</span>
                  <span className="text-base font-black text-emerald-400 font-mono">
                    ${selectedReceipt.amountWon.toFixed(2)} USDT
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-400">{isAr ? 'حالة التسليم والصرف' : 'Delivery Status'}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                    <CheckCircle2 className="w-3 h-3" />
                    {isAr ? 'تم الإيداع 100% بنجاح بالمحفظة' : '100% Deposited Successfully'}
                  </span>
                </div>
              </div>

              {/* Verifiable Hash Badge */}
              <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  {isAr ? 'ضمان التشفير والنزاهة' : 'Cryptographic Guarantee'}
                </span>
                <span className="font-mono text-[10px] text-amber-300">SHA-256 PROVABLY FAIR</span>
              </div>

              {/* Action Buttons: Re-celebrate and Done */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => triggerPrizeWonCelebration(selectedReceipt.amountWon, selectedReceipt.tierId === 'tier1_jackpot')}
                  className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-transform active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <PartyPopper className="w-4 h-4 animate-bounce" />
                  <span>{isAr ? 'إعادة الاحتفال 🎊' : 'Celebrate Again 🎊'}</span>
                </button>

                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  {isAr ? 'تم، إغلاق الإيصال' : 'Done, Close Receipt'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
