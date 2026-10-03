import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Company, Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { vexApi } from '../services/api';
import { X, Copy, Check, Download, ArrowRight, ArrowLeft, ShieldCheck, AlertCircle, ExternalLink } from 'lucide-react';
import { SuccessAnimation } from './SuccessAnimation';
import { CompanyBrandLogo } from './CompanyBrandLogo';

interface RegisterModalProps {
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lang: Language;
  onCopyToast?: () => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  company,
  isOpen,
  onClose,
  onSuccess,
  lang,
  onCopyToast,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [accountNumber, setAccountNumber] = useState('');
  const [pin, setPin] = useState('');
  const [copiedPromo, setCopiedPromo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!isOpen || !company) return null;

  const t = TRANSLATIONS[lang];
  const hasExistingPin = true;

  const handleCopyPromo = () => {
    navigator.clipboard.writeText(company.promo_code);
    setCopiedPromo(true);
    if (onCopyToast) onCopyToast();
    setTimeout(() => setCopiedPromo(false), 2000);
  };

  const handleConfirmStep1 = () => {
    if (company.affiliate_link) {
      window.open(company.affiliate_link, '_blank');
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await vexApi.registerAccount(
        company.id,
        accountNumber.trim(),
        pin.trim()
      );
      setSuccessMsg('تم تسجيل الحساب بنجاح وهو الآن قيد المراجعة لدى الإدارة!');
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        onSuccess();
        handleClose();
      }, 3200);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء التسجيل');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStep(1);
    setAccountNumber('');
    setPin('');
    setError(null);
    setSuccessMsg(null);
    onClose();
  };

  const handleDoneManual = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onSuccess();
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-md my-auto max-h-[90vh] bg-white border border-slate-200/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Top Header */}
        <div
          className="relative px-5 pt-5 pb-4 text-slate-900 border-b border-slate-100 shrink-0"
          style={{
            background: `linear-gradient(135deg, ${company.color}15 0%, #ffffff 100%)`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CompanyBrandLogo
                companyName={company.name}
                size="md"
                className="shadow-xs rounded-xl"
              />
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>{company.name}</span>
                  {company.name_ar && (
                    <span className="text-xs font-normal text-slate-500">({company.name_ar})</span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {step === 1 ? t.step1Title : t.step2Title}
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Indicator */}
          {!successMsg && (
            <div className="flex items-center gap-1.5 mt-3">
              <div
                className={`h-1 flex-1 rounded-full transition-all ${
                  step >= 1 ? 'bg-emerald-600' : 'bg-slate-200'
                }`}
              />
              <div
                className={`h-1 flex-1 rounded-full transition-all ${
                  step === 2 ? 'bg-emerald-600' : 'bg-slate-200'
                }`}
              />
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {successMsg ? (
            <SuccessAnimation
              title="تم تسجيل وتوثيق الحساب"
              badge="حساب معتمد ومؤهل للتعويض"
              subtitle="تم ربط معرف الحساب برقم هاتفك وتشفير البيانات بالسيرفر. سيبدأ احتساب التعويضات وتفعيل فك التجميد مباشرة."
              details={[
                { label: 'الشركة المعتمدة', value: company.name },
                { label: 'معرف الحساب', value: accountNumber, isMono: true },
                { label: 'كود الترويج المستخدم', value: company.promo_code, isMono: true },
              ]}
              onDone={handleDoneManual}
              doneText="المتابعة للوحة الحسابات"
            />
          ) : step === 1 ? (
            /* STEP 1 */
            <div className="space-y-3.5">
              <p className="text-xs leading-relaxed text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {t.step1Desc}
              </p>

              {/* Promo Code Box */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block font-bold">{t.promoCode}</span>
                  <span className="text-sm font-mono font-black text-emerald-700 tracking-wider">
                    {company.promo_code}
                  </span>
                </div>
                <button
                  onClick={handleCopyPromo}
                  className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all active:scale-95 shadow-2xs flex items-center gap-1.5"
                >
                  {copiedPromo ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> {t.copied}
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> {t.copyPromo}
                    </>
                  )}
                </button>
              </div>

              {/* Download App Button */}
              {company.app_link && (
                <a
                  href={company.app_link}
                  target="_blank"
                  rel="noreferrer"
                  className="h-10 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition-colors flex items-center justify-center gap-2 w-full"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>{t.appBtn} ({company.name})</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                </a>
              )}

              {/* Step 1 Actions */}
              <div className="pt-1 flex flex-col gap-2">
                <button
                  onClick={handleConfirmStep1}
                  className="h-11 px-4 rounded-xl text-white font-bold text-xs shadow-xs transition-all active:scale-98 flex items-center justify-center gap-2 w-full"
                  style={{
                    backgroundColor: company.color,
                  }}
                >
                  <span>{t.confirmRegBtn}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </button>

                <button
                  onClick={() => setStep(2)}
                  className="h-8 text-xs text-slate-500 hover:text-slate-800 font-bold transition-colors text-center"
                >
                  لديك حساب مسجل بالفعل؟ أدخل رقم الحساب
                </button>
              </div>
            </div>
          ) : (
            /* STEP 2 */
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-start gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Account Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم حساب اللاعب (Account ID)
                </label>
                <input
                  type="text"
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder={t.accountNumberPlaceholder}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors text-center"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  انسخ الرقم التعريفي من تطبيق {company.name} بعد إتمام التسجيل.
                </span>
              </div>

              {/* PIN Code */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    {t.pinPlaceholder}
                  </label>
                  <span className="text-[10px] text-emerald-700 flex items-center gap-1 font-mono font-bold">
                    <ShieldCheck className="w-3 h-3" />
                    {hasExistingPin ? 'الرمز المحدد مسبقاً' : 'تعيين رمز سري جديد'}
                  </span>
                </div>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-center tracking-[0.5em] text-base font-mono placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                />
                <span className="text-[10px] text-slate-500 mt-1 block leading-normal">
                  {t.pinHint}
                </span>
              </div>

              {/* Step 2 Actions */}
              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="h-11 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                  <span>رجوع</span>
                </button>

                <button
                  type="submit"
                  disabled={loading || !accountNumber || pin.length !== 4}
                  className="flex-1 h-11 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-xs transition-all active:scale-98 flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: company.color,
                  }}
                >
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>تأكيد وربط الحساب</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
