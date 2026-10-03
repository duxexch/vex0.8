import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { RefreshCw, ArrowDown } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { Language } from '../types';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  lang: Language;
  disabled?: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  lang,
  disabled = false,
}) => {
  const isAr = lang === 'ar';
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);

  const THRESHOLD = 65;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    const container = containerRef.current;
    if (!container) return;

    // Only allow pull-down if scrolled to the absolute top
    if (container.scrollTop <= 0) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current || disabled || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;

    if (diff > 0) {
      // Elastic damping resistance formula
      const damped = Math.min(diff * 0.45, 95);
      setPullDistance(damped);
      if (damped >= THRESHOLD && pullDistance < THRESHOLD) {
        triggerHaptic('light');
      }
    } else {
      setPullDistance(0);
      isPullingRef.current = false;
    }
  };

  const handleTouchEnd = async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    if (pullDistance >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(50);
      triggerHaptic('medium');

      try {
        await Promise.resolve(onRefresh());
        triggerHaptic('success');
      } catch {
        triggerHaptic('error');
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 400);
      }
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative flex-1 w-full h-full overflow-y-auto overscroll-y-contain focus:outline-none"
      id="app-scroll-viewport"
    >
      {/* Pull Indicator Pill */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="absolute top-2 left-0 right-0 z-30 flex justify-center pointer-events-none transition-transform duration-75"
          style={{
            transform: `translateY(${Math.max(0, pullDistance - 45)}px)`,
          }}
        >
          <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-md border border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-800 animate-fade-in">
            {isRefreshing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                <span>{isAr ? 'جاري تحديث البيانات...' : 'Refreshing...'}</span>
              </>
            ) : (
              <>
                <ArrowDown
                  className="w-3.5 h-3.5 text-emerald-600 transition-transform duration-150"
                  style={{
                    transform: `rotate(${pullDistance >= THRESHOLD ? 180 : 0}deg)`,
                  }}
                />
                <span>
                  {pullDistance >= THRESHOLD
                    ? isAr
                      ? 'اترك للتحديث الآن'
                      : 'Release to refresh'
                    : isAr
                    ? 'اسحب للأسفل للتحديث'
                    : 'Pull down to refresh'}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Content wrapper with smooth spring offset */}
      <div
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance * 0.4}px)` : 'none',
          transition: isPullingRef.current ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {children}
      </div>
    </div>
  );
};
