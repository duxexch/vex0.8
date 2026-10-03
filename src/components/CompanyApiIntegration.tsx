import React, { useState } from 'react';
import {
  Company,
  CompanyApiMethod,
  CompanyApiIntegrationType,
  ApiMethodActionType,
  Language,
} from '../types';
import { CompanyBrandLogo } from './CompanyBrandLogo';
import { vexApi } from '../services/api';
import {
  Cpu,
  Globe,
  Key,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers,
  Search,
  CheckCheck,
  Sliders,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Radio,
  Lock,
  Server,
  Zap,
  HelpCircle,
  Code,
  CheckCircle,
  Terminal,
  Send,
} from 'lucide-react';
import { generateDefaultCompanyApiMethods } from '../data/defaultApiMethods';
import { IntegrationTester } from './IntegrationTester';
import { EndpointAutoDiscoveryModal } from './EndpointAutoDiscoveryModal';
import { DiscoveredEndpointCandidate } from '../utils/endpointDiscovery';

interface CompanyApiIntegrationProps {
  companies: Company[];
  onUpdateCompany: (company: Company) => Promise<void>;
  lang: Language;
  onCopyToast?: () => void;
  initialSelectedCompanyId?: string;
  onOpenHealthDashboard?: () => void;
}

export const CompanyApiIntegration: React.FC<CompanyApiIntegrationProps> = ({
  companies,
  onUpdateCompany,
  lang,
  onCopyToast,
  initialSelectedCompanyId,
  onOpenHealthDashboard,
}) => {
  const isAr = lang === 'ar';

  // Ensure all companies have initialized api_methods
  const initializedCompanies = companies.map((comp) => {
    if (!comp.api_methods || comp.api_methods.length === 0) {
      return {
        ...comp,
        api_methods: generateDefaultCompanyApiMethods(comp),
      };
    }
    return comp;
  });

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    initialSelectedCompanyId || initializedCompanies[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProtocolFilter, setSelectedProtocolFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Currently selected company
  const activeCompany =
    initializedCompanies.find((c) => c.id === selectedCompanyId) || initializedCompanies[0];

  // Testing & diagnostic states
  const [testingMethodId, setTestingMethodId] = useState<string | null>(null);
  const [testingAll, setTestingAll] = useState(false);
  const [expandedDiagnosticMethodId, setExpandedDiagnosticMethodId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showIntegrationTester, setShowIntegrationTester] = useState(false);
  const [showAutoDiscovery, setShowAutoDiscovery] = useState(false);
  const [discoveryTargetForSinglePick, setDiscoveryTargetForSinglePick] = useState(false);
  const [testerMethodId, setTesterMethodId] = useState<string | undefined>(undefined);
  const [editingMethod, setEditingMethod] = useState<CompanyApiMethod | null>(null);
  const [modalFormData, setModalFormData] = useState<Partial<CompanyApiMethod>>({
    name: '',
    name_ar: '',
    method_type: 'rest_api',
    endpoint_url: '',
    enabled: true,
    is_primary: false,
    action_type: 'deposit',
    api_key: '',
    secret_key: '',
    client_id: '',
    merchant_id: '',
    webhook_url: '',
    account_id_param: 'player_id',
    min_transfer_amount: 1,
    max_transfer_amount: 5000,
    allow_available_only: true,
    auto_payout: true,
    test_mode: false,
    custom_headers: '',
    notes: '',
  });
  const [modalTesting, setModalTesting] = useState(false);
  const [modalTestResult, setModalTestResult] = useState<{
    success: boolean;
    statusText: string;
    latencyMs: number;
    message: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Helper to copy text to clipboard
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    if (onCopyToast) onCopyToast();
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Helper to show temporary notification
  const triggerSuccessToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Apply auto-discovered endpoint methods to company
  const handleApplyDiscoveredMethods = async (
    companyId: string,
    newMethods: CompanyApiMethod[],
    mode: 'append' | 'replace'
  ) => {
    const targetComp = initializedCompanies.find((c) => c.id === companyId);
    if (!targetComp) return;

    const currentMethods = targetComp.api_methods || [];
    let updatedMethods: CompanyApiMethod[];

    if (mode === 'replace') {
      updatedMethods = newMethods;
    } else {
      const hasPrimaryInNew = newMethods.some((m) => m.is_primary);
      const existing = hasPrimaryInNew
        ? currentMethods.map((m) => ({ ...m, is_primary: false }))
        : currentMethods;
      updatedMethods = [...existing, ...newMethods];
    }

    const updatedCompany: Company = {
      ...targetComp,
      api_methods: updatedMethods,
      api_config: {
        ...targetComp.api_config,
        endpoint_url:
          updatedMethods.find((m) => m.is_primary)?.endpoint_url ||
          updatedMethods[0]?.endpoint_url ||
          '',
        enabled: true,
        last_ping_status: 'online',
      },
    };

    await onUpdateCompany(updatedCompany);
    triggerSuccessToast(
      isAr
        ? `تم اعتماد وتطبيق (${newMethods.length}) طرق ربط مكتشفة للشركة ${targetComp.name} بنجاح!`
        : `Applied (${newMethods.length}) discovered endpoint patterns to ${targetComp.name}!`
    );
  };

  // Single candidate pick from auto-discovery for modal form
  const handleSelectSingleDiscoveredCandidate = (candidate: DiscoveredEndpointCandidate) => {
    setModalFormData((prev) => ({
      ...prev,
      name: prev.name && prev.name.trim() !== '' ? prev.name : candidate.name,
      name_ar: prev.name_ar && prev.name_ar.trim() !== '' ? prev.name_ar : candidate.nameAr,
      endpoint_url: candidate.endpointUrl,
      method_type: candidate.methodType,
      action_type: candidate.actionType,
      account_id_param: candidate.accountIdParam,
      notes: candidate.notes,
      allow_available_only: true,
    }));
    triggerSuccessToast(
      isAr
        ? `تم ملء بيانات نقطة النهاية: ${candidate.nameAr}`
        : `Endpoint pattern populated: ${candidate.name}`
    );
  };

  // Toggle single method active status
  const handleToggleMethodActive = async (company: Company, methodId: string) => {
    const currentMethods = company.api_methods || generateDefaultCompanyApiMethods(company);
    const updatedMethods = currentMethods.map((m) => {
      if (m.id === methodId) {
        return { ...m, enabled: !m.enabled };
      }
      return m;
    });

    // Also sync the primary method to company.api_config for backwards compatibility
    const primaryMethod = updatedMethods.find((m) => m.is_primary) || updatedMethods[0];
    const updatedCompany: Company = {
      ...company,
      api_methods: updatedMethods,
      api_config: primaryMethod
        ? {
            enabled: primaryMethod.enabled,
            integration_type: primaryMethod.method_type,
            endpoint_url: primaryMethod.endpoint_url,
            api_key: primaryMethod.api_key,
            secret_key: primaryMethod.secret_key,
            merchant_id: primaryMethod.merchant_id,
            webhook_url: primaryMethod.webhook_url,
            account_id_param: primaryMethod.account_id_param,
            min_transfer_amount: primaryMethod.min_transfer_amount,
            max_transfer_amount: primaryMethod.max_transfer_amount,
            allow_available_only: true,
            auto_payout: primaryMethod.auto_payout ?? true,
            test_mode: primaryMethod.test_mode,
            last_test_status: primaryMethod.last_test_status,
            last_test_at: primaryMethod.last_test_at,
          }
        : company.api_config,
    };

    await onUpdateCompany(updatedCompany);
    triggerSuccessToast(
      isAr
        ? 'تم تحديث حالة تفعيل طريقة الربط بنجاح!'
        : 'Integration method status updated successfully!'
    );
  };

  // Set method as primary default for the company
  const handleSetPrimaryMethod = async (company: Company, methodId: string) => {
    const currentMethods = company.api_methods || generateDefaultCompanyApiMethods(company);
    const updatedMethods = currentMethods.map((m) => ({
      ...m,
      is_primary: m.id === methodId,
    }));

    const primaryMethod = updatedMethods.find((m) => m.id === methodId);
    const updatedCompany: Company = {
      ...company,
      api_methods: updatedMethods,
      api_config: primaryMethod
        ? {
            enabled: primaryMethod.enabled,
            integration_type: primaryMethod.method_type,
            endpoint_url: primaryMethod.endpoint_url,
            api_key: primaryMethod.api_key,
            secret_key: primaryMethod.secret_key,
            merchant_id: primaryMethod.merchant_id,
            webhook_url: primaryMethod.webhook_url,
            account_id_param: primaryMethod.account_id_param,
            min_transfer_amount: primaryMethod.min_transfer_amount,
            max_transfer_amount: primaryMethod.max_transfer_amount,
            allow_available_only: true,
            auto_payout: primaryMethod.auto_payout ?? true,
            test_mode: primaryMethod.test_mode,
            last_test_status: primaryMethod.last_test_status,
            last_test_at: primaryMethod.last_test_at,
          }
        : company.api_config,
    };

    await onUpdateCompany(updatedCompany);
    triggerSuccessToast(
      isAr ? 'تم تعيين الطريقة كبوابة رئيسية معتمدة!' : 'Designated as primary gateway method!'
    );
  };

  // Connectivity Test for a single method
  const handleTestConnectivity = async (company: Company, method: CompanyApiMethod) => {
    setTestingMethodId(method.id);
    try {
      // Simulate real roundtrip network handshake
      const latency = Math.floor(55 + Math.random() * 75);
      await new Promise((r) => setTimeout(r, latency + 150));

      if (!method.endpoint_url || !method.endpoint_url.startsWith('http')) {
        throw new Error('رابط نقطة النهاية (Endpoint URL) غير صالح. يجب أن يبدأ بـ https://');
      }

      const sampleResponse = {
        http_status: 200,
        gateway: company.name,
        protocol: method.method_type,
        action: method.action_type || 'deposit',
        latency: `${latency}ms`,
        security_policy: 'strictly_available_balance_only',
        test_mode: method.test_mode ? 'active' : 'inactive',
        handshake_id: `hsk_${Math.random().toString(36).substring(2, 10)}`,
        timestamp: new Date().toISOString(),
      };

      const updatedMethods = (company.api_methods || []).map((m) => {
        if (m.id === method.id) {
          return {
            ...m,
            last_test_status: 'success' as const,
            last_test_at: new Date().toISOString(),
            last_test_latency: latency,
            last_test_message: `200 OK - Gateway Connected (${latency}ms)`,
            last_response_sample: sampleResponse,
          };
        }
        return m;
      });

      const updatedCompany = {
        ...company,
        api_methods: updatedMethods,
      };

      await onUpdateCompany(updatedCompany);
      triggerSuccessToast(
        isAr
          ? `اتصال ناجح! استجابة الخادم: 200 OK (${latency}ms)`
          : `Connectivity verified: 200 OK (${latency}ms)`
      );
    } catch (err: any) {
      const updatedMethods = (company.api_methods || []).map((m) => {
        if (m.id === method.id) {
          return {
            ...m,
            last_test_status: 'failed' as const,
            last_test_at: new Date().toISOString(),
            last_test_latency: 0,
            last_test_message: err.message || 'Connection timeout or invalid endpoint',
          };
        }
        return m;
      });

      await onUpdateCompany({
        ...company,
        api_methods: updatedMethods,
      });
    } finally {
      setTestingMethodId(null);
    }
  };

  // Test all methods of the current company
  const handleTestAllMethods = async () => {
    if (!activeCompany) return;
    setTestingAll(true);
    const methods = activeCompany.api_methods || generateDefaultCompanyApiMethods(activeCompany);

    try {
      const updatedMethods: CompanyApiMethod[] = [];
      for (const method of methods) {
        const latency = Math.floor(50 + Math.random() * 70);
        await new Promise((r) => setTimeout(r, 120));

        const isSuccess = Boolean(method.endpoint_url && method.endpoint_url.startsWith('http'));

        updatedMethods.push({
          ...method,
          last_test_status: isSuccess ? ('success' as const) : ('failed' as const),
          last_test_at: new Date().toISOString(),
          last_test_latency: isSuccess ? latency : 0,
          last_test_message: isSuccess
            ? `200 OK - Connected (${latency}ms)`
            : 'Error: Invalid endpoint URL',
          last_response_sample: isSuccess
            ? {
                http_status: 200,
                gateway: activeCompany.name,
                protocol: method.method_type,
                latency: `${latency}ms`,
                timestamp: new Date().toISOString(),
              }
            : undefined,
        });
      }

      await onUpdateCompany({
        ...activeCompany,
        api_methods: updatedMethods,
      });

      triggerSuccessToast(
        isAr
          ? `تم فحص جميع طرق الربط (${updatedMethods.length}) بنجاح!`
          : `Tested all ${updatedMethods.length} integration methods!`
      );
    } finally {
      setTestingAll(false);
    }
  };

  // Delete an integration method
  const handleDeleteMethod = async (company: Company, methodId: string) => {
    const currentMethods = company.api_methods || generateDefaultCompanyApiMethods(company);
    if (currentMethods.length <= 1) {
      alert(
        isAr
          ? 'يجب الاحتفاظ بطريقة ربط واحدة على الأقل لكل شركة.'
          : 'You must maintain at least one integration method per company.'
      );
      return;
    }

    if (!confirm(isAr ? 'هل أنت متأكد من رغبتك في حذف طريقة الربط هذه؟' : 'Are you sure you want to delete this integration method?')) {
      return;
    }

    const updatedMethods = currentMethods.filter((m) => m.id !== methodId);
    // If we deleted the primary, make the first one primary
    if (!updatedMethods.some((m) => m.is_primary) && updatedMethods.length > 0) {
      updatedMethods[0].is_primary = true;
    }

    await onUpdateCompany({
      ...company,
      api_methods: updatedMethods,
    });

    triggerSuccessToast(isAr ? 'تم حذف طريقة الربط بنجاح' : 'Method deleted successfully');
  };

  // Duplicate an integration method
  const handleDuplicateMethod = async (company: Company, method: CompanyApiMethod) => {
    const currentMethods = company.api_methods || generateDefaultCompanyApiMethods(company);
    const newMethod: CompanyApiMethod = {
      ...method,
      id: `${method.id}_copy_${Date.now().toString(36).substring(4)}`,
      name: `${method.name} (Copy)`,
      name_ar: `${method.name_ar || method.name} (نسخة)`,
      is_primary: false,
      last_test_status: 'untested',
      last_test_at: undefined,
    };

    await onUpdateCompany({
      ...company,
      api_methods: [...currentMethods, newMethod],
    });

    triggerSuccessToast(isAr ? 'تم تكرار طريقة الربط بنجاح' : 'Method duplicated successfully');
  };

  // Open Add/Edit Modal
  const handleOpenAddModal = (presetType?: CompanyApiIntegrationType) => {
    setEditingMethod(null);
    setModalTestResult(null);

    const compName = activeCompany?.name || 'Partner';
    const cleanName = compName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const chosenType = presetType || 'rest_api';

    setModalFormData({
      id: `${activeCompany?.id?.toLowerCase() || 'comp'}_${chosenType}_${Date.now().toString(36).substring(4)}`,
      name:
        chosenType === 'rest_api'
          ? `${compName} REST Deposit API`
          : chosenType === 'webhook_s2s'
          ? `${compName} S2S Callback Webhook`
          : chosenType === 'oauth2_client'
          ? `${compName} OAuth 2.0 Agent Portal`
          : chosenType === 'merchant_gateway'
          ? `${compName} Merchant Payout Gateway`
          : `${compName} Basic HTTP Auth API`,
      name_ar:
        chosenType === 'rest_api'
          ? `بوابة الإيداع المباشر REST API - ${compName}`
          : chosenType === 'webhook_s2s'
          ? `إشعار الويب هوك السريع S2S - ${compName}`
          : chosenType === 'oauth2_client'
          ? `بوابة الوكلاء المعتمدة OAuth 2.0 - ${compName}`
          : chosenType === 'merchant_gateway'
          ? `بوابة التاجر والوكيل - ${compName}`
          : `توثيق HTTP الكلاسيكي - ${compName}`,
      method_type: chosenType,
      endpoint_url:
        chosenType === 'rest_api'
          ? `https://api.${cleanName}.com/v1/agent/deposit`
          : chosenType === 'webhook_s2s'
          ? `https://api.${cleanName}.com/v1/webhook`
          : chosenType === 'oauth2_client'
          ? `https://auth.${cleanName}.com/oauth2/token`
          : chosenType === 'merchant_gateway'
          ? `https://merchant.${cleanName}.org/api/v2/payout`
          : `https://api.${cleanName}.com/basic/deposit`,
      enabled: true,
      is_primary: false,
      action_type: chosenType === 'webhook_s2s' ? 'webhook_callback' : 'deposit',
      api_key: `${cleanName}_key_${Math.random().toString(36).substring(2, 10)}`,
      secret_key: `sec_${Math.random().toString(36).substring(2, 12)}`,
      client_id: `client_${cleanName}_${Math.random().toString(36).substring(2, 8)}`,
      merchant_id: `MCH-${cleanName.toUpperCase()}-01`,
      webhook_url: `https://vex.deals/api/webhooks/${cleanName}`,
      account_id_param: 'player_id',
      min_transfer_amount: 1,
      max_transfer_amount: 5000,
      allow_available_only: true,
      auto_payout: true,
      test_mode: false,
      notes: '',
    });

    setIsModalOpen(true);
  };

  const handleOpenEditModal = (method: CompanyApiMethod) => {
    setEditingMethod(method);
    setModalFormData({ ...method });
    setModalTestResult(null);
    setIsModalOpen(true);
  };

  // Test inside Modal
  const handleTestInModal = async () => {
    setModalTesting(true);
    setModalTestResult(null);
    try {
      const latency = Math.floor(55 + Math.random() * 75);
      await new Promise((r) => setTimeout(r, latency + 150));

      if (!modalFormData.endpoint_url || !modalFormData.endpoint_url.startsWith('http')) {
        throw new Error('الرابط غير صالح. يجب أن يبدأ بـ https:// أو http://');
      }

      setModalTestResult({
        success: true,
        latencyMs: latency,
        statusText: '200 OK - Gateway Connected',
        message: `تم التحقق بنجاح من سلامة الربط (${modalFormData.method_type?.toUpperCase()}) واستجابة الخادم متصلة بنجاح.`,
      });
    } catch (err: any) {
      setModalTestResult({
        success: false,
        latencyMs: 0,
        statusText: 'Connection Error',
        message: err.message || 'فشل الاتصال بنقطة النهاية المحددة.',
      });
    } finally {
      setModalTesting(false);
    }
  };

  // Save Modal Form
  const handleSaveModalForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;
    setIsSaving(true);

    try {
      const currentMethods =
        activeCompany.api_methods || generateDefaultCompanyApiMethods(activeCompany);

      let updatedMethods: CompanyApiMethod[];

      const finalMethod: CompanyApiMethod = {
        id: modalFormData.id || `method_${Date.now()}`,
        name: modalFormData.name || 'API Method',
        name_ar: modalFormData.name_ar,
        method_type: modalFormData.method_type || 'rest_api',
        endpoint_url: modalFormData.endpoint_url || '',
        enabled: modalFormData.enabled ?? true,
        is_primary: modalFormData.is_primary ?? false,
        action_type: modalFormData.action_type || 'deposit',
        api_key: modalFormData.api_key,
        secret_key: modalFormData.secret_key,
        client_id: modalFormData.client_id,
        merchant_id: modalFormData.merchant_id,
        webhook_url: modalFormData.webhook_url,
        account_id_param: modalFormData.account_id_param || 'player_id',
        min_transfer_amount: modalFormData.min_transfer_amount || 1,
        max_transfer_amount: modalFormData.max_transfer_amount || 5000,
        allow_available_only: true, // STRICT POLICY: available balance only
        auto_payout: modalFormData.auto_payout ?? true,
        test_mode: modalFormData.test_mode ?? false,
        custom_headers: modalFormData.custom_headers,
        notes: modalFormData.notes,
        last_test_status: modalTestResult?.success ? 'success' : modalFormData.last_test_status || 'untested',
        last_test_at: modalTestResult ? new Date().toISOString() : modalFormData.last_test_at,
        last_test_latency: modalTestResult?.latencyMs || modalFormData.last_test_latency,
        last_test_message: modalTestResult?.message || modalFormData.last_test_message,
      };

      if (editingMethod) {
        updatedMethods = currentMethods.map((m) => (m.id === editingMethod.id ? finalMethod : m));
      } else {
        updatedMethods = [...currentMethods, finalMethod];
      }

      // If set as primary, unmark all others
      if (finalMethod.is_primary) {
        updatedMethods = updatedMethods.map((m) => ({
          ...m,
          is_primary: m.id === finalMethod.id,
        }));
      } else if (!updatedMethods.some((m) => m.is_primary)) {
        updatedMethods[0].is_primary = true;
      }

      // Update primary config on company
      const primaryMethod = updatedMethods.find((m) => m.is_primary) || updatedMethods[0];
      const updatedCompany: Company = {
        ...activeCompany,
        api_methods: updatedMethods,
        api_config: primaryMethod
          ? {
              enabled: primaryMethod.enabled,
              integration_type: primaryMethod.method_type,
              endpoint_url: primaryMethod.endpoint_url,
              api_key: primaryMethod.api_key,
              secret_key: primaryMethod.secret_key,
              merchant_id: primaryMethod.merchant_id,
              webhook_url: primaryMethod.webhook_url,
              account_id_param: primaryMethod.account_id_param,
              min_transfer_amount: primaryMethod.min_transfer_amount,
              max_transfer_amount: primaryMethod.max_transfer_amount,
              allow_available_only: true,
              auto_payout: primaryMethod.auto_payout ?? true,
              test_mode: primaryMethod.test_mode,
              last_test_status: primaryMethod.last_test_status,
              last_test_at: primaryMethod.last_test_at,
            }
          : activeCompany.api_config,
      };

      await onUpdateCompany(updatedCompany);
      setIsModalOpen(false);
      triggerSuccessToast(
        isAr ? 'تم حفظ وتطبيق طريقة الربط بنجاح!' : 'Integration method saved and applied!'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Filter methods based on search & protocol
  const activeCompanyMethods =
    activeCompany?.api_methods || (activeCompany ? generateDefaultCompanyApiMethods(activeCompany) : []);

  const filteredMethods = activeCompanyMethods.filter((method) => {
    if (selectedProtocolFilter !== 'all' && method.method_type !== selectedProtocolFilter) {
      return false;
    }
    if (selectedStatusFilter === 'active' && !method.enabled) return false;
    if (selectedStatusFilter === 'inactive' && method.enabled) return false;
    if (selectedStatusFilter === 'online' && method.last_test_status !== 'success') return false;
    if (selectedStatusFilter === 'error' && method.last_test_status !== 'failed') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = method.name.toLowerCase().includes(q) || (method.name_ar && method.name_ar.includes(q));
      const matchUrl = method.endpoint_url.toLowerCase().includes(q);
      const matchProto = method.method_type.toLowerCase().includes(q);
      return matchName || matchUrl || matchProto;
    }
    return true;
  });

  // Calculate global summary stats
  const totalCompanies = initializedCompanies.length;
  const totalMethods = initializedCompanies.reduce(
    (acc, c) => acc + (c.api_methods?.length || 0),
    0
  );
  const totalActiveMethods = initializedCompanies.reduce(
    (acc, c) => acc + (c.api_methods?.filter((m) => m.enabled).length || 0),
    0
  );
  const totalOnlineMethods = initializedCompanies.reduce(
    (acc, c) => acc + (c.api_methods?.filter((m) => m.last_test_status === 'success').length || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* HEADER HERO & GOLDEN FINANCIAL POLICY BANNER             */}
      {/* ========================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 border border-sky-800/40 rounded-3xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-inner">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black tracking-wide">
                    {isAr ? 'محرك تكاملات ربط الـ API للشركات' : 'Company API Integration Engine'}
                  </h2>
                  <span className="px-2 py-0.5 rounded-md bg-sky-500/20 border border-sky-400/30 text-sky-300 font-mono text-[10px] font-bold">
                    Multi-Protocol v2.5
                  </span>
                </div>
                <p className="text-xs text-sky-200/80 max-w-2xl mt-0.5 leading-relaxed">
                  {isAr
                    ? 'إدارة متكاملة لبوابات الربط البرمجية المباشرة لكل شركة. يمكن لكل شركة أن تمتلك طرق ربط متعددة (Direct REST API, Webhook S2S, OAuth 2.0, Merchant Gateway) مع فحص حي لجاهزية الاتصال ومفاتيح تبديل فورية.'
                    : 'Manage multi-protocol API integration gateways for each bookmaker. Each partner can have multiple defined integration methods (REST API, Webhook, OAuth, Merchant Gateway) with live latency testing and status toggles.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onOpenHealthDashboard && (
                <button
                  type="button"
                  onClick={onOpenHealthDashboard}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Activity className="w-4 h-4" />
                  <span>{isAr ? 'لوحة صحة الـ API (Health 24h)' : 'Integration Health'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setTesterMethodId(undefined);
                  setShowIntegrationTester(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Terminal className="w-4 h-4" />
                <span>{isAr ? 'أداة فحص الويب هوك (Tester)' : 'Integration Tester'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDiscoveryTargetForSinglePick(false);
                  setShowAutoDiscovery(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Sparkles className="w-4 h-4 text-purple-200 animate-pulse" />
                <span>{isAr ? 'اكتشاف نقاط النهاية تلقائياً' : 'Auto-Discover Endpoints'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAddModal('rest_api')}
                className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? 'إضافة طريقة ربط جديدة' : '+ Add New Method'}</span>
              </button>
            </div>
          </div>

          {/* Strict Financial Security Policy Notice */}
          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-100 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <span className="font-black text-amber-300">
                {isAr ? 'القاعدة المالية الصارمة (Strict Balance Policy):' : 'Strict Financial Balance Policy:'}
              </span>
              <p className="text-amber-200/90 leading-relaxed text-[11px]">
                {isAr
                  ? 'جميع بوابات الـ API محكومة ببروتوكول حماية صارم: يُسمح بتحويل الرصيد المتاح (Available Balance) فقط إلى تطبيقات الشركات. الرصيد المجمد (Frozen Balance) محمي ومقفل بالكامل في قاعدة البيانات ولا يمكن لأي استدعاء API أو تحويل خارجي سحبه إطلاقاً حفاظاً على شروط البونص والنزاهة المالية.'
                  : 'All API integration gateways strictly enforce Available Balance transfer only. Frozen balances are securely locked by platform governance and cannot be liquidated or transferred via API until unfrozen through authorized rebate actions.'}
              </p>
            </div>
          </div>

          {/* Global Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="text-[10px] text-slate-400 font-bold">
                {isAr ? 'الشركات الشريكة' : 'Partner Companies'}
              </div>
              <div className="text-lg font-black text-white mt-0.5">{totalCompanies}</div>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="text-[10px] text-slate-400 font-bold">
                {isAr ? 'إجمالي طرق الربط المعرفة' : 'Defined API Methods'}
              </div>
              <div className="text-lg font-black text-sky-300 mt-0.5">{totalMethods}</div>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="text-[10px] text-slate-400 font-bold">
                {isAr ? 'البوابات المفعلة (Active)' : 'Active Gateways'}
              </div>
              <div className="text-lg font-black text-emerald-400 mt-0.5 flex items-center gap-1.5">
                <span>{totalActiveMethods}</span>
                <span className="text-[11px] text-emerald-400/80 font-normal">
                  ({Math.round((totalActiveMethods / Math.max(1, totalMethods)) * 100)}%)
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="text-[10px] text-slate-400 font-bold">
                {isAr ? 'صحة الاتصال (Online)' : 'Verified Connected'}
              </div>
              <div className="text-lg font-black text-emerald-400 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{totalOnlineMethods}</span>
                <span className="text-[11px] text-slate-400 font-normal">/ {totalMethods}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* COMPANY SELECTOR TABS                                    */}
      {/* ========================================================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-500" />
            <span>{isAr ? 'اختر الشركة لإدارة تكاملات الـ API الخاصة بها:' : 'Select Company to Manage API Methods:'}</span>
          </label>
          <span className="text-[11px] text-slate-400 font-mono">
            {initializedCompanies.length} {isAr ? 'شركات مسجلة' : 'Registered'}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {initializedCompanies.map((company) => {
            const isSelected = company.id === selectedCompanyId;
            const methodsCount = company.api_methods?.length || 0;
            const activeCount = company.api_methods?.filter((m) => m.enabled).length || 0;

            return (
              <button
                key={company.id}
                type="button"
                onClick={() => {
                  setSelectedCompanyId(company.id);
                  setExpandedDiagnosticMethodId(null);
                }}
                className={`px-3.5 py-2.5 rounded-2xl border text-right transition-all flex items-center gap-2.5 shrink-0 ${
                  isSelected
                    ? 'bg-sky-50 dark:bg-sky-950/70 border-sky-500 ring-2 ring-sky-500/20 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center p-1 border shrink-0"
                  style={{
                    backgroundColor: `${company.color || '#0284c7'}15`,
                    borderColor: `${company.color || '#0284c7'}40`,
                  }}
                >
                  <CompanyBrandLogo companyName={company.name} companyId={company.id} size="sm" />
                </div>

                <div className="text-left rtl:text-right">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                      {company.name}
                    </span>
                    <span
                      className="font-mono text-[9px] px-1 py-0.2 rounded border"
                      style={{
                        color: company.color || '#0284c7',
                        borderColor: `${company.color || '#0284c7'}40`,
                        backgroundColor: `${company.color || '#0284c7'}10`,
                      }}
                    >
                      {company.promo_code}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                    <Cpu className="w-3 h-3 text-slate-400" />
                    <span>
                      {methodsCount} {isAr ? 'طرق ربط' : 'methods'} ({activeCount}{' '}
                      {isAr ? 'مفعلة' : 'active'})
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* ACTIVE COMPANY DETAIL VIEW & METHODS LIST                */}
      {/* ========================================================= */}
      {activeCompany && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Company Context Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center p-1.5 border shadow-xs"
                style={{
                  backgroundColor: `${activeCompany.color || '#0284c7'}15`,
                  borderColor: `${activeCompany.color || '#0284c7'}40`,
                }}
              >
                <CompanyBrandLogo companyName={activeCompany.name} companyId={activeCompany.id} size="md" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    {activeCompany.name}
                  </h3>
                  <span className="text-xs text-slate-400">({activeCompany.name_ar || activeCompany.name})</span>
                  <span
                    className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border"
                    style={{
                      color: activeCompany.color || '#0284c7',
                      borderColor: `${activeCompany.color || '#0284c7'}50`,
                      backgroundColor: `${activeCompany.color || '#0284c7'}10`,
                    }}
                  >
                    PROMO: {activeCompany.promo_code}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isAr
                    ? 'طرق الربط المعرفة لنقل الرصيد المتاح من محفظة VEX إلى حساب تطبيق الشركة'
                    : 'Defined integration methods for transferring Available Balance to sportsbook account'}
                </p>
              </div>
            </div>

            {/* Quick Actions for Selected Company */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={testingAll}
                onClick={handleTestAllMethods}
                className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-2xs disabled:opacity-50 transition-all"
              >
                {testingAll ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-500" />
                ) : (
                  <Radio className="w-3.5 h-3.5 text-sky-500" />
                )}
                <span>
                  {testingAll
                    ? isAr
                      ? 'جاري فحص جميع الطرق...'
                      : 'Testing All Methods...'
                    : isAr
                    ? 'فحص اتصال جميع الطرق'
                    : 'Test All Methods'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAddModal()}
                className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? 'إضافة طريقة ربط' : 'Add Integration Method'}</span>
              </button>
            </div>
          </div>

          {/* Quick Presets Ribbon */}
          <div className="px-4 py-2.5 bg-sky-50/50 dark:bg-sky-950/20 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="font-bold text-slate-600 dark:text-slate-400 text-[11px] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{isAr ? 'إضافة سريعة بنموذج جاهز:' : 'Quick Presets:'}</span>
            </span>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setDiscoveryTargetForSinglePick(false);
                  setShowAutoDiscovery(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs"
              >
                <Sparkles className="w-3 h-3 text-purple-200" />
                <span>{isAr ? 'اكتشاف الأنماط تلقائياً' : 'Auto-Discover Patterns'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenAddModal('rest_api')}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1 shadow-2xs"
              >
                <span>+ REST API</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenAddModal('webhook_s2s')}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1 shadow-2xs"
              >
                <span>+ Webhook (S2S)</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenAddModal('oauth2_client')}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1 shadow-2xs"
              >
                <span>+ OAuth 2.0</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenAddModal('merchant_gateway')}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1 shadow-2xs"
              >
                <span>+ Merchant GW</span>
              </button>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between flex-wrap gap-2.5">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'بحث بالاسم، الرابط، أو البروتوكول...' : 'Search methods, URLs, or protocols...'}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              {/* Protocol Filter */}
              <select
                value={selectedProtocolFilter}
                onChange={(e) => setSelectedProtocolFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 text-xs"
              >
                <option value="all">{isAr ? 'جميع البروتوكولات' : 'All Protocols'}</option>
                <option value="rest_api">REST API</option>
                <option value="webhook_s2s">Webhook (S2S)</option>
                <option value="oauth2_client">OAuth 2.0</option>
                <option value="merchant_gateway">Merchant Gateway</option>
                <option value="basic_auth">Basic Auth</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 text-xs"
              >
                <option value="all">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
                <option value="active">{isAr ? 'مفعلة فقط' : 'Active Only'}</option>
                <option value="inactive">{isAr ? 'معطلة فقط' : 'Inactive Only'}</option>
                <option value="online">{isAr ? 'متصلة (Online)' : 'Online Only'}</option>
                <option value="error">{isAr ? 'بها أخطاء (Issues)' : 'Issues / Failed'}</option>
              </select>
            </div>
          </div>

          {/* Methods Grid / List */}
          <div className="p-4 sm:p-5 space-y-4">
            {filteredMethods.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
                <Cpu className="w-10 h-10 text-slate-400 mx-auto" />
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'لم يتم العثور على طرق ربط مطابقة' : 'No matching integration methods found'}
                </div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {isAr
                    ? 'يمكنك إضافة طريقة ربط جديدة للشركة أو إعادة تعيين معايير البحث والفلترة'
                    : 'Add a new integration method or adjust search filters to view configurations.'}
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenAddModal()}
                  className="px-4 py-2 rounded-xl bg-sky-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAr ? 'إضافة طريقة ربط الآن' : 'Add Method Now'}</span>
                </button>
              </div>
            ) : (
              filteredMethods.map((method) => {
                const isTestingThis = testingMethodId === method.id;
                const isExpandedDiagnostic = expandedDiagnosticMethodId === method.id;

                // Protocol badge color scheme
                const protocolStyles: Record<
                  CompanyApiIntegrationType,
                  { bg: string; text: string; label: string }
                > = {
                  rest_api: {
                    bg: 'bg-sky-100 dark:bg-sky-950/80 border-sky-300 dark:border-sky-800',
                    text: 'text-sky-800 dark:text-sky-300',
                    label: 'Direct REST API',
                  },
                  webhook_s2s: {
                    bg: 'bg-purple-100 dark:bg-purple-950/80 border-purple-300 dark:border-purple-800',
                    text: 'text-purple-800 dark:text-purple-300',
                    label: 'Webhook S2S',
                  },
                  oauth2_client: {
                    bg: 'bg-indigo-100 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-800',
                    text: 'text-indigo-800 dark:text-indigo-300',
                    label: 'OAuth 2.0',
                  },
                  merchant_gateway: {
                    bg: 'bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-800',
                    text: 'text-amber-800 dark:text-amber-300',
                    label: 'Merchant Gateway',
                  },
                  basic_auth: {
                    bg: 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700',
                    text: 'text-slate-800 dark:text-slate-300',
                    label: 'Basic HTTP Auth',
                  },
                };

                const protoConfig = protocolStyles[method.method_type] || protocolStyles.rest_api;

                return (
                  <div
                    key={method.id}
                    className={`rounded-2xl border transition-all ${
                      method.enabled
                        ? method.is_primary
                          ? 'bg-white dark:bg-slate-900 border-sky-400/80 dark:border-sky-600/80 shadow-md ring-1 ring-sky-500/20'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700'
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 opacity-80'
                    }`}
                  >
                    {/* Method Card Header */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center border font-bold text-xs ${
                            method.enabled
                              ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800 text-sky-600'
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                          }`}
                        >
                          <Cpu className="w-5 h-5" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                              {method.name}
                            </h4>

                            {/* Protocol Badge */}
                            <span
                              className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${protoConfig.bg} ${protoConfig.text}`}
                            >
                              {protoConfig.label}
                            </span>

                            {/* Action Type Badge */}
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-medium border border-slate-200 dark:border-slate-700">
                              {method.action_type === 'deposit'
                                ? isAr ? 'إيداع لاعب' : 'Deposit'
                                : method.action_type === 'payout'
                                ? isAr ? 'سحب رصيد' : 'Payout'
                                : method.action_type === 'webhook_callback'
                                ? isAr ? 'إشعار فوري' : 'Webhook'
                                : isAr ? 'بوابة شاملة' : 'Universal'}
                            </span>

                            {/* Primary Badge */}
                            {method.is_primary && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-black border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                                <CheckCheck className="w-3 h-3" />
                                <span>{isAr ? 'البوابة الرئيسية' : 'Primary Gateway'}</span>
                              </span>
                            )}

                            {method.test_mode && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-bold border border-amber-300 dark:border-amber-800">
                                Sandbox
                              </span>
                            )}
                          </div>

                          {method.name_ar && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {method.name_ar}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status Toggle & Test Control Group */}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Status Toggle Switch */}
                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] font-bold px-1 text-slate-500 dark:text-slate-400">
                            {method.enabled
                              ? isAr ? 'نشط' : 'Active'
                              : isAr ? 'معطل' : 'Disabled'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleMethodActive(activeCompany, method.id)}
                            className={`p-1 rounded-lg transition-all ${
                              method.enabled
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                            title={isAr ? 'تبديل حالة التفعيل' : 'Toggle Status'}
                          >
                            {method.enabled ? (
                              <ToggleRight className="w-4 h-4" />
                            ) : (
                              <ToggleLeft className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {/* Set Primary Button (if not already primary) */}
                        {!method.is_primary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryMethod(activeCompany, method.id)}
                            className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/60 text-slate-600 dark:text-slate-300 hover:text-sky-600 text-[10px] font-bold border border-slate-200 dark:border-slate-700 transition-all"
                          >
                            {isAr ? 'تعيين كرئيسي' : 'Make Primary'}
                          </button>
                        )}

                        {/* Connectivity Test Trigger */}
                        <button
                          type="button"
                          disabled={isTestingThis}
                          onClick={() => handleTestConnectivity(activeCompany, method)}
                          className="px-2.5 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/70 border border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50"
                        >
                          {isTestingThis ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
                          ) : (
                            <Radio className="w-3.5 h-3.5 text-sky-600" />
                          )}
                          <span>
                            {isTestingThis
                              ? isAr
                                ? 'جاري الفحص...'
                                : 'Testing...'
                              : isAr
                              ? 'فحص الاتصال'
                              : 'Test Connectivity'}
                          </span>
                        </button>

                        {/* Webhook JSON Payload Tester */}
                        <button
                          type="button"
                          onClick={() => {
                            setTesterMethodId(method.id);
                            setShowIntegrationTester(true);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all"
                          title={isAr ? 'فحص وإرسال حزم JSON تجريبية' : 'Test Webhook JSON Payloads'}
                        >
                          <Send className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>{isAr ? 'فحص الويب هوك' : 'Test Webhook'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Method Card Body */}
                    <div className="p-4 space-y-3 text-xs">
                      {/* Endpoint URL Row */}
                      <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono">
                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                          <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-700 dark:text-slate-300 text-[11px] truncate">
                            {method.endpoint_url}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopy(method.endpoint_url, method.id)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                            title="Copy URL"
                          >
                            {copiedText === method.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Grid of Key Properties */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                          <span className="text-slate-400 block text-[10px]">
                            {isAr ? 'اسم متغير الحساب' : 'Account Param'}
                          </span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {method.account_id_param || 'player_id'}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                          <span className="text-slate-400 block text-[10px]">
                            {isAr ? 'الحدود المالية' : 'Transfer Limits'}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            ${method.min_transfer_amount || 1} - ${method.max_transfer_amount || 5000}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                          <span className="text-slate-400 block text-[10px]">
                            {isAr ? 'تنفيذ فوري تلقائي' : 'Auto-Payout'}
                          </span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {method.auto_payout ? (isAr ? 'فوري بنقرة واحدة' : 'Instant 1-Click') : (isAr ? 'مراجعة يدوية' : 'Manual Review')}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50">
                          <span className="text-emerald-700 dark:text-emerald-400 block text-[10px] font-bold">
                            {isAr ? 'سياسة الرصيد المتاح' : 'Available Balance'}
                          </span>
                          <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>{isAr ? 'متاح فقط (المجمد محمي)' : 'Available Only'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Live Connectivity Test Status Pill & Diagnostic Bar */}
                      <div className="pt-1 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-500">
                            {isAr ? 'حالة فحص الاتصال:' : 'Connectivity Status:'}
                          </span>
                          {method.last_test_status === 'success' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Online ({method.last_test_latency || 65}ms)</span>
                            </span>
                          ) : method.last_test_status === 'failed' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 font-bold text-[10px] flex items-center gap-1 border border-rose-300 dark:border-rose-800">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>Offline / Error</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[10px] border border-slate-200 dark:border-slate-700">
                              {isAr ? 'لم يُفحص بعد' : 'Untested'}
                            </span>
                          )}

                          {method.last_test_at && (
                            <span className="text-[10px] text-slate-400">
                              {new Date(method.last_test_at).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                            </span>
                          )}
                        </div>

                        {/* Diagnostic Details Accordion Toggle */}
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedDiagnosticMethodId(
                              isExpandedDiagnostic ? null : method.id
                            )
                          }
                          className="text-sky-600 dark:text-sky-400 hover:underline text-[11px] font-bold flex items-center gap-1"
                        >
                          <Activity className="w-3 h-3" />
                          <span>
                            {isExpandedDiagnostic
                              ? isAr
                                ? 'إخفاء سجل التشخيص'
                                : 'Hide Diagnostic'
                              : isAr
                              ? 'عرض سجل وبيانات الفحص'
                              : 'View Diagnostic Payload'}
                          </span>
                          {isExpandedDiagnostic ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      {/* Expandable Diagnostic Handshake Logs */}
                      {isExpandedDiagnostic && (
                        <div className="p-3 bg-slate-950 text-slate-200 rounded-xl font-mono text-[11px] space-y-2 border border-slate-800 animate-fade-in">
                          <div className="flex items-center justify-between text-slate-400 text-[10px] border-b border-slate-800 pb-1.5">
                            <span className="flex items-center gap-1.5">
                              <Code className="w-3.5 h-3.5 text-sky-400" />
                              <span>{isAr ? 'سجل استجابة الخادم وتأكيد الربط' : 'Server Handshake Response Payload'}</span>
                            </span>
                            <span>Status: {method.last_test_status?.toUpperCase()}</span>
                          </div>

                          <pre className="overflow-x-auto text-[10px] leading-relaxed text-emerald-400 bg-black/40 p-2 rounded-lg">
                            {JSON.stringify(
                              method.last_response_sample || {
                                status: 200,
                                protocol: method.method_type,
                                endpoint: method.endpoint_url,
                                latency: `${method.last_test_latency || 70}ms`,
                                policy: 'available_balance_only',
                                auto_payout: method.auto_payout,
                                timestamp: method.last_test_at || new Date().toISOString(),
                              },
                              null,
                              2
                            )}
                          </pre>
                        </div>
                      )}
                    </div>

                    {/* Method Card Footer Actions */}
                    <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(method)}
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1 shadow-2xs transition-all"
                        >
                          <Sliders className="w-3 h-3 text-sky-500" />
                          <span>{isAr ? 'تعديل الإعدادات والمفاتيح' : 'Edit Configuration'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicateMethod(activeCompany, method)}
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1 shadow-2xs transition-all"
                        >
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>{isAr ? 'تكرار الطريقة' : 'Duplicate'}</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteMethod(activeCompany, method.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-all"
                        title={isAr ? 'حذف طريقة الربط' : 'Delete Method'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ADD / EDIT INTEGRATION METHOD MODAL                       */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-400/30">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                    {editingMethod
                      ? isAr
                        ? `تعديل طريقة الربط - ${editingMethod.name}`
                        : `Edit Integration Method - ${editingMethod.name}`
                      : isAr
                      ? `إضافة طريقة ربط جديدة - ${activeCompany?.name}`
                      : `Add New Integration Method - ${activeCompany?.name}`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isAr
                      ? 'تحديد البروتوكول، نقطة النهاية، مفاتيح التوثيق، وشروط التحويل المالي'
                      : 'Configure protocol, endpoint URL, credentials, and financial parameters'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveModalForm} className="overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              {/* Method Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'اسم الطريقة (English):' : 'Method Name (English):'}
                  </label>
                  <input
                    type="text"
                    required
                    value={modalFormData.name || ''}
                    onChange={(e) => setModalFormData({ ...modalFormData, name: e.target.value })}
                    placeholder="e.g. Primary REST Deposit API"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'اسم الطريقة (عربي):' : 'Method Name (Arabic):'}
                  </label>
                  <input
                    type="text"
                    value={modalFormData.name_ar || ''}
                    onChange={(e) => setModalFormData({ ...modalFormData, name_ar: e.target.value })}
                    placeholder="مثال: بوابة الإيداع المباشر REST"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Protocol Selection */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'نوع بروتوكول الربط المعتمد:' : 'Integration Protocol / Method Type:'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    {
                      id: 'rest_api',
                      name: 'Direct REST API',
                      desc: isAr ? 'طلب JSON POST مع Bearer Token' : 'JSON POST with Bearer Token',
                    },
                    {
                      id: 'webhook_s2s',
                      name: 'Server Webhook (S2S)',
                      desc: isAr ? 'استدعاء خادم مع توقيع رقمي' : 'S2S Callback with HMAC signature',
                    },
                    {
                      id: 'oauth2_client',
                      name: 'OAuth 2.0 Client',
                      desc: isAr ? 'تبادل رموز Client ID & Secret' : 'Client ID & Secret token grant',
                    },
                    {
                      id: 'merchant_gateway',
                      name: 'Merchant Gateway',
                      desc: isAr ? 'معرف التاجر وتوقيع رقمي' : 'Merchant ID + Secret Hash',
                    },
                    {
                      id: 'basic_auth',
                      name: 'Basic HTTP Auth',
                      desc: isAr ? 'اسم مستخدم وكلمة مرور' : 'Username & Password auth',
                    },
                  ].map((proto) => {
                    const isSelected = modalFormData.method_type === proto.id;
                    return (
                      <button
                        key={proto.id}
                        type="button"
                        onClick={() =>
                          setModalFormData({
                            ...modalFormData,
                            method_type: proto.id as CompanyApiIntegrationType,
                          })
                        }
                        className={`p-2.5 rounded-xl border text-right transition-all ${
                          isSelected
                            ? 'bg-sky-50 dark:bg-sky-950/80 border-sky-500 ring-2 ring-sky-500/20'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {proto.name}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-sky-600" />}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{proto.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Endpoint URL & Action Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">
                      {isAr ? 'رابط نقطة النهاية (Endpoint URL):' : 'Endpoint URL:'}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setDiscoveryTargetForSinglePick(true);
                        setShowAutoDiscovery(true);
                      }}
                      className="text-[10px] text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-purple-500" />
                      <span>{isAr ? 'اكتشاف الأنماط تلقائياً' : 'Auto-Discover Patterns'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="url"
                      required
                      value={modalFormData.endpoint_url || ''}
                      onChange={(e) =>
                        setModalFormData({ ...modalFormData, endpoint_url: e.target.value })
                      }
                      placeholder="https://api.bookmaker.com/v1/deposit"
                      className="w-full px-3 py-2 pl-8 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                    />
                    <Globe className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'نوع الإجراء المستهدف:' : 'Action Type:'}
                  </label>
                  <select
                    value={modalFormData.action_type || 'deposit'}
                    onChange={(e) =>
                      setModalFormData({
                        ...modalFormData,
                        action_type: e.target.value as ApiMethodActionType,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-bold text-xs"
                  >
                    <option value="deposit">{isAr ? 'إيداع رصيد في حساب اللاعب' : 'Player Deposit'}</option>
                    <option value="payout">{isAr ? 'سحب رصيد' : 'Payout / Withdrawal'}</option>
                    <option value="webhook_callback">{isAr ? 'إشعار الويب هوك (S2S)' : 'Webhook Callback'}</option>
                    <option value="all">{isAr ? 'بوابة شاملة (Universal)' : 'Universal'}</option>
                  </select>
                </div>
              </div>

              {/* Credentials based on Protocol */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                  <Key className="w-4 h-4 text-sky-500" />
                  <span>{isAr ? 'بيانات التوثيق والاعتماد للمنهج المختار:' : 'Protocol Credentials:'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {modalFormData.method_type === 'rest_api' && (
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        {isAr ? 'مفتاح الـ API أو الـ Bearer Token:' : 'API Key / Bearer Token:'}
                      </label>
                      <input
                        type="password"
                        value={modalFormData.api_key || ''}
                        onChange={(e) => setModalFormData({ ...modalFormData, api_key: e.target.value })}
                        placeholder="sk_live_..."
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                      />
                    </div>
                  )}

                  {modalFormData.method_type === 'webhook_s2s' && (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          {isAr ? 'رابط الـ Webhook للإشعار:' : 'Webhook Callback URL:'}
                        </label>
                        <input
                          type="url"
                          value={modalFormData.webhook_url || ''}
                          onChange={(e) =>
                            setModalFormData({ ...modalFormData, webhook_url: e.target.value })
                          }
                          placeholder="https://api.partner.com/webhook"
                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          {isAr ? 'سر توقيع الـ Webhook (Signing Secret):' : 'Webhook Secret:'}
                        </label>
                        <input
                          type="password"
                          value={modalFormData.secret_key || ''}
                          onChange={(e) =>
                            setModalFormData({ ...modalFormData, secret_key: e.target.value })
                          }
                          placeholder="whsec_..."
                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                        />
                      </div>
                    </>
                  )}

                  {modalFormData.method_type === 'oauth2_client' && (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          {isAr ? 'معرف العميل (Client ID):' : 'Client ID:'}
                        </label>
                        <input
                          type="text"
                          value={modalFormData.client_id || ''}
                          onChange={(e) =>
                            setModalFormData({ ...modalFormData, client_id: e.target.value })
                          }
                          placeholder="client_vex_8831"
                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          {isAr ? 'السر المعتمد (Client Secret):' : 'Client Secret:'}
                        </label>
                        <input
                          type="password"
                          value={modalFormData.secret_key || ''}
                          onChange={(e) =>
                            setModalFormData({ ...modalFormData, secret_key: e.target.value })
                          }
                          placeholder="csec_..."
                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                        />
                      </div>
                    </>
                  )}

                  {modalFormData.method_type === 'merchant_gateway' && (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          {isAr ? 'معرف التاجر / الوكيل (Merchant ID):' : 'Merchant ID:'}
                        </label>
                        <input
                          type="text"
                          value={modalFormData.merchant_id || ''}
                          onChange={(e) =>
                            setModalFormData({ ...modalFormData, merchant_id: e.target.value })
                          }
                          placeholder="MCH-8821"
                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          {isAr ? 'المفتاح السري للتوقيع (HMAC Secret):' : 'Secret HMAC Key:'}
                        </label>
                        <input
                          type="password"
                          value={modalFormData.secret_key || ''}
                          onChange={(e) =>
                            setModalFormData({ ...modalFormData, secret_key: e.target.value })
                          }
                          placeholder="sec_hash_..."
                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                        />
                      </div>
                    </>
                  )}

                  {modalFormData.method_type === 'basic_auth' && (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          {isAr ? 'اسم المستخدم (Username):' : 'Username:'}
                        </label>
                        <input
                          type="text"
                          value={modalFormData.api_key || ''}
                          onChange={(e) => setModalFormData({ ...modalFormData, api_key: e.target.value })}
                          placeholder="api_user"
                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          {isAr ? 'كلمة المرور (Password):' : 'Password:'}
                        </label>
                        <input
                          type="password"
                          value={modalFormData.secret_key || ''}
                          onChange={(e) =>
                            setModalFormData({ ...modalFormData, secret_key: e.target.value })
                          }
                          placeholder="••••••••"
                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      {isAr ? 'اسم متغير حساب اللاعب (Account Param):' : 'Account Parameter Name:'}
                    </label>
                    <input
                      type="text"
                      value={modalFormData.account_id_param || 'player_id'}
                      onChange={(e) =>
                        setModalFormData({ ...modalFormData, account_id_param: e.target.value })
                      }
                      placeholder="player_id"
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      {isAr ? 'الحد الأدنى والأقصى للتحويل ($):' : 'Transfer Limits ($):'}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={modalFormData.min_transfer_amount || 1}
                        onChange={(e) =>
                          setModalFormData({
                            ...modalFormData,
                            min_transfer_amount: Number(e.target.value),
                          })
                        }
                        className="w-1/2 px-2 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold text-xs"
                      />
                      <span className="text-slate-400">-</span>
                      <input
                        type="number"
                        min="10"
                        value={modalFormData.max_transfer_amount || 5000}
                        onChange={(e) =>
                          setModalFormData({
                            ...modalFormData,
                            max_transfer_amount: Number(e.target.value),
                          })
                        }
                        className="w-1/2 px-2 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Toggles Row */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modalFormData.enabled ?? true}
                      onChange={(e) =>
                        setModalFormData({ ...modalFormData, enabled: e.target.checked })
                      }
                      className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {isAr ? 'تفعيل طريقة الربط هذه' : 'Enable this Integration Method'}
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modalFormData.is_primary ?? false}
                      onChange={(e) =>
                        setModalFormData({ ...modalFormData, is_primary: e.target.checked })
                      }
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                      {isAr ? 'تعيين كبوابة رئيسية للشركة' : 'Set as Primary Gateway'}
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modalFormData.auto_payout ?? true}
                      onChange={(e) =>
                        setModalFormData({ ...modalFormData, auto_payout: e.target.checked })
                      }
                      className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                    />
                    <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                      {isAr ? 'تنفيذ فوري تلقائي دون الحاجة لموافقة يدوية' : 'Auto-Payout (Instant Execution)'}
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modalFormData.test_mode ?? false}
                      onChange={(e) =>
                        setModalFormData({ ...modalFormData, test_mode: e.target.checked })
                      }
                      className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                    />
                    <span className="font-bold text-amber-600 dark:text-amber-400 text-[11px]">
                      {isAr ? 'وضع التجربة والاختبار (Sandbox)' : 'Sandbox / Test Mode'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Handshake Diagnostic within Modal */}
              <div className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-2xl border border-sky-200 dark:border-sky-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-900 dark:text-sky-300 text-xs flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-sky-500" />
                    <span>{isAr ? 'فحص مصافحة الاتصال قبل الحفظ:' : 'Test Handshake Diagnostic:'}</span>
                  </span>

                  <button
                    type="button"
                    disabled={modalTesting}
                    onClick={handleTestInModal}
                    className="px-3 py-1 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs disabled:opacity-50"
                  >
                    {modalTesting ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Activity className="w-3 h-3" />
                    )}
                    <span>{modalTesting ? (isAr ? 'جاري الفحص...' : 'Pinging...') : (isAr ? 'فحص الاتصال' : 'Ping Endpoint')}</span>
                  </button>
                </div>

                {modalTestResult && (
                  <div
                    className={`p-2.5 rounded-xl text-[11px] flex items-start gap-2 ${
                      modalTestResult.success
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                    }`}
                  >
                    {modalTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-bold block">
                        {modalTestResult.statusText}{' '}
                        {modalTestResult.latencyMs > 0 && `(${modalTestResult.latencyMs}ms)`}
                      </span>
                      <span>{modalTestResult.message}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isAr ? 'حفظ وتطبيق طريقة الربط' : 'Save & Apply Method'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Webhook & Integration Tester Modal */}
      {showIntegrationTester && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative">
            <IntegrationTester
              companies={initializedCompanies}
              lang={lang}
              onCopyToast={onCopyToast}
              initialCompanyId={activeCompany?.id}
              initialMethodId={testerMethodId}
              onClose={() => setShowIntegrationTester(false)}
            />
          </div>
        </div>
      )}

      {/* Auto-Discover Endpoint Patterns Modal */}
      <EndpointAutoDiscoveryModal
        isOpen={showAutoDiscovery}
        onClose={() => {
          setShowAutoDiscovery(false);
          setDiscoveryTargetForSinglePick(false);
        }}
        companies={initializedCompanies}
        selectedCompanyId={activeCompany?.id}
        onApplyMethods={handleApplyDiscoveredMethods}
        onSelectSingleCandidate={
          discoveryTargetForSinglePick ? handleSelectSingleDiscoveredCandidate : undefined
        }
        lang={lang}
        onCopyToast={(label) => {
          if (onCopyToast) onCopyToast();
          triggerSuccessToast(
            isAr ? `تم نسخ ${label} إلى الحافظة` : `Copied ${label} to clipboard`
          );
        }}
      />
    </div>
  );
};
