import { chromium, Browser, BrowserContext, Page } from 'playwright-core';

// =========================================================================
// Shared browser launcher — works on the server (Alpine system chromium)
// and on dev machines (installed Chrome/Edge), no bundled browser needed.
// =========================================================================

const LAUNCH_ATTEMPTS: Array<{ executablePath?: string; label: string }> = [
  { label: 'bundled' },
  { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser', label: 'env-chromium' },
  { executablePath: '/usr/bin/chromium-browser', label: 'alpine-chromium' },
  { executablePath: '/usr/bin/chromium', label: 'chromium' },
  { executablePath: '/usr/bin/google-chrome-stable', label: 'chrome' },
  { executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', label: 'win-chrome' },
  { executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', label: 'win-chrome-x86' },
  { executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', label: 'win-edge' },
];

export async function launchBrowser(): Promise<Browser> {
  const extraArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'];
  let lastErr: Error | null = null;
  for (const attempt of LAUNCH_ATTEMPTS) {
    try {
      const opts: any = { headless: true, args: extraArgs };
      if (attempt.executablePath) opts.executablePath = attempt.executablePath;
      return await chromium.launch(opts);
    } catch (err: any) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('no chromium available');
}

/**
 * Open a page with a browser-side `__name` shim.
 * tsx (dev mode) compiles with esbuild `keepNames`, so `page.evaluate`
 * callbacks get wrapped in `__name(...)` — a helper that does not exist
 * INSIDE the browser and throws ReferenceError. The shim is passed as a
 * STRING so it is never transformed. Production bundles don't emit `__name`
 * (verified: dist/server.cjs is clean) — the shim is a harmless no-op there.
 */
export async function newPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.addInitScript('window.__name = window.__name || ((f) => f);');
  return page;
}

export type { Browser, BrowserContext, Page };