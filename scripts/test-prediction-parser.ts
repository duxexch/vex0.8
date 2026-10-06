// Unit tests for server/predictionParser.ts — run: npx tsx scripts/test-prediction-parser.ts
import {
  extractTeams,
  extractPredictionSync,
  extractPrediction,
  isLikelyMatchAnalysis,
  verdictFor,
  buildResultSuffix,
  buildCompactText,
  buildCompactTitle,
  normalizeTeam,
} from '../server/predictionParser';

const results: Array<[string, boolean, string]> = [];
const check = (name: string, cond: boolean, extra = '') => {
  results.push([name, !!cond, extra]);
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' | ' + extra.slice(0, 160) : ''));
};

const ODDS_POST = [
  'تحليل ريال مدريد - برشلونة | الدوري الإسباني',
  '',
  '📊 الإحصائيات: آخر 5 مباريات ريال مدريد 3 انتصارات.',
  '',
  '💰 الاحتمالات:',
  '• فوز ريال مدريد: 1.65-1.85',
  '• تعادل: 3.40-3.80',
  '• فوز برشلونة: 4.20-5.50',
  '',
  '🎯 التوقع: ريال مدريد فوز (2-1)',
  '',
  '⚠️ التوقعات اجتهاد شخصي — ليست نصيحة مالية. 18+',
].join('\n');

const EXPLICIT_POST = [
  'الأهلي - الزمالك',
  'فوز الأهلي: 55%',
  'فوز الزمالك: 45%',
  'التوقع: الأهلي (3-1)',
].join('\n');

const AI_POST = [
  'تحليل مباراة ليفربول vs باريس سان جيرمان',
  'توقعات لمباراة الليلة في دوري أبطال أوروبا',
].join('\n');

const PROMO_POST = [
  'عرض ترحيبي في ميلبيت! بونص 100% على أول إيداع',
  'كود: ml_3154096 — سجل الآن واستمتع بالأرباح',
].join('\n');

const SCORE_LINE_POST = 'Manchester City 2 - 1 Arsenal\nتحليل سريع للمباراة والتوقعات';

// 1. Teams
let t = extractTeams(ODDS_POST);
check('teams odds-post', t?.homeTeam === 'ريال مدريد' && t?.awayTeam === 'برشلونة', JSON.stringify(t));
t = extractTeams(EXPLICIT_POST);
check('teams explicit-post', t?.homeTeam === 'الأهلي' && t?.awayTeam === 'الزمالك', JSON.stringify(t));
t = extractTeams(AI_POST);
check('teams ai-post (vs + leading keyword stripped)', t?.homeTeam === 'ليفربول' && t?.awayTeam === 'باريس سان جيرمان', JSON.stringify(t));
t = extractTeams(SCORE_LINE_POST);
check('teams score-line (en)', t?.homeTeam === 'Manchester City' && t?.awayTeam === 'Arsenal', JSON.stringify(t));

// 2. Analysis gate
check('promo is NOT analysis', isLikelyMatchAnalysis(PROMO_POST, extractTeams(PROMO_POST)) === false);

// 3. Odds cascade
let p = extractPredictionSync(ODDS_POST);
check('odds post detected', !!p, JSON.stringify(p));
check('odds source', p?.pctSource === 'odds', p?.pctSource);
check('odds pair sums 100', !!p && p.pHome + p.pAway === 100, p && `${p.pHome}/${p.pAway}`);
check('odds home favored (lower odds -> higher %)', !!p && p.pHome > p.pAway, p && `${p.pHome}`);
check('odds predicted score 2-1', p?.predictedScore === '2-1', p?.predictedScore);

// 4. Explicit percentages
p = extractPredictionSync(EXPLICIT_POST);
check('explicit source', p?.pctSource === 'explicit', p?.pctSource);
check('explicit 55/45', !!p && p.pHome === 55 && p.pAway === 45, p && `${p.pHome}/${p.pAway}`);
check('explicit score 3-1', p?.predictedScore === '3-1', p?.predictedScore);

// 5. Fallback default (no % / no odds) — sync level
p = extractPredictionSync(AI_POST);
check('ai-post sync defaults to 50/50', p?.pctSource === 'default' && p?.pHome === 50, JSON.stringify(p));

// 6. AI enrichment via injected fn
(async () => {
  const enriched = await extractPrediction(AI_POST, async () => ({ pHome: 70, pAway: 30, predictedScore: '3-1' }));
  check('gemini enrichment applied', enriched?.pctSource === 'ai' && enriched.pHome === 70 && enriched.pAway === 30, JSON.stringify(enriched));
  check('gemini score applied', enriched?.predictedScore === '3-1', enriched?.predictedScore);

  const thrown = await extractPrediction(AI_POST, async () => {
    throw new Error('network down');
  });
  check('gemini failure never blocks', !!thrown && thrown.pctSource === 'default' && thrown.pHome === 50, JSON.stringify(thrown));

  const nullAi = await extractPrediction(AI_POST, async () => null);
  check('gemini null -> default', !!nullAi && nullAi.pctSource === 'default', JSON.stringify(nullAi));

  const promo = await extractPrediction(PROMO_POST, async () => ({ pHome: 99, pAway: 1 }));
  check('promo stays null through full cascade', promo === null, JSON.stringify(promo));

  // 7. Compact builders
  const sample = { homeTeam: 'ريال مدريد', awayTeam: 'برشلونة', pHome: 58, pAway: 42, predictedScore: '2-1', pctSource: 'odds' as const };
  const text = buildCompactText(sample, 'ar');
  check('compact ar: teams', text.includes('ريال مدريد × برشلونة'), text.split('\n')[0]);
  check('compact ar: percents', text.includes('فوز ريال مدريد: 58%') && text.includes('فوز برشلونة: 42%'));
  check('compact ar: score', text.includes('النتيجة المتوقعة: 2-1'));
  check('compact ar: no odds', !text.includes('1.65'));
  const textEn = buildCompactText({ ...sample, homeTeam: 'Real Madrid', awayTeam: 'Barcelona' }, 'en');
  check('compact en: labels', textEn.includes('Real Madrid win: 58%') && textEn.includes('Predicted score: 2-1'), textEn);
  check('compact title ar', buildCompactTitle(sample, 'ar') === 'ريال مدريد × برشلونة', buildCompactTitle(sample, 'ar'));

  // 8. Verdicts
  check('verdict hit', verdictFor(sample, { home: 2, away: 0 }) === 'hit');
  check('verdict miss', verdictFor(sample, { home: 0, away: 3 }) === 'miss');
  check('verdict draw', verdictFor(sample, { home: 1, away: 1 }) === 'draw');

  // 9. Result suffix
  const { verdict, suffix } = buildResultSuffix(sample, { home: 2, away: 1 }, 'ar');
  check('suffix verdict hit', verdict === 'hit');
  check('suffix contains score', suffix.includes('النتيجة: ريال مدريد 2 - 1 برشلونة'), suffix);
  check('suffix contains hit line', suffix.includes('توقعنا تحقق!'), suffix);

  // 10. normalizeTeam
  check('normalizeTeam arabic', normalizeTeam('  الرِّيَالـ مَدْرِيد ') === 'الريال مدريد', normalizeTeam('  الرِّيَالـ مَدْرِيد '));
  check('normalizeTeam english', normalizeTeam('Manchester  City!') === 'manchester city', normalizeTeam('Manchester  City!'));

  // 11. teamsMatch — Arabic script vs latin transliteration (ESPN)
  const { teamsMatch } = await import('../server/predictionParser');
  const matchCases: Array<[string, string, boolean]> = [
    ['الأهلي', 'Al Ahly', true],
    ['الهلال', 'Al Hilal', true],
    ['سندرلاند', 'Sunderland', true],
    ['برايتون هوف ألبيون', 'Brighton and Hove Albion', true],
    ['أرسنال', 'Arsenal', true],
    ['ليدز يونايتد', 'Leeds United', true],
    ['ريال مدريد', 'Real Madrid', true],
    ['مانشستر سيتي', 'Manchester City', true],
    ['الوداد', 'Wydad AC', true],
    ['الترجي', 'Esperance Sportive de Tunis', true],
    ['زد', 'ZED FC', true],
    ['الزمالك', 'Zamalek SC', true],
    ['السد', 'Al Sadd SC', true],
    ['الأهلي', 'Al Hilal', false],
    ['سندرلاند', 'Leeds United', false],
    ['ليفربول', 'Manchester City', false],
    ['برشلونة', 'Al Hilal', false],
  ];
  for (const [x, y, want] of matchCases) {
    const got = teamsMatch(x, y);
    check(`teamsMatch ${x} ~ ${y} = ${want}`, got === want, `got ${got}`);
  }

  const failed = results.filter(([, ok]) => !ok);
  console.log(`\n== test_prediction_parser: ${results.length - failed.length}/${results.length} passed ==`);
  if (failed.length) {
    console.log('FAILED:', failed.map(([n]) => n));
    process.exit(1);
  }
})();
