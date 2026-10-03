import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  BellRing,
  Check,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  X,
  Clock,
  Send,
  CheckCircle2,
  Ticket
} from 'lucide-react';
import { Language, LotteryAlertSettings, LotteryPrizeTier, LotteryTierId } from '../../types';
import { lotteryService, DEFAULT_PRIZE_TIERS } from '../../services/lotteryService';

interface LotteryTierAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onToast?: (msg: string) => void;
}

export const LotteryTierAlertsModal: React.FC<LotteryTierAlertsModalProps> = ({
  isOpen,
  onClose,
  lang,
  onToast,
}) => {
  const isAr = lang === 'ar';
  const [settings, setSettings] = useState<LotteryAlertSettings>(lotteryService.getTierAlertSettings());
  const [testingTierId, setTestingTierId] = useState<string | null>(null);
  const [fcmRequesting, setFcmRequesting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(lotteryService.getTierAlertSettings());
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleTier = (tierId: LotteryTierId) => {
    const updated = { ...settings };
    const current = updated.tierConfigs[tierId] || {
      tierId,
      enabled: true,
      leadTimeMinutes: 30,
      soundEnabled: true,
    };
    updated.tierConfigs[tierId] = {
      ...current,
      enabled: !current.enabled,
    };
    setSettings(updated);
  };

  const handleToggleSound = (tierId: LotteryTierId) => {
    const updated = { ...settings };
    const current = updated.tierConfigs[tierId] || {
      tierId,
      enabled: true,
      leadTimeMinutes: 30,
      soundEnabled: true,
    };
    updated.tierConfigs[tierId] = {
      ...current,
      soundEnabled: !current.soundEnabled,
    };
    setSettings(updated);
  };

  const handleEnableFCM = async () => {
    setFcmRequesting(true);
    try {
      const token = await lotteryService.enableFcmPushNotifications();
      if (token) {
        setSettings((prev) => ({
          ...prev,
          fcmEnabled: true,
          fcmToken: token,
        }));
        if (onToast) {
          onToast(isAr ? 'تم تفعيل إشعارات Firebase بنجاح!' : 'Firebase Cloud Messaging enabled!');
        }
      } else {
        if (onToast) {
          onToast(
            isAr
              ? 'يرجى السماح بالإشعارات من إعدادات المتصفح'
              : 'Please allow notification permission in your browser'
          );
        }
      }
    } finally {
      setFcmRequesting(false);
    }
  };

  const handleSave = async () => {
    await lotteryService.saveTierAlertSettings(settings);
    setSaveSuccess(true);
    if (onToast) {
      onToast(isAr ? 'تم حفظ إعدادات تنبيهات السحب بنجاح!' : 'Draw alert settings saved!');
    }
    setTimeout(() => {
      onClose();
    }, 900);
  };

  const handleTestTierAlert = async (tierId: LotteryTierId) => {
    setTestingTierId(tierId);
    try {
      const res = await lotteryService.triggerThirtyMinTierFcmAlert(tierId);
      if (res.success && onToast) {
        onToast(
          isAr
            ? `تم إرسال تنبيه تجريبي قبل 30 دقيقة لمستوى [${tierId}] بنجاح!`
            : `Test 30-min alert dispatched for [${tierId}] via FCM!`
        );
      }
    } finally {
      setTimeout(() => setTestingTierId(null), 1200);
    }
  };

  const getTierIcon = (tierId: LotteryTierId) => {
    switch (tierId) {
      case 'tier1_jackpot':
        return <Trophy className="w-4 h-4 text-amber-400" />;
      case 'tier2_match5':
        return <Sparkles className="w-4 h-4 text-emerald-400" />;
      case 'tier3_match4_2':
        return <Sparkles className="w-4 h-4 text-blue-400" />;
      default:
        return <Ticket className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl text-white max-h-[90vh] overflow-y-auto space-y-5"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Modal Header */}
          <div className="flex items-start gap-3.5 pr-6 rtl:pr-0 rtl:pl-6">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 shrink-0">
              <BellRing className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-wide uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Firebase Cloud Messaging (FCM)
                </span>
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  {isAr ? 'قبل 30 دقيقة من السحب' : '30 Mins Pre-Draw'}
                </span>
              </div>
              <h3 className="text-lg font-black text-white mt-1">
                {isAr ? 'إعدادات تنبيهات السحب المخصصة لكل نوع جائزة' : 'Customized Draw Alerts per Prize Tier'}
              </h3>
              <p className="text-xs text-slate-400">
                {isAr
                  ? 'اختر مستويات الجوائز التي ترغب في تلقي إشعارات دفع ذكية لها قبل 30 دقيقة من إغلاق واحتساب السحب.'
                  : 'Select prize tiers to receive smart push notifications 30 minutes before the draw locks in.'}
              </p>
            </div>
          </div>

          {/* FCM Push Channel Status Banner */}
          <div className="bg-slate-950/70 rounded-2xl p-3.5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-200 block">
                  {isAr ? 'قناة الإشعارات الفورية (FCM Web Push)' : 'Instant Push Channel (FCM)'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {settings.fcmEnabled
                    ? isAr
                      ? 'مفعّلة ومتصلة بخوادم Firebase'
                      : 'Active & Connected to Firebase Servers'
                    : isAr
                    ? 'غير مفعلة على هذا المتصفح'
                    : 'Disabled on this browser'}
                </span>
              </div>
            </div>

            <button
              onClick={handleEnableFCM}
              disabled={fcmRequesting}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {fcmRequesting
                  ? isAr
                    ? 'جاري الربط...'
                    : 'Connecting...'
                  : settings.fcmEnabled
                  ? isAr
                    ? 'تحديث إذن FCM'
                    : 'Refresh FCM'
                  : isAr
                  ? 'تفعيل تنبيهات الجهاز'
                  : 'Enable Push'}
              </span>
            </button>
          </div>

          {/* Prize Tier Toggles List */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" />
              {isAr ? 'تخصيص تنبيهات مستويات الجوائز (قبل 30 دقيقة):' : 'Customize Prize Tier Alerts (30 Mins Pre-Draw):'}
            </h4>

            <div className="space-y-2.5">
              {DEFAULT_PRIZE_TIERS.map((tier) => {
                const config = settings.tierConfigs[tier.id] || {
                  tierId: tier.id,
                  enabled: true,
                  leadTimeMinutes: 30,
                  soundEnabled: true,
                };
                const isEnabled = config.enabled;
                const isTesting = testingTierId === tier.id;

                return (
                  <div
                    key={tier.id}
                    className={`rounded-2xl p-3.5 border transition-all ${
                      isEnabled
                        ? 'bg-slate-950/90 border-amber-500/40 shadow-sm'
                        : 'bg-slate-950/40 border-slate-800/80 opacity-70'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                          {getTierIcon(tier.id)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white">
                              {isAr ? tier.nameAr : tier.nameEn}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              {tier.sharePercent}% pool
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {isAr ? tier.termsAr : tier.termsEn}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              {isAr ? 'التوقيت: قبل 30 دقيقة' : 'Lead Time: 30 Mins'}
                            </span>
                            <span className="text-slate-500">•</span>
                            <span className="font-mono text-slate-300">
                              {isAr ? 'الاحتمالية: ' : 'Odds: '} {tier.odds}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Controls: Sound, Test Alert, and Toggle */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {/* Sound Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleSound(tier.id)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            config.soundEnabled
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                              : 'bg-slate-800 border-slate-700 text-slate-500'
                          }`}
                          title={isAr ? 'صوت التنبيه' : 'Alert Sound'}
                        >
                          {config.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                        </button>

                        {/* Test 30-min Alert Button */}
                        <button
                          type="button"
                          onClick={() => handleTestTierAlert(tier.id)}
                          disabled={isTesting}
                          className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Send className="w-3 h-3 text-amber-400" />
                          <span>{isTesting ? (isAr ? 'جاري الإرسال...' : 'Sending...') : isAr ? 'اختبار FCM' : 'Test FCM'}</span>
                        </button>

                        {/* Main Tier Alert Toggle Switch */}
                        <button
                          type="button"
                          onClick={() => handleToggleTier(tier.id)}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                            isEnabled ? 'bg-amber-500' : 'bg-slate-700'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                              isEnabled ? 'left-6 rtl:left-1' : 'left-1 rtl:left-6'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={handleSave}
              className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>{isAr ? 'تم الحفظ!' : 'Saved!'}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isAr ? 'حفظ إعدادات التنبيهات' : 'Save Alert Preferences'}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
