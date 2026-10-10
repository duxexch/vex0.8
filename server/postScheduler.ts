import * as fs from 'fs';
import * as path from 'path';
import { channelsStore, ChannelProfile } from './channelsStore';
import { sendTelegram } from './agentPipeline';

// =========================================================================
// Post Scheduler — time-spread publishing per channel.
// Predictions, promos and other "scheduled" content are ENQUEUED here instead
// of being blasted at once. The dispatcher respects per-channel daily caps,
// quiet hours, per-channel min gap and a global anti-spam gap, and retries
// failures with backoff. Queue survives restarts (data/scheduled_posts.json).
// =========================================================================

export interface ScheduledPost {
  id: string;
  chat_id: string;
  channelTitle: string;
  text: string;
  parse_mode: 'HTML' | 'Markdown';
  kind: 'forecast' | 'promo' | 'live' | 'news';
  /** epoch ms when this post should go out */
  sendAt: number;
  /** epoch ms after which the post is pointless (e.g. fixture kickoff) — cancelled, not sent */
  expiresAt?: number;
  /** extra daily slots beyond daily_cap this post may use (0 = strict cap) */
  overflow?: number;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  attempts: number;
  deferrals: number;
  lastError?: string;
  createdAt: string;
  sentAt?: string;
}

const QUEUE_PATH = path.join(process.cwd(), 'data', 'scheduled_posts.json');
const MIN_CHANNEL_GAP_MS = 90 * 1000; // min spacing between posts to ONE channel
const GLOBAL_GAP_MS = 4 * 1000;       // min spacing between ANY two sends
const MAX_ATTEMPTS = 4;               // send failures before giving up
const MAX_DEFERRALS = 120;            // cap/quiet deferrals before giving up (~30h at 15min)
const PRUNE_AFTER_MS = 48 * 3600 * 1000;

let timer: NodeJS.Timeout | null = null;
let lastGlobalSendAt = 0;

function load(): ScheduledPost[] {
  try {
    if (fs.existsSync(QUEUE_PATH)) {
      const data = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf-8'));
      return Array.isArray(data) ? data : [];
    }
  } catch (err: any) {
    console.warn('[Scheduler] load failed:', err.message);
  }
  return [];
}

function save(items: ScheduledPost[]): void {
  // prune old terminal entries so the file never grows unbounded
  const cutoff = Date.now() - PRUNE_AFTER_MS;
  const pruned = items.filter(
    (i) => i.status === 'pending' || Date.parse(i.createdAt || '') > cutoff
  );
  fs.mkdirSync(path.dirname(QUEUE_PATH), { recursive: true });
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(pruned, null, 2), 'utf-8');
}

export function schedulePost(p: {
  chat_id: string;
  channelTitle?: string;
  text: string;
  parse_mode?: 'HTML' | 'Markdown';
  kind: ScheduledPost['kind'];
  sendAt: number;
  expiresAt?: number;
  overflow?: number;
}): ScheduledPost {
  const items = load();
  const item: ScheduledPost = {
    id: `SC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    chat_id: p.chat_id,
    channelTitle: p.channelTitle || p.chat_id,
    text: p.text,
    parse_mode: p.parse_mode || 'HTML',
    kind: p.kind,
    sendAt: p.sendAt,
    expiresAt: p.expiresAt,
    overflow: p.overflow ?? 0,
    status: 'pending',
    attempts: 0,
    deferrals: 0,
    createdAt: new Date().toISOString(),
  };
  items.push(item);
  save(items);
  return item;
}

function inQuiet(ch: ChannelProfile, now: Date): boolean {
  if (ch.quiet_start == null || ch.quiet_end == null) return false;
  const hour = now.getUTCHours();
  const qs = ch.quiet_start, qe = ch.quiet_end;
  return qs < qe ? hour >= qs && hour < qe : hour >= qs || hour < qe;
}

/** One dispatch pass — returns how many were sent this pass. */
export async function dispatchDuePosts(): Promise<{ sent: number; deferred: number; failed: number }> {
  const items = load();
  const now = Date.now();
  const pending = items
    .filter((i) => i.status === 'pending' && i.sendAt <= now)
    .sort((a, b) => {
      // Urgency: posts that expire soon (fixture kickoff) jump the queue so
      // pacing can never starve a time-sensitive forecast.
      const ua = a.expiresAt && a.expiresAt - now < 90 * 60 * 1000 ? 0 : 1;
      const ub = b.expiresAt && b.expiresAt - now < 90 * 60 * 1000 ? 0 : 1;
      if (ua !== ub) return ua - ub;
      return a.sendAt - b.sendAt;
    });
  if (pending.length === 0) return { sent: 0, deferred: 0, failed: 0 };

  // Per-channel hourly usage (this queue's own sends in the last 60 min).
  const hourAgo = now - 60 * 60 * 1000;
  const hourlySent: Record<string, number> = {};
  for (const i of items) {
    if (i.status === 'sent' && i.sentAt && Date.parse(i.sentAt) > hourAgo) {
      const key = i.chat_id;
      hourlySent[key] = (hourlySent[key] || 0) + 1;
    }
  }

  let sent = 0;
  let deferred = 0;
  let failed = 0;
  let changed = false;
  const today = new Date().toISOString().slice(0, 10);
  const jitter = (base: number, spread: number) => base + Math.floor(Math.random() * spread);

  for (const item of pending) {
    // Respect the global anti-spam gap but keep working (live posts must not
    // wait a whole tick per channel — sleep out the remainder instead).
    const sinceGlobal = Date.now() - lastGlobalSendAt;
    if (sinceGlobal < GLOBAL_GAP_MS) {
      await new Promise((r) => setTimeout(r, GLOBAL_GAP_MS - sinceGlobal + 50));
    }

    if (item.expiresAt && Date.now() > item.expiresAt) {
      item.status = 'cancelled';
      item.lastError = 'expired (event kickoff passed)';
      changed = true;
      continue;
    }

    const ch = channelsStore.get(item.chat_id);
    if (!ch || !ch.active) {
      item.status = 'cancelled';
      item.lastError = !ch ? 'channel not found' : 'channel inactive';
      changed = true;
      failed++;
      continue;
    }

    const defer = (ms: number, reason: string) => {
      item.deferrals++;
      if (item.deferrals > MAX_DEFERRALS) {
        item.status = 'failed';
        item.lastError = `gave up after ${item.deferrals} deferrals (last: ${reason})`;
        console.warn(`[Scheduler] ✗ gave up → ${item.channelTitle}: ${item.lastError}`);
      } else {
        item.sendAt = Date.now() + ms;
        item.lastError = reason;
      }
      deferred++;
      changed = true;
    };

    if (inQuiet(ch, new Date())) {
      defer(jitter(10 * 60 * 1000, 3 * 60 * 1000), 'quiet hours');
      continue;
    }
    const effCap = ch.daily_cap + (item.overflow || 0);
    const used = ch.daily_reset === today ? ch.daily_used : 0;
    if (used >= effCap) {
      defer(jitter(15 * 60 * 1000, 5 * 60 * 1000), `daily cap ${used}/${effCap}`);
      continue;
    }

    // Time-sensitive (kickoff within 90 min): bypass pacing so a forecast can
    // never be starved into expiry — hard caps/gaps still apply below.
    const urgent = Boolean(item.expiresAt) && item.expiresAt! - Date.now() < 90 * 60 * 1000;

    if (!urgent) {
      // Proportional daily share — spend the day's budget evenly across 24h
      // instead of letting a post-reset backlog drain it in the first hours.
      const dayStart = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
      const elapsedH = (Date.now() - dayStart) / 3_600_000;
      const allowedNow = Math.ceil((effCap * elapsedH) / 24);
      if (used >= allowedNow) {
        const nextAt = dayStart + ((used + 1) * 24 * 3_600_000) / effCap;
        defer(Math.max(60_000, nextAt - Date.now() + jitter(20_000, 40_000)), `daily share ${used}/${allowedNow}`);
        continue;
      }
      // Per-hour smoothing on top of the share (bounds burst size within an hour).
      const hourlyCap = Math.max(1, Math.ceil(effCap / 24));
      const doneThisHour = hourlySent[item.chat_id] || 0;
      if (doneThisHour >= hourlyCap) {
        defer(jitter(8 * 60 * 1000, 6 * 60 * 1000), `hourly pace ${doneThisHour}/${hourlyCap}`);
        continue;
      }
    }

    if (ch.last_post_at && Date.now() - Date.parse(ch.last_post_at) < MIN_CHANNEL_GAP_MS) {
      defer(60 * 1000, 'channel gap');
      continue;
    }

    const result = await sendTelegram(item.chat_id, item.text, item.parse_mode);
    lastGlobalSendAt = Date.now();
    if (result.ok) {
      const deliveredTo = result.sentTo ?? item.chat_id;
      if (process.env.DRY_RUN !== '1') channelsStore.recordPost(deliveredTo);
      hourlySent[deliveredTo] = (hourlySent[deliveredTo] || 0) + 1;
      if (result.sentTo && result.sentTo !== item.chat_id) {
        item.channelTitle = channelsStore.get(result.sentTo)?.title || item.channelTitle;
        item.chat_id = result.sentTo;
      }
      item.status = 'sent';
      item.sentAt = new Date().toISOString();
      sent++;
      changed = true;
      console.log(`[Scheduler] ✓ ${item.kind} → ${item.channelTitle}`);
    } else {
      item.attempts++;
      if (item.attempts >= MAX_ATTEMPTS) {
        item.status = 'failed';
        item.lastError = result.error;
        failed++;
        console.warn(`[Scheduler] ✗ ${item.kind} → ${item.channelTitle} failed: ${result.error}`);
      } else {
        item.sendAt = Date.now() + 5 * 60 * 1000;
        item.lastError = result.error;
        deferred++;
      }
      changed = true;
    }
  }

  if (changed) save(items);
  return { sent, deferred, failed };
}

export function getSchedulerStatus(): any {
  const items = load();
  const now = Date.now();
  const by = (s: ScheduledPost['status']) => items.filter((i) => i.status === s);
  const pending = by('pending').sort((a, b) => a.sendAt - b.sendAt);
  return {
    active: timer != null,
    counts: {
      pending: pending.length,
      due: pending.filter((i) => i.sendAt <= now).length,
      sent24h: by('sent').filter((i) => Date.parse(i.sentAt || '') > now - 86400000).length,
      failed: by('failed').length,
      cancelled: by('cancelled').length,
    },
    next: pending.slice(0, 30).map((i) => ({
      id: i.id,
      kind: i.kind,
      channel: i.channelTitle,
      sendAt: new Date(i.sendAt).toISOString(),
      due: i.sendAt <= now,
      attempts: i.attempts,
      lastError: i.lastError || null,
    })),
  };
}

export function startPostScheduler(intervalSeconds = 60): void {
  stopPostScheduler();
  // First pass shortly after boot so yesterday's/queued items resume quickly.
  setTimeout(() => {
    void dispatchDuePosts().catch((err) => console.warn('[Scheduler] dispatch error:', err.message));
  }, 20 * 1000);
  timer = setInterval(() => {
    void dispatchDuePosts().catch((err) => console.warn('[Scheduler] dispatch error:', err.message));
  }, intervalSeconds * 1000);
  timer.unref?.();
  console.log(`[Scheduler] post dispatcher active — every ${intervalSeconds}s`);
}

export function stopPostScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
