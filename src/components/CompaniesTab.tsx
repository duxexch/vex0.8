import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Company, CompensationAccount, Language, AppBranding } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { CompanyBrandLogo } from './CompanyBrandLogo';
import { CompaniesTabSkeleton } from './SkeletonLoader';
import { getCompanyTheme } from '../data/companyThemes';
import { getLocalizedCompany } from '../utils/companyTranslator';
import { triggerHaptic } from '../utils/haptics';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { Card } from './Card';
import TelegramContactButton from './TelegramContactButton';
import {
  Copy,
  Check,
  Download,
  Info,
  Search,
  ShieldCheck,
  Clock,
  PlusCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Award,
  Edit3,
  HelpCircle,
  CheckCircle2,
  LayoutGrid,
  List,
  SlidersHorizontal,
  Star,
  X,
  Sparkles,
  Building2,
  Filter,
  MessageCircle,
  Send,
} from 'lucide-react';

const WA_CONTACT_URL = 'https://wa.me/201096849170?text=' + encodeURIComponent('أهلاً VEX 👋 عايز أتواصل معاكم');

interface CompaniesTabProps {
  companies: Company[];
  accounts: CompensationAccount[];
  onOpenRegister: (company: Company) => void;
  onOpenDetails: (company: Company) => void;
  onRequestComp: (companyId: string) => void;
  lang: Language;
  branding?: AppBranding;
  isLoading?: boolean;
  onCopyToast?: () => void;
}

export const CompaniesTab: React.FC<CompaniesTabProps> = ({
  companies,
  accounts,
  onOpenRegister,
  onOpenDetails,
  onRequestComp,
  lang,
  branding,
  isLoading = false,
  onCopyToast,
}) => {
  // Scroll reveal for the quick-action surface (Phase 27/28)
  const quickActionsRef = useScrollReveal<HTMLDivElement>();
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAllPartners, setShowAllPartners] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [filterCategory, setFilterCategory] = useState<'all' | 'registered' | 'apps'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('vex_favorites');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const t = TRANSLATIONS[lang] || TRANSLATIONS['ar'];
  const isAr = lang === 'ar';

  if (isLoading || (companies.length === 0 && isLoading)) {
    return <CompaniesTabSkeleton />;
  }

  const toggleFavorite = (companyId: string) => {
    setFavorites(prev => {
      const isFav = prev.includes(companyId);
      const newFavs = isFav ? prev.filter(id => id !== companyId) : [...prev, companyId];
      try {
        localStorage.setItem('vex_favorites', JSON.stringify(newFavs));
      } catch {}
      return newFavs;
    });
  };

  const handleCopyPromo = (company: Company) => {
    navigator.clipboard.writeText(company.promo_code);
    setCopiedId(company.id);
    if (onCopyToast) onCopyToast();
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Readable text color (dark/white) for a brand color background
  const readableText = (hex: string) => {
    try {
      const h = hex.replace('#', '');
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b > 150 ? '#0f172a' : '#ffffff';
    } catch {
      return '#ffffff';
    }
  };

  // Check if exclusive single-brand mode is active
  const isExclusive =
    branding?.exclusiveMode &&
    branding?.targetCompanyId &&
    branding.targetCompanyId !== 'all';

  const exclusiveCompany = isExclusive
    ? companies.find((c) => c.id === branding.targetCompanyId && c.is_active)
    : null;

  const exclusiveTheme = exclusiveCompany
    ? getCompanyTheme(exclusiveCompany.id, exclusiveCompany.name, exclusiveCompany.color)
    : null;

  // Filter companies matching search & category
  const filtered = companies.filter((c) => {
    if (!c.is_active) return false;
    const userAccount = accounts.find((a) => a.company_id === c.id);
    if (filterCategory === 'registered' && !userAccount) return false;
    if (filterCategory === 'apps' && !c.app_link) return false;

    const loc = getLocalizedCompany(c, lang);
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      loc.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      loc.description.toLowerCase().includes(q) ||
      c.promo_code.toLowerCase().includes(q)
    );
  });

  const sortedFiltered = [...filtered].sort((a, b) => {
    const aFav = favorites.includes(a.id);
    const bFav = favorites.includes(b.id);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return 0; // maintain previous order
  });

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      {/* ------------------------------------------------------------- */}
      {/* EXCLUSIVE SINGLE-BRAND HERO VIEW                              */}
      {/* ------------------------------------------------------------- */}
      {exclusiveCompany && exclusiveTheme ? (
        <div className="space-y-4">
          <div
            className="rounded-3xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden transition-all duration-300"
            style={{
              background: `linear-gradient(135deg, ${exclusiveTheme.secondaryColor || '#0f172a'} 0%, ${exclusiveCompany.color} 50%, ${exclusiveTheme.accentColor || '#38bdf8'} 100%)`,
            }}
          >
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-white text-xs font-black backdrop-blur-md">
                  <Award className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  {isAr ? exclusiveTheme.heroBadgeAr : exclusiveTheme.heroBadgeEn}
                </span>

                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-black/30 border border-white/15 text-white/90">
                  {isAr ? 'وضع الشريك الحصري 100%' : '100% Exclusive Mode'}
                </span>
              </div>

              <div className="flex items-center gap-3.5">
                <CompanyBrandLogo
                  companyName={exclusiveCompany.name}
                  size="xl"
                  className="ring-4 ring-white/30 shadow-lg"
                />
                <div className="space-y-0.5">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-sm">
                    {isAr ? exclusiveTheme.appNameAr : exclusiveTheme.appNameEn}
                  </h1>
                  <p className="text-xs sm:text-sm text-white/90 font-medium leading-snug max-w-sm">
                    {isAr ? exclusiveTheme.taglineAr : exclusiveTheme.taglineEn}
                  </p>
                </div>
              </div>

              {/* Promo Code Box */}
              <div className="bg-black/30 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 flex items-center justify-between gap-3 shadow-inner">
                <div className="space-y-0.5">
                  <span className="text-[11px] text-white/80 block font-medium">
                    {isAr ? 'كود الوكالة المعتمد للبونص وحماية الخسائر:' : 'Official Agency Code for Cashback:'}
                  </span>
                  <span className="font-mono text-base font-black text-amber-300 tracking-wider">
                    {exclusiveCompany.promo_code}
                  </span>
                </div>

                <button
                  onClick={() => handleCopyPromo(exclusiveCompany)}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-black flex items-center gap-1.5 transition-transform active:scale-95 shadow-md cursor-pointer"
                >
                  {copiedId === exclusiveCompany.id ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>{isAr ? 'تم النسخ' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-700" />
                      <span>{isAr ? 'نسخ الكود' : 'Copy'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Toggle other partners in exclusive mode */}
          <div className="text-center pt-1">
            <button
              onClick={() => setShowAllPartners(!showAllPartners)}
              className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 transition-colors inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <span>
                {isAr
                  ? `استعراض باقي الشركات (${companies.length - 1} منصة)`
                  : `View other partners (${companies.length - 1})`}
              </span>
              {showAllPartners ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* ========================================================= */}
          {/* RICH COMPANY SECTIONS & GUIDES (DEDICATED WEBSITE PORTAL) */}
          {/* ========================================================= */}
          {(() => {
            const customSite = branding?.companyCustomWebsites?.[exclusiveCompany.id];
            const promo = customSite?.promoCode || exclusiveCompany.promo_code;
            const affLink = customSite?.affiliateLink || exclusiveCompany.affiliate_link;
            const appLink = customSite?.appDownloadLink || exclusiveCompany.app_link;

            return (
              <div className="space-y-4 pt-2">
                {/* Quick Action Grid */}
                <div ref={quickActionsRef} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Card
                    as="a"
                    href={affLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="interactive"
                    tilt
                    spotlight
                    className="flex items-center gap-3 group hover:border-emerald-500 shadow-xs"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                      <ExternalLink className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">
                        {isAr ? 'التسجيل وفتح الحساب الرسمي' : 'Official Account Registration'}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {isAr ? `سجل بالكود (${promo}) للبونص` : `Register with code (${promo})`}
                      </p>
                    </div>
                  </Card>

                  <Card
                    as="a"
                    href={appLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="interactive"
                    tilt
                    spotlight
                    className="flex items-center gap-3 group hover:border-sky-500 shadow-xs"
                  >
                    <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">
                        {isAr ? 'تحميل تطبيق الموبايل الرسمي' : 'Download Official Mobile App'}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {isAr ? 'تطبيق سريع وآمن لأندرويد وآيفون' : 'Fast & secure app for Android/iOS'}
                      </p>
                    </div>
                  </Card>

                  <Card
                    as="button"
                    type="button"
                    onClick={() => onRequestComp(exclusiveCompany.id)}
                    variant="interactive"
                    tilt
                    spotlight
                    className="flex items-center gap-3 group hover:border-purple-500 shadow-xs"
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">
                        {isAr ? 'طلب حماية الخسائر والاسترداد' : 'Request Cashback & Protection'}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {isAr ? 'استرداد نقدي فوري على خسائر رهاناتك' : 'Instant cashback on losses'}
                      </p>
                    </div>
                  </Card>
                </div>

                {/* Section 1: About & Overview */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                      <Info className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      {isAr
                        ? customSite?.sections?.overview?.titleAr || `نبذة عن منصة ${exclusiveCompany.name} ومميزات الوكالة الحصرية`
                        : customSite?.sections?.overview?.titleEn || `About ${exclusiveCompany.name} & Exclusive Agency Perks`}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {isAr
                      ? customSite?.sections?.overview?.contentAr || `${exclusiveCompany.description} تعتبر المنصة من أهم الشركاء المعتمدين لدينا، حيث نوفر لجميع اللاعبين المسجلين عبر كود الوكالة (${promo}) ميزات استثنائية تشمل بونص ترحيبي مضاعف، حماية خسائر أسبوعية، وسرعة فائقة في عمليات الإيداع والسحب.`
                      : customSite?.sections?.overview?.contentEn || `${exclusiveCompany.description} As our certified official partner, players registering with agency code (${promo}) receive exceptional privileges including doubled welcome bonuses, weekly loss protection, and priority deposits/withdrawals.`}
                  </p>
                </div>

                {/* Section 2: Registration Guide */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      {isAr
                        ? customSite?.sections?.registrationGuide?.titleAr || 'دليل التسجيل وتفعيل كود البرومو خطوة بخطوة'
                        : customSite?.sections?.registrationGuide?.titleEn || 'Step-by-Step Registration & Promo Code Guide'}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 space-y-1.5">
                      <span className="w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-black flex items-center justify-center">1</span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {isAr ? 'الدخول عبر رابط الوكالة المعتمد' : 'Open Official Link'}
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        {isAr ? 'اضغط على زر التسجيل الرسمي للانتقال مباشرة للموقع الآمن.' : 'Click official registration to access secure portal.'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 space-y-1.5">
                      <span className="w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-black flex items-center justify-center">2</span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {isAr ? 'إدخال كود البرومو بدقة' : 'Enter Promo Code'}
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        {isAr ? `تأكد من كتابة الكود (${promo}) في خانة الكود الدعائي.` : `Ensure code (${promo}) is entered in referral field.`}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 space-y-1.5">
                      <span className="w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-black flex items-center justify-center">3</span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {isAr ? 'ربط الحساب وبدء الاستفادة' : 'Link & Claim Benefits'}
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        {isAr ? 'سجل رقم حسابك في المنصة هنا لتفعيل حماية الخسائر والبونص فوراً.' : 'Register account number here to activate loss protection instantly.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 3: Cashback & Protection Policy */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      {isAr
                        ? customSite?.sections?.cashbackPolicy?.titleAr || 'سياسة حماية الخسائر والاسترداد النقدي (Cashback)'
                        : customSite?.sections?.cashbackPolicy?.titleEn || 'Cashback & Loss Protection Policy'}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {isAr
                      ? customSite?.sections?.cashbackPolicy?.contentAr || `نوفر لك في VEX Deals شبكة أمان متكاملة؛ ففي حال واجهتك خسائر في رهاناتك عبر منصة ${exclusiveCompany.name}، يمكنك تقديم رقم الحساب وقسيمة الرهان عبر قسم المحفظة والتعويضات لاسترداد جزء كبير من الخسائر وفق جدول التعويضات المعتمد للوكالة.`
                      : customSite?.sections?.cashbackPolicy?.contentEn || `VEX Deals provides an integrated safety net. If you experience losses on ${exclusiveCompany.name}, submit your account ID and bet slip in the compensation wallet to recover a substantial percentage according to official agency terms.`}
                  </p>
                </div>

                {/* Section 4: FAQ */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      {isAr ? 'الأسئلة الشائعة حول الوكالة والبونص' : 'Frequently Asked Questions (FAQ)'}
                    </h3>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                      <strong className="block text-slate-900 dark:text-white font-bold mb-1">
                        {isAr ? 'كيف أتأكد أن حسابي مرتبط بوكالتنا بنجاح؟' : 'How do I confirm my account is linked?'}
                      </strong>
                      <span className="text-slate-600 dark:text-slate-300">
                        {isAr ? 'بمجرد التسجيل باستخدام كود البرومو وإدخال رقم الحساب في قسم الحسابات، يتم التحقق الآلي من ارتباط حسابك بالوكالة.' : 'Once registered with the promo code and account number entered in accounts tab, automated verification confirms agency linkage.'}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                      <strong className="block text-slate-900 dark:text-white font-bold mb-1">
                        {isAr ? 'متى يتم صرف تعويضات الخسائر والاسترداد النقدي؟' : 'When are cashback compensations paid out?'}
                      </strong>
                      <span className="text-slate-600 dark:text-slate-300">
                        {isAr ? 'يتم مراجعة الطلبات والتحقق من قسائم الرهان خلال 24 ساعة وصرف الأرصدة مباشرة إلى محفظتك.' : 'Requests and bet slips are reviewed within 24 hours with funds credited directly to your wallet.'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* PREMIUM FLOATING SEARCH & FILTER CARD (GLASSMORPHISM)         */
        /* ------------------------------------------------------------- */
        <div className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-900/5 p-4 sm:p-5 select-none transition-all duration-300 ring-1 ring-slate-900/5">
          {/* Subtle Ambient Glow Backgrounds */}
          <div className="absolute -top-16 -right-16 w-52 h-52 bg-gradient-to-br from-emerald-500/15 to-teal-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-52 h-52 bg-gradient-to-tr from-sky-500/15 to-blue-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-3.5">
            {/* Top Row: Engine Live Pill + Stats Counter */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50/90 text-emerald-800 border border-emerald-200/80 text-xs font-black shadow-2xs backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isAr ? 'محرك البحث والاستكشاف الذكي' : 'Smart Discovery Search'}</span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                <span className="font-mono px-2.5 py-1 rounded-xl bg-slate-100/90 backdrop-blur-md border border-slate-200/80 text-slate-700 tabular-nums flex items-center gap-1.5 shadow-2xs">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {filtered.length} / {companies.filter((c) => c.is_active).length} {isAr ? 'منصة معتمدة' : 'Partners'}
                  </span>
                </span>
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-1">
              <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900">
                {t.verifiedPartners}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                {isAr
                  ? 'ابحث فوراً باسم الشركة، الكود الدعائي، بونص الترحيب، أو صَفِّ حسب التطبيقات والحسابات المسجلة.'
                  : t.companyCardSubtitle}
              </p>
            </div>

            {/* Premium Floating Search Input with Integrated Filter Button */}
            <div className="relative flex items-center bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-sm focus-within:shadow-md focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all duration-200 p-1.5 gap-2">
              {/* Integrated Search Icon Pill */}
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/80">
                <Search className="w-4 h-4 text-emerald-600" />
              </div>

              {/* Input Field */}
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  isAr
                    ? 'ابحث عن منصة (مثال: 1xBet، Melbet، كود VEX)...'
                    : t.searchCompanyPlaceholder
                }
                className="flex-1 h-10 bg-transparent text-slate-900 text-xs sm:text-sm placeholder-slate-400 focus:outline-none font-medium px-1"
              />

              {/* Clear Button */}
              {search.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setSearch('');
                  }}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 transition-transform active:scale-90 cursor-pointer"
                  title={isAr ? 'مسح البحث' : 'Clear search'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Integrated Filter Button (Icon-Only) */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  setIsFilterOpen(!isFilterOpen);
                }}
                className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer shrink-0 active:scale-95 ${
                  isFilterOpen || filterCategory !== 'all'
                    ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-500'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/80'
                }`}
                title={isAr ? 'خيارات التصفية والفرز' : 'Filter Options'}
                aria-label={isAr ? 'تصفية' : 'Filters'}
              >
                <SlidersHorizontal className="w-4 h-4" />

                {filterCategory !== 'all' && (
                  <span className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full bg-amber-300 ring-1.5 ring-emerald-600 animate-pulse" />
                )}
              </button>
            </div>

            {/* Quick Keyword Suggestion Chips (Always accessible) */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-0.5">
              <span className="text-[10px] font-black uppercase text-slate-400 shrink-0">
                {isAr ? 'شائع:' : 'Popular:'}
              </span>
              {['1xBet', 'Melbet', 'Betwinner', 'Linebet', '888starz'].map((tag) => {
                const isSelected = search.toLowerCase() === tag.toLowerCase();
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSearch(isSelected ? '' : tag);
                    }}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                      isSelected
                        ? 'bg-emerald-600 text-white font-black shadow-xs ring-1 ring-emerald-500'
                        : 'bg-white/90 hover:bg-slate-100 text-slate-600 border border-slate-200/80 shadow-2xs backdrop-blur-xs'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            {/* Integrated Expandable / Sticky Filter Options Panel */}
            <AnimatePresence>
              {(isFilterOpen || filterCategory !== 'all') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="pt-2 border-t border-slate-200/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    {/* Category Filter Segments */}
                    <div className="flex items-center gap-1 bg-slate-100/90 backdrop-blur-md p-1 rounded-xl border border-slate-200 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setFilterCategory('all');
                        }}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          filterCategory === 'all'
                            ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {isAr ? 'جميع المنصات' : 'All Partners'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setFilterCategory('registered');
                        }}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                          filterCategory === 'registered'
                            ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>{isAr ? 'حساباتي المربوطة' : 'Linked Accounts'}</span>
                        {accounts.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                            {accounts.length}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setFilterCategory('apps');
                        }}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                          filterCategory === 'apps'
                            ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Download className="w-3 h-3 text-slate-500" />
                        <span>{isAr ? 'تطبيقات الموبايل' : 'Mobile Apps'}</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Active Query or Filter Feedback Bar */}
            {(search.trim().length > 0 || filterCategory !== 'all') && (
              <div className="flex items-center justify-between text-xs bg-emerald-50/90 text-emerald-900 px-3 py-1.5 rounded-xl border border-emerald-200 backdrop-blur-xs animate-fade-in">
                <span className="font-bold flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {isAr
                      ? `عثرنا على ${filtered.length} منصة مطابقة${search ? ` لـ "${search}"` : ''}`
                      : `Found ${filtered.length} partners matching${search ? ` "${search}"` : ''}`}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setSearch('');
                    setFilterCategory('all');
                  }}
                  className="text-emerald-700 hover:text-emerald-950 font-bold underline cursor-pointer text-[11px]"
                >
                  {isAr ? 'إلغاء التصفية' : 'Reset filters'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* COMPANIES LIST - UNIFIED LOTTERY-STYLE CARDS (GRID OR LIST)   */}
      {/* ------------------------------------------------------------- */}
      {(!exclusiveCompany || showAllPartners) && (
        <>
          {/* View mode switcher — always visible */}
          <div className="flex items-center justify-between gap-2 bg-white/80 backdrop-blur-md border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
            <span className="text-[11px] font-black text-slate-500 tracking-tight">
              {isAr ? 'طريقة العرض' : 'View mode'}
            </span>
            <div className="flex items-center gap-1.5">
              <a
                href={WA_CONTACT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-br from-[#25D366] to-[#0f8f5a] text-white text-[10px] font-black shadow-xs [text-shadow:0_1px_1px_rgba(0,0,0,0.18)] transition-all active:scale-95 hover:brightness-110 cursor-pointer"
                title={isAr ? 'تواصل عبر واتساب' : 'Contact via WhatsApp'}
              >
                <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{isAr ? 'واتساب' : 'WhatsApp'}</span>
              </a>
              <TelegramContactButton
                lang={lang}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 text-white text-[10px] font-black shadow-xs [text-shadow:0_1px_1px_rgba(0,0,0,0.18)] transition-all active:scale-95 hover:brightness-110 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 shrink-0" />
                <span>{isAr ? 'تيليجرام' : 'Telegram'}</span>
              </TelegramContactButton>
              <div className="flex items-center gap-1 bg-slate-100/90 backdrop-blur-md p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setViewMode('grid');
                }}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title={isAr ? 'عرض البطاقات' : 'Grid View'}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setViewMode('table');
                }}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title={isAr ? 'عرض القائمة' : 'List View'}
              >
                <List className="w-4 h-4" />
              </button>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900">
                  {isAr ? 'لم نعثر على أي نتائج مطابقة' : 'No matching partners found'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {isAr
                    ? `لا توجد شركات تطابق كلمة البحث "${search}". جرب البحث بكلمة أخرى أو إعادة تعيين الفلاتر.`
                    : `No partner matches "${search}". Try searching with different keywords or reset filters.`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setFilterCategory('all');
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                {isAr ? 'إعادة ضبط كافة الفلاتر والبحث' : 'Reset All Filters'}
              </button>
            </div>
          ) : viewMode === 'table' ? (
            /* ========================================================= */
            /* FULL-WIDTH HORIZONTAL LIST CARDS (LOTTERY STYLE)           */
            /* ========================================================= */
            <div className="flex flex-col gap-3">
              {sortedFiltered.map((company) => {
                const userAccount = accounts.find((a) => a.company_id === company.id);
                const isRegistered = userAccount?.status === 'active';
                const isPending = userAccount?.status === 'pending';
                const loc = getLocalizedCompany(company, lang);

                return (
                  <div
                    key={company.id}
                    className="relative overflow-hidden rounded-2xl p-3.5 sm:p-4 bg-gradient-to-br from-slate-900/70 via-slate-900/60 to-slate-950/80 backdrop-blur-xl shadow-lg shadow-black/20 flex flex-col sm:flex-row sm:items-center gap-3 group"
                    style={{
                      border: `1px solid ${company.color}55`,
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-transparent pointer-events-none" />
                    <div
                      className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-30"
                      style={{ background: company.color }}
                    />
                    <div className="absolute top-0 inset-x-0 h-0.5" style={{ background: company.color }} />

                    {/* Identity: star + logo + name + badge + account */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(company.id); }}
                        className="text-slate-600 hover:text-amber-400 transition-colors cursor-pointer shrink-0 -ml-1 p-1"
                      >
                        <Star
                          className={`w-4 h-4 ${favorites.includes(company.id) ? 'fill-amber-400 text-amber-400' : ''}`}
                        />
                      </button>
                      <div className="rounded-xl bg-white/95 p-0.5 shadow-md shrink-0">
                        <CompanyBrandLogo companyName={company.name} size="md" className="rounded-lg" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-white text-sm tracking-tight truncate">{loc.name}</h3>
                          {company.badge && (
                            <span
                              className="text-[9px] font-black px-1.5 py-0.5 rounded shrink-0"
                              style={{
                                backgroundColor: company.color,
                                color: readableText(company.color),
                              }}
                            >
                              {company.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate font-medium mt-0.5">{loc.description}</p>
                        {userAccount && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="font-mono font-bold text-[10px] text-slate-300">{userAccount.account_number}</span>
                            {isRegistered ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                                <ShieldCheck className="w-3 h-3" />
                                <span>{t.registeredBadge}</span>
                              </span>
                            ) : isPending ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded">
                                <Clock className="w-3 h-3" />
                                <span>{t.pendingBadge}</span>
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Promo code chip */}
                    <button
                      type="button"
                      onClick={() => handleCopyPromo(company)}
                      className="relative flex items-center gap-2 bg-slate-950/70 border rounded-xl px-3 py-1.5 shrink-0 cursor-pointer transition-all active:scale-98"
                      style={{ borderColor: `${company.color}45` }}
                      title={t.copyPromo}
                    >
                      <div className="text-start leading-tight">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                          {t.promoCode}
                        </span>
                        <span
                          className="font-mono font-black text-xs tracking-wider block"
                          style={{ color: company.color }}
                        >
                          {company.promo_code}
                        </span>
                      </div>
                      {copiedId === company.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>

                    {/* Actions */}
                    <div className="grid grid-cols-2 sm:flex items-center gap-1.5 relative shrink-0">
                      <a
                        href={company.affiliate_link || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="h-8 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 active:scale-95 shadow-md cursor-pointer"
                        style={{
                          background: `linear-gradient(135deg, ${company.color}, ${company.color}d0)`,
                          color: readableText(company.color),
                        }}
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{t.registerAndSite}</span>
                      </a>

                      {company.app_link && (
                        <a
                          href={company.app_link}
                          target="_blank"
                          rel="noreferrer"
                          className="h-8 px-3 rounded-xl text-xs font-bold bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-white/10 transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                        >
                          <Download className="w-3 h-3 shrink-0" />
                          <span className="truncate">{t.appBtn}</span>
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => (isRegistered ? onRequestComp(company.id) : onOpenRegister(company))}
                        className="h-8 px-3 rounded-xl text-xs font-bold bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-white/10 transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        {isRegistered ? (
                          <>
                            <PlusCircle className="w-3 h-3 text-emerald-400" />
                            <span className="truncate">{t.requestCompensation}</span>
                          </>
                        ) : (
                          <>
                            <Edit3 className="w-3 h-3" />
                            <span className="truncate">{t.linkAccount}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenDetails(company)}
                        className="h-8 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-white/10 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Info className="w-3 h-3" />
                        <span className="truncate">{t.detailsBtn}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ========================================================= */
            /* UNIFIED LOTTERY-STYLE GRID CARDS                          */
            /* ========================================================= */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedFiltered
                .map((company) => {
                  const userAccount = accounts.find((a) => a.company_id === company.id);
                  const isRegistered = userAccount?.status === 'active';
                  const isPending = userAccount?.status === 'pending';
                  const loc = getLocalizedCompany(company, lang);

                  return (
                    <div
                      key={company.id}
                      className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-slate-900/70 via-slate-900/60 to-slate-950/80 backdrop-blur-xl shadow-lg shadow-black/20 flex flex-col justify-between h-full group spotlight-surface transition-all duration-200"
                      style={{
                        border: `1px solid ${company.color}55`,
                      }}
                    >
                      {/* Sheen + brand glow */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-transparent pointer-events-none" />
                      <div
                        className="absolute -top-12 -right-10 w-28 h-28 rounded-full blur-3xl pointer-events-none opacity-25"
                        style={{ background: company.color }}
                      />

                      {/* Top Color Accent Line */}
                      <div
                        className="absolute top-0 left-0 right-0 h-0.5"
                        style={{ backgroundColor: company.color }}
                      />

                      <div className="space-y-3 relative">
                        {/* Header: Logo, Name, Badge & Status */}
                        <div className="flex items-start justify-between gap-2.5 pt-0.5">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleFavorite(company.id); }}
                              className="text-slate-600 hover:text-amber-400 transition-colors cursor-pointer shrink-0 -ml-1 p-1"
                            >
                              <Star
                                className={`w-4 h-4 ${favorites.includes(company.id) ? 'fill-amber-400 text-amber-400' : ''}`}
                              />
                            </button>
                            <div className="rounded-xl bg-white/95 p-0.5 shadow-md shrink-0">
                              <CompanyBrandLogo
                                companyName={company.name}
                                size="md"
                                className="rounded-lg"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-black text-white text-sm tracking-tight truncate">
                                {loc.name}
                              </h3>
                              <p className="text-[11px] text-slate-400 truncate font-medium mt-0.5">
                                {loc.description}
                              </p>
                            </div>
                          </div>

                          {company.badge && (
                            <span
                              className="text-[9px] font-black px-2 py-0.5 rounded-md leading-tight shrink-0"
                              style={{
                                backgroundColor: company.color,
                                color: readableText(company.color),
                              }}
                            >
                              {company.badge}
                            </span>
                          )}
                        </div>

                        {/* Promo Code Box */}
                        <div
                          onClick={() => handleCopyPromo(company)}
                          className="p-2.5 rounded-xl border bg-slate-950/60 flex items-center justify-between cursor-pointer transition-all active:scale-98 shadow-2xs hover:shadow-xs"
                          style={{
                            borderColor: `${company.color}40`,
                          }}
                          title={t.copyPromo}
                        >
                          <div className="space-y-0.5">
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                              {t.promoCode}
                            </span>
                            <span
                              className="font-mono font-black text-xs tracking-wider block"
                              style={{ color: company.color }}
                            >
                              {company.promo_code}
                            </span>
                          </div>
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-800 border"
                            style={{ borderColor: `${company.color}45` }}
                          >
                            {copiedId === company.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {/* Account Status / ID Box */}
                        {userAccount ? (
                          <div className="p-2 rounded-xl border border-white/10 bg-slate-950/50 flex items-center justify-between shadow-2xs text-xs">
                            <div className="space-y-0.5 min-w-0">
                              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                                {t.accountLabel}
                              </span>
                              <span className="font-mono font-bold text-slate-200 text-[11px] block truncate">
                                {userAccount.account_number}
                              </span>
                            </div>
                            {isRegistered ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded-md shrink-0">
                                <ShieldCheck className="w-3 h-3" />
                                <span>{t.registeredBadge}</span>
                              </span>
                            ) : isPending ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-md shrink-0">
                                <Clock className="w-3 h-3" />
                                <span>{t.pendingBadge}</span>
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <div className="p-2 rounded-xl border border-white/10 bg-slate-950/50 flex items-center justify-between text-xs text-slate-400">
                            <span className="text-[11px] font-medium">{t.notRegisteredBadge}</span>
                            <button
                              type="button"
                              onClick={() => onOpenRegister(company)}
                              className="h-6 px-2 rounded-lg bg-slate-800 border border-white/10 text-slate-200 font-bold text-[11px] hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
                            >
                              {t.linkAccount}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons: 2x2 Grid with balanced heights */}
                      <div className="mt-3.5 pt-2.5 border-t border-white/10 grid grid-cols-2 gap-1.5 relative">
                        <a
                          href={company.affiliate_link || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="h-8 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 active:scale-95 shadow-md cursor-pointer"
                          style={{
                            background: `linear-gradient(135deg, ${company.color}, ${company.color}d0)`,
                            color: readableText(company.color),
                          }}
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{t.registerAndSite}</span>
                        </a>

                        {company.app_link && (
                          <a
                            href={company.app_link}
                            target="_blank"
                            rel="noreferrer"
                            className="h-8 px-2 rounded-xl text-xs font-bold bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-white/10 transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                          >
                            <Download className="w-3 h-3 shrink-0" />
                            <span className="truncate">{t.appBtn}</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => (isRegistered ? onRequestComp(company.id) : onOpenRegister(company))}
                          className="h-8 px-2 rounded-xl text-xs font-bold bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-white/10 transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          {isRegistered ? (
                            <>
                              <PlusCircle className="w-3 h-3 text-emerald-400" />
                              <span className="truncate">{t.requestCompensation}</span>
                            </>
                          ) : (
                            <>
                              <Edit3 className="w-3 h-3" />
                              <span className="truncate">{t.linkAccount}</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenDetails(company)}
                          className="h-8 px-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-white/10 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Info className="w-3 h-3" />
                          <span className="truncate">{t.detailsBtn}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
