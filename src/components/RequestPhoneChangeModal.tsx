import React, { useState } from 'react';
import { Language, UserProfile, PhoneChangeRequest } from '../types';
import { vexApi } from '../services/api';
import {
  Phone,
  Lock,
  X,
  Send,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  ShieldAlert,
} from 'lucide-react';

interface RequestPhoneChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  pendingRequest?: PhoneChangeRequest | null;
  onSuccess: (request: PhoneChangeRequest) => void;
  lang?: Language;
}

const COUNTRY_CODES = [
  { code: '+964', country: 'العراق', flag: '🇮🇶' },
  { code: '+20', country: 'مصر', flag: '🇪🇬' },
  { code: '+966', country: 'السعودية', flag: '🇸🇦' },
  { code: '+971', country: 'الإمارات', flag: '🇦🇪' },
  { code: '+962', country: 'الأردن', flag: '🇯🇴' },
  { code: '+965', country: 'الكويت', flag: '🇰🇼' },
  { code: '+968', country: 'عمان', flag: '🇴🇲' },
  { code: '+974', country: 'قطر', flag: '🇶🇦' },
  { code: '+973', country: 'البحرين', flag: '🇧🇭' },
  { code: '+212', country: 'المغرب', flag: '🇲🇦' },
  { code: '+213', country: 'الجزائر', flag: '🇩🇿' },
  { code: '+216', country: 'تونس', flag: '🇹🇳' },
  { code: '+963', country: 'سوريا', flag: '🇸🇾' },
  { code: '+961', country: 'لبنان', flag: '🇱🇧' },
  { code: '+90', country: 'تركيا', flag: '🇹🇷' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+1', country: 'USA/CA', flag: '🇺🇸' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+7', country: 'Russia', flag: '🇷🇺' },
];

export const RequestPhoneChangeModal: React.FC<RequestPhoneChangeModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  pendingRequest,
  onSuccess,
  lang = 'ar',
}) => {
  const [countryCode, setCountryCode] = useState('+964');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isAr = lang === 'ar';

  if (!isOpen) return null;

  const currentPhone = userProfile?.phone_number || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanNumber = newPhoneNumber.replace(/[^0-9]/g, '');
    if (cleanNumber.length < 7 || cleanNumber.length > 15) {
      setError(
        isAr
          ? 'يرجى إدخال رقم هاتف صحيح ومكتمل.'
          : 'Please enter a valid phone number (7-15 digits).'
      );
      return;
    }

    const fullNewPhone = `${countryCode}${cleanNumber}`;
    if (fullNewPhone === currentPhone) {
      setError(
        isAr
          ? 'الرقم الجديد المدخل مطابق للرقم الحالي المسجل في المحفظة.'
          : 'New phone number cannot be the same as current linked phone.'
      );
      return;
    }

    if (!reason.trim() || reason.trim().length < 4) {
      setError(
        isAr
          ? 'يرجى كتابة سبب طلب تغيير رقم الهاتف لتوضيحه للإدارة.'
          : 'Please provide a valid reason for changing your phone number.'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await vexApi.requestPhoneChange(fullNewPhone, reason.trim());
      setSuccess(true);
      onSuccess(res.request);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || (isAr ? 'فشل إرسال الطلب.' : 'Failed to submit phone change request.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md my-auto bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                {isAr ? 'طلب تغيير رقم هاتف المحفظة' : 'Request Phone Number Change'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {isAr ? 'المراجعة والاعتماد الأمني عبر الإدارة' : 'Admin Security Review & Approval'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Active Pending Request Notice */}
          {pendingRequest && pendingRequest.status === 'pending' && !success && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-amber-900">
              <div className="flex items-center gap-2 text-xs font-black text-amber-800">
                <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                <span>{isAr ? 'طلبك الحالي قيد المراجعة لدى الإدارة' : 'Request Pending Admin Review'}</span>
              </div>
              <div className="text-xs space-y-1 text-amber-900/90 font-medium">
                <p>
                  {isAr ? 'الرقم الجديد المطلوب: ' : 'Requested New Phone: '}
                  <strong className="font-mono font-bold" dir="ltr">{pendingRequest.new_phone}</strong>
                </p>
                <p className="text-[11px] text-amber-700">
                  {isAr ? 'السبب: ' : 'Reason: '}
                  {pendingRequest.reason}
                </p>
                <p className="text-[10px] text-amber-600 font-mono">
                  {new Date(pendingRequest.created_at).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                </p>
              </div>
              <div className="pt-2 border-t border-amber-200/60 text-[11px] text-amber-800">
                {isAr
                  ? 'سيتم مراجعة بياناتك والتواصل معك عبر الإدارة فور الاعتماد.'
                  : 'The admin team is reviewing your request for security compliance.'}
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2 text-xs text-rose-900 font-medium animate-fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="py-6 text-center space-y-2.5 animate-fade-in">
              <div className="w-14 h-14 mx-auto bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-black text-slate-900">
                {isAr ? 'تم إرسال الطلب إلى الإدارة بنجاح!' : 'Request Sent to Admin!'}
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {isAr
                  ? 'تم تسجيل طلب تغيير رقم الهاتف في لوحة تحكم الإدارة وجارٍ التحقق منه.'
                  : 'Your request has been submitted to the admin panel for security verification.'}
              </p>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Security Policy Alert */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isAr ? 'سياسة حماية المحفظة (الربط لمرة واحدة)' : 'One-Time Phone Lock Policy'}</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {isAr
                    ? 'رقم الهاتف الحالي مقفل لحماية رصيدك من الاختراق والسحب غير المصرح به. تغيير الرقم يتطلب موافقة مباشرة من الإدارة بعد التحقق الأمني.'
                    : 'Your verified phone is locked to prevent unauthorized asset draining. Changing it requires direct administrator approval.'}
                </p>
              </div>

              {/* Current Phone Display */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  {isAr ? 'رقم الهاتف الحالي المرتبط بالمحفظة (المقفل):' : 'Current Linked Phone (Locked):'}
                </label>
                <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-between text-xs font-mono font-bold text-slate-700">
                  <span dir="ltr">{currentPhone || (isAr ? 'غير مسجل' : 'None')}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    <Lock className="w-3 h-3" />
                    <span>{isAr ? 'مقفل' : 'Locked'}</span>
                  </span>
                </div>
              </div>

              {/* New Phone Input */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  {isAr ? 'رقم الهاتف الجديد المطلوب اعتماده:' : 'Requested New Phone Number:'}
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-32 px-2.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>

                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder={isAr ? 'مثال: 7798765432' : 'e.g. 7798765432'}
                    value={newPhoneNumber}
                    onChange={(e) => setNewPhoneNumber(e.target.value)}
                    required
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Reason for Request */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>{isAr ? 'سبب طلب تغيير الرقم للإدارة:' : 'Reason for Phone Change:'}</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {isAr ? 'مطلوب للمراجعة' : 'Required'}
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    isAr
                      ? 'مثال: فقدت الشريحة القديمة وقمت بشراء رقم جديد، أو تغيير مزود الخدمة...'
                      : 'e.g., Lost previous SIM card, changed service provider, etc.'
                  }
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none leading-relaxed"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !newPhoneNumber.trim() || !reason.trim()}
                className="w-full py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
              >
                {loading ? (
                  <span>{isAr ? 'جارٍ إرسال الطلب للإدارة...' : 'Submitting to Admin...'}</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{isAr ? 'إرسال طلب التغيير إلى الإدارة' : 'Submit Request to Admin'}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
