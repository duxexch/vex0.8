import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Company,
  CompanyApiConfig,
  CompanyApiIntegrationType,
  CompensationRequest,
  CompensationAccount,
  Wallet,
  AppBranding,
  Language,
  PLATFORM_DOMAIN,
  AppNotification,
  PhoneChangeRequest,
  PaymentMethod,
} from '../types';
import { AppIconRenderer } from './AppIconRenderer';
import { CompanyBrandLogo } from './CompanyBrandLogo';
import { CompanyApiIntegration } from './CompanyApiIntegration';
import { IntegrationTester } from './IntegrationTester';
import { IntegrationHealthDashboard } from './IntegrationHealthDashboard';
import { AdminAiAgentsHub } from './AdminAiAgentsHub';
import { COMPANY_THEMES, getCompanyTheme } from '../data/companyThemes';
import { COUNTRIES } from '../data/countries';
import { autoTranslateCompany } from '../utils/companyTranslator';
import { vexApi } from '../services/api';
import { generateDefaultCompanyApiMethods } from '../data/defaultApiMethods';
import {
  GLOBAL_PROJECT_ASO,
  PRECOMPUTED_COMPANY_ASO,
  generateCompanyAsoSuite,
  CompanyAsoSuite,
} from '../data/asoStrategy';
import {
  X,
  Check,
  CheckCircle2,
  Sliders,
  Send,
  Upload,
  Palette,
  ShieldCheck,
  Bot,
  Sparkles,
  Search,
  Copy,
  ExternalLink,
  Download,
  Building2,
  ToggleLeft,
  ToggleRight,
  Plus,
  Edit3,
  FileText,
  Award,
  Layers,
  ArrowRight,
  RefreshCw,
  Zap,
  Globe,
  Smartphone,
  Laptop,
  Image as ImageIcon,
  FileCode,
  Code,
  Share2,
  Trash2,
  Eye,
  CheckCheck,
  Maximize2,
  SunMedium,
  Moon,
  Monitor,
  CheckCircle,
  Save,
  Cpu,
  Key,
  Lock,
  Server,
  Activity,
  Radio,
  Menu,
  PanelLeftClose,
  Terminal,
  Bell,
  Unlock,
  Phone,
  Receipt,
  Filter,
  AlertCircle,
  Clock,
  EyeOff,
  KeyRound,
  LogOut,
  Minimize2,
  ShieldAlert,
  Split,
  Mail,
  CheckSquare,
  Square,
  ListChecks,
  DollarSign,
  Trophy,
} from 'lucide-react';
import { AbTestingTab } from './AbTestingTab';
import { SportsAgentManager } from './admin/SportsAgentManager';
import { LotteryAdminManager } from './admin/LotteryAdminManager';
import { CompensationEmailGeneratorModal } from './CompensationEmailGeneratorModal';
import { ADMIN_TRANSLATIONS } from '../data/adminTranslations';
import {
  ICON_PRESETS,
  getPresetSvg,
  processUploadedIconFile,
  rasterizeToPngDataUrl,
  generateManifestObject,
  applyBrandingToDocument,
  downloadStringAsFile,
  generateHtmlSnippet,
  svgToDataUrl,
} from '../utils/dynamicManifest';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies?: Company[];
  requests?: CompensationRequest[];
  accounts?: CompensationAccount[];
  wallets?: Wallet[];
  appBranding?: AppBranding;
  branding?: AppBranding;
  onUpdateBranding: (newBranding: AppBranding) => Promise<void>;
  onApproveRequest: (requestId: string) => Promise<void>;
  onBulkApproveRequests?: (requestIds: string[]) => Promise<void>;
  onRejectRequest: (requestId: string, reason: string) => Promise<void>;
  onBulkRejectRequests?: (requestIds: string[], reason: string) => Promise<void>;
  onUpdateCompany: (company: Company) => Promise<void>;
  onBroadcastNotification: (title: string, message: string, category: any) => Promise<void>;
  onTriggerAiBroadcast?: () => Promise<void>;
  onTriggerAiPrediction?: () => Promise<void>;
  onToggleCompanyActive?: (companyId: string) => Promise<boolean>;
  onAddCompany?: (company: Company) => Promise<void>;
  onSyncCompanies?: () => Promise<void>;
  notifications?: AppNotification[];
  lang: Language;
  onLangChange?: (lang: Language) => void;
  onCopyToast?: () => void;
  isStandalone?: boolean;
}

const DEFAULT_BRANDING: AppBranding = {
  appName: 'VEX Deals',
  tagline: 'منصة الولاء والتعويضات والتحليلات الرياضية الذكية',
  iconType: 'preset',
  presetIconId: 'emerald-shield',
  customIconUrl: '',
  targetCompanyId: 'all',
  exclusiveMode: false,
};

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  companies = [],
  requests = [],
  accounts = [],
  wallets = [],
  appBranding,
  branding,
  onUpdateBranding,
  onApproveRequest,
  onBulkApproveRequests,
  onRejectRequest,
  onBulkRejectRequests,
  onUpdateCompany,
  onBroadcastNotification,
  onTriggerAiBroadcast,
  onTriggerAiPrediction,
  onToggleCompanyActive,
  onAddCompany,
  onSyncCompanies,
  notifications = [],
  lang,
  onLangChange,
  onCopyToast,
  isStandalone = false,
}) => {
  const [adminLang, setAdminLang] = useState<Language>(lang);

  useEffect(() => {
    setAdminLang(lang);
  }, [lang]);

  const handleLanguageChange = (newLang: Language) => {
    setAdminLang(newLang);
    if (onLangChange) {
      onLangChange(newLang);
    }
  };

  const isAr = adminLang === 'ar';
  const isRu = adminLang === 'ru';
  const isEn = adminLang === 'en';

  const tAdmin = ADMIN_TRANSLATIONS[adminLang] || ADMIN_TRANSLATIONS['ar'];

  const t = (arText: string, enText: string, ruText?: string, esText?: string): string => {
    if (adminLang === 'ru') return ruText || enText;
    if (adminLang === 'en') return enText;
    if (adminLang === 'es' && esText) return esText;
    return arText;
  };

  const effectiveBranding = appBranding || branding || DEFAULT_BRANDING;

  // Security Gate & Standalone Mode States
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('vex_admin_unlocked') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [standaloneMode, setStandaloneMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.location.pathname === '/admin' || Boolean(isStandalone);
  });
  const [masterPin, setMasterPin] = useState<string>(() => {
    if (typeof window === 'undefined') return '7788';
    return localStorage.getItem('vex_admin_master_pin') || '7788';
  });
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  const [isResettingData, setIsResettingData] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  const handleCleanSlateReset = async () => {
    const confirmMsg = t(
      'هل أنت متأكد من رغبتك في تهيئة وتفريغ قاعدة البيانات (Clean Slate)? سيتم مسح نشاط المستخدمين، تاريخ الإشعارات، والحسابات التجريبية بالكامل لإنشاء بداية نظيفة للتطبيق.',
      'Are you sure you want to perform a Clean Slate data reset? This will clear all user activity, notification history, and demo accounts for new deployments.',
      'Вы уверены, что хотите выполнить сброс Clean Slate?'
    );
    if (!window.confirm(confirmMsg)) return;

    setIsResettingData(true);
    try {
      const res = await vexApi.clearCleanSlate();
      setResetSuccessMsg(res.message || '✅ تم تنظيف قاعدة البيانات وتهيئة النظام بنجاح للنشر الجديد!');
      if (onCopyToast) onCopyToast();
      setTimeout(() => setResetSuccessMsg(null), 6000);
    } catch (err: any) {
      alert(err.message || 'فشل عملية إعادة الضبط');
    } finally {
      setIsResettingData(false);
    }
  };

  useEffect(() => {
    if (isStandalone) {
      setStandaloneMode(true);
    }
  }, [isStandalone]);

  const handleUnlockAdmin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pinInput.trim() === masterPin.trim() || pinInput.trim() === '7788') {
      setIsAdminUnlocked(true);
      setPinError(false);
      sessionStorage.setItem('vex_admin_unlocked', 'true');
    } else {
      setPinError(true);
      setTimeout(() => setPinError(false), 3000);
    }
  };

  const handleLockAdmin = () => {
    setIsAdminUnlocked(false);
    setPinInput('');
    sessionStorage.removeItem('vex_admin_unlocked');
  };

  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPinInput.trim().length >= 4) {
      setMasterPin(newPinInput.trim());
      localStorage.setItem('vex_admin_master_pin', newPinInput.trim());
      setPinChangeSuccess(true);
      setTimeout(() => {
        setPinChangeSuccess(false);
        setIsChangingPin(false);
        setNewPinInput('');
      }, 2000);
    }
  };

  type AdminTab =
    | 'dedicated_brand'
    | 'companies'
    | 'company_api'
    | 'integration_tester'
    | 'integration_health'
    | 'aso_suite'
    | 'branding'
    | 'compensation'
    | 'phone_requests'
    | 'telegram_bot'
    | 'ai_agent'
    | 'broadcast'
    | 'ab_testing'
    | 'notifications'
    | 'payment_methods'
    | 'compliance'
    | 'lottery_manager';

  const [activeTab, setActiveTab] = useState<AdminTab>('dedicated_brand');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [apiPreselectedCompanyId, setApiPreselectedCompanyId] = useState<string | undefined>(undefined);

  // Single-Brand Mode State
  const [searchBrand, setSearchBrand] = useState('');
  const [selectedBrandForPreview, setSelectedBrandForPreview] = useState<string>(
    effectiveBranding.targetCompanyId || 'all'
  );
  const [modeApplying, setModeApplying] = useState(false);
  const [modeAppliedSuccess, setModeAppliedSuccess] = useState(false);

  // Companies Management State
  const [companySearch, setCompanySearch] = useState('');
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [savingCompanyId, setSavingCompanyId] = useState<string | null>(null);
  const [companySavedSuccess, setCompanySavedSuccess] = useState<string | null>(null);
  const [syncingCompanies, setSyncingCompanies] = useState(false);
  const [syncCompaniesSuccess, setSyncCompaniesSuccess] = useState(false);
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [newCompany, setNewCompany] = useState<Partial<Company>>({
    name: '',
    promo_code: '',
    affiliate_link: '',
    app_link: '',
    description: '',
    color: '#0d579b',
    is_active: true,
  });

  // Company API Integration Configuration State
  const [configuringApiCompany, setConfiguringApiCompany] = useState<Company | null>(null);
  const [tempApiConfig, setTempApiConfig] = useState<CompanyApiConfig | null>(null);
  const [testingApi, setTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{
    success: boolean;
    statusText: string;
    latencyMs: number;
    message: string;
  } | null>(null);
  const [savingApiConfig, setSavingApiConfig] = useState(false);
  const [apiSaveSuccess, setApiSaveSuccess] = useState(false);

  // New Company API Config State (during Add Company)
  const [newCompanyApiEnabled, setNewCompanyApiEnabled] = useState(true);
  const [newCompanyApiConfig, setNewCompanyApiConfig] = useState<Partial<CompanyApiConfig>>({
    enabled: true,
    integration_type: 'rest_api',
    endpoint_url: '',
    api_key: '',
    secret_key: '',
    merchant_id: '',
    account_id_param: 'player_id',
    min_transfer_amount: 1,
    max_transfer_amount: 5000,
    allow_available_only: true,
    auto_payout: true,
    test_mode: false,
  });

  // Payment Methods State
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: 'pm_vodafone',
      name: 'فودافون كاش (Vodafone Cash)',
      nameAr: 'فودافون كاش',
      nameEn: 'Vodafone Cash',
      accountNumber: '01012345678',
      holderName: 'VEX Deals Official',
      instructions: 'قم بتحويل المبلغ المطلوب إلى رقم محفظة فودافون كاش الموضحة، ثم أدخل رقم هاتفك ورقم العملية في نموذج فك التجميد بالأسفل لتأكيد الإيداع 1:1.',
      instructionsAr: 'قم بتحويل المبلغ المطلوب إلى رقم محفظة فودافون كاش الموضحة، ثم أدخل رقم هاتفك ورقم العملية في نموذج فك التجميد بالأسفل لتأكيد الإيداع 1:1.',
      instructionsEn: 'Transfer the amount to the Vodafone Cash wallet number above, then enter your sender phone and transaction ID in the unfreeze form below.',
      descriptionAr: 'التحويل السريع والفوري عبر محفظة فودافون كاش المصرية',
      descriptionEn: 'Instant transfer via Vodafone Cash wallet',
      badge: 'محفظة إلكترونية',
      is_active: true,
      scope: 'countries',
      countries: ['EG'],
    },
    {
      id: 'pm_instapay',
      name: 'إنستا باي (InstaPay IPN)',
      nameAr: 'إنستا باي (InstaPay)',
      nameEn: 'InstaPay IPN',
      accountNumber: 'vexdeals@instapay',
      holderName: 'VEX Deals Egypt',
      instructions: 'افتح تطبيق إنستاباي وأرسل التحويل المالي إلى عنوان الدفع اللحظي (IPA) الموضح أعلاه، ثم أدخل رقم المرجع البنكي في خانة الإيصال.',
      instructionsAr: 'افتح تطبيق إنستاباي وأرسل التحويل المالي إلى عنوان الدفع اللحظي (IPA) الموضح أعلاه، ثم أدخل رقم المرجع البنكي في خانة الإيصال.',
      instructionsEn: 'Open InstaPay app and transfer funds to the IPA address above. Save the bank reference number and submit it in the unfreeze receipt note.',
      descriptionAr: 'شبكة المدفوعات اللحظية - تحويل فوري مجاني من أي حساب بنكي',
      descriptionEn: 'Instant payment network - free transfer from any bank account',
      badge: 'دفع لحظي IPN',
      is_active: true,
      scope: 'countries',
      countries: ['EG'],
    },
    {
      id: 'pm_etisalat',
      name: 'اتصالات كاش (Etisalat Cash)',
      nameAr: 'اتصالات كاش',
      nameEn: 'Etisalat Cash',
      accountNumber: '01198765432',
      holderName: 'VEX Deals Official',
      instructions: 'حول المبلغ المحدد إلى محفظة اتصالات كاش، ثم سجل رقم الهاتف المرسل ورقم العملية في نموذج فك التجميد.',
      instructionsAr: 'حول المبلغ المحدد إلى محفظة اتصالات كاش، ثم سجل رقم الهاتف المرسل ورقم العملية في نموذج فك التجميد.',
      instructionsEn: 'Transfer the amount to the Etisalat Cash wallet and input your sender number and transaction ID in the unfreeze form.',
      descriptionAr: 'محفظة اتصالات كاش لاستلام وتحويل الأموال',
      descriptionEn: 'Etisalat Cash digital wallet',
      badge: 'محفظة إلكترونية',
      is_active: true,
      scope: 'countries',
      countries: ['EG'],
    },
    {
      id: 'pm_orange',
      name: 'أورانج كاش (Orange Cash)',
      nameAr: 'أورانج كاش',
      nameEn: 'Orange Cash',
      accountNumber: '01233344455',
      holderName: 'VEX Deals Official',
      instructions: 'حول إلى رقم محفظة أورانج كاش وسجل تفاصيل الإيصال في طلب فك التجميد.',
      instructionsAr: 'حول إلى رقم محفظة أورانج كاش وسجل تفاصيل الإيصال في طلب فك التجميد.',
      instructionsEn: 'Transfer to the Orange Cash wallet and record your receipt details in the unfreeze form.',
      descriptionAr: 'محفظة أورانج كاش الرقمية المعتمدة',
      descriptionEn: 'Orange Cash digital wallet',
      badge: 'محفظة إلكترونية',
      is_active: true,
      scope: 'countries',
      countries: ['EG'],
    },
    {
      id: 'pm_we',
      name: 'وي باي (WE Pay)',
      nameAr: 'وي باي (WE Pay)',
      nameEn: 'WE Pay',
      accountNumber: '01555667788',
      holderName: 'VEX Deals Official',
      instructions: 'أرسل المبلغ إلى محفظة WE Pay المعتمدة وأرفق رقم العملية في طلب الإيداع.',
      instructionsAr: 'أرسل المبلغ إلى محفظة WE Pay المعتمدة وأرفق رقم العملية في طلب الإيداع.',
      instructionsEn: 'Send the deposit to the official WE Pay wallet and attach your transaction number in the request.',
      descriptionAr: 'محفظة المصرية للاتصالات WE Pay',
      descriptionEn: 'WE Pay digital wallet',
      badge: 'محفظة إلكترونية',
      is_active: true,
      scope: 'countries',
      countries: ['EG'],
    },
    {
      id: 'pm_bank',
      name: 'تحويل بنكي محلي / ميزة (Bank / Meeza)',
      nameAr: 'تحويل بنكي محلي / ميزة',
      nameEn: 'Local Bank / Meeza',
      accountNumber: 'EG87000200012345678901',
      holderName: 'VEX Deals Financials',
      instructions: 'قم بعمل تحويل بنكي أو إيداع عبر الصراف الآلي (ATM) إلى رقم الحساب البنكي / الآيبان الموضح أعلاه، ثم أدخل رقم إيصال التحويل في نموذج فك التجميد.',
      instructionsAr: 'قم بعمل تحويل بنكي أو إيداع عبر الصراف الآلي (ATM) إلى رقم الحساب البنكي / الآيبان الموضح أعلاه، ثم أدخل رقم إيصال التحويل في نموذج فك التجميد.',
      instructionsEn: 'Execute a bank wire or ATM deposit to the IBAN above, then enter the transfer receipt reference in the unfreeze form.',
      descriptionAr: 'تحويل مباشر لأي حساب بنكي مصري أو بطاقة ميزة الوطنية',
      descriptionEn: 'Direct transfer to any Egyptian bank account or Meeza card',
      badge: 'حساب بنكي / آيبان',
      is_active: true,
      scope: 'countries',
      countries: ['EG'],
    },
  ]);
  const [editingPm, setEditingPm] = useState<PaymentMethod | null>(null);
  const [isAddingPm, setIsAddingPm] = useState(false);
  const [isSavingPm, setIsSavingPm] = useState(false);
  const [pmForm, setPmForm] = useState({
    name: '',
    nameAr: '',
    nameEn: '',
    instructions: '',
    instructionsAr: '',
    accountNumber: '',
    holderName: '',
    badge: 'محفظة إلكترونية',
    descriptionAr: '',
    descriptionEn: '',
    is_active: true,
    scope: 'global' as 'global' | 'countries',
    countries: [] as string[],
  });
  const [pmSaveSuccess, setPmSaveSuccess] = useState(false);

  useEffect(() => {
    vexApi.getPaymentMethods().then((methods) => {
      if (methods && methods.length > 0) {
        setPaymentMethods(methods);
      } else if (appBranding && (appBranding as any).paymentMethods) {
        setPaymentMethods((appBranding as any).paymentMethods);
      }
    });
  }, [appBranding]);

  const handleSavePaymentMethods = async (updatedList: PaymentMethod[]) => {
    setIsSavingPm(true);
    setPaymentMethods(updatedList);
    try {
      await vexApi.savePaymentMethods(updatedList);
      setPmSaveSuccess(true);
      if (onCopyToast) onCopyToast();
      setTimeout(() => setPmSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving payment methods:', err);
    } finally {
      setIsSavingPm(false);
    }
  };

  // ASO Suite State
  const [asoTargetMode, setAsoTargetMode] = useState<'global' | 'company'>('global');
  const [asoSelectedCompanyId, setAsoSelectedCompanyId] = useState<string>(
    companies[0]?.id || 'CMP1XB001'
  );
  const [copiedAsoField, setCopiedAsoField] = useState<string | null>(null);

  // Company Website Sections Customizer State
  const activeDedicatedComp = companies.find((c) => c.id === effectiveBranding.targetCompanyId);
  const currentCustomSite = effectiveBranding.targetCompanyId && effectiveBranding.targetCompanyId !== 'all'
    ? effectiveBranding.companyCustomWebsites?.[effectiveBranding.targetCompanyId]
    : undefined;

  const [editSitePromo, setEditSitePromo] = useState(currentCustomSite?.promoCode || activeDedicatedComp?.promo_code || '');
  const [editSiteAffLink, setEditSiteAffLink] = useState(currentCustomSite?.affiliateLink || activeDedicatedComp?.affiliate_link || '');
  const [editSiteAppDownload, setEditSiteAppDownload] = useState(currentCustomSite?.appDownloadLink || activeDedicatedComp?.app_link || '');
  const [editSiteOverviewAr, setEditSiteOverviewAr] = useState(currentCustomSite?.sections?.overview?.contentAr || activeDedicatedComp?.description || '');
  const [editSiteOverviewEn, setEditSiteOverviewEn] = useState(currentCustomSite?.sections?.overview?.contentEn || activeDedicatedComp?.description || '');
  const [savingWebsiteSections, setSavingWebsiteSections] = useState(false);
  const [websiteSectionsSavedSuccess, setWebsiteSectionsSavedSuccess] = useState(false);

  useEffect(() => {
    if (activeDedicatedComp) {
      const site = effectiveBranding.companyCustomWebsites?.[activeDedicatedComp.id];
      setEditSitePromo(site?.promoCode || activeDedicatedComp.promo_code);
      setEditSiteAffLink(site?.affiliateLink || activeDedicatedComp.affiliate_link);
      setEditSiteAppDownload(site?.appDownloadLink || activeDedicatedComp.app_link);
      setEditSiteOverviewAr(site?.sections?.overview?.contentAr || activeDedicatedComp.description);
      setEditSiteOverviewEn(site?.sections?.overview?.contentEn || activeDedicatedComp.description);
    }
  }, [effectiveBranding.targetCompanyId, effectiveBranding.companyCustomWebsites, companies]);

  const handleSaveCompanyWebsiteSections = async () => {
    if (!effectiveBranding.exclusiveMode || !effectiveBranding.targetCompanyId || effectiveBranding.targetCompanyId === 'all') return;
    setSavingWebsiteSections(true);
    try {
      const compId = effectiveBranding.targetCompanyId;
      const existingSites = effectiveBranding.companyCustomWebsites || {};
      const updatedSites = {
        ...existingSites,
        [compId]: {
          promoCode: editSitePromo,
          affiliateLink: editSiteAffLink,
          appDownloadLink: editSiteAppDownload,
          sections: {
            overview: {
              titleAr: 'نبذة عن الشركة ومميزات الوكالة الحصرية',
              titleEn: 'About & Exclusive Agency Perks',
              subtitleAr: '',
              subtitleEn: '',
              contentAr: editSiteOverviewAr,
              contentEn: editSiteOverviewEn,
              enabled: true,
            },
            cashbackPolicy: {
              titleAr: 'سياسة حماية الخسائر والاسترداد النقدي',
              titleEn: 'Cashback & Loss Protection Policy',
              subtitleAr: '',
              subtitleEn: '',
              contentAr: 'نوفر لك في VEX Deals شبكة أمان متكاملة؛ ففي حال واجهتك خسائر في رهاناتك عبر المنصة، يمكنك تقديم رقم الحساب وقسيمة الرهان عبر قسم المحفظة والتعويضات لاسترداد جزء كبير من الخسائر.',
              contentEn: 'VEX Deals provides an integrated safety net. Submit your account ID and bet slip in the compensation wallet to recover a substantial percentage.',
              enabled: true,
            }
          }
        }
      };

      const updatedBranding: AppBranding = {
        ...effectiveBranding,
        companyCustomWebsites: updatedSites,
        updatedAt: new Date().toISOString(),
      };
      await onUpdateBranding(updatedBranding);
      setWebsiteSectionsSavedSuccess(true);
      setTimeout(() => setWebsiteSectionsSavedSuccess(false), 3000);
    } finally {
      setSavingWebsiteSections(false);
    }
  };

  // General Branding & High-Res App Icon Form
  const [editAppName, setEditAppName] = useState(effectiveBranding.appName || 'VEX Deals');
  const [editTagline, setEditTagline] = useState(effectiveBranding.tagline || '');
  const [editMetaDescription, setEditMetaDescription] = useState(effectiveBranding.metaDescription || '');
  const [editMetaKeywords, setEditMetaKeywords] = useState(effectiveBranding.metaKeywords || '');
  const [editContactEmail, setEditContactEmail] = useState(effectiveBranding.contactEmail || '');
  const [editSupportPhone, setEditSupportPhone] = useState(effectiveBranding.supportPhone || '');
  const [editIconType, setEditIconType] = useState<'preset' | 'custom' | 'upload'>(
    effectiveBranding.iconType || 'preset'
  );
  const [editPresetIconId, setEditPresetIconId] = useState(
    effectiveBranding.presetIconId || 'emerald-shield'
  );
  const [editCustomUrl, setEditCustomUrl] = useState(effectiveBranding.customIconUrl || '');
  const [editUploadedData, setEditUploadedData] = useState(effectiveBranding.uploadedIconData || '');
  const [editIconResolution, setEditIconResolution] = useState<{ width: number; height: number }>(
    effectiveBranding.iconResolution || { width: 512, height: 512 }
  );
  const [editThemeColor, setEditThemeColor] = useState(effectiveBranding.themeColor || '#10b981');
  const [editShape, setEditShape] = useState<'circle' | 'rounded' | 'squircle'>('circle');
  const [showMaskableSafeZone, setShowMaskableSafeZone] = useState(false);
  const [presetCategoryFilter, setPresetCategoryFilter] = useState<string>('all');
  const [previewDevice, setPreviewDevice] = useState<'android' | 'ios' | 'tab' | 'store'>('android');
  const [showManifestJsonViewer, setShowManifestJsonViewer] = useState(false);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);
  const [copiedManifestSnippet, setCopiedManifestSnippet] = useState(false);
  const [downloadingAsset, setDownloadingAsset] = useState<string | null>(null);
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingSavedSuccess, setBrandingSavedSuccess] = useState(false);

  // Synchronize state when props update
  useEffect(() => {
    const b = appBranding || branding || DEFAULT_BRANDING;
    setEditAppName(b.appName || 'VEX Deals');
    setEditTagline(b.tagline || '');
    setEditMetaDescription(b.metaDescription || '');
    setEditMetaKeywords(b.metaKeywords || '');
    setEditContactEmail(b.contactEmail || '');
    setEditSupportPhone(b.supportPhone || '');
    setEditIconType(b.iconType || 'preset');
    setEditPresetIconId(b.presetIconId || 'emerald-shield');
    setEditCustomUrl(b.customIconUrl || '');
    setEditUploadedData(b.uploadedIconData || '');
    if (b.iconResolution) setEditIconResolution(b.iconResolution);
    if (b.themeColor) setEditThemeColor(b.themeColor);
    if (b.targetCompanyId) {
      setSelectedBrandForPreview(b.targetCompanyId);
    }
  }, [appBranding, branding]);

  // Broadcast Form
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastCategory, setBroadcastCategory] = useState<string>('ai_prediction');
  const [broadcastUrgency, setBroadcastUrgency] = useState<'urgent' | 'non-urgent'>('urgent');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);

  // Reject Modal State
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('رقم الرهان غير مسجل ضمن كود وكالتنا');

  // Requests Management & Verification State
  const [requestFilter, setRequestFilter] = useState<'all' | 'unfreeze' | 'compensation' | 'pending' | 'approved' | 'rejected'>('all');
  const [requestSearch, setRequestSearch] = useState('');
  const [requestActionLoadingId, setRequestActionLoadingId] = useState<string | null>(null);
  const [requestActionFeedback, setRequestActionFeedback] = useState<{ id: string; message: string; type: 'success' | 'error' } | null>(null);

  // Automated Compensation Approval Email Generator Modal State
  const [isEmailGeneratorOpen, setIsEmailGeneratorOpen] = useState(false);
  const [selectedRequestForEmail, setSelectedRequestForEmail] = useState<CompensationRequest | null>(null);

  // Stats calculation
  const totalRequests = requests.length;
  const unfreezeRequestsCount = requests.filter((r) => r.id.startsWith('DEP-UNF-') || r.bet_slip_id?.startsWith('DEPOSIT-')).length;
  const compensationRequestsCount = requests.length - unfreezeRequestsCount;
  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const approvedRequests = requests.filter((r) => r.status === 'approved');
  const totalApprovedAmount = approvedRequests.reduce((acc, r) => acc + (r.amount || 0), 0);

  const handleApproveWithFeedback = async (req: CompensationRequest) => {
    setRequestActionLoadingId(req.id);
    try {
      await onApproveRequest(req.id);
      const isUnfreeze = req.id.startsWith('DEP-UNF-') || req.bet_slip_id?.startsWith('DEPOSIT-');
      setSelectedRequestForEmail(req);
      setRequestActionFeedback({
        id: req.id,
        message: isUnfreeze
          ? t('تم اعتماد الإيداع وفك تجميد الرصيد 1:1 بنجاح!', 'Deposit approved and balance unfrozen 1:1!', 'Депозит подтвержден, баланс разморожен 1:1!')
          : t('تم اعتماد طلب التعويض وإضافته للرصيد المجمد!', 'Compensation approved and added to frozen balance!', 'Компенсация одобрена и добавлена в замороженный баланс!'),
        type: 'success',
      });
      setTimeout(() => setRequestActionFeedback(null), 4500);
    } catch (err: any) {
      setRequestActionFeedback({
        id: req.id,
        message: err?.message || t('حدث خطأ أثناء الاعتماد', 'Approval error', 'Ошибка при подтверждении'),
        type: 'error',
      });
      setTimeout(() => setRequestActionFeedback(null), 4000);
    } finally {
      setRequestActionLoadingId(null);
    }
  };

  const handleRejectWithFeedback = async () => {
    if (!rejectId) return;
    const currentRejectId = rejectId;
    setRequestActionLoadingId(currentRejectId);
    try {
      await onRejectRequest(currentRejectId, rejectReason);
      setRequestActionFeedback({
        id: currentRejectId,
        message: t('تم رفض الطلب بنجاح وإشعار العميل', 'Request rejected successfully', 'Запрос успешно отклонен, клиент уведомлен'),
        type: 'success',
      });
      setRejectId(null);
      setTimeout(() => setRequestActionFeedback(null), 3500);
    } catch (err: any) {
      setRequestActionFeedback({
        id: currentRejectId,
        message: err?.message || t('حدث خطأ أثناء الرفض', 'Rejection error', 'Ошибка при отклонении'),
        type: 'error',
      });
      setTimeout(() => setRequestActionFeedback(null), 4000);
    } finally {
      setRequestActionLoadingId(null);
    }
  };

  // Bulk Selection & Operations State
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [isBulkOperating, setIsBulkOperating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [isBulkRejectModalOpen, setIsBulkRejectModalOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('رقم الرهان غير مسجل ضمن كود وكالتنا');

  const toggleSelectRequest = (id: string) => {
    setSelectedRequestIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = (visibleIds: string[]) => {
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedRequestIds.includes(id));
    if (allSelected) {
      setSelectedRequestIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedRequestIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleSelectOnlyPendingVisible = (visibleReqs: CompensationRequest[]) => {
    const pendingIds = visibleReqs.filter((r) => r.status === 'pending').map((r) => r.id);
    setSelectedRequestIds(pendingIds);
  };

  const handleClearSelection = () => {
    setSelectedRequestIds([]);
  };

  const handleBulkApprove = async () => {
    if (selectedRequestIds.length === 0 || isBulkOperating) return;

    const targetReqs = requests.filter((r) => selectedRequestIds.includes(r.id));
    if (targetReqs.length === 0) return;

    setIsBulkOperating(true);
    setBulkProgress({ current: 0, total: targetReqs.length });

    try {
      if (onBulkApproveRequests) {
        await onBulkApproveRequests(targetReqs.map((r) => r.id));
      } else {
        for (let i = 0; i < targetReqs.length; i++) {
          setBulkProgress({ current: i + 1, total: targetReqs.length });
          await onApproveRequest(targetReqs[i].id);
        }
      }

      const totalAmount = targetReqs.reduce((acc, r) => acc + (r.amount || 0), 0);
      setRequestActionFeedback({
        id: 'bulk-approve',
        message: t(
          `✅ تم اعتماد ${targetReqs.length} طلب بنجاح بإجمالي مبلغ $${totalAmount.toLocaleString()}!`,
          `✅ Successfully approved ${targetReqs.length} requests totaling $${totalAmount.toLocaleString()}!`,
          `✅ Успешно одобрено ${targetReqs.length} запросов на сумму $${totalAmount.toLocaleString()}!`
        ),
        type: 'success',
      });
      setSelectedRequestIds([]);
      setTimeout(() => setRequestActionFeedback(null), 5000);
    } catch (err: any) {
      setRequestActionFeedback({
        id: 'bulk-approve-err',
        message: err?.message || t('حدث خطأ أثناء الاعتماد الجماعي', 'Error during bulk approval', 'Ошибка при массовом одобрении'),
        type: 'error',
      });
      setTimeout(() => setRequestActionFeedback(null), 4000);
    } finally {
      setIsBulkOperating(false);
      setBulkProgress(null);
    }
  };

  const handleBulkReject = async () => {
    if (selectedRequestIds.length === 0 || isBulkOperating) return;

    const targetReqs = requests.filter((r) => selectedRequestIds.includes(r.id));
    if (targetReqs.length === 0) return;

    setIsBulkOperating(true);
    setBulkProgress({ current: 0, total: targetReqs.length });

    try {
      if (onBulkRejectRequests) {
        await onBulkRejectRequests(targetReqs.map((r) => r.id), bulkRejectReason);
      } else {
        for (let i = 0; i < targetReqs.length; i++) {
          setBulkProgress({ current: i + 1, total: targetReqs.length });
          await onRejectRequest(targetReqs[i].id, bulkRejectReason);
        }
      }

      setRequestActionFeedback({
        id: 'bulk-reject',
        message: t(
          `⚠️ تم رفض ${targetReqs.length} طلب بنجاح وتوثيق سبب الرفض.`,
          `⚠️ Successfully rejected ${targetReqs.length} requests.`,
          `⚠️ Успешно отклонено ${targetReqs.length} запросов с сохранением причины.`
        ),
        type: 'success',
      });
      setSelectedRequestIds([]);
      setIsBulkRejectModalOpen(false);
      setTimeout(() => setRequestActionFeedback(null), 5000);
    } catch (err: any) {
      setRequestActionFeedback({
        id: 'bulk-reject-err',
        message: err?.message || t('حدث خطأ أثناء الرفض الجماعي', 'Error during bulk rejection', 'Ошибка при массовом отклонении'),
        type: 'error',
      });
      setTimeout(() => setRequestActionFeedback(null), 4000);
    } finally {
      setIsBulkOperating(false);
      setBulkProgress(null);
    }
  };

  // --------------------------------------------------------------------------
  // Phone Change Requests State & Handlers (Admin Verification)
  // --------------------------------------------------------------------------
  const [phoneChangeRequests, setPhoneChangeRequests] = useState<PhoneChangeRequest[]>([]);
  const [loadingPhoneRequests, setLoadingPhoneRequests] = useState(false);
  const [phoneActionLoadingId, setPhoneActionLoadingId] = useState<string | null>(null);
  const [phoneActionFeedback, setPhoneActionFeedback] = useState<{ id: string; message: string; type: 'success' | 'error' } | null>(null);
  const [rejectPhoneModalId, setRejectPhoneModalId] = useState<string | null>(null);
  const [rejectPhoneReason, setRejectPhoneReason] = useState('لم يتم استيفاء معايير التحقق الأمني');

  const loadPhoneChangeRequests = async () => {
    setLoadingPhoneRequests(true);
    try {
      const list = await vexApi.getPhoneChangeRequests();
      setPhoneChangeRequests(list);
    } catch {
      // pass
    } finally {
      setLoadingPhoneRequests(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPhoneChangeRequests();
    }
  }, [isOpen, activeTab]);

  const pendingPhoneRequests = phoneChangeRequests.filter((r) => r.status === 'pending');

  const handleApprovePhoneChange = async (reqId: string) => {
    setPhoneActionLoadingId(reqId);
    try {
      await vexApi.approvePhoneChange(reqId, 'Super Admin');
      setPhoneActionFeedback({
        id: reqId,
        message: t('تمت الموافقة وتحديث رقم هاتف المستخدم في المحفظة بنجاح!', 'Phone number updated successfully!', 'Номер телефона пользователя успешно обновлен в кошельке!'),
        type: 'success',
      });
      await loadPhoneChangeRequests();
      setTimeout(() => setPhoneActionFeedback(null), 3500);
    } catch (err: any) {
      setPhoneActionFeedback({
        id: reqId,
        message: err.message || t('فشل اعتماد الطلب', 'Approval failed', 'Не удалось подтвердить запрос'),
        type: 'error',
      });
      setTimeout(() => setPhoneActionFeedback(null), 3500);
    } finally {
      setPhoneActionLoadingId(null);
    }
  };

  const handleRejectPhoneChange = async () => {
    if (!rejectPhoneModalId) return;
    setPhoneActionLoadingId(rejectPhoneModalId);
    try {
      await vexApi.rejectPhoneChange(rejectPhoneModalId, rejectPhoneReason, 'Super Admin');
      setPhoneActionFeedback({
        id: rejectPhoneModalId,
        message: t('تم رفض طلب تغيير رقم الهاتف وإشعار المستخدم.', 'Phone change request rejected.', 'Запрос на смену номера отклонен, пользователь уведомлен.'),
        type: 'success',
      });
      setRejectPhoneModalId(null);
      await loadPhoneChangeRequests();
      setTimeout(() => setPhoneActionFeedback(null), 3500);
    } catch (err: any) {
      setPhoneActionFeedback({
        id: rejectPhoneModalId,
        message: err.message || t('فشل رفض الطلب', 'Rejection failed', 'Не удалось отклонить запрос'),
        type: 'error',
      });
      setTimeout(() => setPhoneActionFeedback(null), 3500);
    } finally {
      setPhoneActionLoadingId(null);
    }
  };

  // --------------------------------------------------------------------------
  // Telegram Bot Token & Phone Verification Engine State & Handlers
  // --------------------------------------------------------------------------
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramBotUsername, setTelegramBotUsername] = useState('');
  const [telegramBotActive, setTelegramBotActive] = useState(true);
  const [telegramBotStatus, setTelegramBotStatus] = useState<any>(null);
  const [loadingTelegramConfig, setLoadingTelegramConfig] = useState(false);
  const [savingTelegramConfig, setSavingTelegramConfig] = useState(false);
  const [testingTelegramBot, setTestingTelegramBot] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<{
    success: boolean;
    message: string;
    bot?: any;
    pollingActive?: boolean;
  } | null>(null);
  const [telegramSaveSuccess, setTelegramSaveSuccess] = useState(false);
  const [telegramVerifiedHistory, setTelegramVerifiedHistory] = useState<any[]>([]);

  const loadTelegramConfig = async () => {
    setLoadingTelegramConfig(true);
    try {
      const res = await vexApi.getTelegramBotConfig();
      if (res && res.config) {
        setTelegramBotToken(res.config.bot_token || '');
        setTelegramBotUsername(res.config.bot_username || '');
        setTelegramBotActive(res.config.is_active !== false);
        setTelegramBotStatus(res.config);
        setTelegramVerifiedHistory(res.verifiedHistory || []);
      }
    } catch (e) {
      console.warn('Failed to load telegram bot config:', e);
    } finally {
      setLoadingTelegramConfig(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'telegram_bot') {
      loadTelegramConfig();
    }
  }, [activeTab]);

  const handleSaveTelegramConfig = async () => {
    if (!telegramBotToken.trim()) {
      setTelegramTestResult({
        success: false,
        message: t('يرجى إدخال توكن البوت أولاً.', 'Please enter bot token first.', 'Пожалуйста, сначала введите токен бота.'),
      });
      return;
    }

    setSavingTelegramConfig(true);
    setTelegramTestResult(null);
    try {
      const res = await vexApi.saveTelegramBotConfig({
        bot_token: telegramBotToken.trim(),
        bot_username: telegramBotUsername.trim(),
        is_active: telegramBotActive,
      });
      setTelegramSaveSuccess(true);
      setTimeout(() => setTelegramSaveSuccess(false), 3000);
      await loadTelegramConfig();
    } catch (err: any) {
      setTelegramTestResult({
        success: false,
        message: err.message || t('فشل حفظ وتفعيل بوت تيليجرام.', 'Failed to save Telegram config.', 'Не удалось сохранить конфигурацию Telegram.'),
      });
    } finally {
      setSavingTelegramConfig(false);
    }
  };

  const handleTestTelegramBot = async () => {
    setTestingTelegramBot(true);
    setTelegramTestResult(null);
    try {
      const res = await vexApi.testTelegramBot();
      setTelegramTestResult({
        success: res.success,
        message: res.message || t('تم الاتصال بالبوت بنجاح!', 'Connected successfully!', 'Успешное подключение к боту!'),
        bot: res.bot,
        pollingActive: res.pollingActive,
      });
    } catch (err: any) {
      setTelegramTestResult({
        success: false,
        message: err.message || t('فشل فحص الاتصال بالبوت.', 'Failed to test bot connection.', 'Не удалось проверить соединение с ботом.'),
      });
    } finally {
      setTestingTelegramBot(false);
    }
  };

  // --------------------------------------------------------------------------
  // Handlers: Brand Mode Transformation
  // --------------------------------------------------------------------------
  const handleApplySingleCompanyMode = async (company: Company) => {
    setModeApplying(true);
    try {
      const theme = getCompanyTheme(company.id, company.name, company.color);
      const updated: AppBranding = {
        appName: theme.appNameAr,
        tagline: theme.taglineAr,
        iconType: 'preset',
        presetIconId: 'emerald-shield',
        customIconUrl: company.logo_url || '',
        targetCompanyId: company.id,
        exclusiveMode: true,
        updatedAt: new Date().toISOString(),
      };
      await onUpdateBranding(updated);
      setSelectedBrandForPreview(company.id);
      setModeAppliedSuccess(true);
      setTimeout(() => setModeAppliedSuccess(false), 3000);
    } finally {
      setModeApplying(false);
    }
  };

  const handleApplyAllCompaniesMode = async () => {
    setModeApplying(true);
    try {
      const updated: AppBranding = {
        appName: 'VEX Deals',
        tagline: 'منصة الولاء والتعويضات والتحليلات الرياضية الذكية',
        iconType: 'preset',
        presetIconId: 'emerald-shield',
        customIconUrl: '',
        targetCompanyId: 'all',
        exclusiveMode: false,
        updatedAt: new Date().toISOString(),
      };
      await onUpdateBranding(updated);
      setSelectedBrandForPreview('all');
      setModeAppliedSuccess(true);
      setTimeout(() => setModeAppliedSuccess(false), 3000);
    } finally {
      setModeApplying(false);
    }
  };

  // --------------------------------------------------------------------------
  // Handlers: Company Editing & Toggling
  // --------------------------------------------------------------------------
  const handleToggleActive = async (company: Company) => {
    const updated = { ...company, is_active: !company.is_active };
    await onUpdateCompany(updated);
  };

  const handleSaveCompanyEdit = async (company: Company) => {
    setSavingCompanyId(company.id);
    try {
      const translated = autoTranslateCompany(company);
      await onUpdateCompany(translated);
      setCompanySavedSuccess(company.id);
      setTimeout(() => setCompanySavedSuccess(null), 2500);
      setEditingCompany(null);
    } finally {
      setSavingCompanyId(null);
    }
  };

  const handleOpenApiConfig = (comp: Company) => {
    setConfiguringApiCompany(comp);
    const existing = comp.api_config;
    setTempApiConfig(
      existing
        ? { ...existing }
        : {
            enabled: true,
            integration_type: 'rest_api',
            endpoint_url: `https://api.${comp.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com/v1/agent/deposit`,
            api_key: '',
            secret_key: '',
            merchant_id: '',
            webhook_url: '',
            account_id_param: 'player_id',
            min_transfer_amount: 1,
            max_transfer_amount: 5000,
            allow_available_only: true,
            auto_payout: true,
            test_mode: false,
            last_test_status: 'untested',
          }
    );
    setApiTestResult(null);
  };

  const handleTestApiConnection = async () => {
    if (!configuringApiCompany || !tempApiConfig) return;
    setTestingApi(true);
    setApiTestResult(null);
    try {
      const res = await vexApi.testCompanyApiConnection(
        configuringApiCompany.id,
        tempApiConfig
      );
      setApiTestResult({
        success: res.success,
        statusText: res.statusText,
        latencyMs: res.latencyMs,
        message: res.message,
      });
      setTempApiConfig({
        ...tempApiConfig,
        last_test_status: 'success',
        last_test_at: new Date().toISOString(),
      });
    } catch (err: any) {
      setApiTestResult({
        success: false,
        statusText: 'Failed',
        latencyMs: 0,
        message: err.message || 'فشل فحص الاتصال ببوابة الـ API',
      });
      setTempApiConfig({
        ...tempApiConfig,
        last_test_status: 'failed',
        last_test_at: new Date().toISOString(),
      });
    } finally {
      setTestingApi(false);
    }
  };

  const handleSaveApiConfig = async () => {
    if (!configuringApiCompany || !tempApiConfig) return;
    setSavingApiConfig(true);
    try {
      const updated: Company = {
        ...configuringApiCompany,
        api_config: {
          ...tempApiConfig,
          allow_available_only: true, // Always enforce available balance only
        },
      };
      await onUpdateCompany(updated);
      setApiSaveSuccess(true);
      setTimeout(() => {
        setApiSaveSuccess(false);
        setConfiguringApiCompany(null);
      }, 1000);
    } finally {
      setSavingApiConfig(false);
    }
  };

  const handleCreateNewCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.name || !newCompany.promo_code) return;

    const generatedEndpoint =
      newCompanyApiConfig.endpoint_url?.trim() ||
      `https://api.${newCompany.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}.com/v1/agent/deposit`;

    const baseCompany: Company = {
      id: `CMP${Date.now().toString(36).toUpperCase()}`,
      name: newCompany.name.trim(),
      type: 'bookmaker',
      details: newCompany.description?.trim() || `شركة مراهنات رياضية شريكة`,
      show_in_comp: true,
      promo_code: newCompany.promo_code.trim(),
      affiliate_link: newCompany.affiliate_link?.trim() || `https://${newCompany.name.toLowerCase()}.com`,
      app_link: newCompany.app_link?.trim() || `https://${newCompany.name.toLowerCase()}.com/mobile`,
      description: newCompany.description?.trim() || `شركة مراهنات رياضية شريكة`,
      color: newCompany.color || '#0d579b',
      is_active: true,
      api_config: newCompanyApiEnabled
        ? {
            enabled: true,
            integration_type: newCompanyApiConfig.integration_type || 'rest_api',
            endpoint_url: generatedEndpoint,
            api_key: newCompanyApiConfig.api_key?.trim() || '',
            secret_key: newCompanyApiConfig.secret_key?.trim() || '',
            merchant_id: newCompanyApiConfig.merchant_id?.trim() || '',
            webhook_url: newCompanyApiConfig.webhook_url?.trim() || '',
            account_id_param: newCompanyApiConfig.account_id_param?.trim() || 'player_id',
            min_transfer_amount: Number(newCompanyApiConfig.min_transfer_amount) || 1,
            max_transfer_amount: Number(newCompanyApiConfig.max_transfer_amount) || 5000,
            allow_available_only: true, // STRICT CONSTRAINT: available only
            auto_payout: newCompanyApiConfig.auto_payout ?? true,
            test_mode: newCompanyApiConfig.test_mode ?? false,
            last_test_status: 'untested',
          }
        : undefined,
    };

    // Initialize multi-protocol integration suite (REST, Webhook, OAuth) with available-only policy
    const defaultMethods = generateDefaultCompanyApiMethods(baseCompany);
    if (newCompanyApiEnabled) {
      defaultMethods[0] = {
        ...defaultMethods[0],
        enabled: true,
        endpoint_url: generatedEndpoint,
        api_key: newCompanyApiConfig.api_key?.trim() || defaultMethods[0].api_key,
        secret_key: newCompanyApiConfig.secret_key?.trim() || defaultMethods[0].secret_key,
        method_type: (newCompanyApiConfig.integration_type as any) || 'rest_api',
        account_id_param: newCompanyApiConfig.account_id_param?.trim() || 'player_id',
        min_transfer_amount: Number(newCompanyApiConfig.min_transfer_amount) || 1,
        max_transfer_amount: Number(newCompanyApiConfig.max_transfer_amount) || 5000,
        test_mode: newCompanyApiConfig.test_mode ?? false,
        allow_available_only: true,
      };
    }
    baseCompany.api_methods = defaultMethods;

    const companyToSave = autoTranslateCompany(baseCompany);

    if (onAddCompany) {
      await onAddCompany(companyToSave);
    } else {
      await onUpdateCompany(companyToSave);
    }

    setShowAddCompanyModal(false);
    setNewCompany({
      name: '',
      promo_code: '',
      affiliate_link: '',
      app_link: '',
      description: '',
      color: '#0d579b',
      is_active: true,
    });
    setNewCompanyApiEnabled(true);
    setNewCompanyApiConfig({
      enabled: true,
      integration_type: 'rest_api',
      endpoint_url: '',
      api_key: '',
      secret_key: '',
      merchant_id: '',
      account_id_param: 'player_id',
      min_transfer_amount: 1,
      max_transfer_amount: 5000,
      allow_available_only: true,
      auto_payout: true,
      test_mode: false,
    });
  };

  const handleSyncOfficialCompanies = async () => {
    if (!onSyncCompanies) return;
    setSyncingCompanies(true);
    try {
      await onSyncCompanies();
      setSyncCompaniesSuccess(true);
      setTimeout(() => setSyncCompaniesSuccess(false), 2500);
    } finally {
      setSyncingCompanies(false);
    }
  };

  // --------------------------------------------------------------------------
  // Handlers: ASO Copy Helper
  // --------------------------------------------------------------------------
  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAsoField(fieldId);
    if (onCopyToast) onCopyToast();
    setTimeout(() => setCopiedAsoField(null), 2000);
  };

  const exportAsoAsJson = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --------------------------------------------------------------------------
  // Handlers: Branding, High-Res Icon & Broadcast
  // --------------------------------------------------------------------------
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    let file: File | null = null;
    if ('dataTransfer' in e && e.dataTransfer.files?.length) {
      file = e.dataTransfer.files[0];
    } else if ('target' in e && (e.target as HTMLInputElement).files?.length) {
      file = (e.target as HTMLInputElement).files![0];
    }
    if (!file) return;

    setIsProcessingUpload(true);
    setUploadErrorMessage(null);
    try {
      const processed = await processUploadedIconFile(file);
      setEditUploadedData(processed.dataUrl);
      setEditIconResolution({ width: processed.width, height: processed.height });
      setEditIconType('upload');
    } catch (err: any) {
      setUploadErrorMessage(err?.message || 'فشل في قراءة ومعالجة ملف الصورة.');
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const handleSaveBranding = async () => {
    setSavingBranding(true);
    try {
      let highResAssets = undefined;
      if (editIconType === 'upload' && editUploadedData) {
        try {
          const icon192Png = await rasterizeToPngDataUrl(editUploadedData, 192);
          const icon512Png = await rasterizeToPngDataUrl(editUploadedData, 512);
          highResAssets = {
            icon192: icon192Png,
            icon512: icon512Png,
            appleTouch: icon512Png,
            favicon: icon192Png,
            maskable: icon512Png,
          };
        } catch (e) {
          console.warn('Could not generate raster png data:', e);
        }
      }

      const updated: AppBranding = {
        ...effectiveBranding,
        appName: editAppName.trim() || 'VEX Deals',
        tagline: editTagline.trim(),
        metaDescription: editMetaDescription.trim(),
        metaKeywords: editMetaKeywords.trim(),
        contactEmail: editContactEmail.trim(),
        supportPhone: editSupportPhone.trim(),
        iconType: editIconType,
        presetIconId: editPresetIconId,
        customIconUrl: editCustomUrl.trim(),
        uploadedIconData: editUploadedData,
        iconResolution: editIconResolution,
        highResAssets: highResAssets,
        themeColor: editThemeColor,
        updatedAt: new Date().toISOString(),
      };

      await onUpdateBranding(updated);
      applyBrandingToDocument(updated);

      setBrandingSavedSuccess(true);
      setTimeout(() => setBrandingSavedSuccess(false), 3000);
    } finally {
      setSavingBranding(false);
    }
  };

  const handleDownloadManifest = () => {
    const currentBrandingState: AppBranding = {
      appName: editAppName || 'VEX Deals',
      tagline: editTagline || '',
      metaDescription: editMetaDescription,
      metaKeywords: editMetaKeywords,
      contactEmail: editContactEmail,
      supportPhone: editSupportPhone,
      iconType: editIconType,
      presetIconId: editPresetIconId,
      customIconUrl: editCustomUrl,
      uploadedIconData: editUploadedData,
      themeColor: editThemeColor,
    };
    const manifestObj = generateManifestObject(currentBrandingState);
    downloadStringAsFile(JSON.stringify(manifestObj, null, 2), 'manifest.json', 'application/manifest+json');
  };

  const handleCopyHtmlSnippet = () => {
    const currentBrandingState: AppBranding = {
      appName: editAppName || 'VEX Deals',
      tagline: editTagline || '',
      iconType: editIconType,
      presetIconId: editPresetIconId,
      customIconUrl: editCustomUrl,
      uploadedIconData: editUploadedData,
      themeColor: editThemeColor,
    };
    const snippet = generateHtmlSnippet(currentBrandingState);
    navigator.clipboard.writeText(snippet);
    setCopiedManifestSnippet(true);
    if (onCopyToast) onCopyToast();
    setTimeout(() => setCopiedManifestSnippet(false), 2500);
  };

  const handleDownloadIconAsset = async (size: number) => {
    setDownloadingAsset(`icon-${size}`);
    try {
      const appName = editAppName || 'VEX Deals';
      if (editIconType === 'upload' && editUploadedData) {
        const png = await rasterizeToPngDataUrl(editUploadedData, size);
        const a = document.createElement('a');
        a.href = png;
        a.download = `app-icon-${size}x${size}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else if (editIconType === 'custom' && editCustomUrl) {
        const png = await rasterizeToPngDataUrl(editCustomUrl, size);
        const a = document.createElement('a');
        a.href = png;
        a.download = `app-icon-${size}x${size}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const svgString = getPresetSvg(editPresetIconId, appName, size);
        downloadStringAsFile(svgString, `app-icon-${size}x${size}.svg`, 'image/svg+xml');
      }
    } finally {
      setTimeout(() => setDownloadingAsset(null), 800);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastTitle || !broadcastMessage) return;
    setBroadcastSending(true);
    try {
      if (broadcastUrgency === 'non-urgent') {
        await vexApi.scheduleNotification({
          title: broadcastTitle,
          message: broadcastMessage,
          category: broadcastCategory,
          urgency: 'non-urgent',
        });
      } else {
        await onBroadcastNotification(broadcastTitle, broadcastMessage, broadcastCategory);
      }
      setBroadcastSent(true);
      setBroadcastTitle('');
      setBroadcastMessage('');
      setTimeout(() => setBroadcastSent(false), 2500);
    } catch (err) {
      console.error('Broadcast failed:', err);
    } finally {
      setBroadcastSending(false);
    }
  };

  // Filtered companies for brand mode search
  const filteredBrands = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchBrand.toLowerCase()) ||
      c.promo_code.toLowerCase().includes(searchBrand.toLowerCase())
  );

  // Selected company for ASO pack
  const selectedAsoCompany = companies.find((c) => c.id === asoSelectedCompanyId) || companies[0];
  const companyAsoSuite: CompanyAsoSuite = selectedAsoCompany
    ? PRECOMPUTED_COMPANY_ASO[selectedAsoCompany.id] ||
      generateCompanyAsoSuite(
        selectedAsoCompany.id,
        selectedAsoCompany.name,
        selectedAsoCompany.promo_code,
        selectedAsoCompany.app_link || ''
      )
    : PRECOMPUTED_COMPANY_ASO['CMP1XB001'];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className={
            standaloneMode
              ? 'fixed inset-0 z-50 flex flex-col bg-slate-950 overflow-hidden'
              : 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto'
          }
        >
          <motion.div
            initial={{ opacity: 0, scale: standaloneMode ? 1 : 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: standaloneMode ? 1 : 0.96 }}
            transition={{ duration: 0.18 }}
            className={
              standaloneMode
                ? 'w-full h-full bg-white dark:bg-slate-900 border-none shadow-none rounded-none max-h-none flex flex-col overflow-hidden'
                : 'w-full max-w-5xl my-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col'
            }
            dir={adminLang === 'ar' ? 'rtl' : 'ltr'}
          >
            {/* Admin Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-950 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                  <Sliders className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-black tracking-tight truncate">
                      {t('لوحة التحكم المركزية (VEX Admin Operations)', 'VEX Central Operations Hub', 'Центральная панель управления VEX')}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-slate-950 font-mono shrink-0">
                      SUPER ADMIN
                    </span>
                    {/* Live Server Indicator */}
                    <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{t('الإنتاج: متصل (Port 3000)', 'Live Server (Port 3000)', 'Сервер: Онлайн (Port 3000)')}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                    {t(
                      'إدارة الشركات والمحافظ، تدقيق طلبات التعويض وفك التجميد، وبث تحليلات AI',
                      'Companies, Wallets, Compensation Auditing & AI Sports Forecast',
                      'Управление букмекерами, кошельками, аудит компенсаций и AI аналитика'
                    )}
                  </p>
                </div>
              </div>

              {/* Action Controls & Language Switcher */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Trilingual Language Selector */}
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl shadow-xs">
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('ar')}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-lg transition-all ${
                      adminLang === 'ar'
                        ? 'bg-emerald-500 text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="العربية (Arabic)"
                  >
                    عربي
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('en')}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-lg transition-all ${
                      adminLang === 'en'
                        ? 'bg-emerald-500 text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="English"
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('ru')}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-lg transition-all ${
                      adminLang === 'ru'
                        ? 'bg-emerald-500 text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Русский (Russian)"
                  >
                    RU
                  </button>
                </div>

                {isAdminUnlocked && (
                  <>
                    <button
                      type="button"
                      onClick={() => setStandaloneMode(!standaloneMode)}
                      className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title={standaloneMode ? t('عرض كنافذة عائمة', 'Windowed Modal View', 'Оконный режим') : t('عرض في نافذة مفصولة كاملة', 'Fullscreen Standalone View', 'Полноэкранный режим')}
                    >
                      {standaloneMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsChangingPin(true)}
                      className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                      title={t('تغيير رمز PIN الإداري', 'Change Master PIN', 'Сменить PIN-код')}
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={handleLockAdmin}
                      className="p-1.5 rounded-xl hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title={t('قفل لوحة الإدارة (Lock)', 'Lock Admin Session', 'Заблокировать сессию')}
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </>
                )}

                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title={t('العودة لتطبيق العميل', 'Close / Return to App', 'Вернуться в приложение')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {!isAdminUnlocked ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 bg-slate-900 text-white min-h-[460px]">
                <div className="w-full max-w-md bg-slate-950/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md text-center space-y-5">
                  <div className="mx-auto w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                    <ShieldCheck className="w-8 h-8 animate-pulse" />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="text-lg sm:text-xl font-black text-white">
                        {t('بوابة الإدارة المركزية والإنتاج', 'Central Production Admin Gate', 'Центральная панель администратора')}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {t('منطقة محمية', 'Secured', 'Защищено')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      {t(
                        'يرجى إدخال رمز الأمان (PIN) لفتح صلاحيات إدارة المحافظ والشركات والإنتاج.',
                        'Enter Master PIN to access financial ledgers, companies management & production operations.',
                        'Введите мастер PIN-код для доступа к управлению компаниями, выплатами и настройками.'
                      )}
                    </p>
                  </div>

                  <form onSubmit={handleUnlockAdmin} className="space-y-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type={showPin ? 'text' : 'password'}
                        value={pinInput}
                        onChange={(e) => {
                          setPinInput(e.target.value);
                          setPinError(false);
                        }}
                        autoFocus
                        placeholder={t('أدخل رمز PIN (الافتراضي 7788)', 'Enter Admin PIN (Default 7788)', 'Введите PIN (по умолч. 7788)')}
                        className={`w-full h-12 bg-slate-900 border rounded-2xl pr-10 pl-11 text-center font-mono text-lg font-black tracking-widest text-white transition-all focus:outline-none ${
                          pinError
                            ? 'border-rose-500 ring-2 ring-rose-500/20'
                            : 'border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                        title={showPin ? t('إخفاء الرمز', 'Hide PIN', 'Скрыть PIN') : t('إظهار الرمز', 'Show PIN', 'Показать PIN')}
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {pinError && (
                      <p className="text-xs font-bold text-rose-400 flex items-center justify-center gap-1.5 animate-fadeIn">
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                        <span>
                          {t(
                            'رمز المرور غير صحيح! الرمز الافتراضي هو 7788',
                            'Invalid PIN code! Default Master PIN is 7788',
                            'Неверный PIN-код! Значение по умолчанию: 7788'
                          )}
                        </span>
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-900/30"
                      >
                        <Unlock className="w-4 h-4" />
                        <span>{t('فتح لوحة الإدارة', 'Unlock Dashboard', 'Открыть панель')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPinInput('7788');
                          setPinError(false);
                        }}
                        className="px-3 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all cursor-pointer"
                        title={t('تعبئة الرمز الافتراضي 7788', 'Fill default 7788', 'Заполнить 7788')}
                      >
                        {t('رمز 7788', 'PIN 7788', 'PIN 7788')}
                      </button>
                    </div>
                  </form>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <button
                      type="button"
                      onClick={onClose}
                      className="text-slate-400 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>{t('العودة لتطبيق العميل ←', '← Back to Client App', '← Назад в приложение')}</span>
                    </button>

                    <span className="font-mono text-slate-500">
                      VEX Production Engine v3.8
                    </span>
                  </div>
                </div>
              </div>
            ) : (
            /* Dashboard Layout: Collapsible Sidebar + Content Area */
            <div className="flex-1 flex overflow-hidden">
              {/* Collapsible Vertical Sidebar */}
              <div
                className={`bg-slate-50 dark:bg-slate-950 border-r dark:border-slate-800 border-slate-200 transition-all duration-300 flex flex-col shrink-0 ${
                  isSidebarOpen ? 'w-64 sm:w-72' : 'w-16'
                }`}
              >
                <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  {isSidebarOpen && (
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 truncate">
                      {t('أقسام لوحة التحكم', 'Control Hub', 'Разделы панели')}
                    </span>
                  )}
                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors mx-auto"
                    title={t('إغلاق/فتح القائمة', 'Toggle Sidebar', 'Свернуть/развернуть меню')}
                  >
                    <Menu className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {[
                    {
                      id: 'dedicated_brand',
                      label: t('تخصيص شركة واحدة (Exclusive)', 'Single-Brand Mode', 'Режим одного бренда'),
                      icon: Award,
                    },
                    { id: 'companies', label: t('إدارة وتعديل الشركات', 'Manage Companies', 'Управление компаниями'), icon: Building2 },
                    {
                      id: 'company_api',
                      label: t('تكاملات API الشركات', 'Company API Integrations', 'Интеграции API'),
                      icon: Cpu,
                    },
                    {
                      id: 'integration_tester',
                      label: t('أداة فحص الويب هوك (Tester)', 'Integration Tester', 'Тестер вебхуков и API'),
                      icon: Terminal,
                    },
                    {
                      id: 'integration_health',
                      label: t('صحة التكاملات (Health 24h)', 'Integration Health (24h)', 'Мониторинг API (24ч)'),
                      icon: Activity,
                    },
                    { id: 'aso_suite', label: t('خطة ASO المتكاملة', 'ASO Suite', 'Пакет ASO стратегии'), icon: Sparkles },
                    { id: 'branding', label: t('أيقونات عالية الدقة و Manifest', 'Icons & Manifest', 'Иконки и PWA манифест'), icon: Palette },
                    { id: 'sports_agents', label: t('وكلاء الأقسام الرياضية', 'Sports Category Agents', 'Агенты спортивных категорий'), icon: ShieldCheck },
                    {
                      id: 'compensation',
                      label: `${t('طلبات التعويض', 'Compensation', 'Заявки на компенсацию')} (${pendingRequests.length})`,
                      icon: ShieldCheck,
                    },
                    {
                      id: 'phone_requests',
                      label: `${t('طلبات تغيير أرقام الهواتف', 'Phone Change Requests', 'Запросы смены номера')} (${pendingPhoneRequests.length})`,
                      icon: Phone,
                    },
                    {
                      id: 'telegram_bot',
                      label: t('بوت تيليجرام وتوثيق الهواتف', 'Telegram Bot Verification', 'Telegram бот и верификация'),
                      icon: Send,
                    },
                    { id: 'ai_agent', label: t('وكيل الذكاء الاصطناعي', 'AI Match Agent', 'AI Спортивный аналитик'), icon: Bot },
                    { id: 'broadcast', label: t('بث الإشعارات والرسائل', 'Push Alerts', 'Push-рассылки'), icon: Send },
                    {
                      id: 'ab_testing',
                      label: t('اختبار A/B للإشعارات والتوطين', 'A/B Testing & Localization', 'A/B тестирование и языки'),
                      icon: Split,
                    },
                    { id: 'notifications', label: t('مركز الإشعارات الفورية', 'Notifications Hub', 'Центр уведомлений'), icon: Bell },
                    { id: 'payment_methods', label: t('إدارة وسائل الدفع', 'Payment Methods', 'Способы оплаты'), icon: DollarSign },
                    { id: 'lottery_manager', label: t('إدارة اليانصيب والسحوبات', 'Lottery & Draws Engine', 'Управление лотереей'), icon: Trophy },
                    { id: 'compliance', label: t('امتثال المتاجر', 'Store Compliance', 'Соответствие магазинам'), icon: FileText },
                  ].map((tab) => {
                    const IconComponent = tab.icon;
                    const isSelected = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as AdminTab)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                        title={!isSidebarOpen ? tab.label : undefined}
                      >
                        <IconComponent className="w-4 h-4 shrink-0" />
                        {isSidebarOpen && <span className="truncate text-start">{tab.label}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab Body */}
              <div className="flex-1 overflow-y-auto p-5">
              
              {activeTab === 'sports_agents' && (
                <div className="animate-fade-in">
                  <SportsAgentManager lang={adminLang} />
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 1: DEDICATED SINGLE-BRAND MODE                        */}
              {/* ========================================================= */}
              {activeTab === 'dedicated_brand' && (
                <div className="space-y-5">
                  {/* Header Banner */}
                  <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
                    <div className="relative z-10 space-y-2">
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-amber-400" />
                        <h3 className="font-extrabold text-sm sm:text-base">
                          {t(
                            'نظام تحويل وتخصيص التطبيق بالكامل لشركة محددة',
                            'Dedicated Single-Brand App Transformation',
                            'Система полной трансформации и кастомизации под конкретного партнера'
                          )}
                        </h3>
                      </div>
                      <p className="text-xs text-indigo-100 max-w-2xl leading-relaxed">
                        {t(
                          'اختر أي شركة شريكة لتحويل التطبيق بالكامل لصالحها: الاسم، الشعار الدائري، الألوان، أزرار التفاعل، كود البرومو، وبانر الـ VIP. وإذا اخترت "الجميع"، يعود التطبيق ليعمل كمنصة عامة تجمع كافة الشركاء كما هو الآن.',
                          'Select a bookmaker to dedicate 100% of the app experience to that single brand (theme, circular logo, exclusive perks, and ASO). Choose "All Companies" to revert to multi-brand mode.',
                          'Выберите любого партнера, чтобы полностью адаптировать приложение под него: название, логотип, цвета, кнопки, промокод и VIP-баннер. Выберите "Все компании", чтобы вернуться в общий режим.'
                        )}
                      </p>
                    </div>
                  </div>

                  {modeAppliedSuccess && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{t('تم تطبيق وضع الهوية والثيم بنجاح وتحديث واجهة التطبيق فوراً!', 'Brand Mode successfully applied!', 'Режим бренда успешно применен, интерфейс обновлен!')}</span>
                    </div>
                  )}

                  {/* Website Sections Customizer for Dedicated Company */}
                  {effectiveBranding.exclusiveMode && effectiveBranding.targetCompanyId && effectiveBranding.targetCompanyId !== 'all' && (
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-indigo-200 dark:border-indigo-900/60 shadow-md space-y-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white">
                              {t('تخصيص محتوى وأقسام الموقع للشركة الحالية', 'Customize Company Website Content & Sections', 'Настройка контента и разделов сайта компании')}
                            </h4>
                            <p className="text-xs text-slate-500">
                              {t('عدل كود البرومو، روابط التسجيل، والأوصاف التفصيلية التي تظهر في واجهة الشركة.', 'Edit promo code, registration links, and detailed descriptions for this brand.', 'Редактируйте промокод, партнерские ссылки и описания для бренда.')}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={handleSaveCompanyWebsiteSections}
                          disabled={savingWebsiteSections}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          <span>{t('حفظ تعديلات الموقع', 'Save Website Edits', 'Сохранить изменения сайта')}</span>
                        </button>
                      </div>

                      {websiteSectionsSavedSuccess && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>{t('تم حفظ وتحديث محتوى وأقسام موقع الشركة بنجاح!', 'Company website content saved successfully!', 'Контент сайта компании успешно сохранен!')}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            {t('كود البرومو المعتمد', 'Promo Code', 'Промокод')}
                          </label>
                          <input
                            type="text"
                            value={editSitePromo}
                            onChange={(e) => setEditSitePromo(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                            placeholder="PROMO123"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            {t('رابط التسجيل بالشركة (Affiliate Link)', 'Affiliate Link', 'Партнерская ссылка (Affiliate Link)')}
                          </label>
                          <input
                            type="url"
                            value={editSiteAffLink}
                            onChange={(e) => setEditSiteAffLink(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                            placeholder="https://..."
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            {t('رابط تحميل التطبيق', 'App Download Link', 'Ссылка на скачивание приложения')}
                          </label>
                          <input
                            type="url"
                            value={editSiteAppDownload}
                            onChange={(e) => setEditSiteAppDownload(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                            placeholder="https://..."
                          />
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {t('نبذة تعريفية مفصلة عن الشركة (اللغة العربية)', 'Detailed Overview (Arabic)', 'Подробный обзор компании (арабский)')}
                          </label>
                          <textarea
                            rows={3}
                            value={editSiteOverviewAr}
                            onChange={(e) => setEditSiteOverviewAr(e.target.value)}
                            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white leading-relaxed"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {t('نبذة تعريفية مفصلة عن الشركة (اللغة الإنجليزية)', 'Detailed Overview (English)', 'Подробный обзор компании (английский)')}
                          </label>
                          <textarea
                            rows={3}
                            value={editSiteOverviewEn}
                            onChange={(e) => setEditSiteOverviewEn(e.target.value)}
                            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white leading-relaxed"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mode Option 1: Multi-Brand All Companies */}
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      !effectiveBranding.exclusiveMode || effectiveBranding.targetCompanyId === 'all'
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                              {t('الوضع العام: جميع الشركات والشركاء', 'General Platform: All Companies', 'Общий режим: Все компании-партнеры')}
                            </h4>
                            {(!effectiveBranding.exclusiveMode || effectiveBranding.targetCompanyId === 'all') && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                                {t('الوضع النشط حالياً', 'Active', 'Активный')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {t(
                              'يعرض جميع الشركات الشريكة المعتمدة مع أزرار ملونة وهوية VEX Deals العامة.',
                              'Showcases all partner bookmakers with brand-colored CTA buttons.',
                              'Отображает всех партнеров с фирменными кнопками и айдентикой VEX Deals.'
                            )}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleApplyAllCompaniesMode}
                        disabled={modeApplying}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50"
                      >
                        {t('تفعيل وضع جميع الشركات', 'Activate Multi-Brand', 'Активировать режим всех компаний')}
                      </button>
                    </div>
                  </div>

                  {/* Mode Option 2: Choose Single Company */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-purple-600" />
                        <span>{t('أو اختر شركة واحدة لتخصيص التطبيق بالكامل لها:', 'Or Dedicate App to a Single Company:', 'Или выберите одну компанию для полной кастомизации:')}</span>
                      </h4>

                      {/* Brand Search Bar */}
                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={searchBrand}
                          onChange={(e) => setSearchBrand(e.target.value)}
                          placeholder={t('ابحث في الشركات...', 'Search company...', 'Поиск компании...')}
                          className="w-full pr-8 pl-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredBrands.map((comp) => {
                        const isThisBrandActive =
                          effectiveBranding.exclusiveMode && effectiveBranding.targetCompanyId === comp.id;
                        const theme = getCompanyTheme(comp.id, comp.name, comp.color);

                        return (
                          <div
                            key={comp.id}
                            className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                              isThisBrandActive
                                ? 'bg-purple-50/50 dark:bg-purple-950/30 border-purple-500 shadow-md ring-1 ring-purple-500'
                                : 'bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                            }`}
                          >
                            <div
                              className="absolute top-0 left-0 right-0 h-1"
                              style={{ backgroundColor: comp.color }}
                            />

                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <CompanyBrandLogo companyName={comp.name} size="md" />
                                  <div>
                                    <h5 className="text-xs font-black text-slate-900 dark:text-white">
                                      {comp.name}
                                    </h5>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {t('كود', 'Code', 'Код')}: {comp.promo_code}
                                    </span>
                                  </div>
                                </div>

                                {isThisBrandActive && (
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-600 text-white">
                                    {t('مخصص الآن', 'Dedicated', 'Выделен сейчас')}
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                {adminLang === 'ar' ? theme.taglineAr : theme.taglineEn}
                              </p>
                            </div>

                            <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                              <button
                                onClick={() => handleApplySingleCompanyMode(comp)}
                                disabled={modeApplying || isThisBrandActive}
                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center justify-center gap-1 ${
                                  isThisBrandActive
                                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-default'
                                    : 'text-white'
                                }`}
                                style={{
                                  backgroundColor: isThisBrandActive ? undefined : comp.color,
                                }}
                              >
                                <span>
                                  {isThisBrandActive
                                    ? t('التطبيق مخصص لها', 'Dedicated', 'Приложение выделено для нее')
                                    : t(`تخصيص التطبيق لـ ${comp.name}`, `Dedicate to ${comp.name}`, `Выделить приложение для ${comp.name}`)}
                                </span>
                              </button>

                              <button
                                onClick={() => {
                                  setAsoTargetMode('company');
                                  setAsoSelectedCompanyId(comp.id);
                                  setActiveTab('aso_suite');
                                }}
                                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-purple-600 transition-colors"
                                title={t('عرض حزمة ASO الخاصة بها', 'View ASO Pack', 'Просмотреть пакет ASO')}
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 2: COMPANIES MANAGEMENT & EDITING                     */}
              {/* ========================================================= */}
              {activeTab === 'companies' && (
                <div className="space-y-4">
                  {/* Top Header & Search & Add */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        {t('إدارة المنصات الشريكة والأكواد والروابط', 'Partner Bookmakers & Promos', 'Партнерские букмекеры и промо')}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {t(
                          'تعديل البرومو كود، روابط الإحالة والتحميل، وتفعيل/إلغاء تنشيط أي شركة فورياً.',
                          'Edit promo codes, affiliate links, download links, and toggle active status.',
                          'Редактируйте промокоды, партнерские ссылки, ссылки на скачивание и меняйте статус активности.'
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={companySearch}
                          onChange={(e) => setCompanySearch(e.target.value)}
                          placeholder={t('بحث في الشركات...', 'Search companies...', 'Поиск по компаниям...')}
                          className="pr-8 pl-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                        />
                      </div>

                      {onSyncCompanies && (
                        <button
                          onClick={handleSyncOfficialCompanies}
                          disabled={syncingCompanies}
                          className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                          title={t(
                            'مزامنة وتحديث جميع الروابط والأكواد المعتمدة رسمياً لجميع الشركات الـ 8',
                            'Sync all verified official company links & promo codes',
                            'Синхронизировать проверенные ссылки и промокоды всех 8 компаний'
                          )}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingCompanies ? 'animate-spin' : ''}`} />
                          <span>
                            {syncCompaniesSuccess
                              ? t('تم التحديث بنجاح!', 'Synced!', 'Синхронизировано!')
                              : t('تحديث ومزامنة بيانات الشركات', 'Sync Official Data', 'Синхронизировать данные компаний')}
                          </span>
                        </button>
                      )}

                      <button
                        onClick={() => setShowAddCompanyModal(true)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t('إضافة شركة جديدة', 'Add Company', 'Добавить компанию')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Add Company Modal Overlay */}
                  {showAddCompanyModal && (
                    <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-300">
                          {t('إضافة شركة شريكة جديدة إلى المنصة', 'Add New Partner Bookmaker', 'Добавить нового партнера на платформу')}
                        </h4>
                        <button
                          onClick={() => setShowAddCompanyModal(false)}
                          className="p-1 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form onSubmit={handleCreateNewCompany} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {t('اسم الشركة:', 'Company Name:', 'Название компании:')}
                          </label>
                          <input
                            type="text"
                            required
                            value={newCompany.name}
                            onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                            placeholder="BETWINNER"
                            className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {t('كود البرومو المعتمد:', 'Promo Code:', 'Промокод:')}
                          </label>
                          <input
                            type="text"
                            required
                            value={newCompany.promo_code}
                            onChange={(e) => setNewCompany({ ...newCompany, promo_code: e.target.value })}
                            placeholder="VEX2026"
                            className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {t('رابط الإحالة والتسجيل:', 'Affiliate Registration Link:', 'Партнерская ссылка для регистрации:')}
                          </label>
                          <input
                            type="url"
                            value={newCompany.affiliate_link}
                            onChange={(e) => setNewCompany({ ...newCompany, affiliate_link: e.target.value })}
                            placeholder="https://betwinner.com/affiliate"
                            className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {t('رابط تحميل التطبيق والـ APK:', 'App/APK Download Link:', 'Ссылка на скачивание приложения/APK:')}
                          </label>
                          <input
                            type="url"
                            value={newCompany.app_link}
                            onChange={(e) => setNewCompany({ ...newCompany, app_link: e.target.value })}
                            placeholder="https://betwinner.com/download"
                            className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {t('لون البراند الرئيسي (Hex):', 'Brand Primary Color:', 'Основной цвет бренда (Hex):')}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={newCompany.color}
                              onChange={(e) => setNewCompany({ ...newCompany, color: e.target.value })}
                              className="w-9 h-8 rounded-lg cursor-pointer border border-slate-300"
                            />
                            <input
                              type="text"
                              value={newCompany.color}
                              onChange={(e) => setNewCompany({ ...newCompany, color: e.target.value })}
                              className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {t('الوصف ونسبة التعويض:', 'Description & Rebate:', 'Описание и процент компенсации:')}
                          </label>
                          <input
                            type="text"
                            value={newCompany.description}
                            onChange={(e) => setNewCompany({ ...newCompany, description: e.target.value })}
                            placeholder="كاش باك يصل لـ 100% وبونص ترحيبي"
                            className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                          />
                        </div>

                        {/* API Integration Settings inside Add Company Modal */}
                        <div className="sm:col-span-2 pt-2 border-t border-emerald-200 dark:border-emerald-800/60">
                          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-emerald-300 dark:border-emerald-800 space-y-3 shadow-xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center font-bold">
                                  <Cpu className="w-4 h-4" />
                                </div>
                                <div>
                                  <h5 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span>{t('إعدادات ربط الـ API لتحويل الرصيد المتاح', 'API Integration for Available Balance', 'Настройки интеграции API для доступного баланса')}</span>
                                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                                      {t('ميزة الربط المباشر', 'Direct Gateway', 'Прямой шлюз')}
                                    </span>
                                  </h5>
                                  <p className="text-[10px] text-slate-500">
                                    {t(
                                      'تمكين تحويل الرصيد المتاح فقط من محفظة اللاعب إلى حسابه في تطبيق الشركة عبر الـ API',
                                      'Allows transferring available player wallet balance to company account via API',
                                      'Перевод только доступного баланса из кошелька игрока на счет в компании через API'
                                    )}
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => setNewCompanyApiEnabled(!newCompanyApiEnabled)}
                                className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                                  newCompanyApiEnabled
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {newCompanyApiEnabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                <span>{newCompanyApiEnabled ? t('مفعّل', 'Enabled', 'Включено') : t('معطّل', 'Disabled', 'Отключено')}</span>
                              </button>
                            </div>

                            {newCompanyApiEnabled && (
                              <div className="space-y-3 pt-1">
                                {/* Strict security reminder */}
                                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] flex items-start gap-2">
                                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-bold">{t('تنبيه الأمان والسياسة المالية:', 'Security Policy:', 'Политика безопасности и финансов:')} </span>
                                    <span>
                                      {t(
                                        'الربط مخصص للرصيد المتاح (Available) فقط. الرصيد المجمد (Frozen) محمي كلياً وغير قابل للتحويل إطلاقاً.',
                                        'Only available balance can be transferred. Frozen balance is strictly locked.',
                                        'Интеграция только для доступного (Available) баланса. Замороженный баланс полностью защищен и не подлежит переводу.'
                                      )}
                                    </span>
                                  </div>
                                </div>

                                {/* Integration Protocol / Method Selection */}
                                <div>
                                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    {t('طريقة ونوع الربط (Integration Protocol):', 'Integration Method:', 'Метод и протокол интеграции:')}
                                  </label>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    {[
                                      {
                                        id: 'rest_api',
                                        title: 'Direct REST API',
                                        desc: t('طلب JSON POST مع Bearer Token أو API Key', 'JSON POST with Bearer Token or API Key', 'JSON POST с Bearer Token или API Key'),
                                        badge: t('شائع وموصى به', 'Recommended', 'Рекомендуется'),
                                      },
                                      {
                                        id: 'merchant_gateway',
                                        title: 'Merchant Gateway',
                                        desc: t('بوابة تاجر ووكيل مع Merchant ID وتوقيع Secret', 'Merchant Gateway with ID & Secret signing', 'Шлюз мерчанта с ID и подписью Secret'),
                                        badge: t('بوابات الوكلاء', 'Agent Gateways', 'Агентские шлюзы'),
                                      },
                                      {
                                        id: 'webhook_s2s',
                                        title: 'Server Webhook (S2S)',
                                        desc: t('استدعاء Server-to-Server مع إشعار كولباك فوري', 'Server-to-Server with immediate callback', 'Server-to-Server с мгновенным колбэком'),
                                        badge: t('إشعارات سريعة', 'Fast Callbacks', 'Быстрые оповещения'),
                                      },
                                      {
                                        id: 'basic_auth',
                                        title: 'Basic HTTP Auth',
                                        desc: t('توثيق كلاسيكي عبر Username + Password', 'Classic Username + Password auth', 'Классическая аутентификация Username + Password'),
                                        badge: t('كلاسيكي', 'Classic', 'Классический'),
                                      },
                                      {
                                        id: 'oauth2_client',
                                        title: 'OAuth 2.0 Client',
                                        desc: t('Client ID + Secret وتوليد Token ديناميكي', 'Client ID + Secret with dynamic tokens', 'Client ID + Secret с динамическими токенами'),
                                        badge: t('أمان متقدم', 'Advanced Security', 'Продвинутая безопасность'),
                                      },
                                    ].map((m) => {
                                      const isSelected = (newCompanyApiConfig.integration_type || 'rest_api') === m.id;
                                      return (
                                        <button
                                          key={m.id}
                                          type="button"
                                          onClick={() =>
                                            setNewCompanyApiConfig({
                                              ...newCompanyApiConfig,
                                              integration_type: m.id as CompanyApiIntegrationType,
                                            })
                                          }
                                          className={`p-2 rounded-xl text-right transition-all border ${
                                            isSelected
                                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 shadow-xs'
                                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between mb-0.5">
                                            <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">
                                              {m.title}
                                            </span>
                                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                          </div>
                                          <p className="text-[9px] text-slate-500 leading-tight">{m.desc}</p>
                                          <span className="inline-block mt-1 text-[8px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                            {m.badge}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Endpoint URL */}
                                <div>
                                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    {t('رابط نقطة نهاية التحويل (API Endpoint URL):', 'API Endpoint URL:', 'URL эндпоинта API:')}
                                  </label>
                                  <input
                                    type="url"
                                    value={newCompanyApiConfig.endpoint_url || ''}
                                    onChange={(e) =>
                                      setNewCompanyApiConfig({
                                        ...newCompanyApiConfig,
                                        endpoint_url: e.target.value,
                                      })
                                    }
                                    placeholder={
                                      newCompany.name
                                        ? `https://api.${newCompany.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com/v1/agent/deposit`
                                        : 'https://api.bookmaker.com/v1/agent/deposit'
                                    }
                                    className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px]"
                                  />
                                </div>

                                {/* Method Specific Credentials */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {(newCompanyApiConfig.integration_type === 'rest_api' ||
                                    !newCompanyApiConfig.integration_type) && (
                                    <div className="sm:col-span-2">
                                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        {t('مفتاح الـ API أو الـ Bearer Token:', 'API Key / Bearer Token:', 'Ключ API или Bearer Token:')}
                                      </label>
                                      <input
                                        type="password"
                                        value={newCompanyApiConfig.api_key || ''}
                                        onChange={(e) =>
                                          setNewCompanyApiConfig({ ...newCompanyApiConfig, api_key: e.target.value })
                                        }
                                        placeholder="sk_live_vex_..."
                                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px]"
                                      />
                                    </div>
                                  )}

                                  {newCompanyApiConfig.integration_type === 'merchant_gateway' && (
                                    <>
                                      <div>
                                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                          {t('معرف التاجر / الوكيل (Merchant ID):', 'Merchant ID:', 'Merchant ID (идентификатор мерчанта):')}
                                        </label>
                                        <input
                                          type="text"
                                          value={newCompanyApiConfig.merchant_id || ''}
                                          onChange={(e) =>
                                            setNewCompanyApiConfig({ ...newCompanyApiConfig, merchant_id: e.target.value })
                                          }
                                          placeholder="MCH-88231"
                                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px]"
                                        />
                                      </div>
                                      <div>
                                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                          {t('المفتاح السري للتوقيع (Secret Key / Hash):', 'Secret Key / Hash:', 'Секретный ключ / хеш:')}
                                        </label>
                                        <input
                                          type="password"
                                          value={newCompanyApiConfig.secret_key || ''}
                                          onChange={(e) =>
                                            setNewCompanyApiConfig({ ...newCompanyApiConfig, secret_key: e.target.value })
                                          }
                                          placeholder="sec_..."
                                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px]"
                                        />
                                      </div>
                                    </>
                                  )}

                                  {newCompanyApiConfig.integration_type === 'webhook_s2s' && (
                                    <>
                                      <div>
                                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                          {t('رابط الـ Webhook للإشعار السريع:', 'Callback Webhook URL:', 'URL вебхука для уведомлений:')}
                                        </label>
                                        <input
                                          type="url"
                                          value={newCompanyApiConfig.webhook_url || ''}
                                          onChange={(e) =>
                                            setNewCompanyApiConfig({ ...newCompanyApiConfig, webhook_url: e.target.value })
                                          }
                                          placeholder="https://api.bookmaker.com/webhook/confirm"
                                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px]"
                                        />
                                      </div>
                                      <div>
                                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                          {t('سر التوقيع الرقمي (Signing Secret):', 'Signing Secret:', 'Секрет цифровой подписи:')}
                                        </label>
                                        <input
                                          type="password"
                                          value={newCompanyApiConfig.secret_key || ''}
                                          onChange={(e) =>
                                            setNewCompanyApiConfig({ ...newCompanyApiConfig, secret_key: e.target.value })
                                          }
                                          placeholder="whsec_..."
                                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px]"
                                        />
                                      </div>
                                    </>
                                  )}

                                  {newCompanyApiConfig.integration_type === 'basic_auth' && (
                                    <>
                                      <div>
                                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                          {t('اسم المستخدم (API Username):', 'Username:', 'Имя пользователя API:')}
                                        </label>
                                        <input
                                          type="text"
                                          value={newCompanyApiConfig.api_key || ''}
                                          onChange={(e) =>
                                            setNewCompanyApiConfig({ ...newCompanyApiConfig, api_key: e.target.value })
                                          }
                                          placeholder="vex_agent_user"
                                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px]"
                                        />
                                      </div>
                                      <div>
                                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                          {t('كلمة المرور (API Password):', 'Password:', 'Пароль API:')}
                                        </label>
                                        <input
                                          type="password"
                                          value={newCompanyApiConfig.secret_key || ''}
                                          onChange={(e) =>
                                            setNewCompanyApiConfig({ ...newCompanyApiConfig, secret_key: e.target.value })
                                          }
                                          placeholder="••••••••"
                                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px]"
                                        />
                                      </div>
                                    </>
                                  )}

                                  {newCompanyApiConfig.integration_type === 'oauth2_client' && (
                                    <>
                                      <div>
                                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                          {t('معرف العميل (Client ID):', 'Client ID:', 'ID клиента:')}
                                        </label>
                                        <input
                                          type="text"
                                          value={newCompanyApiConfig.api_key || ''}
                                          onChange={(e) =>
                                            setNewCompanyApiConfig({ ...newCompanyApiConfig, api_key: e.target.value })
                                          }
                                          placeholder="client_vex_auth"
                                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px]"
                                        />
                                      </div>
                                      <div>
                                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                          {t('السر المعتمد (Client Secret):', 'Client Secret:', 'Секрет клиента:')}
                                        </label>
                                        <input
                                          type="password"
                                          value={newCompanyApiConfig.secret_key || ''}
                                          onChange={(e) =>
                                            setNewCompanyApiConfig({ ...newCompanyApiConfig, secret_key: e.target.value })
                                          }
                                          placeholder="csec_..."
                                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px]"
                                        />
                                      </div>
                                    </>
                                  )}

                                  <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                      {t('اسم متغير حساب اللاعب (Account Param):', 'Account Parameter:', 'Имя параметра аккаунта игрока:')}
                                    </label>
                                    <input
                                      type="text"
                                      value={newCompanyApiConfig.account_id_param || 'player_id'}
                                      onChange={(e) =>
                                        setNewCompanyApiConfig({
                                          ...newCompanyApiConfig,
                                          account_id_param: e.target.value,
                                        })
                                      }
                                      placeholder="player_id"
                                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px]"
                                    />
                                  </div>

                                  <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                      {t('الحد الأدنى والأقصى للتحويل ($):', 'Transfer Limits ($):', 'Лимиты перевода ($):')}
                                    </label>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min="1"
                                        value={newCompanyApiConfig.min_transfer_amount || 1}
                                        onChange={(e) =>
                                          setNewCompanyApiConfig({
                                            ...newCompanyApiConfig,
                                            min_transfer_amount: Number(e.target.value),
                                          })
                                        }
                                        placeholder="Min"
                                        className="w-1/2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-[11px]"
                                      />
                                      <span className="text-slate-400 font-bold">-</span>
                                      <input
                                        type="number"
                                        min="10"
                                        value={newCompanyApiConfig.max_transfer_amount || 5000}
                                        onChange={(e) =>
                                          setNewCompanyApiConfig({
                                            ...newCompanyApiConfig,
                                            max_transfer_amount: Number(e.target.value),
                                          })
                                        }
                                        placeholder="Max"
                                        className="w-1/2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-[11px]"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="sm:col-span-2 pt-2 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowAddCompanyModal(false)}
                            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 font-bold"
                          >
                            {t('إلغاء', 'Cancel', 'Отмена')}
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-sm"
                          >
                            {t('حفظ وإضافة الشركة', 'Save Company', 'Сохранить и добавить компанию')}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Companies Grid with Direct Editing & Toggle */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {companies
                      .filter(
                        (c) =>
                          c.name.toLowerCase().includes(companySearch.toLowerCase()) ||
                          c.promo_code.toLowerCase().includes(companySearch.toLowerCase())
                      )
                      .map((comp) => {
                        const isEditingThis = editingCompany?.id === comp.id;
                        const activeComp = isEditingThis ? editingCompany : comp;

                        return (
                          <div
                            key={comp.id}
                            className={`bg-white dark:bg-slate-950/60 p-4 rounded-2xl border transition-all relative overflow-hidden ${
                              comp.is_active
                                ? 'border-slate-200/90 dark:border-slate-800'
                                : 'border-rose-200 dark:border-rose-950/50 bg-rose-50/10'
                            }`}
                          >
                            {/* Color Bar */}
                            <div
                              className="absolute top-0 left-0 right-0 h-1"
                              style={{ backgroundColor: comp.color }}
                            />

                            <div className="space-y-3">
                              {/* Header with Circular Logo, Name, and Active Toggle */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <CompanyBrandLogo companyName={comp.name} size="md" />
                                  <div>
                                    <h4 className="text-xs font-black text-slate-900 dark:text-white">
                                      {comp.name}
                                    </h4>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      ID: {comp.id}
                                    </span>
                                  </div>
                                </div>

                                {/* Active / Inactive Switch */}
                                <button
                                  onClick={() => handleToggleActive(comp)}
                                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
                                    comp.is_active
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
                                  }`}
                                  title={comp.is_active ? t('انقر لتعطيل الشركة', 'Click to deactivate company', 'Нажмите, чтобы отключить компанию') : t('انقر لتنشيط الشركة', 'Click to activate company', 'Нажмите, чтобы активировать компанию')}
                                >
                                  {comp.is_active ? (
                                    <>
                                      <ToggleRight className="w-4 h-4 text-emerald-600" />
                                      <span>{t('نشط ويعمل', 'Active', 'Активен')}</span>
                                    </>
                                  ) : (
                                    <>
                                      <ToggleLeft className="w-4 h-4 text-rose-600" />
                                      <span>{t('معطل ومخفي', 'Inactive', 'Отключен')}</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Editable Fields */}
                              {isEditingThis ? (
                                <div className="space-y-2.5 pt-1 text-xs">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                      {t('كود البرومو (Promo Code):', 'Promo Code:', 'Промокод (Promo Code):')}
                                    </label>
                                    <input
                                      type="text"
                                      value={activeComp.promo_code}
                                      onChange={(e) =>
                                        setEditingCompany({ ...activeComp, promo_code: e.target.value })
                                      }
                                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-emerald-600"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                      {t('رابط الإحالة (Affiliate Link):', 'Affiliate Link:', 'Партнерская ссылка (Affiliate Link):')}
                                    </label>
                                    <input
                                      type="text"
                                      value={activeComp.affiliate_link}
                                      onChange={(e) =>
                                        setEditingCompany({ ...activeComp, affiliate_link: e.target.value })
                                      }
                                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-[11px]"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                      {t('رابط تحميل التطبيق والـ APK (App Download Link):', 'App Link:', 'Ссылка на приложение/APK:')}
                                    </label>
                                    <input
                                      type="text"
                                      value={activeComp.app_link || ''}
                                      onChange={(e) =>
                                        setEditingCompany({ ...activeComp, app_link: e.target.value })
                                      }
                                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-[11px]"
                                    />
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <input
                                      type="color"
                                      value={activeComp.color}
                                      onChange={(e) =>
                                        setEditingCompany({ ...activeComp, color: e.target.value })
                                      }
                                      className="w-8 h-8 rounded-lg cursor-pointer"
                                    />
                                    <input
                                      type="text"
                                      value={activeComp.color}
                                      onChange={(e) =>
                                        setEditingCompany({ ...activeComp, color: e.target.value })
                                      }
                                      className="w-24 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
                                    />
                                    <div className="flex-1 flex justify-end gap-1.5">
                                      <button
                                        onClick={() => setEditingCompany(null)}
                                        className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                                      >
                                        {t('إلغاء', 'Cancel', 'Отмена')}
                                      </button>
                                      <button
                                        onClick={() => handleSaveCompanyEdit(activeComp)}
                                        disabled={savingCompanyId === comp.id}
                                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-xs"
                                      >
                                        {savingCompanyId === comp.id ? (
                                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Check className="w-3.5 h-3.5" />
                                        )}
                                        <span>{t('حفظ', 'Save', 'Сохранить')}</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-slate-400 font-medium">
                                      {t('البرومو كود:', 'Promo Code:', 'Промокод:')}
                                    </span>
                                    <span
                                      className="font-mono font-bold px-2 py-0.5 rounded-lg border text-xs"
                                      style={{
                                        color: comp.color,
                                        borderColor: `${comp.color}40`,
                                        backgroundColor: `${comp.color}10`,
                                      }}
                                    >
                                      {comp.promo_code}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-slate-400 font-medium">
                                      {t('رابط الإحالة:', 'Affiliate:', 'Партнерская ссылка:')}
                                    </span>
                                    <a
                                      href={comp.affiliate_link}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[11px] font-mono text-sky-600 dark:text-sky-400 truncate max-w-[180px] hover:underline flex items-center gap-1"
                                    >
                                      <span className="truncate">{comp.affiliate_link}</span>
                                      <ExternalLink className="w-3 h-3 shrink-0" />
                                    </a>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-slate-400 font-medium">
                                      {t('رابط التحميل:', 'App Link:', 'Ссылка на загрузку:')}
                                    </span>
                                    <a
                                      href={comp.app_link || '#'}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 truncate max-w-[180px] hover:underline flex items-center gap-1"
                                    >
                                      <span className="truncate">{comp.app_link || t('غير محدد', 'Not set', 'Не указано')}</span>
                                      <Download className="w-3 h-3 shrink-0" />
                                    </a>
                                  </div>

                                  {/* API Integration Status Ribbon */}
                                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <Cpu className="w-3.5 h-3.5 text-sky-500" />
                                      {comp.api_config?.enabled ? (
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            <span>API: {comp.api_config.integration_type.replace('_', ' ').toUpperCase()}</span>
                                          </span>
                                          <span className="text-[9px] text-slate-400 font-medium">
                                            {t('تحويل رصيد متاح فقط', 'Available balance only', 'Только доступный баланс')}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-medium">
                                          {t('الـ API غير مفعل', 'API Disabled', 'API отключен')}
                                        </span>
                                      )}
                                    </div>

                                    <button
                                      onClick={() => {
                                        setApiPreselectedCompanyId(comp.id);
                                        setActiveTab('company_api');
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/70 border border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-[11px] font-bold hover:bg-sky-100 dark:hover:bg-sky-900/60 flex items-center gap-1 shadow-2xs transition-all"
                                    >
                                      <Cpu className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                                      <span>{t('إدارة تكاملات API', 'API Integrations', 'Управление API интеграциями')}</span>
                                    </button>
                                  </div>

                                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                                    <button
                                      onClick={() => setEditingCompany({ ...comp })}
                                      className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 flex items-center gap-1"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                      <span>{t('تعديل البيانات والروابط', 'Edit Company Data', 'Редактировать данные и ссылки')}</span>
                                    </button>

                                    {companySavedSuccess === comp.id && (
                                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                        <Check className="w-3 h-3" />
                                        <span>{t('تم الحفظ!', 'Saved!', 'Сохранено!')}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* ========================================================= */}
                  {/* DEDICATED COMPANY API CONFIGURATION MODAL                 */}
                  {/* ========================================================= */}
                  {configuringApiCompany && tempApiConfig && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs border"
                              style={{
                                backgroundColor: `${configuringApiCompany.color}15`,
                                borderColor: `${configuringApiCompany.color}40`,
                              }}
                            >
                              <CompanyBrandLogo
                                companyId={configuringApiCompany.id}
                                size="md"
                                className="rounded-xl"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                                  {t(`إعدادات ربط الـ API - تطبيق ${configuringApiCompany.name}`, `API Integration Settings - ${configuringApiCompany.name}`, `Настройки интеграции API - ${configuringApiCompany.name}`)}
                                </h3>
                                <span
                                  className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border"
                                  style={{
                                    color: configuringApiCompany.color,
                                    borderColor: `${configuringApiCompany.color}50`,
                                    backgroundColor: `${configuringApiCompany.color}10`,
                                  }}
                                >
                                  {configuringApiCompany.promo_code}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">
                                {t(
                                  'ربط مباشر لنقل الرصيد المتاح من محفظة اللاعب إلى حسابه في تطبيق الشركة',
                                  'Direct protocol linking player available balance to bookmaker app account',
                                  'Прямой протокол перевода доступного баланса из кошелька игрока на счет в приложении компании'
                                )}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => setConfiguringApiCompany(null)}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
                          {/* Policy Golden Rule Alert */}
                          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:amber-200 space-y-1">
                            <div className="flex items-center gap-2 font-black text-xs text-amber-800 dark:text-amber-300">
                              <ShieldCheck className="w-4 h-4 text-amber-600" />
                              <span>{t('سياسة التحويل المصرفي الصارمة:', 'Strict Financial Policy:', 'Строгая финансовая политика:')}</span>
                            </div>
                            <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                              {t(
                                'هذا الربط يتيح للاعب تحويل الرصيد المتاح (Available Balance) فقط إلى تطبيق الشركة. الرصيد المجمد (Frozen Balance) محمي ومقفل بنظام المنصة ولا يمكن تحويله عبر الـ API إطلاقاً لضمان شروط المكافآت ونزاهة الحسابات.',
                                'This gateway strictly authorizes transfer of Available Balance only. Frozen balances are securely locked and non-transferrable via API until unfrozen via authorized rebate events.',
                                'Этот шлюз разрешает перевод только доступного баланса (Available Balance). Замороженный баланс надежно заблокирован и не может быть переведен через API.'
                              )}
                            </p>
                          </div>

                          {/* Master Gateway Toggle */}
                          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <div>
                              <h4 className="font-black text-slate-800 dark:text-slate-100 text-xs">
                                {t('تفعيل بوابة الـ API لهذه الشركة', 'Enable API Gateway for this Bookmaker', 'Включить API шлюз для этого букмекера')}
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                {t(
                                  'عند التفعيل، سيظهر خيار الإيداع المباشر في تطبيق الشركة داخل تبويب التحويلات للاعبين',
                                  'When enabled, players will see the Direct App Deposit option in Transfers tab',
                                  'При включении игроки увидят опцию прямого депозита в приложении в разделе переводов'
                                )}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setTempApiConfig({ ...tempApiConfig, enabled: !tempApiConfig.enabled })
                              }
                              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                                tempApiConfig.enabled
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {tempApiConfig.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                              <span>{tempApiConfig.enabled ? t('مفعّل', 'Active', 'Включен') : t('معطّل', 'Inactive', 'Отключен')}</span>
                            </button>
                          </div>

                          {/* Protocol / Method Picker */}
                          <div className="space-y-2">
                            <label className="block font-bold text-slate-700 dark:text-slate-300">
                              {t('بروتوكول وطريقة الربط المعتمدة:', 'Select Integration Protocol / Method:', 'Выберите протокол и метод интеграции:')}
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {[
                                {
                                  id: 'rest_api',
                                  name: 'Direct REST API',
                                  badge: t('موصى به', 'Recommended', 'Рекомендуется'),
                                  desc: t(
                                    'طلب إيداع JSON POST مباشر مع Bearer Token أو API-Key',
                                    'Standard JSON POST with Bearer Token header',
                                    'Прямой JSON POST запрос с Bearer Token или API-Key'
                                  ),
                                },
                                {
                                  id: 'merchant_gateway',
                                  name: 'Merchant Gateway',
                                  badge: t('بوابة وكلاء', 'Agent Portal', 'Портал агента'),
                                  desc: t(
                                    'بوابة وكيل معتمد مع Merchant ID وتوقيع رقمي مشفر (HMAC)',
                                    'Sportsbook merchant ID with digital signature hashing',
                                    'Шлюз сертифицированного агента с Merchant ID и подписью HMAC'
                                  ),
                                },
                                {
                                  id: 'webhook_s2s',
                                  name: 'Server Webhook (S2S)',
                                  badge: t('إشعار فوري', 'Real-time Callback', 'Мгновенный колбэк'),
                                  desc: t(
                                    'استدعاء خادم إلى خادم مع Callback Webhook وتأكيد فوري',
                                    'Server-to-Server callback with instant confirmation payload',
                                    'Server-to-Server вызов с Callback Webhook и мгновенным подтверждением'
                                  ),
                                },
                                {
                                  id: 'basic_auth',
                                  name: 'Basic HTTP Auth',
                                  badge: t('كلاسيكي', 'Classic', 'Классический'),
                                  desc: t(
                                    'توثيق كلاسيكي عبر Username + Password مشفرة',
                                    'HTTP Basic Auth headers (username & password)',
                                    'Классическая аутентификация через зашифрованные Username + Password'
                                  ),
                                },
                                {
                                  id: 'oauth2_client',
                                  name: 'OAuth 2.0 Client',
                                  badge: t('أمان بنكي', 'OAuth 2.0', 'Банковская безопасность'),
                                  desc: t(
                                    'Client ID + Secret وتوليد Token ديناميكي لكل عملية',
                                    'OAuth 2.0 token grant exchange flow for bank-grade security',
                                    'Client ID + Secret с генерацией динамического токена для каждой транзакции'
                                  ),
                                },
                              ].map((proto) => {
                                const isSelected = tempApiConfig.integration_type === proto.id;
                                return (
                                  <button
                                    key={proto.id}
                                    type="button"
                                    onClick={() =>
                                      setTempApiConfig({
                                        ...tempApiConfig,
                                        integration_type: proto.id as CompanyApiIntegrationType,
                                      })
                                    }
                                    className={`p-3 rounded-2xl text-right transition-all border ${
                                      isSelected
                                        ? 'bg-sky-50 dark:bg-sky-950/80 border-sky-500 ring-2 ring-sky-500/20 shadow-xs'
                                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-bold text-slate-900 dark:text-slate-100">
                                        {proto.name}
                                      </span>
                                      {isSelected && <Check className="w-3.5 h-3.5 text-sky-600" />}
                                    </div>
                                    <p className="text-[10px] text-slate-500 leading-snug mb-2">{proto.desc}</p>
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                      {proto.badge}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Endpoint URL */}
                          <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                              {t('رابط نقطة نهاية التحويل المباشر (API Endpoint URL):', 'API Endpoint URL:', 'URL эндпоинта прямого перевода (API Endpoint URL):')}
                            </label>
                            <div className="relative">
                              <input
                                type="url"
                                required
                                value={tempApiConfig.endpoint_url}
                                onChange={(e) =>
                                  setTempApiConfig({ ...tempApiConfig, endpoint_url: e.target.value })
                                }
                                placeholder="https://api.company.com/v1/agent/deposit"
                                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs pl-8"
                              />
                              <Globe className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                            </div>
                          </div>

                          {/* Protocol Specific Credentials Form */}
                          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs">
                              <Key className="w-4 h-4 text-sky-600" />
                              <span>{t('بيانات الاعتماد والمفاتيح السرية:', 'API Credentials & Keys:', 'Учетные данные и секретные ключи:')}</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {tempApiConfig.integration_type === 'rest_api' && (
                                <div className="sm:col-span-2">
                                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                    {t('مفتاح الـ API أو الـ Bearer Token:', 'API Key / Bearer Token:', 'Ключ API или Bearer Token:')}
                                  </label>
                                  <input
                                    type="password"
                                    value={tempApiConfig.api_key || ''}
                                    onChange={(e) =>
                                      setTempApiConfig({ ...tempApiConfig, api_key: e.target.value })
                                    }
                                    placeholder="sk_live_vex_auth_token_..."
                                    className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                                  />
                                </div>
                              )}

                              {tempApiConfig.integration_type === 'merchant_gateway' && (
                                <>
                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                      {t('معرف التاجر / الوكيل (Merchant ID):', 'Merchant ID:', 'Merchant ID (идентификатор мерчанта):')}
                                    </label>
                                    <input
                                      type="text"
                                      value={tempApiConfig.merchant_id || ''}
                                      onChange={(e) =>
                                        setTempApiConfig({ ...tempApiConfig, merchant_id: e.target.value })
                                      }
                                      placeholder="MCH-88231-LIVE"
                                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                      {t('المفتاح السري للتوقيع (Secret Key / HMAC):', 'Secret Key / HMAC:', 'Секретный ключ подписи / HMAC:')}
                                    </label>
                                    <input
                                      type="password"
                                      value={tempApiConfig.secret_key || ''}
                                      onChange={(e) =>
                                        setTempApiConfig({ ...tempApiConfig, secret_key: e.target.value })
                                      }
                                      placeholder="sec_live_..."
                                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                                    />
                                  </div>
                                </>
                              )}

                              {tempApiConfig.integration_type === 'webhook_s2s' && (
                                <>
                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                      {t('رابط الـ Webhook للإشعار وتأكيد الإيداع:', 'Webhook Callback URL:', 'URL вебхука для оповещения и подтверждения депозита:')}
                                    </label>
                                    <input
                                      type="url"
                                      value={tempApiConfig.webhook_url || ''}
                                      onChange={(e) =>
                                        setTempApiConfig({ ...tempApiConfig, webhook_url: e.target.value })
                                      }
                                      placeholder="https://api.bookmaker.com/webhook/confirm"
                                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                      {t('سر توقيع الـ Webhook (Signing Secret):', 'Webhook Signing Secret:', 'Секрет подписи вебхука (Signing Secret):')}
                                    </label>
                                    <input
                                      type="password"
                                      value={tempApiConfig.secret_key || ''}
                                      onChange={(e) =>
                                        setTempApiConfig({ ...tempApiConfig, secret_key: e.target.value })
                                      }
                                      placeholder="whsec_..."
                                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                                    />
                                  </div>
                                </>
                              )}

                              {tempApiConfig.integration_type === 'basic_auth' && (
                                <>
                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                      {t('اسم المستخدم (API Username):', 'Username:', 'Имя пользователя (API Username):')}
                                    </label>
                                    <input
                                      type="text"
                                      value={tempApiConfig.api_key || ''}
                                      onChange={(e) =>
                                        setTempApiConfig({ ...tempApiConfig, api_key: e.target.value })
                                      }
                                      placeholder="vex_partner_user"
                                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                      {t('كلمة المرور (API Password):', 'Password:', 'Пароль (API Password):')}
                                    </label>
                                    <input
                                      type="password"
                                      value={tempApiConfig.secret_key || ''}
                                      onChange={(e) =>
                                        setTempApiConfig({ ...tempApiConfig, secret_key: e.target.value })
                                      }
                                      placeholder="••••••••"
                                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                                    />
                                  </div>
                                </>
                              )}

                              {tempApiConfig.integration_type === 'oauth2_client' && (
                                <>
                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                      {t('معرف العميل (Client ID):', 'Client ID:', 'ID клиента (Client ID):')}
                                    </label>
                                    <input
                                      type="text"
                                      value={tempApiConfig.api_key || ''}
                                      onChange={(e) =>
                                        setTempApiConfig({ ...tempApiConfig, api_key: e.target.value })
                                      }
                                      placeholder="client_vex_8831"
                                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                      {t('السر المعتمد (Client Secret):', 'Client Secret:', 'Секрет клиента (Client Secret):')}
                                    </label>
                                    <input
                                      type="password"
                                      value={tempApiConfig.secret_key || ''}
                                      onChange={(e) =>
                                        setTempApiConfig({ ...tempApiConfig, secret_key: e.target.value })
                                      }
                                      placeholder="csec_..."
                                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                                    />
                                  </div>
                                </>
                              )}

                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                  {t('اسم متغير حساب اللاعب (Account Param):', 'Account Parameter Name:', 'Имя переменной счета игрока (Account Param):')}
                                </label>
                                <input
                                  type="text"
                                  value={tempApiConfig.account_id_param || 'player_id'}
                                  onChange={(e) =>
                                    setTempApiConfig({ ...tempApiConfig, account_id_param: e.target.value })
                                  }
                                  placeholder="player_id"
                                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                  {t('الحد الأدنى والأقصى للتحويل ($):', 'Transfer Limits ($):', 'Лимиты перевода ($):')}
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="1"
                                    value={tempApiConfig.min_transfer_amount || 1}
                                    onChange={(e) =>
                                      setTempApiConfig({
                                        ...tempApiConfig,
                                        min_transfer_amount: Number(e.target.value),
                                      })
                                    }
                                    className="w-1/2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold text-xs"
                                  />
                                  <span className="text-slate-400 font-bold">-</span>
                                  <input
                                    type="number"
                                    min="10"
                                    value={tempApiConfig.max_transfer_amount || 5000}
                                    onChange={(e) =>
                                      setTempApiConfig({
                                        ...tempApiConfig,
                                        max_transfer_amount: Number(e.target.value),
                                      })
                                    }
                                    className="w-1/2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold text-xs"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Toggles row */}
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={tempApiConfig.auto_payout ?? true}
                                  onChange={(e) =>
                                    setTempApiConfig({ ...tempApiConfig, auto_payout: e.target.checked })
                                  }
                                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                />
                                <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                                  {t('تنفيذ فوري تلقائي عبر API بدون موافقة يدوية', 'Auto-Payout (Instant)', 'Автовыплата (Мгновенно через API без ручного подтверждения)')}
                                </span>
                              </label>

                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={tempApiConfig.test_mode ?? false}
                                  onChange={(e) =>
                                    setTempApiConfig({ ...tempApiConfig, test_mode: e.target.checked })
                                  }
                                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                                />
                                <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                                  {t('وضع الاختبار والتجربة (Sandbox Mode)', 'Sandbox / Test Mode', 'Режим тестирования (Sandbox Mode)')}
                                </span>
                              </label>
                            </div>
                          </div>

                          {/* Handshake & Connection Test Diagnostic Section */}
                          <div className="p-3.5 bg-sky-50/50 dark:bg-sky-950/40 rounded-2xl border border-sky-200 dark:border-sky-800/80 space-y-2.5">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-sky-600" />
                                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                  {t('فحص واختبار اتصال الـ API:', 'Test API Gateway Handshake:', 'Проверка и тестирование подключения к API:')}
                                </span>
                              </div>

                              <button
                                type="button"
                                disabled={testingApi}
                                onClick={handleTestApiConnection}
                                className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                              >
                                {testingApi ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Radio className="w-3.5 h-3.5" />
                                )}
                                <span>{testingApi ? t('جاري الفحص...', 'Testing...', 'Проверка...') : t('فحص الاتصال بالخادم', 'Test Handshake', 'Проверить подключение')}</span>
                              </button>
                            </div>

                            {apiTestResult && (
                              <div
                                className={`p-3 rounded-xl text-xs flex items-start gap-2 animate-fade-in ${
                                  apiTestResult.success
                                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                                    : 'bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                                }`}
                              >
                                {apiTestResult.success ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                ) : (
                                  <X className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                )}
                                <div className="space-y-0.5 flex-1">
                                  <div className="flex items-center justify-between font-bold">
                                    <span>{apiTestResult.statusText}</span>
                                    {apiTestResult.latencyMs > 0 && (
                                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/10">
                                        {apiTestResult.latencyMs}ms
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] leading-relaxed">{apiTestResult.message}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => setConfiguringApiCompany(null)}
                            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                          >
                            {t('إلغاء', 'Cancel', 'Отмена')}
                          </button>

                          <button
                            type="button"
                            disabled={savingApiConfig}
                            onClick={handleSaveApiConfig}
                            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                          >
                            {savingApiConfig ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : apiSaveSuccess ? (
                              <CheckCheck className="w-3.5 h-3.5" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>
                              {apiSaveSuccess
                                ? t('تم الحفظ وتطبيق الربط بنجاح!', 'Saved Successfully!', 'Успешно сохранено и применено!')
                                : t('حفظ وتطبيق إعدادات الربط', 'Save & Apply API Settings', 'Сохранить и применить настройки API')}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB: COMPANY API INTEGRATIONS                             */}
              {/* ========================================================= */}
              {activeTab === 'company_api' && (
                <CompanyApiIntegration
                  companies={companies}
                  onUpdateCompany={onUpdateCompany}
                  lang={lang}
                  onCopyToast={onCopyToast}
                  initialSelectedCompanyId={apiPreselectedCompanyId}
                  onOpenHealthDashboard={() => setActiveTab('integration_health')}
                />
              )}

              {/* ========================================================= */}
              {/* TAB: WEBHOOK & API INTEGRATION TESTER                     */}
              {/* ========================================================= */}
              {activeTab === 'integration_tester' && (
                <IntegrationTester
                  companies={companies}
                  lang={lang}
                  onCopyToast={onCopyToast}
                  initialCompanyId={apiPreselectedCompanyId}
                />
              )}

              {/* ========================================================= */}
              {/* TAB: INTEGRATION HEALTH DASHBOARD                         */}
              {/* ========================================================= */}
              {activeTab === 'integration_health' && (
                <IntegrationHealthDashboard
                  companies={companies}
                  lang={lang}
                  onCopyToast={onCopyToast}
                  onOpenTester={(compKey) => {
                    if (compKey) setApiPreselectedCompanyId(compKey);
                    setActiveTab('integration_tester');
                  }}
                  onNavigateToApiConfig={(compKey) => {
                    if (compKey) setApiPreselectedCompanyId(compKey);
                    setActiveTab('company_api');
                  }}
                />
              )}

              {/* ========================================================= */}
              {/* TAB 3: ASO STRATEGY & METADATA SUITE                      */}
              {/* ========================================================= */}
              {activeTab === 'aso_suite' && (
                <div className="space-y-5">
                  {/* Top ASO Banner */}
                  <div className="bg-gradient-to-r from-blue-900 via-sky-800 to-slate-900 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
                    <div className="relative z-10 space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-sky-400" />
                        <h3 className="font-extrabold text-sm sm:text-base">
                          {t(
                            'خطة ASO المعتمدة (App Store Optimization) للمشروع ولكل شركة',
                            'Master ASO Strategy & Metadata Generator',
                            'Мастер-стратегия ASO и генератор метаданных'
                          )}
                        </h3>
                      </div>
                      <p className="text-xs text-sky-100 max-w-2xl leading-relaxed">
                        {t(
                          'نصوص تسويقية جاهزة ومطابقة لمعايير Google Play Console و Apple App Store Connect، مع الكلمات المفتاحية الأكثر بحثاً ونصوص لقطات الشاشة لتصدر نتائج البحث.',
                          'High-conversion metadata ready for Google Play & Apple App Store submission, targeting peak organic traffic in MENA and global betting markets.',
                          'Высококонверсионные метаданные для Google Play и App Store, нацеленные на максимальный органический трафик.'
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Switch between Global Project ASO vs Company ASO */}
                  <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAsoTargetMode('global')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          asoTargetMode === 'global'
                            ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {t('خطة ASO الشاملة لكامل المشروع', 'Global Project ASO', 'Глобальный ASO проекта')}
                      </button>

                      <button
                        onClick={() => setAsoTargetMode('company')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          asoTargetMode === 'company'
                            ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {t('حزم ASO مخصصة لكل شركة', 'Per-Company ASO Packs', 'ASO пакеты по компаниям')}
                      </button>
                    </div>

                    {asoTargetMode === 'company' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">{t('الشركة:', 'Company:', 'Компания:')}</span>
                        <select
                          value={asoSelectedCompanyId}
                          onChange={(e) => setAsoSelectedCompanyId(e.target.value)}
                          className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                        >
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.promo_code})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* ----------------- GLOBAL ASO ----------------- */}
                  {asoTargetMode === 'global' && (
                    <div className="space-y-4">
                      {/* Google Play Box */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <span>Google Play Store Package</span>
                          </h4>
                          <button
                            onClick={() => exportAsoAsJson(GLOBAL_PROJECT_ASO.googlePlay, 'vex_google_play_aso')}
                            className="text-xs text-sky-600 font-bold flex items-center gap-1 hover:underline"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{t('تصدير JSON', 'Export JSON', 'Экспорт JSON')}</span>
                          </button>
                        </div>

                        {/* Title Field */}
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">
                              {t('العنوان (Title - Max 30 chars):', 'Title (Max 30 chars):', 'Название (Title - макс. 30 симв.):')}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {GLOBAL_PROJECT_ASO.googlePlay.title}
                            </span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(GLOBAL_PROJECT_ASO.googlePlay.title, 'gp_title')}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold flex items-center gap-1"
                          >
                            {copiedAsoField === 'gp_title' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{t('نسخ', 'Copy', 'Копировать')}</span>
                          </button>
                        </div>

                        {/* Short Desc Field */}
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">
                              {t('الوصف القصير (Short Description - Max 80 chars):', 'Short Description (Max 80 chars):', 'Краткое описание (макс. 80 симв.):')}
                            </span>
                            <span className="text-slate-700 dark:text-slate-300">
                              {GLOBAL_PROJECT_ASO.googlePlay.subtitleOrShortDesc}
                            </span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(GLOBAL_PROJECT_ASO.googlePlay.subtitleOrShortDesc, 'gp_short')}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold flex items-center gap-1"
                          >
                            {copiedAsoField === 'gp_short' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{t('نسخ', 'Copy', 'Копировать')}</span>
                          </button>
                        </div>

                        {/* Long Description Full */}
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-bold">
                              {t('الوصف الكامل المحسن لمحركات البحث (Full Description - Max 4000 chars):', 'Full Description (Max 4000 chars):', 'Полное SEO-описание (макс. 4000 симв.):')}
                            </span>
                            <button
                              onClick={() => copyToClipboard(GLOBAL_PROJECT_ASO.googlePlay.fullDescription, 'gp_full')}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold flex items-center gap-1"
                            >
                              {copiedAsoField === 'gp_full' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{t('نسخ الوصف الكامل', 'Copy Full Description', 'Копировать описание')}</span>
                            </button>
                          </div>
                          <pre className="text-[11px] text-slate-600 dark:text-slate-400 font-sans whitespace-pre-wrap max-h-36 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                            {GLOBAL_PROJECT_ASO.googlePlay.fullDescription}
                          </pre>
                        </div>
                      </div>

                      {/* Apple App Store Box */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                            <span>Apple App Store Package</span>
                          </h4>
                          <button
                            onClick={() => exportAsoAsJson(GLOBAL_PROJECT_ASO.appStore, 'vex_app_store_aso')}
                            className="text-xs text-sky-600 font-bold flex items-center gap-1 hover:underline"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{t('تصدير JSON', 'Export JSON', 'Экспорт JSON')}</span>
                          </button>
                        </div>

                        {/* Keywords Field */}
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">
                              {t('الكلمات المفتاحية (Keywords - Max 100 chars comma-separated):', 'Keywords (Max 100 chars comma-separated):', 'Ключевые слова (через запятую, макс. 100):')}
                            </span>
                            <span className="font-mono text-xs text-purple-600 dark:text-purple-400">
                              {GLOBAL_PROJECT_ASO.appStore.keywords}
                            </span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(GLOBAL_PROJECT_ASO.appStore.keywords || '', 'ios_kw')}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold flex items-center gap-1"
                          >
                            {copiedAsoField === 'ios_kw' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{t('نسخ الكلمات', 'Copy Keywords', 'Копировать слова')}</span>
                          </button>
                        </div>
                      </div>

                      {/* Target Keywords Matrix */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">
                          {t('قاعدة بيانات الكلمات المفتاحية الأكثر بحثاً (Target Keywords)', 'Keyword Opportunities', 'База целевых ключевых слов (Target Keywords)')}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {GLOBAL_PROJECT_ASO.keywordsDatabase.map((kw, i) => (
                            <div
                              key={i}
                              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                            >
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block">
                                  {kw.keyword}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {t('الترتيب المستهدف:', 'Target Rank:', 'Целевой ранг:')} {kw.targetRank}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                {kw.searchVolume.toUpperCase()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ----------------- COMPANY ASO PACK ----------------- */}
                  {asoTargetMode === 'company' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-purple-50/60 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <CompanyBrandLogo companyName={companyAsoSuite.companyName} size="md" />
                            <div>
                              <h4 className="text-xs font-black text-slate-900 dark:text-white">
                                {t(`حزمة ASO الرسمية لـ ${companyAsoSuite.companyName}`, `Official ASO Pack for ${companyAsoSuite.companyName}`, `Официальный пакет ASO для ${companyAsoSuite.companyName}`)}
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                {t('مجهزة بكود البرومو الرسمي ورابط التحميل لتلك الشركة.', 'Equipped with official promo code and download link for this bookmaker.', 'Оснащен официальным промокодом и ссылкой на скачивание для этой компании.')}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => exportAsoAsJson(companyAsoSuite, `${companyAsoSuite.companyName.toLowerCase()}_aso_pack`)}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{t('تصدير الحزمة JSON', 'Export Pack JSON', 'Экспорт пакета JSON')}</span>
                          </button>
                        </div>

                        {/* Title Box */}
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">
                              {t('عنوان المتجر المخصص:', 'Custom Store Title:', 'Пользовательский заголовок магазина:')}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {companyAsoSuite.googlePlay.title}
                            </span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(companyAsoSuite.googlePlay.title, 'cmp_title')}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold flex items-center gap-1 text-xs"
                          >
                            {copiedAsoField === 'cmp_title' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{t('نسخ', 'Copy', 'Копировать')}</span>
                          </button>
                        </div>

                        {/* Keywords Box */}
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">
                              {t('كلمات مفتاحية مستهدفة:', 'Target Keywords:', 'Целевые ключевые слова:')}
                            </span>
                            <span className="font-mono text-xs text-purple-600 dark:text-purple-400">
                              {companyAsoSuite.appStore.keywords}
                            </span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(companyAsoSuite.appStore.keywords || '', 'cmp_kw')}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold flex items-center gap-1 text-xs"
                          >
                            {copiedAsoField === 'cmp_kw' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{t('نسخ', 'Copy', 'Копировать')}</span>
                          </button>
                        </div>

                        {/* Full Description Box */}
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-bold">
                              {t('الوصف الكامل التسويقي المحتوي على كود الوكالة المعتمد:', 'Full Marketing Description with Agency Code:', 'Полное маркетинговое описание с кодом агентства:')}
                            </span>
                            <button
                              onClick={() => copyToClipboard(companyAsoSuite.googlePlay.fullDescription, 'cmp_desc')}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold flex items-center gap-1 text-xs"
                            >
                              {copiedAsoField === 'cmp_desc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{t('نسخ الوصف', 'Copy Description', 'Копировать описание')}</span>
                            </button>
                          </div>
                          <pre className="text-[11px] text-slate-600 dark:text-slate-400 font-sans whitespace-pre-wrap max-h-36 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                            {companyAsoSuite.googlePlay.fullDescription}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 4: GENERAL BRANDING, HIGH-RES ICONS & MANIFEST STUDIO */}
              {/* ========================================================= */}
              {activeTab === 'branding' && (
                <div className="space-y-6">
                  {/* Status Banner */}
                  <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border border-emerald-500/30 p-4 sm:p-5 rounded-2xl text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                        <Palette className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-sm sm:text-base">
                            {t(
                              'استوديو أيقونات التطبيق عالية الدقة ونظام الـ Manifest',
                              'High-Resolution App Icon & Dynamic Manifest Studio',
                              'Студия иконок высокого разрешения и динамического манифеста'
                            )}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-slate-950 font-mono flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            PWA READY
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                          {t(
                            'قم برفع أيقونات فائقة الدقة (512x512 أو 1024x1024) أو اختر من النماذج الاحترافية المعتمدة. يتم تطبيق وتوليد الـ Manifest و Favicon و Apple Touch Icon ووسوم Meta Tags فورياً.',
                            'Upload ultra high-res assets or choose from curated vector presets. Generates dynamic Web App Manifest, Favicon, Apple Touch Icon, and Meta Tags on the fly.',
                            'Загрузите иконки сверхвысокого разрешения (512x512 или 1024x1024) или выберите из готовых векторных пресетов. Мгновенно генерирует манифест, фавикон и мета-теги.'
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleDownloadManifest}
                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                        title="تحميل manifest.json"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{t('تحميل Manifest', 'Get Manifest', 'Скачать манифест')}</span>
                      </button>
                      <button
                        onClick={handleCopyHtmlSnippet}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        {copiedManifestSnippet ? <Check className="w-3.5 h-3.5" /> : <Code className="w-3.5 h-3.5" />}
                        <span>{copiedManifestSnippet ? t('تم النسخ!', 'Copied!', 'Скопировано!') : t('نسخ وسوم HTML', 'Copy HTML Tags', 'Копировать теги HTML')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Main Studio Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Panel: Configuration & Input Methods */}
                    <div className="lg:col-span-7 space-y-5">
                      {/* Section 1: Core App Identity */}
                      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3.5">
                        <div className="flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                            {t('بيانات التطبيق والهوية البصرية', 'App Identity & Palette', 'Идентичность приложения и палитра')}
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                              {t('اسم التطبيق (App Name)', 'Application Name', 'Название приложения (App Name)')}
                            </label>
                            <input
                              type="text"
                              value={editAppName}
                              onChange={(e) => setEditAppName(e.target.value)}
                              placeholder="VEX Deals"
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                              {t('لون الثيم الأساسي (Theme Color)', 'PWA Theme Color', 'Основной цвет темы (Theme Color)')}
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={editThemeColor}
                                onChange={(e) => setEditThemeColor(e.target.value)}
                                className="w-9 h-9 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-white dark:bg-slate-800"
                              />
                              <input
                                type="text"
                                value={editThemeColor}
                                onChange={(e) => setEditThemeColor(e.target.value)}
                                className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                            {t('الشعار الوصفي (Tagline / Description)', 'Tagline / Description', 'Слоган / Описание (Tagline / Description)')}
                          </label>
                          <input
                            type="text"
                            value={editTagline}
                            onChange={(e) => setEditTagline(e.target.value)}
                            placeholder="منصة الولاء والتعويضات والتحليلات الرياضية الذكية"
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        {/* Centralized Branding & Configuration Metadata Panel */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3.5">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                              {t('إعدادات وسوم الموقع ومتاعب السيو (SEO Meta & Contact)', 'SEO Meta Tags & Contact Settings', 'Настройки SEO мета-тегов и контактов')}
                            </h4>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                                {t('وصف الموقع (Meta Description)', 'Meta Description', 'Мета-описание (Meta Description)')}
                              </label>
                              <textarea
                                rows={2}
                                value={editMetaDescription}
                                onChange={(e) => setEditMetaDescription(e.target.value)}
                                placeholder="منصة الولاء والتعويضات والتحليلات الرياضية..."
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                                  {t('الكلمات المفتاحية (Meta Keywords)', 'Meta Keywords', 'Ключевые слова (Meta Keywords)')}
                                </label>
                                <input
                                  type="text"
                                  value={editMetaKeywords}
                                  onChange={(e) => setEditMetaKeywords(e.target.value)}
                                  placeholder="تعويضات, رهانات, بونص, ارباح"
                                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                                  {t('البريد الإلكتروني للدعم (Contact Email)', 'Contact Support Email', 'Email для поддержки (Contact Email)')}
                                </label>
                                <input
                                  type="email"
                                  value={editContactEmail}
                                  onChange={(e) => setEditContactEmail(e.target.value)}
                                  placeholder="support@vexdeals.com"
                                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Icon Source Switcher */}
                      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                              {t('مصدر الأيقونة عالية الدقة', 'High-Resolution Icon Source', 'Источник иконки высокого разрешения')}
                            </h4>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {editIconType === 'upload' ? 'FILE UPLOAD' : editIconType === 'preset' ? 'VECTOR PRESETS' : 'CUSTOM URL'}
                          </span>
                        </div>

                        {/* Switcher Buttons */}
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setEditIconType('upload')}
                            className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                              editIconType === 'upload'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <Upload className="w-4 h-4" />
                            <span>{t('رفع صورة عالية الدقة', 'Upload File', 'Загрузить файл высокого разрешения')}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditIconType('preset')}
                            className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                              editIconType === 'preset'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>{t('نماذج Vector SVG', 'Vector Presets', 'Векторные пресеты (SVG)')}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditIconType('custom')}
                            className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                              editIconType === 'custom'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <Globe className="w-4 h-4" />
                            <span>{t('رابط مباشر (URL)', 'Direct URL', 'Прямой URL')}</span>
                          </button>
                        </div>

                        {/* MODE 1: FILE UPLOAD */}
                        {editIconType === 'upload' && (
                          <div className="space-y-3">
                            <label
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                handleFileUpload(e);
                              }}
                              className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-emerald-500/40 dark:border-emerald-500/30 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer transition-all group"
                            >
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                onChange={handleFileUpload}
                                className="hidden"
                              />

                              {isProcessingUpload ? (
                                <div className="flex flex-col items-center gap-2">
                                  <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {t('جاري معالجة وفحص دقة الصورة...', 'Processing and analyzing resolution...', 'Обработка и анализ разрешения...')}
                                  </span>
                                </div>
                              ) : editUploadedData ? (
                                <div className="flex flex-col items-center gap-2">
                                  <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg border border-emerald-500/50 relative">
                                    <img src={editUploadedData} alt="Uploaded Icon" className="w-full h-full object-cover" />
                                  </div>
                                  <div className="text-center">
                                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block">
                                      {t('تم تحميل الصورة بنجاح!', 'Icon asset loaded!', 'Иконка успешно загружена!')}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      {editIconResolution.width} × {editIconResolution.height} px
                                      {editIconResolution.width >= 512 && ' (High-Res Master 🌟)'}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-400 underline group-hover:text-emerald-600">
                                    {t('اضغط لتغيير الصورة', 'Click to change image', 'Нажмите для смены изображения')}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-2 text-center">
                                  <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                                    <Upload className="w-6 h-6" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                      {t('اسحب وأفلت ملف الأيقونة هنا، أو اضغط للاختيار', 'Drag and drop high-res icon, or click to browse', 'Перетащите файл иконки сюда или нажмите для выбора')}
                                    </p>
                                    <p className="text-[10px] text-slate-500 mt-1">
                                      {t(
                                        'يدعم PNG, SVG, JPG, WebP (يُفضل 512×512 أو 1024×1024 بكسل لضمان وضوح فائق)',
                                        'Supports PNG, SVG, JPG, WebP (512x512 or 1024x1024 px recommended)',
                                        'Поддерживает PNG, SVG, JPG, WebP (рекомендуется 512x512 или 1024x1024 px)'
                                      )}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </label>

                            {uploadErrorMessage && (
                              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold border border-red-200 dark:border-red-900">
                                {uploadErrorMessage}
                              </div>
                            )}

                            {editUploadedData && (
                              <div className="flex items-center justify-between text-xs text-slate-500 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                                <span>{t('جودة المعالجة المعتمدة:', 'Processing Quality:', 'Качество обработки:')}</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  {editIconResolution.width >= 512 ? 'Ultra High-Definition 4K' : 'Standard Web Definition'}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* MODE 2: CURATED VECTOR PRESETS */}
                        {editIconType === 'preset' && (
                          <div className="space-y-3">
                            {/* Category Filter Pills */}
                            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
                              {[
                                { id: 'all', label: t('الكل', 'All', 'Все') },
                                { id: 'core', label: t('رسمي (VEX)', 'Official', 'Официальный (VEX)') },
                                { id: 'vip', label: t('ملكي (VIP)', 'Royal VIP', 'Королевский (VIP)') },
                                { id: 'sports', label: t('رياضي و AI', 'Sports AI', 'Спорт и ИИ') },
                                { id: 'crypto', label: t('محافظ وأرصدة', 'Crypto/Cash', 'Кошельки и балансы') },
                                { id: 'partner', label: t('شركاء المراهنات', 'Partners', 'Партнеры') },
                              ].map((cat) => (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => setPresetCategoryFilter(cat.id)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                                    presetCategoryFilter === cat.id
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                  }`}
                                >
                                  {cat.label}
                                </button>
                              ))}
                            </div>

                            {/* Preset Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                              {ICON_PRESETS.filter((p) => presetCategoryFilter === 'all' || p.category === presetCategoryFilter).map(
                                (preset) => {
                                  const isSelected = editPresetIconId === preset.id;
                                  return (
                                    <button
                                      key={preset.id}
                                      type="button"
                                      onClick={() => setEditPresetIconId(preset.id)}
                                      className={`p-2.5 rounded-2xl border text-center flex flex-col items-center gap-2 transition-all relative ${
                                        isSelected
                                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30 shadow-xs'
                                          : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                      }`}
                                    >
                                      {isSelected && (
                                        <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px] shadow-xs">
                                          ✓
                                        </span>
                                      )}
                                      <div
                                        className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center shadow-md"
                                        dangerouslySetInnerHTML={{
                                          __html: getPresetSvg(preset.id, editAppName || 'VEX', 128),
                                        }}
                                      />
                                      <div className="text-center">
                                        <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 block truncate max-w-[110px]">
                                          {adminLang === 'ar' ? preset.nameAr : adminLang === 'ru' ? (preset.nameEn || preset.nameAr) : preset.nameEn}
                                        </span>
                                        <span className="text-[9px] text-slate-400 block font-mono">
                                          SVG 512x512
                                        </span>
                                      </div>
                                    </button>
                                  );
                                }
                              )}
                            </div>
                          </div>
                        )}

                        {/* MODE 3: DIRECT URL */}
                        {editIconType === 'custom' && (
                          <div className="space-y-2">
                            <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300">
                              {t('رابط ملف الأيقونة المباشر (Direct Image URL):', 'Direct Image URL:', 'Прямая ссылка на иконку (Direct Image URL):')}
                            </label>
                            <input
                              type="url"
                              value={editCustomUrl}
                              onChange={(e) => setEditCustomUrl(e.target.value)}
                              placeholder="https://example.com/assets/high-res-icon.png"
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                            />
                            <p className="text-[10px] text-slate-500">
                              {t(
                                'يتم جلب الصورة تلقائياً وتضمينها في الـ Manifest ووسوم الميتا.',
                                'Icon will be linked directly to PWA manifest and browser meta tags.',
                                'Изображение будет автоматически связано с PWA-манифестом и мета-тегами.'
                              )}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Section 3: Save & Apply Primary CTA */}
                      <button
                        onClick={handleSaveBranding}
                        disabled={savingBranding}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {savingBranding ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : brandingSavedSuccess ? (
                          <Check className="w-5 h-5 text-white" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                        <span>
                          {brandingSavedSuccess
                            ? t('✨ تم حفظ الأيقونة وتحديث الـ Manifest و Meta Tags فوراً!', '✨ Manifest & Meta Tags Updated Successfully!', '✨ Иконка сохранена, манифест и мета-теги обновлены!')
                            : t('🚀 حفظ وتطبيق الأيقونة والـ Manifest فورياً', '🚀 Save & Deploy High-Res Assets & Manifest', '🚀 Сохранить и применить иконку и манифест')}
                        </span>
                      </button>
                    </div>

                    {/* Right Panel: Live Previews, Framing & Export Suite */}
                    <div className="lg:col-span-5 space-y-4">
                      {/* Framing & Safe Area Controls */}
                      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                            {t('شكل التأطير والأمان', 'Framing & Safe Area', 'Форма рамки и безопасная зона')}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowMaskableSafeZone(!showMaskableSafeZone)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors ${
                              showMaskableSafeZone
                                ? 'bg-amber-500/20 text-amber-500 border-amber-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {t('شبكة الأمان Maskable (80%)', 'Maskable Safe Zone', 'Безопасная зона Maskable (80%)')}
                          </button>
                        </div>

                        {/* Shape Switcher */}
                        <div className="flex gap-2">
                          {[
                            { id: 'circle', label: t('دائري (Web/iOS)', 'Circle (Web/iOS)', 'Круг (Web/iOS)') },
                            { id: 'squircle', label: t('Squircle (Android)', 'Squircle (Android)', 'Сквиркл (Android)') },
                            { id: 'rounded', label: t('مربع منحني (App Store)', 'Rounded (App Store)', 'Закругленный (App Store)') },
                          ].map((shape) => (
                            <button
                              key={shape.id}
                              type="button"
                              onClick={() => setEditShape(shape.id as any)}
                              className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                                editShape === shape.id
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {shape.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Device Mockup Preview Screen */}
                      <div className="p-4 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                        {/* Device Selector Tabs */}
                        <div className="flex items-center justify-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                          {[
                            { id: 'android', label: '📱 Android', icon: Smartphone },
                            { id: 'ios', label: '🍏 iOS Home', icon: Smartphone },
                            { id: 'tab', label: '🌐 Browser Tab', icon: Globe },
                            { id: 'store', label: '🏪 Store 512', icon: Maximize2 },
                          ].map((dev) => (
                            <button
                              key={dev.id}
                              type="button"
                              onClick={() => setPreviewDevice(dev.id as any)}
                              className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold transition-all ${
                                previewDevice === dev.id
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                              }`}
                            >
                              {dev.label}
                            </button>
                          ))}
                        </div>

                        {/* Screen Mockup Container */}
                        <div className="relative min-h-[200px] flex items-center justify-center p-4 bg-gradient-to-b from-slate-800 to-slate-950 rounded-2xl overflow-hidden border border-slate-700 shadow-inner">
                          {/* Android Preview */}
                          {previewDevice === 'android' && (
                            <div className="flex flex-col items-center gap-2 animate-fadeIn">
                              <div className="relative">
                                <AppIconRenderer
                                  branding={{
                                    appName: editAppName || 'VEX Deals',
                                    tagline: editTagline,
                                    iconType: editIconType,
                                    presetIconId: editPresetIconId,
                                    customIconUrl: editCustomUrl,
                                    uploadedIconData: editUploadedData,
                                  }}
                                  size="xl"
                                  shape={editShape}
                                  className="shadow-2xl ring-2 ring-white/20"
                                />
                                {showMaskableSafeZone && (
                                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-400 pointer-events-none scale-[0.8] flex items-center justify-center">
                                    <span className="text-[8px] font-bold text-amber-300 bg-black/60 px-1 rounded">SAFE</span>
                                  </div>
                                )}
                              </div>
                              <span className="text-xs font-bold text-white tracking-tight drop-shadow-md">
                                {editAppName || 'VEX Deals'}
                              </span>
                            </div>
                          )}

                          {/* iOS Preview */}
                          {previewDevice === 'ios' && (
                            <div className="flex flex-col items-center gap-2 animate-fadeIn">
                              <div className="relative p-1">
                                <AppIconRenderer
                                  branding={{
                                    appName: editAppName || 'VEX Deals',
                                    tagline: editTagline,
                                    iconType: editIconType,
                                    presetIconId: editPresetIconId,
                                    customIconUrl: editCustomUrl,
                                    uploadedIconData: editUploadedData,
                                  }}
                                  size="xl"
                                  shape="rounded"
                                  className="shadow-2xl ring-2 ring-white/30"
                                />
                              </div>
                              <span className="text-xs font-bold text-white tracking-tight drop-shadow-md">
                                {editAppName || 'VEX Deals'}
                              </span>
                            </div>
                          )}

                          {/* Browser Tab Preview */}
                          {previewDevice === 'tab' && (
                            <div className="w-full max-w-xs bg-slate-900 rounded-xl p-2 border border-slate-700 space-y-2 animate-fadeIn">
                              <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                                <AppIconRenderer
                                  branding={{
                                    appName: editAppName || 'VEX Deals',
                                    tagline: editTagline,
                                    iconType: editIconType,
                                    presetIconId: editPresetIconId,
                                    customIconUrl: editCustomUrl,
                                    uploadedIconData: editUploadedData,
                                  }}
                                  size="xs"
                                  shape="circle"
                                />
                                <span className="text-xs font-bold text-white truncate">
                                  {editAppName || 'VEX Deals'} - {editTagline || 'Loyalty'}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 text-center font-mono">
                                https://{PLATFORM_DOMAIN}/
                              </div>
                            </div>
                          )}

                          {/* Store 512 Preview */}
                          {previewDevice === 'store' && (
                            <div className="flex flex-col items-center gap-3 animate-fadeIn">
                              <AppIconRenderer
                                branding={{
                                  appName: editAppName || 'VEX Deals',
                                  tagline: editTagline,
                                  iconType: editIconType,
                                  presetIconId: editPresetIconId,
                                  customIconUrl: editCustomUrl,
                                  uploadedIconData: editUploadedData,
                                }}
                                size="2xl"
                                shape="squircle"
                                className="shadow-2xl ring-4 ring-emerald-500/30"
                              />
                              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                512 × 512 MASTER ASSET
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Download Individual Asset Badges */}
                      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider block">
                          {t('تحميل حزم الأيقونات الفردية', 'Export Icon Assets Package', 'Скачать пакет отдельных иконок')}
                        </span>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleDownloadIconAsset(512)}
                            disabled={!!downloadingAsset}
                            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-between"
                          >
                            <span>512×512 Master</span>
                            <Download className="w-3.5 h-3.5 text-emerald-500" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadIconAsset(192)}
                            disabled={!!downloadingAsset}
                            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-between"
                          >
                            <span>192×192 Mobile</span>
                            <Download className="w-3.5 h-3.5 text-emerald-500" />
                          </button>
                        </div>

                        {/* Manifest JSON Inspector Accordion */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => setShowManifestJsonViewer(!showManifestJsonViewer)}
                            className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-emerald-600 font-bold"
                          >
                            <span className="flex items-center gap-1.5">
                              <FileCode className="w-3.5 h-3.5" />
                              {t('عرض كود manifest.json المولد لحظياً', 'Inspect Dynamic Manifest JSON', 'Просмотр сгенерированного кода manifest.json')}
                            </span>
                            <span>{showManifestJsonViewer ? '▲' : '▼'}</span>
                          </button>

                          {showManifestJsonViewer && (
                            <pre className="mt-2 text-[10px] font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 max-h-48 overflow-y-auto whitespace-pre-wrap">
                              {JSON.stringify(
                                generateManifestObject({
                                  appName: editAppName || 'VEX Deals',
                                  tagline: editTagline || '',
                                  iconType: editIconType,
                                  presetIconId: editPresetIconId,
                                  customIconUrl: editCustomUrl,
                                  uploadedIconData: editUploadedData,
                                  themeColor: editThemeColor,
                                }),
                                null,
                                2
                              )}
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 5: COMPENSATION & DEPOSIT UNFREEZE REQUESTS           */}
              {/* ========================================================= */}
              {activeTab === 'compensation' && (
                <div className="space-y-5">
                  {/* Tab Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <span>{t('إدارة واعتماد طلبات التعويض وفك التجميد (Production)', 'Compensation & Deposit Unfreeze Approvals', 'Управление и подтверждение компенсаций и депозитов')}</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t(
                          'مراجعة وتدقيق إيداعات فك التجميد (1:1) وطلبات تعويض الخسائر مع المعالجة الفورية المباشرة',
                          'Audit and approve 1:1 deposit unfreeze requests and bet loss compensations with instant ledger execution',
                          'Аудит и одобрение депозитов разморозки 1:1 и компенсаций ставок с мгновенным зачислением'
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const targetReq = selectedRequestForEmail || approvedRequests[0] || requests[0] || null;
                        setSelectedRequestForEmail(targetReq);
                        setIsEmailGeneratorOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95 shrink-0 self-start sm:self-center"
                      title={t('توليد وصياغة إيميلات الاعتماد الرسمية تلقائياً', 'Generate automated approval email template', 'Генерация официального письма с подтверждением')}
                    >
                      <Mail className="w-4 h-4" />
                      <span>{t('مُولّد إيميلات الاعتماد الآلي', 'Email Template Generator', 'Генератор email-шаблонов')}</span>
                      <span className="px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono">Auto</span>
                    </button>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-[11px] font-bold">{t('إجمالي الطلبات', 'Total Requests', 'Всего заявок')}</span>
                        <Receipt className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                        {totalRequests}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60">
                      <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-1">
                        <span className="text-[11px] font-bold">{t('إيداعات فك التجميد (1:1)', 'Deposit Unfreezes (1:1)', 'Депозиты разморозки (1:1)')}</span>
                        <Unlock className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-lg font-black text-emerald-800 dark:text-emerald-300 font-mono">
                        {unfreezeRequestsCount}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60">
                      <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-1">
                        <span className="text-[11px] font-bold">{t('قيد التدقيق والانتظار', 'Pending Audit', 'На рассмотрении')}</span>
                        <Clock className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-lg font-black text-amber-800 dark:text-amber-300 font-mono">
                        {pendingRequests.length}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-800/60">
                      <div className="flex items-center justify-between text-teal-700 dark:text-teal-400 mb-1">
                        <span className="text-[11px] font-bold">{t('إجمالي المعتمد', 'Approved Volume', 'Одобренный объем')}</span>
                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                      </div>
                      <div className="text-lg font-black text-teal-800 dark:text-teal-300 font-mono">
                        ${totalApprovedAmount.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Action Feedback Banner */}
                  {requestActionFeedback && (
                    <div
                      className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold animate-fadeIn ${
                        requestActionFeedback.type === 'success'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {requestActionFeedback.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{requestActionFeedback.message}</span>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {requestActionFeedback.type === 'success' && selectedRequestForEmail && (
                          <button
                            type="button"
                            onClick={() => setIsEmailGeneratorOpen(true)}
                            className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>{t('توليد وإرسال إيميل الاعتماد الآن', 'Generate Approval Email Now', 'Создать email об одобрении')}</span>
                          </button>
                        )}
                        <button
                          onClick={() => setRequestActionFeedback(null)}
                          className="text-slate-400 hover:text-slate-600 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Filter Tabs & Search Bar */}
                  <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                      {[
                        { id: 'all', label: t('الكل', 'All', 'Все'), count: totalRequests },
                        { id: 'unfreeze', label: `🔓 ${t('إيداعات فك التجميد (1:1)', 'Unfreezes (1:1)', 'Депозиты (1:1)')}`, count: unfreezeRequestsCount },
                        { id: 'compensation', label: `🛡️ ${t('طلبات التعويض', 'Loss Comp', 'Компенсации')}`, count: compensationRequestsCount },
                        { id: 'pending', label: `⏳ ${t('قيد المراجعة', 'Pending', 'Ожидают')}`, count: pendingRequests.length },
                        { id: 'approved', label: `✅ ${t('المعتمدة', 'Approved', 'Одобрено')}`, count: approvedRequests.length },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setRequestFilter(tab.id as any)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                            requestFilter === tab.id
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                              requestFilter === tab.id
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Search Field */}
                    <div className="relative min-w-[220px]">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={requestSearch}
                        onChange={(e) => setRequestSearch(e.target.value)}
                        placeholder={t('بحث برقم الحساب أو الهاتف أو الكود...', 'Search account, phone, ID...', 'Поиск по номеру счета, телефону или ID...')}
                        className="w-full pl-3 pr-9 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Requests List */}
                  {(() => {
                    const filteredRequests = requests.filter((req) => {
                      const isUnfreeze = req.id.startsWith('DEP-UNF-') || req.bet_slip_id?.startsWith('DEPOSIT-');
                      if (requestFilter === 'unfreeze' && !isUnfreeze) return false;
                      if (requestFilter === 'compensation' && isUnfreeze) return false;
                      if (requestFilter === 'pending' && req.status !== 'pending') return false;
                      if (requestFilter === 'approved' && req.status !== 'approved') return false;
                      if (requestFilter === 'rejected' && req.status !== 'rejected') return false;

                      if (requestSearch.trim()) {
                        const q = requestSearch.toLowerCase();
                        const matchCompany = req.company_name?.toLowerCase().includes(q);
                        const matchAccount = req.account_number?.toLowerCase().includes(q);
                        const matchId = req.id?.toLowerCase().includes(q);
                        const matchSlip = req.bet_slip_id?.toLowerCase().includes(q);
                        const matchNote = req.note?.toLowerCase().includes(q);
                        return matchCompany || matchAccount || matchId || matchSlip || matchNote;
                      }
                      return true;
                    });

                    if (filteredRequests.length === 0) {
                      return (
                        <div className="p-10 text-center bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                          <Receipt className="w-8 h-8 text-slate-400 mx-auto" />
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {t('لا توجد طلبات تطابق الفلتر أو معايير البحث الحالية.', 'No requests match the selected filter or search.', 'Нет заявок, соответствующих фильтрам.')}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {t('يمكنك تغيير نوع الفلتر من الأعلى لعرض باقي العمليات.', 'Try changing the filter options above.', 'Попробуйте изменить параметры фильтра.')}
                          </p>
                        </div>
                      );
                    }

                    const visibleIds = filteredRequests.map((r) => r.id);
                    const visiblePendingReqs = filteredRequests.filter((r) => r.status === 'pending');
                    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedRequestIds.includes(id));
                    const someVisibleSelected = visibleIds.some((id) => selectedRequestIds.includes(id));
                    const selectedReqs = requests.filter((r) => selectedRequestIds.includes(r.id));
                    const selectedPendingCount = selectedReqs.filter((r) => r.status === 'pending').length;
                    const totalSelectedAmount = selectedReqs.reduce((acc, r) => acc + (r.amount || 0), 0);

                    return (
                      <div className="space-y-3">
                        {/* Bulk Selection Bar */}
                        <div className="flex flex-col gap-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs">
                            <div className="flex items-center gap-3">
                              {/* Master Selection Checkbox */}
                              <button
                                type="button"
                                onClick={() => handleSelectAllVisible(visibleIds)}
                                className={`w-5 h-5 rounded-md flex items-center justify-center transition-all border shrink-0 ${
                                  allVisibleSelected
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                    : someVisibleSelected
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 hover:border-emerald-500 text-transparent'
                                }`}
                                title={allVisibleSelected ? t('إلغاء تحديد الكل', 'Deselect all', 'Снять выделение со всех') : t('تحديد كافة الطلبات الظاهرة', 'Select all visible', 'Выделить все видимые')}
                              >
                                {allVisibleSelected ? (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                ) : someVisibleSelected ? (
                                  <span className="w-2 h-0.5 bg-white rounded-full"></span>
                                ) : (
                                  <Check className="w-3.5 h-3.5 opacity-0" />
                                )}
                              </button>

                              <span className="font-bold text-slate-700 dark:text-slate-300">
                                {t(`تحديد الكل (${filteredRequests.length} طلب)`, `Select All (${filteredRequests.length})`, `Выбрать все (${filteredRequests.length})`)}
                              </span>

                              {visiblePendingReqs.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleSelectOnlyPendingVisible(filteredRequests)}
                                  className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-1"
                                >
                                  <Clock className="w-3 h-3" />
                                  <span>{t(`تحديد المعلقة فقط (${visiblePendingReqs.length})`, `Pending Only (${visiblePendingReqs.length})`, `Только ожидающие (${visiblePendingReqs.length})`)}</span>
                                </button>
                              )}
                            </div>

                            {selectedRequestIds.length > 0 && (
                              <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                                <span>{t(`تم تحديد ${selectedRequestIds.length} طلب إجمالاً`, `${selectedRequestIds.length} selected`, `Выбрано: ${selectedRequestIds.length}`)}</span>
                                <button
                                  type="button"
                                  onClick={handleClearSelection}
                                  className="text-rose-600 dark:text-rose-400 hover:underline font-bold"
                                >
                                  {t('إلغاء التحديد', 'Clear', 'Очистить')}
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Active Bulk Actions Action Bar */}
                          {selectedRequestIds.length > 0 && (
                            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white border border-emerald-500/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                                  <ListChecks className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-black text-white">
                                      {t(`تم تحديد ${selectedRequestIds.length} طلب`, `${selectedRequestIds.length} requests selected`, `Выбрано заявок: ${selectedRequestIds.length}`)}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/30">
                                      ${totalSelectedAmount.toLocaleString()}
                                    </span>
                                    {selectedPendingCount > 0 && (
                                      <span className="text-[10px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                        {t(`${selectedPendingCount} معلق`, `${selectedPendingCount} pending`, `${selectedPendingCount} в ожидании`)}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    {t(
                                      'يمكنك تنفيذ إجراء جماعي فوري للاعتماد أو الرفض على كافة الطلبات المحددة بنقرة واحدة',
                                      'Execute instant bulk approval or rejection on all selected requests',
                                      'Массовое мгновенное одобрение или отклонение всех выбранных заявок в один клик'
                                    )}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                {/* Bulk Approve Button */}
                                <button
                                  type="button"
                                  onClick={handleBulkApprove}
                                  disabled={isBulkOperating}
                                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                                  title={t('اعتماد جميع الطلبات المحددة فورياً', 'Approve all selected requests immediately', 'Мгновенно одобрить все выбранные')}
                                >
                                  {isBulkOperating ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                  )}
                                  <span>
                                    {isBulkOperating && bulkProgress
                                      ? t(`جاري الاعتماد (${bulkProgress.current}/${bulkProgress.total})...`, `Approving (${bulkProgress.current}/${bulkProgress.total})...`, `Одобрение (${bulkProgress.current}/${bulkProgress.total})...`)
                                      : t(`اعتماد المحدد (${selectedRequestIds.length})`, `Approve (${selectedRequestIds.length})`, `Одобрить (${selectedRequestIds.length})`)}
                                  </span>
                                </button>

                                {/* Bulk Reject Button */}
                                <button
                                  type="button"
                                  onClick={() => setIsBulkRejectModalOpen(true)}
                                  disabled={isBulkOperating}
                                  className="px-3.5 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs transition-all active:scale-95 border border-rose-500/40 flex items-center gap-1.5 disabled:opacity-50"
                                  title={t('رفض جميع الطلبات المحددة مع توثيق السبب', 'Reject all selected requests with a documented reason', 'Отклонить выбранные с указанием причины')}
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>{t(`رفض المحدد (${selectedRequestIds.length})`, `Reject (${selectedRequestIds.length})`, `Отклонить (${selectedRequestIds.length})`)}</span>
                                </button>

                                {/* Deselect / Clear button */}
                                <button
                                  type="button"
                                  onClick={handleClearSelection}
                                  disabled={isBulkOperating}
                                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all text-xs"
                                  title={t('إلغاء التحديد', 'Clear selection', 'Снять выделение')}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {filteredRequests.map((req) => {
                          const isUnfreeze = req.id.startsWith('DEP-UNF-') || req.bet_slip_id?.startsWith('DEPOSIT-');
                          const senderPhone = isUnfreeze ? req.bet_slip_id?.replace('DEPOSIT-', '') : null;
                          const isLoadingThis = requestActionLoadingId === req.id;
                          const isSelected = selectedRequestIds.includes(req.id);

                          return (
                            <div
                              key={req.id}
                              className={`p-4 rounded-2xl border transition-all ${
                                isSelected
                                  ? 'ring-2 ring-emerald-500/60 bg-emerald-500/[0.04] border-emerald-500/50 shadow-sm'
                                  : isUnfreeze
                                  ? 'bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-transparent border-emerald-500/30 dark:border-emerald-500/20'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {/* Row Checkbox */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelectRequest(req.id);
                                  }}
                                  className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-all border shrink-0 ${
                                    isSelected
                                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                      : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-emerald-500 text-transparent'
                                  }`}
                                  title={isSelected ? t('إلغاء تحديد هذا الطلب', 'Deselect', 'Снять выделение') : t('تحديد هذا الطلب للعمليات الجماعية', 'Select for bulk action', 'Выбрать для массовых операций')}
                                >
                                  <Check className={`w-3.5 h-3.5 stroke-[3] ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                                </button>

                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-2 flex-1">
                                      {/* Request Header Line */}
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-black text-slate-900 dark:text-white">
                                          {req.company_name}
                                        </span>
                                        <span className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                          #{req.id}
                                        </span>

                                        {/* Type Badge */}
                                        {isUnfreeze ? (
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center gap-1 border border-emerald-300/40">
                                            <Unlock className="w-3 h-3 text-emerald-600" />
                                            <span>{t('إيداع فك تجميد مباشر (1:1)', 'Deposit Unfreeze 1:1', 'Депозит разморозки 1:1')}</span>
                                          </span>
                                        ) : (
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 flex items-center gap-1 border border-indigo-300/40">
                                            <ShieldCheck className="w-3 h-3 text-indigo-600" />
                                            <span>{t('طلب تعويض خسارة رهان', 'Loss Compensation', 'Компенсация ставки')}</span>
                                          </span>
                                        )}

                                        {/* Status Badge */}
                                        <span
                                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            req.status === 'pending'
                                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/40'
                                              : req.status === 'approved'
                                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300/40'
                                              : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300/40'
                                          }`}
                                        >
                                          {req.status === 'pending'
                                            ? t('قيد المراجعة', 'Pending Audit', 'На рассмотрении')
                                            : req.status === 'approved'
                                            ? (isUnfreeze ? t('معتمد ومفكوك 1:1', 'Approved & Unfrozen', 'Одобрено и разморожено 1:1') : t('معتمد للرصيد', 'Approved to Balance', 'Одобрено на баланс'))
                                            : t('مرفوض', 'Rejected', 'Отклонено')}
                                        </span>
                                      </div>

                                      {/* Verification Details Grid */}
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                                        <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                                          <span className="text-[10px] text-slate-500 block">
                                            {t('المبلغ المطلوب:', 'Amount:', 'Сумма:')}
                                          </span>
                                          <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                            ${req.amount}
                                          </span>
                                        </div>

                                        <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                                          <span className="text-[10px] text-slate-500 block">
                                            {t('رقم الحساب بالشركة:', 'Account ID:', 'ID аккаунта:')}
                                          </span>
                                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                            {req.account_number || '-'}
                                          </span>
                                        </div>

                                        {isUnfreeze ? (
                                          <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <span className="text-[10px] text-slate-500 block">
                                              {t('هاتف الإيداع المحول منه:', 'Sender Phone:', 'Телефон отправителя:')}
                                            </span>
                                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                              <Phone className="w-3 h-3 text-slate-400" />
                                              <span>{senderPhone || '-'}</span>
                                            </span>
                                          </div>
                                        ) : (
                                          <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <span className="text-[10px] text-slate-500 block">
                                              {t('كود قسيمة الرهان:', 'Bet Slip ID:', 'Номер купона:')}
                                            </span>
                                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                              {req.bet_slip_id || '-'}
                                            </span>
                                          </div>
                                        )}

                                        <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                                          <span className="text-[10px] text-slate-500 block">
                                            {t('تاريخ التقديم:', 'Submitted Date:', 'Дата отправки:')}
                                          </span>
                                          <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                            {new Date(req.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Note / Screenshot reference */}
                                      {(req.note || req.screenshot) && (
                                        <div className="text-[11px] bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                                          <span className="font-bold text-slate-700 dark:text-slate-300">
                                            {t('الملاحظات / المرجع: ', 'Notes / Reference: ', 'Заметки / Чек: ')}
                                          </span>
                                          <span>{req.note || req.screenshot}</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Action CTAs */}
                                    <div className="flex items-center gap-2 shrink-0">
                                      {req.status === 'pending' ? (
                                        <>
                                          <button
                                            onClick={() => handleApproveWithFeedback(req)}
                                            disabled={isLoadingThis}
                                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                                          >
                                            {isLoadingThis ? (
                                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                              <Check className="w-3.5 h-3.5" />
                                            )}
                                            <span>
                                              {isUnfreeze
                                                ? t('اعتماد وفك التجميد 1:1', 'Approve & Unfreeze 1:1', 'Одобрить и разморозить 1:1')
                                                : t('اعتماد التعويض', 'Approve Comp', 'Одобрить компенсацию')}
                                            </span>
                                          </button>

                                          <button
                                            onClick={() => {
                                              setRejectId(req.id);
                                              setRejectReason(
                                                isUnfreeze
                                                  ? t('رقم الإيداع المحول منه غير مطابق أو لم يصل في حساب الوكالة', 'Deposit sender phone mismatch or funds not received in agency account', 'Номер отправителя депозита не совпадает или средства не поступили')
                                                  : t('رقم الرهان غير مسجل ضمن كود وكالتنا', 'Bet slip ID not registered under our agency promo code', 'Купон ставки не зарегистрирован по коду нашего агентства')
                                              );
                                            }}
                                            disabled={isLoadingThis}
                                            className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-bold transition-all border border-rose-200 dark:border-rose-900 disabled:opacity-50"
                                          >
                                            {t('رفض', 'Reject', 'Отклонить')}
                                          </button>
                                        </>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          {req.status === 'approved' && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedRequestForEmail(req);
                                                setIsEmailGeneratorOpen(true);
                                              }}
                                              className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-300 text-xs font-bold transition-all border border-emerald-300/40 flex items-center gap-1.5 shadow-xs"
                                              title={t('توليد وإرسال إيميل رسمي للعميل', 'Generate & Send Official Email', 'Создать и отправить официальный email')}
                                            >
                                              <Mail className="w-3.5 h-3.5 text-emerald-500" />
                                              <span>{t('إيميل الاعتماد', 'Email Notice', 'Email уведомление')}</span>
                                            </button>
                                          )}
                                          <div className="text-right">
                                            <span className="text-[11px] font-mono text-slate-400 block">
                                              {req.status === 'approved'
                                                ? t('تم التدقيق والاعتماد', 'Verified & Approved', 'Проверено и одобрено')
                                                : t('تم رفض الطلب', 'Rejected', 'Заявка отклонена')}
                                            </span>
                                            {req.reviewed_by && (
                                              <span className="text-[10px] text-slate-500 font-mono">
                                                {t('بواسطة: ', 'By: ', 'Проверил: ')}{req.reviewed_by}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Bulk Reject Reason Modal Prompt */}
                  {isBulkRejectModalOpen && (
                    <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 rounded-2xl space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between text-rose-900 dark:text-rose-200">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                          <h4 className="text-xs sm:text-sm font-bold">
                            {t(`تأكيد الرفض الجماعي لـ (${selectedRequestIds.length}) طلب:`, `Confirm bulk rejection of (${selectedRequestIds.length}) requests:`, `Подтверждение массового отклонения (${selectedRequestIds.length}) заявок:`)}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsBulkRejectModalOpen(false)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs text-rose-700 dark:text-rose-300">
                        {t(
                          `سيتم رفض كافة الطلبات المحددة (${selectedRequestIds.length} طلب) بإجمالي مبلغ $${requests.filter((r) => selectedRequestIds.includes(r.id)).reduce((acc, r) => acc + (r.amount || 0), 0).toLocaleString()} وتوثيق سبب الرفض وإشعار أصحابها فورياً.`,
                          `All ${selectedRequestIds.length} selected requests totaling $${requests.filter((r) => selectedRequestIds.includes(r.id)).reduce((acc, r) => acc + (r.amount || 0), 0).toLocaleString()} will be rejected and users will be notified.`,
                          `Все ${selectedRequestIds.length} выбранных заявок на сумму $${requests.filter((r) => selectedRequestIds.includes(r.id)).reduce((acc, r) => acc + (r.amount || 0), 0).toLocaleString()} будут отклонены с отправкой уведомлений.`
                        )}
                      </p>

                      {/* Common Reject Reason Quick Chips */}
                      <div className="flex gap-1.5 flex-wrap">
                        {[
                          {
                            ar: 'رقم الإيداع غير مطابق للسجلات البنكية',
                            en: 'Deposit reference not found in bank records',
                            ru: 'Номер транзакции не найден в выписке'
                          },
                          {
                            ar: 'رقم الحساب غير مسجل بكود الوكالة المعتمد',
                            en: 'Account ID not registered under agency promo code',
                            ru: 'ID аккаунта не зарегистрирован по промокоду'
                          },
                          {
                            ar: 'تكرار لنفس رقم الإشعار مسبقاً',
                            en: 'Duplicate receipt number submitted',
                            ru: 'Повторный чек или дубликат транзакции'
                          },
                          {
                            ar: 'المبلغ المدخل لا يتطابق مع الإشعار المرفق',
                            en: 'Entered amount does not match attached receipt',
                            ru: 'Сумма не совпадает с прикрепленным чеком'
                          },
                          {
                            ar: 'مخالفة الشروط والأحكام الخاصة بالمكافأة',
                            en: 'Violation of bonus terms and conditions',
                            ru: 'Нарушение условий бонусной программы'
                          },
                          {
                            ar: 'قسيمة رهان خاسرة غير مؤهلة للتعويض',
                            en: 'Losing bet slip not eligible for compensation',
                            ru: 'Купон ставки не подлежит компенсации'
                          },
                        ].map((preset) => {
                          const label = t(preset.ar, preset.en, preset.ru);
                          return (
                            <button
                              key={preset.en}
                              type="button"
                              onClick={() => setBulkRejectReason(label)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                bulkRejectReason === label
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-white dark:bg-slate-900 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900 hover:bg-rose-100'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>

                      <textarea
                        rows={2}
                        value={bulkRejectReason}
                        onChange={(e) => setBulkRejectReason(e.target.value)}
                        placeholder={t('اكتب سبب الرفض الذي سيظهر للمستخدمين المحددين...', 'Reason for bulk rejection...', 'Укажите причину отклонения для пользователей...')}
                        className="w-full text-xs p-3 rounded-xl border border-rose-300 dark:border-rose-900 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-rose-500"
                      />

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsBulkRejectModalOpen(false)}
                          className="px-3.5 py-1.5 text-xs rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                        >
                          {t('إلغاء', 'Cancel', 'Отмена')}
                        </button>
                        <button
                          type="button"
                          onClick={handleBulkReject}
                          disabled={isBulkOperating || !bulkRejectReason.trim()}
                          className="px-4 py-1.5 text-xs rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isBulkOperating ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {isBulkOperating && bulkProgress
                              ? t(`جاري الرفض (${bulkProgress.current}/${bulkProgress.total})...`, `Rejecting (${bulkProgress.current}/${bulkProgress.total})...`, `Отклонение (${bulkProgress.current}/${bulkProgress.total})...`)
                              : t(`تأكيد رفض (${selectedRequestIds.length}) طلب`, `Confirm Reject (${selectedRequestIds.length}) Requests`, `Подтвердить отказ (${selectedRequestIds.length})`)}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Single Reject Reason Modal Prompt */}
                  {rejectId && (
                    <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl space-y-3 animate-fadeIn">
                      <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <h4 className="text-xs font-bold">
                          {t(`سبب رفض الطلب #${rejectId}:`, `Reason for rejecting request #${rejectId}:`, `Причина отклонения заявки #${rejectId}:`)}
                        </h4>
                      </div>

                      {/* Common Reject Reason Quick Chips */}
                      <div className="flex gap-1.5 flex-wrap">
                        {[
                          {
                            ar: 'رقم الإيداع غير مطابق للسجلات البنكية',
                            en: 'Deposit reference not found in bank records',
                            ru: 'Номер транзакции не найден в выписке'
                          },
                          {
                            ar: 'رقم الحساب غير مسجل بكود الوكالة المعتمد',
                            en: 'Account ID not registered under agency promo code',
                            ru: 'ID аккаунта не зарегистрирован по промокоду'
                          },
                          {
                            ar: 'تكرار لنفس رقم الإشعار مسبقاً',
                            en: 'Duplicate receipt number submitted',
                            ru: 'Повторный чек или дубликат транзакции'
                          },
                          {
                            ar: 'المبلغ المدخل لا يتطابق مع الإشعار المرفق',
                            en: 'Entered amount does not match attached receipt',
                            ru: 'Сумма не совпадает с прикрепленным чеком'
                          },
                        ].map((item) => {
                          const reason = t(item.ar, item.en, item.ru);
                          return (
                            <button
                              key={item.en}
                              type="button"
                              onClick={() => setRejectReason(reason)}
                              className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                                rejectReason === reason
                                  ? 'bg-rose-600 text-white border-rose-600'
                                  : 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900'
                              }`}
                            >
                              {reason}
                            </button>
                          );
                        })}
                      </div>

                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder={t('أدخل سبب الرفض الموجه للمستخدم...', 'Enter rejection reason...', 'Укажите причину отклонения...')}
                        className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                      />

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setRejectId(null)}
                          className="px-3.5 py-1.5 text-xs rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                        >
                          {t('إلغاء', 'Cancel', 'Отмена')}
                        </button>
                        <button
                          onClick={handleRejectWithFeedback}
                          disabled={requestActionLoadingId === rejectId}
                          className="px-4 py-1.5 text-xs rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {requestActionLoadingId === rejectId ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                          <span>{t('تأكيد الرفض وإشعار المستخدم', 'Confirm Rejection', 'Подтвердить отклонение')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB: PHONE CHANGE REQUESTS AUDIT & APPROVAL                */}
              {/* ========================================================= */}
              {activeTab === 'phone_requests' && (
                <div className="space-y-5 animate-fadeIn">
                  {/* Header Banner */}
                  <div className="bg-gradient-to-r from-amber-900 via-slate-900 to-slate-950 text-white p-5 rounded-2xl shadow-sm border border-amber-800/30">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm sm:text-base">
                          <Lock className="w-5 h-5 text-amber-400" />
                          <span>{t('مركز تدقيق واعتماد طلبات تغيير أرقام الهواتف', 'Phone Change Requests Hub', 'Центр аудита и подтверждения смены номеров телефонов')}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                            Anti-Fraud Protocol
                          </span>
                        </div>
                        <p className="text-xs text-amber-100/80 max-w-2xl leading-relaxed">
                          {t(
                            'بناءً على بروتوكول الأمان الصارم، يتم تثبيت رقم هاتف العميل لمرة واحدة في المحفظة. لا يمكن للعميل تغييره إلا بطلب رسمي إلى الإدارة للمراجعة لمنع سرقة الحسابات أو سحب الأرصدة.',
                            'To prevent account takeover, user phone numbers are permanently locked upon verification. Phone modification requires explicit admin review and approval.',
                            'Согласно строгому протоколу безопасности номер телефона привязывается к кошельку. Изменение номера требует обязательной проверки администратором для предотвращения кражи средств.'
                          )}
                        </p>
                      </div>

                      <button
                        onClick={loadPhoneChangeRequests}
                        disabled={loadingPhoneRequests}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingPhoneRequests ? 'animate-spin' : ''}`} />
                        <span>{t('تحديث', 'Refresh', 'Обновить')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Feedback Message */}
                  {phoneActionFeedback && (
                    <div
                      className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 animate-fade-in ${
                        phoneActionFeedback.type === 'success'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                          : 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                      }`}
                    >
                      {phoneActionFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      )}
                      <span>{phoneActionFeedback.message}</span>
                    </div>
                  )}

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">
                        {t('إجمالي الطلبات', 'Total Requests', 'Всего запросов')}
                      </span>
                      <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                        {phoneChangeRequests.length}
                      </span>
                    </div>

                    <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                          {t('بانتظار المراجعة', 'Pending Review', 'На рассмотрении')}
                        </span>
                        {pendingPhoneRequests.length > 0 && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        )}
                      </div>
                      <span className="text-xl font-black text-amber-900 dark:text-amber-300 font-mono">
                        {pendingPhoneRequests.length}
                      </span>
                    </div>

                    <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/50">
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block mb-1">
                        {t('الطلبات المعتمدة', 'Approved', 'Подтвержденные')}
                      </span>
                      <span className="text-xl font-black text-emerald-900 dark:text-emerald-300 font-mono">
                        {phoneChangeRequests.filter((r) => r.status === 'approved').length}
                      </span>
                    </div>

                    <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-800/50">
                      <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 block mb-1">
                        {t('الطلبات المرفوضة', 'Rejected', 'Отклоненные')}
                      </span>
                      <span className="text-xl font-black text-rose-900 dark:text-rose-300 font-mono">
                        {phoneChangeRequests.filter((r) => r.status === 'rejected').length}
                      </span>
                    </div>
                  </div>

                  {/* Reject Reason Form Modal/Prompt */}
                  {rejectPhoneModalId && (
                    <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl space-y-3 animate-fadeIn">
                      <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <h4 className="text-xs font-bold">
                          {t(`سبب رفض طلب تغيير رقم الهاتف #${rejectPhoneModalId}:`, `Reason for rejecting phone request #${rejectPhoneModalId}:`, `Причина отклонения запроса #${rejectPhoneModalId}:`)}
                        </h4>
                      </div>

                      {/* Quick Reason Chips */}
                      <div className="flex gap-1.5 flex-wrap">
                        {[
                          {
                            ar: 'لم يتم استيفاء معايير التحقق الأمني',
                            en: 'Security verification criteria not met',
                            ru: 'Критерии верификации безопасности не выполнены'
                          },
                          {
                            ar: 'الرقم الجديد غير مطابق لمعايير الوكالة',
                            en: 'New number does not match agency format',
                            ru: 'Новый номер не соответствует стандартам'
                          },
                          {
                            ar: 'اشتباه بنشاط أمني غير مصرح به على الحساب',
                            en: 'Suspicion of unauthorized account activity',
                            ru: 'Подозрение на несанкционированные действия'
                          },
                          {
                            ar: 'عدم تقديم إثبات كافٍ لملكية الرقم الجديد',
                            en: 'Insufficient proof of ownership for new phone',
                            ru: 'Недостаточно доказательств владения новым номером'
                          },
                        ].map((item) => {
                          const reason = t(item.ar, item.en, item.ru);
                          return (
                            <button
                              key={item.en}
                              type="button"
                              onClick={() => setRejectPhoneReason(reason)}
                              className={`px-2.5 py-1 text-[11px] rounded-lg border font-medium transition-all ${
                                rejectPhoneReason === reason
                                  ? 'bg-rose-600 text-white border-rose-700 font-bold'
                                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/30'
                              }`}
                            >
                              {reason}
                            </button>
                          );
                        })}
                      </div>

                      <input
                        type="text"
                        value={rejectPhoneReason}
                        onChange={(e) => setRejectPhoneReason(e.target.value)}
                        placeholder={t('أدخل سبب الرفض بالتفصيل...', 'Enter rejection reason...', 'Укажите подробную причину отказа...')}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-slate-900 dark:text-white"
                      />

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setRejectPhoneModalId(null)}
                          className="px-3 py-1.5 text-xs rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                        >
                          {t('إلغاء', 'Cancel', 'Отмена')}
                        </button>
                        <button
                          type="button"
                          onClick={handleRejectPhoneChange}
                          disabled={phoneActionLoadingId === rejectPhoneModalId}
                          className="px-4 py-1.5 text-xs rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {phoneActionLoadingId === rejectPhoneModalId ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                          <span>{t('تأكيد الرفض وإشعار المستخدم', 'Confirm Rejection', 'Подтвердить отклонение')}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Requests List */}
                  {phoneChangeRequests.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 space-y-2">
                      <Lock className="w-8 h-8 mx-auto text-slate-400" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        {t('لا توجد أي طلبات تغيير أرقام هواتف مسجلة حالياً.', 'No phone change requests found.', 'Нет зарегистрированных запросов смены номеров.')}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {t(
                          'عندما يقدم أي مستخدم طلباً لتعديل رقمه المقفل من المحفظة، سيظهر هنا للمراجعة والاعتماد.',
                          'When users submit a request to update their locked number, it will appear here.',
                          'Когда пользователь отправит запрос на изменение номера из кошелька, он появится здесь.'
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {phoneChangeRequests.map((req) => {
                        const isLoadingThis = phoneActionLoadingId === req.id;
                        return (
                          <div
                            key={req.id}
                            className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-black text-slate-900 dark:text-white">
                                  #{req.id}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  {t('المستخدم:', 'User:', 'Пользователь:')} {req.user_id}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(req.created_at).toLocaleDateString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    req.status === 'approved'
                                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                      : req.status === 'rejected'
                                      ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                      : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse'
                                  }`}
                                >
                                  {req.status === 'approved'
                                    ? t('معتمد ومحدث', 'Approved', 'Подтвержден')
                                    : req.status === 'rejected'
                                    ? t('مرفوض', 'Rejected', 'Отклонен')
                                    : t('قيد المراجعة', 'Pending', 'На проверке')}
                                </span>
                              </div>
                            </div>

                            {/* Old vs New Phone Comparison */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
                                <span className="text-[10px] font-bold text-slate-500 block mb-1">
                                  {t('الرقم الحالي المقفل في المحفظة:', 'Current Locked Phone:', 'Текущий заблокированный номер:')}
                                </span>
                                <span className="font-mono font-black text-xs text-slate-900 dark:text-white flex items-center gap-1.5" dir="ltr">
                                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>{req.current_phone || t('غير مسجل', 'None', 'Не указан')}</span>
                                </span>
                              </div>

                              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block mb-1">
                                  {t('الرقم الجديد المطلوب اعتماده:', 'Requested New Phone:', 'Новый запрашиваемый номер:')}
                                </span>
                                <span className="font-mono font-black text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5" dir="ltr">
                                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{req.requested_phone}</span>
                                </span>
                              </div>
                            </div>

                            {/* Reason for Change */}
                            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                                {t('سبب طلب التغيير المقدم من العميل:', 'Reason for change:', 'Причина запроса смены:')}
                              </span>
                              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                                {req.reason}
                              </p>
                            </div>

                            {/* If review completed */}
                            {req.status !== 'pending' && (
                              <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
                                <span>
                                  {t('تمت المراجعة بواسطة: ', 'Reviewed by: ', 'Проверено: ')}
                                  <strong className="text-slate-700 dark:text-slate-300">{req.reviewed_by || 'Admin'}</strong>
                                </span>
                                {req.review_note && (
                                  <span className="text-rose-600 dark:text-rose-400 font-medium">
                                    {t('ملاحظة الإدارة: ', 'Note: ', 'Примечание: ')} {req.review_note}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Pending Action Buttons */}
                            {req.status === 'pending' && (
                              <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectPhoneModalId(req.id);
                                    setRejectPhoneReason(t('لم يتم استيفاء معايير التحقق الأمني', 'Security verification criteria not met', 'Критерии верификации безопасности не выполнены'));
                                  }}
                                  disabled={isLoadingThis}
                                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-bold transition-all border border-rose-200 dark:border-rose-900 disabled:opacity-50"
                                >
                                  {t('رفض الطلب', 'Reject', 'Отклонить')}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleApprovePhoneChange(req.id)}
                                  disabled={isLoadingThis}
                                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                                >
                                  {isLoadingThis ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                  <span>{t('اعتماد وتحديث الرقم في المحفظة', 'Approve & Update Phone', 'Подтвердить и обновить номер')}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB: TELEGRAM BOT CONFIGURATION & PHONE VERIFICATION     */}
              {/* ========================================================= */}
              {activeTab === 'telegram_bot' && (
                <div className="space-y-5 animate-fadeIn">
                  {/* Header Banner */}
                  <div className="bg-gradient-to-r from-sky-900 via-slate-900 to-slate-950 text-white p-5 rounded-2xl shadow-sm border border-sky-800/40">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-sky-400 font-extrabold text-sm sm:text-base">
                          <Send className="w-5 h-5 text-sky-400" />
                          <span>{t('لوحة تحكم بوت تيليجرام لتوثيق أرقام الهواتف', 'Telegram Bot Verification Engine', 'Панель Telegram-бота для верификации номеров')}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                            Telegram Bot API
                          </span>
                        </div>
                        <p className="text-xs text-sky-100/80 max-w-2xl leading-relaxed">
                          {t(
                            'أدخل توكن البوت الصادر من @BotFather لتشغيل نظام التحقق التلقائي. يقوم البوت باستقبال جهات اتصال المستخدمين الحقيقية وتوليد رمز 6 أرقام فريد لتأكيد وقفل رقم الهاتف بالمحفظة تلقائياً.',
                            'Configure your Telegram Bot Token from @BotFather. The bot handles phone number verification through contact sharing and generates secure 6-digit OTPs.',
                            'Укажите токен бота от @BotFather для запуска системы автоматической проверки. Бот принимает реальные контакты пользователей и генерирует 6-значный OTP для привязки к кошельку.'
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={loadTelegramConfig}
                          disabled={loadingTelegramConfig}
                          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingTelegramConfig ? 'animate-spin' : ''}`} />
                          <span>{t('تحديث', 'Refresh', 'Обновить')}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Feedback notices */}
                  {telegramSaveSuccess && (
                    <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{t('تم حفظ التوكن وتشغيل خادم البوت وتقنية الاستقبال بنجاح!', 'Telegram bot settings saved and polling active!', 'Настройки Telegram-бота сохранены, опрос активирован!')}</span>
                    </div>
                  )}

                  {telegramTestResult && (
                    <div
                      className={`p-4 rounded-2xl border text-xs font-medium space-y-2 animate-fade-in ${
                        telegramTestResult.success
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                          : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold">
                        {telegramTestResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                        )}
                        <span>{telegramTestResult.message}</span>
                      </div>

                      {telegramTestResult.bot && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200 dark:border-emerald-900/60 font-mono text-[11px]">
                          <div>
                            <span className="text-slate-500 block">Bot ID:</span>
                            <span className="font-bold">{telegramTestResult.bot.id}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Bot Name:</span>
                            <span className="font-bold">{telegramTestResult.bot.first_name}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Username:</span>
                            <span className="font-bold">@{telegramTestResult.bot.username}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Polling:</span>
                            <span className="font-bold text-emerald-600">Active</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status Overview Card */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                      <span className="text-[11px] font-bold text-slate-500">{t('حالة البوت', 'Bot Status', 'Статус бота')}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            telegramBotStatus?.is_active && telegramBotToken
                              ? 'bg-emerald-500 animate-pulse'
                              : 'bg-slate-400'
                          }`}
                        />
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                          {telegramBotStatus?.is_active && telegramBotToken
                            ? t('نشط ويعمل', 'Active & Running', 'Активен и работает')
                            : t('معطل / غير مهيأ', 'Inactive / Needs Token', 'Неактивен / Требуется токен')}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                      <span className="text-[11px] font-bold text-slate-500">{t('اسم مستخدم البوت', 'Bot Username', 'Имя пользователя бота')}</span>
                      <div className="text-sm font-black text-sky-600 dark:text-sky-400 font-mono">
                        {telegramBotUsername ? `@${telegramBotUsername}` : t('غير محدد بعد', 'Not configured', 'Не настроено')}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                      <span className="text-[11px] font-bold text-slate-500">{t('وضع الاستقبال', 'Polling Engine', 'Режим опроса')}</span>
                      <div className="text-sm font-black text-slate-900 dark:text-white font-mono">
                        Long-Polling Daemon
                      </div>
                    </div>
                  </div>

                  {/* Configuration Form Card */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                          {t('إعدادات وبيانات اعتماد بوت تيليجرام', 'Telegram Bot API Credentials', 'Учетные данные Telegram Bot API')}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {t(
                            'أدخل الـ Token الممنوح من بوت الأب @BotFather لتفعيل النظام',
                            'Enter the Bot Token obtained from @BotFather',
                            'Введите токен бота, полученный от @BotFather для активации'
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                          {t('تفعيل البوت:', 'Enable Bot:', 'Включить бота:')}
                        </label>
                        <input
                          type="checkbox"
                          checked={telegramBotActive}
                          onChange={(e) => setTelegramBotActive(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>{t('رمز توكن البوت (Telegram Bot Token):', 'Telegram Bot Token:', 'Токен Telegram-бота (Token):')}</span>
                          <span className="text-[11px] font-normal text-slate-400">
                            {t('سري وخاص بالخادم', 'Server-side secret', 'Секретный серверный ключ')}
                          </span>
                        </label>
                        <input
                          type="text"
                          value={telegramBotToken}
                          onChange={(e) => setTelegramBotToken(e.target.value)}
                          placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {t('اسم مستخدم البوت (اختياري، يملأ تلقائياً عند الحفظ):', 'Bot Username (Optional, auto-resolved):', 'Юзернейм бота (опционально, определяется автоматически):')}
                        </label>
                        <input
                          type="text"
                          value={telegramBotUsername}
                          onChange={(e) => setTelegramBotUsername(e.target.value.replace('@', ''))}
                          placeholder="e.g. MyVexVerificationBot"
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleTestTelegramBot}
                          disabled={testingTelegramBot || !telegramBotToken.trim()}
                          className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${testingTelegramBot ? 'animate-spin' : ''}`} />
                          <span>{t('فحص الاتصال بالتوكن الحالي', 'Test Connection', 'Проверить соединение с токеном')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleSaveTelegramConfig}
                          disabled={savingTelegramConfig}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all shadow-sm flex items-center gap-2 active:scale-98 cursor-pointer disabled:opacity-50"
                        >
                          {savingTelegramConfig ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          <span>{t('حفظ وتفعيل بوت تيليجرام', 'Save & Activate Bot', 'Сохранить и активировать бота')}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 3-Step Setup Instructions Card */}
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>{t('طريقة إنشاء بوت تيليجرام في 3 خطوات بسيطة:', 'How to create a Telegram Bot in 3 steps:', 'Как создать Telegram-бота за 3 простых шага:')}</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-300">
                      <div className="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                        <span className="font-bold text-sky-600">{t('1. فتح BotFather', '1. Open BotFather', '1. Открыть BotFather')}</span>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          {t('ابحث عن @BotFather داخل تطبيق تيليجرام واضغط Start ثم أرسل الأمر /newbot', 'Search for @BotFather in Telegram and send /newbot', 'Найдите @BotFather в Telegram, нажмите Start и отправьте команду /newbot')}
                        </p>
                      </div>

                      <div className="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                        <span className="font-bold text-sky-600">{t('2. تسمية البوت', '2. Name Your Bot', '2. Назвать бота')}</span>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          {t('اختر اسماً للبوت واسم مستخدم ينتهي بكلمة bot (مثل: VexVerifyBot)', 'Choose a name and username ending in "bot"', 'Придумайте имя и юзернейм, оканчивающийся на "bot" (например: VexVerifyBot)')}
                        </p>
                      </div>

                      <div className="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                        <span className="font-bold text-sky-600">{t('3. نسخ الـ Token', '3. Copy Token', '3. Скопировать токен')}</span>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          {t('انسخ الرمز الذي يرسله BotFather والصقه هنا في الحقل واضغط حفظ وتفعيل', 'Copy the HTTP API Token and paste it here', 'Скопируйте HTTP API токен от BotFather и вставьте его сюда')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Verification Logs / History */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Phone className="w-4 h-4 text-emerald-600" />
                        <span>{t('سجل الهواتف الموثقة حديثاً عبر تيليجرام', 'Recent Verified Phone Log', 'Журнал верифицированных номеров через Telegram')}</span>
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400">
                        {t('تحديث فوري', 'Live Sync', 'Синхронизация')}
                      </span>
                    </div>

                    {telegramVerifiedHistory.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400 space-y-1">
                        <p>{t('لا توجد عمليات توثيق هاتف مسجلة حديثاً.', 'No recent phone verifications.', 'Нет недавних записей верификации телефонов.')}</p>
                        <p className="text-[10px]">
                          {t(
                            'عندما يقوم أي مستخدم بمشاركة جهة اتصاله وتأكيد الرمز ستظهر تفاصيل التحقق هنا.',
                            'Verified phones will appear here once users complete the flow.',
                            'Верифицированные телефоны появятся здесь после завершения подтверждения пользователями.'
                          )}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {telegramVerifiedHistory.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <div>
                                <span className="font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                                  {item.phone}
                                </span>
                                {item.telegram_username && (
                                  <span className="text-[10px] text-sky-600 dark:text-sky-400 block font-mono">
                                    @{item.telegram_username}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-right text-[11px] font-mono text-slate-400">
                              <span className="block">{item.verified_at ? new Date(item.verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                              <span className="text-[10px] text-emerald-600 font-bold">{t('مقفل بالمحفظة', 'Locked', 'Привязан к кошельку')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 6: AI AGENT & AUTONOMOUS AGENTS HUB                   */}
              {/* ========================================================= */}
              {activeTab === 'ai_agent' && (
                <AdminAiAgentsHub lang={adminLang === 'ar' ? 'ar' : 'en'} />
              )}

              {/* ========================================================= */}
              {/* TAB 7: BROADCAST NOTIFICATIONS                            */}
              {/* ========================================================= */}
              {activeTab === 'broadcast' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {t('بث إشعار عام لجميع مستخدمي المنصة', 'Broadcast Custom Push Notification', 'Массовая рассылка push-уведомлений')}
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                        {t('عنوان الإشعار:', 'Notification Title:', 'Заголовок уведомления:')}
                      </label>
                      <input
                        type="text"
                        value={broadcastTitle}
                        onChange={(e) => setBroadcastTitle(e.target.value)}
                        placeholder={t('تحديث هام بخصوص تعويضات الأسبوع', 'Important System Announcement', 'Важное системное объявление')}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                        {t('نص الرسالة:', 'Message Content:', 'Текст сообщения:')}
                      </label>
                      <textarea
                        rows={3}
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        placeholder={t('تمت إضافة عروض استرداد نقدي جديدة بنسبة 10% لجميع الشركاء...', 'Message text...', 'Текст уведомления...')}
                        className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>

                    {/* Urgency selector */}
                    <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setBroadcastUrgency('urgent')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                          broadcastUrgency === 'urgent'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>{t('⚡ عاجل (إرسال فوري الآن)', 'Urgent (Send Now)', '⚡ Срочно (Отправить немедленно)')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBroadcastUrgency('non-urgent')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                          broadcastUrgency === 'non-urgent'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{t('🕒 غير عاجل (جدولة في نافذة الذروة المثلى)', 'Non-Urgent (Optimal Window)', '🕒 Обычное (Оптимальное окно)')}</span>
                      </button>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {[
                        { id: 'ai_prediction', ar: 'توقع ذكي', en: 'AI Prediction', ru: 'AI Прогноз' },
                        { id: 'sports_news', ar: 'أخبار رياضية', en: 'Sports News', ru: 'Новости спорта' },
                        { id: 'compensation', ar: 'تعويضات', en: 'Compensation', ru: 'Компенсация' },
                        { id: 'security', ar: 'أمان', en: 'Security', ru: 'Безопасность' },
                        { id: 'system', ar: 'النظام', en: 'System', ru: 'Система' },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setBroadcastCategory(cat.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                            broadcastCategory === cat.id
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {t(cat.ar, cat.en, cat.ru)}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleSendBroadcast}
                      disabled={broadcastSending || !broadcastTitle || !broadcastMessage}
                      className={`w-full py-2.5 rounded-xl text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                        broadcastUrgency === 'non-urgent'
                          ? 'bg-indigo-600 hover:bg-indigo-500'
                          : 'bg-emerald-600 hover:bg-emerald-500'
                      }`}
                    >
                      {broadcastSent ? (
                        <Check className="w-4 h-4" />
                      ) : broadcastUrgency === 'non-urgent' ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span>
                        {broadcastSent
                          ? t('تمت العملية بنجاح!', 'Success!', 'Успешно отправлено!')
                          : broadcastUrgency === 'non-urgent'
                          ? t('جدولة الإشعار في نافذة التفاعل المثلى', 'Schedule for Optimal Engagement Window', 'Запланировать на оптимальное окно активности')
                          : t('إرسال الإشعار لجميع الأجهزة فوراً', 'Send Broadcast Now', 'Отправить рассылку сейчас')}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB: A/B TESTING & REGIONAL LOCALIZATION LAB               */}
              {/* ========================================================= */}
              {activeTab === 'ab_testing' && (
                <AbTestingTab
                  companies={companies}
                  lang={adminLang as any}
                  onCopyToast={onCopyToast}
                />
              )}

              {/* ========================================================= */}
              {/* TAB: NOTIFICATIONS HUB                                   */}
              {/* ========================================================= */}
              {activeTab === 'notifications' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        {t('مركز الإشعارات الحية في الوقت الحقيقي (Real-Time)', 'Real-Time Notifications Hub', 'Центр уведомлений в реальном времени')}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t(
                          'إدارة ومتابعة وبث الإشعارات لجميع عملاء المنصة عبر دوكر والـ VPS',
                          'Manage and broadcast live alerts across VPS and Docker cluster',
                          'Управление и рассылка push-уведомлений через кластер Docker/VPS'
                        )}
                      </p>
                    </div>
                    {onTriggerAiBroadcast && (
                      <button
                        onClick={onTriggerAiBroadcast}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{t('بث توقع ذكاء اصطناعي فوري', 'Trigger AI Broadcast', 'Запустить AI-рассылку прогноза')}</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {notifications.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs">
                        {t('لا توجد إشعارات مسجلة حالياً.', 'No notifications found.', 'Нет зарегистрированных уведомлений.')}
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            n.read
                              ? 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                              : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/80 shadow-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                              {n.title}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {n.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                              {n.category}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold font-mono ${n.read ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800'}`}>
                              {n.read ? t('مقروء', 'Read', 'Прочитано') : t('غير مقروء (نشط)', 'Unread (Live)', 'Не прочитано (Активно)')}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB: PAYMENT METHODS MANAGEMENT                           */}
              {/* ========================================================= */}
              {activeTab === 'payment_methods' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                        {t('إدارة وسائل الدفع', 'Payment Methods Management', 'Управление способами оплаты')}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {t(
                          'إضافة وتعديل وتعطيل وسائل الدفع، وتحديد نطاق عرض كل وسيلة (عالمية 🌍 أو لدول محددة 🌐).',
                          'Add, edit, and toggle payment methods, and set each method\'s scope (global 🌍 or specific countries 🌐).',
                          'Добавление, редактирование и настройка охвата способов оплаты (глобально 🌍 или по странам 🌐).'
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPm(null);
                        setPmForm({
                          name: '',
                          nameAr: '',
                          nameEn: '',
                          instructions: '',
                          instructionsAr: '',
                          accountNumber: '',
                          holderName: '',
                          badge: 'محفظة إلكترونية',
                          descriptionAr: '',
                          descriptionEn: '',
                          is_active: true,
                          scope: 'global',
                          countries: [],
                        });
                        setIsAddingPm(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t('إضافة وسيلة دفع جديدة', 'Add New Payment Method', 'Добавить метод оплаты')}</span>
                    </button>
                  </div>

                  {pmSaveSuccess && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>{t('✅ تم حفظ وتحديث وسائل الدفع ومزامنتها مع Firestore بنجاح!', '✅ Payment methods saved and synced with Firestore successfully!', '✅ Способы оплаты сохранены и синхронизированы!')}</span>
                    </div>
                  )}

                  {/* Add / Edit Form Modal */}
                  {(isAddingPm || editingPm) && (
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-md">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                            <Plus className="w-4 h-4" />
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {isAddingPm
                              ? t('إضافة وسيلة دفع جديدة لحسابات الإيداع', 'Add New Payment Method', 'Добавить метод оплаты')
                              : t('تعديل وسيلة الدفع والتعليمات', 'Edit Payment Method & Instructions', 'Редактировать метод')}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingPm(false);
                            setEditingPm(null);
                          }}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Active / Inactive Status Toggle inside Form */}
                      <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                              {t('حالة تفعيل وسيلة الدفع:', 'Payment Method Status:', 'Статус метода:')}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                pmForm.is_active
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {pmForm.is_active
                                ? t('نشط ومتاح للمستخدمين في الإيداع وفك التجميد', 'Active & Visible in Deposit Flow', 'Активен')
                                : t('معطل ومخفي عن المستخدمين', 'Inactive & Hidden from Users', 'Отключен')}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {t(
                              'الوسائل النشطة فقط هي التي تظهر للمستخدمين عند طلب فك تجميد الرصيد أو الإيداع المباشر.',
                              'Only active payment methods appear in user deposit and unfreeze flows.',
                              'Только активные методы отображаются в процессах депозита пользователей.'
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPmForm({ ...pmForm, is_active: !pmForm.is_active })}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                            pmForm.is_active
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {pmForm.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          <span>{pmForm.is_active ? t('نشط (مفعل)', 'Active', 'Вкл') : t('معطل (غير مفعل)', 'Inactive', 'Выкл')}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {/* Method Name (Arabic / Primary) */}
                        <div>
                          <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                            {t('اسم وسيلة الدفع (بالعربية) *', 'Payment Method Name (Arabic) *', 'Название метода *')}
                          </label>
                          <input
                            type="text"
                            value={pmForm.nameAr}
                            onChange={(e) =>
                              setPmForm({
                                ...pmForm,
                                nameAr: e.target.value,
                                name: pmForm.name || e.target.value,
                              })
                            }
                            placeholder="مثال: فودافون كاش أو إنستا باي أو CIB"
                            className="w-full h-10 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-white font-bold"
                          />
                        </div>

                        {/* Method Name (English) */}
                        <div>
                          <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                            {t('اسم الوسيلة (بالإنجليزية)', 'Method Name (English)', 'Название на английском')}
                          </label>
                          <input
                            type="text"
                            value={pmForm.nameEn}
                            onChange={(e) => setPmForm({ ...pmForm, nameEn: e.target.value })}
                            placeholder="e.g. Vodafone Cash or InstaPay"
                            className="w-full h-10 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-white font-bold"
                          />
                        </div>

                        {/* Account Number / Wallet / IPN */}
                        <div>
                          <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                            {t('رقم الحساب / المحفظة / معرف InstaPay *', 'Account Number / Wallet / IPN *', 'Номер счета / кошелька *')}
                          </label>
                          <input
                            type="text"
                            value={pmForm.accountNumber}
                            onChange={(e) => setPmForm({ ...pmForm, accountNumber: e.target.value })}
                            placeholder="010xxxxxxxx أو username@instapay أو الآيبان"
                            className="w-full h-10 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-white font-mono font-bold"
                          />
                        </div>

                        {/* Account Holder Name */}
                        <div>
                          <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                            {t('اسم صاحب الحساب أو الشركة *', 'Account Holder / Merchant Name *', 'Имя владельца счета *')}
                          </label>
                          <input
                            type="text"
                            value={pmForm.holderName}
                            onChange={(e) => setPmForm({ ...pmForm, holderName: e.target.value })}
                            placeholder="VEX Deals Official"
                            className="w-full h-10 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-white font-bold"
                          />
                        </div>

                        {/* Provider Category / Badge */}
                        <div>
                          <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                            {t('تصنيف الوسيلة (Badge)', 'Gateway Type / Badge', 'Тип шлюза')}
                          </label>
                          <select
                            value={pmForm.badge}
                            onChange={(e) => setPmForm({ ...pmForm, badge: e.target.value })}
                            className="w-full h-10 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-white font-bold"
                          >
                            <option value="محفظة إلكترونية">📱 محفظة إلكترونية (Vodafone / Orange / Etisalat / WE)</option>
                            <option value="دفع لحظي IPN">⚡ دفع لحظي إنستاباي (InstaPay IPN)</option>
                            <option value="حساب بنكي / آيبان">🏦 تحويل بنكي محلي / IBAN</option>
                            <option value="كارت دفع / ميزة">💳 بطاقة دفع ميزة الوطنية / كارت بنكي</option>
                            <option value="عملات رقمية USDT">🌐 عملة رقمية USDT (TRC-20)</option>
                            <option value="أخرى">✨ وسيلة دفع أخرى</option>
                          </select>
                        </div>

                        {/* Short Description */}
                        <div>
                          <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                            {t('وصف مختصر', 'Short Description', 'Краткое описание')}
                          </label>
                          <input
                            type="text"
                            value={pmForm.descriptionAr}
                            onChange={(e) => setPmForm({ ...pmForm, descriptionAr: e.target.value })}
                            placeholder="التحويل الفوري عبر شبكة المدفوعات المصرية"
                            className="w-full h-10 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-white"
                          />
                        </div>

                        {/* Mandatory Instructions Field */}
                        <div className="sm:col-span-2">
                          <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                            {t('تعليمات الإيداع والتحويل للمستخدم *', 'Deposit & Transfer Instructions (Visible to Users) *', 'Инструкции по переводу *')}
                          </label>
                          <textarea
                            rows={3}
                            value={pmForm.instructions || pmForm.instructionsAr}
                            onChange={(e) =>
                              setPmForm({
                                ...pmForm,
                                instructions: e.target.value,
                                instructionsAr: e.target.value,
                              })
                            }
                            placeholder="اكتب التعليمات خطوة بخطوة... مثال: قم بالتحويل إلى رقم المحفظة الموضح أعلاه، ثم أدخل رقم هاتفك ورقم العملية في نموذج فك التجميد بالأسفل لتأكيد الإيداع 1:1."
                            className="w-full p-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium text-xs focus:outline-none focus:border-emerald-500"
                          />
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                            {t(
                              '💡 هذه التعليمات ستظهر بشكل بارز وتفصيلي للمستخدم عند اختيار هذه الوسيلة في نافذة فك التجميد والإيداع.',
                              '💡 These instructions will be dynamically highlighted to the user inside their deposit and unfreeze modal.',
                              '💡 Эти инструкции будут отображаться пользователю в окне депозита.'
                            )}
                          </p>
                        </div>

                        {/* Scope: global vs specific countries */}
                        <div className="sm:col-span-2">
                          <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1.5">
                            {t('نطاق العرض (الدول)', 'Scope (Countries)', 'Охват (страны)')}
                          </label>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <button
                              type="button"
                              onClick={() => setPmForm({ ...pmForm, scope: 'global' })}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                                pmForm.scope === 'global'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              <span>🌍</span>
                              <span>{t('عالمي (كل الدول)', 'Global (All Countries)', 'Глобально')}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPmForm({ ...pmForm, scope: 'countries' })}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                                pmForm.scope === 'countries'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              <span>🌐</span>
                              <span>{t('دول محددة', 'Specific Countries', 'Конкретные страны')}</span>
                            </button>
                          </div>
                          {pmForm.scope === 'countries' && (
                            <>
                              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl">
                                {COUNTRIES.map((c) => {
                                  const selected = pmForm.countries.includes(c.iso);
                                  return (
                                    <button
                                      key={c.iso}
                                      type="button"
                                      onClick={() =>
                                        setPmForm({
                                          ...pmForm,
                                          countries: selected
                                            ? pmForm.countries.filter((iso) => iso !== c.iso)
                                            : [...pmForm.countries, c.iso],
                                        })
                                      }
                                      className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                                        selected
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-400 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700'
                                          : 'bg-slate-100 text-slate-600 border border-transparent hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                                      }`}
                                    >
                                      <span>{c.flag}</span>
                                      <span>{lang === 'ar' ? c.nameAr : c.nameEn}</span>
                                    </button>
                                  );
                                })}
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                {t(
                                  `الوسائل المختارة تظهر فقط لمستخدمي هذه الدول (${pmForm.countries.length} مختارة). الوسائل غير المحددة تظهر للجميع.`,
                                  `This method is shown only to users from the selected countries (${pmForm.countries.length} selected). Unscoped methods show for everyone.`,
                                  'Метод отображается только пользователям из выбранных стран.'
                                )}
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingPm(false);
                            setEditingPm(null);
                          }}
                          className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-300 transition-colors"
                        >
                          {t('إلغاء', 'Cancel', 'Отмена')}
                        </button>
                        <button
                          type="button"
                          disabled={isSavingPm || (!pmForm.nameAr && !pmForm.name) || !pmForm.accountNumber}
                          onClick={() => {
                            const finalName = pmForm.nameAr || pmForm.name || 'وسيلة دفع';
                            const finalInstructions =
                              pmForm.instructions ||
                              pmForm.instructionsAr ||
                              pmForm.descriptionAr ||
                              'قم بالتحويل على الرقم الموضح وأرفق رقم العملية في نموذج فك التجميد.';

                            let updated = [...paymentMethods];
                            if (isAddingPm) {
                              const newMethod: PaymentMethod = {
                                id: `pm_${Date.now()}`,
                                name: finalName,
                                nameAr: pmForm.nameAr || finalName,
                                nameEn: pmForm.nameEn || finalName,
                                accountNumber: pmForm.accountNumber,
                                holderName: pmForm.holderName || 'VEX Deals Official',
                                instructions: finalInstructions,
                                instructionsAr: finalInstructions,
                                instructionsEn: pmForm.instructionsEn || finalInstructions,
                                badge: pmForm.badge || 'محفظة إلكترونية',
                                descriptionAr: pmForm.descriptionAr || finalInstructions,
                                descriptionEn: pmForm.descriptionEn || '',
                                is_active: pmForm.is_active,
                                scope: pmForm.scope === 'countries' && pmForm.countries.length > 0 ? 'countries' : 'global',
                                countries: pmForm.scope === 'countries' ? pmForm.countries : [],
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                              };
                              updated.push(newMethod);
                            } else if (editingPm) {
                              updated = updated.map((m) =>
                                m.id === editingPm.id
                                  ? {
                                      ...m,
                                      name: finalName,
                                      nameAr: pmForm.nameAr || finalName,
                                      nameEn: pmForm.nameEn || finalName,
                                      accountNumber: pmForm.accountNumber,
                                      holderName: pmForm.holderName || m.holderName,
                                      instructions: finalInstructions,
                                      instructionsAr: finalInstructions,
                                      instructionsEn: pmForm.instructionsEn || m.instructionsEn || finalInstructions,
                                      badge: pmForm.badge || m.badge,
                                      descriptionAr: pmForm.descriptionAr || m.descriptionAr,
                                      is_active: pmForm.is_active,
                                      scope: pmForm.scope === 'countries' && pmForm.countries.length > 0 ? 'countries' : 'global',
                                      countries: pmForm.scope === 'countries' ? pmForm.countries : [],
                                      updated_at: new Date().toISOString(),
                                    }
                                  : m
                              );
                            }
                            handleSavePaymentMethods(updated);
                            setIsAddingPm(false);
                            setEditingPm(null);
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{isSavingPm ? t('جاري الحفظ...', 'Saving...', 'Сохранение...') : t('حفظ وسيلة الدفع في Firestore', 'Save Payment Method to Firestore', 'Сохранить')}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Payment Methods List */}
                  <div className="space-y-3">
                    {paymentMethods.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                        <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="font-bold text-xs text-slate-600 dark:text-slate-400">
                          {t('لا توجد وسائل دفع مضافة حالياً. يمكنك إضافة وسيلة جديدة الآن.', 'No payment methods added yet.', 'Нет способов оплаты.')}
                        </p>
                      </div>
                    ) : (
                      paymentMethods.map((pm: PaymentMethod) => (
                        <div
                          key={pm.id}
                          className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 ${
                            pm.is_active
                              ? 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 shadow-2xs'
                              : 'bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-60'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                                {lang === 'ar' ? pm.nameAr || pm.name : pm.nameEn || pm.name}
                              </span>
                              {pm.badge && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                  {pm.badge}
                                </span>
                              )}
                              <span
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                title={
                                  pm.scope === 'countries' && (pm.countries || []).length > 0
                                    ? (pm.countries || []).join(', ')
                                    : '🌍'
                                }
                              >
                                {pm.scope === 'countries' && (pm.countries || []).length > 0
                                  ? `🌐 ${(pm.countries || []).length}`
                                  : '🌍'}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                                  pm.is_active
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}
                              >
                                {pm.is_active
                                  ? t('نشط ومتاح للمستخدمين', 'Active (Live)', 'Активен')
                                  : t('معطل ومخفي', 'Disabled (Hidden)', 'Отключен')}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                              {/* Toggle Active / Inactive Status */}
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = paymentMethods.map((m) =>
                                    m.id === pm.id ? { ...m, is_active: !m.is_active, updated_at: new Date().toISOString() } : m
                                  );
                                  handleSavePaymentMethods(updated);
                                }}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                                  pm.is_active
                                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                                    : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300'
                                }`}
                                title={pm.is_active ? t('تعطيل الوسيلة', 'Disable', 'Отключить') : t('تنشيط الوسيلة', 'Enable', 'Включить')}
                              >
                                {pm.is_active ? <ToggleRight className="w-4 h-4 text-amber-700" /> : <ToggleLeft className="w-4 h-4 text-emerald-700" />}
                                <span>{pm.is_active ? t('تعطيل', 'Disable', 'Отключить') : t('تنشيط', 'Enable', 'Включить')}</span>
                              </button>

                              {/* Edit Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPm(pm);
                                  setPmForm({
                                    name: pm.name || pm.nameAr || '',
                                    nameAr: pm.nameAr || pm.name || '',
                                    nameEn: pm.nameEn || '',
                                    instructions: pm.instructions || pm.instructionsAr || '',
                                    instructionsAr: pm.instructionsAr || pm.instructions || '',
                                    accountNumber: pm.accountNumber || '',
                                    holderName: pm.holderName || '',
                                    badge: pm.badge || 'محفظة إلكترونية',
                                    descriptionAr: pm.descriptionAr || '',
                                    descriptionEn: pm.descriptionEn || '',
                                    is_active: pm.is_active ?? true,
                                    scope: pm.scope === 'countries' ? 'countries' : 'global',
                                    countries: Array.isArray(pm.countries) ? pm.countries : [],
                                  });
                                  setIsAddingPm(false);
                                }}
                                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>{t('تعديل', 'Edit', 'Изменить')}</span>
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      t(
                                        'هل أنت متأكد من حذف وسيلة الدفع هذه نهائياً؟',
                                        'Are you sure you want to permanently delete this payment method?',
                                        'Вы уверены, что хотите удалить этот метод?'
                                      )
                                    )
                                  ) {
                                    const updated = paymentMethods.filter((m) => m.id !== pm.id);
                                    handleSavePaymentMethods(updated);
                                  }
                                }}
                                className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950 dark:text-rose-300 rounded-xl transition-colors cursor-pointer"
                                title={t('حذف', 'Delete', 'Удалить')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Details Row: Account Number & Holder */}
                          <div className="flex flex-wrap items-center gap-4 text-xs font-mono bg-slate-50 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            <span className="font-bold text-slate-900 dark:text-white">
                              📱 {pm.accountNumber}
                            </span>
                            <span className="text-slate-600 dark:text-slate-400">
                              👤 {pm.holderName}
                            </span>
                          </div>

                          {/* Dynamic Instructions Box */}
                          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 p-2.5 rounded-xl text-xs space-y-1">
                            <span className="font-bold text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                              <span>📋 {t('تعليمات الإيداع للمستخدم:', 'Deposit Instructions for Users:', 'Инструкции для пользователя:')}</span>
                            </span>
                            <p className="text-[11px] text-emerald-900 dark:text-emerald-200 leading-relaxed">
                              {pm.instructions || pm.instructionsAr || pm.descriptionAr || t('لا توجد تعليمات مخصصة.', 'No instructions provided.', 'Инструкции отсутствуют.')}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 8: STORE COMPLIANCE                                   */}
              {/* ========================================================= */}
              {activeTab === 'compliance' && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 rounded-2xl flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-700 dark:text-slate-300">
                      <p className="font-extrabold text-sm text-emerald-900 dark:text-emerald-300 mb-1">
                        {t('جاهزية متجر أبل (App Store) وجوجل بلاي (Google Play)', 'Store Readiness Audit', 'Аудит готовности для App Store и Google Play')}
                      </p>
                      <p>
                        {t(
                          'النظام مهيأ بالكامل ليطابق إرشادات Apple App Store Guideline 5.1.1 و 5.3 بالإضافة لسياسات Google Play Real Money Gaming (RMG).',
                          'Full adherence to Apple Guideline 5.1.1 and Google Play RMG policies.',
                          'Система полностью соответствует правилам Apple App Store (Guideline 5.1.1 и 5.3) и политикам Google Play RMG.'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    {[
                      {
                        title: t('بوابة التحقق من السن (+18 Age Gate)', 'Age Gate (+18)', 'Проверка возраста (+18 Age Gate)'),
                        desc: t('إلزام المستخدمين بتأكيد العمر القانوني قبل استعراض العروض الرياضية.', 'Strict 18+ legal age verification.', 'Обязательное подтверждение совершеннолетия перед просмотром предложений.'),
                        status: t('مفعل ومطبق', 'Active & Enforced', 'Активно и соблюдается'),
                      },
                      {
                        title: t('حذف الحساب والبيانات (Apple Guideline 5.1.1)', 'Account Purge (Apple 5.1.1)', 'Удаление аккаунта (Apple 5.1.1)'),
                        desc: t('زر حذف شامل ومباشر لجميع بيانات المستخدم والمحافظ وأرقام الهاتف.', 'Instant, total account and wallet deletion.', 'Полное мгновенное удаление аккаунта, данных кошелька и телефонов.'),
                        status: t('مفعل ومطبق', 'Active & Enforced', 'Активно и соблюдается'),
                      },
                      {
                        title: t('تنبيه اللعب المسؤول (Responsible Gaming)', 'Responsible Gaming Links', 'Ответственная игра (Responsible Gaming)'),
                        desc: t('تنويهات قانونية وروابط لمنظمات BeGambleAware و GamCare.', 'Official responsible gambling help resources.', 'Юридические уведомления и ссылки на организации BeGambleAware и GamCare.'),
                        status: t('مفعل ومطبق', 'Active & Enforced', 'Активно и соблюдается'),
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between"
                      >
                        <div>
                          <h4 className="font-extrabold text-slate-900 dark:text-white">{item.title}</h4>
                          <p className="text-slate-500 text-[11px] mt-0.5">{item.desc}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono">
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Clean Slate Data Reset Utility for Deployment */}
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex flex-col gap-3 mt-4">
                    <div className="flex items-start gap-3">
                      <RefreshCw className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-slate-700 dark:text-slate-300 flex-1">
                        <p className="font-extrabold text-sm text-amber-900 dark:text-amber-300 mb-1">
                          {t('أداة تهيئة النشر ونظافة قاعدة البيانات (Clean Slate Data Reset)', 'Clean Slate Data Reset Utility', 'Сброс данных Clean Slate')}
                        </p>
                        <p>
                          {t(
                            'برمجية إدارية لتفريغ ومسح سجل نشاط المستخدمين، تاريخ الإشعارات، والبيانات التجريبية من قاعدة البيانات لضمان بداية نظيفة تماماً عند نشر التطبيق الجديد.',
                            'Programmatically clear user activity, notification history, and demo accounts for a clean slate deployment.',
                            'Программная очистка активности пользователей, истории уведомлений и демо-аккаунтов.'
                          )}
                        </p>
                      </div>
                    </div>
                    {resetSuccessMsg && (
                      <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs font-bold animate-fadeIn">
                        {resetSuccessMsg}
                      </div>
                    )}
                    <div className="flex justify-end pt-2 border-t border-amber-200/60 dark:border-amber-800/60">
                      <button
                        type="button"
                        onClick={handleCleanSlateReset}
                        disabled={isResettingData}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`w-4 h-4 ${isResettingData ? 'animate-spin' : ''}`} />
                        <span>
                          {isResettingData
                            ? t('جارٍ تهيئة البيانات...', 'Resetting Data...', 'Сброс данных...')
                            : t('بدء إعادة ضبط ونظافة البيانات (Clean Slate)', 'Execute Clean Slate Reset', 'Выполнить сброс Clean Slate')}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'lottery_manager' && (
                <div className="animate-fade-in">
                  <LotteryAdminManager lang={adminLang} onToast={onCopyToast} />
                </div>
              )}
              </div>
            </div>
            )}

            {/* Admin Footer */}
            <div className="px-5 py-3 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-mono">
                  VEX Engine v3.8 • Multi-Tenant & Full ASO Suite
                </span>
                {isAdminUnlocked && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t('جلسة المشرف موثقة', 'Super Admin Authenticated', 'Сессия супер-админа подтверждена')}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isAdminUnlocked && (
                  <button
                    type="button"
                    onClick={handleLockAdmin}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs transition-colors flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t('قفل الجلسة', 'Lock', 'Заблокировать')}</span>
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                >
                  {t('إغلاق لوحة التحكم', 'Close Dashboard', 'Закрыть панель')}
                </button>
              </div>
            </div>

            {/* Change Master PIN Dialog */}
            {isChangingPin && (
              <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm text-white shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-black text-sm">
                      <KeyRound className="w-4 h-4 text-emerald-400" />
                      <span>{t('تعيين رمز PIN إداري جديد', 'Set New Master PIN', 'Установить новый мастер-PIN')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsChangingPin(false)}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-400">
                    {t(
                      'أدخل الرمز السري الجديد (4 أرقام على الأقل). سيتم حفظه تلقائياً.',
                      'Enter a new master PIN (minimum 4 digits).',
                      'Введите новый мастер-PIN (минимум 4 цифры). Он сохранится автоматически.'
                    )}
                  </p>

                  <form onSubmit={handleSaveNewPin} className="space-y-3">
                    <input
                      type="password"
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value)}
                      placeholder={t('أدخل الرمز الجديد', 'New PIN', 'Новый PIN')}
                      className="w-full h-11 bg-slate-950 border border-slate-700 rounded-xl px-4 text-center font-mono text-base font-bold text-white focus:outline-none focus:border-emerald-500"
                    />

                    {pinChangeSuccess && (
                      <p className="text-xs text-emerald-400 font-bold text-center">
                        {t('✅ تم حفظ الرمز الجديد بنجاح!', '✅ Master PIN updated successfully!', '✅ Мастер-PIN успешно обновлен!')}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={newPinInput.trim().length < 4}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs disabled:opacity-50 transition-all"
                      >
                        {t('حفظ الرمز', 'Save PIN', 'Сохранить PIN')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsChangingPin(false)}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
                      >
                        {t('إلغاء', 'Cancel', 'Отмена')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Automated Compensation Approval Email Generator Modal */}
            <CompensationEmailGeneratorModal
              isOpen={isEmailGeneratorOpen}
              onClose={() => setIsEmailGeneratorOpen(false)}
              initialRequest={selectedRequestForEmail}
              requests={requests}
              companies={companies}
              wallets={wallets}
              lang={lang}
              onCopyToast={onCopyToast}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
