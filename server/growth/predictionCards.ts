import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { launchBrowser } from '../browser';
import type { PredictionMention } from '../forecastChain';

// =========================================================================
// Prediction image cards — 1080×1080 PNG rendered via the shared chromium.
// Public shareable URL: GET /api/prediction-card.png?h=..&a=..&ph=..&pd=..&pa=..&s=..&ko=..&lg=..
// Used by: WhatsApp manual batches (attachable image), promo posts, channels.
// =========================================================================

export interface CardMatch {
  league: string;
  home: string;
  away: string;
  pHome: number;
  pDraw: number;
  pAway: number;
  predictedScore: string;
  kickoffLabel: string;
  slug?: string;
}

const CARDS_DIR = path.join(process.cwd(), 'data', 'prediction-cards');
const PUBLIC_BASE = (process.env.PUBLIC_BASE_URL || 'https://1xbetservices.com').replace(/\/+$/, '');

export function escHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function cardKey(m: CardMatch): string {
  return `${m.slug || `${m.home}_vs_${m.away}`}_${m.predictedScore || 'x'}`
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '_')
    .slice(0, 90);
}

export function cardPublicUrl(m: CardMatch): string {
  const q = new URLSearchParams({
    lg: m.league,
    h: m.home,
    a: m.away,
    ph: String(Math.round(m.pHome)),
    pd: String(Math.round(m.pDraw)),
    pa: String(Math.round(m.pAway)),
    s: m.predictedScore,
    ko: m.kickoffLabel,
  });
  if (m.slug) q.set('slug', m.slug);
  return `${PUBLIC_BASE}/api/prediction-card.png?${q.toString()}`;
}

export function matchToCard(up: PredictionMention): CardMatch {
  return {
    league: up.league,
    home: up.home,
    away: up.away,
    pHome: up.pHome,
    pAway: up.pAway,
    pDraw: up.pDraw ?? Math.max(0, 100 - up.pHome - up.pAway),
    predictedScore: up.predictedScore,
    kickoffLabel: up.kickoffLabel,
    slug: up.slug,
  };
}

function bar(label: string, pct: number, color: string): string {
  const w = Math.max(6, Math.min(100, pct));
  return `
    <div style="margin:10px 0">
      <div style="display:flex;justify-content:space-between;font-size:28px;color:#e2e8f0;font-weight:700;margin-bottom:7px">
        <span>${escHtml(label)}</span><span style="color:${color}">${Math.round(pct)}%</span>
      </div>
      <div style="height:22px;background:#1e293b;border-radius:11px;overflow:hidden">
        <div style="height:100%;width:${w}%;background:linear-gradient(90deg,${color},${color}cc);border-radius:11px"></div>
      </div>
    </div>`;
}

export function buildCardHtml(m: CardMatch): string {
  const homePct = Math.round(m.pHome);
  const drawPct = Math.round(m.pDraw);
  const awayPct = Math.round(m.pAway);
  const score = m.predictedScore || '—';
  return `<!DOCTYPE html>
<html dir="auto"><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:1080px; height:1080px; overflow:hidden;
    font-family:'Segoe UI', Tahoma, 'Noto Sans Arabic', 'Noto Naskh Arabic', 'DejaVu Sans', 'Noto Color Emoji', Arial, sans-serif;
    background:
      radial-gradient(circle at 15% 10%, rgba(16,185,129,0.22), transparent 42%),
      radial-gradient(circle at 90% 90%, rgba(56,189,248,0.14), transparent 45%),
      linear-gradient(160deg, #0f172a 0%, #022c22 100%);
    color:#f8fafc; padding:40px 70px; display:flex; flex-direction:column;
  }
</style></head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
    <div style="font-size:42px;font-weight:900;letter-spacing:1px">
      <span style="color:#10b981">VEX</span> DEALS
    </div>
    <div style="background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.45);color:#6ee7b7;
                padding:10px 24px;border-radius:999px;font-size:25px;font-weight:700">
      ⚽ تحليل الذكاء الاصطناعي
    </div>
  </div>

  <div style="text-align:center;margin-bottom:10px">
    <span style="background:#1e293b;color:#94a3b8;padding:8px 28px;border-radius:999px;font-size:26px;font-weight:600">
      ${escHtml(m.league || 'مباراة ودية')}
    </span>
  </div>

  <div style="display:flex;justify-content:center;align-items:center;gap:34px;margin:16px 0 6px">
    <div style="font-size:54px;font-weight:900;max-width:400px;line-height:1.15" dir="auto">${escHtml(m.home)}</div>
    <div style="font-size:44px;color:#10b981;font-weight:900">VS</div>
    <div style="font-size:54px;font-weight:900;max-width:400px;line-height:1.15" dir="auto">${escHtml(m.away)}</div>
  </div>
  ${m.kickoffLabel ? `<div style="text-align:center;color:#94a3b8;font-size:28px;margin-bottom:14px">⏰ ${escHtml(m.kickoffLabel)}</div>` : '<div style="margin-bottom:14px"></div>'}

  <div style="background:rgba(15,23,42,0.72);border:1px solid #1e293b;border-radius:28px;padding:22px 44px;margin-bottom:20px">
    ${bar(m.home, homePct, '#10b981')}
    ${bar('تعادل', drawPct, '#f59e0b')}
    ${bar(m.away, awayPct, '#38bdf8')}
  </div>

  <div style="display:flex;justify-content:center;gap:26px;align-items:center;margin-bottom:auto">
    <div style="background:linear-gradient(135deg,#10b981,#059669);border-radius:22px;padding:16px 44px;
                font-size:46px;font-weight:900;box-shadow:0 12px 40px rgba(16,185,129,0.35)">
      ${escHtml(score)}
    </div>
    <div style="font-size:28px;color:#94a3b8;font-weight:600;line-height:1.4">النتيجة<br>المتوقعة</div>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #1e293b;padding-top:20px;margin-top:20px">
    <div style="font-size:26px;color:#94a3b8">📈 احتمالات محسوبة من Gemini AI</div>
    <div style="font-size:32px;font-weight:800;color:#10b981">vex.deals</div>
  </div>
</body></html>`;
}

let rendering = 0;

/** Render (or reuse cached) a 1080×1080 PNG from raw HTML. Returns absolute path or null on failure. */
async function renderHtmlPng(key: string, html: string): Promise<string | null> {
  const file = path.join(CARDS_DIR, `${key}.png`);
  if (fs.existsSync(file)) return file;
  if (rendering >= 2) return null; // concurrency guard — cards are rare, no queue needed
  rendering++;
  let browser: any = null;
  try {
    fs.mkdirSync(CARDS_DIR, { recursive: true });
    browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 1080, height: 1080 } });
    await page.setContent(html, { waitUntil: 'load', timeout: 15000 });
    await page.screenshot({ path: file, type: 'png' });
    await page.close();
    cleanupOldCards();
    return file;
  } catch (err: any) {
    console.warn('[Cards] render failed:', err?.message);
    return null;
  } finally {
    rendering--;
    try {
      await browser?.close();
    } catch {}
  }
}

/** Render (or reuse cached) prediction card PNG. Returns absolute path or null on failure. */
export async function renderPredictionCardPng(m: CardMatch): Promise<string | null> {
  return renderHtmlPng(cardKey(m), buildCardHtml(m));
}

function cleanupOldCards(): void {
  try {
    const cutoff = Date.now() - 30 * 86400000;
    for (const f of fs.readdirSync(CARDS_DIR)) {
      const p = path.join(CARDS_DIR, f);
      if (fs.statSync(p).mtimeMs < cutoff) fs.unlinkSync(p);
    }
  } catch {}
}

// =========================================================================
// Records card (سجل التوقعات) + company cards — same 1080×1080 dark design.
// =========================================================================

export interface RecordsCardPayload {
  hits: number;
  misses: number;
  draws: number;
  settled: number;
  pending: number;
  accuracy: number | null;
  /** YYYY-MM-DD label shown on the card */
  dateLabel: string;
  results: Array<{ match: string; predicted: string; actual: string; verdict: string }>;
}

export interface CompanyCardPayload {
  id: string;
  name: string;
  color: string;
  badge?: string;
  bonus?: string;
  promoCode: string;
}

/** White/near-black text that stays readable on top of an arbitrary brand color. */
function readableOn(hex: string): string {
  const h = String(hex || '').replace('#', '');
  if (h.length < 6) return '#ffffff';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return '#ffffff';
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#0f172a' : '#ffffff';
}

export function recordsCardKey(p: RecordsCardPayload): string {
  return 'records_' + crypto.createHash('sha1').update(JSON.stringify(p)).digest('hex').slice(0, 16);
}

export function companyCardKey(c: CompanyCardPayload): string {
  const basis = [c.id, c.name, c.color, c.badge || '', c.bonus || '', c.promoCode || ''].join('|');
  return 'company_' + crypto.createHash('sha1').update(basis).digest('hex').slice(0, 16);
}

/** Site-feed URL (origin-relative so every domain serves its own card). */
export function recordsCardPublicUrl(): string {
  return '/api/records-card.png';
}

export function companyCardPublicUrl(id: string): string {
  return `/api/company-card.png?c=${encodeURIComponent(id)}`;
}

export function buildRecordsCardHtml(p: RecordsCardPayload): string {
  const statBox = (value: string, label: string, color: string): string => `
    <div style="flex:1;min-width:0;background:rgba(15,23,42,0.72);border:1px solid #1e293b;border-radius:22px;padding:20px 8px;text-align:center">
      <div style="font-size:52px;font-weight:900;color:${color};line-height:1.05">${escHtml(value)}</div>
      <div style="font-size:23px;color:#94a3b8;font-weight:800;margin-top:8px">${escHtml(label)}</div>
    </div>`;
  const verdictMeta = (v: string) =>
    v === 'hit'
      ? { e: '✅', t: 'تحقق', c: '#10b981' }
      : v === 'miss'
        ? { e: '❌', t: 'لم يتحقق', c: '#f43f5e' }
        : { e: '➖', t: 'تعادل', c: '#f59e0b' };
  const rows = p.results
    .map((r) => {
      const v = verdictMeta(r.verdict);
      return `
      <div class="rr" style="display:flex;align-items:center;gap:16px;padding:15px 0;border-bottom:1px solid #1e293b">
        <div style="flex:1;min-width:0;font-size:27px;font-weight:800;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" dir="auto">${escHtml(r.match)}</div>
        <div style="flex-shrink:0;font-size:25px;font-weight:800;color:#94a3b8;font-family:monospace;white-space:nowrap">${escHtml(r.predicted)} → ${escHtml(r.actual || '—')}</div>
        <div style="flex-shrink:0;min-width:158px;text-align:center;background:${v.c}1f;border:1px solid ${v.c}66;color:${v.c};border-radius:999px;padding:7px 14px;font-size:23px;font-weight:900">${v.e} ${v.t}</div>
      </div>`;
    })
    .join('');
  const acc = p.accuracy !== null && p.accuracy !== undefined ? `${p.accuracy}%` : '—';
  return `<!DOCTYPE html>
<html dir="auto"><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:1080px; height:1080px; overflow:hidden;
    font-family:'Segoe UI', Tahoma, 'Noto Sans Arabic', 'Noto Naskh Arabic', 'DejaVu Sans', 'Noto Color Emoji', Arial, sans-serif;
    background:
      radial-gradient(circle at 15% 10%, rgba(16,185,129,0.22), transparent 42%),
      radial-gradient(circle at 90% 90%, rgba(56,189,248,0.14), transparent 45%),
      linear-gradient(160deg, #0f172a 0%, #022c22 100%);
    color:#f8fafc; padding:40px 70px; display:flex; flex-direction:column;
  }
  .rr:last-child { border-bottom:none !important; }
</style></head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
    <div style="font-size:42px;font-weight:900;letter-spacing:1px">
      <span style="color:#10b981">VEX</span> DEALS
    </div>
    <div style="background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.45);color:#6ee7b7;
                padding:10px 24px;border-radius:999px;font-size:25px;font-weight:700">
      📊 سجل التوقعات
    </div>
  </div>

  <div style="text-align:center;margin-bottom:18px">
    <span style="background:#1e293b;color:#94a3b8;padding:8px 28px;border-radius:999px;font-size:26px;font-weight:600">
      📈 نتائج شفافة — تُحدَّث آليًا
    </span>
  </div>

  <div style="display:flex;gap:18px;margin-bottom:12px">
    ${statBox(String(p.hits), '✅ ناجح', '#10b981')}
    ${statBox(String(p.misses), '❌ فاشل', '#f43f5e')}
    ${statBox(String(p.draws), '➖ تعادل', '#f59e0b')}
    ${statBox(acc, '🎯 الدقة', '#38bdf8')}
  </div>

  <div style="text-align:center;color:#94a3b8;font-size:25px;font-weight:700;margin-bottom:16px">
    من ${p.settled} توقعًا منتهيًا${p.pending ? ` (+${p.pending} معلّق)` : ''} • 📅 <bdi dir="ltr">${escHtml(p.dateLabel)}</bdi>
  </div>

  <div style="flex:1;min-height:0;display:flex;flex-direction:column;background:rgba(15,23,42,0.72);border:1px solid #1e293b;border-radius:28px;padding:10px 34px 20px;margin-bottom:24px">
    <div style="font-size:28px;font-weight:900;color:#e2e8f0;padding:14px 0 4px">🔥 آخر النتائج</div>
    <div style="flex:1;min-height:0;display:flex;flex-direction:column;justify-content:space-evenly">
      ${rows || '<div style="color:#94a3b8;font-size:26px;padding:18px 0">لا توجد نتائج منتهية بعد</div>'}
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #1e293b;padding-top:20px;margin-top:20px">
    <div style="font-size:26px;color:#94a3b8">📈 احتمالات محسوبة من Gemini AI</div>
    <div style="font-size:32px;font-weight:800;color:#10b981">vex.deals</div>
  </div>
</body></html>`;
}

export function buildCompanyCardHtml(c: CompanyCardPayload): string {
  const color = c.color || '#10b981';
  const on = readableOn(color);
  const bonus = (c.bonus || '').trim();
  const badge = (c.badge || '').trim();
  const promo = (c.promoCode || '').trim();
  return `<!DOCTYPE html>
<html dir="auto"><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:1080px; height:1080px; overflow:hidden;
    font-family:'Segoe UI', Tahoma, 'Noto Sans Arabic', 'Noto Naskh Arabic', 'DejaVu Sans', 'Noto Color Emoji', Arial, sans-serif;
    background:
      radial-gradient(circle at 15% 10%, rgba(16,185,129,0.22), transparent 42%),
      radial-gradient(circle at 90% 90%, rgba(56,189,248,0.14), transparent 45%),
      linear-gradient(160deg, #0f172a 0%, #022c22 100%);
    color:#f8fafc; padding:40px 70px; display:flex; flex-direction:column;
  }
</style></head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:26px">
    <div style="font-size:42px;font-weight:900;letter-spacing:1px">
      <span style="color:#10b981">VEX</span> DEALS
    </div>
    <div style="background:${color}26;border:1px solid ${color}73;color:${on};
                padding:10px 24px;border-radius:999px;font-size:25px;font-weight:800">
      🏆 شريك معتمد
    </div>
  </div>

  <div style="display:flex;flex-direction:column;align-items:center;justify-content:space-evenly;flex:1;min-height:0;margin-bottom:12px;text-align:center">
    <div style="font-size:68px;font-weight:900;letter-spacing:1px;line-height:1.15;max-width:920px;word-break:break-word" dir="auto">${escHtml(c.name)}</div>

    ${badge ? `<div style="background:${color};color:${on};padding:9px 26px;border-radius:999px;font-size:26px;font-weight:900">✅ ${escHtml(badge)}</div>` : ''}

    ${bonus ? `<div style="background:rgba(15,23,42,0.72);border:1px solid ${color}55;border-radius:24px;padding:18px 44px;font-size:31px;font-weight:800;color:#e2e8f0;max-width:900px">🎁 ${escHtml(bonus)}</div>` : ''}

    ${promo ? `<div style="display:flex;justify-content:center;align-items:center;gap:26px">
      <div style="background:linear-gradient(135deg,${color},${color}d0);border-radius:22px;padding:16px 44px;
                  font-size:50px;font-weight:900;color:${on};box-shadow:0 12px 40px ${color}59">${escHtml(promo)}</div>
      <div style="font-size:27px;color:#94a3b8;font-weight:800;line-height:1.4;text-align:left">كود الخصم<br>انسخه فورًا</div>
    </div>` : ''}

    <div style="font-size:26px;color:#94a3b8;font-weight:700">🛡️ كاش باك وتعويض كامل ضد الخسائر مع VEX</div>

    <div style="background:${color};color:${on};padding:14px 42px;border-radius:999px;font-size:28px;font-weight:900;
                box-shadow:0 12px 40px ${color}59">📲 سجّل الآن عبر الرابط الرسمي</div>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #1e293b;padding-top:20px;margin-top:24px">
    <div style="font-size:26px;color:#94a3b8">⚡ كود وكالة معتمد — حماية رسمية عبر VEX</div>
    <div style="font-size:32px;font-weight:800;color:#10b981">vex.deals</div>
  </div>
</body></html>`;
}

export async function renderRecordsCardPng(p: RecordsCardPayload): Promise<string | null> {
  return renderHtmlPng(recordsCardKey(p), buildRecordsCardHtml(p));
}

export async function renderCompanyCardPng(c: CompanyCardPayload): Promise<string | null> {
  return renderHtmlPng(companyCardKey(c), buildCompanyCardHtml(c));
}
