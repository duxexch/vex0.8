import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Language } from '../types';
import {
  X,
  ShieldCheck,
  HeartHandshake,
  AlertTriangle,
  ExternalLink,
  Clock,
  Ban,
  Scale,
} from 'lucide-react';

interface ResponsibleGamingModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const ResponsibleGamingModal: React.FC<ResponsibleGamingModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const isAr = lang === 'ar';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="w-full max-w-lg my-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-amber-500/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-amber-500 text-slate-950 font-black text-sm">
                  18+
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                    {isAr ? 'سياسة اللعب المسؤول والتوعية' : 'Responsible Gaming Policy'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isAr ? 'حماية المستخدمين والامتثال لمتاجر التطبيقات' : 'Apple & Google Play Store Compliance'}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 p-3.5 rounded-2xl flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs">
                  {isAr
                    ? 'منصة VEX Deals هي منصة ولاء وتعويضات استرداد نقدي (Cashback) وتحليلات رياضية ذكية. المراهنات الرياضية والألعاب مخصصة للأشخاص البالغين فقط (+18 عاماً).'
                    : 'VEX Deals is a loyalty cashback rewards and AI sports analytics platform. Sports betting and gaming activities are strictly for adults aged 18 and older.'}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-black text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  {isAr ? 'مبادئ الممارسة المسؤولة:' : 'Core Principles:'}
                </h4>
                <ul className="space-y-1.5 list-disc list-inside text-xs">
                  <li>{isAr ? 'المراهنة بهدف الترفيه فقط وليس كوسيلة لتحقيق دخل أساسي.' : 'Bet only for entertainment, never as an income source.'}</li>
                  <li>{isAr ? 'عدم ملاحقة الخسائر أبداً تحت أي ظرف.' : 'Never chase losses.'}</li>
                  <li>{isAr ? 'تحديد ميزانية أسبوعية محددة والالتزام الصارم بها.' : 'Set strict deposit and loss limits.'}</li>
                  <li>{isAr ? 'أخذ فترات راحة منتظمة وتجنب اللعب تحت تأثير الضغط النفسي.' : 'Take regular breaks.'}</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-black text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                  <HeartHandshake className="w-4 h-4 text-sky-600" />
                  {isAr ? 'منظمات المساعدة الدولية المعتمدة:' : 'Official Helplines & Resources:'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <a
                    href="https://www.begambleaware.org"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:border-emerald-500 transition-colors"
                  >
                    <span className="font-bold">BeGambleAware.org</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>

                  <a
                    href="https://www.gamcare.org.uk"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:border-emerald-500 transition-colors"
                  >
                    <span className="font-bold">GamCare Support</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start gap-2 text-[11px] text-slate-500">
                <Scale className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>
                  {isAr
                    ? 'نحن نلتزم بحظر الحسابات وحذف البيانات فوراً عند طلب الاستبعاد الذاتي (Self-Exclusion) من خلال إعدادات الأمان وحذف الحساب.'
                    : 'We support instant self-exclusion and total account data deletion via Settings pursuant to Apple Guideline 5.1.1.'}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs"
              >
                {isAr ? 'فهمت وأوافق على المبادئ' : 'I Understand & Agree'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
