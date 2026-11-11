import { CURRENCY_META, type CurrencyInfo } from '../data/geoCurrency';

export type { CurrencyInfo };

// Every currency a visitor's country can map to (src/data/geoCurrency.ts —
// the SAME table the server's /api/geo uses), so the geo-suggested currency
// always has a symbol + fallback rate here, identically on every domain.
export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = Object.fromEntries(
  Object.entries(CURRENCY_META).map(([code, info]) => [code, { ...info }])
);

// ---------------------------------------------------------------------------
// Live rates: the server refreshes USD rates every 3 hours
// (server/currencyRates.ts) and serves them via GET /api/currency-rates.
// The built-in numbers above are only fallbacks until the first sync.
// ---------------------------------------------------------------------------
const RATES_CACHE_KEY = 'vex_currency_rates';

/** Rates from the last sync — covers EVERY code the server passes through. */
const LIVE_RATES: Record<string, number> = {};

function applyLiveRates(rates: Record<string, unknown>): void {
  for (const [code, raw] of Object.entries(rates)) {
    const v = Number(raw);
    if (!isFinite(v) || v <= 0) continue;
    const key = String(code).toUpperCase();
    LIVE_RATES[key] = v;
    if (SUPPORTED_CURRENCIES[key]) SUPPORTED_CURRENCIES[key].rateToUSD = v;
  }
}

// Hydrate synchronously from the last sync so conversions are current on first paint.
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(RATES_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.rates && typeof parsed.rates === 'object') applyLiveRates(parsed.rates);
    }
  } catch {
    // storage unavailable → built-in defaults still work
  }
}

/** Fetch the server's live rates and cache them (safe to call any time). */
export async function syncCurrencyRates(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch('/api/currency-rates');
    if (!res.ok) return;
    const data = await res.json();
    if (data?.rates && typeof data.rates === 'object') {
      applyLiveRates(data.rates);
      localStorage.setItem(
        RATES_CACHE_KEY,
        JSON.stringify({ updatedAt: data.updatedAt || new Date().toISOString(), rates: data.rates })
      );
    }
  } catch {
    // offline → keep cached / built-in rates
  }
}

/** Live rate if synced, else the built-in fallback. null = unknown currency. */
export function getCurrencyRate(code?: string | null): number | null {
  const key = String(code || '').trim().toUpperCase();
  if (!key) return null;
  const live = LIVE_RATES[key];
  if (isFinite(live) && live > 0) return live;
  const meta = SUPPORTED_CURRENCIES[key];
  return meta && meta.rateToUSD > 0 ? meta.rateToUSD : null;
}

export function convertCurrency(amountInUSD: number, targetCurrency: string): number {
  // Unknown currency → the platform default: Egyptian Pound.
  const rate = getCurrencyRate(targetCurrency) ?? getCurrencyRate('EGP') ?? 48.5;
  return amountInUSD * rate;
}

export function detectUserRegionalCurrency(serverCurrency?: string): string {
  // Server geo suggestion (from /api/geo) wins over tz/locale heuristics — manual user choice
  // is applied before this call and always passes through untouched by the caller.
  // Accept ANY code we can price (curated table OR synced live rates) so every
  // country's geo currency is honored, not just the settings-picker list.
  if (serverCurrency) {
    const code = serverCurrency.trim().toUpperCase();
    if (getCurrencyRate(code)) return code;
  }
  try {
    const locale = (navigator.language || '').toLowerCase();
    const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').toLowerCase();

    if (locale.includes('ar-eg') || tz.includes('cairo')) return 'EGP';
    if (locale.includes('ar-sa') || tz.includes('riyadh') || tz.includes('dubai') || tz.includes('doha') || tz.includes('kuwait') || tz.includes('bahrain') || tz.includes('muscat') || tz.includes('baghdad')) {
      if (locale.includes('kw') || tz.includes('kuwait')) return 'KWD';
      if (locale.includes('qa') || tz.includes('doha')) return 'QAR';
      if (locale.includes('bh') || tz.includes('bahrain')) return 'BHD';
      if (locale.includes('om') || tz.includes('muscat')) return 'OMR';
      if (locale.includes('iq') || tz.includes('baghdad')) return 'IQD';
      if (locale.includes('ae') || tz.includes('dubai')) return 'AED';
      return 'SAR';
    }
    if (locale.includes('ru') || tz.includes('moscow')) return 'RUB';
    if (
      locale.startsWith('de') ||
      locale.startsWith('fr') ||
      locale.startsWith('es') ||
      locale.startsWith('it') ||
      locale.startsWith('nl') ||
      locale.startsWith('pt') ||
      locale.startsWith('el') ||
      tz.includes('europe/')
    ) {
      return 'EUR';
    }
  } catch {
    // fallback
  }
  // Nothing detected → the platform default: Egyptian Pound.
  return 'EGP';
}

export function formatCurrency(amountInUSD: number, targetCurrency: string): string {
  const code = String(targetCurrency || 'EGP').trim().toUpperCase();
  const rate = getCurrencyRate(code);
  // Unknown currency (no table entry, no live rate yet) → platform default EGP.
  const effCode = rate ? code : 'EGP';
  const effRate = rate ?? getCurrencyRate('EGP') ?? 48.5;
  const converted = amountInUSD * effRate;

  const curr = SUPPORTED_CURRENCIES[effCode];
  if (curr) {
    if (effCode === 'RUB') {
      return `${Math.round(converted).toLocaleString()} ${curr.symbol}`;
    }
    return `${curr.symbol}${converted.toFixed(2)}`;
  }
  // Currency beyond the curated table (priced by synced live rates only).
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: effCode }).format(converted);
  } catch {
    return `${effCode} ${converted.toFixed(2)}`;
  }
}
