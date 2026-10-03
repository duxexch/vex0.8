import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Mail,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Send,
  Eye,
  Code,
  FileText,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Building2,
  Wallet as WalletIcon,
  ShieldCheck,
  Unlock,
  History,
  Trash2,
  Save,
  ArrowRight,
  Info,
  RefreshCw,
} from 'lucide-react';
import {
  CompensationRequest,
  Company,
  Wallet,
  CompensationEmailTemplate,
  EmailDispatchLog,
  Language,
} from '../types';
import {
  COMPENSATION_PLACEHOLDERS,
  DEFAULT_COMPENSATION_EMAIL_TEMPLATES,
  buildPlaceholderContext,
  resolvePlaceholders,
} from '../data/compensationEmailTemplates';

interface CompensationEmailGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRequest?: CompensationRequest | null;
  requests: CompensationRequest[];
  companies: Company[];
  wallets: Wallet[];
  lang: Language;
  onCopyToast?: () => void;
}

export const CompensationEmailGeneratorModal: React.FC<CompensationEmailGeneratorModalProps> = ({
  isOpen,
  onClose,
  initialRequest,
  requests = [],
  companies = [],
  wallets = [],
  lang,
  onCopyToast,
}) => {
  const isAr = lang === 'ar';

  // Filter approved or all requests
  const approvedRequests = useMemo(
    () => requests.filter((r) => r.status === 'approved'),
    [requests]
  );

  // Selected request state
  const [selectedRequestId, setSelectedRequestId] = useState<string>('');

  useEffect(() => {
    if (initialRequest?.id) {
      setSelectedRequestId(initialRequest.id);
    } else if (approvedRequests.length > 0 && !selectedRequestId) {
      setSelectedRequestId(approvedRequests[0].id);
    } else if (requests.length > 0 && !selectedRequestId) {
      setSelectedRequestId(requests[0].id);
    }
  }, [initialRequest, approvedRequests, requests]);

  const activeRequest = useMemo(() => {
    return requests.find((r) => r.id === selectedRequestId) || initialRequest || requests[0] || null;
  }, [requests, selectedRequestId, initialRequest]);

  // Match company and wallet
  const matchedCompany = useMemo(() => {
    if (!activeRequest) return companies[0] || null;
    return (
      companies.find(
        (c) => c.id === activeRequest.company_id || c.name === activeRequest.company_name
      ) || companies[0] || null
    );
  }, [companies, activeRequest]);

  const matchedWallet = useMemo(() => {
    if (!activeRequest) return wallets[0] || null;
    return (
      wallets.find(
        (w) =>
          (w.company_id === activeRequest.company_id || w.company_name === activeRequest.company_name) &&
          w.user_id === activeRequest.user_id
      ) ||
      wallets.find((w) => w.company_id === activeRequest.company_id) ||
      wallets[0] ||
      null
    );
  }, [wallets, activeRequest]);

  // Recipient email
  const [recipientEmail, setRecipientEmail] = useState<string>('');

  useEffect(() => {
    if (activeRequest) {
      const cleanUser = (activeRequest.user_id || 'player')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      setRecipientEmail(`${cleanUser}@gmail.com`);
    }
  }, [activeRequest]);

  // Loaded templates
  const [templates, setTemplates] = useState<CompensationEmailTemplate[]>(DEFAULT_COMPENSATION_EMAIL_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tmpl-ar-loss-approved');

  // Custom editor state
  const [subjectInput, setSubjectInput] = useState<string>('');
  const [bodyHtmlInput, setBodyHtmlInput] = useState<string>('');
  const [bodyTextInput, setBodyTextInput] = useState<string>('');
  const [editorMode, setEditorMode] = useState<'html' | 'text'>('html');
  const [previewMode, setPreviewMode] = useState<'visual' | 'code' | 'text'>('visual');

  // Load templates from server on mount
  useEffect(() => {
    fetch('/api/admin/compensation-email-templates')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.templates) && data.templates.length > 0) {
          setTemplates(data.templates);
        }
      })
      .catch((err) => console.warn('Failed to load server templates:', err));
  }, []);

  // Sync editor when template changes
  useEffect(() => {
    const current = templates.find((t) => t.id === selectedTemplateId) || templates[0];
    if (current) {
      setSubjectInput(current.subject);
      setBodyHtmlInput(current.body_html);
      setBodyTextInput(current.body_text);
    }
  }, [selectedTemplateId, templates]);

  // Auto-switch template if request is unfreeze vs compensation
  useEffect(() => {
    if (!activeRequest) return;
    const isUnfreeze =
      activeRequest.id.startsWith('DEP-UNF-') ||
      activeRequest.bet_slip_id?.startsWith('DEPOSIT-');
    if (isUnfreeze) {
      setSelectedTemplateId('tmpl-ar-unfreeze-approved');
    } else {
      setSelectedTemplateId('tmpl-ar-loss-approved');
    }
  }, [activeRequest?.id]);

  // Build placeholder context
  const placeholderContext = useMemo(() => {
    if (!activeRequest) return {};
    return buildPlaceholderContext({
      request: activeRequest,
      company: matchedCompany || undefined,
      wallet: matchedWallet || undefined,
      allWallets: wallets,
      recipientEmail,
    });
  }, [activeRequest, matchedCompany, matchedWallet, wallets, recipientEmail]);

  // Live resolved outputs
  const resolvedSubject = useMemo(
    () => resolvePlaceholders(subjectInput, placeholderContext),
    [subjectInput, placeholderContext]
  );

  const resolvedHtml = useMemo(
    () => resolvePlaceholders(bodyHtmlInput, placeholderContext),
    [bodyHtmlInput, placeholderContext]
  );

  const resolvedText = useMemo(
    () => resolvePlaceholders(bodyTextInput, placeholderContext),
    [bodyTextInput, placeholderContext]
  );

  // Focus & cursor insertion ref
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textTextareaRef = useRef<HTMLTextAreaElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const [activeInputTarget, setActiveInputTarget] = useState<'subject' | 'body'>('body');

  const insertPlaceholder = (key: string) => {
    if (activeInputTarget === 'subject') {
      const el = subjectInputRef.current;
      if (!el) {
        setSubjectInput((prev) => prev + ' ' + key);
        return;
      }
      const start = el.selectionStart || subjectInput.length;
      const end = el.selectionEnd || subjectInput.length;
      const next = subjectInput.substring(0, start) + key + subjectInput.substring(end);
      setSubjectInput(next);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + key.length, start + key.length);
      }, 0);
    } else {
      if (editorMode === 'html') {
        const el = htmlTextareaRef.current;
        if (!el) {
          setBodyHtmlInput((prev) => prev + key);
          return;
        }
        const start = el.selectionStart || bodyHtmlInput.length;
        const end = el.selectionEnd || bodyHtmlInput.length;
        const next = bodyHtmlInput.substring(0, start) + key + bodyHtmlInput.substring(end);
        setBodyHtmlInput(next);
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(start + key.length, start + key.length);
        }, 0);
      } else {
        const el = textTextareaRef.current;
        if (!el) {
          setBodyTextInput((prev) => prev + key);
          return;
        }
        const start = el.selectionStart || bodyTextInput.length;
        const end = el.selectionEnd || bodyTextInput.length;
        const next = bodyTextInput.substring(0, start) + key + bodyTextInput.substring(end);
        setBodyTextInput(next);
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(start + key.length, start + key.length);
        }, 0);
      }
    }
  };

  // Actions states
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchFeedback, setDispatchFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTone, setAiTone] = useState<'executive_formal' | 'high_energy_friendly' | 'security_audit' | 'vip_prestige'>('executive_formal');
  const [aiCustomInstruction, setAiCustomInstruction] = useState('');
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [dispatchLogs, setDispatchLogs] = useState<EmailDispatchLog[]>([]);

  // Load dispatch history
  const loadDispatchHistory = () => {
    fetch('/api/admin/compensation-email/logs')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.logs)) {
          setDispatchLogs(data.logs);
        }
      })
      .catch((e) => console.warn('Failed to load logs:', e));
  };

  useEffect(() => {
    if (showHistoryDrawer) {
      loadDispatchHistory();
    }
  }, [showHistoryDrawer]);

  const copyToClipboard = (content: string, typeKey: string) => {
    navigator.clipboard.writeText(content);
    setCopiedType(typeKey);
    if (onCopyToast) onCopyToast();
    setTimeout(() => setCopiedType(null), 2500);
  };

  // Save customized template
  const handleSaveTemplate = async () => {
    const templateName = prompt(
      isAr ? 'أدخل اسماً للقالب الجديد:' : 'Enter a name for this custom template:',
      isAr ? `قالب مخصص - ${activeRequest?.company_name || 'VEX'}` : 'Custom Approval Template'
    );
    if (!templateName) return;

    const newTemplate: CompensationEmailTemplate = {
      id: `tmpl-custom-${Date.now()}`,
      name: templateName,
      name_ar: templateName,
      type: activeRequest?.id.startsWith('DEP-UNF-') ? 'deposit_unfreeze' : 'loss_compensation',
      subject: subjectInput,
      body_html: bodyHtmlInput,
      body_text: bodyTextInput,
      is_default: false,
      created_at: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/admin/compensation-email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate),
      });
      const data = await res.json();
      if (data.success) {
        setTemplates((prev) => [data.template, ...prev]);
        setSelectedTemplateId(data.template.id);
        setDispatchFeedback({
          type: 'success',
          message: isAr ? 'تم حفظ القالب بنجاح في مكتبة القوالب!' : 'Template saved to library successfully!',
        });
        setTimeout(() => setDispatchFeedback(null), 3000);
      }
    } catch (e: any) {
      alert(e?.message || 'Error saving template');
    }
  };

  // Dispatch / Log Email
  const handleDispatchEmail = async () => {
    if (!activeRequest || !recipientEmail) return;
    setIsDispatching(true);
    setDispatchFeedback(null);

    try {
      const res = await fetch('/api/admin/compensation-email/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: activeRequest.id,
          templateId: selectedTemplateId,
          recipientEmail,
          userId: activeRequest.user_id,
          companyName: activeRequest.company_name,
          subject: resolvedSubject,
          bodyHtml: resolvedHtml,
          bodyText: resolvedText,
          sentBy: 'VEX Financial Compliance Officer',
          createPushNotification: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDispatchFeedback({
          type: 'success',
          message: isAr
            ? `✅ تم توثيق وإرسال الإيميل الرسمي بنجاح إلى (${recipientEmail})!`
            : `✅ Email dispatched and logged for (${recipientEmail})!`,
        });
        loadDispatchHistory();
      } else {
        throw new Error(data.error || 'Failed to dispatch email');
      }
    } catch (err: any) {
      setDispatchFeedback({
        type: 'error',
        message: err?.message || (isAr ? 'حدث خطأ أثناء الإرسال' : 'Error dispatching email'),
      });
    } finally {
      setIsDispatching(false);
      setTimeout(() => setDispatchFeedback(null), 5000);
    }
  };

  // Open in default mail client (mailto:)
  const handleOpenMailClient = () => {
    if (!recipientEmail) return;
    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(
      resolvedSubject
    )}&body=${encodeURIComponent(resolvedText)}`;
    window.open(mailtoUrl, '_blank');
  };

  // AI Smart Generation / Tailoring
  const handleAiGenerate = async () => {
    if (!activeRequest) return;
    setIsAiGenerating(true);
    try {
      const res = await fetch('/api/admin/compensation-email/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request: activeRequest,
          company: matchedCompany,
          tone: aiTone,
          language: isAr ? 'ar' : 'en',
          type: activeRequest.id.startsWith('DEP-UNF-') ? 'deposit_unfreeze' : 'loss_compensation',
          customPrompt: aiCustomInstruction,
        }),
      });

      const data = await res.json();
      if (data.success && data.template) {
        setSubjectInput(data.template.subject);
        setBodyHtmlInput(data.template.body_html);
        setBodyTextInput(data.template.body_text);
        setShowAiModal(false);
        setDispatchFeedback({
          type: 'success',
          message: isAr
            ? '✨ تم توليد وصياغة القالب الذكي بنجاح بالذكاء الاصطناعي مع إدراج كافة المتغيرات!'
            : '✨ AI generated template successfully with dynamic placeholders!',
        });
        setTimeout(() => setDispatchFeedback(null), 4000);
      } else {
        throw new Error(data.error || 'Failed to generate');
      }
    } catch (err: any) {
      alert(err?.message || 'AI Generation error');
    } finally {
      setIsAiGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-hidden animate-fadeIn">
      <div className="relative w-full max-w-6xl max-h-[94vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* ========================================================= */}
        {/* MODAL HEADER                                              */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>{isAr ? 'مُوَلّد قوالب إيميلات الاعتماد الآلي' : 'Compensation Email Template Generator'}</span>
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>{isAr ? 'متغيرات الأرصدة والشركات' : 'Balance & Partner Placeholders'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr
                  ? 'توليد وصياغة إيميلات الاعتماد الرسمية للعملاء مع الدمج التلقائي لأرصدة المحفظة وبيانات الشركات الشريكة'
                  : 'Automated email notifications for approved claims with dynamic wallet balance and bookmaker placeholders'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                showHistoryDrawer
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title={isAr ? 'سجل الإرساليات السابقة' : 'Dispatch History'}
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isAr ? 'سجل الإرسال' : 'History'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isAr ? 'إغلاق النافذة' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* ACTIVE REQUEST & BALANCE STATUS STRIP                     */}
        {/* ========================================================= */}
        <div className="bg-slate-950/40 border-b border-slate-800/80 px-4 sm:px-6 py-3 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* Request Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{isAr ? 'الطلب المعتمد المختار:' : 'Selected Claim:'}</span>
            </span>

            <select
              value={selectedRequestId}
              onChange={(e) => setSelectedRequestId(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 font-mono font-bold rounded-xl px-2.5 py-1 text-xs focus:outline-none focus:border-emerald-500"
            >
              {requests.map((r) => {
                const isUnf = r.id.startsWith('DEP-UNF-') || r.bet_slip_id?.startsWith('DEPOSIT-');
                return (
                  <option key={r.id} value={r.id}>
                    {r.id} - {r.company_name} (${r.amount}) [{r.status === 'approved' ? '✅ معتمد' : r.status}] {isUnf ? '🔓 1:1' : '🛡️ تعويض'}
                  </option>
                );
              })}
            </select>

            {activeRequest && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">
                ${activeRequest.amount} {isAr ? 'معتمد' : 'Approved'}
              </span>
            )}
          </div>

          {/* User Balances Live Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400">{matchedCompany?.name || 'Partner'}:</span>
              <span className="font-bold text-slate-200 font-mono">#{activeRequest?.account_number || '-'}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-emerald-950/30 border border-emerald-800/40 px-2.5 py-1 rounded-xl">
              <WalletIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">{isAr ? 'متاح:' : 'Available:'}</span>
              <span className="font-black text-emerald-400 font-mono">
                {placeholderContext['{{currency}}'] || '$'}{placeholderContext['{{available_balance}}'] || '0'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-amber-950/30 border border-amber-800/40 px-2.5 py-1 rounded-xl">
              <Unlock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">{isAr ? 'مجمد:' : 'Frozen:'}</span>
              <span className="font-black text-amber-400 font-mono">
                {placeholderContext['{{currency}}'] || '$'}{placeholderContext['{{frozen_balance}}'] || '0'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-indigo-950/30 border border-indigo-800/40 px-2.5 py-1 rounded-xl">
              <span className="text-slate-400">{isAr ? 'الإجمالي:' : 'Total:'}</span>
              <span className="font-black text-indigo-300 font-mono">
                {placeholderContext['{{currency}}'] || '$'}{placeholderContext['{{user_balance}}'] || '0'}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* TEMPLATES TOOLBAR & PRESETS                               */}
        {/* ========================================================= */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-6 py-2.5 shrink-0 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 whitespace-nowrap hidden sm:inline">
              {isAr ? 'القوالب الجاهزة:' : 'Presets:'}
            </span>
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplateId(t.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  selectedTemplateId === t.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>{t.name_ar || t.name}</span>
                {t.type === 'deposit_unfreeze' && <Unlock className="w-3 h-3" />}
                {t.type === 'loss_compensation' && <ShieldCheck className="w-3 h-3" />}
                {t.type === 'vip_bonus' && <Sparkles className="w-3 h-3" />}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowAiModal(true)}
              className="px-3 py-1 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xs flex items-center gap-1.5 transition-transform active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAr ? 'صياغة بالذكاء الاصطناعي' : 'AI Smart Polish'}</span>
            </button>

            <button
              onClick={handleSaveTemplate}
              className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5"
              title={isAr ? 'حفظ كقالب دائم جديد' : 'Save as new template'}
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">{isAr ? 'حفظ القالب' : 'Save'}</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* INTERACTIVE PLACEHOLDER PALETTE                           */}
        {/* ========================================================= */}
        <div className="bg-slate-950/60 border-b border-slate-800/80 px-4 sm:px-6 py-2.5 shrink-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                {isAr ? 'المتغيرات الديناميكية المدعومة (انقر للإدراج في النص):' : 'Dynamic Placeholders (Click to insert):'}
              </span>
              <span className="text-[10px] text-slate-500">
                {isAr ? `(الهدف الحالي: ${activeInputTarget === 'subject' ? 'العنوان' : 'محتوى الرسالة'})` : `(Target: ${activeInputTarget})`}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400">
              <Info className="w-3 h-3" />
              <span>{isAr ? 'تُستبدل تلقائياً بقيم المحفظة الفعلية' : 'Auto-resolved from active ledger'}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {COMPENSATION_PLACEHOLDERS.map((p) => {
              const currentValue = placeholderContext[p.key] || p.example;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => insertPlaceholder(p.key)}
                  className={`group px-2 py-0.8 rounded-lg text-[11px] font-mono font-bold whitespace-nowrap transition-all border flex items-center gap-1 ${
                    p.category === 'balance'
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40 hover:bg-emerald-900/60'
                      : p.category === 'company'
                      ? 'bg-blue-950/40 text-blue-300 border-blue-800/40 hover:bg-blue-900/60'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                  title={`${p.label} (${p.description}) -> القيمة الفعلية: ${currentValue}`}
                >
                  <span>{p.key}</span>
                  <span className="text-[9px] opacity-60 font-sans font-normal hidden group-hover:inline">
                    ({currentValue})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* MAIN BODY: DUAL SPLIT PANE (EDITOR + PREVIEW)             */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ------------------------------------------------------- */}
          {/* LEFT PANE: EMAIL BUILDER & CONTROLS                     */}
          {/* ------------------------------------------------------- */}
          <div className="space-y-4 flex flex-col h-full">
            {/* Recipient Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 flex items-center justify-between">
                <span>{isAr ? 'عنوان البريد الإلكتروني للمستلم:' : 'Recipient Email Address:'}</span>
                <span className="text-[10px] text-slate-500 font-mono">user_id: {activeRequest?.user_id}</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="player@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-9 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Subject Line Input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-400">
                  {isAr ? 'عنوان الإيميل (Subject Line):' : 'Email Subject:'}
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  {subjectInput.length} chars
                </span>
              </div>
              <input
                ref={subjectInputRef}
                type="text"
                value={subjectInput}
                onFocus={() => setActiveInputTarget('subject')}
                onChange={(e) => setSubjectInput(e.target.value)}
                placeholder={isAr ? 'أدخل عنوان الإشعار...' : 'Enter subject line...'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
              />
              <div className="text-[11px] text-emerald-400 font-medium bg-emerald-950/20 px-2.5 py-1 rounded-lg border border-emerald-900/30 truncate">
                <span className="text-slate-500 text-[10px] block">{isAr ? 'المعاينة المباشرة للعنوان:' : 'Resolved Live Subject:'}</span>
                {resolvedSubject}
              </div>
            </div>

            {/* Editor Mode Tabs (HTML vs Plain Text) */}
            <div className="flex-1 flex flex-col space-y-1 min-h-[320px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditorMode('html')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      editorMode === 'html'
                        ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>{isAr ? 'محرر HTML المتجاوب' : 'HTML Template Editor'}</span>
                  </button>
                  <button
                    onClick={() => setEditorMode('text')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      editorMode === 'text'
                        ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{isAr ? 'محرر النص الصريح' : 'Plain Text Editor'}</span>
                  </button>
                </div>

                <span className="text-[10px] text-slate-500">
                  {isAr ? 'يدعم كافة المتغيرات المذكورة بالأعلى' : 'Supports all placeholders above'}
                </span>
              </div>

              {editorMode === 'html' ? (
                <textarea
                  ref={htmlTextareaRef}
                  value={bodyHtmlInput}
                  onFocus={() => setActiveInputTarget('body')}
                  onChange={(e) => setBodyHtmlInput(e.target.value)}
                  className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 leading-relaxed focus:outline-none focus:border-emerald-500 resize-none min-h-[300px]"
                  placeholder="Enter HTML template here..."
                  dir="ltr"
                />
              ) : (
                <textarea
                  ref={textTextareaRef}
                  value={bodyTextInput}
                  onFocus={() => setActiveInputTarget('body')}
                  onChange={(e) => setBodyTextInput(e.target.value)}
                  className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 leading-relaxed focus:outline-none focus:border-emerald-500 resize-none min-h-[300px]"
                  placeholder="Enter Plain text template here..."
                  dir={isAr ? 'rtl' : 'ltr'}
                />
              )}
            </div>
          </div>

          {/* ------------------------------------------------------- */}
          {/* RIGHT PANE: LIVE DUAL PREVIEW (VISUAL / CODE / TEXT)    */}
          {/* ------------------------------------------------------- */}
          <div className="space-y-4 flex flex-col h-full bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            {/* Preview Toolbar */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPreviewMode('visual')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    previewMode === 'visual'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isAr ? 'المعاينة التفاعلية' : 'Interactive Email'}</span>
                </button>

                <button
                  onClick={() => setPreviewMode('text')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    previewMode === 'text'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{isAr ? 'نص صريح' : 'Plain Text'}</span>
                </button>

                <button
                  onClick={() => setPreviewMode('code')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    previewMode === 'code'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>{isAr ? 'كود HTML' : 'Raw HTML'}</span>
                </button>
              </div>

              {/* Quick Copy Action */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => copyToClipboard(resolvedSubject, 'subject')}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1"
                  title={isAr ? 'نسخ العنوان فقط' : 'Copy Subject'}
                >
                  {copiedType === 'subject' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{isAr ? 'نسخ العنوان' : 'Subject'}</span>
                </button>

                <button
                  onClick={() => copyToClipboard(previewMode === 'text' ? resolvedText : resolvedHtml, 'body')}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1"
                  title={isAr ? 'نسخ المحتوى بالكامل' : 'Copy Content'}
                >
                  {copiedType === 'body' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{isAr ? 'نسخ المحتوى' : 'Body'}</span>
                </button>
              </div>
            </div>

            {/* Email Inbox Preview Simulated Card */}
            <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 text-xs space-y-1 shrink-0">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{isAr ? 'من:' : 'From:'} <strong>VEX Deals Compliance & VIP Desk &lt;support@vexdeals.com&gt;</strong></span>
                <span className="font-mono text-[10px]">الآن</span>
              </div>
              <div className="text-[11px] text-slate-400">
                <span>{isAr ? 'إلى:' : 'To:'} <strong>{recipientEmail || 'player@example.com'}</strong></span>
              </div>
              <div className="font-bold text-slate-100 text-xs pt-1 border-t border-slate-800 flex items-center gap-2">
                <span>{resolvedSubject}</span>
              </div>
            </div>

            {/* Preview Stage Container */}
            <div className="flex-1 overflow-y-auto bg-slate-950 rounded-xl border border-slate-800 p-2 min-h-[380px]">
              {previewMode === 'visual' && (
                <div
                  className="w-full h-full"
                  dangerouslySetInnerHTML={{ __html: resolvedHtml }}
                />
              )}

              {previewMode === 'text' && (
                <pre className="p-4 text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {resolvedText}
                </pre>
              )}

              {previewMode === 'code' && (
                <pre className="p-4 text-[11px] font-mono text-emerald-400 whitespace-pre-wrap leading-relaxed" dir="ltr">
                  {resolvedHtml}
                </pre>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* FEEDBACK BANNER                                           */}
        {/* ========================================================= */}
        {dispatchFeedback && (
          <div
            className={`px-5 py-2.5 border-t text-xs font-bold flex items-center justify-between ${
              dispatchFeedback.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
                : 'bg-rose-950/80 border-rose-800 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {dispatchFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{dispatchFeedback.message}</span>
            </div>
            <button
              onClick={() => setDispatchFeedback(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL FOOTER ACTION BAR                                   */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => copyToClipboard(resolvedHtml, 'full_html')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-bold text-slate-200 transition-all flex items-center gap-1.5"
            >
              {copiedType === 'full_html' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isAr ? 'نسخ كود HTML بالكامل' : 'Copy HTML Code'}</span>
            </button>

            <button
              onClick={() => copyToClipboard(resolvedText, 'full_text')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-bold text-slate-200 transition-all flex items-center gap-1.5"
            >
              {copiedType === 'full_text' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isAr ? 'نسخ النص الصريح' : 'Copy Plain Text'}</span>
            </button>

            <button
              onClick={handleOpenMailClient}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-bold text-blue-400 transition-all flex items-center gap-1.5"
              title={isAr ? 'فتح في تطبيق البريد الافتراضي على جهازك (Outlook / Gmail / Apple Mail)' : 'Open in Mail app'}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{isAr ? 'فتح في تطبيق الإيميل' : 'Open in Mail App'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-all"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              onClick={handleDispatchEmail}
              disabled={isDispatching || !recipientEmail}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-xs font-black text-white shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isDispatching ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{isAr ? 'توثيق وإرسال الإشعار للعميل' : 'Dispatch & Log Official Notice'}</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* AI SMART COMPOSER DIALOG                                  */}
        {/* ========================================================= */}
        {showAiModal && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-purple-800/60 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>{isAr ? 'توليد وصياغة القالب بالذكاء الاصطناعي' : 'AI Smart Email Composer'}</span>
                </div>
                <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    {isAr ? 'النبرة والأسلوب البلاغي:' : 'Tone & Voice Style:'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'executive_formal', name: isAr ? 'رسمي تنفيذي معتمد' : 'Executive Formal' },
                      { id: 'high_energy_friendly', name: isAr ? 'حماسي وودي (تحفيز)' : 'High-Energy Action' },
                      { id: 'vip_prestige', name: isAr ? 'برستيج كبار العملاء VIP' : 'VIP Prestige' },
                      { id: 'security_audit', name: isAr ? 'تدقيق وأمان مالي' : 'Security & Compliance' },
                    ].map((tone) => (
                      <button
                        key={tone.id}
                        type="button"
                        onClick={() => setAiTone(tone.id as any)}
                        className={`p-2 rounded-xl text-start font-bold border transition-all ${
                          aiTone === tone.id
                            ? 'bg-purple-950/60 text-purple-300 border-purple-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        {tone.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    {isAr ? 'توجيهات إضافية مخصصة (اختياري):' : 'Custom Guidance (Optional):'}
                  </label>
                  <textarea
                    value={aiCustomInstruction}
                    onChange={(e) => setAiCustomInstruction(e.target.value)}
                    placeholder={
                      isAr
                        ? 'مثال: ركز على بونص الإيداع الأول وضرورة استخدام كود البرومو الخاص بـ 1XBET، ووضح أن فك التجميد يتم خلال دقائق...'
                        : 'e.g. Emphasize 1:1 matching speed, mention loyalty points, and warn against sharing login details...'
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 resize-none h-20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAiModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleAiGenerate}
                  disabled={isAiGenerating}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-xs font-bold text-white shadow-md shadow-purple-600/30 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isAiGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isAr ? 'بدء التوليد والدمج' : 'Generate Template'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* DISPATCH HISTORY DRAWER                                   */}
        {/* ========================================================= */}
        {showHistoryDrawer && (
          <div className="absolute inset-y-0 right-0 w-full sm:w-96 bg-slate-900 border-l border-slate-800 shadow-2xl z-40 flex flex-col p-4 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-xs text-white">
                <History className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? 'سجل إرساليات الإيميلات الرسمية' : 'Email Dispatch History'}</span>
              </div>
              <button
                onClick={() => setShowHistoryDrawer(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5">
              {dispatchLogs.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500">
                  <Mail className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                  <p>{isAr ? 'لا توجد إرساليات موثقة بعد.' : 'No email dispatches recorded yet.'}</p>
                </div>
              ) : (
                dispatchLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>#{log.request_id}</span>
                      <span>{new Date(log.dispatched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="font-bold text-slate-200 truncate">{log.subject}</div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span className="truncate">{log.recipient_email}</span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 text-[10px]">
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
