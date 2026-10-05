import { Request, Response, NextFunction } from 'express';

export interface SessionData {
  session_id: string;
  user_id: string;
  created_at: number;
  expires_at: number;
  status: 'pending_telegram' | 'contact_received' | 'verified' | 'code_sent';
  phone_number?: string;
  telegram_username?: string;
  telegram_id?: number;
  code?: string;
  userId?: string;
}

export interface AuthRequiredOptions {
  publicPaths?: string[];
  redirectPath?: string;
  apiMode?: boolean;
}

// Verified sessions live 30 days and slide forward on every authenticated request
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function buildSessionCookie(sessionId: string, secure: boolean): string {
  const parts = [
    `session_id=${encodeURIComponent(sessionId)}`,
    'Path=/',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

function parseCookieHeader(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key && value && !out[key]) {
      try {
        out[key] = decodeURIComponent(value);
      } catch {
        out[key] = value;
      }
    }
  }
  return out;
}

// Search / AI crawlers must always see the real pages (SEO indexability).
// robots.txt explicitly allows these agents, so the gate must not block them.
const CRAWLER_UA_PATTERN =
  /Googlebot|Google-Extended|Storebot-Google|GoogleOther|AdsBot-Google|Mediapartners-Google|Feedfetcher-Google|bingbot|BingPreview|Slurp|DuckDuckBot|Baiduspider|YandexBot|YandexImages|Sogou|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|TelegramBot|Applebot|PerplexityBot|ClaudeBot|Claude-Web|anthropic-ai|GPTBot|ChatGPT-User|OAI-SearchBot|CCBot|Bytespider|PetalBot|Iframely|Embedly|Pinterestbot|Discordbot|redditbot|vkShare/i;

let SESSION_STORE = new Map<string, any>();

export function setSessionStore(store: Map<string, any>) {
  SESSION_STORE = store;
}

function isPublicPath(path: string, publicPaths: string[]): boolean {
  return publicPaths.some(p => {
    if (p.endsWith('*')) return path.startsWith(p.slice(0, -1));
    return path === p || path.startsWith(p + '/');
  });
}

function getSessionIdFromRequest(req: any): string | null {
  const cookies = parseCookieHeader(req.headers?.cookie);
  if (cookies.session_id) return cookies.session_id;
  if (req.headers['x-session-id']) return req.headers['x-session-id'];
  if (req.query?.session_id) return req.query.session_id;
  if (req.body?.session_id) return req.body.session_id;
  return null;
}

function redirectToAuth(req: any, res: Response, redirectPath: string): void {
  const domain = req.geoLocale?.suggestedDomain || 'vex.deals';
  const redirectUrl = redirectPath + '?redirect=' + encodeURIComponent(req.originalUrl || req.url) + '&domain=' + domain;
  res.redirect(302, redirectUrl);
}

export function createAuthRequiredMiddleware(options: AuthRequiredOptions = {}) {
  const {
    publicPaths = [
      '/',
      '/health',
      '/robots.txt',
      '/sitemap.xml',
      '/api/telegram/*',
      '/api/health',
      '/api/telegram/session',
      '/api/telegram/session-status/*',
      '/api/telegram/verify-code',
      '/api/telegram/simulate-contact',
      '/auth-required',
      '/login',
      '/register',
      '/favicon.ico',
      '/icon-*.svg',
      '/icon-*.png',
      '/manifest.json',
      '/sw.js',
      '/offline.html',
      '/_next/*',
      '/static/*',
      '/assets/*',
    ],
    redirectPath = '/auth-required',
    apiMode = false,
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const path = req.path;

      if (isPublicPath(path, publicPaths)) {
        return next();
      }

      const userAgent = String(req.headers['user-agent'] || '');
      if (CRAWLER_UA_PATTERN.test(userAgent)) {
        return next();
      }

      if (
        req.path.startsWith('/_next/') ||
        req.path.startsWith('/static/') ||
        req.path.startsWith('/assets/') ||
        req.path.match(/\.(ico|svg|png|jpg|jpeg|webp|avif|gif|bmp|css|js|mjs|map|tsx|ts|jsx|woff|woff2|ttf|otf|eot|json|xml|txt|html|webmanifest|mp4|webm|pdf)$/i)
      ) {
        return next();
      }

      const sessionId = getSessionIdFromRequest(req);

      if (!sessionId) {
        if (apiMode || req.path.startsWith('/api/')) {
          res.status(401).json({
            error: 'SESSION_REQUIRED',
            message: 'Authentication required. Please log in via Telegram.',
            redirect: '/auth-required',
          });
          return;
        }
        redirectToAuth(req, res, redirectPath);
        return;
      }

      const session = SESSION_STORE.get(sessionId);

      if (!session) {
        if (apiMode || req.path.startsWith('/api/')) {
          res.status(401).json({
            error: 'INVALID_SESSION',
            message: 'Session not found. Please log in again.',
            redirect: '/auth-required',
          });
          return;
        }
        redirectToAuth(req, res, redirectPath);
        return;
      }

      if (Date.now() > session.expires_at) {
        SESSION_STORE.delete(sessionId);
        if (apiMode || req.path.startsWith('/api/')) {
          res.status(401).json({
            error: 'SESSION_EXPIRED',
            message: 'Session expired. Please log in again.',
            redirect: '/auth-required',
          });
          return;
        }
        redirectToAuth(req, res, redirectPath);
        return;
      }

      if (session.status !== 'verified') {
        if (apiMode || req.path.startsWith('/api/')) {
          res.status(403).json({
            error: 'SESSION_NOT_VERIFIED',
            message: 'Session not verified. Please complete Telegram verification.',
            redirect: '/auth-required',
          });
          return;
        }
        redirectToAuth(req, res, redirectPath);
        return;
      }

      // Sliding renewal: verified sessions stay alive while actively used
      const renewalTarget = Date.now() + SESSION_TTL_MS;
      if (session.expires_at < renewalTarget - 60 * 1000) {
        session.expires_at = renewalTarget;
      }

      (req as any).session = session;
      (req as any).sessionId = sessionId;
      (req as any).userId = session.user_id;

      next();
    } catch (e) {
      console.error('[SessionGuard] Error:', e);
      next();
    }
  };
}

export function requireAuth(req: Request, res: Response): boolean {
  const session = (req as any).session;
  if (!session || session.status !== 'verified') return false;
  return true;
}

export function getCurrentUserId(req: Request): string | null {
  return (req as any).session?.user_id || (req as any).userId || null;
}

export function getCurrentSession(req: Request) {
  return (req as any).session;
}
