import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { CompensationAccount, Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { WORLD_CURRENCIES, WorldCurrency, getCurrencyName } from '../data/currencies';
import { vexApi } from '../services/api';
import {
  X,
  UploadCloud,
  Check,
  AlertCircle,
  DollarSign,
  Ticket,
  Search,
  ChevronDown,
  Globe,
  Coins,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { SuccessAnimation } from './SuccessAnimation';

// New Custom CSS-based Animation Component for Compensation Request
const CompensationSuccessEffect = ({ amount, currency, lang, betSlipId }: any) => {
  return (
    <div className="py-8 px-4 flex flex-col items-center text-center select-none">
      <div className="relative w-32 h-32 flex items-center justify-center mb-6">
        {/* Animated Background Rays */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(16,185,129,0.15)_360deg)] rounded-full"
        />
        
        {/* Bursting Coins / Confetti */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`coin-${i}`}
            initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
            animate={{
              scale: [0, 1, 0.5],
              x: (Math.random() - 0.5) * 140,
              y: (Math.random() - 0.5) * 140 - 20,
              opacity: [0, 1, 0],
              rotate: Math.random() * 360,
            }}
            transition={{
              duration: 1.2,
              delay: 0.2 + i * 0.1,
              ease: 'easeOut'
            }}
            className="absolute w-5 h-5 rounded-full bg-amber-400 border-2 border-amber-300 shadow-md flex items-center justify-center text-amber-700 font-black text-[10px]"
          >
            $
          </motion.div>
        ))}

        {/* The Flying Bet Slip */}
        <motion.div
          initial={{ y: 60, scale: 0.5, rotate: -15, opacity: 0 }}
          animate={{ y: 0, scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="relative z-10 w-20 h-24 bg-white rounded-lg shadow-xl border border-slate-200 flex flex-col items-center pt-3"
        >
          <div className="w-10 h-1 bg-slate-200 rounded-full mb-1.5" />
          <div className="w-14 h-1 bg-slate-200 rounded-full mb-1.5" />
          <div className="w-12 h-1 bg-slate-200 rounded-full mb-3" />
          <FileText className="w-6 h-6 text-slate-300 mb-1" />
          <div className="text-[7px] font-mono text-slate-400">ID: {betSlipId.slice(0, 6)}...</div>

          {/* The Stamp of Approval */}
          <motion.div
            initial={{ scale: 3, opacity: 0, rotate: 20 }}
            animate={{ scale: 1, opacity: 1, rotate: -10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.4 }}
            className="absolute -bottom-4 -right-4 bg-emerald-500 rounded-full shadow-lg border-4 border-white p-1"
          >
            <Check className="w-8 h-8 text-white" />
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="mb-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-extrabold"
      >
        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
        <span>{lang === 'ar' ? 'تم استلام وتشفير الطلب بنجاح' : 'Request Received & Secured'}</span>
      </motion.div>

      <motion.h4
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.4 }}
        className="text-xl font-black text-slate-900 tracking-tight"
      >
        {lang === 'ar' ? 'طلب تعويض قيد المراجعة' : 'Compensation Request Pending'}
      </motion.h4>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.4, type: 'spring' }}
        className="mt-3 inline-block px-5 py-2 rounded-2xl bg-emerald-100/70 border border-emerald-200"
      >
        <span className="text-2xl font-black font-mono text-emerald-700">
          {amount} {currency}
        </span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.4 }}
        className="text-xs text-slate-500 mt-4 max-w-[280px] leading-relaxed"
      >
        {lang === 'ar'
          ? 'تم تسجيل قسيمة الرهان وتشفيرها في السيرفر لمنع التكرار، وسيتم إيداع الرصيد في محفظتك فور اكتمال التدقيق (عادة خلال 24 ساعة).'
          : 'The bet slip has been verified and encrypted. Balance will be unlocked upon audit completion (usually within 24 hours).'}
      </motion.p>
    </div>
  );
};

interface CompensationRequestModalProps {
  accounts: CompensationAccount[];
  initialCompanyId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lang: Language;
}

export const CompensationRequestModal: React.FC<CompensationRequestModalProps> = ({
  accounts,
  initialCompanyId,
  isOpen,
  onClose,
  onSuccess,
  lang,
}) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    initialCompanyId || accounts[0]?.company_id || ''
  );
  const [amount, setAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  const [currencySearch, setCurrencySearch] = useState('');
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [betSlipId, setBetSlipId] = useState('');
  const [screenshotName, setScreenshotName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const timeoutRef = useRef<any>(null);
  const currencyBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialCompanyId) {
      setSelectedCompanyId(initialCompanyId);
    } else if (accounts[0]?.company_id && !selectedCompanyId) {
      setSelectedCompanyId(accounts[0].company_id);
    }
  }, [initialCompanyId, accounts]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Close currency dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (currencyBoxRef.current && !currencyBoxRef.current.contains(e.target as Node)) {
        setCurrencyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered currencies based on 1-2 character search
  const filteredCurrencies = useMemo(() => {
    if (!currencySearch.trim()) return WORLD_CURRENCIES;
    const query = currencySearch.toLowerCase().trim();
    return WORLD_CURRENCIES.filter((c) => {
      const codeMatch = c.code.toLowerCase().includes(query);
      const symbolMatch = c.symbol.toLowerCase().includes(query);
      const nameEnMatch = c.nameEn.toLowerCase().includes(query);
      const nameArMatch = c.nameAr.toLowerCase().includes(query);
      const nameEsMatch = c.nameEs.toLowerCase().includes(query);
      const nameRuMatch = c.nameRu.toLowerCase().includes(query);
      return codeMatch || symbolMatch || nameEnMatch || nameArMatch || nameEsMatch || nameRuMatch;
    });
  }, [currencySearch]);

  const activeCurrencyObj = useMemo(() => {
    return (
      WORLD_CURRENCIES.find((c) => c.code === selectedCurrency) ||
      WORLD_CURRENCIES[0]
    );
  }, [selectedCurrency]);

  if (!isOpen) return null;

  const t = TRANSLATIONS[lang] || TRANSLATIONS['ar'];
  const activeAccount = accounts.find((a) => a.company_id === selectedCompanyId) || accounts[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshotName(e.target.files[0].name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError(
        lang === 'ar'
          ? 'يرجى إدخال مبلغ تعويض صحيح أكبر من 0'
          : lang === 'es'
          ? 'Por favor ingresa un monto válido mayor a 0'
          : lang === 'ru'
          ? 'Пожалуйста, введите корректную сумму больше 0'
          : 'Please enter a valid compensation amount greater than 0'
      );
      return;
    }

    if (!betSlipId.trim()) {
      setError(
        lang === 'ar'
          ? 'رقم قسيمة الرهان (Bet Slip ID) إلزامي لمنع تكرار المطالبات'
          : lang === 'es'
          ? 'El ID del boleto de apuesta es obligatorio'
          : lang === 'ru'
          ? 'Номер купона ставки обязателен для проверки'
          : 'Bet Slip ID is required for verification'
      );
      return;
    }

    if (!activeAccount) {
      setError(
        lang === 'ar'
          ? 'لا يوجد حساب مسجل لهذه الشركة'
          : 'No registered account found for this company'
      );
      return;
    }

    setLoading(true);
    try {
      await vexApi.submitCompensationRequest(
        activeAccount.company_id,
        activeAccount.account_number,
        numAmount,
        betSlipId.trim(),
        selectedCurrency,
        undefined,
        screenshotName || undefined
      );
      setSuccess(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        onSuccess();
        handleClose();
      }, 6000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit compensation request');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setAmount('');
    setBetSlipId('');
    setScreenshotName(null);
    setError(null);
    setSuccess(false);
    setCurrencyDropdownOpen(false);
    setCurrencySearch('');
    onClose();
  };

  const handleDoneManual = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onSuccess();
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </span>
              <span>{t.newRequestTitle}</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {lang === 'ar'
                ? 'مراجعة القسيمة وإيداع التعويض في رصيدك'
                : lang === 'es'
                ? 'Revisión del boleto y abono en tu saldo'
                : lang === 'ru'
                ? 'Проверка купона и зачисление компенсации'
                : 'Slip review & instant compensation deposit'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {success ? (
            <CompensationSuccessEffect
              amount={amount}
              currency={selectedCurrency}
              lang={lang}
              betSlipId={betSlipId}
              onDone={handleDoneManual}
            />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-start gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Select Registered Company */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ar'
                    ? 'الشركة التابع لها الحساب'
                    : lang === 'es'
                    ? 'Casa de apuestas asociada'
                    : lang === 'ru'
                    ? 'Букмекерская компания'
                    : 'Target Company'}
                </label>
                {accounts.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-medium">
                    {lang === 'ar'
                      ? 'لم تقم بتسجيل أي حسابات حتى الآن. توجه لتبويب الشركات وسجل حساب أولاً.'
                      : 'No registered accounts yet. Please register an account in the Companies tab first.'}
                  </div>
                ) : (
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.company_id}>
                        {acc.company_name} — (ID: {acc.account_number})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Currency Selector (Type 1-2 letters quick lookup) */}
              <div ref={currencyBoxRef} className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t.currencyLabel}:</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    {activeCurrencyObj.flag} {selectedCurrency} ({activeCurrencyObj.symbol})
                  </span>
                </label>

                {/* Trigger Button */}
                <button
                  type="button"
                  onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                  className="w-full h-10 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-900 text-xs font-bold flex items-center justify-between transition-colors focus:outline-none focus:border-emerald-500"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-base">{activeCurrencyObj.flag}</span>
                    <span className="font-mono text-emerald-800 font-black">{activeCurrencyObj.code}</span>
                    <span className="text-slate-500 font-normal truncate">
                      — {getCurrencyName(activeCurrencyObj, lang)} ({activeCurrencyObj.symbol})
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${currencyDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Searchable Currencies Popup */}
                {currencyDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-2 space-y-1.5 max-h-56 overflow-hidden flex flex-col animate-fade-in">
                    {/* Fast Search input */}
                    <div className="relative shrink-0">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        autoFocus
                        value={currencySearch}
                        onChange={(e) => setCurrencySearch(e.target.value)}
                        placeholder={t.searchCurrencyPlaceholder}
                        className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                      />
                    </div>

                    {/* Currencies List */}
                    <div className="overflow-y-auto space-y-1 flex-1 pr-0.5">
                      {filteredCurrencies.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-400">
                          {lang === 'ar' ? 'لا توجد عملة مطابقة' : 'No matching currency found'}
                        </div>
                      ) : (
                        filteredCurrencies.map((curr) => {
                          const isSelected = curr.code === selectedCurrency;
                          return (
                            <button
                              key={curr.code}
                              type="button"
                              onClick={() => {
                                setSelectedCurrency(curr.code);
                                setCurrencyDropdownOpen(false);
                                setCurrencySearch('');
                              }}
                              className={`w-full px-2.5 py-1.5 rounded-lg text-left rtl:text-right flex items-center justify-between text-xs transition-colors ${
                                isSelected
                                  ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-sm">{curr.flag}</span>
                                <span className="font-mono font-bold">{curr.code}</span>
                                <span className="text-[11px] text-slate-500 truncate">
                                  {getCurrencyName(curr, lang)}
                                </span>
                              </div>
                              <span className="font-mono text-slate-400 text-[11px] ml-1 shrink-0 font-bold">
                                {curr.symbol}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bet Slip ID (Mandatory for Fraud Prevention) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Ticket className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t.betSlipLabel}:</span>
                  </span>
                  <span className="text-[10px] text-rose-600 font-bold">
                    {lang === 'ar' ? 'إلزامي' : 'Required'}
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={betSlipId}
                  onChange={(e) => setBetSlipId(e.target.value.trim())}
                  placeholder={t.betSlipPlaceholder}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors text-center"
                />
              </div>

              {/* Amount with Selected Currency Symbol */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>{t.amountUsd}</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ({selectedCurrency})
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-emerald-700 font-mono font-bold text-xs">
                    {activeCurrencyObj.symbol}
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="50.00"
                    className="w-full h-10 pl-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors text-center"
                  />
                </div>
              </div>

              {/* Screenshot Upload (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.screenshotLabel}
                </label>
                <label className="border border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-3 flex flex-col items-center justify-center gap-1 cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors group">
                  <UploadCloud className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  <span className="text-xs text-slate-500 group-hover:text-slate-800 font-medium text-center">
                    {screenshotName
                      ? screenshotName
                      : lang === 'ar'
                      ? 'اضغط لاختيار صورة إثبات الخسارة أو القسيمة'
                      : 'Click to upload loss proof screenshot or slip'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading || accounts.length === 0 || !amount || !betSlipId.trim()}
                  className="w-full h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all active:scale-98 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{t.submitRequestBtn}</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
