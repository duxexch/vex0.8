import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SportsMatchFixture, AiMatchAnalysis, Language } from '../types';
import {
  X,
  Bot,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  Share2,
  CheckCircle2,
  Crosshair
} from 'lucide-react';
import { vexApi } from '../services/api';

interface AiMatchAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  fixture: SportsMatchFixture | null;
  analysis: AiMatchAnalysis | null;
  loading: boolean;
  lang: Language;
}

export const AiMatchAnalysisModal: React.FC<AiMatchAnalysisModalProps> = ({
  isOpen,
  onClose,
  fixture,
  analysis,
  loading,
  lang,
}) => {
  const isAr = lang === 'ar';
  const [challengePick, setChallengePick] = useState('');
  const [challenging, setChallenging] = useState(false);
  const [challenged, setChallenged] = useState(false);

  const handleChallenge = async () => {
    if (!challengePick.trim()) return;
    setChallenging(true);
    try {
      await fetch('/api/viral/ai-challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: fixture?.id,
          userPrediction: challengePick,
          aiPrediction: analysis?.predictedScore || '',
          userId: vexApi.getUserId(),
          matchTitle: `${fixture?.homeTeam} vs ${fixture?.awayTeam}`
        })
      });
      setChallenged(true);
    } catch (error) {
      console.error(error);
    } finally {
      setChallenging(false);
    }
  };

  if (!fixture) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="w-full max-w-lg my-auto rounded-2xl border border-slate-200/90 bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {/* Header */}
            <div className="relative px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm font-bold text-slate-900">
                      {isAr ? 'التحليل التكتيكي للذكاء الاصطناعي' : 'Tactical AI Analysis'}
                    </h2>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                      Gemini
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {fixture.league} • {fixture.kickoffTime}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Teams Matchup Header */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
                {/* Home Team */}
                <div className="flex-1 flex flex-col items-center text-center">
                  <img
                    src={fixture.homeLogo}
                    alt={fixture.homeTeam}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-xl object-contain border border-slate-200 p-0.5 bg-white mb-1"
                  />
                  <span className="font-bold text-xs text-slate-900 leading-tight">
                    {fixture.homeTeam}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                    ({fixture.odds.home})
                  </span>
                </div>

                {/* Score or VS */}
                <div className="px-3 flex flex-col items-center">
                  {analysis ? (
                    <div className="bg-emerald-600 text-white px-3 py-1 rounded-xl font-black text-base font-mono shadow-xs tracking-wider">
                      {analysis.predictedScore}
                    </div>
                  ) : (
                    <span className="font-black text-xs text-slate-400 bg-slate-200 px-2 py-1 rounded-lg">
                      VS
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500 mt-1 font-bold">
                    {isAr ? 'النتيجة المتوقعة' : 'Predicted'}
                  </span>
                </div>

                {/* Away Team */}
                <div className="flex-1 flex flex-col items-center text-center">
                  <img
                    src={fixture.awayLogo}
                    alt={fixture.awayTeam}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-xl object-contain border border-slate-200 p-0.5 bg-white mb-1"
                  />
                  <span className="font-bold text-xs text-slate-900 leading-tight">
                    {fixture.awayTeam}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                    ({fixture.odds.away})
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2">
                  <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <p className="font-bold text-xs text-slate-600 animate-pulse">
                    {isAr
                      ? 'الوكيل يحلل البيانات التكتيكية ونسب الفوز...'
                      : 'AI agent is evaluating tactical matchup...'}
                  </p>
                </div>
              ) : analysis ? (
                <>
                  {/* Probability Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                      <span>{isAr ? 'احتمالات الفوز والتعادل' : 'Win Probabilities'}</span>
                      <span className="text-emerald-700 flex items-center gap-1 font-mono text-[11px]">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        {analysis.confidenceScore}% {isAr ? 'نسبة الثقة' : 'Confidence'}
                      </span>
                    </div>

                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
                      <div
                        style={{ width: `${analysis.winProbabilities.home}%` }}
                        className="bg-emerald-500 h-full transition-all duration-500"
                        title={`${fixture.homeTeam}: ${analysis.winProbabilities.home}%`}
                      />
                      <div
                        style={{ width: `${analysis.winProbabilities.draw}%` }}
                        className="bg-amber-400 h-full transition-all duration-500"
                        title={`التعادل: ${analysis.winProbabilities.draw}%`}
                      />
                      <div
                        style={{ width: `${analysis.winProbabilities.away}%` }}
                        className="bg-sky-500 h-full transition-all duration-500"
                        title={`${fixture.awayTeam}: ${analysis.winProbabilities.away}%`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mt-1.5 font-mono">
                      <span className="text-emerald-700">
                        {fixture.homeTeam} ({analysis.winProbabilities.home}%)
                      </span>
                      <span className="text-amber-700">
                        {isAr ? 'تعادل' : 'Draw'} ({analysis.winProbabilities.draw}%)
                      </span>
                      <span className="text-sky-700">
                        {fixture.awayTeam} ({analysis.winProbabilities.away}%)
                      </span>
                    </div>
                  </div>

                  {/* Recommended Strategic Pick */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        {isAr ? 'التوقع والتوصية الذكية' : 'AI Recommended Pick'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white font-mono">
                        {analysis.riskLevel === 'low'
                          ? (isAr ? 'مخاطرة منخفضة' : 'Low Risk')
                          : (isAr ? 'مخاطرة متوسطة' : 'Moderate')}
                      </span>
                    </div>
                    <p className="text-xs font-black text-slate-900">
                      {analysis.recommendedPick}
                    </p>
                  </div>

                  {/* Tactical Summary */}
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      {isAr ? 'التقرير التكتيكي للمباراة' : 'Tactical Analysis'}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                      {analysis.tacticalSummary}
                    </p>
                  </div>

                  {/* Key Factors */}
                  {analysis.keyFactors && analysis.keyFactors.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-slate-900">
                        {isAr ? 'العوامل الحاسمة في التحليل:' : 'Key Match Deciders:'}
                      </h4>
                      <div className="space-y-1.5">
                        {analysis.keyFactors.map((factor, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-200"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{factor}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Disclaimer for Responsible Gaming & Store Guidelines */}
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-[11px] text-amber-800">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <span>{analysis.disclaimer}</span>
                  </div>

                  {/* Beat the AI Challenge */}
                  <div className="mt-4 border border-indigo-200 bg-indigo-50 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Crosshair className="w-5 h-5 text-indigo-600" />
                      <h4 className="font-black text-indigo-900 text-sm">
                        {isAr ? 'أتتحدى الذكاء الاصطناعي؟ 🎯' : 'Beat the AI Challenge 🎯'}
                      </h4>
                    </div>
                    {challenged ? (
                      <div className="flex items-center gap-2 text-emerald-700 bg-emerald-100 p-2 rounded-lg text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        {isAr ? 'تم تسجيل التحدي بنجاح!' : 'Challenge registered successfully!'}
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-indigo-700 mb-3">
                          {isAr ? 'أدخل توقعك للنتيجة. إذا تفوقت على توقع الذكاء الاصطناعي، ستحصل على بونص إضافي!' : 'Enter your prediction. If you beat the AI, you get an extra bonus!'}
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={challengePick}
                            onChange={e => setChallengePick(e.target.value)}
                            placeholder={isAr ? 'مثال: فوز أرسنال 2-1' : 'e.g. Arsenal wins 2-1'}
                            className="flex-1 px-3 py-2 text-sm border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            onClick={handleChallenge}
                            disabled={challenging || !challengePick.trim()}
                            className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                          >
                            {challenging ? '...' : (isAr ? 'تحدي' : 'Challenge')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Bottom Actions */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">
                {analysis?.poweredBy || 'Powered by Gemini AI'}
              </span>
              <button
                onClick={onClose}
                className="h-9 px-4 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all shadow-xs"
              >
                {isAr ? 'إغلاق التحليل' : 'Close'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
