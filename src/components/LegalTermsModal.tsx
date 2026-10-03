import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Language } from '../types';
import { X, FileText, Shield, CheckCircle } from 'lucide-react';

interface LegalTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const LegalTermsModal: React.FC<LegalTermsModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const isAr = lang === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<'privacy' | 'terms'>('privacy');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="w-full max-w-xl my-auto rounded-2xl border border-slate-200/90 bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {isAr ? 'الشروط القانونية والخصوصية' : 'Terms & Privacy'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isAr ? 'إرشادات Apple و Google Play' : 'Store Policy Compliance'}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-tab Switcher */}
            <div className="p-1.5 border-b border-slate-100 flex gap-1.5 bg-slate-100">
              <button
                onClick={() => setActiveSubTab('privacy')}
                className={`flex-1 h-8 rounded-lg text-xs font-bold transition-all ${
                  activeSubTab === 'privacy'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isAr ? 'سياسة الخصوصية' : 'Privacy'}
              </button>

              <button
                onClick={() => setActiveSubTab('terms')}
                className={`flex-1 h-8 rounded-lg text-xs font-bold transition-all ${
                  activeSubTab === 'terms'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isAr ? 'شروط الاستخدام' : 'Terms'}
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 text-xs text-slate-600 space-y-3.5 leading-relaxed">
              {activeSubTab === 'privacy' ? (
                <>
                  <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 text-xs">
                      {isAr ? '1. جمع البيانات واستخدامها' : '1. Data Collection'}
                    </h4>
                    <p>
                      {isAr
                        ? 'تجمع منصة VEX Deals الحد الأدنى اللازم من البيانات لتقديم خدمات الولاء واسترداد النقود والتحليلات الرياضية، ويشمل ذلك معرف المستخدم العشوائي، رقم الهاتف الموثق بالرسائل النصية القصيرة، وأرقام حسابات المشتركين لدى الشركات الشريكة لأغراض التحقق من قسائم التعويض فقط.'
                        : 'VEX Deals collects minimal data for loyalty compensation, including user ID, verified phone number, and partner account IDs.'}
                    </p>
                  </div>

                  <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 text-xs">
                      {isAr ? '2. حق حذف الحساب والبيانات' : '2. Account Deletion'}
                    </h4>
                    <p>
                      {isAr
                        ? 'يحق لكل مستخدم حذف حسابه وكافة بياناته وسجل معاملاته نهائياً وبنقرة واحدة من خلال قائمة الإعدادات والأمان.'
                        : 'Users can permanently delete their account and data from the Settings menu.'}
                    </p>
                  </div>

                  <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 text-xs">
                      {isAr ? '3. الأمان والتشفير' : '3. Encryption & Security'}
                    </h4>
                    <p>
                      {isAr
                        ? 'تخضع جميع المعاملات ورموز الأمان (PIN) لتقنيات التشفير الثنائي والتحقق لمنع أي عمليات احتيال أو وصول غير مصرح به.'
                        : 'All sensitive actions require OTP and PIN security.'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 text-xs">
                      {isAr ? '1. طبيعة الخدمة' : '1. Nature of Service'}
                    </h4>
                    <p>
                      {isAr
                        ? 'VEX Deals ليست كازينو أو موقع مراهنات مباشر، بل هي نظام ولاء تحليلي مستقل يقدم عروض استرداد نقدي (Cashback) وتحليلات إحصائية تكتيكية للمباريات بالذكاء الاصطناعي.'
                        : 'VEX Deals is an independent loyalty rewards and AI analytics platform.'}
                    </p>
                  </div>

                  <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 text-xs">
                      {isAr ? '2. الأهلية والسن القانوني (+18)' : '2. Age Eligibility (+18)'}
                    </h4>
                    <p>
                      {isAr
                        ? 'استخدام التطبيق محصور حصراً بالأفراد الذين أتموا سن الرشد القانوني (18 عاماً فما فوق).'
                        : 'Restricted strictly to individuals 18 years or older.'}
                    </p>
                  </div>

                  <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 text-xs">
                      {isAr ? '3. إخلاء المسؤولية عن التحليلات' : '3. AI Disclaimer'}
                    </h4>
                    <p>
                      {isAr
                        ? 'توقعات وتحليلات الذكاء الاصطناعي هي نماذج إحصائية استرشادية ولا تشكل ضماناً مالياً، واللعب المسؤول هو مسؤولية المستخدم.'
                        : 'AI forecasts are statistical references only, not financial advice.'}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={onClose}
                className="h-9 px-4 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
