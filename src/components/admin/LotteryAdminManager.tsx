import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Ticket, 
  Sparkles, 
  Play, 
  Plus, 
  RefreshCw, 
  ShieldCheck, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Gift, 
  DollarSign,
  Clock,
  RotateCcw
} from 'lucide-react';
import { 
  Language, 
  LotteryDraw, 
  LotteryTicket, 
  LotteryStats 
} from '../../types';
import { lotteryService } from '../../services/lotteryService';

interface LotteryAdminManagerProps {
  lang: Language;
  onToast?: (msg: string) => void;
}

export const LotteryAdminManager: React.FC<LotteryAdminManagerProps> = ({
  lang,
  onToast,
}) => {
  const isAr = lang === 'ar';

  const [draws, setDraws] = useState<LotteryDraw[]>([]);
  const [stats, setStats] = useState<LotteryStats | null>(null);
  const [allTickets, setAllTickets] = useState<LotteryTicket[]>([]);
  const [activeDraw, setActiveDraw] = useState<LotteryDraw | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Search & Filter
  const [ticketSearch, setTicketSearch] = useState<string>('');
  const [ticketFilter, setTicketFilter] = useState<'all' | 'winners' | 'pending'>('all');

  // New Draw Modal state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newDrawTitleAr, setNewDrawTitleAr] = useState<string>('');
  const [newDrawTitleEn, setNewDrawTitleEn] = useState<string>('');
  const [newDrawTicketPrice, setNewDrawTicketPrice] = useState<number>(1.0);
  const [newDrawJackpot, setNewDrawJackpot] = useState<number>(15000.0);
  const [newDrawCloseDays, setNewDrawCloseDays] = useState<number>(7);
  const [isCreatingDraw, setIsCreatingDraw] = useState<boolean>(false);

  // Instant Draw Trigger Modal state
  const [showTriggerModal, setShowTriggerModal] = useState<boolean>(false);
  const [manualWinningMain, setManualWinningMain] = useState<string>('');
  const [manualWinningLucky, setManualWinningLucky] = useState<string>('');
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [triggerResult, setTriggerResult] = useState<{
    winningMain: number[];
    winningLucky: number[];
    totalWinners: number;
    totalPayout: number;
  } | null>(null);

  // Airdrop Free Ticket Modal
  const [showAirdropModal, setShowAirdropModal] = useState<boolean>(false);
  const [airdropUserId, setAirdropUserId] = useState<string>('');
  const [airdropCount, setAirdropCount] = useState<number>(1);

  // Load Admin Data
  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const fetchedDraws = await lotteryService.getDraws();
      setDraws(fetchedDraws);
      const current = fetchedDraws.find((d) => d.status === 'open' || d.status === 'drawing') || fetchedDraws[0] || null;
      setActiveDraw(current);

      const fetchedStats = lotteryService.getStats();
      setStats(fetchedStats);

      // Collect all local tickets
      if (typeof window !== 'undefined') {
        const rawTickets = localStorage.getItem('vex_lottery_tickets_v1');
        if (rawTickets) {
          setAllTickets(JSON.parse(rawTickets));
        } else {
          setAllTickets([]);
        }
      }
    } catch (err) {
      console.error('Error loading lottery admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Handle Create Draw
  const handleCreateDraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingDraw(true);
    try {
      const closeDate = new Date(Date.now() + newDrawCloseDays * 86400000).toISOString();
      const created = await lotteryService.createDraw({
        titleAr: newDrawTitleAr || `سحب VEX الأسبوعي الكبرى #${(draws[0]?.drawNumber || 88) + 1}`,
        titleEn: newDrawTitleEn || `VEX Weekly Mega Draw #${(draws[0]?.drawNumber || 88) + 1}`,
        ticketPrice: newDrawTicketPrice,
        initialJackpot: newDrawJackpot,
        closeAt: closeDate,
      });

      if (onToast) {
        onToast(isAr ? `تم إنشاء وجدولة ${created.id} بنجاح!` : `Draw ${created.id} created successfully!`);
      }
      setShowCreateModal(false);
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to create draw');
    } finally {
      setIsCreatingDraw(false);
    }
  };

  // Handle Trigger Draw Now
  const handleTriggerDraw = async () => {
    if (!activeDraw) return;
    setIsTriggering(true);
    try {
      let forced = undefined;
      if (manualWinningMain.trim() && manualWinningLucky.trim()) {
        const main = manualWinningMain.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
        const lucky = manualWinningLucky.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
        if (main.length === 5 && lucky.length === 2) {
          forced = { mainNumbers: main, luckyNumbers: lucky };
        }
      }

      const res = await lotteryService.triggerDraw(activeDraw.id, forced);
      setTriggerResult(res);
      if (onToast) {
        onToast(
          isAr 
            ? `تم إجراء السحب! عدد الفائزين: ${res.totalWinners} - إجمالي الجوائز: $${res.totalPayout}`
            : `Draw Completed! Winners: ${res.totalWinners} - Payout: $${res.totalPayout}`
        );
      }
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Error triggering draw');
    } finally {
      setIsTriggering(false);
    }
  };

  // Handle Airdrop Free Compassion Ticket
  const handleAirdrop = () => {
    if (!airdropUserId.trim()) return;
    const current = lotteryService.getFreeCompassionTicketsCount(airdropUserId.trim());
    lotteryService.setFreeCompassionTicketsCount(airdropUserId.trim(), current + airdropCount);

    if (onToast) {
      onToast(
        isAr 
          ? `تم إهداء ${airdropCount} تذكرة مجانية للمستخدم ${airdropUserId}!` 
          : `Awarded ${airdropCount} free ticket(s) to ${airdropUserId}!`
      );
    }
    setShowAirdropModal(false);
    setAirdropUserId('');
  };

  // Filtered tickets
  const filteredTickets = allTickets.filter((t) => {
    const matchesSearch = 
      t.id.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      t.userId.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      t.drawId.toLowerCase().includes(ticketSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (ticketFilter === 'winners') {
      return (t.prizeWon || 0) > 0;
    }
    if (ticketFilter === 'pending') {
      const d = draws.find((dr) => dr.id === t.drawId);
      return d?.status === 'open';
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-black text-slate-900">
              {isAr ? 'غرفة عمليات إدارة اليانصيب والسحوبات' : 'Lottery Operations & Prize Engine'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAr 
              ? 'إدارة السحوبات الأسبوعية، توزيع الجوائز آلياً، إهداء تذاكر التكافل، ومراقبة النزاهة التشفيرية.'
              : 'Manage draws, automated jackpot payouts, solidarity ticket airdrops, and provably fair proofs.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAirdropModal(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-black bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Gift className="w-3.5 h-3.5 text-amber-600" />
            <span>{isAr ? 'إهداء تذاكر مجانية' : 'Airdrop Tickets'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-black bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAr ? 'إنشاء سحب جديد' : 'New Draw'}</span>
          </button>

          <button
            type="button"
            onClick={loadAdminData}
            disabled={isLoading}
            className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
            title={isAr ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 block">{isAr ? 'الجائزة الكبرى النشطة' : 'Active Jackpot'}</span>
          <span className="text-base sm:text-lg font-black text-amber-600 font-mono">
            ${activeDraw ? activeDraw.jackpotAmount.toLocaleString() : '0.00'}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 block">{isAr ? 'التذاكر المباعة' : 'Tickets Sold'}</span>
          <span className="text-base sm:text-lg font-black text-indigo-600 font-mono">
            {stats?.totalTicketsSold || allTickets.length}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 block">{isAr ? 'إجمالي الجوائز الموزعة' : 'Total Payouts'}</span>
          <span className="text-base sm:text-lg font-black text-emerald-600 font-mono">
            ${(stats?.totalPrizesPaid || 32500).toLocaleString()}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 block">{isAr ? 'تذاكر تكافل معوضة' : 'Solidarity Tickets'}</span>
          <span className="text-base sm:text-lg font-black text-purple-600 font-mono">
            {stats?.compassionTicketsAwarded || 1420}
          </span>
        </div>
      </div>

      {/* Active Draw Management Box */}
      {activeDraw && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black font-mono px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {activeDraw.id}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeDraw.status === 'open' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                }`}>
                  {activeDraw.status === 'open' ? (isAr ? 'سحب مفتوح للشراء' : 'Open for Sales') : activeDraw.status}
                </span>
              </div>
              <h3 className="text-sm font-black text-slate-900 mt-1">
                {isAr ? activeDraw.titleAr : activeDraw.titleEn}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {activeDraw.status === 'open' && (
                <button
                  type="button"
                  onClick={() => setShowTriggerModal(true)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>{isAr ? 'إجراء السحب الآن' : 'Trigger Draw Now'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px]">{isAr ? 'سعر التذكرة' : 'Ticket Price'}</span>
              <span className="font-black text-slate-900">${activeDraw.ticketPrice.toFixed(2)}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px]">{isAr ? 'إجمالي المجمع' : 'Total Pool'}</span>
              <span className="font-black text-slate-900">${activeDraw.totalPool.toLocaleString()}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px]">{isAr ? 'التذاكر المباعة' : 'Tickets Sold'}</span>
              <span className="font-black text-indigo-700">{activeDraw.ticketsSoldCount}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px]">{isAr ? 'موعد الإغلاق' : 'Close Date'}</span>
              <span className="font-bold text-slate-800">{new Date(activeDraw.closeAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="bg-slate-900 text-slate-300 p-2.5 rounded-xl text-[10px] font-mono flex items-center justify-between gap-2 overflow-hidden">
            <span className="truncate">Pre-committed SHA256: {activeDraw.provablyFair.serverSeedHash}</span>
            <span className="text-emerald-400 font-bold shrink-0">{isAr ? 'مشفر ونزيه' : 'Provably Fair'}</span>
          </div>
        </div>
      )}

      {/* Ticket Explorer Section */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-900">
              {isAr ? 'سجل تذاكر المشتركين' : 'Participant Tickets Explorer'}
            </h3>
            <span className="text-xs font-bold text-slate-400">({filteredTickets.length})</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                placeholder={isAr ? 'بحث برقم التذكرة أو المشترك...' : 'Search ticket or user ID...'}
                className="text-xs px-2.5 py-1.5 pl-8 rounded-xl border border-slate-200 w-44 sm:w-56 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            </div>

            <select
              value={ticketFilter}
              onChange={(e) => setTicketFilter(e.target.value as any)}
              className="text-xs px-2 py-1.5 rounded-xl border border-slate-200 bg-white"
            >
              <option value="all">{isAr ? 'كافة التذاكر' : 'All Tickets'}</option>
              <option value="winners">{isAr ? 'الفائزة فقط' : 'Winners Only'}</option>
              <option value="pending">{isAr ? 'قيد الانتظار' : 'Pending Only'}</option>
            </select>
          </div>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            {isAr ? 'لا توجد تذاكر تطابق معايير البحث.' : 'No tickets matching search.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-2.5 font-bold">{isAr ? 'رقم التذكرة' : 'Ticket ID'}</th>
                  <th className="p-2.5 font-bold">{isAr ? 'المستخدم' : 'User'}</th>
                  <th className="p-2.5 font-bold">{isAr ? 'الأرقام' : 'Balls'}</th>
                  <th className="p-2.5 font-bold">{isAr ? 'طريقة الدفع' : 'Payment'}</th>
                  <th className="p-2.5 font-bold">{isAr ? 'الحالة والنتيجة' : 'Status'}</th>
                  <th className="p-2.5 font-bold">{isAr ? 'الجائزة' : 'Prize'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredTickets.slice(0, 15).map((t) => {
                  const isWinner = (t.prizeWon || 0) > 0;

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80">
                      <td className="p-2.5 font-mono font-bold text-slate-900">{t.id}</td>
                      <td className="p-2.5 font-mono text-slate-600">{t.userId}</td>
                      <td className="p-2.5">
                        <div className="flex items-center gap-1 font-mono">
                          {t.mainNumbers.map((n) => (
                            <span key={`t-num-${n}`} className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-900 font-bold text-[10px]">
                              {n}
                            </span>
                          ))}
                          <span className="text-slate-300">+</span>
                          {t.luckyNumbers.map((n) => (
                            <span key={`t-luck-${n}`} className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                              ★{n}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-2.5 text-[11px]">
                        {t.paymentMethod === 'compassion_free_ticket' ? (
                          <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                            {isAr ? 'تكافل مجانية' : 'Solidarity'}
                          </span>
                        ) : (
                          <span className="text-slate-700 font-medium">
                            ${t.pricePaid.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5">
                        {isWinner ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            {isAr ? 'فائزة' : 'Winner'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            {t.matchedMainCount !== undefined ? (isAr ? 'غير فائزة' : 'No Win') : (isAr ? 'نشطة' : 'Active')}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 font-black font-mono">
                        {isWinner ? (
                          <span className="text-emerald-600">+${t.prizeWon?.toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------- */}
      {/* MODAL: CREATE NEW DRAW                                      */}
      {/* ----------------------------------------------------------- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">
                {isAr ? 'جدولة وإنشاء سحب يانصيب جديد' : 'Schedule New Lottery Draw'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 font-black"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDraw} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isAr ? 'عنوان السحب (عربي):' : 'Title (Arabic):'}
                </label>
                <input
                  type="text"
                  value={newDrawTitleAr}
                  onChange={(e) => setNewDrawTitleAr(e.target.value)}
                  placeholder="سحب VEX الأسبوعي الكبرى"
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isAr ? 'عنوان السحب (إنجليزي):' : 'Title (English):'}
                </label>
                <input
                  type="text"
                  value={newDrawTitleEn}
                  onChange={(e) => setNewDrawTitleEn(e.target.value)}
                  placeholder="VEX Weekly Mega Draw"
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isAr ? 'سعر التذكرة ($):' : 'Ticket Price ($):'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={newDrawTicketPrice}
                    onChange={(e) => setNewDrawTicketPrice(parseFloat(e.target.value) || 1)}
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isAr ? 'الجائزة الكبرى المبدئية ($):' : 'Initial Jackpot ($):'}
                  </label>
                  <input
                    type="number"
                    step="500"
                    value={newDrawJackpot}
                    onChange={(e) => setNewDrawJackpot(parseFloat(e.target.value) || 15000)}
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isAr ? 'مدة فتح التذاكر (بالأيام):' : 'Duration (Days):'}
                </label>
                <input
                  type="number"
                  value={newDrawCloseDays}
                  onChange={(e) => setNewDrawCloseDays(parseInt(e.target.value, 10) || 7)}
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isCreatingDraw}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-700"
                >
                  {isCreatingDraw ? (isAr ? 'جاري الإنشاء...' : 'Creating...') : (isAr ? 'تأكيد الإنشاء' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* MODAL: TRIGGER DRAW NOW                                     */}
      {/* ----------------------------------------------------------- */}
      {showTriggerModal && activeDraw && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                <h3 className="text-sm font-black text-slate-900">
                  {isAr ? `إجراء السحب الفوري لـ ${activeDraw.id}` : `Execute Draw for ${activeDraw.id}`}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowTriggerModal(false);
                  setTriggerResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-black"
              >
                ✕
              </button>
            </div>

            {triggerResult ? (
              <div className="space-y-3 text-center py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-slate-900">
                  {isAr ? 'تم سحب الأرقام وتوزيع الجوائز بنجاح!' : 'Draw Executed & Winners Rewarded!'}
                </h4>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 block">
                    {isAr ? 'الكرات الفائزة المسحوبة:' : 'Drawn Winning Balls:'}
                  </span>
                  <div className="flex items-center justify-center gap-1.5 font-mono">
                    {triggerResult.winningMain.map((n) => (
                      <span key={`win-${n}`} className="w-7 h-7 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                        {n}
                      </span>
                    ))}
                    <span className="text-slate-300 font-bold">+</span>
                    {triggerResult.winningLucky.map((n) => (
                      <span key={`win-l-${n}`} className="w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-black text-xs flex items-center justify-center">
                        ★{n}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs font-bold text-slate-600 pt-1">
                    {isAr ? `الفائزين: ${triggerResult.totalWinners}` : `Winners: ${triggerResult.totalWinners}`} | {isAr ? `الجوائز: $${triggerResult.totalPayout}` : `Payout: $${triggerResult.totalPayout}`}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowTriggerModal(false);
                    setTriggerResult(null);
                  }}
                  className="w-full py-2.5 rounded-xl font-black text-xs bg-slate-900 text-white hover:bg-slate-800"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <p className="text-slate-600">
                  {isAr
                    ? 'سيقوم النظام بالسحب الآلي المشفر النزيه (Provably Fair) ومطابقة جميع التذاكر المسجلة وتوزيع الأرباح على حسابات الفائزين فوراً.'
                    : 'System will cryptographically draw winning balls, match all tickets, and automatically credit winner balances.'}
                </p>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                  <span className="font-bold text-amber-900 block text-[11px]">
                    {isAr ? 'خيارات متقدمة: إدخال كرات محددة يدوياً (اختياري)' : 'Optional: Override specific balls'}
                  </span>
                  <div>
                    <label className="text-[10px] text-amber-800 block mb-0.5">
                      {isAr ? '5 أرقام رئيسية (مفصولة بفواصل، مثل: 7, 14, 23, 38, 45):' : '5 Main numbers (comma separated):'}
                    </label>
                    <input
                      type="text"
                      value={manualWinningMain}
                      onChange={(e) => setManualWinningMain(e.target.value)}
                      placeholder="7, 14, 23, 38, 45"
                      className="w-full p-1.5 rounded-lg border border-amber-300 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-amber-800 block mb-0.5">
                      {isAr ? 'رقمين ذهبيين (مثل: 3, 9):' : '2 Lucky numbers (e.g. 3, 9):'}
                    </label>
                    <input
                      type="text"
                      value={manualWinningLucky}
                      onChange={(e) => setManualWinningLucky(e.target.value)}
                      placeholder="3, 9"
                      className="w-full p-1.5 rounded-lg border border-amber-300 bg-white font-mono"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTriggerDraw}
                  disabled={isTriggering}
                  className="w-full py-2.5 rounded-xl font-black text-xs bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center gap-1.5 shadow-xs"
                >
                  {isTriggering ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{isAr ? 'جاري سحب الكرات والمطابقة...' : 'Executing Draw...'}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>{isAr ? 'تأكيد وإجراء السحب الرسمي' : 'Confirm & Run Official Draw'}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* MODAL: AIRDROP FREE COMPASSION TICKETS                       */}
      {/* ----------------------------------------------------------- */}
      {showAirdropModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-black text-slate-900">
                  {isAr ? 'إهداء تذاكر تكافل مجانية' : 'Airdrop Solidarity Tickets'}
                </h3>
              </div>
              <button
                onClick={() => setShowAirdropModal(false)}
                className="text-slate-400 hover:text-slate-600 font-black"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isAr ? 'معرف المستخدم (User ID):' : 'Target User ID:'}
                </label>
                <input
                  type="text"
                  value={airdropUserId}
                  onChange={(e) => setAirdropUserId(e.target.value)}
                  placeholder="WCm5x8k2ab3f"
                  className="w-full p-2 rounded-xl border border-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isAr ? 'عدد التذاكر الممنوحة:' : 'Number of Free Tickets:'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={airdropCount}
                  onChange={(e) => setAirdropCount(parseInt(e.target.value, 10) || 1)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAirdropModal(false)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleAirdrop}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-amber-950 font-black hover:bg-amber-400 shadow-xs"
                >
                  {isAr ? 'منح التذاكر الآن' : 'Award Tickets'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
