// =========================================================================
// VEX Deals — curated free/public API catalog (free tiers verified 2026).
// Served read-only at GET /api/free-apis. Never exposes key values: status
// is computed from env presence only. Entries with `wired` are already used
// by the platform; the rest are documented and ready for future features.
// =========================================================================

export type FreeApiCategory =
  | 'sports'
  | 'odds'
  | 'news'
  | 'llm'
  | 'image'
  | 'weather'
  | 'finance'
  | 'geo'
  | 'translation'
  | 'lottery'
  | 'utility';

export interface FreeApiEntry {
  id: string;
  name: string;
  category: FreeApiCategory;
  website: string;
  /** API base URL (only hosts verified during research; website otherwise). */
  endpoint: string;
  auth: 'keyless' | 'env';
  /** Environment variable that enables this API when auth === 'env'. */
  envKey?: string;
  /** Human-readable free-tier quota. */
  quota: string;
  /** '' when not integrated, otherwise how VEX Deals uses it. */
  wired: string;
  notes?: string;
}

export interface FreeApiView extends FreeApiEntry {
  status: 'ready' | 'needs-key';
}

function envReady(name?: string): boolean {
  if (!name) return false;
  const v = String(process.env[name] || '').trim();
  if (v.length < 10 || v.startsWith('your_')) return false;
  return !/^(xxx|changeme|placeholder|dummy|test_)/i.test(v);
}

export function listFreeApis(): FreeApiView[] {
  return CATALOG.map((a) => ({
    ...a,
    status: a.auth === 'keyless' || envReady(a.envKey) ? 'ready' : 'needs-key',
  }));
}

export interface FreeApiPing {
  id: string;
  ok: boolean;
  ms: number;
  code?: number;
}

/** Live reachability check for a curated keyless sample (?ping=1 on the endpoint). */
export async function pingFreeApis(): Promise<FreeApiPing[]> {
  return Promise.all(
    PING_TARGETS.map(async (t): Promise<FreeApiPing> => {
      const started = Date.now();
      try {
        const res = await fetch(t.url, {
          signal: AbortSignal.timeout(8000),
          headers: { 'User-Agent': 'vex-deals-freeapis/1.0' },
        });
        return { id: t.id, ok: res.ok, ms: Date.now() - started, code: res.status };
      } catch {
        return { id: t.id, ok: false, ms: Date.now() - started };
      }
    })
  );
}

const PING_TARGETS: Array<{ id: string; url: string }> = [
  { id: 'espn-hidden', url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard' },
  { id: 'thesportsdb', url: 'https://www.thesportsdb.com/api/v1/json/3/all_leagues.php' },
  { id: 'open-meteo', url: 'https://api.open-meteo.com/v1/forecast?latitude=30.0&longitude=31.2&current=temperature_2m&forecast_days=1' },
  { id: 'frankfurter', url: 'https://api.frankfurter.dev/v1/latest?base=USD' },
  { id: 'coingecko', url: 'https://api.coingecko.com/api/v3/ping' },
  { id: 'mymemory', url: 'https://api.mymemory.translated.net/get?q=hello&langpair=en%7Car' },
  { id: 'actualwinnings', url: 'https://actualwinnings.com/data/jackpots.json' },
  { id: 'er-api', url: 'https://open.er-api.com/v6/latest/USD' },
  { id: 'rss2json', url: 'https://api.rss2json.com/v1/api.json?count=1&rss_url=https://news.google.com/rss' },
  { id: 'restcountries', url: 'https://restcountries.com/v3.1/all?fields=name' },
];

const CATALOG: FreeApiEntry[] = [
  // ---------------------------------------------------------------- sports
  {
    id: 'espn-hidden',
    name: 'ESPN Hidden APIs',
    category: 'sports',
    website: 'https://www.espn.com',
    endpoint: 'https://site.api.espn.com',
    auth: 'keyless',
    quota: 'unofficial public JSON (rate-sensitive)',
    wired: 'fixture ingest, live commentary, results index',
    notes: 'scoreboard / teams / commentary feeds used server-side',
  },
  {
    id: 'fixturedownload',
    name: 'FixtureDownload',
    category: 'sports',
    website: 'https://fixturedownload.com',
    endpoint: 'https://fixturedownload.com/feed/json',
    auth: 'keyless',
    quota: 'free JSON feeds (PL, UCL, +20 leagues)',
    wired: 'daily fixture ingest (every 6h → daily_fixtures)',
  },
  {
    id: 'thesportsdb',
    name: 'TheSportsDB',
    category: 'sports',
    website: 'https://www.thesportsdb.com',
    endpoint: 'https://www.thesportsdb.com/api/v1/json/3',
    auth: 'keyless',
    quota: 'free TEST key "3": events, tables, badges, media',
    wired: '',
    notes: '100k+ events, club logos and league tables',
  },
  {
    id: 'api-sports',
    name: 'API-Sports (API-Football / NBA / F1 …)',
    category: 'sports',
    website: 'https://www.api-sports.io',
    endpoint: 'https://v3.football.api-sports.io',
    auth: 'env',
    envKey: 'API_SPORTS_KEY',
    quota: '100 req/day free, no card, 30+ sports',
    wired: '',
  },
  {
    id: 'football-data',
    name: 'football-data.org',
    category: 'sports',
    website: 'https://www.football-data.org',
    endpoint: 'https://api.football-data.org/v4',
    auth: 'env',
    envKey: 'FOOTBALL_DATA_KEY',
    quota: '100 req/day, 10 req/min free',
    wired: '',
  },

  // ------------------------------------------------------------------ odds
  {
    id: 'the-odds-api',
    name: 'The Odds API',
    category: 'odds',
    website: 'https://the-odds-api.com',
    endpoint: 'https://api.the-odds-api.com/v4',
    auth: 'env',
    envKey: 'ODDS_API_KEY',
    quota: '500 credits/mo free, no card (30+ sports, 40+ books)',
    wired: '',
  },
  {
    id: 'oddspapi',
    name: 'OddsPapi',
    category: 'odds',
    website: 'https://oddspapi.io',
    endpoint: 'https://api.oddspapi.io',
    auth: 'env',
    envKey: 'ODDS_PAPI_KEY',
    quota: '250 req/mo free (350+ bookmakers, closing lines)',
    wired: '',
  },
  {
    id: 'sharpsapi',
    name: 'SharpAPI',
    category: 'odds',
    website: 'https://sharpapi.io',
    endpoint: 'https://sharpapi.io',
    auth: 'env',
    envKey: 'SHARPS_API_KEY',
    quota: '12 req/min free tier',
    wired: '',
    notes: 'API host documented on the site',
  },
  {
    id: 'parlayapi',
    name: 'ParlayAPI',
    category: 'odds',
    website: 'https://parlay-api.com',
    endpoint: 'https://parlay-api.com',
    auth: 'env',
    envKey: 'PARLAY_API_KEY',
    quota: '1000 credits/mo free (spreads, totals)',
    wired: '',
  },
  {
    id: 'propline',
    name: 'PropLine',
    category: 'odds',
    website: 'https://prop-line.com',
    endpoint: 'https://api.prop-line.com/v1',
    auth: 'env',
    envKey: 'PROPLINE_KEY',
    quota: '1000 req/day demo tier (demo key in docs)',
    wired: '',
  },
  {
    id: 'sportsgameodds',
    name: 'SportsGameOdds',
    category: 'odds',
    website: 'https://sportsgameodds.com',
    endpoint: 'https://sportsgameodds.com',
    auth: 'env',
    envKey: 'SGO_KEY',
    quota: '2500 objects/mo free (AI-derived lines)',
    wired: '',
  },

  // ------------------------------------------------------------------ news
  {
    id: 'newsapi',
    name: 'NewsAPI.org',
    category: 'news',
    website: 'https://newsapi.org',
    endpoint: 'https://newsapi.org/v2',
    auth: 'env',
    envKey: 'NEWSAPI_KEY',
    quota: '100 req/day dev tier',
    wired: '',
  },
  {
    id: 'gnews',
    name: 'GNews',
    category: 'news',
    website: 'https://gnews.io',
    endpoint: 'https://gnews.io/api/v4',
    auth: 'env',
    envKey: 'GNEWS_KEY',
    quota: '100 req/day free',
    wired: '',
  },
  {
    id: 'newsdata',
    name: 'NewsData.io',
    category: 'news',
    website: 'https://newsdata.io',
    endpoint: 'https://newsdata.io/api/1',
    auth: 'env',
    envKey: 'NEWSDATA_KEY',
    quota: '200 credits/day, lifetime free plan',
    wired: '',
  },
  {
    id: 'currents',
    name: 'Currents API',
    category: 'news',
    website: 'https://currentsapi.services',
    endpoint: 'https://api.currentsapi.services/v1',
    auth: 'env',
    envKey: 'CURRENTS_KEY',
    quota: '100 req/day free',
    wired: '',
  },
  {
    id: 'mediastack',
    name: 'mediastack',
    category: 'news',
    website: 'https://mediastack.com',
    endpoint: 'http://api.mediastack.com/v1',
    auth: 'env',
    envKey: 'MEDIASTACK_KEY',
    quota: '100 req/mo free plan',
    wired: '',
  },
  {
    id: 'eventregistry',
    name: 'EventRegistry (newsapi.ai)',
    category: 'news',
    website: 'https://newsapi.ai',
    endpoint: 'https://eventregistry.org/api/v1',
    auth: 'env',
    envKey: 'EVENTREGISTRY_KEY',
    quota: '2000 one-time free searches',
    wired: '',
  },
  {
    id: 'google-news-rss',
    name: 'Google News RSS',
    category: 'news',
    website: 'https://news.google.com',
    endpoint: 'https://news.google.com/rss',
    auth: 'keyless',
    quota: 'keyless RSS per ToS (use rss2json below for JSON)',
    wired: '',
    notes: 'ar/en feeds available; needs RSS→JSON conversion',
  },
  {
    id: 'ursy',
    name: 'URSY.NEWS',
    category: 'news',
    website: 'https://ursy.news',
    endpoint: 'https://ursy.news/api/v2',
    auth: 'keyless',
    quota: 'keyless, 18 publisher feeds',
    wired: '',
    notes: 'attribution required',
  },

  // ------------------------------------------------------------------- llm
  {
    id: 'openrouter',
    name: 'OpenRouter',
    category: 'llm',
    website: 'https://openrouter.ai',
    endpoint: 'https://openrouter.ai/api/v1',
    auth: 'env',
    envKey: 'OPENROUTER_API_KEY',
    quota: '~20 ":free" models (50–1k req/day) + paid balance',
    wired: 'main AI chain with automatic ":free" model retry on 402',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    category: 'llm',
    website: 'https://aistudio.google.com',
    endpoint: 'https://generativelanguage.googleapis.com',
    auth: 'env',
    envKey: 'GEMINI_API_KEY',
    quota: 'free tier ~1500 req/day (Flash models)',
    wired: 'AI chain + match analysis (needs a real key)',
  },
  {
    id: 'groq',
    name: 'Groq',
    category: 'llm',
    website: 'https://console.groq.com',
    endpoint: 'https://api.groq.com/openai/v1',
    auth: 'env',
    envKey: 'GROQ_API_KEY',
    quota: 'free: 30 RPM / ~14k req/day (phone verify)',
    wired: 'AI chain failover (Llama-3.3-70B)',
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    category: 'llm',
    website: 'https://cloud.cerebras.ai',
    endpoint: 'https://api.cerebras.ai/v1',
    auth: 'env',
    envKey: 'CEREBRAS_API_KEY',
    quota: 'free ~1M tokens/day',
    wired: 'AI chain failover (Llama-3.3-70B)',
  },
  {
    id: 'mistral',
    name: 'Mistral',
    category: 'llm',
    website: 'https://console.mistral.ai',
    endpoint: 'https://api.mistral.ai/v1',
    auth: 'env',
    envKey: 'MISTRAL_API_KEY',
    quota: 'Experiment tier ~1B tok/mo (phone verify)',
    wired: 'AI chain failover (mistral-small)',
  },
  {
    id: 'zai',
    name: 'Z.ai GLM',
    category: 'llm',
    website: 'https://z.ai',
    endpoint: 'https://api.z.ai/api/paas/v4',
    auth: 'env',
    envKey: 'ZAI_API_KEY',
    quota: 'GLM flash models $0 permanent free',
    wired: 'AI chain failover (glm flash)',
  },
  {
    id: 'pollinations-text',
    name: 'Pollinations Text',
    category: 'llm',
    website: 'https://pollinations.ai',
    endpoint: 'https://text.pollinations.ai',
    auth: 'keyless',
    quota: 'anonymous keyless chat, 1 req/30s',
    wired: 'last-resort provider of the AI chain',
    notes: 'must be called WITHOUT an Authorization header',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    category: 'llm',
    website: 'https://platform.openai.com',
    endpoint: 'https://api.openai.com/v1',
    auth: 'env',
    envKey: 'OPENAI_API_KEY',
    quota: 'pay-as-you-go (no free credit anymore)',
    wired: 'AI chain (current key has zero balance)',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    category: 'llm',
    website: 'https://platform.deepseek.com',
    endpoint: 'https://api.deepseek.com/v1',
    auth: 'env',
    envKey: 'DEEPSEEK_API_KEY',
    quota: 'new accounts ~5M free tokens, then prepaid',
    wired: 'AI chain (current key has zero balance)',
  },
  {
    id: 'cloudflare-ai',
    name: 'Cloudflare Workers AI',
    category: 'llm',
    website: 'https://developers.cloudflare.com/workers-ai/',
    endpoint: 'https://api.cloudflare.com/client/v4',
    auth: 'env',
    envKey: 'CLOUDFLARE_API_TOKEN',
    quota: '10k neurons/day free',
    wired: '',
  },
  {
    id: 'huggingface',
    name: 'Hugging Face Inference',
    category: 'llm',
    website: 'https://huggingface.co',
    endpoint: 'https://huggingface.co',
    auth: 'env',
    envKey: 'HF_TOKEN',
    quota: 'rate-limited free serverless (OpenAI-compatible router)',
    wired: '',
  },

  // ----------------------------------------------------------------- image
  {
    id: 'pollinations-image',
    name: 'Pollinations Image',
    category: 'image',
    website: 'https://pollinations.ai',
    endpoint: 'https://image.pollinations.ai',
    auth: 'keyless',
    quota: 'anonymous AI images, 1 req/45s',
    wired: 'imageFetcher last-resort fallback (when Bing/Google find nothing)',
  },
  {
    id: 'unsplash',
    name: 'Unsplash',
    category: 'image',
    website: 'https://unsplash.com',
    endpoint: 'https://api.unsplash.com',
    auth: 'env',
    envKey: 'UNSPLASH_KEY',
    quota: '50 req/hr demo tier (hotlink counts a view)',
    wired: '',
  },
  {
    id: 'pexels',
    name: 'Pexels',
    category: 'image',
    website: 'https://www.pexels.com',
    endpoint: 'https://api.pexels.com',
    auth: 'env',
    envKey: 'PEXELS_KEY',
    quota: '200 req/hr free',
    wired: '',
  },
  {
    id: 'dicebear',
    name: 'DiceBear Avatars',
    category: 'image',
    website: 'https://www.dicebear.com',
    endpoint: 'https://api.dicebear.com/9.x',
    auth: 'keyless',
    quota: 'free SVG/PNG avatars, no quota',
    wired: '',
  },

  // --------------------------------------------------------------- weather
  {
    id: 'open-meteo',
    name: 'Open-Meteo',
    category: 'weather',
    website: 'https://open-meteo.com',
    endpoint: 'https://api.open-meteo.com/v1',
    auth: 'keyless',
    quota: 'no key, no quota (non-commercial)',
    wired: '',
    notes: 'could enrich forecast/news posts with match-time weather',
  },
  {
    id: 'weatherapi',
    name: 'WeatherAPI.com',
    category: 'weather',
    website: 'https://www.weatherapi.com',
    endpoint: 'https://api.weatherapi.com/v1',
    auth: 'env',
    envKey: 'WEATHERAPI_KEY',
    quota: '1M calls/mo free',
    wired: '',
  },

  // --------------------------------------------------------------- finance
  {
    id: 'frankfurter',
    name: 'Frankfurter (ECB rates)',
    category: 'finance',
    website: 'https://frankfurter.dev',
    endpoint: 'https://api.frankfurter.dev/v1',
    auth: 'keyless',
    quota: 'free, no key (ECB reference rates, daily)',
    wired: '',
  },
  {
    id: 'er-api',
    name: 'ExchangeRate-API (open)',
    category: 'finance',
    website: 'https://www.exchangerate-api.com',
    endpoint: 'https://open.er-api.com/v6',
    auth: 'keyless',
    quota: 'free open endpoint, updated daily',
    wired: '',
  },
  {
    id: 'coingecko',
    name: 'CoinGecko',
    category: 'finance',
    website: 'https://www.coingecko.com',
    endpoint: 'https://api.coingecko.com/api/v3',
    auth: 'keyless',
    quota: 'public demo ~30 req/min',
    wired: '',
  },
  {
    id: 'binance',
    name: 'Binance public market data',
    category: 'finance',
    website: 'https://www.binance.com',
    endpoint: 'https://api.binance.com/api/v3',
    auth: 'keyless',
    quota: 'free public market data (1200 weight/min)',
    wired: '',
  },

  // ------------------------------------------------------------------- geo
  {
    id: 'ip-api',
    name: 'ip-api',
    category: 'geo',
    website: 'http://ip-api.com',
    endpoint: 'http://ip-api.com/json',
    auth: 'keyless',
    quota: 'free 45 req/min (non-commercial, HTTP only)',
    wired: 'geoLocale detection (language/currency by IP)',
  },
  {
    id: 'ipapi-co',
    name: 'ipapi.co',
    category: 'geo',
    website: 'https://ipapi.co',
    endpoint: 'https://ipapi.co',
    auth: 'keyless',
    quota: '1000 req/day free',
    wired: '',
  },

  // ----------------------------------------------------------- translation
  {
    id: 'mymemory',
    name: 'MyMemory',
    category: 'translation',
    website: 'https://mymemory.translated.net',
    endpoint: 'https://api.mymemory.translated.net/get',
    auth: 'keyless',
    quota: '5000 chars/day free',
    wired: '',
  },
  {
    id: 'libretranslate',
    name: 'LibreTranslate',
    category: 'translation',
    website: 'https://libretranslate.com',
    endpoint: 'https://libretranslate.com/translate',
    auth: 'keyless',
    quota: 'public instance rate-limited (or self-host free)',
    wired: '',
  },
  {
    id: 'google-translate-unofficial',
    name: 'Google Translate (unofficial)',
    category: 'translation',
    website: 'https://translate.google.com',
    endpoint: 'https://translate.googleapis.com/translate_a/single',
    auth: 'keyless',
    quota: 'free, no key (unofficial, rate-sensitive)',
    wired: '',
  },

  // --------------------------------------------------------------- lottery
  {
    id: 'drawanalytics',
    name: 'Draw Analytics',
    category: 'lottery',
    website: 'https://www.drawanalytics.com',
    endpoint: 'https://www.drawanalytics.com/api/v1',
    auth: 'keyless',
    quota: '60 req/min free — US state draws/results',
    wired: '',
    notes: 'attribution required (46 states)',
  },
  {
    id: 'actualwinnings',
    name: 'ActualWinnings data API',
    category: 'lottery',
    website: 'https://actualwinnings.com',
    endpoint: 'https://actualwinnings.com/data',
    auth: 'keyless',
    quota: 'keyless JSON jackpots + results (14 games)',
    wired: '',
    notes: 'attribution required; /data/index.json lists feeds',
  },
  {
    id: 'lotteryatlas',
    name: 'LotteryAtlas data',
    category: 'lottery',
    website: 'https://lotteryatlas.com',
    endpoint: 'https://lotteryatlas.com/data',
    auth: 'keyless',
    quota: 'CC-BY CSVs — ~320 games, historical results',
    wired: '',
  },

  // --------------------------------------------------------------- utility
  {
    id: 'rss2json',
    name: 'RSS2JSON',
    category: 'utility',
    website: 'https://rss2json.com',
    endpoint: 'https://api.rss2json.com/v1/api.json',
    auth: 'keyless',
    quota: 'keyless free tier (RSS → JSON, daily limits)',
    wired: '',
  },
  {
    id: 'allorigins',
    name: 'AllOrigins CORS proxy',
    category: 'utility',
    website: 'https://allorigins.win',
    endpoint: 'https://api.allorigins.win',
    auth: 'keyless',
    quota: 'free CORS proxy (raw + get)',
    wired: '',
  },
  {
    id: 'corsproxy-io',
    name: 'corsproxy.io',
    category: 'utility',
    website: 'https://corsproxy.io',
    endpoint: 'https://corsproxy.io',
    auth: 'keyless',
    quota: 'free CORS proxy (daily quota)',
    wired: '',
  },
  {
    id: 'jina-reader',
    name: 'Jina Reader',
    category: 'utility',
    website: 'https://jina.ai',
    endpoint: 'https://r.jina.ai',
    auth: 'keyless',
    quota: 'free keyless URL → markdown (rate-limited)',
    wired: '',
  },
  {
    id: 'restcountries',
    name: 'REST Countries',
    category: 'utility',
    website: 'https://restcountries.com',
    endpoint: 'https://restcountries.com/v3.1',
    auth: 'keyless',
    quota: 'free country info/flags, no quota',
    wired: '',
  },
  {
    id: 'unavatar',
    name: 'Unavatar',
    category: 'utility',
    website: 'https://unavatar.io',
    endpoint: 'https://unavatar.io',
    auth: 'keyless',
    quota: 'free avatar lookup (rate-limited)',
    wired: '',
  },
  {
    id: 'quickchart',
    name: 'QuickChart QR / Charts',
    category: 'utility',
    website: 'https://quickchart.io',
    endpoint: 'https://quickchart.io/qr',
    auth: 'keyless',
    quota: 'free chart & QR image URLs (rate-limited)',
    wired: '',
  },
];
