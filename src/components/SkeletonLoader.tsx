import React from 'react';

/**
 * Base Shimmer Element
 */
export const SkeletonShimmer: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-slate-200/80 animate-pulse rounded-md ${className}`} />
);

/**
 * Companies Tab Skeleton Loader
 * Faithfully mirrors the CompaniesTab UI layout (Search, stats, and company cards)
 */
export const CompaniesTabSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 pb-24 animate-fade-in" aria-busy="true" aria-label="Loading companies">
      {/* Search & Filter Header Skeleton */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs space-y-3">
        <div className="flex items-center gap-2.5">
          <SkeletonShimmer className="h-10 flex-1 rounded-xl" />
          <SkeletonShimmer className="h-10 w-24 rounded-xl" />
        </div>
        <div className="flex items-center justify-between pt-1">
          <SkeletonShimmer className="h-4 w-32 rounded" />
          <SkeletonShimmer className="h-4 w-20 rounded" />
        </div>
      </div>

      {/* Companies Grid Skeletons (3 items) */}
      <div className="space-y-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden space-y-4"
          >
            {/* Top Color Accent Stripe placeholder */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200/70" />

            {/* Top section: Logo, Name, Badge, Promo Code button */}
            <div className="flex items-start justify-between gap-3 pt-1">
              <div className="flex items-center gap-3">
                {/* Logo skeleton */}
                <SkeletonShimmer className="w-12 h-12 rounded-xl" />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <SkeletonShimmer className="h-5 w-24 rounded-md" />
                    <SkeletonShimmer className="h-4 w-14 rounded-md" />
                  </div>
                  <SkeletonShimmer className="h-3.5 w-40 rounded" />
                </div>
              </div>

              {/* Promo code button skeleton */}
              <SkeletonShimmer className="h-9 w-24 rounded-xl shrink-0" />
            </div>

            {/* Middle perks / feature tags placeholder */}
            <div className="flex items-center gap-2 pt-1">
              <SkeletonShimmer className="h-6 w-28 rounded-lg" />
              <SkeletonShimmer className="h-6 w-24 rounded-lg" />
              <SkeletonShimmer className="h-6 w-20 rounded-lg" />
            </div>

            {/* Action buttons rows */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <SkeletonShimmer className="h-10 rounded-xl" />
                <SkeletonShimmer className="h-10 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <SkeletonShimmer className="h-9 rounded-xl" />
                <SkeletonShimmer className="h-9 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Wallet Tab Skeleton Loader
 * Mirrors the Total Balance Summary Card + Individual Company Wallets
 */
export const WalletTabSkeleton: React.FC = () => {
  return (
    <div className="space-y-3.5 pb-24 animate-fade-in" aria-busy="true" aria-label="Loading wallets">
      {/* Top Total Balance Summary Card Skeleton */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SkeletonShimmer className="w-8 h-8 rounded-lg" />
            <SkeletonShimmer className="h-4 w-36 rounded" />
          </div>
          <SkeletonShimmer className="h-5 w-20 rounded-md" />
        </div>

        {/* Big Balance Counters Grid (Frozen + Available) */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-1.5">
              <SkeletonShimmer className="w-3.5 h-3.5 rounded" />
              <SkeletonShimmer className="h-3.5 w-16 rounded" />
            </div>
            <SkeletonShimmer className="h-7 w-28 rounded" />
            <SkeletonShimmer className="h-2.5 w-24 rounded" />
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-1.5">
              <SkeletonShimmer className="w-3.5 h-3.5 rounded" />
              <SkeletonShimmer className="h-3.5 w-16 rounded" />
            </div>
            <SkeletonShimmer className="h-7 w-28 rounded" />
            <SkeletonShimmer className="h-2.5 w-24 rounded" />
          </div>
        </div>

        {/* Explanation Banner Skeleton */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-start gap-2">
          <SkeletonShimmer className="w-4 h-4 rounded shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1.5">
            <SkeletonShimmer className="h-3 w-full rounded" />
            <SkeletonShimmer className="h-3 w-4/5 rounded" />
          </div>
        </div>
      </div>

      {/* Header Skeleton */}
      <div className="flex items-center justify-between px-1">
        <SkeletonShimmer className="h-4 w-28 rounded" />
        <SkeletonShimmer className="h-8 w-24 rounded-lg" />
      </div>

      {/* Individual Wallets List Skeletons */}
      <div className="space-y-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <SkeletonShimmer className="w-9 h-9 rounded-xl" />
                <div className="space-y-1.5">
                  <SkeletonShimmer className="h-4 w-24 rounded" />
                  <SkeletonShimmer className="h-3 w-16 rounded" />
                </div>
              </div>
              <SkeletonShimmer className="h-5 w-16 rounded-md" />
            </div>

            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="space-y-1">
                <SkeletonShimmer className="h-3 w-12 rounded" />
                <SkeletonShimmer className="h-5 w-20 rounded" />
              </div>
              <div className="space-y-1">
                <SkeletonShimmer className="h-3 w-12 rounded" />
                <SkeletonShimmer className="h-5 w-20 rounded" />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <SkeletonShimmer className="h-8 flex-1 rounded-lg" />
              <SkeletonShimmer className="h-8 flex-1 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Activity Tab Skeleton Loader
 * Mirrors registered accounts and compensation request history items
 */
export const ActivityTabSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 pb-24 animate-fade-in" aria-busy="true" aria-label="Loading activity">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between px-1">
        <SkeletonShimmer className="h-5 w-32 rounded" />
        <SkeletonShimmer className="h-9 w-28 rounded-xl" />
      </div>

      {/* 1. Accounts Section Skeleton */}
      <div className="space-y-2.5">
        <SkeletonShimmer className="h-4 w-28 rounded px-1" />
        <div className="space-y-2">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="bg-white border border-slate-200/90 rounded-2xl p-3.5 flex items-center justify-between shadow-xs"
            >
              <div className="flex items-center gap-3">
                <SkeletonShimmer className="w-9 h-9 rounded-xl" />
                <div className="space-y-1.5">
                  <SkeletonShimmer className="h-4 w-24 rounded" />
                  <SkeletonShimmer className="h-3 w-32 rounded" />
                </div>
              </div>
              <SkeletonShimmer className="h-6 w-16 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* 2. Requests History Section Skeleton */}
      <div className="space-y-2.5 pt-2">
        <SkeletonShimmer className="h-4 w-36 rounded px-1" />
        <div className="space-y-2.5">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <SkeletonShimmer className="w-8 h-8 rounded-lg" />
                  <div className="space-y-1">
                    <SkeletonShimmer className="h-4 w-28 rounded" />
                    <SkeletonShimmer className="h-3 w-20 rounded" />
                  </div>
                </div>
                <SkeletonShimmer className="h-6 w-20 rounded-md" />
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="space-y-1">
                  <SkeletonShimmer className="h-3 w-16 rounded" />
                  <SkeletonShimmer className="h-5 w-20 rounded" />
                </div>
                <div className="space-y-1 text-right">
                  <SkeletonShimmer className="h-3 w-16 rounded" />
                  <SkeletonShimmer className="h-5 w-20 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Sports Fixtures & News Skeleton Loader
 * For AiSportsHubTab matches and news items
 */
export const SportsFixturesSkeleton: React.FC = () => {
  return (
    <div className="space-y-2.5" aria-busy="true" aria-label="Loading sports fixtures">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3"
        >
          {/* League & Kickoff header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SkeletonShimmer className="w-3.5 h-3.5 rounded" />
              <SkeletonShimmer className="h-4 w-24 rounded" />
            </div>
            <SkeletonShimmer className="h-5 w-16 rounded-md" />
          </div>

          {/* Teams showcase */}
          <div className="flex items-center justify-between gap-3 py-2 border-y border-slate-100">
            <div className="flex items-center gap-2.5 flex-1">
              <SkeletonShimmer className="w-9 h-9 rounded-xl shrink-0" />
              <div className="space-y-1">
                <SkeletonShimmer className="h-4 w-20 rounded" />
                <SkeletonShimmer className="h-2.5 w-10 rounded" />
              </div>
            </div>

            <SkeletonShimmer className="h-4 w-6 rounded" />

            <div className="flex items-center justify-end gap-2.5 flex-1">
              <div className="space-y-1 text-right">
                <SkeletonShimmer className="h-4 w-20 rounded" />
                <SkeletonShimmer className="h-2.5 w-10 rounded" />
              </div>
              <SkeletonShimmer className="w-9 h-9 rounded-xl shrink-0" />
            </div>
          </div>

          {/* Prediction chips & action button */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-1.5">
              <SkeletonShimmer className="h-5 w-14 rounded-md" />
              <SkeletonShimmer className="h-5 w-14 rounded-md" />
            </div>
            <SkeletonShimmer className="h-8 w-28 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Transfers Tab Skeleton Loader
 */
export const TransfersTabSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 pb-24 animate-fade-in" aria-busy="true" aria-label="Loading transfers">
      {/* Transfer Form Box Skeleton */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <SkeletonShimmer className="h-5 w-32 rounded" />
          <SkeletonShimmer className="h-4 w-24 rounded" />
        </div>
        <div className="space-y-3">
          <SkeletonShimmer className="h-11 w-full rounded-xl" />
          <SkeletonShimmer className="h-11 w-full rounded-xl" />
          <SkeletonShimmer className="h-11 w-full rounded-xl" />
        </div>
        <SkeletonShimmer className="h-12 w-full rounded-xl" />
      </div>

      {/* History List Skeleton */}
      <div className="space-y-2.5 pt-1">
        <SkeletonShimmer className="h-4 w-32 rounded px-1" />
        <div className="space-y-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
              <div className="space-y-1.5">
                <SkeletonShimmer className="h-4 w-28 rounded" />
                <SkeletonShimmer className="h-3 w-20 rounded" />
              </div>
              <div className="space-y-1 text-right">
                <SkeletonShimmer className="h-4 w-20 rounded" />
                <SkeletonShimmer className="h-5 w-16 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
