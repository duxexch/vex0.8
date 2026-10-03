import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  Zap,
  Globe,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Radio,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Layers,
  Terminal,
  RefreshCw,
  XCircle,
  Plus,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Company, CompanyApiMethod } from '../types';
import { CompanyBrandLogo } from './CompanyBrandLogo';
import {
  BETTING_PLATFORM_PROVIDERS,
  BettingPlatformProvider,
  DiscoveredEndpointCandidate,
  discoverEndpointPatterns,
  probeEndpointCandidate,
  convertCandidatesToMethods,
  resolveBaseDomain,
} from '../utils/endpointDiscovery';

interface EndpointAutoDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  selectedCompanyId?: string;
  onApplyMethods: (companyId: string, newMethods: CompanyApiMethod[], mode: 'append' | 'replace') => void;
  onSelectSingleCandidate?: (candidate: DiscoveredEndpointCandidate) => void;
  lang: 'ar' | 'en';
  onCopyToast?: (label: string) => void;
}

export const EndpointAutoDiscoveryModal: React.FC<EndpointAutoDiscoveryModalProps> = ({
  isOpen,
  onClose,
  companies,
  selectedCompanyId,
  onApplyMethods,
  onSelectSingleCandidate,
  lang,
  onCopyToast,
}) => {
  const isAr = lang === 'ar';

  // Target company
  const [targetCompanyId, setTargetCompanyId] = useState<string>(
    selectedCompanyId || companies[0]?.id || ''
  );

  const activeCompany =
    companies.find((c) => c.id === targetCompanyId) || companies[0];

  // Provider selection
  const [selectedProviderId, setSelectedProviderId] = useState<string>('auto');

  // Custom domain override
  const [customDomain, setCustomDomain] = useState<string>('');

  // Discovered candidates
  const [candidates, setCandidates] = useState<DiscoveredEndpointCandidate[]>([]);
  const [detectedProvider, setDetectedProvider] = useState<BettingPlatformProvider | null>(null);
  const [resolvedBaseUrl, setResolvedBaseUrl] = useState<string>('');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());

  // Scanning & probing states
  const [isScanning, setIsScanning] = useState(false);
  const [probingId, setProbingId] = useState<string | null>(null);
  const [isProbingAll, setIsProbingAll] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [applyMode, setApplyMode] = useState<'append' | 'replace'>('append');

  // Synchronize when company changes
  useEffect(() => {
    if (activeCompany) {
      const defaultDomain = resolveBaseDomain(activeCompany);
      setCustomDomain(defaultDomain);
      runDiscovery(activeCompany, defaultDomain, selectedProviderId);
    }
  }, [activeCompany?.id]);

  // Run discovery engine
  const runDiscovery = (company: Company, domain?: string, provId?: string) => {
    setIsScanning(true);
    setTimeout(() => {
      const result = discoverEndpointPatterns(company, domain, provId);
      setDetectedProvider(result.detectedProvider);
      setResolvedBaseUrl(result.resolvedBaseUrl);
      setCandidates(result.candidates);
      // Select all by default
      setSelectedCandidateIds(new Set(result.candidates.map((c) => c.id)));
      setIsScanning(false);
    }, 280);
  };

  if (!isOpen || !activeCompany) return null;

  // Handle copy
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    setTimeout(() => setCopiedUrl(null), 2000);
    if (onCopyToast) onCopyToast(label);
  };

  // Toggle selection
  const toggleCandidate = (id: string) => {
    const updated = new Set(selectedCandidateIds);
    if (updated.has(id)) updated.delete(id);
    else updated.add(id);
    setSelectedCandidateIds(updated);
  };

  const toggleSelectAll = () => {
    if (selectedCandidateIds.size === candidates.length) {
      setSelectedCandidateIds(new Set());
    } else {
      setSelectedCandidateIds(new Set(candidates.map((c) => c.id)));
    }
  };

  // Probe single candidate
  const handleProbeCandidate = async (candidate: DiscoveredEndpointCandidate) => {
    setProbingId(candidate.id);
    try {
      const result = await probeEndpointCandidate(candidate);
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidate.id
            ? {
                ...c,
                probeStatus: result.reachable ? 'reachable' : 'unreachable',
                probeLatencyMs: result.latencyMs,
                probeStatusCode: result.statusCode,
                probeMessage: result.message,
              }
            : c
        )
      );
    } catch {
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidate.id
            ? {
                ...c,
                probeStatus: 'unreachable',
                probeLatencyMs: 250,
                probeStatusCode: 500,
                probeMessage: 'Connection handshake failed',
              }
            : c
        )
      );
    } finally {
      setProbingId(null);
    }
  };

  // Probe all candidates sequentially
  const handleProbeAll = async () => {
    setIsProbingAll(true);
    for (const cand of candidates) {
      setProbingId(cand.id);
      try {
        const result = await probeEndpointCandidate(cand);
        setCandidates((prev) =>
          prev.map((c) =>
            c.id === cand.id
              ? {
                  ...c,
                  probeStatus: result.reachable ? 'reachable' : 'unreachable',
                  probeLatencyMs: result.latencyMs,
                  probeStatusCode: result.statusCode,
                  probeMessage: result.message,
                }
              : c
          )
        );
      } catch {
        // continue
      }
    }
    setProbingId(null);
    setIsProbingAll(false);
  };

  // Apply selected candidates
  const handleApply = () => {
    const chosen = candidates.filter((c) => selectedCandidateIds.has(c.id));
    if (chosen.length === 0) return;

    const newMethods = convertCandidatesToMethods(chosen, activeCompany);
    onApplyMethods(activeCompany.id, newMethods, applyMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* ========================================================================= */}
        {/* MODAL HEADER                                                              */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-400/30 shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-white">
                  {isAr ? 'اكتشاف أنماط نقاط النهاية تلقائياً' : 'Auto-Discover API Endpoint Patterns'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 text-[10px] font-bold">
                  Convention Scanner v2.0
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {isAr
                  ? 'التعرف الذكي على معمارية مزود المنصة (1xBet / BetB2B, BetConstruct, Digitain, EveryMatrix) وتوليد مسارات الربط القياسية'
                  : 'Identifies betting provider architectures and auto-generates standardized endpoints with strict available balance enforcement'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* MODAL BODY                                                                */}
        {/* ========================================================================= */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-5 text-xs text-slate-800 dark:text-slate-100 flex-1">
          {/* Target Company & Engine Selector Controls */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Company Selector */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'الشركة المستهدفة:' : 'Target Bookmaker:'}
                </label>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 shrink-0">
                    <CompanyBrandLogo
                      companyName={activeCompany.name}
                      companyId={activeCompany.id}
                      color={activeCompany.color}
                      className="w-7 h-7 rounded-lg"
                    />
                  </div>
                  <select
                    value={targetCompanyId}
                    onChange={(e) => {
                      setTargetCompanyId(e.target.value);
                      const comp = companies.find((c) => c.id === e.target.value);
                      if (comp) {
                        const newDom = resolveBaseDomain(comp);
                        setCustomDomain(newDom);
                        runDiscovery(comp, newDom, selectedProviderId);
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold text-xs"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.promo_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Platform Engine / Architecture */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'معمارية المنصة / المزود:' : 'Platform Provider / Engine:'}
                </label>
                <select
                  value={selectedProviderId}
                  onChange={(e) => {
                    setSelectedProviderId(e.target.value);
                    runDiscovery(activeCompany, customDomain, e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold text-xs"
                >
                  <option value="auto">
                    {isAr ? '✨ كشف تلقائي بالاسم والمطابقة' : '✨ Auto-Detect Provider'}
                  </option>
                  {BETTING_PLATFORM_PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Base Domain Override */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'النطاق الأساسي للشركة:' : 'Base API Domain:'}
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 rtl:right-2.5 rtl:left-auto top-2.5" />
                    <input
                      type="text"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      placeholder="e.g. 1xbet.com"
                      className="w-full pl-8 rtl:pr-8 pr-2 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs font-bold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => runDiscovery(activeCompany, customDomain, selectedProviderId)}
                    disabled={isScanning}
                    className="px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs shrink-0 flex items-center gap-1 shadow-xs transition-all disabled:opacity-50"
                  >
                    <Search className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                    <span>{isAr ? 'فحص' : 'Scan'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Provider Signature Banner */}
            {detectedProvider && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{detectedProvider.name}</span>
                  </span>
                  <span className="text-slate-500">
                    {isAr ? detectedProvider.descriptionAr : detectedProvider.description}
                  </span>
                </div>

                <span className="text-sky-600 dark:text-sky-400 font-mono font-bold shrink-0">
                  {resolvedBaseUrl}
                </span>
              </div>
            )}
          </div>

          {/* Strict Financial Balance Policy Callout */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-extrabold text-xs">
                {isAr ? 'ضمان الرصيد المتاح حصراً (Strict Available Balance Enforcement):' : 'Strict Available Balance Only Guarantee:'}
              </span>
              <p className="text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-300/90">
                {isAr
                  ? 'جميع الأنماط المكتشفة مهيأة تلقائياً بسياسة allow_available_only = true لحماية أرصدة المستخدمين المجمدة وضمان تحويل الرصيد الصافي القابل للسحب فقط.'
                  : 'All auto-discovered endpoint patterns strictly inject allow_available_only = true, forbidding any withdrawal of frozen or wager-locked balances.'}
              </p>
            </div>
          </div>

          {/* Candidates Header & Bulk Actions */}
          <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="font-bold text-xs text-sky-600 hover:text-sky-700 dark:text-sky-400 flex items-center gap-1.5"
              >
                <div
                  className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                    selectedCandidateIds.size === candidates.length && candidates.length > 0
                      ? 'bg-sky-500 border-sky-500 text-white'
                      : 'border-slate-400 bg-white dark:bg-slate-800'
                  }`}
                >
                  {selectedCandidateIds.size === candidates.length && candidates.length > 0 && (
                    <Check className="w-3 h-3" />
                  )}
                </div>
                <span>
                  {isAr
                    ? `تحديد الكل (${selectedCandidateIds.size}/${candidates.length})`
                    : `Select All (${selectedCandidateIds.size}/${candidates.length})`}
                </span>
              </button>

              <span className="text-slate-400 text-xs">|</span>

              <span className="text-slate-500 text-[11px]">
                {isAr
                  ? 'انقر على فحص لاختبار استجابة النمط قبل الاعتماد'
                  : 'Click probe to verify endpoint convention response'}
              </span>
            </div>

            {/* Probe all button */}
            <button
              type="button"
              disabled={isProbingAll || isScanning}
              onClick={handleProbeAll}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Radio className={`w-3.5 h-3.5 text-emerald-500 ${isProbingAll ? 'animate-pulse' : ''}`} />
              <span>{isProbingAll ? (isAr ? 'جاري فحص الجميع...' : 'Probing All...') : (isAr ? 'فحص جميع الأنماط' : 'Probe All Candidates')}</span>
            </button>
          </div>

          {/* Candidates List */}
          {isScanning ? (
            <div className="p-12 text-center rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <RefreshCw className="w-8 h-8 text-sky-500 animate-spin mx-auto" />
              <p className="font-bold text-sm">
                {isAr ? 'جاري فحص وتحليل أنماط الـ API المعروفة...' : 'Scanning known betting platform conventions...'}
              </p>
              <p className="text-xs text-slate-500">
                {isAr ? 'مطابقة هياكل المسارات مع معايير المنصات العالمية' : 'Matching URL structure signatures'}
              </p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-950 border text-slate-400">
              {isAr ? 'لم يتم العثور على أنماط تطابق الشروط' : 'No endpoint conventions discovered'}
            </div>
          ) : (
            <div className="space-y-3">
              {candidates.map((cand) => {
                const isSelected = selectedCandidateIds.has(cand.id);
                const isProbingThis = probingId === cand.id;

                return (
                  <div
                    key={cand.id}
                    className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                      isSelected
                        ? 'bg-white dark:bg-slate-900 border-sky-400/80 dark:border-sky-500/80 shadow-xs'
                        : 'bg-slate-50/70 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 opacity-75'
                    }`}
                  >
                    {/* Top Row: Select, Name, Protocol & Action Tag */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => toggleCandidate(cand.id)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-sky-500 border-sky-500 text-white'
                              : 'border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </button>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-sm text-slate-900 dark:text-white">
                              {isAr ? cand.nameAr : cand.name}
                            </span>

                            {/* Primary tag */}
                            {cand.isPrimary && (
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-300 font-bold text-[10px]">
                                {isAr ? '⭐ رئيسي' : '⭐ Primary'}
                              </span>
                            )}

                            {/* Match Confidence Score */}
                            <span className="px-1.5 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-mono text-[10px] font-bold">
                              {cand.confidenceScore}% {isAr ? 'تطابق' : 'Match'}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {isAr ? cand.notesAr : cand.notes}
                          </p>
                        </div>
                      </div>

                      {/* Right Meta Badges */}
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        {/* Protocol pill */}
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                          {cand.methodType}
                        </span>

                        {/* HTTP Method */}
                        <span
                          className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                            cand.httpMethod === 'POST'
                              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                              : 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {cand.httpMethod}
                        </span>

                        {/* Auth scheme */}
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono">
                          {cand.authScheme}
                        </span>
                      </div>
                    </div>

                    {/* URL Bar & Actions */}
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <Terminal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-[11px] text-slate-900 dark:text-white font-bold flex-1 truncate select-all" dir="ltr">
                        {cand.endpointUrl}
                      </span>

                      {/* Copy URL */}
                      <button
                        type="button"
                        onClick={() => handleCopy(cand.endpointUrl, cand.name)}
                        className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                        title={isAr ? 'نسخ الرابط' : 'Copy Endpoint'}
                      >
                        {copiedUrl === cand.endpointUrl ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Probe Connection Test */}
                      <button
                        type="button"
                        disabled={isProbingThis}
                        onClick={() => handleProbeCandidate(cand)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                          cand.probeStatus === 'reachable'
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30'
                            : cand.probeStatus === 'unreachable'
                            ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-500/30'
                            : 'bg-white dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 shadow-2xs'
                        }`}
                      >
                        {isProbingThis ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-sky-500" />
                        ) : cand.probeStatus === 'reachable' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        ) : cand.probeStatus === 'unreachable' ? (
                          <XCircle className="w-3 h-3 text-rose-500" />
                        ) : (
                          <Radio className="w-3 h-3 text-slate-400" />
                        )}
                        <span>
                          {isProbingThis
                            ? isAr
                              ? 'فحص...'
                              : 'Probing...'
                            : cand.probeStatus === 'reachable'
                            ? `${cand.probeLatencyMs}ms ✓`
                            : cand.probeStatus === 'unreachable'
                            ? 'Error'
                            : isAr
                            ? 'فحص النمط'
                            : 'Probe'}
                        </span>
                      </button>

                      {/* Use Single Candidate in Form if callback provided */}
                      {onSelectSingleCandidate && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectSingleCandidate(cand);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-sky-500 text-slate-950 font-bold text-[11px] hover:bg-sky-400 transition-colors shrink-0 flex items-center gap-1"
                        >
                          <span>{isAr ? 'استخدام بالنموذج' : 'Use in Form'}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Probe Result Message if tested */}
                    {cand.probeMessage && (
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 px-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{cand.probeMessage}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MODAL FOOTER                                                              */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Mode: Append or Replace */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-bold">{isAr ? 'طريقة التطبيق:' : 'Apply Mode:'}</span>
              <select
                value={applyMode}
                onChange={(e) => setApplyMode(e.target.value as 'append' | 'replace')}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold"
              >
                <option value="append">
                  {isAr ? 'إضافة إلى الطرق الحالية (Append)' : 'Append to existing methods'}
                </option>
                <option value="replace">
                  {isAr ? 'استبدال الطرق الحالية (Replace)' : 'Replace all current methods'}
                </option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 font-bold text-xs transition-colors"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="button"
              disabled={selectedCandidateIds.size === 0}
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>
                {isAr
                  ? `اعتماد (${selectedCandidateIds.size}) طرق ربط مكتشفة`
                  : `Apply (${selectedCandidateIds.size}) Discovered Methods`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
