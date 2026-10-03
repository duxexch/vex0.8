import React, { useState } from 'react';
import { Company, Language, Referral, PLATFORM_DOMAIN } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { vexApi, generateReferralCode, getReferralUrl } from '../services/api';
import {
  Copy,
  Check,
  Share2,
  Users,
  Gift,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Percent,
  Lock,
} from 'lucide-react';

interface ReferralsTabProps {
  companies: Company[];
  referrals: Referral[];
  selectedCompanyId?: string;
  onRefresh: () => void;
  lang: Language;
  onCopyToast?: () => void;
}

export const ReferralsTab: React.FC<ReferralsTabProps> = ({
  companies,
  referrals,
  selectedCompanyId,
  onRefresh,
  lang,
  onCopyToast,
}) => {
  const [activeCompanyId, setActiveCompanyId] = useState(
    selectedCompanyId || companies[0]?.id || 'CMPMLB002'
  );
  const [inputCode, setInputCode] = useState('');
  const [targetAccount, setTargetAccount] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const t = TRANSLATIONS[lang];
  const activeCompany = companies.find((c) => c.id === activeCompanyId) || companies[0];
  const myUserId = vexApi.getUserId();
  const code = generateReferralCode(myUserId, activeCompany?.id || 'CMPMLB002');
  const link = getReferralUrl(code, activeCompany?.id);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    if (onCopyToast) onCopyToast();
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    if (onCopyToast) onCopyToast();
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleShare = async () => {
    const isAr = lang === 'ar';
    const shareTitle = isAr
      ? `سجل في ${activeCompany?.name} عبر ${PLATFORM_DOMAIN}`
      : `Register with ${activeCompany?.name} on ${PLATFORM_DOMAIN}`;
    const shareText = isAr
      ? `احصل على تعويضات واسترداد لأرصدتك في ${activeCompany?.name} باستخدام كود الإحالة ${code}!`
      : `Get instant loss compensations and deposit rewards on ${activeCompany?.name} using referral code ${code}!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: link,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleApplyReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyMsg(null);
    if (!inputCode.trim()) return;

    setApplying(true);
    try {
      const res = await vexApi.activateReferralCode(
        inputCode.trim(),
        activeCompanyId,
        targetAccount.trim() || 'ACC-DEFAULT'
      );
      setApplyMsg({
        type: 'success',
        text:
          lang === 'ar'
            ? `تم تفعيل كود الإحالة بنجاح! تم فك تجميد $${res.unlockedAmount} وإضافتها إلى رصيدك المتاح.`
            : `Referral code activated successfully! $${res.unlockedAmount} unfrozen and credited to your available balance.`,
      });
      setInputCode('');
      setTargetAccount('');
      onRefresh();
    } catch (err: any) {
      setApplyMsg({
        type: 'error',
        text: err.message || (lang === 'ar' ? 'فشل تفعيل كود الإحالة.' : 'Failed to activate referral code.'),
      });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 animate-fade-in select-none">
      {/* Top Banner Header */}
      <div className="bg-white text-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3 relative overflow-hidden">
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-900">{t.referralTitle}</h2>
              <span className="text-xs text-emerald-700 font-bold">
                {t.referralUnfreezeBadge}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
            {PLATFORM_DOMAIN}
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          {t.referralDesc}
        </p>
      </div>

      {/* Main Responsive Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        {/* Left Column (7 cols): Platform Selector & Share Card */}
        <div className="lg:col-span-7 space-y-3.5">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
            {/* Company Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                {t.selectPlatform}
              </label>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {companies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCompanyId(c.id)}
                    className={`h-8 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                      activeCompanyId === c.id
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Referral Link & Code Box */}
            <div className="space-y-3 pt-1">
              {/* Link Box */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-bold">
                    {t.yourRefLinkFor} {activeCompany?.name}:
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="h-6 px-2.5 rounded-md bg-white border border-slate-200 text-emerald-700 hover:bg-slate-50 font-bold flex items-center gap-1 text-[11px] cursor-pointer shadow-2xs"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? t.copied : t.copyText}</span>
                  </button>
                </div>
                <p
                  className="text-xs font-mono font-bold text-slate-800 truncate select-all bg-white p-2.5 rounded-lg border border-slate-200"
                  dir="ltr"
                >
                  {link}
                </p>
              </div>

              {/* Code Box & Native Share */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="bg-slate-50 h-11 px-3.5 rounded-xl flex items-center justify-between border border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500">{t.codeLabel}</span>
                    <span className="font-mono font-black text-sm text-slate-900">
                      {code}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="w-7 h-7 rounded-lg bg-white text-slate-600 hover:text-slate-900 border border-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                    title={t.copyText}
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <button
                  onClick={handleShare}
                  className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl px-4 flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-white" />
                  <span>{t.shareLinkText}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Apply Code & Referrals History */}
        <div className="lg:col-span-5 space-y-3.5">
          {/* Enter a Referral Code Form */}
          <form
            onSubmit={handleApplyReferral}
            className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
                  <Percent className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    {t.applyReferralTitle}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {t.applyReferralDesc}
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>{t.protectionBadge}</span>
              </span>
            </div>

            {applyMsg && (
              <div
                className={`p-3 rounded-xl border flex items-start gap-2 text-xs animate-fade-in ${
                  applyMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {applyMsg.type === 'success' ? (
                  <Check className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                )}
                <span className="font-medium">{applyMsg.text}</span>
              </div>
            )}

            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.friendCodeLabel}
                </label>
                <input
                  type="text"
                  placeholder={t.friendCodePlaceholder}
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold tracking-wider text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white text-center transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.myAccountInCompany} {activeCompany?.name}:
                </label>
                <input
                  type="text"
                  placeholder="44521098"
                  value={targetAccount}
                  onChange={(e) => setTargetAccount(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white text-center transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={applying || !inputCode.trim()}
              className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs active:scale-98 cursor-pointer"
            >
              <span>{applying ? t.applyingText : t.applyAndUnfreezeBtn}</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          </form>

          {/* Referrals History */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t.referralsHistory} ({referrals.length})</span>
              </h3>
            </div>

            {referrals.length === 0 ? (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 text-center text-xs text-slate-400 shadow-xs">
                {t.noReferrals}
              </div>
            ) : (
              <div className="space-y-2">
                {referrals.map((ref) => (
                  <div
                    key={ref.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-3.5 flex items-center justify-between text-xs shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {ref.company_name}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {t.codeLabel} {ref.referral_code}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(ref.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="text-left rtl:text-right">
                      {ref.unlocked_amount && ref.unlocked_amount > 0 ? (
                        <span className="font-bold text-emerald-700 text-xs block font-mono">
                          +${ref.unlocked_amount.toFixed(2)} {t.unlockedSuffix}
                        </span>
                      ) : null}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block mt-0.5">
                        {ref.status === 'registered' ? t.statusActive : t.statusPending}
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
