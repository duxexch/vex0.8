// =========================================================================
// Promo-code hygiene — كود البرومو في أي نص يجب أن يكون لكود الشركة الحقيقية
//
// A post/offer may only ever carry a promo code the brand it promotes owns.
// Two complementary passes:
//   1) BARE  — exact match of a KNOWN platform code, word-bounded (catches the
//              dominant case: a correct 1XBET code riding along into another
//              brand's channel). Short codes (<6 alnum, i.e. GOOOBET's «Vex»)
//              are skipped here so the «VEX Deals» brand is never eaten.
//   2) LABEL — any token directly after a promo label («كود الخصم: X»,
//              «PRMO CODE 🔶: X», «الرمز الترويجي الخاص الان "X"» …) that is
//              not allowed gets rewritten to `fallback` (or the whole labelled
//              chunk is dropped when there is no fallback). This catches short
//              and completely unknown foreign codes (QNT7, ARX2…).
//
// Pure module: no imports — callers pass their own company list.
// =========================================================================

export interface PromoAlignOptions {
  /** Codes allowed to remain verbatim (case-insensitive). */
  allowed: string[];
  /** Code that replaces every non-allowed one; '' drops the labelled chunk. */
  fallback: string;
  /** Codes to hunt BARE in the text. Defaults to `allowed` + `fallback`. */
  known?: string[];
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** English words that may sit between a label and its code — never codes. */
const STOPWORDS = [
  'for', 'the', 'and', 'your', 'you', 'new', 'now', 'today', 'here', 'with',
  'this', 'that', 'get', 'use', 'code', 'promo', 'bonus', 'players', 'player',
  'sign', 'all', 'our', 'best', 'free', 'join', 'win', 'via', 'from', 'when',
  'valid', 'working', 'official', 'exact', 'real', 'same', 'correct',
  'available', 'enter', 'below', 'above', 'more', 'most', 'any', 'some',
  'one', 'every', 'right', 'left', 'great', 'top', 'ready', 'open', 'live',
  'on', 'in', 'at', 'to', 'of', 'is', 'are', 'a', 'an', 'it', 'as', 'or',
  'be', 'by', 'up', 'do', 'so', 'if', 'we', 'us', 'my', 'no', 'not', 'can',
  'will', 'just', 'only', 'have', 'has', 'been', 'was', 'were', 'these',
  'those', 'there', 'their', 'them', 'they', 'its', 'his', 'her', 'who',
  'what', 'where', 'how', 'why', 'which', 'into', 'over', 'under', 'after',
  'before', 'during', 'within', 'without', 'using', 'click', 'tap', 'copy',
  'paste', 'apply', 'entering',
].join('|');

/**
 * Arabic + English promo labels as seen in the wild (incl. misspellings
 * «PRMO CODE» / «code pomo»), a bounded non-code filler, then the token.
 * Lookbehinds stop «باركود» from matching «كود» and «barcode» from «code».
 * The filler may cross Arabic words and STOPWORD'd English words but never a
 * digit (so «كود الخصم 130%» can never treat 130 as a code).
 */
const LABELLED_RE = new RegExp(
  '(' +
    '(?<![A-Za-z\\u0600-\\u06FF])' +
    '(?:كود(?:\\s*(?:الخصم|البرومو|برومو|التسجيل|الترويجي|الهدية|الخاص|الحصري|الرسمي|الفعلي|التطبيق|الفوري))?' +
    '|الرمز\\s*الترويجي|البرومو\\s*كود' +
    '|(?:promo|pomo|prmo)\\s*code|code\\s*(?:promo|pomo|prmo)|code)' +
    '(?![A-Za-z\\u0600-\\u06FF])' +
    // filler: any non-latin/non-digit char, or a whole English stopword+space
    '(?:(?:[^A-Za-z0-9\\n])|(?:' + STOPWORDS + ')\\s+){0,20}?' +
    ')' +
    // the token: never a stopword («promo code for players» must not match «for»)
    '(?!(?:' + STOPWORDS + ')\\b)' +
    '([A-Za-z0-9][A-Za-z0-9_\\-]{1,19})' +
    '([)\\]"\'»]+)?',
  'g'
);

/** Every distinct non-empty promo code, longest first (bare-pass order). */
export function distinctPromoCodes(
  companies: Array<{ promo_code?: string }>
): string[] {
  const set = new Set<string>();
  for (const c of companies || []) {
    const code = String(c?.promo_code || '').trim();
    if (code) set.add(code);
  }
  return [...set].sort((a, b) => b.length - a.length);
}

/** The promo code a company owns ('' = none). Fuzzy name match, case-insensitive. */
export function promoCodeFor(
  companyName: string,
  companies: Array<{ name?: string; promo_code?: string }>
): string {
  const key = String(companyName || '').trim().toLowerCase();
  if (!key) return '';
  for (const c of companies || []) {
    const n = String(c?.name || '').trim().toLowerCase();
    if (n && (n === key || n.includes(key) || key.includes(n))) {
      const code = String(c?.promo_code || '').trim();
      if (code) return code;
    }
  }
  return '';
}

/**
 * Rewrite/remove every promo code in `text` that is not in `allowed`.
 * Never throws; returns the input untouched when nothing needs to change.
 */
export function alignPromoCodes(text: string, opts: PromoAlignOptions): string {
  if (!text) return text;
  const allowedUp = new Set((opts.allowed || []).filter(Boolean).map((c) => c.toUpperCase()));
  const fallback = String(opts.fallback || '');
  const known = opts.known && opts.known.length ? opts.known : [...(opts.allowed || []), fallback];

  let out = text;

  // Pass 2 (FIRST): labelled tokens — rewrite the token but keep label+filler,
  // or drop the whole labelled chunk when there is no fallback code.
  out = out.replace(LABELLED_RE, (m, prefix, token, trail) => {
    if (allowedUp.has(String(token).toUpperCase())) return m;
    if (fallback) return `${prefix}${fallback}${trail || ''}`;
    return '';
  });

  // Pass 1: exact known codes anywhere. Skip short codes (<6 alnum) — bare
  // «Vex» would eat the «VEX Deals» brand (its labelled form is pass 2's job).
  for (const code of known) {
    const c = String(code || '').trim();
    if (!c || allowedUp.has(c.toUpperCase())) continue;
    if (c.replace(/[^A-Za-z0-9]/g, '').length < 6) continue;
    const re = new RegExp(`(?<![A-Za-z0-9_])${escapeRe(c)}(?![A-Za-z0-9_])`, 'g');
    out = out.replace(re, fallback);
  }

  return out
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/(^|\n)[\s)\]"'»]+/g, '$1')
    .replace(/\n{3,}/g, '\n\n');
}
