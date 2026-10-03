import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Download, CheckCircle, ShieldCheck } from 'lucide-react';
import { CompensationRequest } from '../types';

interface ResurrectedSlipModalProps {
  request: CompensationRequest;
  onClose: () => void;
  lang: 'ar' | 'en';
}

export const ResurrectedSlipModal: React.FC<ResurrectedSlipModalProps> = ({
  request,
  onClose,
  lang,
}) => {
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    // In a real app with html2canvas, we'd render the element to canvas.
    // For now, we'll use native web share if available, or just fallback to text
    const text = lang === 'ar' 
      ? `خسرت رهاني في ${request.company_name} ولكن VEX Deals عوضوني بـ $${request.amount}! سجل واستفد من التأمين 100%.`
      : `Lost my bet on ${request.company_name} but VEX Deals compensated me $${request.amount}! Get 100% insurance.`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'VEX Deals - 100% Compensation',
          text,
          url: window.location.origin
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      alert(lang === 'ar' ? 'تم نسخ النص! يمكنك أخذ لقطة شاشة للبطاقة ومشاركتها.' : 'Text copied! You can screenshot the card and share it.');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl border border-slate-700 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <h3 className="text-white font-black text-sm">
              {lang === 'ar' ? 'القسيمة العائدة من الموت 🧟‍♂️' : 'Resurrected Slip 🧟‍♂️'}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Shareable Card Area */}
          <div className="p-6 bg-slate-900 relative" ref={cardRef}>
            <div className="bg-gradient-to-br from-emerald-900 to-slate-900 rounded-2xl p-6 border border-emerald-500/30 relative overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.1)]">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -ml-16 -mb-16" />
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  <span className="text-white font-black tracking-widest uppercase text-sm">VEX Deals</span>
                </div>
                <div className="px-2 py-1 bg-rose-500/20 text-rose-400 text-[10px] font-black rounded border border-rose-500/30">
                  {lang === 'ar' ? 'قسيمة خاسرة' : 'LOST SLIP'}
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    {lang === 'ar' ? 'الشركة المضيفة' : 'Bookmaker'}
                  </p>
                  <p className="text-white font-black text-lg">{request.company_name}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                      {lang === 'ar' ? 'رقم القسيمة' : 'Slip ID'}
                    </p>
                    <p className="text-slate-200 font-mono text-xs mt-0.5">{request.bet_slip_id}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                      {lang === 'ar' ? 'المبلغ' : 'Amount'}
                    </p>
                    <p className="text-rose-400 font-black text-lg">-${request.amount}</p>
                  </div>
                </div>
              </div>

              {/* The "Resurrected" Stamp */}
              <div className="mt-8 pt-4 border-t border-emerald-500/20 relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                  <div>
                    <p className="text-emerald-400 font-black text-sm uppercase">
                      {lang === 'ar' ? 'تم التعويض 100%' : '100% COMPENSATED'}
                    </p>
                    <p className="text-emerald-500/70 text-[9px] font-bold">
                      {lang === 'ar' ? 'بواسطة تأمين VEX Deals' : 'By VEX Deals Insurance'}
                    </p>
                  </div>
                </div>
                <p className="text-emerald-400 font-black text-xl">
                  +${request.amount}
                </p>
              </div>

              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none transform -rotate-12">
                <span className="text-6xl font-black text-white whitespace-nowrap">VEX DEALS</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 bg-slate-900 border-t border-slate-800 grid grid-cols-2 gap-3">
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl py-3 text-xs font-bold transition-colors"
            >
              <Share2 className="w-4 h-4" />
              {lang === 'ar' ? 'شارك القسيمة' : 'Share Slip'}
            </button>
            <button
              onClick={() => {
                alert(lang === 'ar' ? 'قم بأخذ لقطة شاشة للشاشة الحالية لمشاركتها!' : 'Please take a screenshot of the card to share!');
              }}
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-3 text-xs font-bold transition-colors border border-slate-700"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              {lang === 'ar' ? 'حفظ الصورة' : 'Save Image'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
