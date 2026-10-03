import { Company, Language } from '../types';

// Professional iGaming & Sportsbook multilingual dictionary (Arabic -> EN, ES, RU)
const DICTIONARY: Record<string, { en: string; es: string; ru: string }> = {
  // General platform & company terms
  'شركة مراهنات رياضية شريكة': {
    en: 'Official Sports Betting Partner Platform',
    es: 'Plataforma oficial de apuestas deportivas asociada',
    ru: 'Официальная партнерская платформа ставок на спорт',
  },
  'منصة مراهنات رياضية': {
    en: 'Sports Betting Platform',
    es: 'Plataforma de apuestas deportivas',
    ru: 'Платформа ставок на спорт',
  },
  'أكبر منصات المراهنات الرياضية والألعاب': {
    en: 'Leading sports betting & gaming platform with fast payouts',
    es: 'Plataforma líder de apuestas deportivas y juegos con pagos rápidos',
    ru: 'Ведущая платформа ставок на спорт и игр с быстрыми выплатами',
  },
  'أكبر شركات المراهنة عالمياً بعروض دورية وسرعة فائقة في السحب والإيداع': {
    en: 'Global betting leader with regular offers and ultra-fast deposits and withdrawals',
    es: 'Líder mundial en apuestas con ofertas regulares y depósitos/retiros ultrarrápidos',
    ru: 'Мировой лидер ставок с регулярными акциями и мгновенными выплатами',
  },
  'بونص ترحيبي 130%': {
    en: '130% Welcome Bonus',
    es: 'Bono de bienvenida del 130%',
    ru: 'Приветственный бонус 130%',
  },
  'بونص ترحيبي 100%': {
    en: '100% Welcome Bonus',
    es: 'Bono de bienvenida del 100%',
    ru: 'Приветственный бонус 100%',
  },
  'بونص ترحيبي 125%': {
    en: '125% Welcome Bonus',
    es: 'Bono de bienvenida del 125%',
    ru: 'Приветственный бонус 125%',
  },
  'بونص ترحيبي 200%': {
    en: '200% Welcome Bonus',
    es: 'Bono de bienvenida del 200%',
    ru: 'Приветственный бонус 200%',
  },
  'استرداد يصل لـ 100% + بونص 130%': {
    en: 'Refund up to 100% + 130% Deposit Bonus',
    es: 'Reembolso hasta 100% + Bono del 130%',
    ru: 'Возврат до 100% + Бонус 130%',
  },
  'مضاعفة الإيداع الأول': {
    en: 'Double First Deposit',
    es: 'Doble en el primer depósito',
    ru: 'Удвоение первого депозита',
  },
  'فك تجميد يومي 10% + كاش باك أسبوعي': {
    en: '10% Daily Unfreeze + Weekly Cashback',
    es: '10% desbloqueo diario + Cashback semanal',
    ru: '10% ежедневная разморозка + еженедельный кэшбэк',
  },
  'النادي الملكي للكاش باك': {
    en: 'Royal Cashback Club',
    es: 'Club Real de Cashback',
    ru: 'Королевский VIP кэшбэк клуб',
  },
  'تعويض فوري + تحويلات PIN آمنة': {
    en: 'Instant Compensation + Secure PIN Transfers',
    es: 'Compensación instantánea + Transferencias PIN seguras',
    ru: 'Мгновенная компенсация + безопасные PIN-переводы',
  },
  '125% بونص إيداع + تأمين التذاكر المجمعة': {
    en: '125% Deposit Bonus + Accumulator Bet Insurance',
    es: '125% Bono de depósito + Seguro de apuestas combinadas',
    ru: '125% бонус на депозит + страховка экспресс-ставок',
  },
  'أعلى كاش باك + تحليلات AI': {
    en: 'Top Cashback + AI Analytics',
    es: 'Máximo Cashback + Análisis IA',
    ru: 'Максимальный кэшбэк + ИИ-аналитика',
  },
  'أعلى استرداد كاش باك + تأمين الحساب': {
    en: 'Highest Cashback Rebate + Account Insurance',
    es: 'Mayor reembolso de cashback + Seguro de cuenta',
    ru: 'Высочайший кэшбэк + страхование счета',
  },
  'أمان مصرفي + سحوبات أسبوعية': {
    en: 'Bank-Grade Security + Weekly Prize Draws',
    es: 'Seguridad bancaria + Sorteos semanales',
    ru: 'Банковская безопасность + еженедельные розыгрыши',
  },
  'تشفير بنكي كامل + دعم متواصل 24/7': {
    en: 'Full Banking Encryption + 24/7 Support',
    es: 'Cifrado bancario completo + Soporte 24/7',
    ru: 'Банковское шифрование + поддержка 24/7',
  },
  'كاش باك يصل لـ 100% وبونص ترحيبي': {
    en: 'Cashback up to 100% and Welcome Bonus',
    es: 'Cashback hasta 100% y Bono de bienvenida',
    ru: 'Кэшбэк до 100% и приветственный бонус',
  },
  'كاش باك يومي وتأمين خسائر': {
    en: 'Daily Cashback & Loss Insurance',
    es: 'Cashback diario y seguro de pérdidas',
    ru: 'Ежедневный кэшбэк и страхование убытков',
  },
  'استرداد خسائر فوري': {
    en: 'Instant Loss Compensation',
    es: 'Compensación instantánea de pérdidas',
    ru: 'Мгновенная компенсация убытков',
  },
  'تأمين شامل على الرهانات الرياضية': {
    en: 'Comprehensive Sports Bet Insurance',
    es: 'Seguro integral de apuestas deportivas',
    ru: 'Полная страховка спортивных ставок',
  },
  'سحب فوري لكافة المحافظ': {
    en: 'Instant Withdrawals to All Wallets',
    es: 'Retiros instantáneos a todas las billeteras',
    ru: 'Мгновенный вывод на все кошельки',
  },
  'سحب وإيداع فوري ودعم متواصل': {
    en: 'Instant Deposits/Withdrawals & Continuous Support',
    es: 'Depósitos/retiros instantáneos y soporte continuo',
    ru: 'Мгновенный ввод/вывод и круглосуточная поддержка',
  },
};

/**
 * Robust translation engine for dynamic company fields
 */
function translateDynamicArabicText(text: string, targetLang: 'en' | 'es' | 'ru'): string {
  if (!text || !text.trim()) return '';

  const cleanText = text.trim();

  // Check exact dictionary match
  if (DICTIONARY[cleanText] && DICTIONARY[cleanText][targetLang]) {
    return DICTIONARY[cleanText][targetLang];
  }

  // Check partial dictionary matches
  for (const [arKey, translations] of Object.entries(DICTIONARY)) {
    if (cleanText.includes(arKey) || arKey.includes(cleanText)) {
      return translations[targetLang];
    }
  }

  // Extract percentage numbers like 100%, 130%, 10%
  const percentMatch = cleanText.match(/(\d+)\s*%/);
  const percent = percentMatch ? percentMatch[1] : null;

  // Domain rule based translations
  if (cleanText.includes('كاش باك') || cleanText.includes('استرداد') || cleanText.includes('تعويض')) {
    if (targetLang === 'en') {
      return percent
        ? `Rebate & Cashback up to ${percent}% with official VEX coverage`
        : 'Rebate, VIP Cashback & Instant Loss Compensation';
    }
    if (targetLang === 'es') {
      return percent
        ? `Reembolso y Cashback de hasta ${percent}% con cobertura oficial VEX`
        : 'Reembolso, Cashback VIP y Compensación de pérdidas';
    }
    if (targetLang === 'ru') {
      return percent
        ? `Кэшбэк и компенсация до ${percent}% с официальной гарантией VEX`
        : 'Кэшбэк, VIP возврат и мгновенная компенсация убытков';
    }
  }

  if (cleanText.includes('بونص') || cleanText.includes('مكافأة') || cleanText.includes('ترحيب')) {
    if (targetLang === 'en') {
      return percent ? `${percent}% Welcome Deposit Bonus` : 'Welcome Bonus Package & First Deposit Match';
    }
    if (targetLang === 'es') {
      return percent ? `Bono de bienvenida del ${percent}%` : 'Paquete de bono de bienvenida y depósito';
    }
    if (targetLang === 'ru') {
      return percent ? `Приветственный бонус ${percent}%` : 'Приветственный бонусный пакет на депозит';
    }
  }

  if (cleanText.includes('أمان') || cleanText.includes('تشفير') || cleanText.includes('سحب')) {
    if (targetLang === 'en') return 'High-Speed Payouts, Bank-Grade Encryption & 24/7 VIP Support';
    if (targetLang === 'es') return 'Pagos de alta velocidad, cifrado bancario y soporte VIP 24/7';
    if (targetLang === 'ru') return 'Быстрые выплаты, банковское шифрование и VIP поддержка 24/7';
  }

  // Fallback transliteration / translation
  if (targetLang === 'en') {
    return cleanText.replace(/[\u0600-\u06FF]/g, '').trim() || `Official Partner Platform - ${cleanText}`;
  }
  if (targetLang === 'es') {
    return cleanText.replace(/[\u0600-\u06FF]/g, '').trim() || `Plataforma asociada oficial - ${cleanText}`;
  }
  if (targetLang === 'ru') {
    return cleanText.replace(/[\u0600-\u06FF]/g, '').trim() || `Официальная партнерская платформа - ${cleanText}`;
  }

  return cleanText;
}

/**
 * Automatically translates and enriches any newly added or edited Company object
 * so that all languages (ar, en, es, ru) are populated seamlessly.
 */
export function autoTranslateCompany(input: Partial<Company>): Company {
  const name = (input.name || 'NEW BOOKMAKER').trim();
  const rawArName = input.name_ar || name;
  const rawDesc = input.description || input.details || 'منصة مراهنات رياضية شريكة';
  const rawDetails = input.details || rawDesc;
  const rawBadge = input.badge || 'كاش باك يصل لـ 100%';
  const rawBonus = input.bonus_text || 'استرداد خسائر فوري + فك تجميد الرصيد';

  const company: Company = {
    id: input.id || `CMP${Date.now().toString(36).toUpperCase()}`,
    name: name.toUpperCase(),
    name_ar: rawArName,
    name_en: input.name_en || name.toUpperCase(),
    name_es: input.name_es || name.toUpperCase(),
    name_ru: input.name_ru || name.toUpperCase(),
    type: input.type || 'both',
    is_active: input.is_active !== undefined ? input.is_active : true,
    promo_code: (input.promo_code || 'vexdeals').trim(),
    affiliate_link: input.affiliate_link || `https://${name.toLowerCase()}.com`,
    app_link: input.app_link || `https://${name.toLowerCase()}.com/app`,
    color: input.color || '#0d579b',
    show_in_comp: input.show_in_comp !== undefined ? input.show_in_comp : true,
    logo_url: input.logo_url || '',

    // Arabic
    description: rawDesc,
    details: rawDetails,
    badge: rawBadge,
    bonus_text: rawBonus,

    // English
    description_en: input.description_en || translateDynamicArabicText(rawDesc, 'en'),
    details_en: input.details_en || translateDynamicArabicText(rawDetails, 'en'),
    badge_en: input.badge_en || translateDynamicArabicText(rawBadge, 'en'),
    bonus_text_en: input.bonus_text_en || translateDynamicArabicText(rawBonus, 'en'),

    // Spanish
    description_es: input.description_es || translateDynamicArabicText(rawDesc, 'es'),
    details_es: input.details_es || translateDynamicArabicText(rawDetails, 'es'),
    badge_es: input.badge_es || translateDynamicArabicText(rawBadge, 'es'),
    bonus_text_es: input.bonus_text_es || translateDynamicArabicText(rawBonus, 'es'),

    // Russian
    description_ru: input.description_ru || translateDynamicArabicText(rawDesc, 'ru'),
    details_ru: input.details_ru || translateDynamicArabicText(rawDetails, 'ru'),
    badge_ru: input.badge_ru || translateDynamicArabicText(rawBadge, 'ru'),
    bonus_text_ru: input.bonus_text_ru || translateDynamicArabicText(rawBonus, 'ru'),
  };

  return company;
}

/**
 * Returns localized strings for any Company based on current Language (ar, en, es, ru)
 */
export function getLocalizedCompany(
  company: Company,
  lang: Language
): {
  name: string;
  description: string;
  details: string;
  badge: string;
  bonus_text: string;
} {
  if (lang === 'ar') {
    return {
      name: company.name_ar || company.name,
      description: company.description || 'أفضل عروض الكاش باك والتعويضات',
      details: company.details || company.description || '',
      badge: company.badge || 'كاش باك معتمد',
      bonus_text: company.bonus_text || 'تعويض خسائر فوري',
    };
  }

  if (lang === 'ru') {
    return {
      name: company.name_ru || company.name,
      description:
        company.description_ru ||
        translateDynamicArabicText(company.description, 'ru') ||
        'Лучшие предложения кэшбэка и компенсаций',
      details:
        company.details_ru ||
        translateDynamicArabicText(company.details || company.description, 'ru') ||
        '',
      badge:
        company.badge_ru ||
        translateDynamicArabicText(company.badge || '', 'ru') ||
        'Проверенный кэшбэк',
      bonus_text:
        company.bonus_text_ru ||
        translateDynamicArabicText(company.bonus_text || '', 'ru') ||
        'Мгновенный возврат средств',
    };
  }

  if (lang === 'es') {
    return {
      name: company.name_es || company.name,
      description:
        company.description_es ||
        translateDynamicArabicText(company.description, 'es') ||
        'Mejores ofertas de cashback y reembolsos',
      details:
        company.details_es ||
        translateDynamicArabicText(company.details || company.description, 'es') ||
        '',
      badge:
        company.badge_es ||
        translateDynamicArabicText(company.badge || '', 'es') ||
        'Cashback verificado',
      bonus_text:
        company.bonus_text_es ||
        translateDynamicArabicText(company.bonus_text || '', 'es') ||
        'Reembolso instantáneo',
    };
  }

  // Default: English ('en')
  return {
    name: company.name_en || company.name,
    description:
      company.description_en ||
      translateDynamicArabicText(company.description, 'en') ||
      'Top cashback and compensation offers',
    details:
      company.details_en ||
      translateDynamicArabicText(company.details || company.description, 'en') ||
      '',
    badge:
      company.badge_en ||
      translateDynamicArabicText(company.badge || '', 'en') ||
      'Verified Cashback',
    bonus_text:
      company.bonus_text_en ||
      translateDynamicArabicText(company.bonus_text || '', 'en') ||
      'Instant Compensation',
  };
}

/**
 * Recursive translation mapper that traverses company objects and arrays
 * and applies localized properties for the specified language.
 */
export function recursiveLocalizeCompanies<T>(data: T, lang: Language): T {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map((item) => recursiveLocalizeCompanies(item, lang)) as unknown as T;
  }

  if (typeof data === 'object') {
    // Check if this object is a Company
    const obj = data as Record<string, any>;
    if (obj.id && (obj.promo_code !== undefined || obj.affiliate_link !== undefined)) {
      const localized = getLocalizedCompany(obj as Company, lang);
      return {
        ...obj,
        name: localized.name,
        description: localized.description,
        details: localized.details,
        badge: localized.badge,
        bonus_text: localized.bonus_text,
      } as unknown as T;
    }

    const cloned: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      cloned[key] = recursiveLocalizeCompanies(val, lang);
    }
    return cloned as T;
  }

  return data;
}
