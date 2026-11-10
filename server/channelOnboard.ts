import { generateWithFailover, extractJsonObject, availableProviders } from './agentEngine';
import { channelsStore, ChannelProfile } from './channelsStore';
import { parseTmePage } from './channelCampaign';
import { linkifyTgUrls } from './tgFormat';
import { storage } from './storage';

// =========================================================================
// Channel Onboarding Agent — when the publisher bot is added as admin to a
// channel (my_chat_member update), the agent fetches the channel details,
// classifies it (category / topics / betting-vs-news / brand / lang) and
// saves it into the channels store so publishing matches the channel.
// Removing the bot deactivates the channel. Re-adding re-classifies it.
// =========================================================================

let emitFn: ((event: string, payload: any) => void) | null = null;

export function initChannelOnboard(opts: { emit?: (event: string, payload: any) => void }): void {
  emitFn = opts.emit || null;
}

const CLASSIFY_SYSTEM = `أنت عميل تصنيف قنوات تيليجرام لمنصة رياضية. ترجع JSON صالح فقط — بدون markdown وبدون شرح.
الصيغة:
{
  "category": "sports|partners|agents|marketers|payments|support|users",
  "topics": ["football","basketball","live","transfer","promo","lottery","news","payout","users","general"],
  "betting_related": true,
  "lang": "ar|en",
  "dialect": "egyptian|gulf|levantine|maghrebi|msa",
  "tone": "hype|analytical|friendly|formal|playful",
  "content_style": "سطر واحد يصف صيغة المنشورات المثالية لهذه القناة (بنية المنشور، طول الكلام، الإيموجي، هل يستخدم عناوين وقوائم)",
  "daily_cap": 12,
  "brand": {"company":"...","signature":"...","emoji":"rich|minimal|none"},
  "summary": "سطر واحد يصف القناة ونوع جمهورها"
}
القواعد:
- category: sports=محتوى رياضي جماهيري، partners=شركاء ووكلاء عامون، agents=قناة جمهورها وكلاء مراهنات (يُنشر لها محتوى يخص الوكلاء: نسب عمولة، أدوات، إنجازات، تدريب)، marketers=قناة جمهورها مسوقيين/مسوقي أفلييت وصانعين محتوى (محتوى يخصهم: روابط إحالة، حملات، تحسين تحويل)، payments=مدفوعات وسحب وإيداع، support=دعم فني، users=تحديثات مستخدمين.
- افرّق بدقّة: قناة اسمها/وصفها «agents» أو فيها وكلاء = agents، وقناة فيها affiliate أو creator أو marketing أو تسويق = marketers. إن كان الجمهور مختلطًا بين الوكلاء والشركاء اختر agents.
- topics: اختر ما ينطبق فقط من القائمة (3 كحد أقصى). إن لم يتبين ركّز على general/news.
- betting_related: true إذا كانت القناة عن المراهنة الرياضية أو تنشر توقعات/أوليات/كاش باك/عروض كازينو أو روابط مراهنات. false إذا كانت قناة أخبار رياضية عادية بلا أي صلة بالمراهنة.
- dialect: استنتج اللهجة من منشورات القناة نفسها (وليس من الوصف فقط): egyptian=مصري، gulf=خليجي، levantine=شامي، maghrebi=مغاربي، msa=فصحى. للقنوات الإنجليزية اكتب msa.
- tone: نبرة الكتابة الغالبة على القناة.
- content_style: من أمثلة منشوراتها الفعلية — كيف يجب أن يبدو منشورنا ليبدو ابن القناة.
- daily_cap: بين 8 و 16 بحسب حجم نشاط القناة (الافتراضي 12).
- brand.signature: توقيع/CTA مناسب بنفس لغة ولهجة القناة (فارغ إن لم يكن ضرورياً). brand.company فارغ إن لم يظهر اسم واضح.
- lang: حسب لغة محتوى القناة.`;

const DIALECTS = ['egyptian', 'gulf', 'levantine', 'maghrebi', 'msa'];
const TONES = ['hype', 'analytical', 'friendly', 'formal', 'playful'];
const CATEGORIES = ['sports', 'partners', 'agents', 'marketers', 'payments', 'support', 'users'];

/**
 * Deterministic niche detection from the channel's own identity. Runs AFTER the
 * LLM so an «X agents» channel can never fall back to generic `partners` just
 * because the model saw "partner" in the name.
 */
export function nicheFromTitle(title?: string, username?: string): 'agents' | 'marketers' | null {
  const hay = `${title || ''} ${username || ''}`.toLowerCase();
  if (/(^|[^a-z])agents?([^a-z]|$)|وكلاء|وكيل/.test(hay)) return 'agents';
  if (/affiliate|creator|marketing|marketer|تسويق|مسو/.test(hay)) return 'marketers';
  return null;
}

/** Arabic display label for a channel category (admin notifications). */
export function categoryLabel(cat: string): string {
  switch (cat) {
    case 'agents': return '👥 وكلاء';
    case 'marketers': return '📣 مسوّقون';
    case 'partners': return '🤝 شركاء';
    case 'payments': return '💳 مدفوعات';
    case 'support': return '🛟 دعم';
    case 'users': return '🔔 تحديثات مستخدمين';
    default: return '⚽ رياضي';
  }
}

function normalizeClassification(raw: any, chat: { title?: string; username?: string }): {
  category: ChannelProfile['category'];
  topics: string[];
  betting_related: boolean;
  lang: 'ar' | 'en';
  dialect: string;
  tone: string;
  content_style: string;
  daily_cap: number;
  brand: ChannelProfile['brand'];
  analysis: string;
} {
  const niche = nicheFromTitle(chat.title, chat.username);
  const cat = niche || (CATEGORIES.includes(raw?.category) ? raw.category : 'sports');
  const topics = Array.isArray(raw?.topics) ? raw.topics.filter((t: any) => typeof t === 'string').slice(0, 3) : [];
  const emoji = ['rich', 'minimal', 'none'].includes(raw?.brand?.emoji) ? raw.brand.emoji : 'rich';
  const cap = typeof raw?.daily_cap === 'number' && raw.daily_cap >= 4 && raw.daily_cap <= 30 ? Math.round(raw.daily_cap) : 12;
  const dialect = DIALECTS.includes(raw?.dialect) ? raw.dialect : 'msa';
  const tone = TONES.includes(raw?.tone) ? raw.tone : 'friendly';
  return {
    category: cat,
    topics: topics.length ? topics : ['news'],
    betting_related: raw?.betting_related !== false,
    lang: raw?.lang === 'en' ? 'en' : 'ar',
    dialect,
    tone,
    content_style: typeof raw?.content_style === 'string' ? raw.content_style.slice(0, 400) : '',
    daily_cap: cap,
    brand: {
      domain: typeof raw?.brand?.domain === 'string' ? raw.brand.domain.slice(0, 60) : '',
      company: typeof raw?.brand?.company === 'string' ? raw.brand.company.slice(0, 60) : '',
      signature: typeof raw?.brand?.signature === 'string' ? raw.brand.signature.slice(0, 300) : '',
      emoji,
    },
    analysis:
      typeof raw?.summary === 'string' && raw.summary.trim()
        ? raw.summary.trim().slice(0, 400)
        : `${chat.title || 'channel'} — ${cat}, ${topics.join(',') || 'general'}, ${cat === 'sports' ? (raw?.betting_related !== false ? 'مراهنة' : 'أخبار') : categoryLabel(cat)}`.trim(),
  };
}

async function fetchChatDescription(chatId: string | number): Promise<string> {
  try {
    const token =
      channelsStore.getPublisher().bot_token || process.env.TELEGRAM_BOT_TOKEN || '';
    if (!token) return '';
    const res = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${chatId}`, {
      signal: AbortSignal.timeout(10000),
    });
    const data: any = await res.json();
    if (data?.ok && data.result) {
      const r = data.result;
      return [r.description, r.bio].filter(Boolean).join('\n').slice(0, 1200);
    }
  } catch (err: any) {
    console.warn('[Onboard] getChat failed:', err.message);
  }
  return '';
}

// =========================================================================
// Description-based identity — the bot is ADMIN in every channel, so the
// About/bio is readable and is the source of truth for what the channel
// publishes and whether it is a DEDICATED COMPANY channel. Deterministic
// (no LLM): partners list first, then a distinctive brand domain/name.
// =========================================================================

/** Hosts that never identify a brand (our domains, social, shorteners). */
const NON_BRAND_HOSTS = new Set([
  't.me', 'telegram.me', 'www.t.me', 'telegram.org',
  'vex.deals', '1xbetservices.com', 'betjam.sbs', 'betongame.cloud', 'vixo.uno',
  'youtube.com', 'youtu.be', 'instagram.com', 'facebook.com', 'x.com', 'twitter.com',
  'google.com', 'linktr.ee', 'linktree.me', 'chatgpt.com', 'openai.com',
]);

/** Generic words that start channel titles but are never a brand. */
const NON_BRAND_TITLE_WORDS = new Set([
  'support', 'admin', 'admins', 'administrator', 'official', 'channel', 'news', 'bot',
  'gift', 'gifts', 'payment', 'payments', 'affiliate', 'affiliates', 'wallet', 'tips',
  'vip', 'live', 'results', 'sports', 'football', 'predictions', 'prediction', 'promo',
  'free', 'chat', 'page', 'hub', 'center', 'club', 'team', 'store', 'app', 'link',
  'links', 'earn', 'money', 'media', 'games', 'game', 'arabic', 'english', 'betting',
  'bookmaker', 'casino', 'company', 'services', 'service', 'info', 'help', 'group',
]);

const BETTING_DESC_RE =
  /مراهنة|رهان|كازينو|قمار|بونص|كاش باك|توصيات|\bbetting\b|\bbookmaker\b|\bcasino\b|\bodds\b|\bwager\b|\bbonus\b/i;

export interface CompanyDerivation { company: string; source: 'partners' | 'domain' | 'title' | 'none' }

/**
 * Which company is this channel DEDICATED to, judging from bio + name?
 *  1) exactly ONE partner from the companies list appears → that partner
 *     (a bio mentioning several partners = multi-brand → neutral '');
 *  2) otherwise a distinctive brand domain in the bio (avabet.xyz → 'Avabet')
 *     — brands missing from the partners list are still dedicated channels;
 *  3) otherwise the first brand-like word of the title ('Avabet support').
 * '' = nothing conclusive → the channel stays neutral (receives any brand).
 */
export function deriveCompanyFromDescription(
  description: string,
  title?: string,
  username?: string
): CompanyDerivation {
  const text = `${description || ''}\n${title || ''}\n@${username || ''}`.toLowerCase();
  if (!text.trim()) return { company: '', source: 'none' };
  // Our own brand in the bio → this is a VEX channel (neutral by design).
  if (/\bvex\b|vex\.deals/.test(text)) return { company: '', source: 'none' };

  const partners = (storage.getCompanies() || []).filter((c) => c.is_active !== false);
  const hits = partners.filter((c) => {
    const n = String(c.name || '').trim().toLowerCase();
    return n.length > 3 && text.includes(n);
  });
  if (hits.length === 1) return { company: String(hits[0].name), source: 'partners' };
  if (hits.length > 1) return { company: '', source: 'none' }; // multi-brand → neutral

  // Distinctive brand domain in the bio: https://avabet.xyz/support → 'Avabet'
  const hosts = [...(description || '').matchAll(/https?:\/\/(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})/gi)].map(
    (m) => m[1].toLowerCase()
  );
  for (const host of hosts) {
    const label = host.split('.')[0];
    if (label.length < 4 || NON_BRAND_HOSTS.has(host)) continue;
    if (/^(www|blog|support|help|mail|cdn|api|my|go|u)$/.test(label)) continue;
    if (label.includes('vex')) continue;
    return { company: label.charAt(0).toUpperCase() + label.slice(1), source: 'domain' };
  }

  // Brand-like first word of the title: 'Avabet support' → 'Avabet'
  for (const raw of String(title || '').split(/[\s_\-.|]+/)) {
    const tok = raw.replace(/[^\p{L}\p{N}]/gu, '');
    if (tok.length < 4 || !/^[A-Za-z]/.test(tok)) continue;
    if (NON_BRAND_TITLE_WORDS.has(tok.toLowerCase())) continue;
    if (/^\d+$/.test(tok)) continue;
    return { company: tok.charAt(0).toUpperCase() + tok.slice(1), source: 'title' };
  }
  return { company: '', source: 'none' };
}

/** Betting keywords in the bio → the channel is betting-related.
 *  Only ever returns true (never auto-false: a missing bio must not silently
 *  disqualify a channel — undefined keeps the existing default). */
export function deriveBettingFromDescription(description: string, title?: string): boolean | undefined {
  return BETTING_DESC_RE.test(`${description || ''}\n${title || ''}`) ? true : undefined;
}

export interface DescriptionRow {
  chat_id: string;
  title: string;
  category: string;
  description: string;
  company: string;
  company_source: 'existing' | 'partners' | 'domain' | 'title' | 'none';
  betting_related: boolean | undefined;
  changed: string[];
}

/**
 * Fetch the About/bio of EVERY channel (the bot is admin) and fill the gaps:
 *  - store `description` (so routing/reporting can see it),
 *  - fill empty `brand.company` from the bio/name (dedicated-company rule),
 *  - set `betting_related` when undefined and the bio clearly says betting.
 * Never touches fields that are already set. Deterministic, no LLM.
 */
export async function refreshChannelDescriptions(): Promise<{ rows: DescriptionRow[]; updated: number }> {
  const rows: DescriptionRow[] = [];
  let updated = 0;
  for (const ch of channelsStore.getAll()) {
    const fetched = await fetchChatDescription(ch.chat_id);
    const desc = fetched || ch.description || '';
    const changed: string[] = [];

    const existingCompany = String(ch.brand?.company || '').trim();
    let company = existingCompany;
    let source: DescriptionRow['company_source'] = existingCompany ? 'existing' : 'none';
    if (!existingCompany) {
      const d = deriveCompanyFromDescription(desc, ch.title, ch.username);
      if (d.company) {
        company = d.company;
        source = d.source;
        changed.push(`company=${d.company} (from ${d.source})`);
      }
    }

    let betting = ch.betting_related;
    if (betting === undefined) {
      const b = deriveBettingFromDescription(desc, ch.title);
      if (b !== undefined) {
        betting = b;
        changed.push('betting_related=true (from bio)');
      }
    }

    if (desc && desc !== ch.description) changed.push('description saved');
    if (changed.length) {
      channelsStore.upsert({
        chat_id: ch.chat_id,
        description: desc || undefined,
        brand: { ...(ch.brand || ({} as any)), company },
        ...(betting !== ch.betting_related ? { betting_related: betting } : {}),
      } as any);
      updated++;
    }
    rows.push({
      chat_id: ch.chat_id,
      title: ch.title,
      category: ch.category,
      description: desc,
      company,
      company_source: source,
      betting_related: betting,
      changed,
    });
    await new Promise((r) => setTimeout(r, 250)); // be gentle with getChat
  }
  return { rows, updated };
}

/** Read a public channel's recent posts via the t.me/s web preview (best-effort). */
async function fetchRecentChannelPosts(username?: string): Promise<string> {
  if (!username) return '';
  const handle = username.replace(/^@/, '').trim();
  if (!handle || /[^A-Za-z0-9_]/.test(handle)) return '';
  try {
    const res = await fetch(`https://t.me/s/${handle}`, {
      signal: AbortSignal.timeout(12000),
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0' },
    });
    if (!res.ok) return '';
    const posts = parseTmePage(await res.text())
      .map((p) => p.text.replace(/\s+/g, ' ').trim())
      .filter((t) => t.length > 25)
      .slice(-8);
    return posts.length ? posts.join('\n---\n').slice(0, 3500) : '';
  } catch {
    return '';
  }
}

async function classifyChannel(
  chat: { id: number | string; title?: string; username?: string },
  description: string,
  recentPosts = ''
): Promise<ReturnType<typeof normalizeClassification>> {
  const info =
    `القناة: ${chat.title || chat.id}\n` +
    `المعرّف: ${chat.username ? '@' + chat.username : chat.id}\n` +
    `الوصف:\n${description || '(لا يوجد وصف — استنتج من الاسم والمنشورات)'}\n` +
    (recentPosts ? `\nآخر منشورات القناة (مصدر الحقيقة للهجة والنبرة والصيغة):\n${recentPosts}` : '\n(لا توجد منشورات متاحة للقراءة)');

  if (availableProviders().length === 0) {
    console.warn('[Onboard] no LLM provider — using rule fallback');
    return normalizeClassification(
      { category: 'sports', topics: ['news'], betting_related: true, lang: 'ar', daily_cap: 12, brand: { emoji: 'rich' }, summary: 'تصنيف قواعد (بلا LLM)' },
      chat as any
    );
  }

  try {
    const raw = await generateWithFailover(info, CLASSIFY_SYSTEM, 0.2);
    const parsed = extractJsonObject<any>(raw);
    if (parsed) return normalizeClassification(parsed, chat as any);
  } catch (err: any) {
    console.warn('[Onboard] classify failed:', err.message);
  }
  return normalizeClassification(
    { category: 'sports', topics: ['news'], betting_related: true, lang: 'ar', daily_cap: 12, brand: { emoji: 'rich' }, summary: 'تصنيف احتياطي' },
    chat as any
  );
}

async function notifyAdmin(fromId: number | undefined, text: string): Promise<void> {
  if (!fromId) return;
  try {
    const token = channelsStore.getPublisher().bot_token || process.env.TELEGRAM_BOT_TOKEN || '';
    if (!token) return;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // كل رسالة بوت تمرّ بنفس قاعدة الروابط: URL خام → كلمة قابلة للنقر.
      body: JSON.stringify({ chat_id: fromId, text: linkifyTgUrls(text), parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    /* user may have never started the bot — non-fatal */
  }
}

/**
 * Handle a my_chat_member update: bot added to a channel → classify + onboard;
 * bot removed → deactivate. Returns true when the update was consumed.
 */
export async function handleBotMembershipUpdate(update: any): Promise<boolean> {
  const m = update?.my_chat_member;
  if (!m || !m.chat) return false;
  const chat = m.chat;
  if (chat.type === 'private') return true; // bot status change in DMs — nothing to onboard

  const status = m.new_chat_member?.status;
  const chatId = String(chat.id);
  const existing = channelsStore.get(chatId);

  if (status === 'left' || status === 'kicked') {
    if (existing && existing.active) {
      channelsStore.upsert({ chat_id: chatId, active: false });
      console.log(`[Onboard] bot removed from «${chat.title || chatId}» → channel deactivated`);
      emitFn?.('channel_removed', { chat_id: chatId, title: chat.title });
    }
    return true;
  }

  if (status !== 'administrator' && status !== 'member' && status !== 'restricted') return true;

  console.log(`[Onboard] bot added to «${chat.title || chatId}» (${status}) — sending details to agents for classification…`);
  const description = await fetchChatDescription(chat.id);
  const recentPosts = await fetchRecentChannelPosts(chat.username || '');
  if (recentPosts) console.log(`[Onboard] read ${recentPosts.split('\n---\n').length} recent posts from @${chat.username}`);
  const cls = await classifyChannel(
    { id: chat.id, title: chat.title, username: chat.username },
    description,
    recentPosts
  );

  const profile = channelsStore.upsert({
    chat_id: chatId,
    username: chat.username || existing?.username || '',
    title: chat.title || existing?.title || chatId,
    description: description || existing?.description,
    category: cls.category,
    topics: cls.topics,
    betting_related: cls.betting_related,
    lang: cls.lang,
    dialect: cls.dialect,
    tone: cls.tone,
    content_style: cls.content_style,
    daily_cap: cls.daily_cap,
    brand: {
      domain: existing?.brand?.domain || cls.brand.domain,
      company: cls.brand.company || existing?.brand?.company || '',
      signature: cls.brand.signature || existing?.brand?.signature || '',
      emoji: cls.brand.emoji,
    },
    analysis: cls.analysis,
    active: true,
    ai_enabled: true,
  } as any);

  const summary =
    `✅ <b>تم استلام القناة وتصنيفها</b>\n\n` +
    `📌 ${profile.title}\n` +
    `🗂 التصنيف: ${categoryLabel(profile.category)} — ${profile.topics.join(', ')}\n` +
    `🎯 نوع المحتوى: ${profile.betting_related !== false ? 'مراهنة رياضية (توقعات + أوليات)' : 'أخبار رياضية عادية (بلا مراهنة)'}\n` +
    `🔤 اللغة: ${profile.lang} · سُمك اليوم: ${profile.daily_cap}\n` +
    `📝 ${profile.analysis}`;

  console.log(`[Onboard] ✓ classified «${profile.title}» → ${profile.category} [${profile.topics.join(',')}] betting=${profile.betting_related !== false}`);
  emitFn?.('channel_onboarded', {
    chat_id: chatId,
    title: profile.title,
    category: profile.category,
    topics: profile.topics,
    betting_related: profile.betting_related,
    summary: profile.analysis,
  });
  void notifyAdmin(m.from?.id, summary);
  return true;
}

/** Re-run classification for an existing channel (admin endpoint / manual). */
export async function reclassifyChannel(chatId: string): Promise<ChannelProfile | null> {
  const existing = channelsStore.get(chatId);
  if (!existing) return null;
  const description = await fetchChatDescription(existing.chat_id);
  const recentPosts = await fetchRecentChannelPosts(existing.username || '');
  const cls = await classifyChannel(
    { id: existing.chat_id, title: existing.title, username: existing.username },
    description,
    recentPosts
  );
  return channelsStore.upsert({
    chat_id: chatId,
    description: description || existing.description,
    category: cls.category,
    topics: cls.topics,
    betting_related: cls.betting_related,
    lang: cls.lang,
    dialect: cls.dialect,
    tone: cls.tone,
    content_style: cls.content_style,
    daily_cap: cls.daily_cap,
    brand: {
      domain: existing.brand?.domain || cls.brand.domain,
      company: cls.brand.company || existing.brand?.company || '',
      signature: cls.brand.signature || existing.brand?.signature || '',
      emoji: cls.brand.emoji,
    },
    analysis: cls.analysis,
  } as any);
}

/**
 * One-shot (idempotent, safe to run on every boot) migration: channels whose
 * own title/username clearly says «agents» or «affiliate/creator/marketing»
 * were previously lumped into `partners` and received generic partner posts.
 * Promote them to the dedicated `agents` / `marketers` niche so the niche
 * publisher can target them with content made for their audience.
 */
export function reclassifyNicheTitles(): { chat_id: string; title: string; from: string; to: string }[] {
  const changed: { chat_id: string; title: string; from: string; to: string }[] = [];
  for (const ch of channelsStore.getAll()) {
    const niche = nicheFromTitle(ch.title, ch.username);
    if (!niche || ch.category === niche) continue;
    channelsStore.upsert({ chat_id: ch.chat_id, category: niche } as any);
    changed.push({ chat_id: ch.chat_id, title: ch.title, from: ch.category, to: niche });
    console.log(`[Onboard] niche reclassify «${ch.title}»: ${ch.category} → ${niche}`);
  }
  if (changed.length) {
    console.log(`[Onboard] ${changed.length} channel(s) promoted to agents/marketers niche`);
  }
  return changed;
}
