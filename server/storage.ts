import fs from 'fs';
import path from 'path';
import {
  DEFAULT_COMPANIES,
  DEFAULT_COMPENSATION_REQUESTS,
  DEFAULT_PHONE_CHANGE_REQUESTS,
  DEFAULT_TELEGRAM_CONFIG,
  DEFAULT_APP_BRANDING,
  DEFAULT_NOTIFICATIONS,
  DEFAULT_AB_TEST_CAMPAIGNS,
  DEFAULT_UNLUCKY_BETS,
  ServerCompensationRequest,
  ServerPhoneChangeRequest,
} from './seedData';
import { Company, CompensationEmailTemplate, EmailDispatchLog } from '../src/types';
import { DEFAULT_COMPENSATION_EMAIL_TEMPLATES } from '../src/data/compensationEmailTemplates';

const DATA_DIR = path.join(process.cwd(), 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filename: string, defaultData: T): T {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    writeJsonFile(filename, defaultData);
    return defaultData;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    if (!raw.trim()) {
      writeJsonFile(filename, defaultData);
      return defaultData;
    }
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[Storage] Failed to read ${filename}, falling back to defaults:`, err);
    writeJsonFile(filename, defaultData);
    return defaultData;
  }
}

function writeJsonFile<T>(filename: string, data: T): void {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[Storage] Failed to write ${filename}:`, err);
  }
}

// -------------------------------------------------------------
// Storage Managers
// -------------------------------------------------------------

export const storage = {
  // 1. Companies
  getCompanies(): Company[] {
    return readJsonFile<Company[]>('companies.json', DEFAULT_COMPANIES);
  },
  saveCompanies(companies: Company[]): void {
    writeJsonFile('companies.json', companies);
  },
  saveCompany(company: Company): Company[] {
    const list = this.getCompanies();
    const idx = list.findIndex((c) => c.id === company.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...company };
    } else {
      list.push(company);
    }
    this.saveCompanies(list);
    return list;
  },
  toggleCompanyActive(companyId: string): { success: boolean; is_active: boolean } {
    const list = this.getCompanies();
    const comp = list.find((c) => c.id === companyId);
    if (!comp) return { success: false, is_active: false };
    comp.is_active = !comp.is_active;
    this.saveCompanies(list);
    return { success: true, is_active: comp.is_active };
  },
  deleteCompany(companyId: string): boolean {
    const list = this.getCompanies();
    const filtered = list.filter((c) => c.id !== companyId);
    if (filtered.length < list.length) {
      this.saveCompanies(filtered);
      return true;
    }
    return false;
  },

  // 1b. Media Assets & Uploads Library
  getMediaAssets(): any[] {
    return readJsonFile<any[]>('media_assets.json', []);
  },
  saveMediaAsset(asset: {
    id: string;
    name: string;
    type: 'image' | 'video' | 'document' | 'file';
    mimeType: string;
    dataUrl: string;
    description?: string;
    associatedWith?: string; // e.g., 'company:1xbet'
    createdAt: string;
  }): any {
    const list = this.getMediaAssets();
    list.unshift(asset);
    writeJsonFile('media_assets.json', list.slice(0, 100));
    return asset;
  },

  // 2. Compensation & Unfreeze Requests
  getCompensationRequests(): ServerCompensationRequest[] {
    return readJsonFile<ServerCompensationRequest[]>('compensation_requests.json', DEFAULT_COMPENSATION_REQUESTS);
  },
  saveCompensationRequests(requests: ServerCompensationRequest[]): void {
    writeJsonFile('compensation_requests.json', requests);
  },
  addCompensationRequest(req: ServerCompensationRequest): ServerCompensationRequest {
    const list = this.getCompensationRequests();
    list.unshift(req);
    this.saveCompensationRequests(list);
    return req;
  },
  updateCompensationRequest(
    id: string,
    updates: Partial<ServerCompensationRequest>
  ): ServerCompensationRequest | null {
    const list = this.getCompensationRequests();
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates };
    this.saveCompensationRequests(list);
    return list[idx];
  },

  // 3. Phone Change Requests
  getPhoneChangeRequests(): ServerPhoneChangeRequest[] {
    return readJsonFile<ServerPhoneChangeRequest[]>('phone_change_requests.json', DEFAULT_PHONE_CHANGE_REQUESTS);
  },
  savePhoneChangeRequests(requests: ServerPhoneChangeRequest[]): void {
    writeJsonFile('phone_change_requests.json', requests);
  },
  addPhoneChangeRequest(req: ServerPhoneChangeRequest): ServerPhoneChangeRequest {
    const list = this.getPhoneChangeRequests();
    list.unshift(req);
    this.savePhoneChangeRequests(list);
    return req;
  },
  updatePhoneChangeRequest(
    id: string,
    updates: Partial<ServerPhoneChangeRequest>
  ): ServerPhoneChangeRequest | null {
    const list = this.getPhoneChangeRequests();
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates };
    this.savePhoneChangeRequests(list);
    return list[idx];
  },

  // 4. App Branding
  getAppBranding(): any {
    return readJsonFile('app_branding.json', DEFAULT_APP_BRANDING);
  },
  saveAppBranding(branding: any): void {
    writeJsonFile('app_branding.json', branding);
  },

  // 5. Telegram Configuration
  getTelegramConfig(): any {
    return readJsonFile('telegram_config.json', DEFAULT_TELEGRAM_CONFIG);
  },
  saveTelegramConfig(config: any): void {
    writeJsonFile('telegram_config.json', config);
  },

  // 6. Notifications
  getNotifications(): any[] {
    return readJsonFile<any[]>('notifications.json', DEFAULT_NOTIFICATIONS);
  },
  saveNotifications(notifs: any[]): void {
    writeJsonFile('notifications.json', notifs);
  },
  addNotification(notif: any): any {
    const list = this.getNotifications();
    list.unshift(notif);
    this.saveNotifications(list);
    return notif;
  },

  // 6b. Site Posts (cross-published from Telegram channels to the website)
  getSitePosts(): any[] {
    return readJsonFile<any[]>('site-posts.json', []);
  },
  saveSitePosts(posts: any[]): void {
    writeJsonFile('site-posts.json', posts);
  },
  addSitePost(post: any): any {
    const list = this.getSitePosts();
    list.unshift(post);
    if (list.length > 300) list.length = 300;
    this.saveSitePosts(list);
    return post;
  },
  findSitePostByHash(sha1: string): any | null {
    return this.getSitePosts().find((p) => p && p.sha1 === sha1) || null;
  },

  // 7. AI Agents Management
  getAiAgents(): any[] {
    return readJsonFile<any[]>('ai_agents.json', []);
  },
  saveAiAgents(agents: any[]): void {
    writeJsonFile('ai_agents.json', agents);
  },

  // 8. AI Memory & Learning
  getAiMemory(agentId: string): any {
    const allMemory = readJsonFile<Record<string, any>>('ai_agent_memory.json', {});
    if (!allMemory[agentId]) {
      allMemory[agentId] = {
        agentId,
        adminPreferences: [
          {
            id: 'pref_default_1',
            text: 'تفضيل الأسلوب السريع والمختصر مع إحصائيات ونسب مئوية واضحة.',
            category: 'preference',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'pref_default_2',
            text: 'عدم إرسال أكثر من إشعارين يومياً لحماية المستخدمين من الإزعاج.',
            category: 'rule',
            createdAt: new Date().toISOString(),
          },
        ],
        learnedInsights: [],
        recentHistory: [],
        notificationLog: [],
      };
      writeJsonFile('ai_agent_memory.json', allMemory);
    }
    return allMemory[agentId];
  },
  saveAiMemory(agentId: string, memory: any): void {
    const allMemory = readJsonFile<Record<string, any>>('ai_agent_memory.json', {});
    allMemory[agentId] = memory;
    writeJsonFile('ai_agent_memory.json', allMemory);
  },
  addAdminPreference(agentId: string, text: string, category: string = 'preference'): any {
    const memory = this.getAiMemory(agentId);
    const item = {
      id: `pref_${Date.now()}`,
      text: text.trim(),
      category,
      createdAt: new Date().toISOString(),
    };
    memory.adminPreferences.unshift(item);
    this.saveAiMemory(agentId, memory);
    return item;
  },
  deleteAdminPreference(agentId: string, prefId: string): boolean {
    const memory = this.getAiMemory(agentId);
    const initialLen = memory.adminPreferences.length;
    memory.adminPreferences = memory.adminPreferences.filter((p: any) => p.id !== prefId);
    this.saveAiMemory(agentId, memory);
    return memory.adminPreferences.length < initialLen;
  },

  // 9. User Profiles & Behavior Tracking
  getAudienceCohorts(): any[] {
    const defaultCohorts = [
      {
        id: 'cohort_ar_eg',
        name: 'Egypt & Levant (Arabic)',
        name_ar: 'مصر وبلاد الشام (عربي)',
        language: 'ar',
        language_name_ar: 'العربية (المصرية والشامية)',
        language_name_en: 'Arabic (Egypt & Levant)',
        country_code: '+20',
        country_iso: 'EG',
        country_flag: '🇪🇬',
        estimated_users: 1420,
        description_ar: 'جمهور كرة القدم والمراهنات النشط في مصر، توقيت القاهرة، اهتمام عالي بكود 1XBET (vexwallet) و Melbet وعروض تعويض الخسائر 100%.',
        description_en: 'Active football & betting audience in Egypt, Cairo timezone, high engagement with 1XBET & Melbet.',
        timezone_offset_hours: 2,
        primary_bookmakers: ['1XBET', 'MELBET', 'BETJAM'],
      },
      {
        id: 'cohort_ar_gulf',
        name: 'Gulf & GCC VIP (Arabic)',
        name_ar: 'الخليج العربي وكبار الشخصيات (VIP)',
        language: 'ar',
        language_name_ar: 'العربية (الخليجية الفصحى)',
        language_name_en: 'Arabic (Gulf Formal)',
        country_code: '+966',
        country_iso: 'SA',
        country_flag: '🇸🇦',
        estimated_users: 890,
        description_ar: 'مستخدمو السعودية والإمارات والكويت، نبرة استثمارية فاخرة، تركيز على مضاعفات كاش باك VIP وكود BETJAM (VEDO2002) وفك التجميد.',
        description_en: 'High-value Gulf VIP players, luxury cashback tone, focused on BETJAM & fast 1:1 unfreezing.',
        timezone_offset_hours: 3,
        primary_bookmakers: ['BETJAM', '1XBET', 'MOSTBET'],
      },
      {
        id: 'cohort_fr_maghreb',
        name: 'North Africa & Maghreb (French / Arabic)',
        name_ar: 'شمال أفريقيا والمغرب العربي (فرنسي / عربي)',
        language: 'fr',
        language_name_ar: 'الفرنسية المغاربية / العربية',
        language_name_en: 'French / Maghreb Arabic',
        country_code: '+212',
        country_iso: 'MA',
        country_flag: '🇲🇦',
        estimated_users: 645,
        description_ar: 'مستخدمو المغرب والجزائر وتونس، تفضيل عالي للإشعارات باللغة الفرنسية مع شروط الرهان الصريحة وكود 1XBET (vexwallet) و Melbet (ml_3154096).',
        description_en: 'Players in Morocco, Algeria, Tunisia with French betting copy and clear promo rules.',
        timezone_offset_hours: 1,
        primary_bookmakers: ['1XBET', 'MELBET', 'XPARI'],
      },
      {
        id: 'cohort_en_global',
        name: 'International & Global Players (English)',
        name_ar: 'المستخدمون الدوليون (إنجليزي - عالمي)',
        language: 'en',
        language_name_ar: 'الإنجليزية العالمية',
        language_name_en: 'International English',
        country_code: '+44',
        country_iso: 'GLOBAL',
        country_flag: '🌍',
        estimated_users: 410,
        description_ar: 'المستخدمون الأجانب والدوليون، صياغة إنجليزية واضحة للأودز والتحليلات التكتيكية وتعويض الخسائر 100%.',
        description_en: 'Global international players, clear English sports analytics, tactical odds and verified cashback guarantees.',
        timezone_offset_hours: 0,
        primary_bookmakers: ['1XBET', 'BETJAM', 'MELBET', 'BIZBET'],
      },
      {
        id: 'cohort_ru_cis',
        name: 'CIS & Eastern Europe (Russian)',
        name_ar: 'دول رابطة الدول المستقلة وشرق أوروبا (روسي)',
        language: 'ru',
        language_name_ar: 'الروسية',
        language_name_en: 'Russian',
        country_code: '+7',
        country_iso: 'RU',
        country_flag: '🇷🇺',
        estimated_users: 280,
        description_ar: 'مستخدمو روسيا وآسيا الوسطى، صياغة باللغة الروسية مع تأكيد أمان التحويلات والبروموكود.',
        description_en: 'Russian-speaking players across CIS, localized betting terminology and promo codes.',
        timezone_offset_hours: 3,
        primary_bookmakers: ['1XBET', 'MOSTBET', 'MELBET'],
      },
    ];
    return readJsonFile<any[]>('audience_cohorts.json', defaultCohorts);
  },
  saveAudienceCohorts(cohorts: any[]): void {
    writeJsonFile('audience_cohorts.json', cohorts);
  },
  getCohortForUser(userId: string): any {
    const profile = this.getUserProfile(userId);
    const cohorts = this.getAudienceCohorts();
    const phone = profile.phone_number || '';
    const code = profile.country_code || '';
    const lang = profile.language || 'ar';
    const iso = profile.country_iso || '';

    if (lang === 'fr' || code === '+212' || code === '+213' || code === '+216' || iso === 'MA' || iso === 'DZ') {
      return cohorts.find((c) => c.id === 'cohort_fr_maghreb') || cohorts[0];
    }
    if (lang === 'en' || code === '+44' || code === '+1' || iso === 'GLOBAL' || iso === 'US' || iso === 'GB') {
      return cohorts.find((c) => c.id === 'cohort_en_global') || cohorts[0];
    }
    if (lang === 'ru' || code === '+7' || iso === 'RU') {
      return cohorts.find((c) => c.id === 'cohort_ru_cis') || cohorts[0];
    }
    if (code === '+966' || code === '+971' || code === '+965' || code === '+974' || iso === 'SA' || iso === 'AE') {
      return cohorts.find((c) => c.id === 'cohort_ar_gulf') || cohorts[0];
    }
    return cohorts.find((c) => c.id === 'cohort_ar_eg') || cohorts[0];
  },
  updateUserPreferences(userId: string, prefs: { language?: string; country_code?: string; country_iso?: string; phone_number?: string }): any {
    const profile = this.getUserProfile(userId);
    if (prefs.language) profile.language = prefs.language;
    if (prefs.country_code) profile.country_code = prefs.country_code;
    if (prefs.country_iso) profile.country_iso = prefs.country_iso;
    if (prefs.phone_number) profile.phone_number = prefs.phone_number;
    this.saveUserProfile(profile);
    return profile;
  },

  getUserProfiles(): any[] {
    const defaultProfiles: any[] = [
      {
        user_id: 'WCm5x8k2ab3f',
        phone_number: '201012345678',
        country_code: '+20',
        country_iso: 'EG',
        language: 'ar',
        is_phone_verified: true,
        phone_locked: true,
        pin_set: true,
        failed_pin_attempts: 0,
        created_at: '2026-02-15T10:00:00.000Z',
        engagementBehavior: {
          hourlyActivity: {
            0: 4, 1: 1, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 1, 8: 3, 9: 6,
            10: 12, 11: 15, 12: 18, 13: 14, 14: 22, 15: 45, 16: 62, 17: 78,
            18: 95, 19: 142, 20: 188, 21: 175, 22: 110, 23: 35
          },
          peakEngagementHours: [20, 21, 19],
          optimalEngagementWindow: {
            startHour: 19,
            endHour: 22,
            labelAr: 'نافذة المساء والذروة (19:00 - 22:00)',
            labelEn: 'Peak Evening Window (19:00 - 22:00)',
          },
          lastInteractionAt: new Date().toISOString(),
          totalInteractions: 1029,
        }
      },
      {
        user_id: 'USR_VIP_8821',
        phone_number: '966509876543',
        country_code: '+966',
        country_iso: 'SA',
        language: 'ar',
        is_phone_verified: true,
        phone_locked: true,
        pin_set: true,
        failed_pin_attempts: 0,
        created_at: '2026-02-20T14:30:00.000Z',
        engagementBehavior: {
          hourlyActivity: {
            0: 2, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 4, 9: 8,
            10: 14, 11: 19, 12: 25, 13: 20, 14: 31, 15: 55, 16: 70, 17: 85,
            18: 112, 19: 165, 20: 210, 21: 190, 22: 130, 23: 42
          },
          peakEngagementHours: [20, 21, 19],
          optimalEngagementWindow: {
            startHour: 19,
            endHour: 22,
            labelAr: 'نافذة المساء والذروة (19:00 - 22:00)',
            labelEn: 'Peak Evening Window (19:00 - 22:00)',
          },
          lastInteractionAt: new Date().toISOString(),
          totalInteractions: 1182,
        }
      },
      {
        user_id: 'USR_FR_CASABLANCA',
        phone_number: '212612345678',
        country_code: '+212',
        country_iso: 'MA',
        language: 'fr',
        is_phone_verified: true,
        phone_locked: false,
        pin_set: true,
        failed_pin_attempts: 0,
        created_at: '2026-02-22T16:00:00.000Z',
        engagementBehavior: {
          hourlyActivity: { 18: 45, 19: 90, 20: 130, 21: 120, 22: 60 },
          peakEngagementHours: [20, 19, 21],
          optimalEngagementWindow: {
            startHour: 19,
            endHour: 22,
            labelAr: 'نافذة شمال أفريقيا (19:00 - 22:00)',
            labelEn: 'Maghreb Window (19:00 - 22:00)',
          },
          lastInteractionAt: new Date().toISOString(),
          totalInteractions: 445,
        }
      },
      {
        user_id: 'USR_EN_GLOBAL',
        phone_number: '447911123456',
        country_code: '+44',
        country_iso: 'GLOBAL',
        language: 'en',
        is_phone_verified: true,
        phone_locked: false,
        pin_set: true,
        failed_pin_attempts: 0,
        created_at: '2026-02-25T11:00:00.000Z',
        engagementBehavior: {
          hourlyActivity: { 17: 30, 18: 60, 19: 110, 20: 140, 21: 95 },
          peakEngagementHours: [20, 19, 21],
          optimalEngagementWindow: {
            startHour: 18,
            endHour: 21,
            labelAr: 'النافذة الأوروبية والعالمية (18:00 - 21:00 UTC)',
            labelEn: 'Global Window (18:00 - 21:00 UTC)',
          },
          lastInteractionAt: new Date().toISOString(),
          totalInteractions: 388,
        }
      }
    ];
    return readJsonFile<any[]>('user_profiles.json', defaultProfiles);
  },
  saveUserProfiles(profiles: any[]): void {
    writeJsonFile('user_profiles.json', profiles);
  },
  getUserProfile(userId: string): any {
    const list = this.getUserProfiles();
    let prof = list.find((p) => p.user_id === userId);
    if (!prof) {
      prof = {
        user_id: userId,
        phone_number: '',
        country_code: '+20',
        is_phone_verified: false,
        pin_set: false,
        failed_pin_attempts: 0,
        created_at: new Date().toISOString(),
        engagementBehavior: {
          hourlyActivity: {
            0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 1, 9: 2,
            10: 4, 11: 5, 12: 8, 13: 7, 14: 10, 15: 20, 16: 30, 17: 40,
            18: 50, 19: 80, 20: 95, 21: 85, 22: 50, 23: 15
          },
          peakEngagementHours: [20, 21, 19],
          optimalEngagementWindow: {
            startHour: 19,
            endHour: 22,
            labelAr: 'نافذة المساء والذروة (19:00 - 22:00)',
            labelEn: 'Peak Evening Window (19:00 - 22:00)',
          },
          lastInteractionAt: new Date().toISOString(),
          totalInteractions: 1,
        }
      };
      list.push(prof);
      this.saveUserProfiles(list);
    }
    return prof;
  },
  saveUserProfile(profile: any): void {
    const list = this.getUserProfiles();
    const idx = list.findIndex((p) => p.user_id === profile.user_id);
    if (idx >= 0) {
      list[idx] = profile;
    } else {
      list.push(profile);
    }
    this.saveUserProfiles(list);
  },
  logUserInteraction(userId: string, actionType: string = 'navigation'): any {
    const profile = this.getUserProfile(userId);
    const now = new Date();
    // Use Middle East local hour (UTC+3)
    const hour = (now.getUTCHours() + 3) % 24;

    if (!profile.engagementBehavior) {
      profile.engagementBehavior = {
        hourlyActivity: {},
        peakEngagementHours: [19, 20, 21],
        optimalEngagementWindow: {
          startHour: 19,
          endHour: 22,
          labelAr: 'نافذة المساء والذروة (19:00 - 22:00)',
          labelEn: 'Peak Evening Window (19:00 - 22:00)',
        },
        lastInteractionAt: now.toISOString(),
        totalInteractions: 0,
      };
    }

    const activity = profile.engagementBehavior.hourlyActivity;
    activity[hour] = (activity[hour] || 0) + 1;
    profile.engagementBehavior.totalInteractions = (profile.engagementBehavior.totalInteractions || 0) + 1;
    profile.engagementBehavior.lastInteractionAt = now.toISOString();

    // Recompute peak engagement hours (top 3)
    const sortedHours = Object.keys(activity)
      .map(Number)
      .sort((a, b) => (activity[b] || 0) - (activity[a] || 0));

    const peakHours = sortedHours.slice(0, 3);
    profile.engagementBehavior.peakEngagementHours = peakHours;

    const topHour = peakHours[0] || 20;
    const startHour = Math.max(0, topHour - 1);
    const endHour = Math.min(23, topHour + 2);
    profile.engagementBehavior.optimalEngagementWindow = {
      startHour,
      endHour,
      labelAr: `نافذة النشاط المفضلة (${startHour}:00 - ${endHour}:00)`,
      labelEn: `Optimal Window (${startHour}:00 - ${endHour}:00)`,
    };

    this.saveUserProfile(profile);
    return profile.engagementBehavior;
  },

  // Aggregated Platform Cohort Behavior
  getAggregatedCohortBehavior(): {
    totalTrackedUsers: number;
    hourlyActivity: Record<number, number>;
    peakEngagementHours: number[];
    optimalEngagementWindow: {
      startHour: number;
      endHour: number;
      labelAr: string;
      labelEn: string;
    };
  } {
    const profiles = this.getUserProfiles();
    const aggregatedHourly: Record<number, number> = {};

    for (let h = 0; h < 24; h++) {
      aggregatedHourly[h] = 0;
    }

    profiles.forEach((p) => {
      if (p.engagementBehavior?.hourlyActivity) {
        Object.entries(p.engagementBehavior.hourlyActivity).forEach(([hourStr, count]) => {
          const h = Number(hourStr);
          aggregatedHourly[h] = (aggregatedHourly[h] || 0) + Number(count);
        });
      }
    });

    const sortedHours = Object.keys(aggregatedHourly)
      .map(Number)
      .sort((a, b) => aggregatedHourly[b] - aggregatedHourly[a]);

    const peakEngagementHours = sortedHours.slice(0, 3);
    const topHour = peakEngagementHours[0] || 20;
    const startHour = Math.max(0, topHour - 1);
    const endHour = Math.min(23, topHour + 2);

    return {
      totalTrackedUsers: profiles.length,
      hourlyActivity: aggregatedHourly,
      peakEngagementHours,
      optimalEngagementWindow: {
        startHour,
        endHour,
        labelAr: `نافذة الذروة الجماعية (${startHour}:00 - ${endHour}:00 بتوقيت الشرق الأوسط)`,
        labelEn: `Platform Peak Window (${startHour}:00 - ${endHour}:00)`,
      },
    };
  },

  // 10. Scheduled Notifications Queue
  getScheduledNotifications(): any[] {
    const defaultScheduled: any[] = [
      {
        id: 'SCHED-PRE-CLASICO',
        title: '📊 التقرير التكتيكي الأسبوعي لكبار الشركاء',
        message: 'راجع تحليلات الذكاء الاصطناعي لمواجهات دوري الأبطال وعروض الكاش باك الأسبوعية 10%.',
        category: 'ai_prediction',
        urgency: 'non-urgent',
        scheduledFor: new Date(Date.now() + 3600 * 4 * 1000).toISOString(),
        targetOptimalWindow: 'نافذة المساء والذروة (19:00 - 22:00)',
        status: 'pending',
        createdAt: new Date().toISOString(),
        heuristicReason: 'تم اختيار النافذة المسائية بناءً على تحليل سلوك 88% من المستخدمين المتفاعلين ليلاً لتجنب الإزعاج.',
      }
    ];
    return readJsonFile<any[]>('scheduled_notifications.json', defaultScheduled);
  },
  saveScheduledNotifications(list: any[]): void {
    writeJsonFile('scheduled_notifications.json', list);
  },
  addScheduledNotification(item: any): any {
    const list = this.getScheduledNotifications();
    list.unshift(item);
    this.saveScheduledNotifications(list);
    return item;
  },
  updateScheduledNotificationStatus(id: string, status: string): boolean {
    const list = this.getScheduledNotifications();
    const item = list.find((s) => s.id === id);
    if (item) {
      item.status = status;
      this.saveScheduledNotifications(list);
      return true;
    }
    return false;
  },
  deleteScheduledNotification(id: string): boolean {
    const list = this.getScheduledNotifications();
    const filtered = list.filter((s) => s.id !== id);
    this.saveScheduledNotifications(filtered);
    return filtered.length < list.length;
  },

  // 11. A/B Testing Notification Campaigns
  getAbTestCampaigns(): any[] {
    const list = readJsonFile<any[]>('ab_test_campaigns.json', DEFAULT_AB_TEST_CAMPAIGNS);
    return list;
  },
  saveAbTestCampaigns(list: any[]): void {
    writeJsonFile('ab_test_campaigns.json', list);
  },
  addAbTestCampaign(item: any): any {
    const list = this.getAbTestCampaigns();
    list.unshift(item);
    this.saveAbTestCampaigns(list);
    return item;
  },
  updateAbTestCampaign(id: string, updates: any): any {
    const list = this.getAbTestCampaigns();
    const index = list.findIndex((c) => c.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...updates };
      this.saveAbTestCampaigns(list);
      return list[index];
    }
    return null;
  },
  deleteAbTestCampaign(id: string): boolean {
    const list = this.getAbTestCampaigns();
    const filtered = list.filter((c) => c.id !== id);
    this.saveAbTestCampaigns(filtered);
    return filtered.length < list.length;
  },

  // 12. Complete Replica Restore & Seed Reset
  restoreAllReplicaData(): {
    success: boolean;
    companiesCount: number;
    requestsCount: number;
    phoneRequestsCount: number;
    notificationsCount: number;
  } {
    this.saveCompanies(DEFAULT_COMPANIES);
    this.saveCompensationRequests(DEFAULT_COMPENSATION_REQUESTS);
    this.savePhoneChangeRequests(DEFAULT_PHONE_CHANGE_REQUESTS);
    this.saveAppBranding(DEFAULT_APP_BRANDING);
    this.saveTelegramConfig(DEFAULT_TELEGRAM_CONFIG);
    this.saveNotifications(DEFAULT_NOTIFICATIONS);
    this.saveAbTestCampaigns(DEFAULT_AB_TEST_CAMPAIGNS);
    this.saveCompensationEmailTemplates(DEFAULT_COMPENSATION_EMAIL_TEMPLATES);

    return {
      success: true,
      companiesCount: DEFAULT_COMPANIES.length,
      requestsCount: DEFAULT_COMPENSATION_REQUESTS.length,
      phoneRequestsCount: DEFAULT_PHONE_CHANGE_REQUESTS.length,
      notificationsCount: DEFAULT_NOTIFICATIONS.length,
    };
  },

  // 13. Clean Slate Data Reset (Clear User Activity, Notification History & Demo Accounts)
  clearCleanSlate(): {
    success: boolean;
    message: string;
    clearedRequests: number;
    clearedNotifications: number;
    clearedPhoneRequests: number;
    clearedEmailLogs: number;
  } {
    const reqs = this.getCompensationRequests();
    const notifs = this.getNotifications();
    const phoneReqs = this.getPhoneChangeRequests();
    const logs = this.getEmailDispatchLogs();

    this.saveCompensationRequests([]);
    this.savePhoneChangeRequests([]);
    this.saveNotifications([]);
    writeJsonFile('compensation_email_logs.json', []);
    writeJsonFile('ab_test_campaigns.json', []);

    return {
      success: true,
      message: 'تمت تهيئة قاعدة البيانات بنجاح (Clean Slate Reset): تم تفريغ سجل نشاط المستخدمين، تاريخ الإشعارات، والبيانات التجريبية استعداداً لنشر التطبيق الجديد.',
      clearedRequests: reqs.length,
      clearedNotifications: notifs.length,
      clearedPhoneRequests: phoneReqs.length,
      clearedEmailLogs: logs.length,
    };
  },

  // 10. Compensation Email Templates
  getCompensationEmailTemplates(): CompensationEmailTemplate[] {
    return readJsonFile<CompensationEmailTemplate[]>('compensation_email_templates.json', DEFAULT_COMPENSATION_EMAIL_TEMPLATES);
  },

  saveCompensationEmailTemplates(templates: CompensationEmailTemplate[]): void {
    writeJsonFile('compensation_email_templates.json', templates);
  },

  addCompensationEmailTemplate(template: CompensationEmailTemplate): void {
    const existing = this.getCompensationEmailTemplates();
    const index = existing.findIndex((t) => t.id === template.id);
    if (index >= 0) {
      existing[index] = { ...existing[index], ...template, updated_at: new Date().toISOString() };
    } else {
      existing.unshift({ ...template, created_at: template.created_at || new Date().toISOString() });
    }
    this.saveCompensationEmailTemplates(existing);
  },

  deleteCompensationEmailTemplate(id: string): boolean {
    const existing = this.getCompensationEmailTemplates();
    const filtered = existing.filter((t) => t.id !== id);
    if (filtered.length !== existing.length) {
      this.saveCompensationEmailTemplates(filtered);
      return true;
    }
    return false;
  },

  // 11. Email Dispatch Logs
  getEmailDispatchLogs(): EmailDispatchLog[] {
    return readJsonFile<EmailDispatchLog[]>('compensation_email_logs.json', []);
  },

  addEmailDispatchLog(log: EmailDispatchLog): void {
    const existing = this.getEmailDispatchLogs();
    existing.unshift({
      ...log,
      id: log.id || `LOG-EMAIL-${Date.now()}`,
      dispatched_at: log.dispatched_at || new Date().toISOString(),
    });
    // Keep last 200 logs
    writeJsonFile('compensation_email_logs.json', existing.slice(0, 200));
  },

  // 12. Viral Features Storage (Golden Hour, Unlucky Bets, AI Challenges, Referrals)
  getGoldenHourState(): any {
    return readJsonFile<any>('golden_hour_state.json', {
      isActive: false,
      startTime: null,
      endTime: null,
      multiplier: 1,
      messageAr: '',
      messageEn: ''
    });
  },
  saveGoldenHourState(state: any): void {
    writeJsonFile('golden_hour_state.json', state);
  },

  getUnluckyBets(): any[] {
    return readJsonFile<any[]>('unlucky_bets.json', DEFAULT_UNLUCKY_BETS);
  },
  saveUnluckyBets(bets: any[]): void {
    writeJsonFile('unlucky_bets.json', bets);
  },
  addUnluckyBet(bet: any): any {
    const list = this.getUnluckyBets();
    list.unshift({ ...bet, timestamp: new Date().toISOString(), id: `unlucky_${Date.now()}` });
    this.saveUnluckyBets(list);
    return list[0];
  },
  voteUnluckyBet(id: string): any {
    const list = this.getUnluckyBets();
    const idx = list.findIndex(b => b.id === id);
    if (idx !== -1) {
      list[idx].votes = (list[idx].votes || 0) + 1;
      this.saveUnluckyBets(list);
      return list[idx];
    }
    return null;
  },

  getAiChallenges(): any[] {
    return readJsonFile<any[]>('ai_challenges.json', []);
  },
  saveAiChallenges(challenges: any[]): void {
    writeJsonFile('ai_challenges.json', challenges);
  },
  addAiChallenge(challenge: any): any {
    const list = this.getAiChallenges();
    list.unshift({ ...challenge, id: `chal_${Date.now()}`, timestamp: new Date().toISOString(), status: 'open' });
    this.saveAiChallenges(list);
    return list[0];
  },

  getReferrals(): any[] {
    return readJsonFile<any[]>('referrals.json', []);
  },
  saveReferrals(referrals: any[]): void {
    writeJsonFile('referrals.json', referrals);
  },
  addReferral(ref: any): any {
    const list = this.getReferrals();
    list.unshift({ ...ref, id: `ref_${Date.now()}`, timestamp: new Date().toISOString(), status: 'joined' });
    this.saveReferrals(list);
    return list[0];
  },
};

// Initial verification and seed on boot
ensureDataDir();
storage.getCompanies();
storage.getCompensationRequests();
storage.getPhoneChangeRequests();
storage.getAppBranding();
storage.getTelegramConfig();
storage.getNotifications();
storage.getAbTestCampaigns();
storage.getCompensationEmailTemplates();
storage.getEmailDispatchLogs();
storage.getGoldenHourState();
storage.getUnluckyBets();
storage.getAiChallenges();
storage.getReferrals();
