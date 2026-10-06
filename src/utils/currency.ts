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
  AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham', rateToUSD: 3.67 },
  KWD: { code: 'KWD', symbol: 'KD', name: 'Kuwaiti Dinar', rateToUSD: 0.307 },
  QAR: { code: 'QAR', symbol: 'QR', name: 'Qatari Riyal', rateToUSD: 3.64 },
  BHD: { code: 'BHD', symbol: 'BD', name: 'Bahraini Dinar', rateToUSD: 0.376 },
  OMR: { code: 'OMR', symbol: 'OMR', name: 'Omani Rial', rateToUSD: 0.385 },
  IQD: { code: 'IQD', symbol: 'IQD', name: 'Iraqi Dinar', rateToUSD: 1310 },
};

export function convertCurrency(amountInUSD: number, targetCurrency: string): number {
  const curr = SUPPORTED_CURRENCIES[targetCurrency] || SUPPORTED_CURRENCIES['USD'];
  return amountInUSD * curr.rateToUSD;
}

export function detectUserRegionalCurrency(serverCurrency?: string): string {
  // Server geo suggestion (from /api/geo) wins over tz/locale heuristics — manual user choice
  // is applied before this call and always passes through untouched by the caller.
  if (serverCurrency && SUPPORTED_CURRENCIES[serverCurrency]) {
    return serverCurrency;
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
