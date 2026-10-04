import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Sparkles, 
  ShieldCheck, 
  Info, 
  X, 
  CheckCircle2, 
  Zap, 
  ArrowRight,
  ExternalLink,
  Lock,
  Wallet
} from 'lucide-react';
import { Language, LotteryPrizeTier } from '../../types';
import { DEFAULT_PRIZE_TIERS } from '../../services/lotteryService';

interface LotteryPrizeCardsProps {
  lang: Language;
  currentPool?: number;
  onSelectPlay?: () => void;
}

export const LotteryPrizeCards: React.FC<LotteryPrizeCardsProps> = ({
  lang,
  currentPool = 18450.0,
  onSelectPlay,
}) => {
  const isAr = lang === 'ar';
  const [selectedPrizeTier, setSelectedPrizeTier] = useState<LotteryPrizeTier | null>(null);

  return (
    <div className="space-y-4">
      {/* Header with Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>{isAr ? 'كروت ومستويات الجوائز الشفافة' : 'Transparent Prize Tiers & Odds'}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAr
              ? 'توزيع جوائز مدعوم بالشفافية التشفيرية، مع إيداع تلقائي فوري 100% في المحفظة بدون أي رسوم خفية.'
              : 'Cryptographically backed prize pool with 100% instant wallet credit and zero hidden deductions.'}
          </p>
        </div>

        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full w-fit">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          {isAr ? 'سحب مشفر مثبت النزاهة' : 'Provably Fair SHA-256'}
        </span>
      </div>

      {/* Glassmorphism Prize Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {DEFAULT_PRIZE_TIERS.map((tier, idx) => {
          const isJackpot = tier.id === 'tier1_jackpot';
          const calculatedAmount = tier.fixedPrize 
            ? tier.fixedPrize 
            : tier.guaranteedAmount 
              ? Math.max(tier.guaranteedAmount, Math.round((currentPool * (tier.sharePercent || 0)) / 100))
              : Math.round((currentPool * (tier.sharePercent || 0)) / 100);

          return (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`relative overflow-hidden rounded-2xl p-4.5 transition-all duration-300 group flex flex-col justify-between spotlight-surface tilt-card-3d ${
                isJackpot
                  ? 'bg-gradient-to-br from-amber-950/40 via-slate-900/80 to-slate-950/90 backdrop-blur-xl border-2 border-amber-500/60 shadow-xl shadow-amber-500/10 hover:border-amber-400'
                  : 'bg-gradient-to-br from-slate-900/70 via-slate-900/60 to-slate-950/80 backdrop-blur-xl border border-white/10 dark:border-slate-800/80 hover:border-amber-500/40 shadow-lg shadow-black/20'
              }`}
            >
              {/* Glass subtle light sheen */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-transparent pointer-events-none" />

              {/* Ambient Glow for Jackpot */}
              {isJackpot && (
                <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
              )}

              <div>
                {/* Top Badge & Match Balls */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                      isJackpot
                        ? 'bg-amber-500 text-slate-950 shadow-xs shadow-amber-500/50'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {isJackpot && <Sparkles className="w-3 h-3 text-slate-950" />}
                    {isAr ? tier.nameAr.split('(')[0].trim() : tier.nameEn.split('(')[0].trim()}
                  </span>

                  <span className="text-[10px] font-mono text-amber-300/90 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-md font-bold tabular-nums">
                    {tier.odds || (isAr ? 'فرصة ربح عالية' : 'High win odds')}
                  </span>
                </div>

                {/* Match Requirements Ball Pills */}
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="text-[11px] font-bold text-slate-400">
                    {isAr ? 'المطابقة المطلوبة:' : 'Required Match:'}
                  </span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: tier.matchMain }).map((_, i) => (
                      <span
                        key={`m-${i}`}
                        className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black font-mono flex items-center justify-center shadow-xs border border-blue-400"
                        title={isAr ? 'رقم رئيسي' : 'Main Number'}
                      >
                        {i + 1}
                      </span>
                    ))}
                    {tier.matchLucky > 0 && (
                      <>
                        <span className="text-amber-400 font-bold text-xs mx-0.5">+</span>
                        {Array.from({ length: tier.matchLucky }).map((_, i) => (
                          <span
                            key={`l-${i}`}
                            className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 text-[10px] font-black font-mono flex items-center justify-center shadow-xs border border-amber-300"
                            title={isAr ? 'نجمة الحظ الذهبية' : 'Lucky Star'}
                          >
                            ★
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* Amount / Prize Value */}
                <div className="mb-3.5 bg-slate-950/60 rounded-xl p-2.5 border border-white/5 flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">
                      {isJackpot 
                        ? (isAr ? 'الجائزة الكبرى المضمونة' : 'Guaranteed Min Jackpot') 
                        : (isAr ? 'قيمة الجائزة التقديرية' : 'Estimated Prize')}
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono tracking-tight">
                      ${calculatedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {tier.sharePercent && (
                    <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">
                      {tier.sharePercent}% {isAr ? 'من المجمع' : 'of Pool'}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Footer: Instant Payout & Details Button */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    {isAr ? 'صرف فوري 100% للمحفظة' : 'Instant 100% Wallet Credit'}
                  </span>
                  <span className="text-[10px] text-slate-400">0% عمولة</span>
                </div>

                {/* Button: تفاصيل الجائزة */}
                <button
                  onClick={() => setSelectedPrizeTier(tier)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 border border-slate-700/80 hover:border-amber-500/50 cursor-pointer shadow-xs"
                >
                  <Info className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isAr ? 'تفاصيل الجائزة والشروط' : 'Prize Details & Rules'}</span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Prize Details Modal */}
      <AnimatePresence>
        {selectedPrizeTier && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-white overflow-hidden"
            >
              {/* Top ambient glow */}
              <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={() => setSelectedPrizeTier(null)}
                className="absolute top-4 left-4 p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title={isAr ? 'إغلاق' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <span className="text-[11px] font-mono text-amber-400 uppercase font-black tracking-wider">
                    {selectedPrizeTier.id.replace('_', ' ')}
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {isAr ? selectedPrizeTier.nameAr : selectedPrizeTier.nameEn}
                  </h3>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                {/* Match criteria banner */}
                <div className="bg-slate-950/70 rounded-2xl p-3.5 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 block">
                    {isAr ? 'الأرقام والمطابقة المطلوبة للفوز:' : 'Required Matches to Win:'}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-300">
                        {selectedPrizeTier.matchMain} {isAr ? 'أرقام رئيسية' : 'Main Numbers'}
                      </span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: selectedPrizeTier.matchMain }).map((_, i) => (
                          <span
                            key={i}
                            className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black font-mono flex items-center justify-center border border-blue-400"
                          >
                            ✓
                          </span>
                        ))}
                      </div>
                    </div>

                    {selectedPrizeTier.matchLucky > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-amber-400">+</span>
                        <span className="font-bold text-amber-300">
                          {selectedPrizeTier.matchLucky} {isAr ? 'نجوم الحظ' : 'Lucky Stars'}
                        </span>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: selectedPrizeTier.matchLucky }).map((_, i) => (
                            <span
                              key={i}
                              className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 text-[10px] font-black flex items-center justify-center border border-amber-300"
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Terms of winning */}
                <div className="space-y-1.5">
                  <h4 className="font-black text-amber-400 flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    <span>{isAr ? 'شروط وقواعد الحصول على الجائزة' : 'Rules & Criteria to Win'}</span>
                  </h4>
                  <p className="text-slate-300 leading-relaxed bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                    {isAr ? selectedPrizeTier.termsAr : selectedPrizeTier.termsEn}
                  </p>
                </div>

                {/* Instant Payout & Delivery Conditions */}
                <div className="space-y-1.5">
                  <h4 className="font-black text-emerald-400 flex items-center gap-1.5 text-xs">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <span>{isAr ? 'شروط وآلية الصرف والتسليم الفوري' : 'Instant Payout & Delivery Terms'}</span>
                  </h4>
                  <p className="text-slate-300 leading-relaxed bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                    {isAr ? selectedPrizeTier.payoutTermsAr : selectedPrizeTier.payoutTermsEn}
                  </p>
                </div>

                {/* Quick Info Grid (Odds & Provably Fair) */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-bold">
                      {isAr ? 'الاحتمالية الحسابية (Odds)' : 'Mathematical Odds'}
                    </span>
                    <span className="text-xs font-mono font-black text-white">
                      {selectedPrizeTier.odds || '1 : 1,000+'}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-bold">
                      {isAr ? 'النزاهة والتحقق' : 'Fairness & Audit'}
                    </span>
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {isAr ? 'تشفير SHA-256' : 'SHA-256 Verified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex items-center gap-2">
                {onSelectPlay && (
                  <button
                    onClick={() => {
                      setSelectedPrizeTier(null);
                      onSelectPlay();
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <span>{isAr ? 'اختر أرقامك الرابحة الآن' : 'Pick Your Lucky Numbers Now'}</span>
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </button>
                )}
                <button
                  onClick={() => setSelectedPrizeTier(null)}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
