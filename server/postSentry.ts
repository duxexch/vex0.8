import * as fs from 'fs';
import * as path from 'path';
import { channelsStore, ChannelProfile } from './channelsStore';

// =========================================================================
// 🛡 بوابة الرقيب — POST SENTRY
// Pre-send targeting gate: every outgoing post is reviewed for language,
// category and audience fit. Mis-targeted posts are REROUTED to a publishable
// channel that actually fits (with signature swap); if no alternative exists
// the post keeps its target and the issue is logged. Never blocks a send.
// =========================================================================

export type TextLang = 'ar' | 'en';
export type ContentKind = 'forecast' | 'live' | 'news' | 'promo' | 'payment' | 'support' | 'generic';

export interface SentryVerdict {
  lang: TextLang;
  kind: ContentKind;
  betting: boolean;
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

const PAYMENT_RE = new RegExp(
  [
    'فودفون كاش', 'انستاباي', 'اتصالات كاش', 'أورنج كاش', 'ميزة', 'محفظة', 'سحب الأرباح',
    'تحويل بنكي', 'دفع', 'ايداع', 'إيداع', 'كاش اوت',
    'vodafone cash', 'instapay', 'meeza', 'withdraw', 'deposit', 'payout', 'bank transfer',
  ].join('|'),
  'i'
);

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
  if (PAYMENT_RE.test(text)) return 'payment';
  if (FORECAST_RE.test(text) || /\d{1,2}\s*[-–:]\s*\d{1,2}/.test(t) && ODDS_RE.test(text)) return 'forecast';
  if (PROMO_RE.test(text)) return 'promo';
  if (LIVE_RE.test(text)) return 'live';
  if (ARABIC_RE.test(text) || /\b(news|report|transfer|injury)\b/.test(t)) return 'news';
  return 'generic';
}

export function detectBetting(text: string): boolean {
  if (BETTING_AR_RE.test(text)) return true;
  if (/\b(bet|wager|stake|odds|bookmaker|parlay)\b/i.test(text)) return true;
  if (PROMO_RE.test(text) && /registration|تسجيل|كود/i.test(text)) return true;
  if (ODDS_RE.test(text) && (FORECAST_RE.test(text) || /\bwin\b|فوز/i.test(text))) return true;
  return false;
}

export function reviewText(text: string): SentryVerdict {
  return {
    lang: detectLang(text),
    kind: detectKind(text),
    betting: detectBetting(text),
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
  if ((v.kind === 'forecast' || v.kind === 'live') && ch.category === 'partners') {
    issues.push(`category: ${v.kind} content on partners channel`);
  }
  if ((v.kind === 'forecast' || v.kind === 'live' || v.kind === 'news') && ch.category === 'support') {
    issues.push(`category: ${v.kind} content on support channel`);
  }
  return issues;
}

function usageWeight(ch: ChannelProfile): number {
  const today = new Date().toISOString().slice(0, 10);
  return ch.daily_reset === today ? ch.daily_used : 0;
}

/** Best alternative publishable channel that fits; null when none exists. */
function pickAlternative(fromChatId: string, v: SentryVerdict): ChannelProfile | null {
  const candidates = channelsStore
    .getPublishable(new Date())
    .filter((c) => c.chat_id !== fromChatId)
    .filter((c) => fitIssues(c, v).length === 0);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => usageWeight(a) - usageWeight(b));
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
 * Returns the (possibly re-targeted) chat id + text. Never throws, never blocks.
 */
export function sentryGate(chatId: string, text: string): SentryResult {
  try {
    const ch = channelsStore.get(chatId);
    if (!ch) return { chatId, text, corrected: false, issues: [], verdict: reviewText(text) };

    const verdict = reviewText(text);
    const issues = fitIssues(ch, verdict);
    if (issues.length === 0) return { chatId, text, corrected: false, issues: [], verdict };

    const alt = pickAlternative(chatId, verdict);
    const target = alt || ch;
    const finalText = alt ? swapSignature(text, ch, alt) : text;

    logEntry({
      ts: new Date().toISOString(),
      from: ch.title,
      fromChatId: ch.chat_id,
      to: alt ? alt.title : ch.title,
      toChatId: alt ? alt.chat_id : ch.chat_id,
      corrected: Boolean(alt),
      issues,
      lang: verdict.lang,
      kind: verdict.kind,
      betting: verdict.betting,
      snippet: text.replace(/\s+/g, ' ').slice(0, 140),
    });

    if (alt) {
      console.warn(
        `[Sentry] ↪ rerouted ${verdict.kind}/${verdict.lang} → ${alt.title}: ${issues.join(' | ')}`
      );
    } else {
      console.warn(
        `[Sentry] ⚠ mis-targeted but no alternative → ${ch.title}: ${issues.join(' | ')}`
      );
    }
    return { chatId: alt ? alt.chat_id : chatId, text: finalText, corrected: Boolean(alt), issues, verdict };
  } catch (err: any) {
    console.warn('[Sentry] gate error (send continues):', err?.message);
    return { chatId, text, corrected: false, issues: [], verdict: reviewText(text) };
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
