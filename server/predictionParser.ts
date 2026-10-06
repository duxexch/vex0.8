// Prediction parser — compacts match-analysis posts into: teams + two win% + predicted score.
// Cascade (never blocks publishing): explicit % -> odds-implied % -> Gemini -> 50/50 fallback.

export interface ParsedPrediction {
  homeTeam: string;
  awayTeam: string;
  pHome: number; // integer 1..99, pHome + pAway === 100
  pAway: number;
  predictedScore: string; // "2-1"
  pctSource: 'explicit' | 'odds' | 'ai' | 'default';
}

export interface ActualScore {
  home: number;
  away: number;
}

export type PredictionVerdict = 'hit' | 'miss' | 'draw';

// Full stored record attached to a SitePost (parsed + settlement lifecycle)
export interface PredictionRecord extends ParsedPrediction {
  status: 'pending' | 'settled';
  createdAt: string;
  actualScore?: string; // "2-1"
  verdict?: PredictionVerdict;
  settledAt?: string;
  settledBy?: 'espn' | 'manual' | string;
}

export type GeminiPredictFn = (
  homeTeam: string,
  awayTeam: string
) => Promise<{ pHome?: number; pAway?: number; predictedScore?: string } | null>;

const LETTER = "[A-Za-z\u0600-\u06FF]";

// ---------------------------------------------------------------- helpers

export function normalizeTeam(value: string): string {
  return String(value || '')
    .replace(/[\u064B-\u0652\u0640]/g, '') // Arabic diacritics + tatweel
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function cleanTeamName(value: string): string {
  return String(value || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu, ' ')
    .replace(/^[#*\-\s:•.()[\]]+/, '')
    .replace(/[*#]+\s*/g, ' ')
    .replace(/[)\]:;.,!?]+$/, '')
    .replace(/^(?:(?:\u062a\u062d\u0644\u064a\u0644|\u0645\u0628\u0627\u0631\u0627\u0629|\u0644\u0642\u0627\u0621|\u0642\u0645\u0629|\u0627\u0644\u062a\u0648\u0642\u0639|\u062a\u0648\u0642\u0639\u0627\u062a|\u0645\u0639\u0627\u064a\u0646\u0629|analysis|match|preview|prediction)\s+)+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isValidTeam(name: string): boolean {
  if (!name || name.length < 2 || name.length > 40) return false;
  const letters = name.match(/[A-Za-z\u0600-\u06FF]/g);
  if (!letters || letters.length < 2) return false;
  if (/^\d+$/.test(name)) return false;
  return true;
}

function roundPair(pHomeRaw: number): { pHome: number; pAway: number } {
  let pHome = Math.round(pHomeRaw);
  if (!Number.isFinite(pHome)) pHome = 50;
  pHome = Math.min(99, Math.max(1, pHome));
  return { pHome, pAway: 100 - pHome };
}

// ---------------------------------------------------------------- teams

function teamPairFromLine(line: string): { homeTeam: string; awayTeam: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  // Score form: "Real Madrid 2 - 1 Real Sociedad" / "ريال مدريد 2:1 برشلونة"
  const scoreForm = new RegExp(
    `(${LETTER}[^0-9\\n:()•#]{1,40}?)\\s*\\d{1,2}\\s*[-\\u2013\\u2014:x\u00d7]\\s*\\d{1,2}\\s+(${LETTER}[^0-9\\n:()•#]{1,40}?)(?=\\s|$)`,
    'i'
  );
  let m = trimmed.match(scoreForm);
  if (m) {
    const homeTeam = cleanTeamName(m[1]);
    const awayTeam = cleanTeamName(m[2]);
    if (isValidTeam(homeTeam) && isValidTeam(awayTeam) && normalizeTeam(homeTeam) !== normalizeTeam(awayTeam)) {
      return { homeTeam, awayTeam };
    }
  }

  // "X vs Y" / "X × Y"
  m = trimmed.match(
    new RegExp(
      `(${LETTER}[\\w\u0600-\u06FF'\\- ]{1,35}?)\\s+(?:vs\\.?|\u00d7)\\s+(${LETTER}[\\w\u0600-\u06FF'\\- ]{1,35})`,
      'i'
    )
  );
  if (m) {
    const homeTeam = cleanTeamName(m[1]);
    const awayTeam = cleanTeamName(m[2]);
    if (isValidTeam(homeTeam) && isValidTeam(awayTeam) && normalizeTeam(homeTeam) !== normalizeTeam(awayTeam)) {
      return { homeTeam, awayTeam };
    }
  }

  // Hyphen/en-dash form: "X - Y" (requires spaces around separator)
  m = trimmed.match(
    new RegExp(
      `(${LETTER}[\\w\u0600-\u06FF'\\- ]{1,35}?)\\s+-\\s+(${LETTER}[\\w\u0600-\u06FF'\\- ]{1,35})`,
      'i'
    )
  );
  if (m) {
    const homeTeam = cleanTeamName(m[1]);
    const awayTeam = cleanTeamName(m[2]);
    if (isValidTeam(homeTeam) && isValidTeam(awayTeam) && normalizeTeam(homeTeam) !== normalizeTeam(awayTeam)) {
      return { homeTeam, awayTeam };
    }
  }

  return null;
}

// Split into logical segments: lines first, then bullet-separated clauses.
// Handles both multi-line posts and legacy posts whose newlines were collapsed at ingest.
function segmentsOf(plain: string): string[] {
  return String(plain || '')
    .split(/\r?\n/)
    .flatMap((line) => line.split(/[•●▪◦∙]\s*/))
    .map((s) => s.trim())
    .filter(Boolean);
}

export function extractTeams(plain: string): { homeTeam: string; awayTeam: string } | null {
  const lines = segmentsOf(plain);
  const candidateLines = [...lines.slice(0, 8), ...lines.filter((l) => /التوقع|توقع|prediction|predicted/i.test(l)).slice(0, 3)];
  for (const line of candidateLines) {
    const pair = teamPairFromLine(line);
    if (pair) return pair;
  }
  return null;
}

// ---------------------------------------------------------------- signals

const ANALYSIS_KEYWORDS =
  /توقع|تحليل|مباراة|الاحتمال|الودز|نسبة|فوز|نصيحة|مُبار|match|predict|analysis|odds|win prob|form\b/i;
const PROMO_ONLY = /بونص|كود خصم|كود الخصم|promo code|deposit bonus|إيداع أول|welcome bonus/i;

export function isLikelyMatchAnalysis(plain: string, teams: { homeTeam: string; awayTeam: string } | null): boolean {
  if (!teams) return false;
  const hasPercent = /\d{1,3}(?:\.\d+)?\s*%/.test(plain);
  const hasOdds = /\b\d{1,2}\.\d{2}\b/.test(plain);
  const hasKeyword = ANALYSIS_KEYWORDS.test(plain);
  const hasPromo = PROMO_ONLY.test(plain);
  if (hasPercent || hasOdds) return true;
  if (hasKeyword && !hasPromo) return true;
  return false;
}

// ---------------------------------------------------------------- level 1: explicit %

function explicitPercentages(plain: string, homeTeam: string, awayTeam: string): { pHome: number; pAway: number } | null {
  const pctIn = (haystack: string): number | null => {
    const m = haystack.match(/(\d{1,3}(?:\.\d+)?)\s*%/);
    if (!m) return null;
    const v = Math.round(parseFloat(m[1]));
    return v >= 1 && v <= 99 ? v : null;
  };

  const lines = segmentsOf(plain);
  const homeNorm = normalizeTeam(homeTeam);
  const awayNorm = normalizeTeam(awayTeam);
  let pHome: number | null = null;
  let pAway: number | null = null;

  for (const line of lines) {
    const norm = normalizeTeam(line);
    const pct = pctIn(line);
    if (pct === null) continue;
    if (pHome === null && homeNorm && norm.includes(homeNorm)) pHome = pct;
    else if (pAway === null && awayNorm && norm.includes(awayNorm)) pAway = pct;
  }

  if (pHome !== null && pAway !== null && pHome + pAway > 0) {
    const total = pHome + pAway;
    return roundPair((pHome / total) * 100);
  }

  // Fallback: exactly two percentages in the post (home listed first in analysis templates)
  const all = [...plain.matchAll(/(\d{1,3}(?:\.\d+)?)\s*%/g)].map((m) => Math.round(parseFloat(m[1])));
  const valid = all.filter((v) => v >= 1 && v <= 99);
  if (valid.length === 2) {
    const [a, b] = valid;
    if (a + b > 0) return roundPair((a / (a + b)) * 100);
  }
  return null;
}

// ---------------------------------------------------------------- level 2: odds implied

function oddsMid(line: string): number | null {
  const m = line.match(/(\d{1,2}\.\d{1,3})(?:\s*-\s*(\d{1,2}\.\d{1,3}))?/);
  if (!m) return null;
  const a = parseFloat(m[1]);
  const b = m[2] ? parseFloat(m[2]) : a;
  if (!(a > 1.01) || !(b > 1.01) || a > 100 || b > 100) return null;
  return (a + b) / 2;
}

function oddsPercentages(plain: string, homeTeam: string, awayTeam: string): { pHome: number; pAway: number } | null {
  const lines = segmentsOf(plain);
  const homeNorm = normalizeTeam(homeTeam);
  const awayNorm = normalizeTeam(awayTeam);

  let homeOdds: number | null = null;
  let awayOdds: number | null = null;
  const winLines: number[] = [];

  for (const line of lines) {
    const mid = oddsMid(line);
    if (mid === null) continue;
    const norm = normalizeTeam(line);
    const isWinLine = /فوز|win/i.test(line);
    if (isWinLine) winLines.push(mid);
    if (homeOdds === null && homeNorm && norm.includes(homeNorm)) homeOdds = mid;
    if (awayOdds === null && awayNorm && norm.includes(awayNorm)) awayOdds = mid;
  }

  // Positional fallback: analysis templates list "فوز {home}" before "فوز {away}"
  if (homeOdds === null && winLines.length >= 2) homeOdds = winLines[0];
  if (awayOdds === null && winLines.length >= 2) awayOdds = winLines[winLines.length - 1];

  if (homeOdds === null || awayOdds === null || homeOdds === awayOdds) return null;
  const ph = 1 / homeOdds;
  const pa = 1 / awayOdds;
  if (!Number.isFinite(ph) || !Number.isFinite(pa) || ph + pa <= 0) return null;
  return roundPair((ph / (ph + pa)) * 100);
}

// ---------------------------------------------------------------- predicted score

function predictedScoreFromText(plain: string): string | null {
  for (const line of segmentsOf(plain)) {
    if (!/التوقع|النتيجة|المتوقع|توقع|predicted|prediction/i.test(line)) continue;
    const matches = [...line.matchAll(/(\d{1,2})\s*[-\u2013\u2014]\s*(\d{1,2})/g)];
    for (const m of matches) {
      const h = parseInt(m[1], 10);
      const a = parseInt(m[2], 10);
      if (h <= 15 && a <= 15) return `${h}-${a}`;
    }
  }
  const paren = plain.match(/\(\s*(\d{1,2})\s*[-\u2013\u2014]\s*(\d{1,2})\s*\)/);
  if (paren) {
    const h = parseInt(paren[1], 10);
    const a = parseInt(paren[2], 10);
    if (h <= 15 && a <= 15) return `${h}-${a}`;
  }
  return null;
}

function normalizeScore(value: string | undefined | null): string | null {
  if (!value) return null;
  const m = String(value).match(/(\d{1,2})\s*[-\u2013\u2014:x\u00d7]\s*(\d{1,2})/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const a = parseInt(m[2], 10);
  if (h > 15 || a > 15) return null;
  return `${h}-${a}`;
}

// ---------------------------------------------------------------- cascade

export function extractPredictionSync(plain: string): ParsedPrediction | null {
  const teams = extractTeams(plain);
  if (!isLikelyMatchAnalysis(plain, teams)) return null;
  if (!teams) return null;
  const { homeTeam, awayTeam } = teams;

  const score = predictedScoreFromText(plain) || '1-1';

  const explicit = explicitPercentages(plain, homeTeam, awayTeam);
  if (explicit) {
    return { homeTeam, awayTeam, pHome: explicit.pHome, pAway: explicit.pAway, predictedScore: score, pctSource: 'explicit' };
  }

  const odds = oddsPercentages(plain, homeTeam, awayTeam);
  if (odds) {
    return { homeTeam, awayTeam, pHome: odds.pHome, pAway: odds.pAway, predictedScore: score, pctSource: 'odds' };
  }

  return { homeTeam, awayTeam, pHome: 50, pAway: 50, predictedScore: score, pctSource: 'default' };
}

export async function extractPrediction(
  plain: string,
  geminiFn?: GeminiPredictFn
): Promise<ParsedPrediction | null> {
  const teams = extractTeams(plain);
  if (!teams || !isLikelyMatchAnalysis(plain, teams)) return null;

  const sync = extractPredictionSync(plain);
  if (!sync) return null;

  // Levels 1/2 already produced real numbers
  if (sync.pctSource === 'explicit' || sync.pctSource === 'odds') return sync;

  // Level 3: AI enrichment (best effort — any failure keeps the fallback)
  if (geminiFn) {
    try {
      const ai = await geminiFn(sync.homeTeam, sync.awayTeam);
      if (ai) {
        let pHome = Number(ai.pHome);
        let pAway = Number(ai.pAway);
        if (Number.isFinite(pHome) && Number.isFinite(pAway) && pHome >= 0 && pAway >= 0 && pHome + pAway > 0) {
          const pair = roundPair((pHome / (pHome + pAway)) * 100);
          return {
            ...sync,
            pHome: pair.pHome,
            pAway: pair.pAway,
            predictedScore: normalizeScore(ai.predictedScore) || sync.predictedScore,
            pctSource: 'ai',
          };
        }
      }
    } catch {
      // fall through to default
    }
  }

  return sync; // pctSource: 'default' (50/50 + 1-1)
}

// ---------------------------------------------------------------- post builders

export function buildCompactTitle(p: ParsedPrediction, lang: 'ar' | 'en' = 'ar'): string {
  return lang === 'en' ? `${p.homeTeam} vs ${p.awayTeam}` : `${p.homeTeam} \u00d7 ${p.awayTeam}`;
}

export function buildCompactText(p: ParsedPrediction, lang: 'ar' | 'en' = 'ar'): string {
  if (lang === 'en') {
    return [
      `\u26bd ${p.homeTeam} vs ${p.awayTeam}`,
      `\U0001F7E2 ${p.homeTeam} win: ${p.pHome}%`,
      `\U0001F535 ${p.awayTeam} win: ${p.pAway}%`,
      `\U0001F3AF Predicted score: ${p.predictedScore}`,
    ].join('\n');
  }
  return [
    `\u26bd ${p.homeTeam} \u00d7 ${p.awayTeam}`,
    `\U0001F7E2 فوز ${p.homeTeam}: ${p.pHome}%`,
    `\U0001F535 فوز ${p.awayTeam}: ${p.pAway}%`,
    `\U0001F3AF النتيجة المتوقعة: ${p.predictedScore}`,
  ].join('\n');
}

export function verdictFor(p: ParsedPrediction, actual: ActualScore): PredictionVerdict {
  const predictedWinner =
    p.pHome > p.pAway ? 'home' : p.pAway > p.pHome ? 'away' : null;
  if (actual.home === actual.away) return 'draw';
  const actualWinner = actual.home > actual.away ? 'home' : 'away';
  if (predictedWinner === null) return 'draw';
  return predictedWinner === actualWinner ? 'hit' : 'miss';
}

export function buildResultSuffix(
  p: ParsedPrediction,
  actual: ActualScore,
  lang: 'ar' | 'en' = 'ar'
): { verdict: PredictionVerdict; suffix: string } {
  const verdict = verdictFor(p, actual);
  const score = `${actual.home} - ${actual.away}`;
  if (lang === 'en') {
    const verdictLine =
      verdict === 'hit' ? '\u2705 Prediction hit!' : verdict === 'miss' ? '\u274C Prediction missed' : '\u2796 Draw';
    return { verdict, suffix: `\n\n\u2705 Result: ${p.homeTeam} ${score} ${p.awayTeam}\n${verdictLine}` };
  }
  const verdictLine =
    verdict === 'hit' ? '\uD83C\uDFAF توقعنا تحقق!' : verdict === 'miss' ? '\u274C لم يتحقق التوقع' : '\u2796 تعادل';
  return { verdict, suffix: `\n\n\u2705 النتيجة: ${p.homeTeam} ${score} ${p.awayTeam}\n${verdictLine}` };
}
