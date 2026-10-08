import { chromium, Browser, BrowserContext } from 'playwright-core';

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

export type { Browser, BrowserContext };