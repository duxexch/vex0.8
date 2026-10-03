import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UnluckyBetPost, Language } from '../types';
import {
  Flame,
  Share2,
  AlertTriangle,
  PlusCircle,
  X,
  CheckCircle2,
  Building2,
  Sparkles,
  Ticket,
  Clock,
  Heart,
  TrendingDown,
} from 'lucide-react';
import { vexApi } from '../services/api';

interface UnluckyWallTabProps {
  lang: Language;
  onCopyToast?: (msg?: string) => void;
}

export const UnluckyWallTab: React.FC<UnluckyWallTabProps> = ({ lang, onCopyToast }) => {
  const isAr = lang === 'ar';
  const [posts, setPosts] = useState<UnluckyBetPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [votedPosts, setVotedPosts] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('vex_unlucky_votes');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Modal State for Submitting New Slip
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [companyName, setCompanyName] = useState('1XBET');
  const [betSlipId, setBetSlipId] = useState('');
  const [lossAmount, setLossAmount] = useState('');
  const [lostBy, setLostBy] = useState('');
  const [story, setStory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchPosts = () => {
    fetch('/api/viral/unlucky-bets')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const list = data.posts || data.bets || [];
          setPosts(list);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleVote = async (postId: string) => {
    if (votedPosts.includes(postId)) return;

    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, votes: (p.votes || 0) + 1 } : p))
    );

    const newVoted = [...votedPosts, postId];
    setVotedPosts(newVoted);
    try {
      localStorage.setItem('vex_unlucky_votes', JSON.stringify(newVoted));
    } catch {}

    try {
      const res = await fetch(`/api/viral/unlucky-bets/${postId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success && data.posts) {
        setPosts(data.posts);
      }
    } catch (e) {
      console.error('Vote failed:', e);
    }
  };

  const handleShare = async (post: UnluckyBetPost) => {
    const shareText = isAr
      ? `شاهد أسوأ خسارة في الثواني الأخيرة لدى ${post.companyName} بمبلغ $${post.amount || (post as any).lossAmount}! "${post.storyAr || (post as any).story}"`
      : `Check out this crazy last-minute loss on ${post.companyName} of $${post.amount || (post as any).lossAmount}! "${post.storyAr || (post as any).story}"`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: isAr ? 'مجتمع المنحوسين - VEX Deals' : 'Unlucky Wall - VEX Deals',
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    navigator.clipboard.writeText(shareText);
    if (onCopyToast) {
      onCopyToast(isAr ? 'تم نسخ قصة الخسارة للمشاركة!' : 'Slip story copied to clipboard!');
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lossAmount || isNaN(Number(lossAmount)) || Number(lossAmount) <= 0) {
      setSubmitError(isAr ? 'يرجى إدخال مبلغ الخسارة بشكل صحيح.' : 'Please enter a valid loss amount.');
      return;
    }
    if (!story.trim()) {
      setSubmitError(isAr ? 'يرجى كتابة تفاصيل ما حدث معك.' : 'Please explain what happened.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/viral/unlucky-bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: vexApi.getUserId(),
          userName: isAr ? 'مستخدم VEX' : 'VEX Bettor',
          companyName,
          betSlipId: betSlipId.trim() || `SLIP-${Date.now().toString(36).toUpperCase()}`,
          amount: Number(lossAmount),
          lossAmount: Number(lossAmount),
          lostBy: lostBy.trim() || (isAr ? 'في الثواني الأخيرة' : 'Last minute turn'),
          story: story.trim(),
          storyAr: story.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitSuccess(true);
        if (data.posts) {
          setPosts(data.posts);
        } else {
          fetchPosts();
        }
        setTimeout(() => {
          setIsSubmitModalOpen(false);
          setSubmitSuccess(false);
          setLossAmount('');
          setBetSlipId('');
          setLostBy('');
          setStory('');
        }, 1500);
      } else {
        setSubmitError(data.error || (isAr ? 'فشل إضافة القسيمة' : 'Failed to publish slip'));
      }
    } catch (err: any) {
      setSubmitError(err.message || (isAr ? 'حدث خطأ في الاتصال' : 'Connection error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 select-none" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Hero Banner with Action Button */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-lg overflow-hidden relative border border-slate-800">
        <div className="absolute top-0 right-0 w-36 h-36 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-rose-500/20 p-3 rounded-2xl border border-rose-500/30 shrink-0">
              <TrendingDown className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  {isAr ? 'مجتمع المنحوسين الرياضي 😭' : 'Unlucky Bets Wall 😭'}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {isAr ? 'تعويض مجاني للأعلى تصويتاً' : 'Most Upvoted Gets Compensated'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                {isAr
                  ? 'شارك أسوأ سيناريوهات الخسارة في الثواني الأخيرة! القسائم الأكثر تعاطفاً وتصويتاً من المجتمع يتم تعويض خسارتها مباشرة بنسبة 100%.'
                  : 'Share your most heartbreaking last-minute bet slips! The highest voted stories get their losses fully compensated.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSubmitModalOpen(true)}
            className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-rose-600/30 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isAr ? 'شارك قسيمتك المنحوسة' : 'Post Your Slip'}</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-3 animate-pulse"
            >
              <div className="flex justify-between items-center">
                <div className="h-4 w-32 bg-slate-200 rounded" />
                <div className="h-5 w-20 bg-slate-200 rounded" />
              </div>
              <div className="h-3 w-3/4 bg-slate-100 rounded" />
              <div className="h-3 w-1/2 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        /* Posts List */
        <div className="grid gap-3.5">
          {posts.map((post, idx) => {
            const hasVoted = votedPosts.includes(post.id);
            const lossVal = post.amount || (post as any).lossAmount || 0;
            const storyText = post.storyAr || (post as any).story || '';
            const reason = post.lostBy || (isAr ? 'في الثواني الأخيرة' : 'Last minute loss');

            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between gap-3.5"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-extrabold text-slate-900">
                        {post.userName || (isAr ? 'مستخدم VEX' : 'Bettor')}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                        {post.companyName || '1XBET'}
                      </span>
                      <span className="text-slate-400 text-[11px] tabular-nums">
                        • {new Date(post.timestamp).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black font-mono tabular-nums bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
                        {isAr ? 'خسارة:' : 'Loss:'} ${Number(lossVal).toLocaleString('en-US')}
                      </span>
                    </div>
                  </div>

                  {/* Lost By Tag */}
                  <div className="mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/70">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <span>{reason}</span>
                    </span>
                  </div>

                  {/* Story */}
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50/60 p-3 rounded-xl border border-slate-100 italic">
                    "{storyText}"
                  </p>
                </div>

                {/* Card Footer: Vote and Share */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleVote(post.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 ${
                      hasVoted
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200'
                    }`}
                    title={isAr ? 'تعاطف وصوت لتعويض هذه القسيمة' : 'Upvote for compensation'}
                  >
                    <Flame
                      className={`w-4 h-4 ${
                        hasVoted ? 'text-white' : 'text-slate-500 group-hover:text-rose-600'
                      }`}
                    />
                    <span className="tabular-nums font-mono">{post.votes || 0}</span>
                    <span>{isAr ? 'صوت تعاطف' : 'Votes'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShare(post)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{isAr ? 'مشاركة' : 'Share'}</span>
                  </button>
                </div>
              </motion.div>
            );
          })}

          {posts.length === 0 && (
            <div className="text-center py-12 text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="font-bold text-sm text-slate-800">
                {isAr ? 'لا توجد قسائم منحوسة بعد!' : 'No unlucky slips shared yet!'}
              </p>
              <p className="text-slate-400 max-w-sm mx-auto">
                {isAr
                  ? 'كن أول من يشارك قصة خسارته غير المتوقعة وادخل المنافسة على التعويض المجاني.'
                  : 'Be the first to share your unlucky betting story and compete for the full compensation prize.'}
              </p>
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-all cursor-pointer"
              >
                {isAr ? 'شارك أول قسيمة' : 'Submit First Slip'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Submission Modal */}
      <AnimatePresence>
        {isSubmitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 text-slate-900"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      {isAr ? 'مشاركة قسيمة منحوسة' : 'Share Your Unlucky Slip'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {isAr ? 'قصتك قد تؤهلك للتعويض المجاني الكامل' : 'Your slip could win free 100% compensation'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {submitSuccess ? (
                <div className="py-8 text-center space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                  <h4 className="font-bold text-sm text-slate-900">
                    {isAr ? 'تم نشر قسيمتك بنجاح!' : 'Slip published successfully!'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {isAr ? 'يمكن للمجتمع الآن التصويت لتعويضك.' : 'Community can now upvote your loss.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleCreatePost} className="space-y-3">
                  {submitError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                      {submitError}
                    </div>
                  )}

                  {/* Company Picker */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {isAr ? 'الشركة / المنصة' : 'Bookmaker / Platform'}
                    </label>
                    <select
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                    >
                      <option value="1XBET">1XBET</option>
                      <option value="MELBET">MELBET</option>
                      <option value="BET365">BET365</option>
                      <option value="LINEBET">LINEBET</option>
                    </select>
                  </div>

                  {/* Loss Amount & Slip ID */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {isAr ? 'مبلغ الخسارة ($)' : 'Loss Amount ($)'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        required
                        value={lossAmount}
                        onChange={(e) => setLossAmount(e.target.value)}
                        placeholder="350"
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {isAr ? 'رقم القسيمة' : 'Slip ID'}
                      </label>
                      <input
                        type="text"
                        value={betSlipId}
                        onChange={(e) => setBetSlipId(e.target.value)}
                        placeholder="SLIP-98421"
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>

                  {/* Reason for Loss */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {isAr ? 'سبب الحظ السيء (ملخص)' : 'How was it lost? (Short)'}
                    </label>
                    <input
                      type="text"
                      required
                      value={lostBy}
                      onChange={(e) => setLostBy(e.target.value)}
                      placeholder={isAr ? 'مثال: إلغاء هدف بالـ VAR دقيقة 94' : 'e.g. Disallowed 94th min goal by VAR'}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  {/* Story */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {isAr ? 'تفاصيل القصة المؤلمة' : 'Story Details'}
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={story}
                      onChange={(e) => setStory(e.target.value)}
                      placeholder={
                        isAr
                          ? 'احكِ لنا ما حدث في تلك اللحظات وكيف تحولت الفرحة إلى صدمة...'
                          : 'Describe how the last-minute turn happened...'
                      }
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsSubmitModalOpen(false)}
                      className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      {isAr ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-2 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (isAr ? 'جاري النشر...' : 'Publishing...') : (isAr ? 'نشر القسيمة' : 'Publish Slip')}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
