import * as fs from 'fs';
import * as path from 'path';

// =========================================================================
// VEX Channels Store - channel management lives INSIDE VEX (replaces python bot_channels.csv)
// =========================================================================

export type ChannelCategory = 'sports' | 'partners' | 'payments' | 'support' | 'users';
export type ChannelFormat = 'html' | 'markdown' | 'plain';

export interface ChannelProfile {
  id: string;
  chat_id: string;          // -100xxxxxxxxxx
  username?: string;        // @channelusername
  title: string;
  category: ChannelCategory;
  /** Sub-topics this channel accepts (e.g. football, basketball, live, promo) */
  topics: string[];
  /** Posting format for this channel */
  format: ChannelFormat;
  /** Brand identity so posts match the channel's domain */
  brand: {
    /** Brand domain used in links (e.g. betjam.sbs, vixo.uno) — empty = no links */
    domain: string;
    /** Company/partner name shown in signature (empty = neutral) */
    company: string;
    /** Signature/CTA suffix appended to posts */
    signature: string;
    /** Emoji style: 'rich' | 'minimal' | 'none' */
    emoji: 'rich' | 'minimal' | 'none';
  };
  lang: 'ar' | 'en' | 'auto';
  active: boolean;
  ai_enabled: boolean;
  /** Max posts per day for this channel */
  daily_cap: number;
  /** Posts already sent today (resets at UTC midnight) */
  daily_used: number;
  daily_reset: string;      // YYYY-MM-DD
  /** Quiet hours in UTC (inclusive start, exclusive end) */
  quiet_start?: number;
  quiet_end?: number;
  last_post_at?: string;
  created_at: string;
  updated_at: string;
}

interface ChannelsFile {
  channels: ChannelProfile[];
  publisher: {
    /** Publisher bot token (second bot — added as admin to channels) */
    bot_token: string;
    bot_username: string;
    bot_name: string;
    bot_id: string;
    updated_at?: string;
  };
  updatedAt: string;
}

const CHANNELS_PATH = path.join(process.cwd(), 'data', 'channels.json');

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function load(): ChannelsFile {
  try {
    if (fs.existsSync(CHANNELS_PATH)) {
      const data = JSON.parse(fs.readFileSync(CHANNELS_PATH, 'utf-8')) as ChannelsFile;
      if (!Array.isArray(data.channels)) data.channels = [];
      if (!data.publisher) data.publisher = { bot_token: '', bot_username: '', bot_name: '', bot_id: '' };
      return data;
    }
  } catch (err) {
    console.error('[ChannelsStore] load failed:', err);
  }
  return { channels: [], publisher: { bot_token: '', bot_username: '', bot_name: '', bot_id: '' }, updatedAt: new Date().toISOString() };
}

function save(data: ChannelsFile): void {
  data.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(CHANNELS_PATH), { recursive: true });
  fs.writeFileSync(CHANNELS_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export const channelsStore = {
  getAll(): ChannelProfile[] {
    return load().channels;
  },

  getActive(): ChannelProfile[] {
    return load().channels.filter((c) => c.active);
  },

  get(chatId: string): ChannelProfile | undefined {
    return load().channels.find((c) => c.chat_id === chatId);
  },

  /** Active channels that should receive posts right now (cap + quiet hours respected) */
  getPublishable(now: Date = new Date()): ChannelProfile[] {
    const today = todayUTC();
    const hour = now.getUTCHours();
    return load().channels.filter((c) => {
      if (!c.active) return false;
      if (c.category === 'users' || c.category === 'support') return false;
      if (c.daily_reset !== today) return true; // reset pending — cap not consumed yet
      if (c.daily_used >= c.daily_cap) return false;
      if (c.quiet_start !== undefined && c.quiet_end !== undefined) {
        const qs = c.quiet_start, qe = c.quiet_end;
        const inQuiet = qs < qe ? hour >= qs && hour < qe : hour >= qs || hour < qe;
        if (inQuiet) return false;
      }
      return true;
    });
  },

  upsert(channel: Partial<ChannelProfile> & { chat_id: string }): ChannelProfile {
    const data = load();
    const existing = data.channels.find((c) => c.chat_id === channel.chat_id);
    const now = new Date().toISOString();
    if (existing) {
      Object.assign(existing, channel, { updated_at: now });
      save(data);
      return existing;
    }
    const created: ChannelProfile = {
      id: channel.id || `ch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      chat_id: channel.chat_id,
      username: channel.username || '',
      title: channel.title || channel.chat_id,
      category: channel.category || 'sports',
      topics: channel.topics || ['football'],
      format: channel.format || 'html',
      brand: channel.brand || { domain: '', company: '', signature: '', emoji: 'rich' },
      lang: channel.lang || 'ar',
      active: channel.active !== false,
      ai_enabled: channel.ai_enabled !== false,
      daily_cap: channel.daily_cap ?? 12,
      daily_used: 0,
      daily_reset: todayUTC(),
      quiet_start: channel.quiet_start,
      quiet_end: channel.quiet_end,
      created_at: now,
      updated_at: now,
    };
    data.channels.push(created);
    save(data);
    return created;
  },

  remove(chatId: string): boolean {
    const data = load();
    const before = data.channels.length;
    data.channels = data.channels.filter((c) => c.chat_id !== chatId);
    if (data.channels.length !== before) {
      save(data);
      return true;
    }
    return false;
  },

  /** Count a published post toward the daily cap */
  recordPost(chatId: string): void {
    const data = load();
    const ch = data.channels.find((c) => c.chat_id === chatId);
    if (!ch) return;
    const today = todayUTC();
    if (ch.daily_reset !== today) {
      ch.daily_reset = today;
      ch.daily_used = 0;
    }
    ch.daily_used += 1;
    ch.last_post_at = new Date().toISOString();
    save(data);
  },

  // ---- publisher bot (2nd bot: added as admin to channels) ----
  getPublisher(): ChannelsFile['publisher'] {
    return load().publisher;
  },

  setPublisher(publisher: Partial<ChannelsFile['publisher']>): ChannelsFile['publisher'] {
    const data = load();
    data.publisher = { ...data.publisher, ...publisher, updated_at: new Date().toISOString() };
    save(data);
    return data.publisher;
  },
};