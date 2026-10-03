import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Company, Language, Wallet, CompensationAccount, UserProfile, PLATFORM_DOMAIN } from '../types';
import { CompanyBrandLogo } from './CompanyBrandLogo';
import {
  QrCode,
  X,
  Copy,
  Check,
  Download,
  Share2,
  ExternalLink,
  ShieldCheck,
  Wallet2,
  ArrowRightLeft,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export interface WalletQrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  companies: Company[];
  accounts?: CompensationAccount[];
  userProfile?: UserProfile | null;
  initialSelectedCompanyId?: string | null;
  lang: Language;
  onCopyToast?: () => void;
}

export const WalletQrCodeModal: React.FC<WalletQrCodeModalProps> = ({
  isOpen,
  onClose,
  wallets,
  companies,
  accounts = [],
  userProfile,
  initialSelectedCompanyId,
  lang,
  onCopyToast,
}) => {
  const isAr = lang === 'ar';
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [qrFormat, setQrFormat] = useState<'address' | 'transfer_link'>('address');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // Initialize selected wallet when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (initialSelectedCompanyId) {
      setSelectedWalletId(initialSelectedCompanyId);
    } else if (wallets.length > 0) {
      setSelectedWalletId(wallets[0].company_id);
    } else {
      setSelectedWalletId('master');
    }
  }, [isOpen, initialSelectedCompanyId, wallets]);

  // Resolve current wallet & account info
  const isMaster = selectedWalletId === 'master';
  const currentWallet = wallets.find((w) => w.company_id === selectedWalletId);
  const currentCompany = companies.find((c) => c.id === selectedWalletId);
  const currentAccount = accounts.find((a) => a.company_id === selectedWalletId);

  // Determine address value
  const getWalletAddress = (): string => {
    if (isMaster) {
      return userProfile?.phone_number || userProfile?.user_id || 'VEX-USER-WALLET';
    }
    if (currentAccount?.account_number) {
      return currentAccount.account_number;
    }
    return currentWallet?.company_id || selectedWalletId;
  };

  const address = getWalletAddress();
  const companyName = isMaster
    ? (isAr ? 'محفظة VEX الموحدة' : 'Unified VEX Wallet')
    : currentWallet?.company_name || currentCompany?.name || selectedWalletId;

  // Determine payload to encode into the QR Code
  const getQrPayload = (): string => {
    if (qrFormat === 'transfer_link') {
      if (isMaster) {
        return `https://${PLATFORM_DOMAIN}/transfers?to=${encodeURIComponent(address)}`;
      }
      return `https://${PLATFORM_DOMAIN}/transfers?company=${encodeURIComponent(selectedWalletId)}&to=${encodeURIComponent(address)}`;
    }
    // Direct address string (optimal for instant copy/scan into transfer inputs)
    return address;
  };

  const qrPayload = getQrPayload();

  // Generate QR Code data URL using qrcode library
  useEffect(() => {
    if (!isOpen || !qrPayload) return;

    let isMounted = true;
    setIsGenerating(true);

    QRCode.toDataURL(qrPayload, {
      width: 380,
      margin: 2,
      color: {
        dark: '#0f172a', // Deep slate for high contrast scanner readability
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error('Failed to generate QR code:', err);
        if (isMounted) {
          setIsGenerating(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, qrPayload]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    if (onCopyToast) onCopyToast();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const downloadLink = document.createElement('a');
    const safeName = (companyName || 'wallet').toLowerCase().replace(/\s+/g, '-');
    downloadLink.download = `vex-qr-${safeName}-${address}.png`;
    downloadLink.href = qrDataUrl;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const handleNativeShare = async () => {
    const shareText = isAr
      ? `عنوان محفظتي في ${companyName} (${PLATFORM_DOMAIN}):\n${address}\nقم بنسخه أو مسحه لإرسال الرصيد مباشرة.`
      : `My ${companyName} wallet address on ${PLATFORM_DOMAIN}:\n${address}\nScan or copy to transfer funds directly.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${companyName} Wallet Address`,
          text: shareText,
          url: qrFormat === 'transfer_link' ? qrPayload : undefined,
        });
        setShareFeedback(isAr ? 'تمت المشاركة' : 'Shared successfully');
        setTimeout(() => setShareFeedback(null), 2500);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
      setShareFeedback(isAr ? 'تم نسخ العنوان للمشاركة' : 'Address copied for sharing');
      setTimeout(() => setShareFeedback(null), 2500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{isAr ? 'رمز QR لعنوان المحفظة' : 'Wallet Address QR Code'}</span>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  {PLATFORM_DOMAIN}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {isAr ? 'شارك عنوان محفظتك مع الأصدقاء لاستقبال التحويلات فوراً' : 'Share your wallet address to receive transfers instantly'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Wallet Selector Pills (if multiple wallets exist) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {isAr ? 'اختر المحفظة أو الحساب:' : 'Select Wallet / Account:'}
            </label>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
              {/* Master VEX Wallet Option */}
              <button
                type="button"
                onClick={() => setSelectedWalletId('master')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  isMaster
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Wallet2 className="w-3.5 h-3.5" />
                <span>{isAr ? 'محفظة VEX العامة' : 'VEX ID'}</span>
              </button>

              {/* Individual Company Wallets */}
              {wallets.map((w) => {
                const isSelected = selectedWalletId === w.company_id;
                return (
                  <button
                    key={w.company_id}
                    type="button"
                    onClick={() => setSelectedWalletId(w.company_id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{w.company_name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* QR Code Presentation Box */}
          <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950/60 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-3.5 text-center">
            {/* Header Badge */}
            <div className="flex items-center gap-2">
              {!isMaster && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-800 shrink-0">
                  <CompanyBrandLogo companyName={companyName} size="sm" className="rounded-md" />
                </div>
              )}
              <span className="text-xs font-black text-slate-900 dark:text-white">
                {companyName}
              </span>
            </div>

            {/* QR Canvas / Image Render */}
            <div className="relative p-3 bg-white rounded-2xl border-2 border-slate-200/80 shadow-md flex items-center justify-center">
              {isGenerating ? (
                <div className="w-56 h-56 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs font-bold">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                  <span>{isAr ? 'جارٍ توليد الرمز...' : 'Generating QR...'}</span>
                </div>
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code for ${companyName} - ${address}`}
                  className="w-56 h-56 max-w-full rounded-lg object-contain"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                  {isAr ? 'تعذر توليد الرمز' : 'QR code unavailable'}
                </div>
              )}

              {/* Center VEX badge overlay */}
              {!isGenerating && qrDataUrl && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center">
                    <span className="text-[10px] font-black text-emerald-700 font-mono">VEX</span>
                  </div>
                </div>
              )}
            </div>

            {/* Format Toggle Pill */}
            <div className="flex items-center gap-1 p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setQrFormat('address')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  qrFormat === 'address'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isAr ? 'رقم الحساب المباشر' : 'Direct Address'}
              </button>
              <button
                type="button"
                onClick={() => setQrFormat('transfer_link')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  qrFormat === 'transfer_link'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isAr ? 'رابط تحويل مباشر' : 'Transfer URL'}
              </button>
            </div>

            {/* Address Display Box with Copy Button */}
            <div className="w-full space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 font-medium">
                <span>{isAr ? 'عنوان الحساب القابل للمشاركة:' : 'Shareable Address:'}</span>
                <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  {isAr ? 'جاهز للمسح والنسخ' : 'Ready to scan'}
                </span>
              </div>

              <div className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between gap-2 shadow-2xs">
                <span
                  className="font-mono font-black text-sm text-slate-900 dark:text-white truncate select-all"
                  dir="ltr"
                >
                  {address}
                </span>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                  title={isAr ? 'نسخ العنوان' : 'Copy address'}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">{isAr ? 'تم النسخ' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{isAr ? 'نسخ' : 'Copy'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons: Download & Share */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleDownload}
              disabled={!qrDataUrl}
              className="py-3 px-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span>{isAr ? 'تحميل صورة QR' : 'Download QR'}</span>
            </button>

            <button
              type="button"
              onClick={handleNativeShare}
              className="py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>{isAr ? 'مشاركة العنوان' : 'Share Address'}</span>
            </button>
          </div>

          {shareFeedback && (
            <p className="text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-fade-in">
              {shareFeedback}
            </p>
          )}

          {/* Usage Instructions / Safety Hint */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex items-start gap-2.5 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
            <ShieldCheck className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>
              {isAr
                ? 'يمكن لصديقك مسح رمز الـ QR أو لصق هذا العنوان مباشرة في خانة "حساب الصديق" في صفحة التحويلات لإرسال الرصيد إليك فوراً.'
                : 'Your friend can scan this QR or paste the address into the Transfers tab to send funds directly to your wallet.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
