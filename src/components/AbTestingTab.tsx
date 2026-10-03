import React, { useState, useEffect } from 'react';
import {
  Split,
  Sparkles,
  Send,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Globe2,
  Smartphone,
  TrendingUp,
  Award,
  ChevronRight,
  ShieldCheck,
  Zap,
  Trash2,
  Edit3,
  BarChart3,
  ExternalLink,
  Info,
  Clock,
  Check,
} from 'lucide-react';
import {
  AbTestNotificationCampaign,
  AbNotificationVariant,
  RegionalResonanceScore,
  AbTestContrastType,
  Company,
  Language,
} from '../types';

interface AbTestingTabProps {
  companies: Company[];
  lang: Language;
  onCopyToast?: () => void;
}

export const AbTestingTab: React.FC<AbTestingTabProps> = ({
  companies = [],
  lang,
  onCopyToast,
}) => {
  const isAr = lang === 'ar';

  // Campaigns list state
  const [campaigns, setCampaigns] = useState<AbTestNotificationCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

  // Drafting / Generation Form State
  const [contrastType, setContrastType] = useState<AbTestContrastType>('linguistic_style');
  const [theme, setTheme] = useState<string>('sports_tactical');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    companies.length > 0 ? companies[0].id : 'CMP1XB001'
  );
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [campaignName, setCampaignName] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isPiloting, setIsPiloting] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Active Draft being inspected or edited
  const [currentDraft, setCurrentDraft] = useState<AbTestNotificationCampaign | null>(null);

  // Fetch campaigns on mount
  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/notifications/ab-test');
      if (res.ok) {
        const data = await res.json();
        if (data.campaigns && Array.isArray(data.campaigns)) {
          setCampaigns(data.campaigns);
          if (data.campaigns.length > 0 && !activeCampaignId) {
            setActiveCampaignId(data.campaigns[0].id);
            setCurrentDraft(data.campaigns[0]);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load A/B test campaigns:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Set active campaign draft when selection changes
  const handleSelectCampaign = (camp: AbTestNotificationCampaign) => {
    setActiveCampaignId(camp.id);
    setCurrentDraft(camp);
    setContrastType(camp.contrastType);
    setTheme(camp.theme);
  };

  // Generate new A/B contrast with AI
  const handleGenerateAbTest = async () => {
    setIsGeneratingAi(true);
    setActionSuccessMessage(null);
    try {
      const res = await fetch('/api/ai/notifications/ab-test/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contrastType,
          theme,
          targetCompanyId: selectedCompanyId,
          customPrompt: customPrompt.trim() || undefined,
          campaignName: campaignName.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.campaign) {
          const generated: AbTestNotificationCampaign = data.campaign;
          setCurrentDraft(generated);
          setActiveCampaignId(generated.id);
          // Prepend to list
          setCampaigns((prev) => [generated, ...prev.filter((c) => c.id !== generated.id)]);
          setActionSuccessMessage(
            isAr
              ? 'تمت صياغة نسختي الاختبار وتوقع الاستجابة الإقليمية بنجاح!'
              : 'A/B test variants and regional resonance generated successfully!'
          );
          setTimeout(() => setActionSuccessMessage(null), 4500);
        }
      }
    } catch (err) {
      console.error('Failed to generate A/B test variants:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Save current draft
  const handleSaveDraft = async () => {
    if (!currentDraft) return;
    try {
      const exists = campaigns.some((c) => c.id === currentDraft.id);
      const url = exists
        ? `/api/ai/notifications/ab-test/${currentDraft.id}`
        : '/api/ai/notifications/ab-test';
      const method = exists ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentDraft),
      });

      if (res.ok) {
        setActionSuccessMessage(
          isAr ? 'تم حفظ مسودة حملة الاختبار بنجاح!' : 'A/B campaign draft saved successfully!'
        );
        fetchCampaigns();
        setTimeout(() => setActionSuccessMessage(null), 3500);
      }
    } catch (err) {
      console.error('Failed to save draft:', err);
    }
  };

  // Trigger micro-pilot test
  const handleRunPilot = async () => {
    if (!currentDraft) return;
    setIsPiloting(true);
    setActionSuccessMessage(null);
    try {
      // Ensure draft is saved first
      await fetch('/api/ai/notifications/ab-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentDraft),
      });

      const res = await fetch(`/api/ai/notifications/ab-test/${currentDraft.id}/pilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleSize: 1250 }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.campaign) {
          setCurrentDraft(data.campaign);
          setCampaigns((prev) =>
            prev.map((c) => (c.id === data.campaign.id ? data.campaign : c))
          );
          setActionSuccessMessage(
            isAr
              ? `اكتمل الاختبار التجريبي! الفائز هو: النسخة ${data.campaign.winner === 'A' ? 'أ' : 'ب'}`
              : `Pilot test completed! Winner: Variant ${data.campaign.winner}`
          );
          setTimeout(() => setActionSuccessMessage(null), 5000);
        }
      }
    } catch (err) {
      console.error('Failed to run pilot:', err);
    } finally {
      setIsPiloting(false);
    }
  };

  // Broadcast chosen variant or regional split
  const handleBroadcastWinner = async (variantChoice: 'A' | 'B' | 'regional_split') => {
    if (!currentDraft) return;
    setIsBroadcasting(true);
    setActionSuccessMessage(null);
    try {
      const res = await fetch(`/api/ai/notifications/ab-test/${currentDraft.id}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedVariant: variantChoice === 'regional_split' ? (currentDraft.winner || 'A') : variantChoice,
          broadcastType: variantChoice === 'regional_split' ? 'regional_split' : 'winner_broadcast',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.campaign) {
          setCurrentDraft(data.campaign);
          setCampaigns((prev) =>
            prev.map((c) => (c.id === data.campaign.id ? data.campaign : c))
          );
        }
        setActionSuccessMessage(
          isAr
            ? 'تم بث الإشعار بنجاح لجميع مستخدمي المنصة بالتزامن مع Socket.io!'
            : 'Notification broadcasted to all users via real-time Socket.io!'
        );
        setTimeout(() => setActionSuccessMessage(null), 5000);
      }
    } catch (err) {
      console.error('Failed to broadcast:', err);
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Delete campaign
  const handleDeleteCampaign = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(isAr ? 'هل أنت متأكد من حذف هذه الحملة؟' : 'Are you sure you want to delete this campaign?')) {
      return;
    }
    try {
      const res = await fetch(`/api/ai/notifications/ab-test/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCampaigns((prev) => prev.filter((c) => c.id !== id));
        if (activeCampaignId === id) {
          const remaining = campaigns.filter((c) => c.id !== id);
          if (remaining.length > 0) {
            setActiveCampaignId(remaining[0].id);
            setCurrentDraft(remaining[0]);
          } else {
            setActiveCampaignId(null);
            setCurrentDraft(null);
          }
        }
      }
    } catch (err) {
      console.error('Failed to delete campaign:', err);
    }
  };

  // Update variant field in current draft
  const handleUpdateVariantField = (
    variantId: 'A' | 'B',
    field: keyof AbNotificationVariant,
    val: any
  ) => {
    if (!currentDraft) return;
    const targetKey = variantId === 'A' ? 'variantA' : 'variantB';
    setCurrentDraft({
      ...currentDraft,
      [targetKey]: {
        ...currentDraft[targetKey],
        [field]: val,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 text-white p-6 rounded-2xl border border-teal-800/40 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
                <Split className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-300 bg-teal-950/60 px-2.5 py-1 rounded-full border border-teal-700/50">
                {isAr ? 'مختبر A/B والتوطين الثقافي' : 'A/B Testing & Localization Lab'}
              </span>
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Globe2 className="w-3.5 h-3.5 text-indigo-400" />
                {isAr ? 'مقارنة 5 أقاليم جغرافية' : '5 Regional Cohorts Evaluated'}
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-white">
              {isAr
                ? 'اختبار صدى الإشعارات الإقليمي وصياغة النسخ المتنافسة (A/B Testing)'
                : 'Regional Notification Resonance & A/B Variant Testing'}
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              {isAr
                ? 'يتيح للوكيل الإداري صياغة نسختين متقابلتين من الإشعار لمقارنة النبرة اللغوية، صياغة الأمان، أو زر الدعوة للعمل (CTA) وفحص الاستجابة الثقافية في كل دولة قبل الإطلاق الشامل، مع خيار البث الإقليمي الموجه.'
                : 'Empowers agents to draft two competing notification variants to benchmark linguistic register, trust assurance, and CTA conversion across distinct regional cultures prior to a full-scale broadcast.'}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl px-3.5 py-2 text-center">
              <span className="text-[10px] text-slate-400 block font-semibold">
                {isAr ? 'حملات الاختبار' : 'Campaigns'}
              </span>
              <span className="text-lg font-black text-teal-300">{campaigns.length}</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl px-3.5 py-2 text-center">
              <span className="text-[10px] text-slate-400 block font-semibold">
                {isAr ? 'عينة الفحص' : 'Sample Size'}
              </span>
              <span className="text-lg font-black text-indigo-300">2,500</span>
            </div>
          </div>
        </div>
      </div>

      {/* Success alert message */}
      {actionSuccessMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Main Grid: Left side Campaign Switcher + AI Generator, Right side Side-by-Side Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Generator & Saved Campaigns (5 Cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* AI Drafting Config Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isAr ? 'توليد نسختي A/B بالذكاء الاصطناعي' : 'AI Contrast Generator'}
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                Gemini 3.8
              </span>
            </div>

            {/* Contrast Dimension */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'محور المقارنة الرئيسي (Contrast Dimension)' : 'Contrast Dimension'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: 'linguistic_style',
                    titleAr: 'أسلوب لغوي',
                    descAr: 'فصحى VIP مقابل عامية حماسية',
                    icon: Edit3,
                  },
                  {
                    id: 'call_to_action',
                    titleAr: 'زر الإجراء CTA',
                    descAr: 'استرداد 100% مقابل بونص 130%',
                    icon: Zap,
                  },
                  {
                    id: 'regional_dialect',
                    titleAr: 'لهجات متباينة',
                    descAr: 'خليجي راقي مقابل مصري رياضي',
                    icon: Globe2,
                  },
                  {
                    id: 'custom',
                    titleAr: 'توجيه مخصص',
                    descAr: 'صياغة بحسب فكرة الوكيل',
                    icon: ShieldCheck,
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setContrastType(item.id as AbTestContrastType)}
                    className={`p-2.5 rounded-xl border text-start transition-all ${
                      contrastType === item.id
                        ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <item.icon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                      <span>{item.titleAr}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                      {item.descAr}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Campaign Theme */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'موضوع الإشعار (Campaign Theme)' : 'Campaign Theme'}
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              >
                <option value="sports_tactical">⚽ مباريات القمة وتحليلات الذكاء الاصطناعي</option>
                <option value="compensation">🛡️ تأمين التعويضات وفك تجميد الرصيد 1:1</option>
                <option value="promotions">🎁 عروض البونص والترويج ومضاعفة الإيداع</option>
                <option value="security">🔒 توثيق رقم الهاتف وأمان الحسابات</option>
              </select>
            </div>

            {/* Target Partner Company */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'الشركة الشريكة المستهدفة' : 'Target Partner Company'}
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_ar || c.name} (بروموكود: {c.promo_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Agent Guidance */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>{isAr ? 'توجيه مخصص للوكيل (اختياري)' : 'Custom Agent Guidance'}</span>
                <span className="text-[10px] text-slate-400 font-normal">Optional</span>
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={2}
                placeholder={
                  isAr
                    ? 'مثال: ركز في النسخة أ على هيبة دوري الأبطال وفي النسخة ب على سرعة فك تجميد المحفظة خلال 60 ثانية...'
                    : 'e.g. Focus Variant A on Champions League prestige and Variant B on 60-second instant unfreeze...'
                }
                className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              />
            </div>

            {/* Generate Button */}
            <button
              type="button"
              onClick={handleGenerateAbTest}
              disabled={isGeneratingAi}
              className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isGeneratingAi ? 'animate-spin' : ''}`} />
              <span>
                {isGeneratingAi
                  ? (isAr ? 'جارِ التحليل اللغوي والتوليد...' : 'Generating Contrasts...')
                  : (isAr ? 'توليد نسختي A/B وتحليل الصدى الإقليمي' : 'Generate A/B Variants & Resonance')}
              </span>
            </button>
          </div>

          {/* Saved Campaigns List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {isAr ? 'سجل حملات الاختبار' : 'Campaigns Library'}
                </h3>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">
                {campaigns.length} {isAr ? 'حملة' : 'campaigns'}
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {campaigns.map((camp) => {
                const isSelected = activeCampaignId === camp.id;
                return (
                  <div
                    key={camp.id}
                    onClick={() => handleSelectCampaign(camp)}
                    className={`p-3 rounded-xl border text-start cursor-pointer transition-all ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                        {camp.name}
                      </span>
                      <button
                        onClick={(e) => handleDeleteCampaign(camp.id, e)}
                        className="p-1 rounded-md text-slate-400 hover:text-red-600 transition-colors"
                        title={isAr ? 'حذف الحملة' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          camp.status === 'completed'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : camp.status === 'pilot_sent'
                            ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {camp.status === 'completed'
                          ? (isAr ? 'مكتملة وبُثت' : 'Broadcasted')
                          : camp.status === 'pilot_sent'
                          ? (isAr ? 'فحص عينة تجريبية' : 'Pilot Sent')
                          : (isAr ? 'مسودة' : 'Draft')}
                      </span>

                      {camp.winner && (
                        <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                          <Award className="w-3 h-3" />
                          {isAr ? `الفائز: ${camp.winner}` : `Winner: ${camp.winner}`}
                        </span>
                      )}

                      <span className="text-[10px] text-slate-400 ml-auto font-mono">
                        {new Date(camp.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Active A/B Comparison Workbench (8 Cols) */}
        <div className="lg:col-span-8 space-y-5">
          {currentDraft ? (
            <>
              {/* Campaign Header Controls */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                        {currentDraft.contrastType === 'linguistic_style'
                          ? (isAr ? 'مقارنة الأسلوب اللغوي' : 'Linguistic Style Contrast')
                          : currentDraft.contrastType === 'call_to_action'
                          ? (isAr ? 'مقارنة زر الدعوة CTA' : 'Call-To-Action Contrast')
                          : currentDraft.contrastType === 'regional_dialect'
                          ? (isAr ? 'مقارنة اللهجات الإقليمية' : 'Regional Dialect Contrast')
                          : (isAr ? 'مقارنة مخصصة' : 'Custom Contrast')}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">
                        {currentDraft.agentName}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={currentDraft.name}
                      onChange={(e) =>
                        setCurrentDraft({ ...currentDraft, name: e.target.value })
                      }
                      className="text-base font-black text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-teal-500 focus:outline-hidden transition-all w-full"
                    />
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      {isAr ? 'حفظ المسودة' : 'Save Draft'}
                    </button>

                    <button
                      type="button"
                      onClick={handleRunPilot}
                      disabled={isPiloting}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                    >
                      <Play className={`w-3.5 h-3.5 ${isPiloting ? 'animate-spin' : ''}`} />
                      <span>{isPiloting ? (isAr ? 'جارِ الفحص...' : 'Testing...') : (isAr ? 'فحص عينة (Pilot 5%)' : 'Run Pilot (5%)')}</span>
                    </button>
                  </div>
                </div>

                {/* Hypothesis Callout */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {isAr ? 'فرضية الاختبار اللغوية: ' : 'Linguistic Hypothesis: '}
                    </span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {currentDraft.hypothesisAr || currentDraft.hypothesisEn}
                    </span>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Notification Cards (Variant A vs Variant B) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Variant A Card */}
                <div
                  className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 space-y-4 shadow-xs transition-all ${
                    currentDraft.winner === 'A'
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-teal-600 text-white font-black text-xs flex items-center justify-center">
                        A
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {currentDraft.variantA.name}
                      </h4>
                    </div>
                    {currentDraft.winner === 'A' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {isAr ? 'النسخة الرابحة (+CTR)' : 'Winning Variant'}
                      </span>
                    )}
                  </div>

                  {/* Simulated Mobile Push Preview */}
                  <div className="bg-slate-100 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="flex items-center gap-1 font-bold">
                        <Smartphone className="w-3 h-3 text-teal-600" />
                        VEX Deals Push Alert
                      </span>
                      <span>{isAr ? 'الآن' : 'Now'}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {currentDraft.variantA.title}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                        {currentDraft.variantA.message}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 text-white text-[11px] font-bold">
                        {currentDraft.variantA.ctaText}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                      <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                        {currentDraft.variantA.ctaAction}
                      </span>
                    </div>
                  </div>

                  {/* Linguistic Style & Tone Insights */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">{isAr ? 'الأسلوب اللغوي:' : 'Style:'}</span>
                      <span className="font-bold text-teal-700 dark:text-teal-300">
                        {currentDraft.variantA.linguisticStyle}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      {currentDraft.variantA.toneDescriptionAr}
                    </p>
                  </div>

                  {/* Micro-Pilot Conversion Metrics */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-semibold">{isAr ? 'عينة الإرسال' : 'Sent'}</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {currentDraft.variantA.sampleSent}
                      </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-semibold">{isAr ? 'النقرات' : 'Clicks'}</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {currentDraft.variantA.clicks}
                      </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-semibold">{isAr ? 'نسبة CTR' : 'CTR'}</span>
                      <span className="text-xs font-black text-teal-600 dark:text-teal-400">
                        {currentDraft.variantA.ctr}%
                      </span>
                    </div>
                  </div>

                  {/* Edit Controls Accordion / Inputs */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <input
                      type="text"
                      value={currentDraft.variantA.title}
                      onChange={(e) =>
                        handleUpdateVariantField('A', 'title', e.target.value)
                      }
                      placeholder={isAr ? 'تعديل العنوان أ...' : 'Edit Title A...'}
                      className="w-full text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                    <textarea
                      value={currentDraft.variantA.message}
                      onChange={(e) =>
                        handleUpdateVariantField('A', 'message', e.target.value)
                      }
                      rows={2}
                      placeholder={isAr ? 'تعديل نص الرسالة أ...' : 'Edit Message A...'}
                      className="w-full text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Broadcast Option Button */}
                  <button
                    type="button"
                    onClick={() => handleBroadcastWinner('A')}
                    disabled={isBroadcasting}
                    className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isAr ? 'بث النسخة أ لكافة المنصة' : 'Broadcast Variant A'}</span>
                  </button>
                </div>

                {/* Variant B Card */}
                <div
                  className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 space-y-4 shadow-xs transition-all ${
                    currentDraft.winner === 'B'
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                        B
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {currentDraft.variantB.name}
                      </h4>
                    </div>
                    {currentDraft.winner === 'B' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {isAr ? 'النسخة الرابحة (+CTR)' : 'Winning Variant'}
                      </span>
                    )}
                  </div>

                  {/* Simulated Mobile Push Preview */}
                  <div className="bg-slate-100 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="flex items-center gap-1 font-bold">
                        <Smartphone className="w-3 h-3 text-indigo-600" />
                        VEX Deals Push Alert
                      </span>
                      <span>{isAr ? 'الآن' : 'Now'}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {currentDraft.variantB.title}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                        {currentDraft.variantB.message}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold">
                        {currentDraft.variantB.ctaText}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                      <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                        {currentDraft.variantB.ctaAction}
                      </span>
                    </div>
                  </div>

                  {/* Linguistic Style & Tone Insights */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">{isAr ? 'الأسلوب اللغوي:' : 'Style:'}</span>
                      <span className="font-bold text-indigo-700 dark:text-indigo-300">
                        {currentDraft.variantB.linguisticStyle}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      {currentDraft.variantB.toneDescriptionAr}
                    </p>
                  </div>

                  {/* Micro-Pilot Conversion Metrics */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-semibold">{isAr ? 'عينة الإرسال' : 'Sent'}</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {currentDraft.variantB.sampleSent}
                      </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-semibold">{isAr ? 'النقرات' : 'Clicks'}</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {currentDraft.variantB.clicks}
                      </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-semibold">{isAr ? 'نسبة CTR' : 'CTR'}</span>
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                        {currentDraft.variantB.ctr}%
                      </span>
                    </div>
                  </div>

                  {/* Edit Controls Accordion / Inputs */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <input
                      type="text"
                      value={currentDraft.variantB.title}
                      onChange={(e) =>
                        handleUpdateVariantField('B', 'title', e.target.value)
                      }
                      placeholder={isAr ? 'تعديل العنوان ب...' : 'Edit Title B...'}
                      className="w-full text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                    <textarea
                      value={currentDraft.variantB.message}
                      onChange={(e) =>
                        handleUpdateVariantField('B', 'message', e.target.value)
                      }
                      rows={2}
                      placeholder={isAr ? 'تعديل نص الرسالة ب...' : 'Edit Message B...'}
                      className="w-full text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Broadcast Option Button */}
                  <button
                    type="button"
                    onClick={() => handleBroadcastWinner('B')}
                    disabled={isBroadcasting}
                    className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isAr ? 'بث النسخة ب لكافة المنصة' : 'Broadcast Variant B'}</span>
                  </button>
                </div>
              </div>

              {/* Regional Resonance Matrix & Cultural Analytics */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {isAr
                        ? 'مصفوفة التجاوب الثقافي والإقليمي (Regional Resonance Breakdown)'
                        : 'Regional Resonance Matrix'}
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {isAr ? 'تفضيل المستخدمين في كل إقليم' : 'Regional User Preference Breakdown'}
                  </span>
                </div>

                <div className="space-y-3">
                  {currentDraft.regionalResonance.map((cohort) => {
                    const isPrefA = cohort.preferredVariant === 'A';
                    return (
                      <div
                        key={cohort.cohortId}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{cohort.flag}</span>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {cohort.regionNameAr}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({cohort.regionNameEn})
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                isPrefA
                                  ? 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300'
                                  : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300'
                              }`}
                            >
                              {isAr
                                ? `الأعلى تفاعلاً: النسخة ${cohort.preferredVariant === 'A' ? 'أ' : 'ب'}`
                                : `Preferred: Variant ${cohort.preferredVariant}`}
                            </span>
                          </div>
                        </div>

                        {/* Dual Score Comparison Progress Bars */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500 font-semibold">{isAr ? 'النسخة أ (رسمي VIP)' : 'Variant A'}</span>
                              <span className="font-bold text-teal-700 dark:text-teal-400">
                                {cohort.scoreA}%
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div
                                className="h-full bg-teal-600 rounded-full transition-all duration-500"
                                style={{ width: `${cohort.scoreA}%` }}
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500 font-semibold">{isAr ? 'النسخة ب (حماسي مباشر)' : 'Variant B'}</span>
                              <span className="font-bold text-indigo-700 dark:text-indigo-400">
                                {cohort.scoreB}%
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                                style={{ width: `${cohort.scoreB}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Cultural / Psychological Reasoning */}
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 leading-relaxed">
                          💡 <span className="font-semibold">{cohort.reasonAr}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Smart Regional Split Broadcast Master Action */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    {isAr
                      ? 'البث الإقليمي الذكي يرسل النسخة أ لدول الخليج ورابطة CIS، ويرسل النسخة ب لمصر والمغرب العربي تلقائياً لتعظيم الـ CTR بنسبة +38%.'
                      : 'Smart split sends Variant A to GCC/CIS and Variant B to Egypt/Maghreb automatically to maximize CTR.'}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBroadcastWinner('regional_split')}
                    disabled={isBroadcasting}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all shrink-0"
                  >
                    <Globe2 className="w-4 h-4" />
                    <span>
                      {isAr
                        ? 'إطلاق البث الإقليمي الذكي المتزامن (Smart Regional Split)'
                        : 'Launch Smart Regional Split Broadcast'}
                    </span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
              <Split className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {isAr ? 'لم يتم اختيار أو توليد حملة اختبار' : 'No A/B Campaign Selected'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {isAr
                  ? 'اختر حملة من السجل على اليمين، أو اضغط زر التوليد بالذكاء الاصطناعي لإنشاء نسختين متقابلتين واختبار الصدى الإقليمي.'
                  : 'Select an existing campaign or generate new contrasting variants using the AI generator on the left.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
