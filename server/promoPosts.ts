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

let timer: NodeJS.Timeout | null = null;

interface PromoState {
  date: string;
  planned: string[]; // `${chat_id}|${slotHour}`
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
export async function runPromoPass(): Promise<{ planned: number; skipped: number }> {
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
        overflow: 0,
      });
      state.planned.push(key);
      planned++;
      console.log(`[Promo] planned ${slot}:00 UTC → ${ch.title}`);
    }
  }

  writeState(state);
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
  return {
    active: timer != null,
    date: state.date,
    plannedToday: state.planned.length,
    slots: SLOTS_UTC,
  };
}
