import {
  classifyIntent,
  classifyIntentSmart,
  generateGroupReply,
  IntentResult,
} from './brain';
import {
  upsertLead,
  addTouch,
  bumpInterest,
  getLead,
  getSettings,
  dropSeen,
  markDrop,
  Lead,
} from './leadsStore';
import { sendGrowthDm } from './sender';
import { findPredictionMention } from '../forecastChain';

// =========================================================================
// The Listener: one hook at the end of handleTelegramUpdate. Group messages
// are classified; interesting signals bump interests + heat; questions get
// a value-add reply on cooldown; match chatter drops a real AI prediction
// card from forecastChain state (no LLM call, pure data).
// =========================================================================

const INTEREST_MAP: Record<string, keyof Lead['interests']> = {
  predictions: 'predictions',
  lottery: 'lottery',
  cashback: 'cashback',
  agents: 'agents',
  promo: 'cashback',
};

const groupReplyBudget = { date: '', count: 0 };
const GROUP_REPLY_DAILY_CAP = 250;

function canGroupReply(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (groupReplyBudget.date !== today) {
    groupReplyBudget.date = today;
    groupReplyBudget.count = 0;
  }
  return groupReplyBudget.count < GROUP_REPLY_DAILY_CAP;
}

export interface ListenerResult {
  intent: string;
  replied: boolean;
  dropped: boolean;
}

export async function onGroupMessage(message: any): Promise<ListenerResult | null> {
  const settings = getSettings();
  if (!settings.listen_enabled) return null;
  const text: string = message?.text || '';
  if (!text || text.startsWith('/')) return null;
  const chatId: number = message?.chat?.id;
  const from = message?.from;
  if (!chatId || !from || from.is_bot) return null;

  let intent: IntentResult = classifyIntent(text);
  if (intent.intent === 'other' && text.trim().length > 25) {
    intent = await classifyIntentSmart(text);
  }
  if (intent.intent === 'spam') return { intent: 'spam', replied: false, dropped: false };

  // record the lead + attribution
  const source = `ch_${chatId}`;
  const lead = upsertLead({
    tg_user_id: from.id,
    username: from.username,
    first_name: from.first_name,
    lang: intent.lang === 'en' ? 'en' : 'ar',
    source,
    type: intent.is_agent ? 'agent' : undefined,
    last_signal: text,
  });

  const hasTopic = intent.topics.length > 0;
  if (hasTopic || intent.intent === 'question' || intent.intent === 'greeting') {
    addTouch(from.id, 'signal', text.slice(0, 120), source);
    for (const t of intent.topics) {
      const key = INTEREST_MAP[t];
      if (key) bumpInterest(from.id, key, 2);
    }
  }

  // prediction drop — pure data from forecastChain, one per group per match
  let dropped = false;
  const dropCtx = settings.prediction_drops ? findPredictionMention(text) : null;
  if (dropCtx) {
    const key = `${chatId}|${dropCtx.slug}`;
    if (!dropSeen(key)) {
      const card = buildDropCard(dropCtx);
      const ok = await sendGrowthDm(chatId, card);
      if (ok) {
        markDrop(key);
        dropped = true;
        for (const u of participantsOf(message)) bumpInterest(u, 'predictions', 1);
      }
    }
  }

  // reply decision — only value-add, one per user per group per cooldown
  let replied = false;
  const now = Date.now();
  const cd = settings.reply_cooldown_min * 60000;
  const lastReply = lead.group_replies[String(chatId)] || 0;
  if (
    settings.auto_reply &&
    intent.wants_reply &&
    now - lastReply > cd &&
    canGroupReply() &&
    text.trim().length > 2
  ) {
    const reply = await generateGroupReply(from.first_name, text, intent, dropCtx?.label);
    if (reply) {
      // small human delay before speaking
      await new Promise((r) => setTimeout(r, 1500 + Math.random() * 3000));
      const ok = await sendGrowthDm(chatId, reply);
      if (ok) {
        replied = true;
        groupReplyBudget.count++;
        lead.group_replies[String(chatId)] = Date.now();
        addTouch(from.id, 'reply', reply.slice(0, 100), source);
        bumpInterest(from.id, 'predictions', 1);
      }
    }
  }

  return { intent: intent.intent, replied, dropped };
}

export async function onPrivateMessage(message: any): Promise<void> {
  const settings = getSettings();
  if (!settings.listen_enabled || !settings.auto_reply) return;
  const text: string = message?.text || '';
  if (!text || text.startsWith('/')) return;
  const from = message?.from;
  if (!from || from.is_bot) return;

  let intent = classifyIntent(text);
  if (intent.intent === 'other' && text.trim().length > 25) {
    intent = await classifyIntentSmart(text);
  }
  if (intent.intent === 'spam') return;

  const lead = upsertLead({
    tg_user_id: from.id,
    username: from.username,
    first_name: from.first_name,
    lang: intent.lang === 'en' ? 'en' : 'ar',
    type: intent.is_agent ? 'agent' : undefined,
    last_signal: text,
  });
  addTouch(from.id, intent.wants_reply ? 'reply' : 'signal', text.slice(0, 120), 'dm');
  for (const t of intent.topics) {
    const key = INTEREST_MAP[t];
    if (key) bumpInterest(from.id, key, 2);
  }
  if (intent.is_agent) {
    lead.needs_human = true;
  }

  // DM replies: same cooldown map keyed by chat = user id
  const now = Date.now();
  const cd = settings.reply_cooldown_min * 60000;
  const lastReply = lead.group_replies[`dm${from.id}`] || 0;
  if (intent.wants_reply && now - lastReply > cd) {
    const reply = await generateGroupReply(from.first_name, text, intent);
    if (reply) {
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 1500));
      const ok = await sendGrowthDm(from.id, reply);
      if (ok) {
        lead.group_replies[`dm${from.id}`] = Date.now();
        addTouch(from.id, 'reply', reply.slice(0, 100), 'dm');
      }
    }
  }
}

// --------------------------- prediction card ---------------------------

export interface PredictionMention {
  slug: string;
  home: string;
  away: string;
  league: string;
  kickoffLabel: string;
  pHome: number;
  pAway: number;
  predictedScore: string;
  postId?: string;
  label: string; // "ريال مدريد × برشلونة"
}

function buildDropCard(ctx: PredictionMention): string {
  const pDraw = Math.max(0, 100 - ctx.pHome - ctx.pAway);
  return [
    `⚽ ${ctx.league} — ${ctx.home} × ${ctx.away}`,
    ``,
    `📊 تحليل VEX AI:`,
    `▪️ ${ctx.home}: ${ctx.pHome}%`,
    `▪️ تعادل: ${pDraw}%`,
    `▪️ ${ctx.away}: ${ctx.pAway}%`,
    `🎯 النتيجة المتوقعة: ${ctx.predictedScore}`,
    `⏰ ${ctx.kickoffLabel}`,
    ``,
    `🔎 التحليل الكامل والتفاصيل: https://vex.deals/#ai-sports`,
  ].join('\n');
}

// participants of the message + replied_to user — used to warm interest on drops
function participantsOf(message: any): number[] {
  const ids: number[] = [];
  if (message?.from?.id) ids.push(message.from.id);
  const r = message?.reply_to_message?.from?.id;
  if (r && !message.reply_to_message.from.is_bot) ids.push(r);
  return ids;
}
