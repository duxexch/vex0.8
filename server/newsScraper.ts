import { Browser, Page } from 'playwright-core';
import * as fs from 'fs';
import * as path from 'path';
import { launchBrowser } from './browser';

// =========================================================================
// VEX News Scraper — pattern-based article extraction (probed against live
// sites 2026-10-08). No fragile DOM selectors: filter anchors by URL regex.
// =========================================================================

export interface NewsSource {
  id: string;
  name: string;
  /** Listing page to load */
  url: string;
  /** Regex tested against the full article URL (after resolution) */
  articlePattern: string;
  /** Regex for URLs to drop (nav sections, tags, videos…) */
  excludePattern?: string;
  category: string;
  categoryKey: string;
  lang: 'ar' | 'en' | 'es';
  rateLimitMs: number;
  active: boolean;
}

export interface ScrapedArticle {
  id: string;
  slug: string;
  title: string;
  summary: string;
  titleEn: string;
  summaryEn: string;
  body: string[];
  bodyEn: string[];
  source: string;
  sourceUrl: string;
  publishedAt: string;
  category: string;
  categoryKey: string;
  imageUrl?: string;
  score: number;
}

// Probed: 2026-10-08 — each pattern returned real articles from the listing page.
const NEWS_SOURCES: NewsSource[] = [
  {
    id: 'filgoal',
    name: 'FilGoal',
    url: 'https://www.filgoal.com/',
    articlePattern: '/articles/\\d+',
    excludePattern: '/(?:tags|matches|videos|games)/',
    category: 'كرة قدم',
    categoryKey: 'football',
    lang: 'ar',
    rateLimitMs: 3000,
    active: true,
  },
  {
    id: 'yallakora',
    name: 'YallaKora',
    url: 'https://www.yallakora.com/news',
    articlePattern: '/news/\\d+/',
    excludePattern: '/(?:tour|matches)/',
    category: 'كرة قدم',
    categoryKey: 'football',
    lang: 'ar',
    rateLimitMs: 3000,
    active: true,
  },
  {
    id: 'kooora',
    name: 'Kooora',
    url: 'https://www.kooora.com/',
    articlePattern: '/(?:%D9%83%D8%B1%D8%A9-%D9%82%D8%AF%D9%85|كرة-قدم)/(?:%D8%A3%D8%AE%D8%A8%D8%A7%D8%B1|أخبار|القوائم|مقالات)/',
    category: 'كرة قدم',
    categoryKey: 'football',
    lang: 'ar',
    rateLimitMs: 3000,
    active: true,
  },
  {
    id: 'goal_ar',
    name: 'Goal.com Arabic',
    url: 'https://www.goal.com/ar',
    articlePattern: '/ar/(?:%D8%A7%D9%84%D9%82%D9%88%D8%A7%D8%A6%D9%85|القوائم)/',
    excludePattern: '/(?:%D9%85%D8%B3%D8%A7%D8%A8%D9%82%D8%A7%D8%AA|مسابقات)/',
    category: 'كرة قدم',
    categoryKey: 'football',
    lang: 'ar',
    rateLimitMs: 3000,
    active: true,
  },
  {
    id: 'sky_sports',
    name: 'Sky Sports Football',
    url: 'https://www.skysports.com/football/news',
    articlePattern: '/football/news/\\d+/',
    excludePattern: '/(?:topic|transfer)/',
    category: 'كرة قدم',
    categoryKey: 'football',
    lang: 'en',
    rateLimitMs: 5000,
    active: true,
  },
  {
    id: 'bbc_sport',
    name: 'BBC Sport Football',
    url: 'https://www.bbc.com/sport/football',
    articlePattern: '/sport/football/(?:articles|live)/',
    category: 'كرة قدم',
    categoryKey: 'football',
    lang: 'en',
    rateLimitMs: 5000,
    active: true,
  },
];

export class NewsScraper {
  private browser: Browser | null = null;
  private dataDir: string;
  private newsFile: string;

  constructor(dataDir: string = path.join(process.cwd(), 'data')) {
    this.dataDir = dataDir;
    this.newsFile = path.join(dataDir, 'sports_news.json');
    fs.mkdirSync(dataDir, { recursive: true });
  }

  async init(): Promise<void> {
    if (!this.browser) {
      this.browser = await launchBrowser();
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  loadExistingNews(): ScrapedArticle[] {
    try {
      if (fs.existsSync(this.newsFile)) {
        const data = JSON.parse(fs.readFileSync(this.newsFile, 'utf-8'));
        return data.items || [];
      }
    } catch (e) {
      console.warn('[NewsScraper] Failed to load existing news:', e);
    }
    return [];
  }

  private saveNews(items: ScrapedArticle[]): void {
    const existing = this.loadExistingNews();
    const existingUrls = new Set(existing.map((i) => i.sourceUrl));
    const newItems = items.filter((i) => !existingUrls.has(i.sourceUrl));
    const merged = [...newItems, ...existing].slice(0, 600);
    fs.writeFileSync(this.newsFile, JSON.stringify({ items: merged, updatedAt: new Date().toISOString() }, null, 2));
    if (newItems.length) console.log(`[NewsScraper] Saved ${newItems.length} new articles, total: ${merged.length}`);
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 80);
  }

  private async scrapeSource(source: NewsSource): Promise<ScrapedArticle[]> {
    if (!this.browser) await this.init();
    const page = await this.browser!.newPage();
    try {
      await page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(3500);

      const raw = await page.evaluate(
        ({ articlePattern, excludePattern }) => {
          const re = new RegExp(articlePattern);
          const ex = excludePattern ? new RegExp(excludePattern) : null;
          const seen = new Set<string>();
          const out: Array<{ title: string; url: string; image: string }> = [];
          document.querySelectorAll('a[href]').forEach((a) => {
            const href = a.getAttribute('href') || '';
            const title = (a.textContent || '').replace(/\s+/g, ' ').trim();
            if (title.length < 25 || title.length > 260) return;
            let abs: string;
            try {
              abs = new URL(href, location.origin).href;
            } catch {
              return;
            }
            if (!re.test(abs)) return;
            if (ex && ex.test(abs)) return;
            const key = abs.split(/[?#]/)[0];
            if (seen.has(key)) return;
            seen.add(key);
            // prefer an image from the anchor or its parent block
            let image = '';
            const img = a.querySelector('img') || a.closest('article,div,li')?.querySelector('img');
            if (img) image = img.getAttribute('src') || img.getAttribute('data-src') || '';
            out.push({ title, url: abs, image });
          });
          return out.slice(0, 15);
        },
        { articlePattern: source.articlePattern, excludePattern: source.excludePattern }
      );

      const scraped: ScrapedArticle[] = [];
      for (const art of raw) {
        if (!art.title || art.title.length < 25) continue;
        const id = `NEWS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        scraped.push({
          id,
          slug: this.generateSlug(art.title),
          title: art.title,
          summary: art.title,
          titleEn: art.title,
          summaryEn: art.title,
          body: [],
          bodyEn: [],
          source: source.name,
          sourceUrl: art.url,
          publishedAt: new Date().toISOString(),
          category: source.category,
          categoryKey: source.categoryKey,
          imageUrl: art.image || undefined,
          score: Math.floor(Math.random() * 30) + 60,
        });
      }
      return scraped;
    } catch (err: any) {
      console.error(`[NewsScraper] ${source.name} failed:`, err.message);
      return [];
    } finally {
      await page.close();
    }
  }

  async scrapeAll(activeOnly = true): Promise<ScrapedArticle[]> {
    await this.init();
    const sources = activeOnly ? NEWS_SOURCES.filter((s) => s.active) : NEWS_SOURCES;
    console.log(`[NewsScraper] Scraping ${sources.length} sources...`);
    const allArticles: ScrapedArticle[] = [];
    for (const source of sources) {
      const before = allArticles.length;
      const articles = await this.scrapeSource(source);
      console.log(`[NewsScraper] ${source.name}: ${articles.length} articles`);
      allArticles.push(...articles);
      if (allArticles.length === before) continue; // no need to pace after a failed source
      await new Promise((r) => setTimeout(r, source.rateLimitMs));
    }
    this.saveNews(allArticles);
    return allArticles;
  }

  getSources(): NewsSource[] {
    return NEWS_SOURCES;
  }
}

// Singleton instance
let scraperInstance: NewsScraper | null = null;
export function getNewsScraper(): NewsScraper {
  if (!scraperInstance) scraperInstance = new NewsScraper();
  return scraperInstance;
}

// Scheduled scraping job
let scrapeInterval: NodeJS.Timeout | null = null;
export function startScheduledScraping(intervalMinutes = 30): void {
  if (scrapeInterval) clearInterval(scrapeInterval);
  console.log(`[NewsScraper] Scheduled scraping started (every ${intervalMinutes} min)`);
  scrapeInterval = setInterval(async () => {
    try {
      await getNewsScraper().scrapeAll();
    } catch (err) {
      console.error('[NewsScraper] Scheduled scrape failed:', err);
    }
  }, intervalMinutes * 60 * 1000);
}

export function stopScheduledScraping(): void {
  if (scrapeInterval) {
    clearInterval(scrapeInterval);
    scrapeInterval = null;
    console.log('[NewsScraper] Scheduled scraping stopped');
  }
}