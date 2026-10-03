import { Language } from '../types';

export interface TranslationSchema {
  appName: string;
  appSubtitle: string;
  platformDomain: string;
  officialBadge: string;
  securityAudit: string;
  themeLight: string;
  themeDark: string;
  tabs: {
    companies: string;
    wallets: string;
    referrals: string;
    transfers: string;
    activity: string;
    aiSports: string;
  };
  userPill: string;
  copied: string;
  promoCode: string;
  copyPromo: string;
  registerBtn: string;
  appBtn: string;
  detailsBtn: string;
  registeredBadge: string;
  pendingBadge: string;
  notRegisteredBadge: string;
  requestCompensation: string;
  totalFrozen: string;
  totalAvailable: string;
  frozenBalance: string;
  availableBalance: string;
  frozenInfo: string;
  availableInfo: string;
  transferBtn: string;
  inviteBtn: string;
  referralTitle: string;
  referralDesc: string;
  referralUnfreezeBadge: string;
  selectPlatform: string;
  yourRefLinkFor: string;
  copyText: string;
  codeLabel: string;
  shareLinkText: string;
  applyReferralTitle: string;
  applyReferralDesc: string;
  protectionBadge: string;
  friendCodeLabel: string;
  friendCodePlaceholder: string;
  myAccountInCompany: string;
  applyAndUnfreezeBtn: string;
  applyingText: string;
  referralsHistory: string;
  noReferrals: string;
  statusActive: string;
  statusPending: string;
  unlockedSuffix: string;
  transfersTitle: string;
  transfersDesc: string;
  friendAccount: string;
  transferAmount: string;
  maxAllowedTransfer: string;
  sendTransferOtp: string;
  otpTitle: string;
  otpDesc: string;
  confirmTransferBtn: string;
  transferHistory: string;
  noTransfers: string;
  myAccountsTitle: string;
  requestsHistoryTitle: string;
  newRequestTitle: string;
  betSlipLabel: string;
  betSlipPlaceholder: string;
  lossDateLabel: string;
  amountUsd: string;
  currencyLabel: string;
  searchCurrencyPlaceholder: string;
  screenshotLabel: string;
  notesLabel: string;
  submitRequestBtn: string;
  step1Title: string;
  step1Desc: string;
  confirmRegBtn: string;
  step2Title: string;
  accountNumberPlaceholder: string;
  pinPlaceholder: string;
  pinHint: string;
  telegramBotLive: string;
  adminDemo: string;
  quickActions: string;
  responsibleGamingTitle: string;
  legalTermsTitle: string;
  securityTitle: string;
  languageSelect: string;
  aiTacticalAnalysis: string;
  upcomingMatches: string;
  sportsNewsFeed: string;
  registerAndSite: string;
  linkAccount: string;
  editAccount: string;
  accountLabel: string;
  activeWallets: string;
  unfreezeHint: string;
  availableHint: string;
  balanceProtectionTitle: string;
  companyWalletsTitle: string;
  totalWalletsPrefix: string;
  verifiedPartners: string;
  activeCount: string;
  searchCompanyPlaceholder: string;
  companyCardSubtitle: string;
  officialPartnerBadge: string;
  aboutCompanyAndPerks: string;
  officialPromoForComp: string;
  promoWarning: string;
  perk1: string;
  perk2: string;
  perk3: string;
  registerInCompany: string;
  visitOfficialSite: string;
  downloadAppApk: string;
  settings: {
    title: string;
    subtitle: string;
    tabSecurity: string;
    tabCurrency: string;
    tabLegal: string;
    tabDelete: string;
    tabInstall: string;
    displayCurrencyLabel: string;
    linkedPhone: string;
    noPhoneLinked: string;
    editPhone: string;
    linkPhoneNow: string;
    linkedTelegram: string;
    changePinTitle: string;
    currentPinLabel: string;
    newPinLabel: string;
    confirmPinLabel: string;
    savePinBtn: string;
    pinSuccess: string;
    pinLengthError: string;
    pinMismatchError: string;
    installTitle: string;
    installDesc: string;
    installBtn: string;
    alreadyInstalled: string;
    browserMode: string;
    installedMode: string;
    deleteTitle: string;
    deleteDesc: string;
    deletePrompt: string;
    deleteKeyword: string;
    deleteBtn: string;
    deleting: string;
  };
}

export const TRANSLATIONS: Record<Language, TranslationSchema> = {
  ar: {
    appName: 'VEX Deals',
    appSubtitle: 'منصة الصفقات والمكافآت واسترداد الخسائر (vex.deals)',
    platformDomain: 'vex.deals',
    officialBadge: 'vex.deals موثق',
    securityAudit: 'تحليل الأمان وسد الثغرات',
    themeLight: 'فاتح',
    themeDark: 'داكن',
    tabs: {
      companies: 'الشركات والصفقات',
      wallets: 'المحفظة',
      referrals: 'الإحالات',
      transfers: 'التحويلات',
      activity: 'السجل والطلبات',
      aiSports: 'المباريات و AI',
    },
    userPill: 'معرف المستخدم',
    copied: 'تم النسخ!',
    promoCode: 'كود الترويجي',
    copyPromo: 'نسخ الكود',
    registerBtn: 'سجل الآن',
    appBtn: 'تحميل التطبيق',
    detailsBtn: 'تفاصيل',
    registeredBadge: 'مسجل ومعتمد',
    pendingBadge: 'قيد التدقيق',
    notRegisteredBadge: 'غير مسجل',
    requestCompensation: 'طلب تعويض',
    totalFrozen: 'إجمالي المجمد',
    totalAvailable: 'إجمالي المتاح',
    frozenBalance: 'الرصيد المجمد',
    availableBalance: 'الرصيد المتاح',
    frozenInfo: 'الرصيد المجمد يتم فك 10% منه عند تسجيل صديق برابط إحالتك أو يمكنك تحويل حتى 10% منه لصديق (بحد أقصى مرة كل 24 ساعة).',
    availableInfo: 'الرصيد المتاح جاهز للإيداع المباشر أو التحويل الفوري دون شروط.',
    transferBtn: 'تحويل لصديق',
    inviteBtn: 'دعوة صديق',
    referralTitle: 'أنقذ صديق (Rescue a Friend) - نظام الإحالات',
    referralDesc: 'أنقذ أصدقاءك الخاسرين وشارك رابطك المعتمد معهم. عند تسجيل صديق، سيحصل على دعم VEX Deals، وسيتم فك تجميد 10% من رصيدك المجمد وتحويله فورياً ككاش متاح!',
    referralUnfreezeBadge: 'فك تجميد فوري 10% لكل عملية إنقاذ ناجحة',
    selectPlatform: 'اختر المنصة:',
    yourRefLinkFor: 'رابط إحالتك لـ',
    copyText: 'نسخ',
    codeLabel: 'الكود:',
    shareLinkText: 'مشاركة الرابط',
    applyReferralTitle: 'تفعيل كود إحالة صديق',
    applyReferralDesc: 'أدخل كود الإحالة لفك 10% من رصيدك المجمد',
    protectionBadge: 'حماية',
    friendCodeLabel: 'كود إحالة الصديق (8 خانات):',
    friendCodePlaceholder: 'مثال: WC890X9K',
    myAccountInCompany: 'رقم حسابك في',
    applyAndUnfreezeBtn: 'تطبيق وفك 10% من الرصيد',
    applyingText: 'جارٍ التدقيق والفك...',
    referralsHistory: 'سجل الإحالات',
    noReferrals: 'لا توجد إحالات مسجلة حتى الآن. شارك كودك وابدأ بكسب العوائد!',
    statusActive: 'نشط',
    statusPending: 'قيد التدقيق',
    unlockedSuffix: 'تم فكها',
    transfersTitle: 'تحويل الرصيد للأصدقاء',
    transfersDesc: 'يمكنك تحويل حتى 10% من رصيدك المجمد لصديق مسجل في نفس الشركة (تحويل واحد فقط لكل صديق مع حماية ضد التواطؤ الدائري). يتطلب رمز تحقق OTP.',
    friendAccount: 'رقم حساب الصديق (في نفس الشركة)',
    transferAmount: 'المبلغ المراد تحويله',
    maxAllowedTransfer: 'الحد الأقصى المسموح (10% من المجمد):',
    sendTransferOtp: 'إرسال طلب التحويل واستلام الرمز',
    otpTitle: 'تأكيد التحويل عبر رمز OTP',
    otpDesc: 'أدخل رمز التحقق المكون من 4 أرقام المرسل عبر رسائل الأمان الخاصة بـ VEX.',
    confirmTransferBtn: 'تأكيد التحويل الآن',
    transferHistory: 'سجل التحويلات السابقة',
    noTransfers: 'لم تقم بأي تحويلات بعد.',
    myAccountsTitle: 'حساباتي المسجلة في الشركات',
    requestsHistoryTitle: 'طلبات التعويض المقدمة',
    newRequestTitle: 'تقديم طلب تعويض خسائر',
    betSlipLabel: 'رقم قسيمة الرهان الرسمية (Bet Slip ID)',
    betSlipPlaceholder: 'مثال: 48921849102 (مطلوب للتحقق)',
    lossDateLabel: 'تاريخ الخسارة',
    amountUsd: 'مبلغ التعويض المطلوب',
    currencyLabel: 'عملة التعويض',
    searchCurrencyPlaceholder: 'ابحث عن العملة (اكتب حرف أو حرفين مثل USD, EGP, SAR...)',
    screenshotLabel: 'لقطة شاشة للرهان / الحساب (اختياري)',
    notesLabel: 'ملاحظات إضافية للمشرف',
    submitRequestBtn: 'إرسال طلب التعويض للمراجعة',
    step1Title: 'الخطوة الأولى: التسجيل عبر الرابط الترويجي',
    step1Desc: 'اضغط على زر تأكيد التسجيل للانتقال لموقع الشركة، انسخ كود الترويجي للاستفادة من أقصى نسبة تعويض، ثم عد لإدخال رقم حسابك.',
    confirmRegBtn: 'تأكيد التسجيل في الموقع',
    step2Title: 'الخطوة الثانية: ربط رقم الحساب',
    accountNumberPlaceholder: 'أدخل رقم الحساب التعريفي (ID)',
    pinPlaceholder: 'الرمز السري (4 أرقام)',
    pinHint: 'إذا كانت هذه أول مرة تسجل فيها، فسيتم تعيين هذا الرمز لحسابك لحمايته في جميع العمليات القادمة.',
    telegramBotLive: 'إشعارات بوت التليجرام',
    adminDemo: 'لوحة المشرف (إدارة)',
    quickActions: 'إجراءات سريعة',
    responsibleGamingTitle: 'اللعب المسؤول (+18)',
    legalTermsTitle: 'الشروط والخصوصية',
    securityTitle: 'الأمان والامتثال',
    languageSelect: 'تغيير اللغة',
    aiTacticalAnalysis: 'التحليل التكتيكي بالذكاء الاصطناعي',
    upcomingMatches: 'المباريات المباشرة والقادمة',
    sportsNewsFeed: 'آخر الأخبار الرياضية والتحليلات',
    registerAndSite: 'الموقع والتسجيل',
    linkAccount: 'ربط الحساب',
    editAccount: 'تعديل الحساب',
    accountLabel: 'رقم الحساب:',
    activeWallets: 'محافظ نشطة',
    unfreezeHint: 'يفك 10% لكل إحالة صديق',
    availableHint: 'متاح للإيداع والتحويل',
    balanceProtectionTitle: 'حماية واسترداد الرصيد:',
    companyWalletsTitle: 'محافظ الشركات',
    totalWalletsPrefix: 'إجمالي محافظ',
    verifiedPartners: 'شركاء معتمدون',
    activeCount: 'نشط',
    searchCompanyPlaceholder: 'ابحث عن اسم الشركة أو الكود الترويجي...',
    companyCardSubtitle: 'سجل باستخدام الأكواد الرسمية لتفعيل حماية الكاش باك وتعويض الخسائر.',
    officialPartnerBadge: 'شركة معتمدة رسمياً لدى vex.deals',
    aboutCompanyAndPerks: 'عن الشركة والمزايا',
    officialPromoForComp: 'الكود الترويجي المعتمد للتعويض',
    promoWarning: '* يجب استخدام هذا الكود الترويجي حصراً أثناء إنشاء حسابك لضمان تأهيلك لبرنامج التعويضات وفك تجميد الرصيد.',
    perk1: 'استرداد نسبة من الخسائر الشهرية والأسبوعية',
    perk2: 'إمكانية فك تجميد 10% من الرصيد مع كل إحالة نشطة وموثقة',
    perk3: 'تحويل آمن للأرصدة عبر شبكة vex.deals المحمية ضد التواطؤ',
    registerInCompany: 'التسجيل في',
    visitOfficialSite: 'زيارة الموقع الرسمي',
    downloadAppApk: 'تحميل التطبيق (APK)',
    settings: {
      title: 'الأمان والإعدادات',
      subtitle: 'إدارة رمز PIN وتثبيت التطبيق ورقم الهاتف والسياسات',
      tabSecurity: 'الأمان والحساب',
      tabCurrency: 'العملة',
      tabLegal: 'السياسات والشروط',
      tabDelete: 'حذف الحساب',
      tabInstall: 'تثبيت التطبيق',
      displayCurrencyLabel: 'اختر عملة العرض المفضلة:',
      linkedPhone: 'رقم الهاتف المربوط',
      noPhoneLinked: 'لم يتم ربط رقم الهاتف بعد',
      editPhone: 'تعديل الرقم',
      linkPhoneNow: 'ربط الآن',
      linkedTelegram: 'حساب تيليجرام المربوط:',
      changePinTitle: 'تغيير رمز الحماية السري (PIN)',
      currentPinLabel: 'رمز PIN الحالي (الافتراضي 1234):',
      newPinLabel: 'الرمز الجديد (4 أرقام):',
      confirmPinLabel: 'تأكيد الرمز الجديد:',
      savePinBtn: 'حفظ الرمز السري الجديد',
      pinSuccess: 'تم تغيير رمز الحماية (PIN) بنجاح.',
      pinLengthError: 'رمز الحماية الجديد يجب أن يتكون من 4 أرقام.',
      pinMismatchError: 'رمز الحماية الجديد غير متطابق.',
      installTitle: 'تثبيت تطبيق VEX Deals على هاتفك',
      installDesc: 'احصل على تجربة تطبيق سريعة وخفيفة مع وصول مباشر للشاشة الرئيسية وتنبيهات فورية بدون استهلاك مساحة.',
      installBtn: 'تثبيت التطبيق الآن',
      alreadyInstalled: 'التطبيق مثبت بالفعل ويعمل في الوضع المستقل (App Mode).',
      browserMode: 'وضع المتصفح',
      installedMode: 'تطبيق مثبت',
      deleteTitle: 'حذف الحساب والبيانات نهائياً (App Store Requirement)',
      deleteDesc: 'وفقاً لمتطلبات متجر آبل و Google Play، يمكنك حذف حسابك وسجلاتك ومحافظك بالكامل من هذا الجهاز والسيرفر بشكل فوري ولا يمكن التراجع عن هذا الإجراء.',
      deletePrompt: 'لتأكيد الحذف، اكتب كلمة',
      deleteKeyword: 'حذف نهائي',
      deleteBtn: 'تأكيد حذف الحساب والبيانات',
      deleting: 'جارٍ مسح البيانات...',
    },
  },
  en: {
    appName: 'VEX Deals',
    appSubtitle: 'Betting Deals & Loyalty Cashback (vex.deals)',
    platformDomain: 'vex.deals',
    officialBadge: 'vex.deals Verified',
    securityAudit: 'Security & Vulnerability Audit',
    themeLight: 'Light',
    themeDark: 'Dark',
    tabs: {
      companies: 'Companies & Deals',
      wallets: 'Wallets',
      referrals: 'Referrals',
      transfers: 'Transfers',
      activity: 'Activity & Requests',
      aiSports: 'Sports & AI',
    },
    userPill: 'User ID',
    copied: 'Copied!',
    promoCode: 'Promo Code',
    copyPromo: 'Copy Code',
    registerBtn: 'Register',
    appBtn: 'Download App',
    detailsBtn: 'Details',
    registeredBadge: 'Registered & Active',
    pendingBadge: 'Under Review',
    notRegisteredBadge: 'Not Registered',
    requestCompensation: 'Request Comp',
    totalFrozen: 'Total Frozen',
    totalAvailable: 'Total Available',
    frozenBalance: 'Frozen Balance',
    availableBalance: 'Available Balance',
    frozenInfo: 'Frozen balance: 10% unlocks when an invited friend registers (max 1 unfreeze per 24h), or you can transfer up to 10% to a friend.',
    availableInfo: 'Available balance is ready for immediate withdrawal, betting deposits, or transfers.',
    transferBtn: 'Transfer',
    inviteBtn: 'Invite Friend',
    referralTitle: 'Rescue a Friend - Referral System',
    referralDesc: 'Rescue your unlucky friends! Share your verified link. When a friend registers, they get VEX Deals support, and 10% of your frozen balance is instantly unlocked to available cash!',
    referralUnfreezeBadge: '10% instant unfreeze for every successful rescue',
    selectPlatform: 'Select Platform:',
    yourRefLinkFor: 'Your referral link for',
    copyText: 'Copy',
    codeLabel: 'Code:',
    shareLinkText: 'Share Link',
    applyReferralTitle: 'Activate Friend Referral Code',
    applyReferralDesc: 'Enter referral code to unfreeze 10% of your frozen balance',
    protectionBadge: 'Protected',
    friendCodeLabel: 'Friend Referral Code (8 digits):',
    friendCodePlaceholder: 'e.g. WC890X9K',
    myAccountInCompany: 'Your account number in',
    applyAndUnfreezeBtn: 'Apply & Unfreeze 10%',
    applyingText: 'Verifying & Unfreezing...',
    referralsHistory: 'Referrals History',
    noReferrals: 'No referrals registered yet. Share your code and start earning!',
    statusActive: 'Active',
    statusPending: 'Pending Review',
    unlockedSuffix: 'unlocked',
    transfersTitle: 'Balance Transfer to Friends',
    transfersDesc: 'Transfer up to 10% of your frozen balance to a friend in the same company (once per friend with anti-circular collusion protection). Requires OTP.',
    friendAccount: "Friend's Account Number",
    transferAmount: 'Transfer Amount',
    maxAllowedTransfer: 'Max allowed (10% of frozen):',
    sendTransferOtp: 'Initiate Transfer & Receive OTP',
    otpTitle: 'Verify Transfer with Security OTP',
    otpDesc: 'Enter the 4-digit verification code sent to your registered phone number or Telegram.',
    confirmTransferBtn: 'Confirm Transfer Now',
    transferHistory: 'Transfer History',
    noTransfers: 'No transfers executed yet.',
    myAccountsTitle: 'My Registered Accounts',
    requestsHistoryTitle: 'Compensation Requests History',
    newRequestTitle: 'Submit Loss Compensation Request',
    betSlipLabel: 'Official Bet Slip ID',
    betSlipPlaceholder: 'e.g. 48921849102 (Required for audit)',
    lossDateLabel: 'Loss Date',
    amountUsd: 'Compensation Amount',
    currencyLabel: 'Compensation Currency',
    searchCurrencyPlaceholder: 'Search currency (type 1-2 letters like USD, EUR, GBP...)',
    screenshotLabel: 'Screenshot / Proof (optional)',
    notesLabel: 'Additional Notes',
    submitRequestBtn: 'Submit Request for Review',
    step1Title: 'Step 1: Register using promo code',
    step1Desc: 'Click Confirm Registration to open the site, copy the promo code to guarantee maximum compensation, then return to enter your account ID.',
    confirmRegBtn: 'Confirm Registration on Site',
    step2Title: 'Step 2: Link Your Account ID',
    accountNumberPlaceholder: 'Enter your account ID number',
    pinPlaceholder: '4-digit security PIN',
    pinHint: 'If this is your first registration, this PIN will be set as your master secret code for all future accounts.',
    telegramBotLive: 'Telegram Bot Feed',
    adminDemo: 'Admin Panel (Manage)',
    quickActions: 'Quick Actions',
    responsibleGamingTitle: 'Responsible Gaming (+18)',
    legalTermsTitle: 'Terms & Privacy',
    securityTitle: 'Security & Compliance',
    languageSelect: 'Language',
    aiTacticalAnalysis: 'AI Tactical Match Analysis',
    upcomingMatches: 'Live & Upcoming Fixtures',
    sportsNewsFeed: 'Sports News & Insights',
    registerAndSite: 'Register & Site',
    linkAccount: 'Link ID',
    editAccount: 'Edit ID',
    accountLabel: 'Account ID:',
    activeWallets: 'active wallets',
    unfreezeHint: '10% unlocked per referral',
    availableHint: 'Ready for deposit & transfer',
    balanceProtectionTitle: 'Balance Protection & Unlocking:',
    companyWalletsTitle: 'Company Wallets',
    totalWalletsPrefix: 'Total Wallets Balance',
    verifiedPartners: 'Verified Partners',
    activeCount: 'Active',
    searchCompanyPlaceholder: 'Search company or promo code...',
    companyCardSubtitle: 'Register with official promo codes to activate cashback protection and loss recovery.',
    officialPartnerBadge: 'Official Verified Partner at vex.deals',
    aboutCompanyAndPerks: 'About Company & Perks',
    officialPromoForComp: 'Official Promo Code for Compensation',
    promoWarning: '* Use this promo code strictly during account creation to guarantee eligibility for compensation and unfreezing.',
    perk1: 'Monthly & weekly loss percentage refund',
    perk2: '10% balance unfreeze with each active verified referral',
    perk3: 'Secure balance transfers via anti-collusion protected vex.deals network',
    registerInCompany: 'Register in',
    visitOfficialSite: 'Visit Official Website',
    downloadAppApk: 'Download App (APK)',
    settings: {
      title: 'Security & Settings',
      subtitle: 'Manage PIN, Phone, App Installation & Policies',
      tabSecurity: 'Security & Account',
      tabCurrency: 'Currency',
      tabLegal: 'Legal & Policies',
      tabDelete: 'Delete Account',
      tabInstall: 'Install App',
      displayCurrencyLabel: 'Select Display Currency:',
      linkedPhone: 'Linked Phone Number',
      noPhoneLinked: 'No phone number linked yet',
      editPhone: 'Change Phone',
      linkPhoneNow: 'Link Phone',
      linkedTelegram: 'Linked Telegram Account:',
      changePinTitle: 'Change Secret Security PIN',
      currentPinLabel: 'Current PIN (default is 1234):',
      newPinLabel: 'New PIN (4 digits):',
      confirmPinLabel: 'Confirm New PIN:',
      savePinBtn: 'Save New PIN',
      pinSuccess: 'Security PIN changed successfully.',
      pinLengthError: 'New PIN must be exactly 4 digits.',
      pinMismatchError: 'New PIN confirmation does not match.',
      installTitle: 'Install VEX Deals App',
      installDesc: 'Enjoy a native app experience on your home screen with rapid access, push notifications, and offline cache.',
      installBtn: 'Install App Now',
      alreadyInstalled: 'The app is already installed and running in Standalone App Mode.',
      browserMode: 'Browser Mode',
      installedMode: 'Installed App',
      deleteTitle: 'Permanently Delete Account & Data (App Store 5.1.1)',
      deleteDesc: 'Per Apple and Google Play store compliance guidelines, you can permanently erase your profile, wallets, and activity records.',
      deletePrompt: 'To confirm deletion, please type',
      deleteKeyword: 'DELETE ACCOUNT',
      deleteBtn: 'Permanently Erase All Data',
      deleting: 'Erasing data...',
    },
  },
  es: {
    appName: 'VEX Deals',
    appSubtitle: 'Ofertas de apuestas y reembolso de fidelidad (vex.deals)',
    platformDomain: 'vex.deals',
    officialBadge: 'vex.deals Verificado',
    securityAudit: 'Auditoría de Seguridad y Vulnerabilidades',
    themeLight: 'Claro',
    themeDark: 'Oscuro',
    tabs: {
      companies: 'Casas y Ofertas',
      wallets: 'Billeteras',
      referrals: 'Referidos',
      transfers: 'Transferencias',
      activity: 'Actividad y Solicitudes',
      aiSports: 'Deportes e IA',
    },
    userPill: 'ID de Usuario',
    copied: '¡Copiado!',
    promoCode: 'Código Promocional',
    copyPromo: 'Copiar Código',
    registerBtn: 'Registrarse',
    appBtn: 'Descargar App',
    detailsBtn: 'Detalles',
    registeredBadge: 'Registrado y Activo',
    pendingBadge: 'En Revisión',
    notRegisteredBadge: 'No Registrado',
    requestCompensation: 'Pedir Reembolso',
    totalFrozen: 'Total Congelado',
    totalAvailable: 'Total Disponible',
    frozenBalance: 'Saldo Congelado',
    availableBalance: 'Saldo Disponible',
    frozenInfo: 'Saldo congelado: se desbloquea el 10% cuando un amigo invitado se registra (máx. 1 vez cada 24h), o puedes transferir hasta el 10% a un amigo.',
    availableInfo: 'El saldo disponible está listo para depósitos directos, apuestas o transferencias inmediatas.',
    transferBtn: 'Transferir a Amigo',
    inviteBtn: 'Invitar Amigo',
    referralTitle: 'Rescata a un Amigo - Sistema de Referidos',
    referralDesc: '¡Rescata a tus amigos sin suerte! Comparte tu enlace verificado. ¡Cuando un amigo se registra, obtiene soporte y el 10% de tu saldo congelado pasa a saldo disponible!',
    referralUnfreezeBadge: 'Desbloqueo instantáneo del 10% por cada rescate',
    selectPlatform: 'Seleccionar Plataforma:',
    yourRefLinkFor: 'Tu enlace de referido para',
    copyText: 'Copiar',
    codeLabel: 'Código:',
    shareLinkText: 'Compartir Enlace',
    applyReferralTitle: 'Activar Código de Referido de Amigo',
    applyReferralDesc: 'Ingresa el código de referido para desbloquear el 10% de tu saldo congelado',
    protectionBadge: 'Protegido',
    friendCodeLabel: 'Código de referido de amigo (8 dígitos):',
    friendCodePlaceholder: 'ej. WC890X9K',
    myAccountInCompany: 'Tu número de cuenta en',
    applyAndUnfreezeBtn: 'Aplicar y Desbloquear 10%',
    applyingText: 'Verificando y desbloqueando...',
    referralsHistory: 'Historial de Referidos',
    noReferrals: 'Aún no hay referidos registrados. ¡Comparte tu código y comienza a ganar!',
    statusActive: 'Activo',
    statusPending: 'En Revisión',
    unlockedSuffix: 'desbloqueado',
    transfersTitle: 'Transferencia de Saldo a Amigos',
    transfersDesc: 'Transfiere hasta el 10% de tu saldo congelado a un amigo en la misma casa (una vez por amigo con protección anti-colusión). Requiere OTP.',
    friendAccount: 'Número de cuenta del amigo',
    transferAmount: 'Monto a Transferir',
    maxAllowedTransfer: 'Máximo permitido (10% del congelado):',
    sendTransferOtp: 'Enviar solicitud y recibir OTP',
    otpTitle: 'Verificar Transferencia con OTP',
    otpDesc: 'Ingresa el código de 4 dígitos enviado a tu número de teléfono registrado o Telegram.',
    confirmTransferBtn: 'Confirmar Transferencia Ahora',
    transferHistory: 'Historial de Transferencias',
    noTransfers: 'No has realizado transferencias aún.',
    myAccountsTitle: 'Mis Cuentas Registradas',
    requestsHistoryTitle: 'Historial de Solicitudes de Reembolso',
    newRequestTitle: 'Enviar Solicitud de Reembolso',
    betSlipLabel: 'ID Oficial del Boleto de Apuesta',
    betSlipPlaceholder: 'Ej: 48921849102 (Obligatorio para auditoría)',
    lossDateLabel: 'Fecha de la Pérdida',
    amountUsd: 'Monto del Reembolso',
    currencyLabel: 'Moneda del Reembolso',
    searchCurrencyPlaceholder: 'Buscar moneda (escribe 1 o 2 letras como EUR, USD, MXN, ARS...)',
    screenshotLabel: 'Captura de Pantalla / Comprobante (opcional)',
    notesLabel: 'Notas Adicionales',
    submitRequestBtn: 'Enviar Solicitud a Revisión',
    step1Title: 'Paso 1: Registrarse con código promocional',
    step1Desc: 'Haz clic en Confirmar Registro para abrir el sitio, copia el código promocional y luego regresa a ingresar tu ID de cuenta.',
    confirmRegBtn: 'Confirmar Registro en el Sitio',
    step2Title: 'Paso 2: Vincular tu ID de Cuenta',
    accountNumberPlaceholder: 'Ingresa tu número de cuenta (ID)',
    pinPlaceholder: 'PIN de seguridad (4 dígitos)',
    pinHint: 'Si es tu primer registro, este PIN quedará como tu clave maestra para todas las operaciones futuras.',
    telegramBotLive: 'Canal de Bot de Telegram',
    adminDemo: 'Panel de Administración',
    quickActions: 'Acciones Rápidas',
    responsibleGamingTitle: 'Juego Responsable (+18)',
    legalTermsTitle: 'Términos y Privacidad',
    securityTitle: 'Seguridad y Cumplimiento',
    languageSelect: 'Idioma',
    aiTacticalAnalysis: 'Análisis Táctico con Inteligencia Artificial',
    upcomingMatches: 'Partidos en Vivo y Próximos',
    sportsNewsFeed: 'Noticias Deportivas y Análisis',
    registerAndSite: 'Registro y Sitio',
    linkAccount: 'Vincular ID',
    editAccount: 'Editar ID',
    accountLabel: 'ID de Cuenta:',
    activeWallets: 'billeteras activas',
    unfreezeHint: '10% desbloqueo por referido',
    availableHint: 'Listo para retiro / uso',
    balanceProtectionTitle: 'Protección y desbloqueo:',
    companyWalletsTitle: 'Billeteras por Casa',
    totalWalletsPrefix: 'Balance Total',
    verifiedPartners: 'Socios Verificados',
    activeCount: 'Activos',
    searchCompanyPlaceholder: 'Buscar casa o código...',
    companyCardSubtitle: 'Regístrate con códigos oficiales para activar protección y reembolso.',
    officialPartnerBadge: 'Socio oficial verificado en vex.deals',
    aboutCompanyAndPerks: 'Sobre la casa y ventajas',
    officialPromoForComp: 'Código promocional oficial',
    promoWarning: '* Usa este código estrictamente durante el registro para garantizar elegibilidad.',
    perk1: 'Reembolso por porcentaje de pérdidas mensuales y semanales',
    perk2: 'Desbloqueo del 10% del saldo con cada referido activo y verificado',
    perk3: 'Transferencias seguras mediante la red protegida vex.deals',
    registerInCompany: 'Registrarse en',
    visitOfficialSite: 'Visitar sitio oficial',
    downloadAppApk: 'Descargar App (APK)',
    settings: {
      title: 'Seguridad y Ajustes',
      subtitle: 'Gestiona tu PIN, Teléfono, Instalación de App y Políticas',
      tabSecurity: 'Seguridad y Cuenta',
      tabCurrency: 'Moneda',
      tabLegal: 'Legal y Políticas',
      tabDelete: 'Eliminar Cuenta',
      tabInstall: 'Instalar App',
      displayCurrencyLabel: 'Seleccionar Moneda de Visualización:',
      linkedPhone: 'Número de Teléfono Vinculado',
      noPhoneLinked: 'Aún no has vinculado un teléfono',
      editPhone: 'Cambiar Número',
      linkPhoneNow: 'Vincular Ahora',
      linkedTelegram: 'Cuenta de Telegram vinculada:',
      changePinTitle: 'Cambiar PIN Secreto de Seguridad',
      currentPinLabel: 'PIN Actual (por defecto 1234):',
      newPinLabel: 'Nuevo PIN (4 dígitos):',
      confirmPinLabel: 'Confirmar Nuevo PIN:',
      savePinBtn: 'Guardar Nuevo PIN',
      pinSuccess: 'PIN de seguridad cambiado exitosamente.',
      pinLengthError: 'El nuevo PIN debe tener exactamente 4 dígitos.',
      pinMismatchError: 'La confirmación del nuevo PIN no coincide.',
      installTitle: 'Instalar Aplicación VEX Deals',
      installDesc: 'Disfruta de una experiencia rápida y optimizada en tu pantalla de inicio.',
      installBtn: 'Instalar Aplicación Ahora',
      alreadyInstalled: 'La app ya está instalada y funcionando en Modo Standalone.',
      browserMode: 'Modo Navegador',
      installedMode: 'App Instalada',
      deleteTitle: 'Eliminar Cuenta y Datos Permanentemente',
      deleteDesc: 'Conforme a las normativas de Apple y Google Play, puedes eliminar tu cuenta y datos por completo.',
      deletePrompt: 'Para confirmar la eliminación, escribe',
      deleteKeyword: 'ELIMINAR CUENTA',
      deleteBtn: 'Confirmar Eliminación de Datos',
      deleting: 'Borrando datos...',
    },
  },
  ru: {
    appName: 'VEX Deals',
    appSubtitle: 'Сделки для ставок и компенсация кэшбэка (vex.deals)',
    platformDomain: 'vex.deals',
    officialBadge: 'vex.deals Проверено',
    securityAudit: 'Аудит безопасности и устранение уязвимостей',
    themeLight: 'Светлая',
    themeDark: 'Темная',
    tabs: {
      companies: 'Компании и Сделки',
      wallets: 'Кошельки',
      referrals: 'Рефералы',
      transfers: 'Переводы',
      activity: 'История и Запросы',
      aiSports: 'Матчи и ИИ',
    },
    userPill: 'ID Пользователя',
    copied: 'Скопировано!',
    promoCode: 'Промокод',
    copyPromo: 'Копировать Код',
    registerBtn: 'Регистрация',
    appBtn: 'Скачать Приложение',
    detailsBtn: 'Детали',
    registeredBadge: 'Зарегистрирован и Активен',
    pendingBadge: 'На проверке',
    notRegisteredBadge: 'Не зарегистрирован',
    requestCompensation: 'Запросить Компенсацию',
    totalFrozen: 'Всего Заморожено',
    totalAvailable: 'Всего Доступно',
    frozenBalance: 'Замороженный Баланс',
    availableBalance: 'Доступный Баланс',
    frozenInfo: 'Замороженный баланс: 10% разблокируется при регистрации приглашенного друга (макс. 1 раз в 24 часа), либо можно перевести до 10% другу.',
    availableInfo: 'Доступный баланс готов к прямому депозиту, выводу или переводам без ограничений.',
    transferBtn: 'Перевод Другу',
    inviteBtn: 'Пригласить Друга',
    referralTitle: 'Спаси Друга (Rescue a Friend) - Реферальная система',
    referralDesc: 'Спасайте невезучих друзей! Поделитесь ссылкой. При регистрации друга он получает поддержку VEX Deals, а 10% вашего замороженного баланса моментально разблокируется в доступный кэш!',
    referralUnfreezeBadge: 'Мгновенная разблокировка 10% за каждое успешное спасение',
    selectPlatform: 'Выберите Платформу:',
    yourRefLinkFor: 'Ваша реферальная ссылка для',
    copyText: 'Копировать',
    codeLabel: 'Код:',
    shareLinkText: 'Поделиться Ссылкой',
    applyReferralTitle: 'Активировать Реферальный Код Друга',
    applyReferralDesc: 'Введите реферальный код, чтобы разблокировать 10% замороженного баланса',
    protectionBadge: 'Защищено',
    friendCodeLabel: 'Реферальный код друга (8 символов):',
    friendCodePlaceholder: 'напр. WC890X9K',
    myAccountInCompany: 'Номер вашего счета в',
    applyAndUnfreezeBtn: 'Применить и Разблокировать 10%',
    applyingText: 'Проверка и разблокировка...',
    referralsHistory: 'История Рефералов',
    noReferrals: 'Рефералов пока нет. Поделитесь кодом и начните зарабатывать!',
    statusActive: 'Активен',
    statusPending: 'На проверке',
    unlockedSuffix: 'разблокировано',
    transfersTitle: 'Перевод Баланса Друзьям',
    transfersDesc: 'Переводите до 10% замороженного баланса другу в той же компании (один раз на друга с защитой от кругового сговора). Требуется OTP.',
    friendAccount: 'Номер счета друга (в той же компании)',
    transferAmount: 'Сумма перевода',
    maxAllowedTransfer: 'Максимум разрешено (10% от замороженного):',
    sendTransferOtp: 'Отправить запрос и получить OTP',
    otpTitle: 'Подтверждение Перевода через OTP',
    otpDesc: 'Введите 4-значный код безопасности, отправленный на ваш номер телефона или Telegram.',
    confirmTransferBtn: 'Подтвердить Перевод',
    transferHistory: 'История Переводов',
    noTransfers: 'Вы еще не совершали переводов.',
    myAccountsTitle: 'Мои Зарегистрированные Счета',
    requestsHistoryTitle: 'История Запросов на Компенсацию',
    newRequestTitle: 'Подать Запрос на Компенсацию Убытков',
    betSlipLabel: 'Официальный номер купона ставки (Bet Slip ID)',
    betSlipPlaceholder: 'Например: 48921849102 (Обязательно для аудита)',
    lossDateLabel: 'Дата проигрыша',
    amountUsd: 'Сумма Компенсации',
    currencyLabel: 'Валюта Компенсации',
    searchCurrencyPlaceholder: 'Поиск валюты (введите 1-2 буквы: RUB, USD, EUR, KZT...)',
    screenshotLabel: 'Скриншот купона ставки (необязательно)',
    notesLabel: 'Дополнительные примечания',
    submitRequestBtn: 'Отправить Запрос на Проверку',
    step1Title: 'Шаг 1: Регистрация по промокоду',
    step1Desc: 'Нажмите Подтвердить Регистрацию, скопируйте промокод для максимального кэшбэка, затем вернитесь для ввода номера счета.',
    confirmRegBtn: 'Подтвердить Регистрацию на Сайте',
    step2Title: 'Шаг 2: Привязка Номера Счета',
    accountNumberPlaceholder: 'Введите ваш номер счета (ID)',
    pinPlaceholder: 'PIN-код безопасности (4 цифры)',
    pinHint: 'Если это ваша первая регистрация, этот PIN станет вашим мастер-кодом для всех будущих счетов.',
    telegramBotLive: 'Лента Telegram-бота',
    adminDemo: 'Панель Администратора',
    quickActions: 'Быстрые Действия',
    responsibleGamingTitle: 'Ответственная Игра (+18)',
    legalTermsTitle: 'Условия и Конфиденциальность',
    securityTitle: 'Безопасность и Соответствие',
    languageSelect: 'Язык',
    aiTacticalAnalysis: 'Тактический Анализ Матча с помощью ИИ',
    upcomingMatches: 'Прямые и предстоящие матчи',
    sportsNewsFeed: 'Спортивные новости и аналитика',
    registerAndSite: 'Регистрация и Сайт',
    linkAccount: 'Привязать ID',
    editAccount: 'Изменить ID',
    accountLabel: 'ID Аккаунта:',
    activeWallets: 'активных кошельков',
    unfreezeHint: '10% разблокировка за реферала',
    availableHint: 'Готов к выводу и ставкам',
    balanceProtectionTitle: 'Защита и разблокировка:',
    companyWalletsTitle: 'Кошельки по компаниям',
    totalWalletsPrefix: 'Всего в кошельках',
    verifiedPartners: 'Проверенные Партнеры',
    activeCount: 'Активных',
    searchCompanyPlaceholder: 'Поиск компании или промокода...',
    companyCardSubtitle: 'Регистрируйтесь по официальным промокодам для активации защиты кэшбэка.',
    officialPartnerBadge: 'Официальный проверенный партнер vex.deals',
    aboutCompanyAndPerks: 'О компании и преимуществах',
    officialPromoForComp: 'Официальный промокод для компенсации',
    promoWarning: '* Используйте этот промокод при регистрации для гарантии участия в программе компенсаций.',
    perk1: 'Возврат процента от ежемесячных и еженедельных убытков',
    perk2: 'Разморозка 10% баланса с каждым активным и проверенным рефералом',
    perk3: 'Безопасные переводы средств через защищенную от сговора сеть vex.deals',
    registerInCompany: 'Регистрация в',
    visitOfficialSite: 'Посетить официальный сайт',
    downloadAppApk: 'Скачать приложение (APK)',
    settings: {
      title: 'Безопасность и Настройки',
      subtitle: 'Управление PIN-кодом, телефоном, установкой приложения и политиками',
      tabSecurity: 'Безопасность и Аккаунт',
      tabCurrency: 'Валюта',
      tabLegal: 'Правила и Условия',
      tabDelete: 'Удалить Аккаунт',
      tabInstall: 'Установить Приложение',
      displayCurrencyLabel: 'Выберите валюту отображения:',
      linkedPhone: 'Привязанный Номер Телефона',
      noPhoneLinked: 'Номер телефона пока не привязан',
      editPhone: 'Изменить Номер',
      linkPhoneNow: 'Привязать Сейчас',
      linkedTelegram: 'Привязанный аккаунт Telegram:',
      changePinTitle: 'Смена Секретного PIN-кода',
      currentPinLabel: 'Текущий PIN (по умолчанию 1234):',
      newPinLabel: 'Новый PIN (4 цифры):',
      confirmPinLabel: 'Подтвердите Новый PIN:',
      savePinBtn: 'Сохранить Новый PIN',
      pinSuccess: 'PIN-код безопасности успешно изменен.',
      pinLengthError: 'Новый PIN-код должен состоять ровно из 4 цифр.',
      pinMismatchError: 'Подтверждение PIN-кода не совпадает.',
      installTitle: 'Установка Приложения VEX Deals',
      installDesc: 'Установите веб-приложение на главный экран для быстрого доступа и мгновенных уведомлений.',
      installBtn: 'Установить Приложение Сейчас',
      alreadyInstalled: 'Приложение уже установлено и работает в автономном режиме.',
      browserMode: 'Режим Браузера',
      installedMode: 'Приложение Установлено',
      deleteTitle: 'Полное Удаление Аккаунта и Данных',
      deleteDesc: 'В соответствии с требованиями Apple и Google Play вы можете удалить все данные навсегда.',
      deletePrompt: 'Для подтверждения удаления введите',
      deleteKeyword: 'УДАЛИТЬ АККАУНТ',
      deleteBtn: 'Подтвердить Удаление Данных',
      deleting: 'Удаление данных...',
    },
  },
};
