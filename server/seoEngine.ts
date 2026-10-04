import { Request } from 'express';

// ==============================================================================
// 🌐 MULTI-DOMAIN ARCHITECTURE MATRIX & CONFIGURATION
// ==============================================================================

export interface DomainConfig {
  domain: string;
  role: 'primary' | 'secondary_brand' | 'redirect' | 'alias';
  brandName: string;
  taglineAr: string;
  taglineEn: string;
  descriptionAr: string;
  descriptionEn: string;
  keywords: string;
  primaryColor: string;
  canonicalBase: string;
  redirectTarget?: string;
  isIndexable: boolean;
  supportedRoutes: string[];
}

export const DOMAIN_MATRIX: Record<string, DomainConfig> = {
  'vex.deals': {
    domain: 'vex.deals',
    role: 'primary',
    brandName: 'VEX Deals',
    taglineAr: 'المنصة الأولى لتعويضات الخسائر وتتبع المحافظ وتوقعات المباريات بالذكاء الاصطناعي',
    taglineEn: 'Betting Deals, Loss Compensation, Wallet Tracking & AI Sports Forecasting',
    descriptionAr: 'منصة VEX Deals الرسمية لتتبع محافظ شركات المراهنات، طلبات تعويض الخسائر الرياضية، إلغاء تجميد الإحالات، وتحويل الأرصدة المعتمدة بالذكاء الاصطناعي.',
    descriptionEn: 'Official VEX Deals platform for betting account cashback, loss compensation tracking, referral unfreezing, and Gemini AI tactical sports forecasting.',
    keywords: 'VEX Deals, تعويضات المراهنات, كاش باك 1xbet, melbet cashback, تتبع المحافظ, فك تجميد الإحالات, توقعات المباريات بالذكاء الاصطناعي, VEX Loyalty',
    primaryColor: '#059669',
    canonicalBase: 'https://vex.deals',
    isIndexable: true,
    supportedRoutes: [
      '/',
      '/companies',
      '/wallets',
      '/ai-sports',
      '/referrals',
      '/transfers',
      '/activity',
      '/unlucky-wall',
      '/lottery',
      '/responsible-gaming',
      '/legal',
    ],
  },
  'betjam.sbs': {
    domain: 'betjam.sbs',
    role: 'secondary_brand',
    brandName: 'Betjam Partner Portal',
    taglineAr: 'بوابة Betjam المعتمدة لتعويضات الخسائر والبونص الملكي وحماية المحافظ',
    taglineEn: 'Official Betjam Agency Cashback & Royal Loss Compensation Portal',
    descriptionAr: 'البوابة الرسمية المعتمدة لشركة Betjam عبر VEX Deals. سجل بكود VEDO2002 للحصول على بونص الملكي وحماية الخسائر الفورية وتتبع المحافظ الرقمية.',
    descriptionEn: 'Official Betjam agency compensation portal by VEX Deals. Register with code VEDO2002 for royal cashback, loss protection, and instant balance tracking.',
    keywords: 'Betjam, betjam.sbs, كود betjam, VEDO2002, كاش باك بتجام, تعويضات betjam, محفظة betjam, VEX Deals',
    primaryColor: '#d97706',
    canonicalBase: 'https://betjam.sbs',
    isIndexable: true,
    supportedRoutes: [
      '/',
      '/companies',
      '/wallets',
      '/ai-sports',
      '/responsible-gaming',
      '/legal',
    ],
  },
  'betongame.cloud': {
    domain: 'betongame.cloud',
    role: 'secondary_brand',
    brandName: 'BetOnGame Cloud Portal',
    taglineAr: 'بوابة BetOnGame للألعاب والخدمات الرياضية واسترداد الرصيد',
    taglineEn: 'BetOnGame Cloud Portal for Gaming Rewards & Balance Compensation',
    descriptionAr: 'منصة BetOnGame المعتمدة لإدارة حسابات الألعاب والرهانات الرياضية واسترداد الخسائر التكتيكية عبر شبكة VEX Deals المحمية.',
    descriptionEn: 'Official BetOnGame portal powered by VEX Deals. Access verified cashback, loss recovery, and real-time wallet tracking.',
    keywords: 'BetOnGame, betongame.cloud, كاش باك betongame, تعويضات الألعاب, VEX Deals',
    primaryColor: '#2563eb',
    canonicalBase: 'https://betongame.cloud',
    isIndexable: true,
    supportedRoutes: [
      '/',
      '/companies',
      '/wallets',
      '/responsible-gaming',
      '/legal',
    ],
  },
  '1xbetservices.com': {
    domain: '1xbetservices.com',
    role: 'secondary_brand',
    brandName: '1xBet Agency Services',
    taglineAr: 'المركز المعتمد لخدمات وكلاء 1xBet واسترداد الخسائر والبونص الحصري',
    taglineEn: '1xBet Verified Agency Services & Instant Loss Compensation Center',
    descriptionAr: 'المركز المعتمد لخدمات وكلاء 1xBet. سجل بكود VEX للحصول على أعلى نسبة استرداد خسائر، تحويل الأرصدة، وفك تجميد الحسابات.',
    descriptionEn: 'Verified 1xBet Agency Services portal. Register with code VEX for maximum loss compensation, secure wallet transfers, and instant cashback.',
    keywords: '1xBet, 1xbetservices.com, كود 1xbet, كاش باك 1xbet, تعويضات 1xbet, وكيل 1xbet, VEX Deals',
    primaryColor: '#0284c7',
    canonicalBase: 'https://1xbetservices.com',
    isIndexable: true,
    supportedRoutes: [
      '/',
      '/companies',
      '/wallets',
      '/responsible-gaming',
      '/legal',
    ],
  },
  'vixo.uno': {
    domain: 'vixo.uno',
    role: 'redirect',
    brandName: 'VIXO Network',
    taglineAr: 'شبكة VIXO المعتمدة لخدمات التعويضات - إعادة توجيه إلى VEX Deals',
    taglineEn: 'VIXO Verified Network - Official Redirect to VEX Deals',
    descriptionAr: 'نطاق VIXO التابع لشبكة VEX Deals الرسمية.',
    descriptionEn: 'VIXO partner domain redirecting to official VEX Deals platform.',
    keywords: 'VIXO, vixo.uno, VEX Deals',
    primaryColor: '#059669',
    canonicalBase: 'https://vex.deals',
    redirectTarget: 'https://vex.deals',
    isIndexable: false,
    supportedRoutes: ['/'],
  },
};

// ==============================================================================
// 🔒 HOST HEADER AUDIT & SANITIZATION (Host Header Injection Guard)
// ==============================================================================

export function resolveCleanHost(req: Request): {
  hostname: string;
  config: DomainConfig;
  isAllowedHost: boolean;
  shouldRedirectAlias: boolean;
  redirectUrl?: string;
} {
  const rawHost = (req.headers['x-forwarded-host'] || req.headers['host'] || 'vex.deals') as string;
  // Strip port if present (e.g. localhost:3000 -> localhost)
  const cleanHost = rawHost.split(':')[0].toLowerCase().trim();

  // Handle WWW prefix
  const normalizedHost = cleanHost.replace(/^www\./, '');

  // Check alias redirect (e.g., vixo.uno -> vex.deals)
  if (normalizedHost === 'vixo.uno' || DOMAIN_MATRIX[normalizedHost]?.role === 'redirect') {
    const targetBase = DOMAIN_MATRIX[normalizedHost]?.redirectTarget || 'https://vex.deals';
    return {
      hostname: normalizedHost,
      config: DOMAIN_MATRIX['vixo.uno'],
      isAllowedHost: true,
      shouldRedirectAlias: true,
      redirectUrl: `${targetBase}${req.originalUrl || '/'}`,
    };
  }

  // Check matched domain
  if (DOMAIN_MATRIX[normalizedHost]) {
    return {
      hostname: normalizedHost,
      config: DOMAIN_MATRIX[normalizedHost],
      isAllowedHost: true,
      shouldRedirectAlias: false,
    };
  }

  // Fallback for local development or unexpected hostnames (e.g. cloud run internal URLs)
  return {
    hostname: 'vex.deals',
    config: DOMAIN_MATRIX['vex.deals'],
    isAllowedHost: false, // fallback used safely
    shouldRedirectAlias: false,
  };
}

// ==============================================================================
// 🤖 DYNAMIC ROBOTS.TXT GENERATOR
// ==============================================================================

export function generateRobotsTxt(cleanHost: string): string {
  const config = DOMAIN_MATRIX[cleanHost] || DOMAIN_MATRIX['vex.deals'];

  if (!config.isIndexable) {
    return `# ${config.brandName} - Robots.txt
User-agent: *
Disallow: /
`;
  }

  return `# ${config.brandName} (${config.domain}) - Official Search & AI Crawler Rules
User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /api/
Disallow: /*?*admin=
Disallow: /*#admin

# Search Engine Crawlers
User-agent: Googlebot
Allow: /
Disallow: /admin

User-agent: Bingbot
Allow: /
Disallow: /admin

# AI Answer Engines & Generative Search Crawlers
User-agent: Google-Extended
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Applebot
Allow: /

# XML Sitemap Index
Sitemap: ${config.canonicalBase}/sitemap.xml
`;
}

// ==============================================================================
// 🗺️ DYNAMIC SCHEMA-COMPLIANT XML SITEMAP GENERATOR
// ==============================================================================

export function generateSitemapXml(cleanHost: string): string {
  const config = DOMAIN_MATRIX[cleanHost] || DOMAIN_MATRIX['vex.deals'];
  const todayIso = new Date().toISOString().split('T')[0];

  const routes = config.supportedRoutes.filter((r) => r !== '/admin' && !r.includes('#'));

  const urlEntries = routes
    .map((route) => {
      const fullUrl = route === '/' ? `${config.canonicalBase}/` : `${config.canonicalBase}${route}`;
      let priority = '0.8';
      let changefreq = 'daily';

      if (route === '/') {
        priority = '1.0';
      } else if (route === '/companies' || route === '/wallets' || route === '/ai-sports') {
        priority = '0.9';
      } else if (route === '/responsible-gaming' || route === '/legal') {
        priority = '0.5';
        changefreq = 'weekly';
      }

      return `  <url>
    <loc>${fullUrl}</loc>
    <lastmod>${todayIso}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

// ==============================================================================
// 🏷️ ROUTE & DOMAIN-AWARE HTML META & JSON-LD PRE-RENDERER
// ==============================================================================

export function renderSeoMetaHead(req: Request, rawHtml: string): string {
  const { hostname, config, shouldRedirectAlias } = resolveCleanHost(req);

  // Normalize requested path
  const reqPath = req.path || '/';
  const cleanPath = reqPath === '/' ? '/' : reqPath.replace(/\/$/, '');

  // Check if admin route -> Inject strict NOINDEX
  const isAdmin = cleanPath === '/admin' || cleanPath.startsWith('/admin') || req.query?.admin === 'true';

  if (isAdmin) {
    const adminHeadReplacements = `
    <title>VEX Deals - Standalone Admin Operations Console</title>
    <meta name="robots" content="noindex, nofollow, noarchive" />
    <meta name="googlebot" content="noindex, nofollow" />
`;
    return rawHtml.replace(/<title>.*?<\/title>/i, adminHeadReplacements);
  }

  // Determine Title & Meta Description based on Route & Domain
  let title = `${config.brandName} - ${config.taglineAr}`;
  let description = config.descriptionAr;

  switch (cleanPath) {
    case '/companies':
      title = `دليل الشركاء والشركات المعتمدة | ${config.brandName}`;
      description = `استعرض شركات المراهنات والشركاء المعتمدين لدى ${config.brandName}، احصل على أكواد البونص الحصرية بروابط رسمية ومباشرة.`;
      break;
    case '/wallets':
      title = `تتبع المحافظ والأرصدة الرقمية | ${config.brandName}`;
      description = `إدارة وتتبع المحافظ الرقمية لشركات المراهنات، تتبع الأرصدة المجمدة والمتاحة مع إمكانية فك التجميد المباشر.`;
      break;
    case '/ai-sports':
      title = `توقعات المباريات والتحليلات الرياضية بالذكاء الاصطناعي | ${config.brandName}`;
      description = `تحليلات تكتيكية دقيقة لمباريات كرة القدم والرياضة برعاية نموذج Gemini AI المتقدم ومؤشرات الاحتمالات الذكية.`;
      break;
    case '/referrals':
      title = `نظام الإحالات والمكافآت (10%) | ${config.brandName}`;
      description = `شارك رابط الإحالة الخاص بك واحصل على 10% فك تجميد فوري للرصيد عند تسجيل ودعوة أصدقائك الجدد.`;
      break;
    case '/transfers':
      title = `تحويل الأموال والأرصدة بين المحافظ | ${config.brandName}`;
      description = `تحويل آمن وسريع للأرصدة بين المستخدمين مع حماية ضد التواطؤ والتشفير المصرفي المتقدم.`;
      break;
    case '/activity':
      title = `سجل النشاط وطلبات التعويض | ${config.brandName}`;
      description = `متابعة حالة طلبات استرداد الخسائر، توثيق الحسابات، وسجل المعاملات والتحويلات المباشرة.`;
      break;
    case '/unlucky-wall':
      title = `جدار النحس وقصص الخسائر الرياضية | ${config.brandName}`;
      description = `شارك قسائم الرهان الخاسرة على جدار النحس واحصل على تعويضات تضامنية وحماية من استنزاف الرصيد.`;
      break;
    case '/lottery':
      title = `سحوبات اللوتري والجوائز الكبرى المباشرة | ${config.brandName}`;
      description = `اشترك في سحوبات اللوتري الذهبي اليومية والأسبوعية مجاناً مع فرص الفوز بآلاف الدولارات.`;
      break;
    case '/responsible-gaming':
      title = `سياسة اللعب المسؤول وحماية المستخدم (18+) | ${config.brandName}`;
      description = `تلتزم منصة ${config.brandName} بمعايير اللعب المسؤول وتوفير أدوات الاستبعاد الذاتي والتوعية للبالغين 18+ فقط.`;
      break;
    case '/legal':
      title = `الشروط والأحكام وسياسة الخصوصية | ${config.brandName}`;
      description = `الشروط والأحكام القانونية وسياسة حماية البيانات لمستخدمي منصة ${config.brandName}.`;
      break;
  }

  const canonicalUrl = cleanPath === '/' ? `${config.canonicalBase}/` : `${config.canonicalBase}${cleanPath}`;

  // Structured Data JSON-LD
  const jsonLdGraph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': `${config.canonicalBase}/#software`,
        name: config.brandName,
        operatingSystem: 'All, Web, Android, iOS, PWA',
        applicationCategory: 'FinanceApplication',
        description: description,
        url: config.canonicalBase,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          reviewCount: '1580',
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${config.canonicalBase}/#website`,
        url: config.canonicalBase,
        name: config.brandName,
        description: description,
        inLanguage: ['ar', 'en', 'es', 'ru'],
      },
      {
        '@type': 'Organization',
        '@id': `${config.canonicalBase}/#organization`,
        name: config.brandName,
        url: config.canonicalBase,
        logo: `${config.canonicalBase}/icon-512.svg`,
      },
      {
        '@type': 'FAQPage',
        '@id': `${config.canonicalBase}/#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: `ما هي منصة ${config.brandName} وكيف تقدم التعويضات؟`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `منصة ${config.brandName} تتيح للمستخدمين تتبع محافظهم في شركات المراهنات المعتمدة وطلب تعويض الخسائر الرياضية بنسبة حقيقية تضاف للرصيد مع إمكانية تحويل وفك تجميد الأرصدة.`,
            },
          },
          {
            '@type': 'Question',
            name: 'كيف يتم فك تجميد الرصيد (Unfreeze Balance)؟',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'يتم فك تجميد الرصيد عبر طريقتين: 1) الإيداع المباشر بنسبة 1:1 لفك تجميد الرصيد فوراً. 2) نظام الإحالات عند قبول الصديق للتحويل.',
            },
          },
        ],
      },
    ],
  };

  const injectedHead = `
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="keywords" content="${config.keywords}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <link rel="canonical" href="${canonicalUrl}" />

    <!-- OpenGraph / Social Media -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:site_name" content="${config.brandName}" />
    <meta property="og:image" content="${config.canonicalBase}/icon-512.svg" />
    <meta property="og:locale" content="ar_AR" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${config.canonicalBase}/icon-512.svg" />

    <!-- Schema.org JSON-LD Structured Data -->
    <script type="application/ld+json">
    ${JSON.stringify(jsonLdGraph, null, 2)}
    </script>
`;

  // Replace existing head elements cleanly
  let updatedHtml = rawHtml;

  // Replace Title
  updatedHtml = updatedHtml.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);

  // Replace Description
  if (updatedHtml.includes('<meta name="description"')) {
    updatedHtml = updatedHtml.replace(
      /<meta\s+name="description"\s+content=".*?"\s*\/?>/i,
      `<meta name="description" content="${description}" />`
    );
  }

  // Replace Canonical Link
  if (updatedHtml.includes('<link rel="canonical"')) {
    updatedHtml = updatedHtml.replace(
      /<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i,
      `<link rel="canonical" href="${canonicalUrl}" />`
    );
  }

  // Insert structured data before </head>
  updatedHtml = updatedHtml.replace(
    /<\/head>/i,
    `  <script type="application/ld+json">\n  ${JSON.stringify(jsonLdGraph)}\n  </script>\n</head>`
  );

  return updatedHtml;
}
