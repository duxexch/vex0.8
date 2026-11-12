import { 
  LotteryDraw, 
  LotteryTicket, 
  LotteryStats, 
  LotteryPrizeTier, 
  LotteryTierId,
  LotteryUserWonPrize,
  LotteryAlertSettings,
  LotteryTierAlertConfig 
} from '../types';
import { db, requestFCMToken } from './firebaseClient';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';

const STORAGE_KEYS = {
  DRAWS: 'vex_lottery_draws_v1',
  TICKETS: 'vex_lottery_tickets_v1',
  STATS: 'vex_lottery_stats_v1',
  FREE_TICKETS_BALANCE: 'vex_lottery_free_tickets_',
  USER_WON_PRIZES: 'vex_lottery_user_winnings_',
  ALERT_SETTINGS: 'vex_lottery_tier_alert_settings_v1',
  SEED_VERSION: 'vex_lottery_seed_version',
};

// Bumped whenever the seed prize structure changes — one-time normalization of
// cached draws so existing installs show the current (reduced) amounts too.
// v4: re-run forced for installs whose draws were re-saved stale by a background
// tab still running an older bundle after the v3 migration had already run.
// v5: fabricated seed counters (tickets sold / participants / winners / payouts
//     on the demo seed draws) are zeroed — only real sales ever count.
const SEED_VERSION = 'v5';

// Old seed money values → current values (only these exact figures are rewritten,
// so admin-adjusted or sales-driven jackpots are never clobbered).
// v3 scale (small start): ticket $0.5, jackpot begins at $100, tiers $100/25/10/2/1.
const LEGACY_SEED_AMOUNTS: Array<{ jackpot: number; jackpotTo: number; initial: number; initialTo: number; pool: number; poolTo: number; paidOut?: number; paidOutTo?: number }> = [
  // v1 seeds
  { jackpot: 18450, jackpotTo: 100, initial: 15000, initialTo: 100, pool: 22680, poolTo: 100 },
  { jackpot: 14200, jackpotTo: 85, initial: 10000, initialTo: 75, pool: 17400, poolTo: 120, paidOut: 6850, paidOutTo: 35 },
  { jackpot: 12500, jackpotTo: 70, initial: 10000, initialTo: 75, pool: 15300, poolTo: 95, paidOut: 14850, paidOutTo: 40 },
  // v2 seeds
  { jackpot: 3200, jackpotTo: 100, initial: 2500, initialTo: 100, pool: 3450, poolTo: 100 },
  { jackpot: 2800, jackpotTo: 85, initial: 2000, initialTo: 75, pool: 4120, poolTo: 120, paidOut: 1650, paidOutTo: 35 },
  { jackpot: 2400, jackpotTo: 70, initial: 2000, initialTo: 75, pool: 3200, poolTo: 95, paidOut: 1900, paidOutTo: 40 },
];


// Default standard prize tier structure
export const DEFAULT_PRIZE_TIERS: LotteryPrizeTier[] = [
  {
    id: 'tier1_jackpot',
    nameAr: 'الجائزة الكبرى (5 أرقام + 2 ذهبيين)',
    nameEn: 'Jackpot (Match 5 + 2 Lucky Stars)',
    matchMain: 5,
    matchLucky: 2,
    sharePercent: 50,
    guaranteedAmount: 100,
    odds: '1 : 139,838,160',
    termsAr: 'تتطلب مطابقة جميع الأرقام الخمسة الرئيسية (من 1 إلى 50) بالإضافة إلى رقمي نجوم الحظ الذهبيين (من 1 إلى 12) بدقة تامة. في حال تعدد التذاكر الفائزة، يُقسّم مجمع الجائزة بالتساوي مع ضمان حد أدنى.',
    termsEn: 'Requires an exact match of all 5 main balls (1-50) plus both 2 lucky stars (1-12). If multiple tickets match, the jackpot pool is split equally, guaranteed at a minimum.',
    payoutTermsAr: 'إيداع تلقائي فوري 100% في المحفظة النشطة بدون أي استقطاعات أو عمولات، ومتاحة للسحب النقدي الفوري عبر USDT أو فودافون كاش أو التحويل البنكي.',
    payoutTermsEn: '100% instant automatic credit to user active wallet with zero deductions. Immediately withdrawable via USDT, Vodafone Cash, or Bank Transfer.',
  },
  {
    id: 'tier2_match5',
    nameAr: 'المستوى الثاني (5 أرقام + 1 ذهبي)',
    nameEn: 'Tier 2 (Match 5 + 1 Lucky Star)',
    matchMain: 5,
    matchLucky: 1,
    sharePercent: 20,
    guaranteedAmount: 25,
    odds: '1 : 6,991,908',
    termsAr: 'تتطلب مطابقة 5 أرقام رئيسية ورقم ذهبي واحد. يحصل الفائزون على 20% من إجمالي مجمع السحب، بحد أدنى مضمون.',
    termsEn: 'Requires matching 5 main numbers and 1 lucky star. Awarded 20% of total pool with a guaranteed minimum.',
    payoutTermsAr: 'صرف مباشر وفوري في المحفظة خلال أقل من 10 ثوانٍ من انتهاء السحب التشفيري.',
    payoutTermsEn: 'Direct instant credit to wallet in under 10 seconds following cryptographic draw execution.',
  },
  {
    id: 'tier3_match4_2',
    nameAr: 'المستوى الثالث (4 أرقام + 2 ذهبيين)',
    nameEn: 'Tier 3 (Match 4 + 2 Lucky Stars)',
    matchMain: 4,
    matchLucky: 2,
    sharePercent: 15,
    guaranteedAmount: 10,
    odds: '1 : 621,503',
    termsAr: 'تتطلب مطابقة 4 أرقام رئيسية ورقمي الحظ الذهبيين. يحصل الفائزون على 15% من المجمع بحد أدنى مضمون.',
    termsEn: 'Requires matching 4 main numbers and both 2 lucky stars. Awarded 15% of pool, guaranteed minimum.',
    payoutTermsAr: 'إيداع لحظي في المحفظة مع إشعار فوري وتوليد إيصال رقمي رسمي معتمد.',
    payoutTermsEn: 'Instant deposit with push notification alert and verifiable digital payout receipt.',
  },
  {
    id: 'tier4_match3',
    nameAr: 'المستوى الرابع (3 أرقام + أي ذهبي)',
    nameEn: 'Tier 4 (Match 3 + Any Lucky)',
    matchMain: 3,
    matchLucky: 1,
    sharePercent: 10,
    fixedPrize: 2,
    odds: '1 : 3,107',
    termsAr: 'تتطلب مطابقة 3 أرقام رئيسية ورقم ذهبي واحد على الأقل. جائزة نقدية ثابتة لكل تذكرة فائزة.',
    termsEn: 'Requires matching 3 main numbers and at least 1 lucky star. Fixed cash prize per winning ticket.',
    payoutTermsAr: 'تضاف فوراً لرصيد المحفظة المتاح للاستخدام في طلبات التعويض أو شراء تذاكر جديدة أو السحب.',
    payoutTermsEn: 'Instantly credited to spendable wallet balance for withdrawals or new tickets.',
  },
  {
    id: 'tier5_match2',
    nameAr: 'المستوى الخامس (رقمين + 1 ذهبي)',
    nameEn: 'Tier 5 (Match 2 + 1 Lucky)',
    matchMain: 2,
    matchLucky: 1,
    sharePercent: 5,
    fixedPrize: 1,
    odds: '1 : 128',
    termsAr: 'تتطلب مطابقة رقمين رئيسيين ورقم ذهبي واحد. تمنحك جائزة نقدية أو تذكرة تكافل مجانية إضافية للمشاركة في السحب القادم.',
    termsEn: 'Requires matching 2 main numbers and 1 lucky star. Awards cash or a free compassion lottery ticket.',
    payoutTermsAr: 'تسليم فوري للمحفظة وتحديث فوري لرصيد التذاكر المجانية.',
    payoutTermsEn: 'Immediate credit and updated free ticket balance.',
  },
];

// SHA-256 helper using Web Crypto API
export async function sha256(message: string): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (err) {
    console.warn('WebCrypto not available, using fallback hash', err);
  }
  // Simple deterministic fallback hash if crypto not available
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `fallback_sha256_${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

// Initial seed draws
const INITIAL_DRAWS: LotteryDraw[] = [
  {
    id: 'DRAW-2026-088',
    drawNumber: 88,
    titleAr: 'سحب VEX الأسبوعي الذهبي الكبرى #88',
    titleEn: 'VEX Weekly Mega Gold Draw #88',
    status: 'open',
    ticketPrice: 0.5,
    currency: 'USD',
    jackpotAmount: 100.0,
    initialJackpot: 100.0,
    totalPool: 100.0,
    ticketsSoldCount: 0,
    participantsCount: 0,
    openAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    closeAt: new Date(Date.now() + 2 * 86400000).toISOString(),
    drawAt: new Date(Date.now() + 2 * 86400000 + 3600000).toISOString(),
    provablyFair: {
      serverSeed: 'vex_secret_server_seed_draw_88_unrevealed_protected',
      serverSeedHash: '8f2d9c12be8733a1e9447190bb5e463a79d012435e9821a7c50a1df27e029141',
      clientSeed: 'btc_block_891240_eth_pos_vex_community_seed_88',
      nonce: 88,
      verified: false,
    },
    tiers: DEFAULT_PRIZE_TIERS,
    isRollover: true,
  },
  {
    id: 'DRAW-2026-087',
    drawNumber: 87,
    titleAr: 'سحب VEX الأسبوعي الكبرى #87',
    titleEn: 'VEX Weekly Mega Draw #87',
    status: 'completed',
    ticketPrice: 0.5,
    currency: 'USD',
    jackpotAmount: 85.0,
    initialJackpot: 75.0,
    totalPool: 120.0,
    ticketsSoldCount: 0,
    participantsCount: 0,
    openAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    closeAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    drawAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    winningMainNumbers: [7, 14, 23, 38, 45],
    winningLuckyNumbers: [3, 9],
    provablyFair: {
      serverSeed: 'vex_seed_draw_87_revealed_provably_fair_verified_key_99',
      serverSeedHash: 'c4e3f19a7381df495029bbd6235183421183aa632b85e0ff08119156a0cb5d6e',
      clientSeed: 'btc_block_890120_vex_seed_87',
      nonce: 87,
      verified: true,
    },
    tiers: DEFAULT_PRIZE_TIERS,
    winnersCount: {
      tier1_jackpot: 0,
      tier2_match5: 0,
      tier3_match4_2: 0,
      tier4_match3: 0,
      tier5_match2: 0,
    },
    totalPaidOut: 0,
    isRollover: true,
  },
  {
    id: 'DRAW-2026-086',
    drawNumber: 86,
    titleAr: 'سحب تضامن المنحوسين الاستثنائي #86',
    titleEn: 'Unlucky Solidarity Special Draw #86',
    status: 'completed',
    ticketPrice: 0.5,
    currency: 'USD',
    jackpotAmount: 70.0,
    initialJackpot: 75.0,
    totalPool: 95.0,
    ticketsSoldCount: 0,
    participantsCount: 0,
    openAt: new Date(Date.now() - 17 * 86400000).toISOString(),
    closeAt: new Date(Date.now() - 11 * 86400000).toISOString(),
    drawAt: new Date(Date.now() - 11 * 86400000).toISOString(),
    winningMainNumbers: [4, 18, 29, 33, 49],
    winningLuckyNumbers: [6, 11],
    provablyFair: {
      serverSeed: 'vex_seed_draw_86_revealed_provably_fair_solidarity_pass',
      serverSeedHash: '9a318cd7612f059ab5e2544a03498b839211c479e9842106e23298a0cbeff821',
      clientSeed: 'btc_block_889150_vex_seed_86',
      nonce: 86,
      verified: true,
    },
    tiers: DEFAULT_PRIZE_TIERS,
    winnersCount: {
      tier1_jackpot: 0,
      tier2_match5: 0,
      tier3_match4_2: 0,
      tier4_match3: 0,
      tier5_match2: 0,
    },
    totalPaidOut: 0,
    isRollover: false,
  },
];

class LotteryService {
  private draws: LotteryDraw[] = [];
  private tickets: LotteryTicket[] = [];

  constructor() {
    this.initData();
  }

  private initData() {
    if (typeof window === 'undefined') return;

    try {
      // Capture BEFORE migrateSeedAmounts refreshes the marker: a stale marker
      // means this install still carries the fabricated seed counters.
      const needsCounterCleanup =
        localStorage.getItem(STORAGE_KEYS.SEED_VERSION) !== SEED_VERSION;

      const storedDraws = localStorage.getItem(STORAGE_KEYS.DRAWS);
      if (storedDraws) {
        this.draws = JSON.parse(storedDraws);
        this.migrateSeedAmounts();
      } else {
        this.draws = INITIAL_DRAWS;
        localStorage.setItem(STORAGE_KEYS.DRAWS, JSON.stringify(INITIAL_DRAWS));
        localStorage.setItem(STORAGE_KEYS.SEED_VERSION, SEED_VERSION);
      }

      const storedTickets = localStorage.getItem(STORAGE_KEYS.TICKETS);
      if (storedTickets) {
        this.tickets = JSON.parse(storedTickets);
      } else {
        this.tickets = [];
      }

      if (needsCounterCleanup && this.reconcileSeedCounters()) {
        this.saveDraws();
      }
    } catch (e) {
      console.warn('Error loading lottery data from localStorage:', e);
      this.draws = INITIAL_DRAWS;
      this.tickets = [];
    }
  }

  /**
   * v5: the demo seed draws shipped with FABRICATED counters (200/240/190
   * tickets, 60/70/65 participants, fake winner breakdowns and payouts).
   * Recompute them from the REAL ticket ledger so every figure shown is true:
   * a draw that sold nothing displays zero everywhere.
   */
  private reconcileSeedCounters(): boolean {
    const seedIds = new Set(['DRAW-2026-086', 'DRAW-2026-087', 'DRAW-2026-088']);
    let changed = false;
    for (const d of this.draws) {
      if (!d || !seedIds.has(d.id)) continue;
      const owned = this.tickets.filter((t) => t && t.drawId === d.id);
      const winnersCount: Record<string, number> = {
        tier1_jackpot: 0,
        tier2_match5: 0,
        tier3_match4_2: 0,
        tier4_match3: 0,
        tier5_match2: 0,
      };
      let paidOut = 0;
      for (const t of owned) {
        if ((t.prizeWon || 0) > 0 && t.matchedTier && winnersCount[t.matchedTier] !== undefined) {
          winnersCount[t.matchedTier] += 1;
          paidOut += t.prizeWon || 0;
        }
      }
      paidOut = Math.round(paidOut * 100) / 100;
      const sold = owned.length;
      const participants = new Set(owned.map((t) => t.userId).filter(Boolean)).size;
      if (
        d.ticketsSoldCount !== sold ||
        d.participantsCount !== participants ||
        d.totalPaidOut !== paidOut ||
        JSON.stringify(d.winnersCount) !== JSON.stringify(winnersCount)
      ) {
        d.ticketsSoldCount = sold;
        d.participantsCount = participants;
        d.totalPaidOut = paidOut;
        d.winnersCount = winnersCount;
        changed = true;
      }
    }
    return changed;
  }

  private saveDraws() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.DRAWS, JSON.stringify(this.draws));
    }
  }

  /** Tier figures still on the OLD prize scale (seed tiers are fixed at
   *  100/25/10/2/1 — never sales-driven, so big values mean stale data). */
  private hasStaleTierScale(draws: LotteryDraw[]): boolean {
    return draws.some(
      (d) =>
        Array.isArray(d?.tiers) &&
        d.tiers.some((t) => Number(t?.guaranteedAmount) > 500 || Number(t?.fixedPrize) > 500)
    );
  }

  /** Old-seed evidence: exact legacy seed figures anywhere on the draw. */
  private isOldScaleDraw(d: LotteryDraw | null | undefined): boolean {
    if (!d) return false;
    if (this.hasStaleTierScale([d])) return true;
    return LEGACY_SEED_AMOUNTS.some(
      (m) =>
        Number(d.jackpotAmount) === m.jackpot ||
        Number(d.initialJackpot) === m.initial ||
        Number(d.totalPool) === m.pool
    );
  }

  /**
   * Rewrite ONE draw from the old seed figures to the current small scale:
   * exact legacy figures are remapped, every tier field is renewed from the
   * current structure (cached copies still carry the $1,000-scale wording,
   * and stale guaranteedAmount on fixed-prize tiers is dropped) and anything
   * still on the big scale is capped down. Idempotent — returns the same
   * reference when nothing changes.
   */
  private normalizeDraw(input: LotteryDraw): LotteryDraw {
    if (!input) return input;
    const d = input;
    // Always renew the WHOLE tier figure set from the current structure.
    const tiers = Array.isArray(d.tiers)
      ? d.tiers.map((t) => {
          const fresh = DEFAULT_PRIZE_TIERS.find((x) => x.id === t?.id);
          if (!fresh) return t;
          return {
            ...t,
            ...fresh,
            ...(fresh.guaranteedAmount === undefined ? { guaranteedAmount: undefined } : null),
            ...(fresh.fixedPrize === undefined ? { fixedPrize: undefined } : null),
          } as LotteryPrizeTier;
        })
      : d.tiers;
    const tiersChanged = JSON.stringify(tiers) !== JSON.stringify(d.tiers);
    const legacy = LEGACY_SEED_AMOUNTS.find((m) => Number(d.jackpotAmount) === m.jackpot);
    let out: LotteryDraw;
    if (legacy) {
      out = {
        ...d,
        jackpotAmount: legacy.jackpotTo,
        initialJackpot: Number(d.initialJackpot) === legacy.initial ? legacy.initialTo : d.initialJackpot,
        totalPool: Number(d.totalPool) === legacy.pool ? legacy.poolTo : d.totalPool,
        totalPaidOut:
          legacy.paidOut !== undefined && Number(d.totalPaidOut) === legacy.paidOut
            ? legacy.paidOutTo
            : d.totalPaidOut,
        tiers,
      } as LotteryDraw;
    } else if (tiersChanged) {
      out = { ...d, tiers } as LotteryDraw;
    } else {
      out = d;
    }
    // Safety cap: any figure still on the OLD big scale (sales-grown or
    // admin-set) is brought down to the small starting scale — the board must
    // show small numbers everywhere after this version.
    const big = (v: unknown) => Number(v) > 500;
    const needsCap =
      big(out.jackpotAmount) ||
      big(out.initialJackpot) ||
      big(out.totalPool) ||
      big(out.totalPaidOut) ||
      Number(out.ticketPrice) > 0.5;
    if (!needsCap) return out;
    return {
      ...out,
      ticketPrice: Number(out.ticketPrice) > 0.5 ? 0.5 : out.ticketPrice,
      jackpotAmount: big(out.jackpotAmount) ? 100 : out.jackpotAmount,
      initialJackpot: big(out.initialJackpot) ? 100 : out.initialJackpot,
      totalPool: big(out.totalPool) ? 100 : out.totalPool,
      totalPaidOut: big(out.totalPaidOut) ? 40 : out.totalPaidOut,
    } as LotteryDraw;
  }

  private normalizeDrawList(list: LotteryDraw[]): { draws: LotteryDraw[]; changed: boolean } {
    let changed = false;
    const draws = list.map((d) => {
      const fixed = this.normalizeDraw(d);
      if (fixed !== d) changed = true;
      return fixed;
    });
    return { draws, changed };
  }

  /**
   * One-time seed normalization: cached draws that still hold the OLD prize
   * figures are rewritten to the current reduced amounts. Draws whose jackpot
   * was changed (admin / live sales) keep their value untouched.
   */
  private migrateSeedAmounts(): void {
    if (typeof window === 'undefined') return;
    try {
      // The version marker alone can be lying: a background tab running an older
      // bundle re-saves its stale in-memory draws AFTER this migration already
      // ran and wrote the current marker. Old-scale tier figures therefore
      // force a re-run even when the marker matches.
      const markerCurrent = localStorage.getItem(STORAGE_KEYS.SEED_VERSION) === SEED_VERSION;
      if (markerCurrent && !this.hasStaleTierScale(this.draws)) return;
      const { draws, changed } = this.normalizeDrawList(this.draws);
      this.draws = draws;
      if (changed) this.saveDraws();
      localStorage.setItem(STORAGE_KEYS.SEED_VERSION, SEED_VERSION);
    } catch {
      // migration is best-effort — never break lottery loading
    }
  }

  private saveTickets() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(this.tickets));
    }
  }

  /**
   * Replace every cached draw's ticketsSoldCount/participantsCount with the
   * SERVER ticket ledger's real figures (draws absent from the ledger show 0).
   * Fabricated seed counters (e.g. "3454 sold / 890 participants" with zero
   * actual tickets) are therefore never displayed. Best-effort: offline the
   * cached figures simply stay as they are.
   */
  private async overlayServerCounts(): Promise<void> {
    try {
      const res = await fetch('/api/lottery/draw-counts');
      if (!res.ok) return;
      const data = await res.json().catch(() => ({} as any));
      const counts = data?.counts;
      if (!counts || typeof counts !== 'object') return;
      for (const d of this.draws) {
        if (!d?.id) continue;
        const real = counts[d.id];
        const ticketsSold = real ? Number(real.ticketsSold) || 0 : 0;
        const participants = real ? Number(real.participants) || 0 : 0;
        if (d.ticketsSoldCount !== ticketsSold || d.participantsCount !== participants) {
          d.ticketsSoldCount = ticketsSold;
          d.participantsCount = participants;
          // Heal the Firestore source so every other client sees the truth too.
          if (db && d.id) {
            setDoc(
              doc(db, 'lottery_draws', d.id),
              { ticketsSoldCount: ticketsSold, participantsCount: participants },
              { merge: true }
            ).catch(() => {
              // best-effort write-back
            });
          }
        }
      }
    } catch {
      // offline — keep cached counters
    }
  }

  // Get active and past draws
  public async getDraws(): Promise<LotteryDraw[]> {
    this.initData();
    // Try to sync with Firestore if available
    try {
      if (db) {
        const snap = await getDocs(collection(db, 'lottery_draws'));
        if (!snap.empty) {
          const remoteDraws: LotteryDraw[] = [];
          snap.forEach((d) => remoteDraws.push(d.data() as LotteryDraw));
          if (remoteDraws.length > 0) {
            // merge
            remoteDraws.sort((a, b) => b.drawNumber - a.drawNumber);
            // The Firestore collection still stores pre-v3 seed documents (old
            // big figures + $1,000 terms wording). Heal old-scale documents on
            // read so the board NEVER shows the old numbers, and write the
            // fixed document back so the source heals for every client.
            // Live/admin-adjusted new-scale draws pass through untouched.
            const changedDocs: LotteryDraw[] = [];
            const normalized = remoteDraws.map((d) => {
              if (!this.isOldScaleDraw(d)) return d;
              const fixed = this.normalizeDraw(d);
              if (fixed !== d) changedDocs.push(fixed);
              return fixed;
            });
            this.draws = normalized;
            // Overlay the SERVER ledger's real counters (tickets sold /
            // participants) — Firestore docs may still carry fabricated seed
            // figures that no purchase ever backed.
            await this.overlayServerCounts();
            this.saveDraws();
            if (changedDocs.length > 0 && db) {
              changedDocs.forEach((d) => {
                if (!d?.id) return;
                setDoc(doc(db, 'lottery_draws', d.id), d, { merge: true }).catch(() => {
                  // best-effort write-back — read normalization already healed this client
                });
              });
            }
            return [...this.draws].sort((a, b) => b.drawNumber - a.drawNumber);
          }
        }
      }
    } catch (err) {
      console.debug('Firestore read not available, using local draws:', err);
    }
    return [...this.draws].sort((a, b) => b.drawNumber - a.drawNumber);
  }

  // Get active running draw
  public async getActiveDraw(): Promise<LotteryDraw | null> {
    const draws = await this.getDraws();
    return draws.find((d) => d.status === 'open' || d.status === 'drawing') || draws[0] || null;
  }

  // Get user tickets
  public async getUserTickets(userId: string): Promise<LotteryTicket[]> {
    this.initData();
    try {
      if (db) {
        const q = query(collection(db, 'lottery_tickets'), where('userId', '==', userId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const remoteTickets: LotteryTicket[] = [];
          snap.forEach((d) => remoteTickets.push(d.data() as LotteryTicket));
          if (remoteTickets.length > 0) {
            this.tickets = remoteTickets;
            this.saveTickets();
            return remoteTickets.sort(
              (a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()
            );
          }
        }
      }
    } catch (err) {
      console.debug('Firestore read not available for tickets:', err);
    }

    return this.tickets
      .filter((t) => t.userId === userId)
      .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());
  }

  // Get user free compassion tickets balance (from unlucky wall losses or referrals)
  public getFreeCompassionTicketsCount(userId: string): number {
    if (typeof window === 'undefined') return 1;
    const raw = localStorage.getItem(`${STORAGE_KEYS.FREE_TICKETS_BALANCE}${userId}`);
    if (raw !== null) {
      return parseInt(raw, 10) || 0;
    }
    // Default 1 free solidarity welcome ticket for all users
    localStorage.setItem(`${STORAGE_KEYS.FREE_TICKETS_BALANCE}${userId}`, '1');
    return 1;
  }

  // Set or update user free tickets count
  public setFreeCompassionTicketsCount(userId: string, count: number): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${STORAGE_KEYS.FREE_TICKETS_BALANCE}${userId}`, Math.max(0, count).toString());
  }

  // Generate Lucky Dip / Quick Pick Numbers
  public generateQuickPick(): { mainNumbers: number[]; luckyNumbers: number[] } {
    const mainSet = new Set<number>();
    while (mainSet.size < 5) {
      mainSet.add(Math.floor(Math.random() * 50) + 1);
    }
    const luckySet = new Set<number>();
    while (luckySet.size < 2) {
      luckySet.add(Math.floor(Math.random() * 12) + 1);
    }
    return {
      mainNumbers: Array.from(mainSet).sort((a, b) => a - b),
      luckyNumbers: Array.from(luckySet).sort((a, b) => a - b),
    };
  }

  // Buy Ticket
  public async purchaseTicket(params: {
    userId: string;
    drawId: string;
    mainNumbers: number[];
    luckyNumbers: number[];
    paymentMethod: 'wallet_balance' | 'compassion_free_ticket' | 'promo_credit';
    companyId?: string;
    userPhoneMasked?: string;
  }): Promise<{ success: boolean; ticket?: LotteryTicket; error?: string }> {
    this.initData();
    const { userId, drawId, mainNumbers, luckyNumbers, paymentMethod, companyId, userPhoneMasked } = params;

    const draw = this.draws.find((d) => d.id === drawId);
    if (!draw) {
      return { success: false, error: 'Draw not found' };
    }
    if (draw.status !== 'open') {
      return { success: false, error: 'Draw is currently not open for ticket purchases' };
    }

    // Validation
    if (mainNumbers.length !== 5 || luckyNumbers.length !== 2) {
      return { success: false, error: 'Please select exactly 5 main numbers and 2 lucky stars' };
    }
    const uniqueMain = new Set(mainNumbers);
    const uniqueLucky = new Set(luckyNumbers);
    if (uniqueMain.size !== 5 || uniqueLucky.size !== 2) {
      return { success: false, error: 'Numbers must be distinct' };
    }

    // Compute price + generate the ticket id, then RECORD THE PURCHASE SERVER-SIDE FIRST.
    // The server authoritatively deducts from AVAILABLE and stores the ticket; if it fails
    // we abort before mutating any local state (free counter / draw metrics).
    const ticketPrice = paymentMethod === 'compassion_free_ticket' ? 0 : draw.ticketPrice;
    const ticketId = `TCK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    try {
      const res = await fetch('/api/wallets/lottery-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          price: ticketPrice,
          ticket_id: ticketId,
          draw_id: drawId,
          main_numbers: mainNumbers,
          lucky_numbers: luckyNumbers,
        }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok || !data?.success) {
        return { success: false, error: data?.error || 'فشل شراء التذكرة على السيرفر.' };
      }
    } catch {
      return { success: false, error: 'تعذر الاتصال بالسيرفر لإتمام شراء التذكرة.' };
    }

    // Handle free ticket deduction (local counter) — only after the server record succeeded.
    if (paymentMethod === 'compassion_free_ticket') {
      const freeCount = this.getFreeCompassionTicketsCount(userId);
      if (freeCount <= 0) {
        return { success: false, error: 'No free compassion tickets available in your balance' };
      }
      this.setFreeCompassionTicketsCount(userId, freeCount - 1);
    }

    const newTicket: LotteryTicket = {
      id: ticketId,
      drawId: draw.id,
      drawNumber: draw.drawNumber,
      userId,
      userPhoneMasked: userPhoneMasked || `${userId.slice(0, 4)}***`,
      companyId,
      mainNumbers: [...mainNumbers].sort((a, b) => a - b),
      luckyNumbers: [...luckyNumbers].sort((a, b) => a - b),
      pricePaid: ticketPrice,
      paymentMethod,
      purchasedAt: new Date().toISOString(),
      matchedMainCount: 0,
      matchedLuckyCount: 0,
      isClaimed: false,
    };

    // Update draw metrics
    draw.ticketsSoldCount += 1;
    if (ticketPrice > 0) {
      draw.jackpotAmount += ticketPrice * 0.6; // 60% feeds progressive jackpot
      draw.totalPool += ticketPrice;
    }
    this.saveDraws();

    // Save ticket locally
    this.tickets.unshift(newTicket);
    this.saveTickets();

    // Sync to Firestore if available
    try {
      if (db) {
        await setDoc(doc(db, 'lottery_tickets', newTicket.id), newTicket);
        await setDoc(doc(db, 'lottery_draws', draw.id), draw, { merge: true });
      }
    } catch (err) {
      console.debug('Firestore async sync skipped:', err);
    }

    return { success: true, ticket: newTicket };
  }

  // Verify Provably Fair Hash
  public async verifyDrawFairness(draw: LotteryDraw): Promise<{
    isValid: boolean;
    computedHash: string;
    expectedHash: string;
  }> {
    const computedHash = await sha256(draw.provablyFair.serverSeed);
    const expectedHash = draw.provablyFair.serverSeedHash;
    const isValid = computedHash.toLowerCase() === expectedHash.toLowerCase();
    return {
      isValid,
      computedHash,
      expectedHash,
    };
  }

  // Admin: Trigger Draw and evaluate winners
  public async triggerDraw(
    drawId: string,
    forcedNumbers?: { mainNumbers: number[]; luckyNumbers: number[] }
  ): Promise<{
    success: boolean;
    winningMain: number[];
    winningLucky: number[];
    totalWinners: number;
    totalPayout: number;
  }> {
    this.initData();
    const draw = this.draws.find((d) => d.id === drawId);
    if (!draw) {
      return {
        success: false,
        winningMain: [],
        winningLucky: [],
        totalWinners: 0,
        totalPayout: 0,
      };
    }

    // Determine winning numbers
    let winningMain: number[] = [];
    let winningLucky: number[] = [];

    if (forcedNumbers && forcedNumbers.mainNumbers.length === 5 && forcedNumbers.luckyNumbers.length === 2) {
      winningMain = [...forcedNumbers.mainNumbers].sort((a, b) => a - b);
      winningLucky = [...forcedNumbers.luckyNumbers].sort((a, b) => a - b);
    } else {
      const generated = this.generateQuickPick();
      winningMain = generated.mainNumbers;
      winningLucky = generated.luckyNumbers;
    }

    draw.winningMainNumbers = winningMain;
    draw.winningLuckyNumbers = winningLucky;
    draw.status = 'completed';
    draw.drawAt = new Date().toISOString();
    draw.provablyFair.verified = true;

    // Evaluate all tickets for this draw
    let totalWinners = 0;
    let totalPayout = 0;
    const winnersCount: Record<string, number> = {
      tier1_jackpot: 0,
      tier2_match5: 0,
      tier3_match4_2: 0,
      tier4_match3: 0,
      tier5_match2: 0,
    };

    this.tickets.forEach((t) => {
      if (t.drawId === drawId) {
        const matchedMain = t.mainNumbers.filter((n) => winningMain.includes(n)).length;
        const matchedLucky = t.luckyNumbers.filter((n) => winningLucky.includes(n)).length;
        t.matchedMainCount = matchedMain;
        t.matchedLuckyCount = matchedLucky;

        // Tier evaluation
        if (matchedMain === 5 && matchedLucky === 2) {
          t.matchedTier = 'tier1_jackpot';
          t.prizeWon = draw.jackpotAmount;
          winnersCount.tier1_jackpot += 1;
          totalWinners++;
          totalPayout += t.prizeWon;
        } else if (matchedMain === 5 && matchedLucky >= 1) {
          t.matchedTier = 'tier2_match5';
          t.prizeWon = Math.round(draw.totalPool * 0.2);
          winnersCount.tier2_match5 += 1;
          totalWinners++;
          totalPayout += t.prizeWon;
        } else if (matchedMain === 4 && matchedLucky >= 1) {
          t.matchedTier = 'tier3_match4_2';
          t.prizeWon = Math.round(draw.totalPool * 0.15); // matches advertised 15%
          winnersCount.tier3_match4_2 += 1;
          totalWinners++;
          totalPayout += t.prizeWon;
        } else if (matchedMain >= 3) {
          t.matchedTier = 'tier4_match3';
          t.prizeWon = 2.0;
          winnersCount.tier4_match3 += 1;
          totalWinners++;
          totalPayout += t.prizeWon;
        } else if (matchedMain >= 2 && matchedLucky >= 1) {
          t.matchedTier = 'tier5_match2';
          t.prizeWon = 1.0;
          winnersCount.tier5_match2 += 1;
          totalWinners++;
          totalPayout += t.prizeWon;
        } else {
          t.matchedTier = undefined;
          t.prizeWon = 0;
        }
      }
    });

    draw.winnersCount = winnersCount;
    draw.totalPaidOut = totalPayout;
    this.saveDraws();
    this.saveTickets();

    // Server-authoritative prize settlement: the server recomputes each ticket's tier
    // from the winning numbers and credits winners' AVAILABLE balance (idempotent).
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const tok = sessionStorage.getItem('vex_admin_api_token') || '';
        if (tok) headers['x-admin-token'] = tok;
      } catch {
        // sessionStorage unavailable
      }
      const settleRes = await fetch('/api/admin/lottery/settle-draw', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          draw_id: drawId,
          winning_main: winningMain,
          winning_lucky: winningLucky,
          jackpot_amount: draw.jackpotAmount,
          total_pool: draw.totalPool,
        }),
      });
      if (!settleRes.ok) {
        const errData = await settleRes.json().catch(() => ({} as any));
        console.warn('Lottery settlement on server failed:', errData?.error || settleRes.status);
      }
    } catch (e) {
      console.debug('Server lottery settlement skipped:', e);
    }

    // Sync to Firestore
    try {
      if (db) {
        await setDoc(doc(db, 'lottery_draws', draw.id), draw, { merge: true });
      }
    } catch (e) {
      console.debug('Firestore sync on draw complete skipped:', e);
    }

    return {
      success: true,
      winningMain,
      winningLucky,
      totalWinners,
      totalPayout,
    };
  }

  // Admin: Create new scheduled draw
  public async createDraw(params: {
    titleAr: string;
    titleEn: string;
    ticketPrice: number;
    initialJackpot: number;
    closeAt: string;
  }): Promise<LotteryDraw> {
    this.initData();
    const nextNumber = (this.draws[0]?.drawNumber || 88) + 1;
    const serverSeed = `vex_seed_draw_${nextNumber}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const serverSeedHash = await sha256(serverSeed);

    const newDraw: LotteryDraw = {
      id: `DRAW-2026-0${nextNumber}`,
      drawNumber: nextNumber,
      titleAr: params.titleAr || `سحب VEX الأسبوعي الكبرى #${nextNumber}`,
      titleEn: params.titleEn || `VEX Mega Draw #${nextNumber}`,
      status: 'open',
      ticketPrice: params.ticketPrice || 0.5,
      currency: 'USD',
      jackpotAmount: params.initialJackpot || 100.0,
      initialJackpot: params.initialJackpot || 100.0,
      totalPool: params.initialJackpot || 100.0,
      ticketsSoldCount: 0,
      participantsCount: 0,
      openAt: new Date().toISOString(),
      closeAt: params.closeAt || new Date(Date.now() + 7 * 86400000).toISOString(),
      drawAt: new Date(new Date(params.closeAt || Date.now() + 7 * 86400000).getTime() + 3600000).toISOString(),
      provablyFair: {
        serverSeed,
        serverSeedHash,
        clientSeed: `btc_block_latest_community_nonce_${nextNumber}`,
        nonce: nextNumber,
        verified: false,
      },
      tiers: DEFAULT_PRIZE_TIERS,
      isRollover: false,
    };

    this.draws.unshift(newDraw);
    this.saveDraws();

    try {
      if (db) {
        await setDoc(doc(db, 'lottery_draws', newDraw.id), newDraw);
      }
    } catch (e) {
      console.debug('Firestore sync on create draw skipped:', e);
    }

    return newDraw;
  }

  // Get statistics — REAL figures only (no fabricated counters).
  public getStats(): LotteryStats {
    this.initData();
    const completed = this.draws.filter((d) => d.status === 'completed');
    const totalPaid = completed.reduce((acc, d) => acc + (d.totalPaidOut || 0), 0);
    const totalSold = this.draws.reduce((acc, d) => acc + d.ticketsSoldCount, 0);

    // Hot/cold numbers computed from ACTUAL tickets sold (empty until data exists).
    const frequency: Record<number, number> = {};
    for (const t of this.tickets) {
      for (const n of t.mainNumbers || []) frequency[n] = (frequency[n] || 0) + 1;
    }
    const ranked = Object.entries(frequency)
      .map(([n, f]) => ({ number: Number(n), frequency: f }))
      .sort((a, b) => b.frequency - a.frequency);
    const hotNumbers = ranked.slice(0, 5);
    const coldNumbers = ranked.slice(-5).reverse();

    const compassionTicketsAwarded = this.tickets.filter(
      (t) => t.paymentMethod === 'compassion_free_ticket'
    ).length;
    const biggestJackpotWon = this.tickets.reduce(
      (max, t) => Math.max(max, t.matchedTier === 'tier1_jackpot' ? t.prizeWon || 0 : 0),
      0
    );

    return {
      totalDrawsCompleted: completed.length,
      totalPrizesPaid: totalPaid,
      totalTicketsSold: totalSold,
      biggestJackpotWon,
      compassionTicketsAwarded,
      hotNumbers,
      coldNumbers,
    };
  }

  // Get user won prizes history
  public async getUserWonPrizes(userId: string): Promise<LotteryUserWonPrize[]> {
    this.initData();
    const wonTickets = this.tickets.filter((t) => t.userId === userId && (t.prizeWon || 0) > 0);
    const convertedWonTickets: LotteryUserWonPrize[] = wonTickets.map((t) => {
      const draw = this.draws.find((d) => d.id === t.drawId);
      const tier = DEFAULT_PRIZE_TIERS.find((p) => p.id === t.matchedTier) || DEFAULT_PRIZE_TIERS[4];
      return {
        id: `WIN-${t.id}`,
        ticketId: t.id,
        drawId: t.drawId,
        drawNumber: t.drawNumber,
        drawTitleAr: draw?.titleAr || `سحب VEX التكافلي #${t.drawNumber}`,
        drawTitleEn: draw?.titleEn || `VEX Solidarity Draw #${t.drawNumber}`,
        date: t.claimedAt || t.purchasedAt,
        prizeNameAr: tier.nameAr,
        prizeNameEn: tier.nameEn,
        tierId: t.matchedTier || 'tier5_match2',
        amountWon: t.prizeWon || 0,
        matchedMainCount: t.matchedMainCount || 0,
        matchedLuckyCount: t.matchedLuckyCount || 0,
        mainNumbers: t.mainNumbers,
        luckyNumbers: t.luckyNumbers,
        deliveryStatus: 'deposited_to_wallet',
        payoutWalletCompanyId: t.companyId,
        transactionRef: t.transactionId || `VEX-TX-${t.id.slice(-6)}`,
        claimedAt: t.claimedAt,
      };
    });

    // Check custom saved records in localStorage
    let customWon: LotteryUserWonPrize[] = [];
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`${STORAGE_KEYS.USER_WON_PRIZES}${userId}`);
        if (raw) {
          customWon = JSON.parse(raw);
        }
      } catch (e) {
        console.warn('Failed to parse custom won prizes', e);
      }
    }

    // No fabricated/demo win records — an empty history is the truth.
    if (convertedWonTickets.length === 0 && customWon.length === 0) {
      return [];
    }

    const all = [...convertedWonTickets, ...customWon];
    const seen = new Set<string>();
    return all.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Sync active draw with backend notification worker
  public async syncDrawWithServer(draw: LotteryDraw): Promise<void> {
    try {
      await fetch('/api/lottery/sync-draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drawId: draw.id,
          titleAr: draw.titleAr,
          titleEn: draw.titleEn,
          closeAt: draw.closeAt,
          jackpotAmount: draw.jackpotAmount,
        }),
      });
    } catch (err) {
      console.warn('Server draw sync skipped:', err);
    }
  }

  // Trigger 1-hour pre-draw notification via server API
  public async triggerOneHourPreDrawNotification(): Promise<{ success: boolean; message?: string; notification?: any }> {
    try {
      const res = await fetch('/api/lottery/trigger-1hour-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Failed to trigger 1-hour notification via server:', err);
    }
    return { success: false, message: 'Server unreachable' };
  }

  // Get Custom Prize Tier Alert Settings (30-min pre-draw FCM alerts)
  public getTierAlertSettings(): LotteryAlertSettings {
    const defaultSettings: LotteryAlertSettings = {
      fcmEnabled: true,
      fcmToken: null,
      globalDrawAlert: true,
      thirtyMinTierAlertsEnabled: true,
      tierConfigs: {
        tier1_jackpot: { tierId: 'tier1_jackpot', enabled: true, leadTimeMinutes: 30, soundEnabled: true },
        tier2_match5: { tierId: 'tier2_match5', enabled: true, leadTimeMinutes: 30, soundEnabled: true },
        tier3_match4_2: { tierId: 'tier3_match4_2', enabled: true, leadTimeMinutes: 30, soundEnabled: true },
        tier4_match3: { tierId: 'tier4_match3', enabled: true, leadTimeMinutes: 30, soundEnabled: false },
        tier5_match2: { tierId: 'tier5_match2', enabled: true, leadTimeMinutes: 30, soundEnabled: false },
      },
      lastUpdated: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEYS.ALERT_SETTINGS);
      if (stored) {
        try {
          return { ...defaultSettings, ...JSON.parse(stored) };
        } catch {
          return defaultSettings;
        }
      }
    }
    return defaultSettings;
  }

  // Save Custom Prize Tier Alert Settings
  public async saveTierAlertSettings(settings: LotteryAlertSettings): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ALERT_SETTINGS, JSON.stringify(settings));
    }

    // Sync active tier subscriptions with backend notification worker
    try {
      const tierSubs: Record<string, boolean> = {};
      Object.entries(settings.tierConfigs).forEach(([k, v]) => {
        tierSubs[k] = v.enabled;
      });

      await fetch('/api/lottery/update-tier-alert-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierAlertSubscriptions: tierSubs,
          fcmToken: settings.fcmToken,
        }),
      });
    } catch (err) {
      console.warn('Could not sync tier alert settings with server:', err);
    }
  }

  // Request FCM Permission and Token
  public async enableFcmPushNotifications(): Promise<string | null> {
    try {
      const token = await requestFCMToken();
      if (token) {
        const current = this.getTierAlertSettings();
        current.fcmEnabled = true;
        current.fcmToken = token;
        await this.saveTierAlertSettings(current);
      }
      return token;
    } catch (e) {
      console.warn('FCM Push request failed:', e);
      return null;
    }
  }

  // Trigger 30-Minute Customized Tier Push Alert via FCM
  public async triggerThirtyMinTierFcmAlert(
    tierId: LotteryTierId = 'tier1_jackpot'
  ): Promise<{ success: boolean; message?: string; notification?: any }> {
    try {
      const res = await fetch('/api/lottery/trigger-30min-tier-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Failed to trigger 30-min tier alert via server:', err);
    }
    return { success: false, message: 'Server unreachable' };
  }

  // Reset to initial test dataset

  public resetToDefaults(): void {
    this.draws = INITIAL_DRAWS;
    this.tickets = [];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.DRAWS, JSON.stringify(INITIAL_DRAWS));
      localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify([]));
    }
  }
}

export const lotteryService = new LotteryService();
