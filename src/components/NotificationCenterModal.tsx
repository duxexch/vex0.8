import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppNotification, Language, NotificationCategory } from '../types';
import {
  X,
  Bell,
  Bot,
  Trophy,
  CheckCheck,
  Trash2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearNotification?: (id: string) => void;
  onSelectNotificationAction?: (notification: AppNotification) => void;
  lang: Language;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClearNotification,
  onSelectNotificationAction,
  lang,
}) => {
  const isAr = lang === 'ar';
  const [selectedFilter, setSelectedFilter] = useState<NotificationCategory | 'all'>('all');
  const [pushStatus, setPushStatus] = useState<string>('default');

  const filteredNotifications = notifications.filter((item) => {
    if (selectedFilter === 'all') return true;
    return item.category === selectedFilter;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleRequestPushPermission = async () => {
    if ('Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setPushStatus(perm);
        if (perm === 'granted') {
          new Notification('VEX Deals ⚡', {
            body: isAr
              ? 'تم تفعيل الإشعارات الفورية لتوقعات الذكاء الاصطناعي بنجاح!'
              : 'Push notifications for AI predictions activated successfully!',
            icon: '/icon-192.svg',
          });
        }
      } catch (err) {
        console.error('Notification permission error', err);
      }
    } else {
      setPushStatus('unsupported');
    }
  };

  const getCategoryBadge = (category: NotificationCategory) => {
    switch (category) {
      case 'ai_prediction':
        return {
          icon: Bot,
          label: isAr ? 'توقع ذكي' : 'AI Prediction',
          color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        };
      case 'sports_news':
        return {
          icon: Trophy,
          label: isAr ? 'أخبار ومباريات' : 'Sports Alert',
          color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        };
      case 'compensation':
        return {
          icon: Sparkles,
          label: isAr ? 'تعويضات ومحافظ' : 'Compensation',
          color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      case 'security':
        return {
          icon: CheckCheck,
          label: isAr ? 'أمان النظام' : 'Security',
          color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
      case 'lottery':
        return {
          icon: Trophy,
          label: isAr ? 'اليانصيب والجوائز' : 'Lottery & Draw',
          color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
      default:
        return {
          icon: Bell,
          label: isAr ? 'نظام VEX' : 'System',
          color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        };
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="w-full max-w-lg my-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {isAr ? 'مركز الإشعارات والتنبيهات' : 'Notification Center'}
                    </h2>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-slate-950">
                        {unreadCount} {isAr ? 'جديد' : 'new'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isAr
                      ? 'توقعات الذكاء الاصطناعي وحالات التعويضات المباشرة'
                      : 'Real-time AI match predictions & compensation alerts'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllRead}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                    title={isAr ? 'تحديد الكل كمقروء' : 'Mark all as read'}
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span className="hidden sm:inline">{isAr ? 'تحديد الكل' : 'Mark all read'}</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="px-4 py-2.5 bg-slate-100/60 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {[
                { id: 'all', label: isAr ? 'الكل' : 'All' },
                { id: 'lottery', label: isAr ? '🏆 اليانصيب' : '🏆 Lottery' },
                { id: 'ai_prediction', label: isAr ? '🤖 توقعات AI' : '🤖 AI Picks' },
                { id: 'sports_news', label: isAr ? '⚽ رياضة' : '⚽ Sports' },
                { id: 'compensation', label: isAr ? '💰 التعويضات' : '💰 Comp' },
                { id: 'security', label: isAr ? '🛡️ الأمان' : '🛡️ Security' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFilter(f.id as any)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedFilter === f.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredNotifications.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Bell className="w-10 h-10 mx-auto opacity-30 mb-2" />
                  <p className="font-semibold text-sm">
                    {isAr ? 'لا توجد إشعارات في هذا القسم حالياً' : 'No notifications in this category'}
                  </p>
                </div>
              ) : (
                filteredNotifications.map((n) => {
                  const badge = getCategoryBadge(n.category);
                  const Icon = badge.icon;

                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => {
                        if (!n.read) onMarkRead(n.id);
                        if (onSelectNotificationAction) onSelectNotificationAction(n);
                      }}
                      className={`relative p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        !n.read
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300/80 dark:border-emerald-700/60 shadow-xs'
                          : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl border shrink-0 ${badge.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Localized indicator badge if available */}
                          {n.translations && (
                            <div className="flex items-center gap-1.5 mb-1 text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                              <span className="px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950/60">
                                {isAr ? '🌐 متوافق مع لغتك ودولتك' : '🌐 Localized for your language'}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h3 className={`text-xs sm:text-sm font-bold truncate ${!n.read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                              {(n.translations && n.translations[lang]?.title) || n.title}
                            </h3>
                            <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                              {new Date(n.timestamp).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {(n.translations && n.translations[lang]?.message) || n.message}
                          </p>

                          {/* Action Pill if prediction data is attached */}
                          {n.data?.predictionText && (
                            <div className="mt-2 flex items-center justify-between bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-xl px-2.5 py-1.5 text-xs text-purple-800 dark:text-purple-300 font-bold">
                              <span className="flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                {n.data.predictionText}
                              </span>
                              {n.data.confidence && (
                                <span className="bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-md font-mono">
                                  {n.data.confidence}% ثقة
                                </span>
                              )}
                            </div>
                          )}

                          {/* Action Pill if lottery draw is linked */}
                          {(n.category === 'lottery' || n.data?.targetTab === 'lottery') && (
                            <div className="mt-2 flex items-center justify-between bg-amber-50/90 dark:bg-amber-950/50 border border-amber-300/80 dark:border-amber-700/60 rounded-xl px-2.5 py-1.5 text-xs text-amber-950 dark:text-amber-200 font-bold">
                              <span className="flex items-center gap-1.5">
                                <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span>{isAr ? 'اضغط هنا لفتح قسم اليانصيب واختيار تذكرتك' : 'Tap to open Lottery & pick tickets'}</span>
                              </span>
                              <span className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] px-2 py-0.5 rounded-md font-black shrink-0 transition-colors">
                                {isAr ? 'فتح اليانصيب ←' : 'Open Draw →'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Delete or Read action */}
                        {onClearNotification && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onClearNotification(n.id);
                            }}
                            className="text-slate-400 hover:text-rose-500 p-1 rounded-lg transition-colors"
                            title={isAr ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Push Notification Banner */}
            <div className="p-3 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Bell className="w-4 h-4 text-emerald-600" />
                <span>{isAr ? 'تنبيهات فورية على المتصفح والهاتف' : 'Instant push notifications'}</span>
              </div>
              <button
                onClick={handleRequestPushPermission}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                {pushStatus === 'granted'
                  ? (isAr ? '✓ مفعلة' : '✓ Active')
                  : (isAr ? 'تفعيل الإشعارات' : 'Enable Push')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
