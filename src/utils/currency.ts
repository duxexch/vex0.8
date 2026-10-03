export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  rateToUSD: number; // 1 USD = X Currency
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', rateToUSD: 1.0 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', rateToUSD: 0.92 },
  RUB: { code: 'RUB', symbol: '₽', name: 'Russian Ruble', rateToUSD: 95.0 },
  EGP: { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', rateToUSD: 48.5 },
  SAR: { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', rateToUSD: 3.75 },
};

export function convertCurrency(amountInUSD: number, targetCurrency: string): number {
  const curr = SUPPORTED_CURRENCIES[targetCurrency] || SUPPORTED_CURRENCIES['USD'];
  return amountInUSD * curr.rateToUSD;
}

export function detectUserRegionalCurrency(): string {
  try {
    const locale = (navigator.language || '').toLowerCase();
    const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').toLowerCase();

    if (locale.includes('ar-eg') || tz.includes('cairo')) return 'EGP';
    if (locale.includes('ar-sa') || tz.includes('riyadh')) return 'SAR';
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
  return 'USD';
}

export function formatCurrency(amountInUSD: number, targetCurrency: string): string {
  const curr = SUPPORTED_CURRENCIES[targetCurrency] || SUPPORTED_CURRENCIES['USD'];
  const converted = convertCurrency(amountInUSD, targetCurrency);
  
  if (targetCurrency === 'RUB') {
    return `${Math.round(converted).toLocaleString()} ${curr.symbol}`;
  }
  return `${curr.symbol}${converted.toFixed(2)}`;
}
