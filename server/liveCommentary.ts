import * as fs from 'fs';
import * as path from 'path';
import { channelsStore, ChannelProfile } from './channelsStore';
import { publishToCategory } from './agentPipeline';
import { generateWithFailover } from './agentEngine';

// =========================================================================
// Live Commentary Agent — follows live matches (ESPN scoreboard) and publishes
// goal / halftime / full-time posts in an excited commentator voice, routed to
// the sports channels whose topics match the match's sport. Betting channels
// get the brand signature; normal-news channels get the plain commentary.
// First sighting of a match only records a baseline (no false "goal" posts).
// =========================================================================

type Sport = 'football' | 'basketball';

interface TrackedEvent {
  sport: Sport;
  league: string;
  home: string;
  away: string;
  hs: number;
  as: number;
  phase: string; // kickoff | halftime | play | final
  firstSeen: number;
  lastPostAt: number;
  posts: number;
  done: boolean;
}

const TRACKER_PATH = path.join(process.cwd(), 'data', 'live_tracker.json');
const POLL_MS = 100 * 1000;
const EVENT_COOLDOWN_MS = 30 * 1000;
const MAX_POSTS_PER_POLL = 6;
const LIVE_OVERFLOW = 4; // extra daily telegram slots for time-sensitive live posts
const MAX_TRACK_AGE_MS = 3 * 24 * 3600 * 1000;

let timer: NodeJS.Timeout | null = null;
let running = false;
let emitFn: ((event: string, payload: any) => void) | null = null;

export function initLiveCommentary(opts: { emit?: (event: string, payload: any) => void }): void {
  emitFn = opts.emit || null;
}

function readTracker(): Record<string, TrackedEvent> {
  try {
    if (fs.existsSync(TRACKER_PATH)) {
      const data = JSON.parse(fs.readFileSync(TRACKER_PATH, 'utf-8'));
      return data && typeof data === 'object' ? data : {};
    }
  } catch (err: any) {
    console.warn('[Live] tracker load failed:', err.message);
  }
  return {};
}

function writeTracker(t: Record<string, TrackedEvent>): void {
  const cutoff = Date.now() - MAX_TRACK_AGE_MS;
  const pruned: Record<string, TrackedEvent> = {};
  for (const [k, v] of Object.entries(t)) {
    if (v.firstSeen > cutoff) pruned[k] = v;
  }
  fs.mkdirSync(path.dirname(TRACKER_PATH), { recursive: true });
  fs.writeFileSync(TRACKER_PATH, JSON.stringify(pruned, null, 2), 'utf-8');
}

function etDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
}

async function fetchBoard(sport: Sport, date: string): Promise<any[]> {
  const path1 =
    sport === 'football'
      ? `soccer/all/scoreboard?dates=${date}`
      : `basketball/nba/scoreboard?dates=${date}`;
  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${path1}`, {
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const data: any = await res.json();
    return Array.isArray(data?.events) ? data.events : [];
  } catch {
    return [];
  }
}

interface LiveFixture {
  id: string;
  sport: Sport;
  league: string;
  home: string;
  away: string;
  hs: number;
  as: number;
  state: string; // pre | in | post
  phase: string; // kickoff | halftime | play | final
  detail: string;
}

function parseEvent(ev: any, sport: Sport): LiveFixture | null {
  if (!ev?.id) return null;
  const st = ev.status?.type || {};
  const state = st.state || 'pre';
  const detail = `${st.detail || ''} ${st.shortDetail || ''}`.trim();
  const comps = ev.competitions?.[0]?.competitors || [];
  const home = comps.find((c: any) => c.homeAway === 'home');
  const away = comps.find((c: any) => c.homeAway === 'away');
  if (!home || !away) return null;

  let phase: TrackedEvent['phase'] = 'play';
  if (state === 'post') phase = 'final';
  else if (/half\s*time|halftime|half-time/i.test(detail)) phase = 'halftime';
  else if (state === 'pre') phase = 'kickoff';

  return {
    id: String(ev.id),
    sport,
    league: ev.league?.name || ev.season?.slug || ev.seasonType?.name || '',
    home: home.team?.displayName || 'Home',
    away: away.team?.displayName || 'Away',
    hs: Number(home.score || 0),
    as: Number(away.score || 0),
    state,
    phase,
    detail,
  };
}

const COMMENTARY_SYSTEM = `أنت معلّق رياضي محترف تكتب "تعليق مباشر" لقنوات تيليجرام.
- عربي فصحى حماسي، 2 إلى 5 أسطر، مناسب للنشر لحظياً.
- اذكر الفرق والنتيجة الحالية بدقة من المعطيات فقط، ولا تخترع أحداثاً ولا زمناً ولا مصطلحات غير مذكورة.
- حسب الحدث:
  * هدف: افتح بـ "⚽ هدف!" مع شغف، ثم الفريق المسجّل والنتيجة.
  * شوط أول: "⏸ نهاية الشوط الأول..." مع تلخيص النتيجة.
  * نهاية المباراة: "🏁 نهاية المباراة..." مع النتيجة النهائية.
- بدون أي ذكر للمراهنة أو الروابط أو التوقيعات — المعلّق فقط.`;

async function buildCommentary(fx: LiveFixture, kind: 'goal' | 'ht' | 'ft'): Promise<string> {
  const eventLine =
    kind === 'goal'
      ? `حدث: هدف — ${fx.detail || 'الدقيقة الحالية'}`
      : kind === 'ht'
        ? 'حدث: نهاية الشوط الأول'
        : 'حدث: نهاية المباراة';
  const facts = `${fx.league}\n${fx.home} ${fx.hs} - ${fx.as} ${fx.away}\n${eventLine}`;

  try {
    const raw = await generateWithFailover(`${facts}`, COMMENTARY_SYSTEM, 0.8);
    if (raw && raw.trim().length > 20 && raw.trim().length < 1500) {
      return raw.trim().replace(/^```[\w]*\n?|```$/g, '').slice(0, 3800);
    }
  } catch {
    /* fall through to template */
  }

  const score = `${fx.home} ${fx.hs}-${fx.as} ${fx.away}`;
  if (kind === 'goal') return `⚽ هدف! ${score}\n🔥 ${fx.league} — ${fx.detail || 'لحظة حاسمة'}`;
  if (kind === 'ht') return `⏸ نهاية الشوط الأول\n${score}\n${fx.league}`;
  return `🏁 نهاية المباراة\n${score}\n${fx.league}`;
}

function channelRelevant(ch: ChannelProfile, sport: Sport): boolean {
  if (ch.category !== 'sports') return false;
  if (ch.topics.length === 0) return true;
  return ch.topics.some(
    (t) => t === sport || t === 'live' || t === 'all' || t === 'news' || t === 'general'
  );
}

export async function runLivePass(trigger: 'boot' | 'schedule' = 'schedule'): Promise<{ posts: number; events: number }> {
  if (running) return { posts: 0, events: 0 };
  running = true;
  let posts = 0;
  let events = 0;
  try {
    const [yF, tF, yB, tB] = await Promise.all([
      fetchBoard('football', etDate(-1)),
      fetchBoard('football', etDate(0)),
      fetchBoard('basketball', etDate(-1)),
      fetchBoard('basketball', etDate(0)),
    ]);
    const fixtures: LiveFixture[] = [];
    const seen = new Set<string>();
    for (const [list, sport] of [
      [yF, 'football'],
      [tF, 'football'],
      [yB, 'basketball'],
      [tB, 'basketball'],
    ] as Array<[any[], Sport]>) {
      for (const ev of list) {
        const fx = parseEvent(ev, sport);
        if (fx && !seen.has(fx.id)) {
          seen.add(fx.id);
          fixtures.push(fx);
        }
      }
    }

    const tracker = readTracker();
    const now = Date.now();

    for (const fx of fixtures) {
      if (posts >= MAX_POSTS_PER_POLL) break;
      if (fx.state !== 'in') {
        if (fx.state === 'post' && tracker[fx.id] && !tracker[fx.id].done) {
          // final arrived between polls → one FT post
          const t = tracker[fx.id];
          if (now - t.lastPostAt >= EVENT_COOLDOWN_MS) {
            t.hs = fx.hs; t.as = fx.as; t.phase = 'final';
            const text = await buildCommentary(fx, 'ft');
            const tg = await publishToCategory('sports', (ch) => withSignature(ch, text), {
              overflow: LIVE_OVERFLOW,
              filter: (ch) => channelRelevant(ch, fx.sport),
            });
            if (tg.sent > 0) {
              t.lastPostAt = now; t.posts++; t.done = true; posts += tg.sent; events++;
              emitFn?.('live_commentary', { kind: 'ft', match: `${fx.home} ${fx.hs}-${fx.as} ${fx.away}`, sent: tg.sent });
              console.log(`[Live] 🏁 ${fx.home} ${fx.hs}-${fx.as} ${fx.away} → ${tg.sent} channel(s)`);
            }
          }
        }
        continue;
      }

      const tracked = tracker[fx.id];
      if (!tracked) {
        // First sighting: record baseline only (never announce pre-existing goals).
        tracker[fx.id] = {
          sport: fx.sport,
          league: fx.league,
          home: fx.home,
          away: fx.away,
          hs: fx.hs,
          as: fx.as,
          phase: fx.phase,
          firstSeen: now,
          lastPostAt: 0,
          posts: 0,
          done: false,
        };
        continue;
      }

      const scoreChanged = tracked.hs !== fx.hs || tracked.as !== fx.as;
      const reachedHt = tracked.phase !== 'halftime' && fx.phase === 'halftime';
      // Basketball: only halftime + final (a post per basket would flood).
      const worthPosting = scoreChanged || reachedHt;
      if (!worthPosting) continue;
      if (now - tracked.lastPostAt < EVENT_COOLDOWN_MS) continue;

      const kind: 'goal' | 'ht' = scoreChanged ? 'goal' : 'ht';
      if (fx.sport === 'basketball' && kind === 'goal') {
        // Sync score silently — basketball only posts halftime + final.
        tracked.hs = fx.hs;
        tracked.as = fx.as;
        tracked.phase = fx.phase;
        continue;
      }

      const text = await buildCommentary(fx, kind);
      const tg = await publishToCategory('sports', (ch) => withSignature(ch, text), {
        overflow: LIVE_OVERFLOW,
        filter: (ch) => channelRelevant(ch, fx.sport),
      });

      tracked.hs = fx.hs;
      tracked.as = fx.as;
      tracked.phase = fx.phase;
      if (tg.sent > 0) {
        tracked.lastPostAt = now;
        tracked.posts++;
        posts += tg.sent;
        events++;
        emitFn?.('live_commentary', { kind, match: `${fx.home} ${fx.hs}-${fx.as} ${fx.away}`, sent: tg.sent });
        console.log(`[Live] ${kind === 'goal' ? '⚽' : '⏸'} ${fx.home} ${fx.hs}-${fx.as} ${fx.away} → ${tg.sent} channel(s)`);
      }
    }

    writeTracker(tracker);
  } catch (err: any) {
    console.warn('[Live] pass failed:', err.message);
  } finally {
    running = false;
    if (trigger === 'schedule' && (posts > 0 || events > 0)) {
      console.log(`[Live] pass done: ${events} event(s), ${posts} post(s)`);
    }
  }
  return { posts, events };
}

function withSignature(ch: ChannelProfile, text: string): string {
  if (ch.betting_related !== false && ch.brand.signature && !text.includes(ch.brand.signature)) {
    return `${text}\n\n${ch.brand.signature}`;
  }
  return text;
}

export function startLiveCommentary(intervalSeconds = 120): void {
  stopLiveCommentary();
  setTimeout(() => {
    void runLivePass('boot').catch(() => {});
  }, 15 * 1000);
  timer = setInterval(() => {
    void runLivePass('schedule').catch(() => {});
  }, intervalSeconds * 1000);
  timer.unref?.();
  console.log(`[Live] commentary follower active — every ${intervalSeconds}s`);
}

export function stopLiveCommentary(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export function getLiveStatus(): any {
  const tracker = readTracker();
  const tracked = Object.values(tracker);
  return {
    active: timer != null,
    trackedEvents: tracked.filter((t) => !t.done).length,
    finished: tracked.filter((t) => t.done).length,
    totalPosts: tracked.reduce((s, t) => s + (t.posts || 0), 0),
    liveNow: tracked.filter((t) => !t.done).map((t) => `${t.home} ${t.hs}-${t.as} ${t.away}`),
  };
}
