import * as fs from 'fs';
import * as path from 'path';
import { channelsStore, ChannelProfile } from './channelsStore';
import { resolveCompany, rotateSiteLink, type CompanyInfo } from './channelCampaign';
import { sendTelegram } from './agentPipeline';

// =========================================================================
// Niche post engine — content FOR the audience of each niche channel.
//
// القنوات من نوع `agents` (وكلاء) و`marketers` (مسوّقون) جمهورها لا يهمّه
// نتائج المباريات، بل: الروابط، العمولات، المواد الجاهزة، وطريقة الزيادة.
// هذا المحرك يديرها بشكل مستقل تمامًا عن مسار الأخبار/التوقعات/العروض:
//   • قالب مخصص لكل مجال + حقن شركة القناة (اسم/كود/رابط) — بلا LLM حتى
//     لا يُخترع محتوى أو يُذكر اسم شركة أجنبية في قناة خاصة بشركة أخرى.
//   • يحترم السقف اليومي والساعات الهادئة والحصص عبر getPublishable.
//   • تبريد 6 ساعات لكل قناة + حد 3 منشورات/يوم + فجوة 4 ثوانٍ بين الإرسالات.
// =========================================================================

const STATE_PATH = path.join(process.cwd(), 'data', 'niche_posts.json');
const TICK_MS = 30 * 60 * 1000;      // فحص كل 30 دقيقة
const BOOT_DELAY_MS = 90 * 1000;     // لا شيء قبل استقرار بقية المكونات
const COOLDOWN_MS = 6 * 60 * 60 * 1000; // تبريد 6 ساعات لكل قناة
const PER_DAY = 3;                   // حد أقصى لمنشور niche في اليوم لكل قناة
const SEND_GAP_MS = 4000;            // فجوة مكافحة السبام بين الإرسالات

interface NicheChannelState {
  lastAt: number;
  day: string;
  count: number;
  lastIdx: number;
}
interface NicheState {
  lastRun: number;
  byChannel: Record<string, NicheChannelState>;
  sent: number;
  skipped: number;
  failed: number;
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadState(): NicheState {
  try {
    if (fs.existsSync(STATE_PATH)) {
      const raw = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
      if (raw && typeof raw === 'object') {
        return { lastRun: 0, byChannel: {}, sent: 0, skipped: 0, failed: 0, ...raw };
      }
    }
  } catch (err: any) {
    console.warn('[Niche] state load failed:', err.message);
  }
  return { lastRun: 0, byChannel: {}, sent: 0, skipped: 0, failed: 0 };
}

function saveState(state: NicheState): void {
  try {
    fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('[Niche] state save failed:', err.message);
  }
}

// ------------------------------------------------------------------ context

interface NicheCtx {
  ch: ChannelProfile;
  company: string;
  code: string;
  link: string;
  app: string;
}

function buildCtx(ch: ChannelProfile): NicheCtx {
  const c: CompanyInfo | null = resolveCompany(ch);
  const link = String(c?.affiliate_link || '').trim() || rotateSiteLink(`niche_${ch.chat_id}`);
  return {
    ch,
    company: c?.name?.trim() || 'VEX Deals',
    code: String(c?.promo_code || '').trim(),
    link,
    app: String(c?.app_link || '').trim(),
  };
}

const codeLine = (ctx: NicheCtx, label = 'كود التسجيل'): string =>
  ctx.code ? `${label}: \`${ctx.code}\`` : '';

// ---------------------------------------------------------------- templates
// كل قالب: سطر أول قصير (يُغَمَّق تلقائيًا) + عناصر تبدأ بـ «• » + رابط في
// سطر مستقل. ممنوع خلط كلمات إنجليزية داخل جمل عربية إلا للأسماء والأرقام.

type TemplateFn = (ctx: NicheCtx) => string;

const AGENT_TEMPLATES: TemplateFn[] = [
  (x) => [
    `👥 للوكلاء — ${x.company}`,
    '',
    'لو شغلك في جذب اللاعبين، القناة دي معمولة لك.',
    '',
    '• رابط تسجيل خاص بك تشاركه مع جمهورك',
    '• كود تأكيد يثبّت كل تسجيل على حسابك',
    '• محتوى جاهز تنشره بدون تعديل',
    '• رد سريع على أي استفسار',
    '',
    'شغّل رابطك من هنا:',
    x.link,
    codeLine(x),
  ].filter((l) => l !== '').join('\n'),

  (x) => [
    `💰 عمولات الوكلاء — ${x.company}`,
    '',
    'كل تسجيل ناجح من رابطك بيتحسب لك.',
    '',
    '• شارك الرابط مع جمهورك على أي منصة',
    '• أرسل الكود مع الرابط في نفس الرسالة',
    '• راجع نشاط حسابك لاحقًا لمتابعة النتيجة',
    '• اسأل عن شروط العمولة الحالية في الرسائل',
    '',
    'رابطك:',
    x.link,
    codeLine(x),
  ].filter((l) => l !== '').join('\n'),

  (x) => [
    `🚀 كيف تبدأ وكيلًا في ${x.company} — 4 خطوات`,
    '',
    '• احصل على رابط التسجيل الخاص بك',
    '• أرسله لجمهورك مرفقًا بكود التسجيل',
    '• سجّل أول عميل واستمع لاستجابته',
    '• راسلنا لأي متابعة أو توضيح',
    '',
    'الخطوة الأولى:',
    x.link,
    codeLine(x),
  ].filter((l) => l !== '').join('\n'),

  (x) => [
    `📦 مواد جاهزة للوكلاء — ${x.company}`,
    '',
    'مش محتاج تكتب من الصفر:',
    '',
    '• منشور ترحيبي قصير تنسخه كما هو',
    '• كود تسجيل جاهز للإرسال',
    '• شرح مبسّط لطريقة التسجيل للعميل',
    '• إجابة جاهزة على أشهر اعتراض',
    '',
    'خذ رابطك وابدأ:',
    x.link,
    codeLine(x),
  ].filter((l) => l !== '').join('\n'),

  (x) => [
    `📈 نصيحة ترفع تسجيلاتك — ${x.company}`,
    '',
    '• ضع الرابط في أول رسالة ترحيبية لا في آخر النقاش',
    '• ارفق كود التسجيل بجانب الرابط دائمًا',
    '• ردّ على أسئلة جمهورك بسرعة — التسجيل بعدها أسهل',
    '• كرّر المنشور كل فترة بدل مرة واحدة فقط',
    '',
    'جرّب الآن:',
    x.link,
    codeLine(x),
  ].filter((l) => l !== '').join('\n'),

  (x) => [
    `🔑 رسالة الوكيل الجاهزة — ${x.company}`,
    '',
    'انسخ هذه الرسالة وأرسلها كما هي:',
    '',
    'معاك فرصة تسجيل في ' + x.company + '.',
    'التسجيل بالرابط ده:' ,
    x.link,
    codeLine(x),
    '',
    '• أرسلها لمن يهتم بالرياضة فقط',
    '• لا تكررها أكثر من مرة في نفس المجموعة',
    '• وجّه أي سؤال إلينا مباشرة',
  ].filter((l) => l !== '').join('\n'),

  (x) => [
    `🛟 دعم الوكلاء — ${x.company}`,
    '',
    'عندك مشكلة في الرابط أو في تسجيل عميل؟',
    '',
    '• راسلنا وصف المشكلة باختصار',
    '• أرفق لقطة شاشة أو رقم العميل',
    '• هنراجعها ونرد عليك',
    '• لا تشارك بيانات حسابك مع أي طرف',
    '',
    'التواصل:',
    x.link,
  ].filter((l) => l !== '').join('\n'),

  (x) => [
    `🎯 خطة هذا الأسبوع — ${x.company}`,
    '',
    '• اكتب عدد التسجيلات اللي عايز تحققها هذا الأسبوع',
    '• شارك رابطك في 3 أماكن على الأقل',
    '• انشر المحتوى في وقت نشاط جمهورك',
    '• راجع النتيجة بعد أسبوع كامل',
    '',
    'ابدأ من:',
    x.link,
    codeLine(x),
  ].filter((l) => l !== '').join('\n'),
];

const MARKETER_TEMPLATES: TemplateFn[] = [
  (x) => [
    `📣 للمسوّقين وصنّاع المحتوى — ${x.company}`,
    '',
    'لو عندك جمهور على أي منصة، دي فرصتك تحوّله لنتيجة.',
    '',
    '• رابط إحالة خاص بك تنشره في أي مكان',
    '• كود يربط كل تسجيل بحسابك',
    '• محتوى جاهز للنشر بدون تعديل',
    '• متابعة لاستجابة جمهورك',
    '',
    'ابدأ من:',
    x.link,
    codeLine(x),
  ].filter((l) => l !== '').join('\n'),

  (x) => [
    `🎯 حملة جاهزة لترويج ${x.company}`,
    '',
    'انسخ هذه الرسالة وانشرها كما هي:',
    '',
    `لو بتدور على موقع رياضي موثوق، جرّب ${x.company}.`,
    'التسجيل بالرابط:',
    x.link,
    codeLine(x),
    '',
    '• انشرها في أعلى قناتك',
    '• كرّرها مرة كل يومين',
    '• وجّه كل استفسار إلى الرابط مباشرة',
  ].filter((l) => l !== '').join('\n'),

  (x) => [
    `📈 4 خطوات ترفع تحويل جمهورك — ${x.company}`,
    '',
    '• ضع الرابط في أول رسالة لا في آخرها',
    '• ارفق كود التسجيل بجانب الرابط دائمًا',
    '• اشرح الفائدة في سطر واحد قبل الرابط',
    '• انشر في وقت نشاط جمهورك لا وقت فراغك',
    '',
    'روابطك جاهزة:',
    x.link,
    codeLine(x),
  ].filter((l) => l !== '').join('\n'),

  (x) => [
    `📱 وين تنشر رابط ${x.company}؟`,
    '',
    '• قنواتك الخاصة ومجموعاتك',
    '• وصف حسابك وقصتك',
    '• تعليقات المحتوى المشابه',
    '• رسائلك الخاصة مع المهتمين',
    '',
    'الرابط:',
    x.link,
    codeLine(x),
  ].filter((l) => l !== '').join('\n'),

  (x) => [
    `🎨 مواد إعلانية جاهزة — ${x.company}`,
    '',
    '• نص تسجيل جاهز تنسخه كما هو',
    '• صور وشرح بسيط للمنصة',
    '• كود تأكيد للعملاء الجدد',
    '• إجابات جاهزة على الأسئلة الشائعة',
    '',
    'خذها من هنا:',
    x.link,
    codeLine(x),
  ].filter((l) => l !== '').join('\n'),

  (x) => [
    `🧭 قسّم جمهورك قبل الترويج — ${x.company}`,
    '',
    '• المهتمون بالرياضة: ركّز على المباريات والتوقعات',
    '• المهتمون بالعروض: ركّز على المكافأة والكود',
    '• العملاء الحاليون: ركّز على الخدمات والأرصدة',
    '• لكل شريحة رسالة مختلفة — ونفس الرابط',
    '',
    'روابطك:',
    x.link,
    codeLine(x),
  ].filter((l) => l !== '').join('\n'),

  (x) => [
    `🛟 دعم المسوّقين — ${x.company}`,
    '',
    '• اسأل عن شروط الإحالة الحالية',
    '• أرسل لقطة لأي مشكلة في الرابط',
    '• اطلب مواد إضافية عند الحاجة',
    '• راسلنا في أي وقت',
    '',
    'التواصل:',
    x.link,
    codeLine(x),
  ].filter((l) => l !== '').join('\n'),

  (x) => [
    `📊 راجع أداءك أسبوعيًا — ${x.company}`,
    '',
    '• سجّل عدد التسجيلات كل أسبوع',
    '• اترك المكان الذي يحقق نتائج وارفع تكراره',
    '• احذف الأماكن بلا استجابة',
    '• جرّب رسالة جديدة كل أسبوع',
    '',
    'الرابط:',
    x.link,
    codeLine(x),
  ].filter((l) => l !== '').join('\n'),
];

const AGENT_TEMPLATES_EN: TemplateFn[] = [
  (x) => [
    `👥 For agents — ${x.company}`,
    '',
    '• Your own registration link to share with your audience',
    '• A confirmation code that ties every signup to you',
    '• Ready-made posts you can publish as they are',
    '• Fast answers to any question',
    '',
    'Start here:',
    x.link,
    x.code ? `Code: \`${x.code}\`` : '',
  ].filter((l) => l !== '').join('\n'),
  (x) => [
    `📈 Agent tips — ${x.company}`,
    '',
    '• Put the link in the first message, not the last',
    '• Always send the code next to the link',
    '• Answer questions quickly — signup gets easier',
    '• Repost over time instead of once only',
    '',
    x.link,
    x.code ? `Code: \`${x.code}\`` : '',
  ].filter((l) => l !== '').join('\n'),
];

const MARKETER_TEMPLATES_EN: TemplateFn[] = [
  (x) => [
    `📣 For marketers & creators — ${x.company}`,
    '',
    '• Your own referral link, publish it anywhere',
    '• A code that attributes every signup to you',
    '• Ready-made copy you can post as it is',
    '',
    'Start here:',
    x.link,
    x.code ? `Code: \`${x.code}\`` : '',
  ].filter((l) => l !== '').join('\n'),
  (x) => [
    `🎯 Ready-made campaign — ${x.company}`,
    '',
    `Looking for a trusted sports platform? Try ${x.company}.`,
    'Register here:',
    x.link,
    x.code ? `Code: \`${x.code}\`` : '',
    '',
    '• Post it at the top of your channel',
    '• Repeat every other day',
  ].filter((l) => l !== '').join('\n'),
];

function templatesFor(ch: ChannelProfile): TemplateFn[] {
  const en = ch.lang === 'en';
  if (ch.category === 'agents') return en ? AGENT_TEMPLATES_EN : AGENT_TEMPLATES;
  return en ? MARKETER_TEMPLATES_EN : MARKETER_TEMPLATES;
}

// ------------------------------------------------------------------ running

export interface NichePassResult {
  checked: number;
  sent: number;
  skipped: number;
  failed: number;
  detail: string[];
}

export function runNichePass(): NichePassResult {
  const state = loadState();
  const today = todayUTC();
  const now = Date.now();
  const detail: string[] = [];
  let skipped = 0;

  const targets = channelsStore
    .getPublishable(new Date())
    .filter((c) => c.category === 'agents' || c.category === 'marketers');

  const jobs: Array<{ ch: ChannelProfile; text: string }> = [];

  for (let i = 0; i < targets.length; i++) {
    const ch = targets[i];
    const st = state.byChannel[ch.chat_id] || { lastAt: 0, day: today, count: 0, lastIdx: -1 };
    if (st.day !== today) {
      st.day = today;
      st.count = 0;
    }
    if (now - st.lastAt < COOLDOWN_MS || st.count >= PER_DAY) {
      skipped++;
      continue;
    }

    const list = templatesFor(ch);
    const idx = (st.lastIdx + 1) % list.length;
    const ctx = buildCtx(ch);
    let text: string;
    try {
      text = list[idx](ctx);
    } catch (err: any) {
      console.warn(`[Niche] template failed for ${ch.title}:`, err.message);
      continue;
    }
    if (!text || text.length < 60) {
      skipped++;
      continue;
    }

    // Mark as consumed BEFORE sending so a failed/crashed pass never re-fires
    // the same channel in the same cycle (cooldown + daily counter hold it).
    st.lastIdx = idx;
    st.lastAt = now;
    st.count++;
    state.byChannel[ch.chat_id] = st;
    jobs.push({ ch, text });
    detail.push(`${ch.category}:${ch.title}`);
  }

  const queued = jobs.length;
  state.lastRun = now;
  state.skipped += skipped;
  saveState(state);

  if (!jobs.length) {
    return { checked: targets.length, sent: 0, skipped, failed: 0, detail };
  }

  // Serial delivery with an anti-spam gap — never blasts the niche channels.
  void (async () => {
    for (const job of jobs) {
      if (process.env.DRY_RUN === '1') {
        console.log(`[Niche][DRY_RUN] → ${job.ch.title}: ${job.text.slice(0, 90).replace(/\n/g, ' ⏎ ')}`);
        continue;
      }
      try {
        const res = await sendTelegram(job.ch.chat_id, job.text, 'HTML', null, { niche: true });
        if (res.ok) {
          channelsStore.recordPost(res.sentTo ?? job.ch.chat_id);
          state.sent++;
          console.log(`[Niche] ✓ ${job.ch.category} post → ${job.ch.title}`);
        } else {
          state.failed++;
          console.warn(`[Niche] ✗ ${job.ch.title}: ${res.error}`);
        }
      } catch (err: any) {
        state.failed++;
        console.warn(`[Niche] ✗ ${job.ch.title}:`, err.message);
      } finally {
        saveState(state);
      }
      await new Promise((r) => setTimeout(r, SEND_GAP_MS));
    }
  })();

  return { checked: targets.length, sent: queued, skipped, failed: 0, detail };
}

export function getNicheStatus(): object {
  const state = loadState();
  const all = channelsStore.getAll();
  const agents = all.filter((c) => c.category === 'agents');
  const marketers = all.filter((c) => c.category === 'marketers');
  return {
    lastRun: state.lastRun ? new Date(state.lastRun).toISOString() : null,
    sent: state.sent || 0,
    skipped: state.skipped || 0,
    failed: state.failed || 0,
    cooldown_hours: COOLDOWN_MS / 3600000,
    per_day: PER_DAY,
    tick_minutes: TICK_MS / 60000,
    channels: {
      agents: agents.map((c) => ({ title: c.title, active: c.active, used: c.daily_used, cap: c.daily_cap })),
      marketers: marketers.map((c) => ({ title: c.title, active: c.active, used: c.daily_used, cap: c.daily_cap })),
    },
    pending: Object.entries(state.byChannel)
      .filter(([, s]) => s.day === todayUTC())
      .map(([id, s]) => ({ chat_id: id, count: s.count, lastAt: new Date(s.lastAt).toISOString() })),
  };
}

let timer: NodeJS.Timeout | null = null;

/** Start the niche publisher (idempotent). */
export function startNicheScheduler(): void {
  if (timer) return;
  const boot = setTimeout(() => {
    try {
      const r = runNichePass();
      if (r.checked) console.log(`[Niche] first pass: ${r.checked} niche channel(s), sent=${r.sent}`);
    } catch (err: any) {
      console.error('[Niche] first pass failed:', err.message);
    }
  }, BOOT_DELAY_MS);
  boot.unref?.();

  timer = setInterval(() => {
    try {
      runNichePass();
    } catch (err: any) {
      console.error('[Niche] pass failed:', err.message);
    }
  }, TICK_MS);
  timer.unref?.();
  console.log(`[Niche] scheduler started (tick ${TICK_MS / 60000}m, cooldown ${COOLDOWN_MS / 3600000}h, max ${PER_DAY}/day/channel)`);
}

export function stopNicheScheduler(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
