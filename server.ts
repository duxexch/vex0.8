import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { storage } from './server/storage';
import { ServerCompensationRequest } from './server/seedData';
import { agentEngine, calculateNotificationTiming } from './server/agentEngine';
import { resolveCleanHost, renderSeoMetaHead } from './server/seoEngine';
import { LANGS, isLang, tt, type Lang } from './server/i18nUi';
import { getProfileText, type ProfileText } from './server/i18nProfiles';
import { GUIDES, getGuide } from './server/i18nGuides';
import { STATIC_PAGES, STATIC_PAGE_SLUGS, TRUST_NAV } from './server/staticPages';
import type { Company, SportsNewsItem } from './src/types';
import { geoLocaleMiddleware } from './server/geoLocale';
import { createAuthRequiredMiddleware, setSessionStore, buildSessionCookie, SESSION_TTL_MS } from './server/sessionGuard';
import { buildBotPromoMessage } from './server/botPromo';
import {
  extractPrediction,
  extractPredictionSync,
  buildCompactText,
  buildCompactTitle,
  buildResultSuffix,
  teamsMatch,
} from './server/predictionParser';
import type { ParsedPrediction, PredictionRecord, ActualScore } from './server/predictionParser';
import { getVapidPublicKey, addSubscription, removeSubscription, sendWebPush } from './server/webPush';
import crypto from 'crypto';

const currentFilename = typeof import.meta !== 'undefined' && import.meta.url ? fileURLToPath(import.meta.url) : '';
const currentDirname = currentFilename ? path.dirname(currentFilename) : process.cwd();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

io.on('connection', (socket) => {
  console.log('⚡ Socket.io client connected:', socket.id);

  socket.on('heartbeat', (data) => {
    socket.emit('heartbeat_ack', { serverTime: Date.now() });
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', socket.id, 'Reason:', reason);
  });
});

const PORT = 3000;

app.use(express.json({ limit: '5mb' }));

// Enterprise-Grade Security & Payment Gateway Defense Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https: wss: data: blob: *; img-src 'self' https: data: blob:; font-src 'self' https: data:; frame-ancestors *;"
  );
  next();
});

// Multi-Domain Alias 301 Permanent Redirect Middleware
app.use((req, res, next) => {
  const { shouldRedirectAlias, redirectUrl } = resolveCleanHost(req);
  if (shouldRedirectAlias && redirectUrl) {
    return res.redirect(301, redirectUrl);
  }
  next();
});

// Geo-Locale Detection Middleware (Accept-Language + GeoIP)
app.use(geoLocaleMiddleware);

// Production System & SEO Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    domainsConfigured: 5,
    environment: process.env.NODE_ENV || 'production',
  });
});

// Advanced In-Memory Rate Limiter (Protection against DDoS and Brute Force)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
app.use('/api/', (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = requestCounts.get(ip as string);

  if (!record || now > record.resetTime) {
    requestCounts.set(ip as string, { count: 1, resetTime: now + 60000 }); // 60s window
    return next();
  }

  if (record.count > 120) { // Max 120 requests per minute per IP
    return res.status(429).json({
      error: 'Too many requests. Security rate limit exceeded. Please try again later.',
    });
  }

  record.count++;
  next();
});

// Session Guard Middleware — guest-first model:
// reads (GET/HEAD/OPTIONS) are public, writes + protected prefixes need a verified session.
const authRequiredMiddleware = createAuthRequiredMiddleware({
  publicPaths: [
    '/',
    '/health',
    '/robots.txt',
    '/sitemap.xml',
    '/api/telegram/*',
    '/api/health',
    '/api/geo',
    '/api/app-branding',
    '/api/manifest.json',
    '/api/media/assets',
    '/api/lottery/status',
    '/api/viral/*',
    '/api/site-posts',
    '/site-posts-media/*',
    '/auth-required',
    '/favicon.ico',
    '/manifest.json',
    '/icon-*.svg',
    '/icon-*.png',
    '/sw.js',
    '/offline.html',
    '/_next/*',
    '/static/*',
    '/assets/*',
    // Vite dev-server tooling paths (no-ops in production)
    '/@vite/*',
    '/@react-refresh',
    '/@fs/*',
    '/src/*',
    '/node_modules/*',
    '/__vite_ping',
  ],
  protectedPaths: [
    '/api/admin',
    '/api/ai/admin',
    '/api/users', // private user data (profile / sync / preferences)
    '/api/user', // phone-change requests
  ],
  publicWritePaths: [
    '/api/users/*/activity', // guest interaction logging (no login needed)
    '/api/site-posts', // pipeline ingest (validated by X-API-Key inside the route)
    '/api/notifications/mark-read', // guest dismissing the global feed (local-first UX)
    '/api/ai/analyze-match', // AI analysis is a read-like feature, open to guests
    '/api/lottery/sync-draw', // draw-state mirror runs automatically when guests browse the lottery tab
    '/api/telegram/*', // verification flow (create session, verify code, webhook) is guest-open by design
    '/api/viral/*', // engagement endpoints (unlucky wall, votes, referrals, challenges) stay guest-open
    '/api/predictions/*/result', // manual settlement (validated by X-API-Key / session inside the route)
    '/api/push/*', // Web Push subscribe/unsubscribe (public VAPID key, endpoint-scoped, no PII)
    '/api/indexnow', // machine-to-machine SEO endpoint (domain-restricted inside the route + rate limited)
  ],
  redirectPath: '/auth-required',
  apiMode: false,
});
app.use(authRequiredMiddleware);

// Lazy Google Gen AI initialization
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }
  return aiClient;
}

// Persistent App Branding Storage
let currentBranding = storage.getAppBranding();

// Curated Sports Fixtures
const SPORTS_FIXTURES = [
  {
    id: 'FIX-RMA-BAR',
    category: 'Football',
    date: 'Today',
    homeTeam: 'ريال مدريد',
    awayTeam: 'برشلونة',
    homeLogo: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=128&auto=format&fit=crop&q=80',
    awayLogo: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=128&auto=format&fit=crop&q=80',
    league: 'الدوري الإسباني - الكلاسيكو',
    kickoffTime: 'اليوم، 22:00 بتوقيت مكة',
    status: 'upcoming' as const,
    odds: {
      home: 2.15,
      draw: 3.50,
      away: 3.20,
      over25: 1.62,
      bothScore: 1.55,
    },
  },
  {
    id: 'FIX-MCI-ARS',
    category: 'Football',
    date: 'Tomorrow',
    homeTeam: 'مانشستر سيتي',
    awayTeam: 'آرسنال',
    homeLogo: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=128&auto=format&fit=crop&q=80',
    awayLogo: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=128&auto=format&fit=crop&q=80',
    league: 'الدوري الإنجليزي الممتاز',
    kickoffTime: 'غداً، 19:30 بتوقيت مكة',
    status: 'upcoming' as const,
    odds: {
      home: 1.95,
      draw: 3.60,
      away: 3.80,
      over25: 1.70,
      bothScore: 1.65,
    },
  },
  {
    id: 'FIX-LIV-PSG',
    category: 'Football',
    date: 'Tomorrow',
    homeTeam: 'ليفربول',
    awayTeam: 'باريس سان جيرمان',
    homeLogo: 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=128&auto=format&fit=crop&q=80',
    awayLogo: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=128&auto=format&fit=crop&q=80',
    league: 'دوري أبطال أوروبا',
    kickoffTime: 'الأربعاء، 23:00 بتوقيت مكة',
    status: 'upcoming' as const,
    odds: {
      home: 2.05,
      draw: 3.65,
      away: 3.40,
      over25: 1.58,
      bothScore: 1.50,
    },
  },
  {
    id: 'FIX-BAY-BVB',
    category: 'Basketball',
    date: 'Weekend',
    homeTeam: 'بايرن ميونخ',
    awayTeam: 'بوروسيا دورتموند',
    homeLogo: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=128&auto=format&fit=crop&q=80',
    awayLogo: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=128&auto=format&fit=crop&q=80',
    league: 'الدوري الألماني - دير كلاسيكر',
    kickoffTime: 'السبت، 20:30 بتوقيت مكة',
    status: 'upcoming' as const,
    odds: {
      home: 1.65,
      draw: 4.20,
      away: 4.80,
      over25: 1.42,
      bothScore: 1.48,
    },
  },
  {
    id: 'FIX-HIL-NAS',
    category: 'Tennis',
    date: 'Today',
    homeTeam: 'الهلال',
    awayTeam: 'النصر',
    homeLogo: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=128&auto=format&fit=crop&q=80',
    awayLogo: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=128&auto=format&fit=crop&q=80',
    league: 'دوري روشن السعودي - ديربي الرياض',
    kickoffTime: 'الجمعة، 21:00 بتوقيت مكة',
    status: 'upcoming' as const,
    odds: {
      home: 2.20,
      draw: 3.40,
      away: 3.10,
      over25: 1.60,
      bothScore: 1.52,
    },
  },
];

// Curated Sports News Items
const SPORTS_NEWS = [
  {
    id: 'NEWS-01',
    title: 'قمة الكلاسيكو: استراتيجيات هجومية وتوقعات الذكاء الاصطناعي ترجح كفة أصحاب الأرض',
    summary: 'تحليلات المعطيات التكتيكية تشير إلى ضغط عالي في وسط الملعب مع احتمالية تسجيل الفريقين بنسبة تفوق 72%.',
    source: 'Marca Sports & AI',
    publishedAt: 'منذ 25 دقيقة',
    category: 'الكلاسيكو',
    imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'NEWS-02',
    title: 'دوري الأبطال: جاهزية تامة ومفاجآت متوقعة في التشكيل الأساسي قبل مواجهة الأربعاء',
    summary: 'المدرب يؤكد عودة المهاجم الأساسي بعد تعافيه من الإصابة وجاهزيته لخوض الدقائق التسعين كاملة.',
    source: 'UEFA Official News',
    publishedAt: 'منذ ساعة',
    category: 'دوري أبطال أوروبا',
    imageUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'NEWS-03',
    title: 'تحديثات الإحصاءات: ارتفاع معدل تسجيل الأهداف في الدوريات الأوروبية الكبرى بنسبة 14%',
    summary: 'دراسة تحليلية موسعة تكشف عن تغير ديناميكيات اللعب التكتيكي والاعتماد الأكبر على التحولات السريعة.',
    source: 'Opta Analyst Hub',
    publishedAt: 'منذ 3 ساعات',
    category: 'إحصائيات وتحليلات',
    imageUrl: 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=600&auto=format&fit=crop&q=80',
  },
];

// ==================== Live sports news store ====================
// data/sports_news.json is written atomically by news_watcher/ (aggregator).
// Falls back to the static seed above when the file is missing/empty.
const NEWS_FILE = path.join(process.cwd(), 'data', 'sports_news.json');
let newsCache: { mtimeMs: number; items: SportsNewsItem[]; updatedAt: string } | null = null;

const getNewsItems = (): SportsNewsItem[] => {
  try {
    const st = fs.statSync(NEWS_FILE);
    if (newsCache && newsCache.mtimeMs === st.mtimeMs) return newsCache.items;
    const parsed = JSON.parse(fs.readFileSync(NEWS_FILE, 'utf8')) as { items?: SportsNewsItem[]; updatedAt?: string } | SportsNewsItem[];
    const raw = Array.isArray(parsed) ? parsed : Array.isArray(parsed.items) ? parsed.items : [];
    const items = raw.filter((n): n is SportsNewsItem => !!n && typeof n.title === 'string' && !!n.source);
    newsCache = {
      mtimeMs: st.mtimeMs,
      items,
      updatedAt: (!Array.isArray(parsed) && typeof parsed.updatedAt === 'string') ? parsed.updatedAt : new Date(st.mtimeMs).toISOString(),
    };
    return items.length ? items : SPORTS_NEWS; // empty store (cold start) -> keep the seed visible
  } catch {
    return SPORTS_NEWS;
  }
};

const getNewsUpdatedAt = (): string => {
  try {
    const st = fs.statSync(NEWS_FILE);
    if (newsCache && newsCache.mtimeMs === st.mtimeMs) return newsCache.updatedAt;
    return new Date(st.mtimeMs).toISOString();
  } catch {
    return new Date().toISOString();
  }
};

// Stable slug for an item (watcher stores `slug`; static seed falls back to id)
const newsSlug = (n: SportsNewsItem): string => n.slug || n.id;


// ==========================================
// API ROUTES FIRST
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    aiReady: !!process.env.GEMINI_API_KEY,
  });
});

// Companies Directory Management Endpoints (Replica-Synced)
app.get('/api/companies', (req, res) => {
  const companies = storage.getCompanies();
  res.json({
    success: true,
    companies,
    total: companies.length,
    updatedAt: new Date().toISOString(),
  });
});

app.post('/api/companies', (req, res) => {
  const comp = req.body;
  if (!comp || !comp.name) {
    return res.status(400).json({ error: 'اسم الشركة مطلوب.' });
  }
  if (!comp.id) {
    comp.id = `CMP${Date.now().toString(36).toUpperCase()}`;
  }
  const updatedList = storage.saveCompany(comp);
  io.emit('companies_updated', updatedList);
  res.json({
    success: true,
    company: comp,
    companies: updatedList,
    message: 'تم حفظ بيانات الشركة بنجاح في قاعدة بيانات السيرفر.',
  });
});

app.post('/api/companies/:id/toggle-active', (req, res) => {
  const result = storage.toggleCompanyActive(req.params.id);
  const updatedList = storage.getCompanies();
  io.emit('companies_updated', updatedList);
  res.json({
    success: result.success,
    is_active: result.is_active,
    companies: updatedList,
  });
});

// Admin Get All Core System Data (For Dashboard & Synchronization)
app.get('/api/admin/all-data', (req, res) => {
  res.json({
    success: true,
    companies: storage.getCompanies(),
    compensationRequests: storage.getCompensationRequests(),
    phoneChangeRequests: storage.getPhoneChangeRequests(),
    branding: storage.getAppBranding(),
    notifications: storage.getNotifications(),
    telegramConfig: storage.getTelegramConfig(),
  });
});

// Admin Restore & Re-seed Replica Data (Exact Copy Guarantee)
app.post('/api/admin/restore-replica-data', (req, res) => {
  const result = storage.restoreAllReplicaData();
  const companies = storage.getCompanies();
  const requests = storage.getCompensationRequests();
  const branding = storage.getAppBranding();
  const notifs = storage.getNotifications();
  const phoneRequests = storage.getPhoneChangeRequests();

  currentBranding = branding;

  io.emit('companies_updated', companies);
  io.emit('compensation_requests_updated', requests);
  io.emit('app_branding_updated', branding);
  io.emit('notifications_updated', notifs);
  io.emit('phone_requests_updated', phoneRequests);

  res.json({
    success: true,
    message: 'تمت استعادة ومزامنة كافة بيانات النسخة النموذجية الأصلية بنجاح في قاعدة بيانات السيرفر!',
    stats: result,
  });
});

// Admin Clean Slate Data Reset (Clear User Activity, Notification History & Demo Accounts)
app.post('/api/admin/data-reset', (req, res) => {
  const result = storage.clearCleanSlate();

  io.emit('compensation_requests_updated', []);
  io.emit('phone_requests_updated', []);
  io.emit('notifications_updated', []);
  io.emit('companies_updated', storage.getCompanies());

  res.json({
    success: true,
    ...result,
  });
});

// Geo → language + currency suggestion for first-time visitors (public, guest-safe)
app.get('/api/geo', (req, res) => {
  const info: any = (req as any).geoLocale || {};
  res.json({
    success: true,
    locale: info.locale || 'ar_eg',
    countryIso: info.countryIso || 'EG',
    countryName: info.countryName || 'Egypt',
    countryFlag: info.countryFlag || '🇪🇬',
    currency: info.currency || 'EGP',
    suggestedDomain: info.suggestedDomain || 'vex.deals',
    confidence: info.confidence || 'low',
    source: info.source || 'fallback',
  });
});

// App Branding (Name & Icon)
app.get('/api/app-branding', (req, res) => {
  currentBranding = storage.getAppBranding();
  res.json(currentBranding);
});

app.post('/api/app-branding', (req, res) => {
  const {
    appName,
    tagline,
    iconType,
    presetIconId,
    customIconUrl,
    uploadedIconData,
    iconResolution,
    themeColor,
    backgroundColor,
    targetCompanyId,
    exclusiveMode,
  } = req.body;

  if (appName && appName.trim()) {
    currentBranding.appName = appName.trim();
  }
  if (tagline !== undefined) {
    currentBranding.tagline = tagline.trim();
  }
  if (iconType === 'preset' || iconType === 'custom' || iconType === 'upload') {
    currentBranding.iconType = iconType;
  }
  if (presetIconId) {
    currentBranding.presetIconId = presetIconId;
  }
  if (customIconUrl !== undefined) {
    currentBranding.customIconUrl = customIconUrl.trim();
  }
  if (uploadedIconData !== undefined) {
    currentBranding.uploadedIconData = uploadedIconData;
  }
  if (iconResolution) {
    currentBranding.iconResolution = iconResolution;
  }
  if (themeColor) {
    currentBranding.themeColor = themeColor;
  }
  if (backgroundColor) {
    currentBranding.backgroundColor = backgroundColor;
  }
  if (targetCompanyId !== undefined) {
    currentBranding.targetCompanyId = targetCompanyId;
  }
  if (exclusiveMode !== undefined) {
    currentBranding.exclusiveMode = exclusiveMode;
  }
  currentBranding.updatedAt = new Date().toISOString();

  storage.saveAppBranding(currentBranding);
  io.emit('app_branding_updated', currentBranding);

  res.json({
    success: true,
    branding: currentBranding,
    message: 'تم تحديث هوية وأيقونة التطبيق ومواصفات Manifest بنجاح!',
  });
});

// Payment Methods Management
app.get('/api/payment-methods', (req, res) => {
  const branding = storage.getAppBranding();
  res.json({ paymentMethods: branding.paymentMethods || [] });
});

app.post('/api/payment-methods', (req, res) => {
  const { paymentMethods } = req.body;
  if (!Array.isArray(paymentMethods)) {
    return res.status(400).json({ error: 'Invalid payment methods format' });
  }
  // Light scope validation: keep only well-formed scope/countries, default to global
  const sanitized = paymentMethods.map((pm: any) => {
    if (!pm || typeof pm !== 'object') return pm;
    const scope = pm.scope === 'countries' ? 'countries' : 'global';
    const countries = Array.isArray(pm.countries)
      ? pm.countries.filter((c: any) => typeof c === 'string' && /^[A-Za-z]{2}$/.test(c)).map((c: string) => c.toUpperCase())
      : [];
    return { ...pm, scope, countries: scope === 'countries' ? countries : [] };
  });
  const branding = storage.getAppBranding();
  branding.paymentMethods = sanitized;
  storage.saveAppBranding(branding);
  currentBranding = branding;
  io.emit('payment_methods_updated', branding.paymentMethods);
  res.json({ success: true, paymentMethods: branding.paymentMethods });
});

// Dynamic Web App Manifest Endpoint
const getDynamicManifest = () => {
  const appName = currentBranding.appName || 'VEX Deals';
  const shortName = appName.split(' ')[0];
  const description = currentBranding.tagline || 'منصة الولاء والتعويضات والتحليلات الرياضية الذكية';
  const themeColor = currentBranding.themeColor || '#f8fafc';
  const bgColor = currentBranding.backgroundColor || '#f8fafc';

  let iconSrc192 = '/icon-192.svg';
  let iconSrc512 = '/icon-512.svg';

  if (currentBranding.iconType === 'upload' && currentBranding.uploadedIconData) {
    iconSrc192 = currentBranding.uploadedIconData;
    iconSrc512 = currentBranding.uploadedIconData;
  } else if (currentBranding.iconType === 'custom' && currentBranding.customIconUrl) {
    iconSrc192 = currentBranding.customIconUrl;
    iconSrc512 = currentBranding.customIconUrl;
  }

  return {
    name: appName,
    short_name: shortName,
    description: description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: bgColor,
    theme_color: themeColor,
    icons: [
      {
        src: iconSrc192,
        sizes: '192x192',
        type: iconSrc192.startsWith('data:image/svg') || iconSrc192.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
        purpose: 'any',
      },
      {
        src: iconSrc512,
        sizes: '512x512',
        type: iconSrc512.startsWith('data:image/svg') || iconSrc512.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
        purpose: 'any',
      },
      {
        src: iconSrc512,
        sizes: '512x512',
        type: iconSrc512.startsWith('data:image/svg') || iconSrc512.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['finance', 'utilities', 'sports'],
  };
};

app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.setHeader('Cache-Control', 'no-cache');
  res.json(getDynamicManifest());
});

app.get('/api/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.json(getDynamicManifest());
});

// Sports Fixtures
app.get('/api/sports/fixtures', (req, res) => {
  res.json({
    fixtures: SPORTS_FIXTURES,
    total: SPORTS_FIXTURES.length,
    updatedAt: new Date().toISOString(),
  });
});

// Sports News
app.get('/api/sports/news', (req, res) => {
  res.json({
    news: SPORTS_NEWS,
    updatedAt: new Date().toISOString(),
  });
});

// ==========================================
// Site Posts — cross-published from the Telegram content pipeline
// ==========================================
const SITE_POSTS_API_KEY = process.env.PANEL_API_KEY || 'vex_hermes_FkVWYOPLZ230Ru22ib0vRDDKOJL4agfhSBDUuUoMQIM';
const SITE_POSTS_MEDIA_DIR = path.join(process.cwd(), 'data', 'site-posts-media');
const SITE_POSTS_MAX_IMAGE_BYTES = 3 * 1024 * 1024;

function sitePostStripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Newline-preserving variant — used ONLY for prediction parsing (line-based odds/% extraction)
function sitePostStripHtmlMultiline(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#?\w+;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sitePostSniffExt(buf: Buffer): string | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buf.length > 4 && buf.toString('ascii', 0, 3) === 'GIF') return 'gif';
  return null;
}

// Level-3 fallback: ask Gemini for win probabilities + predicted score.
// Never throws — extractPrediction's cascade handles null/timeout.
async function geminiPredictionFn(homeTeam: string, awayTeam: string) {
  const client = getGeminiClient();
  if (!client) return null;
  const response = await client.models.generateContent({
    model: 'gemini-3.8-flash',
    contents:
      `Estimate the football match between ${homeTeam} and ${awayTeam}. ` +
      'Return ONLY JSON: {"pHome": <0-100>, "pAway": <0-100>, "predictedScore": "<home>-<away>"} ' +
      'where pHome is the win probability for the first team, pAway for the second, and predictedScore is the most likely final score.',
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          pHome: { type: Type.NUMBER },
          pAway: { type: Type.NUMBER },
          predictedScore: { type: Type.STRING },
        },
        required: ['pHome', 'pAway', 'predictedScore'],
      },
    },
  });
  const parsed: any = JSON.parse(response.text || '{}');
  return {
    pHome: Number(parsed.pHome),
    pAway: Number(parsed.pAway),
    predictedScore: String(parsed.predictedScore || ''),
  };
}

// Settle a pending prediction: append result to the post, notify + push, emit socket.
// Shared by the ESPN auto-poller and the manual result endpoint.
function settlePredictionByPostId(postId: string, actual: ActualScore, source: string): any | null {
  const list = storage.getSitePosts();
  const post = list.find((p: any) => p && p.id === postId && p.prediction && p.prediction.status !== 'settled');
  if (!post) return null;
  const pred: PredictionRecord = post.prediction;
  const lang = post.lang === 'en' ? 'en' : 'ar';
  const { verdict, suffix } = buildResultSuffix(pred, actual, lang);
  pred.status = 'settled';
  pred.actualScore = `${actual.home}-${actual.away}`;
  pred.verdict = verdict;
  pred.settledAt = new Date().toISOString();
  pred.settledBy = source;
  post.prediction = pred;
  if (!/✅ النتيجة:|✅ Result:/.test(post.text)) {
    post.text = `${post.text}${suffix}`.slice(0, 4400);
    post.excerpt = post.text.slice(0, 400);
  }
  post.updatedAt = new Date().toISOString();
  storage.saveSitePosts(list);

  io.emit('site_post_updated', { postId, post });

  const verdictLine =
    verdict === 'hit' ? '🎯 توقعنا تحقق!' : verdict === 'miss' ? '❌ لم يتحقق التوقع' : '➖ تعادل';
  const notif = {
    id: `NOTIF-PREDRESULT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: `✅ ${pred.homeTeam} ${actual.home} - ${actual.away} ${pred.awayTeam}`,
    message: lang === 'en'
      ? `Predicted ${pred.predictedScore} — final ${actual.home}-${actual.away}`
      : `${suffix.split('\n').filter(Boolean).slice(-1)[0] || verdictLine}`,
    category: 'ai_prediction' as const,
    timestamp: new Date().toISOString(),
    read: false,
    data: { postId, targetTab: 'ai-sports', actionUrl: '/#ai-sports', source: 'prediction_settlement' },
  };
  storage.addNotification(notif);
  io.emit('notification', notif);
  void sendWebPush({
    title: notif.title,
    body: lang === 'en' ? notif.message : `${verdictLine} ${pred.homeTeam} ${actual.home} - ${actual.away} ${pred.awayTeam}`,
    url: '/#ai-sports',
    tag: `pred-${postId}`,
  });
  console.log(`🏁 [Predictions] Settled ${postId}: ${pred.homeTeam} ${actual.home}-${actual.away} ${pred.awayTeam} (${verdict}, via ${source})`);
  return post;
}

// One-time idempotent migration: compact + attach predictions to existing posts (sync, no AI at boot).
function migrateSitePostsPredictions() {
  try {
    const list = storage.getSitePosts();
    let changed = 0;
    for (const p of list) {
      if (!p || p.prediction || p.sourceText) continue;
      const plain = String(p.text || '');
      if (!plain) continue;
      const prediction = extractPredictionSync(plain);
      if (!prediction) continue;
      const lang = p.lang === 'en' ? 'en' : 'ar';
      p.sourceText = plain.slice(0, 4000);
      p.title = buildCompactTitle(prediction, lang);
      p.text = buildCompactText(prediction, lang);
      p.excerpt = p.text.slice(0, 400);
      p.prediction = {
        ...prediction,
        status: 'pending',
        createdAt: p.createdAt || new Date().toISOString(),
      } as any;
      p.updatedAt = new Date().toISOString();
      changed++;
    }
    if (changed > 0) {
      storage.saveSitePosts(list);
      console.log(`🔮 [Predictions] Migration compacted ${changed} existing site post(s)`);
    }
  } catch (err) {
    console.error('[Predictions] Migration failed:', err);
  }
}

// Auto-settlement: poll ESPN (site scoreboard) for finished matches, settle pending predictions.
const ESPN_SCOREBOARD_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard';

// teamsMatch (Arabic<->English alias aware) is imported from ./server/predictionParser

async function fetchFinishedMatches(dateParam: string): Promise<Array<{ homeName: string; awayName: string; home: number; away: number }>> {
  const resp = await fetch(`${ESPN_SCOREBOARD_BASE}?dates=${dateParam}`, {
    headers: { 'User-Agent': 'curl/8.0', Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`ESPN HTTP ${resp.status}`);
  const data: any = await resp.json();
  const finished: Array<{ homeName: string; awayName: string; home: number; away: number }> = [];
  for (const ev of data?.events || []) {
    const comp = ev?.competitions?.[0];
    if (ev?.status?.type?.state !== 'post') continue;
    const home = (comp?.competitors || []).find((c: any) => c.homeAway === 'home');
    const away = (comp?.competitors || []).find((c: any) => c.homeAway === 'away');
    if (!home || !away) continue;
    const hs = parseInt(String(home.score), 10);
    const as = parseInt(String(away.score), 10);
    if (Number.isNaN(hs) || Number.isNaN(as)) continue;
    finished.push({
      homeName: String(home.team?.displayName || ''),
      awayName: String(away.team?.displayName || ''),
      home: hs,
      away: as,
    });
  }
  return finished;
}

async function pollFinishedMatchResults() {
  try {
    const now = Date.now();
    const fmt = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    let finished: Awaited<ReturnType<typeof fetchFinishedMatches>> = [];
    // Today + last 3 days: catches weekend matches even if the poller was down
    for (let daysAgo = 0; daysAgo <= 3; daysAgo++) {
      const dateParam = fmt(new Date(now - daysAgo * 24 * 3600 * 1000));
      try {
        finished = finished.concat(await fetchFinishedMatches(dateParam));
      } catch (dayErr) {
        console.warn('[Predictions] ESPN fetch failed for', dateParam, dayErr);
      }
    }
    if (finished.length === 0) return;

    const pending = storage.getSitePosts().filter((p: any) => p && p.prediction && p.prediction.status === 'pending');
    if (pending.length === 0) return;

    let settled = 0;
    for (const post of pending) {
      const pred: PredictionRecord = post.prediction;
      for (const m of finished) {
        const direct = teamsMatch(pred.homeTeam, m.homeName) && teamsMatch(pred.awayTeam, m.awayName);
        const swapped = teamsMatch(pred.homeTeam, m.awayName) && teamsMatch(pred.awayTeam, m.homeName);
        if (direct) {
          if (settlePredictionByPostId(post.id, { home: m.home, away: m.away }, 'espn')) settled++;
          break;
        }
        if (swapped) {
          if (settlePredictionByPostId(post.id, { home: m.away, away: m.home }, 'espn')) settled++;
          break;
        }
      }
    }
    if (settled > 0) {
      console.log(`🔮 [Predictions] Auto-settled ${settled} prediction(s) from ESPN (${finished.length} finished match(es) checked)`);
    }
  } catch (err) {
    console.error('[Predictions] ESPN settlement poll failed:', err);
  }
}

// Public feed of cross-published posts (merged into the website news tab)
app.get('/api/site-posts', (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '30'), 10) || 30, 1), 100);
    const all = storage.getSitePosts();
    res.json({
      posts: all.slice(0, limit),
      total: all.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Ingest from the content pipeline (protected by X-API-Key, not session)
app.post('/api/site-posts', async (req, res) => {
  try {
    const key = req.headers['x-api-key'];
    if (!key || key !== SITE_POSTS_API_KEY) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const body = req.body || {};
    const rawText = typeof body.text === 'string' ? body.text : '';
    if (!rawText.trim()) {
      return res.status(400).json({ error: 'Missing text' });
    }
    if (rawText.length > 8000) {
      return res.status(400).json({ error: 'text too long' });
    }

    const plain = sitePostStripHtml(rawText);
    if (!plain) {
      return res.status(400).json({ error: 'Empty text after sanitization' });
    }

    const computedSha1 = crypto.createHash('sha1').update(plain).digest('hex');
    // Stable dedupe key supplied by the content pipeline (pre-sanitize text),
    // so the same source content published to multiple channels maps to one post.
    const sha1 = typeof body.dedupeKey === 'string' && /^[a-f0-9]{40}$/i.test(body.dedupeKey)
      ? body.dedupeKey.toLowerCase()
      : computedSha1;
    const existing = storage.findSitePostByHash(sha1);
    if (existing) {
      return res.json({ ok: true, duplicate: true, post: existing });
    }

    let image: string | null = null;
    if (typeof body.imageBase64 === 'string' && body.imageBase64) {
      try {
        const b64 = body.imageBase64.replace(/^data:[^,]+,/, '');
        const raw = Buffer.from(b64, 'base64');
        if (raw.length > 0 && raw.length <= SITE_POSTS_MAX_IMAGE_BYTES) {
          const ext = sitePostSniffExt(raw);
          if (ext) {
            fs.mkdirSync(SITE_POSTS_MEDIA_DIR, { recursive: true });
            const fileName = `SP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
            fs.writeFileSync(path.join(SITE_POSTS_MEDIA_DIR, fileName), raw);
            image = `/site-posts-media/${fileName}`;
          }
        }
      } catch (imgErr) {
        console.warn('[SitePosts] Image decode failed:', imgErr);
      }
    }

    // Match-analysis posts get compacted to two teams + two win% + predicted score.
    // Promo/news posts keep their original text (extractPrediction returns null for them).
    let prediction: ParsedPrediction | null = null;
    try {
      prediction = await extractPrediction(sitePostStripHtmlMultiline(rawText), geminiPredictionFn);
    } catch (predErr) {
      console.warn('[SitePosts] Prediction extraction failed (continuing as plain post):', predErr);
    }

    const lang = body.lang === 'en' ? 'en' : 'ar';
    const firstRawLine = rawText.split(/\r?\n/).map((l: string) => l.trim()).find((l: string) => l) || rawText;
    const compactTitle = prediction ? buildCompactTitle(prediction, lang) : null;
    const compactText = prediction ? buildCompactText(prediction, lang) : null;
    const title = compactTitle
      || sitePostStripHtml(
          typeof body.title === 'string' && body.title.trim() ? body.title : firstRawLine
        ).slice(0, 160);
    const storedText = (compactText || plain.slice(0, 4000)).slice(0, 4400);
    const excerpt = compactText ? compactText.slice(0, 400) : plain.slice(0, 400);
    const sourceText = prediction ? plain.slice(0, 4000) : undefined;

    const post = {
      id: `SP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      text: storedText,
      excerpt,
      company: typeof body.company === 'string' ? body.company.slice(0, 60) : '',
      lang,
      channel: typeof body.channel === 'string' ? body.channel.slice(0, 120) : '',
      messageId: typeof body.messageId === 'number' ? body.messageId : null,
      image,
      source: typeof body.source === 'string' ? body.source.slice(0, 40) : 'telegram',
      externalUrl: typeof body.externalUrl === 'string' ? body.externalUrl.slice(0, 300) : null,
      sha1,
      createdAt: new Date().toISOString(),
      ...(sourceText ? { sourceText } : {}),
      ...(prediction
        ? {
            prediction: {
              ...prediction,
              status: 'pending',
              createdAt: new Date().toISOString(),
            },
          }
        : {}),
    } as any;

    storage.addSitePost(post);

    const notif = {
      id: `NOTIF-SITEPOST-${Date.now()}`,
      title: post.title,
      message: excerpt,
      category: (prediction ? 'ai_prediction' : 'sports_news') as 'ai_prediction' | 'sports_news',
      timestamp: post.createdAt,
      read: false,
      data: {
        postId: post.id,
        targetTab: 'ai-sports',
        actionUrl: '/#ai-sports',
        source: 'site_post',
        ...(prediction ? { prediction: true, pctSource: prediction.pctSource } : {}),
      },
    };
    storage.addNotification(notif);
    io.emit('notification', notif);
    if (prediction) {
      io.emit('site_post_updated', { postId: post.id, post });
      void sendWebPush({
        title: post.title,
        body: excerpt,
        url: '/#ai-sports',
        tag: `pred-${post.id}`,
      });
    }

    console.log(
      `📰 [SitePosts] Published ${post.id} (${post.company || 'VEX'})${prediction ? ` [prediction ${prediction.pctSource}]` : ''} -> notification ${notif.id}`
    );
    return res.json({ ok: true, post, notification: notif });
  } catch (err: any) {
    console.error('[SitePosts] Ingest error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Predictions log feed — pending + settled
app.get('/api/predictions', (req, res) => {
  try {
    const status = String(req.query.status || 'all');
    const list = storage
      .getSitePosts()
      .filter((p: any) => p && p.prediction)
      .map((p: any) => ({
        postId: p.id,
        title: p.title,
        lang: p.lang,
        image: p.image,
        company: p.company,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt || p.createdAt,
        prediction: p.prediction,
      }));
    const pending = list.filter((x: any) => x.prediction.status === 'pending').length;
    const settled = list.filter((x: any) => x.prediction.status === 'settled').length;
    const filtered =
      status === 'pending'
        ? list.filter((x: any) => x.prediction.status === 'pending')
        : status === 'settled'
          ? list.filter((x: any) => x.prediction.status === 'settled')
          : list;
    res.json({ predictions: filtered, total: list.length, pending, settled, updatedAt: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Manual settlement (Telegram bot or admin) — API key OR an authenticated session
app.post('/api/predictions/:postId/result', (req, res) => {
  try {
    const key = req.headers['x-api-key'];
    const sessionOk = Boolean((req as any).session || (req as any).userId);
    if (key !== SITE_POSTS_API_KEY && !sessionOk) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const post = storage.getSitePosts().find((p: any) => p && p.id === String(req.params.postId));
    if (!post || !post.prediction) {
      return res.status(404).json({ error: 'Prediction not found' });
    }
    if (post.prediction.status === 'settled') {
      return res.status(409).json({ error: 'Already settled', prediction: post.prediction });
    }
    const body = req.body || {};
    const home = parseInt(String(body.home ?? body.homeScore), 10);
    const away = parseInt(String(body.away ?? body.awayScore), 10);
    if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0 || home > 30 || away > 30) {
      return res.status(400).json({ error: 'Invalid score — expected integer home/away (0-30)' });
    }
    const settled = settlePredictionByPostId(String(req.params.postId), { home, away }, 'manual');
    return res.json({ ok: true, post: settled, prediction: settled?.prediction });
  } catch (err: any) {
    console.error('[Predictions] Manual settle error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Web Push subscriptions (public endpoints — VAPID key is public by design)
app.get('/api/push/vapid-public-key', (_req, res) => {
  const key = getVapidPublicKey();
  if (!key) return res.status(503).json({ error: 'Push not configured' });
  res.json({ publicKey: key });
});

app.post('/api/push/subscribe', (req, res) => {
  try {
    const body = req.body || {};
    const ok = addSubscription({
      endpoint: body.endpoint,
      keys: { p256dh: body.keys?.p256dh, auth: body.keys?.auth },
    });
    if (!ok) return res.status(400).json({ error: 'Invalid subscription' });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/push/unsubscribe', (req, res) => {
  try {
    const endpoint = String(req.body?.endpoint || '');
    if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });
    res.json({ ok: removeSubscription(endpoint) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve stored post media
app.use('/site-posts-media', express.static(SITE_POSTS_MEDIA_DIR, { maxAge: '7d', fallthrough: true }));

// AI Match Tactical Analysis using Gemini
app.post('/api/ai/analyze-match', async (req, res) => {
  const { matchId, homeTeam, awayTeam, league, odds } = req.body;

  const match = SPORTS_FIXTURES.find((f) => f.id === matchId) || {
    id: matchId || 'CUSTOM',
    homeTeam: homeTeam || 'الفريق المضيف',
    awayTeam: awayTeam || 'الفريق الضيف',
    league: league || 'بطولة رياضية',
    odds: odds || { home: 2.1, draw: 3.4, away: 3.2 },
  };

  const client = getGeminiClient();

  if (client) {
    try {
      const prompt = `أنت محلل رياضي تكتيكي ووكيل ذكاء اصطناعي محترف لمنصة VEX Deals الرياضية.
قم بتحليل المباراة التالية بعمق وموضوعية:
المباراة: ${match.homeTeam} ضد ${match.awayTeam}
البطولة: ${match.league}
الاحتمالات (Odds): فوز المضيف (${match.odds.home})، التعادل (${match.odds.draw})، فوز الضيف (${match.odds.away}).

المطلوب: إرجاع كائن JSON منظم وفق الخصائص التالية باللغة العربية:
1. predictedScore: النتيجة المتوقعة كنص (مثال: "2 - 1")
2. winProbabilities: كائن يحتوي على نسب مئوية مجموعها 100: home (رقم), draw (رقم), away (رقم)
3. confidenceScore: رقم بين 50 و 95 يمثل نسبة الثقة في التحليل
4. tacticalSummary: فقرة تحليلية دقيقة وموجزة (سياق الهجوم والدفاع، الحالة البدنية، الغيابات، الأسلوب التكتيكي)
5. keyFactors: مصفوفة من 3 إلى 4 نقاط مفتاحية ترجح كفة التحليل
6. recommendedPick: التوقع الاستراتيجي الأنسب (مثال: "فوز أصحاب الأرض مع تسجيل كلا الفريقين")
7. riskLevel: إحدى القيم: "low" أو "moderate" أو "high"
8. disclaimer: تنبيه لعب مسؤول قانوني قصير ومحترف (+18 للتحليل الرياضي فقط)`;

      const response = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              predictedScore: { type: Type.STRING },
              winProbabilities: {
                type: Type.OBJECT,
                properties: {
                  home: { type: Type.NUMBER },
                  draw: { type: Type.NUMBER },
                  away: { type: Type.NUMBER },
                },
                required: ['home', 'draw', 'away'],
              },
              confidenceScore: { type: Type.NUMBER },
              tacticalSummary: { type: Type.STRING },
              keyFactors: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              recommendedPick: { type: Type.STRING },
              riskLevel: { type: Type.STRING },
              disclaimer: { type: Type.STRING },
            },
            required: [
              'predictedScore',
              'winProbabilities',
              'confidenceScore',
              'tacticalSummary',
              'keyFactors',
              'recommendedPick',
              'riskLevel',
              'disclaimer',
            ],
          },
        },
      });

      const parsedResult = JSON.parse(response.text || '{}');

      return res.json({
        success: true,
        matchId: match.id,
        analysis: {
          ...parsedResult,
          matchId: match.id,
          generatedAt: new Date().toISOString(),
          poweredBy: 'Gemini 3.8 Flash AI Engine',
        },
      });
    } catch (err: any) {
      console.error('Gemini API Error, using heuristic tactical model:', err);
    }
  }

  // Resilient High-Caliber Heuristic Engine (Ensures 100% reliable UX)
  const homeProb = Math.min(65, Math.max(35, Math.round(50 + (1 / match.odds.home - 1 / match.odds.away) * 35)));
  const awayProb = Math.min(50, Math.max(20, Math.round(100 - homeProb - 25)));
  const drawProb = 100 - homeProb - awayProb;

  const fallbackAnalysis = {
    matchId: match.id,
    generatedAt: new Date().toISOString(),
    predictedScore: homeProb > awayProb ? '2 - 1' : '1 - 1',
    winProbabilities: {
      home: homeProb,
      draw: drawProb,
      away: awayProb,
    },
    confidenceScore: 82,
    tacticalSummary: `يتميز ${match.homeTeam} بقدرات اختراق هجومي عالية ومعدل ضغط عالي في الثلث الأخير، بينما يعتمد ${match.awayTeam} على الارتداد السريع والتسديدات المباغتة. الأرقام ترجح تقارباً كبيراً مع أفضلية نسبية لعامل الأرض والجمهور.`,
    keyFactors: [
      'معدل الاستحواذ الإيجابي وتنوع حلول التسجيل في الكرات الثابتة',
      'صلابة الدفاع في المباريات القارية ومرونة خط الوسط',
      'حافز النقاط الثلاث في الترتيب والمنافسة على صدارة البطولة',
    ],
    recommendedPick: `${match.homeTeam} فوز أو تعادل + أكثر من 1.5 هدف في المباراة`,
    riskLevel: 'moderate',
    disclaimer: 'تنبيه: التحليلات الرياضية مخصصة للمتابعة التحليلية والإحصائية (+18). اللعب المسؤول هو الأولوية.',
    poweredBy: 'VEX AI Tactical Forecasting Engine',
  };

  res.json({
    success: true,
    matchId: match.id,
    analysis: fallbackAnalysis,
  });
});

// Automated AI Agent Match Prediction Broadcaster
app.post('/api/ai/agent-broadcast', async (req, res) => {
  const topMatch = SPORTS_FIXTURES[0]; // El Clásico or top fixture
  const client = getGeminiClient();
  let aiAlertText = `توقع VEX الذكي لقاء ${topMatch.homeTeam} و ${topMatch.awayTeam}: نوصي بخيار (${topMatch.homeTeam} أو كلا الفريقين يسجل). نسبة الثقة 85%.`;

  if (client) {
    try {
      const response = await client.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `قم بالبحث باستخدام جوجل والإنترنت عن أحدث الأخبار الفورية والغيابات والتشكيلة لمباراة القمة بين ${topMatch.homeTeam} و ${topMatch.awayTeam}. بناءً على الأخبار الحية الحقيقية، قم بصياغة إشعار وتنبيه عاجل وقوي باللغة العربية لا يتجاوز 25 كلمة يتضمن توقيع وتحليل حقيقي ملموس للمباراة مع خيار مقترح ونسبة ثقة عالية.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      if (response.text) {
        aiAlertText = response.text.trim();
      }
    } catch {
      // Fallback alert text
    }
  }

  const newNotif = {
    id: `NOTIF-AI-${Date.now()}`,
    title: `⚡ تنبيه الذكاء الاصطناعي: ${topMatch.homeTeam} vs ${topMatch.awayTeam}`,
    message: aiAlertText,
    category: 'ai_prediction',
    timestamp: new Date().toISOString(),
    read: false,
    data: {
      matchId: topMatch.id,
      confidence: 86,
      predictionText: 'تحليل ومطابقة فورية للقمة',
    },
  };

  storage.addNotification(newNotif);
  io.emit('notification', newNotif);

  res.json({
    success: true,
    notification: newNotif,
    message: 'تم إنشاء وتوزيع توقع الذكاء الاصطناعي بنجاح كإشعار لجميع المستخدمين!',
  });
});

// ========================================================
// AI Agents Hub & Autonomous Intelligence Endpoints
// ========================================================

// 1. Get all AI Agents
app.get('/api/ai/agents', (req, res) => {
  try {
    const agents = agentEngine.getAgents();
    res.json({ success: true, agents });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Create or Update an AI Agent
app.post('/api/ai/agents', (req, res) => {
  try {
    const { name, name_ar } = req.body;
    if (!name || !name_ar) {
      return res.status(400).json({ error: 'اسم الوكيل بالعربية والإنجليزية مطلوب.' });
    }
    const saved = agentEngine.saveAgent(req.body);
    res.json({ success: true, agent: saved, message: 'تم حفظ وتفعيل الوكيل بنجاح!' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Delete a custom AI Agent
app.delete('/api/ai/agents/:id', (req, res) => {
  try {
    const { id } = req.params;
    const success = agentEngine.deleteAgent(id);
    if (!success) {
      return res.status(400).json({ error: 'لا يمكن حذف الوكلاء الأساسيين في النظام.' });
    }
    res.json({ success: true, message: 'تم حذف الوكيل بنجاح.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Conversational Chat with AI Agent (with Multimodal Vision, Action Execution & Google Search Grounding)
app.post('/api/ai/agents/:id/chat', async (req, res) => {
  try {
    const { id } = req.params;
    const { message, attachments, enableGoogleSearch } = req.body;
    if ((!message || !message.trim()) && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'نص الرسالة أو ملف مرفق مطلوب.' });
    }

    const result = await agentEngine.chatWithAgent({
      agentId: id,
      message: (message || '').trim(),
      attachments: attachments || [],
      enableGoogleSearch: enableGoogleSearch !== false,
      includePlatformState: true,
    });

    // If any actions were executed, broadcast real-time updates
    if (result.executedActions && result.executedActions.length > 0) {
      for (const act of result.executedActions) {
        if (act.type === 'create_company' || act.type === 'update_company' || act.type === 'toggle_company' || act.type === 'delete_company') {
          io.emit('companies_updated', storage.getCompanies());
        }
        if (act.type === 'approve_compensation' || act.type === 'reject_compensation') {
          io.emit('compensation_updated', storage.getCompensationRequests());
        }
        if (act.type === 'dispatch_notification' && act.details) {
          io.emit('notification', act.details);
        }
      }
    }

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[AI Chat Error]:', err);
    res.status(500).json({ error: err.message || 'حدث خطأ أثناء التحدث مع الوكيل.' });
  }
});

// 4b. Executive Admin Live Audit & Deep Inspection
app.get('/api/ai/admin/audit', (req, res) => {
  try {
    const auditReport = agentEngine.generateAdminAudit();
    res.json({ success: true, auditReport });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4c. Direct Administrative Action Execution
app.post('/api/ai/admin/execute', (req, res) => {
  try {
    const { type, params } = req.body;
    if (!type) {
      return res.status(400).json({ error: 'نوع الإجراء التنفيذي مطلوب.' });
    }
    const executedAction = agentEngine.executeAdminAction({ type, params });

    if (executedAction.type === 'create_company' || executedAction.type === 'update_company' || executedAction.type === 'toggle_company' || executedAction.type === 'delete_company') {
      io.emit('companies_updated', storage.getCompanies());
    }
    if (executedAction.type === 'approve_compensation' || executedAction.type === 'reject_compensation') {
      io.emit('compensation_updated', storage.getCompensationRequests());
    }
    if (executedAction.type === 'dispatch_notification' && executedAction.details) {
      io.emit('notification', executedAction.details);
    }

    res.json({ success: true, executedAction });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4d. Media Assets Library for AI Agents & Admin
app.get('/api/media/assets', (req, res) => {
  try {
    const assets = storage.getMediaAssets();
    res.json({ success: true, assets });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Get Agent Memory Bank
app.get('/api/ai/agents/:id/memory', (req, res) => {
  try {
    const { id } = req.params;
    const memory = agentEngine.getMemory(id);
    res.json({ success: true, memory });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Add Rule/Preference to Agent Memory
app.post('/api/ai/agents/:id/memory', (req, res) => {
  try {
    const { id } = req.params;
    const { text, category } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'نص التوجيه مطلوب.' });
    }
    const item = agentEngine.addPreference(id, text.trim(), category || 'preference');
    res.json({ success: true, item, message: 'تم حفظ القاعدة في ذاكرة الوكيل بنجاح.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Delete Preference from Memory
app.delete('/api/ai/agents/:id/memory/:prefId', (req, res) => {
  try {
    const { id, prefId } = req.params;
    const success = agentEngine.deletePreference(id, prefId);
    res.json({ success, message: success ? 'تم حذف التوجيه من الذاكرة.' : 'التوجيه غير موجود.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Smart Timing & User Activity Insights
app.get('/api/ai/notifications/insights', (req, res) => {
  try {
    const report = calculateNotificationTiming();
    res.json({ success: true, report });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Autonomous Smart Notification Dispatch (with Anti-Spam Check & Socket Broadcast)
app.post('/api/ai/notifications/smart-dispatch', async (req, res) => {
  try {
    const { bypassAntiSpam, customTitle, customMessage, category } = req.body;
    
    if (customTitle && customMessage) {
      const timingReport = calculateNotificationTiming();
      const newNotif = {
        id: `NOTIF-SMART-${Date.now()}`,
        title: customTitle.trim(),
        message: customMessage.trim(),
        category: category || 'ai_prediction',
        timestamp: new Date().toISOString(),
        read: false,
        data: {
          dispatchedBy: 'Admin AI Hub',
          activityScore: timingReport.activityScore,
        },
      };
      storage.addNotification(newNotif);
      io.emit('notification', newNotif);

      return res.json({
        success: true,
        notification: newNotif,
        timingReport,
        message: 'تم بث الإشعار بنجاح لجميع مستخدمي المنصة!',
      });
    }

    const result = await agentEngine.generateSmartNotification({
      bypassAntiSpam: Boolean(bypassAntiSpam),
    });

    if (result.success && result.notification) {
      io.emit('notification', result.notification);
    }

    res.json(result);
  } catch (err: any) {
    console.error('[AI Dispatch Error]:', err);
    res.status(500).json({ error: err.message || 'فشل توليد أو إرسال الإشعار الذكي.' });
  }
});

// 9a. User Activity Logging & Engagement Tracking
app.post('/api/users/:userId/activity', (req, res) => {
  try {
    const { userId } = req.params;
    const { actionType } = req.body;
    const engagementBehavior = storage.logUserInteraction(userId, actionType || 'interaction');
    res.json({ success: true, engagementBehavior });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9b. User Profile & Engagement Details
app.get('/api/users/:userId/profile', (req, res) => {
  try {
    const profile = storage.getUserProfile(req.params.userId);
    res.json({ success: true, profile });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9b-2. Synced user datasets — guest-first persistence (restore on phone re-link).
// Ownership: the verified session's user_id (phone reference) must match :userId.
function assertSyncOwnership(req: any, res: any): string | null {
  const userId = String(req.params.userId || '').trim();
  const sessionUser = String(req.session?.user_id || req.userId || '');
  if (!sessionUser || !userId || sessionUser !== userId) {
    res.status(403).json({
      error: 'SYNC_FORBIDDEN',
      message: 'لا تملك صلاحية الوصول لبيانات هذا المستخدم.',
    });
    return null;
  }
  return userId;
}

const SYNC_COLLECTION_KEYS = ['wallets', 'accounts', 'transfers', 'referrals', 'notifications'] as const;

app.get('/api/users/:userId/sync', (req, res) => {
  try {
    const userId = assertSyncOwnership(req, res);
    if (!userId) return;
    const data = storage.getUserSyncDatasets(userId);
    const profile = storage.getUserProfile(userId);
    res.json({
      success: true,
      sync: {
        wallets: data.wallets,
        accounts: data.accounts,
        transfers: data.transfers,
        referrals: data.referrals,
        notifications: data.notifications,
        pin_hash: typeof profile?.pin_hash === 'string' ? profile.pin_hash : '',
        profile,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/:userId/sync', (req, res) => {
  try {
    const userId = assertSyncOwnership(req, res);
    if (!userId) return;
    const body = req.body || {};
    const saved: Record<string, number> = {};
    for (const key of SYNC_COLLECTION_KEYS) {
      if (Array.isArray(body[key])) {
        storage.setUserSyncCollection(userId, key, body[key]);
        saved[key] = body[key].length;
      }
    }
    if (typeof body.pin_hash === 'string' && body.pin_hash.length >= 8 && body.pin_hash.length <= 256) {
      const profile = storage.getUserProfile(userId);
      profile.pin_hash = body.pin_hash;
      profile.updated_at = new Date().toISOString();
      storage.saveUserProfile(profile);
      saved.pin_hash = 1;
    }
    res.json({ success: true, saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9c. Aggregated Platform User Cohort Behavior
app.get('/api/ai/notifications/cohort-behavior', (req, res) => {
  try {
    const cohort = storage.getAggregatedCohortBehavior();
    res.json({ success: true, cohort });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9d. Time-Based Heuristic Evaluation
app.post('/api/ai/notifications/evaluate-timing', (req, res) => {
  try {
    const { title, message, category, targetUserId, urgency } = req.body;
    const evaluation = agentEngine.evaluateNotificationUrgencyAndTiming({
      title: title || '',
      message: message || '',
      category,
      targetUserId,
      urgency,
    });
    res.json({ success: true, evaluation });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9f. AI Content Generator for Sports & Marketing Notifications
app.post('/api/ai/notifications/generate-content', async (req, res) => {
  try {
    const { agentId, theme, targetCompanyId, targetMatchId, customPrompt } = req.body;
    const result = await agentEngine.generateNotificationContent({
      agentId,
      theme: theme || 'sports_tactical',
      targetCompanyId,
      targetMatchId,
      customPrompt,
    });
    res.json(result);
  } catch (err: any) {
    console.error('[AI Content Generator Error]:', err);
    res.status(500).json({ error: err.message || 'فشل توليد محتوى الإشعار.' });
  }
});

// 9g. Multi-Language Audience Cohorts (Lists by Language & Country)
app.get('/api/ai/notifications/cohorts', (req, res) => {
  try {
    const cohorts = storage.getAudienceCohorts();
    const profiles = storage.getUserProfiles();
    res.json({
      success: true,
      cohorts,
      totalUsers: profiles.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9h. Pre-Dispatch AI Multi-Language Campaign Generator
app.post('/api/ai/notifications/generate-localized-campaign', async (req, res) => {
  try {
    const { agentId, theme, targetCompanyId, customPrompt, baseTitle, baseMessage } = req.body;
    const result = await agentEngine.generateLocalizedNotificationCampaign({
      agentId,
      theme,
      targetCompanyId,
      customPrompt,
      baseTitle,
      baseMessage,
    });
    res.json(result);
  } catch (err: any) {
    console.error('[Generate Localized Campaign Error]:', err);
    res.status(500).json({ error: err.message || 'فشل توليد حملة الإشعارات متعددة اللغات.' });
  }
});

// 9i. Dispatch Multi-Language Campaign to Audience Lists
app.post('/api/ai/notifications/dispatch-localized-campaign', (req, res) => {
  try {
    const { campaignId, variants, defaultTitle, defaultMessage, targetCompanyId } = req.body;
    if (!variants || Object.keys(variants).length === 0) {
      return res.status(400).json({ error: 'يجب توفير نسخ اللغات المترجمة للإرسال.' });
    }

    const result = agentEngine.dispatchLocalizedCampaign({
      campaignId,
      variants,
      defaultTitle,
      defaultMessage,
      targetCompanyId,
    });

    if (result.success && result.notification) {
      io.emit('notification', result.notification);
      io.emit('localized_campaign_dispatched', {
        campaignId,
        notificationId: result.notification.id,
        totalCohorts: result.totalCohortsDispatched,
      });
    }

    res.json(result);
  } catch (err: any) {
    console.error('[Dispatch Localized Campaign Error]:', err);
    res.status(500).json({ error: err.message || 'فشل بث الحملة متعددة اللغات.' });
  }
});

// 9j. User Preferences (Language & Country update)
app.put('/api/users/:userId/preferences', (req, res) => {
  try {
    const { userId } = req.params;
    const { language, country_code, country_iso, phone_number } = req.body;
    const updatedProfile = storage.updateUserPreferences(userId, {
      language,
      country_code,
      country_iso,
      phone_number,
    });
    res.json({ success: true, profile: updatedProfile });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9e. Scheduled Notifications Queue Management
app.get('/api/ai/notifications/scheduled', (req, res) => {
  try {
    const scheduled = storage.getScheduledNotifications();
    res.json({ success: true, scheduled });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/notifications/schedule', (req, res) => {
  try {
    const { title, message, category, urgency, targetUserId, scheduledFor, heuristicReason, targetOptimalWindow } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'العنوان ونص الرسالة مطلوبان للجدولة.' });
    }

    const scheduledItem = agentEngine.scheduleNotification({
      title,
      message,
      category,
      urgency,
      targetUserId,
      scheduledFor,
      heuristicReason,
      targetOptimalWindow,
    });

    res.json({ success: true, scheduledItem });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/notifications/scheduled/:id/dispatch-now', (req, res) => {
  try {
    const { id } = req.params;
    const list = storage.getScheduledNotifications();
    const item = list.find((s) => s.id === id);
    if (!item) {
      return res.status(404).json({ error: 'الإشعار المجدول غير موجود.' });
    }

    item.status = 'dispatched';
    item.dispatchedAt = new Date().toISOString();
    storage.saveScheduledNotifications(list);

    const notif = {
      id: `NOTIF-MANUAL-${Date.now()}`,
      title: item.title,
      message: item.message,
      category: item.category || 'ai_prediction',
      timestamp: new Date().toISOString(),
      read: false,
      data: {
        scheduledId: item.id,
        optimalWindow: item.targetOptimalWindow,
        urgency: item.urgency,
        dispatchedBy: 'Admin Immediate Override',
      },
    };

    storage.addNotification(notif);
    io.emit('notification', notif);

    res.json({ success: true, notification: notif });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/ai/notifications/scheduled/:id', (req, res) => {
  try {
    const success = storage.deleteScheduledNotification(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// 9.5 A/B Testing Notification Campaigns & Regional Resonance Endpoints
// --------------------------------------------------------------------------

// List all A/B test campaigns
app.get('/api/ai/notifications/ab-test', (req, res) => {
  try {
    const campaigns = storage.getAbTestCampaigns();
    res.json({ success: true, campaigns });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generate A/B contrast variants with AI Agent & Heuristics
app.post('/api/ai/notifications/ab-test/generate', async (req, res) => {
  try {
    const result = await agentEngine.generateAbTestVariants(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create/Save an A/B test campaign
app.post('/api/ai/notifications/ab-test', (req, res) => {
  try {
    const campaign = req.body;
    if (!campaign || !campaign.name) {
      return res.status(400).json({ error: 'بيانات حملة اختبار A/B غير مكتملة.' });
    }
    const created = storage.addAbTestCampaign(campaign);
    res.json({ success: true, campaign: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update an A/B test campaign
app.put('/api/ai/notifications/ab-test/:id', (req, res) => {
  try {
    const updated = storage.updateAbTestCampaign(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'حملة الاختبار غير موجودة.' });
    }
    res.json({ success: true, campaign: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger a pilot test (sample dispatch across regions)
app.post('/api/ai/notifications/ab-test/:id/pilot', (req, res) => {
  try {
    const campaigns = storage.getAbTestCampaigns();
    const campaign = campaigns.find((c) => c.id === req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'حملة الاختبار غير موجودة.' });
    }

    // Sample pilot calculation based on regional resonance scores
    const sampleSizePerVariant = req.body.sampleSize || 1000;
    
    // Calculate weighted expected clicks based on regional cohorts
    const regions = campaign.regionalResonance || [];
    let avgScoreA = 70;
    let avgScoreB = 75;
    if (regions.length > 0) {
      avgScoreA = regions.reduce((acc: number, r: any) => acc + (r.scoreA || 70), 0) / regions.length;
      avgScoreB = regions.reduce((acc: number, r: any) => acc + (r.scoreB || 70), 0) / regions.length;
    }

    // Baseline conversion rate around 10-15%, adjusted by resonance score + small realistic variance
    const ctrA = parseFloat(((avgScoreA / 100) * 16 + (Math.random() * 1.8 - 0.9)).toFixed(2));
    const ctrB = parseFloat(((avgScoreB / 100) * 16 + (Math.random() * 1.8 - 0.9)).toFixed(2));

    const clicksA = Math.round((sampleSizePerVariant * ctrA) / 100);
    const clicksB = Math.round((sampleSizePerVariant * ctrB) / 100);

    const winner: 'A' | 'B' = ctrA > ctrB ? 'A' : 'B';
    const winningMargin = Math.abs(ctrA - ctrB).toFixed(2);
    const winnerReasonAr = winner === 'A'
      ? `تفوق النسخة (أ) بمعدل نقر ${ctrA}% مقابل ${ctrB}% للنسخة (ب) بفارق +${winningMargin}%. أظهر المستخدمون تفضيلاً واضحاً للغة الأمان والمصداقية.`
      : `تفوق النسخة (ب) بمعدل نقر ${ctrB}% مقابل ${ctrA}% للنسخة (أ) بفارق +${winningMargin}%. حققت النبرة الحماسية والدعوة المباشرة استجابة فورية أعلى.`;

    const updated = storage.updateAbTestCampaign(req.params.id, {
      status: 'pilot_sent',
      variantA: {
        ...campaign.variantA,
        sampleSent: sampleSizePerVariant,
        clicks: clicksA,
        ctr: ctrA,
      },
      variantB: {
        ...campaign.variantB,
        sampleSent: sampleSizePerVariant,
        clicks: clicksB,
        ctr: ctrB,
      },
      winner,
      winnerReasonAr,
      lastPilotAt: new Date().toISOString(),
    });

    res.json({ success: true, campaign: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Broadcast winning variant (or regional split) to the live platform
app.post('/api/ai/notifications/ab-test/:id/broadcast', (req, res) => {
  try {
    const campaigns = storage.getAbTestCampaigns();
    const campaign = campaigns.find((c) => c.id === req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'حملة الاختبار غير موجودة.' });
    }

    const { selectedVariant, broadcastType } = req.body; // 'A' | 'B' | 'regional_split'
    const targetVariant = selectedVariant === 'B' ? campaign.variantB : campaign.variantA;

    const notif = {
      id: `NOTIF-AB-${Date.now()}`,
      title: targetVariant.title,
      message: targetVariant.message,
      category: campaign.category || 'ai_prediction',
      timestamp: new Date().toISOString(),
      read: false,
      data: {
        abTestCampaignId: campaign.id,
        abCampaignName: campaign.name,
        variantId: selectedVariant || campaign.winner || 'A',
        ctaText: targetVariant.ctaText,
        ctaAction: targetVariant.ctaAction,
        broadcastType: broadcastType || 'winner_broadcast',
        dispatchedBy: 'A/B Test Verification Engine',
      },
    };

    storage.addNotification(notif);
    io.emit('notification', notif);

    const updated = storage.updateAbTestCampaign(req.params.id, {
      status: 'completed',
      broadcastedAt: new Date().toISOString(),
      broadcastedVariant: selectedVariant || campaign.winner || 'A',
    });

    res.json({
      success: true,
      notification: notif,
      campaign: updated,
      message: 'تم بث النسخة الفائزة بنجاح لكافة مستخدمي المنصة!',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete an A/B test campaign
app.delete('/api/ai/notifications/ab-test/:id', (req, res) => {
  try {
    const success = storage.deleteAbTestCampaign(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// 9.6 Automated Compensation Approval Email Template Generator Endpoints
// --------------------------------------------------------------------------

// 1. Get all compensation approval email templates
app.get('/api/admin/compensation-email-templates', (req, res) => {
  try {
    const templates = storage.getCompensationEmailTemplates();
    res.json({ success: true, templates });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Save / update a compensation approval email template
app.post('/api/admin/compensation-email-templates', (req, res) => {
  try {
    const template = req.body;
    if (!template || !template.name || !template.subject || !template.body_html) {
      return res.status(400).json({ error: 'بيانات قالب البريد الإلكتروني غير مكتملة (الاسم، العنوان، والمحتوى مطلوبين).' });
    }

    if (!template.id) {
      template.id = `tmpl-custom-${Date.now()}`;
    }

    storage.addCompensationEmailTemplate(template);
    res.json({ success: true, template });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Delete a custom compensation email template
app.delete('/api/admin/compensation-email-templates/:id', (req, res) => {
  try {
    const success = storage.deleteCompensationEmailTemplate(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Dispatch / log an approved compensation email notification
app.post('/api/admin/compensation-email/dispatch', (req, res) => {
  try {
    const {
      requestId,
      templateId,
      recipientEmail,
      userId,
      companyName,
      subject,
      bodyHtml,
      bodyText,
      sentBy,
      createPushNotification = true,
    } = req.body;

    if (!requestId || !recipientEmail || !subject) {
      return res.status(400).json({ error: 'Missing required dispatch parameters (requestId, recipientEmail, subject).' });
    }

    const dispatchLog = {
      id: `LOG-DISPATCH-${Date.now()}`,
      request_id: requestId,
      template_id: templateId || 'custom',
      recipient_email: recipientEmail,
      user_id: userId || 'unknown_user',
      company_name: companyName || 'VEX Deals Partner',
      subject,
      dispatched_at: new Date().toISOString(),
      status: 'sent' as const,
      sent_by: sentBy || 'VEX Financial Compliance Officer',
    };

    storage.addEmailDispatchLog(dispatchLog);

    // Also push real-time notification to user feed
    if (createPushNotification) {
      const notif = {
        id: `NOTIF-EMAIL-DISPATCH-${Date.now()}`,
        title: `📧 تم إرسال إشعار الاعتماد: ${subject.replace(/[🛡️✅🔓💎]/g, '').trim().slice(0, 40)}`,
        message: `تم إرسال إيميل رسمي إلى (${recipientEmail}) يتضمن تفاصيل الرصيد المعتمد وحالة المحفظة وكود البرومو لدى ${companyName}.`,
        category: 'compensation',
        timestamp: new Date().toISOString(),
        read: false,
        data: {
          requestId,
          recipientEmail,
          companyName,
          dispatchId: dispatchLog.id,
        },
      };
      storage.addNotification(notif);
      io.emit('notification', notif);
    }

    res.json({
      success: true,
      dispatchLog,
      message: `تم توثيق وإرسال إيميل الاعتماد بنجاح إلى ${recipientEmail}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Get email dispatch history logs
app.get('/api/admin/compensation-email/logs', (req, res) => {
  try {
    const logs = storage.getEmailDispatchLogs();
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. AI-Powered Smart Email Template Generator / Polisher
app.post('/api/admin/compensation-email/generate-ai', async (req, res) => {
  try {
    const {
      request,
      company,
      tone = 'executive_formal',
      language = 'ar',
      type = 'loss_compensation',
      customPrompt = '',
    } = req.body;

    const isAr = language === 'ar';
    const isUnfreeze = type === 'deposit_unfreeze' || request?.id?.startsWith('DEP-UNF-');

    const ai = getGeminiClient();

    if (ai) {
      const prompt = `You are the Head of Customer Success & Financial Compliance at VEX Deals, a premier Sportsbook & VIP Loyalty platform.
Generate a high-converting, professional, HTML and Plain-Text email template for an APPROVED compensation or deposit-unfreeze request.

Context:
- Type: ${isUnfreeze ? '1:1 Deposit Unfreeze Approval (unlocked funds into available balance)' : 'Loss Compensation Approval (refund added to wallet balance)'}
- Language: ${isAr ? 'Arabic (العربية الفصحى الراقية)' : 'English'}
- Target Tone: ${tone} (e.g. executive_formal, high_energy_friendly, security_audit, vip_prestige)
- Custom Admin Guidance: ${customPrompt || 'Highlight the balance breakdown, explain the unfreeze ratio, promote the company promo code, and thank the customer.'}

STRICT INSTRUCTION: You MUST use these exact template placeholders so the platform dynamically resolves them:
- {{user_balance}} -> Total user wallet balance
- {{available_balance}} -> Immediately withdrawable available cash
- {{frozen_balance}} -> Remaining locked frozen balance
- {{approved_amount}} -> The exact amount approved in this request
- {{currency}} -> Currency symbol ($)
- {{account_number}} -> Customer's bookmaker account ID
- {{company_name}} -> Sportsbook / partner brand name
- {{company_promo_code}} -> Official agency promo code
- {{company_bonus_text}} -> Active bonus perks
- {{company_affiliate_link}} -> Partner link
- {{company_support_email}} -> Support desk email
- {{request_id}} -> Transaction audit ID
- {{bet_slip_id}} -> Slip or deposit ID
- {{approval_date}} -> Timestamp of approval
- {{admin_agent}} -> Auditor title
- {{platform_name}} -> Platform name (VEX Deals VIP)

Return ONLY valid JSON matching this schema:
{
  "subject": "Email subject line containing relevant placeholders",
  "preheader": "1-sentence inbox preheader summary",
  "body_text": "Complete plain-text email with placeholder tags",
  "body_html": "Modern, responsive, inline-styled email container (max-width 620px, dark theme compatible, table layout, status badges, financial breakdown, CTA button)"
}`;

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = response.text || '';
        const parsed = JSON.parse(text);
        return res.json({
          success: true,
          template: {
            id: `tmpl-ai-${Date.now()}`,
            name: isAr ? `قالب ذكي (${tone})` : `AI Tailored Template (${tone})`,
            type: isUnfreeze ? 'deposit_unfreeze' : 'loss_compensation',
            subject: parsed.subject,
            preheader: parsed.preheader,
            body_text: parsed.body_text,
            body_html: parsed.body_html,
            created_at: new Date().toISOString(),
          },
        });
      } catch (geminiError: any) {
        console.warn('[AI Email Generator] Gemini call failed, falling back to algorithmic composer:', geminiError?.message);
      }
    }

    // High quality algorithmic fallback if Gemini is offline or API key absent
    const fallbackSubject = isUnfreeze
      ? (isAr ? '🔓 اعتماد فك تجميد الرصيد 1:1 بمبلغ {{currency}}{{approved_amount}} - رصيدك متاح للسحب' : '🔓 Balance Unfrozen: {{currency}}{{approved_amount}} is Available for Withdrawal')
      : (isAr ? '✅ تم اعتماد طلب التعويض بمبلغ {{currency}}{{approved_amount}} لحسابك لدى {{company_name}}' : '✅ Compensation Approved: {{currency}}{{approved_amount}} Credited - {{company_name}}');

    const fallbackText = isAr
      ? `مرحباً عزيزنا العميل،\n\nيسرنا إبلاغك باعتماد طلبك رقم #{{request_id}}.\nالمبلغ المعتمد: {{currency}}{{approved_amount}}\nرقم حسابك: {{account_number}}\nالرصيد المتاح: {{currency}}{{available_balance}}\nالرصيد المجمد: {{currency}}{{frozen_balance}}\nإجمالي الرصيد: {{currency}}{{user_balance}}\n\nكود البرومو المعتمد: {{company_promo_code}}\nللمزيد: {{company_affiliate_link}}`
      : `Dear Customer,\n\nYour request #{{request_id}} has been approved.\nApproved Amount: {{currency}}{{approved_amount}}\nAvailable Balance: {{currency}}{{available_balance}}\nFrozen Balance: {{currency}}{{frozen_balance}}\nTotal: {{currency}}{{user_balance}}\nPromo Code: {{company_promo_code}}`;

    const fallbackHtml = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #ffffff; padding: 24px; border-radius: 12px; direction: ${isAr ? 'rtl' : 'ltr'}; text-align: ${isAr ? 'right' : 'left'};">
  <div style="background: #059669; padding: 18px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
    <h2 style="margin: 0; font-size: 20px;">${isUnfreeze ? 'تم فك تجميد الرصيد بنجاح' : 'تم اعتماد طلب التعويض'}</h2>
    <p style="margin: 6px 0 0 0; font-size: 13px;">#{{request_id}} | {{company_name}}</p>
  </div>
  <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
    تم فحص ومطابقة العملية لحسابكم رقم <strong>{{account_number}}</strong> بقسيمة رقم <strong>#{{bet_slip_id}}</strong>.
  </p>
  <div style="background: #1e293b; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 6px 0; color: #34d399; font-weight: bold;">المبلغ المعتمد: +{{currency}}{{approved_amount}}</p>
    <p style="margin: 6px 0; color: #38bdf8;">الرصيد المتاح: {{currency}}{{available_balance}}</p>
    <p style="margin: 6px 0; color: #fbbf24;">الرصيد المجمد: {{currency}}{{frozen_balance}}</p>
    <p style="margin: 6px 0; color: #ffffff; font-weight: bold;">إجمالي المحفظة: {{currency}}{{user_balance}}</p>
  </div>
  <p style="font-size: 12px; color: #94a3b8; text-align: center;">كود البرومو المعتمد: <strong>{{company_promo_code}}</strong> | {{company_support_email}}</p>
</div>`;

    res.json({
      success: true,
      template: {
        id: `tmpl-fallback-${Date.now()}`,
        name: isAr ? 'قالب مرن ذكي' : 'Smart Fallback Template',
        type: isUnfreeze ? 'deposit_unfreeze' : 'loss_compensation',
        subject: fallbackSubject,
        preheader: isAr ? 'إشعار فوري باعتماد العملية وتحديث الرصيد' : 'Instant transaction approval and ledger update',
        body_text: fallbackText,
        body_html: fallbackHtml,
        created_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// 10. Live & Historical Search Explorer
app.post('/api/ai/search', async (req, res) => {
  try {
    const { query, mode } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'نص البحث مطلوب.' });
    }

    const compRequests = storage.getCompensationRequests();
    const companies = storage.getCompanies();

    const q = query.toLowerCase();
    const matchedRequests = compRequests.filter(
      (r) => r.company_name?.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.account_number?.includes(q) || r.bet_slip_id?.includes(q)
    ).slice(0, 5);
    const matchedCompanies = companies.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.name_ar && c.name_ar.includes(query)) || c.promo_code?.toLowerCase().includes(q)
    );

    const client = getGeminiClient();
    let liveWebAnalysis: string = '';
    let citations: Array<{ title: string; url: string }> = [];

    if (client && (mode === 'live_web' || mode === 'hybrid' || !mode)) {
      try {
        const searchPrompt = `أنت محرك بحث رياضي وتحليلي ذكي لمنصة VEX Deals.
قم بالإجابة على استفسار المدير بدقة وحيادية معتمداً على أحدث المعلومات الحية من الويب:
"${query}"
المطلوب: تقديم إجابة دقيقة، مع أبرز الإحصائيات أو التشكيلات أو الأخبار المرتبطة.`;

        const response = await client.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: searchPrompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        liveWebAnalysis = response.text || '';
        const meta = response.candidates?.[0]?.groundingMetadata;
        if (meta?.groundingChunks) {
          meta.groundingChunks.forEach((chunk: any) => {
            if (chunk.web?.uri) {
              citations.push({
                title: chunk.web.title || 'مصدر رياضي رسمي',
                url: chunk.web.uri,
              });
            }
          });
        }
      } catch (searchErr) {
        console.warn('[AI Search Warning]:', searchErr);
      }
    }

    res.json({
      success: true,
      query,
      liveWebAnalysis,
      citations,
      platformHistory: {
        requests: matchedRequests,
        companies: matchedCompanies,
        totalMatches: matchedRequests.length + matchedCompanies.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Notifications Endpoints
app.get('/api/notifications', (req, res) => {
  const notifs = storage.getNotifications();
  res.json({
    notifications: notifs,
    unreadCount: notifs.filter((n) => !n.read).length,
  });
});

app.post('/api/notifications/broadcast', (req, res) => {
  const { title, message, category, data } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: 'العنوان ومحتوى الرسالة مطلوبان.' });
  }

  const notif = {
    id: `NOTIF-${Date.now()}`,
    title: title.trim(),
    message: message.trim(),
    category: category || 'system',
    timestamp: new Date().toISOString(),
    read: false,
    data: data || {},
  };

  storage.addNotification(notif);
  io.emit('notification', notif);

  res.json({
    success: true,
    notification: notif,
    message: 'تم بث الإشعار بنجاح لجميع مستخدمي التطبيق!',
  });
});

app.post('/api/notifications/mark-read', (req, res) => {
  const { id } = req.body;
  const notifs = storage.getNotifications();
  if (id === 'all') {
    notifs.forEach((n) => (n.read = true));
  } else {
    const target = notifs.find((n) => n.id === id);
    if (target) target.read = true;
  }
  storage.saveNotifications(notifs);
  res.json({ success: true });
});

// ==========================================
// VIRAL FEATURES ENDPOINTS
// ==========================================

// Golden Hour
app.get('/api/viral/golden-hour', (req, res) => {
  res.json({ success: true, state: storage.getGoldenHourState() });
});
app.post('/api/viral/golden-hour/trigger', (req, res) => {
  const { durationMinutes, multiplier, messageAr, messageEn } = req.body;
  const now = new Date();
  const end = new Date(now.getTime() + (durationMinutes || 60) * 60000);
  const state = {
    isActive: true,
    startTime: now.toISOString(),
    endTime: end.toISOString(),
    multiplier: multiplier || 2,
    messageAr: messageAr || 'الساعة الذهبية بدأت! سرعة فك الرصيد تضاعفت.',
    messageEn: messageEn || 'Golden Hour Active! Unfreeze speed doubled.'
  };
  storage.saveGoldenHourState(state);
  io.emit('golden_hour_started', state);
  res.json({ success: true, state });
});

// Unlucky Bets Leaderboard (Community Viral Wall)
app.get('/api/viral/unlucky-bets', (req, res) => {
  const bets = storage.getUnluckyBets();
  res.json({ success: true, bets, posts: bets, total: bets.length });
});

app.post('/api/viral/unlucky-bets', (req, res) => {
  const { action, postId } = req.body;
  if (action === 'vote' && postId) {
    const bet = storage.voteUnluckyBet(postId);
    const updatedList = storage.getUnluckyBets();
    if (bet) {
      io.emit('unlucky_bet_voted', bet);
      return res.json({ success: true, bet, posts: updatedList, bets: updatedList });
    }
    return res.status(404).json({ error: 'القسيمة غير موجودة' });
  }

  const { companyName, betSlipId, amount, lossAmount, story, storyAr, lostBy, userName } = req.body;
  const numAmount = Number(amount || lossAmount || 0);

  const newBetData = {
    ...req.body,
    companyName: companyName ? String(companyName).trim().slice(0, 50) : '1XBET',
    betSlipId: betSlipId ? String(betSlipId).trim().slice(0, 50) : `SLIP-${Date.now().toString(36).toUpperCase()}`,
    amount: numAmount > 0 ? numAmount : 100,
    lossAmount: numAmount > 0 ? numAmount : 100,
    story: String(story || storyAr || '').trim().slice(0, 500) || 'خسارة غير متوقعة في اللحظات الأخيرة',
    storyAr: String(storyAr || story || '').trim().slice(0, 500) || 'خسارة غير متوقعة في اللحظات الأخيرة',
    lostBy: String(lostBy || 'في الثواني الأخيرة').trim().slice(0, 80),
    userName: userName ? String(userName).trim().slice(0, 40) : 'مستخدم VEX',
    status: 'approved',
    votes: 0,
  };

  const bet = storage.addUnluckyBet(newBetData);
  const updatedList = storage.getUnluckyBets();
  io.emit('new_unlucky_bet', bet);
  res.json({ success: true, bet, posts: updatedList, bets: updatedList });
});

app.post('/api/viral/unlucky-bets/:id/vote', (req, res) => {
  const bet = storage.voteUnluckyBet(req.params.id);
  const updatedList = storage.getUnluckyBets();
  if (bet) {
    io.emit('unlucky_bet_voted', bet);
    res.json({ success: true, bet, posts: updatedList, bets: updatedList });
  } else {
    res.status(404).json({ error: 'Bet not found' });
  }
});

// AI Challenges
app.get('/api/viral/ai-challenges', (req, res) => {
  res.json({ success: true, challenges: storage.getAiChallenges() });
});
app.post('/api/viral/ai-challenges', (req, res) => {
  const challenge = storage.addAiChallenge(req.body);
  io.emit('new_ai_challenge', challenge);
  res.json({ success: true, challenge });
});

// Referrals
app.get('/api/viral/referrals', (req, res) => {
  res.json({ success: true, referrals: storage.getReferrals() });
});
app.post('/api/viral/referrals', (req, res) => {
  const ref = storage.addReferral(req.body);
  res.json({ success: true, ref });
});

// ==========================================
// COMPENSATION & DEPOSIT UNFREEZE ENDPOINTS
// ==========================================

// Submit Regular Compensation Request (Loss)
app.post('/api/compensation/requests', (req, res) => {
  const { company_id, company_name, account_number, bet_slip_id, amount, note, user_id } = req.body;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  const numAmount = Number(amount);
  if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'المبلغ غير صالح، يجب أن يكون أكبر من 0.' });
  }

  const cleanSlip = (bet_slip_id || '').trim();
  const cleanAccount = (account_number || '').trim();

  const requests = storage.getCompensationRequests();
  const existingPending = requests.find(
    (r) =>
      r.status === 'pending' &&
      r.account_number === cleanAccount &&
      r.bet_slip_id === cleanSlip
  );

  if (existingPending) {
    return res.status(429).json({
      error: 'يوجد طلب تعويض قيد المراجعة لنفس الحساب ورقم القسيمة تم تقديمه مسبقاً.',
    });
  }

  const requestId = `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const newRequest: ServerCompensationRequest = {
    id: requestId,
    user_id: user_id || 'anonymous',
    company_id: company_id || 'UNKNOWN',
    company_name: company_name || 'شركة غير محددة',
    account_number: cleanAccount,
    bet_slip_id: cleanSlip || `SLIP-${Date.now()}`,
    amount: numAmount,
    status: 'pending',
    created_at: new Date().toISOString(),
    note: note ? String(note).trim().slice(0, 500) : 'طلب تعويض خسائر قسيمة رهان',
    sender_ip: String(clientIp),
  };

  storage.addCompensationRequest(newRequest);

  const adminNotif = {
    id: `NOTIF-COMP-${Date.now()}`,
    title: `🛡️ طلب تعويض جديد: $${numAmount}`,
    message: `قدم الحساب ${newRequest.account_number} في ${newRequest.company_name} قسيمة رهان خاسرة بقيمة $${numAmount}.`,
    category: 'compensation',
    timestamp: new Date().toISOString(),
    read: false,
    data: {
      requestId: newRequest.id,
      amount: numAmount,
      company: newRequest.company_name,
    },
  };

  storage.addNotification(adminNotif);
  io.emit('notification', adminNotif);
  io.emit('new_compensation_request', newRequest);

  res.json({
    success: true,
    request: newRequest,
    message: 'تم تسجيل طلب التعويض بنجاح وجارٍ مراجعته.',
  });
});

// Submit Deposit Unfreeze Request
app.post('/api/compensation/requests/unfreeze-deposit', (req, res) => {
  const { company_id, company_name, account_number, senderPhone, amount, note, user_id } = req.body;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  const numAmount = Number(amount);
  if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'المبلغ غير صالح، يجب أن يكون أكبر من 0.' });
  }

  if (numAmount > 50000) {
    return res.status(400).json({ error: 'الحد الأقصى للطلب هو $50,000.' });
  }

  if (!account_number || typeof account_number !== 'string' || account_number.trim().length < 3) {
    return res.status(400).json({ error: 'رقم الحساب في شركة المراهنات مطلوب ويجب أن يكون صحيحاً.' });
  }

  if (!senderPhone || typeof senderPhone !== 'string' || senderPhone.trim().length < 7) {
    return res.status(400).json({ error: 'رقم الهاتف المحول منه مطلوب ويجب أن يتكون من 7 أرقام على الأقل.' });
  }

  // Anti-replay / Anti-DDoS duplicate prevention: Check for duplicate pending requests within 60s
  const now = Date.now();
  const requests = storage.getCompensationRequests();
  const existingPending = requests.find(
    (r) =>
      r.status === 'pending' &&
      r.account_number === account_number.trim() &&
      r.bet_slip_id === `DEPOSIT-${senderPhone.trim()}` &&
      now - new Date(r.created_at).getTime() < 60000
  );

  if (existingPending) {
    return res.status(429).json({
      error: 'يوجد طلب فك تجميد قيد المراجعة لنفس الحساب ورقم الهاتف تم تقديمه مؤخراً. يرجى الانتظار دقيقة قبل المحاولة مرة أخرى.',
    });
  }

  const requestId = `DEP-UNF-${now}-${Math.floor(Math.random() * 1000)}`;
  const newRequest: ServerCompensationRequest = {
    id: requestId,
    user_id: user_id || 'anonymous',
    company_id: company_id || 'UNKNOWN',
    company_name: company_name || 'شركة غير محددة',
    account_number: account_number.trim(),
    bet_slip_id: `DEPOSIT-${senderPhone.trim()}`,
    amount: numAmount,
    status: 'pending',
    created_at: new Date().toISOString(),
    note: note ? String(note).trim().slice(0, 500) : 'إيداع مباشر لفك التجميد 1:1',
    sender_ip: String(clientIp),
  };

  storage.addCompensationRequest(newRequest);

  // Notify connected admin and users via Socket.io & notifications queue
  const adminNotif = {
    id: `NOTIF-UNF-${now}`,
    title: `🔓 طلب فك تجميد جديد: $${numAmount}`,
    message: `قدم العميل ذو الحساب ${newRequest.account_number} في ${newRequest.company_name} طلب فك تجميد بقيمة $${numAmount}.`,
    category: 'compensation',
    timestamp: new Date().toISOString(),
    read: false,
    data: {
      requestId: newRequest.id,
      amount: numAmount,
      company: newRequest.company_name,
    },
  };

  storage.addNotification(adminNotif);
  io.emit('notification', adminNotif);
  io.emit('new_compensation_request', newRequest);

  res.json({
    success: true,
    request: newRequest,
    message: 'تم تسجيل طلب فك التجميد بنجاح وجارٍ التحقق منه في لوحة التحكم.',
  });
});

// List Compensation & Unfreeze Requests
app.get('/api/compensation/requests', (req, res) => {
  const { status, type, userId } = req.query;
  let list = storage.getCompensationRequests();

  if (userId && typeof userId === 'string') {
    list = list.filter((r) => r.user_id === userId);
  }

  if (status && typeof status === 'string') {
    list = list.filter((r) => r.status === status);
  }

  if (type === 'unfreeze') {
    list = list.filter((r) => r.id.startsWith('DEP-UNF-') || r.bet_slip_id.startsWith('DEPOSIT-'));
  } else if (type === 'compensation') {
    list = list.filter((r) => !r.id.startsWith('DEP-UNF-') && !r.bet_slip_id.startsWith('DEPOSIT-'));
  }

  res.json({
    success: true,
    requests: list,
    total: list.length,
  });
});

// Approve Request (Admin)
app.post('/api/compensation/approve', (req, res) => {
  const { requestId, adminName } = req.body;
  if (!requestId) {
    return res.status(400).json({ error: 'معرف الطلب مطلوب.' });
  }

  const updated = storage.updateCompensationRequest(requestId, {
    status: 'approved',
    reviewed_at: new Date().toISOString(),
    reviewed_by: adminName || 'الإدارة العامة',
  });

  if (!updated) {
    return res.status(404).json({ error: 'الطلب غير موجود في النظام.' });
  }

  // Broadcast approval notification
  const isUnfreeze = updated.id.startsWith('DEP-UNF-') || updated.bet_slip_id.startsWith('DEPOSIT-');
  const notif = {
    id: `NOTIF-APP-${Date.now()}`,
    title: isUnfreeze ? '✅ تم فك تجميد رصيدك بنجاح!' : '✅ تم اعتماد طلب التعويض!',
    message: isUnfreeze
      ? `تم التحقق من إيداعك بقيمة $${updated.amount} وفك تجميد الرصيد المقابل له ليصبح متاحاً للسحب الفوري.`
      : `تم اعتماد طلب التعويض بقيمة $${updated.amount} وإضافته لرصيدك المجمد بنجاح.`,
    category: 'compensation',
    timestamp: new Date().toISOString(),
    read: false,
    data: { requestId: updated.id, amount: updated.amount },
  };

  storage.addNotification(notif);
  io.emit('notification', notif);
  io.emit('compensation_status_updated', { requestId: updated.id, status: 'approved', request: updated });

  res.json({
    success: true,
    request: updated,
    message: isUnfreeze ? 'تم اعتماد الإيداع وفك تجميد الرصيد 1:1 بنجاح!' : 'تم اعتماد طلب التعويض بنجاح!',
  });
});

// Reject Request (Admin)
app.post('/api/compensation/reject', (req, res) => {
  const { requestId, reason, adminName } = req.body;
  if (!requestId) {
    return res.status(400).json({ error: 'معرف الطلب مطلوب.' });
  }

  const updated = storage.updateCompensationRequest(requestId, {
    status: 'rejected',
    reviewed_at: new Date().toISOString(),
    reviewed_by: adminName || 'الإدارة العامة',
    rejection_reason: reason || 'غير مطابق للشروط والمعايير',
  });

  if (!updated) {
    return res.status(404).json({ error: 'الطلب غير موجود في النظام.' });
  }

  io.emit('compensation_status_updated', { requestId: updated.id, status: 'rejected', request: updated });

  res.json({
    success: true,
    request: updated,
    message: 'تم رفض الطلب وتحديث الحالة.',
  });
});

// Bulk Approve Requests (Admin)
app.post('/api/compensation/bulk-approve', (req, res) => {
  try {
    const { requestIds, adminName } = req.body;
    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      return res.status(400).json({ error: 'قائمة معرفات الطلبات مطلوبة.' });
    }

    const approvedList: any[] = [];
    const timestamp = new Date().toISOString();

    for (const id of requestIds) {
      const updated = storage.updateCompensationRequest(id, {
        status: 'approved',
        reviewed_at: timestamp,
        reviewed_by: adminName || 'الإدارة العامة',
      });
      if (updated) {
        approvedList.push(updated);
        const isUnfreeze = updated.id.startsWith('DEP-UNF-') || updated.bet_slip_id?.startsWith('DEPOSIT-');
        const notif = {
          id: `NOTIF-APP-${Date.now()}-${id}`,
          title: isUnfreeze ? '✅ تم فك تجميد رصيدك بنجاح!' : '✅ تم اعتماد طلب التعويض!',
          message: isUnfreeze
            ? `تم التحقق من إيداعك بقيمة $${updated.amount} وفك تجميد الرصيد المقابل له ليصبح متاحاً للسحب الفوري.`
            : `تم اعتماد طلب التعويض بقيمة $${updated.amount} وإضافته لرصيدك المجمد بنجاح.`,
          category: 'compensation',
          timestamp,
          read: false,
          data: { requestId: updated.id, amount: updated.amount },
        };
        storage.addNotification(notif);
        io.emit('notification', notif);
        io.emit('compensation_status_updated', { requestId: updated.id, status: 'approved', request: updated });
      }
    }

    res.json({
      success: true,
      count: approvedList.length,
      approvedRequests: approvedList,
      message: `تم اعتماد ${approvedList.length} طلب بنجاح!`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk Reject Requests (Admin)
app.post('/api/compensation/bulk-reject', (req, res) => {
  try {
    const { requestIds, reason, adminName } = req.body;
    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      return res.status(400).json({ error: 'قائمة معرفات الطلبات مطلوبة.' });
    }

    const rejectedList: any[] = [];
    const timestamp = new Date().toISOString();

    for (const id of requestIds) {
      const updated = storage.updateCompensationRequest(id, {
        status: 'rejected',
        reviewed_at: timestamp,
        reviewed_by: adminName || 'الإدارة العامة',
        rejection_reason: reason || 'غير مطابق للشروط والمعايير',
      });
      if (updated) {
        rejectedList.push(updated);
        io.emit('compensation_status_updated', { requestId: updated.id, status: 'rejected', request: updated });
      }
    }

    res.json({
      success: true,
      count: rejectedList.length,
      rejectedRequests: rejectedList,
      message: `تم رفض ${rejectedList.length} طلب بنجاح.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// Phone Number Lock & Admin Change Request System
// --------------------------------------------------------------------------

// Submit phone change request
app.post('/api/user/phone-change-request', (req, res) => {
  const { userId, currentPhone, newPhone, reason } = req.body;
  if (!newPhone || !currentPhone) {
    return res.status(400).json({ error: 'الرقم الحالي والرقم الجديد مطلوبان.' });
  }

  const cleanNew = String(newPhone).trim();
  const cleanCurrent = String(currentPhone).trim();

  if (cleanNew === cleanCurrent) {
    return res.status(400).json({ error: 'الرقم الجديد يجب أن يكون مختلفاً عن الرقم الحالي.' });
  }

  // Check if pending request exists for this user
  const phoneRequests = storage.getPhoneChangeRequests();
  const existingPending = phoneRequests.find(
    (r) => r.user_id === (userId || 'anonymous') && r.status === 'pending'
  );
  if (existingPending) {
    return res.status(429).json({
      error: 'يوجد لديك طلب تغيير رقم هاتف قيد المراجعة لدى الإدارة حالياً. يرجى انتظار قرار الإدارة.',
    });
  }

  const now = Date.now();
  const requestId = `PCR-${now}-${Math.floor(Math.random() * 1000)}`;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  const newRequest = {
    id: requestId,
    user_id: userId || 'anonymous',
    current_phone: cleanCurrent,
    new_phone: cleanNew,
    reason: reason ? String(reason).trim().slice(0, 500) : 'طلب تغيير رقم الهاتف المعتمد',
    status: 'pending' as const,
    created_at: new Date().toISOString(),
    ip_address: String(clientIp),
  };

  storage.addPhoneChangeRequest(newRequest);

  // Send admin notification
  const adminNotif = {
    id: `NOTIF-PCR-${now}`,
    title: '🔒 طلب تغيير رقم هاتف المحفظة',
    message: `طلب المستخدم (${cleanCurrent}) تغيير رقمه المعتمد إلى (${cleanNew})، السبب: ${newRequest.reason}`,
    category: 'security',
    timestamp: new Date().toISOString(),
    read: false,
    data: { requestId: newRequest.id, currentPhone: cleanCurrent, newPhone: cleanNew },
  };

  storage.addNotification(adminNotif);
  io.emit('notification', adminNotif);
  io.emit('new_phone_change_request', newRequest);

  res.json({
    success: true,
    request: newRequest,
    message: 'تم إرسال طلب تغيير رقم الهاتف إلى الإدارة بنجاح وجارٍ مراجعته أمنياً.',
  });
});

// List phone change requests
app.get('/api/user/phone-change-requests', (req, res) => {
  const { userId, status } = req.query;
  let list = storage.getPhoneChangeRequests();

  if (userId && typeof userId === 'string') {
    list = list.filter((r) => r.user_id === userId);
  }
  if (status && typeof status === 'string') {
    list = list.filter((r) => r.status === status);
  }

  res.json({
    success: true,
    requests: list,
    total: list.length,
  });
});

// Approve Phone Change Request (Admin)
app.post('/api/admin/phone-change-requests/approve', (req, res) => {
  const { requestId, adminName } = req.body;
  if (!requestId) {
    return res.status(400).json({ error: 'معرف الطلب مطلوب.' });
  }

  const updated = storage.updatePhoneChangeRequest(requestId, {
    status: 'approved',
    reviewed_at: new Date().toISOString(),
    reviewed_by: adminName || 'الإدارة العامة',
  });

  if (!updated) {
    return res.status(404).json({ error: 'الطلب غير موجود في النظام.' });
  }

  const notif = {
    id: `NOTIF-PCR-APP-${Date.now()}`,
    title: '✅ تم اعتماد وتحديث رقم هاتفك',
    message: `وافقت الإدارة على طلبك وتم تحديث رقم هاتفك المعتمد في المحفظة إلى ${updated.new_phone}.`,
    category: 'security',
    timestamp: new Date().toISOString(),
    read: false,
    data: { requestId: updated.id, newPhone: updated.new_phone },
  };

  storage.addNotification(notif);
  io.emit('notification', notif);
  io.emit('phone_change_status_updated', { requestId: updated.id, status: 'approved', request: updated });

  res.json({
    success: true,
    request: updated,
    message: 'تمت الموافقة على تغيير رقم الهاتف وتحديث بيانات المستخدم.',
  });
});

// Reject Phone Change Request (Admin)
app.post('/api/admin/phone-change-requests/reject', (req, res) => {
  const { requestId, reason, adminName } = req.body;
  if (!requestId) {
    return res.status(400).json({ error: 'معرف الطلب مطلوب.' });
  }

  const updated = storage.updatePhoneChangeRequest(requestId, {
    status: 'rejected',
    reviewed_at: new Date().toISOString(),
    reviewed_by: adminName || 'الإدارة العامة',
  });

  if (!updated) {
    return res.status(404).json({ error: 'الطلب غير موجود في النظام.' });
  }

  const notif = {
    id: `NOTIF-PCR-REJ-${Date.now()}`,
    title: '❌ تم رفض طلب تغيير رقم الهاتف',
    message: `تم رفض طلب تغيير رقم الهاتف من قبل الإدارة: ${reason || 'لم يتم استيفاء معايير التحقق الأمني'}`,
    category: 'security',
    timestamp: new Date().toISOString(),
    read: false,
    data: { requestId: updated.id },
  };

  storage.addNotification(notif);
  io.emit('notification', notif);
  io.emit('phone_change_status_updated', { requestId: updated.id, status: 'rejected', request: updated });

  res.json({
    success: true,
    request: updated,
    message: 'تم رفض طلب تغيير رقم الهاتف.',
  });
});

// ============================================================================
// TELEGRAM BOT VERIFICATION ENGINE (Token in Admin, Contact Sharing, 6-Digit OTP)
// ============================================================================

const TELEGRAM_CONFIG_PATH = path.join(process.cwd(), 'telegram-bot-config.json');

interface ServerTelegramConfig {
  bot_token: string;
  bot_username: string;
  is_active: boolean;
  bot_name?: string;
  bot_id?: number;
  updated_at?: string;
}

let telegramConfig: ServerTelegramConfig = {
  bot_token: process.env.TELEGRAM_BOT_TOKEN || '',
  bot_username: process.env.TELEGRAM_BOT_USERNAME || '',
  is_active: true,
};

// Try loading saved config from file
try {
  if (fs.existsSync(TELEGRAM_CONFIG_PATH)) {
    const raw = fs.readFileSync(TELEGRAM_CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    telegramConfig = { ...telegramConfig, ...parsed };
    if (parsed.bot_token) {
      telegramConfig.is_active = parsed.is_active !== false;
    }
  }
} catch (e) {
  console.warn('⚠️ [Telegram] Unable to read telegram-bot-config.json', e);
}

function saveTelegramConfigToFile() {
  try {
    fs.writeFileSync(TELEGRAM_CONFIG_PATH, JSON.stringify(telegramConfig, null, 2), 'utf-8');
  } catch (e) {
    console.error('❌ [Telegram] Failed to write telegram-bot-config.json:', e);
  }
}

interface ServerTelegramSession {
  session_id: string;
  user_id: string;
  created_at: number;
  expires_at: number;
  status: 'pending_telegram' | 'contact_received' | 'verified' | 'expired';
  phone_number?: string;
  telegram_username?: string;
  telegram_id?: number;
  telegram_first_name?: string;
  code?: string;
}

// In-Memory Telegram State
const TELEGRAM_SESSIONS = new Map<string, ServerTelegramSession>();
const TELEGRAM_ACTIVE_CODES = new Map<string, ServerTelegramSession>();
const TELEGRAM_USER_SESSIONS = new Map<number, string>();
const TELEGRAM_VERIFIED_HISTORY: Array<{
  phone: string;
  telegram_username?: string;
  telegram_id?: number;
  verified_at: string;
  session_id: string;
}> = [];

// Connect session store to session guard middleware
setSessionStore(TELEGRAM_SESSIONS);

// Helper: Mask token for display
function maskTelegramToken(token: string): string {
  if (!token) return '';
  if (token.length <= 10) return '********';
  const prefix = token.substring(0, 6);
  const suffix = token.substring(token.length - 4);
  return `${prefix}...${suffix}`;
}

// Telegram Bot API Helper: Send message
async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  options?: {
    parse_mode?: string;
    keyboard?: any[];
    remove_keyboard?: boolean;
    resize_keyboard?: boolean;
    one_time_keyboard?: boolean;
  }
) {
  if (!telegramConfig.bot_token) return null;
  const url = `https://api.telegram.org/bot${telegramConfig.bot_token}/sendMessage`;
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: options?.parse_mode || 'Markdown',
  };

  if (options?.keyboard) {
    body.reply_markup = {
      keyboard: options.keyboard,
      resize_keyboard: options.resize_keyboard !== false,
      one_time_keyboard: options.one_time_keyboard !== false,
    };
  } else if (options?.remove_keyboard) {
    body.reply_markup = {
      remove_keyboard: true,
    };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (err) {
    console.error('❌ [Telegram] Failed to send message:', err);
    return null;
  }
}

// Telegram Polling Daemon
let telegramPollingActive = false;
let telegramPollingOffset = 0;
let telegramPollingAbortController: AbortController | null = null;

function maskPhone(phone: string): string {
  if (!phone || phone.length <= 7) return phone || '';
  return phone.slice(0, 4) + '•••••' + phone.slice(-3);
}

// simulate-contact is a dev/testing helper: only loopback/private origins may mint codes.
function isLoopbackOrPrivateIp(ip: string): boolean {
  const clean = String(ip || '').trim().toLowerCase().replace(/^::ffff:/, '');
  if (!clean) return false;
  if (clean === '::1' || clean === 'localhost') return true;
  if (clean === '127.0.0.1' || clean.startsWith('127.')) return true;
  if (clean.startsWith('10.')) return true;
  if (clean.startsWith('192.168.')) return true;
  const m172 = clean.match(/^172\.(\d+)\./);
  if (m172) {
    const second = Number(m172[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

async function handleTelegramUpdate(update: any) {
  const message = update.message;
  if (!message || !message.chat) return;

  const chatId = message.chat.id;
  const telegramUserId = message.from?.id;
  const telegramUsername = message.from?.username || '';
  const telegramFirstName = message.from?.first_name || '';
  const text = (message.text || '').trim();

  console.log(`📩 [Telegram Update] from @${telegramUsername} (chat: ${chatId}):`, text || '[Contact]');

  // Case 1: User Shared Contact (Genuine Phone Number from Telegram)
  if (message.contact) {
    const contact = message.contact;
    let rawPhone = contact.phone_number || '';
    if (!rawPhone) return;

    let cleanPhone = rawPhone.replace(/[^0-9+]/g, '');
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = '+' + cleanPhone;
    }

    // Only a session bound to THIS telegram user (via the website deep link) may receive the contact.
    // Never fall back to "first pending session" — that hijacks another visitor's verification.
    const boundSessionId = telegramUserId ? TELEGRAM_USER_SESSIONS.get(telegramUserId) : undefined;
    const sessionId = boundSessionId;
    const session = boundSessionId ? TELEGRAM_SESSIONS.get(boundSessionId) : undefined;

    if (session && session.status === 'verified') {
      await sendTelegramMessage(
        chatId,
        `✅ حسابك مرتبط مسبقاً بالرقم \`${session.phone_number || ''}\`.\n\n` +
          `لطلب رمز تحقق جديد: افتح الموقع واضغط «طلب رمز» ثم عد إلى هنا.`,
        { remove_keyboard: true, parse_mode: 'Markdown' }
      );
      return;
    }

    if (!session || !sessionId) {
      // No bound session: promo + instructions instead of hijacking someone else's session.
      await sendTelegramMessage(
        chatId,
        `${buildBotPromoMessage()}\n\n📌 لربط حسابك بحسابك: افتح الموقع واضغط «طلب رمز» ثم عد إلى هنا وأرسل جهة الاتصال.`,
        {
          keyboard: [[{ text: '📲 مشاركة جهة الاتصال لتأكيد المحفظة', request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        }
      );
      return;
    }

    // Generate unique 6-digit OTP code
    let code = Math.floor(100000 + Math.random() * 900000).toString();
    while (TELEGRAM_ACTIVE_CODES.has(code)) {
      code = Math.floor(100000 + Math.random() * 900000).toString();
    }

    session.status = 'contact_received';
    session.expires_at = Date.now() + 15 * 60 * 1000;
    session.phone_number = cleanPhone;
    session.telegram_username = telegramUsername;
    session.telegram_id = telegramUserId;
    session.telegram_first_name = telegramFirstName;
    session.code = code;
    TELEGRAM_SESSIONS.set(sessionId, session);

    TELEGRAM_ACTIVE_CODES.set(code, session);
    if (telegramUserId) {
      TELEGRAM_USER_SESSIONS.set(telegramUserId, sessionId);
    }

    // Emit live WebSocket update to the browser — the code itself NEVER leaves server/bot:
    // it is delivered only inside Telegram, and the web app polls/accepts manual entry.
    io.emit('telegram_contact_received', {
      sessionId,
      phone: maskPhone(cleanPhone),
      has_code: true,
      telegramUsername,
      telegramId: telegramUserId,
    });

    // Send formatted message with click-to-copy code in backticks
    const replyMsg =
      `✅ *تم استلام رقم هاتفك بنجاح وتأمينه!*\n\n` +
      `📞 *رقم الهاتف المعتمد:* \`${cleanPhone}\`\n\n` +
      `🔐 *رمز تأكيد وتفعيل المحفظة الفريد الخاص بك:* \n\n` +
      `\`${code}\`\n\n` +
      `👆 *(اضغط فوق الرمز أعلاه لنسخه بنقرة واحدة)*\n\n` +
      `📋 *الخطوة الأخيرة:*\n` +
      `الرجاء العودة إلى الموقع أو التطبيق ولصق هذا الرمز المكون من 6 أرقام في خانة التأكيد لإتمام ربط وقفل رقم هاتفك بمحفظتك بشكل دائم.`;

    await sendTelegramMessage(chatId, replyMsg, {
      remove_keyboard: true,
      parse_mode: 'Markdown',
    });
    return;
  }

  // Case 2: /start or /start v_SESSION_ID
  if (text.startsWith('/start')) {
    const parts = text.split(' ');
    const deepLinkPayload = parts[1] || '';
    if (deepLinkPayload.startsWith('v_')) {
      const sessId = deepLinkPayload;
      // Ensure the deep-linked session exists (auth pages create it server-side;
      // this guards against stale/foreign payloads so the contact flow binds correctly)
      if (!TELEGRAM_SESSIONS.has(sessId)) {
        TELEGRAM_SESSIONS.set(sessId, {
          session_id: sessId,
          user_id: 'user_guest',
          created_at: Date.now(),
          expires_at: Date.now() + 15 * 60 * 1000,
          status: 'pending_telegram',
        });
      }
      if (telegramUserId) {
        TELEGRAM_USER_SESSIONS.set(telegramUserId, sessId);
      }

      const welcomeMsg =
        `مرحباً بك في نظام التوثيق والأمان لمحفظة *VEX Deals* 🛡️\n\n` +
        `لحماية حسابك ومحفظتك من العمليات غير المصرح بها، يلزم بروتوكول الأمان ربط رقم هاتفك الحقيقي بالمحفظة لمرة واحدة فقط.\n\n` +
        `يرجى الضغط على الزر أدناه لمشاركة جهة الاتصال الخاصة بك (رقم هاتفك):`;

      await sendTelegramMessage(chatId, welcomeMsg, {
        parse_mode: 'Markdown',
        keyboard: [
          [
            {
              text: '📲 مشاركة جهة الاتصال لتأكيد المحفظة',
              request_contact: true,
            },
          ],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      });
      return;
    }

    // No / unknown session payload → promotional post (Part 4 of the plan)
    await sendTelegramMessage(chatId, buildBotPromoMessage(), {
      keyboard: [
        [
          {
            text: '📲 مشاركة جهة الاتصال لتأكيد المحفظة',
            request_contact: true,
          },
        ],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    });
    return;
  }

  // Case 3: Any other text
  const boundSessionId = telegramUserId ? TELEGRAM_USER_SESSIONS.get(telegramUserId) : undefined;
  const boundSession = boundSessionId ? TELEGRAM_SESSIONS.get(boundSessionId) : undefined;
  if (boundSession && boundSession.status !== 'verified') {
    const helpMsg =
      `لتأكيد رقم هاتفك والحصول على رمز تفعيل المحفظة الفريد (6 أرقام)، يرجى الضغط على زر *[📲 مشاركة جهة الاتصال]* أدناه:`;

    await sendTelegramMessage(chatId, helpMsg, {
      parse_mode: 'Markdown',
      keyboard: [
        [
          {
            text: '📲 مشاركة جهة الاتصال لتأكيد المحفظة',
            request_contact: true,
          },
        ],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    });
    return;
  }

  // No bound session (or already verified) → promo + instructions
  await sendTelegramMessage(
    chatId,
    `${buildBotPromoMessage()}\n\n📌 لربط حسابك: افتح الموقع واضغط «طلب رمز» ثم عد إلى هنا وأرسل جهة الاتصال.`,
    {
      keyboard: [
        [
          {
            text: '📲 مشاركة جهة الاتصال لتأكيد المحفظة',
            request_contact: true,
          },
        ],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    }
  );
}

async function startTelegramPolling() {
  if (!telegramConfig.bot_token || !telegramConfig.is_active) {
    telegramPollingActive = false;
    return;
  }
  if (process.env.TELEGRAM_POLLING_DISABLED === '1' || process.env.TELEGRAM_POLLING_DISABLED === 'true') {
    telegramPollingActive = false;
    console.log('🤖 [Telegram Polling Daemon] Disabled via TELEGRAM_POLLING_DISABLED (running without getUpdates).');
    return;
  }
  if (telegramPollingActive) return;
  telegramPollingActive = true;
  console.log(`🤖 [Telegram Polling Daemon] Started listening for @${telegramConfig.bot_username || 'Bot'} updates (allowed: message, channel_post, edited_channel_post, my_chat_member)...`);

  (async () => {
    while (telegramPollingActive && telegramConfig.bot_token && telegramConfig.is_active) {
      try {
        telegramPollingAbortController = new AbortController();
        const allowedUpdates = JSON.stringify(['message', 'channel_post', 'edited_channel_post', 'my_chat_member']);
        const url = `https://api.telegram.org/bot${telegramConfig.bot_token}/getUpdates?offset=${telegramPollingOffset}&timeout=15&allowed_updates=${encodeURIComponent(allowedUpdates)}`;
        const res = await fetch(url, { signal: telegramPollingAbortController.signal });
        if (!res.ok) {
          await new Promise((r) => setTimeout(r, 6000));
          continue;
        }
        const data: any = await res.json();
        if (data && data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            telegramPollingOffset = update.update_id + 1;
            recordTelegramRelay(update);
            await handleTelegramUpdate(update);
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') break;
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
    telegramPollingActive = false;
  })();
}

function stopTelegramPolling() {
  telegramPollingActive = false;
  if (telegramPollingAbortController) {
    telegramPollingAbortController.abort();
    telegramPollingAbortController = null;
  }
}

// TELEGRAM RELAY — this server is the sole getUpdates poller; every update is
// buffered here so the VEX_Content watcher can pull channel_post/my_chat_member
// events over HTTP instead of racing the same token with a second poller.
const TELEGRAM_RELAY_PATH = path.join(process.cwd(), 'data', 'telegram_relay.json');
const TELEGRAM_RELAY_MAX = 400;

function loadTelegramRelay(): { items: any[] } {
  try {
    if (fs.existsSync(TELEGRAM_RELAY_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(TELEGRAM_RELAY_PATH, 'utf-8'));
      if (parsed && Array.isArray(parsed.items)) return parsed;
    }
  } catch (err) {
    console.error('[Telegram Relay] read failed:', err);
  }
  return { items: [] };
}

function recordTelegramRelay(update: any) {
  try {
    if (!update || typeof update.update_id !== 'number') return;
    const relay = loadTelegramRelay();
    const last = relay.items.length ? relay.items[relay.items.length - 1].update_id : -1;
    if (update.update_id <= last) return;
    relay.items.push(update);
    if (relay.items.length > TELEGRAM_RELAY_MAX) {
      relay.items.splice(0, relay.items.length - TELEGRAM_RELAY_MAX);
    }
    fs.mkdirSync(path.dirname(TELEGRAM_RELAY_PATH), { recursive: true });
    fs.writeFileSync(TELEGRAM_RELAY_PATH, JSON.stringify(relay));
  } catch (err) {
    console.error('[Telegram Relay] write failed:', err);
  }
}

// Pull endpoint for the VEX_Content watcher (X-API-Key, no session).
app.get('/api/telegram/relay', (req, res) => {
  const key = String((req.headers['x-api-key'] as string) || req.query.key || '');
  if (key !== SITE_POSTS_API_KEY) {
    return res.status(401).json({ success: false, error: 'unauthorized' });
  }
  const cursor = Number(req.query.cursor || 0) || 0;
  const limit = Math.min(Math.max(Number(req.query.limit || 100) || 100, 1), 200);
  const relay = loadTelegramRelay();
  const items = relay.items.filter((u: any) => (u?.update_id || 0) > cursor).slice(0, limit);
  const nextCursor = items.length ? items[items.length - 1].update_id : cursor;
  res.json({ success: true, items, cursor: nextCursor, buffered: relay.items.length });
});

// TELEGRAM API ENDPOINTS

// 1. Get Admin Telegram Config
app.get('/api/admin/telegram-config', (req, res) => {
  res.json({
    success: true,
    config: {
      bot_token: maskTelegramToken(telegramConfig.bot_token),
      raw_has_token: !!telegramConfig.bot_token,
      bot_username: telegramConfig.bot_username,
      is_active: telegramConfig.is_active,
      bot_name: telegramConfig.bot_name,
      bot_id: telegramConfig.bot_id,
      polling_active: telegramPollingActive,
      updated_at: telegramConfig.updated_at,
    },
    verifiedHistory: TELEGRAM_VERIFIED_HISTORY.slice(0, 15),
  });
});

// 2. Save Admin Telegram Config
app.post('/api/admin/telegram-config', async (req, res) => {
  const { bot_token, bot_username, is_active } = req.body;

  if (!bot_token || !bot_token.trim()) {
    return res.status(400).json({ error: 'توكن بوت تيليجرام مطلوب.' });
  }

  const cleanToken = bot_token.trim();

  // Test token with Telegram API getMe
  try {
    const testRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const testData: any = await testRes.json();

    if (!testData.ok || !testData.result) {
      return res.status(400).json({
        error: `رمز التوكن غير صالح: ${testData.description || 'لم يتعرف تيليجرام على التوكن.'}`,
      });
    }

    const botInfo = testData.result;

    telegramConfig.bot_token = cleanToken;
    telegramConfig.bot_username = bot_username?.trim().replace(/^@/, '') || botInfo.username;
    telegramConfig.bot_name = botInfo.first_name;
    telegramConfig.bot_id = botInfo.id;
    telegramConfig.is_active = is_active !== false;
    telegramConfig.updated_at = new Date().toISOString();

    saveTelegramConfigToFile();

    // Restart polling with new token
    stopTelegramPolling();
    if (telegramConfig.is_active) {
      telegramPollingOffset = 0;
      startTelegramPolling();
    }

    io.emit('telegram_config_updated', {
      bot_username: telegramConfig.bot_username,
      bot_name: telegramConfig.bot_name,
      is_active: telegramConfig.is_active,
    });

    res.json({
      success: true,
      bot: botInfo,
      config: {
        bot_username: telegramConfig.bot_username,
        bot_name: telegramConfig.bot_name,
        bot_id: telegramConfig.bot_id,
        is_active: telegramConfig.is_active,
      },
      message: `تم ربط وتفعيل بوت تيليجرام (@${telegramConfig.bot_username}) بنجاح!`,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: `فشل الاتصال بخوادم تيليجرام: ${err.message}`,
    });
  }
});

// 3. Test Bot Connection
app.post('/api/admin/telegram/test', async (req, res) => {
  if (!telegramConfig.bot_token) {
    return res.status(400).json({ error: 'لم يتم تعيين توكن البوت بعد.' });
  }
  try {
    const testRes = await fetch(`https://api.telegram.org/bot${telegramConfig.bot_token}/getMe`);
    const testData: any = await testRes.json();
    if (testData.ok) {
      res.json({
        success: true,
        bot: testData.result,
        pollingActive: telegramPollingActive,
        message: `البوت متصل بنجاح: ${testData.result.first_name} (@${testData.result.username})`,
      });
    } else {
      res.status(400).json({ success: false, error: testData.description });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Create Telegram Verification Session for user
app.post('/api/telegram/session', (req, res) => {
  const { userId } = req.body;
  const sessionId = `v_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  const session: ServerTelegramSession = {
    session_id: sessionId,
    user_id: userId || 'user_guest',
    created_at: Date.now(),
    expires_at: Date.now() + 15 * 60 * 1000, // 15 mins
    status: 'pending_telegram',
  };

  TELEGRAM_SESSIONS.set(sessionId, session);

  const botUser = telegramConfig.bot_username || 'VexVerifyBot';
  const deepLink = `https://t.me/${botUser}?start=${sessionId}`;

  res.json({
    success: true,
    session_id: sessionId,
    bot_username: botUser,
    deep_link: deepLink,
    bot_configured: !!(telegramConfig.bot_token && telegramConfig.is_active),
    expires_at: session.expires_at,
  });
});

// 5. Check Session Status
app.get('/api/telegram/session-status/:sessionId', (req, res) => {
  const session = TELEGRAM_SESSIONS.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'الجلسة غير موجودة أو انتهت صلاحيتها.' });
  }
  res.json({
    success: true,
    status: session.status,
    phone_number: session.phone_number,
    has_code: !!session.code,
    telegram_username: session.telegram_username,
  });
});

// 6. Verify 6-Digit Code (User pastes in web app)
app.post('/api/telegram/verify-code', (req, res) => {
  const { code, sessionId, userId } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'يرجى إدخال رمز التحقق المكون من 6 أرقام.' });
  }

  const cleanCode = code.trim().replace(/[^0-9]/g, '');
  if (cleanCode.length !== 6) {
    return res.status(400).json({ error: 'رمز التحقق يجب أن يتكون من 6 أرقام بالضبط.' });
  }

  // Look up code in active codes
  const session = TELEGRAM_ACTIVE_CODES.get(cleanCode);

  if (!session) {
    return res.status(400).json({
      error: 'رمز التحقق غير صحيح أو انتهت صلاحيته. يرجى التأكد من نسخه من بوت تيليجرام.',
    });
  }

  // The code must be bound to the session that requests it (prevents cross-session code reuse)
  if (!sessionId || typeof sessionId !== 'string' || session.session_id !== sessionId) {
    TELEGRAM_ACTIVE_CODES.delete(cleanCode);
    return res.status(400).json({
      error: 'CODE_SESSION_MISMATCH',
      message: 'رمز التحقق غير مرتبط بهذه الجلسة. اطلب رمزاً جديداً من الموقع.',
    });
  }

  if (Date.now() > session.expires_at) {
    TELEGRAM_ACTIVE_CODES.delete(cleanCode);
    return res.status(400).json({ error: 'انتهت صلاحية رمز التحقق (أكثر من 15 دقيقة). اطلب رمزاً جديداً.' });
  }

  // Success: mark verified
  session.status = 'verified';
  session.expires_at = Date.now() + SESSION_TTL_MS;
  TELEGRAM_ACTIVE_CODES.delete(cleanCode);

  // Issue the HttpOnly session cookie so the session guard admits this browser
  const isSecure =
    req.secure || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
  res.setHeader('Set-Cookie', buildSessionCookie(session.session_id, isSecure));

  const verifiedPhone = session.phone_number || '';

  // Registration identity: the verified phone number is the reference key for this user's data.
  // Any legacy profile keyed by the client-generated uid is re-keyed to the phone.
  const phoneRef = verifiedPhone.replace(/[^0-9]/g, '');
  if (phoneRef.length >= 7) {
    // Bind the session identity to the phone reference (ownership key for sync/restore)
    session.user_id = phoneRef;
    const legacyId = typeof userId === 'string' ? userId.trim() : '';
    if (legacyId && legacyId !== phoneRef && legacyId.length >= 3) {
      const profiles = storage.getUserProfiles();
      const legacyIdx = profiles.findIndex((p: any) => p && p.user_id === legacyId);
      if (legacyIdx >= 0) {
        const dupIdx = profiles.findIndex((p: any) => p && p.user_id === phoneRef);
        if (dupIdx >= 0 && dupIdx !== legacyIdx) profiles.splice(legacyIdx, 1);
        else profiles[legacyIdx].user_id = phoneRef;
        storage.saveUserProfiles(profiles);
      }
    }
    const phoneProfile = storage.getUserProfile(phoneRef);
    phoneProfile.phone_number = verifiedPhone;
    phoneProfile.is_phone_verified = true;
    phoneProfile.phone_locked = true;
    phoneProfile.phone_reference = true;
    if (session.telegram_username) phoneProfile.telegram_username = session.telegram_username;
    if (session.telegram_id) phoneProfile.telegram_id = String(session.telegram_id);
    phoneProfile.updated_at = new Date().toISOString();
    storage.saveUserProfile(phoneProfile);
  }

  TELEGRAM_VERIFIED_HISTORY.unshift({
    phone: verifiedPhone,
    telegram_username: session.telegram_username,
    telegram_id: session.telegram_id,
    verified_at: new Date().toISOString(),
    session_id: session.session_id,
  });

  const notif = {
    id: `NOTIF-TG-VER-${Date.now()}`,
    title: '🔒 تم تأكيد وقفل رقم هاتفك بنجاح',
    message: `تم ربط وتوثيق رقم هاتفك (${verifiedPhone}) عبر بوت تيليجرام وقفله كمعرف أساسي لمحفظتك.`,
    category: 'security',
    timestamp: new Date().toISOString(),
    read: false,
  };

  storage.addNotification(notif);
  io.emit('notification', notif);
  io.emit('phone_verified', {
    userId: userId || session.user_id,
    phone: verifiedPhone,
    telegramUsername: session.telegram_username,
    telegramId: session.telegram_id,
  });

  res.json({
    success: true,
    session_id: session.session_id,
    phone_number: verifiedPhone,
    phone_ref: phoneRef,
    telegram_username: session.telegram_username,
    telegram_id: session.telegram_id,
    message: `تم تأكيد وتوثيق رقم هاتفك (${verifiedPhone}) وقفله في المحفظة بنجاح!`,
  });
});

// 7. Simulate Telegram Contact Sharing (Testing & Dev Mode) — loopback/private origins only
app.post('/api/telegram/simulate-contact', (req, res) => {
  const rawIp = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || String(req.headers['x-real-ip'] || '').trim()
    || String(req.socket.remoteAddress || '').trim();
  if (!isLoopbackOrPrivateIp(rawIp)) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'simulate-contact متاح فقط من الشبكة المحلية (وضع التطوير).',
    });
  }

  const { sessionId, phone, telegramUsername } = req.body;

  const targetSession = sessionId ? TELEGRAM_SESSIONS.get(sessionId) : null;
  const sessId = targetSession ? sessionId : `v_sim_${Date.now().toString(36)}`;

  let cleanPhone = (phone || '+9647701234567').trim();
  if (!cleanPhone.startsWith('+')) cleanPhone = '+' + cleanPhone;

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  const session: ServerTelegramSession = targetSession || {
    session_id: sessId,
    user_id: 'user_simulated',
    created_at: Date.now(),
    expires_at: Date.now() + 15 * 60 * 1000,
    status: 'contact_received',
    phone_number: cleanPhone,
    telegram_username: telegramUsername || 'demo_user',
    telegram_id: 12345678,
    code,
  };

  session.status = 'contact_received';
  session.expires_at = Date.now() + 15 * 60 * 1000;
  session.phone_number = cleanPhone;
  session.code = code;
  session.telegram_username = telegramUsername || 'demo_user';

  TELEGRAM_SESSIONS.set(sessId, session);
  TELEGRAM_ACTIVE_CODES.set(code, session);

  // Never broadcast the code over sockets — only this HTTP caller sees it (dev/testing).
  io.emit('telegram_contact_received', {
    sessionId: sessId,
    phone: maskPhone(cleanPhone),
    has_code: true,
    telegramUsername: session.telegram_username,
  });

  res.json({
    success: true,
    code,
    phone: cleanPhone,
    session_id: sessId,
    message: 'تمت محاكاة مشاركة جهة الاتصال وتوليد الرمز المكون من 6 أرقام بنجاح.',
  });
});

// 8. Telegram Webhook Endpoint
app.post('/api/telegram/webhook', async (req, res) => {
  try {
    await handleTelegramUpdate(req.body);
  } catch (err) {
    console.error('❌ [Telegram Webhook] Error:', err);
  }
  res.sendStatus(200);
});

// Auth Required Page — shown when session is missing/invalid
app.get('/auth-required', (req, res) => {
  const redirect = req.query.redirect as string || '/';
  const domain = req.query.domain as string || 'vex.deals';
  const htmlPath = path.join(currentDirname, 'public', 'auth-required.html');
  
  if (!fs.existsSync(htmlPath)) {
    return res.status(404).send('Auth required page not found');
  }
  
  let html = fs.readFileSync(htmlPath, 'utf-8');
  
  // Inject query params for client-side
  const scriptTag = `<script>
    window.__AUTH_REDIRECT__ = "${redirect.replace(/"/g, '\\"')}";
    window.__AUTH_DOMAIN__ = "${domain.replace(/"/g, '\\"')}";
  </script>`;
  
  html = html.replace('</head>', `${scriptTag}</head>`);
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.send(html);
});

// ========================================================
// VEX Mega Lottery 1-Hour Pre-Draw Push Notification Engine
// ========================================================
interface ServerLotteryState {
  activeDrawId: string;
  titleAr: string;
  titleEn: string;
  closeAt: string;
  jackpotAmount: number;
  oneHourReminderSent: boolean;
  thirtyMinReminderSent: boolean;
  tierAlertSubscriptions: Record<string, boolean>;
}

let serverLotteryState: ServerLotteryState = {
  activeDrawId: 'DRAW-2026-088',
  titleAr: 'سحب VEX التكافلي الذهبي الأسبوعي #88',
  titleEn: 'VEX Weekly Solidarity Gold Draw #88',
  closeAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
  jackpotAmount: 18450.0,
  oneHourReminderSent: false,
  thirtyMinReminderSent: false,
  tierAlertSubscriptions: {
    tier1_jackpot: true,
    tier2_match5: true,
    tier3_match4_2: true,
    tier4_match3: true,
    tier5_match2: true,
  },
};

function dispatchLotteryOneHourNotification(drawState: ServerLotteryState, isManualTest = false) {
  const notifId = `NOTIF-LOTTERY-1HR-${drawState.activeDrawId}-${Date.now()}`;
  const newNotif = {
    id: notifId,
    title: `⏳ سحب اليانصيب الكبرى يبدأ بعد ساعة واحدة! (${drawState.activeDrawId})`,
    message: `باقي 60 دقيقة فقط على إغلاق تذاكر سحب VEX الكبرى. الجائزة المتراكمة: $${drawState.jackpotAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}! بادر باختيار أرقامك الرابحة الآن.`,
    category: 'lottery',
    timestamp: new Date().toISOString(),
    read: false,
    translations: {
      ar: {
        title: `⏳ سحب اليانصيب الكبرى يبدأ بعد ساعة واحدة! (${drawState.activeDrawId})`,
        message: `باقي 60 دقيقة فقط على إغلاق تذاكر سحب VEX الكبرى. الجائزة المتراكمة: $${drawState.jackpotAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}! بادر باختيار أرقامك الرابحة الآن.`,
      },
      en: {
        title: `⏳ 1 Hour Until Big Lottery Draw! (${drawState.activeDrawId})`,
        message: `Only 60 minutes left before ticket sales close for ${drawState.titleEn}. Progressive Jackpot is $${drawState.jackpotAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}! Pick your lucky numbers now.`,
      },
      ru: {
        title: `⏳ 1 час до розыгрыша лотереи! (${drawState.activeDrawId})`,
        message: `Осталось всего 60 минут до закрытия продажи билетов. Джекпот: $${drawState.jackpotAmount.toLocaleString()}! Выберите счастливые номера.`,
      },
      es: {
        title: `⏳ ¡1 hora para el gran sorteo! (${drawState.activeDrawId})`,
        message: `Solo quedan 60 minutos para el cierre de venta de boletos. ¡El bote acumulado es de $${drawState.jackpotAmount.toLocaleString()}!`,
      },
    },
    data: {
      drawId: drawState.activeDrawId,
      targetTab: 'lottery',
      actionUrl: '/#lottery',
      jackpotAmount: drawState.jackpotAmount,
      isOneHourReminder: true,
      manualTest: isManualTest,
    },
  };

  storage.addNotification(newNotif);
  io.emit('notification', newNotif);
  console.log(`🎟️ [Lottery Engine] Dispatched 1-Hour Pre-Draw Push Notification for ${drawState.activeDrawId}`);
  return newNotif;
}

function dispatchLotteryThirtyMinTierNotification(
  drawState: ServerLotteryState,
  tierId: string = 'tier1_jackpot',
  isManualTest = false
) {
  const notifId = `NOTIF-LOTTERY-30MIN-${tierId}-${Date.now()}`;
  
  const tierNames: Record<string, { ar: string; en: string; highlight: string }> = {
    tier1_jackpot: {
      ar: 'الجائزة الكبرى ($10,000+)',
      en: 'Jackpot Tier ($10,000+)',
      highlight: `$${drawState.jackpotAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    },
    tier2_match5: {
      ar: 'المستوى الثاني (5 أرقام + 1 ذهبي)',
      en: 'Tier 2 (5 Numbers + 1 Star)',
      highlight: '$2,500+',
    },
    tier3_match4_2: {
      ar: 'المستوى الثالث (4 أرقام + 2 ذهبيين)',
      en: 'Tier 3 (4 Numbers + 2 Stars)',
      highlight: '$1,000+',
    },
    tier4_match3: {
      ar: 'مستوى التكافل الرابع (3 أرقام)',
      en: 'Solidarity Tier 4 (3 Numbers)',
      highlight: '$25.00',
    },
    tier5_match2: {
      ar: 'مستوى التكافل الخامس (تذاكر مجانية / كاش)',
      en: 'Tier 5 (Free Tickets / Cash)',
      highlight: '$2.50 / Free Ticket',
    },
  };

  const tierInfo = tierNames[tierId] || tierNames.tier1_jackpot;

  const newNotif = {
    id: notifId,
    title: `🔔 تنبيه السحب: 30 دقيقة متبقية لبدء سحب [${tierInfo.ar}]`,
    message: `تنبيه سحب مخصص عبر Firebase Cloud Messaging (FCM): باقي 30 دقيقة فقط على انطلاق ${drawState.titleAr}. الجائزة المرتقبة: ${tierInfo.highlight}! ثبت تذكرتك الآن قبل إغلاق القفل التشفيري.`,
    category: 'lottery',
    timestamp: new Date().toISOString(),
    read: false,
    translations: {
      ar: {
        title: `🔔 تنبيه السحب: 30 دقيقة متبقية لبدء سحب [${tierInfo.ar}]`,
        message: `تنبيه سحب مخصص عبر Firebase Cloud Messaging (FCM): باقي 30 دقيقة فقط على انطلاق ${drawState.titleAr}. الجائزة المرتقبة: ${tierInfo.highlight}! ثبت تذكرتك الآن قبل إغلاق القفل التشفيري.`,
      },
      en: {
        title: `🔔 Draw Alert: 30 Mins Until [${tierInfo.en}] Starts`,
        message: `Customized Draw Alert via Firebase Cloud Messaging (FCM): Only 30 minutes left before ${drawState.titleEn} locks in. Target prize: ${tierInfo.highlight}! Lock in your lucky numbers now.`,
      },
      ru: {
        title: `🔔 Оповещение: 30 минут до розыгрыша [${tierInfo.en}]`,
        message: `Осталось всего 30 минут до начала тиража ${drawState.titleEn}. Приз: ${tierInfo.highlight}!`,
      },
      es: {
        title: `🔔 Alerta de Sorteo: 30 minutos para [${tierInfo.en}]`,
        message: `Solo quedan 30 minutos antes del sorteo ${drawState.titleEn}. Premio: ${tierInfo.highlight}!`,
      },
    },
    data: {
      drawId: drawState.activeDrawId,
      tierId,
      targetTab: 'lottery',
      actionUrl: '/#lottery',
      jackpotAmount: drawState.jackpotAmount,
      isThirtyMinReminder: true,
      fcmProvider: 'Firebase Cloud Messaging (FCM)',
      manualTest: isManualTest,
    },
  };

  storage.addNotification(newNotif);
  io.emit('notification', newNotif);
  console.log(`🎟️ [Lottery Engine] Dispatched 30-Minute Tier Push Alert (${tierId}) for ${drawState.activeDrawId}`);
  return newNotif;
}

function checkAndDispatchLotteryReminders() {
  if (!serverLotteryState) return;

  const closeTime = new Date(serverLotteryState.closeAt).getTime();
  const now = Date.now();
  const diffMs = closeTime - now;
  const diffMinutes = diffMs / (1000 * 60);

  // 1. If time left is 60 minutes or less: trigger 1-hour general alert
  if (diffMinutes > 0 && diffMinutes <= 60 && !serverLotteryState.oneHourReminderSent) {
    serverLotteryState.oneHourReminderSent = true;
    dispatchLotteryOneHourNotification(serverLotteryState);
  }

  // 2. If time left is 30 minutes or less: trigger 30-min per-tier draw alert
  if (diffMinutes > 0 && diffMinutes <= 30 && !serverLotteryState.thirtyMinReminderSent) {
    serverLotteryState.thirtyMinReminderSent = true;
    Object.keys(serverLotteryState.tierAlertSubscriptions).forEach((tId) => {
      if (serverLotteryState.tierAlertSubscriptions[tId]) {
        dispatchLotteryThirtyMinTierNotification(serverLotteryState, tId);
      }
    });
  }
}

// Lottery Push Endpoints
app.get('/api/lottery/status', (req, res) => {
  res.json({
    success: true,
    lottery: serverLotteryState,
  });
});

app.post('/api/lottery/sync-draw', (req, res) => {
  const { drawId, titleAr, titleEn, closeAt, jackpotAmount } = req.body;
  const isNewDraw = drawId && drawId !== serverLotteryState.activeDrawId;
  const isNewTime = closeAt && closeAt !== serverLotteryState.closeAt;

  serverLotteryState = {
    activeDrawId: drawId || serverLotteryState.activeDrawId,
    titleAr: titleAr || serverLotteryState.titleAr,
    titleEn: titleEn || serverLotteryState.titleEn,
    closeAt: closeAt || serverLotteryState.closeAt,
    jackpotAmount: Number(jackpotAmount) || serverLotteryState.jackpotAmount,
    oneHourReminderSent: isNewDraw || isNewTime ? false : serverLotteryState.oneHourReminderSent,
    thirtyMinReminderSent: isNewDraw || isNewTime ? false : serverLotteryState.thirtyMinReminderSent,
    tierAlertSubscriptions: serverLotteryState.tierAlertSubscriptions,
  };

  res.json({
    success: true,
    lottery: serverLotteryState,
    message: 'تمت مزامنة بيانات السحب بنجاح مع محرك التنبيهات!',
  });
});

app.post('/api/lottery/trigger-1hour-alert', (req, res) => {
  const notif = dispatchLotteryOneHourNotification(serverLotteryState, true);
  res.json({
    success: true,
    notification: notif,
    message: 'تم إرسال تنبيه الدفع (قبل ساعة من السحب) بنجاح لجميع المستخدمين!',
  });
});

app.post('/api/lottery/trigger-30min-tier-alert', (req, res) => {
  const { tierId } = req.body;
  const targetTier = tierId || 'tier1_jackpot';
  const notif = dispatchLotteryThirtyMinTierNotification(serverLotteryState, targetTier, true);
  res.json({
    success: true,
    notification: notif,
    message: `تم إرسال تنبيه السحب المخصص (قبل 30 دقيقة) لمستوى [${targetTier}] عبر Firebase Cloud Messaging!`,
  });
});

app.post('/api/lottery/update-tier-alert-settings', (req, res) => {
  const { tierAlertSubscriptions } = req.body;
  if (tierAlertSubscriptions && typeof tierAlertSubscriptions === 'object') {
    serverLotteryState.tierAlertSubscriptions = {
      ...serverLotteryState.tierAlertSubscriptions,
      ...tierAlertSubscriptions,
    };
  }
  res.json({
    success: true,
    tierAlertSubscriptions: serverLotteryState.tierAlertSubscriptions,
    message: 'تم تحديث اشتراكات تنبيهات جوائز السحب (30 دقيقة) بنجاح!',
  });
});

// BACKGROUND NOTIFICATION WORKER FOR DOCKER (Standalone Fallback & Heuristic Scheduler)
function startDockerNotificationWorker() {
  console.log('🤖 [VEX Docker Notification Worker] Initialized and running in background daemon mode...');

  // One-time idempotent compaction of legacy site posts into predictions
  migrateSitePostsPredictions();

  // Auto-settle pending predictions from ESPN finished matches (every 5 min)
  setTimeout(pollFinishedMatchResults, 60 * 1000);
  setInterval(pollFinishedMatchResults, 5 * 60 * 1000);

  setInterval(() => {
    try {
      // 1. Process due scheduled non-urgent notifications
      const dueDispatched = agentEngine.processDueScheduledNotifications();
      if (dueDispatched && dueDispatched.length > 0) {
        console.log(`[Heuristic Worker] Dispatched ${dueDispatched.length} optimal-window notifications!`);
        dueDispatched.forEach((notif) => {
          io.emit('notification', notif);
        });
      }

      // 2. Check and dispatch 1-hour pre-draw lottery reminder if due
      checkAndDispatchLotteryReminders();

      // 3. Pulse active notifications
      const notifs = storage.getNotifications();
      const unreadCount = notifs.filter((n) => !n.read).length;
      io.emit('worker_pulse', { timestamp: new Date().toISOString(), unreadCount });
    } catch (err) {
      console.error('[Worker Error] Background notification pulse failed:', err);
    }
  }, 30000);
}

// ==================== DAILY FIXTURE INGEST (real fixtures — auto-refreshed, no manual work) ====================
// Source: FixtureDownload public JSON feeds (no API key, server-friendly).
// Writes data/daily_fixtures.json; the predictions renderer consumes it and
// falls back to the old deterministic rotation only if the file is missing/stale.
const FIXTURE_FEEDS: Record<string, string> = {
  'Premier League': 'epl',
  'La Liga': 'la-liga',
  'Serie A': 'serie-a',
  'Bundesliga': 'bundesliga',
  'Ligue 1': 'ligue-1',
  'Eredivisie': 'eredivisie',
  'Primeira Liga': 'primeira-liga',
  'Turkish Super Lig': 'super-lig',
  'UEFA Champions League': 'champions-league',
  'UEFA Europa League': 'europa-league',
  'UEFA Nations League': 'nations-league',
  'Championship': 'championship',
};

const normalizeTeamName = (n: string) =>
  n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const fixtureTeamSlug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Feed team names → curated TEAMS keys (keeps known ratings for big clubs)
const FIXTURE_TEAM_ALIASES: Record<string, string> = {
  'arsenal': 'ars', 'liverpool': 'liv', 'manchester city': 'mci', 'man city': 'mci', 'chelsea': 'che',
  'manchester united': 'mun', 'man utd': 'mun', 'man united': 'mun', 'tottenham': 'tot',
  'tottenham hotspur': 'tot', 'spurs': 'tot', 'newcastle united': 'new', 'newcastle': 'new',
  'aston villa': 'avl', 'west ham united': 'whu', 'west ham': 'whu', 'brighton': 'bha',
  'brighton and hove albion': 'bha', 'wolves': 'wol', 'nottingham forest': 'nfo',
  'real madrid': 'rma', 'barcelona': 'fcb', 'fc barcelona': 'fcb', 'atletico madrid': 'atm',
  'sevilla': 'sev', 'real betis': 'bet', 'villarreal': 'vil', 'athletic club': 'ath',
  'real sociedad': 'rso', 'valencia': 'val',
  'inter milan': 'int', 'inter': 'int', 'internazionale': 'int', 'juventus': 'juv',
  'ac milan': 'mil', 'milan': 'mil', 'napoli': 'nap', 'roma': 'rom', 'as roma': 'rom',
  'lazio': 'laz', 'atalanta': 'ata', 'fiorentina': 'fio',
  'bayern munich': 'bay', 'bayern': 'bay', 'borussia dortmund': 'bvb', 'dortmund': 'bvb',
  'rb leipzig': 'rbl', 'bayer leverkusen': 'lev', 'leverkusen': 'lev', 'eintracht frankfurt': 'sgf',
  'vfb stuttgart': 'stu', 'stuttgart': 'stu',
  'paris saint germain': 'psg', 'paris sg': 'psg', 'psg': 'psg', 'marseille': 'mrs',
  'lille': 'lil', 'monaco': 'mon', 'lyon': 'lyo', 'ogc nice': 'nic', 'nice': 'nic',
  'ajax': 'ajx', 'psv': 'psv', 'feyenoord': 'fey', 'az alkmaar': 'azl', 'az': 'azl',
  'benfica': 'ben', 'porto': 'por', 'fc porto': 'por', 'sporting cp': 'spo', 'sporting': 'spo',
  'braga': 'brg', 'galatasaray': 'gal', 'fenerbahce': 'fen', 'besiktas': 'bes', 'trabzonspor': 'tra',
  'al ahly': 'ahl', 'zamalek': 'zam', 'al hilal': 'hil', 'al nassr': 'nss',
};

async function ingestDailyFixtures(): Promise<void> {
  const file = path.join(process.cwd(), 'data', 'daily_fixtures.json');
  try {
    const st = fs.statSync(file);
    if (Date.now() - st.mtimeMs < 5 * 3600 * 1000) return; // already fresh
  } catch { /* no file yet — first run */ }
  try {
    const now = new Date();
    const seasonYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    const startIso = now.toISOString().slice(0, 10);
    const endIso = new Date(now.getTime() + 10 * 86400000).toISOString().slice(0, 10);
    const teams: Record<string, { name: string; rating: number; league: string }> = {};
    const fixtures: Array<{ slug: string; home: string; away: string; league: string; date: string; kickOff: string }> = [];
    const resolveTeam = (rawName: string, league: string): string => {
      const nk = normalizeTeamName(rawName);
      const aliased = FIXTURE_TEAM_ALIASES[nk];
      const key = aliased || fixtureTeamSlug(rawName);
      if (!aliased && rawName && !teams[key]) teams[key] = { name: rawName, rating: 1500, league };
      return key;
    };
    for (const [league, base] of Object.entries(FIXTURE_FEEDS)) {
      try {
        const r = await fetch(`https://fixturedownload.com/feed/json/${base}-${seasonYear}`);
        if (!r.ok) { console.log(`[Fixtures] ${league}: HTTP ${r.status}`); continue; }
        const rows = await r.json() as Array<Record<string, unknown>>;
        for (const m of rows) {
          const iso = String(m.DateUtc || '').replace(' ', 'T');
          if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(iso)) continue;
          const date = iso.slice(0, 10);
          if (date < startIso || date > endIso) continue;
          const home = resolveTeam(String(m.HomeTeam || ''), league);
          const away = resolveTeam(String(m.AwayTeam || ''), league);
          if (!home || !away || home === away) continue;
          fixtures.push({ slug: `${home}-vs-${away}-${date}`, home, away, league, date, kickOff: `${iso.slice(11, 16)} UTC` });
        }
      } catch (err) {
        console.error(`[Fixtures] ${league} feed failed:`, err);
      }
    }
    if (fixtures.length === 0) {
      console.log('[Fixtures] ingest produced 0 fixtures — keeping existing file');
      return;
    }
    fixtures.sort((a, b) => (a.date + a.kickOff).localeCompare(b.date + b.kickOff));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ generatedAt: now.toISOString(), teams, fixtures }));
    console.log(`[Fixtures] ingested ${fixtures.length} real fixtures, ${Object.keys(teams).length} new teams (${startIso}..${endIso})`);
  } catch (err) {
    console.error('[Fixtures] ingest failed:', err);
  }
}

// Run shortly after boot, then keep the 7-day window rolling every 6 hours
setTimeout(() => { void ingestDailyFixtures(); }, 4000);
setInterval(() => { void ingestDailyFixtures(); }, 6 * 3600 * 1000);

// VITE MIDDLEWARE SETUP
async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');

    // ==================== DOMAIN PROFILES (avoid duplicate content across 5 domains) ====================
    // brand + focus are domain identity constants; tagline/description/intro/h1 come from i18nProfiles (8 languages)
    const DOMAIN_META: Record<string, { brand: string; focus: string }> = {
      'vex.deals': { brand: 'VEX Deals', focus: 'betting compensation, wallet tracking, loyalty rewards' },
      'betjam.sbs': { brand: 'BetJam', focus: 'betting loss recovery, cashback, refund requests' },
      '1xbetservices.com': { brand: '1xBet Services', focus: '1xbet support, 1xbet bonus, 1xbet promo code, 1xbet apk' },
      'vixo.uno': { brand: 'Vixo', focus: 'AI football predictions, match analysis, win probability' },
      'betongame.cloud': { brand: 'BetoGame', focus: 'provably fair lottery, jackpot, sports analytics' },
    };
    const DEFAULT_META = DOMAIN_META['vex.deals'];

    type Profile = ProfileText & { brand: string; focus: string; lang: Lang; dir: 'rtl' | 'ltr' };
    const getProfile = (domain: string, langStr?: string): Profile => {
      const meta = DOMAIN_META[domain] || DEFAULT_META;
      const lang: Lang = isLang(langStr) ? langStr : 'ar';
      return {
        brand: meta.brand, focus: meta.focus, lang,
        dir: lang === 'ar' ? 'rtl' : 'ltr',
        ...getProfileText(domain, lang),
      };
    };
    const getLang = (req: { query: Record<string, unknown> }): Lang => isLang(req.query.lang) ? req.query.lang : 'ar';

    // Date of the last full content re-verification (editorial policy: shown dates reflect real reviews,
    // never auto-generated daily)
    const CONTENT_VERIFIED = '2026-09-27';

    // Inline links to trust & policy pages (E-E-A-T) — used in seoBlock and page footers
    const trustLinks = (lang: Lang): string =>
      TRUST_NAV.map(n => `<a href="/${n.slug}${langQ(lang)}" style="color:#94a3b8;text-decoration:none;margin:0 8px;white-space:nowrap;">${tt(n.key, lang)}</a>`).join('');

    // Proper 404 (status code matters for SEO — no soft-404 redirects)
    const send404 = (res: import('express').Response, profile: { brand: string; tagline: string; dir: string; lang: string }, notFound?: string) => {
      const lang = profile.lang as Lang;
      res.status(404).set('Content-Type', 'text/html; charset=utf-8').send(`<!doctype html>
<html lang="${lang}" dir="${profile.dir}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>404 — ${profile.brand}</title>
<meta name="robots" content="noindex">
<style>body{font-family:sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}
.box{max-width:560px;padding:30px}h1{color:#10b981;font-size:3.5rem;margin:0}p{color:#94a3b8}
.btn{display:inline-block;background:#10b981;color:#0f172a;padding:12px 26px;border-radius:12px;text-decoration:none;font-weight:bold;margin-top:14px}
.lnk{display:inline-block;color:#34d399;text-decoration:none;margin:5px 8px;font-size:0.92rem}</style>
</head>
<body><div class="box"><h1>404</h1>${notFound ? `<p>${notFound}</p>` : ''}<p>${tt('e404.msg', lang)}</p><p>${profile.brand} — ${profile.tagline}</p>
<a class="btn" href="/${langQ(lang)}">${tt('nav.home', lang)}</a>
<p style="margin-top:20px;color:#e2e8f0;font-weight:bold;">${tt('e404.popular', lang)}</p>
<div>
<a class="lnk" href="/companies${langQ(lang)}">${tt('hub.companies_h1', lang)}</a>
<a class="lnk" href="/guides${langQ(lang)}">${tt('hub.guides_h1', lang)}</a>
<a class="lnk" href="/best-betting-sites${langQ(lang)}">${tt('link.best', lang)}</a>
<a class="lnk" href="/compare${langQ(lang)}">${tt('link.compare', lang)}</a>
<a class="lnk" href="/predictions${langQ(lang)}">${tt('nav.predictions', lang)}</a>
</div>
<div style="margin-top:14px;font-size:0.85rem;">${trustLinks(lang)}</div>
</div></body></html>`);
    };


    // hreflang alternate tags for a page (all 8 languages + x-default)
    // ar = default = base URL (no ?lang) so each hreflang URL is self-canonical
    const hreflangs = (domainUrl: string, path: string): string => {
      return LANGS.map(l => `  <link rel="alternate" hreflang="${l}" href="${domainUrl}${path}${langQ(l)}" />`).join('\n')
        + `\n  <link rel="alternate" hreflang="x-default" href="${domainUrl}${path}" />`;
    };

    // Open Graph image + Twitter card for SSR pages (social previews + image search)
    const socialMeta = (domainUrl: string, title: string, desc: string): string => `
  <meta property="og:image" content="${domainUrl}/share-icon-512.jpg" />
  <meta property="og:image:width" content="512" />
  <meta property="og:image:height" content="512" />
  <meta property="og:image:alt" content="${title}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${domainUrl}/share-icon-512.jpg" />`;

    // Organization + WebSite entity schema shared by every SSR page (consistent entity for Google & AI)
    const siteSchema = (domainUrl: string, profile: Profile): string => JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${domainUrl}/#organization`,
          name: profile.brand,
          url: `${domainUrl}/`,
          logo: { '@type': 'ImageObject', url: `${domainUrl}/share-icon-512.jpg`, width: 512, height: 512 },
          description: profile.description,
          slogan: profile.tagline,
          inLanguage: profile.lang,
          sameAs: [`${domainUrl}/`],
        },
        {
          '@type': 'WebSite',
          '@id': `${domainUrl}/#website`,
          name: profile.brand,
          url: `${domainUrl}/`,
          inLanguage: profile.lang,
          publisher: { '@id': `${domainUrl}/#organization` },
        },
      ],
    });
    const siteSchemaTag = (domainUrl: string, profile: Profile): string =>
      `  <script type="application/ld+json">${siteSchema(domainUrl, profile)}</script>\n`;

    // Self-canonical: base URL (default ar = x-default) has no ?lang; other languages keep ?lang=xx
    const canonicalUrl = (domainUrl: string, path: string, lang: Lang): string =>
      `${domainUrl}${path}${langQ(lang)}`;
    const langQ = (lang: Lang): string => lang === 'ar' ? '' : '?lang=' + lang;

    // ==================== GEO: llms.txt for AI Search Engines ====================
    app.get('/llms.txt', (req, res) => {
      const domain = req.headers.host?.replace(/^www\./, '') || 'vex.deals';
      const url = `https://${domain}`;
      const profile = getProfile(domain, 'en');
      const companies = storage.getCompanies();
      const companyList = companies.map(c => `- [${c.name}](${url}/company/${c.id}): ${c.details?.substring(0, 120)}`).join('\n');
      const cmpList = getComparisonPairs().map(p => `- [${p.a.name} vs ${p.b.name}](${url}/compare/${p.slug})`).join('\n');
      const leagueList = [...new Set(getFixtures().map(f => f.league))].map(n => `- ${url}/predictions/league/${slugify(n)} - ${n} predictions and predicted scores`).join('\n');

      const llms = `# ${profile.brand} - ${profile.tagline}

> ${profile.description} Multi-language platform (Arabic, English, Spanish, Russian, French, German, Turkish, Portuguese).

## Focus
- Primary topic: ${profile.focus}

## Core Features
- Wallet Tracking: Monitor balances across supported betting companies
- Loss Compensation: Claim real percentage-based refunds on betting losses
- Referral Unfreezing: Unlock frozen referral balances through social sharing
- AI Sports Predictions: Gemini-powered match analysis with win probabilities and tactical insights
- Lottery System: Provably fair 5-tier lottery with SHA-256 verification
- Money Transfers: Move funds between accounts
- Multi-Language: Full support for 8 languages with regional content

## Guides
- ${url}/guides - Index of all step-by-step guides
- ${url}/companies - Directory of all approved betting companies
- ${url}/guides/claim-compensation - How to claim betting compensation
- ${url}/guides/unfreeze-balance - How to unfreeze referral balance
- ${url}/guides/ai-predictions-guide - How to read AI match predictions
- ${url}/guides/provably-fair-lottery - How provably fair lottery works
- ${url}/guides/1xbet-bonus-promo-guide - 1xBet bonus, promo codes and loss recovery
- ${url}/guides/betting-wallet-tracking-guide - Track balances across betting wallets
- ${url}/guides/betting-odds-explained - Read decimal, fractional and American odds
- ${url}/guides/bankroll-management-guide - Bankroll management and stake sizing
- ${url}/guides/parlay-accumulator-guide - How parlay and accumulator payouts work
- ${url}/guides/how-to-choose-betting-site - 7 checks for a trusted betting site
- ${url}/guides/live-betting-guide - How in-play betting works (odds shifts, cash out)
- ${url}/guides/responsible-gambling-guide - Money and time limits, self-exclusion
- ${url}/guides/betting-glossary - 20 betting terms explained (odds, handicap, cash out)

## Sports Predictions
- ${url}/best-betting-sites - Best betting sites ranking (bonuses, promo codes, apps)
- ${url}/predictions - All AI match predictions, grouped by date
- ${url}/predictions/today - Today's AI predictions (win probabilities and predicted scores)
- ${url}/predictions/tomorrow - Tomorrow's AI predictions (ahead of kickoff)
${leagueList}
- ${url}/predictions/team/<team> - Per-team predictions (for example /predictions/team/arsenal)

## Company Pages
${companyList}

## Comparisons
- ${url}/compare - Index of all bookmaker comparison pages
${cmpList}

## About & Trust Pages
- ${url}/about - About the platform: how content is created and verified
- ${url}/editorial-policy - Editorial policy: research, verification, AI use and corrections
- ${url}/affiliate-disclosure - How affiliate commissions work and why rankings stay independent
- ${url}/privacy - Privacy policy: data collected, browser storage and third-party services
- ${url}/terms - Terms of use: eligibility, service scope and disclaimers
- ${url}/security - Security: HTTPS/HSTS, security headers, rate limiting, OTP verification, PIN lock
- ${url}/responsible-gambling - Responsible gambling: 18+ rule, limits, warning signs and help resources
- ${url}/contact - Contact and support (support@vex.deals)

## Key Topics
- Betting compensation and loss recovery
- Digital wallet tracking and management
- AI-powered sports betting analytics
- Provably fair lottery systems
- Referral reward unfreezing
- Cross-platform money transfers

## Official Network
${profile.brand} is part of a family of official properties running on the same platform, each with its own editorial focus, self-canonical URLs, sitemap and Search Console property:
${Object.entries(DOMAIN_META).map(([d, m]) => `- [${m.brand}](https://${d}) - ${m.focus}`).join('\n')}

## API Endpoints
- ${url}/api/companies - List all betting companies
- ${url}/api/health - Service health status
- ${url}/api/lottery/status - Current lottery draw information
- ${url}/sitemap.xml - Full sitemap of all pages

## Contact & Support
- Platform: ${profile.brand}
- Website: ${url}
- Support: support@vex.deals

Last updated: ${CONTENT_VERIFIED}
`;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(llms);
    });

    // ==================== GEO: llms-full.txt for Deep AI Crawling ====================
    app.get('/llms-full.txt', (req, res) => {
      const domain = req.headers.host?.replace(/^www\./, '') || 'vex.deals';
      const url = `https://${domain}`;
      const companies = storage.getCompanies();
      const profile = getProfile(domain, 'en');
      const full = `# ${profile.brand} Platform - Complete Documentation for AI Systems

## About ${profile.brand}
${profile.description}
${profile.intro}

It helps users:
1. Track wallet balances across multiple supported betting companies
2. Claim loss compensation (refund percentages) on betting losses
3. Unfreeze referral balances through social sharing
4. Get AI-powered sports match predictions
5. Participate in provably fair lottery draws
6. Transfer funds between accounts

## Guides
- ${url}/guides - Index of all step-by-step guides
- ${url}/companies - Directory of all approved betting companies
- ${url}/guides/claim-compensation - How to claim betting compensation (step by step)
- ${url}/guides/unfreeze-balance - How to unfreeze referral balance
- ${url}/guides/ai-predictions-guide - How to read AI match predictions
- ${url}/guides/provably-fair-lottery - How provably fair lottery works (SHA-256)
- ${url}/guides/1xbet-bonus-promo-guide - 1xBet bonus, promo codes and loss recovery
- ${url}/guides/betting-wallet-tracking-guide - Track balances across betting wallets
- ${url}/guides/betting-odds-explained - How to read betting odds (decimal, fractional, American)
- ${url}/guides/bankroll-management-guide - Bankroll management rules for long-term profit
- ${url}/guides/parlay-accumulator-guide - Parlay and accumulator betting explained (legs, odds, cash out)
- ${url}/guides/how-to-choose-betting-site - How to choose a trusted betting site (license, withdrawals, support)
- ${url}/guides/live-betting-guide - Live betting explained: reacting to events, odds movement, cash out, discipline
- ${url}/guides/responsible-gambling-guide - Responsible gambling: deposit/loss limits, session timers, self-exclusion
- ${url}/guides/betting-glossary - Betting glossary: odds, favorite, handicap, Asian handicap, Over/Under, BTTS, accumulator, cash out, stake, bankroll, value bet, rollover, free bet and more

## Sports Predictions
- ${url}/predictions - Full list of AI match predictions grouped by date
- ${url}/predictions/today - Today's AI predictions with win probabilities, predicted scores and tactical analysis
- ${url}/predictions/tomorrow - Tomorrow's AI predictions before kickoff
- Each match page under /predictions/<slug> contains win/draw/loss probabilities, a predicted score and a generated tactical report
- League pages live at /predictions/league/<league-slug> (for example /predictions/league/premier-league) and group all upcoming matches of that competition
- Team pages live at /predictions/team/<team-slug> (for example /predictions/team/arsenal) and list every upcoming match involving that team

## Comparisons
- ${url}/best-betting-sites - Ranked list of every supported bookmaker with bonuses, promo codes and a neutral FAQ
- ${url}/compare - Hub with side-by-side comparisons of all supported bookmakers
- Pair pages live at /compare/<bookmaker>-vs-<bookmaker> (for example /compare/1xbet-vs-melbet) and cover welcome bonus, promo code, mobile app and a neutral verdict

## About & Trust Pages (E-E-A-T)
- ${url}/about - About the platform: what it does, how guides and company data are verified, how compensation works
- ${url}/editorial-policy - Editorial policy: sources, verification dates, AI assistance, corrections process, editorial independence
- ${url}/affiliate-disclosure - Affiliate disclosure: how commissions work, why they cost users nothing, how rankings stay independent
- ${url}/privacy - Privacy policy: data provided, browser storage, third-party services (Firebase, Google Fonts), how to request deletion
- ${url}/terms - Terms of use: eligibility (18+), nature of the service, compensation conditions, disclaimers
- ${url}/security - Security: HTTPS/HSTS, strict security headers, 120 req/min rate limiting, 6-digit OTP verification, PIN lock, SHA-256 provably fair lottery
- ${url}/responsible-gambling - Responsible gambling: 18+ rule, entertainment-not-income guidance, limits, warning signs, break options and help resources
- ${url}/contact - Contact: support@vex.deals for support, corrections, privacy and partnership enquiries

## Platform Statistics
- Supported Companies: ${companies.length}
- Languages: 8 (Arabic, English, Spanish, Russian, French, German, Turkish, Portuguese)
- Lottery Tiers: 5 (Jackpot to Tier 5)
- AI Engine: Gemini 3.8 Flash when a GEMINI_API_KEY is configured, with a rule-based and heuristic tactical model fallback otherwise

## All Betting Companies
${companies.map(c => `### ${c.name}
- Type: ${c.type}
- Details: ${c.details}
- Promo Code: ${c.promo_code}
- Page: ${url}/company/${c.id}`).join('\n\n')}

## How Compensation Works
1. User registers a betting company account through VEX Deals
2. Platform tracks betting activity and calculates losses
3. User submits a compensation request with proof
4. Approved compensation percentage is added to user's wallet
5. User can withdraw or transfer the compensated amount

## How Lottery Works
1. Draws are held hourly (50 coins), daily (100 coins), and weekly (250 coins)
2. Users select 5 numbers from 1-30
3. Winning numbers are drawn using provably fair SHA-256 hashing
4. Prize tiers match 2-5 correct numbers
5. All draws are publicly verifiable

## How AI Predictions Work
1. User selects an upcoming football match
2. Google Gemini analyzes team statistics, form, and odds
3. Platform returns: predicted score, win probabilities, tactical summary
4. Risk level and recommended pick are provided
5. Confidence score indicates prediction reliability

## API Documentation
- GET ${url}/api/companies - Returns all companies with affiliate data
- GET ${url}/api/health - Returns service health status
- GET ${url}/api/lottery/status - Returns current lottery draw details
- GET ${url}/sitemap.xml - Returns full XML sitemap
- GET ${url}/robots.txt - Returns crawl directives

## Technical Details
- Frontend: React 19 + TypeScript + Vite 6 + Tailwind CSS v4
- Backend: Express.js + Socket.io + Firebase Firestore
- AI: Google Gemini 3.8 Flash with structured JSON output
- Mobile: Capacitor Android (deals.vex.app) + PWA
- Security: Rate limiting, CSP headers, SHA-256 hashing, OTP verification

Last updated: ${CONTENT_VERIFIED}
`;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(full);
    });

    // ==================== RSS Feed for crawlers ====================
    app.get('/rss.xml', (req, res) => {
      const domain = req.headers.host?.replace(/^www\./, '') || 'vex.deals';
      const url = `https://${domain}`;
      const companies = storage.getCompanies();
      const profile = getProfile(domain, 'en');
      const now = new Date().toUTCString();
      const xmlEsc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      const companyItems = companies.map(c => `    <item>
      <title>${xmlEsc(`${c.name} — ${profile.brand} compensation`)}</title>
      <link>${url}/company/${c.id}</link>
      <guid isPermaLink="true">${url}/company/${c.id}</guid>
      <description>${xmlEsc((c.details || '').substring(0, 300))}</description>
      <pubDate>${now}</pubDate>
    </item>`).join('\n');

      // Guides: evergreen how-to content for crawlers
      const guideItems = Object.keys(GUIDES).map(slug => {
        const g = GUIDES[slug]['en'] || GUIDES[slug]['ar'];
        return `    <item>
      <title>${xmlEsc(g.title)}</title>
      <link>${url}/guides/${slug}</link>
      <guid isPermaLink="true">${url}/guides/${slug}</guid>
      <description>${xmlEsc(g.desc)}</description>
      <category>Guides</category>
      <pubDate>${now}</pubDate>
    </item>`;
      }).join('\n');

      // Today's top predictions: fresh daily content
      const predItems = getFixtures().filter(f => f.date === isoDate(new Date())).slice(0, 10).map(f => {
        const H = TEAMS[f.home], A = TEAMS[f.away];
        const p = predictMatch(f, 'en');
        return `    <item>
      <title>${xmlEsc(`${H.name} vs ${A.name} — AI prediction ${p.score} (${p.pH}%/${p.pD}%/${p.pA}%)`)}</title>
      <link>${url}/predictions/${f.slug}</link>
      <guid isPermaLink="true">${url}/predictions/${f.slug}</guid>
      <description>${xmlEsc(`${f.league}, ${f.date} ${f.kickOff}. Confidence ${p.confidence}%, risk ${p.risk}.`)}</description>
      <category>Predictions</category>
      <pubDate>${now}</pubDate>
    </item>`;
      }).join('\n');

      const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2007/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${xmlEsc(`${profile.brand} — ${profile.tagline}`)}</title>
    <link>${url}</link>
    <description>${xmlEsc(`${profile.description} Betting wallet tracking, loss compensation, AI sports predictions and how-to guides.`)}</description>
    <language>en</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${url}/rss.xml" rel="self" type="application/rss+xml"/>
${[predItems, guideItems, companyItems].filter(Boolean).join('\n')}
  </channel>
</rss>`;
      res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(rss);
    });

    // ==================== Security.txt for trust ====================
    app.get('/.well-known/security.txt', (req, res) => {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(`Contact: mailto:support@vex.deals
Policy: https://vex.deals/
Preferred-Languages: ar,en
Expires: ${new Date(Date.now() + 365*24*60*60*1000).toISOString()}
`);
    });

    // Android App Links verification (verified links for deals.vex.app on every domain)
    app.get('/.well-known/assetlinks.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(JSON.stringify([{
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'deals.vex.app',
          sha256_cert_fingerprints: ['E6:12:D8:D3:0F:62:83:D9:E2:39:67:58:0A:96:E4:09:87:39:72:49:EE:A2:A7:E3:3E:86:02:09:4C:60:27:8C'],
        },
      }], null, 2));
    });

    // ==================== IndexNow (Bing, Yandex, DuckDuckGo, Seznam) ====================
    const INDEXNOW_KEY = '9f4c2b7e8a1d3f6c5b0e9a7d2c1f4b8e';
    app.get(`/${INDEXNOW_KEY}.txt`, (req, res) => {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(INDEXNOW_KEY);
    });

    // OpenSearch description (browser search + some crawlers)
    app.get('/opensearch.xml', (req, res) => {
      const domain = req.headers.host?.replace(/^www\./, '') || 'vex.deals';
      res.setHeader('Content-Type', 'application/opensearchdescription+xml; charset=utf-8');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>VEX Deals</ShortName>
  <Description>Search VEX Deals predictions, companies and guides</Description>
  <Url type="text/html" template="https://${domain}/?q={searchTerms}"/>
  <Image width="512" height="512">https://${domain}/share-icon-512.png</Image>
  <Language>ar</Language>
  <Language>en</Language>
</OpenSearchDescription>`);
    });

    // Submit URLs to IndexNow: POST /api/indexnow {urls:[...]}
    app.post('/api/indexnow', async (req, res) => {
      const domain = req.headers.host?.replace(/^www\./, '') || 'vex.deals';
      const urls: unknown = req.body?.urls;
      if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: 'urls array required' });
      }
      // Only allow URLs on this domain (IndexNow key must be hosted on the submitting host)
      const clean = urls.filter((u): u is string =>
        typeof u === 'string' && u.startsWith(`https://${domain}/`)).slice(0, 10000);
      if (clean.length === 0) {
        return res.status(400).json({ error: `urls must start with https://${domain}/` });
      }
      try {
        // IndexNow rejects oversized single posts — submit in batches of 50
        const results: number[] = [];
        for (let i = 0; i < clean.length; i += 50) {
          const r = await fetch('https://api.indexnow.org/indexnow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({
              host: domain,
              key: INDEXNOW_KEY,
              keyLocation: `https://${domain}/${INDEXNOW_KEY}.txt`,
              urlList: clean.slice(i, i + 50),
            }),
          });
          results.push(r.status);
          if (i + 50 < clean.length) await new Promise(s => setTimeout(s, 1200));
        }
        const ok = results.filter(s => s >= 200 && s < 300).length;
        res.json({ submitted: clean.length, batches: results.length, ok, status: results });
      } catch (err) {
        console.error('[IndexNow] submit failed:', err);
        res.status(502).json({ error: 'indexnow failed' });
      }
    });

    // ==================== Auto-submission (zero-touch indexing) ====================
    // Every 4h + shortly after boot, ping IndexNow with each brand domain's
    // sitemap + homepage so Bing/Yandex/DuckDuckGo/Seznam index new content
    // without anyone opening any console. Google ignores IndexNow and instead
    // crawls robots.txt + sitemap.xml organically (verified live on all domains).
    const INDEXNOW_HOSTS = ['vex.deals', 'betjam.sbs', 'betongame.cloud', '1xbetservices.com'];
    async function indexNowPing(host: string, urls: string[]): Promise<void> {
      try {
        const r = await fetch('https://api.indexnow.org/indexnow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({
            host,
            key: INDEXNOW_KEY,
            keyLocation: `https://${host}/${INDEXNOW_KEY}.txt`,
            urlList: urls,
          }),
        });
        console.log(`[IndexNow:auto] ${host} -> HTTP ${r.status} (${urls.length} urls)`);
      } catch (err) {
        console.error(`[IndexNow:auto] ${host} failed:`, err);
      }
    }
    async function indexNowAutoCycle(): Promise<void> {
      for (const host of INDEXNOW_HOSTS) {
        await indexNowPing(host, [`https://${host}/sitemap.xml`, `https://${host}/`]);
        await new Promise(s => setTimeout(s, 1500));
      }
    }
    setTimeout(() => { void indexNowAutoCycle(); }, 90 * 1000);
    setInterval(() => { void indexNowAutoCycle(); }, 4 * 3600 * 1000);

    // Dynamic robots.txt per domain - MUST be before express.static
    app.get('/robots.txt', (req, res) => {
      const domain = req.headers.host?.replace(/^www\./, '') || 'vex.deals';
      const robots = `# VEX Deals - Robots.txt for Search Engines and AI Crawlers
User-agent: *
Allow: /
Disallow: /api/

User-agent: Googlebot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Googlebot-Image
Allow: /

User-agent: AdsBot-Google
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

Sitemap: https://${domain}/sitemap.xml
`;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(robots);
    });

    // Programmatic comparison pages: all unique pairs of companies (A vs B)
    const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    function getComparisonPairs(): { slug: string; a: Company; b: Company }[] {
      const comps = storage.getCompanies();
      const out: { slug: string; a: Company; b: Company }[] = [];
      for (let i = 0; i < comps.length; i++)
        for (let j = i + 1; j < comps.length; j++) {
          const a = comps[i], b = comps[j];
          out.push({ slug: `${slugify(a.name)}-vs-${slugify(b.name)}`, a, b });
        }
      return out;
    }

    // Dynamic sitemap.xml per domain - MUST be before express.static
    app.get('/sitemap.xml', (req, res) => {
      const domain = req.headers.host?.replace(/^www\./, '') || 'vex.deals';
      const now = new Date().toISOString().split('T')[0];
      const langs: Lang[] = [...LANGS];
      const companies = storage.getCompanies();

      let urls: string = '';

      // Homepage with hreflang alternates
      urls += `  <url>
    <loc>https://${domain}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
`;
      for (const l of langs) {
        urls += `    <xhtml:link rel="alternate" hreflang="${l}" href="https://${domain}/${langQ(l)}"/>
`;
      }
      urls += `    <xhtml:link rel="alternate" hreflang="x-default" href="https://${domain}/"/>
  </url>
`;

      // Language variants (ar = base URL, already listed above)
      for (const l of langs) {
        if (l === 'ar') continue;
        urls += `  <url>
    <loc>https://${domain}/?lang=${l}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
`;
      }

      // Company detail pages
      for (const c of companies) {
        const slug = c.id;
        urls += `  <url>
    <loc>https://${domain}/company/${slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
        for (const l of langs) {
          if (l === 'ar') continue;
          urls += `  <url>
    <loc>https://${domain}/company/${slug}?lang=${l}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
        }
      }

      // How-to guide pages (Programmatic SEO) — base + 8 language variants
      const guideSlugs = ['claim-compensation', 'unfreeze-balance', 'ai-predictions-guide', 'provably-fair-lottery', '1xbet-bonus-promo-guide', 'betting-wallet-tracking-guide', 'betting-odds-explained', 'bankroll-management-guide', 'parlay-accumulator-guide', 'how-to-choose-betting-site', 'live-betting-guide', 'responsible-gambling-guide', 'betting-glossary'];
      for (const slug of guideSlugs) {
        urls += `  <url>
    <loc>https://${domain}/guides/${slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
`;
        for (const l of langs) {
          urls += `    <xhtml:link rel="alternate" hreflang="${l}" href="https://${domain}/guides/${slug}${langQ(l)}"/>
`;
        }
        urls += `    <xhtml:link rel="alternate" hreflang="x-default" href="https://${domain}/guides/${slug}"/>
  </url>
`;
        for (const l of langs) {
          if (l === 'ar') continue;
          urls += `  <url>
    <loc>https://${domain}/guides/${slug}?lang=${l}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
`;
        }
      }

      // Trust / E-E-A-T static pages (about, privacy, terms, contact, policies) — base + 7 language variants
      for (const slug of STATIC_PAGE_SLUGS) {
        urls += `  <url>
    <loc>https://${domain}/${slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.6</priority>
`;
        for (const l of langs) {
          urls += `    <xhtml:link rel="alternate" hreflang="${l}" href="https://${domain}/${slug}${langQ(l)}"/>
`;
        }
        urls += `    <xhtml:link rel="alternate" hreflang="x-default" href="https://${domain}/${slug}"/>
  </url>
`;
        for (const l of langs) {
          if (l === 'ar') continue;
          urls += `  <url>
    <loc>https://${domain}/${slug}?lang=${l}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
`;
        }
      }

      // Prediction pages (daily fresh content)
      urls += `  <url>
    <loc>https://${domain}/predictions</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
`;
      for (const l of langs) {
        urls += `    <xhtml:link rel="alternate" hreflang="${l}" href="https://${domain}/predictions${langQ(l)}"/>
`;
      }
      urls += `    <xhtml:link rel="alternate" hreflang="x-default" href="https://${domain}/predictions"/>
  </url>
`;
      for (const l of langs) {
        if (l === 'ar') continue;
        urls += `  <url>
    <loc>https://${domain}/predictions?lang=${l}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;
      }
      // Daily prediction pages (today / tomorrow) — fresh crawlable content
      for (const day of ['today', 'tomorrow']) {
        urls += `  <url>
    <loc>https://${domain}/predictions/${day}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
`;
        for (const l of langs) {
          urls += `    <xhtml:link rel="alternate" hreflang="${l}" href="https://${domain}/predictions/${day}${langQ(l)}"/>
`;
        }
        urls += `    <xhtml:link rel="alternate" hreflang="x-default" href="https://${domain}/predictions/${day}"/>
  </url>
`;
        for (const l of langs) {
          if (l === 'ar') continue;
          urls += `  <url>
    <loc>https://${domain}/predictions/${day}?lang=${l}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>
`;
        }
      }

      // League prediction pages (7 leagues x 8 languages)
      const leagueNames = [...new Set(getFixtures().map(f => f.league))];
      for (const ln of leagueNames) {
        const page = `/predictions/league/${slugify(ln)}`;
        urls += `  <url>
    <loc>https://${domain}${page}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
`;
        for (const l of langs) {
          urls += `    <xhtml:link rel="alternate" hreflang="${l}" href="https://${domain}${page}${langQ(l)}"/>
`;
        }
        urls += `    <xhtml:link rel="alternate" hreflang="x-default" href="https://${domain}${page}"/>
  </url>
`;
        for (const l of langs) {
          if (l === 'ar') continue;
          urls += `  <url>
    <loc>https://${domain}${page}?lang=${l}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;
        }
      }

      // Team prediction pages (only teams with upcoming fixtures)
      const teamKeysSeen = [...new Set(getFixtures().flatMap(f => [f.home, f.away]))];
      for (const tk of teamKeysSeen) {
        const page = `/predictions/team/${slugify(TEAMS[tk].name)}`;
        urls += `  <url>
    <loc>https://${domain}${page}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
`;
        for (const l of langs) {
          urls += `    <xhtml:link rel="alternate" hreflang="${l}" href="https://${domain}${page}${langQ(l)}"/>
`;
        }
        urls += `    <xhtml:link rel="alternate" hreflang="x-default" href="https://${domain}${page}"/>
  </url>
`;
        for (const l of langs) {
          if (l === 'ar') continue;
          urls += `  <url>
    <loc>https://${domain}${page}?lang=${l}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
`;
        }
      }

      for (const f of getFixtures()) {
        urls += `  <url>
    <loc>https://${domain}/predictions/${f.slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>
`;
      }

      // Hub pages: /companies + /guides (base + language variants)
      for (const hub of ['/companies', '/guides']) {
        urls += `  <url>
    <loc>https://${domain}${hub}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
`;
        for (const l of langs) {
          urls += `    <xhtml:link rel="alternate" hreflang="${l}" href="https://${domain}${hub}${langQ(l)}"/>
`;
        }
        urls += `    <xhtml:link rel="alternate" hreflang="x-default" href="https://${domain}${hub}"/>
  </url>
`;
        for (const l of langs) {
          if (l === 'ar') continue;
          urls += `  <url>
    <loc>https://${domain}${hub}?lang=${l}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
        }
      }

      // "Best betting sites" money page
      urls += `  <url>
    <loc>https://${domain}/best-betting-sites</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
`;
      for (const l of langs) {
        urls += `    <xhtml:link rel="alternate" hreflang="${l}" href="https://${domain}/best-betting-sites${langQ(l)}"/>
`;
      }
      urls += `    <xhtml:link rel="alternate" hreflang="x-default" href="https://${domain}/best-betting-sites"/>
  </url>
`;
      for (const l of langs) {
        if (l === 'ar') continue;
        urls += `  <url>
    <loc>https://${domain}/best-betting-sites?lang=${l}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
`;
      }

      // Comparison pages (programmatic SEO): hub + all unique pairs
      const cmpPages = ['/compare', ...getComparisonPairs().map(p => `/compare/${p.slug}`)];
      for (const page of cmpPages) {
        urls += `  <url>
    <loc>https://${domain}${page}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
`;
        for (const l of langs) {
          urls += `    <xhtml:link rel="alternate" hreflang="${l}" href="https://${domain}${page}${langQ(l)}"/>
`;
        }
        urls += `    <xhtml:link rel="alternate" hreflang="x-default" href="https://${domain}${page}"/>
  </url>
`;
        for (const l of langs) {
          if (l === 'ar') continue;
          urls += `  <url>
    <loc>https://${domain}${page}?lang=${l}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
        }
      }

      // News hub + latest articles (fresh crawlable content — data/sports_news.json via news_watcher)
      {
        const newsHub = '/news';
        urls += `  <url>
    <loc>https://${domain}${newsHub}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
`;
        for (const l of langs) {
          urls += `    <xhtml:link rel="alternate" hreflang="${l}" href="https://${domain}${newsHub}${langQ(l)}"/>
`;
        }
        urls += `    <xhtml:link rel="alternate" hreflang="x-default" href="https://${domain}${newsHub}"/>
  </url>
`;
        for (const l of langs) {
          if (l === 'ar') continue;
          urls += `  <url>
    <loc>https://${domain}${newsHub}?lang=${l}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>
`;
        }

        for (const n of getNewsItems().slice(0, 300)) {
          const npage = `/news/${newsSlug(n)}`;
          const nlast = n.publishedAt && !isNaN(Date.parse(n.publishedAt)) ? n.publishedAt.slice(0, 10) : now;
          urls += `  <url>
    <loc>https://${domain}${npage}</loc>
    <lastmod>${nlast}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
`;
          for (const l of langs) {
            urls += `    <xhtml:link rel="alternate" hreflang="${l}" href="https://${domain}${npage}${langQ(l)}"/>
`;
          }
          urls += `    <xhtml:link rel="alternate" hreflang="x-default" href="https://${domain}${npage}"/>
  </url>
`;
          for (const l of langs) {
            if (l === 'ar') continue;
            urls += `  <url>
    <loc>https://${domain}${npage}?lang=${l}</loc>
    <lastmod>${nlast}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
`;
          }
        }
      }

      // vex0.9 SPA tab routes (app screens served via index.html) — plain URLs as historically indexed
      for (const page of ['/wallets', '/ai-sports', '/referrals', '/transfers', '/activity', '/unlucky-wall', '/lottery', '/legal']) {
        urls += `  <url>
    <loc>https://${domain}${page}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
      }

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}</urlset>`;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(sitemap);
    });

    // Never serve the Node server bundle or its sourcemap (full source disclosure)
    app.use((req, res, next) => {
      if (/\.(cjs|map)$/.test(req.path)) {
        res.status(404).type('text/plain').send('404 Not Found');
        return;
      }
      next();
    });

    // Serve static files (after dynamic routes) - index: false so catch-all handles index.html
    // Hashed build assets get immutable caching; everything else revalidates.
    // HTML + service-worker scripts must always revalidate (stale HTML after a
    // deploy references deleted hashed chunks → blank app; stale SW delays updates).
    app.use('/assets', express.static(path.join(distPath, 'assets'), { index: false, maxAge: '365d', immutable: true }));
    app.use(
      express.static(distPath, {
        index: false,
        maxAge: '1h',
        etag: true,
        lastModified: true,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html') || /(^|[\\/])(sw\.js|firebase-messaging-sw\.js)$/.test(filePath)) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      })
    );

    // APK Download Endpoint - serves the Android APK for all domains
    app.get('/download/apk', (req, res) => {
      const apkPath = path.join(process.cwd(), 'VEX-Deals.apk');
      const distApkPath = path.join(process.cwd(), 'dist', 'VEX-Deals.apk');
      const finalPath = fs.existsSync(apkPath) ? apkPath : distApkPath;
      if (fs.existsSync(finalPath)) {
        res.download(finalPath, 'VEX-Deals.apk');
      } else {
        res.status(404).json({ error: 'APK not found. Please build the APK first.' });
      }
    });

    // ==================== SSR COMPANY PAGES (Programmatic SEO) ====================
    app.get('/company/:id', (req, res) => {
      const domain = req.headers.host?.replace(/^www\./, '') || 'vex.deals';
      const domainUrl = `https://${domain}`;
      const lang = getLang(req);
      const profile = getProfile(domain, lang);
      const companies = storage.getCompanies();
      const company = companies.find(c => c.id === req.params.id);
      if (!company) return send404(res, profile, lang === 'ar' ? 'الشركة غير موجودة.' : 'Company not found.');

      const name = company.name;
      const details = company.details || '';
      const promo = company.promo_code || '';
      const pagePath = `/company/${company.id}`;
      const T_ = (k: string, vars: Record<string, string> = {}) => tt(k, lang, { name, brand: profile.brand, promo, ...vars });
      const jstr = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');
      const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

      const html = `<!doctype html>
<html lang="${lang}" dir="${profile.dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${name} - ${T_('company.subtitle')} | ${profile.brand}</title>
  <meta name="description" content="${T_('company.meta_desc')} ${details.substring(0, 120)}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="${canonicalUrl(domainUrl, pagePath, lang)}" />
${hreflangs(domainUrl, pagePath)}
  <meta property="og:title" content="${name} - ${profile.brand}" />
  <meta property="og:description" content="${T_('company.og_desc')}" />
  <meta property="og:url" content="${domainUrl}${pagePath}${langQ(lang)}" />
  <meta property="og:type" content="article" />
  <meta property="og:locale" content="${lang === 'ar' ? 'ar_AR' : lang + '_' + lang.toUpperCase()}" />
${socialMeta(domainUrl, escAttr(`${name} - ${profile.brand}`), escAttr(T_('company.og_desc')))}

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${jstr(`${name} - ${T_('company.subtitle')}`)}",
    "description": "${jstr(T_('company.meta_desc'))}",
    "url": "${domainUrl}${pagePath}",
    "inLanguage": "${lang}",
    "author": {"@type": "Organization", "name": "${jstr(profile.brand)}", "url": "${domainUrl}"},
    "publisher": {"@type": "Organization", "name": "${jstr(profile.brand)}", "url": "${domainUrl}", "logo": {"@type": "ImageObject", "url": "${domainUrl}/icon-192.svg"}},
    "dateModified": "${CONTENT_VERIFIED}"
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "${jstr(tt('nav.home', lang))}", "item": "${domainUrl}/"},
      {"@type": "ListItem", "position": 2, "name": "${jstr(tt('nav.companies', lang))}", "item": "${domainUrl}/companies"},
      {"@type": "ListItem", "position": 3, "name": "${jstr(name)}", "item": "${domainUrl}${pagePath}"}
    ]
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {"@type": "Question", "name": "${jstr(T_('company.faq1q'))}", "acceptedAnswer": {"@type": "Answer", "text": "${jstr(T_('company.faq1a'))}"}},
      {"@type": "Question", "name": "${jstr(T_('company.faq2q'))}", "acceptedAnswer": {"@type": "Answer", "text": "${jstr(T_('company.faq2a'))}"}},
      {"@type": "Question", "name": "${jstr(T_('company.faq3q'))}", "acceptedAnswer": {"@type": "Answer", "text": "${jstr(T_('company.faq3a'))}"}},
      {"@type": "Question", "name": "${jstr(T_('company.faq4q'))}", "acceptedAnswer": {"@type": "Answer", "text": "${jstr(T_('company.faq4a'))}"}}
    ]
  }
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Tajawal', 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; line-height: 1.8; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    h1 { font-size: 2.2rem; color: #10b981; margin-bottom: 10px; }
    h2 { font-size: 1.5rem; color: #34d399; margin: 30px 0 15px; border-bottom: 2px solid #1e293b; padding-bottom: 8px; }
    p { margin-bottom: 15px; color: #94a3b8; }
    .badge { display: inline-block; background: #10b981; color: #0f172a; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 0.85rem; margin: 5px 5px 5px 0; }
    .promo { background: #1e293b; border: 2px dashed #10b981; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
    .promo code { font-size: 2rem; color: #10b981; font-weight: bold; letter-spacing: 3px; }
    .steps { background: #1e293b; padding: 20px; border-radius: 12px; margin: 15px 0; }
    .steps li { margin: 10px 0; padding-left: 10px; }
    .steps li::marker { color: #10b981; font-weight: bold; }
    .faq { background: #1e293b; padding: 15px; border-radius: 10px; margin: 10px 0; }
    .faq strong { color: #34d399; }
    .cta { background: linear-gradient(135deg, #10b981, #059669); color: #fff; padding: 15px 30px; border-radius: 12px; text-decoration: none; display: inline-block; font-weight: bold; margin: 10px 5px 10px 0; }
    .cta:hover { opacity: 0.9; }
    .related { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-top: 20px; }
    .related a { background: #1e293b; padding: 12px; border-radius: 8px; color: #10b981; text-decoration: none; text-align: center; }
    .related a:hover { background: #334155; }
    .nav { background: #1e293b; padding: 10px 20px; display: flex; gap: 15px; flex-wrap: wrap; }
    .nav a { color: #94a3b8; text-decoration: none; font-size: 0.9rem; }
    .nav a:hover { color: #10b981; }
    .langbar { background: #0b1220; padding: 8px 20px; display: flex; gap: 10px; flex-wrap: wrap; font-size: 0.85rem; }
    .langbar a { color: #94a3b8; text-decoration: none; }
    .langbar a.active, .langbar a:hover { color: #10b981; }
    footer { text-align: center; padding: 30px; color: #94a3b8; font-size: 0.85rem; border-top: 1px solid #1e293b; margin-top: 40px; }
  </style>
  ${siteSchemaTag(domainUrl, profile)}</head>
<body>
  <nav class="nav">
    <a href="/">🏠 ${tt('nav.home', lang)}</a>
    <a href="/companies${langQ(lang)}">🏢 ${tt('nav.companies', lang)}</a>
    <a href="/#wallets">💳 ${tt('nav.wallets', lang)}</a>
    <a href="/#ai-sports">⚽ ${tt('nav.predictions', lang)}</a>
    <a href="/#lottery">🎰 ${tt('nav.lottery', lang)}</a>
    <a href="/download/apk">📱 ${tt('nav.download', lang)}</a>
  </nav>
  <nav class="langbar">
    ${LANGS.map(l => `<a href="${pagePath}${langQ(l)}" hreflang="${l}" class="${l === lang ? 'active' : ''}">${l.toUpperCase()}</a>`).join('    ')}
  </nav>
  <div class="container">
    <h1>${name}</h1>
    <div>
      <span class="badge">✅ ${T_('company.badge_verified')}</span>
      <span class="badge">🎯 ${T_('company.badge_promo')} ${promo}</span>
      <span class="badge">📱 ${T_('company.badge_apk')}</span>
      <span class="badge">⚡ ${T_('company.badge_instant')}</span>
    </div>

    <p style="margin-top:20px;font-size:1.05rem;color:#10b981;">${profile.intro}</p>
    <p style="margin-top:15px;font-size:1.1rem;color:#e2e8f0;">${details}</p>

    <div class="promo">
      <p>${T_('company.promo_title')}</p>
      <code>${promo}</code>
      <p style="margin-top:10px;font-size:0.9rem;">${T_('company.promo_note')}</p>
    </div>

    <h2>📋 ${T_('company.steps_title')}</h2>
    <ol class="steps">
      <li>${T_('company.step1')}</li>
      <li>${T_('company.step2')}</li>
      <li>${T_('company.step3')}</li>
      <li>${T_('company.step4')}</li>
      <li>${T_('company.step5')}</li>
    </ol>

    <h2>⭐ ${T_('company.why_title')}</h2>
    <ul style="list-style:none;padding:0;">
      <li style="padding:8px 0;">✅ ${T_('company.why1')}</li>
      <li style="padding:8px 0;">🔒 ${T_('company.why2')}</li>
      <li style="padding:8px 0;">⚡ ${T_('company.why3')}</li>
      <li style="padding:8px 0;">🌍 ${T_('company.why4')}</li>
      <li style="padding:8px 0;">📱 ${T_('company.why5')}</li>
      <li style="padding:8px 0;">🤖 ${T_('company.why6')}</li>
    </ul>

    <h2>❓ ${T_('company.faq_title')}</h2>
    <div class="faq"><strong>${tt('faq.q_prefix', lang)} ${T_('company.faq1q')}</strong><p>${T_('company.faq1a')}</p></div>
    <div class="faq"><strong>${tt('faq.q_prefix', lang)} ${T_('company.faq2q')}</strong><p>${T_('company.faq2a')}</p></div>
    <div class="faq"><strong>${tt('faq.q_prefix', lang)} ${T_('company.faq3q')}</strong><p>${T_('company.faq3a')}</p></div>
    <div class="faq"><strong>${tt('faq.q_prefix', lang)} ${T_('company.faq4q')}</strong><p>${T_('company.faq4a')}</p></div>

    <h2>🔗 ${T_('company.related_title')}</h2>
    <div class="related">
      ${companies.filter(c => c.id !== company.id).slice(0, 6).map(c => `<a href="/company/${c.id}${langQ(lang)}">${c.name}</a>`).join('')}
    </div>

    ${(() => {
      const myPairs = getComparisonPairs().filter(p => p.a.id === company.id || p.b.id === company.id).slice(0, 6);
      return myPairs.length ? `
    <h2>⚖️ ${tt('link.compare', lang)}</h2>
    <div class="related">
      ${myPairs.map(p => `<a href="/compare/${p.slug}${langQ(lang)}">${p.a.name} vs ${p.b.name}</a>`).join('')}
    </div>` : '';
    })()}

    <div style="margin-top:30px;text-align:center;">
      <a href="/companies${langQ(lang)}" class="cta">🏢 ${tt('cta.companies', lang)}</a>
      <a href="/download/apk" class="cta">📱 ${tt('cta.download', lang)}</a>
      <a href="/predictions${langQ(lang)}" class="cta">⚽ ${tt('cta.ai', lang)}</a>
    </div>
  </div>
  <footer>
    <p>© 2026 ${profile.brand} — ${profile.tagline} | <a href="${domainUrl}" style="color:#10b981;">${domain}</a></p>
    <p>${T_('company.footer_page')} ${CONTENT_VERIFIED}</p>
    <p style="font-size:0.8rem;">${trustLinks(lang)}</p>
  </footer>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Robots-Tag', 'index, follow, max-snippet:-1');
      res.send(html);
    });

    // Guides content: server/i18nGuides.ts (8 languages)
    app.get('/guides/:slug', (req, res) => {
      const domain = req.headers.host?.replace(/^www\./, '') || 'vex.deals';
      const domainUrl = `https://${domain}`;
      const lang = getLang(req);
      const profile = getProfile(domain, lang);
      const guide = getGuide(req.params.slug, lang);
      if (!guide) return send404(res, profile, lang === 'ar' ? 'الدليل غير موجود.' : 'Guide not found.');
      const pagePath = `/guides/${req.params.slug}`;
      const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      const jstr = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');
      const relatedGuides = Object.keys(GUIDES)
        .filter(s => s !== req.params.slug)
        .map(s => {
          const g = GUIDES[s][lang] || GUIDES[s]['en'] || GUIDES[s]['ar'];
          return `<a href="/guides/${s}${langQ(lang)}">${escAttr(g.title)}</a>`;
        }).join('');

      const html = `<!doctype html>
<html lang="${lang}" dir="${profile.dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escAttr(guide.title)} | ${profile.brand}</title>
  <meta name="description" content="${escAttr(guide.desc)} — ${escAttr(profile.brand)}." />
  <meta name="robots" content="index, follow, max-snippet:-1" />
  <link rel="canonical" href="${canonicalUrl(domainUrl, pagePath, lang)}" />
${hreflangs(domainUrl, pagePath)}
  <meta property="og:title" content="${escAttr(guide.title)} | ${profile.brand}" />
  <meta property="og:description" content="${escAttr(guide.desc)}" />
  <meta property="og:url" content="${domainUrl}${pagePath}${langQ(lang)}" />
  <meta property="og:type" content="article" />
${socialMeta(domainUrl, escAttr(`${guide.title} | ${profile.brand}`), escAttr(guide.desc))}

  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"HowTo","name":"${jstr(guide.title)}","description":"${jstr(guide.desc)}","inLanguage":"${lang}","totalTime":"PT10M","step":[${guide.steps.map((s,i) => `{"@type":"HowToStep","position":${i+1},"name":"${jstr(s)}","text":"${jstr(s)}"}`).join(',')}]}</script>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[${guide.faq.map(f => `{"@type":"Question","name":"${jstr(f.q)}","acceptedAnswer":{"@type":"Answer","text":"${jstr(f.a)}"}}`).join(',')}]}</script>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"${jstr(tt('nav.home', lang))}","item":"${domainUrl}/"},{"@type":"ListItem","position":2,"name":"${jstr(tt('hub.guides_h1', lang))}","item":"${domainUrl}/guides"},{"@type":"ListItem","position":3,"name":"${jstr(guide.title)}","item":"${domainUrl}${pagePath}"}]}</script>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"WebPage","@id":"${domainUrl}${pagePath}#webpage","url":"${canonicalUrl(domainUrl, pagePath, lang)}","name":"${jstr(guide.title)}","inLanguage":"${lang}","isPartOf":{"@id":"${domainUrl}/#website"},"about":{"@id":"${domainUrl}/#organization"},"dateModified":"${CONTENT_VERIFIED}"}</script>

  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Tahoma,sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.9}
    .container{max-width:800px;margin:0 auto;padding:40px 20px}
    h1{font-size:2rem;color:#10b981;margin-bottom:15px}
    h2{font-size:1.4rem;color:#34d399;margin:30px 0 15px;border-bottom:2px solid #1e293b;padding-bottom:8px}
    p{margin-bottom:15px;color:#94a3b8}
    .step{background:#1e293b;padding:15px 20px;border-radius:10px;margin:10px 0;display:flex;gap:15px;align-items:flex-start}
    .step-num{background:#10b981;color:#0f172a;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;flex-shrink:0}
    .faq{background:#1e293b;padding:15px;border-radius:10px;margin:10px 0}
    .faq strong{color:#34d399}
    .cta{background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:13px 26px;border-radius:12px;text-decoration:none;display:inline-block;font-weight:bold;margin:8px 5px 8px 0}
    .langbar{display:flex;gap:10px;flex-wrap:wrap;font-size:0.85rem;margin-bottom:20px}
    .langbar a{color:#94a3b8;text-decoration:none}
    .langbar a.active,.langbar a:hover{color:#10b981}
    footer{text-align:center;padding:30px;color:#94a3b8;font-size:0.85rem;border-top:1px solid #1e293b;margin-top:40px}
  </style>
  ${siteSchemaTag(domainUrl, profile)}</head>
<body>
  <div class="container">
    <nav class="langbar">
      ${LANGS.map(l => `<a href="${pagePath}${langQ(l)}" hreflang="${l}" class="${l === lang ? 'active' : ''}">${l.toUpperCase()}</a>`).join('      ')}
    </nav>
    <h1>${guide.title}</h1>
    <p style="font-size:1.1rem;color:#e2e8f0;">${guide.desc}</p>
    <p style="font-size:0.85rem;color:#94a3b8;">${tt('best.updated', lang)} ${CONTENT_VERIFIED}</p>
    <p style="color:#10b981;">${tt('guides.brand_line', lang, { brand: profile.brand, tagline: profile.tagline, intro: profile.intro })}</p>

    <h2>📋 ${tt('guides.steps_title', lang)}</h2>
    ${guide.steps.map((s, i) => `<div class="step"><div class="step-num">${i + 1}</div><div>${s}</div></div>`).join('\n')}

    <h2>❓ ${tt('guides.faq_title', lang)}</h2>
    ${guide.faq.map(f => `<div class="faq"><strong>${tt('faq.q_prefix', lang)} ${f.q}</strong><p>${f.a}</p></div>`).join('\n')}

    <h2>📚 ${tt('guides.related_title', lang)}</h2>
    <div class="related">${relatedGuides}</div>

    <div style="margin-top:30px;text-align:center;">
      <a href="/${langQ(lang)}" class="cta">🏠 ${tt('guides.cta_home', lang)}</a>
      <a href="/download/apk" class="cta">📱 ${tt('cta.download', lang)}</a>
      <a href="/predictions${langQ(lang)}" class="cta">⚽ ${tt('cta.ai', lang)}</a>
    </div>
  </div>
  <footer>
    <p>© 2026 ${profile.brand} — ${profile.tagline} | <a href="${domainUrl}" style="color:#10b981;">${domain}</a></p>
    <p style="font-size:0.8rem;">${trustLinks(lang)}</p>
  </footer>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Robots-Tag', 'index, follow, max-snippet:-1');
      res.send(html);
    });


    // ==================== PREDICTION PAGES (Daily fresh content for crawlers) ====================
    const TEAMS: Record<string, { name: string; rating: number; league: string }> = {
      ars: { name: 'Arsenal', rating: 1980, league: 'Premier League' },
      liv: { name: 'Liverpool', rating: 1995, league: 'Premier League' },
      mci: { name: 'Manchester City', rating: 2010, league: 'Premier League' },
      che: { name: 'Chelsea', rating: 1900, league: 'Premier League' },
      mun: { name: 'Manchester United', rating: 1850, league: 'Premier League' },
      tot: { name: 'Tottenham', rating: 1870, league: 'Premier League' },
      rma: { name: 'Real Madrid', rating: 2020, league: 'La Liga' },
      fcb: { name: 'Barcelona', rating: 1990, league: 'La Liga' },
      atm: { name: 'Atletico Madrid', rating: 1920, league: 'La Liga' },
      sev: { name: 'Sevilla', rating: 1820, league: 'La Liga' },
      int: { name: 'Inter Milan', rating: 1960, league: 'Serie A' },
      juv: { name: 'Juventus', rating: 1900, league: 'Serie A' },
      mil: { name: 'AC Milan', rating: 1890, league: 'Serie A' },
      nap: { name: 'Napoli', rating: 1930, league: 'Serie A' },
      bay: { name: 'Bayern Munich', rating: 2005, league: 'Bundesliga' },
      bvb: { name: 'Borussia Dortmund', rating: 1900, league: 'Bundesliga' },
      rbl: { name: 'RB Leipzig', rating: 1870, league: 'Bundesliga' },
      lev: { name: 'Bayer Leverkusen', rating: 1930, league: 'Bundesliga' },
      psg: { name: 'Paris Saint-Germain', rating: 1975, league: 'Ligue 1' },
      mrs: { name: 'Marseille', rating: 1850, league: 'Ligue 1' },
      lil: { name: 'Lille', rating: 1830, league: 'Ligue 1' },
      mon: { name: 'Monaco', rating: 1860, league: 'Ligue 1' },
      ahl: { name: 'Al Ahly', rating: 1880, league: 'Egyptian Premier League' },
      zam: { name: 'Zamalek', rating: 1820, league: 'Egyptian Premier League' },
      pyr: { name: 'Pyramids FC', rating: 1790, league: 'Egyptian Premier League' },
      sma: { name: 'Smouha', rating: 1700, league: 'Egyptian Premier League' },
      hil: { name: 'Al Hilal', rating: 1950, league: 'Saudi Pro League' },
      nss: { name: 'Al Nassr', rating: 1910, league: 'Saudi Pro League' },
      itt: { name: 'Al Ittihad', rating: 1870, league: 'Saudi Pro League' },
      ahs: { name: 'Al Ahli', rating: 1885, league: 'Saudi Pro League' },
      ajx: { name: 'Ajax', rating: 1750, league: 'Eredivisie' },
      psv: { name: 'PSV', rating: 1770, league: 'Eredivisie' },
      fey: { name: 'Feyenoord', rating: 1730, league: 'Eredivisie' },
      azl: { name: 'AZ Alkmaar', rating: 1690, league: 'Eredivisie' },
      ben: { name: 'Benfica', rating: 1840, league: 'Primeira Liga' },
      por: { name: 'Porto', rating: 1830, league: 'Primeira Liga' },
      spo: { name: 'Sporting CP', rating: 1820, league: 'Primeira Liga' },
      brg: { name: 'Braga', rating: 1740, league: 'Primeira Liga' },
      gal: { name: 'Galatasaray', rating: 1790, league: 'Turkish Super Lig' },
      fen: { name: 'Fenerbahce', rating: 1780, league: 'Turkish Super Lig' },
      bes: { name: 'Besiktas', rating: 1720, league: 'Turkish Super Lig' },
      tra: { name: 'Trabzonspor', rating: 1690, league: 'Turkish Super Lig' },
      fla: { name: 'Flamengo', rating: 1850, league: 'Brasileiro Serie A' },
      pal: { name: 'Palmeiras', rating: 1860, league: 'Brasileiro Serie A' },
      cor: { name: 'Corinthians', rating: 1760, league: 'Brasileiro Serie A' },
      flu: { name: 'Fluminense', rating: 1750, league: 'Brasileiro Serie A' },
      new: { name: 'Newcastle United', rating: 1840, league: 'Premier League' },
      avl: { name: 'Aston Villa', rating: 1810, league: 'Premier League' },
      whu: { name: 'West Ham United', rating: 1770, league: 'Premier League' },
      bha: { name: 'Brighton', rating: 1760, league: 'Premier League' },
      wol: { name: 'Wolves', rating: 1700, league: 'Premier League' },
      nfo: { name: 'Nottingham Forest', rating: 1740, league: 'Premier League' },
      bet: { name: 'Real Betis', rating: 1780, league: 'La Liga' },
      vil: { name: 'Villarreal', rating: 1810, league: 'La Liga' },
      ath: { name: 'Athletic Club', rating: 1800, league: 'La Liga' },
      rso: { name: 'Real Sociedad', rating: 1790, league: 'La Liga' },
      val: { name: 'Valencia', rating: 1760, league: 'La Liga' },
      rom: { name: 'Roma', rating: 1870, league: 'Serie A' },
      laz: { name: 'Lazio', rating: 1850, league: 'Serie A' },
      ata: { name: 'Atalanta', rating: 1880, league: 'Serie A' },
      fio: { name: 'Fiorentina', rating: 1800, league: 'Serie A' },
      sgf: { name: 'Eintracht Frankfurt', rating: 1800, league: 'Bundesliga' },
      stu: { name: 'VfB Stuttgart', rating: 1790, league: 'Bundesliga' },
      lyo: { name: 'Lyon', rating: 1790, league: 'Ligue 1' },
      nic: { name: 'Nice', rating: 1760, league: 'Ligue 1' },
    };

    const LEAGUE_TEAMS: Record<string, string[]> = {
      'Premier League': ['ars', 'liv', 'mci', 'che', 'mun', 'tot'],
      'La Liga': ['rma', 'fcb', 'atm', 'sev'],
      'Serie A': ['int', 'juv', 'mil', 'nap'],
      'Bundesliga': ['bay', 'bvb', 'rbl', 'lev'],
      'Ligue 1': ['psg', 'mrs', 'lil', 'mon'],
      'Egyptian Premier League': ['ahl', 'zam', 'pyr', 'sma'],
      'Saudi Pro League': ['hil', 'nss', 'itt', 'ahs'],
      'Eredivisie': ['ajx', 'psv', 'fey', 'azl'],
      'Primeira Liga': ['ben', 'por', 'spo', 'brg'],
      'Turkish Super Lig': ['gal', 'fen', 'bes', 'tra'],
      'Brasileiro Serie A': ['fla', 'pal', 'cor', 'flu'],
    };

    // Dynamic league → team keys (also covers clubs added by the daily fixture ingest)
    const leagueTeamKeys = (lg: string): string[] => Object.keys(TEAMS).filter(k => TEAMS[k].league === lg);

    const isoDate = (d: Date) => d.toISOString().split('T')[0];

    type Fixture = { slug: string; home: string; away: string; league: string; date: string; kickOff: string };

    // Real fixtures ingested daily (data/daily_fixtures.json) — merged team registry
    // keeps curated ratings for known clubs, defaults new clubs to 1500.
    let fixturesCache: { mtimeMs: number; fixtures: Fixture[] } | null = null;
    function loadRealFixtures(): Fixture[] | null {
      try {
        const file = path.join(process.cwd(), 'data', 'daily_fixtures.json');
        const st = fs.statSync(file);
        if (Date.now() - st.mtimeMs > 48 * 3600 * 1000) return null; // stale — let fallback handle it
        if (!fixturesCache || fixturesCache.mtimeMs !== st.mtimeMs) {
          const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as {
            teams?: Record<string, { name: string; rating: number; league: string }>;
            fixtures?: Fixture[];
          };
          for (const [k, t] of Object.entries(raw.teams || {})) {
            if (!TEAMS[k]) TEAMS[k] = t;
          }
          fixturesCache = { mtimeMs: st.mtimeMs, fixtures: raw.fixtures || [] };
        }
        const todayIso = isoDate(new Date());
        const horizonIso = isoDate(new Date(Date.now() + 10 * 86400000));
        const windowed = fixturesCache.fixtures.filter(f =>
          f.date >= todayIso && f.date <= horizonIso && !!TEAMS[f.home] && !!TEAMS[f.away]);
        return windowed.length ? windowed : null;
      } catch {
        return null;
      }
    }

    // Deterministic fixtures for next 7 days (rotating pairings = fresh pages daily)
    // — fallback used only when the real-fixture file is missing or stale.
    function getFixtures(): Fixture[] {
      const real = loadRealFixtures();
      if (real) return real;
      const fixtures: Fixture[] = [];
      const today = new Date();
      for (let day = 0; day < 7; day++) {
        const d = new Date(today.getTime() + day * 86400000);
        const date = isoDate(d);
        let i = 0;
        for (const [league, ids] of Object.entries(LEAGUE_TEAMS)) {
          const rotated = ids.slice((day + i) % ids.length).concat(ids.slice(0, (day + i) % ids.length));
          for (let k = 0; k + 1 < rotated.length; k += 2) {
            const home = rotated[k], away = rotated[k + 1];
            const kickOff = `${['15:00', '17:30', '20:00', '22:00'][i % 4]} UTC`;
            fixtures.push({ slug: `${home}-vs-${away}-${date}`, home, away, league, date, kickOff });
          }
          i++;
        }
      }
      return fixtures;
    }

    function predictMatch(f: { home: string; away: string; date: string }, lang: Lang = 'ar') {
      const H = TEAMS[f.home], A = TEAMS[f.away];
      const pHome = 1 / (1 + Math.pow(10, (A.rating - H.rating) / 400));
      const draw = 0.26 - Math.abs(pHome - 0.5) * 0.12;
      const pH = Math.max(0.08, pHome - draw / 2);
      const pA = Math.max(0.08, 1 - pHome - draw / 2);
      const diff = Math.round((H.rating - A.rating) / 180);
      const homeGoals = Math.max(0, Math.round(1.4 + diff * 0.6));
      const awayGoals = Math.max(0, Math.round(1.2 - diff * 0.6));
      const strength = Math.abs(pH - pA);
      const confidence = Math.round(Math.min(95, 55 + strength * 90));
      const favorite = pH >= pA ? H : A;
      const risk = confidence > 78 ? tt('risk.low', lang) : confidence > 65 ? tt('risk.medium', lang) : tt('risk.high', lang);
      const score = `${homeGoals}-${awayGoals}`;
      const favProb = Math.round(Math.max(pH, pA) * 100);
      const favNote = tt('pred.fav_note', lang, { favorite: favorite.name, prob: String(favProb) });
      const scoreNote = tt('pred.draw_note', lang, { score, favorite: favorite.name });
      return {
        pH: Math.round(pH * 100), pD: Math.round(draw * 100), pA: Math.round(pA * 100),
        homeGoals, awayGoals, confidence, favorite: favorite.name, risk, score,
        pick: tt('pred.prob_home', lang, { team: pH >= pA ? H.name : A.name }),
        summary: tt('pred.vs_note', lang, {
          home: H.name, hr: String(H.rating), away: A.name, ar: String(A.rating),
          fav_note: favNote, score_note: scoreNote,
        }),
      };
    }

    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    // Predictions list page
    // Shared renderer for /predictions and daily /predictions/{today|tomorrow} pages
    const renderPredictionsList = (req: import('express').Request, res: import('express').Response, dayKey?: string, leagueSlug?: string, teamSlug?: string) => {
      const domain = req.headers.host?.replace(/^www\./, '') || 'vex.deals';
      const domainUrl = `https://${domain}`;
      const lang = getLang(req);
      const profile = getProfile(domain, lang);
      const todayStr = new Date().toISOString().split('T')[0];
      const dayDate = dayKey === 'today' ? todayStr
        : dayKey === 'tomorrow' ? new Date(Date.now() + 86400000).toISOString().split('T')[0]
        : undefined;
      const allFixtures = getFixtures();
      const leagues = [...new Set(allFixtures.map(f => f.league))];
      const league = leagueSlug ? leagues.find(n => slugify(n) === leagueSlug) : undefined;
      if (leagueSlug && !league) {
        return send404(res, profile, lang === 'ar' ? 'الدوري غير موجود.' : 'League not found.');
      }
      const teamEntry = teamSlug ? Object.entries(TEAMS).find(([, t]) => slugify(t.name) === teamSlug) : undefined;
      const teamKey = teamEntry?.[0];
      const team = teamEntry?.[1];
      if (teamSlug && !team) {
        return send404(res, profile, lang === 'ar' ? 'الفريق غير موجود.' : 'Team not found.');
      }
      const basePath = teamSlug ? `/predictions/team/${teamSlug}`
        : leagueSlug ? `/predictions/league/${leagueSlug}`
        : dayKey ? `/predictions/${dayKey}` : '/predictions';
      let fixtures = allFixtures;
      if (dayDate) fixtures = fixtures.filter(f => f.date === dayDate);
      if (league) fixtures = fixtures.filter(f => f.league === league);
      if (teamKey) fixtures = fixtures.filter(f => f.home === teamKey || f.away === teamKey);
      let dayFallback = false;
      if (dayKey && fixtures.length === 0) {
        // Never 404 the daily pages (they are always in the sitemap) — show the next upcoming fixtures
        fixtures = allFixtures.filter(f => f.date >= todayStr).slice(0, 12);
        dayFallback = fixtures.length > 0;
      }
      if ((dayKey || leagueSlug || teamSlug) && fixtures.length === 0) {
        return send404(res, profile, lang === 'ar' ? 'لا توجد مباريات.' : 'No matches available.');
      }
      const byDate: Record<string, typeof fixtures> = {};
      for (const f of fixtures) (byDate[f.date] ||= []).push(f);

      const rows = Object.entries(byDate).map(([date, list]) => `
        <h2>📅 ${date}</h2>
        ${list.map(f => {
          const p = predictMatch(f, lang);
          return `<a class="match" href="/predictions/${f.slug}${langQ(lang)}">
            <span class="teams">${esc(TEAMS[f.home].name)} vs ${esc(TEAMS[f.away].name)}</span>
            <span class="league">${esc(f.league)} • ${tt('pred.kickoff', lang)} ${f.kickOff}</span>
            <span class="pred">${p.pH}% / ${p.pD}% / ${p.pA}% — ${p.score}</span>
          </a>`;
        }).join('')}`).join('');

      const dayTitle = dayKey === 'today' ? tt('pred.today_h1', lang)
        : dayKey === 'tomorrow' ? tt('pred.tomorrow_h1', lang)
        : dayKey ? `${tt('pred.day_h1', lang)} ${dayDate}` : '';
      const leagueTitle = league ? tt('pred.league_h1', lang, { league }) : '';
      const teamTitle = team ? tt('pred.team_h1', lang, { team: team.name }) : '';
      const listTitle = team ? `${teamTitle} — ${profile.brand}`
        : league ? `${leagueTitle} — ${profile.brand}`
        : dayKey ? `${dayTitle} — ${dayDate} — ${profile.brand}` : `${tt('pred.list_h1', lang)} — ${profile.brand}`;
      const listDesc = team ? tt('pred.team_desc', lang, { team: team.name, brand: profile.brand })
        : league ? tt('pred.league_desc', lang, { league: league!, brand: profile.brand })
        : dayKey ? tt('pred.day_desc', lang, { date: dayDate!, brand: profile.brand }) : tt('pred.list_desc', lang, { brand: profile.brand });
      const h1 = team ? `🛡️ ${teamTitle}` : league ? `🏆 ${leagueTitle}` : dayKey ? `📅 ${dayTitle}` : `⚽ ${tt('pred.list_h1', lang)}`;
      const canonical = canonicalUrl(domainUrl, basePath, lang);
      const ogUrl = `${domainUrl}${basePath}${langQ(lang)}`;
      const crumbName = team?.name || league || dayTitle || tt('pred.list_h1', lang);
      const breadcrumbLd = (dayKey || leagueSlug || teamSlug) ? `,"breadcrumb":{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"${esc(profile.brand)}","item":"${domainUrl}/"},{"@type":"ListItem","position":2,"name":"${esc(tt('pred.list_h1', lang))}","item":"${domainUrl}/predictions"},{"@type":"ListItem","position":3,"name":"${esc(crumbName)}","item":"${domainUrl}${basePath}"}]}` : '';
      const dayLinks = `
        <div class="daynav">
          <a href="/predictions/today${langQ(lang)}" class="${dayKey === 'today' ? 'active' : ''}">📅 ${tt('pred.today_h1', lang)}</a>
          <a href="/predictions/tomorrow${langQ(lang)}" class="${dayKey === 'tomorrow' ? 'active' : ''}">📅 ${tt('pred.tomorrow_h1', lang)}</a>
          <a href="/predictions${langQ(lang)}" class="${!dayKey && !leagueSlug && !teamSlug ? 'active' : ''}">⚽ ${tt('pred.list_h1', lang)}</a>
        </div>`;
      const leagueLinks = `
        <div class="daynav">
          ${leagues.map(n => `<a href="/predictions/league/${slugify(n)}${langQ(lang)}" class="${n === league ? 'active' : ''}">${esc(n)}</a>`).join('\n          ')}
        </div>`;
      const leagueKeys = league ? leagueTeamKeys(league) : [];
      const teamLinks = (league && leagueKeys.length) ? `
        <div class="daynav">
          ${leagueKeys.map(k => `<a href="/predictions/team/${slugify(TEAMS[k].name)}${langQ(lang)}" class="${k === teamKey ? 'active' : ''}">${esc(TEAMS[k].name)}</a>`).join('\n          ')}
        </div>` : '';
      const rankRows = leagueKeys
        .map(k => ({ key: k, t: TEAMS[k] }))
        .sort((x, y) => y.t.rating - x.t.rating);
      const rankTable = rankRows.length ? `
    <h2>📊 ${tt('pred.rank_title', lang, { league })}</h2>
    <table class="rank">
      <tr><th>#</th><th>${lang === 'ar' ? 'الفريق' : 'Team'}</th><th>${lang === 'ar' ? 'القوة' : 'Rating'}</th></tr>
      ${rankRows.map((r, i) => `<tr><td>${i + 1}</td><td><a href="/predictions/team/${slugify(r.t.name)}${langQ(lang)}">${esc(r.t.name)}</a></td><td>${r.t.rating}</td></tr>`).join('\n      ')}
    </table>` : '';

      const html = `<!doctype html>
<html lang="${lang}" dir="${profile.dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(listTitle)}</title>
  <meta name="description" content="${esc(listDesc)}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="${canonical}" />
${hreflangs(domainUrl, basePath)}
  <meta property="og:title" content="${esc(listTitle)}" />
  <meta property="og:description" content="${esc(listDesc)}" />
  <meta property="og:url" content="${ogUrl}" />
  <meta property="og:type" content="website" />
${socialMeta(domainUrl, esc(listTitle), esc(listDesc))}
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"CollectionPage","name":"${esc(listTitle)}","description":"${esc(listDesc)}","url":"${domainUrl}${basePath}","inLanguage":"${lang}","isPartOf":{"@id":"${domainUrl}/#website"},"publisher":{"@id":"${domainUrl}/#organization"},"mainEntity":{"@type":"ItemList","numberOfItems":${fixtures.length},"itemListElement":${JSON.stringify(fixtures.slice(0, 20).map((f, i) => ({ '@type': 'ListItem', position: i + 1, url: `${domainUrl}/predictions/${f.slug}` })))}}${breadcrumbLd}}</script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Tahoma,sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.8}
    .container{max-width:900px;margin:0 auto;padding:40px 20px}
    h1{font-size:1.9rem;color:#10b981;margin-bottom:10px}
    h2{font-size:1.3rem;color:#34d399;margin:30px 0 12px}
    p{color:#94a3b8;margin-bottom:15px}
    .match{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;background:#1e293b;padding:14px 18px;border-radius:10px;margin:8px 0;text-decoration:none;color:#e2e8f0;border:1px solid #334155}
    .match:hover{border-color:#10b981}
    .teams{font-weight:bold;color:#10b981;font-size:1.05rem}
    .league{color:#94a3b8;font-size:0.85rem}
    .pred{background:#0f172a;padding:5px 12px;border-radius:20px;font-size:0.9rem;color:#34d399}
    .cta{background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:13px 26px;border-radius:12px;text-decoration:none;display:inline-block;font-weight:bold;margin:8px 5px 8px 0}
    .langbar{display:flex;gap:10px;flex-wrap:wrap;font-size:0.85rem;margin-bottom:20px}
    .langbar a{color:#94a3b8;text-decoration:none}
    .langbar a.active,.langbar a:hover{color:#10b981}
    .daynav{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}
    .daynav a{background:#1e293b;padding:7px 14px;border-radius:20px;text-decoration:none;color:#94a3b8;font-size:0.85rem;border:1px solid #334155}
    .daynav a.active,.daynav a:hover{border-color:#10b981;color:#10b981}
    table.rank{width:100%;border-collapse:collapse;margin:10px 0 20px;background:#1e293b;border-radius:10px;overflow:hidden}
    table.rank th,table.rank td{padding:9px 14px;text-align:left;border-bottom:1px solid #334155}
    table.rank th{background:#0f172a;color:#10b981}
    table.rank a{color:#34d399;text-decoration:none}
    table.rank a:hover{color:#10b981}
    table.rank tr:last-child td{border-bottom:none}
    footer{text-align:center;padding:30px;color:#94a3b8;font-size:0.85rem;border-top:1px solid #1e293b;margin-top:40px}
  </style>
  ${siteSchemaTag(domainUrl, profile)}</head>
<body>
  <div class="container">
    <nav class="langbar">
      ${LANGS.map(l => `<a href="/predictions${basePath.slice('/predictions'.length)}${langQ(l)}" hreflang="${l}" class="${l === lang ? 'active' : ''}">${l.toUpperCase()}</a>`).join('      ')}
    </nav>
    <h1>${h1}</h1>
    <p>${profile.intro}</p>
    <p>${listDesc}</p>
    ${dayLinks}
    ${leagueLinks}
    ${teamLinks}
    ${rankTable}
    <p>ℹ️ ${tt('pred.list_note', lang)} — ${tt('pred.updated_only', lang)} ${dayDate || todayStr}</p>
    ${dayFallback ? `<p>⚠️ ${lang === 'ar' ? 'لا توجد مباريات مبرَّمة في هذا التاريخ حاليًا — هذه أقرب المباريات القادمة.' : 'No matches scheduled on this date right now — showing the next upcoming fixtures.'}</p>` : ''}
    ${rows}
    <div style="margin-top:30px;text-align:center;">
      <a href="/guides/ai-predictions-guide${langQ(lang)}" class="cta">📖 ${tt('pred.cta_guide', lang)}</a>
      <a href="/#ai-sports" class="cta">🤖 ${tt('cta.ai', lang)}</a>
    </div>
  </div>
  <footer>
    <p>© 2026 ${profile.brand} — ${profile.tagline} | <a href="${domainUrl}" style="color:#10b981;">${domain}</a></p>
    <p style="font-size:0.8rem;">${trustLinks(lang)}</p>
  </footer>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Robots-Tag', 'index, follow, max-snippet:-1');
      res.send(html);
    };

    app.get('/predictions', (req, res) => renderPredictionsList(req, res));
    // Daily pages — MUST be registered before /predictions/:slug
    app.get('/predictions/today', (req, res) => renderPredictionsList(req, res, 'today'));
    app.get('/predictions/tomorrow', (req, res) => renderPredictionsList(req, res, 'tomorrow'));
    // League pages — MUST be before /predictions/:slug
    app.get('/predictions/league/:lslug', (req, res) => renderPredictionsList(req, res, undefined, req.params.lslug));
    // Team pages — MUST be before /predictions/:slug
    app.get('/predictions/team/:tslug', (req, res) => renderPredictionsList(req, res, undefined, undefined, req.params.tslug));

    // Single prediction page
    app.get('/predictions/:slug', (req, res) => {
      const domain = req.headers.host?.replace(/^www\./, '') || 'vex.deals';
      const domainUrl = `https://${domain}`;
      const lang = getLang(req);
      const profile = getProfile(domain, lang);
      const fixture = getFixtures().find(f => f.slug === req.params.slug);
      if (!fixture) return send404(res, profile, lang === 'ar' ? 'المباراة غير موجودة.' : 'Match not found.');

      const H = TEAMS[fixture.home], A = TEAMS[fixture.away];
      const p = predictMatch(fixture, lang);
      const pagePath = `/predictions/${fixture.slug}`;
      const tv = (k: string, vars: Record<string, string> = {}) => tt(k, lang, {
        home: H.name, away: A.name, date: fixture.date, score: p.score,
        ph: String(p.pH), pa: String(p.pA), confidence: String(p.confidence),
        favorite: p.favorite, risk: p.risk, pick: p.pick, ...vars,
      });
      const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      const jstr = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');
      const title = tv('pred.title_tpl');
      const metaDesc = tv('pred.meta_desc');
      const ogDesc = tv('pred.og_desc');
      const faq1q = tv('pred.faq1q'), faq2q = tv('pred.faq2q'), faq3q = tv('pred.faq3q');
      const faq2a = tv('pred.draw_note');
      const faq3a = `${tv('pred.risk_note')} — ${tv('pred.faq_risk_note')}`;

      const html = `<!doctype html>
<html lang="${lang}" dir="${profile.dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escAttr(title)} | ${profile.brand}</title>
  <meta name="description" content="${escAttr(metaDesc)}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="${canonicalUrl(domainUrl, pagePath, lang)}" />
${hreflangs(domainUrl, pagePath)}
  <meta property="og:title" content="${escAttr(title)}" />
  <meta property="og:description" content="${escAttr(ogDesc)}" />
  <meta property="og:url" content="${domainUrl}${pagePath}${langQ(lang)}" />
  <meta property="og:type" content="article" />
${socialMeta(domainUrl, escAttr(`${title} | ${profile.brand}`), escAttr(ogDesc))}

  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"SportsEvent","name":"${jstr(`${H.name} vs ${A.name}`)}","startDate":"${fixture.date}T${fixture.kickOff.split(' ')[0]}:00Z","eventStatus":"https://schema.org/EventScheduled","eventAttendanceMode":"https://schema.org/OfflineEventAttendanceMode","location":{"@type":"SportsActivityLocation","name":"${jstr(fixture.league)}"},"competitor":[{"@type":"SportsTeam","name":"${jstr(H.name)}"},{"@type":"SportsTeam","name":"${jstr(A.name)}"}],"url":"${domainUrl}${pagePath}","inLanguage":"${lang}"}</script>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"Article","headline":"${jstr(title)}","description":"${jstr(metaDesc)}","url":"${domainUrl}${pagePath}","inLanguage":"${lang}","author":{"@type":"Organization","name":"${jstr(profile.brand)}"},"publisher":{"@id":"${domainUrl}/#organization"},"dateModified":"${new Date().toISOString()}"}</script>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
    {"@type":"Question","name":"${jstr(faq1q)}","acceptedAnswer":{"@type":"Answer","text":"${jstr(p.summary)}"}},
    {"@type":"Question","name":"${jstr(faq2q)}","acceptedAnswer":{"@type":"Answer","text":"${jstr(faq2a)}"}},
    {"@type":"Question","name":"${jstr(faq3q)}","acceptedAnswer":{"@type":"Answer","text":"${jstr(faq3a)}"}}
  ]}</script>

  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Tahoma,sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.9}
    .container{max-width:800px;margin:0 auto;padding:40px 20px}
    h1{font-size:1.8rem;color:#10b981;margin-bottom:8px}
    h2{font-size:1.3rem;color:#34d399;margin:28px 0 12px;border-bottom:2px solid #1e293b;padding-bottom:8px}
    p{color:#94a3b8;margin-bottom:14px}
    .badge{display:inline-block;background:#10b981;color:#0f172a;padding:4px 12px;border-radius:20px;font-weight:bold;font-size:0.85rem;margin:4px 4px 4px 0}
    .probs{display:flex;gap:10px;margin:15px 0}
    .prob{flex:1;background:#1e293b;padding:15px;border-radius:12px;text-align:center}
    .prob .num{font-size:1.6rem;font-weight:bold;color:#10b981}
    .prob .lbl{font-size:0.85rem;color:#94a3b8}
    .score{background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:20px;border-radius:14px;text-align:center;font-size:2rem;font-weight:bold;margin:15px 0}
    .card{background:#1e293b;padding:18px;border-radius:12px;margin:12px 0}
    .faq{background:#1e293b;padding:15px;border-radius:10px;margin:10px 0}
    .faq strong{color:#34d399}
    .cta{background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:13px 26px;border-radius:12px;text-decoration:none;display:inline-block;font-weight:bold;margin:8px 5px 8px 0}
    .related a{display:inline-block;background:#1e293b;padding:8px 14px;border-radius:8px;color:#10b981;text-decoration:none;margin:4px}
    .langbar{display:flex;gap:10px;flex-wrap:wrap;font-size:0.85rem;margin-bottom:20px}
    .langbar a{color:#94a3b8;text-decoration:none}
    .langbar a.active,.langbar a:hover{color:#10b981}
    footer{text-align:center;padding:30px;color:#94a3b8;font-size:0.85rem;border-top:1px solid #1e293b;margin-top:40px}
  </style>
  ${siteSchemaTag(domainUrl, profile)}</head>
<body>
  <div class="container">
    <nav class="langbar">
      ${LANGS.map(l => `<a href="${pagePath}${langQ(l)}" hreflang="${l}" class="${l === lang ? 'active' : ''}">${l.toUpperCase()}</a>`).join('      ')}
    </nav>
    <p style="color:#94a3b8;"><a href="/predictions${langQ(lang)}" style="color:#10b981;text-decoration:none;">${tt('pred.breadcrumb', lang)}</a> ← <a href="/predictions/league/${slugify(fixture.league)}${langQ(lang)}" style="color:#94a3b8;text-decoration:none;">${esc(fixture.league)}</a></p>
    <h1><a href="/predictions/team/${slugify(H.name)}${langQ(lang)}" style="color:#10b981;text-decoration:none;">${esc(H.name)}</a> vs <a href="/predictions/team/${slugify(A.name)}${langQ(lang)}" style="color:#10b981;text-decoration:none;">${esc(A.name)}</a></h1>
    <div>
      <span class="badge">📅 ${fixture.date}</span>
      <span class="badge">🕐 ${tt('pred.kickoff', lang)} ${fixture.kickOff}</span>
      <span class="badge">🏟️ ${esc(fixture.league)}</span>
      <span class="badge">🤖 ${tt('pred.ai_badge', lang)}</span>
    </div>

    <h2>📊 ${tt('pred.probs_title', lang)}</h2>
    <div class="probs">
      <div class="prob"><div class="num">${p.pH}%</div><div class="lbl">${tt('pred.prob_home', lang, { team: esc(H.name) })}</div></div>
      <div class="prob"><div class="num">${p.pD}%</div><div class="lbl">${tt('pred.prob_draw', lang)}</div></div>
      <div class="prob"><div class="num">${p.pA}%</div><div class="lbl">${tt('pred.prob_away', lang, { team: esc(A.name) })}</div></div>
    </div>

    <div class="score">${tt('pred.score', lang)}: ${p.homeGoals} - ${p.awayGoals}</div>

    <div class="card">
      <h2>🤖 ${tt('pred.analysis', lang)}</h2>
      <p>${p.summary}</p>
      <p><strong>${tt('pred.recommendation', lang)}:</strong> ${p.pick}</p>
      <p><strong>${tt('pred.risk', lang)}:</strong> ${p.risk}</p>
      <p><strong>${tt('pred.confidence', lang)}:</strong> ${p.confidence}%</p>
      <p><strong>${tt('pred.ratings', lang)}:</strong> ${esc(H.name)}: ${H.rating} | ${esc(A.name)}: ${A.rating}</p>
    </div>

    <h2>❓ ${tt('guides.faq_title', lang)}</h2>
    <div class="faq"><strong>${tt('faq.q_prefix', lang)} ${faq1q}</strong><p>${p.summary}</p></div>
    <div class="faq"><strong>${tt('faq.q_prefix', lang)} ${faq2q}</strong><p>${faq2a}</p></div>
    <div class="faq"><strong>${tt('faq.q_prefix', lang)} ${faq3q}</strong><p>${faq3a}</p></div>

    <h2>🔗 ${tt('pred.related', lang)}</h2>
    <div class="related">
      ${getFixtures().filter(f => f.slug !== fixture.slug && f.date === fixture.date).slice(0, 6).map(f => `<a href="/predictions/${f.slug}${langQ(lang)}">${esc(TEAMS[f.home].name)} vs ${esc(TEAMS[f.away].name)}</a>`).join('')}
    </div>

    <div style="margin-top:30px;text-align:center;">
      <a href="/predictions${langQ(lang)}" class="cta">⚽ ${tt('pred.cta_all', lang)}</a>
      <a href="/guides/ai-predictions-guide${langQ(lang)}" class="cta">📖 ${tt('pred.cta_guide', lang)}</a>
    </div>
  </div>
  <footer>
    <p>© 2026 ${profile.brand} — ${profile.tagline} | <a href="${domainUrl}" style="color:#10b981;">${domain}</a></p>
    <p style="font-size:0.8rem;">${trustLinks(lang)}</p>
  </footer>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Robots-Tag', 'index, follow, max-snippet:-1');
      res.send(html);
    });

    // ==================== SEO HUB PAGES: /companies + /guides (Programmatic SEO) ====================
    const renderHub = (kind: 'companies' | 'guides', req: import('express').Request, res: import('express').Response) => {
      const domain = req.headers.host?.replace(/^www\./, '') || 'vex.deals';
      const domainUrl = `https://${domain}`;
      const lang = getLang(req);
      const profile = getProfile(domain, lang);
      const pagePath = kind === 'companies' ? '/companies' : '/guides';
      const h1 = kind === 'companies' ? tt('hub.companies_h1', lang) : tt('hub.guides_h1', lang);
      const desc = kind === 'companies'
        ? tt('hub.companies_desc', lang, { brand: profile.brand })
        : tt('hub.guides_desc', lang);
      const note = kind === 'companies' ? tt('hub.companies_note', lang) : tt('guides.related_title', lang);
      const escA = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      const escT = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      let items = '';
      const itemUrls: string[] = [];
      if (kind === 'companies') {
        const companies = storage.getCompanies();
        items = companies.map(c => {
          const u = `${domainUrl}/company/${c.id}${langQ(lang)}`;
          itemUrls.push(u);
          return `<a class="match" href="/company/${c.id}${langQ(lang)}">
            <span class="teams">${escT(c.name)}</span>
            <span class="league">${escT((c.details || '').substring(0, 130))}</span>
            <span class="pred">→</span>
          </a>`;
        }).join('');
      } else {
        items = Object.keys(GUIDES).map(slug => {
          const g = GUIDES[slug][lang] || GUIDES[slug]['en'] || GUIDES[slug]['ar'];
          const u = `${domainUrl}/guides/${slug}${langQ(lang)}`;
          itemUrls.push(u);
          return `<a class="match" href="/guides/${slug}${langQ(lang)}">
            <span class="teams">${escT(g.title)}</span>
            <span class="league">${escT(g.desc.substring(0, 130))}</span>
            <span class="pred">→</span>
          </a>`;
        }).join('');
      }

      const pageTitle = `${h1} — ${profile.brand}`;
      const ld = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: pageTitle,
        description: desc,
        url: `${domainUrl}${pagePath}`,
        inLanguage: lang,
        isPartOf: { '@id': `${domainUrl}/#website` },
        publisher: { '@id': `${domainUrl}/#organization` },
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: itemUrls.map((u, i) => ({ '@type': 'ListItem', position: i + 1, url: u })),
        },
      });

      const html = `<!doctype html>
<html lang="${lang}" dir="${profile.dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escA(pageTitle)}</title>
  <meta name="description" content="${escA(desc)}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="${canonicalUrl(domainUrl, pagePath, lang)}" />
${hreflangs(domainUrl, pagePath)}
  <meta property="og:title" content="${escA(pageTitle)}" />
  <meta property="og:description" content="${escA(desc)}" />
  <meta property="og:url" content="${domainUrl}${pagePath}${langQ(lang)}" />
  <meta property="og:type" content="website" />
${socialMeta(domainUrl, escA(pageTitle), escA(desc))}
  <script type="application/ld+json">${ld}</script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Tahoma,sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.8}
    .container{max-width:900px;margin:0 auto;padding:40px 20px}
    h1{font-size:1.9rem;color:#10b981;margin-bottom:10px}
    h2{font-size:1.3rem;color:#34d399;margin:30px 0 12px}
    p{color:#94a3b8;margin-bottom:15px}
    .match{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;background:#1e293b;padding:14px 18px;border-radius:10px;margin:8px 0;text-decoration:none;color:#e2e8f0;border:1px solid #334155}
    .match:hover{border-color:#10b981}
    .teams{font-weight:bold;color:#10b981;font-size:1.05rem}
    .league{color:#94a3b8;font-size:0.85rem}
    .pred{background:#0f172a;padding:5px 12px;border-radius:20px;font-size:0.9rem;color:#34d399}
    .cta{background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:13px 26px;border-radius:12px;text-decoration:none;display:inline-block;font-weight:bold;margin:8px 5px 8px 0}
    .langbar{display:flex;gap:10px;flex-wrap:wrap;font-size:0.85rem;margin-bottom:20px}
    .langbar a{color:#94a3b8;text-decoration:none}
    .langbar a.active,.langbar a:hover{color:#10b981}
    footer{text-align:center;padding:30px;color:#94a3b8;font-size:0.85rem;border-top:1px solid #1e293b;margin-top:40px}
  </style>
  ${siteSchemaTag(domainUrl, profile)}</head>
<body>
  <div class="container">
    <nav class="langbar">
      ${LANGS.map(l => `<a href="${pagePath}${langQ(l)}" hreflang="${l}" class="${l === lang ? 'active' : ''}">${l.toUpperCase()}</a>`).join('      ')}
    </nav>
    <h1>${h1}</h1>
    <p>${desc}</p>
    <p>ℹ️ ${note}</p>
    ${items}
    <div style="margin-top:30px;text-align:center;">
      <a href="/${langQ(lang)}" class="cta">🏠 ${tt('guides.cta_home', lang)}</a>
      <a href="/predictions${langQ(lang)}" class="cta">⚽ ${tt('cta.ai', lang)}</a>
      <a href="/download/apk" class="cta">📱 ${tt('cta.download', lang)}</a>
    </div>
  </div>
  <footer>
    <p>© 2026 ${profile.brand} — ${profile.tagline} | <a href="${domainUrl}" style="color:#10b981;">${domain}</a></p>
    <p style="font-size:0.8rem;">${trustLinks(lang)}</p>
  </footer>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Robots-Tag', 'index, follow, max-snippet:-1');
      res.send(html);
    };

    // ==================== SSR COMPARISON PAGES (Programmatic SEO) ====================
    app.get('/compare', (req, res) => {
      const domain = req.headers.host?.replace(/^www\./, '') || 'vex.deals';
      const domainUrl = `https://${domain}`;
      const lang = getLang(req);
      const profile = getProfile(domain, lang);
      const pairs = getComparisonPairs();
      const basePath = '/compare';
      const title = `${tt('cmp.hub_h1', lang)} — ${profile.brand}`;
      const desc = tt('cmp.hub_desc', lang, { brand: profile.brand });
      const jstr = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');
      const cards = pairs.map(p => `<a class="card" href="/compare/${p.slug}${langQ(lang)}">${esc(p.a.name)} <b>VS</b> ${esc(p.b.name)}</a>`).join('\n        ');

      const html = `<!doctype html>
<html lang="${lang}" dir="${profile.dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="${canonicalUrl(domainUrl, basePath, lang)}" />
${hreflangs(domainUrl, basePath)}
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:url" content="${domainUrl}${basePath}${langQ(lang)}" />
  <meta property="og:type" content="website" />
${socialMeta(domainUrl, esc(title), esc(desc))}
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"CollectionPage","name":"${jstr(title)}","description":"${jstr(desc)}","url":"${domainUrl}${basePath}","inLanguage":"${lang}","isPartOf":{"@id":"${domainUrl}/#website"},"publisher":{"@id":"${domainUrl}/#organization"},"mainEntity":{"@type":"ItemList","numberOfItems":${pairs.length},"itemListElement":${JSON.stringify(pairs.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${domainUrl}/compare/${p.slug}` })))}}}</script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Tahoma,sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.8}
    .container{max-width:900px;margin:0 auto;padding:40px 20px}
    h1{font-size:1.9rem;color:#10b981;margin-bottom:10px}
    p{color:#94a3b8;margin-bottom:15px}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;margin-top:20px}
    .card{background:#1e293b;padding:15px 18px;border-radius:10px;text-decoration:none;color:#e2e8f0;border:1px solid #334155;font-weight:600;text-align:center}
    .card b{color:#10b981;margin:0 6px}
    .card:hover{border-color:#10b981}
    .langbar{display:flex;gap:10px;flex-wrap:wrap;font-size:0.85rem;margin-bottom:20px}
    .langbar a{color:#94a3b8;text-decoration:none}
    .langbar a.active,.langbar a:hover{color:#10b981}
    footer{text-align:center;padding:30px;color:#94a3b8;font-size:0.85rem;border-top:1px solid #1e293b;margin-top:40px}
  </style>
  ${siteSchemaTag(domainUrl, profile)}</head>
<body>
  <div class="container">
    <nav class="langbar">
      ${LANGS.map(l => `<a href="${basePath}${langQ(l)}" hreflang="${l}" class="${l === lang ? 'active' : ''}">${l.toUpperCase()}</a>`).join('      ')}
    </nav>
    <h1>⚖️ ${tt('cmp.hub_h1', lang)}</h1>
    <p>${tt('cmp.hub_desc', lang, { brand: profile.brand })}</p>
    <div class="grid">
        ${cards}
    </div>
  </div>
  <footer>
    <p>© 2026 ${profile.brand} — ${profile.tagline} | <a href="${domainUrl}" style="color:#10b981;">${domain}</a></p>
    <p style="font-size:0.8rem;">${trustLinks(lang)}</p>
  </footer>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Robots-Tag', 'index, follow, max-snippet:-1');
      res.send(html);
    });

    app.get('/compare/:slug', (req, res) => {
      const domain = req.headers.host?.replace(/^www\./, '') || 'vex.deals';
      const domainUrl = `https://${domain}`;
      const lang = getLang(req);
      const profile = getProfile(domain, lang);
      const pair = getComparisonPairs().find(p => p.slug === req.params.slug);
      if (!pair) return send404(res, profile, lang === 'ar' ? 'المقارنة غير موجودة.' : 'Comparison not found.');
      const { a, b } = pair;
      const basePath = `/compare/${pair.slug}`;
      const T_ = (k: string, vars: Record<string, string> = {}) => tt(k, lang, { a: a.name, b: b.name, brand: profile.brand, ...vars });
      const jstr = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');
      const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      const title = T_('cmp.h1');
      const desc = T_('cmp.meta_desc');
      const about = (c: Company) => (c.details || c.description || '').substring(0, 220);
      const morePairs = getComparisonPairs()
        .filter(p => p.slug !== pair.slug && [p.a.id, p.b.id].some(id => id === a.id || id === b.id))
        .slice(0, 6);

      const faq = [
        { q: T_('cmp.faq1q'), a: T_('cmp.faq1a') },
        { q: T_('cmp.faq2q'), a: T_('cmp.faq2a') },
        { q: T_('cmp.faq3q'), a: T_('cmp.faq3a') },
      ];

      const html = `<!doctype html>
<html lang="${lang}" dir="${profile.dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)} | ${profile.brand}</title>
  <meta name="description" content="${escAttr(desc)}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="${canonicalUrl(domainUrl, basePath, lang)}" />
${hreflangs(domainUrl, basePath)}
  <meta property="og:title" content="${escAttr(title)}" />
  <meta property="og:description" content="${escAttr(desc)}" />
  <meta property="og:url" content="${domainUrl}${basePath}${langQ(lang)}" />
  <meta property="og:type" content="article" />
${socialMeta(domainUrl, escAttr(title), escAttr(desc))}
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"FAQPage","mainEntity":${JSON.stringify(faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })))}}</script>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"${jstr(tt('nav.home', lang))}","item":"${domainUrl}/"},{"@type":"ListItem","position":2,"name":"${jstr(tt('cmp.hub_h1', lang))}","item":"${domainUrl}/compare"},{"@type":"ListItem","position":3,"name":"${jstr(`${a.name} vs ${b.name}`)}","item":"${domainUrl}${basePath}"}]}</script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Tahoma,sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.8}
    .container{max-width:900px;margin:0 auto;padding:40px 20px}
    h1{font-size:1.9rem;color:#10b981;margin-bottom:10px}
    h2{font-size:1.4rem;color:#34d399;margin:30px 0 12px;border-bottom:2px solid #1e293b;padding-bottom:8px}
    p{color:#94a3b8;margin-bottom:15px}
    table.vs{width:100%;border-collapse:collapse;margin:15px 0;background:#1e293b;border-radius:10px;overflow:hidden}
    table.vs th,table.vs td{padding:12px 14px;text-align:left;border-bottom:1px solid #334155;vertical-align:top}
    table.vs th{background:#0f172a;color:#10b981;font-size:1rem}
    table.vs td:first-child{color:#94a3b8;white-space:nowrap}
    table.vs tr:last-child td{border-bottom:none}
    code{background:#0f172a;color:#34d399;padding:3px 10px;border-radius:6px;font-weight:bold;letter-spacing:1px}
    .faq{background:#1e293b;padding:15px 18px;border-radius:10px;margin:10px 0}
    .faq strong{color:#34d399;display:block;margin-bottom:6px}
    .cta{background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:13px 26px;border-radius:12px;text-decoration:none;display:inline-block;font-weight:bold;margin:8px 8px 8px 0}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;margin-top:15px}
    .card{background:#1e293b;padding:13px 16px;border-radius:10px;text-decoration:none;color:#e2e8f0;border:1px solid #334155;font-weight:600;text-align:center;font-size:0.9rem}
    .card b{color:#10b981;margin:0 5px}
    .card:hover{border-color:#10b981}
    .langbar{display:flex;gap:10px;flex-wrap:wrap;font-size:0.85rem;margin-bottom:20px}
    .langbar a{color:#94a3b8;text-decoration:none}
    .langbar a.active,.langbar a:hover{color:#10b981}
    footer{text-align:center;padding:30px;color:#94a3b8;font-size:0.85rem;border-top:1px solid #1e293b;margin-top:40px}
  </style>
  ${siteSchemaTag(domainUrl, profile)}</head>
<body>
  <div class="container">
    <nav class="langbar">
      ${LANGS.map(l => `<a href="${basePath}${langQ(l)}" hreflang="${l}" class="${l === lang ? 'active' : ''}">${l.toUpperCase()}</a>`).join('      ')}
    </nav>
    <h1>⚖️ ${title}</h1>
    <p>${T_('cmp.intro')}</p>

    <h2>📊 ${T_('cmp.table_title')}</h2>
    <table class="vs">
      <tr><th></th><th>${esc(a.name)}</th><th>${esc(b.name)}</th></tr>
      <tr><td>${T_('cmp.row_bonus')}</td><td>${esc(a.bonus_text || '—')}</td><td>${esc(b.bonus_text || '—')}</td></tr>
      <tr><td>${T_('cmp.row_promo')}</td><td>${a.promo_code ? `<code>${esc(a.promo_code)}</code>` : '—'}</td><td>${b.promo_code ? `<code>${esc(b.promo_code)}</code>` : '—'}</td></tr>
      <tr><td>${T_('cmp.row_about')}</td><td>${esc(about(a))}</td><td>${esc(about(b))}</td></tr>
      <tr><td>${T_('cmp.row_app')}</td><td>✅ <a href="/company/${a.id}${langQ(lang)}" style="color:#10b981;">${esc(a.name)}</a></td><td>✅ <a href="/company/${b.id}${langQ(lang)}" style="color:#10b981;">${esc(b.name)}</a></td></tr>
    </table>

    <h2>⚖️ ${T_('cmp.verdict_title')}</h2>
    <p>${T_('cmp.verdict')}</p>

    <div style="margin-top:20px;">
      <a href="/company/${a.id}${langQ(lang)}" class="cta">👉 ${tt('cmp.cta_visit', lang, { name: a.name })}</a>
      <a href="/company/${b.id}${langQ(lang)}" class="cta">👉 ${tt('cmp.cta_visit', lang, { name: b.name })}</a>
    </div>

    <h2>❓ FAQ</h2>
    ${faq.map(f => `<div class="faq"><strong>${tt('faq.q_prefix', lang)} ${esc(f.q)}</strong>${esc(f.a)}</div>`).join('\n    ')}

    ${morePairs.length ? `<h2>🔗 ${T_('cmp.more_title')}</h2>
    <div class="grid">
      ${morePairs.map(p => `<a class="card" href="/compare/${p.slug}${langQ(lang)}">${esc(p.a.name)} <b>VS</b> ${esc(p.b.name)}</a>`).join('\n      ')}
    </div>` : ''}
  </div>
  <footer>
    <p>© 2026 ${profile.brand} — ${profile.tagline} | <a href="${domainUrl}" style="color:#10b981;">${domain}</a></p>
    <p style="font-size:0.8rem;">${trustLinks(lang)}</p>
  </footer>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Robots-Tag', 'index, follow, max-snippet:-1');
      res.send(html);
    });

    // ==================== "BEST" MONEY PAGE (highest-volume query) ====================
    app.get('/best-betting-sites', (req, res) => {
      const domain = req.headers.host?.replace(/^www\./, '') || 'vex.deals';
      const domainUrl = `https://${domain}`;
      const lang = getLang(req);
      const profile = getProfile(domain, lang);
      const companies = storage.getCompanies().filter(c => c.is_active !== false);
      const basePath = '/best-betting-sites';
      const count = String(companies.length);
      const T_ = (k: string, vars: Record<string, string> = {}) => tt(k, lang, { brand: profile.brand, count, ...vars });
      const jstr = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');
      const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      const title = T_('best.h1');
      const desc = T_('best.meta_desc');
      const today = new Date().toISOString().split('T')[0];
      const faq = [
        { q: T_('best.faq1q'), a: T_('best.faq1a') },
        { q: T_('best.faq2q'), a: T_('best.faq2a') },
        { q: T_('best.faq3q'), a: T_('best.faq3a') },
      ];
      const cards = companies.map((c, i) => `
      <div class="rank">
        <div class="pos">#${i + 1}</div>
        <div class="body">
          <a class="name" href="/company/${c.id}${langQ(lang)}">${esc(c.name)}</a>
          ${c.badge ? `<span class="badge">${esc(c.badge)}</span>` : ''}
          ${c.bonus_text ? `<span class="bonus">${esc(c.bonus_text)}</span>` : ''}
          ${c.promo_code ? `<div class="promo"><code>${esc(c.promo_code)}</code></div>` : ''}
          <a class="cta" href="/company/${c.id}${langQ(lang)}">${tt('cmp.cta_visit', lang, { name: c.name })}</a>
        </div>
      </div>`).join('\n');

      const html = `<!doctype html>
<html lang="${lang}" dir="${profile.dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)} | ${profile.brand}</title>
  <meta name="description" content="${escAttr(desc)}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="${canonicalUrl(domainUrl, basePath, lang)}" />
${hreflangs(domainUrl, basePath)}
  <meta property="og:title" content="${escAttr(title)}" />
  <meta property="og:description" content="${escAttr(desc)}" />
  <meta property="og:url" content="${domainUrl}${basePath}${langQ(lang)}" />
  <meta property="og:type" content="article" />
${socialMeta(domainUrl, escAttr(title), escAttr(desc))}
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"ItemList","name":"${jstr(title)}","description":"${jstr(desc)}","url":"${domainUrl}${basePath}","numberOfItems":${companies.length},"itemListElement":${JSON.stringify(companies.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, url: `${domainUrl}/company/${c.id}` })))}}</script>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"FAQPage","mainEntity":${JSON.stringify(faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })))}}</script>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"${jstr(tt('nav.home', lang))}","item":"${domainUrl}/"},{"@type":"ListItem","position":2,"name":"${jstr(title)}","item":"${domainUrl}${basePath}"}]}</script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Tahoma,sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.8}
    .container{max-width:900px;margin:0 auto;padding:40px 20px}
    h1{font-size:1.9rem;color:#10b981;margin-bottom:10px}
    h2{font-size:1.4rem;color:#34d399;margin:30px 0 12px;border-bottom:2px solid #1e293b;padding-bottom:8px}
    p{color:#94a3b8;margin-bottom:15px}
    .rank{display:flex;gap:15px;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:16px 18px;margin:10px 0;align-items:flex-start}
    .pos{font-size:1.5rem;font-weight:800;color:#10b981;min-width:48px;text-align:center;background:#0f172a;border-radius:10px;padding:8px 4px}
    .body{flex:1}
    .name{font-size:1.2rem;font-weight:700;color:#e2e8f0;text-decoration:none}
    .name:hover{color:#10b981}
    .badge{display:inline-block;background:#10b981;color:#0f172a;padding:2px 10px;border-radius:20px;font-size:0.75rem;font-weight:bold;margin-left:8px;vertical-align:middle}
    .bonus{display:block;color:#34d399;margin-top:4px;font-size:0.95rem}
    .promo{margin-top:8px}
    .promo code{background:#0f172a;color:#10b981;padding:4px 12px;border-radius:6px;font-weight:bold;letter-spacing:2px}
    .cta{display:inline-block;margin-top:10px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:9px 20px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:0.9rem}
    .faq{background:#1e293b;padding:15px 18px;border-radius:10px;margin:10px 0}
    .faq strong{color:#34d399;display:block;margin-bottom:6px}
    .langbar{display:flex;gap:10px;flex-wrap:wrap;font-size:0.85rem;margin-bottom:20px}
    .langbar a{color:#94a3b8;text-decoration:none}
    .langbar a.active,.langbar a:hover{color:#10b981}
    footer{text-align:center;padding:30px;color:#94a3b8;font-size:0.85rem;border-top:1px solid #1e293b;margin-top:40px}
  </style>
  ${siteSchemaTag(domainUrl, profile)}</head>
<body>
  <div class="container">
    <nav class="langbar">
      ${LANGS.map(l => `<a href="${basePath}${langQ(l)}" hreflang="${l}" class="${l === lang ? 'active' : ''}">${l.toUpperCase()}</a>`).join('      ')}
    </nav>
    <h1>🏆 ${title}</h1>
    <p>${T_('best.intro')}</p>
    <p style="font-size:0.85rem;color:#94a3b8;">${T_('best.updated')} ${today}</p>

    <h2>🥇 ${T_('best.rank_title')}</h2>
    ${cards}

    <h2>❓ FAQ</h2>
    ${faq.map(f => `<div class="faq"><strong>${tt('faq.q_prefix', lang)} ${esc(f.q)}</strong>${esc(f.a)}</div>`).join('\n    ')}
  </div>
  <footer>
    <p>© 2026 ${profile.brand} — ${profile.tagline} | <a href="${domainUrl}" style="color:#10b981;">${domain}</a></p>
    <p style="font-size:0.8rem;">${trustLinks(lang)}</p>
  </footer>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Robots-Tag', 'index, follow, max-snippet:-1');
      res.send(html);
    });

    app.get('/companies', (req, res) => renderHub('companies', req, res));
    app.get('/guides', (req, res) => renderHub('guides', req, res));

    // ==================== NEWS HUB + ARTICLE PAGES (SSR, auto-fed by news_watcher) ====================
    const newsEsc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const newsTitleOf = (n: SportsNewsItem, lang: Lang) => lang === 'ar' ? n.title : (n.titleEn || n.title);
    const newsSummaryOf = (n: SportsNewsItem, lang: Lang) => lang === 'ar' ? n.summary : (n.summaryEn || n.summary);
    const newsBodyOf = (n: SportsNewsItem, lang: Lang): string[] => {
      const body = lang === 'ar' ? n.body : (n.bodyEn || n.body);
      return Array.isArray(body) && body.length ? body : [];
    };
    const newsDate = (iso: string, lang: Lang): string => {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso; // static seed stores human relative strings
      try {
        return d.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
      } catch {
        return iso;
      }
    };
    const newsTopNav = (lang: Lang): string => `<nav class="topnav">
    <a href="/${langQ(lang)}">${tt('nav.home', lang)}</a>
    <a href="/companies${langQ(lang)}">${tt('nav.companies', lang)}</a>
    <a href="/guides${langQ(lang)}">${tt('hub.guides_h1', lang)}</a>
    <a href="/news${langQ(lang)}">${tt('news.h1', lang)}</a>
    <a href="/best-betting-sites${langQ(lang)}">${tt('link.best', lang)}</a>
  </nav>`;
    const newsLangBar = (pagePath: string, lang: Lang): string => `<nav class="langbar">
      ${LANGS.map(l => `<a href="${pagePath}${langQ(l)}" hreflang="${l}" class="${l === lang ? 'active' : ''}">${l.toUpperCase()}</a>`).join('      ')}
    </nav>`;
    const newsFooter = (domainUrl: string, domain: string, profile: Profile, lang: Lang): string => `<footer>
    <p>&copy; 2026 ${profile.brand} — ${profile.tagline} | <a href="${domainUrl}" style="color:#10b981;">${domain}</a></p>
    <div style="margin-top:8px;font-size:0.8rem;">${trustLinks(lang)}</div>
  </footer>`;

    app.get('/news', (req, res) => {
      const domain = req.headers.host?.replace(/^www\./, '') || 'vex.deals';
      const domainUrl = `https://${domain}`;
      const lang = getLang(req);
      const profile = getProfile(domain, lang);
      const pagePath = '/news';
      const all = getNewsItems();
      const perPage = 24;
      const totalPages = Math.max(1, Math.ceil(all.length / perPage));
      const page = Math.min(Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1), totalPages);
      const items = all.slice((page - 1) * perPage, page * perPage);
      const pageQ = (p: number): string => {
        const parts: string[] = [];
        if (p > 1) parts.push(`page=${p}`);
        if (lang !== 'ar') parts.push(`lang=${lang}`);
        return parts.length ? `?${parts.join('&')}` : '';
      };

      const h1 = tt('news.h1', lang);
      const desc = tt('news.desc', lang);
      const pageTitle = `${h1} | ${profile.brand}`;
      const note = tt('news.updated', lang, { date: newsDate(getNewsUpdatedAt(), lang) });
      const robots = page > 1 ? 'noindex,follow' : 'index, follow, max-snippet:-1, max-image-preview:large';

      const cards = items.map(n => `<a class="card" href="/news/${newsSlug(n)}${langQ(lang)}">
      <div class="thumb">${n.imageUrl ? `<img src="${newsEsc(n.imageUrl)}" alt="${newsEsc(newsTitleOf(n, lang))}" loading="lazy" referrerpolicy="no-referrer" />` : ''}<span class="cat">${newsEsc(n.category)}</span></div>
      <div class="body">
        <div class="meta"><span class="src">${newsEsc(n.source)}</span><span class="date">${newsEsc(newsDate(n.publishedAt, lang))}</span></div>
        <h2>${newsEsc(newsTitleOf(n, lang))}</h2>
        <p>${newsEsc(newsSummaryOf(n, lang))}</p>
      </div>
    </a>`).join('\n');

      const pager = totalPages > 1 ? `<div class="pager">
      ${page > 1 ? `<a href="/news${pageQ(page - 1)}">${tt('news.prev', lang)}</a>` : '<span></span>'}
      <span class="pginfo">${page} / ${totalPages}</span>
      ${page < totalPages ? `<a href="/news${pageQ(page + 1)}">${tt('news.next', lang)}</a>` : '<span></span>'}
    </div>` : '';

      const empty = all.length === 0 ? `<p class="empty">${tt('news.empty', lang)}</p>` : '';
      const ld = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: pageTitle,
        description: desc,
        url: `${domainUrl}${pagePath}`,
        inLanguage: lang,
        isPartOf: { '@id': `${domainUrl}/#website` },
        publisher: { '@id': `${domainUrl}/#organization` },
        dateModified: getNewsUpdatedAt(),
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: all.slice(0, 30).map((n, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${domainUrl}/news/${newsSlug(n)}`,
            name: newsTitleOf(n, lang),
          })),
        },
      });
      const breadcrumbLd = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: tt('nav.home', lang), item: `${domainUrl}/` },
          { '@type': 'ListItem', position: 2, name: h1, item: `${domainUrl}${pagePath}` },
        ],
      });

      const html = `<!doctype html>
<html lang="${lang}" dir="${profile.dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${newsEsc(pageTitle)}</title>
  <meta name="description" content="${newsEsc(desc)}" />
  <meta name="robots" content="${robots}" />
  <link rel="canonical" href="${canonicalUrl(domainUrl, pagePath, lang)}" />
${page === 1 ? hreflangs(domainUrl, pagePath) : ''}
  <meta property="og:title" content="${newsEsc(pageTitle)}" />
  <meta property="og:description" content="${newsEsc(desc)}" />
  <meta property="og:url" content="${domainUrl}${pagePath}${langQ(lang)}" />
  <meta property="og:type" content="website" />
${socialMeta(domainUrl, newsEsc(pageTitle), newsEsc(desc))}
  <script type="application/ld+json">${ld}</script>
  <script type="application/ld+json">${breadcrumbLd}</script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Tahoma,sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.8}
    .container{max-width:1000px;margin:0 auto;padding:36px 20px}
    .topnav{background:#1e293b;padding:10px 20px;display:flex;gap:15px;flex-wrap:wrap}
    .topnav a{color:#94a3b8;text-decoration:none;font-size:0.9rem}
    .topnav a:hover{color:#10b981}
    h1{font-size:1.9rem;color:#10b981;margin-bottom:8px}
    .desc{color:#94a3b8;margin-bottom:6px}
    .note{color:#64748b;font-size:0.85rem;margin-bottom:22px}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
    .card{display:flex;flex-direction:column;background:#1e293b;border:1px solid #334155;border-radius:14px;overflow:hidden;text-decoration:none;color:#e2e8f0;transition:border-color .15s}
    .card:hover{border-color:#10b981}
    .thumb{position:relative;height:170px;background:#0f172a;overflow:hidden}
    .thumb img{width:100%;height:100%;object-fit:cover}
    .thumb .cat{position:absolute;top:10px;right:10px;background:rgba(16,185,129,.92);color:#042f1e;font-size:0.7rem;font-weight:700;padding:3px 9px;border-radius:8px}
    [dir="rtl"] .thumb .cat{right:auto;left:10px}
    .body{padding:14px 16px 16px}
    .meta{display:flex;justify-content:space-between;gap:8px;font-size:0.75rem;color:#94a3b8;margin-bottom:8px}
    .meta .src{color:#34d399;font-weight:700}
    .card h2{font-size:1rem;line-height:1.5;margin-bottom:8px}
    .card p{font-size:0.85rem;color:#94a3b8;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
    .pager{display:flex;justify-content:space-between;align-items:center;margin-top:26px;gap:10px}
    .pager a{background:#1e293b;border:1px solid #334155;color:#10b981;padding:10px 22px;border-radius:10px;text-decoration:none;font-weight:700}
    .pager a:hover{border-color:#10b981}
    .pginfo{color:#64748b;font-size:0.9rem}
    .empty{color:#94a3b8;background:#1e293b;padding:26px;border-radius:12px;text-align:center}
    .cta{background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:13px 26px;border-radius:12px;text-decoration:none;display:inline-block;font-weight:bold;margin:8px 5px 8px 0}
    .langbar{display:flex;gap:10px;flex-wrap:wrap;font-size:0.85rem;margin-bottom:20px}
    .langbar a{color:#94a3b8;text-decoration:none}
    .langbar a.active,.langbar a:hover{color:#10b981}
    footer{text-align:center;padding:30px;color:#94a3b8;font-size:0.85rem;border-top:1px solid #1e293b;margin-top:40px}
    footer a{color:#94a3b8;text-decoration:none;margin:0 8px}
  </style>
  ${siteSchemaTag(domainUrl, profile)}</head>
<body>
  ${newsTopNav(lang)}
  <div class="container">
    ${newsLangBar(pagePath, lang)}
    <h1>${h1}</h1>
    <p class="desc">${desc}</p>
    <p class="note">${newsEsc(note)}</p>
    ${empty}
    <div class="grid">
    ${cards}
    </div>
    ${pager}
    <div style="margin-top:30px;text-align:center;">
      <a href="/${langQ(lang)}" class="cta">${tt('nav.home', lang)}</a>
      <a href="/predictions${langQ(lang)}" class="cta">${tt('nav.predictions', lang)}</a>
      <a href="/download/apk" class="cta">${tt('cta.download', lang)}</a>
    </div>
  </div>
  ${newsFooter(domainUrl, domain, profile, lang)}
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Robots-Tag', page > 1 ? 'noindex, follow' : 'index, follow, max-snippet:-1, max-image-preview:large');
      res.send(html);
    });

    app.get('/news/:slug', (req, res) => {
      const domain = req.headers.host?.replace(/^www\./, '') || 'vex.deals';
      const domainUrl = `https://${domain}`;
      const lang = getLang(req);
      const profile = getProfile(domain, lang);
      const item = getNewsItems().find(n => newsSlug(n) === req.params.slug);
      if (!item) return send404(res, profile, tt('news.not_found', lang));
      const pagePath = `/news/${newsSlug(item)}`;

      const title = newsTitleOf(item, lang);
      const summary = newsSummaryOf(item, lang);
      const paras = newsBodyOf(item, lang);
      const srcUrl = item.sourceUrl || item.url || '';
      const pageTitle = `${title} | ${profile.brand}`;
      const desc = summary.length > 155 ? summary.slice(0, 152).trimEnd() + '…' : summary;
      const pubIso = item.publishedAt && !isNaN(Date.parse(item.publishedAt)) ? item.publishedAt : '';
      const ogImage = item.imageUrl || `${domainUrl}/share-icon-512.jpg`;

      const newsLd = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'NewsArticle',
            headline: title,
            description: desc,
            image: item.imageUrl ? [item.imageUrl] : [`${domainUrl}/share-icon-512.jpg`],
            ...(pubIso ? { datePublished: pubIso, dateModified: pubIso || undefined } : {}),
            inLanguage: lang,
            articleSection: item.category,
            mainEntityOfPage: `${domainUrl}${pagePath}${langQ(lang)}`,
            author: { '@type': 'Organization', name: profile.brand },
            publisher: { '@id': `${domainUrl}/#organization` },
            ...(srcUrl ? { isBasedOn: srcUrl } : {}),
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: tt('nav.home', lang), item: `${domainUrl}/` },
              { '@type': 'ListItem', position: 2, name: tt('news.h1', lang), item: `${domainUrl}/news` },
              { '@type': 'ListItem', position: 3, name: title, item: `${domainUrl}${pagePath}${langQ(lang)}` },
            ],
          },
        ],
      });

      const bodyHtml = paras.length
        ? paras.filter(p => p !== summary).map(p => `<p>${newsEsc(p)}</p>`).join('\n    ')
        : `<p>${newsEsc(summary)}</p>`;

      const related = getNewsItems().filter(n => newsSlug(n) !== newsSlug(item)).slice(0, 3);
      const relatedHtml = related.length ? `
    <h2>${tt('news.related', lang)}</h2>
    <div class="related">
      ${related.map(n => `<a href="/news/${newsSlug(n)}${langQ(lang)}">${newsEsc(newsTitleOf(n, lang))}</a>`).join('      ')}
    </div>` : '';

      const html = `<!doctype html>
<html lang="${lang}" dir="${profile.dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${newsEsc(pageTitle)}</title>
  <meta name="description" content="${newsEsc(desc)}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="${canonicalUrl(domainUrl, pagePath, lang)}" />
${hreflangs(domainUrl, pagePath)}
  <meta property="og:title" content="${newsEsc(pageTitle)}" />
  <meta property="og:description" content="${newsEsc(desc)}" />
  <meta property="og:url" content="${domainUrl}${pagePath}${langQ(lang)}" />
  <meta property="og:type" content="article" />
  <meta property="og:image" content="${newsEsc(ogImage)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${newsEsc(pageTitle)}" />
  <meta name="twitter:description" content="${newsEsc(desc)}" />
  <meta name="twitter:image" content="${newsEsc(ogImage)}" />
  <script type="application/ld+json">${newsLd}</script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Tahoma,sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.9}
    .container{max-width:800px;margin:0 auto;padding:36px 20px}
    .topnav{background:#1e293b;padding:10px 20px;display:flex;gap:15px;flex-wrap:wrap}
    .topnav a{color:#94a3b8;text-decoration:none;font-size:0.9rem}
    .topnav a:hover{color:#10b981}
    h1{font-size:1.75rem;color:#10b981;margin:14px 0 12px;line-height:1.5}
    h2{font-size:1.25rem;color:#34d399;margin:30px 0 12px;border-bottom:1px solid #1e293b;padding-bottom:8px}
    .crumbs{font-size:0.85rem;color:#64748b;margin-bottom:6px}
    .crumbs a{color:#34d399;text-decoration:none}
    .meta{color:#94a3b8;font-size:0.88rem;margin-bottom:18px}
    .meta .src{color:#34d399;font-weight:700}
    .meta .cat{background:#1e293b;border:1px solid #334155;padding:2px 10px;border-radius:8px;margin-inline-start:6px}
    .hero{width:100%;max-height:380px;object-fit:cover;border-radius:14px;margin-bottom:18px;border:1px solid #1e293b}
    .lead{font-size:1.08rem;color:#e2e8f0;font-weight:600;margin-bottom:14px}
    p{color:#94a3b8;margin-bottom:14px}
    .cta{background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:13px 26px;border-radius:12px;text-decoration:none;display:inline-block;font-weight:bold;margin:10px 0}
    .related{display:flex;flex-direction:column;gap:8px}
    .related a{background:#1e293b;border:1px solid #334155;color:#e2e8f0;padding:13px 16px;border-radius:10px;text-decoration:none;font-size:0.92rem}
    .related a:hover{border-color:#10b981;color:#10b981}
    .langbar{display:flex;gap:10px;flex-wrap:wrap;font-size:0.85rem;margin-bottom:20px}
    .langbar a{color:#94a3b8;text-decoration:none}
    .langbar a.active,.langbar a:hover{color:#10b981}
    footer{text-align:center;padding:30px;color:#94a3b8;font-size:0.85rem;border-top:1px solid #1e293b;margin-top:40px}
    footer a{color:#94a3b8;text-decoration:none;margin:0 8px}
  </style>
  ${siteSchemaTag(domainUrl, profile)}</head>
<body>
  ${newsTopNav(lang)}
  <div class="container">
    ${newsLangBar(pagePath, lang)}
    <p class="crumbs"><a href="/${langQ(lang)}">${tt('nav.home', lang)}</a> › <a href="/news${langQ(lang)}">${tt('news.h1', lang)}</a></p>
    <h1>${newsEsc(title)}</h1>
    <div class="meta"><span class="src">${newsEsc(item.source)}</span> · ${newsEsc(newsDate(item.publishedAt, lang))}${item.category ? `<span class="cat">${newsEsc(item.category)}</span>` : ''}</div>
    ${item.imageUrl ? `<img class="hero" src="${newsEsc(item.imageUrl)}" alt="${newsEsc(title)}" referrerpolicy="no-referrer" />` : ''}
    <p class="lead">${newsEsc(summary)}</p>
    <p class="label" style="color:#34d399;font-size:0.85rem;font-weight:700;">${tt('news.summary', lang)}</p>
    ${bodyHtml}
    ${srcUrl ? `<a class="cta" href="${newsEsc(srcUrl)}" rel="nofollow noopener noreferrer" target="_blank">${tt('news.read_source', lang, { source: item.source })} ↗</a>` : ''}
    ${relatedHtml}
    <div style="margin-top:30px;text-align:center;">
      <a href="/news${langQ(lang)}" class="cta" style="background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid #334155;">${tt('news.all', lang)}</a>
    </div>
  </div>
  ${newsFooter(domainUrl, domain, profile, lang)}
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Robots-Tag', 'index, follow, max-snippet:-1, max-image-preview:large');
      res.send(html);
    });

    // ==================== TRUST / E-E-A-T STATIC PAGES (SSR standalone HTML, 8 languages) ====================
    for (const slug of STATIC_PAGE_SLUGS) {
      app.get(`/${slug}`, (req, res) => {
        const domain = req.headers.host?.replace(/^www\./, '') || 'vex.deals';
        const domainUrl = `https://${domain}`;
        const lang = getLang(req);
        const profile = getProfile(domain, lang);
        const text = STATIC_PAGES[slug][lang];
        const pagePath = `/${slug}`;
        const fill = (s: string) => s.split('{brand}').join(profile.brand);
        const escA = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const title = fill(text.title);
        const desc = fill(text.desc);
        const h1 = fill(text.h1);
        const intro = fill(text.intro);
        const secsHtml = text.secs.map(s =>
          `<h2>${escA(s.h2)}</h2>\n` + s.p.map(p => `<p>${escA(fill(p))}</p>`).join('\n')
        ).join('\n');

        const ld = JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebPage',
              '@id': `${domainUrl}${pagePath}#webpage`,
              url: canonicalUrl(domainUrl, pagePath, lang),
              name: title,
              description: desc,
              inLanguage: lang,
              isPartOf: { '@id': `${domainUrl}/#website` },
              about: { '@id': `${domainUrl}/#organization` },
              dateModified: CONTENT_VERIFIED,
              breadcrumb: { '@id': `${domainUrl}${pagePath}#breadcrumb` },
            },
            {
              '@type': 'BreadcrumbList',
              '@id': `${domainUrl}${pagePath}#breadcrumb`,
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: tt('nav.home', lang), item: `${domainUrl}/` },
                { '@type': 'ListItem', position: 2, name: h1, item: `${domainUrl}${pagePath}${langQ(lang)}` },
              ],
            },
          ],
        });

        const html = `<!doctype html>
<html lang="${lang}" dir="${profile.dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escA(title)} | ${profile.brand}</title>
  <meta name="description" content="${escA(desc)}" />
  <meta name="robots" content="index, follow, max-snippet:-1" />
  <link rel="canonical" href="${canonicalUrl(domainUrl, pagePath, lang)}" />
${hreflangs(domainUrl, pagePath)}
  <meta property="og:title" content="${escA(title)}" />
  <meta property="og:description" content="${escA(desc)}" />
  <meta property="og:url" content="${domainUrl}${pagePath}${langQ(lang)}" />
  <meta property="og:type" content="website" />
${socialMeta(domainUrl, escA(title), escA(desc))}
  <script type="application/ld+json">${ld}</script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Tahoma,sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.9}
    .container{max-width:800px;margin:0 auto;padding:40px 20px}
    h1{font-size:2rem;color:#10b981;margin-bottom:15px}
    h2{font-size:1.4rem;color:#34d399;margin:30px 0 15px;border-bottom:2px solid #1e293b;padding-bottom:8px}
    p{margin-bottom:15px;color:#94a3b8}
    .topnav{background:#1e293b;padding:10px 20px;display:flex;gap:15px;flex-wrap:wrap}
    .topnav a{color:#94a3b8;text-decoration:none;font-size:0.9rem}
    .topnav a:hover{color:#10b981}
    .langbar{display:flex;gap:10px;flex-wrap:wrap;font-size:0.85rem;margin-bottom:20px}
    .langbar a{color:#94a3b8;text-decoration:none}
    .langbar a.active,.langbar a:hover{color:#10b981}
    footer{text-align:center;padding:30px;color:#94a3b8;font-size:0.85rem;border-top:1px solid #1e293b;margin-top:40px}
  </style>
  ${siteSchemaTag(domainUrl, profile)}</head>
<body>
  <nav class="topnav">
    <a href="/${langQ(lang)}">${tt('nav.home', lang)}</a>
    <a href="/companies${langQ(lang)}">${tt('nav.companies', lang)}</a>
    <a href="/guides${langQ(lang)}">${tt('hub.guides_h1', lang)}</a>
    <a href="/best-betting-sites${langQ(lang)}">${tt('link.best', lang)}</a>
  </nav>
  <div class="container">
    <nav class="langbar">
      ${LANGS.map(l => `<a href="${pagePath}${langQ(l)}" hreflang="${l}" class="${l === lang ? 'active' : ''}">${l.toUpperCase()}</a>`).join('      ')}
    </nav>
    <h1>${escA(h1)}</h1>
    <p style="font-size:1.05rem;color:#e2e8f0;">${escA(intro)}</p>
${secsHtml}
    <p style="margin-top:25px;">${trustLinks(lang)}</p>
  </div>
  <footer>
    <p>© 2026 ${profile.brand} — ${profile.tagline} | <a href="${domainUrl}" style="color:#10b981;">${domain}</a></p>
    <p style="font-size:0.8rem;">${trustLinks(lang)}</p>
  </footer>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('X-Robots-Tag', 'index, follow, max-snippet:-1');
        res.send(html);
      });
    }
    // Domain-specific index.html with dynamic SEO tags - MUST be after express.static
    app.get('*', (req, res) => {
      const domain = req.headers.host?.replace(/^www\./, '') || 'vex.deals';
      const domainUrl = `https://${domain}`;
      const lang = getLang(req);
      const profile = getProfile(domain, lang);
      // Real 404 for missing static files (no soft-404 HTML 200 for hashed assets)
      const lastSeg = req.path.split('/').pop() || '';
      if (lastSeg.includes('.')) {
        res.status(404);
        res.setHeader('X-Robots-Tag', 'noindex');
        res.setHeader('Cache-Control', 'public, max-age=300');
        return res.type('text/plain').send('404 Not Found');
      }
      // Real 404 for unknown paths (soft-404s hurt SEO): homepage, admin panel and the
      // vex0.9 SPA tab routes serve index.html — every other unknown URL gets a proper 404
      const SPA_TAB_PATHS = ['/wallets', '/ai-sports', '/referrals', '/transfers', '/activity', '/unlucky-wall', '/lottery', '/legal'];
      const isSpaTab = SPA_TAB_PATHS.includes(req.path);
      if (!isSpaTab && req.path !== '/' && req.path !== '/admin' && !req.path.startsWith('/admin/')) {
        return send404(res, profile);
      }
      const filePath = path.join(distPath, 'index.html');
      let html = fs.readFileSync(filePath, 'utf8');

      // vex0.9 SPA tab routes keep seoEngine's per-route meta injection (same as production today)
      if (isSpaTab) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(renderSeoMetaHead(req, html));
      }

      // Replace all vex.deals references with actual domain
      html = html.replace(/https:\/\/vex\.deals/g, domainUrl);

      // Language-aware document direction
      html = html.replace(/<html lang="[^"]*"/, `<html lang="${lang}" dir="${profile.dir}"`);

      // Domain-specific title + description (avoid duplicate content penalty)
      html = html.replace(/<title>[^<]*<\/title>/,
        `<title>${profile.brand} — ${profile.tagline}</title>`);
      html = html.replace(/<meta name="description" content="[^"]*"\s*\/?>/,
        `<meta name="description" content="${profile.description}" />`);
      html = html.replace(/<meta property="og:title" content="[^"]*"\s*\/?>/,
        `<meta property="og:title" content="${profile.brand} — ${profile.tagline}" />`);
      html = html.replace(/<meta property="og:description" content="[^"]*"\s*\/?>/,
        `<meta property="og:description" content="${profile.description}" />`);

      // hreflang alternates (all 8 languages) — strip static ones from index.html first to avoid duplicates
      html = html.replace(/<link rel="alternate" hreflang=[^>]*\/?>\s*\n?/g, '');
      const homeLinks = LANGS.map(l => `  <link rel="alternate" hreflang="${l}" href="${domainUrl}/${langQ(l)}" />`).join('\n')
        + `\n  <link rel="alternate" hreflang="x-default" href="${domainUrl}/" />`;
      html = html.replace('</head>', `${homeLinks}\n  </head>`);

      // Canonical points to this language variant
      html = html.replace(/<link rel="canonical"[^>]*\/?>/,
        `<link rel="canonical" href="${domainUrl}/${langQ(lang)}" />`);

      // Unique visible SEO block (different visible text per domain + language)
      const seoBlock = `
    <section style="max-width:900px;margin:0 auto;padding:40px 20px;font-family:sans-serif;color:#e2e8f0;background:#0f172a;" lang="${lang}">
      <h1 style="color:#10b981;font-size:1.8rem;">${profile.h1}</h1>
      <p style="line-height:1.9;color:#94a3b8;margin-top:15px;">${profile.intro}</p>
      <h2 style="color:#34d399;font-size:1.2rem;margin-top:25px;">${profile.tagline} — ${tt('home.what_you_get', lang)}</h2>
      <ul style="line-height:2;color:#94a3b8;padding-right:20px;">
        <li>${tt('home.b1', lang)}</li>
        <li>${tt('home.b2', lang)}</li>
        <li>${tt('home.b3', lang)}</li>
        <li>${tt('home.b4', lang)}</li>
        <li>${tt('home.b5', lang)}</li>
      </ul>
      <h2 style="color:#34d399;font-size:1.2rem;margin-top:25px;">${tt('home.faq_title', lang)}</h2>
      ${[1, 2, 3, 4].map(i => `<p style="margin-top:14px;line-height:1.8;"><strong style="color:#e2e8f0;">${tt(`home.faq${i}q`, lang)}</strong><br /><span style="color:#94a3b8;">${tt(`home.faq${i}a`, lang)}</span></p>`).join('\n      ')}
      <p style="color:#94a3b8;font-size:0.9rem;margin-top:15px;">
        ${tt('home.keywords_label', lang)}: <a href="${domainUrl}/guides/claim-compensation${langQ(lang)}" style="color:#10b981;">${tt('link.guide_comp', lang)}</a> |
        <a href="${domainUrl}/guides/ai-predictions-guide${langQ(lang)}" style="color:#10b981;">${tt('link.guide_ai', lang)}</a> |
        <a href="${domainUrl}/guides/provably-fair-lottery${langQ(lang)}" style="color:#10b981;">${tt('link.guide_lottery', lang)}</a> |
        <a href="${domainUrl}/guides/1xbet-bonus-promo-guide${langQ(lang)}" style="color:#10b981;">${tt('link.guide_1xbet', lang)}</a> |
        <a href="${domainUrl}/guides/betting-wallet-tracking-guide${langQ(lang)}" style="color:#10b981;">${tt('link.guide_wallet', lang)}</a> |
        <a href="${domainUrl}/guides/betting-odds-explained${langQ(lang)}" style="color:#10b981;">${tt('link.guide_odds', lang)}</a> |
        <a href="${domainUrl}/guides/bankroll-management-guide${langQ(lang)}" style="color:#10b981;">${tt('link.guide_bankroll', lang)}</a> |
        <a href="${domainUrl}/guides/live-betting-guide${langQ(lang)}" style="color:#10b981;">${tt('link.guide_live', lang)}</a> |
        <a href="${domainUrl}/guides/responsible-gambling-guide${langQ(lang)}" style="color:#10b981;">${tt('link.guide_responsible', lang)}</a> |
        <a href="${domainUrl}/compare${langQ(lang)}" style="color:#10b981;">${tt('link.compare', lang)}</a> |
        <a href="${domainUrl}/best-betting-sites${langQ(lang)}" style="color:#10b981;">${tt('link.best', lang)}</a> |
        <a href="${domainUrl}/companies${langQ(lang)}" style="color:#10b981;">${tt('hub.companies_h1', lang)}</a> |
        <a href="${domainUrl}/guides${langQ(lang)}" style="color:#10b981;">${tt('hub.guides_h1', lang)}</a>
      </p>
      <nav style="margin-top:12px;font-size:0.9rem;">
        ${LANGS.map(l => `<a href="${domainUrl}/${langQ(l)}" hreflang="${l}" style="color:${l === lang ? '#10b981' : '#94a3b8'};text-decoration:none;display:inline-block;padding:6px 8px;margin:0 4px;min-width:24px;min-height:24px;text-align:center;">${l.toUpperCase()}</a>`).join('')}
      </nav>
      <p style="margin-top:6px;font-size:0.85rem;">${trustLinks(lang)}</p>
    </section>`;
      // Inject inside #root so React's initial render replaces it in place
      // (avoids pushing the section down = CLS 1.0 layout shift)
      html = html.replace('<div id="root"></div>', `<div id="root">${seoBlock}</div>`);

      // Inject GEO engine verification metas
      const gscMeta = `
    <!-- GEO: AI Engine Verification -->
    <meta name="bot" content="index, follow, ai-answer-engine-optimized" />
    <meta name="ai-content-declaration" content="VEX Deals loyalty compensation platform" />`;
      html = html.replace('</head>', `${gscMeta}\n  </head>`);

      // Inject Organization + Breadcrumb + Speakable schema
      const orgSchema = `
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": "${domainUrl}/#organization",
      "name": "${profile.brand}",
      "url": "${domainUrl}",
      "logo": "${domainUrl}/icon-192.svg",
      "description": "${profile.description}",
      "sameAs": ["${domainUrl}"],
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer support",
        "availableLanguage": ["Arabic", "English", "Spanish", "Russian", "French", "German", "Turkish", "Portuguese"]
      },
      "areaServed": ["EG", "SA", "AE", "MA", "DZ", "TN", "US", "GB", "RU", "ES"],
      "knowsLanguage": ["ar", "en", "es", "ru", "fr", "de", "tr", "pt"]
    }
    </script>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "${tt('nav.home', lang)}", "item": "${domainUrl}/"},
        {"@type": "ListItem", "position": 2, "name": "${tt('nav.companies', lang)}", "item": "${domainUrl}/companies"},
        {"@type": "ListItem", "position": 3, "name": "${tt('nav.wallets', lang)}", "item": "${domainUrl}/#wallets"},
        {"@type": "ListItem", "position": 4, "name": "${tt('nav.predictions', lang)}", "item": "${domainUrl}/#ai-sports"},
        {"@type": "ListItem", "position": 5, "name": "${tt('nav.lottery', lang)}", "item": "${domainUrl}/#lottery"}
      ]
    }
    </script>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": "${domainUrl}/#webpage",
      "url": "${domainUrl}",
      "name": "${profile.brand} - ${profile.tagline}",
      "description": "${profile.description}",
      "inLanguage": ["ar", "en", "es", "ru", "fr", "de", "tr", "pt"],
      "isPartOf": {"@id": "${domainUrl}/#website"},
      "about": {"@id": "${domainUrl}/#organization"},
      "primaryImageOfPage": "${domainUrl}/icon-512.svg",
      "dateModified": "${CONTENT_VERIFIED}"
    }
    </script>`;
      html = html.replace('</head>', `${orgSchema}\n  </head>`);

      // Performance: preload critical resources
      const perf = `
    <link rel="dns-prefetch" href="https://fonts.googleapis.com">
    <meta http-equiv="x-dns-prefetch-control" content="on">`;
      html = html.replace('</head>', `${perf}\n  </head>`);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Robots-Tag', 'index, follow, max-snippet:-1, max-image-preview:large');
      res.send(html);
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`VEX Deals Full-Stack Server with Socket.io running at http://0.0.0.0:${PORT}`);
    startDockerNotificationWorker();
    if (telegramConfig.bot_token && telegramConfig.is_active) {
      startTelegramPolling();
    }
  });
}

setupServer();
