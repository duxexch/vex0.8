import React, { useState } from 'react';
import { CompensationAccount, CompensationRequest, Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { ActivityTabSkeleton } from './SkeletonLoader';
import { ShieldCheck, Clock, XCircle, CheckCircle2, DollarSign, PlusCircle, Ticket, Copy, Check, Share2 } from 'lucide-react';
import { ResurrectedSlipModal } from './ResurrectedSlipModal';

interface ActivityTabProps {
  accounts: CompensationAccount[];
  requests: CompensationRequest[];
  onOpenNewRequest: () => void;
  lang: Language;
  isLoading?: boolean;
  onCopyToast?: () => void;
}

export const ActivityTab: React.FC<ActivityTabProps> = ({
  accounts,
  requests,
  onOpenNewRequest,
  lang,
  isLoading = false,
  onCopyToast,
}) => {
  const [copiedAccountId, setCopiedAccountId] = useState<string | null>(null);
  const [shareSlipReq, setShareSlipReq] = useState<CompensationRequest | null>(null);
  const t = TRANSLATIONS[lang] || TRANSLATIONS['ar'];

  const handleCopyAccount = (accNum: string, accId: string) => {
    navigator.clipboard.writeText(accNum);
    setCopiedAccountId(accId);
    if (onCopyToast) onCopyToast();
    setTimeout(() => setCopiedAccountId(null), 2000);
  };

  if (isLoading) {
    return <ActivityTabSkeleton />;
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'approved':
      case 'processed':
        return {
          label: lang === 'ar' ? 'تم الإيداع والاعتماد' : lang === 'es' ? 'Aprobado' : lang === 'ru' ? 'Одобрено' : 'Approved',
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          borderClass: 'border-s-4 border-s-emerald-500',
          icon: CheckCircle2,
        };
      case 'pending':
        return {
          label: lang === 'ar' ? 'قيد التدقيق الفوري' : lang === 'es' ? 'En Revisión' : lang === 'ru' ? 'На проверке' : 'Under Review',
          classes: 'bg-amber-50 text-amber-700 border-amber-200',
          borderClass: 'border-s-4 border-s-amber-500',
          icon: Clock,
        };
      case 'cancelled':
        return {
          label: lang === 'ar' ? 'ملغى' : lang === 'es' ? 'Cancelado' : lang === 'ru' ? 'Отменено' : 'Cancelled',
          classes: 'bg-slate-50 text-slate-700 border-slate-300',
          borderClass: 'border-s-4 border-s-slate-400',
          icon: XCircle,
        };
      case 'rejected':
      default:
        return {
          label: lang === 'ar' ? 'مرفوض' : lang === 'es' ? 'Rechazado' : lang === 'ru' ? 'Отклонено' : 'Rejected',
          classes: 'bg-rose-50 text-rose-700 border-rose-200',
          borderClass: 'border-s-4 border-s-rose-500',
          icon: XCircle,
        };
    }
  };

  return (
    <div className="space-y-4 pb-24 animate-fade-in select-none">
      {/* Quick Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-sm sm:text-base font-black text-slate-900">
            {lang === 'ar'
              ? 'النشاط وسجل الحسابات والتعويضات'
              : lang === 'es'
              ? 'Actividad y Cuentas'
              : lang === 'ru'
              ? 'Активность и Счета'
              : 'Activity & History'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'ar'
              ? 'متابعة وتدقيق حساباتك المسجلة وحالة طلبات التعويض الفورية'
              : 'Track registered partner accounts and instant compensation requests'}
          </p>
        </div>
        <button
          onClick={onOpenNewRequest}
          className="h-9 self-start sm:self-auto flex items-center gap-1.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t.requestCompensation}</span>
        </button>
      </div>

      {/* Responsive Overview KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block">
            {lang === 'ar' ? 'الحسابات المسجلة' : 'Linked Accounts'}
          </span>
          <span className="text-lg sm:text-xl font-black font-mono text-slate-900">
            {accounts.length}
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-700 block">
            {lang === 'ar' ? 'الحسابات المعتمدة' : 'Active Accounts'}
          </span>
          <span className="text-lg sm:text-xl font-black font-mono text-emerald-700">
            {accounts.filter(a => a.status === 'active' || a.status === 'approved').length}
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-700 block">
            {lang === 'ar' ? 'قيد المراجعة' : 'Under Review'}
          </span>
          <span className="text-lg sm:text-xl font-black font-mono text-amber-800">
            {requests.filter(r => r.status === 'pending').length}
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-bold text-indigo-700 block">
            {lang === 'ar' ? 'إجمالي الطلبات' : 'Total Requests'}
          </span>
          <span className="text-lg sm:text-xl font-black font-mono text-indigo-700">
            {requests.length}
          </span>
        </div>
      </div>

      {/* 1. Registered Accounts Section - Responsive Multi-Column Grid */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            {t.myAccountsTitle} ({accounts.length})
          </h3>
        </div>

        {accounts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-400 shadow-xs">
            {lang === 'ar'
              ? 'لم تسجل أي حساب بعد. توجه لتبويب «الشركات» لربط حسابك.'
              : lang === 'es'
              ? 'No has vinculado ninguna cuenta. Ve a la pestaña «Casas».'
              : lang === 'ru'
              ? 'Счета пока не привязаны. Перейдите во вкладку «Компании».'
              : 'No accounts registered yet. Go to the "Partners" tab to link your ID.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {accounts.map((acc) => {
              const badge = getStatusBadge(acc.status);
              const BadgeIcon = badge.icon;

              return (
                <div
                  key={acc.id}
                  className={`bg-white border border-slate-200 hover:border-slate-300 ${badge.borderClass} rounded-2xl p-4 shadow-xs hover:shadow-sm flex flex-col justify-between transition-all duration-200`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-xs text-slate-800 shrink-0">
                          {acc.company_name.slice(0, 3).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            {acc.company_name}
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            {acc.currency || 'USD'}
                          </span>
                        </div>
                      </div>

                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${badge.classes}`}>
                        <BadgeIcon className="w-3 h-3" />
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    {/* Account Number Box */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500 font-medium">
                        {lang === 'ar' ? 'رقم الحساب:' : 'Account ID:'}
                      </span>
                      <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                        <span>{acc.account_number}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyAccount(acc.account_number, acc.id)}
                          className="text-slate-400 hover:text-emerald-600 p-0.5 rounded transition-colors inline-flex items-center cursor-pointer"
                          title={lang === 'ar' ? 'نسخ رقم الحساب' : 'Copy Account ID'}
                          aria-label={lang === 'ar' ? 'نسخ رقم الحساب' : 'Copy Account ID'}
                        >
                          {copiedAccountId === acc.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Compensation Requests Section - Responsive Multi-Column Grid */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
          {t.requestsHistoryTitle} ({requests.length})
        </h3>

        {requests.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-400 shadow-xs">
            {lang === 'ar'
              ? 'لا توجد طلبات تعويض سابقة.'
              : lang === 'es'
              ? 'No hay solicitudes de reembolso anteriores.'
              : lang === 'ru'
              ? 'Предыдущих запросов на компенсацию нет.'
              : 'No previous compensation requests.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {requests.map((req) => {
              const badge = getStatusBadge(req.status);
              const BadgeIcon = badge.icon;
              const currencyStr = req.currency || 'USD';

              return (
                <div
                  key={req.id}
                  className={`bg-white border border-slate-200 hover:border-slate-300 ${badge.borderClass} rounded-2xl p-4 shadow-xs hover:shadow-sm flex flex-col justify-between transition-all duration-200 space-y-3`}
                >
                  <div className="space-y-2.5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                          <DollarSign className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            {req.company_name}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {new Date(req.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                          </span>
                        </div>
                      </div>

                      <div className="text-right rtl:text-left shrink-0">
                        <span className="text-sm font-black font-mono text-emerald-700 block">
                          {Number(req.amount).toFixed(2)} {currencyStr}
                        </span>
                      </div>
                    </div>

                    {/* Meta info pills */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[11px]">{lang === 'ar' ? 'الحساب:' : 'Account:'}</span>
                        <span className="font-mono font-bold text-slate-800 text-[11px]">{req.account_number}</span>
                      </div>
                      {req.bet_slip_id && (
                        <div className="flex items-center justify-between border-t border-slate-200/60 pt-1">
                          <span className="text-slate-500 text-[11px]">{lang === 'ar' ? 'رقم القسيمة:' : 'Slip ID:'}</span>
                          <span className="flex items-center gap-0.5 text-indigo-700 font-mono font-bold text-[11px]">
                            <Ticket className="w-3 h-3" />
                            <span>#{req.bet_slip_id}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status & Reviewer Note */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${badge.classes}`}>
                        <BadgeIcon className="w-3 h-3" />
                        <span>{badge.label}</span>
                      </span>

                      {req.note && (
                        <span className="text-[11px] text-slate-500 italic truncate max-w-[140px]" title={req.note}>
                          «{req.note}»
                        </span>
                      )}
                    </div>
                    {req.status === 'approved' && (
                      <button
                        onClick={() => setShareSlipReq(req)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 font-bold transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        {lang === 'ar' ? 'شارك القسيمة المنجية' : 'Share Resurrected Slip'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {shareSlipReq && (
        <ResurrectedSlipModal
          request={shareSlipReq}
          lang={lang === 'ar' ? 'ar' : 'en'}
          onClose={() => setShareSlipReq(null)}
        />
      )}
    </div>
  );
};
