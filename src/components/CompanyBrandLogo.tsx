import React, { useState } from 'react';

interface CompanyBrandLogoProps {
  companyName?: string;
  companyId?: string;
  /** Optional admin-set logo URL (company.logo_url) — wins over the built-in brand tiles. */
  logoUrl?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Real brand logos shipped in /public/logos (from the local VEX_Content library)
const LOGO_FILES: Array<{ match: (s: string) => boolean; file: string }> = [
  { match: (s) => s.includes('1XBET'), file: '/logos/1xbet.png' },
  { match: (s) => s.includes('MELBET'), file: '/logos/melbet.png' },
  { match: (s) => s.includes('BETJAM'), file: '/logos/betjam.png' },
  { match: (s) => s.includes('MOSTBET') || s.includes('موست'), file: '/logos/mostbet.png' },
  { match: (s) => s.includes('XPARI') || s.includes('XPARIBET'), file: '/logos/xpari.png' },
  { match: (s) => s.includes('BIZBET'), file: '/logos/bizbet.png' },
  { match: (s) => s.includes('LINEBET'), file: '/logos/linebet.png' },
  { match: (s) => s.includes('GOOO'), file: '/logos/goobet.png' },
  { match: (s) => s.includes('VEX'), file: '/logos/vex.png' },
];

// Admin-set custom logo (company.logo_url) — resolved from the companies cache that
// api.ts refreshes on every load, so every call site benefits without prop drilling.
const COMPANIES_CACHE_KEY = 'vex_comp_companies';
function resolveCachedLogoUrl(companyName?: string, companyId?: string): string {
  try {
    const raw = localStorage.getItem(COMPANIES_CACHE_KEY);
    const list: any[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return '';
    const byId = companyId ? list.find((c) => c && c.id === companyId) : undefined;
    const byName = companyName
      ? list.find((c) => c && c.name === companyName) ||
        list.find((c) => c && String(c.name || '').toUpperCase().trim() === companyName.toUpperCase().trim())
      : undefined;
    const url = String((byId || byName || {}).logo_url || '').trim();
    return url;
  } catch {
    return '';
  }
}

export const CompanyBrandLogo: React.FC<CompanyBrandLogoProps> = ({
  companyName,
  companyId,
  logoUrl,
  className = '',
  size = 'md',
}) => {
  const raw = companyName || companyId || 'Partner';
  const normalized = (typeof raw === 'string' ? raw : '').toUpperCase().trim();
  const [imgFailed, setImgFailed] = useState(false);
  const [customFailed, setCustomFailed] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-[9px] rounded-full aspect-square shrink-0 ring-1 ring-white/20',
    md: 'w-10 h-10 text-xs rounded-full aspect-square shrink-0 ring-2 ring-white/20',
    lg: 'w-12 h-12 text-sm rounded-full aspect-square shrink-0 ring-2 ring-white/20',
    xl: 'w-16 h-16 text-base rounded-full aspect-square shrink-0 ring-2 ring-white/30',
  }[size];

  // 1) Admin-set custom logo (explicit prop wins, then the cached company record).
  //    On load error it silently falls through to the built-in brand tiles below.
  const customLogo = customFailed
    ? ''
    : String(logoUrl || '').trim() || resolveCachedLogoUrl(companyName, companyId);
  if (customLogo) {
    return (
      <div
        className={`relative overflow-hidden flex items-center justify-center bg-white select-none shadow-sm ${sizeClasses} ${className}`}
        title={String(raw)}
      >
        <img
          src={customLogo}
          alt={String(raw)}
          draggable={false}
          onError={() => setCustomFailed(true)}
          className="w-full h-full object-contain p-0.5"
        />
      </div>
    );
  }

  // 2) Real logo image from /public/logos (fallback to the CSS brand tiles below if missing/failed)
  const logoFile = LOGO_FILES.find((m) => m.match(normalized))?.file;
  if (logoFile && !imgFailed) {
    return (
      <div
        className={`relative overflow-hidden flex items-center justify-center bg-white select-none shadow-sm ${sizeClasses} ${className}`}
        title={String(raw)}
      >
        <img
          src={logoFile}
          alt={String(raw)}
          draggable={false}
          onError={() => setImgFailed(true)}
          className="w-full h-full object-contain p-0.5"
        />
      </div>
    );
  }

  // 1XBET Official Branding
  if (normalized.includes('1XBET') || normalized.includes('1X')) {
    return (
      <div
        className={`relative overflow-hidden flex items-center justify-center font-black select-none shadow-sm ${sizeClasses} ${className}`}
        style={{
          background: 'linear-gradient(135deg, #093b74 0%, #0d579b 50%, #1572cf 100%)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <div className="flex items-center tracking-tighter leading-none">
          <span className="text-white font-extrabold font-mono">1X</span>
          <span className="bg-sky-400 text-[#093b74] px-0.5 ml-0.5 rounded-[2px] font-black text-[70%]">
            BET
          </span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>
    );
  }

  // MELBET Official Branding
  if (normalized.includes('MELBET')) {
    return (
      <div
        className={`relative overflow-hidden flex items-center justify-center font-black select-none shadow-sm ${sizeClasses} ${className}`}
        style={{
          background: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
        }}
      >
        <div className="flex items-center tracking-tighter leading-none">
          <span className="text-white font-black">MEL</span>
          <span className="bg-amber-400 text-black px-0.5 ml-0.5 rounded-[2px] font-black text-[70%]">
            BET
          </span>
        </div>
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-amber-400/20 rounded-full blur-xs" />
      </div>
    );
  }

  // BETJAM Official Branding
  if (normalized.includes('BETJAM')) {
    return (
      <div
        className={`relative overflow-hidden flex items-center justify-center font-black select-none shadow-sm ${sizeClasses} ${className}`}
        style={{
          background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 50%, #8b5cf6 100%)',
          color: '#ffffff',
          border: '1px solid rgba(167, 139, 250, 0.3)',
        }}
      >
        <div className="flex flex-col items-center justify-center leading-none">
          <span className="text-white font-black tracking-tight text-[80%]">BET</span>
          <span className="text-fuchsia-300 font-extrabold text-[65%] -mt-0.5">JAM</span>
        </div>
      </div>
    );
  }

  // MOSTBET Official Branding (Iconic red with white star)
  if (
    normalized.includes('MOSTBET') ||
    normalized.includes('MOST') ||
    normalized.includes('موست')
  ) {
    return (
      <div
        className={`relative overflow-hidden flex items-center justify-center font-black select-none shadow-sm ${sizeClasses} ${className}`}
        style={{
          background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 50%, #ef4444 100%)',
          color: '#ffffff',
          border: '1px solid rgba(254, 202, 202, 0.3)',
        }}
      >
        <div className="flex flex-col items-center justify-center leading-none">
          <span className="text-amber-300 text-[65%]">★</span>
          <span className="text-white font-black tracking-tighter text-[70%]">MOST</span>
        </div>
      </div>
    );
  }

  // XPARI / XPARIBET Official Branding
  if (
    normalized.includes('XPARI') ||
    normalized.includes('XPARIBET') ||
    normalized.includes('XP') ||
    normalized.includes('اكس') ||
    normalized.includes('إكس') ||
    normalized.includes('اكسباري')
  ) {
    return (
      <div
        className={`relative overflow-hidden flex items-center justify-center font-black select-none shadow-sm ${sizeClasses} ${className}`}
        style={{
          background: 'linear-gradient(135deg, #0e7490 0%, #06b6d4 50%, #22d3ee 100%)',
          color: '#ffffff',
          border: '1px solid rgba(165, 243, 252, 0.3)',
        }}
      >
        <div className="flex items-center tracking-tight leading-none">
          <span className="text-white font-extrabold font-mono">XP</span>
          <span className="text-cyan-100 text-[75%] font-medium">ARI</span>
        </div>
      </div>
    );
  }

  // BIZBET Official Branding
  if (
    normalized.includes('BIZBET') ||
    normalized.includes('BIZ') ||
    normalized.includes('باز') ||
    normalized.includes('بيز') ||
    normalized.includes('بيزبِت')
  ) {
    return (
      <div
        className={`relative overflow-hidden flex items-center justify-center font-black select-none shadow-sm ${sizeClasses} ${className}`}
        style={{
          background: 'linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%)',
          color: '#ffffff',
          border: '1px solid rgba(167, 243, 208, 0.3)',
        }}
      >
        <div className="flex flex-col items-center justify-center leading-none">
          <span className="text-white font-black tracking-tighter text-[75%]">BIZ</span>
          <span className="text-emerald-200 font-mono text-[60%] -mt-0.5">BET</span>
        </div>
      </div>
    );
  }

  // LINEBET Official Branding (Pitch Green)
  if (normalized.includes('LINEBET')) {
    return (
      <div
        className={`relative overflow-hidden flex items-center justify-center font-black select-none shadow-sm ${sizeClasses} ${className}`}
        style={{
          background: 'linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)',
          color: '#ffffff',
          border: '1px solid rgba(187, 247, 208, 0.3)',
        }}
      >
        <div className="flex items-center tracking-tight leading-none">
          <span className="text-white font-black">LINE</span>
          <span className="text-lime-200 text-[65%] font-bold ml-0.5">BET</span>
        </div>
      </div>
    );
  }

  // GOOOBET Official Branding (Gold Trophy)
  if (normalized.includes('GOOOBET') || normalized.includes('GOOO')) {
    return (
      <div
        className={`relative overflow-hidden flex items-center justify-center font-black select-none shadow-sm ${sizeClasses} ${className}`}
        style={{
          background: 'linear-gradient(135deg, #a16207 0%, #ca8a04 50%, #eab308 100%)',
          color: '#ffffff',
          border: '1px solid rgba(254, 240, 138, 0.3)',
        }}
      >
        <div className="flex items-center tracking-tighter leading-none">
          <span className="text-white font-black">GO</span>
          <span className="text-amber-100 font-black">3</span>
        </div>
      </div>
    );
  }

  // Default fallback for any other partner bookmaker
  return (
    <div
      className={`relative overflow-hidden flex items-center justify-center font-black select-none shadow-sm bg-slate-800 text-white border border-slate-700 ${sizeClasses} ${className}`}
    >
      <span className="tracking-tight uppercase">
        {String(raw).slice(0, 3)}
      </span>
    </div>
  );
};
