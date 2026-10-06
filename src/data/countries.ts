export interface CountryOption {
  iso: string;
  nameAr: string;
  nameEn: string;
  flag: string;
  currency: string;
}

// Curated list for payment-method country scoping + regional settings
export const COUNTRIES: CountryOption[] = [
  { iso: 'EG', nameAr: 'مصر', nameEn: 'Egypt', flag: '🇪🇬', currency: 'EGP' },
  { iso: 'SA', nameAr: 'السعودية', nameEn: 'Saudi Arabia', flag: '🇸🇦', currency: 'SAR' },
  { iso: 'AE', nameAr: 'الإمارات', nameEn: 'UAE', flag: '🇦🇪', currency: 'AED' },
  { iso: 'QA', nameAr: 'قطر', nameEn: 'Qatar', flag: '🇶🇦', currency: 'QAR' },
  { iso: 'KW', nameAr: 'الكويت', nameEn: 'Kuwait', flag: '🇰🇼', currency: 'KWD' },
  { iso: 'BH', nameAr: 'البحرين', nameEn: 'Bahrain', flag: '🇧🇭', currency: 'BHD' },
  { iso: 'OM', nameAr: 'عُمان', nameEn: 'Oman', flag: '🇴🇲', currency: 'OMR' },
  { iso: 'IQ', nameAr: 'العراق', nameEn: 'Iraq', flag: '🇮🇶', currency: 'IQD' },
  { iso: 'JO', nameAr: 'الأردن', nameEn: 'Jordan', flag: '🇯🇴', currency: 'JOD' },
  { iso: 'LB', nameAr: 'لبنان', nameEn: 'Lebanon', flag: '🇱🇧', currency: 'LBP' },
  { iso: 'SY', nameAr: 'سوريا', nameEn: 'Syria', flag: '🇸🇾', currency: 'SYP' },
  { iso: 'PS', nameAr: 'فلسطين', nameEn: 'Palestine', flag: '🇵🇸', currency: 'ILS' },
  { iso: 'YE', nameAr: 'اليمن', nameEn: 'Yemen', flag: '🇾🇪', currency: 'YER' },
  { iso: 'SD', nameAr: 'السودان', nameEn: 'Sudan', flag: '🇸🇩', currency: 'SDG' },
  { iso: 'LY', nameAr: 'ليبيا', nameEn: 'Libya', flag: '🇱🇾', currency: 'LYD' },
  { iso: 'TN', nameAr: 'تونس', nameEn: 'Tunisia', flag: '🇹🇳', currency: 'TND' },
  { iso: 'DZ', nameAr: 'الجزائر', nameEn: 'Algeria', flag: '🇩🇿', currency: 'DZD' },
  { iso: 'MA', nameAr: 'المغرب', nameEn: 'Morocco', flag: '🇲🇦', currency: 'MAD' },
  { iso: 'TR', nameAr: 'تركيا', nameEn: 'Türkiye', flag: '🇹🇷', currency: 'TRY' },
  { iso: 'RU', nameAr: 'روسيا', nameEn: 'Russia', flag: '🇷🇺', currency: 'RUB' },
  { iso: 'UA', nameAr: 'أوكرانيا', nameEn: 'Ukraine', flag: '🇺🇦', currency: 'UAH' },
  { iso: 'BY', nameAr: 'بيلاروسيا', nameEn: 'Belarus', flag: '🇧🇾', currency: 'BYN' },
  { iso: 'KZ', nameAr: 'كازاخستان', nameEn: 'Kazakhstan', flag: '🇰🇿', currency: 'KZT' },
  { iso: 'UZ', nameAr: 'أوزبكستان', nameEn: 'Uzbekistan', flag: '🇺🇿', currency: 'UZS' },
  { iso: 'AZ', nameAr: 'أذربيجان', nameEn: 'Azerbaijan', flag: '🇦🇿', currency: 'AZN' },
  { iso: 'GE', nameAr: 'جورجيا', nameEn: 'Georgia', flag: '🇬🇪', currency: 'GEL' },
  { iso: 'DE', nameAr: 'ألمانيا', nameEn: 'Germany', flag: '🇩🇪', currency: 'EUR' },
  { iso: 'FR', nameAr: 'فرنسا', nameEn: 'France', flag: '🇫🇷', currency: 'EUR' },
  { iso: 'ES', nameAr: 'إسبانيا', nameEn: 'Spain', flag: '🇪🇸', currency: 'EUR' },
  { iso: 'IT', nameAr: 'إيطاليا', nameEn: 'Italy', flag: '🇮🇹', currency: 'EUR' },
  { iso: 'GB', nameAr: 'بريطانيا', nameEn: 'United Kingdom', flag: '🇬🇧', currency: 'GBP' },
  { iso: 'NL', nameAr: 'هولندا', nameEn: 'Netherlands', flag: '🇳🇱', currency: 'EUR' },
  { iso: 'PT', nameAr: 'البرتغال', nameEn: 'Portugal', flag: '🇵🇹', currency: 'EUR' },
  { iso: 'GR', nameAr: 'اليونان', nameEn: 'Greece', flag: '🇬🇷', currency: 'EUR' },
  { iso: 'PL', nameAr: 'بولندا', nameEn: 'Poland', flag: '🇵🇱', currency: 'PLN' },
  { iso: 'SE', nameAr: 'السويد', nameEn: 'Sweden', flag: '🇸🇪', currency: 'SEK' },
  { iso: 'US', nameAr: 'الولايات المتحدة', nameEn: 'United States', flag: '🇺🇸', currency: 'USD' },
  { iso: 'CA', nameAr: 'كندا', nameEn: 'Canada', flag: '🇨🇦', currency: 'CAD' },
  { iso: 'BR', nameAr: 'البرازيل', nameEn: 'Brazil', flag: '🇧🇷', currency: 'BRL' },
  { iso: 'IN', nameAr: 'الهند', nameEn: 'India', flag: '🇮🇳', currency: 'INR' },
  { iso: 'PK', nameAr: 'باكستان', nameEn: 'Pakistan', flag: '🇵🇰', currency: 'PKR' },
  { iso: 'NG', nameAr: 'نيجيريا', nameEn: 'Nigeria', flag: '🇳🇬', currency: 'NGN' },
  { iso: 'PH', nameAr: 'الفلبين', nameEn: 'Philippines', flag: '🇵🇭', currency: 'PHP' },
];

export const COUNTRY_BY_ISO: Record<string, CountryOption> = Object.fromEntries(
  COUNTRIES.map((c) => [c.iso, c])
);

export function formatScopeBadge(
  scope: 'global' | 'countries' | undefined,
  countries: string[] | undefined
): string {
  if (!scope || scope === 'global') return '🌍';
  const list = (countries || []).filter((iso) => COUNTRY_BY_ISO[iso]);
  if (list.length === 0) return '🌍';
  const flags = list.slice(0, 3).map((iso) => COUNTRY_BY_ISO[iso].flag);
  const extra = list.length > 3 ? `+${list.length - 3}` : '';
  return flags.join('') + extra;
}
