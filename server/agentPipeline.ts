import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { channelsStore, ChannelProfile } from './channelsStore';
import { getNewsScraper, ScrapedArticle } from './newsScraper';
import { fetchPostImage } from './imageFetcher';
import { agentEngine, availableProviders, AIProvider } from './agentEngine';
import { storage } from './storage';

// =========================================================================
// VEX Agent Pipeline — autonomous intelligent publishing.
//
// Chain (each agent passes its task to the next; on failure the SAME stage
// degrades to a fallback implementation so the pipeline never dies):
//   Collector  → Analyzer → Classifier → Generator → Image → Publisher
//   (sources)    (LLM→2nd   (LLM→rules   (LLM→       (article  (telegram
//                 LLM→heur.)  profiles)   template)    →search)   →queue)
// =========================================================================

export type PipelineStage =
  | 'collect' | 'analyze' | 'classify' | 'generate' | 'image' | 'publish';

export interface RawItem {
  id: string;
  kind: 'news' | 'live' | 'captured';
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  imageUrl?: string;
  publishedAt: string;
  categoryKey: string;   // football | basketball | ...
  lang: 'ar' | 'en';
  urgency: 'normal' | 'high'; // live = high
  live?: { home: string; away: string; status: string; score?: string };
}

export interface AnalyzedItem extends RawItem {
  topics: string[];       // football, transfer, injury, live, result, promo...
  entities: string[];     // team names, player names
  imageQuery: string;
}

export interface GeneratedPost {
  chat_id: string;
  channelTitle: string;
  text: string;
  parse_mode: 'HTML' | 'Markdown';
  image?: string | null;
}

export interface PipelineRunReport {
  startedAt: string;
  finishedAt: string;
  itemsCollected: number;
  itemsAnalyzed: number;
  postsGenerated: number;
  postsPublished: number;
  postsQueued: number;
  webPosts: number;
  stages: Array<{ stage: PipelineStage; ok: boolean; fallback: boolean; detail: string }>;
  errors: string[];
}

interface PublishQueueItem {
  id: string;
  chat_id: string;
  channelTitle: string;
  text: string;
  parse_mode: 'HTML' | 'Markdown';
  image?: string | null;
  itemTitle: string;
  attempts: number;
  lastAttempt?: string;
  lastError?: string;
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const PUBLISH_QUEUE_PATH = path.join(DATA_DIR, 'publish_queue.json');
const PIPELINE_STATE_PATH = path.join(DATA_DIR, 'pipeline_state.json');
const CAPTURED_DIR = path.join(DATA_DIR, 'captured');

const ESPN_LIVE_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard';

let schedulerTimer: NodeJS.Timeout | null = null;
let pipelineRunning = false;
let lastReport: PipelineRunReport | null = null;
let emitFn: ((event: string, payload: any) => void) | null = null;

export function initPipeline(opts: { emit?: (event: string, payload: any) => void }): void {
  emitFn = opts.emit || null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/** Providers that failed this run — skipped until the next run resets health. */
let deadProviders = new Set<AIProvider>();

export function resetLLMHealth(): void {
  deadProviders.clear();
}

/**
 * LLM call with full provider failover: OpenRouter → DeepSeek → Gemini.
 * A provider that errors once is skipped for the rest of the run (circuit breaker),
 * so we never burn time re-calling a key without credits.
 */
async function llm(prompt: string, systemInstruction: string, temperature = 0.6): Promise<string | null> {
  const chain = availableProviders().filter((p) => !deadProviders.has(p));
  for (const provider of chain) {
    const res = await agentEngine.generateContent(prompt, { systemInstruction, temperature, provider });
    if (res && res.trim()) return res;
    deadProviders.add(provider);
    console.warn(`[Pipeline] LLM provider failed → circuit-open: ${provider} (remaining: ${chain.filter((p) => !deadProviders.has(p)).join(',') || 'none'})`);
  }
  return null;
}

function stripHtml(v: string): string {
  return v.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Tags Telegram's HTML parse_mode actually accepts. */
const TG_ALLOWED_TAGS = new Set(['b', 'strong', 'i', 'em', 'u', 'ins', 's', 'strike', 'del', 'a', 'code', 'pre', 'blockquote']);

/**
 * Make LLM HTML safe for Telegram HTML parse_mode:
 * block tags/br → newlines, unsupported tags unwrapped, truncated tags removed.
 * Prevents "can't parse entities: Unsupported start tag <p>/<br>" send failures.
 */
function sanitizeTelegramHtml(raw: string): string {
  let t = raw.replace(/\r/g, '');
  t = t.replace(/<\s*(br|hr)\s*\/?\s*>/gi, '\n');
  t = t.replace(/<\s*\/?\s*(p|div|h[1-6]|ul|ol|li|section|article|table|thead|tbody|tr|td|th|figure|figcaption)\b[^>]*>/gi, '\n');
  t = t.replace(/<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/g, (m, tag) => (TG_ALLOWED_TAGS.has(String(tag).toLowerCase()) ? m : ''));
  t = t.replace(/<[^>]*$/, ''); // drop tag truncated by length slicing
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

// ---------------------------------------------------------------------------
// Stage 1 — CollectorAgent (news scraper + ESPN live ticker + browser captures)
// ---------------------------------------------------------------------------

async function fetchLiveMatches(): Promise<RawItem[]> {
  try {
    const now = new Date();
    const dateParam = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
    const resp = await fetch(`${ESPN_LIVE_BASE}?dates=${dateParam}`, {
      headers: { 'User-Agent': 'curl/8.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) throw new Error(`ESPN HTTP ${resp.status}`);
    const data: any = await resp.json();
    const out: RawItem[] = [];
    for (const ev of data?.events || []) {
      const state = ev?.status?.type?.state; // pre | in | post
      if (!state || state === 'post') continue; // finished handled by settlement
      const comp = ev?.competitions?.[0];
      const home = (comp?.competitors || []).find((c: any) => c.homeAway === 'home');
      const away = (comp?.competitors || []).find((c: any) => c.awayAway === 'away' || c.homeAway === 'away');
      if (!home || !away) continue;
      const homeName = String(home.team?.displayName || '');
      const awayName = String(away.team?.displayName || '');
      const detail = String(ev?.status?.type?.detail || '');
      const score = `${home.score ?? 0} - ${away.score ?? 0}`;
      const isLive = state === 'in';
      out.push({
        id: `LIVE-${ev.id}`,
        kind: 'live',
        title: isLive
          ? `⚽ مباشر: ${homeName} × ${awayName} (${score}) — ${detail}`
          : `⚽ قريباً: ${homeName} × ${awayName} — ${detail}`,
        summary: `${homeName} vs ${awayName} | ${detail}${isLive ? ` | النتيجة ${score}` : ''}`,
        source: 'ESPN Live',
        sourceUrl: String(ev.links?.[0]?.href || 'https://www.espn.com/soccer/'),
        publishedAt: new Date().toISOString(),
        categoryKey: 'football',
        lang: 'ar',
        urgency: isLive ? 'high' : 'normal',
        live: { home: homeName, away: awayName, status: detail, score },
      });
    }
    return out;
  } catch (err: any) {
    console.warn('[Collector] ESPN live fetch failed:', err.message);
    return [];
  }
}

async function collectNewsItems(): Promise<RawItem[]> {
  let articles: ScrapedArticle[] = [];
  try {
    articles = await getNewsScraper().scrapeAll();
  } catch (err: any) {
    console.warn('[Collector] news scrape failed:', err.message);
  }
  // Fallback: if scraping returned nothing (site down / blocked), use stored items
  if (articles.length === 0) {
    articles = getNewsScraper().loadExistingNews().slice(0, 40);
    if (articles.length) console.warn(`[Collector] scrape empty → using ${articles.length} stored articles as fallback`);
  }
  return articles.map((a: ScrapedArticle) => ({
    id: a.id,
    kind: 'news' as const,
    title: a.title,
    summary: a.summary || a.title,
    source: a.source,
    sourceUrl: a.sourceUrl,
    imageUrl: a.imageUrl,
    publishedAt: a.publishedAt,
    categoryKey: a.categoryKey,
    lang: a.title.match(/[\u0600-\u06FF]/) ? ('ar' as const) : ('en' as const),
    urgency: 'normal' as const,
  }));
}

function collectCapturedItems(): RawItem[] {
  try {
    if (!fs.existsSync(CAPTURED_DIR)) return [];
    const out: RawItem[] = [];
    for (const f of fs.readdirSync(CAPTURED_DIR).filter((f) => f.endsWith('.json')).slice(-20)) {
      try {
        const c = JSON.parse(fs.readFileSync(path.join(CAPTURED_DIR, f), 'utf-8'));
        if (c && c.title) {
          out.push({
            id: `CAP-${f.replace('.json', '')}`,
            kind: 'captured',
            title: c.title,
            summary: c.summary || c.title,
            source: c.source || 'Browser Capture',
            sourceUrl: c.sourceUrl || '',
            imageUrl: c.imageUrl,
            publishedAt: c.publishedAt || new Date().toISOString(),
            categoryKey: c.categoryKey || 'general',
            lang: c.lang === 'en' ? 'en' : 'ar',
            urgency: c.urgency === 'high' ? 'high' : 'normal',
          });
        }
      } catch {}
    }
    return out;
  } catch {
    return [];
  }
}

async function collectorAgent(): Promise<{ items: RawItem[]; fallback: boolean; detail: string }> {
  const live = await fetchLiveMatches();               // real-time first (live matches)
  const news = await collectNewsItems();               // then scraped news
  const captured = collectCapturedItems();             // then browser captures
  // Priority: live > captured > news; within news newest first. Cap per run.
  // Limit live to 5/run so one flood of live matches can't fill the whole batch.
  news.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
  const items = [...live.slice(0, 5), ...captured, ...news].slice(0, 12);
  const ok = items.length > 0;
  return {
    items,
    fallback: live.length === 0 && news.length === 0 && captured.length > 0,
    detail: ok ? `${live.length} live, ${news.length} news, ${captured.length} captured (processing ${items.length})` : 'no sources returned items',
  };
}

// ---------------------------------------------------------------------------
// Stage 2 — AnalyzerAgent (LLM primary → 2nd LLM → heuristic keyword fallback)
// ---------------------------------------------------------------------------

const ANALYZE_SYSTEM = `أنت محلل محتوى رياضي. ترجع JSON فقط بدون أي نص آخر بالصيغة:
{"topics":["..."],"entities":["..."],"imageQuery":"..."}
- topics ممكن منها: football, basketball, live, result, transfer, injury, preview, promo, lottery, general
- entities: أسماء الفرق/اللاعبين (إن وجدت)
- imageQuery: استعلام بحث صور قصير بالإنجليزية (مثلاً "Real Madrid vs Barcelona")`;

async function analyzeItem(item: RawItem): Promise<AnalyzedItem & { usedLlm: boolean }> {
  const base: AnalyzedItem = {
    ...item,
    topics: [],
    entities: [],
    imageQuery: item.title.replace(/[\u0600-\u06FF:!?؟،.]+/g, ' ').trim().split(/\s+/).slice(0, 6).join(' ') || 'sports news',
  };

  // Live items skip LLM (already classified)
  if (item.kind === 'live') {
    return {
      ...base,
      topics: ['football', 'live'],
      entities: [item.live?.home || '', item.live?.away || ''].filter(Boolean),
      imageQuery: `${item.live?.home || ''} vs ${item.live?.away || ''}`.trim(),
      usedLlm: false,
    };
  }

  try {
    const raw = await llm(
      `العنوان: ${item.title}\nالملخص: ${item.summary}\nالمصدر: ${item.source}`,
      ANALYZE_SYSTEM,
      0.3
    );
    if (raw) {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...base,
          topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 5) : base.topics,
          entities: Array.isArray(parsed.entities) ? parsed.entities.filter(Boolean).slice(0, 8) : [],
          imageQuery: typeof parsed.imageQuery === 'string' && parsed.imageQuery.trim() ? parsed.imageQuery.slice(0, 80) : base.imageQuery,
          usedLlm: true,
        };
      }
    }
  } catch (err: any) {
    console.warn('[Analyzer] LLM failed, using heuristic:', err.message);
  }

  // Heuristic fallback (task continues even with zero LLM availability)
  const text = `${item.title} ${item.summary}`.toLowerCase();
  const topics: string[] = [];
  if (/مباشر|live|minute|\d+'/.test(text)) topics.push('live');
  if (/transfer|انتقال|sign|تعاقد|يوافق/.test(text)) topics.push('transfer');
  if (/injury|إصابة|إيقاف|suspended/.test(text)) topics.push('injury');
  if (/result|نتيجة|فوز|خسارة|فاز|خسر/.test(text)) topics.push('result');
  if (/promo|عرض|بونص|bonus|lottery|قرعة/.test(text)) topics.push('promo');
  if (item.categoryKey === 'football') topics.push('football');
  if (item.categoryKey === 'basketball') topics.push('basketball');
  if (topics.length === 0) topics.push('general');
  return { ...base, topics, usedLlm: false };
}

async function analyzerAgent(items: RawItem[]): Promise<{ items: AnalyzedItem[]; fallback: boolean; detail: string }> {
  const out: AnalyzedItem[] = [];
  let llmUsed = 0;
  for (const item of items.slice(0, 30)) {
    const analyzed = await analyzeItem(item);
    if (analyzed.usedLlm) llmUsed++;
    out.push(analyzed);
  }
  return { items: out, fallback: llmUsed === 0 && out.length > 0, detail: `analyzed ${out.length} items` };
}

// ---------------------------------------------------------------------------
// Stage 3 — ClassifierAgent (LLM channel mapping → rule-based profile matching)
// ---------------------------------------------------------------------------

interface ChannelMatch {
  channel: ChannelProfile;
  reason: string;
}

function ruleClassify(item: AnalyzedItem, channels: ChannelProfile[]): ChannelMatch[] {
  const matches: ChannelMatch[] = [];
  for (const ch of channels) {
    if (ch.category === 'partners') {
      // partner channels take promos + general engagement posts only
      if (item.topics.includes('promo') || item.topics.includes('general') || item.topics.includes('result')) {
        matches.push({ channel: ch, reason: 'partner: promo/general/result' });
      }
      continue;
    }
    if (ch.category === 'sports') {
      const topicHit = item.topics.some((t) => ch.topics.includes(t) || ch.topics.includes('all'));
      const catHit = ch.topics.includes(item.categoryKey);
      if (topicHit || catHit || ch.topics.length === 0) {
        matches.push({ channel: ch, reason: `sports: topics ∩ [${ch.topics.join(',')}]` });
      }
    }
  }
  return matches;
}

async function classifierAgent(items: AnalyzedItem[]): Promise<{ pairs: Array<{ item: AnalyzedItem; matches: ChannelMatch[] }>; fallback: boolean; detail: string }> {
  const channels = channelsStore.getPublishable();
  if (channels.length === 0) return { pairs: [], fallback: false, detail: 'no publishable channels' };

  let llmUsed = 0;
  const pairs: Array<{ item: AnalyzedItem; matches: ChannelMatch[] }> = [];

  for (const item of items.slice(0, 20)) {
    let matches: ChannelMatch[];
    try {
      const chList = channels.map((c) => `${c.chat_id}|${c.category}|${c.title}|topics:${c.topics.join(',')}|${c.betting_related !== false ? 'مراهنة' : 'أخبار-عادية'}`).join('\n');
      const raw = await llm(
        `المحتوى:\nعنوان: ${item.title}\nملخص: ${item.summary}\nالمواضيع: ${item.topics.join(', ')}\n\nالقنوات المتاحة:\n${chList}\n\nأعد JSON فقط: {"chat_ids":["..."]} (اختر فقط القنوات المناسبة تماماً لموضوع المحتوى ومجالها)`,
        'أنت مصنف قنوات. ترجع JSON فقط.',
        0.2
      );
      const jsonMatch = raw?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const ids: string[] = Array.isArray(parsed.chat_ids) ? parsed.chat_ids : [];
        matches = channels.filter((c) => ids.includes(c.chat_id)).map((c) => ({ channel: c, reason: 'llm-classified' }));
        if (matches.length > 0) llmUsed++;
      } else {
        matches = [];
      }
    } catch {
      matches = [];
    }
    if (matches.length === 0) matches = ruleClassify(item, channels); // fallback: profile rules
    if (matches.length > 0) pairs.push({ item, matches });
  }

  return { pairs, fallback: llmUsed === 0, detail: `${pairs.length} items matched to channels` };
}

// ---------------------------------------------------------------------------
// Stage 4 — GeneratorAgent (LLM per-channel post → template fallback)
// ---------------------------------------------------------------------------

function templatePost(item: AnalyzedItem, ch: ChannelProfile): string {
  const betting = ch.betting_related !== false;
  const emoji = ch.brand.emoji === 'rich' ? '⚽ ' : ch.brand.emoji === 'minimal' ? '' : '';
  let text = `${emoji}${item.title}\n\n${stripHtml(item.summary)}`;
  if (item.sourceUrl) text += `\n\nالمصدر: ${item.source}`;
  if (betting && ch.brand.signature) text += `\n\n${ch.brand.signature}`;
  return text.slice(0, 3800);
}

async function generateForChannel(item: AnalyzedItem, ch: ChannelProfile): Promise<{ text: string; usedLlm: boolean }> {
  const isLive = item.topics.includes('live');
  const betting = ch.betting_related !== false;
  const systemPrompt = `أنت كاتب منشورات قنوات تيليجرام رياضية.
القناة: ${ch.title} (نوعها: ${ch.category}، مواضيعها: ${ch.topics.join(', ')})
الهوية التجارية: براند "${ch.brand.company || 'VEX'}" دومين "${ch.brand.domain || 'vex.deals'}" توقيع "${ch.brand.signature || 'none'}"
أسلوب الإيموجي: ${ch.brand.emoji}
الصيغة: ${ch.format} (إن كان html استخدم تنسيق بسيط <b>/<i>/<a>)
${betting
    ? 'القناة مرتبطة بالمراهنة الرياضية: مسموح — وحتى الأفضل — ذكر التوقعات والاحتمالات والأوليات وأسلوب حثّ المتابعة على زيارة الموقع.'
    : 'القناة ليست لها علاقة بالمراهنة (أخبار رياضية عادية): اكتب خبراً رياضياً محايداً ومصفيى تماماً — ممنوع ذكر المراهنة أو الرهانات أو التوقعات أو الأحتماليات أو أوليات أو العروض أو الكاش باك أو أي دعوة للمراهنة.'}
اكتب منشور مناسب لهذه القناة فقط — بنفس مجالها وطابعها، عربي naturally، من 2 إلى 6 أسطر + المصدر.
${isLive ? 'المنشور مباشر — أضف شغف وإلحاح ومنشن للنتيجة الحالية.' : ''}
لا تخترع نتائج أو معلومات غير موجودة في النص. ارجع المنشور فقط.`;

  try {
    const raw = await llm(
      `المحتوى:\nعنوان: ${item.title}\nملخص: ${item.summary}\nالمصدر: ${item.sourceUrl || item.source}\n${item.live ? `مباشر: ${item.live.home} ${item.live.score || ''} ${item.live.away} — ${item.live.status}` : ''}`,
      systemPrompt,
      0.7
    );
    if (raw && raw.trim().length > 20) {
      let text = raw.trim().replace(/^```[\w]*\n?|```$/g, '');
      const safe = sanitizeTelegramHtml(text);
      text = ch.format === 'html' ? safe : safe.replace(/<\/?(?:b|strong|i|em|u|ins|s|strike|del|a|code|pre|blockquote)\b[^>]*>/gi, '');
      if (betting && ch.brand.signature && !text.includes(ch.brand.signature)) text += `\n\n${ch.brand.signature}`;
      return { text: text.slice(0, 3900), usedLlm: true };
    }
  } catch (err: any) {
    console.warn('[Generator] LLM failed, using template:', err.message);
  }
  return { text: templatePost(item, ch), usedLlm: false };
}

async function generatorAgent(pairs: Array<{ item: AnalyzedItem; matches: ChannelMatch[] }>): Promise<{ posts: GeneratedPost[]; fallback: boolean; detail: string }> {
  const posts: GeneratedPost[] = [];
  let llmUsed = 0;
  for (const pair of pairs) {
    for (const m of pair.matches) {
      const { text, usedLlm } = await generateForChannel(pair.item, m.channel);
      if (usedLlm) llmUsed++;
      posts.push({
        chat_id: m.channel.chat_id,
        channelTitle: m.channel.title,
        text,
        parse_mode: m.channel.format === 'html' ? 'HTML' : 'Markdown',
      });
    }
  }
  return {
    posts,
    fallback: posts.length > 0 && llmUsed === 0,
    detail: `${posts.length} posts generated (${llmUsed} via LLM, ${posts.length - llmUsed} template)`,
  };
}

// ---------------------------------------------------------------------------
// Stage 5 — ImageAgent (article image → bing/google search → none)
// ---------------------------------------------------------------------------

async function imageAgent(posts: GeneratedPost[], items: AnalyzedItem[]): Promise<{ posts: GeneratedPost[]; detail: string }> {
  let withImages = 0;
  for (const post of posts.slice(0, 15)) {
    try {
      const related = items.find((i) => post.text.includes(i.title.slice(0, 25))) || items[0];
      if (!related) continue;
      const img = await fetchPostImage(related.imageUrl, related.imageQuery || related.title);
      if (img) {
        post.image = img;
        withImages++;
      }
    } catch (err: any) {
      console.warn('[Image] fetch failed:', err.message);
    }
  }
  return { posts, detail: `${withImages}/${posts.length} posts have images` };
}

// ---------------------------------------------------------------------------
// Stage 6 — PublisherAgent (telegram via publisher bot → retry queue → web)
// ---------------------------------------------------------------------------

function loadQueue(): PublishQueueItem[] {
  return readJson<PublishQueueItem[]>(PUBLISH_QUEUE_PATH, []);
}

function saveQueue(q: PublishQueueItem[]): void {
  writeJson(PUBLISH_QUEUE_PATH, q);
}

export async function sendTelegram(chatId: string, text: string, parseMode: string, imagePath?: string | null): Promise<{ ok: boolean; error?: string }> {
  if (process.env.DRY_RUN === '1') {
    console.log(`[Publisher][DRY_RUN] → ${chatId}: ${text.slice(0, 120).replace(/\n/g, ' ⏎ ')}`);
    return { ok: true };
  }
  const pub = channelsStore.getPublisher();
  const token = pub.bot_token || process.env.TELEGRAM_BOT_TOKEN || '';
  if (!token) return { ok: false, error: 'no publisher bot token configured' };

  try {
    if (imagePath && fs.existsSync(imagePath)) {
      const caption = sanitizeTelegramHtml(text).slice(0, 1024);
      const form = new FormData();
      form.append('chat_id', chatId);
      form.append('caption', caption.replace(/<[^>]*$/, ''));
      form.append('parse_mode', parseMode);
      form.append('photo', new Blob([fs.readFileSync(imagePath)], { type: 'image/jpeg' }), path.basename(imagePath));
      const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: form, signal: AbortSignal.timeout(30000) });
      const data: any = await res.json();
      if (data.ok) return { ok: true };
      // photo rejected (e.g. too long caption / bad parse) → retry as plain text message
      console.warn('[Publisher] sendPhoto failed, retrying as text:', data.description);
    }
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
      signal: AbortSignal.timeout(30000),
    });
    const data: any = await res.json();
    if (data.ok) return { ok: true };
    // parse_mode rejected → last resort: plain text
    if (String(data.description || '').toLowerCase().includes('parse')) {
      const res2 = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: stripHtml(text) }),
        signal: AbortSignal.timeout(30000),
      });
      const data2: any = await res2.json();
      if (data2.ok) return { ok: true };
      return { ok: false, error: data2.description || 'send failed' };
    }
    return { ok: false, error: data.description || 'send failed' };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * Publish one message to every publishable channel of a category (e.g. 'sports').
 * Respects daily caps + quiet hours (getPublishable), records usage, 4s anti-spam
 * gap between sends, failures land in the retry queue. DRY_RUN logs only.
 * Used by the forecast chain (server/forecastChain.ts) so predictions and news
 * share the same caps/queue/bot.
 */
export async function publishToCategory(
  category: ChannelProfile['category'],
  buildText: (ch: ChannelProfile) => string,
  opts?: { max?: number; overflow?: number; filter?: (ch: ChannelProfile) => boolean }
): Promise<{ sent: number; failed: number; channels: string[] }> {
  let all = channelsStore.getPublishable(new Date(), { overflow: opts?.overflow }).filter((c) => c.category === category);
  if (opts?.filter) all = all.filter(opts.filter);
  const targets = opts?.max && opts.max > 0 ? all.slice(0, opts.max) : all;
  let sent = 0;
  let failed = 0;
  const channels: string[] = [];
  for (const ch of targets) {
    const text = buildText(ch);
    const parseMode: 'HTML' | 'Markdown' = ch.format === 'markdown' ? 'Markdown' : 'HTML';
    const result = await sendTelegram(ch.chat_id, text, parseMode);
    if (result.ok) {
      if (process.env.DRY_RUN !== '1') channelsStore.recordPost(ch.chat_id);
      sent++;
      channels.push(ch.title);
      await new Promise((r) => setTimeout(r, 4000));
    } else {
      failed++;
      const q = loadQueue();
      q.push({
        id: `Q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        chat_id: ch.chat_id,
        channelTitle: ch.title,
        text,
        parse_mode: parseMode,
        image: null,
        itemTitle: channels[channels.length - 1] || 'forecast',
        attempts: 1,
        lastAttempt: new Date().toISOString(),
        lastError: result.error,
        createdAt: new Date().toISOString(),
      });
      saveQueue(q);
      console.warn(`[Forecast→TG] queued for retry → ${ch.title}: ${result.error}`);
    }
  }
  return { sent, failed, channels };
}

function publishWeb(item: AnalyzedItem, text: string, image?: string | null): boolean {
  try {
    const plain = stripHtml(text);
    const sha1 = crypto.createHash('sha1').update(`${item.sourceUrl}|${plain.slice(0, 500)}`).digest('hex');
    if (storage.findSitePostByHash(sha1)) return false;

    let imageWeb: string | null = null;
    if (image && fs.existsSync(image)) {
      try {
        const SITE_POSTS_MEDIA_DIR = path.join(process.cwd(), 'data', 'site-posts-media');
        fs.mkdirSync(SITE_POSTS_MEDIA_DIR, { recursive: true });
        const fileName = `SP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        fs.writeFileSync(path.join(SITE_POSTS_MEDIA_DIR, fileName), fs.readFileSync(image));
        imageWeb = `/site-posts-media/${fileName}`;
      } catch {}
    }

    storage.addSitePost({
      id: `SP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: item.title.slice(0, 160),
      text: plain.slice(0, 4400),
      excerpt: plain.slice(0, 400),
      company: 'VEX',
      lang: item.lang,
      channel: 'agent-pipeline',
      messageId: null,
      image: imageWeb,
      source: 'agent_pipeline',
      externalUrl: item.sourceUrl || null,
      sha1,
      createdAt: new Date().toISOString(),
    } as any);
    return true;
  } catch (err: any) {
    console.warn('[Publisher] web post failed:', err.message);
    return false;
  }
}

async function publisherAgent(posts: GeneratedPost[], items: AnalyzedItem[], report: PipelineRunReport): Promise<void> {
  const MIN_GAP_MS = 4000; // anti-spam: global gap between channel posts
  let published = 0;
  let queued = 0;

  for (const post of posts) {
    const item = items.find((i) => post.text.includes(i.title.slice(0, 25))) || items[0];
    const result = await sendTelegram(post.chat_id, post.text, post.parse_mode, post.image);
    if (result.ok) {
      if (process.env.DRY_RUN !== '1') channelsStore.recordPost(post.chat_id);
      published++;
      report.stages.push({ stage: 'publish', ok: true, fallback: false, detail: `→ ${post.channelTitle}` });
      emitFn?.('pipeline_post', { channel: post.channelTitle, title: item?.title || '' });
      await new Promise((r) => setTimeout(r, MIN_GAP_MS));
    } else {
      queued++;
      const q = loadQueue();
      q.push({
        id: `Q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        chat_id: post.chat_id,
        channelTitle: post.channelTitle,
        text: post.text,
        parse_mode: post.parse_mode,
        image: post.image,
        itemTitle: item?.title || '',
        attempts: 1,
        lastAttempt: new Date().toISOString(),
        lastError: result.error,
        createdAt: new Date().toISOString(),
      });
      saveQueue(q);
      report.errors.push(`publish ${post.channelTitle}: ${result.error}`);
      console.warn(`[Publisher] queued for retry → ${post.channelTitle}: ${result.error}`);
    }
  }

  // Web post: one per unique item (first 5)
  let webCount = 0;
  const seen = new Set<string>();
  if (process.env.DRY_RUN === '1') {
    report.stages.push({ stage: 'publish', ok: true, fallback: false, detail: 'DRY_RUN: web publish skipped' });
  }
  for (const post of posts) {
    const item = items.find((i) => post.text.includes(i.title.slice(0, 25)));
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    if (publishWeb(item, post.text, post.image)) webCount++;
    if (seen.size >= 5) break;
  }

  report.postsPublished = published;
  report.postsQueued = queued;
  report.webPosts = webCount;
}

/** Retry previously queued/failed sends (called by scheduler and API). */
export async function processPublishQueue(): Promise<{ sent: number; failed: number }> {
  const q = loadQueue();
  if (q.length === 0) return { sent: 0, failed: 0 };
  const remaining: PublishQueueItem[] = [];
  let sent = 0;
  let failed = 0;
  for (const item of q) {
    if (item.attempts >= 5) {
      failed++;
      continue; // dead letter — drop
    }
    const res = await sendTelegram(item.chat_id, item.text, item.parse_mode, item.image);
    if (res.ok) {
      if (process.env.DRY_RUN !== '1') channelsStore.recordPost(item.chat_id);
      sent++;
      await new Promise((r) => setTimeout(r, 3000));
    } else {
      item.attempts += 1;
      item.lastAttempt = new Date().toISOString();
      item.lastError = res.error;
      remaining.push(item);
      if (item.attempts < 5) await new Promise((r) => setTimeout(r, 2000));
    }
  }
  saveQueue(remaining);
  return { sent, failed };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export async function runPublishPipeline(trigger: 'manual' | 'schedule' | 'live' = 'manual'): Promise<PipelineRunReport> {
  if (pipelineRunning) throw new Error('pipeline already running');
  pipelineRunning = true;
  resetLLMHealth(); // give every configured AI provider a fresh chance this run
  const report: PipelineRunReport = {
    startedAt: new Date().toISOString(),
    finishedAt: '',
    itemsCollected: 0,
    itemsAnalyzed: 0,
    postsGenerated: 0,
    postsPublished: 0,
    postsQueued: 0,
    webPosts: 0,
    stages: [],
    errors: [],
  };

  try {
    // 1. Collect
    const collected = await collectorAgent();
    report.itemsCollected = collected.items.length;
    report.stages.push({ stage: 'collect', ok: collected.items.length > 0, fallback: collected.fallback, detail: collected.detail });
    if (collected.items.length === 0) return finish(report);

    // Dedupe against recently published (pipeline_state)
    const state = readJson<{ publishedIds: string[] }>(PIPELINE_STATE_PATH, { publishedIds: [] });
    const fresh = collected.items.filter((i) => !state.publishedIds.includes(i.id));
    if (fresh.length === 0) {
      report.stages.push({ stage: 'analyze', ok: false, fallback: false, detail: 'all items already published' });
      return finish(report);
    }

    // 2. Analyze
    const analyzed = await analyzerAgent(fresh);
    report.itemsAnalyzed = analyzed.items.length;
    report.stages.push({ stage: 'analyze', ok: analyzed.items.length > 0, fallback: analyzed.fallback, detail: analyzed.detail });

    // 3. Classify
    const classified = await classifierAgent(analyzed.items);
    report.stages.push({ stage: 'classify', ok: classified.pairs.length > 0, fallback: classified.fallback, detail: classified.detail });
    if (classified.pairs.length === 0) return finish(report);

    // 4. Generate
    const generated = await generatorAgent(classified.pairs);
    report.postsGenerated = generated.posts.length;
    report.stages.push({ stage: 'generate', ok: generated.posts.length > 0, fallback: generated.fallback, detail: generated.detail });
    if (generated.posts.length === 0) return finish(report);

    // Quality gate: if every post came from the template fallback (no working LLM),
    // hold the posts instead of publishing low-effort content. They will flow
    // automatically once an AI provider key has credits.
    if (generated.fallback) {
      report.stages.push({
        stage: 'publish',
        ok: false,
        fallback: true,
        detail: 'HELD: no working LLM provider (template-only posts) — add/charge an AI key (OpenRouter / OpenAI / DeepSeek / Gemini) to enable publishing',
      });
      return finish(report);
    }

    // 5. Images
    const imaged = await imageAgent(generated.posts, analyzed.items);
    report.stages.push({ stage: 'image', ok: true, fallback: false, detail: imaged.detail });

    // 6. Publish
    await publisherAgent(imaged.posts, analyzed.items, report);

    // Remember published item ids (keep last 500)
    state.publishedIds = [...fresh.map((i) => i.id), ...state.publishedIds].slice(0, 500);
    writeJson(PIPELINE_STATE_PATH, state);

    return finish(report);
  } catch (err: any) {
    report.errors.push(err.message);
    report.stages.push({ stage: 'collect', ok: false, fallback: false, detail: err.message });
    return finish(report);
  } finally {
    pipelineRunning = false;
  }
}

function finish(report: PipelineRunReport): PipelineRunReport {
  report.finishedAt = new Date().toISOString();
  lastReport = report;
  console.log(`[Pipeline] run done: ${report.itemsCollected} collected → ${report.postsGenerated} posts → ${report.postsPublished} sent, ${report.postsQueued} queued, ${report.webPosts} web`);
  emitFn?.('pipeline_report', report);
  return report;
}

export function getPipelineStatus(): any {
  const pub = channelsStore.getPublisher();
  return {
    running: pipelineRunning,
    lastReport,
    queueSize: loadQueue().length,
    channels: channelsStore.getAll().length,
    activeChannels: channelsStore.getActive().length,
    publisherBot: pub.bot_username ? { username: pub.bot_username, name: pub.bot_name, configured: true } : { configured: false },
    schedulerActive: !!schedulerTimer,
    imageBrowserReady: true,
  };
}

export function startPipelineScheduler(intervalMinutes = 20): void {
  if (schedulerTimer) clearInterval(schedulerTimer);
  console.log(`[Pipeline] scheduler started — every ${intervalMinutes} min (+ queue retries every run)`);
  schedulerTimer = setInterval(async () => {
    try {
      await processPublishQueue();
      await runPublishPipeline('schedule');
    } catch (err: any) {
      if (!String(err.message).includes('already running')) console.error('[Pipeline] scheduled run failed:', err.message);
    }
  }, intervalMinutes * 60 * 1000);
}

export function stopPipelineScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}