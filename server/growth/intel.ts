import { listLeads, segmentOf, dmStats } from './leadsStore';
import { senderHealth } from './sender';
import { funnelStats } from './funnel';

// =========================================================================
// Intelligence: conversion funnel, per-source ROI, segment/variant splits,
// a daily digest for the admin, and a circuit breaker on dead-rate spikes.
// =========================================================================

export function growthStats(): object {
  const leads = listLeads();
  const now = Date.now();
  const d24 = now - 86400000;
  const recent = leads.filter((l) => l.last_touch_at >= d24);

  const bySegment: Record<string, number> = {};
  const bySource: Record<string, { signals: number; started: number }> = {};
  const byVariant: Record<string, { leads: number; replies: number }> = {};
  const byType = { player: 0, agent: 0, unknown: 0 };
  let hot = 0;
  let withPhone = 0;
  let linkedWeb = 0;
  let needsHuman = 0;

  for (const l of leads) {
    const seg = segmentOf(l);
    bySegment[seg] = (bySegment[seg] || 0) + 1;
    byType[l.type]++;
    if (l.score >= 60) hot++;
    if (l.phone) withPhone++;
    if (l.web_user_id) linkedWeb++;
    if (l.needs_human) needsHuman++;
    const src = l.sources[0] || 'unknown';
    if (!bySource[src]) bySource[src] = { signals: 0, started: 0 };
    bySource[src].signals++;
    if (l.started) bySource[src].started++;
    if (l.ab_group) {
      if (!byVariant[l.ab_group]) byVariant[l.ab_group] = { leads: 0, replies: 0 };
      byVariant[l.ab_group].leads++;
      byVariant[l.ab_group].replies += l.touchpoints.filter((t) => t.kind === 'reply').length;
    }
  }

  const started = leads.filter((l) => l.started).length;
  const engaged = leads.filter((l) => l.status === 'engaged').length;
  const stopped = leads.filter((l) => l.status === 'stopped').length;

  const sh = senderHealth() as any;
  const deadRate24 = sh.dead403 > 0 && sh.sent + sh.dead403 > 0 ? sh.dead403 / (sh.sent + sh.dead403) : 0;

  return {
    totals: {
      leads: leads.length,
      signals_24h: recent.length,
      started,
      engaged,
      stopped,
      dead: sh.dead403,
      hot,
      with_phone: withPhone,
      web_linked: linkedWeb,
      needs_human: needsHuman,
      invites_total: leads.reduce((a, l) => a + l.invites, 0),
    },
    funnel: {
      signal_to_start: started ? Math.round((started / Math.max(1, leads.length)) * 100) : 0,
      started_to_engaged: started ? Math.round((engaged / started) * 100) : 0,
      start_to_phone: started ? Math.round((withPhone / started) * 100) : 0,
    },
    by_segment: bySegment,
    by_type: byType,
    by_source: Object.fromEntries(Object.entries(bySource).sort((a, b) => b[1].signals - a[1].signals).slice(0, 20)),
    by_variant: byVariant,
    delivery: { ...sh, daily_dms: dmStats(), dead_rate_24h: Math.round(deadRate24 * 1000) / 10 },
    funnel_live: funnelStats,
  };
}

/** Circuit breaker: called by the bot loop; true = replies should pause. */
export function shouldPauseReplies(): { pause: boolean; reason?: string } {
  const sh = senderHealth() as any;
  const total = sh.sent + sh.dead403;
  if (total < 20) return { pause: false };
  const deadRate = sh.dead403 / total;
  if (deadRate > 0.1) {
    return { pause: true, reason: `dead rate ${Math.round(deadRate * 100)}% > 10%` };
  }
  return { pause: false };
}

export function buildDailyDigest(): string {
  const s = growthStats() as any;
  const t = s.totals;
  return [
    `📊 ملخص نمو VEX — ${new Date().toISOString().slice(0, 10)}`,
    ``,
    `👥 Leads: ${t.leads} (جديد 24س: ${t.signals_24h})`,
    `🚀 بدأوا /start: ${t.started} | متفاعلين: ${t.engaged}`,
    `🔥 ساخنين: ${t.hot} | وكلاء: ${s.by_type.agent}`,
    `📱 هواتف: ${t.with_phone} | مرتبطين بالموقع: ${t.web_linked}`,
    `📨 إرسال اليوم: ${s.delivery.daily_dms.count} | ميتة 403: ${t.dead}`,
    `🎪 جاكبوت/أحداث: ${s.funnel_live.eventsSent} | drip: ${s.funnel_live.dripsSent}`,
    `👥 دعوات: ${t.invites_total}`,
    `⚠️ يحتاج بشري: ${t.needs_human}`,
    ``,
    `أعلى مصادر: ${Object.entries(s.by_source)
      .slice(0, 3)
      .map(([k, v]: any) => `${k} (${v.signals})`)
      .join(' · ')}`,
  ].join('\n');
}

// --------------------------- timers ---------------------------

let digestTimer: NodeJS.Timeout | null = null;
let notifyAdmin: ((text: string) => void) | null = null;

export function setIntelNotifier(fn: (text: string) => void): void {
  notifyAdmin = fn;
}

export function startIntelTimers(): void {
  if (digestTimer) return;
  const schedule = () => {
    const n = new Date();
    const nxt = new Date(
      Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + (n.getUTCHours() >= 12 ? 1 : 0), 12, 0, 0)
    );
    const wait = Math.max(60000, nxt.getTime() - n.getTime());
    digestTimer = setTimeout(() => {
      try {
        notifyAdmin?.(buildDailyDigest());
      } catch {}
      schedule();
    }, wait);
    digestTimer.unref?.();
  };
  schedule();
  console.log('[Growth] daily digest scheduled at 12:00 UTC');
}

export function stopIntelTimers(): void {
  if (digestTimer) {
    clearTimeout(digestTimer);
    digestTimer = null;
  }
}
