import { generateWithFailover, extractJsonObject, availableProviders } from './agentEngine';
import { channelsStore, ChannelProfile } from './channelsStore';

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
  "category": "sports|partners|payments|support|users",
  "topics": ["football","basketball","live","transfer","promo","lottery","news","payout","users","general"],
  "betting_related": true,
  "lang": "ar|en",
  "daily_cap": 12,
  "brand": {"company":"...","signature":"...","emoji":"rich|minimal|none"},
  "summary": "سطر واحد يصف القناة ونوع جمهورها"
}
القواعد:
- category: sports=محتوى رياضي، partners=شركاء/embrochen، payments=مدفوعات وسحب وإيداع، support=دعم فني، users=تحديثات مستخدمين.
- topics: اختر ما ينطبق فقط من القائمة (3 كحد أقصى). إن لم يتبين ركّز على general/news.
- betting_related: true إذا كانت القناة عن المراهنة الرياضية أو تنشر توقعات/أوليات/كاش باك/عروض كازينو أو روابط مراهنات. false إذا كانت قناة أخبار رياضية عادية بلا أي صلة بالمراهنة.
- daily_cap: بين 8 و 16 بحسب حجم نشاط القناة (الافتراضي 12).
- brand.signature: توقيع/CTA مناسب بنفس لغة القناة (فارغ إن لم يكن ضرورياً). brand.company فارغ إن لم يظهر اسم واضح.
- lang: حسب لغة محتوى القناة.`;

function normalizeClassification(raw: any, chat: { title?: string; username?: string }): {
  category: ChannelProfile['category'];
  topics: string[];
  betting_related: boolean;
  lang: 'ar' | 'en';
  daily_cap: number;
  brand: ChannelProfile['brand'];
  analysis: string;
} {
  const cat = ['sports', 'partners', 'payments', 'support', 'users'].includes(raw?.category) ? raw.category : 'sports';
  const topics = Array.isArray(raw?.topics) ? raw.topics.filter((t: any) => typeof t === 'string').slice(0, 3) : [];
  const emoji = ['rich', 'minimal', 'none'].includes(raw?.brand?.emoji) ? raw.brand.emoji : 'rich';
  const cap = typeof raw?.daily_cap === 'number' && raw.daily_cap >= 4 && raw.daily_cap <= 30 ? Math.round(raw.daily_cap) : 12;
  return {
    category: cat,
    topics: topics.length ? topics : ['news'],
    betting_related: raw?.betting_related !== false,
    lang: raw?.lang === 'en' ? 'en' : 'ar',
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
        : `${chat.title || 'channel'} — ${cat}, ${topics.join(',') || 'general'}, ${cat === 'sports' ? (raw?.betting_related !== false ? 'مراهنة' : 'أخبار') : ''}`.trim(),
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

async function classifyChannel(
  chat: { id: number | string; title?: string; username?: string },
  description: string
): Promise<ReturnType<typeof normalizeClassification>> {
  const info =
    `القناة: ${chat.title || chat.id}\n` +
    `المعرّف: ${chat.username ? '@' + chat.username : chat.id}\n` +
    `الوصف:\n${description || '(لا يوجد وصف — استنتج من الاسم)'}`;

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
      body: JSON.stringify({ chat_id: fromId, text, parse_mode: 'HTML' }),
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
  const cls = await classifyChannel(
    { id: chat.id, title: chat.title, username: chat.username },
    description
  );

  const profile = channelsStore.upsert({
    chat_id: chatId,
    username: chat.username || existing?.username || '',
    title: chat.title || existing?.title || chatId,
    category: cls.category,
    topics: cls.topics,
    betting_related: cls.betting_related,
    lang: cls.lang,
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
    `🗂 التصنيف: ${profile.category} — ${profile.topics.join(', ')}\n` +
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
  const cls = await classifyChannel(
    { id: existing.chat_id, title: existing.title, username: existing.username },
    description
  );
  return channelsStore.upsert({
    chat_id: chatId,
    category: cls.category,
    topics: cls.topics,
    betting_related: cls.betting_related,
    lang: cls.lang,
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
