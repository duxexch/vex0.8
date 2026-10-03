import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Bell, 
  Save, 
  CheckCircle2, 
  Sliders, 
  Trophy, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Sparkles, 
  Radio, 
  Zap,
  CheckCheck,
  Cloud,
  CloudCheck
} from 'lucide-react';
import { SportsCategory } from '../types';
import { 
  saveUserSubscription, 
  DEFAULT_SMART_ALERT_LEAGUES 
} from '../services/userSubscriptionsService';

interface SportsNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'ar' | 'en' | 'es' | 'ru';
  categories: SportsCategory[];
  initialCategoryId?: string | null;
  userId?: string;
  subscribedLeagues?: string[];
  smartAlertLeagues?: string[];
  activeOddsShiftLeagues?: string[];
  onUpdateSubscriptions?: (subscribedLeagues: string[], notificationTypes?: string[]) => void;
  onUpdateSmartAlerts?: (smartAlertLeagues: string[]) => void;
}

const STORAGE_KEY = 'vex_subscribed_leagues';
const SMART_LEAGUES_STORAGE_KEY = 'vex_smart_alert_leagues';
const NOTIFICATION_TYPES_KEY = 'vex_notification_types';

export const SportsNotificationsModal: React.FC<SportsNotificationsModalProps> = ({
  isOpen,
  onClose,
  lang,
  categories,
  initialCategoryId,
  userId,
  subscribedLeagues: propSubscribedLeagues,
  smartAlertLeagues: propSmartAlertLeagues,
  activeOddsShiftLeagues = [],
  onUpdateSubscriptions,
  onUpdateSmartAlerts,
}) => {
  const isAr = lang === 'ar';
  
  // Subscribed leagues state
  const [subscribedLeagues, setSubscribedLeagues] = useState<string[]>(() => {
    if (propSubscribedLeagues && propSubscribedLeagues.length > 0) {
      return propSubscribedLeagues;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      'الدوري الإسباني - الكلاسيكو',
      'الدوري الإنجليزي الممتاز',
      'دوري أبطال أوروبا',
      'NBA Basketball'
    ];
  });

  // Smart alert leagues state (AI high-volatility & odds shift detection)
  const [smartAlertLeagues, setSmartAlertLeagues] = useState<string[]>(() => {
    if (propSmartAlertLeagues && propSmartAlertLeagues.length > 0) {
      return propSmartAlertLeagues;
    }
    try {
      const saved = localStorage.getItem(SMART_LEAGUES_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_SMART_ALERT_LEAGUES;
  });

  // Sync state if prop changes
  useEffect(() => {
    if (propSubscribedLeagues && propSubscribedLeagues.length > 0) {
      setSubscribedLeagues(propSubscribedLeagues);
    }
  }, [propSubscribedLeagues]);

  useEffect(() => {
    if (propSmartAlertLeagues && propSmartAlertLeagues.length > 0) {
      setSmartAlertLeagues(propSmartAlertLeagues);
    }
  }, [propSmartAlertLeagues]);

  // Notification types state
  const [notificationTypes, setNotificationTypes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(NOTIFICATION_TYPES_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return ['kickoff', 'goals', 'ai_predictions'];
  });

  // Expanded category for managing sub-leagues
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(
    initialCategoryId || categories[0]?.id || null
  );

  const [saved, setSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync with initialCategoryId prop when it changes
  useEffect(() => {
    if (initialCategoryId) {
      setExpandedCategoryId(initialCategoryId);
    } else if (categories.length > 0 && !expandedCategoryId) {
      setExpandedCategoryId(categories[0].id);
    }
  }, [initialCategoryId, categories]);

  if (!isOpen) return null;

  const persistChanges = async (
    newLeagues: string[], 
    newSmart: string[], 
    newTypes: string[]
  ) => {
    if (!userId) return;
    setIsSyncing(true);
    try {
      await saveUserSubscription(userId, {
        subscribedLeagues: newLeagues,
        smartAlertLeagues: newSmart,
        notificationTypes: newTypes,
      });
    } catch (e) {
      console.warn('Failed to sync subscriptions to Firestore:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleLeague = (league: string) => {
    setSubscribedLeagues(prev => {
      const updated = prev.includes(league)
        ? prev.filter(l => l !== league)
        : [...prev, league];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      if (onUpdateSubscriptions) {
        onUpdateSubscriptions(updated, notificationTypes);
      }
      persistChanges(updated, smartAlertLeagues, notificationTypes);
      return updated;
    });
  };

  const toggleSmartAlert = (league: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSmartAlertLeagues(prev => {
      const updated = prev.includes(league)
        ? prev.filter(l => l !== league)
        : [...prev, league];
      try {
        localStorage.setItem(SMART_LEAGUES_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      if (onUpdateSmartAlerts) {
        onUpdateSmartAlerts(updated);
      }
      persistChanges(subscribedLeagues, updated, notificationTypes);
      return updated;
    });
  };

  const toggleAllSmartAlertsForCategory = (cat: SportsCategory) => {
    setSmartAlertLeagues(prev => {
      const allActive = cat.leagues.every(l => prev.includes(l));
      let updated: string[];
      if (allActive) {
        const catLeaguesSet = new Set(cat.leagues);
        updated = prev.filter(l => !catLeaguesSet.has(l));
      } else {
        const newSet = new Set<string>(prev);
        cat.leagues.forEach(l => newSet.add(l));
        updated = Array.from(newSet);
      }
      try {
        localStorage.setItem(SMART_LEAGUES_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      if (onUpdateSmartAlerts) {
        onUpdateSmartAlerts(updated);
      }
      persistChanges(subscribedLeagues, updated, notificationTypes);
      return updated;
    });
  };

  const subscribeAllForCategory = (cat: SportsCategory) => {
    setSubscribedLeagues(prev => {
      const newSet = new Set<string>(prev);
      cat.leagues.forEach(l => newSet.add(l));
      const updated: string[] = Array.from(newSet);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      if (onUpdateSubscriptions) {
        onUpdateSubscriptions(updated, notificationTypes);
      }
      persistChanges(updated, smartAlertLeagues, notificationTypes);
      return updated;
    });
  };

  const unsubscribeAllForCategory = (cat: SportsCategory) => {
    setSubscribedLeagues(prev => {
      const catLeaguesSet = new Set(cat.leagues);
      const updated = prev.filter(l => !catLeaguesSet.has(l));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      if (onUpdateSubscriptions) {
        onUpdateSubscriptions(updated, notificationTypes);
      }
      persistChanges(updated, smartAlertLeagues, notificationTypes);
      return updated;
    });
  };

  const toggleNotificationType = (type: string) => {
    setNotificationTypes(prev => {
      const updated = prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type];
      try {
        localStorage.setItem(NOTIFICATION_TYPES_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      if (onUpdateSubscriptions) {
        onUpdateSubscriptions(subscribedLeagues, updated);
      }
      persistChanges(subscribedLeagues, smartAlertLeagues, updated);
      return updated;
    });
  };

  const handleSave = async () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(subscribedLeagues));
      localStorage.setItem(SMART_LEAGUES_STORAGE_KEY, JSON.stringify(smartAlertLeagues));
      localStorage.setItem(NOTIFICATION_TYPES_KEY, JSON.stringify(notificationTypes));
    } catch {
      // ignore
    }
    if (onUpdateSubscriptions) {
      onUpdateSubscriptions(subscribedLeagues, notificationTypes);
    }
    if (onUpdateSmartAlerts) {
      onUpdateSmartAlerts(smartAlertLeagues);
    }
    await persistChanges(subscribedLeagues, smartAlertLeagues, notificationTypes);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5" dir={isAr ? 'rtl' : 'ltr'}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] border border-slate-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/80 shadow-2xs">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-slate-900">
                    {isAr ? 'إدارة تنبيهات الرياضات والدوريات' : 'Manage Sports & League Alerts'}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {subscribedLeagues.length} {isAr ? 'نشط' : 'Active'}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                    <Cloud className={`w-3 h-3 text-emerald-600 ${isSyncing ? 'animate-pulse' : ''}`} />
                    <span>{isSyncing ? (isAr ? 'مزامنة...' : 'Syncing...') : (isAr ? 'Firestore سحابي' : 'Firestore')}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {isAr 
                    ? 'تفضيلاتك يتم حفظها ومزامنتها مباشرة في Firestore' 
                    : 'Preferences saved and synced directly to Firestore'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Notification Type Preferences */}
          <div className="px-4 sm:px-5 py-3 bg-slate-50/80 border-b border-slate-100 flex flex-wrap gap-2 items-center text-xs">
            <span className="font-bold text-slate-600 flex items-center gap-1 shrink-0">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              {isAr ? 'أنواع التنبيهات:' : 'Alert Types:'}
            </span>
            
            {[
              { id: 'kickoff', labelAr: 'صفارة البداية', labelEn: 'Kickoff', icon: Radio },
              { id: 'goals', labelAr: 'الأهداف والنتائج', labelEn: 'Goals & Score', icon: Trophy },
              { id: 'ai_predictions', labelAr: 'توقعات AI التكتيكية', labelEn: 'AI Predictions', icon: Sparkles },
            ].map(type => {
              const active = notificationTypes.includes(type.id);
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => toggleNotificationType(type.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    active 
                      ? 'bg-emerald-600 text-white shadow-2xs' 
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{isAr ? type.labelAr : type.labelEn}</span>
                </button>
              );
            })}
          </div>

          {/* Body: Sport Categories with 'Manage Alerts' for Sub-leagues */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 divide-y divide-slate-100">
            {categories.map(cat => {
              const isExpanded = expandedCategoryId === cat.id;
              const catLeagues = cat.leagues || [];
              const subscribedInCat = catLeagues.filter(l => subscribedLeagues.includes(l));
              const allSubscribed = catLeagues.length > 0 && subscribedInCat.length === catLeagues.length;
              const hasSubscribed = subscribedInCat.length > 0;

              return (
                <div key={cat.id} className="pt-3.5 first:pt-0">
                  {/* Category Header Row */}
                  <div className={`p-3.5 rounded-2xl border transition-all ${
                    isExpanded 
                      ? 'bg-slate-50/90 border-emerald-200/90 shadow-2xs' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl shrink-0 p-1 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
                          {cat.icon}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-sm text-slate-900 truncate">
                              {isAr ? cat.nameAr : cat.name}
                            </h3>
                            {hasSubscribed && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                                {subscribedInCat.length} / {catLeagues.length} {isAr ? 'مشترك' : 'Subscribed'}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {catLeagues.length} {isAr ? 'دوريات متاحة للتنبيهات الفورية' : 'leagues available'}
                          </p>
                        </div>
                      </div>

                      {/* 'Manage Alerts' Action Button */}
                      <button
                        onClick={() => setExpandedCategoryId(isExpanded ? null : cat.id)}
                        className={`h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                          isExpanded
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80'
                        }`}
                        title={isAr ? 'إدارة تنبيهات هذا القسم' : 'Manage alerts for this sport'}
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>{isAr ? 'إدارة التنبيهات' : 'Manage Alerts'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 opacity-80" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                        )}
                      </button>
                    </div>

                    {/* Sub-leagues list (expanded) */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3.5 pt-3.5 border-t border-slate-200/80 space-y-2.5 overflow-hidden"
                        >
                          <div className="flex items-center justify-between text-xs pb-1">
                            <span className="font-bold text-slate-700 flex items-center gap-1.5">
                              <Trophy className="w-3.5 h-3.5 text-amber-500" />
                              {isAr ? 'قائمة الدوريات والبطولات الفرعية:' : 'Sub-Leagues & Tournaments:'}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => subscribeAllForCategory(cat)}
                                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer flex items-center gap-1"
                              >
                                <CheckCheck className="w-3 h-3" />
                                {isAr ? 'تفعيل الكل' : 'Subscribe All'}
                              </button>
                              <span className="text-slate-300">|</span>
                              <button
                                onClick={() => unsubscribeAllForCategory(cat)}
                                className="text-[11px] font-bold text-slate-500 hover:text-rose-600 hover:underline cursor-pointer"
                              >
                                {isAr ? 'إلغاء الكل' : 'Unsubscribe All'}
                              </button>
                            </div>
                          </div>

                          {/* AI Smart Alert Info & Category Quick-Toggle */}
                          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 flex items-center justify-between gap-2.5">
                            <div className="flex items-start gap-2 text-amber-900 min-w-0">
                              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div className="text-[11px] leading-tight">
                                <span className="font-bold block">
                                  {isAr ? 'التنبيهات الذكية (Smart Alerts)' : 'AI Smart Alerts Engine'}
                                </span>
                                <span className="text-amber-700 text-[10px]">
                                  {isAr 
                                    ? 'يرصد تحركات وتقلبات احتمالات المراهنات الحادة (Odds Shifts) ويقترح تنبيهات فورية.' 
                                    : 'Monitors sharp betting market volatility and odds shifts to suggest valuable alerts.'}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleAllSmartAlertsForCategory(cat)}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[10px] shrink-0 transition-colors shadow-2xs cursor-pointer flex items-center gap-1 whitespace-nowrap"
                            >
                              <Zap className="w-3 h-3" />
                              <span>{isAr ? 'تفعيل للقسم' : 'All Smart'}</span>
                            </button>
                          </div>

                          {catLeagues.length === 0 ? (
                            <p className="text-xs text-slate-400 py-3 text-center">
                              {isAr ? 'لا توجد دوريات مسجلة حالياً' : 'No sub-leagues configured'}
                            </p>
                          ) : (
                            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                              {catLeagues.map((league) => {
                                const isSubscribed = subscribedLeagues.includes(league);
                                const isSmartActive = smartAlertLeagues.includes(league);
                                return (
                                  <div
                                    key={league}
                                    onClick={() => toggleLeague(league)}
                                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                                      isSubscribed
                                        ? 'bg-emerald-50/90 border-emerald-300 shadow-2xs'
                                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                                        isSubscribed ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                                      }`}>
                                        <Trophy className="w-3.5 h-3.5" />
                                      </div>
                                      <span className={`text-xs font-bold truncate ${
                                        isSubscribed ? 'text-emerald-950' : 'text-slate-700'
                                      }`}>
                                        {league}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      {/* AI Smart Alert Toggle (Odds Shifts & Volatility) */}
                                      {(() => {
                                        const hasActiveShift = activeOddsShiftLeagues.includes(league);
                                        return (
                                          <button
                                            type="button"
                                            onClick={(e) => toggleSmartAlert(league, e)}
                                            className={`relative px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all border shrink-0 cursor-pointer ${
                                              isSmartActive
                                                ? 'bg-amber-500 text-white border-amber-600 shadow-2xs hover:bg-amber-600'
                                                : 'bg-white text-slate-500 border-slate-200 hover:text-amber-700 hover:bg-amber-50 hover:border-amber-200'
                                            } ${hasActiveShift ? 'animate-smart-glow border-amber-400 ring-2 ring-amber-400/40' : ''}`}
                                            title={
                                              hasActiveShift
                                                ? (isAr ? '🔥 تم رصد تحرك حاد في الاحتمالات في الوقت الفعلي لهذا الدوري!' : '🔥 Real-time sharp odds shift detected in this league!')
                                                : isSmartActive
                                                  ? (isAr ? 'تنبيه ذكي مفعل: رصد تقلبات الاحتمالات' : 'Smart Alert Active: Tracks odds volatility')
                                                  : (isAr ? 'تفعيل تنبيه الذكاء الاصطناعي لتقلبات الاحتمالات' : 'Enable AI Smart Alert for odds shifts')
                                            }
                                          >
                                            <Sparkles className={`w-3 h-3 ${isSmartActive ? 'text-amber-200' : hasActiveShift ? 'text-amber-600 animate-pulse' : 'text-amber-500'}`} />
                                            <span className="whitespace-nowrap">
                                              {isSmartActive ? (isAr ? 'ذكي: مفعل' : 'Smart: ON') : (isAr ? 'تنبيه ذكي' : 'Smart Alert')}
                                            </span>
                                            {hasActiveShift && (
                                              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                              </span>
                                            )}
                                          </button>
                                        );
                                      })()}

                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        isSubscribed 
                                          ? 'bg-emerald-200/80 text-emerald-900 font-mono' 
                                          : 'bg-slate-100 text-slate-500'
                                      }`}>
                                        {isSubscribed 
                                          ? (isAr ? '✓ مفعل' : 'Active') 
                                          : (isAr ? 'معطل' : 'Muted')}
                                      </span>
                                      
                                      {/* Custom Switch Toggle */}
                                      <div className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 ${
                                        isSubscribed ? 'bg-emerald-600' : 'bg-slate-200'
                                      }`}>
                                        <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${
                                          isSubscribed ? (isAr ? '-translate-x-4' : 'translate-x-4') : 'translate-x-0'
                                        }`} />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Save / Done */}
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              <span className="font-bold text-slate-700">{subscribedLeagues.length}</span> {isAr ? 'دوريات مفعلة للتنبيهات' : 'leagues subscribed'}
            </div>
            
            <button
              onClick={handleSave}
              className="h-11 px-6 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              {saved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>{isAr ? 'تم حفظ التفضيلات!' : 'Preferences Saved!'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isAr ? 'تأكيد وحفظ التنبيهات' : 'Save Alerts'}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
