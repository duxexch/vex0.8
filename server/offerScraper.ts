import * as fs from 'fs';
import * as path from 'path';
import { Browser, Page } from 'playwright-core';
import { launchBrowser, newPage } from './browser';
import { alignPromoCodes, distinctPromoCodes } from './promoCodes';

// =========================================================================
// Company offer scraper — زحف مواقع الشركات (روابط الإفيليت) لاستخراج
// العروض الحالية وتحويلها إلى منشورات للقنوات المتخصصة (Wagents/marketers).
//
// الآلية:
//   • data/companies.json → الشركات النشطة (affiliate_link / app_link).
//   • يزور كل رابط ويستخرج العناوين والعروض (بونص/كاش باك/مكافأة…).
//   • يسجّل النتيجة في data/company_offers.json (merge + dedupe).
//   • fallback ذكي: إن فشل الزحف (بلوك جغرافي/JS) يُسجَّل العرض الثابت
//     من companies.json (badge/bonus_text) فلا تبقى القوالب فارغة أبدًا.
// =========================================================================

export interface CompanyOffer {
  companyId: string;
  name: string;
  /** عنوان العرض المستخرَج (أو الثابت من ملف الشركات). */
  headline: string;
  /** تفاصيل إضافية إن وُجدت. */
  details: string;
  bonus: string;
  promoCode: string;
  affiliateLink: string;
  /** 'scraped' = من الموقع مباشرة، 'static' = من ملف الشركات. */
  source: 'scraped' | 'static';
  url: string;
  scrapedAt: string;
}

interface OfferStore {
  updatedAt: string;
  offers: CompanyOffer[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const COMPANIES_PATH = path.join(DATA_DIR, 'companies.json');
const OFFERS_PATH = path.join(DATA_DIR, 'company_offers.json');

const GOTO_TIMEOUT_MS = 25_000;
const PER_COMPANY_DELAY_MS = 3_500;

// كلمات مفتاحية للعروض — العربية والإنجليزية معًا.
const OFFER_KEYWORDS = [
  'بونص', 'مكافأة', 'كاش باك', 'كاشباك', 'عرض', 'ترحيب', 'مجاني', 'أول إيداع',
  'bonus', 'welcome', 'free bet', 'cashback', 'cash back', 'promo', 'offer',
  'deposit', 'sign up', 'signup', 'register', 'reward', '%',
];

interface RawCompany {
  id: string;
  name: string;
  name_ar?: string;
  badge?: string;
  bonus_text?: string;
  details?: string;
  promo_code?: string;
  affiliate_link?: string;
  app_link?: string;
  is_active?: boolean;
}

function loadCompanies(): RawCompany[] {
  try {
    const raw = JSON.parse(fs.readFileSync(COMPANIES_PATH, 'utf-8'));
    return Array.isArray(raw) ? raw.filter((c) => c && c.is_active !== false) : [];
  } catch (err: any) {
    console.warn('[Offers] companies load failed:', err.message);
    return [];
  }
}

function loadStore(): OfferStore {
  try {
    if (fs.existsSync(OFFERS_PATH)) {
      const raw = JSON.parse(fs.readFileSync(OFFERS_PATH, 'utf-8'));
      if (raw && Array.isArray(raw.offers)) {
        return { updatedAt: raw.updatedAt || new Date(0).toISOString(), offers: raw.offers };
      }
    }
  } catch (err: any) {
    console.warn('[Offers] store load failed:', err.message);
  }
  return { updatedAt: new Date(0).toISOString(), offers: [] };
}

function saveStore(store: OfferStore): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(OFFERS_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('[Offers] store save failed:', err.message);
  }
}

/** العروض الحالية (من الذاكرة أو الملف) — تستدعىها قوالب nichePosts. */
export function getCompanyOffers(): CompanyOffer[] {
  return loadStore().offers;
}

/** عرض شركة محددة بالاسم (مطابقة مرنة) أو null. */
export function getOfferForCompany(name: string): CompanyOffer | null {
  const key = String(name || '').trim().toLowerCase();
  if (!key) return null;
  const offers = getCompanyOffers();
  return (
    offers.find((o) => o.name.toLowerCase() === key) ||
    offers.find((o) => o.name.toLowerCase().includes(key) || key.includes(o.name.toLowerCase())) ||
    null
  );
}

// ---------------------------------------------------------------- extraction

function looksLikeOffer(text: string): boolean {
  const t = text.toLowerCase();
  return OFFER_KEYWORDS.some((k) => t.includes(k));
}

function clean(text: string): string {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

/**
 * أي كود يظهر في نص العرض (منسوخ من صفحة الشركة أو من ملف قديم) يجب أن يكون
 * كود هذه الشركة تحديدًا — غير ذلك يُستبدل بكودها الحقيقي أو يُحذف.
 * Scanned pages and stale store files both carry OLD/foreign codes (bi_9258,
 * QNT7…) that niche templates would otherwise publish verbatim.
 */
function ownCodeOnly(text: string, promo: string, companies: RawCompany[]): string {
  if (!text) return text;
  return alignPromoCodes(text, {
    allowed: promo ? [promo] : [],
    fallback: promo,
    known: distinctPromoCodes(companies),
  });
}

/**
 * يزور صفحة الشركة ويستخرج نصوصًا تشبه العروض:
 * عناوين (h1-h3) + عناصر بها كلمات مفتاحية + meta description.
 * يعيد حتى 5 نصوص مطابقة (الأول = العنوان، الأنسب = التفاصيل).
 */
async function extractOfferFromPage(page: Page): Promise<{ headline: string; details: string } | null> {
  const hits: string[] = await page.evaluate(
    ({ keywords }: { keywords: string[] }) => {
      const out: string[] = [];
      const push = (t: string) => {
        const s = (t || '').replace(/\s+/g, ' ').trim();
        if (s.length >= 8 && s.length <= 300 && out.indexOf(s) === -1) out.push(s);
      };
      document.querySelectorAll('h1, h2, h3').forEach((h) => push(h.textContent || ''));
      document
        .querySelectorAll('[class*="bonus"],[class*="promo"],[class*="offer"],[class*="welcome"],[class*="banner"]')
        .forEach((el) => push(el.textContent || ''));
      const meta = document.querySelector('meta[name="description"]');
      if (meta) push(meta.getAttribute('content') || '');
      const low = (s: string) => s.toLowerCase();
      return out.filter((s) => keywords.some((k) => low(s).includes(low(k)))).slice(0, 5);
    },
    { keywords: OFFER_KEYWORDS }
  );
  const headline = clean(hits[0] || '');
  if (!headline) return null;
  const details = clean(hits.find((h) => clean(h) !== headline && clean(h).length >= 12) || '');
  return { headline, details };
}

// ------------------------------------------------------------------ scraping

function staticFallback(c: RawCompany): CompanyOffer {
  const promo = String(c.promo_code || '').trim();
  const all = loadCompanies();
  return {
    companyId: c.id,
    name: c.name,
    headline: ownCodeOnly(clean(c.badge) || clean(c.bonus_text) || `عرض ${c.name}`, promo, all),
    details: ownCodeOnly(clean(c.details), promo, all),
    bonus: ownCodeOnly(clean(c.bonus_text) || clean(c.badge), promo, all),
    promoCode: promo,
    affiliateLink: String(c.affiliate_link || '').trim(),
    source: 'static',
    url: String(c.affiliate_link || c.app_link || '').trim(),
    scrapedAt: new Date().toISOString(),
  };
}

async function scrapeOne(browser: Browser, c: RawCompany): Promise<CompanyOffer> {
  const target = String(c.affiliate_link || c.app_link || '').trim();
  if (!target) return staticFallback(c);

  let page: Page | null = null;
  try {
    page = await newPage(browser);
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: GOTO_TIMEOUT_MS });
    await page.waitForTimeout(2500);
    const found = await extractOfferFromPage(page);
    if (found && found.headline.length >= 8) {
      const promo = String(c.promo_code || '').trim();
      const all = loadCompanies();
      return {
        companyId: c.id,
        name: c.name,
        headline: ownCodeOnly(found.headline, promo, all),
        details: ownCodeOnly(found.details, promo, all),
        bonus: ownCodeOnly(clean(c.bonus_text) || found.headline, promo, all),
        promoCode: promo,
        affiliateLink: String(c.affiliate_link || '').trim(),
        source: 'scraped',
        url: page.url(),
        scrapedAt: new Date().toISOString(),
      };
    }
    return staticFallback(c);
  } catch (err: any) {
    console.warn(`[Offers] ${c.name} crawl failed (${err.message}) → static fallback`);
    return staticFallback(c);
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

/**
 * زحف كل الشركات النشطة وتحديث مخزن العروض.
 * يعيد عدد الشركات التي حُدّث عرضها.
 */
export async function runOfferScrape(): Promise<number> {
  const companies = loadCompanies();
  if (!companies.length) {
    console.log('[Offers] no active companies to scrape');
    return 0;
  }

  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
  } catch (err: any) {
    console.warn('[Offers] browser launch failed:', err.message);
    // بلا متصفح → نكتفي بالعروض الثابتة حتى لا تفشل القوالب.
    const store = loadStore();
    for (const c of companies) {
      const idx = store.offers.findIndex((o) => o.companyId === c.id);
      const fb = staticFallback(c);
      if (idx >= 0) store.offers[idx] = { ...fb, scrapedAt: store.offers[idx].scrapedAt };
      else store.offers.push(fb);
    }
    store.updatedAt = new Date().toISOString();
    saveStore(store);
    return companies.length;
  }

  const store = loadStore();
  let updated = 0;
  try {
    for (const c of companies) {
      const offer = await scrapeOne(browser, c);
      const idx = store.offers.findIndex((o) => o.companyId === c.id);
      if (idx >= 0) store.offers[idx] = offer;
      else store.offers.push(offer);
      updated++;
      console.log(`[Offers] ${c.name}: ${offer.source} → "${offer.headline.slice(0, 70)}"`);
      await new Promise((r) => setTimeout(r, PER_COMPANY_DELAY_MS));
    }
    store.updatedAt = new Date().toISOString();
    saveStore(store);
    console.log(`[Offers] scrape done — ${updated}/${companies.length} offers updated`);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
  return updated;
}

// ---------------------------------------------------------------- scheduler

let scrapeTimer: NodeJS.Timeout | null = null;

/** تشغيل الزحف المجدول (أول تشغيل بعد bootDelay ثم كل intervalHours). */
export function startOfferScraper(intervalHours = 6, bootDelayMs = 4 * 60 * 1000): void {
  if (scrapeTimer) return;
  const boot = setTimeout(() => {
    void runOfferScrape().catch((err) => console.error('[Offers] scheduled scrape failed:', err));
  }, bootDelayMs);
  boot.unref?.();

  scrapeTimer = setInterval(
    () => {
      void runOfferScrape().catch((err) => console.error('[Offers] scheduled scrape failed:', err));
    },
    intervalHours * 60 * 60 * 1000
  );
  scrapeTimer.unref?.();
  console.log(`[Offers] scraper scheduled (first run in ${Math.round(bootDelayMs / 1000)}s, every ${intervalHours}h)`);
}

export function stopOfferScraper(): void {
  if (scrapeTimer) clearInterval(scrapeTimer);
  scrapeTimer = null;
}

export function getOfferScraperStatus(): object {
  const store = loadStore();
  return {
    updatedAt: store.updatedAt,
    count: store.offers.length,
    scraped: store.offers.filter((o) => o.source === 'scraped').length,
    static: store.offers.filter((o) => o.source === 'static').length,
    interval_hours: 6,
  };
}
