import * as fs from 'fs';
import * as path from 'path';
import {
  listLeads,
  segmentOf,
  getSettings,
  addTouch,
  bumpInterest,
  upsertLead,
  mutateLeads,
  Lead,
} from './leadsStore';
import { sendGrowthDm } from './sender';
import { generateWithFailover } from '../agentEngine';

// =========================================================================
// Campaigns: segmented broadcasts through the rate-limited sender. Copy is
// generated per segment by Gemini from a short admin seed (deterministic
// fallback = the seed itself). Every /start ref_<id> code is tracked here
// as the viral loop (rewards granted manually by the admin for now).
// =========================================================================

const DATA_DIR = path.join(process.cwd(), 'data');
const CAMPAIGNS_PATH = path.join(DATA_DIR, 'growth_campaigns.json');

export interface Campaign {
  id: string;
  name: string;
  segment: string;
  text: string;
  status: 'draft' | 'sending' | 'sent';
  created_at: number;
  sent_at?: number;
  stats: { targeted: number; sent: number; failed: number };
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

function loadAll(): Campaign[] {
  return readJson<{ campaigns: Campaign[] }>(CAMPAIGNS_PATH, { campaigns: [] }).campaigns || [];
}

function saveAll(campaigns: Campaign[]): void {
  writeJson(CAMPAIGNS_PATH, { campaigns });
}

export function listCampaigns(): Campaign[] {
  return loadAll().sort((a, b) => b.created_at - a.created_at);
}

export async function generateCampaignCopy(seed: string, segment: string): Promise<string> {
  try {
    const raw = await generateWithFailover(
      `اكتب رسالة تيليجرام واحدة لحملة تسويقية على مجتمع VEX Deals.\nالشريحة: ${segment}\nالفكرة من الإدارة: ${seed}\nالقواعد: عربية بسيطة، سطرين-ثلاثة، ودود بدون إزعاج، بدون وعود ربح، اختم برابط https://vex.deals — اكتب الرسالة فقط.`,
      'You write short Arabic Telegram campaign messages. Reply with the message only.',
      0.8
    );
    const text = (raw || '').trim();
    if (text && text.length <= 800) return text;
  } catch {}
  return `${seed}\nhttps://vex.deals`;
}

export function createCampaign(input: { name: string; segment: string; text: string }): Campaign {
  const campaigns = loadAll();
  const campaign: Campaign = {
    id: `camp_${Date.now().toString(36)}`,
    name: input.name.slice(0, 80),
    segment: input.segment,
    text: input.text.slice(0, 2000),
    status: 'draft',
    created_at: Date.now(),
    stats: { targeted: 0, sent: 0, failed: 0 },
  };
  campaigns.push(campaign);
  saveAll(campaigns);
  return campaign;
}

function matchesSegment(lead: Lead, segment: string): boolean {
  if (segment === 'all' || segment === 'started') return lead.started;
  if (segment === 'agents') return lead.type === 'agent';
  if (segment === 'players') return lead.type !== 'agent';
  return segmentOf(lead) === segment;
}

export async function sendCampaign(id: string): Promise<Campaign | null> {
  const settings = getSettings();
  if (!settings.campaigns_enabled) return null;
  const campaigns = loadAll();
  const campaign = campaigns.find((c) => c.id === id);
  if (!campaign || campaign.status !== 'draft') return null;

  const today = new Date().toISOString().slice(0, 10);
  const targets = listLeads().filter(
    (l) =>
      matchesSegment(l, campaign.segment) &&
      l.status !== 'stopped' &&
      l.status !== 'dead' &&
      (!l.last_campaign_at ||
        new Date(l.last_campaign_at).toISOString().slice(0, 10) !== today)
  );
  campaign.status = 'sending';
  campaign.stats.targeted = targets.length;
  saveAll(campaigns);

  for (const lead of targets) {
    const ok = await sendGrowthDm(lead.tg_user_id, campaign.text, lead.id);
    if (ok) {
      campaign.stats.sent++;
      upsertLead({ tg_user_id: lead.tg_user_id, last_campaign_at: Date.now() });
      addTouch(lead.tg_user_id, 'campaign', campaign.name, `camp:${campaign.id}`);
      bumpInterest(lead.tg_user_id, 'cashback', 1);
    } else {
      campaign.stats.failed++;
    }
  }
  campaign.status = 'sent';
  campaign.sent_at = Date.now();
  saveAll(campaigns);
  return campaign;
}

// --------------------------- viral referral loop ---------------------------

export function referralCode(tgUserId: number): string {
  return `ref_${tgUserId}`;
}

export function recordReferral(inviterTgId: number): { invites: number; milestone: boolean } | null {
  let result: { invites: number; milestone: boolean } | null = null;
  mutateLeads((leads) => {
    const inviter = leads.find((l) => l.tg_user_id === inviterTgId);
    if (!inviter) return;
    inviter.invites += 1;
    result = {
      invites: inviter.invites,
      milestone: inviter.invites === 3 || inviter.invites === 10,
    };
  });
  if (result) {
    addTouch(inviterTgId, 'invite', `via ref_${inviterTgId}`);
    bumpInterest(inviterTgId, 'lottery', 2);
  }
  return result;
}
