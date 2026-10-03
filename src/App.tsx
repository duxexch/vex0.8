import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { io } from 'socket.io-client';
import {
  Building2,
  Wallet as WalletIcon,
  TrendingUp,
  ArrowRightLeft,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import {
  Company,
  CompensationAccount,
  CompensationRequest,
  Language,
  Referral,
  TabType,
  Transfer,
  Wallet,
  UserProfile,
  ThemeMode,
  AppBranding,
  AppNotification,
  SportsMatchFixture,
  SportsNewsItem,
  AiMatchAnalysis,
  NotificationCategory,
} from './types';
import { useTranslation } from './i18n';
import { vexApi } from './services/api';
import { requestFCMToken, onForegroundMessage } from './services/firebaseClient';
import { recursiveLocalizeCompanies } from './utils/companyTranslator';
import { detectUserRegionalCurrency } from './utils/currency';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { CompaniesTab } from './components/CompaniesTab';
import { WalletTab } from './components/WalletTab';
import { ReferralsTab } from './components/ReferralsTab';
import { TransfersTab } from './components/TransfersTab';
import { ActivityTab } from './components/ActivityTab';
import { AiSportsHubTab } from './components/AiSportsHubTab';
import { UnluckyWallTab } from './components/UnluckyWallTab';
import { LotteryTab } from './components/LotteryTab';
import { RegisterModal } from './components/RegisterModal';
import { CompensationRequestModal } from './components/CompensationRequestModal';
import { CompanyDetailsModal } from './components/CompanyDetailsModal';
import { PhoneVerificationModal } from './components/PhoneVerificationModal';
import { SecurityAndSettingsModal } from './components/SecurityAndSettingsModal';
import { SecurityAnalysisModal } from './components/SecurityAnalysisModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { AiMatchAnalysisModal } from './components/AiMatchAnalysisModal';
import { ResponsibleGamingModal } from './components/ResponsibleGamingModal';
import { LegalTermsModal } from './components/LegalTermsModal';
import { DirectDepositUnfreezeModal } from './components/DirectDepositUnfreezeModal';
import { Toast } from './components/Toast';
import { IosInstallModal } from './components/IosInstallModal';
import { LotteryTickerBar } from './components/LotteryTickerBar';
import { AppSplashScreen } from './components/AppSplashScreen';
import { AppMoreBottomSheet } from './components/AppMoreBottomSheet';
import { PullToRefresh } from './components/PullToRefresh';

export default function App() {
  const { lang, setLang, t } = useTranslation();
  const [userId, setUserId] = useState<string>('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [themeMode] = useState<ThemeMode>('light');
  const [activeTab, setActiveTab] = useState<TabType>('companies');
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<string>(() => {
    return localStorage.getItem('vex_display_currency') || detectUserRegionalCurrency();
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg?: string) => {
    setToastMessage(msg || 'copied');
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  useEffect(() => {
    localStorage.setItem('vex_display_currency', displayCurrency);
  }, [displayCurrency]);

  // App Branding (Admin controllable)
  const [appBranding, setAppBranding] = useState<AppBranding>({
    appName: 'VEX Deals',
    tagline: 'منصة الولاء والتعويضات والتحليلات الرياضية الذكية',
    iconType: 'preset',
    presetIconId: 'emerald-shield',
  });

  // Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Core Data states
  const [companies, setCompanies] = useState<Company[]>([]);
  const localizedCompanies = recursiveLocalizeCompanies(companies, lang);
  const [accounts, setAccounts] = useState<CompensationAccount[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [requests, setRequests] = useState<CompensationRequest[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // Modals
  const [registerModalCompany, setRegisterModalCompany] = useState<Company | null>(null);
  const [detailsModalCompany, setDetailsModalCompany] = useState<Company | null>(null);
  const [compModalOpen, setCompModalOpen] = useState(false);
  const [compModalCompanyId, setCompModalCompanyId] = useState<string | undefined>(undefined);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [securityAnalysisOpen, setSecurityAnalysisOpen] = useState(false);
  const [notifCenterOpen, setNotifCenterOpen] = useState(false);
  const [adminDashboardOpen, setAdminDashboardOpen] = useState(false);
  const [responsibleGamingOpen, setResponsibleGamingOpen] = useState(false);
  const [legalTermsOpen, setLegalTermsOpen] = useState(false);
  const [depositUnfreezeModalOpen, setDepositUnfreezeModalOpen] = useState(false);

  // AI Match Analysis & Fixtures
  const [fixtures, setFixtures] = useState<SportsMatchFixture[]>([]);
  const [sportsNews, setSportsNews] = useState<SportsNewsItem[]>([]);
  const [loadingFixtures, setLoadingFixtures] = useState(false);
  const [selectedFixtureForAi, setSelectedFixtureForAi] = useState<SportsMatchFixture | null>(null);

  // Pre-selected IDs for tab transitions
  const [transferInitialCompanyId, setTransferInitialCompanyId] = useState<string | undefined>(undefined);
  const [referralInitialCompanyId, setReferralInitialCompanyId] = useState<string | undefined>(undefined);

  // PWA Install prompt state
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [iosInstallModalOpen, setIosInstallModalOpen] = useState<boolean>(false);
  const [iosBannerDismissed, setIosBannerDismissed] = useState<boolean>(() => {
    return localStorage.getItem('vex_ios_banner_dismissed') === 'true';
  });

  const dismissIosBanner = () => {
    setIosBannerDismissed(true);
    localStorage.setItem('vex_ios_banner_dismissed', 'true');
  };

  const isIosDevice = () => {
    return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  };

  // Initialize PWA install listener
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPwa = async () => {
    if (isIosDevice() && !isStandalone) {
      setIosInstallModalOpen(true);
      return;
    }
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredInstallPrompt(null);
      }
    } else {
      showToast(lang === 'ar' ? 'افتح قائمة المتصفح واختر "إضافة إلى الشاشة الرئيسية"' : 'Open browser menu and select "Add to Home Screen"');
    }
  };

  // Initialize User ID, Standalone detection & Admin Route
  useEffect(() => {
    // Strictly enforce light mode
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('vex_theme');

    const uid = vexApi.getUserId();
    setUserId(uid);

    if (typeof window !== 'undefined') {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        window.matchMedia('(display-mode: window-controls-overlay)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches;
      setIsStandalone(standalone);

      // Check if URL requests admin (e.g. /admin, #admin, ?admin=true)
      const checkAdminRoute = () => {
        const isHashAdmin = window.location.hash === '#admin';
        const isPathAdmin = window.location.pathname === '/admin' || window.location.pathname.endsWith('/admin');
        const isQueryAdmin = window.location.search.includes('admin=true');
        if (isHashAdmin || isPathAdmin || isQueryAdmin) {
          setAdminDashboardOpen(true);
        } else {
          setAdminDashboardOpen(false);
        }
      };
      checkAdminRoute();
      window.addEventListener('hashchange', checkAdminRoute);
      window.addEventListener('popstate', checkAdminRoute);
      return () => {
        window.removeEventListener('hashchange', checkAdminRoute);
        window.removeEventListener('popstate', checkAdminRoute);
      };
    }
  }, []);

  // Initialize FCM Push Notifications for Compensation Requests
  useEffect(() => {
    requestFCMToken().then((token) => {
      if (token) {
        console.log('FCM Token registered:', token);
      }
    });

    const unsubscribe = onForegroundMessage((payload) => {
      console.log('Foreground push notification received:', payload);
      const title = payload.notification?.title || (lang === 'ar' ? 'تحديث طلب التعويض' : 'Compensation Status Update');
      const body = payload.notification?.body || '';
      showToast(`${title}: ${body}`);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [lang]);

  const handleCloseAdmin = () => {
    setAdminDashboardOpen(false);
    if (window.location.hash === '#admin') {
      window.history.pushState({}, '', window.location.pathname);
    }
    if (window.location.pathname === '/admin' || window.location.pathname.endsWith('/admin')) {
      window.history.pushState({}, '', '/');
    }
    if (window.location.search.includes('admin=true')) {
      window.history.pushState({}, '', window.location.pathname);
    }
  };

  // Load app branding & notifications
  const loadBrandingAndNotifs = useCallback(async () => {
    try {
      const [branding, notifs] = await Promise.all([
        vexApi.getAppBranding(),
        vexApi.getNotifications(),
      ]);
      setAppBranding(branding);
      setNotifications(notifs);
    } catch (err) {
      console.warn('Error loading branding or notifications:', err);
    }
  }, []);

  // Load all user data and profile
  const loadData = useCallback(async () => {
    try {
      setIsLoadingData(true);
      setLoadingFixtures(true);
      const [comps, myAccs, myWallets, myReqs, myRefs, myTrans, profile, sportsFixtures, newsList] = await Promise.all([
        vexApi.getCompanies(),
        vexApi.getMyAccounts(),
        vexApi.getWallets(),
        vexApi.getCompensationRequests(),
        vexApi.getReferrals(),
        vexApi.getTransfers(),
        vexApi.getUserProfile(),
        vexApi.getSportsFixtures(),
        vexApi.getSportsNews(),
      ]);

      setCompanies(comps);
      setAccounts(myAccs);
      setWallets(myWallets);
      setRequests(myReqs);
      setReferrals(myRefs);
      setTransfers(myTrans);
      setUserProfile(profile);
      setFixtures(sportsFixtures);
      setSportsNews(newsList);
      setUserId(vexApi.getUserId());
    } catch (err) {
      console.error('Failed to load VEX data:', err);
    } finally {
      setIsLoadingData(false);
      setLoadingFixtures(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadBrandingAndNotifs();
    vexApi.logUserInteraction('session_start');
  }, [loadData, loadBrandingAndNotifs]);

  useEffect(() => {
    if (activeTab) {
      vexApi.logUserInteraction(`tab_${activeTab}`);
    }
  }, [activeTab]);

  // Real-time Socket.io Notification & Betting Sync for VPS / Docker with Nginx & Heartbeat
  useEffect(() => {
    const socket = io({
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 15000,
    });

    socket.on('connect', () => {
      console.log('⚡ Connected to VEX Real-Time Socket Hub (ID:', socket.id, ')');
    });

    socket.on('disconnect', (reason) => {
      console.warn('⚠️ Disconnected from Socket Hub:', reason);
    });

    socket.on('connect_error', () => {
      // Graceful handling of transient proxy timeouts
    });

    socket.on('notification', (newNotif: AppNotification) => {
      setNotifications((prev) => [newNotif, ...prev]);
      showToast(lang === 'ar' ? 'إشعار جديد في الوقت الحقيقي!' : 'New real-time alert!');
    });

    // Heartbeat ping interval to keep Nginx reverse proxy connection alive (every 25 seconds)
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat', { timestamp: Date.now() });
      }
    }, 25000);

    return () => {
      clearInterval(heartbeatInterval);
      socket.disconnect();
    };
  }, [lang]);

  // Toggle Language
  const handleToggleLang = () => {
    setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));
  };

  // Toggle Theme: No-op (Light mode enforced)
  const handleToggleTheme = () => {
    document.documentElement.classList.remove('dark');
  };

  // Quick action: Request Compensation for specific company
  const handleRequestComp = (companyId: string) => {
    setCompModalCompanyId(companyId);
    setCompModalOpen(true);
  };

  // Quick action: Transfer for specific company
  const handleGoToTransfer = (companyId: string) => {
    setTransferInitialCompanyId(companyId);
    setActiveTab('transfers');
  };

  // Quick action: Referrals for specific company
  const handleGoToReferral = (companyId: string) => {
    setReferralInitialCompanyId(companyId);
    setActiveTab('referrals');
  };

  // Admin Actions
  const handleUpdateBranding = async (newBranding: AppBranding) => {
    await vexApi.updateAppBranding(newBranding);
    setAppBranding(newBranding);
    if (newBranding.appName) {
      document.title = `${newBranding.appName}${newBranding.tagline ? ` - ${newBranding.tagline}` : ''}`;
    }
  };

  const handleUpdateCompany = async (company: Company) => {
    await vexApi.updateCompany(company);
    await loadData();
  };

  const handleToggleCompanyActive = async (companyId: string) => {
    const updated = await vexApi.toggleCompanyActive(companyId);
    await loadData();
    return updated;
  };

  const handleAddCompany = async (company: Company) => {
    await vexApi.addCompany(company);
    await loadData();
  };

  const handleSyncCompanies = async () => {
    vexApi.syncOfficialCompanies();
    await loadData();
  };

  const handleApproveCompensation = async (reqId: string) => {
    await vexApi.approveCompensationRequest(reqId);
    await Promise.all([loadData(), loadBrandingAndNotifs()]);
  };

  const handleBulkApproveCompensation = async (reqIds: string[]) => {
    await vexApi.bulkApproveCompensationRequests(reqIds);
    await Promise.all([loadData(), loadBrandingAndNotifs()]);
  };

  const handleRejectCompensation = async (reqId: string, reason: string) => {
    await vexApi.rejectCompensationRequest(reqId, reason);
    await Promise.all([loadData(), loadBrandingAndNotifs()]);
  };

  const handleBulkRejectCompensation = async (reqIds: string[], reason: string) => {
    await vexApi.bulkRejectCompensationRequests(reqIds, reason);
    await Promise.all([loadData(), loadBrandingAndNotifs()]);
  };

  const handleBroadcastNotification = async (
    title: string,
    message: string,
    category: NotificationCategory
  ) => {
    const notif = await vexApi.broadcastNotification(title, message, category);
    setNotifications((prev) => [notif, ...prev]);
  };

  const handleTriggerAiPrediction = async () => {
    const notif = await vexApi.triggerAiAgentBroadcast();
    setNotifications((prev) => [notif, ...prev]);
  };

  const handleMarkNotificationRead = async (id: string) => {
    await vexApi.markNotificationAsRead(id);
    if (id === 'all') {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } else {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    }
  };

  const pendingRequestsCount = requests.filter((r) => r.status === 'pending').length;
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col bg-slate-50 text-slate-900 selection:bg-emerald-100 selection:text-emerald-900 select-none"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* 1. Native App Animated Splash Screen on First Load */}
      <AppSplashScreen branding={appBranding} />

      {/* Live Horizontal Marquee Lottery & Winners News Ticker */}
      <LotteryTickerBar
        lang={lang}
        onOpenLottery={() => setActiveTab('lottery')}
      />

      {/* 2. Slim Native App Top Bar */}
      <Header
        userId={userId}
        userProfile={userProfile}
        lang={lang}
        themeMode={themeMode}
        appBranding={appBranding}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenNotifications={() => setNotifCenterOpen(true)}
        onOpenResponsibleGaming={() => setResponsibleGamingOpen(true)}
        onToggleTheme={handleToggleTheme}
        onSelectLang={(newLang) => setLang(newLang)}
        onOpenPhoneModal={() => setPhoneModalOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenSecurityAnalysis={() => setSecurityAnalysisOpen(true)}
        canInstallPwa={!!deferredInstallPrompt}
        onInstallPwa={handleInstallPwa}
        isStandalone={isStandalone}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        pendingRequestsCount={pendingRequestsCount}
      />

      {/* iOS Install Banner */}
      {isIosDevice() && !isStandalone && !iosBannerDismissed && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-2 text-xs flex items-center justify-between shadow-md z-30 shrink-0 select-none">
          <div className="flex items-center gap-2">
            <span className="text-base">📱</span>
            <div>
              <span className="font-bold block">
                {lang === 'ar' ? 'تثبيت التطبيق على آيفون (Safari)' : 'Install App on iPhone (Safari)'}
              </span>
              <span className="text-[11px] text-blue-100">
                {lang === 'ar' ? 'اضغط زر المشاركة (Share) ثم "إضافة إلى الشاشة الرئيسية"' : 'Tap Share button then "Add to Home Screen"'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIosInstallModalOpen(true)}
              className="bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
            >
              {lang === 'ar' ? 'الطريقة' : 'Guide'}
            </button>
            <button
              onClick={dismissIosBanner}
              className="text-white/80 hover:text-white p-1 cursor-pointer font-bold"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 3. Dedicated Scrollable Content Viewport with Native Pull-To-Refresh */}
      <PullToRefresh onRefresh={loadData} lang={lang}>
        <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 pb-24 md:pb-16 min-h-full">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {activeTab === 'companies' && (
              <CompaniesTab
                companies={localizedCompanies}
                accounts={accounts}
                branding={appBranding}
                onOpenRegister={(company) => setRegisterModalCompany(company)}
                onOpenDetails={(company) => setDetailsModalCompany(company)}
                onRequestComp={handleRequestComp}
                lang={lang}
                isLoading={isLoadingData}
                onCopyToast={showToast}
              />
            )}

            {activeTab === 'wallets' && (
              <WalletTab
                wallets={wallets}
                companies={localizedCompanies}
                accounts={accounts}
                userProfile={userProfile}
                onGoToTransfer={handleGoToTransfer}
                onGoToReferral={handleGoToReferral}
                onRequestComp={handleRequestComp}
                onOpenDepositUnfreeze={() => setDepositUnfreezeModalOpen(true)}
                onOpenPhoneModal={() => setPhoneModalOpen(true)}
                lang={lang}
                isLoading={isLoadingData}
                displayCurrency={displayCurrency}
                onCopyToast={showToast}
              />
            )}

            {activeTab === 'ai-sports' && (
              <AiSportsHubTab
                fixtures={fixtures}
                news={sportsNews}
                loadingFixtures={loadingFixtures}
                onAnalyzeMatch={(fixture) => setSelectedFixtureForAi(fixture)}
                onTriggerAgentBroadcast={handleTriggerAiPrediction}
                lang={lang}
                userId={userId}
              />
            )}

            {activeTab === 'referrals' && (
              <ReferralsTab
                companies={localizedCompanies}
                referrals={referrals}
                selectedCompanyId={referralInitialCompanyId}
                onRefresh={loadData}
                lang={lang}
                onCopyToast={showToast}
              />
            )}

            {activeTab === 'transfers' && (
              <TransfersTab
                wallets={wallets}
                companies={localizedCompanies}
                transfers={transfers}
                initialCompanyId={transferInitialCompanyId}
                userProfile={userProfile}
                onRefresh={loadData}
                onOpenPhoneModal={() => setPhoneModalOpen(true)}
                lang={lang}
                displayCurrency={displayCurrency}
                isLoading={isLoadingData}
              />
            )}

            {activeTab === 'activity' && (
              <ActivityTab
                accounts={accounts}
                requests={requests}
                onOpenNewRequest={() => {
                  setCompModalCompanyId(undefined);
                  setCompModalOpen(true);
                }}
                lang={lang}
                isLoading={isLoadingData}
                onCopyToast={showToast}
              />
            )}

            {activeTab === 'unlucky-wall' && (
              <UnluckyWallTab lang={lang} onCopyToast={showToast} />
            )}

            {activeTab === 'lottery' && (
              <LotteryTab
                lang={lang}
                userId={userId}
                wallets={wallets}
                onRefreshWallets={loadData}
                onCopyToast={showToast}
              />
            )}
          </motion.div>
        </main>
      </PullToRefresh>

      {/* 4. Native Persistent Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onOpenMoreSheet={() => setIsMoreSheetOpen(true)}
        lang={lang}
        pendingRequestsCount={pendingRequestsCount}
      />

      {/* 5. Native App Hub Bottom Sheet */}
      <AppMoreBottomSheet
        isOpen={isMoreSheetOpen}
        onClose={() => setIsMoreSheetOpen(false)}
        lang={lang}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setIsMoreSheetOpen(false);
        }}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenResponsibleGaming={() => setResponsibleGamingOpen(true)}
        onOpenLegalTerms={() => setLegalTermsOpen(true)}
        onOpenSecurityAnalysis={() => setSecurityAnalysisOpen(true)}
        pendingRequestsCount={pendingRequestsCount}
      />

      {/* 2-Step Account Registration Modal */}
      <RegisterModal
        company={registerModalCompany}
        isOpen={!!registerModalCompany}
        onClose={() => setRegisterModalCompany(null)}
        onSuccess={() => {
          loadData();
          setActiveTab('activity');
        }}
        lang={lang}
        onCopyToast={showToast}
      />

      {/* Company Details & Perks Modal */}
      <CompanyDetailsModal
        company={detailsModalCompany}
        isOpen={!!detailsModalCompany}
        onClose={() => setDetailsModalCompany(null)}
        onRegisterClick={(comp) => {
          setDetailsModalCompany(null);
          setRegisterModalCompany(comp);
        }}
        lang={lang}
        onCopyToast={showToast}
      />

      {/* Compensation Request Modal */}
      <CompensationRequestModal
        accounts={accounts}
        initialCompanyId={compModalCompanyId}
        isOpen={compModalOpen}
        onClose={() => setCompModalOpen(false)}
        onSuccess={() => {
          loadData();
          setActiveTab('activity');
        }}
        lang={lang}
      />

      {/* Real Phone Number Linking & OTP Modal */}
      <PhoneVerificationModal
        isOpen={phoneModalOpen}
        onClose={() => setPhoneModalOpen(false)}
        userProfile={userProfile}
        onSuccess={loadData}
        lang={lang}
      />

      {/* Security, PIN & Apple Guideline 5.1.1 Account Purge Modal */}
      <SecurityAndSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        userProfile={userProfile}
        onOpenPhoneModal={() => setPhoneModalOpen(true)}
        onAccountDeleted={() => {
          loadData();
          setActiveTab('companies');
        }}
        lang={lang}
        canInstallPwa={Boolean(deferredInstallPrompt)}
        onInstallPwa={handleInstallPwa}
        displayCurrency={displayCurrency}
        onDisplayCurrencyChange={setDisplayCurrency}
      />

      {/* Security Analysis & Vulnerability Audit Modal */}
      <SecurityAnalysisModal
        isOpen={securityAnalysisOpen}
        onClose={() => setSecurityAnalysisOpen(false)}
        lang={lang}
      />

      {/* Notification Center & AI Push Notifications */}
      <NotificationCenterModal
        isOpen={notifCenterOpen}
        onClose={() => setNotifCenterOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkNotificationRead}
        onMarkAllRead={() => handleMarkNotificationRead('all')}
        onSelectNotificationAction={(notif) => {
          if (notif.data?.targetTab) {
            setActiveTab(notif.data.targetTab as any);
            setNotifCenterOpen(false);
          }
        }}
        lang={lang}
      />

      {/* Admin Dashboard Hub (Custom Branding, Approvals, News, Store Compliance) */}
      <AdminDashboardModal
        isOpen={adminDashboardOpen}
        onClose={handleCloseAdmin}
        appBranding={appBranding}
        branding={appBranding}
        accounts={accounts}
        wallets={wallets}
        onUpdateBranding={handleUpdateBranding}
        requests={requests}
        onApproveRequest={handleApproveCompensation}
        onBulkApproveRequests={handleBulkApproveCompensation}
        onRejectRequest={handleRejectCompensation}
        onBulkRejectRequests={handleBulkRejectCompensation}
        companies={companies}
        onUpdateCompany={handleUpdateCompany}
        onToggleCompanyActive={handleToggleCompanyActive}
        onAddCompany={handleAddCompany}
        onSyncCompanies={handleSyncCompanies}
        onBroadcastNotification={handleBroadcastNotification}
        onTriggerAiBroadcast={handleTriggerAiPrediction}
        onTriggerAiPrediction={handleTriggerAiPrediction}
        notifications={notifications}
        lang={lang}
        onLangChange={setLang}
        onCopyToast={showToast}
        isStandalone={
          typeof window !== 'undefined' &&
          (window.location.pathname === '/admin' ||
            window.location.pathname.endsWith('/admin') ||
            window.location.hash === '#admin' ||
            window.location.search.includes('admin=true'))
        }
      />

      {/* AI Match Analysis Modal (Gemini 3.8 Flash Tactical Prediction) */}
      <AiMatchAnalysisModal
        fixture={selectedFixtureForAi}
        isOpen={!!selectedFixtureForAi}
        onClose={() => setSelectedFixtureForAi(null)}
        lang={lang}
      />

      {/* Responsible Gaming & Age Gate (+18) Modal */}
      <ResponsibleGamingModal
        isOpen={responsibleGamingOpen}
        onClose={() => setResponsibleGamingOpen(false)}
        lang={lang}
      />

      {/* Legal Terms & Privacy Policy (Apple Guideline 5.1.1 & Google Play) */}
      <LegalTermsModal
        isOpen={legalTermsOpen}
        onClose={() => setLegalTermsOpen(false)}
        lang={lang}
      />

      {/* Direct Deposit Unfreeze Modal (1:1 matching deposit unfreeze request) */}
      <DirectDepositUnfreezeModal
        isOpen={depositUnfreezeModalOpen}
        onClose={() => setDepositUnfreezeModalOpen(false)}
        wallets={wallets}
        companies={localizedCompanies}
        lang={lang}
        displayCurrency={displayCurrency}
        onSuccess={loadData}
        showToast={showToast}
      />

      {/* iOS Safari Install Guide Modal */}
      <IosInstallModal
        isOpen={iosInstallModalOpen}
        onClose={() => setIosInstallModalOpen(false)}
        lang={lang}
      />

      {/* Global Copy Success Toast Notification */}
      <Toast message={toastMessage} lang={lang} />
    </div>
  );
}
