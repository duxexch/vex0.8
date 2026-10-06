import { Request, Response, NextFunction } from 'express';

// ==============================================================================
// 🌍 GEO-LOCALE MIDDLEWARE — Auto-detect locale from Accept-Language + GeoIP
// ==============================================================================

export type Locale = 'ar_eg' | 'ar_gulf' | 'en';

export interface GeoLocaleInfo {
  locale: Locale;
  countryCode: string;
  countryIso: string;
  countryName: string;
  countryFlag: string;
  suggestedDomain: string;
  currency: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'accept-language' | 'geoip' | 'fallback';
}

// Country → display currency (used ONLY for the visitor's currency preference)
const CURRENCY_BY_COUNTRY: Record<string, string> = {
  EG: 'EGP', SA: 'SAR', AE: 'AED', KW: 'KWD', QA: 'QAR', BH: 'BHD',
  OM: 'OMR', IQ: 'IQD', JO: 'JOD', LB: 'LBP', SY: 'SYP', YE: 'YER',
  US: 'USD', RU: 'RUB', GB: 'GBP', TR: 'TRY', DE: 'EUR', FR: 'EUR',
  ES: 'EUR', IT: 'EUR', NL: 'EUR', PT: 'EUR', GR: 'EUR', BE: 'EUR',
  AT: 'EUR', IE: 'EUR', FI: 'EUR', SK: 'EUR', SI: 'EUR', LT: 'EUR',
  LV: 'EUR', EE: 'EUR', LU: 'EUR', CY: 'EUR', MT: 'EUR', HR: 'EUR',
  DZ: 'DZD', MA: 'MAD', TN: 'TND', LY: 'LYD', SD: 'SDG',
};

export function currencyForCountry(iso: string | undefined): string {
  if (!iso) return 'USD';
  return CURRENCY_BY_COUNTRY[String(iso).toUpperCase()] || 'USD';
}

// Gulf countries
const GULF_COUNTRIES = new Set(['SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'YE']);
const EGYPT_CODES = new Set(['EG']);

// Language code mapping
const LANG_MAP: Record<string, Locale> = {
  'ar-eg': 'ar_eg',
  'ar-sa': 'ar_gulf',
  'ar-ae': 'ar_gulf',
  'ar-qg': 'ar_gulf',
  'ar-kw': 'ar_gulf',
  'ar-bh': 'ar_gulf',
  'ar-om': 'ar_gulf',
  'ar-ye': 'ar_gulf',
  'ar': 'ar_eg',
  'en': 'en',
  'en-us': 'en',
  'en-gb': 'en',
};

const DOMAIN_BY_REGION: Record<string, string> = {
  'EG': 'vex.deals',
  'SA': 'betjam.sbs',
  'AE': 'betjam.sbs',
  'QA': 'betjam.sbs',
  'KW': '1xbetservices.com',
  'BH': 'betjam.sbs',
  'OM': 'betongame.cloud',
  'GLOBAL': 'vex.deals',
};

interface GeoIPResponse {
  country_code?: string;
  country_code_iso3?: string;
  country_name?: string;
  flag?: string;
  error?: boolean;
}

let geoipCache = new Map();
const GEOIP_CACHE_TTL = 24 * 60 * 60 * 1000;

async function fetchGeoIP(ip: string): Promise<GeoIPResponse> {
  const cached = geoipCache.get(ip);
  if (cached && cached.expires > Date.now()) return cached.data;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,flag,message`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'VEX-Bot/1.0' },
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error('HTTP ' + res.status);

    const data = await res.json();
    const result = {
      country_code: data.countryCode,
      country_name: data.country,
      flag: data.flag ? 'https://flagsapi.com/' + data.countryCode + '/flat/32.png' : undefined,
      error: data.status !== 'success',
    };

    geoipCache.set(ip, { data: result, expires: Date.now() + 24 * 60 * 60 * 1000 });
    return result;
  } catch (e) {
    return { error: true };
  }
}

function parseAcceptLanguage(header: string | undefined) {
  if (!header) return 'ar_eg';

  const langs = header
    .split(',')
    .map(l => l.split(';')[0].trim().toLowerCase())
    .filter(l => l);

  for (const lang of langs) {
    if (LANG_MAP[lang]) return LANG_MAP[lang];
    const prefix = lang.split('-')[0];
    if (LANG_MAP[prefix]) return LANG_MAP[prefix];
  }

  return 'ar_eg';
}

function determineLocaleFromIP(countryCode: string) {
  if (EGYPT_CODES.has(countryCode)) return 'ar_eg';
  if (GULF_COUNTRIES.has(countryCode)) return 'ar_gulf';
  return 'en';
}

function getSuggestedDomainByCode(countryCode: string) {
  return DOMAIN_BY_REGION[countryCode] || DOMAIN_BY_REGION['GLOBAL'];
}

export async function geoLocaleMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.vary('Accept-Language');
    const acceptLang = req.headers['accept-language'];
    const fromHeader = parseAcceptLanguage(acceptLang);

    const forwarded = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0] || req.ip || req.socket.remoteAddress || '').replace(/^::ffff:/, '');

    let geoData: GeoIPResponse = { error: true };
    let fromGeoIP = false;

    if (ip && ip !== '::1' && ip !== '127.0.0.1' && !ip.startsWith('192.168.') && !ip.startsWith('10.')) {
      const data = await fetchGeoIP(ip);
      if (!data.error && data.country_code) {
        geoData = data;
        fromGeoIP = true;
      }
    }

    let locale = 'ar_eg';
    let countryCode = 'GLOBAL';
    let countryIso = 'GLOBAL';
    let countryName = 'Global';
    let countryFlag = '🌍';
    let source: 'accept-language' | 'geoip' | 'fallback' = 'fallback';
    let confidence: 'high' | 'medium' | 'low' = 'low';

    if (fromGeoIP && geoData.country_code) {
      const countryCode = geoData.country_code;
      const countryIso = geoData.country_code;
      const countryName = geoData.country_name || countryCode;
      const countryFlag = geoData.flag || 'https://flagsapi.com/' + countryCode + '/flat/32.png';
      const locale = determineLocaleFromIP(countryCode);

      (req as any).geoLocale = {
        locale,
        countryCode,
        countryIso,
        countryName: geoData.country_name || countryCode,
        countryFlag: geoData.flag || 'https://flagsapi.com/' + countryCode + '/flat/32.png',
        suggestedDomain: getSuggestedDomainByCode(countryCode),
        currency: currencyForCountry(countryCode),
        confidence: 'high',
        source: 'geoip',
        ip,
      };

      (req as any).locale = locale;
      (req as any).countryCode = countryCode;

      next();
      return;
    } else {
      const fromHeader = parseAcceptLanguage(req.headers['accept-language']);
      let locale = fromHeader;
      let countryCode = 'GLOBAL';
      let countryIso = 'GLOBAL';
      let countryName = 'Global';
      let countryFlag = '🌍';
      let source: 'accept-language' | 'geoip' | 'fallback' = 'accept-language';
      let confidence: 'high' | 'medium' | 'low' = 'medium';

      if (locale === 'ar_eg') {
        countryCode = 'EG'; countryIso = 'EG'; countryName = 'Egypt'; countryFlag = '🇪🇬';
      } else if (locale === 'ar_gulf') {
        countryCode = 'SA'; countryIso = 'SA'; countryName = 'Saudi Arabia'; countryFlag = '🇸🇦';
      } else {
        countryCode = 'GLOBAL'; countryIso = 'GLOBAL'; countryName = 'Global'; countryFlag = '🌍';
      }

      (req as any).geoLocale = {
        locale,
        countryCode,
        countryIso,
        countryName,
        countryFlag,
        suggestedDomain: getSuggestedDomainByCode(countryCode),
        currency: currencyForCountry(countryCode),
        confidence,
        source: 'accept-language',
        ip: req.ip,
      };

      (req as any).locale = locale;
      (req as any).countryCode = countryCode;

      next();
    }
  } catch (e) {
    (req as any).geoLocale = {
      locale: 'ar_eg',
      countryCode: 'EG',
      countryIso: 'EG',
      countryName: 'Egypt',
      countryFlag: '🇪🇬',
      suggestedDomain: 'vex.deals',
      currency: 'EGP',
      confidence: 'low',
      source: 'fallback',
      ip: '',
    };
    next();
  }
}

export function getLocale(req: Request) { return (req as any).geoLocale?.locale || 'ar_eg'; }
export function getSuggestedDomain(req: Request) { return (req as any).geoLocale?.suggestedDomain || 'vex.deals'; }
export function getGeoInfo(req: Request) { return (req as any).geoLocale; }