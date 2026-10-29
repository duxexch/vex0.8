// =========================================================================
// VEX Wallet App mode — the wallet WebView build.
//
// The customer receives a single download link. That link opens either:
//   • /wallet-app        — the web entry that boots into the wallet, or
//   • the Capacitor APK  — same bundle, detected via window.Capacitor.
//
// The app is a full mirror of the website: every section stays reachable
// exactly as on the web. The only difference is where it opens — straight
// on the wallet (compensation dashboard) instead of the companies home.
// =========================================================================

import type { TabType } from './types';

let cached: boolean | null = null;

/** True when running inside the native APK or on the /wallet-app route. */
export function isWalletApp(): boolean {
  if (cached !== null) return cached;
  if (typeof window === 'undefined') {
    cached = false;
    return cached;
  }
  try {
    const cap = (window as any).Capacitor;
    if (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) {
      cached = true;
      return cached;
    }
  } catch {
    // Capacitor bridge absent — fall through to the route check.
  }
  const path = window.location.pathname.replace(/\/+$/, '').toLowerCase();
  cached = path === '/wallet-app' || path.startsWith('/wallet-app/');
  return cached;
}

/** True only inside the native APK (not the /wallet-app web route). */
export function isNativeWalletApp(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const cap = (window as any).Capacitor;
    return !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
  } catch {
    return false;
  }
}

/** Section the wallet app should boot into (compensation dashboard). */
export function walletHomeTab(): TabType {
  return 'wallets';
}

/** Reset the memoized detection (tests / hot reload). */
export function resetWalletAppDetection(): void {
  cached = null;
}
