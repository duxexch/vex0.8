import React from 'react';

/**
 * Base Shimmer Element
 */
export const SkeletonShimmer: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-shimmer rounded-md ${className}`} />
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
        <div className="relative flex items-center bg-slate-50/60 rounded-2xl border border-slate-100 p-1.5 gap-2">
          <SkeletonShimmer className="w-9 h-9 rounded-xl shrink-0" />
          <SkeletonShimmer className="h-5 flex-1 rounded" />
          <SkeletonShimmer className="w-9 h-9 rounded-xl shrink-0" />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pt-0.5">
          <SkeletonShimmer className="h-3.5 w-10 rounded shrink-0" />
          <SkeletonShimmer className="h-6 w-14 rounded-xl shrink-0" />
          <SkeletonShimmer className="h-6 w-16 rounded-xl shrink-0" />
          <SkeletonShimmer className="h-6 w-14 rounded-xl shrink-0" />
          <SkeletonShimmer className="h-6 w-16 rounded-xl shrink-0" />
        </div>
      </div>

      {/* Balanced Responsive Grid View matching CompaniesTab layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
          <div
            key={item}
            className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden h-full shadow-2xs space-y-3.5"
          >
            {/* Top Accent Line Placeholder */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200/50" />

            <div className="space-y-3">
              {/* Header: Logo, Name, Badge & Status */}
              <div className="flex items-start justify-between gap-2.5 pt-0.5">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <SkeletonShimmer className="w-4 h-4 rounded shrink-0" />
                  <div className="rounded-xl border border-slate-200/80 p-0.5 bg-slate-50 shrink-0 shadow-2xs">
                    <SkeletonShimmer className="w-9 h-9 rounded-lg" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <SkeletonShimmer className="h-4 w-20 rounded" />
                    <SkeletonShimmer className="h-3 w-28 rounded" />
                  </div>
                </div>
                <SkeletonShimmer className="h-4.5 w-10 rounded-md shrink-0" />
              </div>

              {/* Promo Code Box */}
              <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between shadow-2xs">
                <div className="space-y-1">
                  <SkeletonShimmer className="h-2 w-12 rounded" />
                  <SkeletonShimmer className="h-4 w-16 rounded" />
                </div>
                <SkeletonShimmer className="w-7 h-7 rounded-lg" />
              </div>

              {/* Account Status / ID Box */}
              <div className="p-2 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs shadow-2xs">
                <div className="space-y-1">
                  <SkeletonShimmer className="h-2 w-14 rounded" />
                  <SkeletonShimmer className="h-3.5 w-20 rounded" />
                </div>
                <SkeletonShimmer className="h-5 w-16 rounded-md shrink-0" />
              </div>
            </div>

            {/* Action Buttons: 2x2 Grid with balanced heights */}
            <div className="mt-3.5 pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-1.5">
              <SkeletonShimmer className="h-8 rounded-xl" />
              <SkeletonShimmer className="h-8 rounded-xl" />
              <SkeletonShimmer className="h-8 rounded-xl" />
              <SkeletonShimmer className="h-8 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Wallet Tab Skeleton Loader
 * Mirrors the Total Balance Summary Card + Wallet Phone Lock Security Card + Individual Company Wallets
 */
export const WalletTabSkeleton: React.FC = () => {
  return (
    <div className="space-y-3.5 pb-24 animate-fade-in" aria-busy="true" aria-label="Loading wallets">
      {/* Top Total Balance Summary Card Skeleton */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SkeletonShimmer className="w-8 h-8 rounded-lg" />
            <SkeletonShimmer className="h-4 w-36 rounded" />
          </div>
          <div className="flex items-center gap-1.5">
            <SkeletonShimmer className="h-7 w-24 rounded-lg" />
            <SkeletonShimmer className="h-5 w-20 rounded-md" />
          </div>
        </div>

        {/* Big Balance Counters - Responsive Multi-Column matching WalletTab grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Frozen Box Skeleton */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-1.5">
              <SkeletonShimmer className="w-3.5 h-3.5 rounded" />
              <SkeletonShimmer className="h-3.5 w-16 rounded" />
            </div>
            <SkeletonShimmer className="h-7 w-28 rounded" />
            <SkeletonShimmer className="h-2.5 w-24 rounded" />
          </div>

          {/* Available Box Skeleton */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-1.5">
              <SkeletonShimmer className="w-3.5 h-3.5 rounded" />
              <SkeletonShimmer className="h-3.5 w-16 rounded" />
            </div>
            <SkeletonShimmer className="h-7 w-28 rounded" />
            <SkeletonShimmer className="h-2.5 w-24 rounded" />
          </div>

          {/* Total Combined / Fast Unfreeze Box Skeleton */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 sm:col-span-2 lg:col-span-1 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5">
                <SkeletonShimmer className="w-3.5 h-3.5 rounded" />
                <SkeletonShimmer className="h-3.5 w-24 rounded" />
              </div>
              <SkeletonShimmer className="h-4 w-12 rounded" />
            </div>
            <SkeletonShimmer className="h-7 w-28 rounded" />
            <div className="pt-2">
              <SkeletonShimmer className="h-7 w-full rounded-lg" />
            </div>
          </div>
        </div>

        {/* Explanation Banner Skeleton */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-start gap-2">
          <SkeletonShimmer className="w-4 h-4 rounded shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1.5">
            <SkeletonShimmer className="h-3.5 w-full rounded" />
            <SkeletonShimmer className="h-3.5 w-4/5 rounded" />
          </div>
        </div>
      </div>

      {/* Wallet Phone Lock Security Card Skeleton */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <SkeletonShimmer className="w-10 h-10 rounded-xl shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <SkeletonShimmer className="h-4.5 w-48 rounded" />
                <SkeletonShimmer className="h-4 w-20 rounded animate-pulse" />
              </div>
              <SkeletonShimmer className="h-3 w-full rounded" />
              <SkeletonShimmer className="h-3 w-3/4 rounded" />
            </div>
          </div>
          <SkeletonShimmer className="h-9 w-32 rounded-xl shrink-0" />
        </div>
      </div>

      {/* Per Company Wallets Header Skeleton */}
      <div className="flex items-center justify-between px-1">
        <SkeletonShimmer className="h-4 w-32 rounded" />
        <div className="flex items-center gap-2">
          <SkeletonShimmer className="h-8 w-24 rounded-lg" />
          <SkeletonShimmer className="h-8 w-28 rounded-lg" />
          <SkeletonShimmer className="h-8 w-32 rounded-lg" />
          <SkeletonShimmer className="h-8 w-16 rounded-lg" />
        </div>
      </div>

      {/* Balanced Financial Cards Grid (4 Columns on xl Screens matching WalletTab layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between h-full space-y-3.5"
          >
            <div className="space-y-3">
              {/* Company Title & Quick Badges */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="rounded-xl border border-slate-200 p-0.5 bg-slate-50 shrink-0">
                    <SkeletonShimmer className="w-9 h-9 rounded-lg" />
                  </div>
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <SkeletonShimmer className="h-4 w-20 rounded" />
                    <SkeletonShimmer className="h-3 w-28 rounded" />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <SkeletonShimmer className="h-4 w-12 rounded" />
                </div>
              </div>

              {/* Balances Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-1">
                    <SkeletonShimmer className="w-3 h-3 rounded" />
                    <SkeletonShimmer className="h-3 w-10 rounded" />
                  </div>
                  <SkeletonShimmer className="h-4.5 w-16 rounded font-mono" />
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-1">
                    <SkeletonShimmer className="w-3 h-3 rounded" />
                    <SkeletonShimmer className="h-3 w-10 rounded" />
                  </div>
                  <SkeletonShimmer className="h-4.5 w-16 rounded font-mono" />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-1.5 pt-3 mt-3 border-t border-slate-100">
              <SkeletonShimmer className="h-8 rounded-xl" />
              <SkeletonShimmer className="h-8 rounded-xl" />
              <SkeletonShimmer className="h-8 rounded-xl" />
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
