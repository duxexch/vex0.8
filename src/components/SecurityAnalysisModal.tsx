import React, { useState } from 'react';
import { Language, SecurityVulnerability, PLATFORM_DOMAIN } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { vexApi } from '../services/api';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Users,
  RefreshCw,
  FileCheck,
  AlertTriangle,
  X,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SecurityAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const SecurityAnalysisModal: React.FC<SecurityAnalysisModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>('SEC-01-SYBIL');
  const t = TRANSLATIONS[lang];
  const vulnerabilities = vexApi.getSecurityVulnerabilities();

  if (!isOpen) return null;

  const getIcon = (type: SecurityVulnerability['iconType']) => {
    switch (type) {
      case 'users':
        return <Users className="w-5 h-5 text-amber-500" />;
      case 'refresh-cw':
        return <RefreshCw className="w-5 h-5 text-rose-500" />;
      case 'file-check':
        return <FileCheck className="w-5 h-5 text-emerald-600" />;
      case 'shield-alert':
        return <ShieldAlert className="w-5 h-5 text-indigo-500" />;
      case 'lock':
        return <Lock className="w-5 h-5 text-blue-500" />;
      case 'alert-triangle':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      default:
        return <ShieldCheck className="w-5 h-5 text-emerald-600" />;
    }
  };

  const getSeverityBadge = (severity: SecurityVulnerability['severity']) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
            حرجة جداً
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
            عالية الخطورة
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
            متوسطة / تنظيمية
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full sm:max-w-2xl my-auto rounded-2xl border border-slate-200/90 bg-white shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center border border-emerald-200 text-emerald-700">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  تحليل نموذج العمل وسد الثغرات المالية
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                  {PLATFORM_DOMAIN}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                فحص الثغرات المحتملة في نظام التعويضات والإحالات والحلول التقنية المطبقة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Executive Summary Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border border-emerald-200/80 space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>خلاصة التقييم الأمني لمنظومة VEX Deals</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              فكرة تعويض الخسائر برصيد مجمد بنسبة 100% أو 50% هي أداة تسويقية عبقرية لجذب آلاف
              المستخدمين الجدد عبر أكواد الوكالة. ولكن بدون حواجز ذكية، يمكن للمخترقين أو المحتالين
              استنزاف الأموال دون تحقيق أي إيراد تسويقي. قمنا ببناء 6 طبقات أمان صارمة تضمن استدامة
              المنصة وحماية أموالك.
            </p>
          </div>

          {/* Vulnerability & Solutions Accordion */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              الثغرات الست الرئيسية وحلولها الهندسية المعتمدة
            </h4>

            {vulnerabilities.map((item, idx) => {
              const isExpanded = expandedId === item.id;
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border transition-all ${
                    isExpanded
                      ? 'border-emerald-300 bg-white shadow-sm ring-1 ring-emerald-500/10'
                      : 'border-slate-200/90 bg-slate-50/50 hover:bg-white'
                  }`}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="w-full p-3.5 sm:p-4 text-right flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                        {getIcon(item.iconType)}
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-400">
                            0{idx + 1}
                          </span>
                          <h5 className="text-xs sm:text-sm font-bold text-slate-900">
                            {item.titleAr}
                          </h5>
                          {getSeverityBadge(item.severity)}
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {item.titleEn}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <ShieldCheck className="w-3 h-3" />
                        <span>محمي ومفعل</span>
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3 animate-fade-in text-xs">
                      {/* Problem Explanation */}
                      <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 space-y-1">
                        <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>طريقة الاستغلال والثغرة:</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed pr-5">
                          {item.problemAr}
                        </p>
                      </div>

                      {/* Applied Solution */}
                      <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                          <ShieldCheck className="w-4 h-4 text-emerald-700" />
                          <span>الحل الهندسي المفعل برمجياً في VEX Deals:</span>
                        </div>
                        <div className="pr-5 text-slate-800 space-y-1 whitespace-pre-line leading-relaxed font-medium">
                          {item.solutionAr}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Domain & App Store Architecture Note */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                <ExternalLink className="w-4 h-4 text-indigo-600" />
                <span>ربط الدومين الرسمي والتوافق مع المتاجر:</span>
              </span>
              <span className="font-mono text-[11px] font-bold text-emerald-700">
                https://{PLATFORM_DOMAIN}
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              تم تحديث جميع روابط الإحالة وتوليد الروابط لتشير إلى <strong>vex.deals</strong>. كما
              تمت صياغة واجهات التطبيق وفق معايير <strong>Apple App Store Guideline 5.1.1</strong> و{' '}
              <strong>5.3</strong> كمنصة برامج ولاء ومكافآت (Loyalty Cashback Aggregator) لتجنب حظر
              المتجر نهائياً.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            جميع الحمايات مفعلة وتعمل تلقائياً
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          >
            إغلاق ومتابعة العمل
          </button>
        </div>
      </div>
    </div>
  );
};
