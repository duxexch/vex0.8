import React from 'react';
import { Download, UserPlus, MessageCircle, Send } from 'lucide-react';
import { Company, Language, AppBranding } from '../types';

const WHATSAPP_URL = 'https://wa.me/201096849170?text=' + encodeURIComponent('أهلاً VEX 👋 شفت توقع المباريات وحابب أسجّل');
const TELEGRAM_URL = 'https://t.me/VexVerifyBot';

interface PostActionButtonsProps {
  postCompany?: string;
  companies?: Company[];
  branding?: AppBranding;
  lang: Language;
}

/**
 * Telegram-inline-keyboard-style colorful CTA row under prediction posts:
 * download app (partner APK) · register (partner affiliate) · WhatsApp · Telegram.
 */
export const PostActionButtons: React.FC<PostActionButtonsProps> = ({
  postCompany = '',
  companies = [],
  branding,
  lang,
}) => {
  const isAr = lang === 'ar';
  const active = companies.filter((c) => c.is_active);
  const comp =
    active.find((c) => c.name.toLowerCase() === postCompany.trim().toLowerCase()) ||
    (branding?.exclusiveMode && branding.targetCompanyId && branding.targetCompanyId !== 'all'
      ? active.find((c) => c.id === branding.targetCompanyId)
      : undefined) ||
    active[0];

  const appUrl = comp?.app_link || '/download/apk';
  const regUrl = comp?.affiliate_link || 'https://vex.deals';

  const btn =
    'group min-w-0 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-[11px] font-black text-white shadow-xs shadow-black/10 transition-all active:scale-95 hover:brightness-110 [text-shadow:0_1px_1px_rgba(0,0,0,0.18)]';

  return (
    <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/80 to-white px-3.5 py-3 mt-auto">
      <div className="grid grid-cols-2 gap-1.5">
        <a
          href={appUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btn} bg-gradient-to-br from-emerald-500 to-teal-600`}
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{isAr ? 'تحميل التطبيق' : 'Download App'}</span>
        </a>
        <a
          href={regUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btn} bg-gradient-to-br from-amber-500 to-orange-500`}
        >
          <UserPlus className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{isAr ? 'تسجيل حساب' : 'Register'}</span>
        </a>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btn} bg-gradient-to-br from-[#25D366] to-[#0f8f5a]`}
        >
          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{isAr ? 'واتساب' : 'WhatsApp'}</span>
        </a>
        <a
          href={TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btn} bg-gradient-to-br from-sky-400 to-blue-600`}
        >
          <Send className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{isAr ? 'تيليجرام' : 'Telegram'}</span>
        </a>
      </div>
    </div>
  );
};

export default PostActionButtons;
