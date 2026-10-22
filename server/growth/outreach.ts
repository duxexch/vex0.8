import * as fs from 'fs';
import * as path from 'path';
import {
  listLeads,
  upsertWaContact,
  markWa,
  waQueueForBatch,
  setWaQueued,
  waStats,
  segmentOf,
  Lead,
} from './leadsStore';
import { createCampaign, sendCampaign, listCampaigns, generateCampaignCopy } from './campaigns';
import { listUpcomingPredictions } from '../forecastChain';
import { matchToCard, renderPredictionCardPng, cardPublicUrl } from './predictionCards';

// =========================================================================
// Outreach: contact-file import, WhatsApp managed-manual batches (outbox
// files the admin sends by hand — no automation on personal accounts),
// a 3-month auto calendar of Telegram campaigns, and the per-client
// opinion report (mood + intent + next action).
// =========================================================================

const DATA_DIR = path.join(process.cwd(), 'data');
const OUTBOX_DIR = path.join(DATA_DIR, 'wa_outbox');
const CAL_STATE_PATH = path.join(DATA_DIR, 'growth_calendar.json');

function readJson<T>(file: string, fallback: T): T {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch {}
  return fallback;
}

function writeJson(file: string, data: any): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

// --------------------------- contact import ---------------------------

export function importContacts(
  rows: { name?: string; phone?: string; note?: string }[],
  source = 'wa_import'
): { created: number; merged: number; skipped: number; total: number } {
  const result = upsertWaContact(rows, source);
  const logPath = path.join(DATA_DIR, 'growth_imports.json');
  const log = readJson<{ runs: any[] }>(logPath, { runs: [] });
  log.runs.unshift({ at: Date.now(), source, ...result });
  log.runs = log.runs.slice(0, 50);
  writeJson(logPath, log);
  return { ...result, total: rows.length };
}

// --------------------------- WhatsApp managed-manual outbox ---------------------------

const WA_TEMPLATES: ((name: string, interest: string) => string)[] = [
  (name, interest) =>
    [
      `يا ${name} 👋`,
      ``,
      `أنا من فريق VEX Deals — ${interest}.`,
      `خبر سريع: توقعات المباريات عندنا بتتحسب بالذكاء الاصطناعي وبتوصل قبل المباراة بدقايق، ومعاها تعويض حقيقي على الخسائر.`,
      `سجّل من الموقع في أقل من دقيقة 👇`,
      `https://vex.deals`,
      `وأي سؤال؟ أنا هنا 🙂`,
    ].join('\n'),
  (name, interest) =>
    [
      `${name}، صباح الخير 🌤`,
      ``,
      `لو لسه بتفكر — ${interest}، ومعانا كود VEX بيديك أعلى نسبة استرداد عند التسجيل.`,
      `التسجيل مجاني وبياخد أقل من دقيقة 👇`,
      `https://vex.deals`,
      `وإلا شوف توقعات اليوم الأول: https://vex.deals/predictions/today`,
    ].join('\n'),
  (name, interest) =>
    [
      `يا ${name} 🎯`,
      ``,
      `سؤال بس: لو خسرت رهان النهاردة، تحب ترجعلك قيمة؟ عندنا تعويض فعلي مش وعود — و${interest} كمان.`,
      `سجّل من هنا وجرّب بنفسك 👇`,
      `https://vex.deals`,
      `أي وقت تحتاج مساعدة، أنا موجود 🙂`,
    ].join('\n'),
];

function topInterestLine(l: Lead): string {
  const i = l.interests;
  const top = Object.entries(i).sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] > 0) {
    if (top[0] === 'predictions') return 'لو إنك مهتم بالتوقعات الرياضية';
    if (top[0] === 'cashback') return 'لو تعويض الخسائر يهمك';
    if (top[0] === 'lottery') return 'لو جانب المتعة والجوائز لايق عليك';
    if (top[0] === 'agents') return 'لو فكرت تشتغل وكيل';
  }
  if (l.notes) return 'لاحظنا اهتمامك بمحتوانا';
  return 'مهتم بمحتوى المراهنات الذكي';
}

export function waMessage(l: Lead): string {
  const name = l.first_name || 'صديقنا';
  const interest = topInterestLine(l);
  const idx = Math.abs((l.phone || l.id).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % WA_TEMPLATES.length;
  return WA_TEMPLATES[idx](name, interest);
}

export async function buildWaBatch(limit = 30): Promise<{ date: string; count: number; file: string; stats: object; card?: string }> {
  const date = new Date().toISOString().slice(0, 10);
  const picks = waQueueForBatch(limit);
  const lines = [
    `# صندوق واتساب — ${date}`,
    ``,
    `⚠️ إرسال يدوي بشرى فقط: ≤${limit} رسالة/يوم، خلي تأخير طبيعي30-90 ثانية بين كل رسالة، وبلا رسايل ليلية.`,
    `بعد الابعت: علّم المرسل لهم هنا: POST /api/admin/growth/wa/mark`,
    ``,
  ];
  let card: string | undefined;
  try {
    const [up] = listUpcomingPredictions(1);
    if (up) {
      const png = await renderPredictionCardPng(matchToCard(up));
      card = cardPublicUrl(matchToCard(up));
      if (png) lines.splice(2, 0, `📌 كارت توقع اليوم (${up.label}): ${card}`, `📁 نسخة على السيرفر: data/prediction-cards/ — ارفقه مع رسالة الافتتاحية`, ``);
    }
  } catch {}
  picks.forEach((l, i) => {
    lines.push(`## ${i + 1}. ${l.first_name || '—'} — ${l.phone} [${segmentOf(l)}]`);
    lines.push('');
    lines.push(waMessage(l));
    lines.push('');
  });
  if (picks.length === 0) lines.push('_مافيش جهات اتصال ننتظر إرسال — استورد الملف الأول._');
  fs.mkdirSync(OUTBOX_DIR, { recursive: true });
  const file = path.join(OUTBOX_DIR, `batch_${date}.md`);
  fs.writeFileSync(file, lines.join('\n'), 'utf-8');
  setWaQueued(
    picks.map((p) => p.id),
    date
  );
  return { date, count: picks.length, file, stats: waStats(), card };
}

export function getTodayOutbox(): { date: string; exists: boolean; content: string; stats: object } {
  const date = new Date().toISOString().slice(0, 10);
  const file = path.join(OUTBOX_DIR, `batch_${date}.md`);
  const exists = fs.existsSync(file);
  return {
    date,
    exists,
    content: exists ? fs.readFileSync(file, 'utf-8') : '',
    stats: waStats(),
  };
}

export function markWaContacts(phones: string[], status: 'sent' | 'skipped'): number {
  return markWa(phones, status);
}

// --------------------------- 3-month auto calendar (Telegram campaigns) ---------------------------

interface CalItem {
  day: number;
  name: string;
  segment: string;
  seed: string;
}

const CALENDAR: CalItem[] = [
  // ---- الشهر الأول: قيمة + ألم + أول تسجيل ----
  { day: 1, name: 'M1 ترحيب + قيمة', segment: 'started', seed: 'رسالة ترحيب: توقعات مجانية يومياً بالذكاء الاصطناعي + لينك التوقعات. ودود وقصير.' },
  { day: 4, name: 'M1 ألم الخسارة → التعويض', segment: 'warm_player', seed: '痛点: كل خسارة ليك ليها قيمة عندنا — نظام تعويض حقيقي مش وعود. سجّل وشوف.' },
  { day: 8, name: 'M1 اليانصيب', segment: 'started', seed: 'يانصيب VEX عادل ومفتوح — تذاكر مجانية مع كل خسارة. شارك والعب.' },
  { day: 12, name: 'M1 دليل اختيار الموقع', segment: 'all', seed: 'دليل:7 إзнак لموقع مراهنات موثوق — اقرأ وطبّق، وشوف تقييمنا.' },
  { day: 16, name: 'M1 إحالة 10%', segment: 'started', seed: 'اعرف صديق؟ شاركه رابطك واخد10% فك تجميد فوري. برنامج الإحالات شغال.' },
  { day: 20, name: 'M1 CTA تسجيل مباشر', segment: 'hot_player', seed: 'CTA مباشر: التسجيل مجاني،10ثواني، وأول عرض ينتظرك — سجّل دلوقتي.' },
  { day: 25, name: 'M1 أفضل المواقع', segment: 'warm_player', seed: 'ترتيبنا لأفضل مواقع المراهنات محدّث — شوف المكان الأول.' },
  { day: 30, name: 'M1 حصري نهاية الشهر', segment: 'started', seed: 'عرض حصري آخر الشهر لمشتركينا — استرداد موسّع. لا يفوتك.' },
  // ---- الشهر الثاني: تضخيم + شراكة ----
  { day: 33, name: 'M2 كود VEX', segment: 'all', seed: 'كود VEX = أعلى نسبة استرداد عند التسجيل — جربه.' },
  { day: 38, name: 'M2 الرهان المباشر', segment: 'players', seed: 'دليل الرهان المباشر: كيف تتابع تغير النسب وتلحق أفضل فرصة.' },
  { day: 42, name: 'M2 عرض الذكاء الاصطناعي', segment: 'started', seed: 'شاهد كيف يحلل Gemini المباراة: احتمالات + نتيجة متوقعة + تقرير تكتيكي.' },
  { day: 47, name: 'M2 دعوة وكلاء', segment: 'agents', seed: 'شراكة VEX للوكلاء: عمولات على كل لاعب + لوحة إحصائيات. مهتم؟ رد نعم.' },
  { day: 52, name: 'M2 ساعة ذهبية', segment: 'hot_player', seed: 'Golden Hour اليوم: عروض موسّعة على التعويض — التفاصيل على الموقع.' },
  { day: 57, name: 'M2 أمان التحويلات', segment: 'warm_player', seed: 'تحويل أرصدة آمن ومحمي — شرح كيف تحوّل بدون خوف.' },
  // ---- الشهر الثالث: استبقاء + إحياء + إمتنان ----
  { day: 62, name: 'M3 إحياء الباردين', segment: 'dormant', seed: 'اشتقنا لك — رجعنا بشي جديد: توقعات أدق + عروض ترحيبية للعودة.' },
  { day: 68, name: 'M3 يانصيب كبير', segment: 'started', seed: 'سحب يانصيب كبير قريباً — تذاكرك مجانية مع نشاطك. لا تفوّتها.' },
  { day: 74, name: 'M3 ذروة الإحالات', segment: 'all', seed: 'أفضل5 مُحيلين هذا الشهر بجوائز — ابدأ دعواتك.' },
  { day: 80, name: 'M3 كيف تقرا النسب', segment: 'players', seed: 'دليل: كيف تقرأ odds مثل المحترفين — دليل مصوّر قصير.' },
  { day: 86, name: 'M3 قصة تعويض', segment: 'warm_player', seed: 'قصة حقيقية: عميل خسر ورجع استرد — شرح خطوة بخطوة.' },
  { day: 90, name: 'M3 شكر + ولاء', segment: 'started', seed: 'بعد90 يوم معانا: شكراً — هدية ولاء لمشتركينا القدام. سجّل/فعّل مشاركتك.' },
];

interface CalState {
  start: string;
  done: string[];
}

function calState(): CalState {
  const s = readJson<Partial<CalState>>(CAL_STATE_PATH, {});
  return { start: s.start || new Date().toISOString().slice(0, 10), done: s.done || [] };
}

function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()) / 86400000);
}

export function calendarPlan(): object {
  const state = calState();
  const today = new Date().toISOString().slice(0, 10);
  const day = daysBetween(state.start, today) + 1;
  return {
    start: state.start,
    today_day: day,
    total_days: 90,
    executed: state.done.length,
    upcoming: CALENDAR.filter((c) => c.day >= day && !state.done.includes(`d${c.day}:${c.name}`))
      .slice(0, 8)
      .map((c) => ({ day: c.day, date: new Date(new Date(state.start + 'T00:00:00Z').getTime() + (c.day - 1) * 86400000).toISOString().slice(0, 10), name: c.name, segment: c.segment })),
  };
}

export async function calendarTick(): Promise<string[]> {
  const state = calState();
  const today = new Date().toISOString().slice(0, 10);
  const day = daysBetween(state.start, today) + 1;
  const executed: string[] = [];
  if (day < 1 || day > 90) return executed;
  // catch-up: execute any due item not yet done (missed days are not skipped, max 3/tick)
  const due = CALENDAR.filter((c) => c.day <= day && !state.done.includes(`d${c.day}:${c.name}`)).slice(0, 3);
  for (const item of due) {
    const key = `d${item.day}:${item.name}`;
    const text = await generateCampaignCopy(item.seed, item.segment);
    const camp = createCampaign({ name: item.name, segment: item.segment, text });
    await sendCampaign(camp.id);
    const saved = listCampaigns().find((c) => c.id === camp.id);
    state.done.push(key);
    executed.push(`${item.name} → targeted=${saved?.stats.targeted ?? '?'} sent=${saved?.stats.sent ?? '?'}`);
  }
  if (due.length > 0) writeJson(CAL_STATE_PATH, state);
  return executed;
}

// --------------------------- per-client opinion report ---------------------------

function maskPhone(phone: string): string {
  const p = phone.replace(/\D/g, '');
  if (p.length < 6) return '***';
  return p.slice(0, 4) + '***' + p.slice(-3);
}

function topIntents(intents?: Record<string, number>): string {
  if (!intents) return '';
  return Object.entries(intents)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => `${k}(${v})`)
    .join(', ');
}

function suggestNext(l: Lead): string {
  if (l.mood === 'negative') return '⚠️ متابعة بشري فورية — عالج الشكوى';
  if (l.channel === 'wa_import') {
    if (l.wa_status === 'pending' || !l.wa_status) return '📱 في دفعة واتساب القادمة — إرسال يدوي';
    if (l.wa_status === 'queued') return '📱 في الصندوق جاهزاً — ابعتله النهارده';
    if (l.wa_status === 'sent') return l.web_user_id ? '✅ مسجّل — انضم للفانل' : '🎯 اتبعتت — راقب التسجيل وتابع بعد يومين';
    return '⏭️ تم تخطيه';
  }
  if (l.type === 'agent' || l.needs_human) return '🤝 وكيل — يحتاج رد بشري بشروط الشراكة';
  if (l.web_user_id) return '✅ مسجّل بالموقع — عرض الإحالة10%';
  if (l.score >= 60) return '🔥 ساخن — CTA تسجيل مباشر';
  if (segmentOf(l) === 'dormant') return '💤 win-back مجدول في حملات الشهر3';
  return '🔁 دفعة drip عادية';
}

export function clientReport(limit = 100): object[] {
  const leads = listLeads()
    .slice()
    .sort((a, b) => b.score - a.score || b.last_touch_at - a.last_touch_at)
    .slice(0, Math.min(500, limit));
  return leads.map((l) => ({
    name: l.first_name || l.username || (l.phone ? maskPhone(l.phone) : l.id),
    contact: l.username ? `@${l.username}` : l.phone ? maskPhone(l.phone) : l.id,
    channel: l.channel === 'wa_import' ? 'whatsapp' : 'telegram',
    segment: segmentOf(l),
    score: l.score,
    mood: l.mood || '—',
    last_inbound: l.last_inbound || '',
    intents: topIntents(l.intents),
    status: l.status,
    registered: !!l.web_user_id,
    wa_status: l.wa_status || undefined,
    last_touch: new Date(l.last_touch_at).toISOString().slice(0, 16).replace('T', ' '),
    next_action: suggestNext(l),
  }));
}

// --------------------------- daily timers ---------------------------

let outreachTimer: NodeJS.Timeout | null = null;
let notifyOutreach: ((text: string) => void) | null = null;

export function startOutreachTimers(notify: (text: string) => void): void {
  notifyOutreach = notify;
  if (outreachTimer) return;
  const schedule = () => {
    const n = new Date();
    const nxt = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + (n.getUTCHours() >= 13 ? 1 : 0), 13, 0, 0));
    const wait = Math.max(60000, nxt.getTime() - n.getTime());
    outreachTimer = setTimeout(async () => {
      try {
        const executed = await calendarTick();
        const batch = await buildWaBatch(30);
        const lines = [`📣 تقرير Outreach — ${new Date().toISOString().slice(0, 10)}`];
        if (executed.length) lines.push(...executed.map((e) => `▸ ${e}`));
        lines.push(`📱 صندوق واتساب: ${batch.count} رسالة جاهزة للإرسال اليدوي`);
        const neg = listLeads().filter((l) => l.mood === 'negative').length;
        if (neg > 0) lines.push(`⚠️ عملاء بمزاج سلبي: ${neg} — راجع التقرير`);
        notifyOutreach?.(lines.join('\n'));
      } catch (err: any) {
        console.warn('[Growth] outreach tick error:', err?.message);
      }
      schedule();
    }, wait);
    outreachTimer.unref?.();
  };
  schedule();
  console.log('[Growth] outreach timers active — daily 13:00 UTC (calendar + WA outbox)');
}

export function stopOutreachTimers(): void {
  if (outreachTimer) {
    clearTimeout(outreachTimer);
    outreachTimer = null;
  }
}
