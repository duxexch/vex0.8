import { Browser } from 'playwright-core';
import * as fs from 'fs';
import * as path from 'path';
import { launchBrowser } from './browser';

// =========================================================================
// VEX Image Fetcher — browser-based image search for posts (no API key needed).
// Flow: article image → Bing Images search (Playwright) → Google Images → none.
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

async function downloadImage(url: string, dest: string): Promise<boolean> {
  try {
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
 * Fetch a suitable image for a post.
 * @param preferredUrl image URL already present in the article (tried first)
 * @param query search query when fallback search is needed (e.g. "Real Madrid vs Barcelona live")
 * @returns local absolute path or null
 */
export async function fetchPostImage(preferredUrl: string | undefined, query: string): Promise<string | null> {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  const destBase = path.join(IMAGES_DIR, `${Date.now()}_${safeName(query)}`);

  if (preferredUrl) {
    const dest = `${destBase}_src.jpg`;
    if (await downloadImage(preferredUrl, dest)) return dest;
  }

  // Official Google Images API first when configured, then the keyless scrapers.
  const viaCse = await googleCseImageSearch(query, destBase);
  if (viaCse) return viaCse;

  const viaBing = await bingImageSearch(query, destBase);
  if (viaBing) return viaBing;

  const viaGoogle = await googleImageSearch(query, destBase);
  if (viaGoogle) return viaGoogle;

  // Last resort: keyless Pollinations AI — generates a fitting graphic instead
  // of returning nothing when both browser searches come up empty.
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