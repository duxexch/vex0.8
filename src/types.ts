export type Language = 'ar' | 'en' | 'es' | 'ru';
export type ThemeMode = 'light' | 'dark';

export const PLATFORM_DOMAIN = 'vex.deals';
export const PLATFORM_URL = 'https://vex.deals';

export type CompanyApiIntegrationType =
  | 'rest_api'           // Direct REST API (Bearer Token / API Key)
  | 'merchant_gateway'   // Merchant / Agent Gateway (Merchant ID + Secret Key)
  | 'webhook_s2s'        // Server-to-Server (S2S) Webhook Trigger
  | 'basic_auth'         // Basic HTTP Auth API (Username / Password)
  | 'oauth2_client';     // OAuth 2.0 Client Credentials (Client ID + Secret)

export type ApiMethodActionType =
  | 'deposit'           // Direct player credit / deposit to app account
  | 'payout'            // Payout / withdrawal from app account
  | 'balance_check'     // Balance inquiry
  | 'account_verify'    // Verify player ID exists in bookmaker system
  | 'webhook_callback'  // Receive server-to-server callback confirmation
  | 'all';              // Universal gateway handling all transactions

export interface CompanyApiMethod {
  id: string;
  name: string;
  name_ar?: string;
  method_type: CompanyApiIntegrationType;
  endpoint_url: string;
  enabled: boolean;
  is_primary?: boolean;
  action_type?: ApiMethodActionType;
  api_key?: string;
  secret_key?: string;
  client_id?: string;
  merchant_id?: string;
  webhook_url?: string;
  account_id_param?: string;
  min_transfer_amount?: number;
  max_transfer_amount?: number;
  allow_available_only: boolean; // Always true: Strict policy protects frozen balances
  auto_payout?: boolean;
  test_mode?: boolean;
  custom_headers?: string;
  notes?: string;
  last_test_status?: 'success' | 'failed' | 'untested';
  last_test_at?: string;
  last_test_latency?: number;
  last_test_message?: string;
  last_response_sample?: any;
}

export interface CompanyApiConfig {
  enabled: boolean;
  integration_type: CompanyApiIntegrationType;
  endpoint_url: string;             // e.g. https://api.company.com/v1/players/deposit
  api_key?: string;                 // API Key / Bearer Token / Client ID
  secret_key?: string;              // Secret Key / Signature Hash / Password
  merchant_id?: string;             // Merchant ID / Agent ID
  webhook_url?: string;             // Webhook callback URL for confirmation
  account_id_param?: string;        // Player account parameter name (e.g. 'player_id', 'user_id', 'account_id')
  min_transfer_amount?: number;     // Minimum transfer threshold in USD
  max_transfer_amount?: number;     // Maximum transfer limit per transaction
  allow_available_only: boolean;    // Always true: Only available balance (not frozen) is transferable
  auto_payout: boolean;             // Immediate automated execution via API
  test_mode?: boolean;              // Sandbox / Test Mode
  custom_headers?: string;          // Optional custom HTTP headers (JSON string)
  notes?: string;                   // Notes or docs URL
  last_test_status?: 'success' | 'failed' | 'untested';
  last_test_at?: string;
}

export interface Company {
  id: string;
  name: string;
  name_ar?: string;
  name_en?: string;
  name_es?: string;
  name_ru?: string;
  type: string;
  details: string;
  details_en?: string;
  details_es?: string;
  details_ru?: string;
  is_active: boolean;
  icon?: string;
  logo_url?: string;
  address?: string;
  affiliate_link: string;
  app_link: string;
  bot_icon?: string;
  promo_code: string;
  show_in_comp: boolean;
  color: string;
  description: string;
  description_en?: string;
  description_es?: string;
  description_ru?: string;
  badge?: string;
  badge_en?: string;
  badge_es?: string;
  badge_ru?: string;
  bonus_text?: string;
  bonus_text_en?: string;
  bonus_text_es?: string;
  bonus_text_ru?: string;
  api_config?: CompanyApiConfig;
  api_methods?: CompanyApiMethod[];
}

export type AccountStatus = 'pending' | 'active' | 'rejected';

export interface CompensationAccount {
  id: string;
  user_id: string;
  company_id: string;
  company_name: string;
  account_number: string;
  status: AccountStatus;
  sub_affiliate_verified?: boolean; // Verified to be registered under VEX promo code
  created_at: string;
}

export interface Wallet {
  user_id: string;
  company_id: string;
  company_name: string;
  icon?: string;
  frozen: number;
  available: number;
  pending_locked?: number; // Concurrency anti-double-spend lock
  last_unfreeze_at?: string; // Anti-Sybil daily cooldown
  created_at: string;
}

export type CompensationRequestStatus = 'pending' | 'approved' | 'rejected';

export interface CompensationRequest {
  id: string;
  user_id: string;
  company_id: string;
  company_name: string;
  account_number: string;
  bet_slip_id?: string; // Required for fraud prevention: official bookmaker slip ID
  loss_date?: string;
  screenshot?: string;
  status: CompensationRequestStatus;
  amount: number;
  currency?: string;
  note?: string;
  verification_stage?: 'auto_checked' | 'slip_verified' | 'admin_approved';
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export type CompensationEmailTemplateType =
  | 'loss_compensation'
  | 'deposit_unfreeze'
  | 'vip_bonus'
  | 'custom';

export interface CompensationEmailTemplate {
  id: string;
  name: string;
  name_ar?: string;
  type: CompensationEmailTemplateType;
  subject: string;
  preheader?: string;
  body_html: string;
  body_text: string;
  is_default?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CompensationEmailPlaceholder {
  key: string;
  label: string;
  label_en: string;
  category: 'balance' | 'company' | 'request' | 'platform';
  example: string;
  description: string;
}

export interface EmailDispatchLog {
  id: string;
  request_id: string;
  template_id: string;
  recipient_email: string;
  user_id: string;
  company_name: string;
  subject: string;
  dispatched_at: string;
  status: 'sent' | 'simulated' | 'failed';
  sent_by?: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  company_id: string;
  company_name: string;
  referral_code: string;
  referred_account: string;
  status: 'registered' | 'pending';
  created_at: string;
  unlocked_amount?: number;
}

export type TransferStatus = 'otp_pending' | 'completed' | 'failed' | 'rejected';

export interface Transfer {
  id: string;
  from_user: string;
  to_account: string;
  to_account_owner_name?: string;
  company_id: string;
  company_name: string;
  amount: number;
  status: TransferStatus;
  otp_phone?: string;
  created_at: string;
  transfer_type?: 'friend_transfer' | 'company_api_payout';
  api_reference?: string;
  api_integration_type?: CompanyApiIntegrationType;
  api_response_message?: string;
}

export interface UserEngagementBehavior {
  hourlyActivity: Record<number, number>; // hour 0..23 -> count of interactions
  peakEngagementHours: number[];          // e.g. [19, 20, 21] (top hours with highest engagement)
  optimalEngagementWindow: {
    startHour: number;                    // e.g. 19
    endHour: number;                      // e.g. 22
    labelAr: string;                      // e.g. "نافذة المساء والذروة (19:00 - 22:00)"
    labelEn: string;                      // e.g. "Peak Evening Window (19:00 - 22:00)"
  };
  lastInteractionAt: string;
  totalInteractions: number;
}

export interface AudienceCohort {
  id: string;
  name: string;
  name_ar: string;
  language: string; // 'ar' | 'en' | 'fr' | 'ru'
  language_name_ar: string;
  language_name_en: string;
  country_code: string; // e.g. '+20'
  country_iso: string; // e.g. 'EG', 'SA', 'MA', 'GLOBAL'
  country_flag: string; // '🇪🇬', '🇸🇦', '🇲🇦', '🌍'
  estimated_users: number;
  description_ar: string;
  description_en: string;
  timezone_offset_hours: number;
  primary_bookmakers: string[];
}

export interface LocalizedNotificationVariant {
  cohortId: string;
  language: string;
  language_name: string;
  country_flag: string;
  country_name: string;
  title: string;
  message: string;
  category?: string;
  urgency?: 'urgent' | 'non-urgent';
  localTimingSuggestion?: string;
  marketingAngle?: string;
}

export interface MultiLanguageCampaign {
  id: string;
  theme: string;
  category: string;
  urgency: 'urgent' | 'non-urgent';
  createdAt: string;
  agentUsed: {
    id: string;
    name_ar: string;
    avatar: string;
  };
  variants: Record<string, LocalizedNotificationVariant>;
}

export type AbTestContrastType = 'linguistic_style' | 'call_to_action' | 'regional_dialect' | 'custom';

export interface RegionalResonanceScore {
  cohortId: string;
  regionNameAr: string;
  regionNameEn: string;
  flag: string;
  scoreA: number;
  scoreB: number;
  preferredVariant: 'A' | 'B';
  reasonAr: string;
  reasonEn?: string;
}

export interface AbNotificationVariant {
  id: 'A' | 'B';
  name: string;
  title: string;
  message: string;
  ctaText: string;
  ctaAction?: string;
  linguisticStyle: string;
  toneDescriptionAr: string;
  toneDescriptionEn?: string;
  sampleSent?: number;
  clicks?: number;
  ctr?: number;
  targetDialect?: string;
}

export interface AbTestNotificationCampaign {
  id: string;
  name: string;
  theme: string;
  contrastType: AbTestContrastType;
  agentId: string;
  agentName?: string;
  status: 'draft' | 'pilot_sent' | 'completed';
  createdAt: string;
  variantA: AbNotificationVariant;
  variantB: AbNotificationVariant;
  regionalResonance: RegionalResonanceScore[];
  hypothesisAr: string;
  hypothesisEn?: string;
  testingStrategyAr?: string;
  winner?: 'A' | 'B' | null;
  winnerReasonAr?: string;
  category?: string;
  urgency?: 'urgent' | 'non-urgent';
}

export interface ScheduledNotification {
  id: string;
  title: string;
  message: string;
  category: string;
  urgency: 'urgent' | 'non-urgent';
  scheduledFor: string;                   // ISO string when it will be delivered
  targetOptimalWindow: string;            // Name of window (e.g. "19:00 - 22:00")
  status: 'pending' | 'dispatched' | 'cancelled';
  createdAt: string;
  targetUserId?: string;                  // specific user or undefined for all
  relevanceScore?: number;
  heuristicReason: string;                // Time-based heuristic explanation
  cohortId?: string;
  targetLanguage?: string;
  translations?: Record<string, { title: string; message: string }>;
}

export interface UserProfile {
  user_id: string;
  phone_number: string;
  country_code: string;
  country_iso?: string;
  language?: string;
  is_phone_verified: boolean;
  phone_locked?: boolean;
  telegram_username?: string;
  telegram_id?: string;
  pin_set: boolean;
  failed_pin_attempts: number;
  pin_lock_until?: number;
  created_at: string;
  engagementBehavior?: UserEngagementBehavior;
}

export type PhoneChangeStatus = 'pending' | 'approved' | 'rejected';

export interface TelegramBotConfig {
  bot_token?: string;
  bot_username?: string;
  is_active: boolean;
  bot_name?: string;
  bot_id?: number;
  polling_active?: boolean;
  has_token?: boolean;
  updated_at?: string;
}

export interface TelegramVerificationSession {
  session_id: string;
  user_id: string;
  bot_username: string;
  deep_link: string;
  status: 'pending_telegram' | 'contact_received' | 'verified' | 'expired';
  phone_number?: string;
  telegram_username?: string;
  telegram_id?: number;
  code?: string;
  expires_at: number;
  bot_configured: boolean;
}

export interface PhoneChangeRequest {
  id: string;
  user_id: string;
  current_phone: string;
  new_phone: string;
  reason: string;
  status: PhoneChangeStatus;
  created_at: string;
  reviewed_at?: string;
  admin_note?: string;
}

export interface ActiveOtpSession {
  transfer_id?: string;
  action_type: 'transfer' | 'phone_verify' | 'security_update';
  code: string;
  phone_number: string;
  expires_at: number;
  resend_available_at: number;
  attempts: number;
}

export interface SecurityVulnerability {
  id: string;
  titleAr: string;
  titleEn: string;
  severity: 'critical' | 'high' | 'medium';
  problemAr: string;
  solutionAr: string;
  implementationStatus: 'active' | 'ready';
  iconType: 'shield-alert' | 'users' | 'file-check' | 'refresh-cw' | 'lock' | 'alert-triangle';
}

export interface CompanySectionContent {
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  contentAr: string;
  contentEn: string;
  enabled: boolean;
}

export interface CompanyCustomWebsite {
  heroBadgeAr?: string;
  heroBadgeEn?: string;
  welcomeBonusAr?: string;
  welcomeBonusEn?: string;
  promoCode?: string;
  affiliateLink?: string;
  appDownloadLink?: string;
  sections?: {
    overview?: CompanySectionContent;
    bonus?: CompanySectionContent;
    registrationGuide?: CompanySectionContent;
    cashbackPolicy?: CompanySectionContent;
    aiPredictions?: CompanySectionContent;
    faq?: CompanySectionContent;
  };
}

export interface AppBranding {
  appName: string;
  tagline: string;
  metaDescription?: string;
  metaKeywords?: string;
  contactEmail?: string;
  supportPhone?: string;
  iconType: 'preset' | 'custom' | 'upload';
  presetIconId: string;
  customIconUrl?: string;
  uploadedIconData?: string;
  iconResolution?: {
    width: number;
    height: number;
  };
  highResAssets?: {
    icon192?: string;
    icon512?: string;
    appleTouch?: string;
    favicon?: string;
    maskable?: string;
  };
  themeColor?: string;
  backgroundColor?: string;
  targetCompanyId?: string; // 'all' or company id like 'CMP1XB001'
  exclusiveMode?: boolean; // true when app is transformed to a single company
  companyCustomWebsites?: Record<string, CompanyCustomWebsite>;
  updatedAt?: string;
}

export type NotificationCategory = 'ai_prediction' | 'sports_news' | 'compensation' | 'transfer' | 'security' | 'system' | 'lottery';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  timestamp: string;
  read: boolean;
  translations?: Record<string, { title: string; message: string }>;
  targetLanguage?: string;
  targetCountry?: string;
  cohortId?: string;
  data?: {
    matchId?: string;
    confidence?: number;
    predictionText?: string;
    amount?: number;
    companyName?: string;
    actionUrl?: string;
    [key: string]: any;
  };
}

export interface SportsMatchFixture {
  id: string;
  category?: string;
  date?: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  league: string;
  leagueLogo?: string;
  kickoffTime: string;
  status: 'upcoming' | 'live' | 'finished';
  liveScore?: string;
  minute?: string;
  odds: {
    home: number;
    draw: number;
    away: number;
    over25?: number;
    bothScore?: number;
  };
  aiAnalysis?: AiMatchAnalysis;
}

export interface AiMatchAnalysis {
  matchId: string;
  generatedAt: string;
  predictedScore: string;
  winProbabilities: {
    home: number;
    draw: number;
    away: number;
  };
  confidenceScore: number;
  tacticalSummary: string;
  keyFactors: string[];
  recommendedPick: string;
  riskLevel: 'low' | 'moderate' | 'high';
  disclaimer: string;
  poweredBy?: string;
}

export interface SportsNewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  category: string;
  imageUrl: string;
  url?: string;
}

export interface SitePost {
  id: string;
  title: string;
  text: string;
  excerpt: string;
  company: string;
  lang: string;
  channel: string;
  messageId: number | null;
  image: string | null;
  source: string;
  externalUrl: string | null;
  sha1?: string;
  createdAt: string;
}

export type TabType = 'companies' | 'wallets' | 'transfers' | 'referrals' | 'activity' | 'ai-sports' | 'unlucky-wall' | 'lottery';

export interface SportsCategory {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  enabled: boolean;
  leagues: string[];
}

export interface SportsCategoryAgent {
  id: string;
  categoryId: string;
  agentName: string;
  username: string;
  passwordHash: string; // Stored securely
  role: 'sports_agent';
  isActive: boolean;
  lastLogin?: string;
  assignedLeagues: string[];
}

export interface UserSportsPreferences {
  userId: string;
  pushEnabled: boolean;
  subscribedCategories: string[]; // IDs of SportsCategory
  subscribedLeagues: string[];
  notificationTypes: ('match_start' | 'goals' | 'ai_predictions' | 'news')[];
}

export interface UserSubscriptionRecord {
  userId: string;
  subscribedLeagues: string[];
  smartAlertLeagues?: string[];
  notificationTypes: string[];
  updatedAt?: string;
}

export interface SmartOddsShiftAlert {
  id: string;
  fixtureId: string;
  matchTitle: string;
  league: string;
  marketType: string;
  previousOdds: number;
  currentOdds: number;
  shiftPercentage: number;
  volatilityLevel: 'high' | 'extreme' | 'moderate';
  direction: 'shortening' | 'drifting';
  suggestedPick: string;
  reasoningAr: string;
  reasoningEn: string;
  timestamp: string;
}

export interface WebhookTestRecord {
  id: string;
  companyId: string;
  companyName: string;
  endpointUrl: string;
  httpMethod: 'POST' | 'PUT' | 'PATCH' | 'GET';
  eventType: string;
  payload: any;
  headers: Record<string, string>;
  responseStatus: number;
  responseLatencyMs: number;
  responseBody: any;
  curlCommand: string;
  executedAt: string;
  success: boolean;
  notes?: string;
}

export interface HourlyHealthMetric {
  hour: string;
  timestamp: number;
  successCount: number;
  failureCount: number;
  totalCount: number;
  avgLatencyMs: number;
  successRate: number;
}

export interface ConnectionHealthRecord {
  methodId: string;
  methodName: string;
  methodNameAr?: string;
  companyId: string;
  companyName: string;
  companyColor?: string;
  promoCode?: string;
  methodType: CompanyApiIntegrationType;
  endpointUrl: string;
  enabled: boolean;
  isPrimary?: boolean;
  successRate24h: number;
  totalCalls24h: number;
  successCalls24h: number;
  failedCalls24h: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  status: 'healthy' | 'degraded' | 'down' | 'untested';
  lastCheckedAt: string;
  lastStatusCode: number;
  lastStatusMessage: string;
  errorBreakdown: {
    badRequest: number;
    unauthorized: number;
    rateLimited: number;
    gatewayError: number;
    timeout: number;
  };
}

export interface PaymentMethod {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  instructions: string;
  instructionsAr?: string;
  instructionsEn?: string;
  is_active: boolean;
  accountNumber?: string;
  holderName?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  badge?: string;
  minDeposit?: number;
  maxDeposit?: number;
  currency?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ChatAttachment {
  id: string;
  type: 'image' | 'video' | 'document' | 'file' | 'audio';
  name: string;
  size?: number;
  sizeBytes?: number;
  mimeType: string;
  data?: string;
  dataBase64?: string;
  previewUrl?: string;
  duration?: number;
}

export interface ExecutedAgentAction {
  id: string;
  type:
    | 'create_company'
    | 'update_company'
    | 'toggle_company'
    | 'delete_company'
    | 'approve_compensation'
    | 'reject_compensation'
    | 'dispatch_notification'
    | 'schedule_notification'
    | 'approve_phone'
    | 'update_branding'
    | 'admin_audit'
    | 'custom_action';
  title: string;
  title_ar: string;
  summary: string;
  summary_ar: string;
  status: 'success' | 'failed' | 'simulated';
  timestamp: string;
  details?: any;
  undoable?: boolean;
}

export interface AdminAuditReport {
  timestamp: string;
  healthScore: number; // 0 - 100
  summaryAr: string;
  summaryEn: string;
  stats: {
    activeCompaniesCount: number;
    totalCompaniesCount: number;
    pendingCompensationCount: number;
    pendingCompensationTotal: number;
    pendingPhoneRequestsCount: number;
    activeNotificationsToday: number;
    hourlyPeakWindow: string;
    systemUptimeHours: number;
  };
  keyFindings: Array<{
    category: 'companies' | 'compensation' | 'security' | 'timing' | 'growth';
    severity: 'info' | 'warning' | 'critical' | 'success';
    titleAr: string;
    descAr: string;
    actionLabelAr?: string;
    actionCommand?: string;
  }>;
  recommendedActions: Array<{
    id: string;
    labelAr: string;
    command: string;
    category: string;
  }>;
}

// ----------------- Viral Features Interfaces -----------------

export interface GoldenHourState {
  isActive: boolean;
  startTime: string | null;
  endTime: string | null;
  multiplier: number; // e.g., 2 for 1:2 unfreeze
  messageAr: string;
  messageEn: string;
}

export interface UnluckyBetPost {
  id: string;
  userId: string;
  userName?: string;
  betSlipId: string;
  companyName: string;
  amount: number;
  lostBy: string; // e.g., "هدف واحد الدقيقة 92"
  storyAr: string;
  imageUrl?: string;
  votes: number;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected' | 'won_prize';
}

export interface AiChallenge {
  id: string;
  matchId: string;
  matchName: string; // e.g., "ريال مدريد ضد برشلونة"
  aiPredictionAr: string;
  userPredictionAr: string;
  userId: string;
  status: 'open' | 'user_won' | 'ai_won' | 'draw';
  prizeAmount: number;
  timestamp: string;
}

export interface ReferralRecord {
  id: string;
  referrerId: string;
  referredUserId: string;
  referredUserName?: string;
  status: 'joined' | 'deposited' | 'rewarded';
  rewardAmount: number;
  timestamp: string;
}

// ==========================================
// VEX Deals Provably Fair Lottery Types
// ==========================================

export type LotteryDrawStatus = 'upcoming' | 'open' | 'closed' | 'drawing' | 'completed' | 'cancelled';

export type LotteryTierId = 'tier1_jackpot' | 'tier2_match5' | 'tier3_match4_2' | 'tier4_match3' | 'tier5_match2';

export interface LotteryPrizeTier {
  id: LotteryTierId;
  nameAr: string;
  nameEn: string;
  matchMain: number; // e.g. 5
  matchLucky: number; // e.g. 2
  sharePercent: number; // e.g. 50%
  guaranteedAmount?: number;
  fixedPrize?: number;
  odds?: string;
  termsAr?: string;
  termsEn?: string;
  payoutTermsAr?: string;
  payoutTermsEn?: string;
}

export interface LotteryUserWonPrize {
  id: string;
  ticketId: string;
  drawId: string;
  drawNumber?: number;
  drawTitleAr?: string;
  drawTitleEn?: string;
  date: string;
  prizeNameAr: string;
  prizeNameEn: string;
  tierId: LotteryTierId;
  amountWon: number;
  matchedMainCount: number;
  matchedLuckyCount: number;
  mainNumbers: number[];
  luckyNumbers: number[];
  deliveryStatus: 'deposited_to_wallet' | 'processing' | 'claimed' | 'claimed_cash' | 'claimed_free_tickets';
  payoutWalletCompanyId?: string;
  transactionRef: string;
  claimedAt?: string;
}

export interface ProvablyFairProof {
  serverSeed: string; // Revealed after draw
  serverSeedHash: string; // SHA-256 published before draw
  clientSeed: string; // Derived from participants & timestamps
  nonce: number;
  verified: boolean;
}

export interface LotteryDraw {
  id: string; // e.g., "DRAW-2026-001"
  drawNumber: number;
  titleAr: string;
  titleEn: string;
  status: LotteryDrawStatus;
  ticketPrice: number; // in USD or company wallet unit (e.g., $1.00)
  currency: string; // "USD"
  jackpotAmount: number; // Progressive jackpot pool
  initialJackpot: number;
  totalPool: number;
  ticketsSoldCount: number;
  participantsCount: number;
  openAt: string;
  closeAt: string;
  drawAt: string;
  winningMainNumbers?: number[]; // 5 sorted numbers from 1 to 50
  winningLuckyNumbers?: number[]; // 2 sorted numbers from 1 to 12
  provablyFair: ProvablyFairProof;
  tiers: LotteryPrizeTier[];
  winnersCount?: Record<string, number>;
  totalPaidOut?: number;
  isRollover?: boolean;
}

export interface LotteryTicket {
  id: string;
  drawId: string;
  drawNumber: number;
  userId: string;
  userPhoneMasked?: string;
  companyId?: string; // If bought using specific wallet
  mainNumbers: number[]; // 5 numbers from 1 to 50
  luckyNumbers: number[]; // 2 numbers from 1 to 12
  pricePaid: number;
  paymentMethod: 'wallet_balance' | 'compassion_free_ticket' | 'promo_credit';
  purchasedAt: string;
  matchedMainCount?: number;
  matchedLuckyCount?: number;
  matchedTier?: LotteryTierId;
  prizeWon?: number;
  isClaimed?: boolean;
  claimedAt?: string;
  transactionId?: string;
}

export interface LotteryStats {
  totalDrawsCompleted: number;
  totalPrizesPaid: number;
  totalTicketsSold: number;
  biggestJackpotWon: number;
  compassionTicketsAwarded: number;
  hotNumbers: { number: number; frequency: number }[];
  coldNumbers: { number: number; frequency: number }[];
}

export interface LotteryTierAlertConfig {
  tierId: LotteryTierId;
  enabled: boolean;
  leadTimeMinutes: number; // e.g. 30 minutes before draw
  minPoolThreshold?: number; // optional threshold in USD
  soundEnabled?: boolean;
}

export interface LotteryAlertSettings {
  fcmEnabled: boolean;
  fcmToken?: string | null;
  globalDrawAlert: boolean; // 1-hour / general alert
  thirtyMinTierAlertsEnabled: boolean; // 30-min per-tier alerts
  tierConfigs: Record<LotteryTierId, LotteryTierAlertConfig>;
  lastUpdated: string;
}


