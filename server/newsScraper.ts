import { Browser, Page } from 'playwright-core';
import * as fs from 'fs';
import * as path from 'path';
import { launchBrowser } from './browser';

// =========================================================================
// VEX News Scraper - Multi-source sports news with Playwright
// =========================================================================

export interface NewsSource {
  id: string;
  name: string;
  baseUrl: string;
  category: string;
  categoryKey: string;
  selectors: {
    articleList: string;
    title: string;
    link: string;
    summary?: string;
    image?: string;
    publishedAt?: string;
  };
  rateLimitMs: number;
  lang: 'ar' | 'en' | 'es';
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
  rawHtml?: string;
}

const NEWS_SOURCES: NewsSource[] = [
  {
    id: 'filgoal',
    name: 'FilGoal',
    baseUrl: 'https://www.filgoal.com',
    category: 'كرة قدم',
    categoryKey: 'football',
    selectors: {
      articleList: '.article-list .article-item, .news-list .news-item, article.news-item',
      title: 'h3 a, h2 a, .title a, a.title',
      link: 'h3 a, h2 a, .title a, a.title',
      summary: '.desc, .summary, .excerpt, p',
      image: 'img',
      publishedAt: 'time, .date, .time',
    },
    rateLimitMs: 3000,
    lang: 'ar',
    active: true,
  },
  {
    id: 'yallakora',
    name: 'YallaKora',
    baseUrl: 'https://www.yallakora.com',
    category: 'كرة قدم',
    categoryKey: 'football',
    selectors: {
      articleList: '.match-news .news-item, .news-list .item, article',
      title: 'h3 a, h2 a, .news-title a',
      link: 'h3 a, h2 a, .news-title a',
      summary: '.news-desc, .excerpt, p',
      image: 'img',
      publishedAt: '.news-date, time',
    },
    rateLimitMs: 3000,
    lang: 'ar',
    active: true,
  },
  {
    id: 'kooora',
    name: 'Kooora',
    baseUrl: 'https://www.kooora.com',
    category: 'كرة قدم',
    categoryKey: 'football',
    selectors: {
      articleList: '.news-block .item, .main-news .news-item, .article-list li',
      title: 'h3 a, h2 a, .title a',
      link: 'h3 a, h2 a, .title a',
      summary: '.summary, .desc, p',
      image: 'img',
      publishedAt: '.date, time',
    },
    rateLimitMs: 3000,
    lang: 'ar',
    active: true,
  },
  {
    id: 'sky_sports',
    name: 'Sky Sports Football',
    baseUrl: 'https://www.skysports.com/football',
    category: 'كرة قدم',
    categoryKey: 'football',
    selectors: {
      articleList: '.news-list__item, .article-list__item, .news-feed__item',
      title: '.news-list__headline a, .article-title a, h3 a',
      link: '.news-list__headline a, .article-title a, h3 a',
      summary: '.news-list__snippet, .article-excerpt, p',
      image: 'img',
      publishedAt: '.news-list__date, time',
    },
    rateLimitMs: 5000,
    lang: 'en',
    active: true,
  },
  {
    id: 'bbc_sport',
    name: 'BBC Sport Football',
    baseUrl: 'https://www.bbc.com/sport/football',
    category: 'كرة قدم',
    categoryKey: 'football',
    selectors: {
      articleList: '[data-testid="card"], .gs-c-promo, .promo-unit',
      title: '.gs-c-promo-heading, .promo-heading, h3 a',
      link: '.gs-c-promo-heading a, .promo-heading a, h3 a',
      summary: '.gs-c-promo-summary, .promo-summary, p',
      image: 'img',
      publishedAt: 'time, .date',
    },
    rateLimitMs: 5000,
    lang: 'en',
    active: true,
  },
  {
    id: 'marca',
    name: 'Marca Futbol',
    baseUrl: 'https://www.marca.com/futbol.html',
    category: 'كرة قدم',
    categoryKey: 'football',
    selectors: {
      articleList: '.ue-c-cover-content, .mod-content, article',
      title: 'h2 a, h3 a, .title a',
      link: 'h2 a, h3 a, .title a',
      summary: '.summary, .intro, p',
      image: 'img',
      publishedAt: 'time, .date',
    },
    rateLimitMs: 5000,
    lang: 'es',
    active: true,
  },
  {
    id: 'goal_ar',
    name: 'Goal.com Arabic',
    baseUrl: 'https://www.goal.com/ar',
    category: 'كرة قدم',
    categoryKey: 'football',
    selectors: {
      articleList: '.widget-news-list__item, .article-item, .feed-item',
      title: '.widget-news-list__title a, .article-title a, h3 a',
      link: '.widget-news-list__title a, .article-title a, h3 a',
      summary: '.widget-news-list__excerpt, .excerpt, p',
      image: 'img',
      publishedAt: 'time, .date',
    },
    rateLimitMs: 3000,
    lang: 'ar',
    active: true,
  },
  {
    id: 'aljazeera_sport',
    name: 'Al Jazeera Sport',
    baseUrl: 'https://www.aljazeera.net/sport',
    category: 'رياضة عامة',
    categoryKey: 'general',
    selectors: {
      articleList: '.article-list .item, .topics-list .topic-item, article',
      title: 'h3 a, h2 a, .title a',
      link: 'h3 a, h2 a, .title a',
      summary: '.excerpt, .summary, p',
      image: 'img',
      publishedAt: 'time, .date',
    },
    rateLimitMs: 3000,
    lang: 'ar',
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

  private loadExistingNews(): ScrapedArticle[] {
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
    const existingIds = new Set(existing.map((i) => i.id));
    const newItems = items.filter((i) => !existingIds.has(i.id));
    const merged = [...newItems, ...existing].slice(0, 500);
    fs.writeFileSync(this.newsFile, JSON.stringify({ items: merged, updatedAt: new Date().toISOString() }, null, 2));
    console.log(`[NewsScraper] Saved ${newItems.length} new articles, total: ${merged.length}`);
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
      await page.goto(source.baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(source.rateLimitMs);

      const articles = await page.evaluate((sel) => {
        const items = document.querySelectorAll(sel.articleList);
        const results = [];
        for (const item of items) {
          try {
            const titleEl = item.querySelector(sel.title);
            const linkEl = item.querySelector(sel.link);
            const summaryEl = sel.summary ? item.querySelector(sel.summary) : null;
            const imageEl = sel.image ? item.querySelector(sel.image) : null;
            const timeEl = sel.publishedAt ? item.querySelector(sel.publishedAt) : null;

            if (!titleEl || !linkEl) continue;

            const title = titleEl.textContent?.trim() || '';
            const href = linkEl.getAttribute('href') || '';
            if (!title || !href) continue;

            results.push({
              title,
              url: href.startsWith('http') ? href : new URL(href, window.location.origin).href,
              summary: summaryEl?.textContent?.trim() || '',
              image: imageEl?.getAttribute('src') || imageEl?.getAttribute('data-src') || '',
              publishedAt: timeEl?.getAttribute('datetime') || timeEl?.textContent?.trim() || '',
            });
          } catch {}
        }
        return results.slice(0, 20);
      }, source.selectors);

      const scraped: ScrapedArticle[] = [];
      for (const art of articles) {
        if (!art.title || art.title.length < 10) continue;

        const id = `NEWS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const slug = this.generateSlug(art.title);
        const publishedAt = art.publishedAt ? new Date(art.publishedAt).toISOString() : new Date().toISOString();

        scraped.push({
          id,
          slug,
          title: art.title,
          summary: art.summary || art.title,
          titleEn: art.title,
          summaryEn: art.summary || art.title,
          body: [art.summary || art.title],
          bodyEn: [art.summary || art.title],
          source: source.name,
          sourceUrl: art.url,
          publishedAt,
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
      const articles = await this.scrapeSource(source);
      console.log(`[NewsScraper] ${source.name}: ${articles.length} articles`);
      allArticles.push(...articles);
      await new Promise((r) => setTimeout(r, source.rateLimitMs));
    }

    this.saveNews(allArticles);
    return allArticles;
  }

  async scrapeSourceById(sourceId: string): Promise<ScrapedArticle[]> {
    const source = NEWS_SOURCES.find((s) => s.id === sourceId);
    if (!source) throw new Error(`Source ${sourceId} not found`);
    return this.scrapeSource(source);
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