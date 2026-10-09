import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  availableProviders,
  generateWithFailover,
  extractJsonObject,
  resetChainHealth,
} from './agentEngine';
import { storage } from './storage';
import { CURATED_TEAMS, eloWinProb } from './teamRatings';
import { buildCompactTitle, ParsedPrediction, PredictionRecord } from './predictionParser';
import { channelsStore, ChannelProfile } from './channelsStore';
import { schedulePost } from './postScheduler';
import { sendWebPush } from './webPush';

// =========================================================================
// VEX Forecast Chain — سلسلة توقعات المباريات القادمة (autonomous)
//
//   Fixtures (data/daily_fixtures.json, refreshed every 6h)
//     → Team history (ESPN last-5 results index, 14 days)
//       → Deep LLM analysis (OpenRouter→OpenAI→DeepSeek→Gemini failover)
//         → Publish: site post + prediction record (pending)
//                      + telegram sports channels
//           → ESPN auto-settlement closes the loop (hit/miss series)
//
// Quality gate: no working LLM provider → run held (nothing publishes).
// Dedupe: data/forecast_state.json (one prediction per fixture slug, ever).
// =========================================================================

interface Fixture {
  slug: string;
  home: string; // team key (e.g. 'rma')
  away: string;
  league: string;
  date: string; // YYYY-MM-DD
  kickOff: string; // "19:30 UTC"
}

interface ForecastAnalysis {
  pHome: number;
  pDraw: number;
  pAway: number;
  predictedScore: string;
  confidence: number;
  summary: string;
  keyFactors: string[];
  recommendedPick: string;
  risk: 'low' | 'moderate' | 'high';
  usedLlm: boolean;
}

interface FinishedMatch {
  homeName: string;
  awayName: string;
  home: number;
  away: number;
  date: string;
}

export interface ForecastReport {
  trigger: 'manual' | 'schedule';
  startedAt: string;
  finishedAt: string;
  fixturesFound: number;
  fixturesAnalyzed: number;
  llmUsed: number;
  sitePosts: number;
  tgSent: number;
  /** posts handed to the scheduler (queued for time-spread delivery) */
  tgQueued: number;
  tgFailed: number;
  skippedExisting: number;
  held: boolean;
  errors: string[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const FIXTURES_PATH = path.join(DATA_DIR, 'daily_fixtures.json');
const STATE_PATH = path.join(DATA_DIR, 'forecast_state.json');

const ESPN_SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard';

const MAX_FIXTURES_PER_RUN = 6;
const LOOKAHEAD_MS = 36 * 3600 * 1000; // predict matches kicking off within 36h
const FORM_DAYS = 14; // results index depth
const STATE_MAX_ENTRIES = 500;
/** Extra daily telegram slots beyond the channel cap reserved for predictions
 *  (news consumes the base cap within minutes after UTC midnight; +20 shares a
 *  single daily pool with live/promo so all agent content still flows). */
const FORECAST_TG_OVERFLOW = 20;

let schedulerTimer: NodeJS.Timeout | null = null;
let running = false;
let lastReport: ForecastReport | null = null;
let emitFn: ((event: string, payload: any) => void) | null = null;

export function initForecastChain(opts: { emit?: (event: string, payload: any) => void }): void {
  emitFn = opts.emit || null;
}

// ---------------------------------------------------------------- helpers

function readJson<T>(file: string, fallback: T): T {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch {}
  return fallback;
}

function writeJson(file: string, data: any): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

/** Fixture kickoff as epoch ms (feed gives date + "HH:MM UTC"), or null. */
function kickoffMs(f: Fixture): number | null {
  const m = /^(\d{2}):(\d{2})/.exec(f.kickOff || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) return null;
  if (!m) return Date.parse(`${f.date}T12:00:00Z`);
  return Date.parse(`${f.date}T${m[1]}:${m[2]}:00Z`);
}

/** "الجمعة 9 أكتوبر — 22:30 بتوقيت مكة" (feeds are UTC; مكة = UTC+3). */
function kickoffLabelMecca(f: Fixture): string {
  const ms = kickoffMs(f);
  if (ms == null) return `${f.date} — ${f.kickOff}`;
  const d = new Date(ms + 3 * 3600 * 1000); // shift into UTC+3, read UTC fields
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${AR_DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${AR_MONTHS[d.getUTCMonth()]} — ${hh}:${mm} بتوقيت مكة`;
}

/** Resolve a fixture team key to a canonical display name (ESPN-matching English). */
function teamName(key: string, feedTeams: Record<string, { name: string }>): string {
  return CURATED_TEAMS[key]?.name || feedTeams[key]?.name || key;
}

function teamRating(key: string): number {
  return CURATED_TEAMS[key]?.rating || 1500;
}

// ---------------------------------------------------------------- Stage 1: fixtures

function loadUpcoming(): { fixtures: Fixture[]; feedTeams: Record<string, { name: string }>; skippedExisting: number; error?: string } {
  const state = readJson<{ entries: Record<string, { postId: string; createdAt: string }> }>(STATE_PATH, { entries: {} });
  const file = readJson<{ teams?: Record<string, { name: string }>; fixtures?: Fixture[] }>(FIXTURES_PATH, {});
  if (!file.fixtures || file.fixtures.length === 0) {
    return { fixtures: [], feedTeams: {}, skippedExisting: 0, error: 'daily_fixtures.json missing or empty (ingest runs 4s after boot)' };
  }
  const now = Date.now();
  const horizon = now + LOOKAHEAD_MS;
  const candidates: Fixture[] = [];
  let skippedExisting = 0;
  for (const f of file.fixtures) {
    if (!f || !f.slug) continue;
    if (state.entries[f.slug]) {
      skippedExisting++;
      continue;
    }
    const ms = kickoffMs(f);
    if (ms == null) continue;
    if (ms < now || ms > horizon) continue;
    candidates.push(f);
  }
  candidates.sort((a, b) => (kickoffMs(a) || 0) - (kickoffMs(b) || 0));
  return { fixtures: candidates.slice(0, MAX_FIXTURES_PER_RUN), feedTeams: file.teams || {}, skippedExisting };
}

// ---------------------------------------------------------------- Stage 2: team history (ESPN last-5)

let resultsCache: { fetchedAt: number; matches: FinishedMatch[] } | null = null;

async function fetchResultsIndex(): Promise<FinishedMatch[]> {
  if (resultsCache && Date.now() - resultsCache.fetchedAt < 2 * 3600 * 1000) return resultsCache.matches;
  const matches: FinishedMatch[] = [];
  const days: number[] = [];
  for (let i = 1; i <= FORM_DAYS; i++) days.push(i); // yesterday..N days ago (today added too)
  days.unshift(0);
  // batches of 5 to be polite to ESPN
  for (let i = 0; i < days.length; i += 5) {
    const batch = days.slice(i, i + 5);
    await Promise.all(
      batch.map(async (daysAgo) => {
        try {
          const d = new Date(Date.now() - daysAgo * 24 * 3600 * 1000);
          const dateParam = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
          const resp = await fetch(`${ESPN_SCOREBOARD}?dates=${dateParam}`, {
            headers: { 'User-Agent': 'curl/8.0', Accept: 'application/json' },
            signal: AbortSignal.timeout(15000),
          });
          if (!resp.ok) return;
          const data: any = await resp.json();
          for (const ev of data?.events || []) {
            const comp = ev?.competitions?.[0];
            if (ev?.status?.type?.state !== 'post') continue;
            const home = (comp?.competitors || []).find((c: any) => c.homeAway === 'home');
            const away = (comp?.competitors || []).find((c: any) => c.homeAway === 'away');
            if (!home || !away) continue;
            const hs = parseInt(String(home.score), 10);
            const as = parseInt(String(away.score), 10);
            if (Number.isNaN(hs) || Number.isNaN(as)) continue;
            matches.push({
              homeName: String(home.team?.displayName || ''),
              awayName: String(away.team?.displayName || ''),
              home: hs,
              away: as,
              date: String(ev.date || '').slice(0, 10),
            });
          }
        } catch {}
      })
    );
  }
  resultsCache = { fetchedAt: Date.now(), matches };
  return matches;
}

function teamForm(teamNameEn: string, index: FinishedMatch[]): { text: string; sequence: string; w: number; d: number; l: number; gf: number; ga: number } | null {
  const lower = teamNameEn.toLowerCase();
  const mine = index
    .filter((m) => m.homeName.toLowerCase() === lower || m.awayName.toLowerCase() === lower)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 5);
  if (mine.length === 0) return null;
  let w = 0,
    d = 0,
    l = 0,
    gf = 0,
    ga = 0;
  const seq: string[] = [];
  for (const m of mine) {
    const isHome = m.homeName.toLowerCase() === lower;
    const forGoals = isHome ? m.home : m.away;
    const against = isHome ? m.away : m.home;
    gf += forGoals;
    ga += against;
    if (forGoals > against) {
      w++;
      seq.push('✅');
    } else if (forGoals === against) {
      d++;
      seq.push('🟡');
    } else {
      l++;
      seq.push('❌');
    }
  }
  const text = `آخر ${mine.length}: ✅ ${w} فوز | 🟡 ${d} تعادل | ❌ ${l} خسارة — ${gf} له / ${ga} عليه`;
  return { text, sequence: seq.join(' '), w, d, l, gf, ga };
}

// ---------------------------------------------------------------- Stage 3: analysis (LLM → Elo fallback)

function eloAnalysis(homeKey: string, awayKey: string): ForecastAnalysis {
  const H = teamRating(homeKey);
  const A = teamRating(awayKey);
  const pHome = eloWinProb(H, A);
  const draw = 0.26 - Math.abs(pHome - 0.5) * 0.12;
  const pH = Math.max(0.08, pHome - draw / 2);
  const pA = Math.max(0.08, 1 - pHome - draw / 2);
  const sum = pH + pA;
  const pHomeInt = Math.min(95, Math.max(5, Math.round((pH / sum) * 100)));
  const diff = Math.round((H - A) / 180);
  const homeGoals = Math.max(0, Math.round(1.4 + diff * 0.6));
  const awayGoals = Math.max(0, Math.round(1.2 - diff * 0.6));
  const confidence = Math.round(Math.min(95, 55 + Math.abs(pH - pA) * 90));
  const favorite = pH >= pA ? teamName(homeKey, CURATED_TEAMS) : teamName(awayKey, CURATED_TEAMS);
  return {
    pHome: pHomeInt,
    pDraw: Math.min(40, Math.max(5, Math.round(draw * 100))),
    pAway: 100 - pHomeInt,
    predictedScore: `${homeGoals}-${awayGoals}`,
    confidence,
    summary: `يمنح التصنيف Elo (${H} مقابل ${A}) أفضلية ${pHomeInt >= 100 - pHomeInt ? 'لطيفة لـ' + teamName(homeKey, CURATED_TEAMS) : 'لو ' + teamName(awayKey, CURATED_TEAMS)}، مع تقارب واضح في المستوى بين الطرفين. عامل الأرض والجمهور يميل الميزان قليلاً صاحب الأرض، بينما تعتمد المباراة على الفعالية الهجومية في الثلث الأخير.`,
    keyFactors: [
      `التصنيف Elo: ${teamName(homeKey, CURATED_TEAMS)} ${H} — ${teamName(awayKey, CURATED_TEAMS)} ${A}`,
      'حافز النقاط الثلاث وجدول المباريات',
      'التوازن الدفاعي وخطورة الكرات الثابتة',
    ],
    recommendedPick: `${favorite} فوز أو تعادل`,
    risk: confidence > 78 ? 'low' : confidence > 65 ? 'moderate' : 'high',
    usedLlm: false,
  };
}

const ANALYSIS_SYSTEM = `أنت محلل رياضي محترف لمنصة VEX. حلّل المباراة المطلوبة بناءً حصراً على البيانات المرفقة (فورمة آخر5 مباريات + التصنيف Elo + الموعد) ومعارفك العامة للفريقين.
أرجع JSON فقط بدون أي نص آخر بالصيغة:
{"pHome":<1-99>,"pDraw":<5-40>,"pAway":<1-99>,"predictedScore":"2-1","confidence":<50-95>,"summary":"تحليل تكتيكي3-5 أسطر بالعربية يعتمد على الفورمة والتصنيف المرفقين — لا تخترع إصابات أو أرقاماً غير موجودة","keyFactors":["عامل1","عامل2","عامل3"],"recommendedPick":"توقع استراتيجي واضح بالعربية","risk":"low|moderate|high"}
قواعد: pHome + pAway = 100 بالضبط (التعادل منفصل في pDraw). النتيجة بصيغة أرقام "2-1".`;

async function analyzeFixture(f: Fixture, feedTeams: Record<string, { name: string }>, index: FinishedMatch[]): Promise<ForecastAnalysis> {
  const homeKey = f.home;
  const awayKey = f.away;
  const homeName = teamName(homeKey, feedTeams);
  const awayName = teamName(awayKey, feedTeams);
  const formH = teamForm(homeName, index);
  const formA = teamForm(awayName, index);

  const prompt = `المباراة: ${homeName} × ${awayName}
البطولة: ${f.league}
الموعد: ${kickoffLabelMecca(f)}
التصنيف Elo — ${homeName}: ${teamRating(homeKey)} | ${awayName}: ${teamRating(awayKey)}
فورمة ${homeName}: ${formH ? `${formH.text} | النتائج ${formH.sequence}` : 'غير متاحة'}
فورمة ${awayName}: ${formA ? `${formA.text} | النتائج ${formA.sequence}` : 'غير متاحة'}`;

  try {
    const raw = await generateWithFailover(prompt, ANALYSIS_SYSTEM, 0.5);
    const j = extractJsonObject<any>(raw);
    if (j) {
      let pHome = Math.round(Number(j.pHome));
      let pAway = Math.round(Number(j.pAway));
      if (Number.isFinite(pHome) && Number.isFinite(pAway) && pHome + pAway > 0) {
        const total = pHome + pAway;
        pHome = Math.min(99, Math.max(1, Math.round((pHome / total) * 100)));
        pAway = 100 - pHome;
      } else {
        throw new Error('bad probs');
      }
      const pDrawRaw = Math.round(Number(j.pDraw));
      const pDraw = Number.isFinite(pDrawRaw) && pDrawRaw > 0 ? Math.min(40, Math.max(5, pDrawRaw)) : 25;
      const scoreMatch = /(\d{1,2})\s*[-–:]\s*(\d{1,2})/.exec(String(j.predictedScore || ''));
      const predictedScore = scoreMatch ? `${scoreMatch[1]}-${scoreMatch[2]}` : eloAnalysis(homeKey, awayKey).predictedScore;
      const confidence = Math.min(95, Math.max(50, Math.round(Number(j.confidence) || 70)));
      const summary = String(j.summary || '').trim();
      const keyFactors = Array.isArray(j.keyFactors) ? j.keyFactors.map((x: any) => String(x)).filter(Boolean).slice(0, 4) : [];
      const recommendedPick = String(j.recommendedPick || '').trim();
      const risk = j.risk === 'low' || j.risk === 'high' ? j.risk : 'moderate';
      if (summary.length >= 30 && recommendedPick.length >= 5) {
        return { pHome, pDraw, pAway, predictedScore, confidence, summary, keyFactors, recommendedPick, risk, usedLlm: true };
      }
    }
  } catch (err: any) {
    console.warn('[Forecast] LLM analysis failed → Elo:', err.message);
  }
  return eloAnalysis(homeKey, awayKey);
}

// ---------------------------------------------------------------- Stage 4: publish (site + telegram)

function buildPostText(f: Fixture, homeName: string, awayName: string, a: ForecastAnalysis, formH: { text: string } | null, formA: { text: string } | null): string {
  const lines: string[] = [
    `⚽ ${homeName} × ${awayName}`,
    `🏆 ${f.league} | 📅 ${kickoffLabelMecca(f)}`,
    `🟢 فوز ${homeName}: ${a.pHome}%`,
    `🔵 فوز ${awayName}: ${a.pAway}%`,
    `⚪ التعادل: ${a.pDraw}%`,
    `🎯 النتيجة المتوقعة: ${a.predictedScore} — 📈 الثقة: ${a.confidence}%`,
    '',
    a.summary,
  ];
  if (a.keyFactors.length > 0) {
    lines.push('', '🔑 أهم العوامل:');
    for (const k of a.keyFactors) lines.push(`• ${k}`);
  }
  lines.push('', `💡 التوصية: ${a.recommendedPick} (المخاطرة: ${a.risk === 'low' ? 'منخفضة' : a.risk === 'high' ? 'عالية' : 'متوسطة'})`);
  const formLine = [formH ? `${homeName}: ${formH.text}` : null, formA ? `${awayName}: ${formA.text}` : null].filter(Boolean).join(' | ');
  if (formLine) lines.push(`📋 ${formLine}`);
  lines.push('', '⚠️ توقعات تحليلية للمتابعة (+18) — ليست نصيحة مالية.', 'المصدر: VEX AI Forecast');
  return lines.join('\n');
}

function publishSitePost(
  f: Fixture,
  homeName: string,
  awayName: string,
  a: ForecastAnalysis,
  text: string
): string | null {
  try {
    const pred: ParsedPrediction = {
      homeTeam: homeName,
      awayTeam: awayName,
      pHome: a.pHome,
      pAway: a.pAway,
      predictedScore: a.predictedScore,
      pctSource: 'ai',
    };
    const sha1 = crypto.createHash('sha1').update(`forecast|${f.slug}|${a.predictedScore}`).digest('hex');
    if (storage.findSitePostByHash(sha1)) return null;
    const id = `SP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const post: any = {
      id,
      title: buildCompactTitle(pred, 'ar'),
      text: text.slice(0, 4400),
      excerpt: text.slice(0, 400),
      company: 'VEX',
      lang: 'ar',
      channel: 'forecast-chain',
      messageId: null,
      image: null,
      source: 'forecast_chain',
      externalUrl: null,
      sha1,
      createdAt: new Date().toISOString(),
      sourceText: JSON.stringify({ fixture: f, analysis: a }).slice(0, 4000),
      prediction: {
        ...pred,
        status: 'pending',
        createdAt: new Date().toISOString(),
      } as PredictionRecord,
    };
    storage.addSitePost(post);

    const notif = {
      id: `NOTIF-FORECAST-${Date.now()}`,
      title: post.title,
      message: post.excerpt,
      category: 'ai_prediction' as const,
      timestamp: post.createdAt,
      read: false,
      data: {
        postId: id,
        targetTab: 'ai-sports',
        actionUrl: '/#ai-sports',
        source: 'forecast_chain',
        prediction: true,
        pctSource: pred.pctSource,
      },
    };
    storage.addNotification(notif);
    emitFn?.('notification', notif);
    emitFn?.('site_post_updated', { postId: id, post });
    void sendWebPush({ title: post.title, body: post.excerpt, url: '/#ai-sports', tag: `pred-${id}` }).catch(() => {});
    return id;
  } catch (err: any) {
    console.warn('[Forecast] site post failed:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------- backfill
// If a prediction was created but its telegram send was skipped (daily cap
// already consumed by the news pipeline), retry it on the next run while the
// fixture is still upcoming. Max 3 backfills per run.

/**
 * Predictions target betting-related football channels only — normal-news
 * channels (betting_related === false) receive plain news instead of picks.
 * We hand posts to the scheduler (time-spread + caps/quiet/gaps enforced at
 * dispatch time) rather than blasting immediately.
 */
function predictionTargets(): ChannelProfile[] {
  return channelsStore
    .getAll()
    .filter(
      (c) =>
        c.active &&
        c.category === 'sports' &&
        c.betting_related !== false &&
        (c.topics.length === 0 ||
          c.topics.some((t) => t === 'football' || t === 'all' || t === 'live' || t === 'news' || t === 'general'))
    );
}

function schedulePrediction(text: string, sendAt: number, expiresAt?: number): number {
  const targets = predictionTargets();
  for (const ch of targets) {
    const body =
      ch.brand.signature && !text.includes(ch.brand.signature)
        ? `${text}\n\n${ch.brand.signature}`
        : text;
    schedulePost({
      chat_id: ch.chat_id,
      channelTitle: ch.title,
      text: body,
      parse_mode: 'HTML',
      kind: 'forecast',
      sendAt,
      expiresAt,
      overflow: FORECAST_TG_OVERFLOW,
    });
  }
  return targets.length;
}

async function backfillTelegram(state: { entries: Record<string, any> }, report: ForecastReport): Promise<void> {
  if (process.env.DRY_RUN === '1') return;
  const file = readJson<{ fixtures?: Fixture[] }>(FIXTURES_PATH, {});
  let done = 0;
  for (const [slug, entry] of Object.entries(state.entries)) {
    if (done >= 3) break;
    if (!entry || entry.tgSent) continue;
    if (!entry.postId) {
      entry.tgSent = true;
      continue;
    }
    const fixture = (file.fixtures || []).find((f) => f && f.slug === slug);
    const ms = fixture ? kickoffMs(fixture) : null;
    if (!fixture || ms == null || ms < Date.now()) {
      entry.tgSent = true; // kickoff passed (or fixture gone) — nothing to send
      continue;
    }
    const post = storage.getSitePosts().find((p: any) => p && p.id === entry.postId);
    if (!post || !post.text) continue;
    const queued = schedulePrediction(post.text, Date.now() + 90 * 1000 + done * 45 * 1000, ms);
    if (queued > 0) {
      entry.tgSent = true;
      done++;
      report.tgQueued += queued;
      console.log(`[Forecast] ↻ rescheduled telegram for ${slug} → ${queued} channel(s)`);
    }
  }
}

// ---------------------------------------------------------------- run

export async function runForecastOnce(trigger: 'manual' | 'schedule' = 'schedule'): Promise<ForecastReport> {
  const report: ForecastReport = {
    trigger,
    startedAt: new Date().toISOString(),
    finishedAt: '',
    fixturesFound: 0,
    fixturesAnalyzed: 0,
    llmUsed: 0,
    sitePosts: 0,
    tgSent: 0,
    tgQueued: 0,
    tgFailed: 0,
    skippedExisting: 0,
    held: false,
    errors: [],
  };

  if (running) {
    report.errors.push('forecast already running');
    report.finishedAt = new Date().toISOString();
    return report;
  }
  running = true;
  resetChainHealth();

  try {
    // Quality gate: no configured LLM key → hold (nothing publishes).
    if (availableProviders().length === 0) {
      report.held = true;
      report.errors.push('no LLM provider configured — held');
      console.log('[Forecast] HELD: no LLM provider configured');
      return report;
    }

    const { fixtures, feedTeams, skippedExisting, error } = loadUpcoming();
    report.fixturesFound = fixtures.length;
    report.skippedExisting = skippedExisting;
    if (error) {
      report.errors.push(error);
      console.warn('[Forecast]', error);
      return report;
    }

    // Retry any prediction whose telegram send was skipped (e.g. daily cap hit).
    // Runs even when there are no new fixtures so backfill always progresses.
    const state = readJson<{ entries: Record<string, any> }>(STATE_PATH, { entries: {} });
    await backfillTelegram(state, report);
    writeJson(STATE_PATH, state);

    if (fixtures.length === 0) {
      console.log('[Forecast] no new upcoming fixtures in 36h window');
      return report;
    }

    console.log(`[Forecast] analyzing ${fixtures.length} upcoming fixture(s)…`);
    const index = await fetchResultsIndex();
    let fixtureIdx = 0;

    for (const f of fixtures) {
      try {
        const homeName = teamName(f.home, feedTeams);
        const awayName = teamName(f.away, feedTeams);
        const a = await analyzeFixture(f, feedTeams, index);
        report.fixturesAnalyzed++;
        if (a.usedLlm) report.llmUsed++;

        const formH = teamForm(homeName, index);
        const formA = teamForm(awayName, index);
        const text = buildPostText(f, homeName, awayName, a, formH, formA);

        if (process.env.DRY_RUN === '1') {
          console.log(`[Forecast][DRY_RUN] ${homeName} × ${awayName} → ${a.pHome}/${a.pDraw}/${a.pAway} ${a.predictedScore} (llm=${a.usedLlm})\n${text.slice(0, 300)}…`);
          continue;
        }

        const postId = publishSitePost(f, homeName, awayName, a, text);
        if (postId) report.sitePosts++;

        // Hand every target channel a scheduled slot (spread ~6 min per fixture)
        // — the dispatcher enforces caps/quiet/gaps at send time, and the item
        // cancels itself if the fixture kicks off before delivery.
        const kickMs = kickoffMs(f);
        const queued = schedulePrediction(
          text,
          Date.now() + 2 * 60 * 1000 + fixtureIdx * 6 * 60 * 1000,
          kickMs ?? Date.now() + LOOKAHEAD_MS
        );
        fixtureIdx++;
        report.tgQueued += queued;

        state.entries[f.slug] = {
          postId,
          kickoff: f.date,
          createdAt: new Date().toISOString(),
          pHome: a.pHome,
          pAway: a.pAway,
          predictedScore: a.predictedScore,
          usedLlm: a.usedLlm,
          tgSent: queued > 0,
        };
        // prune old entries
        const keys = Object.keys(state.entries);
        if (keys.length > STATE_MAX_ENTRIES) {
          for (const k of keys.slice(0, keys.length - STATE_MAX_ENTRIES)) delete state.entries[k];
        }
        writeJson(STATE_PATH, state);

        console.log(`[Forecast] ✓ ${homeName} × ${awayName}: ${a.pHome}/${a.pDraw}/${a.pAway} ${a.predictedScore} (llm=${a.usedLlm}) site=${postId ? 'yes' : 'no'} queued=${queued}`);
      } catch (err: any) {
        report.errors.push(`${f.slug}: ${err.message}`);
        console.warn('[Forecast] fixture failed:', f.slug, err.message);
      }
    }
  } finally {
    running = false;
    report.finishedAt = new Date().toISOString();
    lastReport = report;
    console.log(
      `[Forecast] run done (${trigger}): ${report.fixturesAnalyzed}/${report.fixturesFound} analyzed, ${report.llmUsed} llm, site=${report.sitePosts}, tg=${report.tgQueued} scheduled${report.tgFailed ? `, ${report.tgFailed} failed` : ''}${report.held ? ', HELD' : ''}`
    );
  }
  return report;
}

// ---------------------------------------------------------------- status + scheduler

export function getForecastStatus(): any {
  const state = readJson<{ entries: Record<string, any> }>(STATE_PATH, { entries: {} });
  const { fixtures } = loadUpcoming();
  return {
    schedulerActive: schedulerTimer != null,
    running,
    pendingUpcoming: fixtures.length,
    predictedTotal: Object.keys(state.entries).length,
    llmProviders: availableProviders(),
    lastReport,
  };
}

export function startForecastScheduler(intervalHours = 3): void {
  stopForecastScheduler();
  schedulerTimer = setInterval(() => {
    void runForecastOnce('schedule');
  }, intervalHours * 3600 * 1000);
  schedulerTimer.unref?.();
  console.log(`[Forecast] scheduler active — every ${intervalHours}h`);
}

export function stopForecastScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}
