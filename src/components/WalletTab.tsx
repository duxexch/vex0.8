import React, { useState } from 'react';
import { Company, Language, Wallet, UserProfile, PhoneChangeRequest, CompensationAccount, PLATFORM_DOMAIN } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { formatCurrency } from '../utils/currency';
import { CompanyBrandLogo } from './CompanyBrandLogo';
import { WalletTabSkeleton } from './SkeletonLoader';
import { WalletQrCodeModal } from './WalletQrCodeModal';
import {
  Lock,
  Unlock,
  ArrowUpRight,
  UserPlus,
  DollarSign,
  HelpCircle,
  Wallet2,
  Copy,
  Check,
  Phone,
  ShieldCheck,
  Clock,
  ShieldAlert,
  Send,
  QrCode,
  LayoutGrid,
  List,
} from 'lucide-react';

interface WalletTabProps {
  wallets: Wallet[];
  companies: Company[];
  accounts?: CompensationAccount[];
  userProfile?: UserProfile | null;
  onGoToTransfer: (companyId: string) => void;
  onGoToReferral: (companyId: string) => void;
  onRequestComp: (companyId: string) => void;
  onOpenDepositUnfreeze: () => void;
  onOpenPhoneModal?: () => void;
  onOpenPhoneChangeRequest?: () => void;
  pendingPhoneRequest?: PhoneChangeRequest | null;
  lang: Language;
  isLoading?: boolean;
  displayCurrency: string;
  onCopyToast?: () => void;
}

export const WalletTab: React.FC<WalletTabProps> = ({
  wallets,
  companies,
  accounts = [],
  userProfile,
  onGoToTransfer,
  onGoToReferral,
  onRequestComp,
  onOpenDepositUnfreeze,
  onOpenPhoneModal,
  onOpenPhoneChangeRequest,
  pendingPhoneRequest,
  lang,
  isLoading = false,
  displayCurrency,
  onCopyToast,
}) => {
  const [copiedWalletId, setCopiedWalletId] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrSelectedCompanyId, setQrSelectedCompanyId] = useState<string | null>(null);
  const [walletViewMode, setWalletViewMode] = useState<'grid' | 'table'>('grid');
  const t = TRANSLATIONS[lang] || TRANSLATIONS['ar'];
  const isAr = lang === 'ar';

  const handleCopyWalletId = (addressOrId: string) => {
    navigator.clipboard.writeText(addressOrId);
    setCopiedWalletId(addressOrId);
    if (onCopyToast) onCopyToast();
    setTimeout(() => setCopiedWalletId(null), 2000);
  };

  const handleOpenQrModal = (companyId?: string) => {
    setQrSelectedCompanyId(companyId || wallets[0]?.company_id || 'master');
    setIsQrModalOpen(true);
  };

  if (isLoading || (wallets.length === 0 && isLoading)) {
    return <WalletTabSkeleton />;
  }

  const totalFrozen = wallets.reduce((sum, w) => sum + (Number(w.frozen) || 0), 0);
  const totalAvailable = wallets.reduce((sum, w) => sum + (Number(w.available) || 0), 0);

  const getActiveWalletsText = (count: number) => {
    return `${count} ${t.activeWallets}`;
  };

  const getUnfreezeHint = () => {
    return t.unfreezeHint;
  };

  const getAvailableHint = () => {
    return t.availableHint;
  };

  return (
    <div className="space-y-3.5 pb-24 animate-fade-in select-none">
      {/* Top Total Balance Summary Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs text-slate-900 space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <Wallet2 className="w-4 h-4" />
            </span>
            <span>
              {t.totalWalletsPrefix} ({PLATFORM_DOMAIN})
            </span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenQrModal('master')}
              className="h-7 text-[11px] font-bold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 px-2.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs active:scale-95"
              title={isAr ? 'عرض رمز QR لعنوان المحفظة' : 'Show Wallet QR Code'}
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isAr ? 'رمز QR للمحفظة' : 'Wallet QR'}</span>
            </button>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
              {getActiveWalletsText(wallets.length)}
            </span>
          </div>
        </div>

        {/* Big Balance Counters - Responsive Multi-Column on Desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Frozen Box */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5 text-amber-700 text-xs font-bold mb-1">
              <Lock className="w-3.5 h-3.5" />
              <span>{t.totalFrozen}</span>
            </div>
            <p className="text-xl sm:text-2xl font-black font-mono text-amber-800 tracking-tight">
              {formatCurrency(totalFrozen, displayCurrency)}
            </p>
            <span className="text-[10px] text-slate-500 mt-1 block truncate">
              {getUnfreezeHint()}
            </span>
          </div>

          {/* Available Box */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold mb-1">
              <Unlock className="w-3.5 h-3.5" />
              <span>{t.totalAvailable}</span>
            </div>
            <p className="text-xl sm:text-2xl font-black font-mono text-emerald-700 tracking-tight">
              {formatCurrency(totalAvailable, displayCurrency)}
            </p>
            <span className="text-[10px] text-slate-500 mt-1 block truncate">
              {getAvailableHint()}
            </span>
          </div>

          {/* Total Combined / Fast Unfreeze Box */}
          <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200 sm:col-span-2 lg:col-span-1 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 text-xs font-bold text-emerald-900 mb-1">
              <span className="flex items-center gap-1.5">
                <Wallet2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isAr ? 'إجمالي الرصيد الشامل' : 'Total Combined'}</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
                {wallets.length} {isAr ? 'محافظ' : 'Wallets'}
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-black font-mono text-emerald-800 tracking-tight">
              {formatCurrency(totalFrozen + totalAvailable, displayCurrency)}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={onOpenDepositUnfreeze}
                className="flex-1 h-7 text-[11px] font-bold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
              >
                <ArrowUpRight className="w-3 h-3" />
                <span>{isAr ? 'فك تجميد سريع' : 'Quick Unfreeze'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Explanation Banner */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
          <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-[11px] sm:text-xs">
            <span className="font-bold text-slate-800">
              {t.balanceProtectionTitle}
            </span>
            {t.frozenInfo}
          </div>
        </div>
      </div>

      {/* Wallet Phone Lock Security Card (One-Time Addition & Admin Request Policy) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        {!userProfile?.is_phone_verified || !userProfile?.phone_number ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center shrink-0 shadow-xs">
                <Send className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-black text-slate-900">
                    {isAr ? 'إضافة رقم هاتف المحفظة (مرة واحدة فقط)' : 'Link Wallet Phone (One-Time Only)'}
                  </h4>
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                    {isAr ? 'توثيق عبر تيليجرام' : 'Telegram Bot'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed max-w-lg">
                  {isAr
                    ? 'طالما ستستخدم المحفظة، يجب ربط رقم هاتفك وتأكيده عبر بوت تيليجرام لمرة واحدة فقط. يتم قفل الرقم في المحفظة ولا يمكن تغييره إلا بطلب رسمي للإدارة.'
                    : 'To use the wallet, you must verify your genuine phone via Telegram bot once. It is permanently locked thereafter.'}
                </p>
              </div>
            </div>
            <button
              onClick={onOpenPhoneModal}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-98 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isAr ? 'تأكيد رقم الهاتف عبر تيليجرام' : 'Verify via Telegram'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900">
                      {isAr ? 'رقم هاتف المحفظة المعتمد' : 'Verified Wallet Phone'}
                    </h4>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <Lock className="w-3 h-3" />
                      <span>{isAr ? 'مقفل لمرة واحدة' : 'Permanently Locked'}</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isAr
                      ? 'هذا الرقم مثبت لحماية حسابك ولا يمكن تغييره إلا بطلب إلى الإدارة.'
                      : 'This phone is locked for wallet security and can only be altered via admin approval.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800" dir="ltr">
                  {userProfile.phone_number}
                </div>
                <button
                  onClick={onOpenPhoneChangeRequest}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-3.5 h-3.5 text-amber-600" />
                  <span>{isAr ? 'طلب تغيير من الإدارة' : 'Request Admin Change'}</span>
                </button>
              </div>
            </div>

            {/* Pending Request Alert if present */}
            {pendingPhoneRequest && pendingPhoneRequest.status === 'pending' && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    {isAr
                      ? `يوجد طلب لتغيير الرقم إلى (${pendingPhoneRequest.new_phone}) قيد مراجعة الإدارة.`
                      : `A change request to (${pendingPhoneRequest.new_phone}) is pending admin review.`}
                  </span>
                </div>
                <button
                  onClick={onOpenPhoneChangeRequest}
                  className="text-[11px] font-bold text-amber-700 underline shrink-0 hover:text-amber-900"
                >
                  {isAr ? 'عرض تفاصيل الطلب' : 'View Details'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Per Company Wallets Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
          <span>
            {t.companyWalletsTitle}
          </span>
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenQrModal(wallets[0]?.company_id)}
            className="h-8 text-xs font-bold text-slate-700 hover:text-emerald-700 flex items-center gap-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 shadow-2xs active:scale-95 transition-all cursor-pointer"
            title={isAr ? 'مشاركة عناوين المحافظ عبر QR' : 'Share Wallet Address via QR'}
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isAr ? 'مشاركة QR' : 'Share QR'}</span>
          </button>
          <button
            onClick={onOpenDepositUnfreeze}
            className="h-8 text-xs font-bold text-emerald-700 flex items-center gap-1 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'إيداع لفك التجميد' : 'Deposit Unfreeze'}</span>
          </button>
          <button
            onClick={() => onRequestComp(wallets[0]?.company_id || '')}
            className="h-8 text-xs font-bold text-emerald-700 flex items-center gap-1 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>{t.requestCompensation}</span>
          </button>

          {/* Grid vs Table View Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 ml-auto sm:ml-0">
            <button
              type="button"
              onClick={() => setWalletViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                walletViewMode === 'grid'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title={isAr ? 'عرض بطاقات المحافظ' : 'Cards View'}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setWalletViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                walletViewMode === 'table'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title={isAr ? 'عرض جدول الأرصدة للكمبيوتر' : 'Ledger Table View'}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Wallets List - Responsive Multi-Column Grid or Desktop Table */}
      {wallets.length === 0 ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-2 shadow-xs">
          <Wallet2 className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="text-xs font-bold text-slate-700">
            {lang === 'ar'
              ? 'لا توجد محافظ نشطة بعد'
              : lang === 'es'
              ? 'No hay billeteras activas aún'
              : lang === 'ru'
              ? 'Активных кошельков пока нет'
              : 'No active wallets yet'}
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            {lang === 'ar'
              ? 'يتم إنشاء المحفظة تلقائياً فور ربط حسابك في المنصة.'
              : lang === 'es'
              ? 'La billetera se crea automáticamente al vincular tu cuenta.'
              : lang === 'ru'
              ? 'Кошелек создается автоматически после привязки аккаунта.'
              : 'Wallets are generated automatically once you link an account.'}
          </p>
        </div>
      ) : walletViewMode === 'table' ? (
        /* ========================================================= */
        /* DESKTOP & LAPTOP WALLET LEDGER TABLE                      */
        /* ========================================================= */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 text-start">{isAr ? 'الشركة والمنصة' : 'Platform'}</th>
                  <th className="py-3 px-4 text-start">{isAr ? 'معرف الحساب / المحفظة' : 'Account Address'}</th>
                  <th className="py-3 px-4 text-start">{isAr ? 'الرصيد المجمد' : 'Frozen Balance'}</th>
                  <th className="py-3 px-4 text-start">{isAr ? 'الرصيد المتاح' : 'Available Balance'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wallets.map((wallet) => {
                  const company = companies.find((c) => c.id === wallet.company_id);
                  const account = accounts.find((a) => a.company_id === wallet.company_id);
                  const displayAddress = account?.account_number || wallet.company_id;

                  return (
                    <tr key={wallet.company_id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Platform */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="rounded-xl border border-slate-200 p-0.5 bg-slate-50 shrink-0 shadow-2xs">
                            <CompanyBrandLogo companyName={wallet.company_name} size="md" className="rounded-lg" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-sm block">{wallet.company_name}</span>
                            {wallet.pending_locked && wallet.pending_locked > 0 ? (
                              <span className="text-[10px] font-bold text-rose-600">
                                OTP قيد التأكيد: {formatCurrency(wallet.pending_locked, displayCurrency)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Address with Copy & QR */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-800">{displayAddress}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyWalletId(displayAddress)}
                            className="text-slate-400 hover:text-emerald-600 p-1 rounded transition-colors inline-flex items-center cursor-pointer"
                            title={isAr ? 'نسخ معرف المحفظة' : 'Copy'}
                          >
                            {copiedWalletId === displayAddress ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenQrModal(wallet.company_id)}
                            className="text-slate-400 hover:text-emerald-600 p-1 rounded transition-colors inline-flex items-center cursor-pointer"
                            title={isAr ? 'عرض رمز QR' : 'QR Code'}
                          >
                            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                          </button>
                        </div>
                      </td>

                      {/* Frozen Balance */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 font-mono font-bold text-amber-800 text-sm">
                            <Lock className="w-3 h-3 text-amber-600" />
                            <span>{formatCurrency(Number(wallet.frozen), displayCurrency)}</span>
                          </div>
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 inline-block">
                            {isAr ? 'متاح تحويل 10%: ' : '10% quota: '}
                            {formatCurrency(wallet.frozen * 0.1, displayCurrency)}
                          </span>
                        </div>
                      </td>

                      {/* Available Balance */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 font-mono font-black text-emerald-700 text-sm">
                          <Unlock className="w-3 h-3 text-emerald-600" />
                          <span>{formatCurrency(Number(wallet.available), displayCurrency)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onGoToTransfer(wallet.company_id)}
                            disabled={wallet.frozen <= 0}
                            className="h-8 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-800 text-xs font-bold border border-slate-200 flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <ArrowUpRight className="w-3 h-3 text-amber-600" />
                            <span>{t.transferBtn}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onGoToReferral(wallet.company_id)}
                            className="h-8 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <UserPlus className="w-3 h-3 text-emerald-600" />
                            <span>{t.inviteBtn}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onRequestComp(wallet.company_id)}
                            className="h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>{isAr ? 'تعويض' : 'Comp'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* BALANCED FINANCIAL CARDS GRID (4 COLS ON XL SCREENS)      */
        /* ========================================================= */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {wallets.map((wallet) => {
            const company = companies.find((c) => c.id === wallet.company_id);
            const account = accounts.find((a) => a.company_id === wallet.company_id);
            const displayAddress = account?.account_number || wallet.company_id;

            return (
              <div
                key={wallet.company_id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 shadow-2xs hover:shadow-xs flex flex-col justify-between transition-all duration-200 h-full group"
              >
                <div className="space-y-3">
                  {/* Company Title & Quick Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="rounded-xl border border-slate-200 p-0.5 bg-slate-50 shrink-0 shadow-2xs">
                        <CompanyBrandLogo companyName={wallet.company_name} size="md" className="rounded-lg" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {wallet.company_name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-500 font-mono truncate">
                            {account ? `ACC: ${account.account_number}` : `ID: ${wallet.company_id}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyWalletId(displayAddress)}
                            className="text-slate-400 hover:text-emerald-600 p-0.5 rounded transition-colors inline-flex items-center cursor-pointer"
                            title={lang === 'ar' ? 'نسخ معرف أو رقم المحفظة' : 'Copy Address'}
                            aria-label={lang === 'ar' ? 'نسخ معرف أو رقم المحفظة' : 'Copy Address'}
                          >
                            {copiedWalletId === displayAddress ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenQrModal(wallet.company_id)}
                            className="text-slate-400 hover:text-emerald-600 p-0.5 rounded transition-colors inline-flex items-center cursor-pointer"
                            title={lang === 'ar' ? 'عرض رمز QR لعنوان المحفظة' : 'Show Wallet QR Code'}
                            aria-label={lang === 'ar' ? 'عرض رمز QR لعنوان المحفظة' : 'Show Wallet QR Code'}
                          >
                            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 10% quick stat */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {wallet.pending_locked && wallet.pending_locked > 0 ? (
                        <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          OTP: {formatCurrency(wallet.pending_locked, displayCurrency)}
                        </span>
                      ) : null}
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        {lang === 'ar' ? 'متاح: ' : 'Transfer: '}
                        {formatCurrency(wallet.frozen * 0.1, displayCurrency)}
                      </span>
                    </div>
                  </div>

                  {/* Balances */}
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-1 text-[10px] text-amber-700 font-bold mb-0.5">
                        <Lock className="w-3 h-3" />
                        <span>{t.frozenBalance}</span>
                      </div>
                      <span className="text-sm font-bold font-mono text-amber-800 block truncate">
                        {formatCurrency(Number(wallet.frozen), displayCurrency)}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold mb-0.5">
                        <Unlock className="w-3 h-3" />
                        <span>{t.availableBalance}</span>
                      </div>
                      <span className="text-sm font-bold font-mono text-emerald-700 block truncate">
                        {formatCurrency(Number(wallet.available), displayCurrency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-1.5 pt-3 mt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onGoToTransfer(wallet.company_id)}
                    disabled={wallet.frozen <= 0}
                    className="h-8 px-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-800 text-[11px] font-bold border border-slate-200 flex items-center justify-center gap-1 transition-all active:scale-95 shadow-2xs cursor-pointer"
                  >
                    <ArrowUpRight className="w-3 h-3 text-amber-600 shrink-0" />
                    <span className="truncate">{t.transferBtn}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onGoToReferral(wallet.company_id)}
                    className="h-8 px-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold border border-slate-200 flex items-center justify-center gap-1 transition-all active:scale-95 shadow-2xs cursor-pointer"
                  >
                    <UserPlus className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="truncate">{t.inviteBtn}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onRequestComp(wallet.company_id)}
                    className="h-8 px-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 shadow-2xs cursor-pointer"
                  >
                    <DollarSign className="w-3 h-3 shrink-0" />
                    <span className="truncate">{lang === 'ar' ? 'تعويض' : lang === 'es' ? 'Comp' : lang === 'ru' ? 'Возврат' : 'Comp'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Wallet Address QR Code Modal */}
      <WalletQrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        wallets={wallets}
        companies={companies}
        accounts={accounts}
        userProfile={userProfile}
        initialSelectedCompanyId={qrSelectedCompanyId}
        lang={lang}
        onCopyToast={onCopyToast}
      />
    </div>
  );
};
