import { markDead, recordDm, canSendDm } from './leadsStore';

// =========================================================================
// Rate-limited outbound queue. Telegram allows ~30 msg/s globally and
// 1 msg/s per chat; we stay safely under both. sendTelegramMessage is
// injected at boot to avoid a circular import with server.ts.
// =========================================================================

export type SendFn = (
  chatId: number | string,
  text: string,
  options?: { parse_mode?: string; keyboard?: any[] }
) => Promise<any>;

let sendFn: SendFn | null = null;
let notifyAdmin: ((text: string) => void) | null = null;

const queue: Array<{
  chatId: number;
  leadId?: string;
  text: string;
  resolve: (ok: boolean) => void;
}> = [];
let pumping = false;
let lastSentAt = 0;
const PER_CHAT_LAST: Record<number, number> = {};

export const sendStats = { queued: 0, sent: 0, failed: 0, dead403: 0 };

export function initSender(send: SendFn, adminNotif: (text: string) => void): void {
  sendFn = send;
  notifyAdmin = adminNotif;
}

/** Enqueue a growth DM. Resolves true when delivered (or accepted into queue). */
export function sendGrowthDm(chatId: number, text: string, leadId?: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!sendFn) return resolve(false);
    if (leadId && !canSendDm(leadId)) return resolve(false);
    queue.push({ chatId, leadId, text, resolve });
    sendStats.queued++;
    void pump();
  });
}

async function pump(): Promise<void> {
  if (pumping) return;
  pumping = true;
  try {
    while (queue.length > 0) {
      const now = Date.now();
      const globalWait = 110 - (now - lastSentAt); // ~9 msg/s
      const item = queue[0];
      const chatWait = 1050 - (now - (PER_CHAT_LAST[item.chatId] || 0));
      const wait = Math.max(globalWait, chatWait);
      if (wait > 0) {
        await new Promise((r) => setTimeout(r, wait));
      }
      queue.shift();
      lastSentAt = Date.now();
      PER_CHAT_LAST[item.chatId] = lastSentAt;
      try {
        // HTML with escaped entities = literal text, immune to markdown breakage
        const safe = item.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const res = await sendFn!(item.chatId, safe, { parse_mode: 'HTML' });
        const ok = !!res?.ok;
        if (ok) {
          sendStats.sent++;
          if (item.leadId) recordDm(item.leadId);
        } else {
          sendStats.failed++;
          const code = res?.error_code;
          const desc = String(res?.description || '');
          // 403 = user blocked the bot or never /start-ed → mark dead, never DM again
          if (code === 403 || /bot was blocked|user is deactivated|chat not found/i.test(desc)) {
            sendStats.dead403++;
            if (item.leadId) {
              const tgId = Number(item.leadId.replace(/^tg_/, ''));
              if (tgId) markDead(tgId);
            }
          }
        }
        item.resolve(ok);
      } catch {
        sendStats.failed++;
        item.resolve(false);
      }
      // global safety: if we burned the daily cap, drain the rest
      if (queue.length > 0 && !canSendDm('probe')) {
        for (const stuck of queue.splice(0)) stuck.resolve(false);
        notifyAdmin?.(`⚠️ [Growth] وقف الإرسال — السقف اليومي للرسائل اكتمل`);
        break;
      }
    }
  } finally {
    pumping = false;
  }
}

export function senderHealth(): object {
  return { ...sendStats, queueDepth: queue.length };
}
