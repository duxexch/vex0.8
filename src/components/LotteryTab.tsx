import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Ticket, 
  Sparkles, 
  Trophy, 
  ShieldCheck, 
  Clock, 
  Gift, 
  CheckCircle2, 
  HelpCircle, 
  RefreshCw, 
  Wallet, 
  Share2,
  ChevronRight,
  Flame,
  AlertCircle,
  Hash,
  Copy,
  Check,
  Zap,
  Play,
  Bell,
  BellRing,
  Info,
  Calendar,
  Layers,
  Download
} from 'lucide-react';
import { 
  Language, 
  LotteryDraw, 
  LotteryTicket, 
  LotteryStats, 
  LotteryUserWonPrize,
  Wallet as UserWallet 
} from '../types';
import { lotteryService } from '../services/lotteryService';
import { promptLotteryInstall, isStandaloneMode, restoreMainManifest } from '../services/lotteryInstall';
import { requirePhoneLink } from '../utils/requireLink';
import { LotteryPrizeCards } from './lottery/LotteryPrizeCards';
import { LotteryWinningsHistory } from './lottery/LotteryWinningsHistory';
import { LotteryTierAlertsModal } from './lottery/LotteryTierAlertsModal';

interface LotteryTabProps {
  lang: Language;
  userId: string;
  wallets: UserWallet[];
  userPhone?: string;
  onRefreshWallets?: () => void;
  onCopyToast?: (msg: string) => void;
  onRequestInstallHelp?: () => void;
}

export const LotteryTab: React.FC<LotteryTabProps> = ({
  lang,
  userId,
  wallets,
  userPhone,
  onRefreshWallets,
  onCopyToast,
  onRequestInstallHelp,
}) => {
  const isAr = lang === 'ar';

  // PWA app download state (lottery installs as its own home-screen app)
  const [installState, setInstallState] = useState<'idle' | 'working' | 'installed'>(
    typeof window !== 'undefined' && isStandaloneMode() ? 'installed' : 'idle'
  );

  useEffect(() => {
    const onInstalled = () => setInstallState('installed');
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('appinstalled', onInstalled);
      // Leaving the lottery section — restore the main site manifest
      restoreMainManifest();
    };
  }, []);

  const handleDownloadApp = async () => {
    if (installState === 'installed') {
      onCopyToast?.(isAr ? 'التطبيق مثبت على جهازك بالفعل ✅' : 'The app is already installed on your device ✅');
      return;
    }
    if (installState === 'working') return;
    setInstallState('working');
    try {
      const result = await promptLotteryInstall();
      if (result === 'already' || result === 'accepted') {
        setInstallState('installed');
        onCopyToast?.(isAr ? 'تم تثبيت تطبيق اليانصيب ✅' : 'Lottery app installed ✅');
      } else if (result === 'ios') {
        onRequestInstallHelp?.();
      } else if (result === 'manual') {
        onCopyToast?.(
          isAr
            ? 'افتح قائمة المتصفح ثم اختر "إضافة إلى الشاشة الرئيسية"'
            : 'Open the browser menu and pick "Add to Home Screen"'
        );
      }
    } finally {
      setInstallState((s) => (s === 'working' ? 'idle' : s));
    }
  };

  // Sub-tabs
  type SubTab = 'play' | 'my_tickets' | 'won_prizes' | 'results' | 'rules';
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('play');

  // Modal for 30-min custom prize tier alerts (Firebase Cloud Messaging)
  const [isTierAlertsModalOpen, setIsTierAlertsModalOpen] = useState<boolean>(false);

  // Lottery Data State
  const [activeDraw, setActiveDraw] = useState<LotteryDraw | null>(null);
  const [allDraws, setAllDraws] = useState<LotteryDraw[]>([]);
  const [userTickets, setUserTickets] = useState<LotteryTicket[]>([]);
  const [userWonPrizes, setUserWonPrizes] = useState<LotteryUserWonPrize[]>([]);
  const [stats, setStats] = useState<LotteryStats | null>(null);
  const [freeTicketsCount, setFreeTicketsCount] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Push Notification State (1 Hour Before Draw)
  const [pushAlertActive, setPushAlertActive] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('vex_lottery_push_alert_active');
      return stored !== null ? stored === 'true' : true;
    }
    return true;
  });
  const [isTestingPush, setIsTestingPush] = useState<boolean>(false);
  const [pushConfirmationMsg, setPushConfirmationMsg] = useState<string | null>(null);

  // Number selection state
  const [selectedMainNumbers, setSelectedMainNumbers] = useState<number[]>([]);
  const [selectedLuckyNumbers, setSelectedLuckyNumbers] = useState<number[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    'wallet_balance' | 'compassion_free_ticket'
  >('wallet_balance');
  const [selectedWalletCompanyId, setSelectedWalletCompanyId] = useState<string>('');

  // UI state
  const [isPurchasing, setIsPurchasing] = useState<boolean>(false);
  const [purchaseSuccessTicket, setPurchaseSuccessTicket] = useState<LotteryTicket | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedDrawForVerification, setSelectedDrawForVerification] = useState<LotteryDraw | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean;
    computedHash: string;
    expectedHash: string;
  } | null>(null);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // Live Drawing Animation Simulator
  const [isSimulatingDraw, setIsSimulatingDraw] = useState<boolean>(false);
  const [drawnMainNumbers, setDrawnMainNumbers] = useState<number[]>([]);
  const [drawnLuckyNumbers, setDrawnLuckyNumbers] = useState<number[]>([]);

  // Total available balance across all active wallets
  const totalAvailableBalance = useMemo(() => {
    return wallets.reduce((acc, w) => acc + (w.available || 0), 0);
  }, [wallets]);

  // Set default wallet company if available
  useEffect(() => {
    if (wallets.length > 0 && !selectedWalletCompanyId) {
      const bestWallet = wallets.find((w) => (w.available || 0) >= 1.0) || wallets[0];
      setSelectedWalletCompanyId(bestWallet.company_id);
    }
  }, [wallets, selectedWalletCompanyId]);

  // Fetch initial data
  const loadLotteryData = async () => {
    setIsLoading(true);
    try {
      const draws = await lotteryService.getDraws();
      setAllDraws(draws);
      const current = draws.find((d) => d.status === 'open' || d.status === 'drawing') || draws[0] || null;
      setActiveDraw(current);

      if (current) {
        lotteryService.syncDrawWithServer(current);
      }

      const tickets = await lotteryService.getUserTickets(userId);
      setUserTickets(tickets);

      const wonPrizesList = await lotteryService.getUserWonPrizes(userId);
      setUserWonPrizes(wonPrizesList);

      const currentStats = lotteryService.getStats();
      setStats(currentStats);

      const freeBalance = lotteryService.getFreeCompassionTicketsCount(userId);
      setFreeTicketsCount(freeBalance);
      if (freeBalance > 0) {
        setSelectedPaymentMethod('compassion_free_ticket');
      }
    } catch (err) {
      console.error('Failed to load lottery data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLotteryData();
  }, [userId]);

  // Push notification handlers
  const handleTogglePushAlert = async () => {
    const nextState = !pushAlertActive;
    setPushAlertActive(nextState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vex_lottery_push_alert_active', String(nextState));
    }

    if (nextState) {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted') {
        try {
          await Notification.requestPermission();
        } catch (e) {
          console.warn('Browser push permission request error:', e);
        }
      }
      const msg = isAr 
        ? 'تم تفعيل تنبيه الدفع التلقائي قبل ساعة واحدة من سحب اليانصيب!' 
        : '1-Hour Pre-Draw Push Notification enabled!';
      if (onCopyToast) onCopyToast(msg);
      setPushConfirmationMsg(msg);
      setTimeout(() => setPushConfirmationMsg(null), 3500);
    } else {
      const msg = isAr ? 'تم إيقاف تنبيه السحب التلقائي.' : 'Lottery push notification paused.';
      if (onCopyToast) onCopyToast(msg);
    }
  };

  const handleTest1HourPushNotification = async () => {
    setIsTestingPush(true);
    try {
      const res = await lotteryService.triggerOneHourPreDrawNotification();
      if (res && res.success) {
        const msg = isAr 
          ? 'تم إرسال تنبيه الدفع التجريبي (قبل ساعة من السحب) بنجاح لمركز الإشعارات!' 
          : '1-Hour pre-draw test notification sent successfully!';
        if (onCopyToast) onCopyToast(msg);
        setPushConfirmationMsg(msg);
        setTimeout(() => setPushConfirmationMsg(null), 4000);

        // Optional browser push notification if permitted
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(isAr ? '⏳ تنبيه سحب VEX الكبرى (قبل 60 دقيقة)' : '⏳ VEX Mega Draw: 1 Hour Remaining!', {
            body: isAr 
              ? `باقي ساعة واحدة فقط على سحب VEX الكبرى. الجائزة المتراكمة: $${activeDraw ? activeDraw.jackpotAmount.toLocaleString() : '18,450'}!`
              : `Only 60 minutes remaining! Pick your winning numbers now.`,
            icon: '/favicon.ico',
          });
        }
      }
    } catch (e) {
      console.error('Failed to trigger 1-hour push notification test:', e);
    } finally {
      setIsTestingPush(false);
    }
  };

  // Countdown timer for active draw
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Check if active draw is currently open for participation
  const isDrawOpen = Boolean(
    activeDraw && 
    activeDraw.status === 'open' && 
    (timeLeft.days > 0 || timeLeft.hours > 0 || timeLeft.minutes > 0 || timeLeft.seconds > 0)
  );

  useEffect(() => {
    if (!activeDraw) return;
    const targetDate = new Date(activeDraw.closeAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, targetDate - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeDraw]);

  // Toggle selection for main numbers (1 to 50, max 5)
  const handleToggleMainNumber = (num: number) => {
    if (selectedMainNumbers.includes(num)) {
      setSelectedMainNumbers(selectedMainNumbers.filter((n) => n !== num));
    } else {
      if (selectedMainNumbers.length < 5) {
        setSelectedMainNumbers([...selectedMainNumbers, num].sort((a, b) => a - b));
      }
    }
  };

  // Toggle selection for lucky star numbers (1 to 12, max 2)
  const handleToggleLuckyNumber = (num: number) => {
    if (selectedLuckyNumbers.includes(num)) {
      setSelectedLuckyNumbers(selectedLuckyNumbers.filter((n) => n !== num));
    } else {
      if (selectedLuckyNumbers.length < 2) {
        setSelectedLuckyNumbers([...selectedLuckyNumbers, num].sort((a, b) => a - b));
      }
    }
  };

  // Quick Pick / Lucky Dip
  const handleQuickPick = () => {
    const { mainNumbers, luckyNumbers } = lotteryService.generateQuickPick();
    setSelectedMainNumbers(mainNumbers);
    setSelectedLuckyNumbers(luckyNumbers);
    setErrorMessage(null);
  };

  // Clear selections
  const handleClearSelection = () => {
    setSelectedMainNumbers([]);
    setSelectedLuckyNumbers([]);
    setErrorMessage(null);
  };

  // Purchase Ticket Handler
  const handlePurchase = async () => {
    if (!activeDraw) return;
    setErrorMessage(null);

    // Guest-first: ticket purchases require a linked phone number
    if (!requirePhoneLink()) {
      setErrorMessage(
        isAr
          ? 'يجب ربط رقم هاتفك أولاً لشراء التذاكر — تم فتح نافذة التحقق.'
          : 'Link your phone number first to purchase tickets — verification window opened.'
      );
      return;
    }

    if (selectedMainNumbers.length !== 5) {
      setErrorMessage(
        isAr 
          ? 'يرجى اختيار 5 أرقام رئيسية أولاً' 
          : 'Please choose 5 main numbers first'
      );
      return;
    }
    if (selectedLuckyNumbers.length !== 2) {
      setErrorMessage(
        isAr 
          ? 'يرجى اختيار رقمين ذهبيين (نجوم الحظ)' 
          : 'Please select 2 lucky star numbers'
      );
      return;
    }

    if (selectedPaymentMethod === 'compassion_free_ticket') {
      if (freeTicketsCount <= 0) {
        setErrorMessage(
          isAr 
            ? 'لا يوجد تذاكر تكافل مجانية متبقية في رصيدك' 
            : 'No free compassion tickets remaining in your balance'
        );
        return;
      }
    } else {
      if (totalAvailableBalance < activeDraw.ticketPrice) {
        setErrorMessage(
          isAr 
            ? `رصيد محفظتك المتاح ($${totalAvailableBalance.toFixed(2)}) غير كافٍ لشراء التذكرة ($${activeDraw.ticketPrice.toFixed(2)})` 
            : `Insufficient available balance ($${totalAvailableBalance.toFixed(2)}) for ticket ($${activeDraw.ticketPrice.toFixed(2)})`
        );
        return;
      }
    }

    setIsPurchasing(true);
    try {
      const res = await lotteryService.purchaseTicket({
        userId,
        drawId: activeDraw.id,
        mainNumbers: selectedMainNumbers,
        luckyNumbers: selectedLuckyNumbers,
        paymentMethod: selectedPaymentMethod,
        companyId: selectedWalletCompanyId,
        userPhoneMasked: userPhone ? `${userPhone.slice(0, 4)}***` : undefined,
      });

      if (res.success && res.ticket) {
        setPurchaseSuccessTicket(res.ticket);
        setSelectedMainNumbers([]);
        setSelectedLuckyNumbers([]);
        if (onRefreshWallets) onRefreshWallets();
        await loadLotteryData();
      } else {
        setErrorMessage(res.error || 'Failed to purchase ticket');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while purchasing ticket');
    } finally {
      setIsPurchasing(false);
    }
  };

  // Provably Fair Verification Trigger
  const handleVerifyFairness = async (draw: LotteryDraw) => {
    setSelectedDrawForVerification(draw);
    const result = await lotteryService.verifyDrawFairness(draw);
    setVerificationResult(result);
  };

  // Simulate Live Draw Animation
  const startLiveDrawSimulation = (draw: LotteryDraw) => {
    setIsSimulatingDraw(true);
    setDrawnMainNumbers([]);
    setDrawnLuckyNumbers([]);

    const mainTargets = draw.winningMainNumbers || [7, 14, 23, 38, 45];
    const luckyTargets = draw.winningLuckyNumbers || [3, 9];

    mainTargets.forEach((num, index) => {
      setTimeout(() => {
        setDrawnMainNumbers((prev) => [...prev, num]);
      }, (index + 1) * 800);
    });

    luckyTargets.forEach((num, index) => {
      setTimeout(() => {
        setDrawnLuckyNumbers((prev) => [...prev, num]);
      }, (mainTargets.length + 1 + index) * 900);
    });
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Banner: Progressive Jackpot Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-6 shadow-md border border-indigo-900/60">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Trophy className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                {isAr ? 'يانصيب VEX الذهبي التراكمي' : 'VEX Progressive Gold Lottery'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                {isAr ? 'شفافية ونزاهة مشفرة 100%' : '100% Provably Fair'}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              {activeDraw ? (isAr ? activeDraw.titleAr : activeDraw.titleEn) : 'VEX Mega Draw'}
            </h2>

            {/* Jackpot Display */}
            <div className="flex items-baseline gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-300">
                {isAr ? 'الجائزة الكبرى المتراكمة:' : 'Progressive Jackpot Pool:'}
              </span>
              <span className="text-2xl sm:text-4xl font-black text-amber-400 font-mono tracking-tight drop-shadow-sm">
                ${activeDraw ? activeDraw.jackpotAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '18,450.00'}
              </span>
              <span className="text-xs font-black uppercase text-amber-300/80 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                {activeDraw?.currency || 'USD'}
              </span>
            </div>
          </div>

          {/* Right: Live Countdown & Status */}
          <div className="bg-slate-800/90 backdrop-blur-xl rounded-2xl p-3.5 border border-slate-700 flex flex-col items-center justify-center shrink-0 min-w-[240px] shadow-xl">
            {/* Draw Status Indicator */}
            <div className="mb-2">
              {isDrawOpen ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>{isAr ? 'حالة السحب: مفتوح (شراء التذاكر متاح)' : 'Draw Status: OPEN (Tickets on Sale)'}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span>{isAr ? 'حالة السحب: مغلق (انتهت فترة المشاركة)' : 'Draw Status: CLOSED (Sales Ended)'}</span>
                </span>
              )}
            </div>

            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mb-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              {isAr ? 'الوقت المتبقي حتى موعد السحب:' : 'Draw Closes In:'}
            </span>

            <div className="flex items-center gap-1.5 text-center font-mono">
              <div className="bg-slate-950/90 rounded-lg px-2 py-1 border border-slate-800">
                <span className="block text-lg font-black text-white">{String(timeLeft.days).padStart(2, '0')}</span>
                <span className="text-[9px] text-slate-400 uppercase">{isAr ? 'يوم' : 'Days'}</span>
              </div>
              <span className="text-amber-400 font-black text-sm">:</span>
              <div className="bg-slate-950/90 rounded-lg px-2 py-1 border border-slate-800">
                <span className="block text-lg font-black text-white">{String(timeLeft.hours).padStart(2, '0')}</span>
                <span className="text-[9px] text-slate-400 uppercase">{isAr ? 'ساعة' : 'Hrs'}</span>
              </div>
              <span className="text-amber-400 font-black text-sm">:</span>
              <div className="bg-slate-950/90 rounded-lg px-2 py-1 border border-slate-800">
                <span className="block text-lg font-black text-white">{String(timeLeft.minutes).padStart(2, '0')}</span>
                <span className="text-[9px] text-slate-400 uppercase">{isAr ? 'دقيقة' : 'Min'}</span>
              </div>
              <span className="text-amber-400 font-black text-sm">:</span>
              <div className="bg-slate-950/90 rounded-lg px-2 py-1 border border-slate-800">
                <span className="block text-lg font-black text-amber-400">{String(timeLeft.seconds).padStart(2, '0')}</span>
                <span className="text-[9px] text-slate-400 uppercase">{isAr ? 'ثانية' : 'Sec'}</span>
              </div>
            </div>

            <div className="mt-2 text-[10px] text-slate-400 text-center flex items-center gap-2">
              <span>{isAr ? 'سعر التذكرة:' : 'Ticket:'} <strong className="text-emerald-400 font-mono">${activeDraw?.ticketPrice.toFixed(2) || '1.00'}</strong></span>
              <span>•</span>
              <span className="font-mono text-slate-400">
                {activeDraw ? new Date(activeDraw.closeAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
          </div>
        </div>

        {/* 1-Hour Pre-Draw Push Notification Banner */}
        <div className="mt-3 bg-gradient-to-r from-amber-500/15 via-slate-900/90 to-amber-950/40 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <BellRing className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-xs sm:text-sm font-black text-amber-300">
                  {isAr ? 'تنبيه دفع تلقائي (Push Notification) قبل ساعة من موعد السحب' : '1-Hour Pre-Draw Push Notification'}
                </h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  pushAlertActive 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {pushAlertActive ? (isAr ? 'مفعل تلقائياً ✅' : 'Active ✅') : (isAr ? 'متوقف مؤقتاً' : 'Paused')}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 max-w-xl leading-relaxed mt-0.5">
                {isAr
                  ? 'يصلك إشعار فوري ذكي على جهازك قبل 60 دقيقة من إغلاق التذاكر وبدء سحب اليانصيب لتذكيرك بمراجعة أرقامك وتأكيد مشاركتك في الجائزة الكبرى.'
                  : 'Receive an instant alert on your device 60 minutes before draw closure to confirm your winning tickets and participate in the progressive jackpot.'}
              </p>
              {pushConfirmationMsg && (
                <p className="text-xs text-emerald-400 font-bold mt-1 animate-pulse">
                  {pushConfirmationMsg}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setIsTierAlertsModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
              title={isAr ? 'تخصيص تنبيهات كل جائزة قبل 30 دقيقة عبر FCM' : 'Customize 30-min FCM alerts per prize tier'}
            >
              <BellRing className="w-3.5 h-3.5 animate-pulse" />
              <span>{isAr ? 'تنبيه السحب (30 دقيقة FCM)' : 'Tier Alerts (30m FCM)'}</span>
            </button>

            <button
              onClick={handleTogglePushAlert}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                pushAlertActive
                  ? 'bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{pushAlertActive ? (isAr ? 'تنبيه الساعة مفعل' : '1-Hr Active') : (isAr ? 'تفعيل تنبيه الساعة' : 'Enable 1-Hr')}</span>
            </button>

            <button
              onClick={handleTest1HourPushNotification}
              disabled={isTestingPush}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title={isAr ? 'تجربة وصول تنبيه الـ 60 دقيقة' : 'Test 1-Hour Push'}
            >
              <Zap className={`w-3.5 h-3.5 text-amber-400 ${isTestingPush ? 'animate-spin' : ''}`} />
              <span>{isTestingPush ? (isAr ? 'جاري الإرسال...' : 'Sending...') : (isAr ? 'اختبار 60د' : 'Test 1h')}</span>
            </button>
          </div>
        </div>

        {/* Compassion Free Ticket Alert (if user has any) */}
        {freeTicketsCount > 0 && (
          <div className="mt-3 bg-amber-500/15 border border-amber-500/30 rounded-xl p-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-amber-200">
                {isAr
                  ? `تهانينا! لديك (${freeTicketsCount}) تذكرة تكافل مجانية لتعويض خسائر الرهانات السابقة.`
                  : `Solidarity Gift! You have (${freeTicketsCount}) free compassion ticket for loss compensation.`}
              </span>
            </div>
            <button
              onClick={() => {
                setActiveSubTab('play');
                setSelectedPaymentMethod('compassion_free_ticket');
              }}
              className="text-xs font-black text-amber-950 bg-amber-400 hover:bg-amber-300 px-2.5 py-1 rounded-lg transition-colors shrink-0"
            >
              {isAr ? 'استخدمها الآن' : 'Use Now'}
            </button>
          </div>
        )}
      </div>

      {/* Download Lottery App (installable PWA — one tap, no store) */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/70 p-3 sm:p-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <img
              src="/lottery-192.png"
              alt=""
              width={56}
              height={56}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-[26%] ring-1 ring-amber-400/40 shadow-md shrink-0 bg-slate-950"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h4 className="text-sm sm:text-base font-black text-white">
                  {isAr ? 'تطبيق VEX Lottery' : 'VEX Lottery App'}
                </h4>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 whitespace-nowrap">
                  {isAr ? 'موثوق من جوجل ✅' : 'Google Verified ✅'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed mt-0.5">
                {isAr
                  ? 'ثبّته على شاشتك الرئيسية في ثوانٍ — بدون Google Play أو App Store. متوافق مع كل مقاسات الهواتف، وتنبيهات السحب تصلك فوراً.'
                  : 'Install it on your home screen in seconds — no Play Store or App Store needed. Fits every phone size, with instant draw alerts.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleDownloadApp}
            disabled={installState === 'working'}
            className="w-full sm:w-auto min-h-[44px] shrink-0 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-sm font-black transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/25 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
          >
            {installState === 'installed' ? (
              <>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{isAr ? 'مثبّت على جهازك' : 'Installed on your device'}</span>
              </>
            ) : installState === 'working' ? (
              <>
                <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
                <span>{isAr ? 'جاري التثبيت...' : 'Installing...'}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 shrink-0" />
                <span>{isAr ? 'تحميل التطبيق' : 'Download App'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSubTab('play')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'play'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>{isAr ? 'اختيار التذاكر واللعب' : 'Play & Pick'}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('my_tickets')}
            className={`relative px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'my_tickets'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isAr ? 'تذاكري' : 'My Tickets'}</span>
            {userTickets.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeSubTab === 'my_tickets' ? 'bg-white text-emerald-700' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {userTickets.length}
              </span>
            )}
          </button>

          {/* New Tab: سجل الجوائز السابقة */}
          <button
            onClick={() => setActiveSubTab('won_prizes')}
            className={`relative px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'won_prizes'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>{isAr ? 'سجل جوائزي السابقة' : 'Past Winnings'}</span>
            {userWonPrizes.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeSubTab === 'won_prizes' ? 'bg-white text-emerald-700' : 'bg-amber-100 text-amber-800'
              }`}>
                {userWonPrizes.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('results')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'results'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAr ? 'نتائج السحوبات والتحقق' : 'Draw Results'}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('rules')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'rules'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{isAr ? 'كروت الجوائز والنزاهة' : 'Prize Tiers & Rules'}</span>
          </button>
        </div>

        <button
          onClick={loadLotteryData}
          disabled={isLoading}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
          title={isAr ? 'تحديث البيانات' : 'Refresh'}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: PLAY & NUMBER PICKER                                   */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'play' && (
        <div className="space-y-4">
          {/* Quick Selection Status Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  {isAr ? 'اختر 5 أرقام رئيسية + 2 نجوم الحظ الذهبية' : 'Pick 5 Main Numbers + 2 Lucky Stars'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isAr 
                    ? 'أو استخدم زر الاختيار السريع لتوليد أرقام عشوائية ذكية بنقرة واحدة.' 
                    : 'Or use the Lucky Dip button for 1-click smart randomized picks.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleQuickPick}
                  className="px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  <span>{isAr ? 'اختيار سريع ذكي' : 'Lucky Dip'}</span>
                </button>

                {(selectedMainNumbers.length > 0 || selectedLuckyNumbers.length > 0) && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                  >
                    {isAr ? 'تفريغ' : 'Clear'}
                  </button>
                )}
              </div>
            </div>

            {/* Selected Numbers Preview Row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 min-w-[70px]">
                {isAr ? 'الأرقام المختارة:' : 'Selection:'}
              </span>

              {/* Main 5 */}
              <div className="flex items-center gap-1.5">
                {[0, 1, 2, 3, 4].map((idx) => {
                  const num = selectedMainNumbers[idx];
                  return (
                    <div
                      key={`main-slot-${idx}`}
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-all border ${
                        num !== undefined
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs scale-105'
                          : 'bg-slate-100 text-slate-400 border-dashed border-slate-300'
                      }`}
                    >
                      {num !== undefined ? num : '?'}
                    </div>
                  );
                })}
              </div>

              <span className="text-slate-300 font-black">+</span>

              {/* Lucky 2 */}
              <div className="flex items-center gap-1.5">
                {[0, 1].map((idx) => {
                  const num = selectedLuckyNumbers[idx];
                  return (
                    <div
                      key={`lucky-slot-${idx}`}
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-all border ${
                        num !== undefined
                          ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-2xs scale-105 ring-2 ring-amber-300'
                          : 'bg-amber-50/60 text-amber-400 border-dashed border-amber-300'
                      }`}
                    >
                      {num !== undefined ? `★${num}` : '★'}
                    </div>
                  );
                })}
              </div>

              <div className="mr-auto text-xs font-bold text-slate-500">
                <span className={selectedMainNumbers.length === 5 ? 'text-indigo-600 font-black' : ''}>
                  {selectedMainNumbers.length}/5
                </span>
                {' & '}
                <span className={selectedLuckyNumbers.length === 2 ? 'text-amber-600 font-black' : ''}>
                  {selectedLuckyNumbers.length}/2
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Main Numbers Grid (1 - 50) */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                {isAr ? 'الأرقام الرئيسية (اختر 5 من 1 إلى 50)' : 'Main Numbers (Select 5 from 1 to 50)'}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {5 - selectedMainNumbers.length} {isAr ? 'متبقي' : 'left'}
              </span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
              {Array.from({ length: 50 }, (_, i) => i + 1).map((num) => {
                const isSelected = selectedMainNumbers.includes(num);
                const isHot = stats?.hotNumbers.some((h) => h.number === num);

                return (
                  <button
                    key={`main-${num}`}
                    type="button"
                    onClick={() => handleToggleMainNumber(num)}
                    className={`h-9 rounded-xl font-bold text-xs flex items-center justify-center relative transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs scale-105 font-black z-10'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200'
                    }`}
                  >
                    {num}
                    {isHot && !isSelected && (
                      <span className="absolute -top-1 -right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-1 ring-white" title={isAr ? 'رقم ساخن متكرر' : 'Hot number'} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Lucky Stars Grid (1 - 12) */}
          <div className="bg-amber-50/40 rounded-2xl p-4 border border-amber-200/80 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                {isAr ? 'نجوم الحظ الذهبية (اختر 2 من 1 إلى 12)' : 'Lucky Stars (Select 2 from 1 to 12)'}
              </span>
              <span className="text-[11px] text-amber-800 font-medium">
                {2 - selectedLuckyNumbers.length} {isAr ? 'متبقي' : 'left'}
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => {
                const isSelected = selectedLuckyNumbers.includes(num);

                return (
                  <button
                    key={`lucky-${num}`}
                    type="button"
                    onClick={() => handleToggleLuckyNumber(num)}
                    className={`h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-0.5 transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-xs scale-105 font-black ring-2 ring-amber-300'
                        : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100/70 hover:text-amber-950'
                    }`}
                  >
                    <span className="text-amber-500">★</span>
                    <span>{num}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Payment Method & Checkout */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              {isAr ? 'طريقة دفع قيمة التذكرة' : 'Payment Method'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Option A: Free Compassion Ticket */}
              <button
                type="button"
                onClick={() => setSelectedPaymentMethod('compassion_free_ticket')}
                disabled={freeTicketsCount <= 0}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  selectedPaymentMethod === 'compassion_free_ticket'
                    ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/40'
                    : freeTicketsCount > 0
                      ? 'bg-white border-slate-200 hover:bg-slate-50'
                      : 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Gift className={`w-4 h-4 ${freeTicketsCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
                  <div>
                    <span className="block text-xs font-black text-slate-900">
                      {isAr ? 'تذكرة التكافل المجانية' : 'Compassion Free Ticket'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {isAr ? `الرصيد المتاح: ${freeTicketsCount} تذكرة` : `Balance: ${freeTicketsCount} ticket(s)`}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-black px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                  {isAr ? 'مجاناً 100%' : 'FREE'}
                </span>
              </button>

              {/* Option B: Wallet Available Balance */}
              <button
                type="button"
                onClick={() => setSelectedPaymentMethod('wallet_balance')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  selectedPaymentMethod === 'wallet_balance'
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400/40'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="block text-xs font-black text-slate-900">
                      {isAr ? 'رصيد المحفظة المتاح' : 'Wallet Available Balance'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {isAr ? `المتاح: $${totalAvailableBalance.toFixed(2)}` : `Available: $${totalAvailableBalance.toFixed(2)}`}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-black text-slate-900">
                  ${activeDraw?.ticketPrice.toFixed(2) || '1.00'}
                </span>
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Purchase CTA Button */}
            <button
              type="button"
              onClick={handlePurchase}
              disabled={isPurchasing || selectedMainNumbers.length !== 5 || selectedLuckyNumbers.length !== 2}
              className={`w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                selectedMainNumbers.length === 5 && selectedLuckyNumbers.length === 2 && !isPurchasing
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-[0.99]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isPurchasing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isAr ? 'جاري تسجيل التذكرة وتشفيرها...' : 'Minting & Securing Ticket...'}</span>
                </>
              ) : (
                <>
                  <Ticket className="w-4 h-4" />
                  <span>
                    {isAr 
                      ? `تأكيد وشراء التذكرة (${selectedPaymentMethod === 'compassion_free_ticket' ? 'مجاناً' : `$${activeDraw?.ticketPrice.toFixed(2) || '1.00'}`})`
                      : `Confirm & Buy Ticket (${selectedPaymentMethod === 'compassion_free_ticket' ? 'FREE' : `$${activeDraw?.ticketPrice.toFixed(2) || '1.00'}`})`}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Transparent Glassmorphism Prize Cards & Odds */}
          <div className="pt-2">
            <LotteryPrizeCards
              lang={lang}
              currentPool={activeDraw ? activeDraw.jackpotAmount : 18450}
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: MY TICKETS                                             */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'my_tickets' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">
              {isAr ? 'سجل تذاكر اليانصيب الخاصة بك' : 'Your Registered Lottery Tickets'}
            </h3>
            <span className="text-xs font-bold text-slate-500">
              {userTickets.length} {isAr ? 'تذكرة' : 'Tickets'}
            </span>
          </div>

          {userTickets.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Ticket className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-600">
                {isAr ? 'لم تقم بشراء أو تسجيل أي تذكرة حتى الآن.' : 'You have no registered lottery tickets yet.'}
              </p>
              <button
                type="button"
                onClick={() => setActiveSubTab('play')}
                className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                {isAr ? 'اشترِ تذكرتك الأولى الآن' : 'Get Your First Ticket'}
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {userTickets.map((ticket) => {
                const targetDraw = allDraws.find((d) => d.id === ticket.drawId);
                const isCompleted = targetDraw?.status === 'completed';
                const winningMain = targetDraw?.winningMainNumbers || [];
                const winningLucky = targetDraw?.winningLuckyNumbers || [];
                const isWinner = (ticket.prizeWon || 0) > 0;

                return (
                  <div
                    key={ticket.id}
                    className={`bg-white rounded-2xl p-3.5 border transition-all shadow-xs ${
                      isWinner 
                        ? 'border-emerald-400 bg-emerald-50/30 ring-1 ring-emerald-300' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 font-mono">
                          #{ticket.id}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {targetDraw ? (isAr ? targetDraw.titleAr : targetDraw.titleEn) : `Draw #${ticket.drawNumber}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isCompleted ? (
                          isWinner ? (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <Trophy className="w-3 h-3 text-emerald-600" />
                              {isAr ? `فائزة بجائزة $${ticket.prizeWon?.toFixed(2)}` : `Winner: $${ticket.prizeWon?.toFixed(2)}`}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {isAr ? 'حظ أوفر' : 'Completed'}
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            {isAr ? 'بانتظار موعد السحب' : 'Active / Pending Draw'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ticket Numbers Row */}
                    <div className="flex items-center justify-between gap-2 pt-2.5">
                      <div className="flex items-center gap-1.5">
                        {/* Main Numbers */}
                        {ticket.mainNumbers.map((num) => {
                          const isMatched = isCompleted && winningMain.includes(num);
                          return (
                            <span
                              key={`tck-num-${num}`}
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-black border ${
                                isMatched
                                  ? 'bg-emerald-500 text-white border-emerald-600 ring-2 ring-emerald-300 scale-105'
                                  : 'bg-indigo-50 text-indigo-900 border-indigo-200'
                              }`}
                            >
                              {num}
                            </span>
                          );
                        })}

                        <span className="text-slate-300 font-bold mx-0.5">+</span>

                        {/* Lucky Numbers */}
                        {ticket.luckyNumbers.map((num) => {
                          const isMatched = isCompleted && winningLucky.includes(num);
                          return (
                            <span
                              key={`tck-lucky-${num}`}
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-black border ${
                                isMatched
                                  ? 'bg-amber-500 text-amber-950 border-amber-600 ring-2 ring-amber-300 scale-105'
                                  : 'bg-amber-100/70 text-amber-900 border-amber-200'
                              }`}
                            >
                              ★{num}
                            </span>
                          );
                        })}
                      </div>

                      <div className="text-[10px] text-slate-400 text-right">
                        <span>{new Date(ticket.purchasedAt).toLocaleDateString()}</span>
                        <span className="block font-medium">
                          {ticket.paymentMethod === 'compassion_free_ticket' 
                            ? (isAr ? 'تذكرة تكافل مجانية' : 'Solidarity Ticket')
                            : `$${ticket.pricePaid.toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: PAST RESULTS & PROVABLY FAIR                          */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'results' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">
              {isAr ? 'أرشيف نتائج السحوبات السابقة' : 'Past Draws & Cryptographic Proof'}
            </h3>
            <span className="text-xs font-bold text-slate-500">
              {allDraws.length} {isAr ? 'سحوبات مسجلة' : 'Recorded Draws'}
            </span>
          </div>

          <div className="space-y-3">
            {allDraws.map((draw) => {
              const isDone = draw.status === 'completed';

              return (
                <div
                  key={draw.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 font-mono">
                          {draw.id}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.2 rounded-full ${
                          isDone 
                            ? 'bg-slate-100 text-slate-700' 
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isDone ? (isAr ? 'مكتمل' : 'Completed') : (isAr ? 'سحب مفتوح' : 'Open')}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-700 mt-0.5">
                        {isAr ? draw.titleAr : draw.titleEn}
                      </h4>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">
                        {isAr ? 'إجمالي الجوائز الموزعة:' : 'Prize Pool:'}
                      </span>
                      <span className="text-sm font-black text-amber-600 font-mono">
                        ${draw.jackpotAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Winning Numbers Row */}
                  {isDone && draw.winningMainNumbers ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-500 mr-1">
                          {isAr ? 'الأرقام الفائزة:' : 'Winning Balls:'}
                        </span>
                        {draw.winningMainNumbers.map((num) => (
                          <span
                            key={`win-main-${draw.id}-${num}`}
                            className="w-8 h-8 rounded-full bg-indigo-600 text-white font-mono text-xs font-black flex items-center justify-center shadow-xs"
                          >
                            {num}
                          </span>
                        ))}
                        <span className="text-slate-400 font-bold mx-0.5">+</span>
                        {draw.winningLuckyNumbers?.map((num) => (
                          <span
                            key={`win-lucky-${draw.id}-${num}`}
                            className="w-8 h-8 rounded-full bg-amber-400 text-amber-950 font-mono text-xs font-black flex items-center justify-center shadow-xs ring-2 ring-amber-300"
                          >
                            ★{num}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startLiveDrawSimulation(draw)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Play className="w-3 h-3 text-indigo-600" />
                          <span>{isAr ? 'إعادة العرض' : 'Replay'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleVerifyFairness(draw)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{isAr ? 'تحقق من النزاهة' : 'Verify'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-500">
                      <span>{isAr ? 'سيتم إجراء السحب التلقائي بعد إغلاق التذاكر مباشرة.' : 'Automated cryptographic draw will execute upon close.'}</span>
                      <span className="font-mono font-bold text-amber-600">{new Date(draw.closeAt).toLocaleString()}</span>
                    </div>
                  )}

                  {/* Seed Hash Preview */}
                  <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 truncate">
                    <Hash className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">SHA256: {draw.provablyFair.serverSeedHash}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB: WON PRIZES HISTORY                                       */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'won_prizes' && (
        <LotteryWinningsHistory
          lang={lang}
          wonPrizes={userWonPrizes}
          onPlayClick={() => setActiveSubTab('play')}
          onCopyToast={onCopyToast}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: RULES, PRIZE TIERS & FAIRNESS                          */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'rules' && (
        <div className="space-y-6">
          {/* Enhanced Glassmorphism Prize Cards with Modal Details */}
          <LotteryPrizeCards
            lang={lang}
            currentPool={activeDraw ? activeDraw.jackpotAmount : 18450}
            onSelectPlay={() => setActiveSubTab('play')}
          />

          {/* Provably Fair Cryptographic Explanation */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-3">
            <h3 className="text-sm font-black text-emerald-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              {isAr ? 'كيف تضمن نزاهة السحب عبر تقنية Provably Fair التشفيرية؟' : 'How Provably Fair Cryptography Guarantees 100% Fairness'}
            </h3>

            <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <p>
                {isAr
                  ? '1. قبل فتح بيع التذاكر، يتم إنشاء مفتاح عشوائي غير قابل للتنبؤ (Server Seed) وتشفيره عبر خوارزمية التجزئة المعيارية SHA-256 ونشره للعامة.'
                  : '1. Before ticket sales begin, an unpredictable cryptographic Server Seed is generated, hashed via SHA-256, and publicly posted.'}
              </p>
              <p>
                {isAr
                  ? '2. بعد إغلاق السحب، يتم دمج رمز المجتمع (Client Seed) المأخوذ من مشاركات المستخدمين لتحديد الأرقام الفائزة، مما يجعل التلاعب مستحيلاً رياضياً.'
                  : '2. After draw close, community-derived seeds combine to generate the winning balls, rendering outcome manipulation mathematically impossible.'}
              </p>
              <p>
                {isAr
                  ? '3. فور انتهاء السحب، يتم كشف الـ Server Seed الأصلي ليتمكن أي مستخدم أو مدقق من التحقق الفوري من صحة النتيجة.'
                  : '3. Upon conclusion, the original unhashed Server Seed is revealed, allowing instantaneous independent validation by any participant.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: PROVABLY FAIR VERIFIER                                */}
      {/* ------------------------------------------------------------- */}
      {selectedDrawForVerification && verificationResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h4 className="text-sm font-black text-slate-900">
                  {isAr ? 'التحقق التشفيري من نزاهة السحب' : 'Cryptographic Fairness Verification'}
                </h4>
              </div>
              <button
                onClick={() => setSelectedDrawForVerification(null)}
                className="text-slate-400 hover:text-slate-600 font-black text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Status banner */}
              <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                verificationResult.isValid 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="block font-black">
                    {verificationResult.isValid 
                      ? (isAr ? 'تم التحقق بنجاح: السحب نزيه ومطابق 100%' : 'Verified: 100% Cryptographically Untampered')
                      : (isAr ? 'فشل التحقق' : 'Verification Mismatch')}
                  </span>
                  <span className="text-[11px] opacity-80">
                    {isAr ? 'تطابق كامل بين الهاش المعلن مسبقاً والمفتاح المفحوص.' : 'Full match between pre-committed hash and revealed key.'}
                  </span>
                </div>
              </div>

              {/* Hashes Details */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[10px]">
                <div>
                  <span className="text-slate-400 block font-sans font-bold">{isAr ? 'المفتاح المكشوف (Server Seed):' : 'Revealed Server Seed:'}</span>
                  <span className="text-slate-800 break-all">{selectedDrawForVerification.provablyFair.serverSeed}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans font-bold">{isAr ? 'التجزئة المعلنة مسبقاً (Pre-committed SHA-256):' : 'Pre-committed SHA-256:'}</span>
                  <span className="text-emerald-700 font-bold break-all">{verificationResult.expectedHash}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans font-bold">{isAr ? 'التجزئة المحسوبة لحظياً (Computed SHA-256):' : 'Computed SHA-256:'}</span>
                  <span className="text-indigo-700 font-bold break-all">{verificationResult.computedHash}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedDrawForVerification(null)}
              className="w-full py-2.5 rounded-xl font-black text-xs bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: LIVE DRAW SIMULATION                                   */}
      {/* ------------------------------------------------------------- */}
      {isSimulatingDraw && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-indigo-900 space-y-6 text-center animate-fade-in relative overflow-hidden">
            <div className="space-y-1">
              <span className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                {isAr ? 'محاكاة السحب المباشر بالكرات المتحركة' : 'Live Lottery Ball Drum Simulation'}
              </span>
              <h3 className="text-lg font-black text-white">
                {isAr ? 'سحب الكرات الفائزة رسمياً' : 'Official Ball Reveal'}
              </h3>
            </div>

            {/* Ball Drum Visualization */}
            <div className="py-6 flex flex-col items-center justify-center gap-4">
              <div className="flex flex-wrap items-center justify-center gap-2 min-h-[52px]">
                {drawnMainNumbers.map((num, i) => (
                  <motion.div
                    key={`drawn-main-${num}`}
                    initial={{ scale: 0, y: -20, rotate: -180 }}
                    animate={{ scale: 1, y: 0, rotate: 0 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                    className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white text-base font-black flex items-center justify-center shadow-lg border-2 border-indigo-300 ring-2 ring-indigo-500/50 font-mono"
                  >
                    {num}
                  </motion.div>
                ))}

                {drawnMainNumbers.length < 5 && (
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-indigo-500/50 flex items-center justify-center text-indigo-400 text-xs font-bold animate-pulse">
                    ?
                  </div>
                )}
              </div>

              {drawnMainNumbers.length === 5 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <span className="text-amber-400 text-xs font-black mr-2">
                    {isAr ? 'كرات الحظ:' : 'Stars:'}
                  </span>
                  {drawnLuckyNumbers.map((num) => (
                    <motion.div
                      key={`drawn-lucky-${num}`}
                      initial={{ scale: 0, y: -20 }}
                      animate={{ scale: 1, y: 0 }}
                      transition={{ type: 'spring', damping: 10 }}
                      className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-amber-950 text-base font-black flex items-center justify-center shadow-lg border-2 border-amber-200 ring-2 ring-amber-400/50 font-mono"
                    >
                      ★{num}
                    </motion.div>
                  ))}

                  {drawnLuckyNumbers.length < 2 && (
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-amber-500/50 flex items-center justify-center text-amber-400 text-xs font-bold animate-pulse">
                      ★
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setIsSimulatingDraw(false)}
              className="px-6 py-2.5 rounded-xl font-black text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              {isAr ? 'إغلاق المحاكاة' : 'Close Simulation'}
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: PURCHASE SUCCESS CONGRATULATIONS                       */}
      {/* ------------------------------------------------------------- */}
      {purchaseSuccessTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-emerald-200 text-center space-y-4 animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <Trophy className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">
                {isAr ? 'تم شراء وتشفير تذكرتك بنجاح!' : 'Ticket Confirmed & Minted!'}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                #{purchaseSuccessTicket.id}
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 block">
                {isAr ? 'أرقامك المسجلة في السحب:' : 'Your Ticket Numbers:'}
              </span>
              <div className="flex items-center justify-center gap-1.5">
                {purchaseSuccessTicket.mainNumbers.map((n) => (
                  <span key={`succ-n-${n}`} className="w-7 h-7 rounded-full bg-indigo-600 text-white font-mono text-xs font-black flex items-center justify-center">
                    {n}
                  </span>
                ))}
                <span className="text-slate-400 font-bold">+</span>
                {purchaseSuccessTicket.luckyNumbers.map((n) => (
                  <span key={`succ-l-${n}`} className="w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-mono text-xs font-black flex items-center justify-center">
                    ★{n}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setPurchaseSuccessTicket(null);
                setActiveSubTab('my_tickets');
              }}
              className="w-full py-2.5 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              {isAr ? 'عرض تذاكري المسجلة' : 'View In My Tickets'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOMIZED 30-MINUTE PRIZE TIER ALERTS VIA FIREBASE (FCM) */}
      <LotteryTierAlertsModal
        isOpen={isTierAlertsModalOpen}
        onClose={() => setIsTierAlertsModalOpen(false)}
        lang={lang}
        onToast={onCopyToast}
      />
    </div>
  );
};
