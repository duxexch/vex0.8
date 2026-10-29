// =========================================================================
// VEX Wallet App mode — the wallet-only WebView build.
//
// The customer receives a single download link. That link opens either:
//   • /wallet-app        — the web version of the wallet-only experience, or
//   • the Capacitor APK  — same bundle, detected via window.Capacitor.
//
// In this mode the app boots straight into the wallet (compensation dashboard
// first), the bottom navigation only exposes wallet-owned sections, and every
// attempt to wander off to other sections is clamped back to the wallet.
// =========================================================================

import type { TabType } from './types';

/** Sections the wallet app is allowed to show. */
export const WALLET_APP_TABS: TabType[] = ['wallets', 'companies', 'activity'];

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

/** Clamp any tab to one the wallet app exposes (wallet is the home base). */
export function clampWalletTab(tab: TabType): TabType {
  return (WALLET_APP_TABS as string[]).includes(tab) ? tab : 'wallets';
}

/** Route the wallet app should boot into. */
export function walletHomeTab(): TabType {
  return 'wallets';
}

/** Reset the memoized detection (tests / hot reload). */
export function resetWalletAppDetection(): void {
  cached = null;
}
