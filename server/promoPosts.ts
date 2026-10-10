import * as fs from 'fs';
import * as path from 'path';
import { channelsStore, ChannelProfile } from './channelsStore';
import { schedulePost } from './postScheduler';
import { generateWithFailover } from './agentEngine';

// =========================================================================
// Promo Posts — daily advertising/filler posts about the site for EVERY
// publishing channel (sports/partners/payments). Two slots per day (10:00 &
// 17:00 UTC), staggered per channel so they don't burst. Betting channels get
// a betting-flavoured ad; channels without betting relation get a plain
// site/news announcement. Content goes through the scheduler which enforces
// caps/quiet/gaps. Planned once per channel+slot per day (promo_state.json).
// =========================================================================

const STATE_PATH = path.join(process.cwd(), 'data', 'promo_state.json');
const SLOTS_UTC = [10, 17];
const STAGGER_MS = 45 * 1000;
const PLAN_WINDOW_MS = 6 * 3600 * 1000;  // plan a slot only while it is within 6h ahead
const MISSED_WINDOW_MS = 45 * 60 * 1000; // skip a slot that passed more than 45min ago

// -------------------------------------------------------------------------
// App-download promo pass — daily (13:00 UTC) posts promoting the installable
// VEX Lottery PWA. Prepared texts (no LLM), rotated per channel+day so the
// feed doesn't repeat itself. Betting channels get the lottery-app angle,
// news channels get a neutral app angle (no gambling mentions by policy).
// -------------------------------------------------------------------------
const APP_STATE_PATH = path.join(process.cwd(), 'data', 'app_promo_state.json');
const APP_SLOT_UTC = 13;
const APP_LINK = 'https://vex.deals/lottery';
const APP_LINK_NEUTRAL = 'https://vex.deals';

const APP_PROMOS_BETTING: string[] = [
  `🎰 تحمّل تطبيق VEX Lottery الرسمي — جائزة اليانصيب على شاشتك الرئيسية!
📲 تثبيت في ثوانٍ من المتصفح مباشرة (أندرويد وآيفون) — بدون متجر وموثوق من جوجل ✅
🔔 تنبيهات فورية قبل إغلاق السحب + متابعة أرقامك لحظة بلحظة.
🔗 ${APP_LINK}`,
  `🏆 جائزة تراكمية تكبر كل يوم — والتطبيق يوصلك أول بأول!
✅ حمّل تطبيق اليانصيب الرسمي VEX Lottery: تثبيت بنقرة واحدة، متوافق مع كل مقاسات الهواتف، وسحبات موثوقة 100%.
📲 ${APP_LINK}`,
  `⚡ خلاك تفوّت سحب قبل كده؟ تطبيق VEX Lottery هيذكّرك دايمًا 🔔
تنبيه قبل إغلاق التذاكر بساعة + متابعة الجائزة وتذاكرك من أي مكان.
ثبّته مجاناً في ثوانٍ 👇
📲 ${APP_LINK}`,
];

const APP_PROMOS_NEUTRAL: string[] = [
  `📲 حمّل تطبيق VEX الرسمي على شاشتك الرئيسية!
نتائج وتنبيهات رياضية فورية، تثبيت في ثوانٍ من المتصفح بدون متجر — وموثوق من جوجل ✅
🔗 ${APP_LINK_NEUTRAL}`,
  `⚽ نتائج المباريات وتنبيهاتك الرياضية في تطبيق واحد خفيف 📲
ثبّته من المتصفح بنقرة واحدة — بدون تنزيل متجر، ويشتغل على كل مقاسات الهاتف.
🔗 ${APP_LINK_NEUTRAL}`,
];

interface PromoState {
  date: string;
  planned: string[]; // `${chat_id}|${slotHour}`
}

interface AppPromoState {
  date: string;
  planned: string[];
}

function readState(): PromoState {
  try {
    if (fs.existsSync(STATE_PATH)) {
      const s = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
      if (s && typeof s.date === 'string' && Array.isArray(s.planned)) return s;
    }
  } catch (err: any) {
    console.warn('[Promo] state load failed:', err.message);
  }
  return { date: '', planned: [] };
}

function writeState(s: PromoState): void {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(s, null, 2), 'utf-8');
}

function readAppState(): AppPromoState {
  try {
    if (fs.existsSync(APP_STATE_PATH)) {
      const s = JSON.parse(fs.readFileSync(APP_STATE_PATH, 'utf-8'));
      if (s && typeof s.date === 'string' && Array.isArray(s.planned)) return s;
    }
  } catch (err: any) {
    console.warn('[PromoApp] state load failed:', err.message);
  }
  return { date: '', planned: [] };
}

function writeAppState(s: AppPromoState): void {
  fs.mkdirSync(path.dirname(APP_STATE_PATH), { recursive: true });
  fs.writeFileSync(APP_STATE_PATH, JSON.stringify(s, null, 2), 'utf-8');
}

let timer: NodeJS.Timeout | null = null;

const PROMO_SYSTEM = `أنت كاتب إعلانات قنوات تيليجرام. ترجع المنشور فقط — بدون markdown وبدون شرح.
- 2 إلى 5 أسطر، عربي مشوق، إيموجي مناسب لأسلوب القناة.
- لنوع القناة المعلن عنها اتبع التعليمات بدقة.`;

async function buildPromo(ch: ChannelProfile, slotHour: number): Promise<string> {
  const betting = ch.betting_related !== false;
  const domain = ch.brand.domain || '';
  const slotNote = slotHour === 10 ? 'صباح' : 'مساء';
  const facts =
    `القناة: ${ch.title}\n` +
    `الهوية: ${ch.brand.company || 'VEX'} — دومين: ${domain || '(بدون رابط)'} — توقيع: ${ch.brand.signature || 'لا يوجد'}\n` +
    `الموضوع: ${ch.topics.join(', ')}\n` +
    `النوع: ${betting ? 'قناة مراهنة رياضية' : 'قناة أخبار رياضية عادية — ممنوع أي ذكر للمراهنة'}\n` +
    `المناسبة: إعلان ${slotNote} ترويجي عن المنصة (حشو يومي).\n` +
    `المميزات الحقيقية المسموح بذكرها: توقعات مدعومة بالذكاء الاصطنصي، نتائج مباريات مباشرة، تحليلات فنية، تحديثات لحظية${betting ? '، كاش باك وعروض' : ''}.`;

  const system = `${PROMO_SYSTEM}
${betting
    ? 'القناة عن المراهنة: أذن بإبراز توقعات AI والأوليات والكاش باك والدعوة لزيارة الموقع، واختم بالتوقيع/الرابط والتنبيه الليلي 18+ إن وجد توقيع.'
    : 'القناة ليست عن المراهنة: اكتب إعلاناً عاماً عن المنصة كموقع رياضي (نتائج مباشرة وتحليلات) — ممنوع تماماً ذكر المراهنة أو الرهانات أو التوقعات أو العروض أو الكاش باك أو 18+. وإن وجد توقيع تجاري لا تذكره.'}`;

  try {
    const raw = await generateWithFailover(facts, system, 0.8);
    if (raw && raw.trim().length > 30 && raw.trim().length < 1500) {
      let text = raw.trim().replace(/^```[\w]*\n?|```$/g, '').slice(0, 3800);
      if (betting && ch.brand.signature && !text.includes(ch.brand.signature)) {
        text += `\n\n${ch.brand.signature}`;
      }
      return text;
    }
  } catch {
    /* template fallback */
  }
  return templatePromo(ch, betting, domain);
}

function templatePromo(ch: ChannelProfile, betting: boolean, domain: string): string {
  const link = domain ? `\n🌐 ${domain}` : '';
  if (betting) {
    return (
      `🔥 ${ch.title} — تابع أحدث التوقعات الرياضية المدعومة بالذكاء الاصطنصي!\n` +
      `⚽ نتائج مباشرة + تحليلات فنية + كاش باك يومي.${link}` +
      (ch.brand.signature ? `\n\n${ch.brand.signature}` : '')
    );
  }
  return (
    `⚽ ${ch.title} — نتائج المباريات المباشرة وتحليلات رياضية دقيقة في مكان واحد.\n` +
    `📊 تحديثات لحظية لكل البطولات الكبرى.${link}`
  );
}

/** Plan + enqueue today's promo posts (idempotent — one per channel+slot/day). */
export async function runPromoPass(): Promise<{
  planned: number;
  skipped: number;
  appPlanned?: number;
  appSkipped?: number;
}> {
  const state = readState();
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  if (state.date !== today) {
    state.date = today;
    state.planned = []; // new day → plan the day's slots again
  }

  const channels = channelsStore
    .getAll()
    .filter((c) => c.active && c.category !== 'users' && c.category !== 'support');
  let planned = 0;
  let skipped = 0;

  for (let i = 0; i < channels.length; i++) {
    const ch = channels[i];
    for (const slot of SLOTS_UTC) {
      const key = `${ch.chat_id}|${slot}`;
      if (state.planned.includes(key)) continue;
      const slotMs = Date.UTC(
        new Date(now).getUTCFullYear(),
        new Date(now).getUTCMonth(),
        new Date(now).getUTCDate(),
        slot,
        0,
        0
      ) + i * STAGGER_MS;

      if (slotMs > now + PLAN_WINDOW_MS) continue; // too far ahead — plan on a later pass
      if (slotMs < now - MISSED_WINDOW_MS) {
        state.planned.push(key); // slot missed — don't flood at night
        skipped++;
        continue;
      }

      const text = await buildPromo(ch, slot);
      schedulePost({
        chat_id: ch.chat_id,
        channelTitle: ch.title,
        text,
        parse_mode: ch.format === 'html' ? 'HTML' : 'Markdown',
        kind: 'promo',
        sendAt: Math.max(slotMs, now + 30 * 1000),
        overflow: 20, // shared daily pool with forecast/live (cap + 20)
      });
      state.planned.push(key);
      planned++;
      console.log(`[Promo] planned ${slot}:00 UTC → ${ch.title}`);
    }
  }

  writeState(state);

  // Chain the app-download promo pass (same cadence trigger, own state file)
  let appPlanned = 0;
  let appSkipped = 0;
  try {
    const app = await runAppPromoPass();
    appPlanned = app.planned;
    appSkipped = app.skipped;
  } catch (err: any) {
    console.warn('[PromoApp] pass error:', err.message);
  }

  return { planned, skipped, appPlanned, appSkipped };
}

/** Plan + enqueue today's lottery-app promo (one per channel per day, 13:00 UTC). */
export async function runAppPromoPass(): Promise<{ planned: number; skipped: number }> {
  const state = readAppState();
  const now = Date.now();
  const nowD = new Date(now);
  const today = nowD.toISOString().slice(0, 10);
  if (state.date !== today) {
    state.date = today;
    state.planned = [];
  }

  const channels = channelsStore
    .getAll()
    .filter((c) => c.active && c.category !== 'users' && c.category !== 'support');
  let planned = 0;
  let skipped = 0;
  const dayOfYear = Math.floor(
    (now - Date.UTC(nowD.getUTCFullYear(), 0, 1)) / 86400000
  );
  const slotMs = Date.UTC(
    nowD.getUTCFullYear(),
    nowD.getUTCMonth(),
    nowD.getUTCDate(),
    APP_SLOT_UTC,
    0,
    0
  );

  channels.forEach((ch, i) => {
    const key = `${ch.chat_id}|${APP_SLOT_UTC}`;
    if (state.planned.includes(key)) return;
    if (slotMs < now - MISSED_WINDOW_MS) {
      state.planned.push(key); // missed today — don't flood late
      skipped++;
      return;
    }
    const betting = ch.betting_related !== false;
    const variants = betting ? APP_PROMOS_BETTING : APP_PROMOS_NEUTRAL;
    let text = variants[(dayOfYear + i) % variants.length];
    if (betting && ch.brand.signature && !text.includes(ch.brand.signature)) {
      text += `\n\n${ch.brand.signature}`;
    }
    schedulePost({
      chat_id: ch.chat_id,
      channelTitle: ch.title,
      text,
      parse_mode: ch.format === 'html' ? 'HTML' : 'Markdown',
      kind: 'promo',
      sendAt: Math.max(slotMs + i * STAGGER_MS, now + 30 * 1000),
      overflow: 20,
    });
    state.planned.push(key);
    planned++;
    console.log(`[PromoApp] planned app promo ${APP_SLOT_UTC}:00 UTC → ${ch.title}`);
  });

  writeAppState(state);
  return { planned, skipped };
}

export function startPromoScheduler(intervalMinutes = 60): void {
  stopPromoScheduler();
  setTimeout(() => {
    void runPromoPass().catch((err) => console.warn('[Promo] pass error:', err.message));
  }, 3 * 60 * 1000);
  timer = setInterval(() => {
    void runPromoPass().catch((err) => console.warn('[Promo] pass error:', err.message));
  }, intervalMinutes * 60 * 1000);
  timer.unref?.();
  console.log(`[Promo] daily promo planner active — every ${intervalMinutes}min (slots ${SLOTS_UTC.join(':00, ')}:00 UTC)`);
}

export function stopPromoScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export function getPromoStatus(): any {
  const state = readState();
  const appState = readAppState();
  return {
    active: timer != null,
    date: state.date,
    plannedToday: state.planned.length,
    slots: SLOTS_UTC,
    appPromo: {
      date: appState.date,
      plannedToday: appState.planned.length,
      slot: APP_SLOT_UTC,
      link: APP_LINK,
      variants: { betting: APP_PROMOS_BETTING.length, neutral: APP_PROMOS_NEUTRAL.length },
    },
  };
}
