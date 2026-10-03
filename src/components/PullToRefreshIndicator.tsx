import React, { useEffect, useState, useRef, useCallback } from 'react';
import { RefreshCw, ArrowDown } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface PullToRefreshIndicatorProps {
  scrollContainerId: string;
  onRefresh: () => Promise<void> | void;
  lang: 'ar' | 'en' | 'es' | 'ru';
}

export const PullToRefreshIndicator: React.FC<PullToRefreshIndicatorProps> = ({
  scrollContainerId,
  onRefresh,
  lang,
}) => {
  const isAr = lang === 'ar';
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const threshold = 75;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const container = document.getElementById(scrollContainerId);
    if (!container || container.scrollTop > 5 || isRefreshing) return;

    startYRef.current = e.touches[0].clientY;
    isPullingRef.current = true;
  }, [scrollContainerId, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPullingRef.current || isRefreshing) return;

    const container = document.getElementById(scrollContainerId);
    if (!container || container.scrollTop > 5) {
      setPullDistance(0);
      isPullingRef.current = false;
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;

    if (diff > 0) {
      // Apply rubber-banding resistance curve
      const resistance = 0.45;
      const calculated = Math.min(diff * resistance, 110);
      setPullDistance(calculated);

      if (calculated >= threshold && pullDistance < threshold) {
        triggerHaptic('light');
      }
    } else {
      setPullDistance(0);
    }
  }, [scrollContainerId, isRefreshing, pullDistance, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(52); // Keep indicator visible while fetching
      triggerHaptic('medium');

      try {
        await onRefresh();
        triggerHaptic('success');
      } catch (err) {
        console.error('Refresh failed:', err);
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 400);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = document.getElementById(scrollContainerId);
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [scrollContainerId, handleTouchStart, handleTouchMove, handleTouchEnd]);

  if (pullDistance === 0 && !isRefreshing) return null;

  const isReady = pullDistance >= threshold;

  return (
    <div
      className="w-full flex justify-center pointer-events-none transition-all duration-150 overflow-hidden select-none"
      style={{
        height: `${pullDistance}px`,
        opacity: Math.min(pullDistance / 35, 1),
      }}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 border border-slate-200/90 shadow-md text-slate-800 text-xs font-bold self-center my-1.5">
        {isRefreshing ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
            <span className="text-[11px] text-emerald-800 font-bold">
              {isAr ? 'جاري تحديث البيانات...' : 'Refreshing data...'}
            </span>
          </>
        ) : isReady ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] text-emerald-700 font-extrabold">
              {isAr ? 'أفلت للتحديث الآن' : 'Release to refresh'}
            </span>
          </>
        ) : (
          <>
            <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] text-slate-500">
              {isAr ? 'اسحب للأسفل للتحديث' : 'Pull to refresh'}
            </span>
          </>
        )}
      </div>
    </div>
  );
};
