import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { storage } from './storage';
import { channelsStore } from './channelsStore';
import { channelBrandCompany } from './channelCampaign';
import { schedulePost } from './postScheduler';
import { getOfferForCompany } from './offerScraper';
import {
  recordsCardPublicUrl,
  companyCardPublicUrl,
  renderRecordsCardPng,
  renderCompanyCardPng,
  type RecordsCardPayload,
  type CompanyCardPayload,
} from './growth/predictionCards';

// =========================================================================
// Card Studio — منشورات الكروت (سجل التوقعات + الشركات).
//   • Kicks out ONE card post per interval so the site feed never floods.
//   • Each pass: site post (image = card PNG URL) + schedulePost() to the
//     qualifying active channels — every cap/quiet/gap rule keeps applying
//     inside the scheduler, plus the photo (sendPhoto, text fallback).
//   • Queue is persisted (data/card_posts_queue.json), dispatch is flagged
//     BEFORE side effects so a restart can never double-post.
// =========================================================================

export interface CardPostEntry {
  id: string;
  kind: 'records' | 'company';
  sha1: string;
  title: string;
  text: string;
  /** origin-relative card URL stored on the site post */
  image: string;
  /** absolute local PNG path uploaded to Telegram */
  cardPath?: string;
  /** label shown as the site post's company/category chip */
  companyLabel: string;
  createdAt: string;
  dispatchedAt?: string;
}

interface QueueFile {
  lastDispatchAt: number;
  items: CardPostEntry[];
}

const QUEUE_PATH = path.join(process.cwd(), 'data', 'card_posts_queue.json');
const DISPATCH_INTERVAL_MS = 30 * 60 * 1000; // one card post every 30 minutes
const BOOT_DELAY_MS = 30 * 1000;
const KEEP_DISPATCHED_MS = 90 * 86400000;
const TICK_MS = 60 * 1000;

let timer: NodeJS.Timeout | null = null;
let notify: ((postId: string, post: any) => void) | null = null;
let dispatchIntervalMs = DISPATCH_INTERVAL_MS;

function loadQueue(): QueueFile {
  try {
    if (fs.existsSync(QUEUE_PATH)) {
      const data = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf-8'));
      if (data && Array.isArray(data.items)) {
        return { lastDispatchAt: Number(data.lastDispatchAt) || 0, items: data.items };
      }
    }
  } catch (err: any) {
    console.warn('[CardPosts] load failed:', err.message);
  }
  return { lastDispatchAt: 0, items: [] };
}

function saveQueue(q: QueueFile): void {
  const cutoff = Date.now() - KEEP_DISPATCHED_MS;
  q.items = q.items.filter((i) => !i.dispatchedAt || Date.parse(i.dispatchedAt) > cutoff);
  fs.mkdirSync(path.dirname(QUEUE_PATH), { recursive: true });
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(q, null, 2), 'utf-8');
}

function sha1Of(s: string): string {
  return crypto.createHash('sha1').update(s).digest('hex');
}

// ---------------------------------------------------------------------------
// Payloads + copy (نصوص معتمدة من الخطة)
// ---------------------------------------------------------------------------

/** Live display fix for a known truncated team name coming from the feed source. */
function fixTruncatedNames(s: string): string {
  return String(s || '').replace(/\btico Madrid\b/g, 'Atletico Madrid');
}

export function recordsPayloadFromStats(stats: any): RecordsCardPayload {
  const seen = new Set<string>();
  const results: RecordsCardPayload['results'] = [];
  for (const it of stats?.last5Items || []) {
    const match = fixTruncatedNames(String(it?.match || ''));
    if (!match || seen.has(match)) continue;
    seen.add(match);
    results.push({
      match,
      predicted: String(it?.predicted || '—'),
      actual: String(it?.actual || '—'),
      verdict: String(it?.verdict || 'draw'),
    });
    if (results.length >= 4) break;
  }
  const accuracy = Number.isFinite(stats?.accuracy) ? Number(stats.accuracy) : null;
  return {
    hits: Number(stats?.hits) || 0,
    misses: Number(stats?.misses) || 0,
    draws: Number(stats?.draws) || 0,
    settled: Number(stats?.settled) || 0,
    pending: Number(stats?.pending) || 0,
    accuracy,
    dateLabel: new Date().toISOString().slice(0, 10),
    results,
  };
}

/**
 * The offer scraper can land raw page text ("Bonus for first depositRegister…")
 * in `headline`, and `bonus` falls back to it when a company has no bonus_text.
 * Only accept a scraped bonus that looks like a real offer line.
 */
function isCleanBonus(s: string): boolean {
  const t = String(s || '').trim();
  if (!t || t.length > 70) return false;
  if (/find out more|make deposits|register at|sign up|terms (apply|and)|click here|read more/i.test(t)) return false;
  if (/[a-z][A-Z]{2,}/.test(t)) return false; // camelCase run-ons from concatenated nodes
  return true;
}

export function companyCardPayload(c: any): CompanyCardPayload {
  const staticBonus = String(c?.bonus_text || '').trim();
  let scrapedBonus = '';
  try {
    scrapedBonus = String(getOfferForCompany(String(c?.name || ''))?.bonus || '').trim();
  } catch {
    /* offers are a bonus — never fail the card on them */
  }
  const bonus = staticBonus || (isCleanBonus(scrapedBonus) ? scrapedBonus : '');
  return {
    id: String(c?.id || ''),
    name: String(c?.name || '').trim(),
    color: String(c?.color || '#10b981'),
    badge: String(c?.badge || '').trim(),
    bonus,
    promoCode: String(c?.promo_code || '').trim(),
  };
}

function recordsTitle(p: RecordsCardPayload): string {
  const acc = p.accuracy !== null ? `${p.accuracy}%` : '—';
  return `📊 سجل توقعات VEX — دقة ${acc} من ${p.settled} توقعًا`;
}

function recordsCaption(p: RecordsCardPayload): string {
  const verdictEmoji = (v: string) => (v === 'hit' ? '✅' : v === 'miss' ? '❌' : '➖');
  const head = [
    '📊 سجل توقعات VEX — شفاف وموثّق',
    '',
    `🎯 دقة السلسلة: ${p.accuracy !== null ? `${p.accuracy}%` : '—'}`,
    `✅ ناجح: ${p.hits} • ❌ فاشل: ${p.misses} • ➖ تعادل: ${p.draws} — من ${p.settled} توقعًا منتهيًا`,
  ];
  const tail = [
    '',
    '📈 تابع توقعات VEX الذكية يوميًا — نتائج شفافة تُحدَّث آليًا.',
    '⚠️ (+18) توقعات للمتابعة — ليست نصيحة مالية.',
  ];
  // Keep the photo caption under Telegram's 1024-char cap by trimming results first.
  for (let keep = p.results.length; keep >= 0; keep--) {
    const mid = keep
      ? [
          '',
          '🔥 آخر النتائج:',
          ...p.results
            .slice(0, keep)
            .map((r) => `⚽ ${r.match} — توقع ${r.predicted} → ${r.actual || '—'} ${verdictEmoji(r.verdict)}`),
        ]
      : [];
    const text = [...head, ...mid, ...tail].join('\n');
    if (text.length <= 1000 || keep === 0) return text;
  }
  return [...head, ...tail].join('\n');
}

function companyTitle(c: CompanyCardPayload): string {
  return `🏆 ${c.name} — ${c.bonus || c.badge || 'شريك معتمد لدى VEX'}`;
}

function companyCaption(c: CompanyCardPayload): string {
  return [
    `🏆 ${c.name} — شريك معتمد لدى VEX Deals`,
    '',
    c.bonus ? `🎁 ${c.bonus}` : null,
    c.promoCode ? `🎯 كود الخصم: ${c.promoCode}` : null,
    '🛡️ مع VEX: كاش باك وتعويض كامل ضد الخسارة',
    '',
    '📲 سجّل الآن عبر الرابط الرسمي وفعّل الحماية.',
    '⚠️ (+18) العب بمسؤولية.',
  ]
    .filter((l): l is string => l !== null)
    .join('\n');
}

// ---------------------------------------------------------------------------
// Enqueue — build card PNG, then queue one post (deduped by content hash)
// ---------------------------------------------------------------------------

export async function enqueueRecordsPost(stats: any): Promise<{ enqueued: boolean; reason?: string }> {
  const payload = recordsPayloadFromStats(stats);
  if (payload.settled === 0) return { enqueued: false, reason: 'no settled predictions yet' };
  const sha1 = sha1Of(`records|${JSON.stringify(payload)}`);
  // ⚠️ No await may sit between loadQueue() and saveQueue(): dispatchNext() runs
  // on a timer, and a save that lands after it would wipe the dispatchedAt flag
  // it just wrote (that race once double-posted a card to 14 channels).
  if (loadQueue().items.some((i) => i.sha1 === sha1)) return { enqueued: false, reason: 'same snapshot already queued' };
  const file = await renderRecordsCardPng(payload);
  if (!file) return { enqueued: false, reason: 'RENDER_FAILED' };
  const q = loadQueue();
  if (q.items.some((i) => i.sha1 === sha1)) return { enqueued: false, reason: 'same snapshot already queued' };
  q.items.push({
    id: `CP-${Date.now()}-rec-${Math.random().toString(36).slice(2, 6)}`,
    kind: 'records',
    sha1,
    title: recordsTitle(payload),
    text: recordsCaption(payload),
    image: recordsCardPublicUrl(),
    cardPath: file,
    companyLabel: 'VEX',
    createdAt: new Date().toISOString(),
  });
  saveQueue(q);
  console.log(`[CardPosts] queued records post (d=${payload.accuracy}% settled=${payload.settled})`);
  return { enqueued: true };
}

export async function enqueueCompanyPosts(): Promise<{ enqueued: number; skipped: number; reasons: string[] }> {
  const companies = storage.getCompanies().filter((c: any) => c && c.is_active !== false);
  let skipped = 0;
  const reasons: string[] = [];
  // Phase 1 (async): render every card — the queue file is NOT touched while
  // awaiting (see the race note in enqueueRecordsPost).
  const ready: Array<{ payload: CompanyCardPayload; sha1: string; file: string }> = [];
  for (const c of companies) {
    const payload = companyCardPayload(c);
    if (!payload.id || !payload.name) {
      skipped++;
      continue;
    }
    const sha1 = sha1Of(`company|${JSON.stringify(payload)}`);
    if (loadQueue().items.some((i) => i.sha1 === sha1)) {
      skipped++;
      continue;
    }
    const file = await renderCompanyCardPng(payload);
    if (!file) {
      skipped++;
      reasons.push(`${payload.name}: RENDER_FAILED`);
      continue;
    }
    ready.push({ payload, sha1, file });
  }
  // Phase 2 (sync critical section): load → push → save with no await between.
  const q = loadQueue();
  let enqueued = 0;
  for (const r of ready) {
    if (q.items.some((i) => i.sha1 === r.sha1)) {
      skipped++;
      continue;
    }
    q.items.push({
      id: `CP-${Date.now()}-${r.payload.id}-${Math.random().toString(36).slice(2, 6)}`,
      kind: 'company',
      sha1: r.sha1,
      title: companyTitle(r.payload),
      text: companyCaption(r.payload),
      image: companyCardPublicUrl(r.payload.id),
      cardPath: r.file,
      companyLabel: r.payload.name,
      createdAt: new Date().toISOString(),
    });
    enqueued++;
  }
  if (enqueued > 0) saveQueue(q);
  console.log(`[CardPosts] queued ${enqueued} company post(s) (${skipped} skipped)`);
  return { enqueued, skipped, reasons };
}

// ---------------------------------------------------------------------------
// Dispatch — ONE entry per interval: site post + paced Telegram schedule
// ---------------------------------------------------------------------------

/** Records card — same targeting rule as the settlement announcements:
 *  sports + betting-related (a football-news channel never gets it). */
function recordsTargets(): any[] {
  return channelsStore
    .getAll()
    .filter(
      (c: any) =>
        c.active &&
        c.category === 'sports' &&
        c.betting_related !== false &&
        (c.topics.length === 0 ||
          c.topics.some((t: string) => t === 'football' || t === 'all' || t === 'live' || t === 'news' || t === 'general'))
    );
}

/** Company card — ONLY channels of that company plus neutral channels
 *  (resolveCompany === null). Niche/users/support/payments are never targets,
 *  and a football-news channel (betting_related === false) never gets a
 *  betting promo — the three routing rules the user asked for. */
function companyTargets(companyLabel: string): any[] {
  const label = String(companyLabel || '').trim().toLowerCase();
  return channelsStore
    .getAll()
    .filter(
      (c: any) =>
        c.active &&
        c.betting_related !== false &&
        c.category !== 'agents' &&
        c.category !== 'marketers' &&
        c.category !== 'users' &&
        c.category !== 'support' &&
        c.category !== 'payments'
    )
    .filter((c: any) => {
      const comp = channelBrandCompany(c);
      if (!comp) return true; // neutral / our-own (VEX) channel accepts any brand
      return comp.toLowerCase() === label; // dedicated channel: own brand only
    });
}

function telegramTargets(entry?: CardPostEntry): any[] {
  if (entry?.kind === 'company') return companyTargets(entry.companyLabel);
  return recordsTargets();
}

function dispatchNext(): boolean {
  const q = loadQueue();
  const now = Date.now();
  if (now - (q.lastDispatchAt || 0) < dispatchIntervalMs) return false;
  const next = q.items.find((i) => !i.dispatchedAt);
  if (!next) return false;

  // Flag FIRST (and persist) — a crash after this point can only LOSE a post,
  // never double-post it. Site creation stays idempotent via sha1 anyway.
  next.dispatchedAt = new Date().toISOString();
  q.lastDispatchAt = now;
  saveQueue(q);

  try {
    if (!storage.findSitePostByHash(next.sha1)) {
      const id = `SP-CARD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const sitePost: any = {
        id,
        title: next.title,
        text: next.text.slice(0, 4400),
        excerpt: next.text.slice(0, 400),
        company: next.companyLabel,
        lang: 'ar',
        channel: 'card-studio',
        messageId: null,
        image: next.image,
        source: next.kind === 'records' ? 'records_card' : 'company_card',
        externalUrl: null,
        sha1: next.sha1,
        createdAt: new Date().toISOString(),
        sourceText: 'card_studio', // never treated as a raw prediction source
      };
      storage.addSitePost(sitePost);
      notify?.(id, sitePost);
    }
  } catch (err: any) {
    console.warn('[CardPosts] site post failed:', err.message);
  }

  try {
    const targets = telegramTargets(next);
    const sendAt = Date.now() + 90 * 1000;
    for (const ch of targets) {
      const sig = ch.brand?.signature;
      const body = sig && !next.text.includes(sig) ? `${next.text}\n\n${sig}` : next.text;
      schedulePost({
        chat_id: ch.chat_id,
        channelTitle: ch.title,
        text: body,
        parse_mode: 'HTML',
        kind: next.kind === 'records' ? 'forecast' : 'promo',
        sendAt,
        photoPath: next.cardPath,
      });
    }
    console.log(`[CardPosts] ✓ dispatched ${next.kind} → site + ${targets.length} channel(s)`);
  } catch (err: any) {
    console.warn('[CardPosts] telegram schedule failed:', err.message);
  }
  return true;
}

export function startCardPostQueue(intervalMinutes = 30, onPublished?: (postId: string, post: any) => void): void {
  stopCardPostQueue();
  notify = onPublished || null;
  dispatchIntervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
  // First pass shortly after boot so a queue left over from a deploy resumes fast;
  // subsequent passes are throttled by DISPATCH_INTERVAL_MS inside dispatchNext.
  setTimeout(() => {
    try {
      dispatchNext();
    } catch (err: any) {
      console.warn('[CardPosts] boot dispatch error:', err.message);
    }
  }, BOOT_DELAY_MS).unref?.();
  timer = setInterval(
    () => {
      try {
        dispatchNext();
      } catch (err: any) {
        console.warn('[CardPosts] dispatch error:', err.message);
      }
    },
    Math.min(TICK_MS, intervalMinutes * 60 * 1000)
  );
  timer.unref?.();
  console.log(`[CardPosts] card post queue active — one every ${intervalMinutes}m`);
}

export function stopCardPostQueue(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export function getCardPostQueueStatus(): any {
  const q = loadQueue();
  const pending = q.items.filter((i) => !i.dispatchedAt);
  const now = Date.now();
  return {
    active: timer != null,
    counts: {
      pending: pending.length,
      dispatched: q.items.length - pending.length,
    },
    nextDispatchDueInMs: Math.max(0, (q.lastDispatchAt || 0) + dispatchIntervalMs - now),
    next: pending.slice(0, 5).map((i) => ({ id: i.id, kind: i.kind, title: i.title, createdAt: i.createdAt })),
  };
}
