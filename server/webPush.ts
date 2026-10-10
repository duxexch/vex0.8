// Web Push (VAPID) — real browser push notifications without any external secrets.
// Keys are generated once and stored in data/vapid.json (runtime, gitignored).
import fs from 'fs';
import path from 'path';
import webpush from 'web-push';

const DATA_DIR = path.join(process.cwd(), 'data');
const VAPID_FILE = path.join(DATA_DIR, 'vapid.json');
const SUBS_FILE = path.join(DATA_DIR, 'push_subscriptions.json');

let publicKey: string | null = null;
let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    let keys: { publicKey: string; privateKey: string };
    if (fs.existsSync(VAPID_FILE)) {
      keys = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf-8'));
    } else {
      const generated = webpush.generateVAPIDKeys();
      keys = { publicKey: generated.publicKey, privateKey: generated.privateKey };
      fs.writeFileSync(VAPID_FILE, JSON.stringify(keys, null, 2));
    }
    if (!keys?.publicKey || !keys?.privateKey) return false;
    webpush.setVapidDetails('mailto:admin@vex.deals', keys.publicKey, keys.privateKey);
    publicKey = keys.publicKey;
    configured = true;
    return true;
  } catch (err) {
    console.error('[WebPush] VAPID setup failed:', err);
    return false;
  }
}

function readSubs(): any[] {
  try {
    if (!fs.existsSync(SUBS_FILE)) return [];
    const parsed = JSON.parse(fs.readFileSync(SUBS_FILE, 'utf-8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSubs(list: any[]): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(SUBS_FILE, JSON.stringify(list.slice(-500), null, 2));
  } catch (err) {
    console.error('[WebPush] save subscriptions failed:', err);
  }
}

export function getVapidPublicKey(): string | null {
  return ensureConfigured() ? publicKey : null;
}

export function addSubscription(sub: any): boolean {
  if (!sub || typeof sub.endpoint !== 'string' || !sub.endpoint.startsWith('http')) return false;
  if (!sub.keys || typeof sub.keys.p256dh !== 'string' || typeof sub.keys.auth !== 'string') return false;
  const list = readSubs().filter((s) => s?.endpoint !== sub.endpoint);
  const existing = readSubs().find((s) => s?.endpoint === sub.endpoint);
  list.push({
    endpoint: sub.endpoint,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    // Preferred language (from the client's chosen app language) — used to
    // localize push payloads per subscriber.
    lang: typeof sub.lang === 'string' && sub.lang ? sub.lang : existing?.lang,
    createdAt: existing?.createdAt || new Date().toISOString(),
  });
  writeSubs(list);
  return true;
}

export function removeSubscription(endpoint: string): boolean {
  const list = readSubs();
  const next = list.filter((s) => s?.endpoint !== endpoint);
  if (next.length === list.length) return false;
  writeSubs(next);
  return true;
}

export async function sendWebPush(payload: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  /** Per-language variants — delivered according to each subscriber's stored lang */
  translations?: Record<string, { title?: string; body?: string }>;
}): Promise<number> {
  if (!ensureConfigured()) return 0;
  const subs = readSubs();
  if (subs.length === 0) return 0;
  let sent = 0;
  const stale: string[] = [];
  await Promise.all(
    subs.map(async (sub) => {
      try {
        // Pick the subscriber's language (base code too: es-419 → es), fall back to default
        const raw = String(sub.lang || '').toLowerCase();
        const variant =
          (raw && payload.translations?.[raw]) ||
          (raw && payload.translations?.[raw.split('-')[0]]) ||
          undefined;
        const message = JSON.stringify({
          title: variant?.title || payload.title,
          body: variant?.body || payload.body,
          url: payload.url || '/#ai-sports',
          tag: payload.tag || 'site-post',
        });
        await webpush.sendNotification(
          sub,
          message,
          { TTL: 4 * 3600, urgency: 'normal' } as any
        );
        sent++;
      } catch (err: any) {
        const status = err?.statusCode;
        if (status === 404 || status === 410) stale.push(sub.endpoint);
        // 429/5xx: keep subscription, drop message
      }
    })
  );
  if (stale.length > 0) {
    writeSubs(readSubs().filter((s) => !stale.includes(s?.endpoint)));
  }
  return sent;
}
