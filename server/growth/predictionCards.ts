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

/** Render (or reuse cached) 1080×1080 PNG. Returns absolute path or null on failure. */
export async function renderPredictionCardPng(m: CardMatch): Promise<string | null> {
  const file = path.join(CARDS_DIR, `${cardKey(m)}.png`);
  if (fs.existsSync(file)) return file;
  if (rendering >= 2) return null; // concurrency guard — cards are rare, no queue needed
  rendering++;
  let browser: any = null;
  try {
    fs.mkdirSync(CARDS_DIR, { recursive: true });
    browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 1080, height: 1080 } });
    await page.setContent(buildCardHtml(m), { waitUntil: 'load', timeout: 15000 });
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

function cleanupOldCards(): void {
  try {
    const cutoff = Date.now() - 30 * 86400000;
    for (const f of fs.readdirSync(CARDS_DIR)) {
      const p = path.join(CARDS_DIR, f);
      if (fs.statSync(p).mtimeMs < cutoff) fs.unlinkSync(p);
    }
  } catch {}
}
