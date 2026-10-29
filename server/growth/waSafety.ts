import * as fs from 'fs';
import * as path from 'path';

// =========================================================================
// WhatsApp safety policy — the hard limits for managed-manual outreach.
//
// Red line: the system NEVER sends automatically from a personal account.
// This module only decides HOW MANY contacts today's outbox may contain,
// and whether outreach is allowed at all (global halt after a ban report).
//
// Warm-up ramp (days since the first ever batch):
//   day 1-3   →  3/day    new number, low volume
//   day 4-7   →  6/day
//   day 8-14  → 10/day
//   day 15+   → 15/day    hard ceiling, never above this
// A ban report halts everything; resuming restarts the ramp from day 1 —
// after a scare the number must re-warm slowly.
// =========================================================================

const DATA_DIR = path.join(process.cwd(), 'data');
const SAFETY_PATH = path.join(DATA_DIR, 'wa_safety.json');

export interface WaSafetyState {
  /** YYYY-MM-DD of the first batch ever built (ramp reference). */
  warmup_start: string;
  /** Global stop — set by a ban/block report, cleared only by explicit resume. */
  halted: boolean;
  halted_at?: number;
  halt_reason?: string;
  /** How many outboxes have been built (observability). */
  batches_built: number;
  /** Total contacts ever marked sent (all time). */
  total_sent: number;
}

function readState(): WaSafetyState {
  try {
    if (fs.existsSync(SAFETY_PATH)) {
      const s = JSON.parse(fs.readFileSync(SAFETY_PATH, 'utf-8'));
      return {
        warmup_start: typeof s.warmup_start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.warmup_start)
          ? s.warmup_start
          : new Date().toISOString().slice(0, 10),
        halted: !!s.halted,
        halted_at: typeof s.halted_at === 'number' ? s.halted_at : undefined,
        halt_reason: typeof s.halt_reason === 'string' ? s.halt_reason : undefined,
        batches_built: Number(s.batches_built) || 0,
        total_sent: Number(s.total_sent) || 0,
      };
    }
  } catch {}
  return {
    warmup_start: new Date().toISOString().slice(0, 10),
    halted: false,
    batches_built: 0,
    total_sent: 0,
  };
}

function writeState(s: WaSafetyState): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SAFETY_PATH, JSON.stringify(s, null, 2), 'utf-8');
}

/** 1-based day number of the warm-up ramp. */
export function waWarmupDay(): number {
  const s = readState();
  const start = new Date(s.warmup_start + 'T00:00:00Z').getTime();
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date(today + 'T00:00:00Z').getTime();
  return Math.max(1, Math.floor((now - start) / 86400000) + 1);
}

/** Hard daily cap for today's outbox — ramped, never above 15. */
export function waDailyCap(): number {
  const day = waWarmupDay();
  if (day <= 3) return 3;
  if (day <= 7) return 6;
  if (day <= 14) return 10;
  return 15;
}

/** How many contacts were actually marked sent today (UTC). */
export function waSentToday(sentTimestamps: number[]): number {
  const today = new Date().toISOString().slice(0, 10);
  const dayStart = new Date(today + 'T00:00:00Z').getTime();
  return sentTimestamps.filter((t) => typeof t === 'number' && t >= dayStart).length;
}

/**
 * Today's remaining allowance: cap minus already-sent-today, never below 0.
 * This is the number the outbox builder must clamp to.
 */
export function waRemainingToday(sentTimestamps: number[]): number {
  if (readState().halted) return 0;
  return Math.max(0, waDailyCap() - waSentToday(sentTimestamps));
}

/** Global halt — a ban/block report stops every outbox until resume. */
export function haltOutreach(reason: string): WaSafetyState {
  const s = readState();
  s.halted = true;
  s.halted_at = Date.now();
  s.halt_reason = String(reason || 'ban report').slice(0, 200);
  writeState(s);
  console.warn(`[Growth][WA] OUTREACH HALTED: ${s.halt_reason}`);
  return s;
}

/**
 * Resume after a halt — the ramp restarts from day 1 (cap 3/day):
 * after a ban scare the number must re-warm slowly.
 */
export function resumeOutreach(): WaSafetyState {
  const s = readState();
  s.halted = false;
  delete s.halted_at;
  delete s.halt_reason;
  s.warmup_start = new Date().toISOString().slice(0, 10);
  writeState(s);
  console.log('[Growth][WA] outreach resumed — warm-up ramp restarted (day 1)');
  return s;
}

/** Called after each outbox build / batch mark to keep counters fresh. */
export function waSafetyTouch(built: number, sentDelta: number): void {
  const s = readState();
  s.batches_built += Math.max(0, built);
  s.total_sent += Math.max(0, sentDelta);
  writeState(s);
}

/** Full policy snapshot for the admin panel + outbox header. */
export function waSafetyState(): {
  halted: boolean;
  halted_at?: string;
  halt_reason?: string;
  warmup_day: number;
  daily_cap: number;
  max_daily_cap: 15;
  min_gap_min: 5;
  max_gap_min: 10;
  batches_built: number;
  total_sent: number;
} {
  const s = readState();
  return {
    halted: s.halted,
    halted_at: s.halted_at ? new Date(s.halted_at).toISOString() : undefined,
    halt_reason: s.halt_reason,
    warmup_day: waWarmupDay(),
    daily_cap: waDailyCap(),
    max_daily_cap: 15,
    min_gap_min: 5,
    max_gap_min: 10,
    batches_built: s.batches_built,
    total_sent: s.total_sent,
  };
}
