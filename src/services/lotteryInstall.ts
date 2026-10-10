// Lottery PWA install helper.
// The lottery section installs as its OWN app: before prompting we swap the
// page's manifest to /lottery-manifest.json (distinct manifest `id`), so Chrome
// registers a separate "VEX Lottery" entry instead of the main VEX Deals app.
// iOS Safari ignores manifests — callers fall back to the Add-to-Home-Screen guide.

const MAIN_MANIFEST = '/manifest.json';
const LOTTERY_MANIFEST = '/lottery-manifest.json';

export type LotteryInstallResult =
  | 'already' // running as standalone app
  | 'ios' // caller should open the iOS Add-to-Home-Screen guide
  | 'accepted' // Chrome install prompt accepted
  | 'dismissed' // Chrome install prompt dismissed
  | 'manual'; // no prompt available — keep lottery manifest for manual add

export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches
    );
  } catch {
    return false;
  }
}

export function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

export function setManifest(href: string): void {
  if (typeof document === 'undefined') return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'manifest';
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

export function restoreMainManifest(): void {
  setManifest(MAIN_MANIFEST);
}

function waitForInstallPrompt(timeoutMs: number): Promise<any | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: any | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.clearTimeout(timer);
      resolve(value);
    };
    const onPrompt = (e: Event) => {
      // Chrome requires preventDefault so the event stays usable
      e.preventDefault();
      finish(e);
    };
    const timer = window.setTimeout(() => finish(null), timeoutMs);
    window.addEventListener('beforeinstallprompt', onPrompt);
  });
}

export async function promptLotteryInstall(): Promise<LotteryInstallResult> {
  if (isStandaloneMode()) return 'already';
  if (isIosDevice()) return 'ios';

  // Point the page at the lottery manifest BEFORE the prompt so Chrome captures
  // the lottery identity (name/icon/start_url) for the installed app.
  setManifest(LOTTERY_MANIFEST);

  const deferred = await waitForInstallPrompt(3500);
  if (!deferred || typeof deferred.prompt !== 'function') {
    // Keep the lottery manifest active — manual "Add to Home Screen" will use it.
    return 'manual';
  }
  try {
    deferred.prompt();
    const choice = await deferred.userChoice;
    return choice?.outcome === 'accepted' ? 'accepted' : 'dismissed';
  } catch {
    return 'manual';
  } finally {
    restoreMainManifest();
  }
}
