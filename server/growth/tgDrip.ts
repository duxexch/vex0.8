import * as fs from 'fs';
import * as path from 'path';
import { listLeads, getSettings, addTouch, type Lead } from './leadsStore';
import { queueTgWebBatch, listTgWebMessages, tgWebAllowance, tgWebSafetyState, type TgWebMessage } from './tgWebOutbox';
import { BOT_PROMO_DOMAINS } from '../botPromo';

// =========================================================================
// Telegram Web drip — the daily, ban-safe client outreach pass.
//
// The ONLY transport here is the shared tgWeb outbox: the server never talks
// to Telegram directly, it only queues `q:<query>` files that the HOST-side
// Playwright worker delivers from the admin's own logged-in Web session.
// Everything that keeps an account alive is delegated to that contract:
//   • 14-day warm-up ramp (day N → batch_size × N)
//   • hard daily cap + 45–150 s gaps + instant halt  → queueTgWebBatch
//   • a target is a @username search query only (numeric ids are rejected
//     by the worker — proven), so phone-only leads are never touched here.
// On top of that this module adds its own courtesy rules: never queue a
// target that is already pending, never re-DM within RECONTACT_DAYS, never
// message dead/stopped/negative leads, max MAX_PER_PASS per run.
// =========================================================================

const STATE_PATH = path.join(process.cwd(), 'data', 'tg_web_drip.json');
const RECONTACT_DAYS = 14;  // per-client cooldown between outreach DMs
const MAX_PER_PASS = 10;    // gentle per run (the warm-up allowance is smaller anyway)
const DAY_MS = 86400000;

interface DripState {
  enabled: boolean;
  lastRun: number;
  totalQueued: number;
  totalSkipped: number;
  byLead: Record<string, number>; // leadId -> last queued ts
}

function loadState(): DripState {
  try {
    if (fs.existsSync(STATE_PATH)) {
      const raw = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
      if (raw && typeof raw === 'object') {
        return { enabled: true, lastRun: 0, totalQueued: 0, totalSkipped: 0, byLead: {}, ...raw };
      }
    }
  } catch (err: any) {
    console.warn('[TgDrip] state load failed:', err.message);
  }
  return { enabled: true, lastRun: 0, totalQueued: 0, totalSkipped: 0, byLead: {} };
}

function saveState(state: DripState): void {
  try {
    fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('[TgDrip] state save failed:', err.message);
  }
}

export function tgDripSetEnabled(enabled: boolean): DripState {
  const s = loadState();
  s.enabled = !!enabled;
  saveState(s);
  return s;
}

// ------------------------------------------------------------------ copy
// Plain text on purpose: the worker types into Telegram Web, there is no
// parse_mode there. Strong, specific, one CTA, links from our own domains.

function pickLink(seed: string): string {
  const domains = BOT_PROMO_DOMAINS.length ? BOT_PROMO_DOMAINS : ['https://vex.deals'];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return domains[h % domains.length];
}

type CopyFn = (link: string, name: string) => string;

const AR_COPY: CopyFn[] = [
  (link, name) =>
    [
      `مرحبًا${name ? ' ' + name : ''} 👋`,
      '',
      'لو لسه بتدور على مكان تتابع فيه المباريات وتكسب معاها، VEX Deals بيجمع كل حاجة في مكان واحد:',
      '',
      '• تحليل ذكاء اصطناعي لكل مباراة قبل صافرة البداية',
      '• تعويض فوري لو خسرت رهانك — مش بتروح',
      '• يانصيب أسبوعي بجوائز حقيقية',
      '• إيداع وسحب في دقائق',
      '',
      'جرّب بنفسك من هنا 👇',
      link,
    ].join('\n'),

  (link, name) =>
    [
      `${name ? name + '، ' : ''}عندي حاجة ممكن تنفعك 🔥`,
      '',
      'كل يوم بننشر توقعات مباريات مبنية على تحليل حقيقي، مش تخمين:',
      '',
      '• نسب فوز واضحة لكل فريق',
      '• متابعة مباشرة للنتائج',
      '• تنبيه قبل ما المباراة تبدأ',
      '',
      'شوف التوقعات على طول من هنا 👇',
      link,
    ].join('\n'),

  (link, name) =>
    [
      `سؤال سريع${name ? ' ' + name : ''} ⏳`,
      '',
      'لو خسرت رهان مرة، حسيت إن الفلوس راحت عليك؟',
      '',
      'VEX Deals بيديك تعويض على الخسارة، وعليه كمان:',
      '• مكافأة ترحيبية عند التسجيل',
      '• محفظة واحدة تتابعها من أي جهاز',
      '• سحب بدون تعقيد',
      '',
      'التفاصيل هنا 👇',
      link,
    ].join('\n'),

  (link, name) =>
    [
      `🎁 ليك عرض${name ? ' يا ' + name : ''}`,
      '',
      'سجّل في VEX Deals وخد مكافأة الترحيب فورًا:',
      '',
      '• تسجيل في أقل من دقيقة',
      '• ربط رقمك بمحفظتك لمرة واحدة',
      '• تتابع رصيدك ومحافظ الشركات في مكان واحد',
      '',
      'ابدأ من هنا 👇',
      link,
    ].join('\n'),

  (link, name) =>
    [
      `${name ? name + '، ' : ''}لاحظت إنك مهتم بالرياضة 🏆`,
      '',
      'منصة VEX Deals معمولة لناس مثلك:',
      '',
      '• تحليلات مباريات بالذكاء الاصطناعي',
      '• نظام ولاء بيجمع لك النقاط على كل نشاط',
      '• عروض يومية وجوائز أسبوعية',
      '',
      'كل التفاصيل في خطوة واحدة 👇',
      link,
    ].join('\n'),
];

const EN_COPY: CopyFn[] = [
  (link, name) =>
    [
      `Hi${name ? ' ' + name : ''} 👋`,
      '',
      'If you are still looking for one place to follow matches AND win from them, VEX Deals puts it all together:',
      '',
      '• AI match analysis before kick-off',
      '• Instant compensation when your bet loses',
      '• Weekly lottery with real prizes',
      '• Fast deposits and withdrawals',
      '',
      'See it for yourself 👇',
      link,
    ].join('\n'),
  (link, name) =>
    [
      `Quick one${name ? ', ' + name : ''} ⏳`,
      '',
      'Tired of losing a bet and watching the money go?',
      '',
      'VEX Deals refunds the loss — and on top of that:',
      '• Welcome bonus on signup',
      '• One wallet you can open from any device',
      '• Withdrawals without the runaround',
      '',
      'Details are here 👇',
      link,
    ].join('\n'),
];

function copyFor(lead: Lead, index: number, link: string): string {
  const name = String(lead.first_name || '').replace(/\s+/g, ' ').trim().slice(0, 24);
  const set = lead.lang === 'ar' ? AR_COPY : EN_COPY;
  return set[index % set.length](link, name);
}

// ---------------------------------------------------------------- selection

function recentlyQueuedTargets(): Set<string> {
  const set = new Set<string>();
  for (const m of listTgWebMessages('pending')) set.add(m.target);
  return set;
}

function recentlySentTargets(now: number): Set<string> {
  const set = new Set<string>();
  for (const m of listTgWebMessages('sent')) {
    const at = m.sent_at || m.created_at || 0;
    if (now - at < RECONTACT_DAYS * DAY_MS) set.add(m.target);
  }
  return set;
}

function validUsername(u?: string): string {
  const raw = String(u || '').trim().replace(/^@/, '');
  if (!raw || raw.length < 3 || raw.length > 32) return '';
  if (!/^[A-Za-z0-9_]+$/.test(raw)) return '';
  return raw;
}

/** Reachable @username clients, best first — never dead/stopped/negative. */
export function tgDripCandidates(limit = MAX_PER_PASS): { lead: Lead; target: string }[] {
  const now = Date.now();
  const pending = recentlyQueuedTargets();
  const sent = recentlySentTargets(now);
  const state = loadState();

  const out: { lead: Lead; target: string }[] = [];
  for (const l of listLeads()) {
    if (out.length >= limit) break;
    if (l.status === 'dead' || l.status === 'stopped') continue;
    if (l.mood === 'negative') continue; // never push an angry client
    const u = validUsername(l.username);
    if (!u) continue; // phone-only leads are unreachable by the Web worker
    const target = `q:@${u}`;
    if (pending.has(target)) continue;
    if (sent.has(target)) continue;
    const last = state.byLead[l.id] || 0;
    if (now - last < RECONTACT_DAYS * DAY_MS) continue;
    out.push({ lead: l, target });
  }

  // Known clients first, then engagement score, then least recently touched.
  out.sort((a, b) => {
    const sa = a.lead.started ? 1 : 0;
    const sb = b.lead.started ? 1 : 0;
    if (sa !== sb) return sb - sa;
    if (a.lead.score !== b.lead.score) return b.lead.score - a.lead.score;
    return (a.lead.last_touch_at || 0) - (b.lead.last_touch_at || 0);
  });
  return out;
}

// ---------------------------------------------------------------- running

export interface TgDripResult {
  enabled: boolean;
  candidates: number;
  queued: number;
  skipped: number;
  reason?: string;
  remaining_today: number;
  warmup_day: number;
  halted: boolean;
}

/**
 * Queue one gentle outreach batch. Never sends anything itself — it only
 * writes outbox files, and queueTgWebBatch enforces halt + warm-up allowance.
 */
export function runTgDripPass(opts?: { max?: number }): TgDripResult {
  const state = loadState();
  const allowance = tgWebAllowance();
  const safety = tgWebSafetyState();

  const base: TgDripResult = {
    enabled: state.enabled,
    candidates: 0,
    queued: 0,
    skipped: 0,
    remaining_today: allowance.remaining,
    warmup_day: allowance.warmup_day,
    halted: safety.halted,
  };

  if (!state.enabled) return { ...base, reason: 'drip_disabled' };
  if (safety.halted) return { ...base, reason: 'halted' };
  if (allowance.remaining <= 0) return { ...base, reason: 'daily_allowance_used' };

  const max = Math.min(opts?.max ?? MAX_PER_PASS, allowance.remaining, MAX_PER_PASS);
  const picks = tgDripCandidates(max);
  base.candidates = picks.length;
  if (!picks.length) return { ...base, reason: 'no_candidates' };

  const now = Date.now();
  const items = picks.map((p, i) => {
    const link = pickLink(`${p.lead.id}_${now}`);
    return {
      target: p.target,
      text: copyFor(p.lead, i, link),
      kind: 'campaign' as const,
      lead_id: p.lead.id,
    };
  });

  const res = queueTgWebBatch(items);
  base.queued = res.queued;
  base.skipped = res.skipped;
  base.reason = res.reason;

  // Record against the leads we actually got into the outbox.
  const queuedItems = items.slice(0, res.queued);
  for (const it of queuedItems) {
    if (it.lead_id) state.byLead[it.lead_id] = now;
    const tgId = Number(String(it.lead_id || '').replace(/^tg_/, ''));
    if (tgId) addTouch(tgId, 'campaign', 'tg-web drip queued', 'tgweb');
  }

  state.lastRun = now;
  state.totalQueued += res.queued;
  state.totalSkipped += res.skipped;
  saveState(state);

  if (res.queued) {
    console.log(`[TgDrip] queued ${res.queued}/${picks.length} (warm-up day ${allowance.warmup_day}, ${allowance.remaining} left today)`);
  }
  return base;
}

export function getTgDripStatus(): object {
  const state = loadState();
  const allowance = tgWebAllowance();
  const safety = tgWebSafetyState();
  const sentToday: TgWebMessage[] = listTgWebMessages('sent').filter(
    (m) => m.sent_at && new Date(m.sent_at).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)
  );
  return {
    enabled: state.enabled,
    lastRun: state.lastRun ? new Date(state.lastRun).toISOString() : null,
    totalQueued: state.totalQueued,
    totalSkipped: state.totalSkipped,
    recontact_days: RECONTACT_DAYS,
    max_per_pass: MAX_PER_PASS,
    candidates: tgDripCandidates(MAX_PER_PASS).map((p) => ({
      lead_id: p.lead.id,
      username: p.lead.username,
      started: p.lead.started,
      score: p.lead.score,
      target: p.target,
    })),
    allowance: {
      allowed_today: allowance.allowed,
      used_today: allowance.used,
      remaining_today: allowance.remaining,
      warmup_day: allowance.warmup_day,
    },
    delivered_today: sentToday.length,
    halted: safety.halted,
    halt_reason: safety.halt_reason || '',
  };
}

/** First manual batch — used right after a deploy to prove the worker path. */
export function primeTgDrip(): TgDripResult {
  return runTgDripPass({ max: 5 });
}

/** Settings mirror so the growth timer can be gated by drip_enabled. */
export function tgDripWantsRun(): boolean {
  try {
    return getSettings().drip_enabled !== false && loadState().enabled !== false;
  } catch {
    return true;
  }
}
