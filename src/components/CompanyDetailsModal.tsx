import React, { useState } from 'react';
import { Company, Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { getLocalizedCompany } from '../utils/companyTranslator';
import { X, Copy, Check, Download, ExternalLink, Gift, CheckCircle2, Globe } from 'lucide-react';
import { CompanyBrandLogo } from './CompanyBrandLogo';

interface CompanyDetailsModalProps {
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
  onRegisterClick: (company: Company) => void;
  lang: Language;
  onCopyToast?: () => void;
}

export const CompanyDetailsModal: React.FC<CompanyDetailsModalProps> = ({
  company,
  isOpen,
  onClose,
  onRegisterClick,
  lang,
  onCopyToast,
}) => {
  const [copiedPromo, setCopiedPromo] = useState(false);

  if (!isOpen || !company) return null;
  const t = TRANSLATIONS[lang];
  const localized = getLocalizedCompany(company, lang);

  const handleCopy = () => {
    navigator.clipboard.writeText(company.promo_code);
    setCopiedPromo(true);
    if (onCopyToast) onCopyToast();
    setTimeout(() => setCopiedPromo(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md my-auto max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Banner */}
        <div
          className="p-6 text-slate-900 dark:text-white relative border-b border-slate-100 dark:border-slate-800 shrink-0"
          style={{
            background: `linear-gradient(135deg, ${company.color}15 0%, #ffffff 100%)`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CompanyBrandLogo
                companyName={company.name}
                size="lg"
                className="shadow-md"
              />
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{localized.name}</span>
                  {company.name_ar && lang !== 'ar' && (
                    <span className="text-xs font-medium text-slate-500">({company.name_ar})</span>
                  )}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {localized.badge && (
                    <span
                      className="text-[10px] font-black px-2 py-0.5 rounded-full border shadow-2xs"
                      style={{
                        backgroundColor: `${company.color}15`,
                        borderColor: `${company.color}40`,
                        color: company.color,
                      }}
                    >
                      {localized.badge}
                    </span>
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {t.officialPartnerBadge}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Info */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              {t.aboutCompanyAndPerks}
            </h4>
            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
              {localized.details || localized.description}
            </p>
          </div>

          {/* Promo Code Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-emerald-600" />
                {t.promoCode} {t.officialPromoForComp}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all shadow-xs cursor-pointer"
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
            <p className="font-mono text-xl font-black text-emerald-700 dark:text-emerald-400 tracking-wider">
              {company.promo_code}
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {t.promoWarning}
            </p>
          </div>

          {/* Compensation Perks */}
          <div className="space-y-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t.perk1}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t.perk2}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t.perk3}</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => {
                onClose();
                onRegisterClick(company);
              }}
              className="w-full py-3 px-4 rounded-2xl text-white font-extrabold text-xs shadow-md transition-all active:scale-98 text-center cursor-pointer"
              style={{
                backgroundColor: company.color,
                boxShadow: `0 4px 14px ${company.color}40`,
              }}
            >
              {t.registerBtn} {localized.name} ({company.promo_code})
            </button>

            {company.affiliate_link && (
              <a
                href={company.affiliate_link}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-800 transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                <span>{t.visitOfficialSite}</span>
                <ExternalLink className="w-3 h-3 opacity-50" />
              </a>
            )}

            {company.app_link && (
              <a
                href={company.app_link}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t.downloadAppApk}</span>
                <ExternalLink className="w-3 h-3 opacity-50" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
