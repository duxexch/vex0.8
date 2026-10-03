export interface BrandThemeConfig {
  companyId: string;
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  gradient: string;
  cardBorderColor: string;
  appNameAr: string;
  appNameEn: string;
  taglineAr: string;
  taglineEn: string;
  heroBadgeAr: string;
  heroBadgeEn: string;
  exclusivePerksAr: string[];
  exclusivePerksEn: string[];
}

export const COMPANY_THEMES: Record<string, BrandThemeConfig> = {
  // 1XBET
  CMP1XB001: {
    companyId: 'CMP1XB001',
    brandName: '1XBET',
    primaryColor: '#0d579b',
    secondaryColor: '#093b74',
    accentColor: '#00a2f4',
    textColor: '#ffffff',
    gradient: 'from-[#093b74] via-[#0d579b] to-[#1572cf]',
    cardBorderColor: 'rgba(13, 87, 155, 0.4)',
    appNameAr: '1XBET VIP Club',
    appNameEn: '1XBET VIP Club',
    taglineAr: 'تطبيق المكافآت والتعويضات الحصري المعتمد لعملاء 1XBET',
    taglineEn: 'Official VIP Rewards & Verified Loss-Back Club for 1XBET',
    heroBadgeAr: 'المنصة الرسمية المعتمدة لكاش باك 1XBET',
    heroBadgeEn: 'Official 1XBET Loyalty & Compensation Partner',
    exclusivePerksAr: [
      'استرداد فوري بنسبة تصل إلى 100% كأرصدة مجمدة تفك تلقائياً',
      'كود برومو معتمد (vexwallet) يمنح بونص إيداع إضافي 130%',
      'سحب وأرصدة غير محدودة عبر أسرع المحافظ الإلكترونية',
      'تحليلات تكتيكية مباشرة لجميع مباريات 1XBET بواسطة AI',
    ],
    exclusivePerksEn: [
      'Up to 100% instant compensation into auto-unfreezing wallet',
      'Verified promo code (vexwallet) unlocking 130% deposit bonus',
      'Instant withdrawals to local & crypto wallets with zero fee',
      'Direct AI tactical match predictions integrated with live odds',
    ],
  },

  // MELBET
  CMPMLB002: {
    companyId: 'CMPMLB002',
    brandName: 'MELBET',
    primaryColor: '#f59e0b',
    secondaryColor: '#18181b',
    accentColor: '#fbbf24',
    textColor: '#ffffff',
    gradient: 'from-[#18181b] via-[#27272a] to-[#78350f]',
    cardBorderColor: 'rgba(245, 158, 11, 0.4)',
    appNameAr: 'MELBET Elite Rewards',
    appNameEn: 'MELBET Elite Rewards',
    taglineAr: 'نادي كاش باك وتعويضات مالبينت MELBET المعتمد عالمياً',
    taglineEn: 'MELBET Certified Global Cashback & VIP Player Hub',
    heroBadgeAr: 'بوابة ولاء واسترداد لاعبي MELBET',
    heroBadgeEn: 'Official MELBET Loss-Back & VIP Gateway',
    exclusivePerksAr: [
      'كاش باك سخي أسبوعي على جميع الرهانات الرياضية',
      'كود الترويج (ml_3154096) لمضاعفة الإيداع الأول فورياً',
      'فك التجميد اليومي بمعدل 10% لكل رهان نشط',
      'أفضل احتمالات الفوز وتغطية الدوريات الكبرى مع الذكاء الاصطناعي',
    ],
    exclusivePerksEn: [
      'Weekly cashback on all sports & esports betting slips',
      'Official code (ml_3154096) for guaranteed first deposit match',
      'Fast daily unfreezing rate (10% per active qualified bet)',
      'Top market odds backed by Gemini statistical modeling',
    ],
  },

  // BETJAM
  CMPBJ003: {
    companyId: 'CMPBJ003',
    brandName: 'BETJAM',
    primaryColor: '#8b5cf6',
    secondaryColor: '#4c1d95',
    accentColor: '#c084fc',
    textColor: '#ffffff',
    gradient: 'from-[#4c1d95] via-[#6d28d9] to-[#8b5cf6]',
    cardBorderColor: 'rgba(139, 92, 246, 0.4)',
    appNameAr: 'BETJAM VIP Lounge',
    appNameEn: 'BETJAM VIP Lounge',
    taglineAr: 'تطبيق المكافآت التنافسية وحماية الأرصدة للاعبي BETJAM',
    taglineEn: 'Exclusive Competitive Rewards & Account Protection for BETJAM',
    heroBadgeAr: 'النادي الملكي لكاش باك BETJAM',
    heroBadgeEn: 'Royal BETJAM Cashback Network',
    exclusivePerksAr: [
      'تعويض فوري على التذاكر غير الموفقة مع فك رصيد سلس',
      'كود برومو حصري (VEDO2002) لمزايا اللاعبين النخبة',
      'واجهة تحويل سريعة ومحمية برمز PIN مشفر',
    ],
    exclusivePerksEn: [
      'Instant loss rebate on unlucky bet slips with seamless unfreeze',
      'Exclusive promo code (VEDO2002) for elite member perks',
      'Instant PIN-secured wallet-to-wallet transactions',
    ],
  },

  // MOSTBET
  CMPMB004: {
    companyId: 'CMPMB004',
    brandName: 'MOSTBET',
    primaryColor: '#dc2626',
    secondaryColor: '#991b1b',
    accentColor: '#f59e0b',
    textColor: '#ffffff',
    gradient: 'from-[#991b1b] via-[#dc2626] to-[#ea580c]',
    cardBorderColor: 'rgba(220, 38, 38, 0.4)',
    appNameAr: 'MOSTBET Star Rewards',
    appNameEn: 'MOSTBET Star Rewards',
    taglineAr: 'بوابة موستبيت MOSTBET المعتمدة للتعويضات والمدفوعات الفورية',
    taglineEn: 'MOSTBET Official Gateway for Cashback & Instant Payouts',
    heroBadgeAr: 'تطبيق النجوم المعتمد لـ MOSTBET',
    heroBadgeEn: 'MOSTBET Certified Star Rewards',
    exclusivePerksAr: [
      'بونص ترحيبي قياسي يصل لـ 125% مع كود (vedo2002)',
      'سحب فوري بدون تأخير لجميع المحافظ الإلكترونية والعملات الرقمية',
      'تأمين كامل على الرهانات الرياضية المجمعة (Acca Insurance)',
    ],
    exclusivePerksEn: [
      'Record 125% Welcome Bonus with promo code (vedo2002)',
      'Instant payout processing to all local and crypto e-wallets',
      'Accumulator bet insurance and comprehensive loss coverage',
    ],
  },

  // XPARI
  CMPXP005: {
    companyId: 'CMPXP005',
    brandName: 'XPARI',
    primaryColor: '#06b6d4',
    secondaryColor: '#0e7490',
    accentColor: '#67e8f9',
    textColor: '#ffffff',
    gradient: 'from-[#0e7490] via-[#0891b2] to-[#06b6d4]',
    cardBorderColor: 'rgba(6, 182, 212, 0.4)',
    appNameAr: 'XPARI Pro Rewards',
    appNameEn: 'XPARI Pro Rewards',
    taglineAr: 'تطبيق إكس باري XPARI للتحليلات الإحصائية واسترداد النقود',
    taglineEn: 'XPARI Advanced Sports Analytics & High-Rebate Club',
    heroBadgeAr: 'شريك الاسترداد الرسمي لـ XPARI',
    heroBadgeEn: 'XPARI Official Rebate Partner',
    exclusivePerksAr: [
      'أعلى معدل كاش باك وتغطية شاملة للرياضات الإلكترونية',
      'كود التفعيل (vedo2002) يضمن ربط الحساب بنظام التأمين',
      'تحليلات تكتيكية في الوقت الفعلي مع نسب فوز معتمدة',
    ],
    exclusivePerksEn: [
      'Highest esports rebate tier with live score integrations',
      'Activation promo (vedo2002) guaranteeing account insurance',
      'Real-time tactical intelligence powered by modern AI',
    ],
  },

  // BIZBET
  CMPBB006: {
    companyId: 'CMPBB006',
    brandName: 'BIZBET',
    primaryColor: '#059669',
    secondaryColor: '#064e3b',
    accentColor: '#34d399',
    textColor: '#ffffff',
    gradient: 'from-[#064e3b] via-[#059669] to-[#10b981]',
    cardBorderColor: 'rgba(5, 150, 105, 0.4)',
    appNameAr: 'BIZBET Fast Cashback',
    appNameEn: 'BIZBET Fast Cashback',
    taglineAr: 'منصة بيزبِت BIZBET المتطورة للمكافآت والتعويضات السريعة',
    taglineEn: 'BIZBET Next-Gen Cashback & Instant Player Compensation',
    heroBadgeAr: 'منظومة الأمان والولاء لـ BIZBET',
    heroBadgeEn: 'BIZBET Verified Player Loyalty System',
    exclusivePerksAr: [
      'تشفير بنكي عالي الأمان لحماية حسابات اللاعبين',
      'كود حصري (bi_9258) يتيح الدخول التلقائي في سحوبات أسبوعية',
      'دعم مباشر على مدار 24 ساعة وسرعة معالجة استثنائية',
    ],
    exclusivePerksEn: [
      'Bank-grade encryption guarding member balances and payouts',
      'Exclusive promo (bi_9258) enabling automatic VIP prize entries',
      '24/7 dedicated support with instantaneous claim handling',
    ],
  },

  // LINEBET
  CMPLB007: {
    companyId: 'CMPLB007',
    brandName: 'LINEBET',
    primaryColor: '#15803d',
    secondaryColor: '#14532d',
    accentColor: '#84cc16',
    textColor: '#ffffff',
    gradient: 'from-[#14532d] via-[#15803d] to-[#16a34a]',
    cardBorderColor: 'rgba(21, 128, 61, 0.4)',
    appNameAr: 'LINEBET VIP Green',
    appNameEn: 'LINEBET VIP Green',
    taglineAr: 'نادي الولاء والاسترداد المعتمد لمراهنات لاين بيت LINEBET',
    taglineEn: 'Certified VIP Loyalty & Cashback App for LINEBET',
    heroBadgeAr: 'تطبيق الولاء الرسمي لـ LINEBET',
    heroBadgeEn: 'LINEBET Official Loyalty App',
    exclusivePerksAr: [
      'أفضل أسعار واحتمالات مع كاش باك مباشر على التذاكر',
      'كود الترويج المعتمد (VEDO2002) لمضاعفة الرصيد فور التسجيل',
      'تطبيق خفيف وفائق السرعة متوافق مع كافة الهواتف الذكية',
    ],
    exclusivePerksEn: [
      'Market-leading match odds with instant rebate on unsettled bets',
      'Verified promo code (VEDO2002) doubling your initial bankroll',
      'Ultra-lightweight and battery-efficient mobile application',
    ],
  },

  // GOOOBET
  CMPGB008: {
    companyId: 'CMPGB008',
    brandName: 'GOOOBET',
    primaryColor: '#ca8a04',
    secondaryColor: '#854d0e',
    accentColor: '#facc15',
    textColor: '#ffffff',
    gradient: 'from-[#854d0e] via-[#ca8a04] to-[#eab308]',
    cardBorderColor: 'rgba(202, 138, 4, 0.4)',
    appNameAr: 'GOOOBET Gold Club',
    appNameEn: 'GOOOBET Gold Club',
    taglineAr: 'تطبيق المكافآت الذهبي وتأمين التذاكر الحصري لـ GOOOBET',
    taglineEn: 'GOOOBET Official Golden Rewards & Bet Slip Protection',
    heroBadgeAr: 'النادي الذهبي لكاش باك GOOOBET',
    heroBadgeEn: 'GOOOBET Golden Cashback Club',
    exclusivePerksAr: [
      'تعويضات استثنائية وفك سريع للأرصدة المجمدة',
      'كود برومو ذهبي (Vex) لتنشيط الحسابات المميزة فوراً',
      'إحصائيات متقدمة وجدول مباريات يومي مدعوم بالذكاء الاصطناعي',
    ],
    exclusivePerksEn: [
      'Generous loss recovery plan with expedited unfreeze rates',
      'Golden promo code (Vex) granting instant VIP privilege tiers',
      'Comprehensive match statistics with daily AI-backed fixtures',
    ],
  },
};

// Fallback theme builder for custom companies added by admin
export function getCompanyTheme(companyId: string, companyName?: string, customColor?: string): BrandThemeConfig {
  if (COMPANY_THEMES[companyId]) {
    return COMPANY_THEMES[companyId];
  }

  const name = (companyName || '').toUpperCase();
  if (name.includes('MOSTBET') || name.includes('MOST') || name.includes('موست')) {
    return COMPANY_THEMES['CMPMB004'];
  }
  if (name.includes('XPARI') || name.includes('XP') || name.includes('اكس') || name.includes('اكسباري')) {
    return COMPANY_THEMES['CMPXP005'];
  }
  if (name.includes('BIZBET') || name.includes('BIZ') || name.includes('باز') || name.includes('بيز') || name.includes('بيزبِت')) {
    return COMPANY_THEMES['CMPBB006'];
  }
  if (name.includes('1XBET') || name.includes('1X') || name.includes('وان')) {
    return COMPANY_THEMES['CMP1XB001'];
  }
  if (name.includes('MELBET') || name.includes('ميل')) {
    return COMPANY_THEMES['CMPMLB002'];
  }
  if (name.includes('BETJAM') || name.includes('جام')) {
    return COMPANY_THEMES['CMPBJ003'];
  }
  if (name.includes('LINEBET') || name.includes('لاين')) {
    return COMPANY_THEMES['CMPLB007'];
  }
  if (name.includes('GOOOBET') || name.includes('GOOO') || name.includes('قو') || name.includes('جو')) {
    return COMPANY_THEMES['CMPGB008'];
  }

  const displayName = name || 'Bookmaker';
  const color = customColor || '#0d579b';

  return {
    companyId,
    brandName: name,
    primaryColor: color,
    secondaryColor: '#1e293b',
    accentColor: '#38bdf8',
    textColor: '#ffffff',
    gradient: `from-[${color}] to-slate-900`,
    cardBorderColor: `${color}66`,
    appNameAr: `${name} VIP Rewards`,
    appNameEn: `${name} VIP Rewards`,
    taglineAr: `تطبيق الولاء والتعويضات الحصري لعملاء ${name}`,
    taglineEn: `Official Loyalty & Cashback Application for ${name}`,
    heroBadgeAr: `المنصة الرسمية المعتمدة لكاش باك ${name}`,
    heroBadgeEn: `Official ${name} Loyalty & Compensation Partner`,
    exclusivePerksAr: [
      'استرداد فوري وتأمين الحسابات لدى المنصة الشريكة',
      'أكواد ترويجية معتمدة للحصول على أعلى بونص متاح',
      'سحب وأرصدة سريعة بنظام المحفظة الموحدة',
    ],
    exclusivePerksEn: [
      'Instant account compensation & loss recovery',
      'Verified promo codes guaranteeing maximum deposit bonuses',
      'Instant payout execution with PIN protection',
    ],
  };
}
