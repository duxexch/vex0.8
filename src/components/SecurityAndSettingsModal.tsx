import React, { useState, useEffect } from 'react';
import { Language, UserProfile } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { vexApi } from '../services/api';
import { SUPPORTED_CURRENCIES } from '../utils/currency';
import {
  X,
  Shield,
  KeyRound,
  Trash2,
  FileText,
  Lock,
  Phone,
  Check,
  AlertTriangle,
  Download,
  Smartphone,
  CheckCircle2,
  Coins,
} from 'lucide-react';

interface SecurityAndSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onOpenPhoneModal: () => void;
  onOpenPhoneChangeRequest?: () => void;
  onAccountDeleted: () => void;
  lang?: Language;
  canInstallPwa?: boolean;
  onInstallPwa?: () => void;
  displayCurrency: string;
  onDisplayCurrencyChange: (currency: string) => void;
}

export const SecurityAndSettingsModal: React.FC<SecurityAndSettingsModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onOpenPhoneModal,
  onOpenPhoneChangeRequest,
  onAccountDeleted,
  lang = 'ar',
  canInstallPwa = false,
  onInstallPwa,
  displayCurrency,
  onDisplayCurrencyChange,
}) => {
  const [activeTab, setActiveTab] = useState<'security' | 'currency' | 'install' | 'legal' | 'delete'>('security');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMessage, setPinMessage] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isStandalone, setIsStandalone] = useState(false);

  const t = TRANSLATIONS[lang] || TRANSLATIONS['ar'];
  const ts = t.settings;
  const isAr = lang === 'ar';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(standalone);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinMessage(null);

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinError(ts.pinLengthError);
      return;
    }
    if (newPin !== confirmPin) {
      setPinError(ts.pinMismatchError);
      return;
    }

    try {
      await vexApi.verifyPin(currentPin);
      await vexApi.setPin(newPin);
      setPinMessage(ts.pinSuccess);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (err: any) {
      setPinError(err.message || (isAr ? 'فشل تغيير رمز الحماية.' : 'Failed to change PIN.'));
    }
  };

  const expectedDeleteKeyword = ts.deleteKeyword.trim();

  const handleDeleteAccount = async () => {
    if (
      deleteConfirmText.trim().toLowerCase() !== expectedDeleteKeyword.toLowerCase() &&
      deleteConfirmText.trim() !== 'حذف نهائي'
    ) {
      return;
    }
    setIsDeleting(true);
    try {
      await vexApi.deleteUserAccountAndData();
      onAccountDeleted();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md my-auto bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">{ts.title}</h3>
              <p className="text-[11px] text-slate-500 font-medium">{ts.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-3 text-xs font-bold bg-slate-50/50 overflow-x-auto">
          <button
            onClick={() => setActiveTab('security')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'security'
                ? 'border-emerald-600 text-emerald-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{ts.tabSecurity}</span>
          </button>

          <button
            onClick={() => setActiveTab('currency')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'currency'
                ? 'border-emerald-600 text-emerald-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>{ts.tabCurrency}</span>
          </button>

          {/* Show Install Tab only if not installed */}
          {!isStandalone && (
            <button
              onClick={() => setActiveTab('install')}
              className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'install'
                  ? 'border-emerald-600 text-emerald-700 font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
              <span>{ts.tabInstall}</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('legal')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'legal'
                ? 'border-emerald-600 text-emerald-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{ts.tabLegal}</span>
          </button>

          <button
            onClick={() => setActiveTab('delete')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'delete'
                ? 'border-rose-600 text-rose-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{ts.tabDelete}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'currency' && (
            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-700 block">
                {ts.displayCurrencyLabel}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Object.values(SUPPORTED_CURRENCIES).map((curr) => {
                  const isSelected = displayCurrency === curr.code;
                  return (
                    <button
                      key={curr.code}
                      onClick={() => onDisplayCurrencyChange(curr.code)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-black text-sm ${
                          isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {curr.symbol}
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">{curr.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">Code: {curr.code}</span>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              {/* PWA Mode Status Banner */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-slate-600" />
                  <span className="text-slate-600 font-bold">{isAr ? 'حالة تشغيل التطبيق:' : 'App Environment:'}</span>
                </div>
                {isStandalone ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[11px] border border-emerald-300">
                    <CheckCircle2 className="w-3 h-3" />
                    {ts.installedMode}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-300">
                    {ts.browserMode}
                  </span>
                )}
              </div>

              {/* Linked Phone Badge */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-emerald-700 shadow-2xs">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-slate-800">{ts.linkedPhone}</h4>
                      {userProfile?.is_phone_verified && (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {isAr ? '🔒 مقفل' : '🔒 Locked'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono font-bold">
                      {userProfile?.phone_number ? userProfile.phone_number : ts.noPhoneLinked}
                    </p>
                  </div>
                </div>

                {userProfile?.is_phone_verified ? (
                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenPhoneChangeRequest) {
                        onOpenPhoneChangeRequest();
                      } else {
                        onOpenPhoneModal();
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold hover:bg-amber-100 transition-colors shadow-xs"
                  >
                    {isAr ? 'طلب تغيير من الإدارة' : 'Request Admin Change'}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenPhoneModal();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors shadow-xs"
                  >
                    {isAr ? 'ربط الهاتف (مرة واحدة)' : ts.linkPhoneNow}
                  </button>
                )}
              </div>

              {/* Linked Telegram Badge */}
              {userProfile?.telegram_username && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">{ts.linkedTelegram}</span>
                  <span className="font-mono text-blue-600 font-bold">
                    @{userProfile.telegram_username}
                  </span>
                </div>
              )}

              {/* Change PIN Form */}
              <form
                onSubmit={handleChangePin}
                className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3"
              >
                <div className="flex items-center gap-2 text-xs font-black text-slate-800">
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  <span>{ts.changePinTitle}</span>
                </div>

                {pinError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 font-medium">
                    {pinError}
                  </div>
                )}
                {pinMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>{pinMessage}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    {ts.currentPinLabel}
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value.replace(/[^0-9]/g, ''))}
                    required
                    placeholder="••••"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-center tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {ts.newPinLabel}
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                      required
                      placeholder="••••"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-center tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {ts.confirmPinLabel}
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                      required
                      placeholder="••••"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-center tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shadow-xs"
                >
                  {ts.savePinBtn}
                </button>
              </form>
            </div>
          )}

          {/* INSTALL APP TAB (Only available if running in browser) */}
          {activeTab === 'install' && !isStandalone && (
            <div className="space-y-4">
              <div className="p-5 bg-linear-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl text-center space-y-3 shadow-xs">
                <div className="w-14 h-14 mx-auto rounded-3xl bg-emerald-600 text-white flex items-center justify-center shadow-lg ring-4 ring-emerald-100">
                  <Smartphone className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">{ts.installTitle}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {ts.installDesc}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onInstallPwa) {
                      onInstallPwa();
                    } else {
                      alert(
                        isAr
                          ? 'لتثبيت التطبيق من المتصفح: اضغط على زر المشاركة (Share) ثم اختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).'
                          : 'To install: Open browser menu and select "Add to Home screen".'
                      );
                    }
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                >
                  <Download className="w-4 h-4" />
                  <span>{ts.installBtn}</span>
                </button>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs text-slate-600">
                <h5 className="font-bold text-slate-800">
                  {isAr ? '💡 خطوات التثبيت السريع:' : '💡 Quick Installation Guide:'}
                </h5>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500">
                  <li>
                    {isAr
                      ? 'على هواتف iPhone/Safari: اضغط زر المشاركة (Share) في الأسفل ثم "إضافة إلى الشاشة الرئيسية".'
                      : 'On iOS/Safari: Tap Share icon then tap "Add to Home Screen".'}
                  </li>
                  <li>
                    {isAr
                      ? 'على هواتف Android/Chrome: اضغط على النقاط الثلاث بالأعلى ثم "تثبيت التطبيق" أو "Install App".'
                      : 'On Android/Chrome: Tap the 3 dots menu and choose "Install app" or "Add to Home screen".'}
                  </li>
                  <li>
                    {isAr
                      ? 'بعد التثبيت، سيختفي هذا الزر وسيعمل التطبيق كبرنامج مستقل وسريع بدون شريط المتصفح.'
                      : 'Once installed, this install prompt will disappear and run as a standalone app.'}
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'legal' && (
            <div className="space-y-3.5 text-xs text-slate-700 leading-relaxed">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-700 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{isAr ? 'تنويه المسؤولية القانونية (+18)' : 'Legal Disclaimer (+18)'}</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {isAr
                    ? 'تطبيق vex.deals هو منصة برمجية مستقلة لتنظيم وإدارة برامج استرداد الخسائر والمكافآت الترويجية بين المستخدم والشركات المعتمدة. التطبيق لا يقدم أو يستضيف أي مراهنات أو ألعاب حظ بشكل مباشر، ويشترط ألا يقل عمر المستخدم عن 18 عاماً.'
                    : 'vex.deals is an independent software loyalty & cashback platform. We do not directly host gambling or betting games. Users must be 18+ years of age.'}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <h4 className="font-bold text-slate-800">
                  {isAr ? 'سياسة الخصوصية واستخدام البيانات' : 'Privacy Policy & Security'}
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {isAr ? (
                    <>
                      • يتم تشفير أرقام الهواتف ورموز الحماية (PIN) لحماية العمليات.
                      <br />
                      • لا تتم مشاركة بياناتك الشخصية مع أطراف خارجية إلا لأغراض التحقق ومطابقة أرصدة
                      التعويض مع الشركات المسجلة.
                      <br />• يحق للمستخدم حذف كافة بياناته وسجلاته بالكامل في أي وقت من خلال خيار «حذف
                      الحساب».
                    </>
                  ) : (
                    <>
                      • Phone numbers and PIN codes are encrypted for end-to-end security.
                      <br />
                      • Data is never shared with third parties except for registered account audit.
                      <br />• Users have the full right to delete all data at any time via "Delete
                      Account".
                    </>
                  )}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <h4 className="font-bold text-slate-800">
                  {isAr ? 'شروط وأحكام التعويض والتحويل' : 'Terms & Compensation Rules'}
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {isAr ? (
                    <>
                      • تبلغ نسبة فك تجميد الرصيد 10% لكل إحالة نشطة مسجلة وموثقة.
                      <br />
                      • يحق للمستخدم تحويل رصيد مجمد بحد أقصى 10% لمرة واحدة فقط لكل صديق مسجل في نفس
                      الشركة لتفادي التواطؤ الدوري.
                      <br />• جميع طلبات التعويض تخضع للمراجعة والتدقيق برقم قسيمة رهان معتمد.
                    </>
                  ) : (
                    <>
                      • 10% unfreeze rate per active referral registration.
                      <br />
                      • Max 10% frozen balance transfer per friend with anti-collusion safeguards.
                      <br />• All compensation requests undergo verification with official bet slip ID.
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'delete' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3 text-xs">
              <div className="flex items-center gap-2 text-rose-800 font-bold">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>{ts.deleteTitle}</span>
              </div>

              <p className="text-[11px] text-rose-800 leading-relaxed">{ts.deleteDesc}</p>

              <div className="space-y-1.5 pt-2">
                <label className="block text-[11px] font-bold text-slate-600">
                  {ts.deletePrompt}{' '}
                  <strong className="text-slate-900 font-mono font-black">
                    {ts.deleteKeyword}
                  </strong>
                  :
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={ts.deleteKeyword}
                  className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-400 text-center font-bold"
                />
              </div>

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={
                  isDeleting ||
                  (deleteConfirmText.trim().toLowerCase() !== expectedDeleteKeyword.toLowerCase() &&
                    deleteConfirmText.trim() !== 'حذف نهائي')
                }
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? ts.deleting : ts.deleteBtn}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
