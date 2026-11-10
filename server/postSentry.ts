import * as fs from 'fs';
import * as path from 'path';
import { channelsStore, ChannelProfile } from './channelsStore';
import { resolveCompany } from './channelCampaign';
import { BOT_PROMO_DOMAINS } from './botPromo';
import { storage } from './storage';

// =========================================================================
// 🛡 بوابة الرقيب — POST SENTRY
// Pre-send targeting gate: every outgoing post is reviewed for language,
// category and audience fit. Mis-targeted posts are RE-TARGETED to a
// publishable channel that actually fits (headline/domain/signature adapted);
// a company/audience mismatch with NO fitting channel is BLOCKED (chatId='')
// rather than delivered to the wrong brand's channel. Other issues fall back
// to the original target with a log entry. Never throws.
// =========================================================================

export type TextLang = 'ar' | 'en';
export type ContentKind = 'forecast' | 'live' | 'news' | 'promo' | 'payment' | 'support' | 'generic';

export interface SentryVerdict {
  lang: TextLang;
  kind: ContentKind;
  betting: boolean;
  /** Active partner brands explicitly named in the post (canonical company names). */
  companies: string[];
}

export interface SentryResult {
  chatId: string;
  text: string;
  corrected: boolean;
  issues: string[];
  verdict: SentryVerdict;
}

const LOG_PATH = path.join(process.cwd(), 'data', 'sentry_log.json');
const LOG_MAX = 300;

// ---------------------------------------------------------------- detection

const ARABIC_RE = /[\u0600-\u06FF]/;
const ARABIC_LETTERS_RE = /[\u0600-\u06FF\u0750-\u077F]/g;

export function detectLang(text: string): TextLang {
  const letters = text.replace(/[^A-Za-z\u0600-\u06FF]/g, '');
  const arCount = (text.match(ARABIC_LETTERS_RE) || []).length;
  if (arCount === 0) return 'en';
  return arCount / Math.max(letters.length, 1) >= 0.25 || ARABIC_RE.test(text.slice(0, 80)) ? 'ar' : 'en';
}

/** Real payment-METHOD phrases — only these alone mean 'payment' content. */
const PAYMENT_METHOD_RE = new RegExp(
  [
    'فودفون كاش', 'انستاباي', 'اتصالات كاش', 'أورنج كاش', 'سحب الأرباح',
    'تحويل بنكي', 'كاش اوت',
    'vodafone cash', 'instapay', 'meeza', 'withdraw', 'payout', 'bank transfer',
  ].join('|'),
  'i'
);

/** Weak payment words that appear INSIDE promo copy («بونص إيداع», «ميزة الرهان»)
 *  — they only count as payment when no promo/forecast intent is present. */
const PAYMENT_WEAK_RE = /دفع|ايداع|إيداع|ميزة|محفظة|\bdeposit\b|\bpay\b/i;

const PROMO_RE = new RegExp(
  [
    'كود التسجيل', 'كود الخصم', 'كود ربح', 'بونص', 'مكافأة', 'عرض خاص', 'خصم', 'سجّل الآن', 'سجل الآن',
    'promo code', 'bonus', 'welcome offer', 'cashback', 'free bet', 'register now', 'sign up',
  ].join('|'),
  'i'
);

const FORECAST_RE = new RegExp(
  [
    'التوقع', 'توقعنا', 'نسبة الفوز', 'النتيجة المتوقعة', 'تحليل المباراة', 'فرص الرهان',
    'prediction', 'predicted score', 'win probability', 'match analysis', 'our pick',
  ].join('|'),
  'i'
);

const LIVE_RE = new RegExp(
  ['مباشر', 'الشوط', 'جول', 'انتهت', 'الدقيقة', 'هدف', 'halftime', 'full-time', 'goal!', "\\bFT\\b", "\\bHT\\b", 'live now']
    .join('|'),
  'i'
);

const ODDS_RE = /\b\d{1,2}\.\d{1,2}\b\s*(%|x)?|\bat odds\b|\bodds\b|ال odds/i;
const BETTING_AR_RE = /رهان|مراهنة|مكتب رهان|رهونات|القمار/i;

export function detectKind(text: string): ContentKind {
  const t = text.toLowerCase();
  // Method phrases first (a genuine withdrawal/how-to post), then intent:
  // a company card whose bonus says «بونص إيداع» is a PROMO, not a payment —
  // misclassifying it as payment once stranded it on the wrong channel.
  if (PAYMENT_METHOD_RE.test(text)) return 'payment';
  if (FORECAST_RE.test(text) || /\d{1,2}\s*[-–:]\s*\d{1,2}/.test(t) && ODDS_RE.test(text)) return 'forecast';
  if (PROMO_RE.test(text)) return 'promo';
  if (PAYMENT_WEAK_RE.test(text)) return 'payment';
  if (LIVE_RE.test(text)) return 'live';
  if (ARABIC_RE.test(text) || /\b(news|report|transfer|injury)\b/.test(t)) return 'news';
  return 'generic';
}

export function detectBetting(text: string): boolean {
  if (BETTING_AR_RE.test(text)) return true;
  if (/\b(bet|wager|stake|odds|bookmaker|parlay)\b/i.test(text)) return true;
  if (PROMO_RE.test(text) && /registration|تسجيل|كود/i.test(text)) return true;
  if (ODDS_RE.test(text) && (FORECAST_RE.test(text) || /\bwin\b|فوز/i.test(text))) return true;
  // Betting-adjacent offers/records the rules above miss — cashback promos,
  // records/counter cards and 18+ notices must never leak into football-news
  // channels (betting_related === false).
  if (/كاش باك|cashback|بونص|bonus|كود الخصم|promo code|سجّل الآن|سجل الآن|register now/i.test(text)) return true;
  if (/سجل توقعات|تحديث العداد|دقة السلسلة|تعويض|استرداد|\+18|18\+/i.test(text)) return true;
  return false;
}

// ------------------------------------------------------- company detection

/** Our official domains — a link to them is NEVER a partner-brand mention
 *  (https://1xbetservices.com is our own domain, not a 1XBET promotion). */
const OUR_HOSTS = BOT_PROMO_DOMAINS.map((d) => {
  try {
    return new URL(d).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}).filter(Boolean);

/** Remove our official links (full URLs + bare hosts) before brand scanning. */
function stripOurLinks(text: string): string {
  let out = text.replace(/https?:\/\/[^\s<>"')]+/g, (u) => {
    try {
      const h = new URL(u.replace(/[).,]+$/, '')).hostname.replace(/^www\./, '');
      return OUR_HOSTS.includes(h) ? ' ' : u;
    } catch {
      return u;
    }
  });
  for (const h of OUR_HOSTS) out = out.split(h).join(' ');
  return out;
}

/** Lowercase + drop Arabic harakat/tatweel so brand matching is diacritic-proof. */
function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Word-boundary aware brand mention (latin boundaries only — Arabic passes). */
function mentionsBrand(haystack: string, needle: string): boolean {
  const n = normalizeForMatch(needle);
  if (n.length < 4) return false;
  let i = haystack.indexOf(n);
  while (i !== -1) {
    const before = i > 0 ? haystack[i - 1] : '';
    const after = haystack[i + n.length] || '';
    if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) return true;
    i = haystack.indexOf(n, i + 1);
  }
  return false;
}

/** Every active partner brand explicitly named in the post (canonical `name`). */
function detectCompanies(text: string): string[] {
  try {
    const hay = normalizeForMatch(stripOurLinks(text));
    const found: string[] = [];
    for (const c of storage.getCompanies()) {
      if (!c.is_active) continue;
      const variants = [c.name, c.name_ar || '', c.name_en || '', c.name_es || '', c.name_ru || ''];
      // Arabic display names may appear without their parenthetical latin part —
      // also try each paren/slash-separated fragment («ميلبيت» from «ميلبيت (MELBET)»).
      for (const part of (c.name_ar || '').split(/[()\[\]/|,،:]+/)) variants.push(part);
      if (variants.some((v) => mentionsBrand(hay, v))) found.push(c.name);
    }
    return found;
  } catch {
    return [];
  }
}

export function reviewText(text: string): SentryVerdict {
  return {
    lang: detectLang(text),
    kind: detectKind(text),
    betting: detectBetting(text),
    companies: detectCompanies(text),
  };
}

// ------------------------------------------------------------- fit checking

/** Issues = reasons the post does NOT fit the channel's declared targeting. */
export function fitIssues(ch: ChannelProfile, v: SentryVerdict): string[] {
  const issues: string[] = [];
  if (ch.lang === 'ar' || ch.lang === 'en') {
    if (ch.lang !== v.lang) issues.push(`lang: post=${v.lang} channel=${ch.lang}`);
  }
  if (ch.betting_related === false && v.betting) {
    issues.push('audience: betting content on a non-betting channel');
  }
  if (v.kind === 'payment' && ch.category !== 'payments') {
    issues.push(`category: payment content on '${ch.category}' channel`);
  }
  if (v.kind === 'promo' && ch.category === 'payments') {
    issues.push('category: promo content on payments channel');
  }
  if ((v.kind === 'forecast' || v.kind === 'live') && (ch.category === 'partners' || ch.category === 'agents' || ch.category === 'marketers')) {
    issues.push(`category: ${v.kind} content on ${ch.category} channel`);
  }
  if (v.kind === 'news' && (ch.category === 'agents' || ch.category === 'marketers')) {
    issues.push(`category: news content on ${ch.category} channel (niche audience)`);
  }
  if ((v.kind === 'forecast' || v.kind === 'live' || v.kind === 'news') && ch.category === 'support') {
    issues.push(`category: ${v.kind} content on support channel`);
  }
  // 🏢 company — a post promoting brand X must not land in a channel dedicated
  // to a different brand Y. Neutral channels accept any brand; multi-brand
  // posts are fine when they include the channel's own brand.
  const chCompany = resolveCompany(ch)?.name || '';
  if (
    chCompany &&
    v.companies.length > 0 &&
    !v.companies.some((p) => p.toLowerCase() === chCompany.toLowerCase())
  ) {
    issues.push(`company: post=${v.companies.join('/')} channel=${chCompany}`);
  }
  return issues;
}

function usageWeight(ch: ChannelProfile): number {
  const today = new Date().toISOString().slice(0, 10);
  return ch.daily_reset === today ? ch.daily_used : 0;
}

/** Does this channel's dedicated brand appear among the post's brands? */
function matchesPostCompany(ch: ChannelProfile, v: SentryVerdict): boolean {
  if (v.companies.length === 0) return false;
  const name = resolveCompany(ch)?.name || '';
  return Boolean(name) && v.companies.some((p) => p.toLowerCase() === name.toLowerCase());
}

/** Best alternative publishable channel that fits; null when none exists. */
function pickAlternative(fromChatId: string, v: SentryVerdict): ChannelProfile | null {
  const candidates = channelsStore
    .getPublishable(new Date())
    .filter((c) => c.chat_id !== fromChatId)
    // Niche audiences (agents/marketers) are never a dumping ground for posts
    // aimed elsewhere, and a niche post never gets rerouted out of its niche.
    .filter((c) => c.category !== 'agents' && c.category !== 'marketers')
    .filter((c) => fitIssues(c, v).length === 0);
  if (candidates.length === 0) return null;
  // Company fit first: land the post on a channel dedicated to a brand it
  // actually promotes (neutral channels are the fallback), then daily usage.
  candidates.sort((a, b) => {
    const ca = matchesPostCompany(a, v) ? 0 : 1;
    const cb = matchesPostCompany(b, v) ? 0 : 1;
    if (ca !== cb) return ca - cb;
    return usageWeight(a) - usageWeight(b);
  });
  return candidates[0];
}

function swapSignature(text: string, from: ChannelProfile, to: ChannelProfile): string {
  let out = text;
  const oldSig = from.brand?.signature?.trim();
  if (oldSig && out.includes(oldSig)) {
    out = out.split(oldSig).join('');
  }
  out = out.replace(/\n{3,}/g, '\n\n').trimEnd();
  const newSig = to.brand?.signature?.trim();
  if (newSig && !out.includes(newSig)) {
    out = `${out}\n\n${newSig}`;
  }
  return out;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Fully re-brand a rerouted post for the RECEIVING channel: signature, the
 * headline that names the source channel («🔥 {title} —», «⚽ {title} —») and
 * every brand-domain link («🌐 {domain}») must belong to the destination —
 * otherwise a Betjam promo lands in another channel still reading
 * «🔥 Betjam … 🌐 betjam.sbs» (the exact complaint we fixed here).
 * Body brand mentions (e.g. «🏆 MOSTBET —» on a card ABOUT MOSTBET) are
 * content, not channel branding, and are left untouched.
 */
function adaptForTarget(text: string, from: ChannelProfile, to: ChannelProfile): string {
  let out = swapSignature(text, from, to);

  const fromTitle = String(from.title || '').trim();
  const toTitle = String(to.title || '').trim();
  if (fromTitle && toTitle && fromTitle !== toTitle && out.includes(fromTitle)) {
    out = out.replace(new RegExp(`(🔥|⚽)\\s*${escapeRe(fromTitle)}`, 'g'), `$1 ${toTitle}`);
    out = out.replace(new RegExp(`(^|\\n)${escapeRe(fromTitle)}(?=\\s*—)`, 'gm'), `$1${toTitle}`);
  }

  const fromDom = String(from.brand?.domain || '').trim().replace(/\/+$/, '');
  const toDom = String(to.brand?.domain || '').trim().replace(/\/+$/, '');
  if (fromDom && out.includes(fromDom) && fromDom !== toDom) {
    if (toDom) {
      out = out.split(fromDom).join(toDom);
    } else {
      // Destination has no brand domain → drop the link lines entirely.
      out = out
        .split('\n')
        .filter((l) => !l.includes(fromDom))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trimEnd();
    }
  }
  return out;
}

// ------------------------------------------------------------------- logging

function logEntry(entry: any): void {
  try {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    let list: any[] = [];
    if (fs.existsSync(LOG_PATH)) {
      try {
        list = JSON.parse(fs.readFileSync(LOG_PATH, 'utf-8'));
        if (!Array.isArray(list)) list = [];
      } catch {
        list = [];
      }
    }
    list.unshift(entry);
    if (list.length > LOG_MAX) list.length = LOG_MAX;
    fs.writeFileSync(LOG_PATH, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('[Sentry] log write failed:', err.message);
  }
}

function readLog(): any[] {
  try {
    if (fs.existsSync(LOG_PATH)) {
      const list = JSON.parse(fs.readFileSync(LOG_PATH, 'utf-8'));
      return Array.isArray(list) ? list : [];
    }
  } catch {
    /* ignore */
  }
  return [];
}

// --------------------------------------------------------------------- gate

/**
 * Main entry: called right before every Telegram send.
 * Returns the (possibly re-targeted) chat id + text. Never throws.
 * `chatId === ''` means BLOCKED: a company/audience mismatch with no fitting
 * channel — the caller must skip the send (never deliver to the wrong channel).
 *
 * `opts.niche` marks purpose-built agents/marketers content: it is written FOR
 * that audience, so it is never re-routed out of its niche (and generic posts
 * are never allowed in — pickAlternative excludes niche channels).
 */
export function sentryGate(chatId: string, text: string, opts?: { niche?: boolean }): SentryResult {
  try {
    const ch = channelsStore.get(chatId);
    if (!ch) return { chatId, text, corrected: false, issues: [], verdict: reviewText(text) };

    const verdict = reviewText(text);
    if (opts?.niche) return { chatId, text, corrected: false, issues: [], verdict };

    const issues = fitIssues(ch, verdict);
    if (issues.length === 0) return { chatId, text, corrected: false, issues: [], verdict };

    const alt = pickAlternative(chatId, verdict);

    // 🚫 Hard mismatch (wrong company / wrong audience) with nowhere to go must
    // NOT fall back to the original target — that fallback is exactly how a
    // company card landed in another brand's channel. '' = blocked: callers
    // skip the send instead of delivering to a channel the content doesn't fit.
    const blocked =
      !alt && issues.some((i) => i.startsWith('company:') || i.startsWith('audience:'));

    logEntry({
      ts: new Date().toISOString(),
      from: ch.title,
      fromChatId: ch.chat_id,
      to: alt ? alt.title : blocked ? '⛔ blocked' : ch.title,
      toChatId: alt ? alt.chat_id : blocked ? '' : ch.chat_id,
      corrected: Boolean(alt),
      blocked,
      issues,
      lang: verdict.lang,
      kind: verdict.kind,
      betting: verdict.betting,
      companies: verdict.companies,
      snippet: text.replace(/\s+/g, ' ').slice(0, 140),
    });

    if (alt) {
      console.warn(
        `[Sentry] ↪ rerouted ${verdict.kind}/${verdict.lang} → ${alt.title}: ${issues.join(' | ')}`
      );
    } else if (blocked) {
      console.warn(`[Sentry] ⛔ blocked (no fitting channel): ${issues.join(' | ')}`);
      return { chatId: '', text, corrected: false, issues, verdict };
    } else {
      console.warn(
        `[Sentry] ⚠ mis-targeted but no alternative → ${ch.title}: ${issues.join(' | ')}`
      );
    }
    const finalText = alt ? adaptForTarget(text, ch, alt) : text;
    return { chatId: alt ? alt.chat_id : chatId, text: finalText, corrected: Boolean(alt), issues, verdict };
  } catch (err: any) {
    console.warn('[Sentry] gate error (send continues):', err?.message);
    return { chatId, text, corrected: false, issues: [], verdict: reviewText(text) };
  }
}

/**
 * Lightweight preview for the dispatcher: which channel will actually receive
 * this post after targeting review? Returns '' when the post would be BLOCKED
 * (company/audience mismatch, no fitting channel) — callers must skip/cancel.
 * No logging, no side effects.
 */
export function previewReroute(chatId: string, text: string): string {
  try {
    const ch = channelsStore.get(chatId);
    if (!ch) return chatId;
    const verdict = reviewText(text);
    const issues = fitIssues(ch, verdict);
    if (issues.length === 0) return chatId;
    const alt = pickAlternative(chatId, verdict);
    if (alt) return alt.chat_id;
    if (issues.some((i) => i.startsWith('company:') || i.startsWith('audience:'))) return '';
    return chatId;
  } catch {
    return chatId;
  }
}

export function getSentryStatus(): any {
  const log = readLog();
  const last24h = log.filter((e) => Date.now() - Date.parse(e?.ts || '') < 24 * 3600 * 1000);
  return {
    logSize: log.length,
    corrections24h: last24h.filter((e) => e?.corrected).length,
    flagged24h: last24h.length,
    byIssue: last24h.reduce((acc: Record<string, number>, e) => {
      for (const i of e?.issues || []) {
        const key = String(i).split(':')[0];
        acc[key] = (acc[key] || 0) + 1;
      }
      return acc;
    }, {}),
    recent: log.slice(0, 20),
  };
}
