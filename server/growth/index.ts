// Barrel + integration surface for server.ts.
export * from './leadsStore';
export * from './brain';
export * from './listener';
export * from './funnel';
export * from './campaigns';
export * from './intel';
export * from './sender';

import {
  listLeads,
  upsertLead,
  addTouch,
  linkPhone,
  linkWebUser,
  getSettings,
} from './leadsStore';
import { initSender, SendFn } from './sender';
import { setIntelNotifier, startIntelTimers } from './intel';
import { setLotteryProvider, startFunnel } from './funnel';
import { onGroupMessage, onPrivateMessage } from './listener';
import { recordReferral } from './campaigns';

export interface GrowthInit {
  send: SendFn;
  notifyAdmin: (text: string) => void;
  getLotteryState: () => { jackpotAmount: number } | null;
}

export function initGrowth(opts: GrowthInit): void {
  initSender(opts.send, opts.notifyAdmin);
  setIntelNotifier(opts.notifyAdmin);
  setLotteryProvider(opts.getLotteryState);
}

export function startGrowth(): void {
  startFunnel();
  startIntelTimers();
  console.log(`[Growth] engine started — leads=${listLeads().length}`);
}

/** Route every telegram update into the growth pipeline (fire-and-forget). */
export function growthOnUpdate(update: any): void {
  try {
    const msg = update?.message;
    if (!msg?.chat) return;
    const t = msg.chat.type;
    if (t === 'group' || t === 'supergroup') {
      void onGroupMessage(msg).catch((err) => console.warn('[Growth] group error:', err?.message));
    } else if (t === 'private') {
      void onPrivateMessage(msg).catch((err) => console.warn('[Growth] dm error:', err?.message));
    }
  } catch {}
}

/** /start hook: parse deep-link codes (ch_/ref_/ab_) + capture the lead. */
export function growthOnStart(
  tgUser: { id: number; username?: string; first_name?: string },
  code: string | null
): void {
  try {
    let source = 'start_plain';
    let ab: string | undefined;
    if (code) {
      if (code.startsWith('ch_')) source = `ch_${code.slice(3).slice(0, 30)}`;
      else if (code.startsWith('ref_')) {
        const inviter = Number(code.slice(4));
        if (inviter && inviter !== tgUser.id) recordReferral(inviter);
        source = 'referral';
      } else if (code.startsWith('ab_')) {
        const v = code.slice(3).toUpperCase();
        if (v === 'A' || v === 'B') ab = v;
        source = 'campaign_ab';
      }
    }
    upsertLead({
      tg_user_id: tgUser.id,
      username: tgUser.username,
      first_name: tgUser.first_name,
      started: true,
      source,
      ab_group: ab,
    });
    addTouch(tgUser.id, 'start', code || undefined, source);
  } catch (err: any) {
    console.warn('[Growth] start capture error:', err?.message);
  }
}

export function growthLinkPhone(tgUserId: number, phone: string): void {
  try {
    linkPhone(tgUserId, phone);
    addTouch(tgUserId, 'contact', phone.slice(0, 4) + '•••');
  } catch {}
}

export function growthLinkWeb(tgUserId: number, webUserId: string): void {
  try {
    linkWebUser(tgUserId, webUserId);
  } catch {}
}

let healthCache: { at: number; data: object } | null = null;

export function growthHealth(): object {
  if (healthCache && Date.now() - healthCache.at < 30000) return healthCache.data;
  const settings = getSettings();
  const data = {
    listen: settings.listen_enabled,
    auto_reply: settings.auto_reply,
    prediction_drops: settings.prediction_drops,
    drip: settings.drip_enabled,
    campaigns: settings.campaigns_enabled,
    leads: listLeads().length,
  };
  healthCache = { at: Date.now(), data };
  return data;
}
