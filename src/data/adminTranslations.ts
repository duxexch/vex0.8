import { Language } from '../types';

export interface AdminTranslationSchema {
  common: {
    dashboardTitle: string;
    dashboardSubtitle: string;
    liveStatus: string;
    lockedTitle: string;
    enterPin: string;
    pinPlaceholder: string;
    unlockBtn: string;
    lockBtn: string;
    changePinBtn: string;
    closeBtn: string;
    fullscreen: string;
    minimize: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    refresh: string;
    search: string;
    filter: string;
    all: string;
    loading: string;
    success: string;
    error: string;
    copy: string;
    copied: string;
    defaultPinHint: string;
    pinError: string;
    newPinLabel: string;
    newPinPlaceholder: string;
    savePinBtn: string;
    standaloneMode: string;
  };
  tabs: {
    dedicated_brand: { title: string; desc: string };
    companies: { title: string; desc: string };
    company_api: { title: string; desc: string };
    integration_tester: { title: string; desc: string };
    integration_health: { title: string; desc: string };
    aso_suite: { title: string; desc: string };
    branding: { title: string; desc: string };
    compensation: { title: string; desc: string };
    phone_requests: { title: string; desc: string };
    telegram_bot: { title: string; desc: string };
    ai_agent: { title: string; desc: string };
    broadcast: { title: string; desc: string };
    ab_testing: { title: string; desc: string };
    notifications: { title: string; desc: string };
    compliance: { title: string; desc: string };
  };
  compensation: {
    title: string;
    subtitle: string;
    statTotal: string;
    statUnfreeze: string;
    statComp: string;
    statPending: string;
    statApproved: string;
    statApprovedAmount: string;
    filterAll: string;
    filterUnfreeze: string;
    filterComp: string;
    filterPending: string;
    filterApproved: string;
    filterRejected: string;
    searchPlaceholder: string;
    noRequests: string;
    noRequestsHint: string;
    selectAllVisible: string;
    pendingOnlyBtn: string;
    selectedCount: string;
    clearSelection: string;
    bulkActionBarTitle: string;
    bulkActionBarDesc: string;
    bulkApproveBtn: string;
    bulkApproving: string;
    bulkRejectBtn: string;
    bulkRejecting: string;
    typeUnfreeze: string;
    typeComp: string;
    statusPending: string;
    statusApprovedUnfreeze: string;
    statusApprovedComp: string;
    statusRejected: string;
    amountLabel: string;
    accountLabel: string;
    senderPhoneLabel: string;
    betSlipLabel: string;
    dateLabel: string;
    notesLabel: string;
    approveUnfreezeBtn: string;
    approveCompBtn: string;
    rejectBtn: string;
    emailNoticeBtn: string;
    verifiedBy: string;
    rejectModalTitle: string;
    bulkRejectModalTitle: string;
    bulkRejectModalDesc: string;
    rejectReasonPlaceholder: string;
    confirmRejectBtn: string;
    bulkSuccessMessage: string;
    bulkRejectSuccessMessage: string;
    singleApproveUnfreezeSuccess: string;
    singleApproveCompSuccess: string;
    singleRejectSuccess: string;
  };
  companies: {
    title: string;
    subtitle: string;
    addNewBtn: string;
    syncBtn: string;
    searchPlaceholder: string;
    activeStatus: string;
    inactiveStatus: string;
    promoCodeLabel: string;
    affiliateLinkLabel: string;
    appLinkLabel: string;
    minDepositLabel: string;
    commissionLabel: string;
    editBtn: string;
    saveBtn: string;
    deleteBtn: string;
    toggleActive: string;
    addModalTitle: string;
    nameLabel: string;
  };
  dedicatedBrand: {
    title: string;
    desc: string;
    selectCompany: string;
    allCompaniesOption: string;
    exclusiveModeLabel: string;
    exclusiveModeDesc: string;
    applyBtn: string;
    applying: string;
    appliedSuccess: string;
  };
  broadcast: {
    title: string;
    desc: string;
    titleLabel: string;
    titlePlaceholder: string;
    messageLabel: string;
    messagePlaceholder: string;
    categoryLabel: string;
    urgencyLabel: string;
    sendBtn: string;
    sending: string;
    sentSuccess: string;
  };
  aiAgent: {
    title: string;
    desc: string;
    statusLabel: string;
    modelLabel: string;
    triggerPredictionBtn: string;
    triggerBroadcastBtn: string;
    analyzing: string;
    successTriggered: string;
  };
  telegram: {
    title: string;
    desc: string;
    botTokenLabel: string;
    webhookLabel: string;
    testBotBtn: string;
    connected: string;
  };
  compliance: {
    title: string;
    desc: string;
    responsibleGaming: string;
    termsAndConditions: string;
    privacyPolicy: string;
    legalAudit: string;
  };
}

export const ADMIN_TRANSLATIONS: Record<Language, AdminTranslationSchema> = {
  ar: {
    common: {
      dashboardTitle: 'لوحة الإدارة والتحكم الشاملة',
      dashboardSubtitle: 'إدارة المنصة والتخصيص والتعويضات والتحليلات الذكية',
      liveStatus: 'متصل ومحمي',
      lockedTitle: 'بوابة الإدارة المركزية المحمية',
      enterPin: 'يرجى إدخال رمز PIN الرئيسي للوصول إلى لوحة التحكم',
      pinPlaceholder: 'رمز PIN المكون من 4 أرقام',
      unlockBtn: 'فتح لوحة التحكم',
      lockBtn: 'قفل الجلسة',
      changePinBtn: 'تغيير الرمز',
      closeBtn: 'إغلاق',
      fullscreen: 'شاشة كاملة',
      minimize: 'تصغير',
      save: 'حفظ التعديلات',
      cancel: 'إلغاء',
      delete: 'حذف',
      edit: 'تعديل',
      refresh: 'تحديث',
      search: 'بحث',
      filter: 'تصفية',
      all: 'الكل',
      loading: 'جاري التحميل...',
      success: 'تمت العملية بنجاح',
      error: 'حدث خطأ في النظام',
      copy: 'نسخ',
      copied: 'تم النسخ!',
      defaultPinHint: 'الرمز الافتراضي المعتمد للوكالة: 7788',
      pinError: 'رمز PIN غير صحيح! يرجى المحاولة مرة أخرى.',
      newPinLabel: 'رمز PIN الجديد (4 أرقام أو أكثر):',
      newPinPlaceholder: 'أدخل الرمز الجديد...',
      savePinBtn: 'تأكيد الحفظ',
      standaloneMode: 'نافذة مستقلة',
    },
    tabs: {
      dedicated_brand: { title: 'البراند المخصص', desc: 'تخصيص المنصة لشركة محددة حصرياً' },
      companies: { title: 'إدارة الشركات', desc: 'تعديل الروابط وأكواد البرومو والبيانات' },
      company_api: { title: 'تكامل API', desc: 'ربط ومزامنة بيانات الشركات آلياً' },
      integration_tester: { title: 'فاحص الأنظمة', desc: 'تدقيق واختبار نقاط التكامل والروابط' },
      integration_health: { title: 'صحة النظام', desc: 'مراقبة زمن الاستجابة وحالة الخدمات' },
      aso_suite: { title: 'أدوات ASO والمتاجر', desc: 'توليد ملفات PWA والبيانات الوصفية' },
      branding: { title: 'الهوية والشعار', desc: 'تخصيص الأيقونات والألوان والعلامة' },
      compensation: { title: 'التعويضات وفك التجميد', desc: 'تدقيق واعتماد الإيداعات وتعويضات الرهان' },
      phone_requests: { title: 'تعديل الهواتف', desc: 'مراجعة طلبات تغيير وتوثيق أرقام الهواتف' },
      telegram_bot: { title: 'بوت تيليجرام', desc: 'إعدادات التوكن والويب هوك والإشعارات' },
      ai_agent: { title: 'وكيل الذكاء الاصطناعي', desc: 'ضبط نموذج وتكتيكات التحليل الرياضي الذكي' },
      broadcast: { title: 'البث الموجه', desc: 'إرسال تنبيهات جماعية لكافة المستخدمين' },
      ab_testing: { title: 'اختبار A/B', desc: 'مقارنة أداء نموذجين من الإشعارات' },
      notifications: { title: 'سجل الإشعارات', desc: 'أرشيف التنبيهات ومعدلات التفاعل' },
      compliance: { title: 'الامتثال والسياسات', desc: 'سياسات المتاجر والخصوصية والشروط' },
    },
    compensation: {
      title: 'طلبات التعويض وفك التجميد المالي (1:1)',
      subtitle: 'مراجعة واعتماد طلبات تعويض خسائر الرهانات وإيداعات فك التجميد المباشرة',
      statTotal: 'إجمالي الطلبات المسجلة',
      statUnfreeze: 'إيداعات فك التجميد (1:1)',
      statComp: 'طلبات تعويض الخسارة',
      statPending: 'قيد المراجعة والتدقيق',
      statApproved: 'الطلبات المعتمدة',
      statApprovedAmount: 'إجمالي المبالغ المعتمدة',
      filterAll: 'الكل',
      filterUnfreeze: '🔓 إيداعات فك التجميد (1:1)',
      filterComp: '🛡️ طلبات التعويض',
      filterPending: '⏳ قيد المراجعة',
      filterApproved: '✅ المعتمدة',
      filterRejected: '❌ المرفوضة',
      searchPlaceholder: 'بحث برقم الحساب أو الهاتف أو الكود...',
      noRequests: 'لا توجد طلبات تطابق الفلتر أو معايير البحث الحالية.',
      noRequestsHint: 'يمكنك تغيير نوع الفلتر من الأعلى لعرض باقي العمليات.',
      selectAllVisible: 'تحديد الكل',
      pendingOnlyBtn: 'تحديد المعلقة فقط',
      selectedCount: 'تم تحديد',
      clearSelection: 'إلغاء التحديد',
      bulkActionBarTitle: 'إجراء جماعي فوري على الطلبات المحددة',
      bulkActionBarDesc: 'يمكنك اعتماد أو رفض جميع الطلبات المحددة بنقرة واحدة مع تحديث الأرصدة وإشعار أصحابها فورياً',
      bulkApproveBtn: 'اعتماد المحدد',
      bulkApproving: 'جاري الاعتماد...',
      bulkRejectBtn: 'رفض المحدد',
      bulkRejecting: 'جاري الرفض...',
      typeUnfreeze: 'إيداع فك تجميد مباشر (1:1)',
      typeComp: 'طلب تعويض خسارة رهان',
      statusPending: 'قيد المراجعة',
      statusApprovedUnfreeze: 'معتمد ومفكوك 1:1',
      statusApprovedComp: 'معتمد للرصيد المجمد',
      statusRejected: 'مرفوض',
      amountLabel: 'المبلغ المطلوب:',
      accountLabel: 'رقم الحساب بالشركة:',
      senderPhoneLabel: 'هاتف الإيداع المحول منه:',
      betSlipLabel: 'كود قسيمة الرهان:',
      dateLabel: 'تاريخ التقديم:',
      notesLabel: 'الملاحظات / المرجع: ',
      approveUnfreezeBtn: 'اعتماد وفك التجميد 1:1',
      approveCompBtn: 'اعتماد التعويض',
      rejectBtn: 'رفض',
      emailNoticeBtn: 'إيميل الاعتماد',
      verifiedBy: 'بواسطة:',
      rejectModalTitle: 'سبب رفض الطلب',
      bulkRejectModalTitle: 'تأكيد الرفض الجماعي للطلبات المحددة',
      bulkRejectModalDesc: 'سيتم رفض كافة الطلبات المحددة وتوثيق سبب الرفض وإشعار أصحابها فورياً في سجل الإشعارات.',
      rejectReasonPlaceholder: 'اكتب سبب الرفض الذي سيظهر للمستخدم...',
      confirmRejectBtn: 'تأكيد الرفض وإشعار المستخدم',
      bulkSuccessMessage: 'تم اعتماد الطلبات المحددة بنجاح وتحديث الأرصدة!',
      bulkRejectSuccessMessage: 'تم رفض الطلبات المحددة بنجاح وتوثيق سبب الرفض.',
      singleApproveUnfreezeSuccess: 'تم اعتماد الإيداع وفك تجميد الرصيد 1:1 بنجاح!',
      singleApproveCompSuccess: 'تم اعتماد طلب التعويض وإضافته للرصيد المجمد!',
      singleRejectSuccess: 'تم رفض الطلب بنجاح وإشعار العميل',
    },
    companies: {
      title: 'إدارة الشركات والوكالات الشريكة',
      subtitle: 'التحكم بروابط التسجيل، أكواد البرومو، ونسب العمولات والتعويضات',
      addNewBtn: 'إضافة شركة جديدة',
      syncBtn: 'مزامنة مع السيرفر',
      searchPlaceholder: 'بحث في الشركات المسجلة...',
      activeStatus: 'نشطة ومعتمدة',
      inactiveStatus: 'معطلة مؤقتاً',
      promoCodeLabel: 'كود البرومو المعتمد',
      affiliateLinkLabel: 'رابط التسجيل التابع',
      appLinkLabel: 'رابط تحميل التطبيق',
      minDepositLabel: 'الحد الأدنى للإيداع',
      commissionLabel: 'نسبة العمولة والتعويض',
      editBtn: 'تعديل البيانات',
      saveBtn: 'حفظ التعديلات',
      deleteBtn: 'حذف الشركة',
      toggleActive: 'تغيير الحالة',
      addModalTitle: 'إضافة شركة مراهنات أو كازينو جديدة',
      nameLabel: 'اسم الشركة الرسمي:',
    },
    dedicatedBrand: {
      title: 'نظام البراند المخصص والتطبيق الحصري',
      desc: 'يتيح هذا الوضع تخصيص تطبيق الويب بالكامل لشركة واحدة محددة مع إخفاء باقي الشركات وإظهار شعارها فقط.',
      selectCompany: 'اختر الشركة المستهدفة:',
      allCompaniesOption: 'كافة الشركات (الوضع الافتراضي متعدد الشركاء)',
      exclusiveModeLabel: 'تفعيل الوضع الحصري الصارم',
      exclusiveModeDesc: 'يقوم بحظر أي واجهة متعددة الشركاء ويثبت الواجهة على العلامة المختارة.',
      applyBtn: 'تطبيق التخصيص الآن',
      applying: 'جاري تطبيق الإعدادات...',
      appliedSuccess: 'تم تطبيق تخصيص البراند بنجاح!',
    },
    broadcast: {
      title: 'مركز البث والإشعارات الموجهة',
      desc: 'إرسال تنبيهات لحظية لكافة عملاء المنصة عبر Firebase Cloud Messaging والخادم الخلفي',
      titleLabel: 'عنوان الإشعار:',
      titlePlaceholder: 'مثال: تعويض فوري بنسبة 25% على ديربي مدريد!',
      messageLabel: 'نص الإشعار الترويجي:',
      messagePlaceholder: 'اكتب نص الإشعار هنا بشكل جذاب ومقنع...',
      categoryLabel: 'تصنيف الإشعار:',
      urgencyLabel: 'مستوى الأهمية:',
      sendBtn: 'إرسال الإشعار لجميع المشتركين',
      sending: 'جاري الإرسال...',
      sentSuccess: 'تم إرسال الإشعار بنجاح لكافة المستخدمين!',
    },
    aiAgent: {
      title: 'وكيل الذكاء الاصطناعي للتحليلات والتوقعات (Gemini 2.5)',
      desc: 'إدارة محرك التحليل الرياضي التكتيكي وتوليد التنبؤات التلقائية',
      statusLabel: 'حالة المحرك الذكي:',
      modelLabel: 'النموذج النشط:',
      triggerPredictionBtn: 'توليد توقع تكتيكي ذكي فوري',
      triggerBroadcastBtn: 'توليد وبث إشعار ترويجي بالذكاء الاصطناعي',
      analyzing: 'جاري التحليل واستدعاء Gemini...',
      successTriggered: 'تم تشغيل التحليل بنجاح وبث التوقعات!',
    },
    telegram: {
      title: 'إعدادات بوت تيليجرام المالي (@VexDealsBot)',
      desc: 'ربط البوت لتلقي تنبيهات الإيداع والتعويضات الفورية والتواصل مع العملاء',
      botTokenLabel: 'رمز توكن البوت (Bot Token):',
      webhookLabel: 'رابط الاستدعاء (Webhook URL):',
      testBotBtn: 'فحص اتصال البوت',
      connected: 'البوت متصل ويعمل بصورة ممتازة',
    },
    compliance: {
      title: 'الامتثال وسياسات المتاجر (Google Play & Apple)',
      desc: 'مراجعة معايير السلامة والألعاب المسؤولة ومتطلبات النشر الدولية',
      responsibleGaming: 'سياسة الألعاب المسؤولة وحدود الإيداع',
      termsAndConditions: 'الشروط والأحكام والامتثال القانوني',
      privacyPolicy: 'سياسة الخصوصية وحماية البيانات الشخصية',
      legalAudit: 'تدقيق الامتثال والتحقق من التراخيص',
    },
  },

  en: {
    common: {
      dashboardTitle: 'Master Admin Dashboard',
      dashboardSubtitle: 'Platform, Branding, Compensation & AI Forecast Management',
      liveStatus: 'Live & Secure',
      lockedTitle: 'Secure Master Admin Portal',
      enterPin: 'Enter your master PIN to access platform controls',
      pinPlaceholder: '4-digit Master PIN',
      unlockBtn: 'Unlock Dashboard',
      lockBtn: 'Lock Session',
      changePinBtn: 'Change PIN',
      closeBtn: 'Close',
      fullscreen: 'Fullscreen',
      minimize: 'Minimize',
      save: 'Save Changes',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      refresh: 'Refresh',
      search: 'Search',
      filter: 'Filter',
      all: 'All',
      loading: 'Loading...',
      success: 'Action completed successfully',
      error: 'System error occurred',
      copy: 'Copy',
      copied: 'Copied!',
      defaultPinHint: 'Authorized master agency PIN: 7788',
      pinError: 'Incorrect PIN! Please try again.',
      newPinLabel: 'New PIN (4 digits or more):',
      newPinPlaceholder: 'Enter new PIN...',
      savePinBtn: 'Confirm & Save',
      standaloneMode: 'Standalone Window',
    },
    tabs: {
      dedicated_brand: { title: 'Dedicated Brand', desc: 'Deploy platform exclusively for a single brand' },
      companies: { title: 'Companies & Partners', desc: 'Manage affiliate links, promo codes & data' },
      company_api: { title: 'Company API', desc: 'Automated data synchronization & webhooks' },
      integration_tester: { title: 'Integration Tester', desc: 'Audit endpoints, APIs, and partner tracking' },
      integration_health: { title: 'System Health', desc: 'Monitor service uptime, latency, and workers' },
      aso_suite: { title: 'ASO & Store Suite', desc: 'Generate PWA manifest and store app metadata' },
      branding: { title: 'Branding & Identity', desc: 'Customize icons, theme colors & visual presets' },
      compensation: { title: 'Compensation & Unfreezes', desc: 'Audit and approve deposits & bet compensations' },
      phone_requests: { title: 'Phone Change Verification', desc: 'Review user mobile number update requests' },
      telegram_bot: { title: 'Telegram Bot', desc: 'Configure bot token, webhooks, and alerts' },
      ai_agent: { title: 'AI Match Agent', desc: 'Tune Gemini AI tactical models & forecasts' },
      broadcast: { title: 'Push Broadcasts', desc: 'Send mass push notifications to all users' },
      ab_testing: { title: 'A/B Testing', desc: 'Compare resonance of two push variants' },
      notifications: { title: 'Dispatch History', desc: 'Archived notifications & delivery logs' },
      compliance: { title: 'Store Compliance & Legal', desc: 'Review Google Play & App Store policies' },
    },
    compensation: {
      title: 'Compensation & Direct Unfreeze Requests (1:1)',
      subtitle: 'Audit, verify, and approve user loss compensations and direct deposit unfreezes',
      statTotal: 'Total Requests',
      statUnfreeze: 'Direct Unfreeze (1:1)',
      statComp: 'Loss Compensations',
      statPending: 'Pending Audit',
      statApproved: 'Approved Requests',
      statApprovedAmount: 'Total Approved Volume',
      filterAll: 'All',
      filterUnfreeze: '🔓 Unfreezes (1:1)',
      filterComp: '🛡️ Loss Comp',
      filterPending: '⏳ Pending',
      filterApproved: '✅ Approved',
      filterRejected: '❌ Rejected',
      searchPlaceholder: 'Search account, phone, ID...',
      noRequests: 'No requests match the selected filter or search criteria.',
      noRequestsHint: 'Try switching the filter above to view other transactions.',
      selectAllVisible: 'Select All',
      pendingOnlyBtn: 'Pending Only',
      selectedCount: 'Selected',
      clearSelection: 'Clear Selection',
      bulkActionBarTitle: 'Instant Bulk Action on Selected Requests',
      bulkActionBarDesc: 'Approve or reject all selected requests with a single click, updating balances and notifying users immediately',
      bulkApproveBtn: 'Approve Selected',
      bulkApproving: 'Approving...',
      bulkRejectBtn: 'Reject Selected',
      bulkRejecting: 'Rejecting...',
      typeUnfreeze: 'Deposit Unfreeze 1:1',
      typeComp: 'Loss Compensation Request',
      statusPending: 'Pending Audit',
      statusApprovedUnfreeze: 'Approved & Unfrozen 1:1',
      statusApprovedComp: 'Approved to Frozen Balance',
      statusRejected: 'Rejected',
      amountLabel: 'Amount:',
      accountLabel: 'Account ID:',
      senderPhoneLabel: 'Sender Phone:',
      betSlipLabel: 'Bet Slip ID:',
      dateLabel: 'Submitted Date:',
      notesLabel: 'Notes / Reference: ',
      approveUnfreezeBtn: 'Approve & Unfreeze 1:1',
      approveCompBtn: 'Approve Comp',
      rejectBtn: 'Reject',
      emailNoticeBtn: 'Email Notice',
      verifiedBy: 'Verified by:',
      rejectModalTitle: 'Reason for Rejecting Request',
      bulkRejectModalTitle: 'Confirm Bulk Rejection for Selected Requests',
      bulkRejectModalDesc: 'All selected requests will be rejected with the documented reason and notifications dispatched immediately.',
      rejectReasonPlaceholder: 'Enter rejection reason visible to users...',
      confirmRejectBtn: 'Confirm Rejection & Notify Users',
      bulkSuccessMessage: 'Successfully approved all selected requests and credited balances!',
      bulkRejectSuccessMessage: 'Successfully rejected all selected requests with documented reasons.',
      singleApproveUnfreezeSuccess: 'Deposit approved and balance unfrozen 1:1 successfully!',
      singleApproveCompSuccess: 'Compensation approved and credited to frozen balance!',
      singleRejectSuccess: 'Request rejected successfully and user notified',
    },
    companies: {
      title: 'Partner Companies & Affiliates',
      subtitle: 'Manage partner tracking links, promo codes, and compensation rates',
      addNewBtn: 'Add New Company',
      syncBtn: 'Sync with Server',
      searchPlaceholder: 'Search registered companies...',
      activeStatus: 'Active & Verified',
      inactiveStatus: 'Temporarily Paused',
      promoCodeLabel: 'Official Promo Code',
      affiliateLinkLabel: 'Affiliate Signup Link',
      appLinkLabel: 'App Download Link',
      minDepositLabel: 'Minimum Deposit',
      commissionLabel: 'Commission & Compensation Rate',
      editBtn: 'Edit Details',
      saveBtn: 'Save Changes',
      deleteBtn: 'Delete Company',
      toggleActive: 'Toggle Status',
      addModalTitle: 'Add New Sportsbook or Casino Partner',
      nameLabel: 'Official Company Name:',
    },
    dedicatedBrand: {
      title: 'Dedicated Brand & Single-Partner Platform',
      desc: 'Deploy the web application exclusively under a single partner brand, hiding other companies and setting their logo as primary.',
      selectCompany: 'Select Target Company:',
      allCompaniesOption: 'All Companies (Default Multi-Partner Mode)',
      exclusiveModeLabel: 'Enable Strict Exclusive Mode',
      exclusiveModeDesc: 'Blocks any multi-partner navigation and locks the view to the selected partner.',
      applyBtn: 'Apply Dedicated Branding Now',
      applying: 'Applying configurations...',
      appliedSuccess: 'Dedicated branding applied successfully!',
    },
    broadcast: {
      title: 'Targeted Push Notification Center',
      desc: 'Broadcast real-time push notifications to all users via FCM and Docker background workers',
      titleLabel: 'Notification Title:',
      titlePlaceholder: 'e.g., Instant 25% Compensation on Madrid Derby!',
      messageLabel: 'Promotional Message Body:',
      messagePlaceholder: 'Write engaging, high-conversion copy here...',
      categoryLabel: 'Category:',
      urgencyLabel: 'Urgency Level:',
      sendBtn: 'Broadcast to All Users',
      sending: 'Dispatching...',
      sentSuccess: 'Broadcast sent successfully to all subscribed devices!',
    },
    aiAgent: {
      title: 'Gemini AI Tactical Sports Engine',
      desc: 'Configure tactical match analysis models and automate forecast broadcasts',
      statusLabel: 'Engine Status:',
      modelLabel: 'Active AI Model:',
      triggerPredictionBtn: 'Generate Live Tactical Forecast',
      triggerBroadcastBtn: 'AI-Craft & Broadcast Promo Push',
      analyzing: 'Invoking Gemini AI engine...',
      successTriggered: 'Analysis completed and forecasts broadcasted!',
    },
    telegram: {
      title: 'Telegram Financial Bot (@VexDealsBot)',
      desc: 'Connect Telegram bot for real-time deposit receipts, compensation approvals, and direct communication',
      botTokenLabel: 'Bot API Token:',
      webhookLabel: 'Webhook Endpoint URL:',
      testBotBtn: 'Verify Bot Connection',
      connected: 'Bot connected and operating with zero latency',
    },
    compliance: {
      title: 'Store Compliance & Legal Standards',
      desc: 'Verify Google Play and Apple App Store guidelines, responsible gaming limits, and license compliance',
      responsibleGaming: 'Responsible Gaming & Deposit Limits Policy',
      termsAndConditions: 'Terms, Conditions & Regulatory Compliance',
      privacyPolicy: 'User Privacy & Data Protection Protocols',
      legalAudit: 'Legal Licensing & Partner Verification Audit',
    },
  },

  ru: {
    common: {
      dashboardTitle: 'Панель главного администратора',
      dashboardSubtitle: 'Управление платформой, брендингом, компенсациями и ИИ-аналитикой',
      liveStatus: 'В сети и защищено',
      lockedTitle: 'Защищенный портал администратора',
      enterPin: 'Введите мастер-PIN для доступа к управлению платформой',
      pinPlaceholder: '4-значный мастер-PIN',
      unlockBtn: 'Разблокировать панель',
      lockBtn: 'Заблокировать сессию',
      changePinBtn: 'Изменить PIN',
      closeBtn: 'Закрыть',
      fullscreen: 'Во весь экран',
      minimize: 'Свернуть',
      save: 'Сохранить изменения',
      cancel: 'Отмена',
      delete: 'Удалить',
      edit: 'Редактировать',
      refresh: 'Обновить',
      search: 'Поиск',
      filter: 'Фильтр',
      all: 'Все',
      loading: 'Загрузка...',
      success: 'Операция успешно завершена',
      error: 'Произошла системная ошибка',
      copy: 'Копировать',
      copied: 'Скопировано!',
      defaultPinHint: 'Авторизованный мастер-PIN агентства: 7788',
      pinError: 'Неверный PIN! Пожалуйста, попробуйте снова.',
      newPinLabel: 'Новый PIN (от 4 цифр):',
      newPinPlaceholder: 'Введите новый PIN...',
      savePinBtn: 'Подтвердить и сохранить',
      standaloneMode: 'Автономное окно',
    },
    tabs: {
      dedicated_brand: { title: 'Выделенный бренд', desc: 'Привязка платформы к единому бренду' },
      companies: { title: 'Компании и партнеры', desc: 'Управление ссылками, промокодами и условиями' },
      company_api: { title: 'API компаний', desc: 'Автоматическая синхронизация данных и вебхуки' },
      integration_tester: { title: 'Тестер интеграций', desc: 'Проверка эндпоинтов, API и трекинга' },
      integration_health: { title: 'Состояние системы', desc: 'Мониторинг аптайма, задержек и воркеров' },
      aso_suite: { title: 'ASO и манифест', desc: 'Генерация PWA-манифеста и метаданных магазинов' },
      branding: { title: 'Айдентика и брендинг', desc: 'Настройка цветов темы, иконок и логотипов' },
      compensation: { title: 'Компенсации и разморозки', desc: 'Проверка и одобрение депозитов и убытков' },
      phone_requests: { title: 'Запросы на смену телефона', desc: 'Проверка запросов пользователей на изменение номера' },
      telegram_bot: { title: 'Telegram-бот', desc: 'Настройки токена бота, вебхуков и оповещений' },
      ai_agent: { title: 'ИИ-агент спортивной аналитики', desc: 'Тонкая настройка моделей тактики Gemini' },
      broadcast: { title: 'Таргетированные пуши', desc: 'Массовая рассылка уведомлений всем пользователям' },
      ab_testing: { title: 'A/B тестирование', desc: 'Сравнение конверсии двух вариантов уведомлений' },
      notifications: { title: 'История рассылок', desc: 'Архив отправленных пушей и журналы доставки' },
      compliance: { title: 'Соответствие правилам магазинов', desc: 'Политики Google Play, App Store и безопасность' },
    },
    compensation: {
      title: 'Заявки на компенсацию и разморозку (1:1)',
      subtitle: 'Проверка, аудит и одобрение заявок на компенсацию ставок и прямых депозитов',
      statTotal: 'Всего заявок в системе',
      statUnfreeze: 'Разморозка депозитов (1:1)',
      statComp: 'Компенсации проигрышей',
      statPending: 'На проверке и аудите',
      statApproved: 'Одобренные заявки',
      statApprovedAmount: 'Общая сумма одобрений',
      filterAll: 'Все',
      filterUnfreeze: '🔓 Разморозки (1:1)',
      filterComp: '🛡️ Компенсации',
      filterPending: '⏳ На проверке',
      filterApproved: '✅ Одобренные',
      filterRejected: '❌ Отклоненные',
      searchPlaceholder: 'Поиск по номеру счета, телефону, ID...',
      noRequests: 'Заявок, соответствующих выбранному фильтру или поиску, не найдено.',
      noRequestsHint: 'Попробуйте изменить параметры фильтрации вверху.',
      selectAllVisible: 'Выбрать все',
      pendingOnlyBtn: 'Только ожидающие',
      selectedCount: 'Выбрано',
      clearSelection: 'Снять выбор',
      bulkActionBarTitle: 'Мгновенное массовое действие с выбранными заявками',
      bulkActionBarDesc: 'Одобрите или отклоните все выбранные заявки в один клик с моментальным обновлением баланса и оповещением пользователей',
      bulkApproveBtn: 'Одобрить выбранные',
      bulkApproving: 'Одобрение...',
      bulkRejectBtn: 'Отклонить выбранные',
      bulkRejecting: 'Отклонение...',
      typeUnfreeze: 'Прямая разморозка депозита 1:1',
      typeComp: 'Заявка на компенсацию ставки',
      statusPending: 'На проверке',
      statusApprovedUnfreeze: 'Одобрено и разморожено 1:1',
      statusApprovedComp: 'Одобрено на замороженный баланс',
      statusRejected: 'Отклонено',
      amountLabel: 'Сумма заявки:',
      accountLabel: 'Номер счета в БК:',
      senderPhoneLabel: 'Телефон отправителя перевода:',
      betSlipLabel: 'Номер купона ставки:',
      dateLabel: 'Дата подачи:',
      notesLabel: 'Примечания / Ссылка: ',
      approveUnfreezeBtn: 'Одобрить и разморозить 1:1',
      approveCompBtn: 'Одобрить компенсацию',
      rejectBtn: 'Отклонить',
      emailNoticeBtn: 'Email-уведомление',
      verifiedBy: 'Проверил:',
      rejectModalTitle: 'Причина отклонения заявки',
      bulkRejectModalTitle: 'Подтверждение массового отклонения выбранных заявок',
      bulkRejectModalDesc: 'Все выбранные заявки будут отклонены с фиксацией указанной причины, а пользователи получат мгновенное уведомление.',
      rejectReasonPlaceholder: 'Укажите причину отклонения, которая отобразится пользователю...',
      confirmRejectBtn: 'Подтвердить отклонение и уведомить',
      bulkSuccessMessage: 'Все выбранные заявки успешно одобрены, а балансы пополнены!',
      bulkRejectSuccessMessage: 'Все выбранные заявки отклонены с фиксацией причины.',
      singleApproveUnfreezeSuccess: 'Депозит успешно одобрен, баланс разморожен 1:1!',
      singleApproveCompSuccess: 'Компенсация одобрена и зачислена на замороженный баланс!',
      singleRejectSuccess: 'Заявка отклонена, пользователю отправлено уведомление',
    },
    companies: {
      title: 'Управление компаниями и партнерами',
      subtitle: 'Контроль партнерских ссылок, промокодов, условий и ставок компенсации',
      addNewBtn: 'Добавить компанию',
      syncBtn: 'Синхронизация с сервером',
      searchPlaceholder: 'Поиск по зарегистрированным компаниям...',
      activeStatus: 'Активна и проверена',
      inactiveStatus: 'Временно приостановлена',
      promoCodeLabel: 'Официальный промокод',
      affiliateLinkLabel: 'Партнерская ссылка регистрации',
      appLinkLabel: 'Ссылка на скачивание приложения',
      minDepositLabel: 'Минимальный депозит',
      commissionLabel: 'Ставка комиссии и компенсации',
      editBtn: 'Редактировать',
      saveBtn: 'Сохранить изменения',
      deleteBtn: 'Удалить компанию',
      toggleActive: 'Переключить статус',
      addModalTitle: 'Добавить нового букмекера или казино',
      nameLabel: 'Официальное название компании:',
    },
    dedicatedBrand: {
      title: 'Режим выделенного бренда и эксклюзивности',
      desc: 'Позволяет брендировать веб-приложение под одного конкретного партнера, скрывая всех остальных и отображая его айдентику.',
      selectCompany: 'Выберите целевую компанию:',
      allCompaniesOption: 'Все компании (По умолчанию: мульти-партнерский режим)',
      exclusiveModeLabel: 'Включить строгий эксклюзивный режим',
      exclusiveModeDesc: 'Блокирует переключение на других партнеров и фиксирует интерфейс на выбранном бренде.',
      applyBtn: 'Применить брендинг сейчас',
      applying: 'Применение параметров...',
      appliedSuccess: 'Брендинг успешно настроен и применен!',
    },
    broadcast: {
      title: 'Центр таргетированных пуш-уведомлений',
      desc: 'Мгновенная отправка пушей всем клиентам платформы через Firebase Cloud Messaging и фоновые воркеры',
      titleLabel: 'Заголовок уведомления:',
      titlePlaceholder: 'Например: Мгновенная компенсация 25% на мадридское дерби!',
      messageLabel: 'Текст промо-сообщения:',
      messagePlaceholder: 'Напишите привлекательный продающий текст здесь...',
      categoryLabel: 'Категория:',
      urgencyLabel: 'Уровень срочности:',
      sendBtn: 'Отправить рассылку всем пользователям',
      sending: 'Отправка...',
      sentSuccess: 'Рассылка успешно доставлена на устройства пользователей!',
    },
    aiAgent: {
      title: 'Тактический спортивный ИИ-движок (Gemini 2.5)',
      desc: 'Управление спортивной аналитикой, тактическими моделями и авто-генерацией прогнозов',
      statusLabel: 'Статус движка:',
      modelLabel: 'Активная ИИ-модель:',
      triggerPredictionBtn: 'Сгенерировать тактический прогноз',
      triggerBroadcastBtn: 'ИИ-генерация и рассылка промо-пуша',
      analyzing: 'Запуск анализа и запрос к Gemini...',
      successTriggered: 'Анализ завершен, прогноз успешно сгенерирован и опубликован!',
    },
    telegram: {
      title: 'Финансовый Telegram-бот (@VexDealsBot)',
      desc: 'Интеграция бота для уведомлений о депозитах, компенсациях и оперативной связи с клиентами',
      botTokenLabel: 'API-токен бота:',
      webhookLabel: 'URL эндпоинта Webhook:',
      testBotBtn: 'Проверить связь с ботом',
      connected: 'Бот подключен и функционирует стабильно',
    },
    compliance: {
      title: 'Соответствие правилам магазинов (Google Play & Apple)',
      desc: 'Проверка стандартов безопасности, правил ответственной игры и требований регуляторов',
      responsibleGaming: 'Политика ответственной игры и лимиты депозитов',
      termsAndConditions: 'Правила, условия и лицензионное соответствие',
      privacyPolicy: 'Политика конфиденциальности и защита данных',
      legalAudit: 'Юридический аудит и проверка лицензий партнеров',
    },
  },
  es: {
    common: {
      dashboardTitle: 'Panel de Administración Principal',
      dashboardSubtitle: 'Gestión de plataforma, marca, compensaciones y pronósticos IA',
      liveStatus: 'En vivo y seguro',
      lockedTitle: 'Portal de Administración Seguro',
      enterPin: 'Ingrese el PIN maestro para acceder a la configuración',
      pinPlaceholder: 'PIN maestro de 4 dígitos',
      unlockBtn: 'Desbloquear panel',
      lockBtn: 'Bloquear sesión',
      changePinBtn: 'Cambiar PIN',
      closeBtn: 'Cerrar',
      fullscreen: 'Pantalla completa',
      minimize: 'Minimizar',
      save: 'Guardar cambios',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      refresh: 'Actualizar',
      search: 'Buscar',
      filter: 'Filtrar',
      all: 'Todos',
      loading: 'Cargando...',
      success: 'Operación completada con éxito',
      error: 'Ocurrió un error en el sistema',
      copy: 'Copiar',
      copied: '¡Copiado!',
      defaultPinHint: 'PIN maestro autorizado de agencia: 7788',
      pinError: '¡PIN incorrecto! Intente nuevamente.',
      newPinLabel: 'Nuevo PIN (4 dígitos o más):',
      newPinPlaceholder: 'Ingrese nuevo PIN...',
      savePinBtn: 'Confirmar y guardar',
      standaloneMode: 'Ventana independiente',
    },
    tabs: {
      dedicated_brand: { title: 'Marca Dedicada', desc: 'Desplegar plataforma para una sola marca' },
      companies: { title: 'Empresas y Socios', desc: 'Gestionar enlaces, códigos promocionales y datos' },
      company_api: { title: 'API de Empresas', desc: 'Sincronización automática de datos' },
      integration_tester: { title: 'Probador de Integración', desc: 'Auditar puntos de enlace y API' },
      integration_health: { title: 'Salud del Sistema', desc: 'Monitorear tiempo de actividad y latencia' },
      aso_suite: { title: 'Suite ASO y Tiendas', desc: 'Generar manifiesto PWA y metadatos' },
      branding: { title: 'Identidad y Marca', desc: 'Personalizar iconos, colores y logotipos' },
      compensation: { title: 'Compensaciones y Descongelamientos', desc: 'Auditar y aprobar depósitos y pérdidas' },
      phone_requests: { title: 'Verificación de Teléfonos', desc: 'Revisar solicitudes de cambio de número' },
      telegram_bot: { title: 'Bot de Telegram', desc: 'Configurar token, webhooks y alertas' },
      ai_agent: { title: 'Agente IA Deportivo', desc: 'Ajustar modelos tácticos con Gemini IA' },
      broadcast: { title: 'Difusión de Notificaciones', desc: 'Enviar notificaciones push masivas' },
      ab_testing: { title: 'Pruebas A/B', desc: 'Comparar rendimiento de 2 variantes de mensaje' },
      notifications: { title: 'Historial de Envíos', desc: 'Archivo de notificaciones y registros' },
      compliance: { title: 'Cumplimiento Legal y Tiendas', desc: 'Políticas de Google Play y App Store' },
    },
    compensation: {
      title: 'Compensaciones y Descongelamiento Directo (1:1)',
      subtitle: 'Auditar, verificar y aprobar compensaciones de apuestas y depósitos 1:1',
      statTotal: 'Total de Solicitudes',
      statUnfreeze: 'Descongelamiento Directo (1:1)',
      statComp: 'Compensaciones de Pérdidas',
      statPending: 'En Revisión',
      statApproved: 'Solicitudes Aprobadas',
      statApprovedAmount: 'Monto Total Aprobado',
      filterAll: 'Todos',
      filterUnfreeze: '🔓 Descongelamientos (1:1)',
      filterComp: '🛡️ Compensaciones',
      filterPending: '⏳ En Revisión',
      filterApproved: '✅ Aprobados',
      filterRejected: '❌ Rechazados',
      searchPlaceholder: 'Buscar por cuenta, teléfono, ID...',
      noRequests: 'No hay solicitudes que coincidan con los criterios.',
      noRequestsHint: 'Pruebe cambiando los filtros arriba.',
      selectAllVisible: 'Seleccionar Todos',
      pendingOnlyBtn: 'Solo Pendientes',
      selectedCount: 'Seleccionados',
      clearSelection: 'Limpiar Selección',
      bulkActionBarTitle: 'Acción masiva instantánea sobre solicitudes seleccionadas',
      bulkActionBarDesc: 'Apruebe o rechace todas las solicitudes con un solo clic',
      bulkApproveBtn: 'Aprobar Seleccionados',
      bulkApproving: 'Aprobando...',
      bulkRejectBtn: 'Rechazar Seleccionados',
      bulkRejecting: 'Rechazando...',
      typeUnfreeze: 'Depósito Descongelamiento 1:1',
      typeComp: 'Compensación de Pérdida',
      statusPending: 'En Revisión',
      statusApprovedUnfreeze: 'Aprobado y Descongelado 1:1',
      statusApprovedComp: 'Aprobado a Saldo Congelado',
      statusRejected: 'Rechazado',
      amountLabel: 'Monto:',
      accountLabel: 'ID de Cuenta:',
      senderPhoneLabel: 'Teléfono Remitente:',
      betSlipLabel: 'ID de Boleto:',
      dateLabel: 'Fecha:',
      notesLabel: 'Notas / Referencia: ',
      approveUnfreezeBtn: 'Aprobar y Descongelar 1:1',
      approveCompBtn: 'Aprobar Comp',
      rejectBtn: 'Rechazar',
      emailNoticeBtn: 'Aviso por Email',
      verifiedBy: 'Verificado por:',
      rejectModalTitle: 'Motivo del Rechazo',
      bulkRejectModalTitle: 'Confirmar Rechazo Masivo de Solicitudes',
      bulkRejectModalDesc: 'Todas las solicitudes seleccionadas serán rechazadas con el motivo documentado.',
      rejectReasonPlaceholder: 'Escriba el motivo visible al usuario...',
      confirmRejectBtn: 'Confirmar Rechazo y Notificar',
      bulkSuccessMessage: '¡Solicitudes aprobadas y saldos acreditados con éxito!',
      bulkRejectSuccessMessage: 'Solicitudes rechazadas con éxito.',
      singleApproveUnfreezeSuccess: '¡Depósito aprobado y descongelado 1:1 con éxito!',
      singleApproveCompSuccess: '¡Compensación aprobada y acreditada al saldo congelado!',
      singleRejectSuccess: 'Solicitud rechazada con éxito y usuario notificado',
    },
    companies: {
      title: 'Empresas y Afiliados Asociados',
      subtitle: 'Gestionar enlaces de afiliados, códigos promocionales y comisiones',
      addNewBtn: 'Añadir Nueva Empresa',
      syncBtn: 'Sincronizar con Servidor',
      searchPlaceholder: 'Buscar empresas registradas...',
      activeStatus: 'Activa y Verificada',
      inactiveStatus: 'Pausada Temporalmente',
      promoCodeLabel: 'Código Promo Oficial',
      affiliateLinkLabel: 'Enlace de Afiliado',
      appLinkLabel: 'Enlace de Descarga de App',
      minDepositLabel: 'Depósito Mínimo',
      commissionLabel: 'Tasa de Comisión y Compensación',
      editBtn: 'Editar Detalles',
      saveBtn: 'Guardar Cambios',
      deleteBtn: 'Eliminar Empresa',
      toggleActive: 'Cambiar Estado',
      addModalTitle: 'Añadir Nueva Casa de Apuestas o Casino',
      nameLabel: 'Nombre Oficial de la Empresa:',
    },
    dedicatedBrand: {
      title: 'Marca Dedicada y Plataforma Exclusiva',
      desc: 'Despliegue la aplicación web exclusivamente para una marca socia específica.',
      selectCompany: 'Seleccionar Empresa Objetivo:',
      allCompaniesOption: 'Todas las Empresas (Modo Multi-Socio)',
      exclusiveModeLabel: 'Activar Modo Exclusivo Estricto',
      exclusiveModeDesc: 'Bloquea la navegación multi-socio y fija la vista en la marca seleccionada.',
      applyBtn: 'Aplicar Marca Dedicada',
      applying: 'Aplicando configuración...',
      appliedSuccess: '¡Marca dedicada aplicada con éxito!',
    },
    broadcast: {
      title: 'Centro de Notificaciones Push Masivas',
      desc: 'Difunda notificaciones en tiempo real a todos los usuarios',
      titleLabel: 'Título de la Notificación:',
      titlePlaceholder: 'Ej: ¡25% de compensación inmediata en el clásico!',
      messageLabel: 'Cuerpo del Mensaje:',
      messagePlaceholder: 'Escriba un mensaje atractivo aquí...',
      categoryLabel: 'Categoría:',
      urgencyLabel: 'Nivel de Urgencia:',
      sendBtn: 'Difundir a Todos los Usuarios',
      sending: 'Enviando...',
      sentSuccess: '¡Notificación enviada con éxito!',
    },
    aiAgent: {
      title: 'Motor Táctico Deportivo IA (Gemini 2.5)',
      desc: 'Configure modelos de análisis deportivo y automatice pronósticos',
      statusLabel: 'Estado del Motor:',
      modelLabel: 'Modelo IA Activo:',
      triggerPredictionBtn: 'Generar Pronóstico Táctico en Vivo',
      triggerBroadcastBtn: 'Generar y Difundir Notificación con IA',
      analyzing: 'Invocando motor Gemini IA...',
      successTriggered: '¡Análisis completado y pronósticos emitidos!',
    },
    telegram: {
      title: 'Bot Financiero de Telegram (@VexDealsBot)',
      desc: 'Conecte el bot para avisos de depósito, compensaciones y soporte',
      botTokenLabel: 'Token de API del Bot:',
      webhookLabel: 'URL de Webhook:',
      testBotBtn: 'Probar Conexión del Bot',
      connected: 'Bot conectado y funcionando con normalidad',
    },
    compliance: {
      title: 'Cumplimiento Normativo y Tiendas',
      desc: 'Verifique directrices de Google Play, App Store y juego responsable',
      responsibleGaming: 'Juego Responsable y Límites de Depósito',
      termsAndConditions: 'Términos, Condiciones y Cumplimiento',
      privacyPolicy: 'Privacidad y Protección de Datos',
      legalAudit: 'Auditoría Legal y Verificación de Licencias',
    },
  },
};

export function tLang(lang: Language, ar: string, en: string, ru: string, es?: string): string {
  if (lang === 'ru') return ru;
  if (lang === 'en') return en;
  if (lang === 'es' && es) return es;
  return ar;
}
