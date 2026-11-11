// ==============================================================================
// 💱 GEO CURRENCY — single source of truth for country → display currency.
// Shared by the SERVER (server/geoLocale.ts, server.ts, server/currencyRates.ts)
// and the CLIENT (src/utils/currency.ts). Pure data + pure functions only —
// safe to import from both bundles (no fs / no window access).
//
// Owner rules:
//   • Egypt → EGP (the platform default currency).
//   • Any other country → that country's own currency, on EVERY domain.
//   • A visitor's manual pick always wins (flagged vex_currency_manual in App.tsx).
//   • Unknown country / no geo → EGP.
// ==============================================================================

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  /** 1 USD = X Currency — fallback until the live rates sync (3h server-side). */
  rateToUSD: number;
  /** Shown in the settings currency picker (geo can still apply any code). */
  major?: boolean;
}

export const CURRENCY_META: Record<string, CurrencyInfo> = {
  // --- Platform default + globals ---
  EGP: { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', rateToUSD: 48.5, major: true },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', rateToUSD: 1.0, major: true },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', rateToUSD: 0.92, major: true },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', rateToUSD: 0.75, major: true },

  // --- Gulf / Levant / Iraq / Turkey / Iran ---
  SAR: { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', rateToUSD: 3.75, major: true },
  AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham', rateToUSD: 3.67, major: true },
  KWD: { code: 'KWD', symbol: 'KD', name: 'Kuwaiti Dinar', rateToUSD: 0.307, major: true },
  QAR: { code: 'QAR', symbol: 'QR', name: 'Qatari Riyal', rateToUSD: 3.64, major: true },
  BHD: { code: 'BHD', symbol: 'BD', name: 'Bahraini Dinar', rateToUSD: 0.376, major: true },
  OMR: { code: 'OMR', symbol: 'OMR', name: 'Omani Rial', rateToUSD: 0.385, major: true },
  IQD: { code: 'IQD', symbol: 'IQD', name: 'Iraqi Dinar', rateToUSD: 1310, major: true },
  JOD: { code: 'JOD', symbol: 'JD', name: 'Jordanian Dinar', rateToUSD: 0.709, major: true },
  LBP: { code: 'LBP', symbol: 'L£', name: 'Lebanese Pound', rateToUSD: 89500, major: true },
  SYP: { code: 'SYP', symbol: 'SY£', name: 'Syrian Pound', rateToUSD: 13000, major: true },
  ILS: { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', rateToUSD: 3.7, major: true },
  YER: { code: 'YER', symbol: 'YER', name: 'Yemeni Rial', rateToUSD: 250, major: true },
  TRY: { code: 'TRY', symbol: '₺', name: 'Turkish Lira', rateToUSD: 34, major: true },
  IRR: { code: 'IRR', symbol: 'IRR', name: 'Iranian Rial', rateToUSD: 42000 },

  // --- North Africa / Sahel ---
  SDG: { code: 'SDG', symbol: 'SDG', name: 'Sudanese Pound', rateToUSD: 600, major: true },
  LYD: { code: 'LYD', symbol: 'LD', name: 'Libyan Dinar', rateToUSD: 4.8, major: true },
  TND: { code: 'TND', symbol: 'TND', name: 'Tunisian Dinar', rateToUSD: 3.1, major: true },
  DZD: { code: 'DZD', symbol: 'DZD', name: 'Algerian Dinar', rateToUSD: 134, major: true },
  MAD: { code: 'MAD', symbol: 'MAD', name: 'Moroccan Dirham', rateToUSD: 9.9, major: true },
  MRU: { code: 'MRU', symbol: 'MRU', name: 'Mauritanian Ouguiya', rateToUSD: 39.5 },
  SOS: { code: 'SOS', symbol: 'SOS', name: 'Somali Shilling', rateToUSD: 571 },
  DJF: { code: 'DJF', symbol: 'DJF', name: 'Djiboutian Franc', rateToUSD: 177 },
  KMF: { code: 'KMF', symbol: 'KMF', name: 'Comorian Franc', rateToUSD: 455 },

  // --- Europe ---
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', rateToUSD: 0.88, major: true },
  NOK: { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', rateToUSD: 11, major: true },
  SEK: { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', rateToUSD: 10.5, major: true },
  DKK: { code: 'DKK', symbol: 'kr', name: 'Danish Krone', rateToUSD: 6.9, major: true },
  ISK: { code: 'ISK', symbol: 'kr', name: 'Icelandic Krona', rateToUSD: 137 },
  PLN: { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', rateToUSD: 4.0, major: true },
  CZK: { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', rateToUSD: 23.5, major: true },
  HUF: { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', rateToUSD: 380, major: true },
  RON: { code: 'RON', symbol: 'lei', name: 'Romanian Leu', rateToUSD: 4.6, major: true },
  BGN: { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev', rateToUSD: 1.8 },
  RSD: { code: 'RSD', symbol: 'RSD', name: 'Serbian Dinar', rateToUSD: 108 },
  BAM: { code: 'BAM', symbol: 'KM', name: 'Bosnian Mark', rateToUSD: 1.8 },
  MKD: { code: 'MKD', symbol: 'MKD', name: 'Macedonian Denar', rateToUSD: 56 },
  ALL: { code: 'ALL', symbol: 'ALL', name: 'Albanian Lek', rateToUSD: 95 },
  MDL: { code: 'MDL', symbol: 'MDL', name: 'Moldovan Leu', rateToUSD: 17.8 },
  UAH: { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia', rateToUSD: 41.5, major: true },
  BYN: { code: 'BYN', symbol: 'Br', name: 'Belarusian Ruble', rateToUSD: 3.2, major: true },
  RUB: { code: 'RUB', symbol: '₽', name: 'Russian Ruble', rateToUSD: 95, major: true },

  // --- Caucasus & Central Asia ---
  KZT: { code: 'KZT', symbol: '₸', name: 'Kazakhstani Tenge', rateToUSD: 520, major: true },
  UZS: { code: 'UZS', symbol: 'UZS', name: 'Uzbekistani Som', rateToUSD: 12600, major: true },
  AZN: { code: 'AZN', symbol: '₼', name: 'Azerbaijani Manat', rateToUSD: 1.7, major: true },
  GEL: { code: 'GEL', symbol: '₾', name: 'Georgian Lari', rateToUSD: 2.7, major: true },
  AMD: { code: 'AMD', symbol: 'AMD', name: 'Armenian Dram', rateToUSD: 387 },
  KGS: { code: 'KGS', symbol: 'KGS', name: 'Kyrgyzstani Som', rateToUSD: 87 },
  TJS: { code: 'TJS', symbol: 'TJS', name: 'Tajikistani Somoni', rateToUSD: 9.2 },
  TMT: { code: 'TMT', symbol: 'TMT', name: 'Turkmenistani Manat', rateToUSD: 3.5 },

  // --- Americas ---
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', rateToUSD: 1.38, major: true },
  MXN: { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso', rateToUSD: 17.2, major: true },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', rateToUSD: 5.6, major: true },
  ARS: { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso', rateToUSD: 1450 },
  CLP: { code: 'CLP', symbol: 'CLP$', name: 'Chilean Peso', rateToUSD: 950 },
  COP: { code: 'COP', symbol: 'COL$', name: 'Colombian Peso', rateToUSD: 3900 },
  PEN: { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', rateToUSD: 3.75 },
  UYU: { code: 'UYU', symbol: 'UYU', name: 'Uruguayan Peso', rateToUSD: 40 },
  PYG: { code: 'PYG', symbol: '₲', name: 'Paraguayan Guarani', rateToUSD: 7300 },
  BOB: { code: 'BOB', symbol: 'Bs', name: 'Bolivian Boliviano', rateToUSD: 6.9 },
  VES: { code: 'VES', symbol: 'Bs', name: 'Venezuelan Bolivar', rateToUSD: 45 },
  GYD: { code: 'GYD', symbol: 'G$', name: 'Guyanese Dollar', rateToUSD: 209 },
  SRD: { code: 'SRD', symbol: 'SRD', name: 'Surinamese Dollar', rateToUSD: 33 },
  GTQ: { code: 'GTQ', symbol: 'Q', name: 'Guatemalan Quetzal', rateToUSD: 7.7 },
  BZD: { code: 'BZD', symbol: 'BZ', name: 'Belize Dollar', rateToUSD: 2.0 },
  HNL: { code: 'HNL', symbol: 'L', name: 'Honduran Lempira', rateToUSD: 24.8 },
  NIO: { code: 'NIO', symbol: 'C$', name: 'Nicaraguan Cordoba', rateToUSD: 36.8 },
  CRC: { code: 'CRC', symbol: '₡', name: 'Costa Rican Colon', rateToUSD: 510 },
  PAB: { code: 'PAB', symbol: 'B/.', name: 'Panamanian Balboa', rateToUSD: 1 },
  CUP: { code: 'CUP', symbol: 'CU$', name: 'Cuban Peso', rateToUSD: 24 },
  DOP: { code: 'DOP', symbol: 'RD$', name: 'Dominican Peso', rateToUSD: 59 },
  HTG: { code: 'HTG', symbol: 'G', name: 'Haitian Gourde', rateToUSD: 131 },
  JMD: { code: 'JMD', symbol: 'J$', name: 'Jamaican Dollar', rateToUSD: 156 },
  TTD: { code: 'TTD', symbol: 'TT$', name: 'Trinidad Dollar', rateToUSD: 6.8 },
  BBD: { code: 'BBD', symbol: 'Bds$', name: 'Barbadian Dollar', rateToUSD: 2 },
  BSD: { code: 'BSD', symbol: 'B$', name: 'Bahamian Dollar', rateToUSD: 1 },
  AWG: { code: 'AWG', symbol: 'Aƒ', name: 'Aruban Florin', rateToUSD: 1.79 },
  KYD: { code: 'KYD', symbol: 'CI$', name: 'Cayman Dollar', rateToUSD: 0.83 },
  BMD: { code: 'BMD', symbol: 'BD$', name: 'Bermudian Dollar', rateToUSD: 1 },
  XCD: { code: 'XCD', symbol: 'EC$', name: 'East Caribbean Dollar', rateToUSD: 2.7 },
  XCG: { code: 'XCG', symbol: 'XCG', name: 'Caribbean Guilder', rateToUSD: 1.79 },
  FKP: { code: 'FKP', symbol: 'FK£', name: 'Falkland Pound', rateToUSD: 0.75 },

  // --- Asia ---
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', rateToUSD: 88, major: true },
  PKR: { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', rateToUSD: 280, major: true },
  BDT: { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', rateToUSD: 121, major: true },
  LKR: { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', rateToUSD: 300 },
  NPR: { code: 'NPR', symbol: 'NPR', name: 'Nepalese Rupee', rateToUSD: 141 },
  MVR: { code: 'MVR', symbol: 'Rf', name: 'Maldivian Rufiyaa', rateToUSD: 15.4 },
  AFN: { code: 'AFN', symbol: 'AFN', name: 'Afghani', rateToUSD: 70 },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', rateToUSD: 7.1, major: true },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rateToUSD: 150, major: true },
  KRW: { code: 'KRW', symbol: '₩', name: 'South Korean Won', rateToUSD: 1400, major: true },
  TWD: { code: 'TWD', symbol: 'NT$', name: 'New Taiwan Dollar', rateToUSD: 30 },
  HKD: { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', rateToUSD: 7.8 },
  MOP: { code: 'MOP', symbol: 'MOP', name: 'Macau Pataca', rateToUSD: 8 },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', rateToUSD: 1.29, major: true },
  MYR: { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', rateToUSD: 4.2, major: true },
  THB: { code: 'THB', symbol: '฿', name: 'Thai Baht', rateToUSD: 32, major: true },
  VND: { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', rateToUSD: 26300, major: true },
  IDR: { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', rateToUSD: 16500, major: true },
  PHP: { code: 'PHP', symbol: '₱', name: 'Philippine Peso', rateToUSD: 58, major: true },
  MMK: { code: 'MMK', symbol: 'K', name: 'Myanmar Kyat', rateToUSD: 2100 },
  LAK: { code: 'LAK', symbol: 'LAK', name: 'Lao Kip', rateToUSD: 21500 },
  KHR: { code: 'KHR', symbol: 'KHR', name: 'Cambodian Riel', rateToUSD: 4050 },
  BND: { code: 'BND', symbol: 'B$', name: 'Brunei Dollar', rateToUSD: 1.29 },
  MNT: { code: 'MNT', symbol: '₮', name: 'Mongolian Tugrik', rateToUSD: 3400 },
  KPW: { code: 'KPW', symbol: '₩', name: 'North Korean Won', rateToUSD: 900 },

  // --- Africa ---
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', rateToUSD: 1500, major: true },
  GHS: { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi', rateToUSD: 12.5, major: true },
  KES: { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', rateToUSD: 129, major: true },
  UGX: { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', rateToUSD: 3650, major: true },
  TZS: { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', rateToUSD: 2600, major: true },
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand', rateToUSD: 17.3, major: true },
  ETB: { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr', rateToUSD: 135 },
  RWF: { code: 'RWF', symbol: 'RWF', name: 'Rwandan Franc', rateToUSD: 1440 },
  BIF: { code: 'BIF', symbol: 'FBu', name: 'Burundian Franc', rateToUSD: 2900 },
  ZMW: { code: 'ZMW', symbol: 'ZK', name: 'Zambian Kwacha', rateToUSD: 24 },
  MWK: { code: 'MWK', symbol: 'MK', name: 'Malawian Kwacha', rateToUSD: 1730 },
  MZN: { code: 'MZN', symbol: 'MT', name: 'Mozambican Metical', rateToUSD: 63.6 },
  AOA: { code: 'AOA', symbol: 'Kz', name: 'Angolan Kwanza', rateToUSD: 920 },
  CDF: { code: 'CDF', symbol: 'FC', name: 'Congolese Franc', rateToUSD: 2850 },
  XAF: { code: 'XAF', symbol: 'FCFA', name: 'Central African Franc', rateToUSD: 570 },
  XOF: { code: 'XOF', symbol: 'CFA', name: 'West African Franc', rateToUSD: 570 },
  GNF: { code: 'GNF', symbol: 'GNF', name: 'Guinean Franc', rateToUSD: 8650 },
  SLE: { code: 'SLE', symbol: 'Le', name: 'Sierra Leonean Leone', rateToUSD: 23 },
  LRD: { code: 'LRD', symbol: 'L$', name: 'Liberian Dollar', rateToUSD: 195 },
  SSP: { code: 'SSP', symbol: 'SSP', name: 'South Sudanese Pound', rateToUSD: 4500 },
  ERN: { code: 'ERN', symbol: 'Nfk', name: 'Eritrean Nakfa', rateToUSD: 15 },
  MGA: { code: 'MGA', symbol: 'Ar', name: 'Malagasy Ariary', rateToUSD: 4450 },
  MUR: { code: 'MUR', symbol: 'Rs', name: 'Mauritian Rupee', rateToUSD: 46 },
  SCR: { code: 'SCR', symbol: 'SR', name: 'Seychellois Rupee', rateToUSD: 13.5 },
  ZWG: { code: 'ZWG', symbol: 'ZiG', name: 'Zimbabwe Gold', rateToUSD: 24 },
  NAD: { code: 'NAD', symbol: 'N$', name: 'Namibian Dollar', rateToUSD: 17.3 },
  LSL: { code: 'LSL', symbol: 'L', name: 'Lesotho Loti', rateToUSD: 17.3 },
  SZL: { code: 'SZL', symbol: 'L', name: 'Swazi Lilangeni', rateToUSD: 17.3 },
  BWP: { code: 'BWP', symbol: 'P', name: 'Botswana Pula', rateToUSD: 13.3 },
  CVE: { code: 'CVE', symbol: '$', name: 'Cape Verdean Escudo', rateToUSD: 101 },
  STN: { code: 'STN', symbol: 'Db', name: 'Sao Tome Dobra', rateToUSD: 22.6 },
  GMD: { code: 'GMD', symbol: 'D', name: 'Gambian Dalasi', rateToUSD: 71 },

  // --- Oceania ---
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', rateToUSD: 1.52, major: true },
  NZD: { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', rateToUSD: 1.7, major: true },
  FJD: { code: 'FJD', symbol: 'FJ$', name: 'Fijian Dollar', rateToUSD: 2.25 },
  PGK: { code: 'PGK', symbol: 'K', name: 'Papua New Guinean Kina', rateToUSD: 4.1 },
  VUV: { code: 'VUV', symbol: 'VT', name: 'Vanuatu Vatu', rateToUSD: 119 },
  SBD: { code: 'SBD', symbol: 'SI$', name: 'Solomon Dollar', rateToUSD: 8.4 },
  XPF: { code: 'XPF', symbol: '₣', name: 'CFP Franc', rateToUSD: 110 },
  WST: { code: 'WST', symbol: 'WS$', name: 'Samoan Tala', rateToUSD: 2.7 },
  TOP: { code: 'TOP', symbol: 'T$', name: 'Tongan Paanga', rateToUSD: 2.3 },
};

// ISO 3166-1 alpha-2 → ISO 4217 display currency. Covers every country and
// common territory, so a visitor always sees the currency of the country they
// entered from — on every domain. Unknown / missing → EGP (platform default).
export const COUNTRY_CURRENCY: Record<string, string> = {
  // Arab world & Middle East
  EG: 'EGP', SA: 'SAR', AE: 'AED', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR',
  IQ: 'IQD', JO: 'JOD', LB: 'LBP', SY: 'SYP', YE: 'YER', PS: 'ILS', IL: 'ILS',
  IR: 'IRR', TR: 'TRY', SD: 'SDG', LY: 'LYD', TN: 'TND', DZ: 'DZD', MA: 'MAD',
  EH: 'MAD', MR: 'MRU', SO: 'SOS', DJ: 'DJF', KM: 'KMF',
  // Europe — euro area + microstates
  DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', PT: 'EUR', GR: 'EUR',
  BE: 'EUR', AT: 'EUR', IE: 'EUR', FI: 'EUR', SK: 'EUR', SI: 'EUR', LT: 'EUR',
  LV: 'EUR', EE: 'EUR', LU: 'EUR', CY: 'EUR', MT: 'EUR', HR: 'EUR', MC: 'EUR',
  AD: 'EUR', SM: 'EUR', VA: 'EUR', XK: 'EUR', ME: 'EUR', RE: 'EUR', YT: 'EUR',
  // Europe — other currencies
  GB: 'GBP', CH: 'CHF', NO: 'NOK', SE: 'SEK', DK: 'DKK', IS: 'ISK', PL: 'PLN',
  CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN', RS: 'RSD', BA: 'BAM', MK: 'MKD',
  AL: 'ALL', MD: 'MDL', UA: 'UAH', BY: 'BYN', RU: 'RUB', IM: 'GBP', JE: 'GBP',
  GG: 'GBP', FO: 'DKK', GL: 'DKK',
  // Caucasus & Central Asia
  KZ: 'KZT', UZ: 'UZS', GE: 'GEL', AM: 'AMD', AZ: 'AZN', KG: 'KGS', TJ: 'TJS',
  TM: 'TMT',
  // Americas — north / central / caribbean
  US: 'USD', CA: 'CAD', MX: 'MXN', GT: 'GTQ', BZ: 'BZD', SV: 'USD', HN: 'HNL',
  NI: 'NIO', CR: 'CRC', PA: 'PAB', CU: 'CUP', DO: 'DOP', HT: 'HTG', JM: 'JMD',
  TT: 'TTD', BB: 'BBD', BS: 'BSD', PR: 'USD', AW: 'AWG', KY: 'KYD', BM: 'BMD',
  VC: 'XCD', AG: 'XCD', DM: 'XCD', KN: 'XCD', LC: 'XCD', GD: 'XCD', MS: 'XCD',
  AI: 'XCD', VG: 'USD', BQ: 'USD', CW: 'XCG', SX: 'XCG', TC: 'USD',
  // Americas — south
  BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN', UY: 'UYU', PY: 'PYG',
  BO: 'BOB', EC: 'USD', VE: 'VES', GY: 'GYD', SR: 'SRD', GF: 'EUR', FK: 'FKP',
  // Asia
  IN: 'INR', PK: 'PKR', BD: 'BDT', LK: 'LKR', NP: 'NPR', MV: 'MVR', AF: 'AFN',
  CN: 'CNY', JP: 'JPY', KR: 'KRW', TW: 'TWD', HK: 'HKD', MO: 'MOP', SG: 'SGD',
  MY: 'MYR', TH: 'THB', VN: 'VND', ID: 'IDR', PH: 'PHP', MM: 'MMK', LA: 'LAK',
  KH: 'KHR', BN: 'BND', TL: 'USD', MN: 'MNT', KP: 'KPW',
  // Africa
  NG: 'NGN', GH: 'GHS', KE: 'KES', UG: 'UGX', TZ: 'TZS', ZA: 'ZAR', ET: 'ETB',
  RW: 'RWF', BI: 'BIF', ZM: 'ZMW', MW: 'MWK', MZ: 'MZN', AO: 'AOA', CD: 'CDF',
  CG: 'XAF', CM: 'XAF', GA: 'XAF', GQ: 'XAF', CF: 'XAF', TD: 'XAF', NE: 'XOF',
  BF: 'XOF', CI: 'XOF', SN: 'XOF', ML: 'XOF', TG: 'XOF', BJ: 'XOF', GW: 'XOF',
  GN: 'GNF', SL: 'SLE', LR: 'LRD', SS: 'SSP', ER: 'ERN', MG: 'MGA', MU: 'MUR',
  SC: 'SCR', ZW: 'ZWG', NA: 'NAD', LS: 'LSL', SZ: 'SZL', BW: 'BWP', CV: 'CVE',
  ST: 'STN', GM: 'GMD',
  // Oceania
  AU: 'AUD', NZ: 'NZD', FJ: 'FJD', PG: 'PGK', VU: 'VUV', SB: 'SBD', NC: 'XPF',
  PF: 'XPF', WS: 'WST', TO: 'TOP', KI: 'AUD', TV: 'AUD', NR: 'AUD', FM: 'USD',
  MH: 'USD', PW: 'USD', CK: 'NZD', NU: 'NZD', TK: 'NZD', AS: 'USD', GU: 'USD',
  MP: 'USD', WF: 'XPF',
};

/** Country ISO → display currency. Unknown / no geo → EGP (platform default). */
export function currencyForCountry(iso: string | undefined | null): string {
  const code = String(iso || '').trim().toUpperCase();
  if (!code || code === 'GLOBAL') return 'EGP';
  return COUNTRY_CURRENCY[code] || 'EGP';
}
