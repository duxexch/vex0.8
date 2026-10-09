import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  SportsMatchFixture, 
  SportsNewsItem, 
  SitePost,
  Language, 
  AiMatchAnalysis, 
  SportsCategory,
  SmartOddsShiftAlert 
} from '../types';
import { SportsFixturesSkeleton } from './SkeletonLoader';
import { SportsNotificationsModal } from './SportsNotificationsModal';
import { vexApi } from '../services/api';
import { 
  getUserSubscription, 
  saveUserSubscription, 
  subscribeToUserSubscriptions,
  DEFAULT_SUBSCRIBED_LEAGUES,
  DEFAULT_SMART_ALERT_LEAGUES,
  evaluateMarketVolatility
} from '../services/userSubscriptionsService';
import {
  Bot,
  Sparkles,
  Trophy,
  Flame,
  Newspaper,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Clock,
  Filter,
  Calendar,
  CalendarPlus,
  ChevronRight,
  Send,
  BellRing,
  Sliders,
  Bell,
  BellOff,
  CheckCheck,
  Cloud,
  Zap,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

const DEFAULT_SPORTS_CATEGORIES: SportsCategory[] = [
  {
    id: 'cat-football',
    name: 'Football',
    nameAr: 'كرة القدم',
    icon: '⚽',
    enabled: true,
    leagues: [
      'الدوري الإسباني - الكلاسيكو',
      'الدوري الإنجليزي الممتاز',
      'دوري أبطال أوروبا',
      'الدوري الألماني - دير كلاسيكر',
      'دوري روشن السعودي - ديربي الرياض',
      'الدوري الإيطالي (Serie A)',
    ],
  },
  {
    id: 'cat-basketball',
    name: 'Basketball',
    nameAr: 'كرة السلة',
    icon: '🏀',
    enabled: true,
    leagues: [
      'NBA Basketball',
      'EuroLeague Basketball',
      'FIBA World Championship',
    ],
  },
  {
    id: 'cat-tennis',
    name: 'Tennis',
    nameAr: 'تنس',
    icon: '🎾',
    enabled: true,
    leagues: [
      'بطولات الغراند سلام (Grand Slam)',
      'بطولة ويمبلدون (Wimbledon)',
      'دورة رولان غاروس (Roland Garros)',
      'جولة ATP العالمية',
      'جولة WTA للسيدات',
    ],
  },
  {
    id: 'cat-combat',
    name: 'Combat & MMA',
    nameAr: 'فنون قتالية وملاكمة',
    icon: '🥊',
    enabled: true,
    leagues: [
      'UFC Championship',
      'مواجهات الملاكمة العالمية (WBC/WBA)',
      'ONE Championship',
    ],
  },
];

interface AiSportsHubTabProps {
  fixtures?: SportsMatchFixture[];
  news?: SportsNewsItem[];
  sitePosts?: SitePost[];
  loadingFixtures?: boolean;
  onAnalyzeMatch: (fixture: SportsMatchFixture) => void;
  onTriggerAgentBroadcast?: () => void;
  initialNews?: boolean;
  onNewsOpened?: () => void;
  lang: Language;
  userId?: string;
}

export const AiSportsHubTab: React.FC<AiSportsHubTabProps> = ({
  fixtures = [],
  news = [],
  sitePosts = [],
  loadingFixtures = false,
  onAnalyzeMatch,
  onTriggerAgentBroadcast,
  initialNews = false,
  onNewsOpened,
  lang,
  userId,
}) => {

  const isAr = lang === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<'fixtures' | 'news' | 'predictions'>(initialNews ? 'news' : 'fixtures');
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  // Predictions log — derived live from sitePosts (socket keeps them fresh)
  const predictions = useMemo(() => sitePosts.filter((p) => p && p.prediction), [sitePosts]);
  const pendingCount = predictions.filter((p) => p.prediction!.status === 'pending').length;
  const settledList = predictions.filter((p) => p.prediction!.status === 'settled');
  const verdictCount = (v: 'hit' | 'miss' | 'draw') => settledList.filter((p) => p.prediction!.verdict === v).length;
  // سلسلة التوقعات — accuracy over decided predictions + last-5 sequence
  const decidedCount = verdictCount('hit') + verdictCount('miss');
  const accuracyPct = decidedCount > 0 ? Math.round((verdictCount('hit') / decidedCount) * 100) : null;
  const last5Sequence = settledList
    .slice()
    .sort((a, b) => String(b.prediction!.settledAt || b.createdAt || '').localeCompare(String(a.prediction!.settledAt || a.createdAt || '')))
    .slice(0, 5)
    .map((p) => (p.prediction!.verdict === 'hit' ? '✅' : p.prediction!.verdict === 'miss' ? '❌' : '➖'))
    .join('');
  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(isAr ? 'ar-EG' : 'en-GB', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };
  const statusBadge = (p: NonNullable<SitePost['prediction']>) => {
    if (p.status === 'pending') {
      return {
        label: isAr ? '⏳ بانتظار النتيجة' : '⏳ Awaiting result',
        cls: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    }
    switch (p.verdict) {
      case 'hit':
        return { label: isAr ? '✅ تحقق' : '✅ Hit', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'miss':
        return { label: isAr ? '❌ لم يتحقق' : '❌ Missed', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { label: isAr ? '➖ تعادل' : '➖ Draw', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
  };

  useEffect(() => {
    if (initialNews && typeof onNewsOpened === 'function') {
      onNewsOpened();
    }
    // Consume the flag once on mount (tab remounts on each tab switch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [targetCategoryIdForAlerts, setTargetCategoryIdForAlerts] = useState<string | null>(null);

  const effectiveUserId = userId || vexApi.getUserId();
  const [isSyncingWithFirestore, setIsSyncingWithFirestore] = useState(false);
  const [firestoreSynced, setFirestoreSynced] = useState(false);

  const [subscribedLeagues, setSubscribedLeagues] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('vex_subscribed_leagues');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_SUBSCRIBED_LEAGUES;
  });

  const [smartAlertLeagues, setSmartAlertLeagues] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('vex_smart_alert_leagues');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_SMART_ALERT_LEAGUES;
  });

  const [selectedSmartAlertForInspection, setSelectedSmartAlertForInspection] = useState<SmartOddsShiftAlert | null>(null);

  // Sync with Firestore UserSubscriptions collection on mount and subscribe to real-time changes
  useEffect(() => {
    if (!effectiveUserId) return;

    let isMounted = true;
    setIsSyncingWithFirestore(true);

    // Initial load from Firestore document /UserSubscriptions/{userId}
    getUserSubscription(effectiveUserId)
      .then((record) => {
        if (isMounted && record) {
          if (Array.isArray(record.subscribedLeagues)) {
            setSubscribedLeagues(record.subscribedLeagues);
          }
          if (Array.isArray(record.smartAlertLeagues)) {
            setSmartAlertLeagues(record.smartAlertLeagues);
          }
          setFirestoreSynced(true);
        }
      })
      .catch((err) => {
        console.warn('Failed to load initial subscription from Firestore:', err);
      })
      .finally(() => {
        if (isMounted) setIsSyncingWithFirestore(false);
      });

    // Real-time onSnapshot listener
    const unsubscribe = subscribeToUserSubscriptions(effectiveUserId, (record) => {
      if (isMounted && record) {
        if (Array.isArray(record.subscribedLeagues)) {
          setSubscribedLeagues(record.subscribedLeagues);
        }
        if (Array.isArray(record.smartAlertLeagues)) {
          setSmartAlertLeagues(record.smartAlertLeagues);
        }
        setFirestoreSynced(true);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [effectiveUserId]);

  // Direct toggle for individual league alerts (writes directly to Firestore)
  const handleToggleLeagueAlert = async (leagueName: string) => {
    if (!leagueName) return;

    const isSubscribed = subscribedLeagues.includes(leagueName);
    const updated = isSubscribed 
      ? subscribedLeagues.filter(l => l !== leagueName)
      : [...subscribedLeagues, leagueName];

    // Optimistic local state update
    setSubscribedLeagues(updated);
    setIsSyncingWithFirestore(true);

    try {
      await saveUserSubscription(effectiveUserId, {
        subscribedLeagues: updated,
        smartAlertLeagues,
      });
      setFirestoreSynced(true);
    } catch (err) {
      console.warn('Failed to persist league subscription to Firestore:', err);
    } finally {
      setIsSyncingWithFirestore(false);
    }
  };

  // Direct toggle for AI-powered Smart Alert (Odds shifts & High Volatility)
  const handleToggleSmartAlert = async (leagueName: string) => {
    if (!leagueName) return;

    const isSmart = smartAlertLeagues.includes(leagueName);
    const updated = isSmart
      ? smartAlertLeagues.filter(l => l !== leagueName)
      : [...smartAlertLeagues, leagueName];

    // Optimistic local state update
    setSmartAlertLeagues(updated);
    setIsSyncingWithFirestore(true);

    try {
      await saveUserSubscription(effectiveUserId, {
        subscribedLeagues,
        smartAlertLeagues: updated,
      });
      setFirestoreSynced(true);
    } catch (err) {
      console.warn('Failed to persist smart alert league to Firestore:', err);
    } finally {
      setIsSyncingWithFirestore(false);
    }
  };
  
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDate, setSelectedDate] = useState<string>('All');

  const openManageAlerts = (categoryId?: string) => {
    setTargetCategoryIdForAlerts(categoryId || null);
    setNotificationsModalOpen(true);
  };

  const categories = ['All', ...Array.from(new Set(fixtures.map(f => f.category).filter(Boolean)))];
  const dates = ['All', ...Array.from(new Set(fixtures.map(f => f.date).filter(Boolean)))];

  // Detect real-time leagues with active high-volatility betting markets or odds shifts
  const activeOddsShiftLeagues = useMemo(() => {
    const set = new Set<string>();
    fixtures.forEach((f) => {
      if (evaluateMarketVolatility(f)) {
        set.add(f.league);
      }
    });
    return Array.from(set);
  }, [fixtures]);

  const filteredFixtures = fixtures.filter(f => {
    const matchCategory = selectedCategory === 'All' || f.category === selectedCategory;
    const matchDate = selectedDate === 'All' || f.date === selectedDate;
    return matchCategory && matchDate;
  });


  const topMatch = fixtures[0];

  const handleBroadcast = async () => {
    if (!onTriggerAgentBroadcast) return;
    setBroadcastLoading(true);
    try {
      await onTriggerAgentBroadcast();
    } finally {
      setTimeout(() => setBroadcastLoading(false), 800);
    }
  };

  const downloadICS = (fixture: SportsMatchFixture) => {
    // Try to extract time (HH:MM) from kickoffTime. Default to current time + 2 hours if not found.
    const timeMatch = fixture.kickoffTime.match(/(\d{1,2}):(\d{2})/);
    const date = new Date();
    
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      date.setHours(hours, minutes, 0, 0);
    } else {
      date.setHours(date.getHours() + 2);
    }

    const endDate = new Date(date.getTime() + 2 * 60 * 60 * 1000); // Assume match duration of 2 hours

    const formatDate = (d: Date) => {
      return d.toISOString().replace(/-|:|\.\d+/g, '').substring(0, 15) + 'Z';
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//VEX Deals//Sports Fixtures//EN
BEGIN:VEVENT
SUMMARY:${fixture.homeTeam} vs ${fixture.awayTeam} (${fixture.league})
DTSTART:${formatDate(date)}
DTEND:${formatDate(endDate)}
DESCRIPTION:Match between ${fixture.homeTeam} and ${fixture.awayTeam}. Category: ${fixture.category || 'Sports'}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fixture.homeTeam}-vs-${fixture.awayTeam}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3.5 pb-24 select-none" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Featured AI Agent Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                {isAr ? 'وكيل التحليلات التكتيكية' : 'Sports AI Agent'}
              </span>
              <h2 className="text-sm font-black text-slate-900">
                {isAr ? 'التحليلات الرياضية الذكية' : 'AI Sports Analytics'}
              </h2>
            </div>
          </div>

          <button
            onClick={handleBroadcast}
            disabled={broadcastLoading}
            className="h-8 flex items-center gap-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all shadow-2xs disabled:opacity-50"
            title={isAr ? 'بث توقع ذكي فوري' : 'Broadcast AI Prediction'}
          >
            {broadcastLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{isAr ? 'بث توقع' : 'Broadcast'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          {isAr
            ? 'تحليل تكتيكي مدعوم بالذكاء الاصطناعي لجاهزية الفرق، الغيابات ومعدلات الأهداف المتوقعة مع تنبيهات فورية.'
            : 'AI-driven tactical analysis of team readiness, line-ups, and expected goals with instant alerts.'}
        </p>

        {/* Quick Highlight of Top Match */}
        {topMatch && (
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                {isAr ? 'قمة الجولة' : 'Top Match'}
              </span>
              <span className="text-xs font-bold text-slate-800">
                {topMatch.homeTeam} ضد {topMatch.awayTeam}
              </span>
            </div>

            <button
              onClick={() => onAnalyzeMatch(topMatch)}
              className="h-7 flex items-center gap-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition-all active:scale-95"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>{isAr ? 'تقرير تكتيكي' : 'Analyze'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Sub Tab Switcher: Fixtures vs News */}
      <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
        <button
          onClick={() => setActiveSubTab('fixtures')}
          className={`flex-1 h-8 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all ${
            activeSubTab === 'fixtures'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span>{isAr ? 'المباريات والتوقعات' : 'Matches'}</span>
          <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-slate-100 text-slate-600 font-mono">
            {fixtures.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('news')}
          className={`flex-1 h-8 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all ${
            activeSubTab === 'news'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Newspaper className="w-3.5 h-3.5 text-sky-600" />
          <span>{isAr ? 'الأخبار الرياضية' : 'News'}</span>
          <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-slate-100 text-slate-600 font-mono">
            {news.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('predictions')}
          className={`flex-1 h-8 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all ${
            activeSubTab === 'predictions'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-purple-600" />
          <span>{isAr ? 'سجل التوقعات' : 'Predictions'}</span>
          <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-slate-100 text-slate-600 font-mono">
            {predictions.length}
          </span>
        </button>
      </div>

      {/* Filters & Settings (Only for fixtures) */}
      {activeSubTab === 'fixtures' && (
        <div className="space-y-2.5 mb-3">
          {/* Sports Categories Strip with 'Manage Alerts' */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isAr ? 'أقسام الرياضات وتنبيهات الدوريات' : 'Sports Categories & League Alerts'}</span>
                </span>
                <div className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                  <Cloud className={`w-3 h-3 text-emerald-600 ${isSyncingWithFirestore ? 'animate-pulse' : ''}`} />
                  <span>{isSyncingWithFirestore ? (isAr ? 'مزامنة سحابية...' : 'Syncing...') : (isAr ? 'متزامن مع Firestore' : 'Firestore Synced')}</span>
                </div>
              </div>
              <button
                onClick={() => openManageAlerts()}
                className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1.5 cursor-pointer transition-colors text-[11px] bg-emerald-50/70 hover:bg-emerald-100/70 px-2.5 py-1 rounded-lg border border-emerald-200/60"
              >
                <BellRing className="w-3 h-3 text-emerald-600" />
                <span>{isAr ? 'إدارة جميع التنبيهات' : 'Manage All Alerts'}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-mono font-bold">
                  {subscribedLeagues.length}
                </span>
              </button>
            </div>

            {/* Categories Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DEFAULT_SPORTS_CATEGORIES.map((cat) => {
                const isFiltered = selectedCategory === cat.name;
                const catLeagues = cat.leagues || [];
                const activeCount = catLeagues.filter(l => subscribedLeagues.includes(l)).length;

                return (
                  <div
                    key={cat.id}
                    className={`relative p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                      isFiltered
                        ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-200 shadow-2xs'
                        : 'bg-slate-50/60 border-slate-200/80 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    {/* Category Details & Filter toggle */}
                    <div 
                      onClick={() => setSelectedCategory(isFiltered ? 'All' : cat.name)}
                      className="cursor-pointer select-none group"
                      title={isAr ? `تصفية حسب ${cat.nameAr}` : `Filter by ${cat.name}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-lg p-1 rounded-lg bg-white border border-slate-200/70 shadow-2xs group-hover:scale-105 transition-transform">
                          {cat.icon}
                        </span>
                        {activeCount > 0 ? (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            {activeCount} {isAr ? 'مفعل' : 'Active'}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-slate-200/70 text-slate-500">
                            {isAr ? 'معطل' : 'Muted'}
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5">
                        <h4 className={`font-black text-xs transition-colors truncate ${
                          isFiltered ? 'text-emerald-900' : 'text-slate-800 group-hover:text-emerald-700'
                        }`}>
                          {isAr ? cat.nameAr : cat.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                          {catLeagues.length} {isAr ? 'دوريات وبطولات' : 'sub-leagues'}
                        </p>
                      </div>
                    </div>

                    {/* Dedicated 'Manage Alerts' Toggle Switch & Bell for Category */}
                    <div 
                      onClick={() => {
                        triggerHaptic('light');
                        openManageAlerts(cat.id);
                      }}
                      className="w-full h-8 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-between gap-1.5 transition-all cursor-pointer shadow-3xs active:scale-98"
                      title={isAr ? `تعديل تنبيهات وإشعارات ${cat.nameAr}` : `Toggle alerts for ${cat.name}`}
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        <Bell className={`w-3.5 h-3.5 shrink-0 transition-colors ${activeCount > 0 ? 'text-emerald-600 animate-bounce' : 'text-slate-400'}`} />
                        <span className="text-[10px] font-black text-slate-500 truncate">
                          {isAr ? 'التنبيهات' : 'Alerts'}
                        </span>
                      </div>
                      
                      {/* Premium Slide Toggle Switch Widget with RTL/LTR Mirrored Physics */}
                      <div className={`w-7 h-4 rounded-full p-0.5 shrink-0 transition-colors duration-200 flex items-center ${activeCount > 0 ? 'bg-emerald-600' : 'bg-slate-200'}`}>
                        <div className={`w-3 h-3 rounded-full bg-white shadow-3xs transition-transform duration-200 transform ${
                          activeCount > 0 
                            ? (isAr ? '-translate-x-3' : 'translate-x-3') 
                            : 'translate-x-0'
                        }`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Secondary Dropdown Filters */}
          <div className="flex gap-2">
            <div className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                {categories.map(cat => (
                  <option key={cat as string} value={cat as string}>
                    {cat === 'All' ? (isAr ? 'كل الرياضات' : 'All Sports') : (cat as string)}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                {dates.map(d => (
                  <option key={d as string} value={d as string}>
                    {d === 'All' ? (isAr ? 'كل التواريخ' : 'All Dates') : (d as string)}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => openManageAlerts()}
              className="h-[38px] px-3 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors shrink-0 shadow-2xs cursor-pointer"
              title={isAr ? 'إدارة التنبيهات المباشرة' : 'Manage Alerts'}
            >
              <BellRing className="w-4 h-4 text-emerald-600" />
            </button>
          </div>

          {/* AI Smart Alerts (High-Volatility Betting Markets & Odds Shifts) Panel */}
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-300/90 rounded-2xl p-3.5 shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-2xs">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-black text-xs text-amber-950">
                      {isAr ? 'التنبيهات الذكية: تقلبات المراهنات وتحركات الاحتمالات (Smart Alerts)' : 'AI Smart Alerts: Betting Odds Volatility'}
                    </h3>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-200 text-amber-900">
                      AI Engine
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-800">
                    {isAr 
                      ? 'يقترح تلقائياً تنبيهات فورية عند رصد سيولة مفاجئة أو هبوط حاد في احتمالات الأسواق للدوريات المفعلة.'
                      : 'Automatically suggests alerts based on high-volatility betting markets or significant odds shifts.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-lg flex items-center gap-1.5">
                  {activeOddsShiftLeagues.length > 0 && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                  )}
                  <span>{smartAlertLeagues.length} {isAr ? 'دوريات ذكية مفعلة' : 'Smart Leagues'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => openManageAlerts()}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                >
                  <Sliders className="w-3 h-3" />
                  <span>{isAr ? 'تخصيص الدوريات' : 'Configure'}</span>
                </button>
              </div>
            </div>

            {/* Smart Volatility Suggestions Grid */}
            {(() => {
              const detected = fixtures
                .map(f => evaluateMarketVolatility(f))
                .filter((a): a is SmartOddsShiftAlert => a !== null);

              if (detected.length === 0) {
                return (
                  <div className="bg-white/70 rounded-xl p-2.5 text-center text-xs text-amber-800 border border-amber-200/60">
                    {isAr 
                      ? 'الأسواق مستقرة حالياً ولا توجد تحركات احتمالات حادة غير اعتيادية.' 
                      : 'Betting markets currently stable; no sharp odds volatility detected.'}
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-0.5">
                  {detected.map((alert) => {
                    const isMonitored = smartAlertLeagues.includes(alert.league);
                    const matchingFixture = fixtures.find(f => f.id === alert.fixtureId);

                    return (
                      <div
                        key={alert.fixtureId}
                        className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 shadow-2xs ${
                          isMonitored 
                            ? 'bg-white border-amber-300 ring-1 ring-amber-200/70' 
                            : 'bg-white/70 border-slate-200/80 opacity-90'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-1.5 text-xs">
                            <span className="font-bold text-slate-800 truncate flex items-center gap-1">
                              <Trophy className="w-3 h-3 text-amber-500 shrink-0" />
                              {alert.matchTitle}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md ${
                                alert.volatilityLevel === 'extreme' 
                                  ? 'bg-rose-100 text-rose-800' 
                                  : alert.volatilityLevel === 'high'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-blue-100 text-blue-800'
                              }`}>
                                {isAr ? 'تقلب:' : 'Volatility:'} {
                                  alert.volatilityLevel === 'extreme' ? (isAr ? 'حاد' : 'Extreme') :
                                  alert.volatilityLevel === 'high' ? (isAr ? 'عالي' : 'High') :
                                  (isAr ? 'متوسط' : 'Moderate')
                                }
                              </span>
                              <span className="text-[10px] font-mono font-black text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                {alert.shiftPercentage}%
                              </span>
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-medium">{isAr ? 'السوق المتأثر:' : 'Market:'} {alert.marketType}</span>
                              <span className="font-mono text-slate-700 font-bold">
                                {alert.previousOdds} ➔ <span className="text-emerald-700">{alert.currentOdds}</span>
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs pt-0.5 border-t border-slate-200/60">
                              <span className="font-bold text-amber-900">{isAr ? 'الاقتراح الذكي:' : 'Smart Pick:'}</span>
                              <span className="font-black text-emerald-800">{alert.suggestedPick}</span>
                            </div>
                          </div>

                          <p className="text-[10px] text-slate-600 leading-tight">
                            {isAr ? alert.reasoningAr : alert.reasoningEn}
                          </p>
                        </div>

                        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleSmartAlert(alert.league)}
                            className={`relative px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                              isMonitored
                                ? 'bg-amber-500 text-white border-amber-600 shadow-2xs hover:bg-amber-600'
                                : 'bg-white text-slate-700 border-amber-300 hover:bg-amber-50 hover:text-amber-800'
                            } animate-smart-glow ring-2 ring-amber-400/50`}
                            title={
                              isAr
                                ? '🔥 رصد تحرك حاد في الاحتمالات في الوقت الفعلي! انقر لتبديل التنبيه الذكي'
                                : '🔥 Real-time sharp odds shift detected! Click to toggle Smart Alert'
                            }
                          >
                            <Sparkles className={`w-3.5 h-3.5 ${isMonitored ? 'text-amber-100' : 'text-amber-500 animate-pulse'}`} />
                            <span>
                              {isMonitored ? (isAr ? 'تنبيه ذكي: نشط' : 'Smart: Active') : (isAr ? 'تفعيل للدوري' : 'Enable League')}
                            </span>
                            <span className="absolute -top-1 -right-1 flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                          </button>

                          {matchingFixture && (
                            <button
                              type="button"
                              onClick={() => onAnalyzeMatch(matchingFixture)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Bot className="w-3 h-3" />
                              <span>{isAr ? 'تحليل الفرصة' : 'Analyze Pick'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Fixtures List */}
      {activeSubTab === 'fixtures' && (
        <div>
          {loadingFixtures ? (
            <SportsFixturesSkeleton />
          ) : filteredFixtures.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
              {isAr ? 'لا توجد مباريات مطابقة للبحث' : 'No matches found matching criteria'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredFixtures.map((fixture) => (
                <div
                  key={fixture.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition-all spotlight-surface tilt-card-3d"
                >
                  <div className="space-y-3">
                    {/* League & Kickoff */}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5 truncate max-w-[140px]">
                        <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">{fixture.league}</span>
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* AI Smart Alert Toggle (Odds Shifts & Volatility) */}
                        {(() => {
                          const hasOddsShift = !!evaluateMarketVolatility(fixture);
                          const isSmartActive = smartAlertLeagues.includes(fixture.league);

                          return (
                            <button
                              onClick={() => handleToggleSmartAlert(fixture.league)}
                              className={`relative p-1 rounded-md border transition-all cursor-pointer ${
                                isSmartActive
                                  ? 'bg-amber-500 border-amber-600 text-white shadow-2xs hover:bg-amber-600'
                                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-amber-700 hover:bg-amber-50'
                              } ${hasOddsShift ? 'animate-smart-glow border-amber-400 ring-2 ring-amber-400/50' : ''}`}
                              title={
                                hasOddsShift
                                  ? (isAr 
                                      ? `🔥 تحرك حاد في احتمالات ${fixture.league} تم رصده في الوقت الفعلي! انقر لتفعيل التنبيه الذكي` 
                                      : `🔥 Real-time sharp odds shift detected for ${fixture.league}! Click to toggle Smart Alert`)
                                  : isSmartActive
                                    ? (isAr ? `تنبيه ذكي لتقلبات احتمالات ${fixture.league} مفعل في Firestore` : `Smart Alert active for ${fixture.league} in Firestore`)
                                    : (isAr ? `تفعيل التنبيه الذكي لتقلبات واحتمالات ${fixture.league}` : `Enable Smart Alert for ${fixture.league}`)
                              }
                            >
                              <Sparkles className={`w-3.5 h-3.5 ${isSmartActive ? 'text-amber-100' : hasOddsShift ? 'text-amber-600 animate-pulse' : 'text-slate-400'}`} />
                              {hasOddsShift && (
                                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                </span>
                              )}
                            </button>
                          );
                        })()}

                        {/* 1-Click League Alert Toggle Persisted to Firestore UserSubscriptions */}
                        <button
                          onClick={() => {
                            triggerHaptic('medium');
                            handleToggleLeagueAlert(fixture.league);
                          }}
                          className={`p-1.5 rounded-xl border transition-all cursor-pointer active:scale-90 ${
                            subscribedLeagues.includes(fixture.league)
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/20'
                              : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-emerald-50'
                          }`}
                          title={
                            subscribedLeagues.includes(fixture.league)
                              ? (isAr ? `تنبيهات ${fixture.league} مفعلة في Firestore (انقر لإلغاء التفعيل)` : `${fixture.league} alerts active in Firestore (click to mute)`)
                              : (isAr ? `تفعيل تنبيهات ${fixture.league} في Firestore` : `Enable ${fixture.league} alerts in Firestore`)
                          }
                        >
                          {subscribedLeagues.includes(fixture.league) ? (
                            <Bell className="w-3.5 h-3.5 text-white animate-bounce" />
                          ) : (
                            <Bell className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span className="flex items-center gap-1 font-mono text-[11px] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md text-slate-600">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {fixture.kickoffTime}
                        </span>
                        <button
                          onClick={() => downloadICS(fixture)}
                          className="p-1 rounded-md bg-slate-50 border border-slate-200 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title={isAr ? 'أضف إلى التقويم' : 'Add to Calendar'}
                        >
                          <CalendarPlus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Teams Showcase */}
                    <div className="flex items-center justify-between gap-3 py-2 border-y border-slate-100">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <img
                          src={fixture.homeLogo}
                          alt={fixture.homeTeam}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-xl object-contain border border-slate-200 p-0.5 bg-slate-50 shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900 block truncate">
                            {fixture.homeTeam}
                          </span>
                          <span className="text-[10px] text-slate-400">{isAr ? 'مضيف' : 'Home'}</span>
                        </div>
                      </div>

                      <div className="text-center px-2 shrink-0">
                        <span className="text-xs font-black text-slate-400 font-mono">VS</span>
                      </div>

                      <div className="flex items-center justify-end gap-2.5 flex-1 min-w-0 text-left" dir="ltr">
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900 block text-right truncate">
                            {fixture.awayTeam}
                          </span>
                          <span className="text-[10px] text-slate-400 block text-right">{isAr ? 'ضيف' : 'Away'}</span>
                        </div>
                        <img
                          src={fixture.awayLogo}
                          alt={fixture.awayTeam}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-xl object-contain border border-slate-200 p-0.5 bg-slate-50 shrink-0"
                        />
                      </div>
                    </div>

                    {/* AI Smart Volatility & Odds Shift Banner (if detected) */}
                    {(() => {
                      const shiftAlert = evaluateMarketVolatility(fixture);
                      if (!shiftAlert) return null;

                      const isLeagueSmart = smartAlertLeagues.includes(fixture.league);

                      return (
                        <div 
                          onClick={() => onAnalyzeMatch(fixture)}
                          className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                            isLeagueSmart
                              ? 'bg-gradient-to-r from-amber-50 to-orange-50/80 border-amber-300 shadow-2xs hover:border-amber-400'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                          }`}
                          title={isAr ? 'انقر لعرض التحليل التكتيكي للذكاء الاصطناعي' : 'Click to view AI tactical analysis'}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Zap className={`w-3.5 h-3.5 shrink-0 ${isLeagueSmart ? 'text-amber-600 animate-pulse' : 'text-slate-400'}`} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-black truncate ${isLeagueSmart ? 'text-amber-950' : 'text-slate-700'}`}>
                                  {isAr ? 'تقلب احتمالات ملحوظ:' : 'Sharp Odds Shift:'}
                                </span>
                                <span className="text-[9px] font-bold font-mono px-1 rounded bg-rose-100 text-rose-800 tabular-nums">
                                  {shiftAlert.shiftPercentage}%
                                </span>
                              </div>
                              <span className="text-[9px] text-slate-500 block truncate tabular-nums">
                                {shiftAlert.marketType}: {shiftAlert.previousOdds} ➔ {shiftAlert.currentOdds}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-1">
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200 font-mono tabular-nums">
                              {shiftAlert.suggestedPick}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Odds Grid */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-200">
                        <span className="text-[10px] text-slate-500 block mb-0.5 truncate">
                          1 ({fixture.homeTeam.slice(0, 8)})
                        </span>
                        <span className="text-xs font-black text-emerald-700 font-mono tabular-nums">
                          {fixture.odds.home}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-200">
                        <span className="text-[10px] text-slate-500 block mb-0.5">{isAr ? 'X (تعادل)' : 'X (Draw)'}</span>
                        <span className="text-xs font-black text-amber-700 font-mono tabular-nums">
                          {fixture.odds.draw}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-200">
                        <span className="text-[10px] text-slate-500 block mb-0.5 truncate">
                          2 ({fixture.awayTeam.slice(0, 8)})
                        </span>
                        <span className="text-xs font-black text-sky-700 font-mono tabular-nums">
                          {fixture.odds.away}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action: AI Analysis */}
                  <div className="pt-2.5 flex items-center justify-between border-t border-slate-100">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      {isAr ? '+18 تحليل تكتيكي' : '+18 Tactical Analysis'}
                    </span>

                    <button
                      onClick={() => onAnalyzeMatch(fixture)}
                      className="h-8 flex items-center gap-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                    >
                      <Bot className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{isAr ? 'تقرير الذكاء الاصطناعي' : 'AI Report'}</span>
                      <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sports News Feed */}
      {activeSubTab === 'news' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {news.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="h-40 w-full relative overflow-hidden bg-slate-100">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-500/25 via-sky-500/20 to-indigo-500/25 flex items-center justify-center">
                      <Newspaper className="w-9 h-9 text-emerald-600/70" />
                    </div>
                  )}
                  <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-md bg-white/90 backdrop-blur-xs text-emerald-700 text-[10px] font-bold border border-slate-200">
                    {item.category}
                  </span>
                </div>

                <div className="p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-bold text-slate-700">{item.source}</span>
                    <span>{item.publishedAt}</span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {item.summary}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Predictions Log — سجل التوقعات */}
      {activeSubTab === 'predictions' && (
        <div className="space-y-3">
          {/* Summary strip */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
              ⏳ {isAr ? 'بانتظار النتيجة' : 'Awaiting'}: {pendingCount}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              ✅ {isAr ? 'تحقق' : 'Hit'}: {verdictCount('hit')}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
              ❌ {isAr ? 'لم يتحقق' : 'Missed'}: {verdictCount('miss')}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
              ➖ {isAr ? 'تعادل' : 'Draw'}: {verdictCount('draw')}
            </span>
            {accuracyPct !== null && (
              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                🎯 {isAr ? 'دقة السلسلة' : 'Series accuracy'}: {accuracyPct}%
              </span>
            )}
            {last5Sequence && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 font-mono">
                {isAr ? 'آخر5:' : 'Last 5:'} {last5Sequence}
              </span>
            )}
          </div>

          {predictions.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center">
              <Bot className="w-9 h-9 text-purple-400 mx-auto mb-2.5" />
              <p className="text-sm font-bold text-slate-700">
                {isAr ? 'لا توجد توقعات منشورة بعد' : 'No predictions published yet'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {isAr
                  ? 'تُنشر توقعات المباريات هنا تلقائيًا بعد تحليل الاحتمالات'
                  : 'Match forecasts appear here automatically once odds are analyzed'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {predictions.map((post) => {
                const pred = post.prediction!;
                const badge = statusBadge(pred);
                return (
                  <div
                    key={post.id}
                    className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs flex flex-col"
                  >
                    <div className="p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xs font-black text-slate-900 leading-snug truncate">
                          {pred.homeTeam} × {pred.awayTeam}
                        </h3>
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </div>

                      {/* Win probability bars */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                          <span className="truncate">🟢 {pred.homeTeam}</span>
                          <span className="font-mono text-emerald-700">{pred.pHome}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${pred.pHome}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                          <span className="truncate">🔵 {pred.awayTeam}</span>
                          <span className="font-mono text-sky-700">{pred.pAway}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-sky-500 rounded-full transition-all"
                            style={{ width: `${pred.pAway}%` }}
                          />
                        </div>
                      </div>

                      {/* Predicted vs actual score */}
                      <div className="flex items-center justify-between text-[11px] bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5">
                        <span className="text-slate-600 font-bold flex items-center gap-1">
                          🎯 {isAr ? 'المتوقع' : 'Predicted'}:
                          <span className="font-mono text-slate-900">{pred.predictedScore}</span>
                        </span>
                        {pred.status === 'settled' && pred.actualScore && (
                          <span className="font-black text-slate-900 flex items-center gap-1">
                            {isAr ? 'النتيجة' : 'Final'}:
                            <span className="font-mono">{pred.actualScore}</span>
                          </span>
                        )}
                      </div>

                      {pred.status === 'settled' && (
                        <div
                          className={`text-center text-[11px] font-black rounded-xl py-1.5 border ${badge.cls}`}
                        >
                          {badge.label}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{formatTime(pred.createdAt)}</span>
                        <span className="font-bold text-slate-500">
                          {pred.pctSource === 'odds'
                            ? isAr
                              ? 'من الودز'
                              : 'From odds'
                            : pred.pctSource === 'explicit'
                              ? isAr
                                ? 'نسبة صريحة'
                                : 'Explicit %'
                              : pred.pctSource === 'ai'
                                ? 'Gemini AI'
                                : isAr
                                  ? 'افتراضي'
                                  : 'Default'}
                        </span>
                      </div>
                    </div>

                    {post.image && (
                      <div className="h-28 w-full overflow-hidden bg-slate-100 mt-auto">
                        <img
                          src={post.image}
                          alt={pred.homeTeam}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <SportsNotificationsModal 
        isOpen={notificationsModalOpen}
        onClose={() => {
          setNotificationsModalOpen(false);
          setTargetCategoryIdForAlerts(null);
        }}
        lang={lang}
        categories={DEFAULT_SPORTS_CATEGORIES}
        initialCategoryId={targetCategoryIdForAlerts}
        userId={effectiveUserId}
        subscribedLeagues={subscribedLeagues}
        onUpdateSubscriptions={(leagues) => setSubscribedLeagues(leagues)}
        smartAlertLeagues={smartAlertLeagues}
        activeOddsShiftLeagues={activeOddsShiftLeagues}
        onUpdateSmartAlerts={(leagues) => setSmartAlertLeagues(leagues)}
      />
    </div>
  );
};
