import React, { useState, useEffect } from 'react';
import { Company, Language, Transfer, UserProfile, Wallet, PLATFORM_DOMAIN } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { formatCurrency } from '../utils/currency';
import { TransfersTabSkeleton } from './SkeletonLoader';
import { vexApi } from '../services/api';
import {
  Send,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  History,
  ArrowRightLeft,
  ShieldCheck,
  Phone,
  Clock,
  Check,
} from 'lucide-react';

interface TransfersTabProps {
  wallets: Wallet[];
  companies: Company[];
  transfers: Transfer[];
  initialCompanyId?: string;
  userProfile: UserProfile | null;
  onRefresh: () => void;
  onOpenPhoneModal: () => void;
  lang: Language;
  displayCurrency: string;
  isLoading?: boolean;
  onCopyToast?: () => void;
}

export const TransfersTab: React.FC<TransfersTabProps> = ({
  wallets,
  companies,
  transfers,
  initialCompanyId,
  userProfile,
  onRefresh,
  onOpenPhoneModal,
  lang,
  displayCurrency,
  isLoading = false,
  onCopyToast,
}) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    initialCompanyId || wallets[0]?.company_id || companies[0]?.id || 'CMPMLB002'
  );
  const [friendAccount, setFriendAccount] = useState('87654321');
  const [recipientStatus, setRecipientStatus] = useState<{
    checking: boolean;
    valid?: boolean;
    name?: string;
    error?: string;
    referralUrl?: string;
  }>({ checking: false });
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');

  // OTP Step states
  const [pendingTransferId, setPendingTransferId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpPhone, setOtpPhone] = useState<string | null>(null);
  const [otpCodeHint, setOtpCodeHint] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const t = TRANSLATIONS[lang] || TRANSLATIONS['ar'];
  const currentWallet = wallets.find((w) => w.company_id === selectedCompanyId);
  const frozenBal = currentWallet ? Number(currentWallet.frozen) : 0;
  const maxTransferAllowed = Math.floor(frozenBal * 0.1 * 100) / 100;

  // Real-time recipient check
  useEffect(() => {
    if (!friendAccount || friendAccount.trim().length < 4) {
      setRecipientStatus({ checking: false });
      return;
    }

    const timer = setTimeout(async () => {
      setRecipientStatus({ checking: true });
      const res = await vexApi.validateRecipient(selectedCompanyId, friendAccount);
      setRecipientStatus({
        checking: false,
        valid: res.valid,
        name: res.recipientName,
        error: res.error,
        referralUrl: (res as any).referralUrl,
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [selectedCompanyId, friendAccount]);

  // Cooldown countdown
  useEffect(() => {
    let interval: any;
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown((c) => Math.max(0, c - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldown]);

  if (isLoading) {
    return <TransfersTabSkeleton />;
  }

  // Step 1: Initiate Transfer
  const handleInitiateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!userProfile?.is_phone_verified) {
      setError(
        lang === 'ar'
          ? 'يجب ربط وتأكيد رقم هاتفك أولاً لاستقبال رمز التحقق (OTP).'
          : lang === 'es'
          ? 'Debes vincular tu teléfono primero para recibir el código OTP.'
          : lang === 'ru'
          ? 'Сначала привяжите номер телефона для получения кода OTP.'
          : 'Please verify your phone number first to receive the OTP.'
      );
      return;
    }

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError(
        lang === 'ar'
          ? 'يرجى إدخال مبلغ صحيح أكبر من 0.'
          : lang === 'es'
          ? 'Introduce una cantidad válida mayor a 0.'
          : lang === 'ru'
          ? 'Введите корректную сумму больше 0.'
          : 'Please enter a valid amount greater than 0.'
      );
      return;
    }

    if (numAmount > maxTransferAllowed) {
      setError(
        lang === 'ar'
          ? `الحد الأقصى للتحويل هو 10% من رصيدك المجمد (${formatCurrency(maxTransferAllowed, displayCurrency)}).`
          : lang === 'es'
          ? `El límite máximo es 10% de tu saldo bloqueado (${formatCurrency(maxTransferAllowed, displayCurrency)}).`
          : lang === 'ru'
          ? `Максимальный перевод — 10% от замороженного баланса (${formatCurrency(maxTransferAllowed, displayCurrency)}).`
          : `Maximum transfer is 10% of frozen balance (${formatCurrency(maxTransferAllowed, displayCurrency)}).`
      );
      return;
    }

    if (pin.length !== 4) {
      setError(
        lang === 'ar'
          ? 'يرجى إدخال رمز الحماية السري (PIN) المكون من 4 أرقام.'
          : lang === 'es'
          ? 'Introduce el código PIN de seguridad de 4 dígitos.'
          : lang === 'ru'
          ? 'Введите 4-значный PIN-код безопасности.'
          : 'Please enter your 4-digit security PIN.'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await vexApi.initiateTransfer(
        selectedCompanyId,
        friendAccount.trim(),
        numAmount,
        pin
      );
      setPendingTransferId(res.transferId);
      setOtpPhone(res.otpPhone);
      setOtpCodeHint(res.debugOtp || null);
      setCooldown(60);
      setPin('');
    } catch (err: any) {
      setError(err.message || (lang === 'ar' ? 'فشلت عملية بدء التحويل.' : 'Transfer initiation failed.'));
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Confirm OTP
  const handleConfirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingTransferId) return;

    setError(null);
    setLoading(true);

    try {
      const res = await vexApi.confirmTransferOtp(pendingTransferId, otpCode);
      setSuccessMsg(res.message);
      setPendingTransferId(null);
      setOtpCode('');
      setAmount('');
      onRefresh();
    } catch (err: any) {
      setError(err.message || (lang === 'ar' ? 'فشل التحقق من الرمز.' : 'OTP verification failed.'));
    } finally {
      setLoading(false);
    }
  };

  // Cancel pending transfer
  const handleCancelTransfer = async () => {
    if (pendingTransferId) {
      await vexApi.cancelTransfer(pendingTransferId);
      setPendingTransferId(null);
      setOtpCode('');
      setError(
        lang === 'ar'
          ? 'تم إلغاء عملية التحويل وفك حجز الرصيد.'
          : lang === 'es'
          ? 'Transferencia cancelada y saldo desbloqueado.'
          : lang === 'ru'
          ? 'Перевод отменен, баланс возвращен.'
          : 'Transfer cancelled.'
      );
      onRefresh();
    }
  };

  return (
    <div className="space-y-3.5 pb-24 animate-fade-in select-none">
      {/* Title & Info Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-900">
                {t.transfersTitle}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'ar'
                  ? 'تحويل حتى 10% من الرصيد المجمد لحساب صديق موثق'
                  : lang === 'es'
                  ? 'Transfiere hasta 10% del saldo congelado a amigos'
                  : lang === 'ru'
                  ? 'Перевод до 10% замороженного баланса другу'
                  : 'Transfer up to 10% of frozen balance to a friend'}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
            {PLATFORM_DOMAIN}
          </span>
        </div>

        {/* Security Rule Notice */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2 leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            {lang === 'ar'
              ? 'الحد الأقصى 10% لمرة واحدة فقط لكل صديق مع منع التدوير. التحويل محمي برمز OTP فوري.'
              : lang === 'es'
              ? 'Máximo 10% por amigo con verificación instantánea OTP.'
              : lang === 'ru'
              ? 'Максимум 10% с мгновенным подтверждением по OTP.'
              : 'Max 10% per friend with instant OTP protection.'}
          </span>
        </div>
      </div>

      {/* Main Responsive Grid on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        {/* Left Column (7 cols on lg): Form & OTP */}
        <div className="lg:col-span-7 space-y-3.5">
          {/* Warning if phone not verified */}
      {!userProfile?.is_phone_verified && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2 text-xs text-amber-800">
            <Phone className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {lang === 'ar'
                ? 'يجب ربط الهاتف لتلقي رمز التحقق (OTP)'
                : lang === 'es'
                ? 'Vincula tu teléfono para recibir el OTP'
                : lang === 'ru'
                ? 'Привяжите телефон для получения кода OTP'
                : 'Phone verification needed for OTP'}
            </span>
          </div>
          <button
            onClick={onOpenPhoneModal}
            className="h-8 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shrink-0 active:scale-95"
          >
            {lang === 'ar' ? 'ربط الآن' : lang === 'es' ? 'Vincular' : lang === 'ru' ? 'Привязать' : 'Verify'}
          </button>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-700 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Transfer Form or OTP Sheet */}
      {!pendingTransferId ? (
        <form
          onSubmit={handleInitiateTransfer}
          className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs"
        >
          {/* 1. Select Company */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.selectCompany}:
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
            >
              {companies.map((c) => {
                const w = wallets.find((wal) => wal.company_id === c.id);
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} ({lang === 'ar' ? 'مجمد:' : 'Frozen:'} {formatCurrency(w ? Number(w.frozen) : 0, displayCurrency)})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Frozen balance display & Max limit */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 text-[11px] block">
                {t.frozenBalance}:
              </span>
              <span className="text-amber-700 font-extrabold text-sm">
                {formatCurrency(frozenBal, displayCurrency)}
              </span>
            </div>
            <div className="text-right rtl:text-left">
              <span className="text-slate-500 text-[11px] block">
                {lang === 'ar' ? 'الحد الأقصى (10%):' : lang === 'es' ? 'Máximo (10%):' : lang === 'ru' ? 'Максимум (10%):' : 'Max Limit (10%):'}
              </span>
              <span className="text-emerald-700 font-extrabold text-sm">
                {formatCurrency(maxTransferAllowed, displayCurrency)}
              </span>
            </div>
          </div>

          {/* 2. Friend Account Number with live validation */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.recipientAccountNumber}:
            </label>
            <input
              type="text"
              value={friendAccount}
              onChange={(e) => setFriendAccount(e.target.value)}
              required
              placeholder={lang === 'ar' ? 'مثال: 87654321' : 'e.g. 87654321'}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
            />

            {/* Recipient Validation Status */}
            {friendAccount.trim().length >= 4 && (
              <div className="mt-1 text-[11px]">
                {recipientStatus.checking ? (
                  <span className="text-slate-500">
                    {lang === 'ar' ? 'جارٍ التحقق من الحساب...' : 'Checking account ID...'}
                  </span>
                ) : recipientStatus.valid ? (
                  <span className="text-emerald-700 flex items-center gap-1 font-bold">
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'ar' ? 'المستلم:' : 'Recipient:'} {recipientStatus.name} ({lang === 'ar' ? 'مؤهل للتحويل' : 'Eligible'})
                    </span>
                  </span>
                ) : (
                  <div className="space-y-2 mt-1">
                    <span className="text-rose-600 flex items-center gap-1 font-bold">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{recipientStatus.error}</span>
                    </span>
                    {recipientStatus.referralUrl && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
                        <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                          {lang === 'ar' ? '🎁 شارك رابط الإحالة الخاص بك مع صديقك:' : '🎁 Share your referral link with your friend:'}
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={recipientStatus.referralUrl}
                            className="w-full h-8 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg px-2 text-xs font-mono text-slate-800 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(recipientStatus.referralUrl!);
                              if (onCopyToast) onCopyToast();
                            }}
                            className="px-3 h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer"
                          >
                            {lang === 'ar' ? 'نسخ الرابط' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Amount */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                {t.transferAmountPlaceholder}:
              </label>
              <button
                type="button"
                onClick={() => setAmount(maxTransferAllowed.toString())}
                className="h-6 px-2 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-bold border border-emerald-200"
              >
                {lang === 'ar' ? 'الحد الأقصى' : 'Max'} (${maxTransferAllowed})
              </button>
            </div>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
            />
          </div>

          {/* 4. PIN Protection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === 'ar' ? 'رمز الأمان (PIN 4 أرقام):' : lang === 'es' ? 'PIN de Seguridad (4 dígitos):' : lang === 'ru' ? 'PIN безопасности (4 цифры):' : 'Security PIN (4 digits):'}
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="••••"
              required
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-center tracking-widest text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || maxTransferAllowed <= 0 || !recipientStatus.valid}
            className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
          >
            {loading ? (
              <Clock className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{lang === 'ar' ? 'إرسال رمز OTP وتأكيد التحويل' : lang === 'es' ? 'Enviar OTP y Transferir' : lang === 'ru' ? 'Отправить OTP и перевести' : 'Send OTP & Confirm'}</span>
              </>
            )}
          </button>
        </form>
      ) : (
        /* OTP Confirmation Sheet */
        <form
          onSubmit={handleConfirmOtp}
          className="bg-white border border-amber-300 rounded-2xl p-5 space-y-4 animate-fade-in shadow-xs"
        >
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {lang === 'ar' ? 'تأكيد عملية التحويل برمز OTP' : 'Confirm Transfer with OTP'}
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'ar' ? 'تم إرسال الرمز إلى هاتفك الموثق ' : 'Code sent to '}
              <strong className="text-slate-900 font-mono">{otpPhone}</strong>
            </p>
          </div>

          {/* OTP test hint */}
          {otpCodeHint && (
            <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-center">
              <span className="text-[11px] text-amber-800 block mb-0.5">
                {lang === 'ar' ? 'رمز التحقق التجريبي (OTP):' : 'Demo OTP Code:'}
              </span>
              <span className="font-mono text-xl font-black text-amber-900 tracking-widest">
                {otpCodeHint}
              </span>
            </div>
          )}

          <div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="• • • •"
              autoFocus
              required
              className="w-full h-12 text-center bg-slate-50 border border-slate-200 rounded-xl text-2xl font-black tracking-widest text-emerald-700 focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancelTransfer}
              className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all"
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading || otpCode.length !== 4}
              className="flex-2 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs active:scale-98 transition-all"
            >
              {loading ? (
                <Clock className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'تأكيد التحويل الآن' : 'Confirm Now'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
        </div>

        {/* Right Column (5 cols on lg): Transfer Rules & History */}
        <div className="lg:col-span-5 space-y-3.5">
          {/* Transfer Guidelines Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2.5">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'ar' ? 'معايير الأمان والتحويل الفوري' : 'Security & Transfer Rules'}</span>
            </h3>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside leading-relaxed">
              <li>{lang === 'ar' ? 'التحويل يتم فورياً بين المحافظ المسجلة على نفس الشركة.' : 'Instant transfer between registered wallets.'}</li>
              <li>{lang === 'ar' ? 'الحد الأقصى المسموح هو 10% من إجمالي الرصيد المجمد.' : 'Up to 10% of frozen balance can be transferred.'}</li>
              <li>{lang === 'ar' ? 'تأكيد العملية يتطلب رقم هاتف مفعل مع كود OTP سري.' : 'Requires verified phone and confidential OTP code.'}</li>
            </ul>
          </div>

          {/* Transfer History */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-emerald-600" />
              <span>{lang === 'ar' ? 'سجل التحويلات' : lang === 'es' ? 'Historial de Transferencias' : lang === 'ru' ? 'История переводов' : 'Transfer History'} ({transfers.length})</span>
            </h3>

            {transfers.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-400 shadow-xs">
                {lang === 'ar'
                  ? 'لا توجد تحويلات سابقة حتى الآن.'
                  : lang === 'es'
                  ? 'No hay transferencias previas aún.'
                  : lang === 'ru'
                  ? 'Предыдущих переводов пока нет.'
                  : 'No transfer history yet.'}
              </div>
            ) : (
              <div className="space-y-2">
                {transfers.map((tx) => (
                  <div
                    key={tx.id}
                    className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between text-xs shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {tx.company_name}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {lang === 'ar' ? 'إلى:' : 'To:'} {tx.to_account}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(tx.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                      </span>
                    </div>

                    <div className="text-right rtl:text-left">
                      <span className="font-bold text-emerald-700 text-sm block font-mono">
                        {formatCurrency(Number(tx.amount), displayCurrency)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-block ${
                          tx.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : tx.status === 'otp_pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {tx.status === 'completed'
                          ? (lang === 'ar' ? 'مكتمل' : lang === 'es' ? 'Completado' : lang === 'ru' ? 'Завершено' : 'Completed')
                          : tx.status === 'otp_pending'
                          ? (lang === 'ar' ? 'بانتظار OTP' : 'Pending OTP')
                          : (lang === 'ar' ? 'ملغي' : 'Cancelled')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
