export interface AsoPlatformPack {
  store: 'google_play' | 'app_store';
  title: string;
  subtitleOrShortDesc: string;
  keywords?: string; // 100 chars comma-separated for App Store
  promotionalText?: string; // 170 chars for App Store
  fullDescription: string;
  category: string;
  ageRating: string;
  privacyPolicyUrl: string;
  screenshotCaptions: string[];
}

export interface CompanyAsoSuite {
  companyId: string;
  companyName: string;
  googlePlay: AsoPlatformPack;
  appStore: AsoPlatformPack;
  targetKeywords: Array<{
    keyword: string;
    searchVolume: 'high' | 'very_high' | 'medium';
    intent: 'brand' | 'cashback' | 'promo' | 'prediction';
    difficulty: number; // 1-100
  }>;
}

export const GLOBAL_PROJECT_ASO: {
  googlePlay: AsoPlatformPack;
  appStore: AsoPlatformPack;
  keywordsDatabase: Array<{
    keyword: string;
    searchVolume: 'high' | 'very_high' | 'medium';
    intent: 'brand' | 'cashback' | 'promo' | 'prediction';
    targetRank: string;
  }>;
} = {
  googlePlay: {
    store: 'google_play',
    title: 'VEX: كاش باك وتوقعات ذكية',
    subtitleOrShortDesc: 'منصة تعويضات المراهنات، كاش باك فوري، أكواد ترويجية، وتوقعات رياضية بالذكاء الاصطناعي',
    category: 'Sports / Lifestyle / Entertainment',
    ageRating: 'Teen / 18+ (Responsible Gaming Guidelines Enforced)',
    privacyPolicyUrl: 'https://vex.deals/privacy',
    screenshotCaptions: [
      'استرداد نقدي 100% — حماية شاملة على تذاكر المباريات الخاسرة',
      'أكواد ترويجية معتمدة — بونص ترحيبي مضاعف 130% لأكبر المنصات',
      'تحليل تكتيكي بالذكاء الاصطناعي — نموذج Gemini Flash للمباريات الكبرى',
      'محفظة آمنة برمز PIN — سحب وتحويل أرصدة فوري وسلس',
      'لعب مسؤول ومعتمد 18+ — امتثال كامل لسياسات Google Play وApple',
    ],
    fullDescription: `🔥 مرحباً بك في VEX Deals — المنصة الذكية الأولى في الشرق الأوسط وشمال أفريقيا لتعويضات المراهنات الرياضية، الكاش باك، والأكواد الترويجية الحصرية المدعومة بالذكاء الاصطناعي.

هل تبحث عن تأمين تذاكرك وحماية رصيدك؟
يقدم لك VEX برنامج استرداد نقدي حقيقي بنسبة تصل إلى 100% كأرصدة مجمدة تفك تلقائياً مع كل مشاركة، بالإضافة لأقوى الأكواد الترويجية الرسمية لأشهر المنصات العالمية (1XBET, MELBET, LINEBET, MOSTBET, BETJAM, وغيرها).

━━━━━━━━━━━━━━━━━━━━━
⚡ المزايا الاستثنائية لتطبيق VEX:
━━━━━━━━━━━━━━━━━━━━━
1. نظام استرداد الخسائر الفوري (Cashback Protection):
• سجل حسابك بكود الوكالة المعتمد لتفعيل ضمان الحماية.
• ارفع كود التذكرة أو لقطة الشاشة ليتم تدقيقها وقيد التعويض في محفظتك الموحدة فوراً.
• فك تجميد الأرصدة تدريجياً وبشكل تلقائي.

2. أكواد ترويجية معتمدة (Verified VIP Promo Codes):
• احصل على أعلى بونص إيداع ترحيبي يصل لـ 130%.
• عروض دورية وسحوبات أسبوعية لأعضاء نادي VEX VIP.

3. وكيل التحليلات التكتيكية الرياضية (AI Match Analytics):
• محرك ذكاء اصطناعي فائق الدقة مبني على أحدث خوارزميات التعلم الآلي.
• توقعات تفصيلية لنتائج المباريات، احتمالات الفوز والتعادل، وأهم العوامل الفنية والإحصائية.
• إشعارات ذكية استباقية بالفرص الذهبية قبل انطلاق المباريات الكبرى في دوري أبطال أوروبا، الدوري الإنجليزي، والليغا.

4. أمان فائق وخصوصية تامة (Bank-Grade Security):
• حماية العمليات المالية برمز PIN مشفر بخوارزمية SHA-256.
• نظام تحقق بخطوتين (2FA) عبر رسائل SMS للهاتف.
• حذف فوري وسهل لكافة بيانات الحساب بضغطة زر التزاماً بالمعيار الدولي Apple Guideline 5.1.1.

5. مجتمع وشركاء موثوقون:
• محفظة رقمية مرنة للتحويل الداخلي السريع بين المستخدمين بدون عمولات.
• دعم فني مباشر ومتواصل لمساعدتك على مدار الساعة.

⚠️ تنويه اللعب المسؤول (+18):
هذا التطبيق مخصص للبالغين بعمر 18 عاماً فما فوق فقط. نحن نشجع اللعب الآمن وندعم منظمات مكافحة الإدمان مثل BeGambleAware و GamCare. التطبيق يقدم خدمات ولاء وإحصائيات ولا يمثل منصة مراهنات مستقلة.`,
  },
  appStore: {
    store: 'app_store',
    title: 'VEX: Sports Deals & Rewards',
    subtitleOrShortDesc: 'VIP Cashback & AI Match Stats',
    keywords: 'cashback,sports,scores,1xbet,melbet,linebet,mostbet,predictions,football,odds,rewards,coupons,deals',
    promotionalText: 'احصل على استرداد نقدي 100% لأول مرة، استخدم أقوى البرومو كودات المعتمدة، واستمتع بتحليلات المباريات بالذكاء الاصطناعي.',
    category: 'Sports / Utilities',
    ageRating: '17+ (Gambling & Contests Simulation and Advice)',
    privacyPolicyUrl: 'https://vex.deals/privacy',
    screenshotCaptions: [
      '100% Loss Protection & Smart Wallet Cashback',
      'Exclusive Verified Bookmaker VIP Promo Codes',
      'AI-Powered Tactical Football Match Analytics',
      'Encrypted PIN Security & Multi-Device Sync',
      'Responsible Gaming & Instant Account Control',
    ],
    fullDescription: `VEX Deals is the ultimate sports loyalty, compensation, and tactical intelligence ecosystem.

Designed with precision for sports enthusiasts and competitive players, VEX delivers a unified mobile experience combining real-time loyalty rebates, verified bookmaker promotional perks, and machine-learning match forecast models.

KEY HIGHLIGHTS:
• Loss-Back Compensation: Automatically register your bookmaker accounts under verified partnership codes and receive guaranteed compensation into your dedicated digital balance.
• AI Tactical Engine: Powered by state-of-the-art predictive algorithms, providing comprehensive win probabilities, expected scorelines, and key tactical factors for top football leagues.
• Multi-Wallet Ecosystem: Manage balances across multiple verified partner platforms with real-time transaction history.
• Strict Security Compliance: Hardware-accelerated SHA-256 PIN protection, multi-factor phone verification, and instantaneous account purge compliant with Apple Guideline 5.1.1.

Responsible Gaming:
VEX strictly promotes safe, healthy sports entertainment for users 18+. We provide instant self-exclusion options and direct resources to international helplines.`,
  },
  keywordsDatabase: [
    { keyword: 'كاش باك مراهنات', searchVolume: 'very_high', intent: 'cashback', targetRank: '#1' },
    { keyword: 'كود ترويجي 1xbet', searchVolume: 'very_high', intent: 'promo', targetRank: '#1' },
    { keyword: 'توقعات المباريات بالذكاء الاصطناعي', searchVolume: 'very_high', intent: 'prediction', targetRank: '#1' },
    { keyword: 'تعويض خسائر المراهنات', searchVolume: 'high', intent: 'cashback', targetRank: '#1' },
    { keyword: 'برومو كود melbet', searchVolume: 'high', intent: 'promo', targetRank: '#2' },
    { keyword: 'كود خصم linebet', searchVolume: 'high', intent: 'promo', targetRank: '#2' },
    { keyword: 'تطبيق موستبيت الاصلي', searchVolume: 'high', intent: 'brand', targetRank: '#2' },
    { keyword: 'sports betting cashback app', searchVolume: 'medium', intent: 'cashback', targetRank: '#3' },
    { keyword: 'ai football predictions', searchVolume: 'high', intent: 'prediction', targetRank: '#2' },
    { keyword: 'كاش باك العراق ومصر', searchVolume: 'high', intent: 'cashback', targetRank: '#1' },
  ],
};

// Generates dedicated, high-converting ASO metadata for a single company
export function generateCompanyAsoSuite(
  companyId: string,
  companyName: string,
  promoCode: string,
  appLink: string
): CompanyAsoSuite {
  const normName = companyName.toUpperCase();

  const googlePlay: AsoPlatformPack = {
    store: 'google_play',
    title: `${normName} VIP: كاش باك ومكافآت`,
    subtitleOrShortDesc: `التطبيق المعتمد لكاش باك ${normName}، بونص الإيداع، كود الترويج (${promoCode})، وتأمين التذاكر`,
    category: 'Sports / Lifestyle',
    ageRating: '18+ (Responsible Gaming Guidelines)',
    privacyPolicyUrl: 'https://vex.deals/privacy',
    screenshotCaptions: [
      `كاش باك حصري ومضمون لجميع عملاء ${normName}`,
      `كود البرومو المعتمد (${promoCode}) لبونص إيداع إضافي`,
      `استرداد فوري للأرصدة المجمدة مع فك تجميد يومي`,
      `تحميل مباشر لتطبيق ${normName} الرسمي بأمان وسرعة`,
      `تحليلات تكتيكية لمباريات اليوم بالذكاء الاصطناعي`,
    ],
    fullDescription: `🔥 مرحباً بك في تطبيق المكافآت والكاش باك الحصري لعملاء ومستخدمي ${normName}!

هل تلعب عبر ${normName} وتريد حماية رصيدك من الخسائر؟
يقدم لك هذا التطبيق برنامج الولاء والاسترداد المعتمد رسمياً لعملاء ${normName}:

💎 مزايا التطبيق الحصرية لـ ${normName}:
1. كاش باك فوري بنسبة تصل إلى 100% على تذاكر المراهنة غير الموفقة.
2. كود الترويج الرسمي المعتمد: [ ${promoCode} ] — يمنحك بونص ترحيبي مضاعف فور التسجيل والإيداع.
3. فك تجميد تلقائي للأرصدة وسحب سلس وفوري للمحافظ الإلكترونية والعملات الرقمية.
4. جدول مباريات متكامل مع تحليلات تكتيكية بالذكاء الاصطناعي ونسب فوز دقيقة.
5. رابط تحميل رسمي ومباشر لتطبيق ${normName} المعتمد (${appLink}).

🔒 الأمان والخصوصية:
• تشفير بنكي لكافة البيانات ورمز حماية شخصي PIN.
• لا نطلب كلمة مرور حسابك في ${normName} مطلقاً — فقط معرف الحساب للتحقق من التعويض.

⚠️ تنويه اللعب المسؤول (+18):
هذا التطبيق مخصص للبالغين 18+. نشجع دوماً على الرهان الواعي والمسؤول.`,
  };

  const appStore: AsoPlatformPack = {
    store: 'app_store',
    title: `${normName} VIP Club: Rewards`,
    subtitleOrShortDesc: `Exclusive Loyalty & Match Stats`,
    keywords: `${normName.toLowerCase()},${normName.toLowerCase()} app,cashback,promo code,sports,scores,odds,bonuses,deals,predictions`,
    promotionalText: `استفد من كاش باك ${normName} الحصري مع كود الترويج الرسمي (${promoCode}) وتحليلات رياضية متقدمة.`,
    category: 'Sports',
    ageRating: '17+',
    privacyPolicyUrl: 'https://vex.deals/privacy',
    screenshotCaptions: [
      `Official VIP Loyalty Club for ${normName}`,
      `Guaranteed Cashback & Bet Slip Protection`,
      `Verified Promo Code (${promoCode}) for 130% Bonus`,
      `AI Statistical Match Insights & Live Odds`,
      `Strict PIN Security & 18+ Certified`,
    ],
    fullDescription: `Welcome to the VIP Loyalty & Compensation Club dedicated to ${normName} members.

Maximize your experience with official loss-back protection, verified partner promotion codes, and real-time AI sports statistics.

KEY PERKS:
• Verified promo code: ${promoCode}
• Instant compensation requests with transparent review pipeline.
• Comprehensive match analytics powered by machine learning.
• Bank-grade PIN security and total privacy control.

Responsible Gaming: 18+ only. Self-exclusion and support links available inside the app.`,
  };

  const targetKeywords = [
    { keyword: `${normName.toLowerCase()} promo code`, searchVolume: 'very_high' as const, intent: 'promo' as const, difficulty: 75 },
    { keyword: `كود ترويجي ${companyName}`, searchVolume: 'very_high' as const, intent: 'promo' as const, difficulty: 80 },
    { keyword: `كاش باك ${companyName}`, searchVolume: 'high' as const, intent: 'cashback' as const, difficulty: 45 },
    { keyword: `تحميل تطبيق ${companyName}`, searchVolume: 'very_high' as const, intent: 'brand' as const, difficulty: 85 },
    { keyword: `${normName.toLowerCase()} apk download`, searchVolume: 'high' as const, intent: 'brand' as const, difficulty: 70 },
    { keyword: `بونص ${companyName}`, searchVolume: 'high' as const, intent: 'promo' as const, difficulty: 60 },
  ];

  return {
    companyId,
    companyName,
    googlePlay,
    appStore,
    targetKeywords,
  };
}

export const PRECOMPUTED_COMPANY_ASO: Record<string, CompanyAsoSuite> = {
  CMP1XB001: generateCompanyAsoSuite('CMP1XB001', '1XBET', 'vexwallet', 'https://reffpa.com/L?tag=d_5955825m_2528c_&site=5955825&ad=2528'),
  CMPMLB002: generateCompanyAsoSuite('CMPMLB002', 'MELBET', 'ml_3154096', 'https://refpa3665.com/L?tag=d_5074314m_70867c_&site=5074314&ad=70867'),
  CMPBJ003: generateCompanyAsoSuite('CMPBJ003', 'BETJAM', 'VEDO2002', 'https://refpa5124.com/L?tag=d_5089740m_97988c_&site=5089740&ad=97988'),
  CMPMB004: generateCompanyAsoSuite('CMPMB004', 'MOSTBET', 'vedo2002', 'https://vgfiiimb.com/68fU'),
  CMPXP005: generateCompanyAsoSuite('CMPXP005', 'XPARI', 'vedo2002', 'https://xp-aff.com/L?tag=d_5912007m_71587c_apk1&site=5912007&ad=71587'),
  CMPBB006: generateCompanyAsoSuite('CMPBB006', 'BIZBET', 'bi_9258', 'https://refpa83754.com/L?tag=d_5749248m_67005c_&site=5749248&ad=67005'),
  CMPLB007: generateCompanyAsoSuite('CMPLB007', 'LINEBET', 'VEDO2002', 'https://lb-aff.com/L?tag=d_5911847m_66803c_apk1&site=5911847&ad=66803'),
  CMPGB008: generateCompanyAsoSuite('CMPGB008', 'GOOOBET', 'Vex', 'https://gooobetaffiliate.com/L?tag=d_4531176m_109867c_&site=4531176&ad=109867'),
};
