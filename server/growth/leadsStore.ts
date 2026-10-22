import * as fs from 'fs';
import * as path from 'path';

// =========================================================================
// Lead profile store — one living profile per Telegram user: identity,
// attribution chain, behavior (signals/hours), interest weights, heat score,
// drip state and capped touchpoint timeline.
// =========================================================================

const DATA_DIR = path.join(process.cwd(), 'data');
const LEADS_PATH = path.join(DATA_DIR, 'leads.json');
const SETTINGS_PATH = path.join(DATA_DIR, 'growth_settings.json');
const DROPS_PATH = path.join(DATA_DIR, 'growth_drops.json');

export interface LeadTouch {
  at: number;
  kind: 'signal' | 'start' | 'reply' | 'drip' | 'campaign' | 'drop' | 'contact' | 'invite';
  detail?: string;
  source?: string;
}

export interface Lead {
  id: string;
  tg_user_id: number;
  username?: string;
  first_name?: string;
  phone?: string;
  web_user_id?: string;
  lang: string;
  type: 'player' | 'agent' | 'unknown';
  status: 'new' | 'engaged' | 'stopped' | 'dead';
  started: boolean; // must be true before ANY DM (Telegram rule)
  score: number;
  interests: { lottery: number; predictions: number; cashback: number; agents: number };
  source: string;
  sources: string[];
  active_hours: number[]; // 24-bucket histogram of their activity
  first_seen_at: number;
  last_touch_at: number;
  drip_step: number;
  drip_last_at: number;
  drip_sent: string[];
  last_campaign_at?: number;
  ab_group?: string;
  invites: number;
  group_replies: Record<string, number>; // chatId -> last reply ts (cooldown)
  last_signal?: string;
  needs_human?: boolean;
  notes?: string;
  touchpoints: LeadTouch[]; // capped
  // outreach module (WhatsApp managed manual track + per-client intelligence)
  channel?: 'tg' | 'wa_import';
  mood?: 'positive' | 'neutral' | 'negative';
  mood_at?: number;
  last_inbound?: string;
  intents?: Record<string, number>;
  imported_at?: number;
  wa_status?: 'pending' | 'queued' | 'sent' | 'skipped';
  wa_batch?: string;
  wa_sent_at?: number;
}

export interface GrowthSettings {
  listen_enabled: boolean;
  auto_reply: boolean;
  prediction_drops: boolean;
  drip_enabled: boolean;
  campaigns_enabled: boolean;
  reply_cooldown_min: number; // per user per group
  drop_cooldown_min: number; // per group per match
  max_drip_per_day: number;
  daily_send_cap: number; // global safety cap for growth DMs/day
  extra_keywords: string[];
  admin_tg_id?: number;
}

export const DEFAULT_SETTINGS: GrowthSettings = {
  listen_enabled: true,
  auto_reply: true,
  prediction_drops: true,
  drip_enabled: true,
  campaigns_enabled: true,
  reply_cooldown_min: 360,
  drop_cooldown_min: 720,
  max_drip_per_day: 1,
  daily_send_cap: 400,
  extra_keywords: [],
};

const MAX_TOUCHPOINTS = 80;
const MAX_LEADS = 20000;

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

let leadsCache: Lead[] | null = null;

function loadLeads(): Lead[] {
  if (!leadsCache) {
    const raw = readJson<{ leads: Lead[] }>(LEADS_PATH, { leads: [] });
    leadsCache = Array.isArray(raw.leads) ? raw.leads : [];
  }
  return leadsCache;
}

function saveLeads(): void {
  const leads = loadLeads();
  // prune: dead/stopped older than 90 days go first, then oldest touch
  if (leads.length > MAX_LEADS) {
    const cutoff = Date.now() - 90 * 86400000;
    const kept = leads
      .filter((l) => !((l.status === 'dead' || l.status === 'stopped') && l.last_touch_at < cutoff))
      .sort((a, b) => b.last_touch_at - a.last_touch_at)
      .slice(0, MAX_LEADS);
    leadsCache = kept;
  }
  writeJson(LEADS_PATH, { leads: leadsCache });
}

export function leadId(tgUserId: number): string {
  return `tg_${tgUserId}`;
}

export function getLead(tgUserId: number): Lead | undefined {
  return loadLeads().find((l) => l.tg_user_id === tgUserId);
}

export function listLeads(): Lead[] {
  return loadLeads();
}

export function upsertLead(partial: Partial<Lead> & { tg_user_id: number }): Lead {
  const leads = loadLeads();
  const id = leadId(partial.tg_user_id);
  let lead = leads.find((l) => l.id === id);
  const now = Date.now();
  if (!lead) {
    lead = {
      id,
      tg_user_id: partial.tg_user_id,
      lang: 'ar',
      type: 'unknown',
      status: 'new',
      started: false,
      score: 0,
      interests: { lottery: 0, predictions: 0, cashback: 0, agents: 0 },
      source: partial.source || 'unknown',
      sources: partial.source ? [partial.source] : [],
      active_hours: new Array(24).fill(0),
      first_seen_at: now,
      last_touch_at: now,
      drip_step: 0,
      drip_last_at: 0,
      drip_sent: [],
      invites: 0,
      group_replies: {},
      touchpoints: [],
    };
    leads.push(lead);
  }
  // merge
  if (partial.username !== undefined) lead.username = partial.username;
  if (partial.first_name !== undefined) lead.first_name = partial.first_name;
  if (partial.phone && !lead.phone) lead.phone = partial.phone;
  if (partial.web_user_id && !lead.web_user_id) lead.web_user_id = partial.web_user_id;
  if (partial.lang && partial.lang !== 'ar') lead.lang = partial.lang;
  if (partial.type && lead.type === 'unknown') lead.type = partial.type;
  if (partial.type === 'agent') lead.type = 'agent';
  if (partial.status) lead.status = partial.status;
  if (partial.started) lead.started = true;
  if (partial.last_campaign_at) lead.last_campaign_at = partial.last_campaign_at;
  if (partial.ab_group && !lead.ab_group) lead.ab_group = partial.ab_group;
  if (partial.source && !lead.sources.includes(partial.source)) {
    lead.sources.push(partial.source);
    if (lead.sources.length === 1) lead.source = partial.source;
  }
  if (partial.last_signal) lead.last_signal = partial.last_signal.slice(0, 300);
  if (partial.needs_human) lead.needs_human = true;
  if (partial.notes) lead.notes = partial.notes;
  lead.last_touch_at = now;
  recomputeScore(lead);
  saveLeads();
  return lead;
}

/** Atomic multi-field mutation on the cached leads array (persisted at end). */
export function mutateLeads(fn: (leads: Lead[]) => void): void {
  fn(loadLeads());
  saveLeads();
}

export function addTouch(
  tgUserId: number,
  kind: LeadTouch['kind'],
  detail?: string,
  source?: string
): void {
  const leads = loadLeads();
  const lead = leads.find((l) => l.tg_user_id === tgUserId);
  if (!lead) return;
  const now = Date.now();
  lead.touchpoints.push({ at: now, kind, detail: detail?.slice(0, 200), source });
  if (lead.touchpoints.length > MAX_TOUCHPOINTS) {
    lead.touchpoints = lead.touchpoints.slice(-MAX_TOUCHPOINTS);
  }
  lead.active_hours[new Date(now).getUTCHours()]++;
  lead.last_touch_at = now;
  if (kind === 'signal' || kind === 'reply' || kind === 'invite') {
    lead.status = lead.status === 'new' ? 'engaged' : lead.status;
  }
  recomputeScore(lead);
  saveLeads();
}

export function bumpInterest(tgUserId: number, key: keyof Lead['interests'], by = 1): void {
  const lead = getLead(tgUserId);
  if (!lead) return;
  lead.interests[key] = Math.min(20, lead.interests[key] + by);
  recomputeScore(lead);
  saveLeads();
}

export function markDead(tgUserId: number): void {
  const lead = getLead(tgUserId);
  if (!lead) return;
  lead.status = 'dead';
  lead.started = false; // never DM again
  saveLeads();
}

export function stopLead(tgUserId: number): void {
  const lead = getLead(tgUserId);
  if (!lead) return;
  lead.status = 'stopped';
  saveLeads();
}

export function linkPhone(tgUserId: number, phone: string): void {
  upsertLead({ tg_user_id: tgUserId, phone });
}

export function linkWebUser(tgUserId: number, webUserId: string): void {
  upsertLead({ tg_user_id: tgUserId, web_user_id: webUserId });
}

export function recomputeScore(lead: Lead): void {
  let s = 0;
  if (lead.started) s += 15;
  if (lead.phone) s += 10;
  if (lead.web_user_id) s += 10;
  s += Math.min(20, lead.touchpoints.filter((t) => t.kind === 'signal').length * 4);
  s += Math.min(18, lead.touchpoints.filter((t) => t.kind === 'reply').length * 6);
  s += Math.min(10, lead.touchpoints.filter((t) => t.kind === 'invite').length * 5);
  s += lead.invites * 3;
  const interestSum = Object.values(lead.interests).reduce((a, b) => a + b, 0);
  s += Math.min(15, Math.round(interestSum * 1.2));
  // recency: decay if silent > 7 days
  const idleDays = (Date.now() - lead.last_touch_at) / 86400000;
  if (idleDays > 14) s = Math.round(s * 0.6);
  else if (idleDays > 7) s = Math.round(s * 0.8);
  lead.score = Math.max(0, Math.min(100, s));
}

export type Segment = 'hot_player' | 'warm_player' | 'cold' | 'agent' | 'whale' | 'dormant' | 'dead';

export function segmentOf(lead: Lead): Segment {
  if (lead.status === 'dead') return 'dead';
  if (lead.status === 'stopped') return 'dormant';
  if (lead.type === 'agent') return lead.score >= 50 ? 'hot_player' : 'agent'; // agent shown as agent
  const idleDays = (Date.now() - lead.last_touch_at) / 86400000;
  if (lead.score >= 60) return 'whale';
  if (lead.score >= 40) return 'hot_player';
  if (lead.score >= 20 || (lead.started && idleDays < 7)) return 'warm_player';
  if (idleDays > 21) return 'dormant';
  return 'cold';
}

export function goldenHour(lead: Lead): number {
  let best = 19;
  let bestV = -1;
  lead.active_hours.forEach((v, h) => {
    if (v > bestV) {
      bestV = v;
      best = h;
    }
  });
  return bestV > 0 ? best : 19;
}

// ------------------------- settings -------------------------

export function getSettings(): GrowthSettings {
  const s = readJson<Partial<GrowthSettings>>(SETTINGS_PATH, {});
  return { ...DEFAULT_SETTINGS, ...s };
}

export function saveSettings(patch: Partial<GrowthSettings>): GrowthSettings {
  const next = { ...getSettings(), ...patch };
  writeJson(SETTINGS_PATH, next);
  return next;
}

// ------------------- prediction drop cooldowns -------------------

export function dropSeen(key: string): boolean {
  const drops = readJson<Record<string, number>>(DROPS_PATH, {});
  const ts = drops[key];
  const cd = getSettings().drop_cooldown_min * 60000;
  return !!ts && Date.now() - ts < cd;
}

export function markDrop(key: string): void {
  const drops = readJson<Record<string, number>>(DROPS_PATH, {});
  drops[key] = Date.now();
  const keys = Object.keys(drops);
  if (keys.length > 500) {
    const cutoff = Date.now() - 3 * 86400000;
    for (const k of keys) if (drops[k] < cutoff) delete drops[k];
  }
  writeJson(DROPS_PATH, drops);
}

// ------------------- daily send counters (in-memory) -------------------

const dailySent: { date: string; count: number; perLead: Record<string, number> } = {
  date: '',
  count: 0,
  perLead: {},
};

export function canSendDm(leadIdStr: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (dailySent.date !== today) {
    dailySent.date = today;
    dailySent.count = 0;
    dailySent.perLead = {};
  }
  const settings = getSettings();
  if (dailySent.count >= settings.daily_send_cap) return false;
  if ((dailySent.perLead[leadIdStr] || 0) >= settings.max_drip_per_day + 3) return false; // hard ceiling
  return true;
}

export function recordDm(leadIdStr: string): void {
  const today = new Date().toISOString().slice(0, 10);
  if (dailySent.date !== today) {
    dailySent.date = today;
    dailySent.count = 0;
    dailySent.perLead = {};
  }
  dailySent.count++;
  dailySent.perLead[leadIdStr] = (dailySent.perLead[leadIdStr] || 0) + 1;
}

export function dmStats(): { date: string; count: number } {
  return { date: dailySent.date, count: dailySent.count };
}

// ------------------- inbound intelligence (per-client opinions) -------------------

export function setInbound(
  tgUserId: number,
  mood: 'positive' | 'negative' | 'neutral',
  text: string,
  intent?: string
): void {
  mutateLeads((leads) => {
    const lead = leads.find((l) => l.tg_user_id === tgUserId);
    if (!lead) return;
    lead.mood = mood;
    lead.mood_at = Date.now();
    lead.last_inbound = text.slice(0, 300);
    if (intent) {
      lead.intents = lead.intents || {};
      lead.intents[intent] = (lead.intents[intent] || 0) + 1;
    }
  });
}

// ------------------- WhatsApp imported contacts (managed manual outreach) -------------------

function normPhone(phone: string): string {
  let n = (phone || '').replace(/[^\d+]/g, '').replace(/\+/g, '');
  if (n.startsWith('00')) n = n.slice(2);
  return n;
}

function phoneKey(phone: string): string {
  const digits = normPhone(phone).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits.replace(/^0+/, '');
}

function waTgId(phone: string): number {
  const key = phoneKey(phone);
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return -(Math.abs(h) % 1000000000) - 1;
}

export function upsertWaContact(
  rows: { name?: string; phone?: string; note?: string }[],
  source = 'wa_import'
): { created: number; merged: number; skipped: number } {
  const leads = loadLeads();
  const now = Date.now();
  let created = 0;
  let merged = 0;
  let skipped = 0;
  for (const r of rows) {
    const phone = normPhone(r.phone || '');
    if (phone.replace(/\D/g, '').length < 8) {
      skipped++;
      continue;
    }
    const key = phoneKey(phone);
    let lead = leads.find((l) => l.phone && phoneKey(l.phone) === key);
    if (lead) {
      if (!lead.channel) lead.channel = 'wa_import';
      if (r.name && !lead.first_name) lead.first_name = r.name.slice(0, 60);
      if (r.note) lead.notes = ((lead.notes ? lead.notes + ' | ' : '') + r.note).slice(0, 300);
      if (!lead.sources.includes(source)) lead.sources.push(source);
      if (!lead.imported_at) lead.imported_at = now;
      if (!lead.wa_status) lead.wa_status = 'pending';
      merged++;
      continue;
    }
    const tgId = waTgId(phone);
    if (leads.some((l) => l.tg_user_id === tgId)) {
      skipped++;
      continue;
    }
    leads.push({
      id: `wa_${key}`,
      tg_user_id: tgId,
      first_name: (r.name || '').slice(0, 60) || undefined,
      phone,
      lang: 'ar',
      type: 'unknown',
      status: 'new',
      started: false,
      score: 0,
      interests: { lottery: 0, predictions: 0, cashback: 0, agents: 0 },
      source,
      sources: [source],
      active_hours: new Array(24).fill(0),
      first_seen_at: now,
      last_touch_at: now,
      drip_step: 0,
      drip_last_at: 0,
      drip_sent: [],
      invites: 0,
      group_replies: {},
      channel: 'wa_import',
      imported_at: now,
      wa_status: 'pending',
      notes: r.note?.slice(0, 300),
      touchpoints: [{ at: now, kind: 'contact', detail: 'imported', source }],
    });
    created++;
  }
  leadsCache = leads;
  saveLeads();
  return { created, merged, skipped };
}

export function listWaContacts(status?: string): Lead[] {
  return loadLeads().filter(
    (l) => l.channel === 'wa_import' && (!status || l.wa_status === (status as any))
  );
}

export function markWa(phones: string[], status: 'sent' | 'skipped'): number {
  let n = 0;
  mutateLeads((leads) => {
    const now = Date.now();
    for (const p of phones) {
      const key = phoneKey(p);
      const lead = leads.find((l) => l.phone && phoneKey(l.phone) === key);
      if (lead && lead.wa_status !== 'sent' && lead.wa_status !== 'skipped') {
        lead.wa_status = status;
        if (status === 'sent') lead.wa_sent_at = now;
        lead.last_touch_at = now;
        lead.touchpoints.push({ at: now, kind: 'campaign', detail: `wa_${status}` });
        if (lead.touchpoints.length > MAX_TOUCHPOINTS) {
          lead.touchpoints = lead.touchpoints.slice(-MAX_TOUCHPOINTS);
        }
        n++;
      }
    }
  });
  return n;
}

/** Pending contacts for the next manual batch; stale queued (unsent) roll back to pending. */
export function waQueueForBatch(limit: number): Lead[] {
  const today = new Date().toISOString().slice(0, 10);
  const leads = loadLeads();
  for (const l of leads) {
    if (l.channel === 'wa_import' && l.wa_status === 'queued' && l.wa_batch !== today) {
      l.wa_status = 'pending';
    }
  }
  saveLeads();
  return leads
    .filter((l) => l.channel === 'wa_import' && l.wa_status === 'pending')
    .sort((a, b) => {
      // Egyptian numbers first, then named (personalized message) before unnamed
      const ae = a.phone?.startsWith('+20') ? 0 : 1;
      const be = b.phone?.startsWith('+20') ? 0 : 1;
      if (ae !== be) return ae - be;
      const an = a.first_name ? 0 : 1;
      const bn = b.first_name ? 0 : 1;
      if (an !== bn) return an - bn;
      return (a.phone || '').localeCompare(b.phone || '');
    })
    .slice(0, limit);
}

export function setWaQueued(ids: string[], batch: string): void {
  mutateLeads((leads) => {
    for (const l of leads) {
      if (ids.includes(l.id)) {
        l.wa_status = 'queued';
        l.wa_batch = batch;
      }
    }
  });
}

/** Revert a batch's queued contacts back to pending (used when rebuilding the same day's outbox). */
export function resetWaBatch(batch: string): number {
  let n = 0;
  mutateLeads((leads) => {
    for (const l of leads) {
      if (l.channel === 'wa_import' && l.wa_status === 'queued' && l.wa_batch === batch) {
        l.wa_status = 'pending';
        n++;
      }
    }
  });
  return n;
}

export function waStats(): { total: number; pending: number; queued: number; sent: number; skipped: number } {
  const leads = loadLeads().filter((l) => l.channel === 'wa_import');
  const by = { pending: 0, queued: 0, sent: 0, skipped: 0 };
  for (const l of leads) by[l.wa_status || 'pending']++;
  return { total: leads.length, ...by };
}
