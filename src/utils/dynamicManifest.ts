import { AppBranding, PLATFORM_DOMAIN, PLATFORM_URL } from '../types';

export interface IconPresetDefinition {
  id: string;
  nameAr: string;
  nameEn: string;
  category: 'core' | 'vip' | 'sports' | 'crypto' | 'partner';
  bgColor: string;
  accentColor: string;
  descriptionAr: string;
  svgTemplate: (appName: string, size?: number) => string;
}

export const ICON_PRESETS: IconPresetDefinition[] = [
  {
    id: 'emerald-shield',
    nameAr: 'الدرع الزمردي الرسمي (VEX)',
    nameEn: 'Emerald Official Shield',
    category: 'core',
    bgColor: '#020617',
    accentColor: '#10b981',
    descriptionAr: 'الدرع الكلاسيكي المعتمد لعلامة VEX مع حماية الدرع الزمردي المتوهج',
    svgTemplate: (appName = 'VEX', size = 512) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <defs>
        <linearGradient id="es_bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#090d16"/>
          <stop offset="100%" stop-color="#020617"/>
        </linearGradient>
        <linearGradient id="es_accent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#34d399"/>
          <stop offset="50%" stop-color="#10b981"/>
          <stop offset="100%" stop-color="#059669"/>
        </linearGradient>
        <linearGradient id="es_shield" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
        <filter id="es_glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="${size * 0.02}" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#es_bg)"/>
      <rect x="${size * 0.04}" y="${size * 0.04}" width="${size * 0.92}" height="${size * 0.92}" rx="${size * 0.18}" fill="none" stroke="#334155" stroke-width="${size * 0.008}" opacity="0.4"/>
      
      <!-- Shield -->
      <path d="M${size * 0.5} ${size * 0.18} L${size * 0.74} ${size * 0.28} V${size * 0.52} C${size * 0.74} ${size * 0.68} ${size * 0.5} ${size * 0.82} ${size * 0.5} ${size * 0.82} C${size * 0.5} ${size * 0.82} ${size * 0.26} ${size * 0.68} ${size * 0.26} ${size * 0.52} V${size * 0.28} Z" fill="url(#es_shield)" stroke="url(#es_accent)" stroke-width="${size * 0.024}" stroke-linejoin="round" filter="url(#es_glow)"/>
      
      <!-- Stylized V / Check -->
      <path d="M${size * 0.38} ${size * 0.39} L${size * 0.5} ${size * 0.61} L${size * 0.62} ${size * 0.39}" fill="none" stroke="url(#es_accent)" stroke-width="${size * 0.048}" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${size * 0.5}" cy="${size * 0.35}" r="${size * 0.028}" fill="#6ee7b7"/>
    </svg>`,
  },
  {
    id: 'gold-crown',
    nameAr: 'التاج الملكي الذهبي (VIP Elite)',
    nameEn: 'Royal Gold VIP Crown',
    category: 'vip',
    bgColor: '#050505',
    accentColor: '#eab308',
    descriptionAr: 'تصميم VIP فخم لكبار العملاء والأعضاء المميزين',
    svgTemplate: (appName = 'VIP', size = 512) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <defs>
        <linearGradient id="gc_bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#18181b"/>
          <stop offset="100%" stop-color="#000000"/>
        </linearGradient>
        <linearGradient id="gc_gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="40%" stop-color="#eab308"/>
          <stop offset="80%" stop-color="#ca8a04"/>
          <stop offset="100%" stop-color="#854d0e"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#gc_bg)"/>
      <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.38}" fill="none" stroke="url(#gc_gold)" stroke-width="${size * 0.012}" opacity="0.3"/>
      
      <!-- Crown -->
      <path d="M${size * 0.22} ${size * 0.34} L${size * 0.32} ${size * 0.62} H${size * 0.68} L${size * 0.78} ${size * 0.34} L${size * 0.62} ${size * 0.46} L${size * 0.5} ${size * 0.30} L${size * 0.38} ${size * 0.46} Z" fill="url(#gc_gold)" stroke="#fef08a" stroke-width="${size * 0.015}" stroke-linejoin="round"/>
      <rect x="${size * 0.30}" y="${size * 0.66}" width="${size * 0.40}" height="${size * 0.06}" rx="${size * 0.02}" fill="url(#gc_gold)"/>
      
      <circle cx="${size * 0.22}" cy="${size * 0.32}" r="${size * 0.025}" fill="#fef08a"/>
      <circle cx="${size * 0.50}" cy="${size * 0.28}" r="${size * 0.030}" fill="#fef08a"/>
      <circle cx="${size * 0.78}" cy="${size * 0.32}" r="${size * 0.025}" fill="#fef08a"/>
    </svg>`,
  },
  {
    id: 'cyber-tiger',
    nameAr: 'الفهد السيبراني الرياضي (Speed AI)',
    nameEn: 'Cyber Tiger Sports',
    category: 'sports',
    bgColor: '#030712',
    accentColor: '#f97316',
    descriptionAr: 'طاقة هجومية وسرعة فائقة للتحليلات والمباريات الرياضية الحية',
    svgTemplate: (appName = 'SPORTS', size = 512) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <defs>
        <linearGradient id="ct_bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#111827"/>
          <stop offset="100%" stop-color="#030712"/>
        </linearGradient>
        <linearGradient id="ct_orange" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fdba74"/>
          <stop offset="50%" stop-color="#f97316"/>
          <stop offset="100%" stop-color="#c2410c"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#ct_bg)"/>
      
      <!-- Energy Star / Tiger Badge -->
      <polygon points="${size * 0.5},${size * 0.18} ${size * 0.59},${size * 0.38} ${size * 0.81},${size * 0.39} ${size * 0.64},${size * 0.53} ${size * 0.70},${size * 0.75} ${size * 0.5},${size * 0.62} ${size * 0.30},${size * 0.75} ${size * 0.36},${size * 0.53} ${size * 0.19},${size * 0.39} ${size * 0.41},${size * 0.38}" fill="url(#ct_orange)" stroke="#ffedd5" stroke-width="${size * 0.012}"/>
      
      <circle cx="${size * 0.5}" cy="${size * 0.48}" r="${size * 0.12}" fill="#030712" stroke="url(#ct_orange)" stroke-width="${size * 0.016}"/>
      <text x="${size * 0.5}" y="${size * 0.51}" text-anchor="middle" font-family="monospace, sans-serif" font-weight="900" font-size="${size * 0.09}" fill="#fed7aa">AI</text>
    </svg>`,
  },
  {
    id: 'neon-bolt',
    nameAr: 'الصاعقة النيون (Instant Cash & AI)',
    nameEn: 'Neon Lightning Bolt',
    category: 'sports',
    bgColor: '#020617',
    accentColor: '#06b6d4',
    descriptionAr: 'رمز السرعة الفائقة لفك التجميد وتحويل الرصيد الفوري',
    svgTemplate: (appName = 'FAST', size = 512) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <defs>
        <linearGradient id="nb_bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#020617"/>
        </linearGradient>
        <linearGradient id="nb_cyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#67e8f9"/>
          <stop offset="50%" stop-color="#06b6d4"/>
          <stop offset="100%" stop-color="#2563eb"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#nb_bg)"/>
      <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.36}" fill="none" stroke="url(#nb_cyan)" stroke-width="${size * 0.012}" opacity="0.4"/>
      
      <!-- Lightning Bolt -->
      <polygon points="${size * 0.54},${size * 0.18} ${size * 0.28},${size * 0.52} ${size * 0.48},${size * 0.52} ${size * 0.44},${size * 0.82} ${size * 0.72},${size * 0.46} ${size * 0.52},${size * 0.46}" fill="url(#nb_cyan)" stroke="#a5f3fc" stroke-width="${size * 0.012}" stroke-linejoin="round"/>
    </svg>`,
  },
  {
    id: 'crypto-coin',
    nameAr: 'العملة الرقمية الذهبية (Cashback Vault)',
    nameEn: 'Gold Crypto Coin',
    category: 'crypto',
    bgColor: '#0f172a',
    accentColor: '#10b981',
    descriptionAr: 'رمز الاسترداد المالي وإدارة محافظ المراهنات والأرصدة',
    svgTemplate: (appName = 'CASH', size = 512) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <defs>
        <linearGradient id="cc_bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#090d16"/>
        </linearGradient>
        <linearGradient id="cc_green" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#6ee7b7"/>
          <stop offset="50%" stop-color="#10b981"/>
          <stop offset="100%" stop-color="#047857"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#cc_bg)"/>
      <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.35}" fill="none" stroke="url(#cc_green)" stroke-width="${size * 0.03}"/>
      <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.26}" fill="url(#cc_green)" opacity="0.15"/>
      <text x="${size * 0.5}" y="${size * 0.57}" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="${size * 0.24}" fill="#34d399">$</text>
    </svg>`,
  },
  {
    id: 'diamond-shield',
    nameAr: 'الدرع الماسي الأزرق (Ultra Safe 100%)',
    nameEn: 'Blue Diamond Armor',
    category: 'core',
    bgColor: '#020617',
    accentColor: '#38bdf8',
    descriptionAr: 'حماية وتشفير متقدم للمحافظ والأرصدة والتحويلات المشفرة',
    svgTemplate: (appName = 'SAFE', size = 512) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <defs>
        <linearGradient id="ds_bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0c4a6e"/>
          <stop offset="100%" stop-color="#020617"/>
        </linearGradient>
        <linearGradient id="ds_blue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#bae6fd"/>
          <stop offset="50%" stop-color="#38bdf8"/>
          <stop offset="100%" stop-color="#0284c7"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#ds_bg)"/>
      <polygon points="${size * 0.5},${size * 0.18} ${size * 0.78},${size * 0.36} ${size * 0.65},${size * 0.78} ${size * 0.35},${size * 0.78} ${size * 0.22},${size * 0.36}" fill="none" stroke="url(#ds_blue)" stroke-width="${size * 0.024}" stroke-linejoin="round"/>
      <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.10}" fill="url(#ds_blue)"/>
    </svg>`,
  },
  {
    id: 'champion-trophy',
    nameAr: 'كأس البطولات الذهبي (Sports Master)',
    nameEn: 'Gold Champions Trophy',
    category: 'sports',
    bgColor: '#090d16',
    accentColor: '#fbbf24',
    descriptionAr: 'شعار البطولات العالمية والفوز الرياضي والتحليلات الدقيقة',
    svgTemplate: (appName = 'CUP', size = 512) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <defs>
        <linearGradient id="cup_gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fef3c7"/>
          <stop offset="50%" stop-color="#f59e0b"/>
          <stop offset="100%" stop-color="#b45309"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#090d16"/>
      <!-- Trophy Cup Body -->
      <path d="M${size * 0.32} ${size * 0.25} H${size * 0.68} V${size * 0.45} C${size * 0.68} ${size * 0.60} ${size * 0.56} ${size * 0.68} ${size * 0.50} ${size * 0.68} C${size * 0.44} ${size * 0.68} ${size * 0.32} ${size * 0.60} ${size * 0.32} ${size * 0.45} Z" fill="url(#cup_gold)"/>
      <!-- Handles -->
      <path d="M${size * 0.32} ${size * 0.30} H${size * 0.24} C${size * 0.20} ${size * 0.30} ${size * 0.20} ${size * 0.46} ${size * 0.28} ${size * 0.48} L${size * 0.32} ${size * 0.48}" fill="none" stroke="url(#cup_gold)" stroke-width="${size * 0.024}"/>
      <path d="M${size * 0.68} ${size * 0.30} H${size * 0.76} C${size * 0.80} ${size * 0.30} ${size * 0.80} ${size * 0.46} ${size * 0.72} ${size * 0.48} L${size * 0.68} ${size * 0.48}" fill="none" stroke="url(#cup_gold)" stroke-width="${size * 0.024}"/>
      <!-- Stem & Base -->
      <rect x="${size * 0.46}" y="${size * 0.68}" width="${size * 0.08}" height="${size * 0.08}" fill="url(#cup_gold)"/>
      <rect x="${size * 0.36}" y="${size * 0.76}" width="${size * 0.28}" height="${size * 0.06}" rx="${size * 0.015}" fill="url(#cup_gold)"/>
    </svg>`,
  },
  {
    id: 'partner-1xbet',
    nameAr: 'أيقونة 1xBet الرسمية (Blue Tech)',
    nameEn: '1xBet Blue Official',
    category: 'partner',
    bgColor: '#0a3871',
    accentColor: '#1a73e8',
    descriptionAr: 'الأيقونة الرسمية لشركة 1xBet باللون الأزرق الملكي',
    svgTemplate: (appName = '1XBET', size = 512) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#0d579b"/>
      <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.36}" fill="#0a3871" stroke="#29b6f6" stroke-width="${size * 0.016}"/>
      <text x="${size * 0.5}" y="${size * 0.58}" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="${size * 0.22}" fill="#ffffff">1X</text>
    </svg>`,
  },
  {
    id: 'partner-melbet',
    nameAr: 'أيقونة Melbet الرسمية (Amber Gold)',
    nameEn: 'Melbet Amber Official',
    category: 'partner',
    bgColor: '#1c1917',
    accentColor: '#f59e0b',
    descriptionAr: 'الأيقونة الرسمية لشركة Melbet باللون الأسود والأصفر الكهرماني',
    svgTemplate: (appName = 'MELBET', size = 512) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#18181b"/>
      <rect x="${size * 0.15}" y="${size * 0.15}" width="${size * 0.70}" height="${size * 0.70}" rx="${size * 0.16}" fill="#27272a" stroke="#f59e0b" stroke-width="${size * 0.02}"/>
      <text x="${size * 0.5}" y="${size * 0.58}" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="${size * 0.20}" fill="#f59e0b">MEL</text>
    </svg>`,
  },
  {
    id: 'partner-linebet',
    nameAr: 'أيقونة Linebet الرسمية (Forest Green)',
    nameEn: 'Linebet Green Official',
    category: 'partner',
    bgColor: '#064e3b',
    accentColor: '#10b981',
    descriptionAr: 'الأيقونة الرسمية لشركة Linebet باللون الأخضر المميز',
    svgTemplate: (appName = 'LINEBET', size = 512) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#064e3b"/>
      <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.36}" fill="#047857" stroke="#34d399" stroke-width="${size * 0.016}"/>
      <text x="${size * 0.5}" y="${size * 0.58}" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="${size * 0.20}" fill="#ffffff">LINE</text>
    </svg>`,
  },
];

/**
 * Get SVG string for any preset or branding configuration
 */
export function getPresetSvg(presetId: string, appName = 'VEX', size = 512): string {
  const match = ICON_PRESETS.find((p) => p.id === presetId);
  if (match) {
    return match.svgTemplate(appName, size);
  }
  return ICON_PRESETS[0].svgTemplate(appName, size);
}

/**
 * Convert an SVG string to a Data URL (image/svg+xml;utf8)
 */
export function svgToDataUrl(svgString: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
}

/**
 * Convert an image source (URL, SVG string, or data URL) to a high-resolution PNG data URL
 */
export async function rasterizeToPngDataUrl(
  source: string,
  targetSize: number = 512
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return resolve(source);
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return resolve(source);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      ctx.clearRect(0, 0, targetSize, targetSize);
      ctx.drawImage(img, 0, 0, targetSize, targetSize);
      try {
        const pngUrl = canvas.toDataURL('image/png');
        resolve(pngUrl);
      } catch {
        resolve(source);
      }
    };

    img.onerror = () => {
      resolve(source);
    };

    if (source.startsWith('<svg')) {
      img.src = svgToDataUrl(source);
    } else {
      img.src = source;
    }
  });
}

/**
 * Read uploaded File object, validate resolution, and return high-resolution base64 & dimensions
 */
export async function processUploadedIconFile(file: File): Promise<{
  dataUrl: string;
  width: number;
  height: number;
  isHighRes: boolean;
  mimeType: string;
}> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('الملف المرفوع ليس صورة صالحة. يرجى اختيار ملف PNG أو SVG أو JPG أو WebP.'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const width = img.naturalWidth || img.width || 512;
        const height = img.naturalHeight || img.height || 512;
        const isHighRes = width >= 512 && height >= 512;
        resolve({
          dataUrl,
          width,
          height,
          isHighRes,
          mimeType: file.type,
        });
      };
      img.onerror = () => {
        resolve({
          dataUrl,
          width: 512,
          height: 512,
          isHighRes: true,
          mimeType: file.type,
        });
      };
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('فشلت قراءة ملف الصورة.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Generate full Web App Manifest Object based on active AppBranding
 */
export function generateManifestObject(branding: AppBranding) {
  const appName = branding.appName || 'VEX Deals';
  const shortName = (branding.appName || 'VEX Deals').split(' ')[0];
  const tagline = branding.tagline || 'منصة الولاء والتعويضات والتحليلات الرياضية الذكية';
  const themeColor = branding.themeColor || '#f8fafc';
  const bgColor = branding.backgroundColor || '#f8fafc';

  let icon192 = '/icon-192.svg';
  let icon512 = '/icon-512.svg';

  if (branding.iconType === 'upload' && branding.uploadedIconData) {
    icon192 = branding.highResAssets?.icon192 || branding.uploadedIconData;
    icon512 = branding.highResAssets?.icon512 || branding.uploadedIconData;
  } else if (branding.iconType === 'custom' && branding.customIconUrl) {
    icon192 = branding.customIconUrl;
    icon512 = branding.customIconUrl;
  } else if (branding.presetIconId) {
    const svg192 = getPresetSvg(branding.presetIconId, appName, 192);
    const svg512 = getPresetSvg(branding.presetIconId, appName, 512);
    icon192 = svgToDataUrl(svg192);
    icon512 = svgToDataUrl(svg512);
  }

  return {
    id: `https://${PLATFORM_DOMAIN}/`,
    name: appName,
    short_name: shortName,
    description: tagline,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: bgColor,
    theme_color: themeColor,
    icons: [
      {
        src: icon192,
        sizes: '192x192',
        type: icon192.startsWith('data:image/svg') || icon192.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
        purpose: 'any',
      },
      {
        src: icon512,
        sizes: '512x512',
        type: icon512.startsWith('data:image/svg') || icon512.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
        purpose: 'any',
      },
      {
        src: icon512,
        sizes: '512x512',
        type: icon512.startsWith('data:image/svg') || icon512.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['finance', 'utilities', 'sports'],
  };
}

let activeBlobUrl: string | null = null;

/**
 * Dynamically updates DOM meta tags, title, favicon, apple-touch-icon, and injects dynamic Web App Manifest
 */
export function applyBrandingToDocument(branding: AppBranding): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const appName = branding.appName || 'VEX Deals';
  const tagline = branding.tagline || 'منصة الولاء والتعويضات والتحليلات الرياضية الذكية';
  const fullTitle = `${appName} - ${tagline}`;

  // 1. Update document title
  document.title = fullTitle;

  // 2. Resolve primary icon source
  let primaryIconUrl = '/icon-192.svg';
  let primary512Url = '/icon-512.svg';

  if (branding.iconType === 'upload' && branding.uploadedIconData) {
    primaryIconUrl = branding.uploadedIconData;
    primary512Url = branding.uploadedIconData;
  } else if (branding.iconType === 'custom' && branding.customIconUrl) {
    primaryIconUrl = branding.customIconUrl;
    primary512Url = branding.customIconUrl;
  } else if (branding.presetIconId) {
    const svg192 = getPresetSvg(branding.presetIconId, appName, 192);
    const svg512 = getPresetSvg(branding.presetIconId, appName, 512);
    primaryIconUrl = svgToDataUrl(svg192);
    primary512Url = svgToDataUrl(svg512);
  }

  // 3. Update Favicon (<link rel="icon">)
  let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
  if (!faviconLink) {
    faviconLink = document.createElement('link');
    faviconLink.rel = 'icon';
    document.head.appendChild(faviconLink);
  }
  faviconLink.href = primaryIconUrl;

  // 4. Update Apple Touch Icon (<link rel="apple-touch-icon">)
  let appleIconLink = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
  if (!appleIconLink) {
    appleIconLink = document.createElement('link');
    appleIconLink.rel = 'apple-touch-icon';
    document.head.appendChild(appleIconLink);
  }
  appleIconLink.href = primary512Url;

  // 5. Update Meta Tags
  const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
    let el = document.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  setMeta('property', 'og:title', appName);
  setMeta('property', 'og:description', tagline);
  setMeta('property', 'og:image', primary512Url);
  setMeta('name', 'twitter:title', appName);
  setMeta('name', 'twitter:description', tagline);
  setMeta('name', 'twitter:image', primary512Url);
  setMeta('name', 'description', tagline);
  setMeta('name', 'apple-mobile-web-app-title', appName);

  if (branding.themeColor) {
    setMeta('name', 'theme-color', branding.themeColor);
  }

  // 6. Dynamically update Web App Manifest via Blob URL
  try {
    const manifestObj = generateManifestObject(branding);
    const manifestJson = JSON.stringify(manifestObj, null, 2);
    const blob = new Blob([manifestJson], { type: 'application/manifest+json' });

    if (activeBlobUrl) {
      URL.revokeObjectURL(activeBlobUrl);
    }
    activeBlobUrl = URL.createObjectURL(blob);

    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = activeBlobUrl;
  } catch (err) {
    console.warn('Could not inject dynamic blob manifest:', err);
  }
}

/**
 * Trigger file download helper
 */
export function downloadStringAsFile(content: string, filename: string, mimeType = 'application/json'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generate HTML Meta tags code snippet for static deployment / exports
 */
export function generateHtmlSnippet(branding: AppBranding): string {
  const appName = branding.appName || 'VEX Deals';
  const tagline = branding.tagline || 'منصة الولاء والتعويضات والتحليلات الرياضية الذكية';
  const themeColor = branding.themeColor || '#f8fafc';

  return `<!-- VEX App Branding & PWA Dynamic Meta Tags -->
<title>${appName} - ${tagline}</title>
<meta name="description" content="${tagline}" />
<meta property="og:title" content="${appName}" />
<meta property="og:description" content="${tagline}" />
<meta property="og:type" content="website" />
<meta property="og:image" content="/icon-512.svg" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${appName}" />
<meta name="twitter:description" content="${tagline}" />
<meta name="twitter:image" content="/icon-512.svg" />
<meta name="theme-color" content="${themeColor}" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="${appName}" />
<link rel="manifest" href="/manifest.json" />
<link rel="icon" type="image/svg+xml" href="/icon-192.svg" />
<link rel="apple-touch-icon" href="/icon-512.svg" />`;
}
