// =========================================================================
// VEX Channel Campaign — adapts @yexd2-style source posts per channel company,
// adds per-company deep-link inline buttons, and schedules a 70-post campaign
// through the publisher bot (caps + quiet hours respected, iterative coaching).
// =========================================================================

import * as fs from 'fs';
import * as path from 'path';
import { channelsStore, ChannelProfile } from './channelsStore';
import { generateWithFailover } from './agentEngine';
import { SOURCE_POSTS_SEED, SeedSourcePost } from './sourcePosts.seed';

export interface SourcePost extends SeedSourcePost {
  pulledAt?: string;
}

export type CampaignEntryStatus = 'pending' | 'posted' | 'failed';

export interface CampaignEntry {
  id: string;
  sourceId: string;
  chatId: string;
  status: CampaignEntryStatus;
  attempt: number;
  adaptedText?: string;
  messageId?: number;
  postedAt?: string;
  error?: string;
  dryRun?: boolean;
}

interface CampaignState {
  queue: CampaignEntry[];
  coachNotes: Record<string, string[]>;
  stats: { built: number; posted: number; failed: number; lastTickAt?: string };
  createdAt: string;
  updatedAt: string;
}

interface CompanyInfo {
  id: string;
  name: string;
  promo_code?: string;
  affiliate_link?: string;
  app_link?: string;
  bonus_text?: string;
  is_active?: boolean;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const SOURCE_PATH = path.join(DATA_DIR, 'source_posts.json');
const STATE_PATH = path.join(DATA_DIR, 'channel_campaign.json');
const COMPANIES_PATH = path.join(DATA_DIR, 'companies.json');
const SOURCE_CHANNEL = 'yexd2';
const CAMPAIGN_TOTAL = 70;

let emitFn: (event: string, payload: any) => void = () => {};
let schedulerTimer: NodeJS.Timeout | null = null;
let ticking = false;
const rightsCache = new Map<string, { ok: boolean; error?: string; at: number }>();
const RIGHTS_TTL_MS = 30 * 60 * 1000;

// ---------------------------------------------------------------- storage

function loadSourcePosts(): SourcePost[] {
  try {
    if (fs.existsSync(SOURCE_PATH)) {
      const data = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf-8'));
      if (Array.isArray(data) && data.length) return data;
    }
  } catch (err) {
    console.error('[Campaign] source load failed:', err);
  }
  return [];
}

function saveSourcePosts(posts: SourcePost[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SOURCE_PATH, JSON.stringify(posts, null, 2), 'utf-8');
}

function ensureSourcePosts(): SourcePost[] {
  let posts = loadSourcePosts();
  if (!posts.length) {
    posts = SOURCE_POSTS_SEED.map((p) => ({ ...p, pulledAt: new Date().toISOString() }));
    saveSourcePosts(posts);
    console.log(`[Campaign] seeded ${posts.length} source posts`);
  }
  return posts;
}

function emptyState(): CampaignState {
  return {
    queue: [],
    coachNotes: {},
    stats: { built: 0, posted: 0, failed: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function loadState(): CampaignState {
  try {
    if (fs.existsSync(STATE_PATH)) {
      const s = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8')) as CampaignState;
      if (!Array.isArray(s.queue)) s.queue = [];
      if (!s.coachNotes) s.coachNotes = {};
      if (!s.stats) s.stats = { built: 0, posted: 0, failed: 0 };
      return s;
    }
  } catch (err) {
    console.error('[Campaign] state load failed:', err);
  }
  return emptyState();
}

function saveState(s: CampaignState): void {
  s.updatedAt = new Date().toISOString();
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(s, null, 2), 'utf-8');
}

function loadCompanies(): CompanyInfo[] {
  try {
    if (fs.existsSync(COMPANIES_PATH)) {
      const data = JSON.parse(fs.readFileSync(COMPANIES_PATH, 'utf-8'));
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.error('[Campaign] companies load failed:', err);
  }
  return [];
}

// ----------------------------------------------------------- source pull

function decodeEntities(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p)>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseTmePage(html: string): SourcePost[] {
  const posts: SourcePost[] = [];
  const parts = html.split(/<div class="tgme_widget_message /).slice(1);
  for (const part of parts) {
    const idm = part.match(/data-post="[^"]+\/(\d+)"/);
    if (!idm) continue;
    const textM = part.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    if (!textM) continue;
    const text = decodeEntities(textM[1]);
    if (!text || text.length < 20) continue;
    const dateM = part.match(/datetime="([^"]+)"/);
    posts.push({ id: idm[1], date: dateM ? dateM[1].slice(0, 10) : '', text });
  }
  return posts;
}

/** Pull recent text posts from the source channel web preview (t.me/s). */
export async function pullSourcePosts(maxPages = 4): Promise<{ added: number; total: number }> {
  const existing = loadSourcePosts();
  const seen = new Set(existing.map((p) => p.id));
  let before: number | null = null;
  let added = 0;
  for (let page = 0; page < maxPages; page++) {
    const url = `https://t.me/s/${SOURCE_CHANNEL}` + (before ? `?before=${before}` : '');
    let html: string;
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(12000),
        headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0' },
      });
      if (!res.ok) break;
      html = await res.text();
    } catch {
      break;
    }
    const posts = parseTmePage(html);
    if (!posts.length) break;
    const ids = posts.map((p) => +p.id).filter((n) => !isNaN(n));
    const minId = Math.min(...ids);
    for (const p of posts) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      existing.push({ ...p, pulledAt: new Date().toISOString() });
      added++;
    }
    if (!isFinite(minId)) break;
    before = minId;
  }
  if (added) {
    existing.sort((a, b) => +a.id - +b.id);
    saveSourcePosts(existing.slice(-600));
  }
  return { added, total: loadSourcePosts().length };
}

// -------------------------------------------------------------- companies

function resolveCompany(ch: ChannelProfile): CompanyInfo | null {
  const companies = loadCompanies().filter((c) => c.is_active !== false);
  if (!companies.length) return null;
  const brandCompany = String(ch.brand?.company || '').trim().toLowerCase();
  const brandDomain = String(ch.brand?.domain || '').trim().toLowerCase();
  const title = String(ch.title || '').toLowerCase();
  for (const c of companies) {
    const n = c.name.toLowerCase();
    if (brandCompany && (brandCompany === n || n.includes(brandCompany) || brandCompany.includes(n))) return c;
  }
  for (const c of companies) {
    const n = c.name.toLowerCase();
    if (brandDomain && (brandDomain.startsWith(n) || n.split(/[^a-z0-9]+/).some((t) => t.length > 3 && brandDomain.includes(t) && n.includes(t)))) return c;
  }
  for (const c of companies) {
    const n = c.name.toLowerCase();
    if (title && n.length > 3 && title.includes(n)) return c;
  }
  return null;
}

function siteUrl(): string {
  return String(process.env.APP_URL || 'https://vex.deals').replace(/\/+$/, '');
}

function buildButtons(c: CompanyInfo | null, ch: ChannelProfile): Array<Array<{ text: string; url: string }>> {
  const rows: Array<Array<{ text: string; url: string }>> = [];
  if (c?.affiliate_link) rows.push([{ text: `🏆 سجّل في ${c.name} الآن`, url: c.affiliate_link }]);
  if (c?.app_link) rows.push([{ text: `📲 حمّل تطبيق ${c.name}`, url: c.app_link }]);
  if (!rows.length) {
    const url = String(ch.brand?.domain || '').trim() || siteUrl();
    const label = String(ch.brand?.company || '').trim() || 'VEX';
    rows.push([{ text: `🌐 زيارة ${label}`, url }]);
  }
  return rows;
}

// ------------------------------------------------------------- adaptation

function stripSourceLinks(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/CODE\s*POMO\s*:?\s*\S*/gi, '')
    .replace(/code\s*promo\s*:?\s*\S*/gi, '')
    .replace(/YEXD\d*/g, '')
    .replace(/[ \t]+/gm, ' ')
    .replace(/\n[ \t]+\n/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Remove link-label leftovers whose URL was stripped (e.g. "رابط التسجيل في موقع X" with no URL). */
function dropDanglingLinkLines(text: string): string {
  return text
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      if (!t) return true;
      // strip tatweel/diacritics so decorated labels ("رابـط تــحـمــيـل") still match
      const norm = t.replace(/[\u0640\u064B-\u065F]/g, '');
      const isLinkLabel = /(رابط|تسجيل|تطبيق|تحميل|download|register|CODE\s*POM|code\s*promo|🎁)/i.test(norm) && /(رابط|CODE|🎁|register|download)/i.test(norm);
      const hasUrl = /https?:\/\//.test(norm);
      const isBareGift = /^🎁?[\s:]*$/i.test(norm);
      if (isBareGift) return false;
      if (isLinkLabel && !hasUrl && !/CODE\s*POM/i.test(norm)) return false;
      if (/CODE\s*POM/i.test(norm) && !/[A-Z0-9]{3,}/i.test(norm.replace(/CODE\s*POM[OA]\s*:?/i, ''))) return false;
      return true;
    })
    .join('\n')
    .replace(/["'«”‟]\s*["'«”‟]/g, '')
    .replace(/[ \t]+/gm, ' ')
    .replace(/\n[ \t]+\n/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function fallbackAdapt(source: string, c: CompanyInfo | null): string {
  let base = stripSourceLinks(source);
  // rebrand: source posts promote their own bookmaker — swap foreign brand names
  const target = (c?.name || 'VEX').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const other of loadCompanies()) {
    if (c && (other.id === c.id || other.name.toLowerCase() === c.name.toLowerCase())) continue;
    if (other.name.length > 3) {
      base = base.replace(new RegExp(other.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), target);
    }
  }
  base = base.replace(new RegExp(`${target}\\s*\\.com`, 'gi'), target).trim();
  base = dropDanglingLinkLines(base);
  if (!c) {
    return [base, '', `🌐 ${siteUrl()}`].join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  const lines = [base, ''];
  if (c.affiliate_link) lines.push(`🌐 رابط التـسجيل في موقع ${c.name} 👇`, `🔗 ${c.affiliate_link}`, '');
  if (c.app_link) lines.push(`🌐 رابط تحميل تطبيق ${c.name} 👇`, `🔗 ${c.app_link}`, '');
  if (c.promo_code) lines.push(`🎁 CODE POMO: ${c.promo_code}`);
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Guard against weak free-tier models echoing the source: strip the source's own
 * URLs / promo codes, ensure the target company's links are present, and reject
 * the rewrite entirely (fall back to the safe template) if it still promotes a
 * different betting company than the target one.
 */
function sanitizeAdapted(text: string, source: SourcePost, c: CompanyInfo | null): string | null {
  let out = text;
  // remove every URL that literally appears in the source post
  for (const u of source.text.match(/https?:\/\/[^\s<>"']+/g) || []) {
    out = out.split(u).join('');
  }
  // remove the source channel's promo codes and any leftover CODE POMO line
  out = out
    .replace(/YEXD\d*/gi, '')
    .replace(/CODE\s*POM[OA]\s*:?\s*\S*/gi, '')
    .replace(/code\s*promo\s*:?\s*\S*/gi, '')
    .replace(/[ \t]+/gm, ' ')
    .replace(/\n[ \t]+\n/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (out.length < 40) return null;

  // other-company guard: a rewrite that still promotes a different betting brand is rejected
  const otherBrand = loadCompanies()
    .filter((x) => x.is_active !== false && (!c || x.id !== c.id && x.name.toLowerCase() !== c.name.toLowerCase()))
    .map((x) => x.name)
    .find((n) => n.length > 3 && new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(out));
  if (otherBrand) return null;

  // ensure target links exist; append the standard block when the model omitted them
  const missingAffiliate = c?.affiliate_link && !out.includes(c.affiliate_link);
  const missingApp = c?.app_link && !out.includes(c.app_link);
  if (c && (missingAffiliate || missingApp)) {
    const lines = [out, ''];
    if (missingAffiliate) lines.push(`🌐 رابط التـسجيل في موقع ${c.name} 👇`, `🔗 ${c.affiliate_link}`, '');
    if (missingApp) lines.push(`🌐 رابط تحميل تطبيق ${c.name} 👇`, `🔗 ${c.app_link}`, '');
    if (c.promo_code && !out.includes(c.promo_code)) lines.push(`🎁 CODE POMO: ${c.promo_code}`);
    out = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  if (!c && !/https?:\/\//.test(out)) {
    out = [out, '', `🌐 ${siteUrl()}`].join('\n');
  }
  out = dropDanglingLinkLines(out);
  if (out.length < 40) return null;
  return out.slice(0, 3900);
}

async function adaptPost(source: SourcePost, c: CompanyInfo | null, coachNote: string | null): Promise<{ text: string; llm: boolean }> {
  const system = 'أنت محرر محتوى عربي لقنوات مراهنات رياضية في تليجرام. أعد كتابة المنشور فقط: بلا شرح، بلا اقتباسات، بلا وسم HTML، أقصى طول 3500 حرف.';
  const prompt = [
    'المصدر (منشور قناة توقعات رياضية):',
    '"""',
    source.text,
    '"""',
    '',
    c
      ? `الشركة المستهدفة: ${c.name}${c.promo_code ? ` — بروموكود: ${c.promo_code}` : ''}${c.bonus_text ? ` — مكافأة: ${c.bonus_text}` : ''}`
      : 'لا توجد شركة محددة — اكتب المنشور بأسلوب قناة توقعات عامة.',
    c?.affiliate_link ? `رابط التسجيل (يجب إدراجه كما هو): ${c.affiliate_link}` : '',
    c?.app_link ? `رابط تحميل التطبيق (يجب إدراجه كما هو): ${c.app_link}` : '',
    coachNote ? `ملاحظة تحسين من مراجعات هذه القناة (طبّقها): ${coachNote}` : '',
    '',
    'اكتب منشوراً عربياً بنفس نبرة المصدر وإيموجيه وطوله تقريباً، مع روابط التسجيل والتطبيق والبروموكود إن وجدت. لا تخترع مباريات أو نتائج أو أرقام غير واردة في المصدر.',
  ]
    .filter(Boolean)
    .join('\n');
  try {
    const out = await generateWithFailover(prompt, system, 0.7);
    if (out && out.trim().length > 40) {
      let text = out.trim().replace(/^```[\s\S]*?```$/m, (m) => m.replace(/```[a-z]*/g, '').trim());
      text = text.replace(/^["'«»]+|["'«»]+$/g, '').trim();
      const sanitized = sanitizeAdapted(text, source, c);
      if (sanitized && sanitized.length > 40) {
        return { text: sanitized, llm: true };
      }
      console.log('[Campaign] LLM rewrite rejected by sanitizer — using safe template');
    }
  } catch (err) {
    console.error('[Campaign] LLM adapt failed, using template:', err);
  }
  return { text: fallbackAdapt(source.text, c), llm: false };
}

async function reviewPost(chatId: string, source: SourcePost, adapted: string, notes: string[]): Promise<string | null> {
  const prompt = [
    'أنت مراجع محتوى قنوات مراهنات. اقرأ المنشور الأصلي والمنشور المعدّل، ثم اكتب سطراً واحداً فقط بالعربية (≤120 حرفاً) يصف تحسيناً ملموساً يجب تطبيقه على المنشورات القادمة في نفس القناة (نبرة، بنية، عناوين، إيموجي، CTA). لا تعليقات أخرى.',
    notes.length ? `ملاحظات سابقة لهذه القناة: ${notes.slice(-5).join(' | ')}` : '',
    `الأصلي:\n${source.text.slice(0, 600)}`,
    `المعدّل:\n${adapted.slice(0, 600)}`,
  ]
    .filter(Boolean)
    .join('\n\n');
  try {
    const out = await generateWithFailover(prompt, 'أعد سطر واحداً فقط.', 0.5);
    if (out && out.trim().length > 10 && out.trim().length <= 200) return out.trim().replace(/^["'«»]+|["'«»]+$/g, '');
  } catch {
    /* coach is best-effort */
  }
  return null;
}

// ---------------------------------------------------------------- sending

async function checkRights(ch: ChannelProfile): Promise<{ ok: boolean; error?: string }> {
  const cached = rightsCache.get(ch.chat_id);
  if (cached && Date.now() - cached.at < RIGHTS_TTL_MS) return { ok: cached.ok, error: cached.error };
  const publisher = channelsStore.getPublisher();
  if (!publisher.bot_token) return { ok: false, error: 'no publisher bot token' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${publisher.bot_token}/getChatMember`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: ch.chat_id, user_id: publisher.bot_id || undefined }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json().catch(() => ({}));
    if (!data.ok) {
      // bot_id may be missing — resolve it once
      if (publisher.bot_id === '' && publisher.bot_token) {
        const meRes = await fetch(`https://api.telegram.org/bot${publisher.bot_token}/getMe`, { signal: AbortSignal.timeout(10000) });
        const me = await meRes.json().catch(() => ({}));
        if (me.ok && me.result?.id) {
          channelsStore.setPublisher({ bot_id: String(me.result.id) });
          return checkRights(ch);
        }
      }
      const error = data.description || 'getChatMember failed';
      rightsCache.set(ch.chat_id, { ok: false, error, at: Date.now() });
      return { ok: false, error };
    }
    const status = data.result?.status;
    const ok = status === 'administrator' || status === 'creator' || status === 'member';
    rightsCache.set(ch.chat_id, { ok, error: ok ? undefined : `bot status=${status}`, at: Date.now() });
    return { ok, error: ok ? undefined : `bot status=${status}` };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'rights check error' };
  }
}

async function sendChannelPost(chatId: string, text: string, keyboard: Array<Array<{ text: string; url: string }>>): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const publisher = channelsStore.getPublisher();
  if (!publisher.bot_token) return { ok: false, error: 'no publisher bot token' };
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${publisher.bot_token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          ...(keyboard.length ? { reply_markup: { inline_keyboard: keyboard } } : {}),
        }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) return { ok: true, messageId: data.result?.message_id };
      const error = data.description || `HTTP ${res.status}`;
      const retryable = /retry after|timeout|500|502|503|429/i.test(String(error));
      if (!retryable || attempt === 3) return { ok: false, error };
      await new Promise((r) => setTimeout(r, attempt * 4000));
    } catch (err: any) {
      if (attempt === 3) return { ok: false, error: err?.message || 'send error' };
      await new Promise((r) => setTimeout(r, attempt * 4000));
    }
  }
  return { ok: false, error: 'unreachable' };
}

// ------------------------------------------------------------------ queue

function eligibleChannels(): ChannelProfile[] {
  return channelsStore
    .getActive()
    .filter((c) => c.betting_related && c.category !== 'users' && c.category !== 'support' && c.category !== 'payments');
}

export function buildCampaignQueue(total = CAMPAIGN_TOTAL): { built: number; skipped: string } {
  const state = loadState();
  const kept = state.queue.filter((e) => e.status === 'posted');
  const channels = eligibleChannels();
  if (!channels.length) {
    state.queue = kept;
    saveState(state);
    return { built: 0, skipped: 'no eligible betting channels' };
  }
  const posts = ensureSourcePosts();
  if (!posts.length) return { built: 0, skipped: 'no source posts' };

  const usedPerChannel = new Map<string, Set<string>>();
  for (const e of kept) {
    if (!usedPerChannel.has(e.chatId)) usedPerChannel.set(e.chatId, new Set());
    usedPerChannel.get(e.chatId)!.add(e.sourceId);
  }

  const queue: CampaignEntry[] = [];
  for (let i = 0; i < total; i++) {
    const ch = channels[i % channels.length];
    const used = usedPerChannel.get(ch.chat_id) || new Set<string>();
    let post = posts.find((p) => !used.has(p.id));
    if (!post) {
      used.clear();
      post = posts[i % posts.length];
    }
    used.add(post.id);
    usedPerChannel.set(ch.chat_id, used);
    queue.push({
      id: `c${Date.now().toString(36)}_${i}`,
      sourceId: post.id,
      chatId: ch.chat_id,
      status: 'pending',
      attempt: 0,
    });
  }
  state.queue = [...kept, ...queue];
  state.stats.built += queue.length;
  saveState(state);
  console.log(`[Campaign] queue built: ${queue.length} entries over ${channels.length} channels`);
  emitFn('campaign:built', { entries: queue.length, channels: channels.length });
  return { built: queue.length, skipped: '' };
}

// ------------------------------------------------------------------- tick

export async function campaignTick(): Promise<{ posted: number; skipped?: string; busy?: boolean }> {
  if (ticking) return { posted: 0, busy: true };
  ticking = true;
  try {
    const state = loadState();
    state.stats.lastTickAt = new Date().toISOString();
    let next = state.queue.find((e) => e.status === 'pending');
    if (!next) {
      saveState(state);
      return { posted: 0, skipped: 'queue empty' };
    }
    let ch = channelsStore.get(next.chatId);
    if (!ch || !ch.active) {
      next.status = 'failed';
      next.error = 'channel missing/inactive';
      state.stats.failed++;
      saveState(state);
      return { posted: 0, skipped: 'channel inactive' };
    }
    const dryRun = process.env.DRY_RUN === '1';
    if (!dryRun) {
      const publishable = new Set(channelsStore.getPublishable(new Date()).map((c) => c.chat_id));
      if (!publishable.has(ch.chat_id)) {
        // Head's channel is capped / in quiet hours — take the next publishable
        // entry instead of stalling the whole queue on the head.
        const alt = state.queue.find((e) => e.status === 'pending' && publishable.has(e.chatId));
        if (alt) {
          next = alt;
          ch = channelsStore.get(next.chatId);
          if (!ch) {
            next.status = 'failed';
            next.error = 'channel missing';
            state.stats.failed++;
            saveState(state);
            return { posted: 0, skipped: 'channel missing' };
          }
        } else {
          saveState(state);
          const why = 'no publishable campaign channel now (caps/quiet hours)';
          console.log(`[Campaign] tick skipped: ${why}`);
          return { posted: 0, skipped: why };
        }
      }
    }

    const source = ensureSourcePosts().find((p) => p.id === next.sourceId);
    if (!source) {
      next.status = 'failed';
      next.error = 'source post missing';
      state.stats.failed++;
      saveState(state);
      return { posted: 0, skipped: 'source missing' };
    }

    if (!dryRun) {
      const rights = await checkRights(ch);
      if (!rights.ok) {
        next.attempt++;
        if (next.attempt >= 3) {
          next.status = 'failed';
          next.error = `rights: ${rights.error}`;
          state.stats.failed++;
        }
        saveState(state);
        return { posted: 0, skipped: `rights failed: ${rights.error}` };
      }
    }

    const notes = state.coachNotes[ch.chat_id] || [];
    const company = resolveCompany(ch);
    const { text, llm } = await adaptPost(source, company, notes.length ? notes[notes.length - 1] : null);
    const keyboard = buildButtons(company, ch);

    if (dryRun) {
      next.status = 'posted';
      next.dryRun = true;
      next.adaptedText = text;
      next.postedAt = new Date().toISOString();
      state.stats.posted++;
      saveState(state);
      emitFn('campaign:posted', { chatId: ch.chat_id, title: ch.title, sourceId: source.id, llm, dryRun: true, buttons: keyboard.length });
      console.log(`[Campaign][DRY] ${ch.title} ← #${source.id} (llm=${llm}, buttons=${keyboard.length})`);
      return { posted: 1 };
    }

    const sent = await sendChannelPost(ch.chat_id, text, keyboard);
    next.attempt++;
    if (sent.ok) {
      next.status = 'posted';
      next.messageId = sent.messageId;
      next.adaptedText = text;
      next.postedAt = new Date().toISOString();
      delete next.error;
      state.stats.posted++;
      channelsStore.recordPost(ch.chat_id);
      // iterative improvement: one short coaching note per published post
      const note = await reviewPost(ch.chat_id, source, text, notes);
      if (note) {
        notes.push(note);
        state.coachNotes[ch.chat_id] = notes.slice(-10);
      }
      saveState(state);
      emitFn('campaign:posted', { chatId: ch.chat_id, title: ch.title, messageId: sent.messageId, sourceId: source.id, llm, buttons: keyboard.length, coachNote: note || undefined });
      console.log(`[Campaign] posted to ${ch.title} (msg ${sent.messageId}, llm=${llm}, buttons=${keyboard.length})`);
      return { posted: 1 };
    }
    if (next.attempt >= 3) {
      next.status = 'failed';
      next.error = sent.error;
      state.stats.failed++;
      saveState(state);
      emitFn('campaign:failed', { chatId: ch.chat_id, error: sent.error });
      return { posted: 0, skipped: `send failed: ${sent.error}` };
    }
    saveState(state);
    return { posted: 0, skipped: `send failed (will retry): ${sent.error}` };
  } finally {
    ticking = false;
  }
}

// ----------------------------------------------------------------- status

export function getCampaignStatus(): any {
  const state = loadState();
  const posts = loadSourcePosts();
  const pending = state.queue.filter((e) => e.status === 'pending');
  const posted = state.queue.filter((e) => e.status === 'posted');
  const failed = state.queue.filter((e) => e.status === 'failed');
  const byChannel = new Map<string, { pending: number; posted: number; failed: number }>();
  for (const e of state.queue) {
    const b = byChannel.get(e.chatId) || { pending: 0, posted: 0, failed: 0 };
    b[e.status]++;
    byChannel.set(e.chatId, b);
  }
  return {
    sourceCount: posts.length,
    sourceChannel: `@${SOURCE_CHANNEL}`,
    queue: { total: state.queue.length, pending: pending.length, posted: posted.length, failed: failed.length },
    stats: state.stats,
    scheduler: { running: !!schedulerTimer, intervalMinutes: 8 },
    next: pending.slice(0, 3).map((e) => {
      const ch = channelsStore.get(e.chatId);
      return { entryId: e.id, sourceId: e.sourceId, channel: ch?.title || e.chatId };
    }),
    channels: Array.from(byChannel.entries()).map(([chatId, b]) => {
      const ch = channelsStore.get(chatId);
      return { chatId, title: ch?.title || chatId, company: ch?.brand?.company || '', ...b };
    }),
    coachNotes: Object.fromEntries(
      Object.entries(state.coachNotes).map(([chatId, notes]) => [channelsStore.get(chatId)?.title || chatId, notes.slice(-3)])
    ),
    dryRun: process.env.DRY_RUN === '1',
  };
}

// ------------------------------------------------------------- lifecycle

export function initCampaign(opts: { emit?: (event: string, payload: any) => void }): void {
  if (opts.emit) emitFn = opts.emit;
  ensureSourcePosts();
  const state = loadState();
  if (!state.queue.filter((e) => e.status === 'pending').length) {
    buildCampaignQueue(CAMPAIGN_TOTAL);
  }
  // background source refresh (best-effort, non-blocking)
  setTimeout(() => {
    pullSourcePosts(3)
      .then((r) => r.added && console.log(`[Campaign] source refresh: +${r.added}`))
      .catch(() => {});
  }, 120 * 1000);
}

export function startCampaignScheduler(intervalMinutes = 8): void {
  if (schedulerTimer) return;
  const firstDelay = 3 * 60 * 1000;
  console.log(`[Campaign] scheduler: first tick in ${firstDelay / 60000}min, then every ${intervalMinutes}min`);
  setTimeout(() => {
    campaignTick().catch((err) => console.error('[Campaign] tick error:', err));
    schedulerTimer = setInterval(() => {
      campaignTick().catch((err) => console.error('[Campaign] tick error:', err));
    }, intervalMinutes * 60 * 1000);
  }, firstDelay);
}

export function stopCampaignScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}
