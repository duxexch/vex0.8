import React, { useState, useEffect } from 'react';
import { Company, Language, Wallet, PaymentMethod } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { formatCurrency } from '../utils/currency';
import { vexApi } from '../services/api';
import {
  ArrowDownLeft,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  DollarSign,
  Copy,
  Check,
  CreditCard,
  Sparkles,
  Info,
} from 'lucide-react';

interface DirectDepositUnfreezeModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  companies: Company[];
  lang: Language;
  displayCurrency: string;
  onSuccess: () => void;
  showToast: (msg: string) => void;
}

export const DirectDepositUnfreezeModal: React.FC<DirectDepositUnfreezeModalProps> = ({
  isOpen,
  onClose,
  wallets,
  companies,
  lang,
  displayCurrency,
  onSuccess,
  showToast,
}) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState(wallets[0]?.company_id || companies[0]?.id || '');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPmId, setSelectedPmId] = useState<string>('');
  const [isFetchingMethods, setIsFetchingMethods] = useState<boolean>(true);
  const [copiedField, setCopiedField] = useState<boolean>(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [screenshotNote, setScreenshotNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const t = TRANSLATIONS[lang] || TRANSLATIONS['ar'];
  const currentWallet = wallets.find((w) => w.company_id === selectedCompanyId);
  const frozenBal = currentWallet ? Number(currentWallet.frozen) : 0;

  // Fetch dynamic payment methods from Firestore service
  useEffect(() => {
    if (isOpen) {
      setIsFetchingMethods(true);
      vexApi
        .getPaymentMethods()
        .then((methods) => {
          if (methods && methods.length > 0) {
            setPaymentMethods(methods);
            const activeMethods = methods.filter((m) => m.is_active !== false);
            if (activeMethods.length > 0 && !selectedPmId) {
              setSelectedPmId(activeMethods[0].id);
            }
          }
        })
        .catch((err) => {
          console.error('Error fetching payment methods in unfreeze modal:', err);
        })
        .finally(() => {
          setIsFetchingMethods(false);
        });
    }
  }, [isOpen]);

  const activePaymentMethods = paymentMethods.filter((pm) => pm.is_active !== false);
  const selectedPm = activePaymentMethods.find((pm) => pm.id === selectedPmId) || activePaymentMethods[0];

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(true);
    showToast(lang === 'ar' ? 'تم نسخ رقم الحساب/المحفظة بنجاح!' : 'Account/Wallet number copied!');
    setTimeout(() => setCopiedField(false), 2500);
  };

  const getLocalizedText = (key: string, defaultAr: string, defaultEn: string, defaultEs: string, defaultRu: string) => {
    if (lang === 'ar') return defaultAr;
    if (lang === 'es') return defaultEs;
    if (lang === 'ru') return defaultRu;
    return defaultEn;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      setError(
        getLocalizedText(
          'err_amount',
          'يرجى إدخال مبلغ إيداع صحيح أكبر من صفر.',
          'Please enter a valid deposit amount greater than zero.',
          'Por favor ingrese un monto de depósito válido mayor a cero.',
          'Пожалуйста, введите корректную сумму депозита больше нуля.'
        )
      );
      return;
    }

    if (amount > frozenBal) {
      setError(
        getLocalizedText(
          'err_frozen',
          `مبلغ الإيداع (${formatCurrency(amount, displayCurrency)}) يتجاوز الرصيد المجمد الحالي (${formatCurrency(frozenBal, displayCurrency)}).`,
          `Deposit amount exceeds current frozen balance.`,
          `El monto del depósito supera el saldo congelado actual.`,
          `Сумма депозита превышает текущий замороженный баланс.`
        )
      );
      return;
    }

    if (!accountNumber.trim()) {
      setError(
        getLocalizedText(
          'err_account',
          'يرجى إدخال رقم حسابك في المنصة.',
          'Please enter your account number.',
          'Por favor ingrese su número de cuenta.',
          'Пожалуйста, введите номер вашего аккаунта.'
        )
      );
      return;
    }

    if (!senderPhone.trim()) {
      setError(
        getLocalizedText(
          'err_phone',
          'يرجى إدخال رقم الهاتف المستخدم في الإيداع.',
          'Please enter the sender phone number.',
          'Por favor ingrese el número de teléfono del remitente.',
          'Пожалуйста, введите номер телефона отправителя.'
        )
      );
      return;
    }

    try {
      setLoading(true);
      await vexApi.submitDepositUnfreezeRequest({
        company_id: selectedCompanyId,
        amount,
        account_number: accountNumber,
        sender_phone: senderPhone,
        screenshot_note: screenshotNote || 'إيصال إيداع مباشر لفك التجميد',
        payment_method_id: selectedPm?.id,
        payment_method_name: selectedPm ? (lang === 'ar' ? selectedPm.nameAr || selectedPm.name : selectedPm.nameEn || selectedPm.name) : undefined,
      });

      setSuccess(
        getLocalizedText(
          'success_msg',
          'تم إرسال طلب إيداع فك التجميد بنجاح! سيتم مراجعته واعتماده فوراً.',
          'Deposit unfreeze request submitted successfully!',
          '¡Solicitud de descongelación enviada con éxito!',
          'Запрос на разморозку депозита успешно отправлен!'
        )
      );
      showToast(
        getLocalizedText(
          'toast_msg',
          'تم تقديم طلب فك التجميد بنجاح',
          'Deposit unfreeze submitted',
          'Solicitud de descongelación enviada',
          'Запрос на разморозку отправлен'
        )
      );
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit deposit unfreeze request');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {getLocalizedText(
                  'title',
                  'إيداع مباشر لفك التجميد (1:1)',
                  'Direct Deposit Unfreeze (1:1)',
                  'Depósito directo para descongelar (1:1)',
                  'Прямой депозит для разморозки (1:1)'
                )}
              </h3>
              <p className="text-[11px] text-slate-500">
                {getLocalizedText(
                  'subtitle',
                  'فك تجميد رصيدك فوراً وبدون دعوة أصدقاء',
                  'Unfreeze balance instantly via matching deposit',
                  'Descongelar saldo al instante mediante nuevo depósito',
                  'Мгновенная разморозка баланса через новый депозит'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/60 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <div className="bg-emerald-50/60 border border-emerald-200/80 p-3 rounded-xl text-emerald-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>
                {getLocalizedText(
                  'terms_title',
                  'شروط الإيداع لفك التجميد:',
                  'Direct Deposit Terms:',
                  'Condiciones del depósito directo:',
                  'Условия прямого депозита:'
                )}
              </span>
            </p>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              {getLocalizedText(
                'terms_desc',
                'عند قيامك بإيداع مبلغ جديد في المنصة، سيتم فك تجميد نفس القيمة من رصيدك المجمد فوراً بنسبة 100% (1 مقابل 1) بعد مراجعة إيصال الإيداع ورقم الهاتف من قبل الإدارة.',
                'When you make a new deposit, the exact matching amount will be unfrozen 1:1 from your frozen balance upon admin verification.',
                'Al realizar un nuevo depósito en la plataforma, se descongelará exactamente el mismo monto 1:1 de su saldo congelado tras la verificación.',
                'При внесении нового депозита точно такая же сумма будет разморожена 1:1 с вашего замороженного баланса после проверки администрацией.'
              )}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {getLocalizedText(
                  'select_comp',
                  'اختر المنصة / الشركة',
                  'Select Company',
                  'Seleccionar empresa',
                  'Выберите компанию'
                )}
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium focus:outline-none focus:border-emerald-500"
              >
                {wallets.map((w) => {
                  const comp = companies.find((c) => c.id === w.company_id);
                  return (
                    <option key={w.company_id} value={w.company_id}>
                      {comp ? (lang === 'ar' ? comp.name_ar || comp.name : comp.name) : w.company_name} ({getLocalizedText('frozen_lbl', 'مجمد:', 'Frozen:', 'Congelado:', 'Заморожено:')} {formatCurrency(w.frozen, displayCurrency)})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Payment Method Selector & Gateway Instructions */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <label className="block font-bold text-slate-700">
                {getLocalizedText(
                  'select_pm',
                  'اختر وسيلة الدفع المعتمدة للإيداع *',
                  'Select Payment Gateway *',
                  'Seleccionar método de pago *',
                  'Выберите способ оплаты *'
                )}
              </label>

              {isFetchingMethods ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  {getLocalizedText('loading_pm', 'جاري تحميل وسائل الدفع...', 'Loading payment methods...', 'Cargando...', 'Загрузка...')}
                </div>
              ) : activePaymentMethods.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs">
                  {getLocalizedText(
                    'no_active_pm',
                    'تنبيه: وسائل الدفع تحت التحديث من الإدارة. يرجى التواصل مع الدعم الفني.',
                    'Notice: Payment methods are being updated by administration.',
                    'Aviso: Métodos de pago en actualización.',
                    'Способы оплаты обновляются.'
                  )}
                </div>
              ) : (
                <>
                  {/* Gateway selector chips / cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {activePaymentMethods.map((pm) => {
                      const isSelected = selectedPm?.id === pm.id;
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => setSelectedPmId(pm.id)}
                          className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50/90 border-emerald-500 text-emerald-950 shadow-xs ring-1 ring-emerald-500'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-xs truncate">
                              {lang === 'ar' ? pm.nameAr || pm.name : pm.nameEn || pm.name}
                            </span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                          </div>
                          {pm.badge && (
                            <span className="text-[10px] text-slate-500 font-medium truncate">
                              {pm.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Gateway Details & Instructions Card */}
                  {selectedPm && (
                    <div className="mt-2 p-3 bg-gradient-to-br from-emerald-50/60 to-slate-50 border border-emerald-200 rounded-2xl space-y-2 shadow-2xs animate-fade-in">
                      <div className="flex items-center justify-between border-b border-emerald-100 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-emerald-700" />
                          <span className="font-bold text-xs text-emerald-950">
                            {lang === 'ar' ? selectedPm.nameAr || selectedPm.name : selectedPm.nameEn || selectedPm.name}
                          </span>
                        </div>
                        {selectedPm.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {selectedPm.badge}
                          </span>
                        )}
                      </div>

                      {/* Account Number & 1-Click Copy */}
                      <div className="flex items-center justify-between bg-white border border-emerald-100 p-2.5 rounded-xl">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-500 block">
                            {getLocalizedText('transfer_to', 'رقم المحفظة / الحساب للتحويل إليه:', 'Transfer to Wallet / Account:', 'Transferir a:', 'Перевести на:')}
                          </span>
                          <span className="font-mono font-bold text-sm text-slate-900 tracking-wide select-all">
                            {selectedPm.accountNumber}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedPm.accountNumber)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                          title="نسخ رقم الحساب"
                        >
                          {copiedField ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-white" />
                              <span>{getLocalizedText('copied', 'تم النسخ', 'Copied', 'Copiado', 'Скопировано')}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>{getLocalizedText('copy', 'نسخ', 'Copy', 'Copiar', 'Копировать')}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Account Holder Name */}
                      <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                        <span className="font-bold text-slate-700">{getLocalizedText('holder', 'المستفيد المعتمد:', 'Beneficiary:', 'Beneficiario:', 'Получатель:')}</span>
                        <span className="font-semibold text-emerald-900">{selectedPm.holderName}</span>
                      </div>

                      {/* Dynamic Instructions Callout */}
                      <div className="p-2.5 bg-emerald-100/50 border border-emerald-200/80 rounded-xl space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-[11px] text-emerald-900">
                          <Info className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span>{getLocalizedText('pm_instructions', 'تعليمات التحويل والإيداع:', 'Official Deposit Instructions:', 'Instrucciones:', 'Инструкции:')}</span>
                        </div>
                        <p className="text-[11px] text-emerald-950 leading-relaxed font-medium">
                          {selectedPm.instructions || selectedPm.instructionsAr || selectedPm.descriptionAr || getLocalizedText('def_inst', 'قم بالتحويل على الرقم أعلاه ثم سجل تفاصيل الإيداع أدناه.', 'Transfer to the account above then submit your details below.', 'Transfiera al número anterior y envíe sus datos.', 'Переведите средства и отправьте детали ниже.')}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {getLocalizedText(
                    'deposit_amt',
                    'مبلغ الإيداع',
                    'Deposit Amount',
                    'Monto del depósito',
                    'Сумма депозита'
                  )}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="100"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-3 text-xs text-slate-400">$</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {getLocalizedText(
                    'acc_num',
                    'رقم الحساب في المنصة',
                    'Account Number',
                    'Número de cuenta',
                    'Номер аккаунта'
                  )}
                </label>
                <input
                  type="text"
                  placeholder="e.g. 87654321"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {getLocalizedText(
                  'sender_phone',
                  'رقم الهاتف المرسل منه الإيداع',
                  'Sender Phone Number',
                  'Número de teléfono remitente',
                  'Номер телефона отправителя'
                )}
              </label>
              <input
                type="text"
                placeholder="+2010xxxxxxxx"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                {getLocalizedText(
                  'phone_hint',
                  'يجب أن يطابق رقم هاتفك المرتبط أو رقم الحساب المحول منه.',
                  'Must match your registered phone or sending wallet.',
                  'Debe coincidir con su teléfono registrado o billetera.',
                  'Должен совпадать с вашим зарегистрированным телефоном.'
                )}
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {getLocalizedText(
                  'ref_note',
                  'رقم العملية / ملاحظة الإيصال',
                  'Transaction Ref / Receipt Note',
                  'Referencia de transacción / Nota',
                  'Номер транзакции / Примечание'
                )}
              </label>
              <input
                type="text"
                placeholder={getLocalizedText(
                  'ref_placeholder',
                  'TXN-984321 أو ملاحظة الإيصال',
                  'TXN-984321 or receipt note',
                  'TXN-984321 o nota de recibo',
                  'TXN-984321 или номер чека'
                )}
                value={screenshotNote}
                onChange={(e) => setScreenshotNote(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>
                  {getLocalizedText(
                    'submitting',
                    'جاري إرسال الطلب...',
                    'Submitting...',
                    'Enviando...',
                    'Отправка...'
                  )}
                </span>
              ) : (
                <>
                  <DollarSign className="w-4 h-4" />
                  <span>
                    {getLocalizedText(
                      'submit_btn',
                      'إرسال طلب إيداع لفك التجميد',
                      'Submit Deposit Unfreeze Request',
                      'Enviar solicitud de descongelación',
                      'Отправить запрос на разморозку'
                    )}
                  </span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
