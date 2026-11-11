import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Live exchange rates for the client's display currencies.
// Refreshed every 3 hours by startCurrencyRateScheduler() (wired in server.ts)
// and served to the app through GET /api/currency-rates.
// ---------------------------------------------------------------------------

const DATA_FILE = path.join(process.cwd(), 'data', 'currency-rates.json');
const REFRESH_MS = 3 * 60 * 60 * 1000; // 3 hours

// Codes that MUST be present for a provider response to be trusted. Every other
// sane rate the provider returns is passed through, so ANY country's currency
// (src/data/geoCurrency.ts) prices itself without touching this list.
const CORE_CODES = ['USD', 'EGP', 'EUR', 'GBP', 'RUB', 'SAR'];

export interface CurrencyRatesFile {
  updatedAt: string;
  rates: Record<string, number>;
  source?: string;
}

let cached: CurrencyRatesFile | null = null;

function readStore(): CurrencyRatesFile | null {
  if (cached) return cached;
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.rates && typeof parsed.rates === 'object') {
      cached = parsed as CurrencyRatesFile;
    }
  } catch {
    // no file yet (first boot) — caller falls back to built-in defaults
  }
  return cached;
}

/** Every core code must come back as a sane positive number, else reject. */
function normalize(rates: Record<string, unknown>): Record<string, number> | null {
  if (!rates || typeof rates !== 'object') return null;
  const out: Record<string, number> = { USD: 1 };
  const pick = (code: string): number | null => {
    const direct = Number((rates as Record<string, unknown>)[code]);
    if (isFinite(direct) && direct > 0) return direct;
    const lower = Number((rates as Record<string, unknown>)[code.toLowerCase()]);
    return isFinite(lower) && lower > 0 ? lower : null;
  };
  for (const code of CORE_CODES) {
    if (code === 'USD') continue;
    const v = pick(code);
    if (v === null) return null;
    out[code] = v;
  }
  // Pass through every other valid rate (lowercase keys from the jsdelivr
  // source included) — geo currencies beyond the curated table then convert
  // with live numbers instead of falling back.
  for (const [key, raw] of Object.entries(rates)) {
    const v = Number(raw);
    const code = String(key).toUpperCase();
    if (!out[code] && /^[A-Z]{3}$/.test(code) && isFinite(v) && v > 0) out[code] = v;
  }
  return out;
}

async function fetchJson(url: string, timeoutMs = 8000): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { accept: 'application/json', 'user-agent': 'VEX-Deals/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pull fresh USD rates from a free no-key provider (with one fallback) and
 * persist them to data/currency-rates.json. Never throws: on total failure the
 * previously stored rates are kept so the app keeps converting correctly.
 */
export async function refreshCurrencyRates(): Promise<CurrencyRatesFile | null> {
  const sources: Array<{ name: string; url: string; pick: (json: any) => Record<string, unknown> }> = [
    {
      name: 'open.er-api.com',
      url: 'https://open.er-api.com/v6/latest/USD',
      pick: (json) => json?.rates,
    },
    {
      name: 'currency-api (jsdelivr)',
      url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/usd.json',
      pick: (json) => json?.usd,
    },
  ];

  for (const src of sources) {
    try {
      const json = await fetchJson(src.url);
      const rates = normalize(src.pick(json) || {});
      if (!rates) continue;
      const file: CurrencyRatesFile = {
        updatedAt: new Date().toISOString(),
        rates,
        source: src.name,
      };
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(file));
      cached = file;
      console.log(
        `💱 [Currency] rates refreshed via ${src.name} (USD→EGP ${rates.EGP}, USD→EUR ${rates.EUR})`
      );
      return file;
    } catch (err) {
      console.warn(
        `[Currency] source ${src.name} failed:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  console.error('[Currency] all rate sources failed — keeping previous rates');
  return readStore();
}

export function getCurrencyRates(): CurrencyRatesFile | null {
  return readStore();
}

/** First refresh shortly after boot, then every 3 hours. */
export function startCurrencyRateScheduler(): void {
  setTimeout(() => {
    void refreshCurrencyRates();
  }, 6000);
  setInterval(() => {
    void refreshCurrencyRates();
  }, REFRESH_MS);
}
