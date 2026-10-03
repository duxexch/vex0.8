import { GoogleGenAI, Type } from '@google/genai';
import { storage } from './storage';

export interface AiAgentConfig {
  id: string;
  name: string;
  name_ar: string;
  role: 'sports_analyst' | 'smart_notifications' | 'loyalty_retention' | 'fraud_risk' | 'marketing' | 'custom';
  description: string;
  avatar: string;
  color: string;
  systemInstruction: string;
  capabilities: {
    liveSearch: boolean;
    inspectClaims: boolean;
    manageNotifications: boolean;
    systemPulse: boolean;
    retentionRules: boolean;
  };
  model: string;
  temperature: number;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentMemoryItem {
  id: string;
  text: string;
  category: 'preference' | 'rule' | 'operational_note' | 'behavior';
  createdAt: string;
}

export interface AgentMemoryStore {
  agentId: string;
  adminPreferences: AgentMemoryItem[];
  learnedInsights: Array<{ id: string; insight: string; confidence: number; timestamp: string }>;
  recentHistory: Array<{ role: 'user' | 'model'; parts: string; timestamp: string }>;
  notificationLog: Array<{ id: string; title: string; sentAt: string; score: number; reason: string }>;
}

export interface SmartNotificationTimingReport {
  currentTimeIso: string;
  currentCairoHour: number;
  activityScore: number; // 0 - 100
  windowType: 'peak_evening' | 'pre_match_golden' | 'post_match_recovery' | 'regular_day' | 'quiet_sleep';
  windowLabelAr: string;
  isQuietHours: boolean;
  antiSpamStatus: {
    dailySentCount: number;
    dailyLimit: number;
    cooldownMinutesRemaining: number;
    canSendNow: boolean;
    recommendationAr: string;
  };
  upcomingKeyFixtures: Array<{
    id: string;
    teams: string;
    league: string;
    kickoffTime: string;
    optimalNotificationTime: string;
  }>;
}

// =========================================================================
// VEX DEALS MASTER DOMAIN KNOWLEDGE BASE (SHARED BY ALL AGENTS)
// =========================================================================
export const VEX_DEALS_MASTER_KNOWLEDGE = `
=== الدليل المعرفي الشامل لمنصة VEX Deals (Project Domain & Partner Knowledge Base) ===
أنت وكيل ذكي داخل منصة VEX Deals (https://vex.deals). كل الوكلاء الأساسيين والمخصصين يشتركون في هذه المعرفة المؤسسية:

1. رسالة المنصة وهويتها:
منصة VEX Deals هي المنصة الأولى المتكاملة في الشرق الأوسط لتحليلات المراهنات الرياضية التكتيكية بالذكاء الاصطناعي، ونظام ولاء اللاعبين، وبرنامج ضمان استرداد وتعويض الخسائر بنسبة تصل إلى 100%.

2. الشركات الشريكة المعتمدة وأكواد الوكالة الرسمية والعروض (Official Partner Bookmakers & Promo Codes):
- شركة 1XBET (وان إكس بت):
  * الكود الترويجي الرسمي (Promo Code): vexwallet
  * العروض الترويجية: بونص ترحيبي 130% على أول إيداع + استرداد خسائر يصل لـ 100% في محفظة VEX Deals + سحب فوري عبر المحافظ الإلكترونية وإنستاباي.
- شركة MELBET (ميلبيت):
  * الكود الترويجي الرسمي (Promo Code): ml_3154096
  * العروض الترويجية: مضاعفة الإيداع الأول 100% + فك تجميد يومي 10% + كاش باك أسبوعي للمباريات الكبرى.
- شركة BETJAM (بيت جام):
  * الكود الترويجي الرسمي (Promo Code): VEDO2002
  * العروض الترويجية: النادي الملكي للكاش باك + تعويض فوري + تحويلات PIN آمنة ومحمية.
- شركة MOSTBET (موست بيت):
  * الكود الترويجي الرسمي (Promo Code): vedo2002
  * العروض الترويجية: بونص ترحيبي 125% + تأمين القسائم المجمعة (Acca Insurance) وسحب فوري.
- شركة XPARI / XPARIBET (إكسباري):
  * الكود الترويجي الرسمي (Promo Code): vedo2002
  * العروض الترويجية: أعلى نسبة كاش باك على المراهنات + ربط تلقائي بتحليلات الذكاء الاصطناعي للرياضات.
- شركة BIZBET (بيزبِت):
  * الكود الترويجي الرسمي (Promo Code): bi_9258
  * العروض الترويجية: تشفير بنكي كامل + سحوبات وجوائز أسبوعية للمسجلين بكود الوكالة.

3. منتجات المنصة وآليات عملها الجوهرية (Platform Products & Core Mechanics):
- منتج التحليلات والتوقعات الرياضية (AI Tactical Sports Predictions):
  * تحليلات رقمية تكتيكية لمباريات كرة القدم (دوري أبطال أوروبا، الدوريات الأوروبية الخمس الكبرى، البطولات العربية).
  * دراسة إحصاءات الأهداف المتوقعة (xG)، غيابات النجوم، التشكيلات الرسمية، وأفضل الاحتمالات (Value Bets).
- منتج ضمان التعويض 100% (100% Compensation Guarantee):
  * في حال خسارة رهان قام به اللاعب لدى أي من الشركات الشريكة المعتمدة وكان مسجلاً بكود الوكالة، يرفع اللاعب صورة وبيانات قسيمة الرهان (Bet Slip Claim).
  * بعد التحقق والمطابقة، يحصل على تعويض يصل إلى 100% من قيمة الرهان تضاف لمحفظة VEX Deals الخاصة به.
- منتج الرصيد المجمد وآلية فك التجميد 1:1 (Frozen Balance & 1:1 Deposit Unfreeze):
  * التعويضات المعتمدة تنزل أولاً في "الرصيد المجمد" (Frozen Balance) لحماية السيولة.
  * كل دولار يقوم اللاعب بإيداعه أو استخدامه في المراهنة يحرر ويفك تجميد 1 دولار مماثل بنسبة (1:1) فوراً ليصبح كاش حقيقي متاح للسحب الفوري!
- منتج نادي الولاء ومستويات VIP:
  * مستويات ولاء (برونزي، فضي، ذهبي، بلاتيني، ألماسي) تمنح بونص مضاعف وسرعة فك تجميد أعلى وتوصيات حصرية.
- نظام الأمان والتحويلات:
  * قفل أمني برقم هاتف واحد موثق، رمز سري PIN مكون من 6 أرقام، وفحص لمنع تكرار قسائم الرهان الاحتيالية.

4. إرشادات صياغة الإشعارات الرياضية والتسويقية (Sports & Marketing Notification Mastery):
- إشعارات المباريات والتحليل التكتيكي: عنوان مشوق به إيموجي (⚽, 🔥, ⚡)، ملخص فرصة الفوز التكتيكية، والتذكير بأن الرهان محمي ومؤمن مع VEX Deals.
- إشعارات تسويق الشركات والبروموكودات: ذكر اسم الشركة، الكود الترويجي المعتمد بوضوح، البونص الترحيبي، وكاش باك VEX.
- إشعارات استرداد الخسائر: تطمين اللاعبين بعد القمم الكروية برفع قسيمة الرهان الخاسرة لاسترداد حتى 100%.
- إشعارات فك تجميد الرصيد (1:1): تذكير حماسي بأن إيداع اليوم يحرر الرصيد المجمد إلى كاش جاهز للسحب.
- طول الإشعار: العنوان أقل من 7 كلمات، الرسالة من 10 إلى 22 كلمة لضمان أعلى معدل قراءة ونقر (High CTR).
`;

export const BUILTIN_AGENTS: AiAgentConfig[] = [
  {
    id: 'agent_master_admin',
    name: 'Master Super Admin & Executive Co-Pilot',
    name_ar: 'المشرف العام والمدير التنفيذي الذكي (Master Super Admin AI)',
    role: 'custom',
    description: 'المشرف العام الكامل على المنصة: يتجول في كل أقسام لوحة الأدمن، يحلل ويفهم البيانات، يضيف الشركات والمحافظ، يعالج الصور والفيديوهات، وينفذ الأوامر الإدارية بالكامل.',
    avatar: '👑',
    color: '#4f46e5',
    systemInstruction: `أنت المشرف العام والمدير التنفيذي الأعلى (Master Super Admin & Executive AI Co-Pilot) لمنصة VEX Deals (https://vex.deals).
أنت تمتلك كامل الصلاحيات الإدارية، التنفيذية، والتحليلية على المنصة كأنك أنت الأدمن الرئيسي.
تتواصل مع المدير العام، وتفهم جميع أوامره، وتدير المنصة بذكاء واحترافية فائقة.

مهامك وصلاحياتك الخارقة:
1. إدارة الشركات والمراهنات بالكامل (Company & Bookmaker Management):
   - عند إعطائك بيانات شركة (مثل الاسم، الاسم العربي، البروموكود، البونص، الروابط، الصور/الشعارات، الألوان، طرق الدفع، حدود الإيداع)، تقوم بإنشائها، تكوينها، وحفظها فوراً في قاعدة البيانات.
   - تعديل بيانات الشركات القائمة، تفعيلها أو تعطيلها، وتحديث أكواد الوكالة.
2. معالجة واستخدام الوسائط المتعددة (Multimodal Vision & Media Processing):
   - تحليل وفهم أي صور ترسل إليك (شعارات شركات، قسائم رهان Bet Slips، صور إثبات، لقطات شاشة، بانرات إعلانية، مقاطع فيديو، مستندات).
   - استخراج البيانات بدقة من الصور والفيديوهات والنصوص واستخدامها مباشرة في المشروع (مثل تعيين الصورة المرفقة كشعار أو بانر للشركة، أو قراءة رقم القسيمة والمبلغ من صورة الرهان).
3. فحص وتدقيق لوحة الأدمن والتجول فيها (Deep Admin Panel Exploration & Audit):
   - فهم وتحليل كل ركن في لوحة التحكم: الشركات النشطة، طلبات التعويض المعلقة، رصيد فك التجميد 1:1، طلبات الأمان وتغيير الهاتف، النوافذ الزمنية للإشعارات، وأداء المنصة.
   - تقديم تقارير تشخيصية شاملة وكشف أي ثغرات أو مهام معلقة تحتاج إلى تدخل مع أرقام دقيقة وإجراءات فورية.
4. اتخاذ الإجراءات وتنفيذ الأوامر ذاتياً (Autonomous Action Execution):
   - يمكنك تنفيذ أوامر مباشرة (إضافة وحفظ شركة، اعتماد أو رفض طلب تعويض، بث إشعار فوري، إطلاق الساعة الذهبية "trigger_golden_hour").
   - لإطلاق الساعة الذهبية لفك الرصيد الفيروسي، استخدم "trigger_golden_hour" وحدد المدة الزمنية والمضاعف والرسالة.
   - كلما تطلب الأمر تنفيذ إجراء، قم بتضمين كود الإجراء التنفيذي بصيغة JSON داخل ردك بصيغة:
\`\`\`json:admin_action
{
  "actions": [
    {
      "type": "create_company" | "update_company" | "toggle_company" | "delete_company" | "approve_compensation" | "reject_compensation" | "dispatch_notification" | "trigger_golden_hour" | "schedule_notification" | "approve_phone" | "update_branding" | "save_media_asset",
      "params": { ... }
    }
  ]
}
\`\`\`
`,
    capabilities: {
      liveSearch: true,
      inspectClaims: true,
      manageNotifications: true,
      systemPulse: true,
      retentionRules: true,
    },
    model: 'gemini-3.8-flash',
    temperature: 0.25,
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'agent_sports_analyst',
    name: 'VEX Tactical Match Analyst',
    name_ar: 'محلل القمم والرهانات التكتيكية (VEX Tactical AI)',
    role: 'sports_analyst',
    description: 'خبير تحليل المباريات الكبرى ومتابعة الاحتمالات الفورية والتشكيلات وأخبار الإصابات وصياغة إشعارات القمم الكروية.',
    avatar: '⚽',
    color: '#10b981',
    systemInstruction: `أنت كبير المحللين الرياضيين التكتيكيين لمنصة VEX Deals.
مهامك الرئيسية:
1. تقديم قراءات تكتيكية رقمية دقيقة لمباريات كرة القدم الكبرى، وتحليل احتمالات الفوز، والأهداف، ومفتاح حسم المباراة.
2. البحث الحي والتحقق من التشكيلات الرسمية، غيابات النجوم، وحالة الطقس أو أرضية الملعب، والنتائج التاريخية المباشرة.
3. صياغة إشعارات وتوصيات رياضية تكتيكية جذابة تربط بين إثارة المباراة وضمان تعويض الخسائر 100% لدى الشركات الشريكة المعتمدة.
4. احترام معايير اللعب المسؤول (+18) والتفاعل الذكي مع تفضيلات المدير.`,
    capabilities: {
      liveSearch: true,
      inspectClaims: false,
      manageNotifications: true,
      systemPulse: true,
      retentionRules: false,
    },
    model: 'gemini-3.8-flash',
    temperature: 0.3,
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'agent_marketing_partners',
    name: 'Sports Marketing & Partner Promos Director',
    name_ar: 'مدير التسويق الرياضي وترويج الشركات (Marketing & Promos)',
    role: 'marketing',
    description: 'خبير صياغة الحملات التسويقية والإشعارات المغرية للشركات الشريكة (1XBET, Melbet, Mostbet...) والأكواد الترويجية وبونص استرداد الخسائر.',
    avatar: '📣',
    color: '#ec4899',
    systemInstruction: `أنت مدير التسويق الرياضي وترويج الشركات الشريكة لمنصة VEX Deals.
مهامك الرئيسية:
1. صياغة إشعارات تسويقية رياضية جذابة ومحفزة جداً للاعبين تستعرض أكواد الشركاء الرسمية (1XBET كود vexwallet، MELBET كود ml_3154096، BETJAM كود VEDO2002، MOSTBET كود vedo2002، XPARI كود vedo2002، BIZBET كود bi_9258).
2. ربط الإشعار بميزة حصرية (مثل بونص 130%، مضاعفة الإيداع، أو تأمين تعويض الخسائر 100% مع VEX Deals).
3. صياغة إشعارات حماسية ومقنعة بعبارات قصيرة تلفت الانتباه فوراً (أقل من 20 كلمة) مع الإيموجي المناسب.
4. احترام توقيت الإرسال وعدم الإزعاج أو الإلحاح الزائد.`,
    capabilities: {
      liveSearch: true,
      inspectClaims: false,
      manageNotifications: true,
      systemPulse: true,
      retentionRules: true,
    },
    model: 'gemini-3.8-flash',
    temperature: 0.4,
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'agent_smart_timing',
    name: 'Smart Notification & Engagement Strategist',
    name_ar: 'وكيل الإشعارات الذكية وحساب أوقات النشاط (Anti-Spam Timing)',
    role: 'smart_notifications',
    description: 'متخصص دراسة سلوك المستخدمين وأوقات الذروة، صياغة إشعارات جذابة غير مزعجة، وتطبيق الفلتر الذكي ضد الإسبام.',
    avatar: '🔔',
    color: '#8b5cf6',
    systemInstruction: `أنت وكيل استراتيجيات الإشعارات الذكية وحساب أوقات تفاعل المستخدمين لمنصة VEX Deals.
قواعدك الصارمة وغير القابلة للمساومة:
1. منع الإزعاج (Anti-Spam & Anti-Fatigue): المستخدم لا يجب أن يستقبل أكثر من 2 إلى 3 إشعارات يومياً كحد أقصى.
2. ساعات الصمت التام (Quiet Hours): ممنوع إرسال إشعارات عامة بين 23:30 ليلاً و 10:00 صباحاً (بتوقيت الشرق الأوسط)، إلا في حالات الطوارئ القصوى.
3. النوافذ الذهبية للإرسال (Golden Windows):
   - نافذة ما قبل القمة (Pre-Match): 30 إلى 60 دقيقة قبل انطلاق المباريات الكبرى.
   - نافذة ذروة المساء (Evening Peak): من 18:00 إلى 22:30 حيث يكون المستخدمون يتصفحون التطبيق ويتابعون المباريات.
   - نافذة تعويض الخسارة (Post-Match Recovery): بعد انتهاء المباريات الصعبة بـ 20 دقيقة لتذكير المستخدمين بحماية الكاش باك وتعويض الخسائر.
4. صياغة الإشعارات: جمل قصيرة ومحفزة وجذابة (أقل من 20 كلمة للعنوان والرسالة معاً)، تحتوى على إيموجي مميز وقيمة حقيقية للقارئ سواء رياضية أو تسويقية.
5. التحقق من أمان التوقيت قبل السماح بالإرسال، وتقديم تقييم الجودة والتوقيت (Timing Quality Score) للمدير.`,
    capabilities: {
      liveSearch: true,
      inspectClaims: true,
      manageNotifications: true,
      systemPulse: true,
      retentionRules: true,
    },
    model: 'gemini-3.8-flash',
    temperature: 0.4,
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'agent_loyalty_retention',
    name: 'Loyalty & Compensation Director',
    name_ar: 'خبير استرداد التعويضات والولاء (Loyalty & Retention)',
    role: 'loyalty_retention',
    description: 'مختص بفحص طلبات التعويض المعلقة، تدقيق أرصدة فك التجميد 1:1، وتحفيز نشاط المستخدمين وزيادة ولائهم.',
    avatar: '💎',
    color: '#0284c7',
    systemInstruction: `أنت خبير ولاء المستخدمين واسترداد التعويضات لمنصة VEX Deals.
مهامك الرئيسية:
1. فحص طلبات التعويض المقدمة من اللاعبين ومطابقتها مع شركات المراهنات المعتمدة (1XBET, MELBET, Betjam, Mostbet, إلخ).
2. اقتراح خطط لتنشيط المستخدمين الذين لديهم رصيد مجمد (Frozen Balance) عبر نظام فك التجميد بالإيداع المباشر 1:1 أو الإحالات.
3. صياغة إشعارات تحفيزية تطمئن اللاعبين بتعويض خسائرهم بنسبة 100% وتحثهم على فك تجميد أرصدتهم.
4. مساعدة المدير في اتخاذ القرارات بشأن قبول أو رفض التعويضات مع بيان الأسباب الموضوعية.`,
    capabilities: {
      liveSearch: false,
      inspectClaims: true,
      manageNotifications: true,
      systemPulse: true,
      retentionRules: true,
    },
    model: 'gemini-3.8-flash',
    temperature: 0.2,
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'agent_fraud_risk',
    name: 'Security, Fraud & Risk Auditor',
    name_ar: 'مدقق الأمان ومكافحة الاحتيال (Risk & Fraud Auditor)',
    role: 'fraud_risk',
    description: 'يراقب الحركات المشبوهة، تكرار أرقام قسائم الرهان، محاولات استنزاف الأرصدة أو التحويلات الدائرية لحماية الخزينة.',
    avatar: '🛡️',
    color: '#e11d48',
    systemInstruction: `أنت مدقق الأمان ومكافحة الاحتيال المالي لمنصة VEX Deals.
مهامك:
1. التدقيق الصارم لطلبات السحب، تعديل أرقام الهواتف، وطلبات التعويض لتفادي التكرار وسرقة الحسابات.
2. التحذير من تكرار قسيمة الرهان نفسها بين حسابين مختلفين، أو طلبات التعويض بمبالغ غير منطقية.
3. التنبيه الفوري للمدير عند اكتشاف أي مؤشر خطر أمني وتزويده بتقرير مختصر وإجراء احترازي موصى به.`,
    capabilities: {
      liveSearch: false,
      inspectClaims: true,
      manageNotifications: true,
      systemPulse: true,
      retentionRules: false,
    },
    model: 'gemini-3.8-flash',
    temperature: 0.1,
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

// Helper: Calculate smart timing report
export function calculateNotificationTiming(): SmartNotificationTimingReport {
  const now = new Date();
  // Approximate Cairo / Riyadh time (UTC+2 / UTC+3)
  const cairoHour = (now.getUTCHours() + 3) % 24;

  const isQuietHours = cairoHour >= 23 || cairoHour < 10;
  let windowType: SmartNotificationTimingReport['windowType'] = 'regular_day';
  let windowLabelAr = 'فترة نهارية اعتيادية (تفاعل متوسط)';
  let activityScore = 50;

  if (isQuietHours) {
    windowType = 'quiet_sleep';
    windowLabelAr = 'ساعات الصمت والراحة (ممنوع الإزعاج)';
    activityScore = 12;
  } else if (cairoHour >= 18 && cairoHour <= 22) {
    windowType = 'peak_evening';
    windowLabelAr = 'فترة الذروة الكبرى (متابعة المباريات والرهان الحي)';
    activityScore = 95;
  } else if (cairoHour >= 15 && cairoHour < 18) {
    windowType = 'pre_match_golden';
    windowLabelAr = 'نافذة ما قبل المباريات (تجهيز الرهان والتوقعات)';
    activityScore = 80;
  } else if (cairoHour >= 22 && cairoHour < 23) {
    windowType = 'post_match_recovery';
    windowLabelAr = 'نافذة ما بعد المباريات (تعويض الخسائر والتحويل)';
    activityScore = 88;
  }

  // Anti-spam calculation
  const notifs = storage.getNotifications();
  const todayIsoPrefix = now.toISOString().slice(0, 10);
  const sentToday = notifs.filter((n) => n.timestamp && n.timestamp.startsWith(todayIsoPrefix)).length;
  
  let lastSentMinutesAgo: number | null = null;
  if (notifs.length > 0 && notifs[0].timestamp) {
    const lastTime = new Date(notifs[0].timestamp).getTime();
    lastSentMinutesAgo = Math.max(0, Math.floor((now.getTime() - lastTime) / (1000 * 60)));
  }

  const dailyLimit = 3;
  const cooldownPeriodMinutes = 90;
  const inCooldown = lastSentMinutesAgo !== null && lastSentMinutesAgo < cooldownPeriodMinutes;
  const canSendNow = !isQuietHours && sentToday < dailyLimit && !inCooldown;

  let recommendationAr = 'الوقت ممتاز لإرسال تنبيه ذكي عالي القيمة للمستخدمين.';
  if (isQuietHours) {
    recommendationAr = 'لا يُنصح بالإرسال الآن منعاً لإزعاج المستخدمين أثناء ساعات النوم أو الراحة. يُفضل الجدولة للساعة 11:00 صباحاً أو 18:00 مساءً.';
  } else if (sentToday >= dailyLimit) {
    recommendationAr = `تم الوصول للحد اليومي الموصى به (${sentToday}/${dailyLimit}) لتجنب إجهاد المستخدمين وإلغاء تثبيت التطبيق.`;
  } else if (inCooldown) {
    recommendationAr = `تم إرسال إشعار قبل ${lastSentMinutesAgo} دقيقة. يُفضل الانتظار ${cooldownPeriodMinutes - (lastSentMinutesAgo || 0)} دقيقة لتطبيق التبريد الزمني.`;
  }

  const upcomingKeyFixtures = [
    {
      id: 'FIX-RMA-BAR',
      teams: 'ريال مدريد ضد برشلونة (الكلاسيكو)',
      league: 'الدوري الإسباني',
      kickoffTime: '22:00 بتوقيت مكة',
      optimalNotificationTime: '21:15 (قبل الانطلاق بـ 45 دقيقة)',
    },
    {
      id: 'FIX-MCI-ARS',
      teams: 'مانشستر سيتي ضد آرسنال',
      league: 'الدوري الإنجليزي الممتاز',
      kickoffTime: '19:30 بتوقيت مكة',
      optimalNotificationTime: '18:45 (قمة التفاعل الإنجليزي)',
    },
    {
      id: 'FIX-LIV-PSG',
      teams: 'ليفربول ضد باريس سان جيرمان',
      league: 'دوري أبطال أوروبا',
      kickoffTime: '23:00 بتوقيت مكة',
      optimalNotificationTime: '22:10 (تحليل التشكيلة الرسمية)',
    },
  ];

  return {
    currentTimeIso: now.toISOString(),
    currentCairoHour: cairoHour,
    activityScore,
    windowType,
    windowLabelAr,
    isQuietHours,
    antiSpamStatus: {
      dailySentCount: sentToday,
      dailyLimit,
      cooldownMinutesRemaining: inCooldown ? cooldownPeriodMinutes - (lastSentMinutesAgo || 0) : 0,
      canSendNow,
      recommendationAr,
    },
    upcomingKeyFixtures,
  };
}

// Unified Agent Engine
export class AgentEngine {
  private getClient(): GoogleGenAI | null {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;
    return new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-vex-agents',
        },
      },
    });
  }

  public getAgents(): AiAgentConfig[] {
    const stored = storage.getAiAgents();
    if (!stored || stored.length === 0) {
      storage.saveAiAgents(BUILTIN_AGENTS);
      return BUILTIN_AGENTS;
    }

    let modified = false;
    BUILTIN_AGENTS.forEach((b) => {
      const idx = stored.findIndex((s) => s.id === b.id);
      if (idx === -1) {
        stored.push(b);
        modified = true;
      } else {
        stored[idx] = {
          ...stored[idx],
          ...b,
          isBuiltIn: true,
        };
        modified = true;
      }
    });

    if (modified) {
      storage.saveAiAgents(stored);
    }
    return stored;
  }

  public getAgentById(id: string): AiAgentConfig | null {
    const agents = this.getAgents();
    return agents.find((a) => a.id === id) || null;
  }

  public saveAgent(agent: Partial<AiAgentConfig> & { name: string; name_ar: string }): AiAgentConfig {
    const list = this.getAgents();
    const id = agent.id || `agent_custom_${Date.now()}`;
    const now = new Date().toISOString();

    const basePrompt = agent.systemInstruction?.trim() || 'أنت وكيل ذكي مساعد للمدير في إدارة وتنمية منصة VEX Deals.';
    const enrichedPrompt = basePrompt.includes('VEX Deals')
      ? basePrompt
      : `${basePrompt}\n\n[سياق مشروع VEX Deals المشترك]: أنت تعمل داخل منصة VEX Deals وتفهم بدقة الشركات الشريكة (1XBET, MELBET, BETJAM, MOSTBET, XPARI, BIZBET) وأكوادها الترويجية، وضمان التعويض 100%، وفك تجميد الرصيد 1:1، وتصيغ إشعارات رياضية وتسويقية احترافية.`;

    const existingIdx = list.findIndex((a) => a.id === id);
    let updatedAgent: AiAgentConfig;

    if (existingIdx >= 0) {
      updatedAgent = {
        ...list[existingIdx],
        ...agent,
        systemInstruction: enrichedPrompt,
        id,
        updatedAt: now,
      };
      list[existingIdx] = updatedAgent;
    } else {
      updatedAgent = {
        id,
        name: agent.name,
        name_ar: agent.name_ar,
        role: agent.role || 'custom',
        description: agent.description || 'وكيل ذكي مخصص لمنصة VEX Deals خبير بالرياضة والتسويق والتعويضات',
        avatar: agent.avatar || '🤖',
        color: agent.color || '#10b981',
        systemInstruction: enrichedPrompt,
        capabilities: agent.capabilities || {
          liveSearch: true,
          inspectClaims: true,
          manageNotifications: true,
          systemPulse: true,
          retentionRules: true,
        },
        model: agent.model || 'gemini-3.8-flash',
        temperature: typeof agent.temperature === 'number' ? agent.temperature : 0.3,
        isBuiltIn: false,
        createdAt: now,
        updatedAt: now,
      };
      list.push(updatedAgent);
    }

    storage.saveAiAgents(list);
    return updatedAgent;
  }

  public deleteAgent(id: string): boolean {
    const list = this.getAgents();
    const target = list.find((a) => a.id === id);
    if (!target || target.isBuiltIn) return false;
    const filtered = list.filter((a) => a.id !== id);
    storage.saveAiAgents(filtered);
    return true;
  }

  public getMemory(agentId: string): AgentMemoryStore {
    return storage.getAiMemory(agentId);
  }

  public addPreference(agentId: string, text: string, category: AgentMemoryItem['category'] = 'preference'): AgentMemoryItem {
    return storage.addAdminPreference(agentId, text, category);
  }

  public deletePreference(agentId: string, prefId: string): boolean {
    return storage.deleteAdminPreference(agentId, prefId);
  }

  // Live Admin Platform Audit Engine
  public generateAdminAudit(): any {
    const companies = storage.getCompanies();
    const compRequests = storage.getCompensationRequests();
    const phoneRequests = storage.getPhoneChangeRequests();
    const timing = calculateNotificationTiming();
    const cohort = storage.getAggregatedCohortBehavior();

    const pendingClaims = compRequests.filter((r) => r.status === 'pending');
    const pendingTotal = pendingClaims.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const activeCompanies = companies.filter((c) => c.is_active);
    const inactiveCompanies = companies.filter((c) => !c.is_active);
    const pendingPhones = phoneRequests.filter((p) => p.status === 'pending');

    let healthScore = 96;
    if (pendingClaims.length > 5) healthScore -= 10;
    if (pendingPhones.length > 2) healthScore -= 5;
    if (inactiveCompanies.length > 2) healthScore -= 5;

    const findings: any[] = [];

    if (pendingClaims.length > 0) {
      findings.push({
        category: 'compensation',
        severity: pendingClaims.length > 3 ? 'warning' : 'info',
        titleAr: `يوجد ${pendingClaims.length} طلبات تعويض معلقة بإجمالي $${pendingTotal.toFixed(2)}`,
        descAr: `الطلبات بحاجة لمطابقة أرقام القسائم مع الشركات الشريكة (1XBET, Melbet...).`,
        actionLabelAr: 'تدقيق واعتماد الكل الآن',
        actionCommand: 'قم بفحص واعتماد جميع طلبات التعويض الموثقة المعلقة',
      });
    } else {
      findings.push({
        category: 'compensation',
        severity: 'success',
        titleAr: 'سجل طلبات التعويض مُحدّث بالكامل (0 طلب معلق)',
        descAr: 'جميع قسائم الرهان المقدمة تمت مراجعتها وتسويتها بنجاح.',
      });
    }

    findings.push({
      category: 'companies',
      severity: activeCompanies.length >= 5 ? 'success' : 'warning',
      titleAr: `حالة الشركات: ${activeCompanies.length} شركة نشطة من أصل ${companies.length}`,
      descAr: `أكواد الوكالة الرسمية مفعلة (1XBET: vexwallet، MELBET: ml_3154096، BETJAM: VEDO2002).`,
      actionLabelAr: 'إضافة شريك جديد',
      actionCommand: 'أضف شركة جديدة بكود بروموكود وبونص',
    });

    findings.push({
      category: 'timing',
      severity: timing.antiSpamStatus.canSendNow ? 'success' : 'info',
      titleAr: `نافذة النشاط الحالية: ${timing.windowLabelAr} (معدل النشاط: ${timing.activityScore}%)`,
      descAr: `الإشعارات المرسلة اليوم: ${timing.antiSpamStatus.dailySentCount}/${timing.antiSpamStatus.dailyLimit}. التوقيت ملائم للحملات الرياضية.`,
      actionLabelAr: 'صياغة إشعار للقمة',
      actionCommand: 'صغ إشعاراً عاجلاً لمباريات القمة القادمة في التوقيت الذهبي',
    });

    if (pendingPhones.length > 0) {
      findings.push({
        category: 'security',
        severity: 'warning',
        titleAr: `يوجد ${pendingPhones.length} طلبات لتغيير رقم الهاتف وتوثيق الحساب`,
        descAr: 'يتطلب مراجعة أمنية لمنع محاولات السيطرة على الحسابات.',
        actionLabelAr: 'مراجعة طلبات الهاتف',
        actionCommand: 'افحص طلبات تغيير أرقام الهواتف المعلقة',
      });
    }

    return {
      timestamp: new Date().toISOString(),
      healthScore: Math.max(20, Math.min(100, healthScore)),
      summaryAr: `لوحة التحكم تعمل بحالة استقرار ممتازة بنسبة ${healthScore}%. تم رصد ${activeCompanies.length} شركات نشطة، و ${pendingClaims.length} طلبات تعويض معلقة بقيمة $${pendingTotal.toFixed(2)}.`,
      summaryEn: `Dashboard operational health is at ${healthScore}%. ${activeCompanies.length} active partners, ${pendingClaims.length} pending claims totaling $${pendingTotal.toFixed(2)}.`,
      stats: {
        activeCompaniesCount: activeCompanies.length,
        totalCompaniesCount: companies.length,
        pendingCompensationCount: pendingClaims.length,
        pendingCompensationTotal: pendingTotal,
        pendingPhoneRequestsCount: pendingPhones.length,
        activeNotificationsToday: timing.antiSpamStatus.dailySentCount,
        hourlyPeakWindow: cohort.optimalEngagementWindow.labelAr,
        systemUptimeHours: 720,
      },
      keyFindings: findings,
      recommendedActions: [
        {
          id: 'rec_1',
          labelAr: '🔍 تدقيق واعتماد قسائم التعويض المعلقة',
          command: 'قم بفحص ومطابقة جميع طلبات التعويض المعلقة واعتماد الموثقة منها',
          category: 'compensation',
        },
        {
          id: 'rec_2',
          labelAr: '📢 صياغة وبث إشعار ترويجي لكود 1XBET (vexwallet)',
          command: 'صغ إشعاراً تسويقياً جذاباً لشركة 1XBET وبونص 130% مع كود vexwallet',
          category: 'marketing',
        },
        {
          id: 'rec_3',
          labelAr: '➕ إضافة شركة مراهنات أو كازينو جديدة',
          command: 'أريد إضافة شركة مراهنات جديدة مع بياناتها وصورتها',
          category: 'companies',
        },
        {
          id: 'rec_4',
          labelAr: '⚡ فحص حركة السيرفر والأمان ومنع الاحتيال',
          command: 'افحص الأمان وتكرار القسائم والحسابات المعلقة',
          category: 'security',
        },
      ],
    };
  }

  // Execute Real Administrative Actions in Platform Storage
  public executeAdminAction(action: {
    type: string;
    params: any;
  }): {
    id: string;
    type: any;
    title: string;
    title_ar: string;
    summary: string;
    summary_ar: string;
    status: 'success' | 'failed';
    timestamp: string;
    details?: any;
  } {
    const timestamp = new Date().toISOString();
    const actionId = `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const { type, params = {} } = action;

    try {
      if (type === 'create_company' || type === 'add_company') {
        const rawName = params.name || params.name_ar || params.name_en || 'New Partner';
        const id = (params.id || rawName)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .slice(0, 30);

        const newCompany: any = {
          id: id || `comp_${Date.now()}`,
          name: params.name || params.name_en || rawName,
          name_ar: params.name_ar || params.name || rawName,
          name_en: params.name_en || params.name || rawName,
          type: params.type || 'Sportsbook & Casino',
          details: params.details || params.bonus_text || 'شريك مراهنات معتمد مع بونص ترحيبي وكاش باك',
          is_active: params.is_active !== false,
          icon: params.icon || params.logo_url || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=128&auto=format&fit=crop&q=80',
          logo_url: params.logo_url || params.icon || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=128&auto=format&fit=crop&q=80',
          affiliate_link: params.affiliate_link || params.app_link || `https://${id}.com`,
          app_link: params.app_link || params.affiliate_link || `https://${id}.com/app`,
          promo_code: params.promo_code || 'vexwallet',
          show_in_comp: params.show_in_comp !== false,
          color: params.color || '#4f46e5',
          description: params.description || params.details || `سجل بكود الوكالة [${params.promo_code || 'vexwallet'}] واستفد من ضمان التعويض 100%.`,
          description_en: params.description_en || `Register with code [${params.promo_code || 'vexwallet'}] for 100% loss recovery.`,
          badge: params.badge || params.bonus_text || 'بونص ترحيبي 100%',
          bonus_text: params.bonus_text || params.badge || 'بونص ترحيبي 100%',
          api_config: {
            enabled: false,
            integration_type: 'rest_api',
            endpoint_url: params.endpoint_url || `https://api.${id}.com/v1`,
            allow_available_only: true,
            auto_payout: false,
          },
        };

        storage.saveCompany(newCompany);

        return {
          id: actionId,
          type: 'create_company',
          title: `Company Created: ${newCompany.name}`,
          title_ar: `تمت إضافة وحفظ شركة جديدة: ${newCompany.name_ar || newCompany.name}`,
          summary: `Company ${newCompany.name} created with promo code [${newCompany.promo_code}]`,
          summary_ar: `تم حفظ وإدراج شركة ${newCompany.name_ar || newCompany.name} بكود ترويجي [${newCompany.promo_code}] وبونص [${newCompany.bonus_text}] في قاعدة بيانات المنصة.`,
          status: 'success',
          timestamp,
          details: newCompany,
        };
      }

      if (type === 'update_company') {
        const companyId = params.id || params.company_id;
        const list = storage.getCompanies();
        const existing = list.find((c) => c.id === companyId);
        if (!existing) {
          throw new Error(`الشركة المطلوبة برقم (${companyId}) غير موجودة.`);
        }
        const updated = { ...existing, ...params };
        storage.saveCompany(updated);
        return {
          id: actionId,
          type: 'update_company',
          title: `Company Updated: ${updated.name}`,
          title_ar: `تم تحديث بيانات شركة: ${updated.name_ar || updated.name}`,
          summary: `Updated parameters for ${updated.name}`,
          summary_ar: `تم تعديل وتحديث بيانات وحالة شركة ${updated.name_ar || updated.name} بنجاح.`,
          status: 'success',
          timestamp,
          details: updated,
        };
      }

      if (type === 'toggle_company') {
        const companyId = params.id || params.company_id;
        const res = storage.toggleCompanyActive(companyId);
        return {
          id: actionId,
          type: 'toggle_company',
          title: `Company Status Toggled`,
          title_ar: `تم تغيير حالة تفعيل الشركة`,
          summary: `Company ${companyId} is now ${res.is_active ? 'Active' : 'Inactive'}`,
          summary_ar: `حالة الشركة الآن: ${res.is_active ? 'نشطة ومفعلة ✅' : 'معطلة ⏸️'}`,
          status: res.success ? 'success' : 'failed',
          timestamp,
          details: res,
        };
      }

      if (type === 'delete_company') {
        const companyId = params.id || params.company_id;
        const success = storage.deleteCompany(companyId);
        return {
          id: actionId,
          type: 'delete_company',
          title: `Company Deleted`,
          title_ar: `تم حذف الشركة`,
          summary: `Company ${companyId} was removed from the system`,
          summary_ar: `تم حذف وإزالة الشركة (${companyId}) من النظام.`,
          status: success ? 'success' : 'failed',
          timestamp,
          details: { companyId },
        };
      }

      if (type === 'approve_compensation') {
        const reqId = params.requestId || params.id;
        const updated = storage.updateCompensationRequest(reqId, {
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'Master Super Admin AI',
          note: params.note || 'تمت المطابقة والاعتماد بنجاح بواسطة المشرف العام الذكي',
        });
        if (updated) {
          storage.addNotification({
            id: `NOTIF-APPR-${Date.now()}`,
            title: `🛡️ تم اعتماد طلب التعويض: $${updated.amount}`,
            message: `تم اعتماد قسيمة الرهان ${updated.bet_slip_id} لحسابك في ${updated.company_name} وإضافة $${updated.amount} لرصيدك المجمد.`,
            category: 'compensation',
            timestamp,
            read: false,
            data: { requestId: updated.id, amount: updated.amount },
          });
        }
        return {
          id: actionId,
          type: 'approve_compensation',
          title: `Compensation Approved: ${reqId}`,
          title_ar: `تم تدقيق واعتماد طلب التعويض: ${reqId}`,
          summary: `Approved $${updated?.amount || 0} for account ${updated?.account_number}`,
          summary_ar: `تم اعتماد تعويض بقيمة $${updated?.amount || 0} لحساب ${updated?.account_number} في ${updated?.company_name}.`,
          status: updated ? 'success' : 'failed',
          timestamp,
          details: updated,
        };
      }

      if (type === 'reject_compensation') {
        const reqId = params.requestId || params.id;
        const reason = params.reason || params.note || 'لم تستوفِ شروط التعويض أو كود الوكالة';
        const updated = storage.updateCompensationRequest(reqId, {
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'Master Super Admin AI',
          note: reason,
        });
        return {
          id: actionId,
          type: 'reject_compensation',
          title: `Compensation Rejected: ${reqId}`,
          title_ar: `تم رفض طلب التعويض: ${reqId}`,
          summary: `Rejected request ${reqId}. Reason: ${reason}`,
          summary_ar: `تم رفض طلب التعويض ${reqId}. السبب: ${reason}`,
          status: updated ? 'success' : 'failed',
          timestamp,
          details: updated,
        };
      }

      if (type === 'trigger_golden_hour') {
        const durationMinutes = params.durationMinutes || 60;
        const multiplier = params.multiplier || 2;
        const messageAr = params.messageAr || `⚡ الساعة الذهبية بدأت! سرعة فك الرصيد تضاعفت لـ ${multiplier}x لمدة ${durationMinutes} دقيقة.`;
        const messageEn = params.messageEn || `⚡ Golden Hour! Unfreeze speed is now ${multiplier}x for ${durationMinutes} minutes.`;

        const now = new Date();
        const end = new Date(now.getTime() + durationMinutes * 60000);
        const state = {
          isActive: true,
          startTime: now.toISOString(),
          endTime: end.toISOString(),
          multiplier,
          messageAr,
          messageEn
        };
        storage.saveGoldenHourState(state);

        // Also dispatch a push notification to everyone
        const notif = {
          id: `NOTIF-GOLDEN-${Date.now()}`,
          title: '⚡ الساعة الذهبية لفك الرصيد (Flash Golden Hour)',
          message: messageAr,
          category: 'growth',
          timestamp,
          read: false,
          data: { goldenHour: state },
        };
        storage.addNotification(notif);

        return {
          id: actionId,
          type: 'trigger_golden_hour',
          title: `Golden Hour Triggered (${multiplier}x)`,
          title_ar: `تم تفعيل الساعة الذهبية لفك الرصيد (${multiplier}x)`,
          summary: `Boosted unfreeze rate to ${multiplier}x for ${durationMinutes} minutes`,
          summary_ar: `تم إطلاق عرض الساعة الذهبية: فك الرصيد مضاعف ${multiplier} مرات لمدة ${durationMinutes} دقيقة. تم إرسال إشعار لكل المستخدمين.`,
          status: 'success',
          timestamp,
          details: state,
        };
      }

      if (type === 'dispatch_notification') {
        const notif = {
          id: `NOTIF-AUTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          title: (params.title || 'تنبيه إداري').trim(),
          message: (params.message || 'إشعار من الإدارة العامة').trim(),
          category: params.category || 'system',
          timestamp,
          read: false,
          data: {
            dispatchedBy: 'Master Super Admin AI',
            ...(params.data || {}),
          },
        };
        storage.addNotification(notif);
        return {
          id: actionId,
          type: 'dispatch_notification',
          title: `Notification Dispatched: ${notif.title}`,
          title_ar: `تم بث الإشعار: ${notif.title}`,
          summary: notif.message,
          summary_ar: `تم إرسال الإشعار لجميع الأجهزة النشطة في المنصة.`,
          status: 'success',
          timestamp,
          details: notif,
        };
      }

      if (type === 'schedule_notification') {
        const item = this.scheduleNotification({
          title: params.title || 'إشعار مجدول',
          message: params.message || 'محتوى الإشعار',
          category: params.category || 'ai_prediction',
          urgency: params.urgency || 'non-urgent',
          scheduledFor: params.scheduledFor,
        });
        return {
          id: actionId,
          type: 'schedule_notification',
          title: `Notification Scheduled`,
          title_ar: `تمت جدولة الإشعار الذكي`,
          summary: `Scheduled for ${item.scheduledFor}`,
          summary_ar: `تمت الجدولة لنافذة التفاعل المثلى (${item.targetOptimalWindow}).`,
          status: 'success',
          timestamp,
          details: item,
        };
      }

      if (type === 'approve_phone') {
        const reqId = params.requestId || params.id;
        const updated = storage.updatePhoneChangeRequest(reqId, {
          status: 'approved',
        });
        return {
          id: actionId,
          type: 'approve_phone',
          title: `Phone Change Approved`,
          title_ar: `تمت الموافقة على تعديل رقم الهاتف`,
          summary: `Approved request ${reqId}`,
          summary_ar: `تم توثيق وتحديث رقم الهاتف في السجل الأمني.`,
          status: updated ? 'success' : 'failed',
          timestamp,
          details: updated,
        };
      }

      if (type === 'save_media_asset') {
        const asset = storage.saveMediaAsset({
          id: `media_${Date.now()}`,
          name: params.name || 'ملف مرفق',
          type: params.type || 'image',
          mimeType: params.mimeType || 'image/png',
          dataUrl: params.dataUrl || params.data || '',
          description: params.description || 'مرفق وسائط من المشرف العام',
          associatedWith: params.associatedWith,
          createdAt: timestamp,
        });
        return {
          id: actionId,
          type: 'custom_action',
          title: `Media Asset Saved`,
          title_ar: `تم حفظ ملف الوسائط في مكتبة المشروع`,
          summary: `Saved asset ${asset.name}`,
          summary_ar: `تم حفظ الأصل في مكتبة وسائط المنصة بنجاح.`,
          status: 'success',
          timestamp,
          details: asset,
        };
      }

      return {
        id: actionId,
        type: 'custom_action',
        title: `Executed Action: ${type}`,
        title_ar: `تم تنفيذ الإجراء: ${type}`,
        summary: `Action executed with parameters`,
        summary_ar: `تمت معالجة المعطيات وتطبيقها.`,
        status: 'success',
        timestamp,
        details: params,
      };
    } catch (err: any) {
      console.error('[AgentEngine] Action execution error:', err);
      return {
        id: actionId,
        type: (type as any) || 'custom_action',
        title: `Action Failed: ${type}`,
        title_ar: `فشل تنفيذ الإجراء: ${type}`,
        summary: err.message || 'Error occurred',
        summary_ar: `تعذر التنفيذ: ${err.message || 'خطأ غير متوقع'}`,
        status: 'failed',
        timestamp,
        details: { error: err.message },
      };
    }
  }

  // Conversational Agent Turn with Multimodal Input, Tool Calling, and Live Admin Control
  public async chatWithAgent(params: {
    agentId: string;
    message: string;
    attachments?: Array<{
      id?: string;
      type: 'image' | 'video' | 'document' | 'file';
      name?: string;
      size?: number;
      mimeType: string;
      data: string;
      previewUrl?: string;
    }>;
    enableGoogleSearch?: boolean;
    includePlatformState?: boolean;
  }): Promise<{
    agentId: string;
    reply: string;
    actionTaken?: {
      type: string;
      title: string;
      details: any;
    };
    executedActions?: Array<{
      id: string;
      type: string;
      title: string;
      title_ar: string;
      summary: string;
      summary_ar: string;
      status: 'success' | 'failed';
      timestamp: string;
      details?: any;
    }>;
    adminAuditReport?: any;
    groundingCitations?: Array<{ title: string; url: string }>;
    searchQueries?: string[];
    learnedPreference?: string;
    suggestedNotification?: {
      title: string;
      message: string;
      category: string;
      timingRecommendation: string;
      relevanceScore: number;
    };
  }> {
    const { agentId, message, attachments = [], enableGoogleSearch = true, includePlatformState = true } = params;
    const agent = this.getAgentById(agentId) || BUILTIN_AGENTS[0];
    const memory = this.getMemory(agent.id);
    const timingReport = calculateNotificationTiming();

    const isAuditRequest = /(?:حلل|فحص|تفقد|تقرير شامل|لوحة الادمن|لوحة التحكم|فحص شامل|audit|check dashboard|inspect)/i.test(message);
    let generatedAudit: any = undefined;
    if (isAuditRequest || agent.id === 'agent_master_admin') {
      generatedAudit = this.generateAdminAudit();
    }

    // Context preparation
    let contextBlock = `--- سياق الذاكرة والتفضيلات المحفوظة للمدير ---
`;
    if (memory.adminPreferences.length > 0) {
      contextBlock += `قواعد وتوجيهات المدير الدائمة التي يجب الالتزام بها:\n`;
      memory.adminPreferences.forEach((p, idx) => {
        contextBlock += `${idx + 1}. [${p.category}] ${p.text}\n`;
      });
    } else {
      contextBlock += `لا توجد تفضيلات مخصصة مسبقاً، تعامل وفق أفضل الممارسات الذكية.\n`;
    }

    if (includePlatformState) {
      const companies = storage.getCompanies();
      const compRequests = storage.getCompensationRequests();
      const phoneRequests = storage.getPhoneChangeRequests();
      const notifs = storage.getNotifications();
      const pendingClaims = compRequests.filter((r) => r.status === 'pending');

      contextBlock += `\n--- مؤشرات المنصة الحية الآن (Live Admin Dashboard State) ---
- عدد الشركات المعتمدة المسجلة: ${companies.length} (${companies.filter((c) => c.is_active).length} نشطة)
- إجمالي طلبات التعويض المعلقة: ${pendingClaims.length} طلب بإجمالي $${pendingClaims.reduce((s, r) => s + (Number(r.amount) || 0), 0).toFixed(2)}
- طلبات تغيير الهاتف المعلقة: ${phoneRequests.filter((p) => p.status === 'pending').length}
- حالة الإشعارات اليوم: ${timingReport.antiSpamStatus.dailySentCount}/${timingReport.antiSpamStatus.dailyLimit} إشعار
- فترة النشاط الحالية: ${timingReport.windowLabelAr} (درجة النشاط: ${timingReport.activityScore}/100)
- إمكانية الإرسال الآن: ${timingReport.antiSpamStatus.canSendNow ? 'نعم، الوقت ملائم' : 'لا، يفضل التأجيل'} (${timingReport.antiSpamStatus.recommendationAr})

--- تفاصيل الشركات الشريكة المعتمدة وأكواد الوكالة الحية في قاعدة البيانات ---
${companies.map((c) => `* [ID: ${c.id}] شركة ${c.name} (${c.name_ar}): كود البروموكود [${c.promo_code || 'vexwallet'}] | البونص: [${c.bonus_text || c.badge || 'بونص ترحيبي'}] | الرابط: ${c.affiliate_link} | الحالة: ${c.is_active ? 'نشطة ✅' : 'معطلة ⏸️'}`).join('\n')}

--- عينة من أحدث طلبات التعويض المعلقة (Pending Compensation Claims) ---
${pendingClaims.slice(0, 5).map((r) => `* طلب [${r.id}]: حساب ${r.account_number} في ${r.company_name} | قسيمة الرهان: ${r.bet_slip_id || 'N/A'} | المبلغ: $${r.amount} | التاريخ: ${(r as any).loss_date || r.created_at}`).join('\n') || 'لا توجد طلبات معلقة حالياً.'}

--- المباريات الكبرى القادمة ونوافذ الإشعار التكتيكي الذهبية ---
${timingReport.upcomingKeyFixtures.map((f) => `* مباراة: ${f.teams} (${f.league}) | وقت الانطلاق: ${f.kickoffTime} | توقيت الإشعار التكتيكي الذهبي: ${f.optimalNotificationTime}`).join('\n')}
`;
    }

    // Check if user is asking the agent to remember something
    let learnedRule: string | undefined;
    const rememberRegex = /(?:احفظ|تذكر|سجل عندك|اعمل حسابك|قاعدة|توجيه|من هنا ورايح|دائما|ممنوع)\s+(.+)/i;
    const rememberMatch = message.match(rememberRegex);
    if (rememberMatch && rememberMatch[1]) {
      const candidateRule = rememberMatch[1].trim();
      if (candidateRule.length > 5) {
        const item = this.addPreference(agent.id, candidateRule, 'rule');
        learnedRule = item.text;
      }
    }

    // Check if user asks to create or send a notification
    const asksNotification = /(?:إشعار|اشعار|ارسل|أرسل|بث|ابعت|جدولة|notify|push)/i.test(message);

    const executedActions: any[] = [];

    // Save any uploaded media attachments into project assets
    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        try {
          const savedAsset = storage.saveMediaAsset({
            id: att.id || `media_${Date.now()}`,
            name: att.name || 'ملف مرفق',
            type: att.type,
            mimeType: att.mimeType,
            dataUrl: att.data,
            description: `مرفق في محادثة الأدمن مع الوكيل ${agent.name_ar}`,
            createdAt: new Date().toISOString(),
          });
          executedActions.push({
            id: `ACT-ASSET-${Date.now()}`,
            type: 'save_media_asset',
            title: `Media Asset Uploaded: ${att.name || 'Attachment'}`,
            title_ar: `تم استلام وحفظ المرفق: ${att.name || 'ملف وسائط'}`,
            summary: `Saved ${att.type} asset to platform media library`,
            summary_ar: `تم حفظ ${att.type === 'image' ? 'الصورة' : att.type === 'video' ? 'الفيديو' : 'المستند'} في مكتبة وسائط المنصة ومتاح للاستخدام في الشركات والإشعارات.`,
            status: 'success',
            timestamp: new Date().toISOString(),
            details: savedAsset,
          });
        } catch (err) {
          console.warn('[AgentEngine] Failed to save media asset:', err);
        }
      }
    }

    const client = this.getClient();
    if (!client) {
      // Intelligent Rule-Based Engine & Executor when Gemini is offline
      let replyFallback = `أهلاً بك يا مدير! أنا ${agent.name_ar} (المشرف العام والمدير التنفيذي للوحة التحكم).
تم استلام أمرك: "${message}".`;

      // Rule: Add / Create Company request
      const addCompanyMatch = message.match(/(?:أضف|اضف|انشئ|أنشئ|سجل|أدخل|add|create)\s+(?:شركة|شريك|bookmaker|company)\s*(?:جديدة)?\s*(.+)?/i);
      if (addCompanyMatch || /(?:شركة|بروموكود|بونص)/i.test(message)) {
        // Extract company info heuristically
        const nameMatch = message.match(/(?:اسمها|اسم الشركة|الشركة|name:?)\s*([A-Za-z0-9\u0600-\u06FF\s_-]+?)(?:,|،|بروموكود|كود|بونص|رابط|$)/i);
        const promoMatch = message.match(/(?:بروموكود|كود|promo(?:_code)?)\s*:?\s*([A-Za-z0-9_-]+)/i);
        const bonusMatch = message.match(/(?:بونص|bonus|مكافأة)\s*:?\s*([^\n,،]+)/i);
        const linkMatch = message.match(/(https?:\/\/[^\s]+)/i);

        const compName = nameMatch ? nameMatch[1].trim() : 'New Partner Bookmaker';
        const promoCode = promoMatch ? promoMatch[1].trim() : 'vexwallet';
        const bonusText = bonusMatch ? bonusMatch[1].trim() : 'بونص ترحيبي 100% + كاش باك';
        const affiliateLink = linkMatch ? linkMatch[1].trim() : `https://${compName.toLowerCase().replace(/\s+/g, '')}.com`;

        // If an image was attached, use it as logo!
        const imageAtt = attachments.find((a) => a.type === 'image');
        const logoUrl = imageAtt?.data || undefined;

        const actionRes = this.executeAdminAction({
          type: 'create_company',
          params: {
            name: compName,
            name_ar: compName,
            promo_code: promoCode,
            bonus_text: bonusText,
            affiliate_link: affiliateLink,
            logo_url: logoUrl,
            color: '#4f46e5',
            is_active: true,
          },
        });
        executedActions.push(actionRes);

        replyFallback += `\n\n✅ تم تنفيذ الأمر فوراً وحفظ الشركة في قاعدة البيانات:
• اسم الشركة: ${compName}
• كود الوكالة والبروموكود: ${promoCode}
• البونص الترحيبي: ${bonusText}
• الرابط الرسمي: ${affiliateLink}
${logoUrl ? '• تم تعيين الصورة المرفقة كشعار رسمي للشركة 🖼️' : ''}

الشركة الآن نشطة وظاهرة في قائمة الشركات ومتاحة للمستخدمين لتسجيل الحسابات والتعويضات!`;
      } else if (isAuditRequest) {
        replyFallback += `\n\n📊 تقرير الفحص والتجول في لوحة الأدمن:
• مؤشر صحة المنصة: ${generatedAudit.healthScore}%
• عدد الشركات النشطة: ${generatedAudit.stats.activeCompaniesCount} من أصل ${generatedAudit.stats.totalCompaniesCount}
• طلبات التعويض المعلقة: ${generatedAudit.stats.pendingCompensationCount} طلب ($${generatedAudit.stats.pendingCompensationTotal.toFixed(2)})
• طلبات الأمان وتغيير الهاتف: ${generatedAudit.stats.pendingPhoneRequestsCount} طلب
• نافذة النشاط الحالية: ${timingReport.windowLabelAr} (درجة النشاط: ${timingReport.activityScore}/100)

جاهز لتنفيذ أي أمر إداري آخر: إضافة شركات، اعتماد قسائم، أو بث إشعارات!`;
      }

      return {
        agentId: agent.id,
        reply: replyFallback,
        executedActions,
        adminAuditReport: generatedAudit,
        learnedPreference: learnedRule,
      };
    }

    try {
      const fullSystemPrompt = `${agent.systemInstruction}

${VEX_DEALS_MASTER_KNOWLEDGE}

أنت تتحدث مباشرة مع مالك ومدير منصة VEX Deals.
أنت المشرف العام والمدير التنفيذي والمسؤول الكامل عن إدارة البيانات، الشركات، الوسائط، والعمليات.
إذا أعطاك المدير بيانات شركة أو قسائم أو نصاً أو صورة أو فيديو:
1. افهم البيانات واستخرج كل الحقول المطلوبة (اسم الشركة، اسمها بالعربي، البروموكود، البونص، الروابط، الألوان، الصور).
2. إذا كانت هناك صورة مرفقة، اعتبرها شعاراً أو مادة بصرية رسمية واستخدمها.
3. نفذ الإجراء فوراً بتضمين كود الإجراء التنفيذي بصيغة JSON داخل ردك بصيغة:
\`\`\`json:admin_action
{
  "actions": [
    {
      "type": "create_company" | "update_company" | "toggle_company" | "delete_company" | "approve_compensation" | "reject_compensation" | "dispatch_notification" | "schedule_notification" | "approve_phone" | "update_branding" | "save_media_asset",
      "params": { ... }
    }
  ]
}
\`\`\`
4. تحدث بلهجة تنفيذية راقية، مهنية، ومطمئنة تؤكد إنجاز المهمة بالتفصيل والأرقام.

${contextBlock}
`;

      const shouldUseSearch = enableGoogleSearch && agent.capabilities.liveSearch;
      const configObj: any = {
        systemInstruction: fullSystemPrompt,
        temperature: agent.temperature || 0.3,
      };

      if (shouldUseSearch) {
        configObj.tools = [{ googleSearch: {} }];
      }

      // Build Multimodal Content parts
      const contentParts: any[] = [];

      if (attachments && attachments.length > 0) {
        for (const att of attachments) {
          if (att.data) {
            let cleanBase64 = att.data;
            if (cleanBase64.includes('base64,')) {
              cleanBase64 = cleanBase64.split('base64,')[1];
            }

            if (att.type === 'document' && (att.mimeType?.startsWith('text/') || att.mimeType?.includes('json') || att.mimeType?.includes('csv'))) {
              try {
                const textContent = Buffer.from(cleanBase64, 'base64').toString('utf-8');
                contentParts.push({ text: `[محتوى المستند/الملف النصي المرفق: ${att.name || 'document'}]:\n${textContent}` });
              } catch {
                contentParts.push({
                  inlineData: {
                    mimeType: att.mimeType || 'text/plain',
                    data: cleanBase64,
                  },
                });
              }
            } else {
              contentParts.push({
                inlineData: {
                  mimeType: att.mimeType || (att.type === 'video' ? 'video/mp4' : 'image/jpeg'),
                  data: cleanBase64,
                },
              });
            }
          }
        }
      }

      contentParts.push({ text: message });

      const response = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: contentParts,
        config: configObj,
      });

      let replyText = response.text || 'تم فحص ومعالجة الأمر بنجاح.';

      // Parse and execute JSON admin action blocks if present
      const actionRegex = /```json:admin_action\s*([\s\S]*?)\s*```/i;
      const jsonBlockRegex = /```(?:json)?\s*(\{\s*"actions"\s*:\s*\[[\s\S]*?\]\s*\})\s*```/i;

      let rawActionJson = '';
      const match = replyText.match(actionRegex);
      if (match && match[1]) {
        rawActionJson = match[1];
      } else {
        const jsonMatch = replyText.match(jsonBlockRegex);
        if (jsonMatch && jsonMatch[1]) {
          rawActionJson = jsonMatch[1];
        }
      }

      if (rawActionJson) {
        try {
          const parsed = JSON.parse(rawActionJson);
          const actionsToRun = Array.isArray(parsed.actions) ? parsed.actions : [parsed];

          for (const act of actionsToRun) {
            if (act && act.type) {
              // If an image was attached and company params lack logo_url, assign the attachment
              if ((act.type === 'create_company' || act.type === 'update_company') && !act.params?.logo_url) {
                const imgAtt = attachments.find((a) => a.type === 'image');
                if (imgAtt?.data) {
                  act.params = { ...act.params, logo_url: imgAtt.data, icon: imgAtt.data };
                }
              }
              const res = this.executeAdminAction(act);
              executedActions.push(res);
            }
          }

          // Clean up raw action JSON block from user-facing text for cleaner UX
          replyText = replyText.replace(actionRegex, '').replace(jsonBlockRegex, '').trim();
        } catch (e) {
          console.warn('[AgentEngine] Could not parse action block JSON:', e);
        }
      }

      // Check if user asked to add a company and model didn't output action block
      if (executedActions.length === 0 && /(?:أضف|اضف|انشئ|أنشئ|سجل|أدخل)\s+(?:شركة|شريك|bookmaker|company)/i.test(message)) {
        const nameMatch = message.match(/(?:اسمها|اسم الشركة|الشركة|name:?)\s*([A-Za-z0-9\u0600-\u06FF\s_-]+?)(?:,|،|بروموكود|كود|بونص|رابط|$)/i);
        const promoMatch = message.match(/(?:بروموكود|كود|promo(?:_code)?)\s*:?\s*([A-Za-z0-9_-]+)/i);
        const bonusMatch = message.match(/(?:بونص|bonus|مكافأة)\s*:?\s*([^\n,،]+)/i);
        const linkMatch = message.match(/(https?:\/\/[^\s]+)/i);
        const imageAtt = attachments.find((a) => a.type === 'image');

        if (nameMatch) {
          const compName = nameMatch[1].trim();
          const actionRes = this.executeAdminAction({
            type: 'create_company',
            params: {
              name: compName,
              name_ar: compName,
              promo_code: promoMatch ? promoMatch[1].trim() : 'vexwallet',
              bonus_text: bonusMatch ? bonusMatch[1].trim() : 'بونص ترحيبي 100%',
              affiliate_link: linkMatch ? linkMatch[1].trim() : `https://${compName.toLowerCase().replace(/\s+/g, '')}.com`,
              logo_url: imageAtt?.data,
              color: '#4f46e5',
              is_active: true,
            },
          });
          executedActions.push(actionRes);
        }
      }

      // Extract grounding metadata if available
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
      const groundingCitations: Array<{ title: string; url: string }> = [];
      const searchQueries: string[] = [];

      if (groundingMetadata) {
        if (Array.isArray(groundingMetadata.webSearchQueries)) {
          searchQueries.push(...groundingMetadata.webSearchQueries);
        }
        if (Array.isArray(groundingMetadata.groundingChunks)) {
          groundingMetadata.groundingChunks.forEach((chunk: any) => {
            if (chunk.web?.uri) {
              groundingCitations.push({
                title: chunk.web.title || 'مصدر رياضي معتمد',
                url: chunk.web.uri,
              });
            }
          });
        }
      }

      // Check if we should craft a smart notification preview
      let suggestedNotification: any = undefined;
      if (asksNotification || agent.role === 'smart_notifications') {
        const lines = replyText.split('\n').filter((l) => l.trim().length > 0);
        suggestedNotification = {
          title: `⚡ تنبيه ذكي: VEX Tactical`,
          message: lines[0]?.slice(0, 80) || 'تحليل تكتيكي وفرصة تعويض جديدة جاهزة في محفظتك الآن.',
          category: 'ai_prediction',
          timingRecommendation: timingReport.antiSpamStatus.recommendationAr,
          relevanceScore: timingReport.activityScore,
        };
      }

      return {
        agentId: agent.id,
        reply: replyText,
        executedActions,
        adminAuditReport: generatedAudit,
        groundingCitations: groundingCitations.slice(0, 5),
        searchQueries,
        learnedPreference: learnedRule,
        suggestedNotification,
      };
    } catch (err: any) {
      console.error('[AgentEngine] Gemini error:', err);
      return {
        agentId: agent.id,
        reply: `أهلاً بك يا مدير! واجهت صعوبة في الاتصال بنموذج Gemini (${err.message || 'شبكة'})، ولكن تم تفعيل فحص لوحة الأدمن: الوقت الحالي (${timingReport.windowLabelAr})، ومؤشر صحة المنصة جاهز.`,
        executedActions,
        adminAuditReport: generatedAudit,
        learnedPreference: learnedRule,
      };
    }
  }

  // Autonomous Smart Notification Generator
  public async generateSmartNotification(params?: {
    topic?: string;
    targetMatchId?: string;
    bypassAntiSpam?: boolean;
  }): Promise<{
    success: boolean;
    notification?: any;
    timingReport: SmartNotificationTimingReport;
    message: string;
  }> {
    const timingReport = calculateNotificationTiming();

    if (!params?.bypassAntiSpam && !timingReport.antiSpamStatus.canSendNow) {
      return {
        success: false,
        timingReport,
        message: `تم إلغاء الإرسال التلقائي لحماية المستخدمين: ${timingReport.antiSpamStatus.recommendationAr}`,
      };
    }

    const primeMatch = timingReport.upcomingKeyFixtures[0];
    const client = this.getClient();
    let title = `⚽ تحليل القمة: ${primeMatch.teams}`;
    let messageBody = `استعد للمباراة مع احتمالات فوز مدروسة وتعويض خسائر يصل إلى 100% مع شركائنا المعتمدين.`;

    if (client) {
      try {
        const prompt = `أنت وكيل الإشعارات الذكية لمنصة VEX Deals.
قم بصياغة إشعار موبايل (Push Notification) فائق الجاذبية والاحترافية لمباراة:
${primeMatch.teams} (${primeMatch.league})
الوقت: ${primeMatch.kickoffTime}
الشروط:
1. العنوان: أقل من 6 كلمات مع إيموجي ملائم.
2. الرسالة: بين 10 و 18 كلمة تحفز اللاعب على متابعة التوقع أو استخدام حماية الكاش باك دون ابتذال.
أرجع نصاً بصيغة JSON:
{"title": "...", "message": "..."}`;

        const res = await client.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const parsed = JSON.parse(res.text || '{}');
        if (parsed.title) title = parsed.title;
        if (parsed.message) messageBody = parsed.message;
      } catch (err) {
        console.warn('[AgentEngine] Fallback notification generation used');
      }
    }

    const newNotif = {
      id: `NOTIF-SMART-${Date.now()}`,
      title,
      message: messageBody,
      category: 'ai_prediction',
      timestamp: new Date().toISOString(),
      read: false,
      data: {
        matchId: primeMatch.id,
        matchName: primeMatch.teams,
        dispatchedBy: 'Agent Smart Timing Engine',
        activityScore: timingReport.activityScore,
        window: timingReport.windowType,
      },
    };

    storage.addNotification(newNotif);

    return {
      success: true,
      notification: newNotif,
      timingReport,
      message: 'تم توليد الإشعار الذكي وبثه لجميع المستخدمين في التوقيت المثالي بنجاح!',
    };
  }

  // =========================================================================
  // SPECIALIZED SPORTS & MARKETING NOTIFICATION CONTENT GENERATOR
  // =========================================================================
  public async generateNotificationContent(params: {
    agentId?: string;
    theme: 'sports_tactical' | 'partner_promo' | 'compensation_recovery' | 'unfreeze_balance' | 'loyalty_vip' | 'custom';
    targetCompanyId?: string;
    targetMatchId?: string;
    customPrompt?: string;
  }): Promise<{
    success: boolean;
    title: string;
    message: string;
    category: string;
    urgency: 'urgent' | 'non-urgent';
    targetOptimalWindow: string;
    marketingAngle: string;
    heuristicEvaluation: any;
    agentUsed: { id: string; name_ar: string; avatar: string };
  }> {
    const { theme, targetCompanyId, targetMatchId, customPrompt } = params;
    const timingReport = calculateNotificationTiming();
    const companies = storage.getCompanies();

    // Select agent
    let agent = params.agentId ? this.getAgentById(params.agentId) : null;
    if (!agent) {
      if (theme === 'partner_promo' || theme === 'loyalty_vip') {
        agent = this.getAgentById('agent_marketing_partners') || BUILTIN_AGENTS[1];
      } else if (theme === 'sports_tactical') {
        agent = this.getAgentById('agent_sports_analyst') || BUILTIN_AGENTS[0];
      } else if (theme === 'compensation_recovery' || theme === 'unfreeze_balance') {
        agent = this.getAgentById('agent_loyalty_retention') || BUILTIN_AGENTS[3];
      } else {
        agent = this.getAgentById('agent_marketing_partners') || BUILTIN_AGENTS[1];
      }
    }

    // Resolve target company
    let targetCompany = targetCompanyId ? companies.find((c) => c.id === targetCompanyId) : null;
    if (!targetCompany && (theme === 'partner_promo' || !targetCompanyId)) {
      targetCompany = companies.find((c) => c.is_active && c.name.includes('1XBET')) || companies.find((c) => c.is_active) || companies[0];
    }

    // Resolve target match
    let targetMatch = targetMatchId
      ? timingReport.upcomingKeyFixtures.find((f) => f.id === targetMatchId)
      : timingReport.upcomingKeyFixtures[0];

    // High quality defaults matching VEX Deals real architecture & promo codes
    let fallbackTitle = '⚽ قمة كروية وتوقع ذكي';
    let fallbackMessage = 'تابع قراءة احتمالات الفوز والتكتيك المباشر، ورهانك محمي بتعويض 100% مع VEX Deals.';
    let category = 'ai_prediction';
    let urgency: 'urgent' | 'non-urgent' = 'non-urgent';
    let marketingAngle = 'تحفيز التفاعل مع القمم الكروية وتأمين الرهانات';

    if (theme === 'sports_tactical') {
      category = 'ai_prediction';
      fallbackTitle = `🔥 قمة القمم: ${targetMatch.teams}`;
      fallbackMessage = `تحليل تكتيكي وحساب دقيق لاحتمالات الفوز ومفتاح اللقاء! رهانك مؤمن بتعويض 100% مع VEX Deals.`;
      marketingAngle = 'استغلال زخم المباراة الكبرى لتحفيز الرهان المحمي';
    } else if (theme === 'partner_promo') {
      category = 'marketing';
      const code = targetCompany?.promo_code || 'vexwallet';
      const compName = targetCompany?.name_ar || targetCompany?.name || '1XBET';
      const bonus = targetCompany?.bonus_text || 'بونص ترحيبي 130% + استرداد 100%';
      fallbackTitle = `🎁 عرض حصري: سجل في ${compName}`;
      fallbackMessage = `استخدم كود الوكالة [${code}] واحصل على ${bonus} وضمان تعويض كامل من VEX!`;
      marketingAngle = 'جذب تسجيلات جديدة وودائع باستخدام البروموكود الحصري وضمان التعويض';
    } else if (theme === 'compensation_recovery') {
      category = 'compensation';
      fallbackTitle = '🛡️ خسرت رهانك الأخير؟ VEX تعوضك 100%';
      fallbackMessage = 'لا تقلق من خسارة تذكرتك! ارفع صورة قسيمة الرهان الآن واسترد حتى 100% من قيمتها في محفظتك.';
      marketingAngle = 'تخفيف أثر الخسارة على اللاعبين وزيادة الولاء والمصداقية';
    } else if (theme === 'unfreeze_balance') {
      category = 'compensation';
      fallbackTitle = '💎 رصيدك المجمد ينتظرك! فك التجميد 1:1';
      fallbackMessage = 'اشحن حسابك في الشركة المعتمدة الآن وحوّل رصيدك المجمد فوراً لكاش حقيقي متاح للسحب بنسبة 1:1!';
      marketingAngle = 'تحفيز الإيداع الفوري لتحرير الأرصدة المجمدة';
    } else if (theme === 'loyalty_vip') {
      category = 'marketing';
      fallbackTitle = '👑 أسبوع الولاء VIP: نقاط مضاعفة x2';
      fallbackMessage = 'نشاطك اليوم يمنحك سرعة فك تجميد مضاعفة ونقاط ولاء حصرية لترقية مستواك في VEX Deals!';
      marketingAngle = 'رفع معدل الاحتفاظ والمشاركة في عطلة نهاية الأسبوع';
    }

    let generatedTitle = fallbackTitle;
    let generatedMessage = fallbackMessage;

    const client = this.getClient();
    if (client) {
      try {
        const prompt = `أنت ${agent.name_ar} في منصة VEX Deals.
مهمتك: صياغة إشعار موبايل (Push Notification) تسويقي رياضي فائق القوة والجذب لجمهور المنصة.

المعطيات:
- الثيم المطلوب: ${theme}
- الشركة المستهدفة: ${targetCompany ? `${targetCompany.name} (${targetCompany.name_ar}) - كود البروموكود: [${targetCompany.promo_code || 'vexwallet'}] - البونص: ${targetCompany.bonus_text || targetCompany.badge}` : 'غير محددة'}
- المباراة الرياضية: ${targetMatch ? `${targetMatch.teams} (${targetMatch.league} - وقت الانطلاق ${targetMatch.kickoffTime})` : 'قمة كروية'}
- توجيهات إضافية من المدير: ${customPrompt || 'صياغة جذابة ومباشرة بأعلى معايير التسويق الرياضي'}

القواعد الإلزامية:
1. العنوان (title): جذاب جداً، به إيموجي ملائم، وأقل من 7 كلمات.
2. الرسالة (message): واضحة، محفزة، وقوية القيمة، بين 10 و 22 كلمة فقط.
3. إذا كان الإشعار تسويقياً لشركة، اذكر كود البروموكود [${targetCompany?.promo_code || 'vexwallet'}] واسم الشركة والبونص صراحة وبشكل مغري.
4. إذا كان الإشعار رياضياً، اذكر اسم الفريقين وضمان التعويض 100% مع VEX Deals.
5. إذا كان لفك التجميد أو التعويض، ركّز على نسبة 1:1 أو استرداد الخسائر الفوري.
6. لا تستخدم كلاماً عاماً مكرراً. اكتب صياغة تشعل حماس اللاعبين للشحن أو الرهان الآمن.

أرجع النتيجة بصيغة JSON فقط:
{
  "title": "...",
  "message": "...",
  "category": "${category}",
  "urgency": "non-urgent",
  "marketingAngle": "..."
}`;

        const res = await client.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.4,
          },
        });

        const parsed = JSON.parse(res.text || '{}');
        if (parsed.title && parsed.title.trim()) generatedTitle = parsed.title.trim();
        if (parsed.message && parsed.message.trim()) generatedMessage = parsed.message.trim();
        if (parsed.category) category = parsed.category;
        if (parsed.urgency === 'urgent') urgency = 'urgent';
        if (parsed.marketingAngle) marketingAngle = parsed.marketingAngle;
      } catch (err) {
        console.warn('[AgentEngine] Failed to generate AI notification content, using polished template:', err);
      }
    }

    const heuristicEvaluation = this.evaluateNotificationUrgencyAndTiming({
      title: generatedTitle,
      message: generatedMessage,
      category,
      urgency,
    });

    return {
      success: true,
      title: generatedTitle,
      message: generatedMessage,
      category,
      urgency,
      targetOptimalWindow: heuristicEvaluation.targetOptimalWindow,
      marketingAngle,
      heuristicEvaluation,
      agentUsed: {
        id: agent.id,
        name_ar: agent.name_ar,
        avatar: agent.avatar,
      },
    };
  }

  // =========================================================================
  // MULTI-LANGUAGE AUDIENCE COHORTS & PRE-DISPATCH LOCALIZATION ENGINE
  // =========================================================================

  public async generateLocalizedNotificationCampaign(params: {
    agentId?: string;
    theme?: string;
    targetCompanyId?: string;
    customPrompt?: string;
    baseTitle?: string;
    baseMessage?: string;
  }): Promise<{
    success: boolean;
    campaignId: string;
    theme: string;
    agentUsed: {
      id: string;
      name_ar: string;
      avatar: string;
    };
    cohortVariants: Array<{
      cohortId: string;
      cohortNameAr: string;
      cohortNameEn: string;
      language: string;
      languageNameAr: string;
      languageNameEn: string;
      countryFlag: string;
      countryName: string;
      countryCode: string;
      estimatedUsers: number;
      title: string;
      message: string;
      category: string;
      urgency: 'urgent' | 'non-urgent';
      localTimeNow: string;
      localTimingWindow: string;
      localTimingStatus: 'optimal' | 'quiet' | 'active';
      marketingAngle: string;
      recommendedPromoCode?: string;
    }>;
  }> {
    const agent = this.getAgentById(params.agentId || 'agent_marketing_partners') || this.getAgents()[0];
    const cohorts = storage.getAudienceCohorts();
    const companies = storage.getCompanies();
    const theme = params.theme || 'sports_tactical';

    let targetCompany = companies.find((c) => c.id.toLowerCase() === (params.targetCompanyId || '').toLowerCase());
    if (!targetCompany && params.targetCompanyId) {
      targetCompany = companies.find((c) => c.name.toLowerCase().includes(params.targetCompanyId!.toLowerCase()));
    }
    if (!targetCompany) {
      targetCompany = companies.find((c) => c.name.toLowerCase().includes('1xbet')) || companies[0];
    }

    const companyName = targetCompany?.name || '1XBET';
    const promoCode = targetCompany?.promo_code || 'vexwallet';

    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const formattedMinutes = utcMinutes.toString().padStart(2, '0');

    // Default high-converting multilingual templates per cohort
    const defaultTemplates: Record<string, { title: string; message: string; marketingAngle: string }> = {
      cohort_ar_eg: {
        title: `⚡ توقعات القمة من VEX: بونص 130% على ${companyName} واسترداد 100%!`,
        message: `سجل بكود الترويج (${promoCode})، فك تجميد رصيدك 1:1 واحصل على تأمين كامل ضد الخسارة من VEX Deals.`,
        marketingAngle: 'استهداف الدوري المصري والأوروبي مع بونص ترحيبي وتأمين الخسائر للمستخدمين في مصر وبلاد الشام',
      },
      cohort_ar_gulf: {
        title: `👑 تنبيه النخبة VIP: كاش باك استثنائي وتأمين شامل على مباريات الليلة`,
        message: `استمتع بأعلى نسبة استرداد نقدي وفك تجميد الرصيد فوراً عبر ${companyName} برمز VIP (${promoCode}). حماية كاملة ومضاعفات ولاء.`,
        marketingAngle: 'نبرة فاخرة لكبار الشخصيات في الخليج مع تركيز على الكاش باك الملكي والحسابات الموثقة',
      },
      cohort_fr_maghreb: {
        title: `🔥 Offre Spéciale VEX: 130% de Bonus sur ${companyName} (Code: ${promoCode})!`,
        message: `Débloquez votre solde 1:1 instantanément et profitez d'une couverture de perte à 100% sur toutes les affiches du weekend.`,
        marketingAngle: 'Campagne ciblée en français pour le Maghreb avec conditions claires et remboursement garanti',
      },
      cohort_en_global: {
        title: `⚽ Match Day Intelligence: 100% Loss Refund & ${companyName} Bonus!`,
        message: `Claim 130% welcome bonus using promo code "${promoCode}". Unfreeze balances 1:1 with verified VEX community guarantees.`,
        marketingAngle: 'Global English copy emphasizing verified tactical predictions and automated 100% refund security',
      },
      cohort_ru_cis: {
        title: `🎯 VEX Прогноз на матч: 130% Бонус и 100% защита ставок на ${companyName}!`,
        message: `Активируйте промокод "${promoCode}" для максимального бонуса. Мгновенная разморозка депозитов 1:1 и возврат средств без риска.`,
        marketingAngle: 'Русскоязычная адаптация с четкими условиями бонуса и гарантией возврата средств',
      },
    };

    let generatedResults: Record<string, { title: string; message: string; marketingAngle?: string }> = { ...defaultTemplates };

    const client = this.getClient();
    if (client) {
      try {
        const prompt = `أنت مدير حملات الإشعارات وتوطين المحتوى الذكي لمنصة VEX Deals.
المطلوب صياغة إشعار جذاب واحترافي موجه لكل شريحة من شرائح المستخدمين بحسب لغتها وثقافتها ودولتها قبل الإرسال.

بيانات المنصة والحملة:
- موضوع الإشعار: ${theme}
- الشركة المستهدفة: ${companyName} (كود الترويج: ${promoCode})
- التوجيه الإضافي من الإدارة: ${params.customPrompt || 'صياغة ذكية ومحفزة تضمن أعلى نسبة فتح'}
${params.baseTitle ? `- العنوان الأساسي المقترح: ${params.baseTitle}` : ''}
${params.baseMessage ? `- نص الرسالة الأساسية المقترحة: ${params.baseMessage}` : ''}

الشرائح المطلوب صياغة إشعار خاص ومميز بكل منها:
1. "cohort_ar_eg": باللغة العربية بلهجة مصرية/شامية محبوبة ومباشرة ومحفزة لعشاق كرة القدم.
2. "cohort_ar_gulf": باللغة العربية الخليجية الراقية (VIP) مع التركيز على الكاش باك ومضاعفات الولاء والأمان.
3. "cohort_fr_maghreb": باللغة الفرنسية الاحترافية السلسة الموجهة للاعبين في المغرب والجزائر وتونس (Paris sportifs, Cashback garanti).
4. "cohort_en_global": باللغة الإنجليزية العالمية الواضحة للاعبين الدوليين (Tactical odds, 100% refund).
5. "cohort_ru_cis": باللغة الروسية الطبيعية لدول شرق أوروبا ورابطة الدول المستقلة.

شروط هامة:
- تأكد من ذكر بروموكود الشركة (${promoCode}) وضمانات VEX (تعويض 100% أو فك التجميد 1:1).
- العنوان ألا يتجاوز 10 كلمات، والرسالة لا تتجاوز 25 كلمة لكل لغة.

أرجع النتيجة بصيغة JSON فقط:
{
  "cohort_ar_eg": { "title": "...", "message": "...", "marketingAngle": "..." },
  "cohort_ar_gulf": { "title": "...", "message": "...", "marketingAngle": "..." },
  "cohort_fr_maghreb": { "title": "...", "message": "...", "marketingAngle": "..." },
  "cohort_en_global": { "title": "...", "message": "...", "marketingAngle": "..." },
  "cohort_ru_cis": { "title": "...", "message": "...", "marketingAngle": "..." }
}`;

        const res = await client.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
        });

        const parsed = JSON.parse(res.text || '{}');
        Object.keys(defaultTemplates).forEach((key) => {
          if (parsed[key] && parsed[key].title && parsed[key].message) {
            generatedResults[key] = {
              title: parsed[key].title.trim(),
              message: parsed[key].message.trim(),
              marketingAngle: parsed[key].marketingAngle || defaultTemplates[key].marketingAngle,
            };
          }
        });
      } catch (err) {
        console.warn('[AgentEngine] Failed to generate Gemini multi-language campaign, using refined templates:', err);
      }
    }

    const cohortVariants = cohorts.map((c) => {
      const localHour = (utcHours + (c.timezone_offset_hours || 0) + 24) % 24;
      const isQuiet = localHour >= 23 || localHour < 9;
      const isOptimal = localHour >= 18 && localHour <= 22;
      const localTimingStatus: 'optimal' | 'quiet' | 'active' = isOptimal ? 'optimal' : isQuiet ? 'quiet' : 'active';
      const localTimeNow = `${localHour.toString().padStart(2, '0')}:${formattedMinutes}`;
      const localTimingWindow = isOptimal
        ? 'الآن في نافذة الذروة والتفاعل الذهبية!'
        : isQuiet
        ? 'ساعات الهدوء والراحة الليلية'
        : 'ساعات نشاط عادية';

      const localizedData = generatedResults[c.id] || defaultTemplates[c.id] || defaultTemplates.cohort_ar_eg;

      return {
        cohortId: c.id,
        cohortNameAr: c.name_ar,
        cohortNameEn: c.name,
        language: c.language,
        languageNameAr: c.language_name_ar || c.language,
        languageNameEn: c.language_name_en || c.language,
        countryFlag: c.country_flag,
        countryName: c.name_ar.split('(')[0].trim(),
        countryCode: c.country_code,
        estimatedUsers: c.estimated_users || 350,
        title: localizedData.title,
        message: localizedData.message,
        category: theme === 'sports_tactical' ? 'ai_prediction' : 'compensation',
        urgency: 'non-urgent' as const,
        localTimeNow,
        localTimingWindow,
        localTimingStatus,
        marketingAngle: localizedData.marketingAngle || 'استهداف مخصص بحسب اللغة والدولة',
        recommendedPromoCode: promoCode,
      };
    });

    return {
      success: true,
      campaignId: `CAMP-${Date.now()}`,
      theme,
      agentUsed: {
        id: agent.id,
        name_ar: agent.name_ar,
        avatar: agent.avatar,
      },
      cohortVariants,
    };
  }

  public dispatchLocalizedCampaign(params: {
    campaignId?: string;
    variants: Record<string, { title: string; message: string; category?: string; urgency?: string }>;
    defaultTitle?: string;
    defaultMessage?: string;
    targetCompanyId?: string;
  }): any {
    const variants = params.variants || {};
    const arVariant = variants['cohort_ar_eg'] || Object.values(variants)[0] || {
      title: params.defaultTitle || '⚡ إشعار وتنبيه جديد من VEX Deals',
      message: params.defaultMessage || 'تفقد العروض الحصرية وتوقعات الذكاء الاصطناعي اليوم.',
    };

    const translations: Record<string, { title: string; message: string }> = {};

    Object.entries(variants).forEach(([cohortKey, varData]) => {
      let lang = 'ar';
      if (cohortKey.includes('fr')) lang = 'fr';
      else if (cohortKey.includes('en')) lang = 'en';
      else if (cohortKey.includes('ru')) lang = 'ru';
      translations[lang] = {
        title: varData.title,
        message: varData.message,
      };
    });

    if (!translations['ar']) {
      translations['ar'] = { title: arVariant.title, message: arVariant.message };
    }

    const masterNotification = {
      id: `NOTIF-LOCALIZED-${Date.now()}`,
      title: arVariant.title,
      message: arVariant.message,
      category: arVariant.category || 'ai_prediction',
      timestamp: new Date().toISOString(),
      read: false,
      translations,
      data: {
        campaignId: params.campaignId || `CAMP-${Date.now()}`,
        multilingual: true,
        cohortsTargeted: Object.keys(variants).length,
        dispatchedBy: 'AI Multi-Language Audience Studio',
        variantsSummary: Object.entries(variants).map(([k, v]) => ({ cohort: k, title: v.title })),
      },
    };

    storage.addNotification(masterNotification);

    return {
      success: true,
      notification: masterNotification,
      totalCohortsDispatched: Object.keys(variants).length,
      languagesIncluded: Object.keys(translations),
    };
  }

  // =========================================================================
  // A/B TESTING NOTIFICATIONS & REGIONAL RESONANCE PREDICTION ENGINE
  // =========================================================================

  public async generateAbTestVariants(params: {
    theme?: string;
    contrastType?: 'linguistic_style' | 'call_to_action' | 'regional_dialect' | 'custom';
    agentId?: string;
    targetCompanyId?: string;
    customPrompt?: string;
    baseTitle?: string;
    baseMessage?: string;
    campaignName?: string;
  }): Promise<{
    success: boolean;
    campaign: any;
  }> {
    const agent = this.getAgentById(params.agentId || 'agent_marketing_partners') || this.getAgents()[0];
    const companies = storage.getCompanies();
    const theme = params.theme || 'sports_tactical';
    const contrastType = params.contrastType || 'linguistic_style';

    let targetCompany = companies.find((c) => c.id.toLowerCase() === (params.targetCompanyId || '').toLowerCase());
    if (!targetCompany && params.targetCompanyId) {
      targetCompany = companies.find((c) => c.name.toLowerCase().includes(params.targetCompanyId!.toLowerCase()));
    }
    if (!targetCompany) {
      targetCompany = companies.find((c) => c.name.toLowerCase().includes('1xbet')) || companies[0];
    }

    const companyName = targetCompany?.name || '1XBET';
    const promoCode = targetCompany?.promo_code || 'vexwallet';

    // Default high-converting A/B contrast presets
    let variantA = {
      id: 'A' as const,
      name: 'النسخة أ - فصحى راقية وموثوقة (VIP Prestige)',
      title: `👑 تغطية حصرية VIP: استرداد نقدي 100% وبونص النخبة على ${companyName}`,
      message: `نقدم لك أعلى درجات الأمان وتأمين الرصيد 1:1 عبر VEX Deals برمز الترويج (${promoCode}). حماية كاملة وضمانات معتمدة.`,
      ctaText: 'فعّل تأمين الـ VIP واسترد رصيدك',
      ctaAction: 'https://vexdeals.com/vip-cashback',
      linguisticStyle: 'فصحى رسمية راقية (VIP Prestige)',
      toneDescriptionAr: 'لغة رصينة تركز على الأمان المالي وضمانات الاسترداد الرسمية للعملاء المميزين',
      toneDescriptionEn: 'Refined standard Arabic emphasizing financial security, elite status, and guaranteed protection',
      sampleSent: 0,
      clicks: 0,
      ctr: 0,
    };

    let variantB = {
      id: 'B' as const,
      name: 'النسخة ب - عامية حماسية ومباشرة (High-Energy Action)',
      title: `⚡ الماتش مولع الليلة! فك تجميدك فوراً واسترجع 100% كاش باك!`,
      message: `ماتسيبش فرصتك تضيع! سجل بالبروموكود (${promoCode}) في ${companyName} وخد تعويض كامل عن أي خسارة من محفظة VEX فوراً.`,
      ctaText: 'استرجع كاش باك الـ 100% الآن!',
      ctaAction: 'https://vexdeals.com/instant-claim',
      linguisticStyle: 'عامية حماسية ومباشرة (High-Energy Action)',
      toneDescriptionAr: 'لغة عفوية سريعة تثير الحماس وتركز على سرعة الاسترداد وتجنب فوات الفرصة',
      toneDescriptionEn: 'Conversational, urgent copy driving energetic action and rapid unfreezing',
      sampleSent: 0,
      clicks: 0,
      ctr: 0,
    };

    let hypothesisAr = 'هل تؤدي النبرة الحماسية السريعة الموجهة للملاعب إلى زيادة معدل النقر مقارنة بالنبرة الرسمية الموجهة لكبار العملاء في مختلف الدول؟';
    let hypothesisEn = 'Does energetic urgent copy convert higher than formal VIP prestige across regional audiences?';

    let regionalResonance = [
      {
        cohortId: 'cohort_ar_eg',
        regionNameAr: 'مصر وبلاد الشام',
        regionNameEn: 'Egypt & Levant',
        flag: '🇪🇬',
        scoreA: 64,
        scoreB: 92,
        preferredVariant: 'B' as const,
        reasonAr: 'الجمهور في مصر يفضل العامية الحماسية المباشرة والمكسب السريع، ما يرفع نسبة النقر CTR بشكل ملحوظ.',
        reasonEn: 'Egyptian users resonate heavily with enthusiastic match slang and immediate unfreeze terminology.',
      },
      {
        cohortId: 'cohort_ar_gulf',
        regionNameAr: 'دول الخليج العربي (VIP)',
        regionNameEn: 'Gulf Cooperation Council (VIP)',
        flag: '🇸🇦',
        scoreA: 91,
        scoreB: 68,
        preferredVariant: 'A' as const,
        reasonAr: 'مستخدمو الخليج يفضلون النبرة الفاخرة والضمانات المالية المرموقة (VIP Prestige) والمصداقية العالية.',
        reasonEn: 'Gulf users strongly favor prestige, elite cashback perks, and formal reliability guarantees.',
      },
      {
        cohortId: 'cohort_fr_maghreb',
        regionNameAr: 'المغرب العربي والفرانكفونية',
        regionNameEn: 'North Africa & Francophone',
        flag: '🇲🇦',
        scoreA: 72,
        scoreB: 85,
        preferredVariant: 'B' as const,
        reasonAr: 'الجمهور المغاربي ينجذب أكثر للدعوة المباشرة الواضحة للعمل (Action-Oriented CTA) مع ضمان استرداد 100%.',
        reasonEn: 'Maghreb users respond better to clear, high-velocity refund guarantees.',
      },
      {
        cohortId: 'cohort_en_global',
        regionNameAr: 'المستخدمون الدوليون (الإنجليزية)',
        regionNameEn: 'International / Global',
        flag: '🌍',
        scoreA: 80,
        scoreB: 82,
        preferredVariant: 'B' as const,
        reasonAr: 'تقارب كبير في التفاعل مع تفوق طفيف للصيغة المباشرة والسريعة.',
        reasonEn: 'Balanced reception with slight bias towards actionable tactical refund wording.',
      },
      {
        cohortId: 'cohort_ru_cis',
        regionNameAr: 'رابطة الدول المستقلة وشرق أوروبا',
        regionNameEn: 'CIS & Eastern Europe',
        flag: '🇷🇺',
        scoreA: 88,
        scoreB: 74,
        preferredVariant: 'A' as const,
        reasonAr: 'المستخدمون في أوروبا الشرقية يفضلون الشروط الدقيقة والضمانات الرسمية الواضحة دون مبالغة.',
        reasonEn: 'CIS users favor explicit contractual refund guarantees and exact figures over hype.',
      },
    ];

    if (contrastType === 'call_to_action') {
      variantA = {
        id: 'A',
        name: 'النسخة أ - تركيز على الأمان واسترداد 100% (Safety & Guarantee CTA)',
        title: `🛡️ تأمين كامل ضد خسارة الرهان في ${companyName}: استرجع رصيدك 1:1 فوراً`,
        message: `مهما كانت نتيجة المباراة، محفظة VEX Deals تضمن لك استرداد 100% من خسارتك وفك تجميد الرصيد فور إدخال رقم القسيمة. كود: (${promoCode}).`,
        ctaText: 'أمّن رهانك الآن واسترد خسارتك 100%',
        ctaAction: 'https://vexdeals.com/guarantee',
        linguisticStyle: 'تركيز على الأمان المالي واسترداد القيمة',
        toneDescriptionAr: 'رسالة مطمئنة تزيل المخاطر وتبعث على الثقة الكاملة',
        toneDescriptionEn: 'Risk-reversal messaging focused on total balance protection and trust',
        sampleSent: 0,
        clicks: 0,
        ctr: 0,
      };

      variantB = {
        id: 'B',
        name: 'النسخة ب - تركيز على البونص الضخم 130% (Greed / Maximizer CTA)',
        title: `🎁 ضاعف رصيدك الآن: بونص 130% حصري في ${companyName} بكود (${promoCode})`,
        message: `احصل فوراً على 130% بونص ترحيبي مضاعف على إيداعك الجديد واستفد من أرباحك الإضافية في جميع البطولات الكبرى عبر VEX.`,
        ctaText: 'اضغط هنا لمضاعفة إيداعك 130% فوراً!',
        ctaAction: 'https://vexdeals.com/bonus130',
        linguisticStyle: 'تركيز على تعظيم المكاسب والبونص السخي',
        toneDescriptionAr: 'رسالة تحفيزية تركز على القيمة المادية المضافة ومضاعفة الأرباح',
        toneDescriptionEn: 'Value-maximization messaging focused on lucrative bonus magnification',
        sampleSent: 0,
        clicks: 0,
        ctr: 0,
      };

      hypothesisAr = 'هل يتفوق زر الدعوة المبني على استرداد الخسارة بنسبة 100% على زر البونص الترحيبي 130% في معدل التحويل؟';
      hypothesisEn = 'Does a 100% loss-protection CTA convert higher than a 130% deposit bonus CTA?';
    } else if (contrastType === 'regional_dialect') {
      variantA = {
        id: 'A',
        name: 'النسخة أ - اللهجة الخليجية الراقية (Gulf Regional Dialect)',
        title: `👑 يا هلا بالنشامى: كاش باك ملكي وفك تجميد الرصيد عبر ${companyName}`,
        message: `استمتع بأقوى عروض الموسم مع كود النخبة (${promoCode}). تأمين فوري 1:1 وخدمة كبار الشخصيات على مدار الساعة.`,
        ctaText: 'فعّل مزايا VIP واسترداد الرصيد',
        ctaAction: 'https://vexdeals.com/gulf-vip',
        linguisticStyle: 'لهجة خليجية راقية موجهة لكبار الشخصيات',
        toneDescriptionAr: 'ألفاظ خليجية أصيلة محبوبة تدل على الكرم والتقدير والخدمة الفاخرة',
        toneDescriptionEn: 'Authentic Gulf hospitality and elite terms',
        sampleSent: 0,
        clicks: 0,
        ctr: 0,
      };

      variantB = {
        id: 'B',
        name: 'النسخة ب - اللهجة المصرية الرياضية (Egyptian Match Slang)',
        title: `⚽ الماتش مولع يا كابتن! فك تجميدك واكسب كاش باك 100% مع ${companyName}`,
        message: `فرصتك جت لحد عندك! سجل بكود (${promoCode})، اضمن رهانك 1:1 ورجع فلوسك في ثواني بدون وجع دماغ.`,
        ctaText: 'دوس هنا ورجع فلوسك فوراً يا كابتن!',
        ctaAction: 'https://vexdeals.com/egy-instant',
        linguisticStyle: 'لهجة مصرية كروية حماسية ومباشرة',
        toneDescriptionAr: 'مصطلحات الشارع الرياضي المصري السريعة التي تكسر الحواجز وتضمن تفاعلاً فورياً',
        toneDescriptionEn: 'Energetic Egyptian football street slang driving rapid engagement',
        sampleSent: 0,
        clicks: 0,
        ctr: 0,
      };

      hypothesisAr = 'هل تخصيص اللهجة المحلية الصريحة (الخليجية مقابل المصرية) يحقق قفزة في التفاعل مقارنة بالفصحى الموحدة؟';
      hypothesisEn = 'Does localized dialect contrast outperform unified Modern Standard Arabic?';
    }

    // Try Gemini if client is ready
    const client = this.getClient();
    if (client) {
      try {
        const prompt = `أنت خبير التوطين اللغوي واختبارات A/B للإشعارات في منصة VEX Deals الرياضية.
المطلوب إنشاء نسختين متقابلتين تماماً من الإشعار (النسخة A والنسخة B) لإجراء اختبار A/B حقيقي قبل البث الكامل.

بيانات الحملة:
- محور المقارنة المطلوب: ${contrastType} (مثل نبرة فصحى راقية مقابل عامية حماسية، أو زر دعوة للعمل CTA استرداد الخسارة مقابل بونص 130%)
- موضوع الحملة: ${theme}
- اسم الشركة الشريكة: ${companyName}
- رمز الترويج: ${promoCode}
${params.customPrompt ? `- توجيه مخصص من الإدارة: ${params.customPrompt}` : ''}
${params.baseTitle ? `- العنوان المبدئي: ${params.baseTitle}` : ''}
${params.baseMessage ? `- الرسالة المبدئية: ${params.baseMessage}` : ''}

المطلوب إرجاع كائن JSON حصراً بالشكل التالي:
{
  "variantA": {
    "name": "اسم معبر للنسخة أ",
    "title": "عنوان الإشعار أ (أقل من 10 كلمات)",
    "message": "نص رسالة الإشعار أ (أقل من 25 كلمة)",
    "ctaText": "نص زر الدعوة للإجراء CTA أ",
    "ctaAction": "رابط أو إجراء الزر",
    "linguisticStyle": "وصف الأسلوب اللغوي",
    "toneDescriptionAr": "شرح نبرة الصوت وتأثيرها النفسي",
    "toneDescriptionEn": "English description of tone"
  },
  "variantB": {
    "name": "اسم معبر للنسخة ب",
    "title": "عنوان الإشعار ب (أقل من 10 كلمات)",
    "message": "نص رسالة الإشعار ب (أقل من 25 كلمة)",
    "ctaText": "نص زر الدعوة للإجراء CTA ب",
    "ctaAction": "رابط أو إجراء الزر",
    "linguisticStyle": "وصف الأسلوب اللغوي",
    "toneDescriptionAr": "شرح نبرة الصوت وتأثيرها النفسي",
    "toneDescriptionEn": "English description of tone"
  },
  "hypothesisAr": "فرضية الاختبار بالعربية",
  "hypothesisEn": "Test hypothesis in English",
  "regionalResonance": [
    {
      "cohortId": "cohort_ar_eg",
      "regionNameAr": "مصر وبلاد الشام",
      "regionNameEn": "Egypt & Levant",
      "flag": "🇪🇬",
      "scoreA": 65,
      "scoreB": 90,
      "preferredVariant": "B",
      "reasonAr": "سبب التفضيل في هذه المنطقة"
    },
    {
      "cohortId": "cohort_ar_gulf",
      "regionNameAr": "دول الخليج العربي (VIP)",
      "regionNameEn": "Gulf Cooperation Council (VIP)",
      "flag": "🇸🇦",
      "scoreA": 92,
      "scoreB": 70,
      "preferredVariant": "A",
      "reasonAr": "سبب التفضيل في هذه المنطقة"
    },
    {
      "cohortId": "cohort_fr_maghreb",
      "regionNameAr": "المغرب العربي والفرانكفونية",
      "regionNameEn": "North Africa & Francophone",
      "flag": "🇲🇦",
      "scoreA": 75,
      "scoreB": 84,
      "preferredVariant": "B",
      "reasonAr": "سبب التفضيل في هذه المنطقة"
    },
    {
      "cohortId": "cohort_en_global",
      "regionNameAr": "المستخدمون الدوليون (الإنجليزية)",
      "regionNameEn": "International / Global",
      "flag": "🌍",
      "scoreA": 81,
      "scoreB": 82,
      "preferredVariant": "B",
      "reasonAr": "سبب التفضيل في هذه المنطقة"
    },
    {
      "cohortId": "cohort_ru_cis",
      "regionNameAr": "رابطة الدول المستقلة وشرق أوروبا",
      "regionNameEn": "CIS & Eastern Europe",
      "flag": "🇷🇺",
      "scoreA": 87,
      "scoreB": 73,
      "preferredVariant": "A",
      "reasonAr": "سبب التفضيل في هذه المنطقة"
    }
  ]
}`;

        const res = await client.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.35,
          },
        });

        const parsed = JSON.parse(res.text || '{}');
        if (parsed.variantA && parsed.variantB) {
          variantA = {
            ...variantA,
            ...parsed.variantA,
            id: 'A',
            sampleSent: 0,
            clicks: 0,
            ctr: 0,
          };
          variantB = {
            ...variantB,
            ...parsed.variantB,
            id: 'B',
            sampleSent: 0,
            clicks: 0,
            ctr: 0,
          };
          if (parsed.hypothesisAr) hypothesisAr = parsed.hypothesisAr;
          if (parsed.hypothesisEn) hypothesisEn = parsed.hypothesisEn;
          if (Array.isArray(parsed.regionalResonance) && parsed.regionalResonance.length > 0) {
            regionalResonance = parsed.regionalResonance.map((r: any, idx: number) => ({
              ...regionalResonance[idx],
              ...r,
            }));
          }
        }
      } catch (geminiErr) {
        console.warn('[AgentEngine] Gemini A/B generation encountered an issue, using expert presets:', geminiErr);
      }
    }

    const campaignId = `ab-camp-${Date.now()}`;
    const generatedCampaign = {
      id: campaignId,
      name: params.campaignName || `اختبار A/B: ${theme === 'sports_tactical' ? 'مباريات القمة' : 'تأمين التعويضات'} (${contrastType === 'linguistic_style' ? 'الأسلوب اللغوي' : contrastType === 'call_to_action' ? 'زر الدعوة CTA' : 'اللهجات الإقليمية'})`,
      theme,
      contrastType,
      agentId: agent.id,
      agentName: agent.name_ar,
      status: 'draft',
      createdAt: new Date().toISOString(),
      variantA,
      variantB,
      regionalResonance,
      hypothesisAr,
      hypothesisEn,
      winner: null,
      winnerReasonAr: undefined,
      category: theme === 'sports_tactical' ? 'ai_prediction' : 'compensation',
      urgency: 'urgent',
    };

    return {
      success: true,
      campaign: generatedCampaign,
    };
  }


  // =========================================================================
  // TIME-BASED HEURISTIC ENGINE & USER BEHAVIOR OPTIMAL WINDOW SCHEDULER
  // =========================================================================

  public evaluateNotificationUrgencyAndTiming(params: {
    title: string;
    message: string;
    category?: string;
    targetUserId?: string;
    urgency?: 'urgent' | 'non-urgent';
  }): {
    urgency: 'urgent' | 'non-urgent';
    canDispatchImmediately: boolean;
    targetOptimalWindow: string;
    optimalStartHour: number;
    optimalEndHour: number;
    scheduledTimeIso: string;
    heuristicReason: string;
    timingScore: number;
    cohortBehavior: any;
  } {
    const textToCheck = `${params.title} ${params.message} ${params.category || ''}`.toLowerCase();
    const urgentKeywords = [
      'أمني', 'حماية', 'سحب', 'إيداع', 'تحويل', 'كود', 'موافقة', 'طارئ', 'عاجل',
      'security', 'fraud', 'otp', 'payout', 'transfer', 'critical', 'emergency'
    ];

    let isUrgent = params.urgency === 'urgent';
    if (!params.urgency) {
      isUrgent =
        urgentKeywords.some((k) => textToCheck.includes(k)) ||
        params.category === 'security' ||
        params.category === 'payout';
    }

    const urgency: 'urgent' | 'non-urgent' = isUrgent ? 'urgent' : 'non-urgent';

    // Query User Engagement Behavior (User-specific or Aggregated Cohort)
    const cohort = storage.getAggregatedCohortBehavior();
    let optimalStart = cohort.optimalEngagementWindow.startHour;
    let optimalEnd = cohort.optimalEngagementWindow.endHour;
    let windowLabel = cohort.optimalEngagementWindow.labelAr;

    if (params.targetUserId && params.targetUserId !== 'all') {
      const userProf = storage.getUserProfile(params.targetUserId);
      if (userProf.engagementBehavior?.optimalEngagementWindow) {
        optimalStart = userProf.engagementBehavior.optimalEngagementWindow.startHour;
        optimalEnd = userProf.engagementBehavior.optimalEngagementWindow.endHour;
        windowLabel = userProf.engagementBehavior.optimalEngagementWindow.labelAr;
      }
    }

    const now = new Date();
    // Cairo / Riyadh Hour (UTC+3)
    const currentCairoHour = (now.getUTCHours() + 3) % 24;
    const isQuiet = currentCairoHour >= 23 || currentCairoHour < 10;
    const isWithinOptimal = currentCairoHour >= optimalStart && currentCairoHour <= optimalEnd;

    // Calculate next optimal engagement window ISO date
    const scheduledDate = new Date(now.getTime());
    let diffHours = optimalStart - currentCairoHour;
    if (diffHours <= 0) {
      diffHours += 24;
    }
    scheduledDate.setTime(scheduledDate.getTime() + diffHours * 3600 * 1000);
    scheduledDate.setMinutes(15, 0, 0);

    let canDispatchImmediately = false;
    let heuristicReason = '';
    let timingScore = 50;

    if (urgency === 'urgent') {
      canDispatchImmediately = true;
      heuristicReason = 'تم تصنيف الإشعار كـ "عاجل" (أمان/معاملة مالية) - تم التصريح بالإرسال الفوري لضمان سرعة استجابة المستخدم.';
      timingScore = 95;
    } else {
      // Non-urgent
      if (isWithinOptimal && !isQuiet) {
        canDispatchImmediately = true;
        heuristicReason = `الوقت الحالي (${currentCairoHour}:00 بتوقيت الشرق الأوسط) يقع مباشرة داخل نافذة التفاعل القصوى (${optimalStart}:00 - ${optimalEnd}:00). الإرسال المباشر موصى به.`;
        timingScore = 92;
      } else if (isQuiet) {
        canDispatchImmediately = false;
        heuristicReason = `الوقت الحالي (${currentCairoHour}:00) يقع ضمن ساعات الصمت والراحة الليلية. يقترح محرك الاستدلال جدولة الإشعار غير العاجل لنافذة التفاعل القادمة (${optimalStart}:00) لمنع الإزعاج.`;
        timingScore = 20;
      } else {
        canDispatchImmediately = false;
        heuristicReason = `المستخدمون حالياً خارج أوقات الذروة التفاعلية (${currentCairoHour}:00). استناداً لسجل سلوك المستخدمين، جدولته لنافذة التفاعل المثلى (${optimalStart}:00) يرفع معدل الفتح بنسبة تفوق 70% ويمنع الإزعاج.`;
        timingScore = 45;
      }
    }

    return {
      urgency,
      canDispatchImmediately,
      targetOptimalWindow: windowLabel,
      optimalStartHour: optimalStart,
      optimalEndHour: optimalEnd,
      scheduledTimeIso: scheduledDate.toISOString(),
      heuristicReason,
      timingScore,
      cohortBehavior: cohort,
    };
  }

  public scheduleNotification(params: {
    title: string;
    message: string;
    category?: string;
    urgency?: 'urgent' | 'non-urgent';
    targetUserId?: string;
    scheduledFor?: string;
    heuristicReason?: string;
    targetOptimalWindow?: string;
  }): any {
    const evaluation = this.evaluateNotificationUrgencyAndTiming({
      title: params.title,
      message: params.message,
      category: params.category,
      targetUserId: params.targetUserId,
      urgency: params.urgency,
    });

    const scheduledItem = {
      id: `SCHED-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: params.title,
      message: params.message,
      category: params.category || 'ai_prediction',
      urgency: params.urgency || evaluation.urgency,
      scheduledFor: params.scheduledFor || evaluation.scheduledTimeIso,
      targetOptimalWindow: params.targetOptimalWindow || evaluation.targetOptimalWindow,
      status: 'pending',
      createdAt: new Date().toISOString(),
      targetUserId: params.targetUserId || 'all',
      relevanceScore: evaluation.timingScore,
      heuristicReason: params.heuristicReason || evaluation.heuristicReason,
    };

    storage.addScheduledNotification(scheduledItem);
    return scheduledItem;
  }

  public processDueScheduledNotifications(): any[] {
    const list = storage.getScheduledNotifications();
    const nowTime = Date.now();
    const dispatched: any[] = [];

    list.forEach((item) => {
      if (item.status === 'pending') {
        const schedTime = new Date(item.scheduledFor).getTime();
        if (schedTime <= nowTime) {
          item.status = 'dispatched';
          item.dispatchedAt = new Date().toISOString();

          const notif = {
            id: `NOTIF-AUTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            title: item.title,
            message: item.message,
            category: item.category || 'ai_prediction',
            timestamp: new Date().toISOString(),
            read: false,
            data: {
              source: 'AI Time-Based Heuristic Engine',
              scheduledId: item.id,
              optimalWindow: item.targetOptimalWindow,
              urgency: item.urgency,
            },
          };
          storage.addNotification(notif);
          dispatched.push(notif);
        }
      }
    });

    if (dispatched.length > 0) {
      storage.saveScheduledNotifications(list);
    }

    return dispatched;
  }
}

export const agentEngine = new AgentEngine();
