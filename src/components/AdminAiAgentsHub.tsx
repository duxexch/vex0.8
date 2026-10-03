import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  Search,
  Clock,
  ShieldAlert,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Globe,
  ExternalLink,
  Flame,
  Brain,
  Sliders,
  History,
  Info,
  RefreshCw,
  Zap,
  Activity,
  Layers,
  ChevronRight,
  MessageSquare,
  BookmarkPlus,
  Moon,
  Sun,
  ShieldCheck,
  Calendar,
  TrendingUp,
  BarChart3,
  Users,
  Check,
  Languages,
  Paperclip,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  X,
  Crown,
  Building2,
  CheckCircle,
  Eye,
  FileCheck2,
  UploadCloud,
} from 'lucide-react';
import { ChatAttachment, ExecutedAgentAction, AdminAuditReport } from '../types';

export interface AiAgent {
  id: string;
  name: string;
  name_ar: string;
  role: 'sports_analyst' | 'smart_notifications' | 'loyalty_retention' | 'fraud_risk' | 'marketing' | 'custom';
  description: string;
  avatar: string;
  color: string;
  systemInstruction: string;
  capabilities: {
    liveSearch: boolean;
    inspectClaims: boolean;
    manageNotifications: boolean;
    systemPulse: boolean;
    retentionRules: boolean;
  };
  model: string;
  temperature: number;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SmartNotificationTimingReport {
  currentTimeIso: string;
  currentCairoHour: number;
  activityScore: number;
  windowType: 'peak_evening' | 'pre_match_golden' | 'post_match_recovery' | 'regular_day' | 'quiet_sleep';
  windowLabelAr: string;
  isQuietHours: boolean;
  antiSpamStatus: {
    dailySentCount: number;
    dailyLimit: number;
    cooldownMinutesRemaining: number;
    canSendNow: boolean;
    recommendationAr: string;
  };
  upcomingKeyFixtures: Array<{
    id: string;
    teams: string;
    league: string;
    kickoffTime: string;
    optimalNotificationTime: string;
  }>;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  attachments?: ChatAttachment[];
  groundingCitations?: Array<{ title: string; url: string }>;
  searchQueries?: string[];
  learnedPreference?: string;
  suggestedNotification?: {
    title: string;
    message: string;
    category: string;
    timingRecommendation: string;
    relevanceScore: number;
  };
  executedActions?: ExecutedAgentAction[];
  adminAuditReport?: AdminAuditReport;
}

interface AdminAiAgentsHubProps {
  lang: 'ar' | 'en';
}

export const AdminAiAgentsHub: React.FC<AdminAiAgentsHubProps> = ({ lang }) => {
  const isAr = lang === 'ar';

  // Sub-tabs
  const [hubTab, setHubTab] = useState<'console' | 'timing_studio' | 'memory' | 'search' | 'manage_agents'>('console');

  // Agents state
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('agent_master_admin');
  const [loadingAgents, setLoadingAgents] = useState(false);

  // Chat console state
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({
    agent_master_admin: [
      {
        id: 'msg_welcome_master',
        sender: 'agent',
        text: isAr
          ? 'مرحباً بك يا مدير! أنا المشرف العام والمدير التنفيذي الذكي (Master Super Admin AI). أمتلك كامل الصلاحيات لإدارة المنصة: يمكنك أن ترسل لي بيانات أي شركة (نصوص، صور، بروموكود) وسأقوم بإنشائها وحفظها فوراً، أو إرسال صور وفيديوهات لأعالجها واستخدمها، كما يمكنني فحص لوحة التحكم بالكامل وتدقيق طلبات التعويض والأمان وتنفيذ كل ما تأمرني به.'
          : 'Welcome Admin! I am your Master Super Admin AI Co-Pilot. I have full administrative powers across VEX Deals: provide me company data, bet slips, logos, images, or videos, and I will create, verify, save, and execute everything autonomously.',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      },
    ],
    agent_sports_analyst: [
      {
        id: 'msg_welcome_sports',
        sender: 'agent',
        text: isAr
          ? 'مرحباً بك يا مدير! أنا وكيلك التكتيكي الرياضي المدعوم بـ Gemini والبحث الحي عبر Google. كيف يمكنني مساعدتك في تحليل القمم الكروية اليوم، صياغة تقارير الرهان، أو فحص التشكيلات؟'
          : 'Welcome Admin! I am your Tactical Match Analyst powered by Gemini and live Google Search. How can I assist you today?',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      },
    ],
    agent_smart_timing: [
      {
        id: 'msg_welcome_timing',
        sender: 'agent',
        text: isAr
          ? 'أهلاً بك! أنا وكيل الإشعارات الذكية وحساب أوقات النشاط. مهمتي الأساسية منع الإزعاج، دراسة أوقات الذروة الكبرى (Golden Windows)، وصياغة إشعارات جاذبة للمستخدمين في التوقيت الأمثل.'
          : 'Hello Admin! I monitor user active hours and enforce anti-spam rules to deliver push notifications when users are most engaged.',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      },
    ],
  });
  const [inputPrompt, setInputPrompt] = useState('');
  const [isSendingPrompt, setIsSendingPrompt] = useState(false);
  const [useGoogleSearch, setUseGoogleSearch] = useState(true);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [liveAuditReport, setLiveAuditReport] = useState<AdminAuditReport | null>(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);


  // Timing & Insights state
  const [timingReport, setTimingReport] = useState<SmartNotificationTimingReport | null>(null);
  const [loadingTiming, setLoadingTiming] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);

  // Time-Based Heuristic Engine & User Behavior Tracking state
  const [cohortBehavior, setCohortBehavior] = useState<{
    totalTrackedUsers: number;
    hourlyActivity: Record<number, number>;
    peakEngagementHours: number[];
    optimalEngagementWindow: {
      startHour: number;
      endHour: number;
      labelAr: string;
      labelEn: string;
    };
  } | null>(null);
  const [scheduledList, setScheduledList] = useState<any[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [draftUrgency, setDraftUrgency] = useState<'urgent' | 'non-urgent'>('non-urgent');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [draftCategory, setDraftCategory] = useState('ai_prediction');
  const [heuristicPreview, setHeuristicPreview] = useState<any>(null);
  const [evaluatingHeuristic, setEvaluatingHeuristic] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  // Sports & Partner Marketing AI Content Generator state
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [generatorTheme, setGeneratorTheme] = useState<
    'sports_tactical' | 'partner_promo' | 'compensation_recovery' | 'unfreeze_balance' | 'loyalty_vip'
  >('sports_tactical');
  const [customPromptGuidance, setCustomPromptGuidance] = useState('');
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [generatorSuccessMessage, setGeneratorSuccessMessage] = useState<string | null>(null);

  // Multi-Language Audience Lists & Pre-Dispatch Campaign state
  const [audienceCohorts, setAudienceCohorts] = useState<any[]>([]);
  const [loadingCohorts, setLoadingCohorts] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState<{
    campaignId: string;
    theme: string;
    agentUsed: any;
    cohortVariants: Array<{
      cohortId: string;
      cohortNameAr: string;
      cohortNameEn: string;
      language: string;
      languageNameAr: string;
      languageNameEn: string;
      countryFlag: string;
      countryName: string;
      countryCode: string;
      estimatedUsers: number;
      title: string;
      message: string;
      category: string;
      urgency: 'urgent' | 'non-urgent';
      localTimeNow: string;
      localTimingWindow: string;
      localTimingStatus: 'optimal' | 'quiet' | 'active';
      marketingAngle: string;
      recommendedPromoCode?: string;
    }>;
  } | null>(null);
  const [cohortDrafts, setCohortDrafts] = useState<Record<string, { title: string; message: string; category?: string; urgency?: string }>>({});
  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false);
  const [isDispatchingCampaign, setIsDispatchingCampaign] = useState(false);
  const [campaignSuccessMessage, setCampaignSuccessMessage] = useState<string | null>(null);
  const [selectedCohortView, setSelectedCohortView] = useState<string>('all');

  // Memory state
  const [memoryPreferences, setMemoryPreferences] = useState<Array<{ id: string; text: string; category: string; createdAt: string }>>([]);
  const [newPreferenceText, setNewPreferenceText] = useState('');
  const [newPreferenceCategory, setNewPreferenceCategory] = useState<'preference' | 'rule' | 'operational_note'>('rule');
  const [savingMemory, setSavingMemory] = useState(false);

  // Search Explorer state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'hybrid' | 'live_web' | 'platform_history'>('hybrid');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);

  // Custom Agent Creation Modal
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentNameAr, setNewAgentNameAr] = useState('');
  const [newAgentRole, setNewAgentRole] = useState<'sports_analyst' | 'smart_notifications' | 'loyalty_retention' | 'fraud_risk' | 'marketing' | 'custom'>('custom');
  const [newAgentDesc, setNewAgentDesc] = useState('');
  const [newAgentAvatar, setNewAgentAvatar] = useState('🤖');
  const [newAgentColor, setNewAgentColor] = useState('#10b981');
  const [newAgentInstruction, setNewAgentInstruction] = useState('');
  const [newAgentLiveSearch, setNewAgentLiveSearch] = useState(true);
  const [newAgentNotifications, setNewAgentNotifications] = useState(true);

  // Fetch agents, initial timing, cohort behavior, scheduled queue, and companies on mount
  useEffect(() => {
    fetchAgents();
    fetchTimingReport();
    fetchCohortBehavior();
    fetchScheduledNotifications();
    fetchCompanies();
    fetchAudienceCohorts();
  }, []);

  // Fetch memory when selected agent changes
  useEffect(() => {
    if (selectedAgentId) {
      fetchAgentMemory(selectedAgentId);
    }
  }, [selectedAgentId]);

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, selectedAgentId, isSendingPrompt]);

  const fetchAgents = async () => {
    setLoadingAgents(true);
    try {
      const res = await fetch('/api/ai/agents');
      const data = await res.json();
      if (data.success && Array.isArray(data.agents)) {
        setAgents(data.agents);
        if (!selectedAgentId && data.agents.length > 0) {
          setSelectedAgentId(data.agents[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching AI agents:', err);
    } finally {
      setLoadingAgents(false);
    }
  };

  const fetchTimingReport = async () => {
    setLoadingTiming(true);
    try {
      const res = await fetch('/api/ai/notifications/insights');
      const data = await res.json();
      if (data.success && data.report) {
        setTimingReport(data.report);
      }
    } catch (err) {
      console.error('Error fetching notification timing:', err);
    } finally {
      setLoadingTiming(false);
    }
  };

  const fetchAgentMemory = async (agentId: string) => {
    try {
      const res = await fetch(`/api/ai/agents/${agentId}/memory`);
      const data = await res.json();
      if (data.success && data.memory?.adminPreferences) {
        setMemoryPreferences(data.memory.adminPreferences);
      }
    } catch (err) {
      console.error('Error fetching agent memory:', err);
    }
  };

  const fetchCohortBehavior = async () => {
    try {
      const res = await fetch('/api/ai/notifications/cohort-behavior');
      const data = await res.json();
      if (data.success && data.cohort) {
        setCohortBehavior(data.cohort);
      }
    } catch (err) {
      console.error('Error fetching cohort behavior:', err);
    }
  };

  const fetchScheduledNotifications = async () => {
    setLoadingScheduled(true);
    try {
      const res = await fetch('/api/ai/notifications/scheduled');
      const data = await res.json();
      if (data.success && data.scheduled) {
        setScheduledList(data.scheduled);
      }
    } catch (err) {
      console.error('Error fetching scheduled notifications:', err);
    } finally {
      setLoadingScheduled(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/companies');
      const data = await res.json();
      if (data.companies && Array.isArray(data.companies)) {
        setCompanies(data.companies);
        if (data.companies.length > 0 && !selectedCompanyId) {
          setSelectedCompanyId(data.companies[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching companies for agent generator:', err);
    }
  };

  const handleGenerateAiNotification = async (themeOverride?: any) => {
    const themeToUse = themeOverride || generatorTheme;
    setIsGeneratingContent(true);
    setGeneratorSuccessMessage(null);
    try {
      const res = await fetch('/api/ai/notifications/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgentId,
          theme: themeToUse,
          targetCompanyId: selectedCompanyId || undefined,
          customPrompt: customPromptGuidance.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDraftTitle(data.title);
        setDraftMessage(data.message);
        setDraftCategory(data.category);
        setDraftUrgency(data.urgency);
        setHeuristicPreview(data.heuristicEvaluation);
        setGeneratorSuccessMessage(
          isAr
            ? `✨ صاغ ${data.agentUsed?.name_ar || 'الوكيل'}: "${data.marketingAngle || 'محتوى تسويقي محسّن'}"`
            : `✨ Generated by ${data.agentUsed?.name_ar || 'Agent'}: "${data.marketingAngle || 'Optimized marketing angle'}"`
        );
      }
    } catch (err) {
      console.error('Error generating notification content:', err);
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const fetchAudienceCohorts = async () => {
    setLoadingCohorts(true);
    try {
      const res = await fetch('/api/ai/notifications/cohorts');
      const data = await res.json();
      if (data.success && Array.isArray(data.cohorts)) {
        setAudienceCohorts(data.cohorts);
      }
    } catch (err) {
      console.error('Error fetching audience cohorts:', err);
    } finally {
      setLoadingCohorts(false);
    }
  };

  const handleGenerateLocalizedCampaign = async () => {
    setIsGeneratingCampaign(true);
    setCampaignSuccessMessage(null);
    try {
      const res = await fetch('/api/ai/notifications/generate-localized-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgentId,
          theme: generatorTheme,
          targetCompanyId: selectedCompanyId || undefined,
          customPrompt: customPromptGuidance.trim() || undefined,
          baseTitle: draftTitle.trim() || undefined,
          baseMessage: draftMessage.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveCampaign(data);
        const drafts: Record<string, { title: string; message: string; category?: string; urgency?: string }> = {};
        data.cohortVariants.forEach((v: any) => {
          drafts[v.cohortId] = {
            title: v.title,
            message: v.message,
            category: v.category,
            urgency: v.urgency,
          };
        });
        setCohortDrafts(drafts);
        setCampaignSuccessMessage(
          isAr
            ? `✨ قام الوكيل (${data.agentUsed?.name_ar || 'مدير الحملات'}) بتجهيز وتوطين المحتوى لـ ${data.cohortVariants.length} قوائم بحسب لغة ودولة كل عميل مسبقاً!`
            : `✨ Prepared and localized copy across ${data.cohortVariants.length} audience lists by language & country!`
        );
      }
    } catch (err) {
      console.error('Error generating localized campaign:', err);
    } finally {
      setIsGeneratingCampaign(false);
    }
  };

  const handleDispatchLocalizedCampaign = async () => {
    if (!activeCampaign || Object.keys(cohortDrafts).length === 0) return;
    setIsDispatchingCampaign(true);
    try {
      const res = await fetch('/api/ai/notifications/dispatch-localized-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: activeCampaign.campaignId,
          variants: cohortDrafts,
          defaultTitle: draftTitle.trim() || undefined,
          defaultMessage: draftMessage.trim() || undefined,
          targetCompanyId: selectedCompanyId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCampaignSuccessMessage(
          isAr
            ? `🚀 تم بث الحملة بنجاح إلى جميع القوائم! سيستلم كل عميل الإشعار بلغته ودولته المحددة (عربي، فرنسي، إنجليزي، روسي).`
            : `🚀 Localized campaign dispatched! Each user will receive notifications in their native language and country.`
        );
        fetchTimingReport();
      }
    } catch (err) {
      console.error('Error dispatching localized campaign:', err);
    } finally {
      setIsDispatchingCampaign(false);
    }
  };

  const evaluateDraftHeuristic = async (titleVal: string, msgVal: string, urgVal: 'urgent' | 'non-urgent', catVal: string) => {
    if (!titleVal.trim() && !msgVal.trim()) {
      setHeuristicPreview(null);
      return;
    }
    setEvaluatingHeuristic(true);
    try {
      const res = await fetch('/api/ai/notifications/evaluate-timing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titleVal,
          message: msgVal,
          urgency: urgVal,
          category: catVal,
        }),
      });
      const data = await res.json();
      if (data.success && data.evaluation) {
        setHeuristicPreview(data.evaluation);
      }
    } catch (err) {
      console.error('Heuristic evaluation error:', err);
    } finally {
      setEvaluatingHeuristic(false);
    }
  };

  const handleScheduleDraft = async () => {
    if (!draftTitle.trim() || !draftMessage.trim()) return;
    setIsScheduling(true);
    try {
      const res = await fetch('/api/ai/notifications/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draftTitle.trim(),
          message: draftMessage.trim(),
          urgency: draftUrgency,
          category: draftCategory,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDispatchStatus(
          isAr
            ? 'تمت جدولة الإشعار ذكياً وفق نافذة التفاعل المثلى للمستخدمين بنجاح!'
            : 'Notification successfully scheduled for optimal engagement window!'
        );
        setDraftTitle('');
        setDraftMessage('');
        setHeuristicPreview(null);
        fetchScheduledNotifications();
        setTimeout(() => setDispatchStatus(null), 4000);
      }
    } catch (err: any) {
      setDispatchStatus(isAr ? `فشل الجدولة: ${err.message}` : `Scheduling failed: ${err.message}`);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleDispatchScheduledNow = async (id: string) => {
    try {
      const res = await fetch(`/api/ai/notifications/scheduled/${id}/dispatch-now`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setDispatchStatus(
          isAr
            ? 'تم بث الإشعار المجدول فوراً لجميع الأجهزة وتجاوز الجدولة!'
            : 'Scheduled alert dispatched immediately to all users!'
        );
        fetchScheduledNotifications();
        fetchTimingReport();
        setTimeout(() => setDispatchStatus(null), 4000);
      }
    } catch (err: any) {
      setDispatchStatus(isAr ? `فشل الإرسال: ${err.message}` : `Dispatch failed: ${err.message}`);
    }
  };

  const handleDeleteScheduled = async (id: string) => {
    try {
      const res = await fetch(`/api/ai/notifications/scheduled/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchScheduledNotifications();
      }
    } catch (err) {
      console.error('Delete scheduled error:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingAttachment(true);
    try {
      const newAttachments: ChatAttachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        const readPromise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        const dataUrl = await readPromise;
        const base64Data = dataUrl.split(',')[1] || '';

        let type: 'image' | 'video' | 'document' | 'audio' = 'document';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
        else if (file.type.startsWith('audio/')) type = 'audio';

        newAttachments.push({
          id: `att_${Date.now()}_${i}`,
          name: file.name,
          type,
          mimeType: file.type || 'application/octet-stream',
          dataBase64: base64Data,
          sizeBytes: file.size,
        });
      }
      setPendingAttachments((prev) => [...prev, ...newAttachments]);
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setIsUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (attId: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  const fetchLiveAudit = async () => {
    setIsLoadingAudit(true);
    try {
      const res = await fetch('/api/ai/admin/audit');
      const data = await res.json();
      if (data.success && data.auditReport) {
        setLiveAuditReport(data.auditReport);
      }
    } catch (err) {
      console.error('Error fetching admin audit:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const currentAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];
  const activeChat = chatMessages[selectedAgentId] || [];

  // Send message to selected AI agent
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputPrompt).trim();
    const attachmentsToSend = [...pendingAttachments];
    if ((!textToSend && attachmentsToSend.length === 0) || isSendingPrompt) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: textToSend || (attachmentsToSend.length > 0 ? (isAr ? '📎 إرفاق ملفات للتحليل والتنفيذ:' : '📎 Attached files for analysis:') : ''),
      attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => ({
      ...prev,
      [selectedAgentId]: [...(prev[selectedAgentId] || []), userMsg],
    }));

    if (!customText) setInputPrompt('');
    setPendingAttachments([]);
    setIsSendingPrompt(true);

    try {
      const res = await fetch(`/api/ai/agents/${selectedAgentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          attachments: attachmentsToSend,
          enableGoogleSearch: useGoogleSearch,
        }),
      });
      const data = await res.json();

      if (data.success) {
        const agentMsg: ChatMessage = {
          id: `ag_${Date.now()}`,
          sender: 'agent',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          groundingCitations: data.groundingCitations,
          searchQueries: data.searchQueries,
          learnedPreference: data.learnedPreference,
          suggestedNotification: data.suggestedNotification,
          executedActions: data.executedActions,
          adminAuditReport: data.adminAuditReport,
        };

        setChatMessages((prev) => ({
          ...prev,
          [selectedAgentId]: [...(prev[selectedAgentId] || []), agentMsg],
        }));

        if (data.adminAuditReport) {
          setLiveAuditReport(data.adminAuditReport);
        }

        if (data.executedActions && data.executedActions.length > 0) {
          fetchCompanies();
          fetchTimingReport();
          fetchScheduledNotifications();
        }

        if (data.learnedPreference) {
          fetchAgentMemory(selectedAgentId);
        }
      } else {
        const errMsg: ChatMessage = {
          id: `err_${Date.now()}`,
          sender: 'agent',
          text: isAr ? `تنبيه: ${data.error || 'تعذر استلام الرد'}` : `Error: ${data.error}`,
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        };
        setChatMessages((prev) => ({
          ...prev,
          [selectedAgentId]: [...(prev[selectedAgentId] || []), errMsg],
        }));
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'agent',
        text: isAr ? 'حدث خطأ في الاتصال بالخادم.' : 'Connection error occurred.',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => ({
        ...prev,
        [selectedAgentId]: [...(prev[selectedAgentId] || []), errMsg],
      }));
    } finally {
      setIsSendingPrompt(false);
    }
  };


  // Add preference to memory
  const handleAddMemoryPreference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPreferenceText.trim() || savingMemory) return;

    setSavingMemory(true);
    try {
      const res = await fetch(`/api/ai/agents/${selectedAgentId}/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newPreferenceText.trim(),
          category: newPreferenceCategory,
        }),
      });
      const data = await res.json();
      if (data.success && data.item) {
        setMemoryPreferences((prev) => [data.item, ...prev]);
        setNewPreferenceText('');
      }
    } catch (err) {
      console.error('Save memory error:', err);
    } finally {
      setSavingMemory(false);
    }
  };

  // Delete preference from memory
  const handleDeleteMemoryPreference = async (prefId: string) => {
    try {
      const res = await fetch(`/api/ai/agents/${selectedAgentId}/memory/${prefId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setMemoryPreferences((prev) => prev.filter((p) => p.id !== prefId));
      }
    } catch (err) {
      console.error('Delete preference error:', err);
    }
  };

  // Trigger Autonomous Smart Notification Dispatch
  const handleSmartDispatch = async (bypassAntiSpam = false, customTitle?: string, customMessage?: string) => {
    setIsDispatching(true);
    setDispatchStatus(null);
    try {
      const res = await fetch('/api/ai/notifications/smart-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bypassAntiSpam,
          customTitle,
          customMessage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDispatchStatus(data.message || (isAr ? 'تم الإرسال بنجاح!' : 'Dispatched successfully!'));
        fetchTimingReport();
      } else {
        setDispatchStatus(data.message || (isAr ? 'تم إلغاء الإرسال وفق قواعد منع الإزعاج.' : 'Cancelled due to anti-spam.'));
      }
    } catch (err: any) {
      setDispatchStatus(isAr ? 'فشل الإرسال: خطأ في السيرفر.' : 'Dispatch failed.');
    } finally {
      setIsDispatching(false);
    }
  };

  // Run Search Explorer
  const handleRunSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isSearching) return;

    setIsSearching(true);
    setSearchResult(null);
    try {
      const res = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery.trim(),
          mode: searchMode,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSearchResult(data);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Create new custom agent
  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim() || !newAgentNameAr.trim()) return;

    try {
      const res = await fetch('/api/ai/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAgentName.trim(),
          name_ar: newAgentNameAr.trim(),
          role: newAgentRole,
          description: newAgentDesc.trim(),
          avatar: newAgentAvatar,
          color: newAgentColor,
          systemInstruction: newAgentInstruction.trim(),
          capabilities: {
            liveSearch: newAgentLiveSearch,
            inspectClaims: true,
            manageNotifications: newAgentNotifications,
            systemPulse: true,
            retentionRules: true,
          },
          model: 'gemini-3.8-flash',
          temperature: 0.3,
        }),
      });
      const data = await res.json();
      if (data.success && data.agent) {
        setAgents((prev) => [...prev, data.agent]);
        setSelectedAgentId(data.agent.id);
        setIsCreatingAgent(false);
        // Reset form
        setNewAgentName('');
        setNewAgentNameAr('');
        setNewAgentDesc('');
        setNewAgentInstruction('');
      }
    } catch (err) {
      console.error('Create agent error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* TOP HEADER: Multi-Agent Hub Title & Sub-Tabs             */}
      {/* ======================================================== */}
      <div className="bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-slate-900 text-white p-5 rounded-2xl border border-purple-700/40 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/30 text-2xl shrink-0">
              🤖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight text-white">
                  {isAr ? 'مركز وكلاء الذكاء الاصطناعي والإشعارات الذكية' : 'AI Autonomous Agents & Notification Hub'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Gemini 3.8 Flash
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5" />
                  Google Search Live
                </span>
              </div>
              <p className="text-xs text-purple-200/80 mt-1 max-w-2xl leading-relaxed">
                {isAr
                  ? 'منظومة وكلاء مستقلة تفهم المدير وتتعلم من توجيهاته، تبحث في الويب والبيانات التاريخية، وتدير الإشعارات بذكاء حسب أوقات نشاط المستخدمين دون أي إزعاج.'
                  : 'Autonomous multi-agent system with long-term memory, live web search, and intelligent anti-spam notification dispatch.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsCreatingAgent(true)}
              className="px-3 py-2 rounded-xl bg-purple-600/80 hover:bg-purple-600 active:scale-95 text-white font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-md border border-purple-400/30"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'إضافة وكيل جديد' : 'Add Custom Agent'}</span>
            </button>
            <button
              onClick={fetchTimingReport}
              disabled={loadingTiming}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-purple-200 transition-all"
              title={isAr ? 'تحديث مؤشرات التوقيت' : 'Refresh timing insights'}
            >
              <RefreshCw className={`w-4 h-4 ${loadingTiming ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-purple-500/20 overflow-x-auto no-scrollbar">
          {[
            { id: 'console', label: isAr ? 'محادثة وتحكم الوكيل' : 'Agent Console', icon: MessageSquare },
            {
              id: 'timing_studio',
              label: isAr ? 'محرك الاستدلال وجدولة النوافذ المثلى' : 'Heuristics & Optimal Windows',
              icon: Clock,
              badge: scheduledList.length > 0 ? `${scheduledList.length} ${isAr ? 'مجدول' : 'queued'}` : (timingReport?.windowType === 'quiet_sleep' ? 'صمت' : 'نشط'),
            },
            { id: 'memory', label: isAr ? 'ذاكرة وتوجيهات المدير' : 'Memory & Rules', icon: Brain, badge: `${memoryPreferences.length}` },
            { id: 'search', label: isAr ? 'البحث الحديث والقديم' : 'Live & History Search', icon: Search },
            { id: 'manage_agents', label: isAr ? 'إدارة وتخصيص الوكلاء' : 'Manage Agents', icon: Sliders, badge: `${agents.length}` },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = hubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setHubTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-purple-950 shadow-md scale-[1.02]'
                    : 'bg-white/10 text-purple-200 hover:bg-white/15'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[9px] font-bold ${
                      isActive ? 'bg-purple-100 text-purple-900' : 'bg-white/20 text-white'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* AGENTS SELECTOR BAR (Available in most tabs)             */}
      {/* ======================================================== */}
      <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-black text-slate-500 dark:text-slate-400 mr-1">
            {isAr ? 'الوكيل النشط:' : 'Active Agent:'}
          </span>
          {agents.map((agent) => {
            const isSelected = selectedAgentId === agent.id;
            return (
              <button
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shrink-0 border ${
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20 scale-[1.02]'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-300'
                }`}
              >
                <span>{agent.avatar}</span>
                <span>{isAr ? agent.name_ar : agent.name}</span>
                {agent.capabilities.liveSearch && (
                  <Globe className={`w-2.5 h-2.5 ${isSelected ? 'text-purple-200' : 'text-slate-400'}`} />
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setIsCreatingAgent(true)}
          className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isAr ? 'وكيل جديد' : 'New'}</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: CONVERSATIONAL CONSOLE (Chat, Memory & Control)  */}
      {/* ======================================================== */}
      {hubTab === 'console' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Chat Stream (2 Cols) */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[580px] shadow-sm overflow-hidden">
            {/* Chat Header */}
            <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{currentAgent?.avatar || '🤖'}</span>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    {isAr ? currentAgent?.name_ar : currentAgent?.name}
                    {currentAgent?.isBuiltIn ? (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                        {isAr ? 'أساسي' : 'Built-in'}
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 font-bold">
                        {isAr ? 'مخصص' : 'Custom'}
                      </span>
                    )}
                  </h4>
                  <p className="text-[10px] text-slate-500 line-clamp-1 max-w-sm">
                    {currentAgent?.description}
                  </p>
                </div>
              </div>

              {/* Live Search Grounding Toggle */}
              {currentAgent?.capabilities?.liveSearch && (
                <label className="flex items-center gap-1.5 cursor-pointer bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:border-purple-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={useGoogleSearch}
                    onChange={(e) => setUseGoogleSearch(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500 w-3 h-3"
                  />
                  <Globe className="w-3 h-3 text-sky-500" />
                  <span>{isAr ? 'بحث Google الحي' : 'Google Search'}</span>
                </label>
              )}
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/30 dark:bg-slate-950/30">
              {activeChat.map((msg) => {
                const isAgent = msg.sender === 'agent';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-sm ${
                        isAgent
                          ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80'
                          : 'bg-purple-600 text-white'
                      }`}
                    >
                      {/* Attached media / documents in message */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mb-2.5 flex flex-wrap gap-2">
                          {msg.attachments.map((att) => (
                            <div
                              key={att.id}
                              className={`p-1.5 rounded-xl border flex items-center gap-2 max-w-xs ${
                                isAgent
                                  ? 'bg-slate-100 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700'
                                  : 'bg-purple-700/80 border-purple-500/50 text-white'
                              }`}
                            >
                              {att.type === 'image' && att.dataBase64 && (
                                <img
                                  src={att.dataBase64.startsWith('data:') ? att.dataBase64 : `data:${att.mimeType};base64,${att.dataBase64}`}
                                  alt={att.name}
                                  className="w-16 h-16 rounded-lg object-cover border border-white/20 shrink-0"
                                />
                              )}
                              {att.type === 'video' && (
                                <div className="w-12 h-12 rounded-lg bg-black/40 flex items-center justify-center shrink-0">
                                  <VideoIcon className="w-5 h-5 text-amber-300" />
                                </div>
                              )}
                              {att.type === 'document' && (
                                <div className="w-10 h-10 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
                                  <FileText className="w-5 h-5 text-sky-300" />
                                </div>
                              )}
                              <div className="overflow-hidden text-[10px]">
                                <p className="font-extrabold truncate max-w-[120px]">{att.name}</p>
                                <span className="text-[9px] opacity-75 uppercase">{att.type}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <p className="whitespace-pre-line">{msg.text}</p>

                      {/* Executed Admin Actions Cards */}
                      {msg.executedActions && msg.executedActions.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
                          <span className="text-[10px] font-black text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                            <Crown className="w-3.5 h-3.5 text-amber-500" />
                            {isAr ? 'الإجراءات التنفيذية التي أنجزها الوكيل فوراً:' : 'Direct Admin Actions Executed:'}
                          </span>
                          <div className="space-y-2">
                            {msg.executedActions.map((act, idx) => (
                              <div
                                key={idx}
                                className={`p-2.5 rounded-xl border text-[11px] ${
                                  act.success
                                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                                    : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-200'
                                }`}
                              >
                                <div className="flex items-center justify-between font-extrabold mb-1">
                                  <span className="flex items-center gap-1.5">
                                    {act.success ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                    )}
                                    {act.type === 'create_company' && (isAr ? '🏢 إنشاء وحفظ شركة جديدة' : '🏢 Company Created')}
                                    {act.type === 'update_company' && (isAr ? '✏️ تحديث بيانات شركة' : '✏️ Company Updated')}
                                    {act.type === 'delete_company' && (isAr ? '🗑️ حذف شركة' : '🗑️ Company Deleted')}
                                    {act.type === 'approve_compensation' && (isAr ? '🛡️ اعتماد صرف تعويض' : '🛡️ Compensation Approved')}
                                    {act.type === 'reject_compensation' && (isAr ? '❌ رفض طلب تعويض' : '❌ Compensation Rejected')}
                                    {act.type === 'dispatch_notification' && (isAr ? '📢 بث إشعار للمنصة' : '📢 Notification Broadcast')}
                                    {act.type === 'save_media' && (isAr ? '🖼️ حفظ وسائط في المكتبة' : '🖼️ Media Saved')}
                                    {act.type === 'audit_platform' && (isAr ? '🔍 فحص شامل للمنصة' : '🔍 Platform Audited')}
                                  </span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/60 dark:bg-black/30 font-bold">
                                    {act.success ? (isAr ? 'تم بنجاح' : 'Success') : (isAr ? 'تعذر' : 'Failed')}
                                  </span>
                                </div>
                                <p className="text-[10px] opacity-90 leading-relaxed">{act.message}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Admin Audit Report Widget in Chat */}
                      {msg.adminAuditReport && (
                        <div className="mt-3 p-3 bg-gradient-to-br from-indigo-900/90 to-purple-900/90 text-white rounded-xl space-y-2.5 shadow-md border border-indigo-500/30">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black flex items-center gap-1.5 text-amber-300">
                              <Crown className="w-3.5 h-3.5" />
                              {isAr ? 'تقرير فحص لوحة التحكم والمنصة (Executive Audit)' : 'Platform Executive Audit'}
                            </span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/30">
                              {msg.adminAuditReport.systemHealth}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
                            <div className="p-2 rounded-lg bg-white/10">
                              <span className="opacity-75 block">{isAr ? 'الشركات النشطة' : 'Active Partners'}</span>
                              <span className="text-xs font-black text-white">
                                {msg.adminAuditReport.totalActiveCompanies} / {msg.adminAuditReport.totalCompanies}
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-white/10">
                              <span className="opacity-75 block">{isAr ? 'التعويضات المعلقة' : 'Pending Claims'}</span>
                              <span className="text-xs font-black text-amber-300">
                                {msg.adminAuditReport.pendingCompensationCount}
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-white/10">
                              <span className="opacity-75 block">{isAr ? 'التعويضات المعتمدة' : 'Approved Total'}</span>
                              <span className="text-xs font-black text-emerald-300">
                                ${msg.adminAuditReport.totalApprovedCompensationAmount.toLocaleString()}
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-white/10">
                              <span className="opacity-75 block">{isAr ? 'المستخدمين النشطين' : 'Active Users'}</span>
                              <span className="text-xs font-black text-sky-300">
                                {msg.adminAuditReport.activeUsersTracked}
                              </span>
                            </div>
                          </div>

                          {msg.adminAuditReport.recommendations && msg.adminAuditReport.recommendations.length > 0 && (
                            <div className="text-[10px] space-y-1 bg-black/20 p-2 rounded-lg">
                              <span className="font-extrabold text-amber-200 block">
                                {isAr ? 'توصيات الوكيل الفورية:' : 'Key Recommendations:'}
                              </span>
                              {msg.adminAuditReport.recommendations.map((rec, rIdx) => (
                                <div key={rIdx} className="flex items-start gap-1">
                                  <span className="text-amber-400 font-bold">•</span>
                                  <span>{rec}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Learned Preference Notice */}
                      {msg.learnedPreference && (
                        <div className="mt-2.5 pt-2 border-t border-purple-200 dark:border-purple-800/60 flex items-center gap-1.5 text-[10px] text-purple-700 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-950/40 p-2 rounded-xl">
                          <Brain className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span>
                            {isAr ? 'تم حفظ التوجيه في الذاكرة الدائمة:' : 'Saved to long-term memory:'}{' '}
                            <span className="font-extrabold underline">{msg.learnedPreference}</span>
                          </span>
                        </div>
                      )}

                      {/* Grounding Web Citations */}
                      {msg.groundingCitations && msg.groundingCitations.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-1">
                          <span className="text-[10px] font-black text-slate-400 flex items-center gap-1">
                            <Globe className="w-2.5 h-2.5 text-sky-500" />
                            {isAr ? 'مصادر البحث الحي (Google Grounding):' : 'Live Sources:'}
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {msg.groundingCitations.map((cit, idx) => (
                              <a
                                key={idx}
                                href={cit.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:underline"
                              >
                                <span>{cit.title}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggested Smart Notification Card */}
                      {msg.suggestedNotification && (
                        <div className="mt-3 p-3 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold text-purple-900 dark:text-purple-200 flex items-center gap-1">
                              <Bell className="w-3 h-3 text-purple-600" />
                              {isAr ? 'مسودة إشعار ذكي مقترح:' : 'Suggested Notification:'}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                              {isAr ? 'توقيت مناسب' : 'Optimal'}
                            </span>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900">
                            <p className="font-extrabold text-[11px] text-slate-900 dark:text-white">
                              {msg.suggestedNotification.title}
                            </p>
                            <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5">
                              {msg.suggestedNotification.message}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <span className="text-[9px] text-slate-500">
                              {msg.suggestedNotification.timingRecommendation}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  if (msg.suggestedNotification) {
                                    setDraftTitle(msg.suggestedNotification.title);
                                    setDraftMessage(msg.suggestedNotification.message);
                                    setDraftCategory(msg.suggestedNotification.category || 'ai_prediction');
                                    setHubTab('timing_studio');
                                    evaluateDraftHeuristic(
                                      msg.suggestedNotification.title,
                                      msg.suggestedNotification.message,
                                      draftUrgency,
                                      msg.suggestedNotification.category || 'ai_prediction'
                                    );
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px] flex items-center gap-1 transition-all border border-indigo-200 dark:border-indigo-800"
                              >
                                <Clock className="w-2.5 h-2.5" />
                                <span>{isAr ? 'فتح في استوديو التوقيت' : 'Open in Timing Studio'}</span>
                              </button>
                              <button
                                onClick={() =>
                                  handleSmartDispatch(
                                    true,
                                    msg.suggestedNotification?.title,
                                    msg.suggestedNotification?.message
                                  )
                                }
                                disabled={isDispatching}
                                className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-[10px] flex items-center gap-1 transition-all"
                              >
                                <Send className="w-2.5 h-2.5" />
                                <span>{isAr ? 'بث الإشعار الآن' : 'Broadcast Now'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
                  </div>
                );
              })}

              {isSendingPrompt && (
                <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-3 py-2 rounded-xl w-fit animate-pulse">
                  <Bot className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    {useGoogleSearch
                      ? isAr
                        ? 'جاري فحص الويب والبيانات المرفقة وصياغة وتنفيذ الإجراءات...'
                        : 'Searching live data & executing admin actions...'
                      : isAr
                      ? 'الوكيل يحلل سياق المنصة وينفذ الأوامر...'
                      : 'Agent evaluating context & executing...'}
                  </span>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Action Prompt Chips */}
            <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                isAr ? '👑 تجول في لوحة الأدمن وافحص حالة المنصة بالكامل' : '👑 Audit whole admin dashboard',
                isAr ? '🏢 أنشئ شركة جديدة: Betwinner بروموكود vexwallet كاش باك 10%' : '🏢 Create new company Betwinner',
                isAr ? '🛡️ دقق طلبات التعويض واعتمد الطلبات المستحقة' : '🛡️ Audit and approve pending claims',
                isAr ? '⚽ صيغ إشعار لتحليل مباراة القمة القادمة' : '⚽ Craft top match alert',
                isAr ? '🎁 صيغ إشعار تسويقي لكود 1XBET (vexwallet)' : '🎁 1XBET promo alert',
                isAr ? 'هل الوقت ملائم لإرسال إشعار للمستخدمين؟' : 'Is timing safe for push?',
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-purple-300 hover:text-purple-600 shrink-0 whitespace-nowrap transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Attached Pending Files Chips Preview */}
            {pendingAttachments.length > 0 && (
              <div className="px-3 py-2 bg-purple-50/60 dark:bg-purple-950/30 border-t border-purple-200 dark:border-purple-900 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-[10px] font-black text-purple-700 dark:text-purple-300 shrink-0 flex items-center gap-1">
                  <Paperclip className="w-3 h-3" />
                  {isAr ? 'مرفقات جاهزة للإرسال للوكيل:' : 'Ready to send:'}
                </span>
                {pendingAttachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 text-[10px] text-slate-800 dark:text-slate-200 shadow-sm shrink-0"
                  >
                    {att.type === 'image' && <ImageIcon className="w-3 h-3 text-purple-600" />}
                    {att.type === 'video' && <VideoIcon className="w-3 h-3 text-amber-500" />}
                    {att.type === 'document' && <FileText className="w-3 h-3 text-sky-500" />}
                    <span className="font-bold truncate max-w-[100px]">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-rose-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
            >
              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                accept="image/*,video/*,.pdf,.txt,.json,.csv"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAttachment}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-purple-100 dark:bg-slate-800 dark:hover:bg-purple-950 text-slate-600 dark:text-slate-300 hover:text-purple-600 transition-colors flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700"
                title={isAr ? 'إرفاق صور، شعار شركة، إثبات رهان، أو فيديو' : 'Attach images, logos, or videos'}
              >
                <Paperclip className={`w-4 h-4 ${isUploadingAttachment ? 'animate-spin' : ''}`} />
              </button>

              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder={
                  selectedAgentId === 'agent_master_admin'
                    ? isAr
                      ? 'أعطني بيانات شركة، اطلب فحص لوحة التحكم، دقق التعويضات، أو أرفق ملفات وسأنفذ كل شيء فوراً...'
                      : 'Give me company data, request dashboard audit, or attach files and I will execute everything...'
                    : isAr
                    ? 'اطلب تحليلاً، ابحث عن مباراة، وجّه أمراً، أو اكتب (احفظ أن...) ليتعلم الوكيل...'
                    : 'Ask for analysis, search match, dispatch notification, or teach memory...'
                }
                className="flex-1 px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
              <button
                type="submit"
                disabled={(!inputPrompt.trim() && pendingAttachments.length === 0) || isSendingPrompt}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-purple-600/20 active:scale-95 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isAr ? 'إرسال' : 'Send'}</span>
              </button>
            </form>
          </div>


          {/* Side Intelligence Panel (1 Col) */}
          <div className="space-y-4">
            {/* Live Timing & Anti-Spam Card */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span>{isAr ? 'مؤشر التوقيت والنشاط الحي' : 'Live Timing Indicator'}</span>
                </h4>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    timingReport?.antiSpamStatus.canSendNow
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {timingReport?.antiSpamStatus.canSendNow
                    ? isAr
                      ? 'آمن للإرسال'
                      : 'Safe to Send'
                    : isAr
                    ? 'تبريد / صمت'
                    : 'Cooldown'}
                </span>
              </div>

              {/* Activity Gauge */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-slate-500">{isAr ? 'درجة نشاط المستخدمين:' : 'Activity Level:'}</span>
                  <span className="text-purple-600 font-extrabold">{timingReport?.activityScore || 50}/100</span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${timingReport?.activityScore || 50}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                  {timingReport?.windowLabelAr}
                </p>
              </div>

              {/* Anti-spam rule stats */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">
                    {isAr ? 'إشعارات اليوم' : 'Sent Today'}
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {timingReport?.antiSpamStatus.dailySentCount || 0} / {timingReport?.antiSpamStatus.dailyLimit || 3}
                  </span>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">
                    {isAr ? 'ساعات الصمت' : 'Quiet Hours'}
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {timingReport?.isQuietHours ? (isAr ? 'مفعلة 🌙' : 'Active 🌙') : (isAr ? 'غير مفعلة ☀️' : 'Inactive ☀️')}
                  </span>
                </div>
              </div>

              {/* One-Click Autonomous Dispatch */}
              <button
                onClick={() => handleSmartDispatch(false)}
                disabled={isDispatching}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white font-extrabold text-xs transition-all shadow-md shadow-purple-600/20 flex items-center justify-center gap-2"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  {isDispatching
                    ? isAr
                      ? 'جاري الفحص والإرسال...'
                      : 'Evaluating & Broadcasting...'
                    : isAr
                    ? 'توليد وبث إشعار ذكي فوري'
                    : 'Auto-Generate & Broadcast'}
                </span>
              </button>

              {dispatchStatus && (
                <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-[11px] text-purple-900 dark:text-purple-200 font-bold flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                  <span>{dispatchStatus}</span>
                </div>
              )}
            </div>

            {/* Executive Master Admin Audit Card */}
            <div className="p-4 bg-gradient-to-br from-purple-900/40 via-indigo-900/30 to-slate-900/80 rounded-2xl border border-purple-500/30 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>{isAr ? 'فحص شامل للوحة التحكم والمنصة' : 'Executive Admin Audit'}</span>
                </h4>
                <button
                  onClick={fetchLiveAudit}
                  disabled={isLoadingAudit}
                  className="p-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 transition-all text-[10px] font-bold flex items-center gap-1"
                  title={isAr ? 'تحديث الفحص' : 'Refresh audit'}
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingAudit ? 'animate-spin' : ''}`} />
                  <span>{isAr ? 'فحص الآن' : 'Audit'}</span>
                </button>
              </div>

              {liveAuditReport ? (
                <div className="space-y-2 text-[11px]">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">{isAr ? 'صحة المنصة العامة:' : 'System Health:'}</span>
                    <span className="font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {liveAuditReport.systemHealth}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-slate-400 block">{isAr ? 'الشركات الشريكة' : 'Partners'}</span>
                      <span className="font-black text-white text-xs">
                        {liveAuditReport.totalActiveCompanies} / {liveAuditReport.totalCompanies}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-slate-400 block">{isAr ? 'طلبات معلقة' : 'Pending Claims'}</span>
                      <span className="font-black text-amber-300 text-xs">
                        {liveAuditReport.pendingCompensationCount}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSendMessage(isAr ? 'قم بإجراء فحص شامل للوحة الأدمن وقدم لي تقريراً وتوصيات' : 'Perform full audit of admin dashboard')}
                    className="w-full py-2 rounded-xl bg-purple-600/60 hover:bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all border border-purple-400/30"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isAr ? 'محادثة تفصيلية حول الفحص' : 'Discuss Full Audit in Chat'}</span>
                  </button>
                </div>
              ) : (
                <div className="text-center py-2 space-y-2">
                  <p className="text-[11px] text-slate-400">
                    {isAr ? 'يقوم الوكيل بفحص الشركات، المعاملات، الأمان، والتوقيت كمدير تنفيذي.' : 'Agent audits companies, claims, security, and timing.'}
                  </p>
                  <button
                    onClick={fetchLiveAudit}
                    disabled={isLoadingAudit}
                    className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-purple-600/20"
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isLoadingAudit ? (isAr ? 'جاري الفحص والتجول...' : 'Auditing...') : (isAr ? 'تشغيل الفحص الشامل' : 'Run Master Audit')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Memory Snapshot */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-indigo-500" />
                  <span>{isAr ? 'أحدث القواعد في ذاكرة الوكيل' : 'Agent Working Memory'}</span>
                </h4>
                <button
                  onClick={() => setHubTab('memory')}
                  className="text-[10px] text-purple-600 hover:underline font-bold"
                >
                  {isAr ? 'عرض الكل' : 'View all'}
                </button>
              </div>

              {memoryPreferences.length === 0 ? (
                <p className="text-[11px] text-slate-400">
                  {isAr ? 'لا توجد قواعد مخصصة بعد. تحدث مع الوكيل وسيحفظ توجيهاتك تلقائياً.' : 'No memory rules saved yet.'}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {memoryPreferences.slice(0, 3).map((pref) => (
                    <div
                      key={pref.id}
                      className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-[11px] text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800 flex items-start gap-1.5"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{pref.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: TIMING STUDIO & TIME-BASED HEURISTIC SCHEDULER    */}
      {/* ======================================================== */}
      {hubTab === 'timing_studio' && (
        <div className="space-y-6">
          {/* Top 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Activity Window */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">{isAr ? 'النافذة الزمنية الحالية' : 'Current Window'}</span>
                {timingReport?.isQuietHours ? (
                  <Moon className="w-5 h-5 text-indigo-400" />
                ) : (
                  <Sun className="w-5 h-5 text-amber-500" />
                )}
              </div>
              <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                {timingReport?.windowLabelAr || (isAr ? 'نافذة عادية' : 'Regular Day')}
              </p>
              <p className="text-[11px] text-slate-500">
                {isAr
                  ? 'الساعة الحالية للمستخدمين: ' + (timingReport?.currentCairoHour ?? '--') + ':00 بتوقيت القاهرة'
                  : `User Time: ${timingReport?.currentCairoHour ?? '--'}:00 Cairo/Riyadh`}
              </p>
            </div>

            {/* Card 2: Cohort Optimal Engagement Window */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">{isAr ? 'نافذة التفاعل المثلى' : 'Optimal Window'}</span>
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                {cohortBehavior?.optimalEngagementWindow?.labelAr || (isAr ? 'المساء (19:00 - 22:00)' : 'Evening (19:00 - 22:00)')}
              </p>
              <p className="text-[11px] text-slate-500">
                {isAr ? 'ساعات الذروة: ' : 'Peak Hours: '}
                {(cohortBehavior?.peakEngagementHours || [19, 20, 21]).map((h) => `${h}:00`).join(', ')}
              </p>
            </div>

            {/* Card 3: Anti-Spam Frequency Capping */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">{isAr ? 'معدل الحماية ضد الإزعاج' : 'Anti-Spam Frequency'}</span>
                <ShieldCheck className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                {timingReport?.antiSpamStatus.dailySentCount || 0} / {timingReport?.antiSpamStatus.dailyLimit || 3}{' '}
                {isAr ? 'إشعارات اليوم' : 'Sent Today'}
              </p>
              <p className="text-[11px] text-slate-500">
                {timingReport?.antiSpamStatus.cooldownMinutesRemaining
                  ? isAr
                    ? `متبقي ${timingReport.antiSpamStatus.cooldownMinutesRemaining} د للتبريد`
                    : `${timingReport.antiSpamStatus.cooldownMinutesRemaining}m cooldown`
                  : isAr
                  ? 'جاهز للإرسال'
                  : 'Cooldown ready'}
              </p>
            </div>

            {/* Card 4: Scheduled Queue Count */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">{isAr ? 'طابور الجدولة الذكية' : 'Scheduled Queue'}</span>
                <Calendar className="w-5 h-5 text-indigo-500" />
              </div>
              <p className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                {scheduledList.filter((s) => s.status === 'pending').length}{' '}
                {isAr ? 'إشعارات بانتظار نافذتها' : 'Pending Alerts'}
              </p>
              <p className="text-[11px] text-slate-500">
                {isAr
                  ? `${cohortBehavior?.totalTrackedUsers || 1} مستخدم مسجل سلوكه`
                  : `${cohortBehavior?.totalTrackedUsers || 1} tracked user profiles`}
              </p>
            </div>
          </div>

          {/* ================================================================ */}
          {/* SECTION 1: 24-HOUR USER BEHAVIOR TRACKING DISTRIBUTION CHART    */}
          {/* ================================================================ */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>
                    {isAr
                      ? 'مخطط التفاعل التراكمي على مدار 24 ساعة (User Behavior Tracking)'
                      : '24-Hour User Activity Distribution & Optimal Peak Hours'}
                  </span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isAr
                    ? 'يسجل النظام تلقائياً أوقات فتح واستخدام التطبيق لتحديد نافذة الذروة والامتناع عن إرسال الإشعارات في الساعات الهادئة'
                    : 'Automatically tracks app interactions to compute optimal delivery windows and prevent spam during quiet hours'}
                </p>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center gap-3 text-[10px] font-bold">
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 dark:bg-slate-700 inline-block" />
                  {isAr ? 'ساعات صامتة (نوم)' : 'Quiet Hours'}
                </span>
                <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                  <span className="w-2.5 h-2.5 rounded-xs bg-purple-400 inline-block" />
                  {isAr ? 'نشاط نهاري' : 'Regular'}
                </span>
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                  {isAr ? 'نافذة الذروة المثلى' : 'Optimal Peak'}
                </span>
              </div>
            </div>

            {/* 24-Hour Bar Distribution */}
            <div className="pt-2">
              <div className="grid grid-cols-12 sm:grid-cols-24 gap-1 items-end h-32 px-1 border-b border-slate-200 dark:border-slate-800 pb-2">
                {Array.from({ length: 24 }).map((_, h) => {
                  const activityMap = cohortBehavior?.hourlyActivity || { 18: 45, 19: 80, 20: 120, 21: 110, 22: 60 };
                  const count = activityMap[h] || 0;
                  const counts = Object.values(activityMap).map((v) => Number(v) || 0);
                  const maxVal = Math.max(...counts, 100);
                  const heightPercent = Math.max(8, Math.round((count / maxVal) * 100));

                  const isPeak = (cohortBehavior?.peakEngagementHours || [19, 20, 21]).includes(h);
                  const isQuiet = h >= 1 && h < 9;
                  const isCurrentHour = timingReport?.currentCairoHour === h;

                  let barBg = 'bg-slate-200 dark:bg-slate-800';
                  if (isPeak) {
                    barBg = 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-xs shadow-emerald-500/30';
                  } else if (isQuiet) {
                    barBg = 'bg-slate-300 dark:bg-slate-700/60';
                  } else if (count > 0) {
                    barBg = 'bg-purple-500/80 hover:bg-purple-500';
                  }

                  return (
                    <div
                      key={h}
                      className="group relative flex flex-col items-center justify-end h-full"
                      title={`${h}:00 - ${count} ${isAr ? 'تفاعل' : 'interactions'}`}
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-8 bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                        {h}:00 ({count})
                      </div>

                      {/* Bar */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-sm transition-all duration-300 ${barBg} ${
                          isCurrentHour ? 'ring-2 ring-amber-400 ring-offset-1 dark:ring-offset-slate-900' : ''
                        }`}
                      />

                      {/* Hour Label */}
                      <span
                        className={`text-[9px] mt-1 font-mono ${
                          isCurrentHour
                            ? 'font-black text-amber-500'
                            : isPeak
                            ? 'font-black text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {h % 3 === 0 ? `${h}` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
                <span>00:00 {isAr ? 'منتصف الليل' : 'Midnight'}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  {isAr ? 'نافذة الذروة القصوى: 19:00 - 22:00' : 'Peak Window: 19:00 - 22:00'}
                </span>
                <span>23:00 {isAr ? 'المساء' : 'Night'}</span>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* SECTION 2: HEURISTIC NOTIFICATION COMPOSER & SCHEDULER           */}
          {/* ================================================================ */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>
                    {isAr
                      ? 'محرر الإشعارات بمحرك الاستدلال الذكي (Time-Based Heuristic Composer)'
                      : 'Time-Based Heuristic Notification Composer'}
                  </span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isAr
                    ? 'حدد درجة الإلحاح وسيقوم الذكاء الاصطناعي بحساب أفضل وقت للإرسال دون إزعاج'
                    : 'Set urgency level and let the AI compute optimal window delivery automatically'}
                </p>
              </div>

              {/* Urgency Switch */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setDraftUrgency('non-urgent');
                    evaluateDraftHeuristic(draftTitle, draftMessage, 'non-urgent', draftCategory);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                    draftUrgency === 'non-urgent'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{isAr ? '🕒 غير عاجل (جدولة ذكية في النافذة المثلى)' : 'Non-Urgent (Optimal Window)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftUrgency('urgent');
                    evaluateDraftHeuristic(draftTitle, draftMessage, 'urgent', draftCategory);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                    draftUrgency === 'urgent'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isAr ? '⚡ عاجل (إرسال فوري الآن)' : 'Urgent (Send Now)'}</span>
                </button>
              </div>
            </div>

            {/* AI Notification Content Generator (Sports & Marketing) */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-slate-50 dark:from-purple-950/40 dark:via-indigo-950/20 dark:to-slate-900 border border-purple-200/80 dark:border-purple-800/60 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{isAr ? 'مولد المحتوى الذكي للرياضات والتسويق' : 'Sports & Marketing AI Generator'}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                        {isAr ? 'مُدرَّك لشركات VEX' : 'VEX Partners Aware'}
                      </span>
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isAr
                        ? 'اختر الزاوية التسويقية وسيقوم الوكيل بصياغة إشعار احترافي يراعي البروموكود والرياضة التكتيكية'
                        : 'Choose theme & the agent will draft high-conversion copy incorporating partner codes & tactical odds'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleGenerateAiNotification()}
                  disabled={isGeneratingContent}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50"
                >
                  {isGeneratingContent ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isGeneratingContent
                      ? isAr
                        ? 'جارِ الصياغة الذكية...'
                        : 'Composing with AI...'
                      : isAr
                      ? '✨ صياغة إشعار ذكي بواسطة الوكيل'
                      : '✨ Generate AI Push Content'}
                  </span>
                </button>
              </div>

              {/* Theme Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  {
                    id: 'sports_tactical',
                    label: isAr ? '⚽ تحليل رياضي للقمة' : '⚽ Sports Match Tactical',
                  },
                  {
                    id: 'partner_promo',
                    label: isAr ? '🎁 تسويق شركة وبروموكود' : '🎁 Partner Bookmaker Promo',
                  },
                  {
                    id: 'compensation_recovery',
                    label: isAr ? '🛡️ تعويض الخسائر 100%' : '🛡️ 100% Loss Compensation',
                  },
                  {
                    id: 'unfreeze_balance',
                    label: isAr ? '💎 فك تجميد الرصيد 1:1' : '💎 1:1 Deposit Unfreeze',
                  },
                  {
                    id: 'loyalty_vip',
                    label: isAr ? '👑 عروض ومكافآت VIP' : '👑 VIP Multipliers',
                  },
                ].map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setGeneratorTheme(th.id as any)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      generatorTheme === th.id
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-300'
                    }`}
                  >
                    {th.label}
                  </button>
                ))}
              </div>

              {/* Conditional Partner Bookmaker Selector */}
              {generatorTheme === 'partner_promo' && (
                <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-purple-100 dark:border-purple-900 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
                      <span>{isAr ? 'اختر شركة المراهنات الشريكة والبروموكود المستهدف:' : 'Select Partner Bookmaker & Code:'}</span>
                    </label>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                      {isAr ? 'البروموكود يُدمج تلقائياً في نص الإشعار' : 'Code auto-embedded in copy'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: '1xbet', name: '1XBET', code: 'vexwallet', bonus: '130% بونص' },
                      { id: 'melbet', name: 'MELBET', code: 'ml_3154096', bonus: '100% ترحيبي' },
                      { id: 'betjam', name: 'BETJAM', code: 'VEDO2002', bonus: 'كاش باك ملكي' },
                      { id: 'mostbet', name: 'MOSTBET', code: 'vedo2002', bonus: '125% بونص' },
                      { id: 'xpari', name: 'XPARI', code: 'vedo2002', bonus: 'كاش باك فوري' },
                      { id: 'bizbet', name: 'BIZBET', code: 'bi_9258', bonus: 'سحوبات أسبوعية' },
                    ].map((comp) => {
                      const isSelected = selectedCompanyId === comp.id || selectedCompanyId.toLowerCase().includes(comp.id);
                      return (
                        <button
                          key={comp.id}
                          type="button"
                          onClick={() => setSelectedCompanyId(comp.id)}
                          className={`p-2 rounded-xl text-start border transition-all ${
                            isSelected
                              ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-xs text-slate-900 dark:text-white">{comp.name}</span>
                            {isSelected && <Check className="w-3 h-3 text-purple-600" />}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-mono">
                            <span className="text-purple-600 dark:text-purple-400 font-bold">{comp.code}</span>
                            <span>{comp.bonus}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Optional Custom Guidance */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={customPromptGuidance}
                  onChange={(e) => setCustomPromptGuidance(e.target.value)}
                  placeholder={
                    isAr
                      ? 'توجيه إضافي اختياري للوكيل (مثال: ركز على بونص الإيداع الأول، أو كلاسيكو السبت، أو بدون مخاطرة)...'
                      : 'Optional guidance (e.g., focus on El Clasico or 1st deposit bonus)...'
                  }
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Feedback Alert */}
              {generatorSuccessMessage && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between gap-2">
                  <span>{generatorSuccessMessage}</span>
                  <button
                    type="button"
                    onClick={() => setGeneratorSuccessMessage(null)}
                    className="text-emerald-600 hover:text-emerald-900 text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'عنوان الإشعار' : 'Notification Title'}
                </label>
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => {
                    setDraftTitle(e.target.value);
                    evaluateDraftHeuristic(e.target.value, draftMessage, draftUrgency, draftCategory);
                  }}
                  placeholder={
                    isAr
                      ? 'مثال: 🔥 قمة الدوري الإنجليزي: تحليل خاص ونسب تعويض مضاعفة!'
                      : 'e.g. 🔥 Premier League Derby: Tactical prediction ready!'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'نص الرسالة' : 'Notification Message'}
                </label>
                <textarea
                  rows={2}
                  value={draftMessage}
                  onChange={(e) => {
                    setDraftMessage(e.target.value);
                    evaluateDraftHeuristic(draftTitle, e.target.value, draftUrgency, draftCategory);
                  }}
                  placeholder={
                    isAr
                      ? 'اكتب نص الإشعار هنا أو اطلب من الوكيل صياغته من نافذة المحادثة...'
                      : 'Enter notification body or ask agent to compose one...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 leading-relaxed"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Category tags */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <span className="text-[11px] font-bold text-slate-400 mr-1">{isAr ? 'التصنيف:' : 'Category:'}</span>
                  {[
                    { id: 'ai_prediction', label: isAr ? 'توقع ذكي' : 'Prediction' },
                    { id: 'sports_news', label: isAr ? 'أخبار كروية' : 'News' },
                    { id: 'compensation', label: isAr ? 'تعويضات وبونص' : 'Loyalty' },
                    { id: 'security', label: isAr ? 'أمني ونظام' : 'Security' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setDraftCategory(cat.id);
                        evaluateDraftHeuristic(draftTitle, draftMessage, draftUrgency, cat.id);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                        draftCategory === cat.id
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Submit button */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleScheduleDraft}
                    disabled={isScheduling || !draftTitle.trim() || !draftMessage.trim()}
                    className={`px-4 py-2 rounded-xl text-white font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-md disabled:opacity-40 ${
                      draftUrgency === 'non-urgent'
                        ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                        : 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20'
                    }`}
                  >
                    {draftUrgency === 'non-urgent' ? <Clock className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                    <span>
                      {isScheduling
                        ? isAr
                          ? 'جارِ المعالجة...'
                          : 'Processing...'
                        : draftUrgency === 'non-urgent'
                        ? isAr
                          ? 'جدولة الإشعار في نافذة التفاعل المثلى'
                          : 'Schedule for Optimal Window'
                        : isAr
                        ? 'بث فوري لجميع الأجهزة الآن'
                        : 'Force Immediate Broadcast'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live Heuristic Engine Evaluation Box */}
            {(heuristicPreview || evaluatingHeuristic) && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    {isAr ? 'تقييم محرك الاستدلال الذكي الحي (Live Heuristic Evaluation)' : 'Live AI Timing Heuristic'}
                  </span>
                  {heuristicPreview && (
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                        heuristicPreview.canDispatchImmediately
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {heuristicPreview.canDispatchImmediately
                        ? isAr
                          ? 'جاهز للإرسال فوراً'
                          : 'Can Dispatch Immediately'
                        : isAr
                        ? `موصى بالجدولة عند ${heuristicPreview.targetOptimalWindow}`
                        : `Scheduled for ${heuristicPreview.targetOptimalWindow}`}
                    </span>
                  )}
                </div>
                {heuristicPreview?.heuristicReason && (
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {heuristicPreview.heuristicReason}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ================================================================ */}
          {/* SECTION 2.5: MULTI-LANGUAGE PRE-DISPATCH AUDIENCE LISTS STUDIO   */}
          {/* ================================================================ */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-purple-200/90 dark:border-purple-900/60 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    <Globe className="w-4 h-4" />
                  </div>
                  <span>
                    {isAr
                      ? 'استوديو تجهيز الإشعارات حسب لغة ودولة كل عميل (Multi-Language Audience Lists)'
                      : 'Multi-Language Audience Lists & Pre-Dispatch Studio'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                    {audienceCohorts.length > 0 ? `${audienceCohorts.length} ${isAr ? 'قوائم مجهزة' : 'Cohorts Ready'}` : isAr ? '5 قوائم ذكية' : '5 Cohorts'}
                  </span>
                </h4>
                <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                  {isAr
                    ? 'يقوم الوكيل بتصنيف العملاء في قوائم بحسب لغة ودولة كل عميل، وتجهيز الإشعار بكل اللغات مع ضبط المحتوى والتوقيت والبروموكود مسبقاً قبل أي إرسال.'
                    : 'The agent organizes clients into localized audience lists, preparing customized notification variants for every language & country before sending.'}
                </p>
              </div>

              {/* Primary Pre-Flight Generator Action Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateLocalizedCampaign}
                  disabled={isGeneratingCampaign}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs transition-all flex items-center gap-2 shadow-md shadow-purple-600/25 disabled:opacity-50 cursor-pointer"
                >
                  {isGeneratingCampaign ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Languages className="w-4 h-4" />
                  )}
                  <span>
                    {isGeneratingCampaign
                      ? isAr
                        ? 'جارِ تجهيز وتوطين كافة اللغات والقوائم...'
                        : 'Localizing all cohort lists...'
                      : isAr
                      ? '✨ تجهيز وتوطين الإشعار لكافة القوائم واللغات مسبقاً'
                      : '✨ Prepare Localized Lists with AI'}
                  </span>
                </button>
              </div>
            </div>

            {/* Campaign Success Feedback */}
            {campaignSuccessMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{campaignSuccessMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCampaignSuccessMessage(null)}
                  className="text-emerald-600 hover:text-emerald-900 text-xs"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Audience Cohorts Selector Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-600" />
                  <span>{isAr ? 'قوائم العملاء المصنفة حسب اللغة والدولة:' : 'Audience Lists by Country & Language:'}</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {isAr ? 'إجمالي العملاء المستهدفين: ~3,645 مستخدم' : 'Total Targeted Users: ~3,645 users'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCohortView('all')}
                  className={`p-2.5 rounded-xl border text-start transition-all ${
                    selectedCohortView === 'all'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black">🌐 {isAr ? 'جميع القوائم' : 'All Lists'}</span>
                    <span className="text-[10px] opacity-80">5</span>
                  </div>
                  <p className="text-[10px] mt-1 opacity-80 truncate">
                    {isAr ? 'عرض متكامل لكل اللغات' : 'Complete View'}
                  </p>
                </button>

                {(audienceCohorts.length > 0 ? audienceCohorts : [
                  { id: 'cohort_ar_eg', name_ar: 'مصر وبلاد الشام', country_flag: '🇪🇬', language: 'ar', estimated_users: 1420 },
                  { id: 'cohort_ar_gulf', name_ar: 'الخليج العربي VIP', country_flag: '🇸🇦', language: 'ar', estimated_users: 890 },
                  { id: 'cohort_fr_maghreb', name_ar: 'شمال أفريقيا والمغرب', country_flag: '🇲🇦', language: 'fr', estimated_users: 645 },
                  { id: 'cohort_en_global', name_ar: 'المستخدمون الدوليون', country_flag: '🌍', language: 'en', estimated_users: 410 },
                  { id: 'cohort_ru_cis', name_ar: 'دول شرق أوروبا', country_flag: '🇷🇺', language: 'ru', estimated_users: 280 },
                ]).map((cohort) => {
                  const isSelected = selectedCohortView === cohort.id;
                  return (
                    <button
                      key={cohort.id}
                      type="button"
                      onClick={() => setSelectedCohortView(cohort.id)}
                      className={`p-2.5 rounded-xl border text-start transition-all ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold flex items-center gap-1 truncate">
                          <span>{cohort.country_flag}</span>
                          <span className="truncate">{cohort.name_ar || cohort.name}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] mt-1 opacity-80 font-mono">
                        <span className="uppercase font-bold">{cohort.language}</span>
                        <span>{cohort.estimated_users} {isAr ? 'عميل' : 'users'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PRE-DISPATCH CARDS LIST */}
            {activeCampaign ? (
              <div className="space-y-4 pt-2">
                {/* Global Master Dispatch Bar */}
                <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-sm">
                      ✓
                    </div>
                    <div>
                      <h5 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{isAr ? 'الحملة مجهزة ومطابقة لقوائم العملاء بالكامل' : 'Campaign Prepared & Ready'}</span>
                        <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400">
                          ({activeCampaign.campaignId})
                        </span>
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        {isAr
                          ? `صاغ المحتوى: ${activeCampaign.agentUsed?.name_ar || 'الوكيل'} مع تخصيص اللهجة واللغة والتوقيت لكل قائمة.`
                          : `Localized by ${activeCampaign.agentUsed?.name_ar || 'Agent'} with country-specific phrasing and timezone scheduling.`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDispatchLocalizedCampaign}
                      disabled={isDispatchingCampaign}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/25 disabled:opacity-50 cursor-pointer"
                    >
                      {isDispatchingCampaign ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isDispatchingCampaign
                          ? isAr
                            ? 'جارِ بث الحملة الموطنة...'
                            : 'Dispatching to cohorts...'
                          : isAr
                          ? '🚀 بث الحملة الموطنة لجميع العملاء (كل عميل بلغته ودولته)'
                          : '🚀 Dispatch Localized to All Cohorts'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Individual Cohort Pre-Dispatch Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {activeCampaign.cohortVariants
                    .filter((v) => selectedCohortView === 'all' || selectedCohortView === v.cohortId)
                    .map((variant) => {
                      const draft = cohortDrafts[variant.cohortId] || { title: variant.title, message: variant.message };
                      return (
                        <div
                          key={variant.cohortId}
                          className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3 relative overflow-hidden transition-all hover:border-purple-300 dark:hover:border-purple-700"
                        >
                          {/* Card Header */}
                          <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{variant.countryFlag}</span>
                              <div>
                                <h6 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{variant.cohortNameAr}</span>
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 uppercase">
                                    {variant.language}
                                  </span>
                                </h6>
                                <span className="text-[10px] text-slate-400">
                                  {variant.languageNameAr} • {variant.estimatedUsers} {isAr ? 'عميل نشط' : 'users'}
                                </span>
                              </div>
                            </div>

                            {/* Local Time and Window Status */}
                            <div className="text-end">
                              <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
                                <Clock className="w-3 h-3 text-purple-500" />
                                <span>{variant.localTimeNow}</span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-black inline-block mt-0.5 ${
                                  variant.localTimingStatus === 'optimal'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : variant.localTimingStatus === 'quiet'
                                    ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                              >
                                {variant.localTimingWindow}
                              </span>
                            </div>
                          </div>

                          {/* Marketing Angle Explainer */}
                          <div className="text-[11px] text-purple-800 dark:text-purple-300 bg-purple-50/70 dark:bg-purple-950/30 px-2.5 py-1.5 rounded-xl font-medium flex items-center justify-between gap-1">
                            <span>💡 {variant.marketingAngle}</span>
                            {variant.recommendedPromoCode && (
                              <span className="px-1.5 py-0.5 rounded bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-200 font-mono text-[9px] font-black shrink-0">
                                {variant.recommendedPromoCode}
                              </span>
                            )}
                          </div>

                          {/* Editable Title */}
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 mb-1">
                              {isAr ? `عنوان الإشعار بالـ (${variant.languageNameAr}):` : `Title in (${variant.languageNameEn}):`}
                            </label>
                            <input
                              type="text"
                              value={draft.title}
                              onChange={(e) => {
                                setCohortDrafts({
                                  ...cohortDrafts,
                                  [variant.cohortId]: { ...draft, title: e.target.value },
                                });
                              }}
                              className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-purple-500"
                            />
                          </div>

                          {/* Editable Message */}
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 mb-1">
                              {isAr ? `نص الإشعار بالـ (${variant.languageNameAr}):` : `Body in (${variant.languageNameEn}):`}
                            </label>
                            <textarea
                              rows={2}
                              value={draft.message}
                              onChange={(e) => {
                                setCohortDrafts({
                                  ...cohortDrafts,
                                  [variant.cohortId]: { ...draft, message: e.target.value },
                                });
                              }}
                              className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white leading-relaxed focus:outline-none focus:border-purple-500"
                            />
                          </div>

                          {/* Client Preview Pill */}
                          <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400">
                            <span className="flex items-center gap-1 font-mono">
                              <Check className="w-3 h-3 text-emerald-500" />
                              {isAr ? 'مجهز ومتطابق مع هاتف العميل ولغته' : 'Matches device locale & country'}
                            </span>
                            <span className="font-bold text-slate-500">
                              {draft.message.length} {isAr ? 'حرف' : 'chars'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              /* Empty state / Call to prepare */
              <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/5 to-indigo-500/5 dark:from-purple-950/20 dark:to-indigo-950/10 border border-dashed border-purple-200 dark:border-purple-900/60 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto text-xl shadow-xs">
                  <Languages className="w-6 h-6" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h5 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                    {isAr
                      ? 'قوائم العملاء جاهزة بانتظار تجهيز المحتوى وتوطينه'
                      : 'Audience lists are mapped and waiting for AI pre-flight localization'}
                  </h5>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {isAr
                      ? 'اضغط على الزر أدناه ليقوم الوكيل بصياغة 5 نسخ متقنة (عربي مصري، عربي خليجي VIP، فرنسي، إنجليزي، روسي) لتفقدها والتعديل عليها قبل الإرسال.'
                      : 'Click the button below to have the agent compose localized copies across all 5 audience lists before dispatch.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateLocalizedCampaign}
                  disabled={isGeneratingCampaign}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs transition-all inline-flex items-center gap-2 shadow-md shadow-purple-600/25 disabled:opacity-50 cursor-pointer"
                >
                  {isGeneratingCampaign ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>
                    {isGeneratingCampaign
                      ? isAr
                        ? 'جارِ تجهيز وتوطين المحتوى الآن...'
                        : 'Composing localized copies...'
                      : isAr
                      ? '✨ تجهيز وتوطين الإشعار لكافة القوائم الآن'
                      : '✨ Prepare Localized Notifications Now'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* ================================================================ */}
          {/* SECTION 3: SCHEDULED NOTIFICATIONS QUEUE                         */}
          {/* ================================================================ */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>
                    {isAr
                      ? 'طابور الإشعارات المجدولة ذكياً (Optimal Window Queue)'
                      : 'Scheduled Notifications Queue'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    {scheduledList.length}
                  </span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isAr
                    ? 'يقوم عامل الخلفية (Background Worker) ببث هذه الإشعارات تلقائياً بمجرد دخول النافذة الزمنية المستهدفة'
                    : 'The background worker automatically fires these alerts once user optimal engagement window is reached'}
                </p>
              </div>

              <button
                type="button"
                onClick={fetchScheduledNotifications}
                disabled={loadingScheduled}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loadingScheduled ? 'animate-spin' : ''}`} />
                <span>{isAr ? 'تحديث' : 'Refresh'}</span>
              </button>
            </div>

            {scheduledList.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                {isAr
                  ? 'لا توجد إشعارات في طابور الجدولة حالياً. يمكنك جدولة إشعار من النموذج أعلاه.'
                  : 'No scheduled alerts in queue. Schedule an alert using the form above.'}
              </div>
            ) : (
              <div className="space-y-2.5">
                {scheduledList.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      item.status === 'dispatched'
                        ? 'bg-slate-50/70 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-70'
                        : 'bg-white dark:bg-slate-800/80 border-purple-200 dark:border-purple-900/60 shadow-xs'
                    }`}
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            item.urgency === 'urgent'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {item.urgency === 'urgent' ? (isAr ? 'عاجل' : 'Urgent') : (isAr ? 'غير عاجل' : 'Non-Urgent')}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {item.category}
                        </span>
                        <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {isAr ? 'النافذة المستهدفة: ' : 'Target Window: '}
                          {item.targetOptimalWindow || 'Peak'}
                        </span>
                        <span
                          className={`text-[10px] font-bold ${
                            item.status === 'dispatched' ? 'text-slate-400' : 'text-amber-500'
                          }`}
                        >
                          {item.status === 'dispatched'
                            ? (isAr ? 'تم البث بنجاح' : 'Dispatched')
                            : (isAr ? 'قيد الانتظار' : 'Pending')}
                        </span>
                      </div>
                      <p className="font-extrabold text-xs text-slate-900 dark:text-white">{item.title}</p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                      {item.heuristicReason && (
                        <p className="text-[10px] text-purple-600 dark:text-purple-400 italic">
                          💡 {item.heuristicReason}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleDispatchScheduledNow(item.id)}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs transition-all flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3" />
                          <span>{isAr ? 'بث الآن وتجاوز الجدولة' : 'Dispatch Now'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteScheduled(item.id)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-400 transition-all"
                        title={isAr ? 'إلغاء وحذف' : 'Cancel & delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Matches Golden Windows */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500" />
              <span>{isAr ? 'النوافذ الذهبية للمباريات الكبرى القادمة (Golden Alert Windows)' : 'Prime Match Windows'}</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {timingReport?.upcomingKeyFixtures.map((fix) => (
                <div
                  key={fix.id}
                  className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-purple-600 dark:text-purple-400">
                      {fix.league}
                    </span>
                    <span className="text-[10px] text-slate-400">{fix.kickoffTime}</span>
                  </div>
                  <p className="font-extrabold text-xs text-slate-900 dark:text-white">
                    {fix.teams}
                  </p>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg">
                    {isAr ? 'الوقت المثالي للإشعار: ' : 'Optimal Timing: '}
                    {fix.optimalNotificationTime}
                  </div>
                  <button
                    onClick={() =>
                      handleSmartDispatch(
                        true,
                        `⚡ توقع الذكاء الاصطناعي: ${fix.teams}`,
                        `تحليل تكتيكي خاص للقاء ${fix.teams}. راجع خيارات الرهان ونسب التعويض الآن!`
                      )
                    }
                    className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-[11px] transition-all flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3 h-3" />
                    <span>{isAr ? 'صياغة وبث إشعار لهذه القمة' : 'Broadcast for this match'}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: AGENT MEMORY & ADMIN INSTRUCTIONS                */}
      {/* ======================================================== */}
      {hubTab === 'memory' && (
        <div className="space-y-5">
          {/* Info Banner */}
          <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 p-4 rounded-2xl flex items-start gap-3">
            <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 dark:text-slate-300">
              <p className="font-extrabold text-sm text-indigo-950 dark:text-indigo-200 mb-1">
                {isAr ? 'الذاكرة الدائمة وقواعد المدير (Continuous Learning & Memory Bank)' : 'Long-term Memory Bank'}
              </p>
              <p>
                {isAr
                  ? 'هنا تُحفظ القواعد والتوجيهات التي يعطيها المدير للوكيل. كلما تحدثت معه ووجهته، يتذكر هذه القواعد ويطبقها في كل التحليلات وصياغات الإشعارات المستقبلية.'
                  : 'Rules and preferences saved here are perpetually remembered by the agent across all interactions.'}
              </p>
            </div>
          </div>

          {/* Add New Preference Form */}
          <form
            onSubmit={handleAddMemoryPreference}
            className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
          >
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
              <BookmarkPlus className="w-4 h-4 text-purple-600" />
              <span>{isAr ? 'إضافة توجيه أو قاعدة جديدة لذاكرة الوكيل' : 'Add New Instruction to Memory'}</span>
            </h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newPreferenceText}
                onChange={(e) => setNewPreferenceText(e.target.value)}
                placeholder={
                  isAr
                    ? 'مثال: عدم الموافقة على تعويض أكثر من 500$ دون مراجعة يدوية، تفضيل اللهجة العربية الرسمية...'
                    : 'Example: never send notifications after 11 PM...'
                }
                className="flex-1 px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
              <select
                value={newPreferenceCategory}
                onChange={(e: any) => setNewPreferenceCategory(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="rule">{isAr ? 'قاعدة صارمة' : 'Strict Rule'}</option>
                <option value="preference">{isAr ? 'تفضيل أسلوب' : 'Style Preference'}</option>
                <option value="operational_note">{isAr ? 'ملاحظة تشغيلية' : 'Operational Note'}</option>
              </select>
              <button
                type="submit"
                disabled={!newPreferenceText.trim() || savingMemory}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? 'حفظ في الذاكرة' : 'Save'}</span>
              </button>
            </div>
          </form>

          {/* List of Saved Preferences */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
              {isAr ? `القواعد النشطة في ذاكرة (${currentAgent?.name_ar}):` : 'Active Memory Records:'}
            </h4>

            {memoryPreferences.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                {isAr ? 'لا توجد قواعد مخصصة محفوظة بعد.' : 'No memory rules found.'}
              </p>
            ) : (
              <div className="space-y-2">
                {memoryPreferences.map((pref) => (
                  <div
                    key={pref.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 shrink-0">
                        {pref.category}
                      </span>
                      <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
                        {pref.text}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteMemoryPreference(pref.id)}
                      className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg transition-colors"
                      title={isAr ? 'حذف من الذاكرة' : 'Delete'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: MODERN & HISTORICAL SEARCH EXPLORER               */}
      {/* ======================================================== */}
      {hubTab === 'search' && (
        <div className="space-y-5">
          <form
            onSubmit={handleRunSearch}
            className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
          >
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
              <Search className="w-4 h-4 text-purple-600" />
              <span>{isAr ? 'مستكشف البحث الحي والتاريخي (Live Web & Platform Ledger)' : 'Search Explorer'}</span>
            </h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isAr
                    ? 'ابحث عن نتيجة مباراة حية، تشكيلة، إصابة لاعب، أو رقم تذكرة أو شركة...'
                    : 'Search live match scores, injuries, or ticket ID...'
                }
                className="flex-1 px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
              <div className="flex gap-1.5">
                {[
                  { id: 'hybrid', label: isAr ? 'شامل (حي + داخلي)' : 'Hybrid' },
                  { id: 'live_web', label: isAr ? 'ويب حي (Google)' : 'Live Web' },
                  { id: 'platform_history', label: isAr ? 'سجلات المنصة' : 'Internal' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSearchMode(m.id as any)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      searchMode === m.id
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={!searchQuery.trim() || isSearching}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{isSearching ? (isAr ? 'جاري البحث...' : 'Searching...') : isAr ? 'بحث' : 'Search'}</span>
              </button>
            </div>
          </form>

          {/* Search Results Display */}
          {searchResult && (
            <div className="space-y-4">
              {/* Live Web Analysis Result */}
              {searchResult.liveWebAnalysis && (
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-sky-500" />
                      <span>{isAr ? 'نتائج البحث الحي من Google والويب:' : 'Live Web Insights:'}</span>
                    </h5>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold">
                      {isAr ? 'محدث وفوري' : 'Live & Verified'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {searchResult.liveWebAnalysis}
                  </p>

                  {searchResult.citations && searchResult.citations.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
                      {searchResult.citations.map((cit: any, idx: number) => (
                        <a
                          key={idx}
                          href={cit.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                        >
                          <span>{cit.title}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Internal Platform Matches */}
              {searchResult.platformHistory && searchResult.platformHistory.totalMatches > 0 && (
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <h5 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <History className="w-4 h-4 text-purple-600" />
                    <span>{isAr ? 'مطابقات سجلات المنصة التاريخية:' : 'Platform Matches:'}</span>
                  </h5>

                  {searchResult.platformHistory.companies.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500">{isAr ? 'الشركات:' : 'Companies:'}</span>
                      {searchResult.platformHistory.companies.map((c: any) => (
                        <div
                          key={c.id}
                          className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs flex justify-between items-center"
                        >
                          <span className="font-extrabold text-slate-900 dark:text-white">
                            {c.name_ar || c.name}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">{c.promo_code}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResult.platformHistory.requests.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500">{isAr ? 'طلبات التعويض:' : 'Claims:'}</span>
                      {searchResult.platformHistory.requests.map((r: any) => (
                        <div
                          key={r.id}
                          className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs flex justify-between items-center"
                        >
                          <div>
                            <span className="font-extrabold text-slate-900 dark:text-white">{r.company_name}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">#{r.id}</span>
                          </div>
                          <span className="font-extrabold text-purple-600">${r.amount}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: MANAGE AGENTS & ADD CUSTOM AGENT                 */}
      {/* ======================================================== */}
      {hubTab === 'manage_agents' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map((ag) => (
              <div
                key={ag.id}
                className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 relative"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                      {ag.avatar}
                    </span>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {isAr ? ag.name_ar : ag.name}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                        {ag.role}
                      </span>
                    </div>
                  </div>

                  {!ag.isBuiltIn && (
                    <button
                      onClick={async () => {
                        if (confirm(isAr ? 'هل أنت متأكد من حذف هذا الوكيل؟' : 'Delete this agent?')) {
                          await fetch(`/api/ai/agents/${ag.id}`, { method: 'DELETE' });
                          fetchAgents();
                        }
                      }}
                      className="text-slate-400 hover:text-rose-500 p-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {ag.description}
                </p>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-bold">
                  <span>Model: {ag.model}</span>
                  <button
                    onClick={() => {
                      setSelectedAgentId(ag.id);
                      setHubTab('console');
                    }}
                    className="text-purple-600 hover:underline flex items-center gap-1"
                  >
                    <span>{isAr ? 'فتح المحادثة' : 'Open Console'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE CUSTOM AI AGENT                           */}
      {/* ======================================================== */}
      {isCreatingAgent && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-600" />
                <span>{isAr ? 'إنشاء وكيل ذكاء اصطناعي مخصص' : 'Create Custom AI Agent'}</span>
              </h3>
              <button
                onClick={() => setIsCreatingAgent(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'اسم الوكيل (عربي):' : 'Agent Name (Arabic):'}
                </label>
                <input
                  type="text"
                  required
                  value={newAgentNameAr}
                  onChange={(e) => setNewAgentNameAr(e.target.value)}
                  placeholder="مثال: مستشار الرهان الآسيوي"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'اسم الوكيل (إنجليزي):' : 'Agent Name (English):'}
                </label>
                <input
                  type="text"
                  required
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="Example: Asian Handicap Advisor"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'الأيقونة (إيموجي):' : 'Avatar Emoji:'}
                  </label>
                  <input
                    type="text"
                    value={newAgentAvatar}
                    onChange={(e) => setNewAgentAvatar(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center text-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'الدور الوظيفي:' : 'Role:'}
                  </label>
                  <select
                    value={newAgentRole}
                    onChange={(e: any) => setNewAgentRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <option value="sports_analyst">{isAr ? 'محلل رياضي' : 'Sports'}</option>
                    <option value="smart_notifications">{isAr ? 'إشعارات ذكية' : 'Notifications'}</option>
                    <option value="marketing">{isAr ? 'تسويق رياضي وترويج الشركاء' : 'Sports Marketing & Promos'}</option>
                    <option value="loyalty_retention">{isAr ? 'ولاء وتعويضات' : 'Loyalty'}</option>
                    <option value="fraud_risk">{isAr ? 'أمان ومخاطر' : 'Risk'}</option>
                    <option value="custom">{isAr ? 'مخصص عام' : 'Custom'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'وصف الوكيل:' : 'Description:'}
                </label>
                <textarea
                  rows={2}
                  value={newAgentDesc}
                  onChange={(e) => setNewAgentDesc(e.target.value)}
                  placeholder="وصف مختصر لمهمة هذا الوكيل..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'تعليمات النظام (System Instructions):' : 'System Prompt:'}
                </label>
                <textarea
                  rows={4}
                  value={newAgentInstruction}
                  onChange={(e) => setNewAgentInstruction(e.target.value)}
                  placeholder="أنت وكيل متخصص في... قواعدك الصارمة هي..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={newAgentLiveSearch}
                    onChange={(e) => setNewAgentLiveSearch(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>{isAr ? 'تفعيل بحث Google الحي' : 'Google Search'}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={newAgentNotifications}
                    onChange={(e) => setNewAgentNotifications(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>{isAr ? 'صلاحية بث الإشعارات' : 'Push Alerts'}</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingAgent(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold shadow-md shadow-purple-600/20"
                >
                  {isAr ? 'حفظ وتفعيل الوكيل' : 'Create Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
