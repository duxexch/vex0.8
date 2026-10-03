import React, { useState, useEffect } from 'react';
import { Language, UserProfile, TelegramVerificationSession } from '../types';
import { vexApi } from '../services/api';
import {
  Phone,
  ShieldCheck,
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  Lock,
  ShieldAlert,
  Copy,
  ExternalLink,
  ClipboardPaste,
  Sparkles,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onSuccess: () => void;
  onRequestAdminChange?: () => void;
  lang?: Language;
}

export const PhoneVerificationModal: React.FC<PhoneVerificationModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onSuccess,
  onRequestAdminChange,
  lang = 'ar',
}) => {
  const [session, setSession] = useState<TelegramVerificationSession | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [contactReceivedNotice, setContactReceivedNotice] = useState<{
    phone: string;
    code: string;
    telegramUsername?: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [isSuccessStep, setIsSuccessStep] = useState(false);

  const isAr = lang === 'ar';

  // Initialize or fetch Telegram verification session on modal open
  useEffect(() => {
    if (!isOpen) return;

    if (userProfile?.is_phone_verified && userProfile?.phone_number) {
      return;
    }

    let isMounted = true;
    const initSession = async () => {
      setSessionLoading(true);
      setError(null);
      try {
        const s = await vexApi.createTelegramVerificationSession();
        if (isMounted) {
          setSession(s);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || (isAr ? 'فشل بدء جلسة توثيق تيليجرام' : 'Failed to init Telegram session'));
        }
      } finally {
        if (isMounted) {
          setSessionLoading(false);
        }
      }
    };

    initSession();

    return () => {
      isMounted = false;
    };
  }, [isOpen, userProfile, isAr]);

  // Listen for socket.io live updates for contact received
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleContactReceived = (e: any) => {
      const data = e.detail || e;
      if (data && data.code) {
        setContactReceivedNotice({
          phone: data.phone,
          code: data.code,
          telegramUsername: data.telegramUsername,
        });
        setCode(data.code);
      }
    };

    window.addEventListener('telegram_contact_received' as any, handleContactReceived);

    return () => {
      window.removeEventListener('telegram_contact_received' as any, handleContactReceived);
    };
  }, []);

  if (!isOpen) return null;

  // Handle Paste from Clipboard
  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        const clean = text.trim().replace(/[^0-9]/g, '');
        if (clean.length >= 6) {
          setCode(clean.substring(0, 6));
          return;
        } else if (clean.length > 0) {
          setCode(clean);
          return;
        }
      }
    } catch {
      // Fallback
    }
    const input = prompt(
      isAr ? 'الصق رمز التحقق المكون من 6 أرقام هنا:' : 'Paste your 6-digit verification code here:'
    );
    if (input) {
      setCode(input.trim().replace(/[^0-9]/g, '').substring(0, 6));
    }
  };

  // Handle Confirm Verification
  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = code.trim().replace(/[^0-9]/g, '');
    if (cleanCode.length !== 6) {
      setError(
        isAr
          ? 'يرجى إدخال رمز التحقق المكون من 6 أرقام كاملاً كما تم استلامه من البوت.'
          : 'Please enter the complete 6-digit code received from the bot.'
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await vexApi.verifyTelegramPhoneCode(cleanCode, session?.session_id);
      setSuccessMessage(res.message);
      setIsSuccessStep(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1600);
    } catch (err: any) {
      setError(
        err.message ||
          (isAr
            ? 'رمز التحقق غير صحيح أو انتهت صلاحيته. يرجى التأكد من نسخه من تيليجرام.'
            : 'Invalid or expired code. Please verify from Telegram.')
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle Simulation (instant testing for user or reviewer)
  const handleSimulateContact = async () => {
    setSimulating(true);
    setError(null);
    try {
      const res = await vexApi.simulateTelegramContact(
        session?.session_id,
        '+964770' + Math.floor(1000000 + Math.random() * 9000000),
        'vex_user'
      );
      setContactReceivedNotice({
        phone: res.phone,
        code: res.code,
        telegramUsername: 'vex_user',
      });
      setCode(res.code);
    } catch (err: any) {
      setError(err.message || 'فشلت عملية المحاكاة.');
    } finally {
      setSimulating(false);
    }
  };

  const botUsername = session?.bot_username || 'VexVerifyBot';
  const deepLink = session?.deep_link || `https://t.me/${botUsername}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md my-auto max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 flex items-center justify-center shadow-xs">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{isAr ? 'توثيق رقم الهاتف عبر تيليجرام' : 'Telegram Phone Verification'}</span>
                <span className="text-[10px] bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold px-1.5 py-0.5 rounded-md border border-sky-200 dark:border-sky-800">
                  Bot 2.0
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {isAr
                  ? 'مشاركة جهة الاتصال والرمز المكون من 6 أرقام لتفعيل المحفظة'
                  : 'Contact sharing & 6-digit OTP verification'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-start gap-2.5 text-xs text-rose-900 dark:text-rose-200 font-medium animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Step View */}
          {isSuccessStep ? (
            <div className="py-8 text-center space-y-3 animate-fade-in">
              <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                {isAr ? 'تم تأكيد وقفل رقم الهاتف بنجاح!' : 'Phone Verified & Locked!'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                {isAr
                  ? 'تم ربط رقم هاتفك الموثق من تيليجرام بكافة حساباتك ومحفظتك وتفعيل جميع العمليات المالية.'
                  : 'Your phone has been permanently linked to your wallet and accounts.'}
              </p>
            </div>
          ) : userProfile?.is_phone_verified && userProfile?.phone_number ? (
            /* Already Verified & Locked State */
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-black text-xs">
                  <Lock className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  <span>{isAr ? 'رقم الهاتف مرتبط ومقفل في المحفظة' : 'Phone Number Locked in Wallet'}</span>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-relaxed font-medium">
                  {isAr
                    ? 'بناءً على معايير الأمان المالي ومكافحة الاحتيال، تم تسجيل وقفل رقم هاتفك في المحفظة لمرة واحدة فقط. لا يمكن تغييره إلا بطلب معتمد من الإدارة.'
                    : 'According to anti-fraud policy, your phone number is permanently locked. To change it, submit a formal request to the admin.'}
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'رقم الهاتف المعتمد والموثق:' : 'Verified Phone Number:'}
                </label>
                <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between font-mono font-bold text-sm text-slate-900 dark:text-white">
                  <span dir="ltr">{userProfile.phone_number}</span>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                    {isAr ? 'موثق ومقفل' : 'Verified & Locked'}
                  </span>
                </div>
              </div>

              {userProfile.telegram_username && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'حساب تيليجرام المرتبط:' : 'Linked Telegram:'}
                  </label>
                  <div
                    className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl font-mono text-xs text-slate-700 dark:text-slate-300"
                    dir="ltr"
                  >
                    @{userProfile.telegram_username}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onRequestAdminChange) {
                      onRequestAdminChange();
                    }
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>{isAr ? 'إرسال طلب تغيير رقم الهاتف إلى الإدارة' : 'Request Phone Change via Admin'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Active Telegram Verification Workflow */
            <div className="space-y-4">
              {/* Mandatory Policy Banner */}
              <div className="bg-amber-50 dark:bg-amber-950/30 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/50 space-y-1 text-xs text-amber-950 dark:text-amber-200">
                <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-300 font-black">
                  <Lock className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  <span>{isAr ? 'شرط أمان إلزامي لاستخدام المحفظة' : 'Mandatory Security Requirement'}</span>
                </div>
                <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80 leading-relaxed font-medium">
                  {isAr
                    ? 'طالما ستستخدم المحفظة، يجب ربط رقم هاتفك الحقيقي لمرة واحدة فقط لمنع تكرار الحسابات وسحب الأرصدة.'
                    : 'To use the wallet, you must link your genuine phone number once to protect against fraud.'}
                </p>
              </div>

              {/* Step 1: Open Telegram Bot Card */}
              <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-black flex items-center justify-center">
                      1
                    </span>
                    <h4 className="text-xs font-black text-sky-950 dark:text-sky-200">
                      {isAr ? 'فتح البوت ومشاركة جهة الاتصال' : 'Open Bot & Share Contact'}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-sky-700 dark:text-sky-300 font-bold">
                    @{botUsername}
                  </span>
                </div>

                <p className="text-[11px] text-sky-900/80 dark:text-sky-300/80 leading-relaxed">
                  {isAr
                    ? 'انقر على الزر أدناه لفتح بوت تيليجرام الرسمي، ثم اضغط داخل البوت على زر [📲 مشاركة جهة الاتصال] لمشاركة رقم هاتفك الحقيقي بأمان.'
                    : 'Click below to launch the official Telegram bot, then tap [Share Contact] in the bot to provide your verified phone number.'}
                </p>

                <div className="flex gap-2">
                  <a
                    href={deepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 active:scale-98"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isAr ? 'فتح بوت تيليجرام لتأكيد الرقم' : 'Open Telegram Bot'}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(deepLink);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    title={isAr ? 'نسخ رابط البوت' : 'Copy Bot Link'}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:bg-sky-50 transition-colors"
                  >
                    {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Real-time received alert badge */}
              {contactReceivedNotice && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-black text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{isAr ? 'تم استلام وتأكيد رقم الهاتف من تيليجرام!' : 'Contact Received from Telegram!'}</span>
                    </span>
                    <span className="font-mono text-xs font-bold text-emerald-900 dark:text-emerald-200" dir="ltr">
                      {contactReceivedNotice.phone}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 p-2 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
                    <span>{isAr ? 'رمز التأكيد المولد (6 أرقام):' : 'Generated 6-digit Code:'}</span>
                    <strong className="font-mono font-black text-sm tracking-widest text-emerald-800 dark:text-emerald-300">
                      {contactReceivedNotice.code}
                    </strong>
                  </div>
                </div>
              )}

              {/* Step 2: 6-Digit Code Paste & Verification Form */}
              <form onSubmit={handleVerify} className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs font-black flex items-center justify-center">
                      2
                    </span>
                    <label className="text-xs font-black text-slate-800 dark:text-slate-200">
                      {isAr ? 'لصق رمز التأكيد (6 أرقام)' : 'Paste 6-Digit Verification Code'}
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5 text-slate-500" />
                    <span>{isAr ? 'لصق من الحافظة' : 'Paste'}</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').substring(0, 6))}
                    required
                    className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-center text-2xl tracking-widest font-mono font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  {code.length === 6 && (
                    <div className="absolute right-3.5 top-3.5 text-emerald-600">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || code.trim().length !== 6}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98 cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{isAr ? 'جارٍ التحقق والقفل...' : 'Verifying & Locking...'}</span>
                    </span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isAr ? 'تأكيد الرمز وربط رقم الهاتف بالمحفظة' : 'Confirm Code & Lock Phone'}</span>
                    </>
                  )}
                </button>
              </form>

              {/* Instant Test Simulator Mode (for fast testing / demo preview) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">
                  {isAr ? 'وضع الفحص السريع:' : 'Testing Mode:'}
                </span>

                <button
                  type="button"
                  onClick={handleSimulateContact}
                  disabled={simulating}
                  className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {simulating ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  <span>{isAr ? 'تجربة فورية: محاكاة مشاركة جهة الاتصال' : 'Simulate Contact Sharing'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
