import { Browser } from 'playwright-core';
import * as fs from 'fs';
import * as path from 'path';
import { launchBrowser } from './browser';

// =========================================================================
// VEX Image Fetcher — post image sourcing (all free tiers, cheapest first):
// article image → Google CSE (if keys) → Openverse (keyless API) → Bing →
// Google (Playwright) → LoremFlickr (keyless) → Pollinations (keyless AI).
// Downloads to data/post-images/ and returns a local path.
// =========================================================================

const IMAGES_DIR = path.join(process.cwd(), 'data', 'post-images');
let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await launchBrowser();
  }
  return browser;
}

export async function closeImageBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

function safeName(query: string): string {
  return query.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, '_').slice(0, 60);
}

// ---------------------------------------------------------------------------
// Brand safety — never download an image whose URL carries a bookmaker brand.
// A competitor-branded screenshot under our promo post advertises a rival, so
// every download in every chain passes this gate (companies.json + known list).
// ---------------------------------------------------------------------------
let brandTokenCache: string[] | null = null;
function brandBlocklist(): string[] {
  if (!brandTokenCache) {
    const extra = [
      'betwinner', '1xbet', 'melbet', 'mostbet', 'linebet', 'bizbet', 'betjam',
      'gooobet', 'paripesa', '888starz', 'parimatch', 'bet365', 'betfair',
      'fonbet', 'williamhill', 'pinnacle', 'winline', 'ligastavok', '1win',
      '22bet', 'betway', 'draftkings', 'fanuel', 'unibet', 'bwin', 'stake',
      'betongame', 'xpari', 'winwin',
      // watermark-prone stock agencies — preview images carry visible watermarks
      'alamy', 'shutterstock', 'gettyimages', 'istockphoto', 'dreamstime',
      '123rf', 'depositphotos', 'canstockphoto', 'vectorstock', 'stock.adobe',
      'fotolia', 'agefotostock', 'imago-images', 'picfair', 'freepik',
      'vecteezy', 'pngtree', 'magnific', 'envato', 'pond5', 'clipdealer',
      'premium-photo', 'premium-image', 'ftcdn.net', 'adobe stock',
    ];
    let names: string[] = [];
    try {
      const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'companies.json'), 'utf-8'));
      if (Array.isArray(data)) names = data.map((c: any) => String(c?.name || '').toLowerCase()).filter(Boolean);
    } catch { /* no companies file — the built-in list still guards */ }
    brandTokenCache = Array.from(new Set([...names, ...extra])).filter((t) => t.length >= 4);
  }
  return brandTokenCache;
}

function isBrandSafeUrl(url: string): boolean {
  const low = url.toLowerCase();
  return !brandBlocklist().some((t) => low.includes(t));
}

// ---------------------------------------------------------------------------
// Source cooldowns — a hard network failure (blocked host, 5xx burst) pauses
// that source for 30min instead of re-stalling every post. One warn per outage.
// ---------------------------------------------------------------------------
const sourceDownUntil = new Map<string, number>();
const SOURCE_COOLDOWN_MS = 30 * 60 * 1000;

function sourceUsable(name: string): boolean {
  const until = sourceDownUntil.get(name);
  return !until || Date.now() > until;
}

function markSourceDown(name: string, why: string): void {
  if (!sourceDownUntil.has(name)) console.warn(`[ImageFetcher] ${name} unavailable — cooldown 30min:`, why);
  sourceDownUntil.set(name, Date.now() + SOURCE_COOLDOWN_MS);
}

async function downloadImage(url: string, dest: string): Promise<boolean> {
  try {
    if (!isBrandSafeUrl(url) || !isRelevantImageUrl(url)) return false;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    });
    if (!res.ok) return false;
    const type = res.headers.get('content-type') || '';
    if (!type.startsWith('image/')) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 5000 || buf.length > 8 * 1024 * 1024) return false;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    return true;
  } catch {
    return false;
  }
}

/** Search Bing Images via Playwright and download the first usable result. */
async function bingImageSearch(query: string, destBase: string): Promise<string | null> {
  const b = await getBrowser();
  const page = await b.newPage();
  try {
    await page.goto(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(2500);
    const urls = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll('.imgpt a.iusc, a.iusc').forEach((el) => {
        try {
          const m = JSON.parse((el as HTMLElement).getAttribute('m') || '{}');
          if (m.murl) out.push(m.murl);
        } catch {}
      });
      if (out.length === 0) {
        document.querySelectorAll('img.src, .mimg').forEach((img) => {
          const src = (img as HTMLImageElement).src;
          if (src && src.startsWith('http')) out.push(src);
        });
      }
      return out.slice(0, 10);
    });
    for (let i = 0; i < urls.length; i++) {
      const dest = `${destBase}_bing${i}.jpg`;
      if (await downloadImage(urls[i], dest)) return dest;
    }
    return null;
  } catch (err: any) {
    console.warn('[ImageFetcher] bing search failed:', err.message);
    markSourceDown('bing', err.message);
    return null;
  } finally {
    await page.close();
  }
}

/** Search Google Images via Playwright (fallback when Bing fails). */
async function googleImageSearch(query: string, destBase: string): Promise<string | null> {
  const b = await getBrowser();
  const page = await b.newPage();
  try {
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(2500);
    const urls = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll('img').forEach((img) => {
        const s = (img as HTMLImageElement).src;
        if (s && s.startsWith('http') && !s.includes('gstatic.com/images')) out.push(s);
      });
      return out.slice(0, 10);
    });
    for (let i = 0; i < urls.length; i++) {
      const dest = `${destBase}_ggl${i}.jpg`;
      if (await downloadImage(urls[i], dest)) return dest;
    }
    return null;
  } catch (err: any) {
    console.warn('[ImageFetcher] google search failed:', err.message);
    markSourceDown('google', err.message);
    return null;
  } finally {
    await page.close();
  }
}

/**
 * Google Programmable Search (Custom Search JSON API) — the official Google
 * Images API. Only used when BOTH GOOGLE_CSE_KEY and GOOGLE_CSE_CX are set in
 * the environment; otherwise it returns null and the keyless searches below take
 * over, so nothing breaks while the keys are absent. Free tier: 100/day.
 */
async function googleCseImageSearch(query: string, destBase: string): Promise<string | null> {
  const key = (process.env.GOOGLE_CSE_KEY || '').trim();
  const cx = (process.env.GOOGLE_CSE_CX || '').trim();
  if (!key || !cx) return null;
  try {
    const url =
      `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}` +
      `&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}` +
      `&searchType=image&num=8&safe=active&imgType=photo&imgSize=large`;
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) {
      console.warn(`[ImageFetcher] Google CSE HTTP ${res.status} — falling back to scraper`);
      return null;
    }
    const data = await res.json().catch(() => ({}));
    const items: any[] = Array.isArray(data.items) ? data.items : [];
    for (let i = 0; i < items.length; i++) {
      const link = items[i]?.link;
      if (!link) continue;
      const dest = `${destBase}_cse${i}.jpg`;
      if (await downloadImage(link, dest)) return dest;
    }
    return null;
  } catch (err: any) {
    console.warn('[ImageFetcher] Google CSE failed:', err?.message);
    return null;
  }
}

/**
 * Openverse — free keyless Creative-Commons image search API (commercial-use
 * filter on, since these posts promote affiliate links). First real API in the
 * chain: no key, no browser, stable JSON — so it beats the scrapers on cost.
 */
async function openverseImageSearch(query: string, destBase: string): Promise<string | null> {
  if (!sourceUsable('openverse')) return null;
  try {
    const base = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=10`;
    let url = `${base}&license_type=commercial&size=large`;
    let res = await fetch(url, {
      headers: { 'User-Agent': 'vex-deals/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      // some deployments reject the optional filters — retry with just q+page_size
      res = await fetch(base, {
        headers: { 'User-Agent': 'vex-deals/1.0' },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        markSourceDown('openverse', `HTTP ${res.status}`);
        return null;
      }
    }
    const data = await res.json().catch(() => ({}));
    const items: any[] = Array.isArray(data.results) ? data.results : [];
    for (let i = 0; i < items.length; i++) {
      const u = items[i]?.url;
      if (!u) continue;
      const dest = `${destBase}_ov${i}.jpg`;
      if (await downloadImage(u, dest)) return dest;
    }
    return null;
  } catch (err: any) {
    // network-level failure (blocked host / timeout) → pause the source
    markSourceDown('openverse', err?.message || 'network error');
    return null;
  }
}

/**
 * LoremFlickr — free keyless keyword-locked photos straight from Flickr.
 * Always answers (rotates via ?lock=), so it is the last real-photo source
 * before the AI generator.
 */
async function loremFlickrImage(query: string, destBase: string): Promise<string | null> {
  if (!sourceUsable('loremflickr')) return null;
  const tags = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .slice(0, 4)
    .join(',');
  if (!tags) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const lock = (Date.now() % 99991) + attempt;
    const url = `https://loremflickr.com/1024/768/${encodeURIComponent(tags)}?lock=${lock}`;
    if (!isBrandSafeUrl(url)) continue;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36' },
        signal: AbortSignal.timeout(10000),
        redirect: 'follow',
      });
      if (!res.ok) {
        markSourceDown('loremflickr', `HTTP ${res.status}`);
        return null;
      }
      const type = res.headers.get('content-type') || '';
      if (!type.startsWith('image/')) {
        markSourceDown('loremflickr', `content-type ${type || 'empty'}`);
        return null;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 5000 || buf.length > 8 * 1024 * 1024) return null;
      const dest = `${destBase}_lf${attempt}.jpg`;
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buf);
      return dest;
    } catch (err: any) {
      markSourceDown('loremflickr', err?.message || 'network error');
      return null;
    }
  }
  return null;
}

/**
 * Query normalization — the post corpus mixes "football" meanings: a US
 * audience reads it as NFL, and searches return American-football photos for
 * our association-football posts. Rewriting to "soccer" keeps every caller's
 * intent (teams, goals, stadiums) while pinning the right sport.
 */
function normalizeImageQuery(query: string): string {
  return query
    .replace(/\bamerican\s+football\b/gi, 'soccer')
    .replace(/\bfootball\b/gi, 'soccer')
    .replace(/\bnfl\b/gi, 'soccer')
    .trim();
}

/** URLs whose slug signals the wrong sport (US football) for our posts. */
const WRONG_SPORT_RE = /\b(nfl|ncaa|superbowl|super-bowl|gridiron|quarterback|touchdown|helmet)\b/i;
function isRelevantImageUrl(url: string): boolean {
  return !WRONG_SPORT_RE.test(url);
}

/**
 * Fetch a suitable image for a post.
 * @param preferredUrl image URL already present in the article (tried first)
 * @param query search query when fallback search is needed (e.g. "Real Madrid vs Barcelona live")
 * @returns local absolute path or null
 */
export async function fetchPostImage(preferredUrl: string | undefined, query: string): Promise<string | null> {
  query = normalizeImageQuery(query);
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  const destBase = path.join(IMAGES_DIR, `${Date.now()}_${safeName(query)}`);

  if (preferredUrl) {
    const dest = `${destBase}_src.jpg`;
    if (await downloadImage(preferredUrl, dest)) return dest;
  }

  // Official Google Images API first when configured…
  const viaCse = await googleCseImageSearch(query, destBase);
  if (viaCse) return viaCse;

  // …then the FREE keyless APIs (Openverse), then the free browser scrapers,
  // then LoremFlickr (keyless), and finally Pollinations (keyless AI).
  const viaOpenverse = await openverseImageSearch(query, destBase);
  if (viaOpenverse) return viaOpenverse;

  const viaBing = await bingImageSearch(query, destBase);
  if (viaBing) return viaBing;

  const viaGoogle = await googleImageSearch(query, destBase);
  if (viaGoogle) return viaGoogle;

  const viaFlickr = await loremFlickrImage(query, destBase);
  if (viaFlickr) return viaFlickr;

  // Last resort: keyless Pollinations AI — generates a fitting graphic instead
  // of returning nothing when every real-photo source comes up empty.
  const aiDest = `${destBase}_ai.jpg`;
  return (await pollinationsImage(query, aiDest)) ? aiDest : null;
}

/** Keyless AI image generation (Pollinations). Longer timeout than web downloads. */
async function pollinationsImage(query: string, dest: string): Promise<boolean> {
  try {
    const seed = Math.floor(Math.random() * 1_000_000);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(query)}?width=768&height=768&nologo=true&seed=${seed}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' },
      signal: AbortSignal.timeout(60000),
      redirect: 'follow',
    });
    if (!res.ok) return false;
    const type = res.headers.get('content-type') || '';
    if (!type.startsWith('image/')) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 5000 || buf.length > 8 * 1024 * 1024) return false;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    return true;
  } catch {
    return false;
  }
}

/** Clean up images older than 7 days to avoid disk bloat. */
export function cleanupOldImages(): void {
  try {
    if (!fs.existsSync(IMAGES_DIR)) return;
    const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
    for (const f of fs.readdirSync(IMAGES_DIR)) {
      const p = path.join(IMAGES_DIR, f);
      if (fs.statSync(p).mtimeMs < cutoff) fs.unlinkSync(p);
    }
  } catch {}
}