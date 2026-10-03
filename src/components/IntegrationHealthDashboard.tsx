import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Radio,
  Zap,
  RefreshCw,
  Search,
  Filter,
  Download,
  Terminal,
  ShieldCheck,
  Send,
  Copy,
  Check,
  Server,
  Layers,
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Wifi,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Company, CompanyApiIntegrationType, ConnectionHealthRecord, HourlyHealthMetric } from '../types';
import { CompanyBrandLogo } from './CompanyBrandLogo';
import {
  computeConnectionsHealth,
  computeHourlyMetrics,
  recordLivePing,
  resetTelemetryStore,
} from '../utils/healthTelemetry';
import { vexApi } from '../services/api';

interface IntegrationHealthDashboardProps {
  companies: Company[];
  lang: 'ar' | 'en';
  onCopyToast?: (text: string) => void;
  onOpenTester?: (companyId?: string, methodId?: string) => void;
  onNavigateToApiConfig?: (companyId?: string) => void;
}

type ChartViewType = 'traffic' | 'latency' | 'protocol' | 'errors';
type StatusFilterType = 'all' | 'healthy' | 'degraded' | 'down' | 'untested';
type ProtocolFilterType = 'all' | CompanyApiIntegrationType;

export const IntegrationHealthDashboard: React.FC<IntegrationHealthDashboardProps> = ({
  companies,
  lang,
  onCopyToast,
  onOpenTester,
  onNavigateToApiConfig,
}) => {
  const isAr = lang === 'ar';

  // State
  const [connections, setConnections] = useState<ConnectionHealthRecord[]>([]);
  const [hourlyMetrics, setHourlyMetrics] = useState<HourlyHealthMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeChart, setActiveChart] = useState<ChartViewType>('traffic');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');
  const [selectedProtocolFilter, setSelectedProtocolFilter] = useState<ProtocolFilterType>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<StatusFilterType>('all');

  // Testing states
  const [testingMethodId, setTestingMethodId] = useState<string | null>(null);
  const [isBatchTesting, setIsBatchTesting] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ completed: 0, total: 0 });
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Auto-refresh countdown
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [autoRefreshSecs, setAutoRefreshSecs] = useState<number>(30);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);

  // Compute telemetry
  const loadTelemetry = useCallback(() => {
    setIsLoading(true);
    try {
      const conns = computeConnectionsHealth(companies);
      const hourly = computeHourlyMetrics(conns);
      setConnections(conns);
      setHourlyMetrics(hourly);
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('Error computing telemetry:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [companies]);

  // Initial load
  useEffect(() => {
    loadTelemetry();
  }, [loadTelemetry]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const timer = setInterval(() => {
      setAutoRefreshSecs((prev) => {
        if (prev <= 1) {
          loadTelemetry();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefreshEnabled, loadTelemetry]);

  // Manual refresh
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setAutoRefreshSecs(30);
    setTimeout(() => {
      loadTelemetry();
    }, 400);
  };

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    setTimeout(() => setCopiedUrl(null), 2000);
    if (onCopyToast) {
      onCopyToast(label);
    }
  };

  // Test single connection
  const handleTestConnection = async (conn: ConnectionHealthRecord) => {
    setTestingMethodId(conn.methodId);
    try {
      // Find company
      const company = companies.find((c) => c.id === conn.companyId);
      const res = await vexApi.testCompanyApiMethod(conn.companyId, {
        id: conn.methodId,
        name: conn.methodName,
        method_type: conn.methodType,
        endpoint_url: conn.endpointUrl,
        enabled: conn.enabled,
        allow_available_only: true,
      });

      // Update state and persistent store
      recordLivePing(
        conn.companyId,
        conn.methodId,
        res.success,
        res.latencyMs,
        res.success ? 200 : 500,
        res.message
      );

      // Re-read telemetry
      loadTelemetry();
    } catch (e: any) {
      recordLivePing(
        conn.companyId,
        conn.methodId,
        false,
        250,
        500,
        e.message || 'Connection test failed'
      );
      loadTelemetry();
    } finally {
      setTestingMethodId(null);
    }
  };

  // Batch test all enabled connections
  const handleBatchTestAll = async () => {
    const enabledConns = connections.filter((c) => c.enabled);
    if (enabledConns.length === 0) return;

    setIsBatchTesting(true);
    setBatchProgress({ completed: 0, total: enabledConns.length });

    for (let i = 0; i < enabledConns.length; i++) {
      const conn = enabledConns[i];
      try {
        const res = await vexApi.testCompanyApiMethod(conn.companyId, {
          id: conn.methodId,
          name: conn.methodName,
          method_type: conn.methodType,
          endpoint_url: conn.endpointUrl,
          enabled: conn.enabled,
          allow_available_only: true,
        });
        recordLivePing(
          conn.companyId,
          conn.methodId,
          res.success,
          res.latencyMs,
          res.success ? 200 : 500,
          res.message
        );
      } catch (err: any) {
        recordLivePing(conn.companyId, conn.methodId, false, 200, 500, 'Diagnostic failure');
      }
      setBatchProgress({ completed: i + 1, total: enabledConns.length });
    }

    loadTelemetry();
    setIsBatchTesting(false);
  };

  // Export 24h health audit JSON
  const handleExportReport = () => {
    const report = {
      title: 'VEX Deals - API Integration Health Telemetry Report',
      generated_at: new Date().toISOString(),
      period: 'Last 24 Hours',
      policy_audit: 'Strict Available Balance Transfer Policy: 100% Enforced',
      system_summary: systemOverview,
      active_connections: connections,
      hourly_breakdown: hourlyMetrics,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vex-integration-health-24h-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reset telemetry
  const handleResetTelemetry = () => {
    if (window.confirm(isAr ? 'هل أنت متأكد من إعادة ضبط سجلات القياسات التلقائية؟' : 'Reset all health telemetry logs to default?')) {
      resetTelemetryStore();
      loadTelemetry();
    }
  };

  // Aggregate stats across all connections
  const systemOverview = useMemo(() => {
    const totalConns = connections.length;
    const activeConns = connections.filter((c) => c.enabled).length;

    let totalCalls = 0;
    let totalSuccess = 0;
    let totalFailed = 0;
    let latencySum = 0;

    let errorSummary = {
      badRequest: 0,
      unauthorized: 0,
      rateLimited: 0,
      gatewayError: 0,
      timeout: 0,
    };

    connections.forEach((c) => {
      if (!c.enabled) return;
      totalCalls += c.totalCalls24h;
      totalSuccess += c.successCalls24h;
      totalFailed += c.failedCalls24h;
      latencySum += c.avgLatencyMs;

      errorSummary.badRequest += c.errorBreakdown.badRequest;
      errorSummary.unauthorized += c.errorBreakdown.unauthorized;
      errorSummary.rateLimited += c.errorBreakdown.rateLimited;
      errorSummary.gatewayError += c.errorBreakdown.gatewayError;
      errorSummary.timeout += c.errorBreakdown.timeout;
    });

    const successRate = totalCalls > 0 ? (totalSuccess / totalCalls) * 100 : 100;
    const avgLatency = activeConns > 0 ? Math.round(latencySum / activeConns) : 0;

    let systemStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (successRate < 92) {
      systemStatus = 'critical';
    } else if (successRate < 98) {
      systemStatus = 'degraded';
    }

    return {
      totalConns,
      activeConns,
      totalCalls,
      totalSuccess,
      totalFailed,
      successRate: Math.round(successRate * 10) / 10,
      avgLatency,
      systemStatus,
      errorSummary,
    };
  }, [connections]);

  // Filtered connections list
  const filteredConnections = useMemo(() => {
    return connections.filter((conn) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = conn.methodName.toLowerCase().includes(q);
        const matchesNameAr = conn.methodNameAr?.toLowerCase().includes(q);
        const matchesComp = conn.companyName.toLowerCase().includes(q);
        const matchesEndpoint = conn.endpointUrl.toLowerCase().includes(q);
        const matchesPromo = conn.promoCode?.toLowerCase().includes(q);
        if (!matchesName && !matchesNameAr && !matchesComp && !matchesEndpoint && !matchesPromo) {
          return false;
        }
      }

      // Company Filter
      if (selectedCompanyFilter !== 'all' && conn.companyId !== selectedCompanyFilter) {
        return false;
      }

      // Protocol Filter
      if (selectedProtocolFilter !== 'all' && conn.methodType !== selectedProtocolFilter) {
        return false;
      }

      // Status Filter
      if (selectedStatusFilter !== 'all' && conn.status !== selectedStatusFilter) {
        return false;
      }

      return true;
    });
  }, [connections, searchQuery, selectedCompanyFilter, selectedProtocolFilter, selectedStatusFilter]);

  // Protocol distribution for pie chart
  const protocolPieData = useMemo(() => {
    const counts: Record<string, { name: string; value: number; color: string }> = {
      rest_api: { name: isAr ? 'REST API مباشر' : 'Direct REST API', value: 0, color: '#0ea5e9' },
      webhook_s2s: { name: isAr ? 'S2S Webhook' : 'S2S Webhook', value: 0, color: '#8b5cf6' },
      oauth2: { name: isAr ? 'OAuth 2.0 Auth' : 'OAuth 2.0 Auth', value: 0, color: '#10b981' },
      merchant_gateway: { name: isAr ? 'بوابة وكيل تاجر' : 'Merchant Gateway', value: 0, color: '#f59e0b' },
    };

    connections.forEach((c) => {
      if (!c.enabled) return;
      if (counts[c.methodType]) {
        counts[c.methodType].value += c.totalCalls24h;
      }
    });

    return Object.values(counts).filter((p) => p.value > 0);
  }, [connections, isAr]);

  // Error breakdown data for bar chart
  const errorBarData = useMemo(() => {
    const err = systemOverview.errorSummary;
    return [
      {
        name: isAr ? 'قيود المعدل (429)' : 'Rate Limit (429)',
        count: err.rateLimited,
        fill: '#f59e0b',
      },
      {
        name: isAr ? 'بوابة غير متاحة (502/504)' : 'Gateway Error (502/504)',
        count: err.gatewayError,
        fill: '#ef4444',
      },
      {
        name: isAr ? 'فوات المهلة (Timeout)' : 'Timeouts',
        count: err.timeout,
        fill: '#f97316',
      },
      {
        name: isAr ? 'غير مصرح (401/403)' : 'Unauthorized (401)',
        count: err.unauthorized,
        fill: '#8b5cf6',
      },
      {
        name: isAr ? 'طلب غير صالح (400)' : 'Bad Request (400)',
        count: err.badRequest,
        fill: '#64748b',
      },
    ];
  }, [systemOverview.errorSummary, isAr]);

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ========================================================================= */}
      {/* 1. HERO & SYSTEM STATUS RING                                             */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Glow orb */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Left Text / Info */}
          <div className="space-y-3 max-w-2xl text-center lg:text-left rtl:lg:text-right">
            <div className="flex items-center gap-2.5 justify-center lg:justify-start rtl:lg:justify-start flex-wrap">
              <span className="px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-black flex items-center gap-1.5 shadow-sm">
                <Activity className="w-3.5 h-3.5 animate-pulse text-sky-400" />
                <span>{isAr ? 'مراقبة حية على مدار 24 ساعة' : 'Live 24h Telemetry'}</span>
              </span>

              {/* Status pill */}
              <span
                className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-sm border ${
                  systemOverview.systemStatus === 'healthy'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : systemOverview.systemStatus === 'degraded'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full animate-ping ${
                    systemOverview.systemStatus === 'healthy'
                      ? 'bg-emerald-400'
                      : systemOverview.systemStatus === 'degraded'
                      ? 'bg-amber-400'
                      : 'bg-rose-400'
                  }`}
                />
                <span>
                  {systemOverview.systemStatus === 'healthy'
                    ? isAr
                      ? 'جميع البوابات تعمل بكفاءة تامة (Operational)'
                      : 'All Gateways Operational'
                    : systemOverview.systemStatus === 'degraded'
                    ? isAr
                      ? 'تدهور طفيف في زمن الاستجابة (Degraded)'
                      : 'Partial Latency Degradation'
                    : isAr
                    ? 'تنبيه: اضطراب في بعض الاتصالات (Incident)'
                    : 'Critical API Connection Alert'}
                </span>
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
              {isAr ? 'لوحة صحة تكاملات الـ API والبوابات' : 'API Integration Health Dashboard'}
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isAr
                ? 'مراقبة شاملة لكافة روابط وواجهات الربط البرمجي لشركات المراهنات (REST API, Webhook, OAuth) عبر آخر 24 ساعة مع إحصائيات دقيقة لمعدلات النجاح وزمن الاستجابة (Latency).'
                : 'Real-time telemetry and health monitoring across all partner API gateways over the last 24 hours, tracking success/failure rates, latencies, and protocol distributions.'}
            </p>

            {/* Financial Policy Guarantee Callout */}
            <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white/5 border border-white/10 text-slate-300 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {isAr
                  ? 'سياسة الرصيد المتاح فقط: جميع التكاملات تراقب وتضمن تحويل الرصيد المتاح حصراً. الأرصدة المجمدة محمية تماماً ولا تقبل السحب عبر الـ API.'
                  : 'Strict Available Balance Policy: All monitored endpoints strictly enforce available balance transfers. Frozen balances remain inviolable.'}
              </span>
            </div>
          </div>

          {/* Right: Circular Status Ring & Key Stat */}
          <div className="flex flex-col sm:flex-row items-center gap-6 shrink-0 bg-white/5 p-4 sm:p-5 rounded-3xl border border-white/10 backdrop-blur-md">
            {/* SVG Status Ring */}
            <div className="relative flex items-center justify-center w-36 h-36">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                {/* Background Ring */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  className="stroke-slate-800"
                  strokeWidth="10"
                  fill="transparent"
                />
                {/* Progress Ring */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  className={`transition-all duration-1000 ease-out ${
                    systemOverview.systemStatus === 'healthy'
                      ? 'stroke-emerald-400'
                      : systemOverview.systemStatus === 'degraded'
                      ? 'stroke-amber-400'
                      : 'stroke-rose-500'
                  }`}
                  strokeWidth="10"
                  strokeDasharray={2 * Math.PI * 50}
                  strokeDashoffset={2 * Math.PI * 50 * (1 - systemOverview.successRate / 100)}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>

              {/* Inside Ring Metrics */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {systemOverview.successRate}%
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {isAr ? 'معدل النجاح 24س' : '24h Success'}
                </span>
              </div>
            </div>

            {/* Quick telemetry indicators */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-1.5">
                <span className="text-slate-400">{isAr ? 'إجمالي الطلبات (24س):' : 'Total Requests:'}</span>
                <span className="font-mono font-bold text-white">
                  {systemOverview.totalCalls.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-1.5">
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{isAr ? 'طلبات ناجحة:' : 'Successful:'}</span>
                </span>
                <span className="font-mono font-bold text-emerald-300">
                  {systemOverview.totalSuccess.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-1.5">
                <span className="text-rose-400 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  <span>{isAr ? 'أخطاء وفشل:' : 'Failed:'}</span>
                </span>
                <span className="font-mono font-bold text-rose-300">
                  {systemOverview.totalFailed.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-sky-400" />
                  <span>{isAr ? 'متوسط الاستجابة:' : 'Avg Latency:'}</span>
                </span>
                <span className="font-mono font-bold text-sky-300">
                  {systemOverview.avgLatency}ms
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Control Strip */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Auto refresh badge */}
            <button
              type="button"
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                autoRefreshEnabled
                  ? 'bg-sky-500/20 text-sky-300 border-sky-400/40 hover:bg-sky-500/30'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
              }`}
            >
              <RefreshCw className={`w-3 h-3 ${autoRefreshEnabled ? 'animate-spin text-sky-400' : ''}`} />
              <span>
                {autoRefreshEnabled
                  ? isAr
                    ? `تحديث تلقائي خلال ${autoRefreshSecs} ثانية`
                    : `Auto-refresh in ${autoRefreshSecs}s`
                  : isAr
                  ? 'التحديث التلقائي متوقف'
                  : 'Auto-refresh Paused'}
              </span>
            </button>

            <span className="text-slate-400 text-[11px]">
              {isAr ? 'آخر تحديث:' : 'Last sync:'}{' '}
              <span className="text-slate-200 font-mono">
                {lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Run Full Diagnostics */}
            <button
              type="button"
              disabled={isBatchTesting}
              onClick={handleBatchTestAll}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              {isBatchTesting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Radio className="w-3.5 h-3.5" />
              )}
              <span>
                {isBatchTesting
                  ? isAr
                    ? `جاري فحص ${batchProgress.completed}/${batchProgress.total}...`
                    : `Testing ${batchProgress.completed}/${batchProgress.total}...`
                  : isAr
                  ? 'تشخيص كافة البوابات الآن'
                  : 'Run Full Diagnostics'}
              </span>
            </button>

            {/* Refresh telemetry */}
            <button
              type="button"
              onClick={handleManualRefresh}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isAr ? 'تحديث القياسات' : 'Refresh Telemetry'}</span>
            </button>

            {/* Export report */}
            <button
              type="button"
              onClick={handleExportReport}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
              title={isAr ? 'تصدير تقرير JSON' : 'Export JSON report'}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isAr ? 'تصدير تقرير' : 'Export Report'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. STATS CARDS ROW                                                        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Connections */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {isAr ? 'البوابات النشطة / الكلية' : 'Active Gateways / Total'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {systemOverview.activeConns}
            </span>
            <span className="text-xs text-slate-500 font-bold">
              / {systemOverview.totalConns} {isAr ? 'بوابة' : 'methods'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            {systemOverview.activeConns === systemOverview.totalConns
              ? isAr
                ? '✓ 100% من التكاملات مفعّلة'
                : '✓ 100% of methods enabled'
              : isAr
              ? `${systemOverview.totalConns - systemOverview.activeConns} غير مفعّل`
              : `${systemOverview.totalConns - systemOverview.activeConns} disabled`}
          </p>
        </div>

        {/* Card 2: 24h Success Rate */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {isAr ? 'نسبة النجاح الإجمالية' : '24h Success Rate'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {systemOverview.successRate}%
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
              ({systemOverview.totalSuccess.toLocaleString()} {isAr ? 'ناجح' : 'ok'})
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {isAr ? 'مقابل ' : 'vs '}
            <span className="text-rose-600 dark:text-rose-400 font-bold">
              {systemOverview.totalFailed.toLocaleString()}
            </span>{' '}
            {isAr ? 'حالات فشل' : 'failed requests'}
          </p>
        </div>

        {/* Card 3: Global Latency */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {isAr ? 'متوسط سرعة الاستجابة' : 'Mean Latency (p50)'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {systemOverview.avgLatency}
              <span className="text-sm font-bold text-slate-500">ms</span>
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
              {systemOverview.avgLatency < 100
                ? isAr
                  ? 'سريع جداً'
                  : 'Fast'
                : systemOverview.avgLatency < 250
                ? isAr
                  ? 'طبيعي'
                  : 'Normal'
                : isAr
                ? 'بطيء'
                : 'Slow'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {isAr ? 'هدف المنصة: أقل من 150ms' : 'Target SLA: < 150ms'}
          </p>
        </div>

        {/* Card 4: Policy & Governance */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {isAr ? 'امتثال سياسة الرصيد المتاح' : 'Available Balance Rule'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              100%
            </span>
            <span className="text-xs text-slate-500 font-bold">
              {isAr ? 'مطابق' : 'Compliant'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {isAr ? 'تجميد فوري لأي محاولة سحب غير مصرح' : 'Frozen balances strictly secured'}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. VISUAL CHARTS SECTION (Recharts)                                       */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
        {/* Chart View Switcher Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-600" />
            <h3 className="font-extrabold text-sm sm:text-base">
              {isAr ? 'الرسوم البيانية لتحليلات الـ API (24 ساعة)' : '24-Hour Telemetry & Analytics Charts'}
            </h3>
          </div>

          {/* Chart selector tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex-wrap">
            <button
              type="button"
              onClick={() => setActiveChart('traffic')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeChart === 'traffic'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{isAr ? 'حركة الطلبات والنجاح' : 'Requests & Success'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveChart('latency')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeChart === 'latency'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{isAr ? 'زمن الاستجابة (Latency)' : 'Latency Trend'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveChart('protocol')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeChart === 'protocol'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <PieChartIcon className="w-3.5 h-3.5" />
              <span>{isAr ? 'توزيع البروتوكولات' : 'Protocol Share'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveChart('errors')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeChart === 'errors'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{isAr ? 'تصنيف الأخطاء' : 'Error Breakdown'}</span>
            </button>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-72 w-full pt-2">
          {/* TAB 1: TRAFFIC & SUCCESS AREA CHART */}
          {activeChart === 'traffic' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="colorFailure" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, name: any) => [
                    Number(value).toLocaleString(),
                    name === 'successCount'
                      ? isAr
                        ? 'طلبات ناجحة'
                        : 'Success Calls'
                      : isAr
                      ? 'طلبات فاشلة'
                      : 'Failed Calls',
                  ]}
                  labelFormatter={(label) => `${isAr ? 'الساعة' : 'Hour'}: ${label}`}
                />
                <Legend
                  formatter={(value) =>
                    value === 'successCount'
                      ? isAr
                        ? 'الطلبات الناجحة (Success)'
                        : 'Successful Requests'
                      : isAr
                      ? 'الطلبات غير الناجحة (Failures)'
                      : 'Failed Requests'
                  }
                />
                <Area
                  type="monotone"
                  dataKey="successCount"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSuccess)"
                />
                <Area
                  type="monotone"
                  dataKey="failureCount"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorFailure)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {/* TAB 2: LATENCY TREND */}
          {activeChart === 'latency' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="ms" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`${value} ms`, isAr ? 'متوسط الاستجابة' : 'Avg Latency']}
                  labelFormatter={(label) => `${isAr ? 'الساعة' : 'Hour'}: ${label}`}
                />
                <Legend
                  formatter={() => (isAr ? 'متوسط سرعة الاستجابة بالمللي ثانية' : 'Average Latency (ms)')}
                />
                <Area
                  type="monotone"
                  dataKey="avgLatencyMs"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorLatency)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {/* TAB 3: PROTOCOL DONUT SHARE */}
          {activeChart === 'protocol' && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={protocolPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {protocolPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [Number(value).toLocaleString(), isAr ? 'الطلبات' : 'Calls']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}

          {/* TAB 4: ERROR BREAKDOWN BAR CHART */}
          {activeChart === 'errors' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={errorBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [Number(val).toLocaleString(), isAr ? 'عدد مرات الخطأ' : 'Error Count']}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {errorBarData.map((entry, idx) => (
                    <Cell key={`bar-${idx}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. ACTIVE CONNECTIONS MONITOR & FILTERS                                   */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {/* Filter Toolbar */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 rtl:right-3 rtl:left-auto top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isAr ? 'بحث بالشركة، نقطة النهاية، أو الطريقة...' : 'Search by partner, URL, or method...'
                }
                className="w-full pl-9 rtl:pr-9 pr-3 rtl:pl-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-xs focus:ring-2 focus:ring-sky-500 placeholder-slate-400"
              />
            </div>

            {/* Company Select Filter */}
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <select
                value={selectedCompanyFilter}
                onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold border-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">{isAr ? 'جميع الشركات' : 'All Companies'}</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.promo_code})
                  </option>
                ))}
              </select>

              {/* Protocol Filter */}
              <select
                value={selectedProtocolFilter}
                onChange={(e) => setSelectedProtocolFilter(e.target.value as ProtocolFilterType)}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold border-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">{isAr ? 'جميع البروتوكولات' : 'All Protocols'}</option>
                <option value="rest_api">REST API</option>
                <option value="webhook_s2s">S2S Webhook</option>
                <option value="oauth2">OAuth 2.0</option>
                <option value="merchant_gateway">Merchant Gateway</option>
              </select>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {(['all', 'healthy', 'degraded', 'down'] as StatusFilterType[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSelectedStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      selectedStatusFilter === st
                        ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {st === 'all' && (isAr ? 'الكل' : 'All')}
                    {st === 'healthy' && (isAr ? 'سليم 🟢' : 'Healthy 🟢')}
                    {st === 'degraded' && (isAr ? 'بطيء 🟡' : 'Degraded 🟡')}
                    {st === 'down' && (isAr ? 'مشاكل 🔴' : 'Issues 🔴')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Connections List Header */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span className="font-extrabold text-sm">
              {isAr ? 'حالة نقاط النهاية النشطة' : 'Active Connection Endpoints'}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">
              {filteredConnections.length} {isAr ? 'اتصال' : 'connections'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleResetTelemetry}
            className="text-[11px] text-slate-400 hover:text-rose-500 font-bold transition-colors"
          >
            {isAr ? 'إعادة ضبط القياسات' : 'Reset Telemetry'}
          </button>
        </div>

        {/* Connections Cards Grid */}
        {filteredConnections.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 space-y-2">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
            <p className="font-bold text-sm">
              {isAr ? 'لا توجد اتصالات تطابق شروط البحث' : 'No API connections match the selected filters'}
            </p>
            <p className="text-xs">
              {isAr ? 'جرب تغيير شروط الفلترة أو إلغاء كلمة البحث.' : 'Try changing your search query or filters.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredConnections.map((conn) => {
              const isTestingThis = testingMethodId === conn.methodId;

              return (
                <div
                  key={conn.methodId}
                  className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border transition-all hover:shadow-md relative space-y-4 ${
                    conn.status === 'healthy'
                      ? 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/40'
                      : conn.status === 'degraded'
                      ? 'border-amber-300 dark:border-amber-800/60 bg-amber-50/20 dark:bg-amber-950/10'
                      : 'border-rose-300 dark:border-rose-800/60 bg-rose-50/20 dark:bg-rose-950/10'
                  }`}
                >
                  {/* Card Top: Partner Brand & Method Info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center p-1.5 border shrink-0 shadow-2xs"
                        style={{
                          backgroundColor: `${conn.companyColor || '#0284c7'}15`,
                          borderColor: `${conn.companyColor || '#0284c7'}40`,
                        }}
                      >
                        <CompanyBrandLogo
                          companyName={conn.companyName}
                          companyId={conn.companyId}
                          size="sm"
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-black text-sm text-slate-900 dark:text-white">
                            {conn.companyName}
                          </h4>
                          {conn.promoCode && (
                            <span
                              className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-md border"
                              style={{
                                color: conn.companyColor || '#0284c7',
                                borderColor: `${conn.companyColor || '#0284c7'}40`,
                                backgroundColor: `${conn.companyColor || '#0284c7'}10`,
                              }}
                            >
                              PROMO: {conn.promoCode}
                            </span>
                          )}
                          {conn.isPrimary && (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] font-black border border-amber-500/40">
                              {isAr ? 'رئيسي' : 'PRIMARY'}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold truncate max-w-xs">
                          {isAr && conn.methodNameAr ? conn.methodNameAr : conn.methodName}
                        </p>
                      </div>
                    </div>

                    {/* Mini Status Gauge Ring for Individual Connection */}
                    <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 60 60">
                        <circle
                          cx="30"
                          cy="30"
                          r="24"
                          className="stroke-slate-200 dark:stroke-slate-800"
                          strokeWidth="5"
                          fill="transparent"
                        />
                        <circle
                          cx="30"
                          cy="30"
                          r="24"
                          className={`transition-all duration-700 ${
                            conn.status === 'healthy'
                              ? 'stroke-emerald-500'
                              : conn.status === 'degraded'
                              ? 'stroke-amber-500'
                              : 'stroke-rose-500'
                          }`}
                          strokeWidth="5"
                          strokeDasharray={2 * Math.PI * 24}
                          strokeDashoffset={2 * Math.PI * 24 * (1 - conn.successRate24h / 100)}
                          strokeLinecap="round"
                          fill="transparent"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-center">
                        <span className="text-[11px] font-black text-slate-900 dark:text-white">
                          {conn.successRate24h}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Endpoint URL Pill */}
                  <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-600 dark:text-slate-300">
                    <span className="truncate" title={conn.endpointUrl}>
                      {conn.endpointUrl}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(conn.endpointUrl, isAr ? 'تم نسخ رابط الـ API' : 'API URL copied')}
                      className="text-slate-400 hover:text-sky-500 shrink-0 p-1"
                      title={isAr ? 'نسخ الرابط' : 'Copy URL'}
                    >
                      {copiedUrl === conn.endpointUrl ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-[11px]">
                    {/* Latency */}
                    <div>
                      <span className="text-slate-400 block">{isAr ? 'زمن الاستجابة' : 'Latency'}</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {conn.avgLatencyMs}ms
                      </span>
                    </div>

                    {/* Total 24h Calls */}
                    <div>
                      <span className="text-slate-400 block">{isAr ? 'طلبات 24س' : '24h Calls'}</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {conn.totalCalls24h.toLocaleString()}
                      </span>
                    </div>

                    {/* Success Count */}
                    <div>
                      <span className="text-slate-400 block">{isAr ? 'الناجحة' : 'Successful'}</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {conn.successCalls24h.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Status and Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          conn.status === 'healthy'
                            ? 'bg-emerald-500'
                            : conn.status === 'degraded'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                      />
                      <span className="text-slate-500 text-[11px] font-medium">
                        {conn.status === 'healthy' && (isAr ? 'سليم ومتصل' : 'Operational')}
                        {conn.status === 'degraded' && (isAr ? 'استجابة بطيئة' : 'Degraded')}
                        {conn.status === 'down' && (isAr ? 'تنبيه: أخطاء اتصال' : 'Issues')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Test connection */}
                      <button
                        type="button"
                        disabled={isTestingThis}
                        onClick={() => handleTestConnection(conn)}
                        className="px-2.5 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:bg-sky-100 font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-all disabled:opacity-50"
                        title={isAr ? 'فحص الاتصال اللحظي' : 'Test connectivity now'}
                      >
                        {isTestingThis ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-sky-600" />
                        ) : (
                          <Zap className="w-3 h-3 text-sky-600" />
                        )}
                        <span>{isTestingThis ? (isAr ? 'جاري الفحص...' : 'Testing...') : isAr ? 'فحص' : 'Ping'}</span>
                      </button>

                      {/* Open Tester tool */}
                      {onOpenTester && (
                        <button
                          type="button"
                          onClick={() => onOpenTester(conn.companyId, conn.methodId)}
                          className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-all"
                          title={isAr ? 'فتح أداة فحص الويب هوك' : 'Open in Integration Tester'}
                        >
                          <Send className="w-3 h-3 text-indigo-600" />
                          <span>{isAr ? 'تجربة الويب هوك' : 'Tester'}</span>
                        </button>
                      )}

                      {/* Configure method */}
                      {onNavigateToApiConfig && (
                        <button
                          type="button"
                          onClick={() => onNavigateToApiConfig(conn.companyId)}
                          className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-sky-600 text-[11px]"
                          title={isAr ? 'تعديل الإعدادات' : 'Configure method'}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
