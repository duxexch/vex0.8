import * as fs from 'fs';
import * as path from 'path';

// =========================================================================
// Telegram Web outbox: the Node server hands outbound DMs to a HOST-side
// Playwright worker (/opt/loginsrv/tg_web_worker.py) that drives the admin's
// own logged-in Telegram Web session (profile-telegram) — the transport the
// owner chose. The contract is file-based through the shared data/ mount:
//
//   data/tg_web_outbox/pending/*.json  → server writes, worker claims+reads
//   data/tg_web_outbox/sent/*.json     → worker moves after delivery
//   data/tg_web_outbox/failed/*.json   → worker moves with the error
//   data/tg_web_outbox/safety.json     → ramp cap + halt state (worker-owned)
//   data/tg_web_outbox/worker_status.json → heartbeat written by the worker
//
// Same managed-manual philosophy as the WhatsApp track: warm-up ramp, hard
// daily cap, instant halt, and the server NEVER sends on its own — it only
// queues. A target is either a numeric tg id (`tg:<id>`) or a phone number
// (`phone:+201...`) resolved through the session's contacts.
// =========================================================================

const DATA_DIR = path.join(process.cwd(), 'data');
const TG_OUT_DIR = path.join(DATA_DIR, 'tg_web_outbox');
const PENDING_DIR = path.join(TG_OUT_DIR, 'pending');
const SENT_DIR = path.join(TG_OUT_DIR, 'sent');
const FAILED_DIR = path.join(TG_OUT_DIR, 'failed');
const SAFETY_PATH = path.join(TG_OUT_DIR, 'safety.json');
const WORKER_STATUS_PATH = path.join(TG_OUT_DIR, 'worker_status.json');

export interface TgWebMessage {
  id: string;
  target: string; // `q:<search query>` — @username or chat-title fragment
  text: string;
  kind: 'campaign' | 'manual' | 'binding';
  lead_id?: string;
  campaign_id?: string;
  created_at: number;
  sent_at?: number;
  error?: string;
}

export interface TgWebSafety {
  warmup_start: string;
  halted: boolean;
  halt_reason?: string;
  daily_cap: number;
  batch_size: number;
  gap_min_s: number;
  gap_max_s: number;
  total_sent: number;
  total_failed: number;
}

export interface TgWorkerStatus {
  state: 'running' | 'stopped' | 'error';
  last_beat: number;
  logged_in?: boolean;
  bot_username?: string;
  message?: string;
}

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

// ------------------------------ safety policy ------------------------------

const RAMP_DAYS = 14; // warm-up: day N allows batch_size*N sends

export function tgWebSafetyState(): TgWebSafety {
  const s = readJson<Partial<TgWebSafety>>(SAFETY_PATH, {});
  return {
    warmup_start: s.warmup_start || '',
    halted: !!s.halted,
    halt_reason: s.halt_reason || '',
    daily_cap: Number(s.daily_cap) || 25,
    batch_size: Number(s.batch_size) || 5,
    gap_min_s: Number(s.gap_min_s) || 45,
    gap_max_s: Number(s.gap_max_s) || 150,
    total_sent: Number(s.total_sent) || 0,
    total_failed: Number(s.total_failed) || 0,
  };
}

function saveSafety(patch: Partial<TgWebSafety>): TgWebSafety {
  const next = { ...tgWebSafetyState(), ...patch };
  writeJson(SAFETY_PATH, next);
  return next;
}

function warmupDay(safety: TgWebSafety): number {
  if (!safety.warmup_start) return 1;
  const start = new Date(safety.warmup_start + 'T00:00:00Z').getTime();
  const now = new Date().toISOString().slice(0, 10);
  const today = new Date(now + 'T00:00:00Z').getTime();
  return Math.min(RAMP_DAYS, Math.floor((today - start) / 86400000) + 1);
}

/** Sends allowed today = min(daily_cap, batch_size × warm-up day). */
export function tgWebAllowance(): { allowed: number; used: number; remaining: number; warmup_day: number; safety: TgWebSafety } {
  const safety = tgWebSafetyState();
  const day = warmupDay(safety);
  const allowed = Math.min(safety.daily_cap, safety.batch_size * day);
  const used = listTgWebMessages('sent').filter((m) => {
    if (!m.sent_at) return false;
    return new Date(m.sent_at).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
  }).length;
  return { allowed, used, remaining: Math.max(0, allowed - used), warmup_day: day, safety };
}

// ------------------------------ queue access ------------------------------

function ensureDirs(): void {
  fs.mkdirSync(PENDING_DIR, { recursive: true });
  fs.mkdirSync(SENT_DIR, { recursive: true });
  fs.mkdirSync(FAILED_DIR, { recursive: true });
}

export function listTgWebMessages(bucket: 'pending' | 'sent' | 'failed'): TgWebMessage[] {
  const dir = { pending: PENDING_DIR, sent: SENT_DIR, failed: FAILED_DIR }[bucket];
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => readJson<TgWebMessage | null>(path.join(dir, f), null))
      .filter((m): m is TgWebMessage => !!m && !!m.id);
  } catch {
    return [];
  }
}

export function tgWebStats(): object {
  const allowance = tgWebAllowance();
  const worker = readJson<TgWorkerStatus>(WORKER_STATUS_PATH, { state: 'stopped', last_beat: 0 });
  const worker_stale = !worker.last_beat || Date.now() - worker.last_beat > 5 * 60 * 1000;
  return {
    pending: listTgWebMessages('pending').length,
    sent_total: listTgWebMessages('sent').length,
    failed_total: listTgWebMessages('failed').length,
    sent_today: allowance.used,
    allowed_today: allowance.allowed,
    remaining_today: allowance.remaining,
    warmup_day: allowance.warmup_day,
    safety: allowance.safety,
    worker: worker_stale ? { ...worker, state: worker.state === 'running' ? 'stopped' : worker.state } : worker,
  };
}

/** Queue one message. Honours halt + daily allowance at enqueue time. */
export function queueTgWebMessage(input: {
  target: string;
  text: string;
  kind?: TgWebMessage['kind'];
  lead_id?: string;
  campaign_id?: string;
}): { queued: boolean; reason?: string; id?: string } {
  const safety = tgWebSafetyState();
  if (safety.halted) return { queued: false, reason: 'halted' };
  const target = String(input.target || '').trim();
  const text = String(input.text || '').trim().slice(0, 3500);
  if (!text) return { queued: false, reason: 'empty_text' };
  // Telegram Web cannot open a chat by numeric id or cold-phone (proven). The
  // only reliable way to reach an EXISTING chat is a search query: the worker
  // types it in the search box and clicks the first matching row. So the target
  // is `q:<query>` (a @username or chat title fragment).
  const isQuery = target.startsWith('q:') && target.length >= 3 && target.length <= 80;
  if (!isQuery) return { queued: false, reason: 'bad_target' };

  ensureDirs();
  const id = `tgw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const msg: TgWebMessage = {
    id,
    target,
    text,
    kind: input.kind || 'manual',
    lead_id: input.lead_id,
    campaign_id: input.campaign_id,
    created_at: Date.now(),
  };
  writeJson(path.join(PENDING_DIR, `${id}.json`), msg);
  return { queued: true, id };
}

/** Queue many — bounded by the remaining daily allowance. */
export function queueTgWebBatch(
  items: { target: string; text: string; kind?: TgWebMessage['kind']; lead_id?: string; campaign_id?: string }[]
): { queued: number; skipped: number; reason?: string } {
  const safety = tgWebSafetyState();
  if (safety.halted) return { queued: 0, skipped: items.length, reason: 'halted' };
  const { remaining } = tgWebAllowance();
  let queued = 0;
  let skipped = 0;
  for (const item of items.slice(0, remaining)) {
    const r = queueTgWebMessage(item);
    if (r.queued) queued++;
    else skipped++;
  }
  skipped += Math.max(0, items.length - remaining);
  return { queued, skipped, reason: remaining === 0 ? 'daily_cap' : undefined };
}

// --------------------------- admin control ops ----------------------------

export function tgWebHalt(reason: string): TgWebSafety {
  return saveSafety({ halted: true, halt_reason: String(reason || 'manual halt').slice(0, 200) });
}

export function tgWebResume(): TgWebSafety {
  // Restart the warm-up ramp from day 1 — same policy as the WhatsApp track.
  const today = new Date().toISOString().slice(0, 10);
  return saveSafety({ halted: false, halt_reason: '', warmup_start: today });
}

export function tgWebUpdateSafety(patch: Partial<Pick<TgWebSafety, 'daily_cap' | 'batch_size' | 'gap_min_s' | 'gap_max_s'>>): TgWebSafety {
  const clean: Partial<TgWebSafety> = {};
  if (patch.daily_cap !== undefined) clean.daily_cap = Math.max(1, Math.min(200, Number(patch.daily_cap) || 25));
  if (patch.batch_size !== undefined) clean.batch_size = Math.max(1, Math.min(50, Number(patch.batch_size) || 5));
  if (patch.gap_min_s !== undefined) clean.gap_min_s = Math.max(10, Math.min(900, Number(patch.gap_min_s) || 45));
  if (patch.gap_max_s !== undefined) clean.gap_max_s = Math.max(clean.gap_min_s || 45, Math.min(1800, Number(patch.gap_max_s) || 150));
  return saveSafety(clean);
}

/** Start the warm-up clock (first run) without touching the halt flag. */
export function tgWebEnsureWarmup(): TgWebSafety {
  const safety = tgWebSafetyState();
  if (safety.warmup_start) return safety;
  return saveSafety({ warmup_start: new Date().toISOString().slice(0, 10) });
}
