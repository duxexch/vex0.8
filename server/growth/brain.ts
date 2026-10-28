import { generateWithFailover } from '../agentEngine';

// =========================================================================
// The brain: hybrid intent classification (regex-first, LLM fallback),
// contextual group replies, and drip copy generation — all on top of the
// existing multi-provider generateWithFailover chain.
// =========================================================================

export interface IntentResult {
  intent:
    | 'greeting'
    | 'prediction_ask'
    | 'lottery_ask'
    | 'cashback_ask'
    | 'deposit_ask'
    | 'withdraw_ask'
    | 'promo_ask'
    | 'agent_interest'
    | 'question'
    | 'other'
    | 'spam';
  topics: string[]; // ['predictions','lottery','cashback','agents','promo','deposit','withdraw']
  wants_reply: boolean;
  is_agent: boolean;
  lang: 'ar' | 'en';
}

const AR_AGENT = /وكل[اةئن]|وكيل|شراكت|عمول|افيليت|collab|affiliate|\bpartner|commission|agency/i;
const AR_PRED = /توقع|تنبؤ|تحليل|توصيه|توصية| Odds?|odd |prediction|analysis|\btip|مباراة|مباريات|يلعب|fixture|تشكيلة|تشكيل|كوؤن|كون|نتائج|نتيجة/i;
const AR_LOTTERY = /يانصيب|lottery|jackpot|جاكبت|سحب|تذكرة|تذاكر|ticket|prize|جائزة|فوز|rich for life|اربح|أربح/i;
const AR_CASHBACK = /تعويض|استرداد|كاش ?باك|cash ?back|خسر|خسائر|خساره|خسارة|refund|compensat|ارجع|أرجع|فلوس/i;
const AR_DEPOSIT = /\bdeposit|ودع|ايداع|إيداع|وديعة|top ?up|شحن الرصيد|شحن حساب/i;
// strong withdraw phrasing only — bare "سحب" stays ambiguous (lottery draw vs payout)
const AR_WITHDRAW = /\bwithdraw|cash ?out|سحب فلوس|سحب رصيد|عملية السحب|عملية سحب|طلب سحب|طلب السحب|خرج(ت)? فلوس|استلم فلوس|سحب حساب/i;
const LOTTERY_STRONG = /يانصيب|lottery|jackpot|جاكبت|تذكرة|تذاكر|جائزة/;
const AR_PROMO = /كود|برومو|خصم|promo|discount|\bcode|عرض|عروض|حمله|حملة/i;
const AR_GREET = /^(هلا|مرحبا|مرحبًا|السلام|اهلا|أهلا|هاي|أهلين|صباح|مساء|hi|hello|hey|yo|salam)\b|^(هلا|مرحبا|السلام|اهلا|أهلا|هاي)[\s!.،]/i;
const SPAM_RE = /http[s]?:\/\/(?!t\.me|vex\.deals)|viagra|casino(?! )|18\+|صراخ|نيك|سكس|sex |crypto ?profit|investment ?guaranteed|forex ?signal/i;
const QUESTION_RE = /؟|\?|مين|متى|وين|فين|كيف|ليش|ليه|كم|هل |what|when|where|who|why|how|can |could |is |are /i;

function hasAny(text: string, re: RegExp): boolean {
  return re.test(text);
}

/** Fast regex classification — only falls back to the LLM for long/ambiguous texts. */
export function classifyIntent(text: string): IntentResult {
  const t = (text || '').slice(0, 1200);
  const lang: 'ar' | 'en' = /[\u0600-\u06FF]/.test(t) ? 'ar' : 'en';

  if (hasAny(t, SPAM_RE) && t.length < 80) {
    return { intent: 'spam', topics: [], wants_reply: false, is_agent: false, lang };
  }

  const is_agent = hasAny(t, AR_AGENT);
  const is_deposit = hasAny(t, AR_DEPOSIT);
  const is_withdraw = hasAny(t, AR_WITHDRAW);
  const lottery_strong = hasAny(t, LOTTERY_STRONG);
  const is_greeting = hasAny(t, AR_GREET) && t.trim().length < 60;
  const is_question = hasAny(t, QUESTION_RE) || t.trim().endsWith('؟');
  // soft withdraw: bare "سحب" with a money context but no strong lottery words
  // (e.g. "مش عارف اسحب") — while "سحب الجائزة" stays lottery via lottery_strong.
  const withdraw_soft =
    !is_withdraw && !lottery_strong && hasAny(t, /سحب/) &&
    (is_question || hasAny(t, /فلوس|رصيد|حساب|بنك|محفظة/));
  const wantWithdraw = is_withdraw || withdraw_soft;

  const topics: string[] = [];
  if (is_agent) topics.push('agents');
  if (hasAny(t, AR_PRED)) topics.push('predictions');
  if (hasAny(t, AR_LOTTERY)) topics.push('lottery');
  if (is_deposit) topics.push('deposit');
  if (wantWithdraw) topics.push('withdraw');
  if (hasAny(t, AR_CASHBACK)) topics.push('cashback');
  if (hasAny(t, AR_PROMO)) topics.push('promo');

  if (is_greeting && topics.length === 0) {
    return { intent: 'greeting', topics: [], wants_reply: true, is_agent: false, lang };
  }
  if (is_agent) {
    return { intent: 'agent_interest', topics, wants_reply: true, is_agent: true, lang };
  }
  // wallet intents outrank cashback/lottery — "ودع فلوس" is a deposit, not a refund;
  // "عملية السحب" is a payout, not a lottery draw.
  if (is_deposit) {
    return { intent: 'deposit_ask', topics, wants_reply: true, is_agent: false, lang };
  }
  if (wantWithdraw) {
    return { intent: 'withdraw_ask', topics, wants_reply: true, is_agent: false, lang };
  }
  if (topics.includes('cashback')) {
    return { intent: 'cashback_ask', topics, wants_reply: true, is_agent: false, lang };
  }
  if (topics.includes('lottery')) {
    return { intent: 'lottery_ask', topics, wants_reply: true, is_agent: false, lang };
  }
  if (topics.includes('predictions')) {
    return { intent: 'prediction_ask', topics, wants_reply: is_question || topics.length === 1, is_agent: false, lang };
  }
  if (topics.includes('promo')) {
    return { intent: 'promo_ask', topics, wants_reply: is_question, is_agent: false, lang };
  }
  if (is_question && t.length > 15) {
    return { intent: 'question', topics: [], wants_reply: true, is_agent: false, lang };
  }
  return { intent: 'other', topics: [], wants_reply: false, is_agent: false, lang };
}

/** LLM classify for long/ambiguous texts where regex found nothing. */
export async function classifyIntentSmart(text: string): Promise<IntentResult> {
  const base = classifyIntent(text);
  if (base.intent !== 'other' || !text || text.trim().length < 20) return base;
  try {
    const raw = await generateWithFailover(
      `صنّف رسالة مستخدم في مجتمع VEX Deals (منصة توقعات رياضية + يانصيب + تعويض خسائر):\n"${text.slice(0, 600)}"\n\nأعد JSON فقط: {"intent":"greeting|prediction_ask|lottery_ask|cashback_ask|deposit_ask|withdraw_ask|promo_ask|agent_interest|question|other|spam","topics":["predictions|lottery|cashback|agents|promo|deposit|withdraw"],"wants_reply":boolean,"is_agent":boolean,"lang":"ar|en"}`,
      'You are an intent classifier. Reply with compact JSON only, no prose.',
      0.1
    );
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return base;
    const parsed = JSON.parse(jsonMatch[0]);
    const valid = ['greeting','prediction_ask','lottery_ask','cashback_ask','deposit_ask','withdraw_ask','promo_ask','agent_interest','question','other','spam'];
    if (!valid.includes(parsed.intent)) return base;
    return {
      intent: parsed.intent,
      topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 4) : [],
      wants_reply: !!parsed.wants_reply,
      is_agent: !!parsed.is_agent,
      lang: parsed.lang === 'en' ? 'en' : 'ar',
    };
  } catch {
    return base;
  }
}

// --------------------------- knowledge base ---------------------------

const KB = `
VEX Deals هي منصة مراهنات رياضية ويانصيب وتعويض خسائر بالذكاء الاصطناعي.
- توقعات رياضية مجانية: تحليلات ذكية للمباريات على https://1xbetservices.com/#ai-sports
- يانصيب VEX: تذاكر مجانية ومكافآت، الذهبي (GOLD) 10ج+ — https://1xbetservices.com/#lottery
- تعويض الخسائر: تذاكر يانصيب مجانية حسب خسائر الباقة — متوفر في نفس الموقع
- الموقع https://1xbetservices.com — تطبيق قابل للتثبيت (VEX Lottery)
- الوكلاء: شراكة ربحية بعمولات — يتواصلون مع الإدارة عبر البوت مباشرة
- الإيداع والسحب من صفحة المحفظة داخل الموقع — الدعم متابع مع المستخدم لو العملية وقفت
- البوت هنا يرد على الأسئلة ويرمي تحليلات المباريات وقتها، وما بيستناش حد يسأله
`;

const SAFE_REPLY_RULES = `أنت مساعد مجتمع VEX Deals في تيليجرام. قواعدك:
- رد قصير جداً (سطر أو سطرين كحد أقصى)، ودود، عربي بسيط (أو نفس لغة المستخدم).
- كن مفيد ومباشر، لا تبالي ولا تبيع بحماس. بدون إيموجي كثير.
- ما تعطاش وعود بربح أو نتائج مضمونة.
- لو السؤال عن توقعات مباراة: قل إن التحليل الكامل على الموقع وحط الرابط.
- لو طلب وكلاء: قل إن الإدارة رح تتواصل معه وسجله.
- ما تكررش نفس الرسالة حرفياً لو اتسألت أكثر من مرة.`;

export async function generateGroupReply(
  userFirst: string | undefined,
  message: string,
  intent: IntentResult,
  matchHint?: string
): Promise<string | null> {
  const name = userFirst || 'صديقي';
  const fallback = fallbackReply(name, intent, matchHint);
  try {
    const raw = await generateWithFailover(
      `${KB}\n\n${SAFE_REPLY_RULES}\n\nرسالة المستخدم (${userFirst || 'بدون اسم'}): "${message.slice(0, 500)}"\nسياق: نيّة=${intent.intent}${matchHint ? ` | مباراة مذكورة: ${matchHint}` : ''}\n\nاكتب الرد فقط، سطر أو سطرين:`,
      'You are a helpful Telegram community assistant for VEX Deals. Short, honest, no spam.',
      0.7
    );
    const reply = (raw || '').trim().replace(/^["']|["']$/g, '');
    if (!reply || reply.length > 500) return fallback;
    return reply;
  } catch {
    return fallback;
  }
}

function fallbackReply(name: string, intent: IntentResult, matchHint?: string): string {
  switch (intent.intent) {
    case 'agent_interest':
      return `أهلاً ${name} 👋 الشراكة مع VEX مفتوحة — العمولات وطريقة العمل موثّقة والإدارة رح تتواصل معك. تابع الرسائل الخاصة.`;
    case 'prediction_ask':
      return matchHint
        ? `تحليل ${matchHint} كامل على الموقع 📊 https://1xbetservices.com/#ai-sports — وفيه توقعات يومية لكل المباريات.`
        : `كل التوقعات والتحليلات الذكية على الموقع 📊 https://1xbetservices.com/#ai-sports — حدّد المباراة ورح تشوف التحليل.`;
    case 'lottery_ask':
      return `اليانصيب مفتوح يومياً وتقدر تكسب تذاكر مجانية 🎟️ https://1xbetservices.com/#lottery`;
    case 'cashback_ask':
      return `التعويض بيرجع لك تذاكر يانصيب مجانية حسب خسائر الباقة — التفاصيل على الموقع 💸 https://1xbetservices.com`;
    case 'deposit_ask':
      return `الإيداع من داخل الموقع مباشرة من صفحة المحفظة 👉 https://1xbetservices.com — ولو واجهت مشكلة رح تساعدك الإدارة.`;
    case 'withdraw_ask':
      return `طلب السحب بيتعمل من صفحة المحفظة على الموقع 👉 https://1xbetservices.com — لو العملية وقفت رح يتواصل معاك الدعم.`;
    case 'promo_ask':
      return `أكواد الخصم والعروض الحالية تلاقيها داخل الموقع مباشرة 👉 https://1xbetservices.com`;
    case 'greeting':
      return `أهلاً ${name} 👋 أي خدمة؟ توقعات، يانصيب، أو تعويض — أنا معك.`;
    case 'question':
      return `سؤالك مهم ${name} — التفاصيل كلها على https://1xbetservices.com ولو ما لقيت جواب رح توصلك الإدارة.`;
    default:
      return `يسعدنا وجودك ${name} 🤝`;
  }
}

// --------------------------- drip copy ---------------------------

export interface DripCopy {
  title: string;
  body: string;
}

/**
 * Deterministic drip templates personalized per lead. Optional LLM polish for
 * hot leads (score >= 40) keeps costs bounded.
 */
export async function generateDripCopy(
  stepKey: string,
  lead: { first_name?: string; score: number; interests: Record<string, number>; type: string },
  abGroup?: string
): Promise<DripCopy> {
  const name = lead.first_name || 'صديقي';
  const base = dripTemplate(stepKey, name, abGroup);
  if (lead.score < 40) return base;
  try {
    const polished = await generateWithFailover(
      `${KB}\n\nأنت تكتب رسالة تيليجرام قصيرة لعميل VEX. أعد JSON فقط {"title":"...","body":"..."} — العنوان ≤ 40 حرفاً، النص ≤ 300 حرفاً بالعربية البسيطة، ودود بدون إزعاج وبدون وعود ربح.\nالمهمة: ${base.title}\nالنص: ${base.body}\nالاسم: ${name}`,
      'You write short Arabic Telegram DMs. Reply with compact JSON only.',
      0.8
    );
    const m = polished.match(/\{[\s\S]*\}/);
    if (m) {
      const p = JSON.parse(m[0]);
      if (p.title && p.body && String(p.body).length <= 500) {
        return { title: String(p.title).slice(0, 80), body: String(p.body) };
      }
    }
  } catch {}
  return base;
}

function dripTemplate(stepKey: string, name: string, ab?: string): DripCopy {
  const v = ab === 'B';
  switch (stepKey) {
    case 'w0':
      return {
        title: v ? 'جاهز نبدأ؟ 🚀' : `أهلاً ${name} 👋`,
        body: v
          ? 'أول خطوة: شوف تحليلات المباريات على الموقع — مجانية بالكامل.\nhttps://1xbetservices.com/#ai-sports'
          : `تحليلات ذكية لكل مباريات اليوم، ويانيصيب وتذاكر مجانية — كله هنا 👇\nhttps://1xbetservices.com`,
      };
    case 'd1':
      return {
        title: v ? 'تحليلات اليوم جاهزة 📊' : 'توقعات مجانية كل يوم 📊',
        body: v
          ? `لو تتابع مباريات، تحليلات VEX بتديك نسبة الربح قبل ما تفتح أي موقع 👇\nhttps://1xbetservices.com/#ai-sports`
          : `${name}، تحليلات اليوم جاهزة على الموقع — تفاصيل الفريقين والاحتمالات والنتيجة المتوقعة 👇\nhttps://1xbetservices.com/#ai-sports`,
      };
    case 'd3':
      return {
        title: v ? 'تذكرة مجانية 🎟️' : 'اليانصيب مفتوح 🎟️',
        body: v
          ? 'تذكرة يانصيب مجانية تنتظرك — جرب حظك اليوم 👇\nhttps://1xbetservices.com/#lottery'
          : `${name}، يانصيب VEX بيسحب يومياً وتقدر تبدأ بتذكرة مجانية 👇\nhttps://1xbetservices.com/#lottery`,
      };
    case 'd7':
      return {
        title: v ? 'خسرت قبل؟ 💸' : 'تعويض خسارتك 🔄',
        body: v
          ? 'خسائر الباقة بترجعلك تذاكر يانصيب مجانية — التفاصيل على الموقع 👇\nhttps://1xbetservices.com'
          : `${name}، نظام التعويض بيرجعلك تذاكر مجانية حسب خسائر الباقة — شوف التفاصيل 👇\nhttps://1xbetservices.com`,
      };
    case 'd14':
      return {
        title: v ? 'رجعنا بشي جديد ✨' : 'وش رايك ترجع؟ ✨',
        body: v
          ? 'تحليلات أدق ويانصيب بجوائز أكبر — تحقّق بنفسك 👇\nhttps://1xbetservices.com'
          : `${name}، التوقعات والجوائز جديدة اليوم — يلا نشوف 👇\nhttps://1xbetservices.com`,
      };
    case 'a0':
      return {
        title: 'شراكة VEX للوكلاء 🤝',
        body: `شكراً اهتمامك ${name} — شراكة VEX بتعطيك عمولات على كل لاعب تجيبه، ولوحة إحصائيات حقيقية. الإدارة رح تتابع معك تفاصيل التسجيل.`,
      };
    case 'a3':
      return {
        title: 'نموذج العمولات 📊',
        body: `${name}، نبدأ بعمولة ثابتة على كل إيداع + نسبة من خسائر اللاعبين — والدفع منتظم. مهتم نكمّل؟ رد بكلمة "نعم" ورح تنربط مع الإدارة.`,
      };
    default:
      return { title: 'VEX Deals', body: `مرحباً ${name} 👋` };
  }
}

/** Steps with delays measured from lead.first_seen_at (hours). */
export const PLAYER_STEPS = [
  { key: 'd1', afterHours: 24, interest: 'predictions' as const },
  { key: 'd3', afterHours: 72, interest: 'lottery' as const },
  { key: 'd7', afterHours: 168, interest: 'cashback' as const },
  { key: 'd14', afterHours: 336, interest: 'predictions' as const },
];

export const AGENT_STEPS = [
  { key: 'a0', afterHours: 0, interest: 'agents' as const },
  { key: 'a3', afterHours: 72, interest: 'agents' as const },
];

// --------------------------- per-client sentiment ---------------------------

const POS_RE =
  /تمام|تسلم|حلو|ممتاز|رائع|كويس|جميل|ثانك|thank|great|nice|good|perfect|love|أحسن|يا سلام|شكرا|شكرًا|مشكور|يعطيك|بطل|احسن|أحلى|فوق|معلم|كويسه/i;
const NEG_RE =
  /زعلان|مشكل|كذب|غش|نصب|مضروب|fraud|scam|hate|awful|terrible|مش راضي|حظر|قفل|ما وصل|مش شغال|سيء|ندمان|ندمت|استنزاف|waste|ملل|زهقت|مللت|disappointed|angry|bad experience/i;

export function classifySentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const t = (text || '').slice(0, 500);
  const p = (t.match(new RegExp(POS_RE.source, 'gi')) || []).length;
  const n = (t.match(new RegExp(NEG_RE.source, 'gi')) || []).length;
  if (n > 0 && n >= p) return 'negative';
  if (p > 0) return 'positive';
  return 'neutral';
}
