import {
  listLeads,
  getSettings,
  addTouch,
  bumpInterest,
  goldenHour,
  Lead,
} from './leadsStore';
import { sendGrowthDm } from './sender';
import { generateDripCopy, PLAYER_STEPS, AGENT_STEPS } from './brain';

// =========================================================================
// The Funnel: branch-aware drip that decides WHO gets WHAT and WHEN.
// Steps are measured from first_seen_at; delivery waits for the lead's
// golden hour (their peak activity hour) with a 12h grace, then sends.
// Only leads with started=true are ever DM'd (Telegram rule).
// =========================================================================

const TICK_MS = 5 * 60 * 1000;
let timer: NodeJS.Timeout | null = null;

let lotteryProvider: (() => { jackpotAmount: number } | null) | null = null;
let lastJackpotMilestone = -1;
let lastDigestDay = '';

export const funnelStats = { dripsSent: 0, eventsSent: 0 };

/** server.ts injects a reader for the live lottery state (avoids circular import). */
export function setLotteryProvider(fn: () => { jackpotAmount: number } | null): void {
  lotteryProvider = fn;
}

export function startFunnel(): void {
  if (timer) return;
  timer = setInterval(() => {
    void funnelTick();
  }, TICK_MS);
  timer.unref?.();
  console.log('[Growth] funnel scheduler active — every 5 min');
}

export function stopFunnel(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function sameUtcDay(a: number, b: number): boolean {
  return new Date(a).toISOString().slice(0, 10) === new Date(b).toISOString().slice(0, 10);
}

export async function funnelTick(): Promise<void> {
  const settings = getSettings();
  const now = Date.now();
  if (settings.drip_enabled) {
    for (const lead of listLeads()) {
      try {
        await maybeSendDrip(lead, now);
      } catch (err: any) {
        console.warn('[Growth] drip error', lead.id, err?.message);
      }
    }
  }
  checkJackpotMilestone(now);
}

async function maybeSendDrip(lead: Lead, now: number): Promise<void> {
  if (!lead.started) return;
  if (lead.status === 'stopped' || lead.status === 'dead') return;
  const steps = lead.type === 'agent' ? AGENT_STEPS : PLAYER_STEPS;
  const idx = lead.drip_step;
  if (idx >= steps.length) return;
  const step = steps[idx];
  const dueAt = lead.first_seen_at + step.afterHours * 3600000;
  if (now < dueAt) return;
  if (lead.drip_last_at && sameUtcDay(lead.drip_last_at, now)) return;

  // golden-hour gate: with real histogram data, wait up to 12h for their peak
  const activityTotal = lead.active_hours.reduce((a, b) => a + b, 0);
  const graceMs = now - dueAt;
  if (activityTotal >= 3 && graceMs < 12 * 3600000) {
    const hour = new Date(now).getUTCHours();
    const peak = goldenHour(lead);
    if (hour !== peak && (peak + 23) % 24 !== hour) return;
  }

  const copy = await generateDripCopy(step.key, lead, lead.ab_group);
  const text = `${copy.title}\n\n${copy.body}`;
  const ok = await sendGrowthDm(lead.tg_user_id, text, lead.id);
  if (ok) {
    lead.drip_sent.push(step.key);
    lead.drip_step = idx + 1;
    lead.drip_last_at = now;
    addTouch(lead.tg_user_id, 'drip', step.key, 'funnel');
    bumpInterest(lead.tg_user_id, step.interest, 1);
    funnelStats.dripsSent++;
  }
}

// --------------------------- event triggers ---------------------------

/** Jackpot milestone: when the pot crosses a 10k step, notify warm lottery fans. */
function checkJackpotMilestone(now: number): void {
  const state = lotteryProvider?.();
  if (!state || typeof state.jackpotAmount !== 'number') return;
  const milestone = Math.floor(state.jackpotAmount / 10000);
  if (lastJackpotMilestone === -1) {
    lastJackpotMilestone = milestone;
    return;
  }
  if (milestone <= lastJackpotMilestone) return;
  lastJackpotMilestone = milestone;

  const potLabel = Math.round(state.jackpotAmount).toLocaleString('en-US');
  const targets = listLeads()
    .filter(
      (l) =>
        l.started &&
        l.status !== 'stopped' &&
        l.status !== 'dead' &&
        l.interests.lottery >= 15 &&
        !sameUtcDay(l.drip_last_at, now) &&
        now - l.last_touch_at < 14 * 86400000
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 60);

  void (async () => {
    for (const lead of targets) {
      const text = `🎰 الجاكبوت وصل ${potLabel} — لسه في فرصتك اليوم.\nhttps://vex.deals/#lottery`;
      const ok = await sendGrowthDm(lead.tg_user_id, text, lead.id);
      if (ok) {
        addTouch(lead.tg_user_id, 'campaign', 'jackpot_milestone', 'event');
        bumpInterest(lead.tg_user_id, 'lottery', 2);
        funnelStats.eventsSent++;
      }
      await new Promise((r) => setTimeout(r, 2000)); // gentle spread
    }
  })();
}

export { lastDigestDay };
