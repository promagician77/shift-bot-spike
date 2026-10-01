// Session manager for Playwright. The goal is to look like a returning user,
// not a fresh bot on every check. Key ideas:
//
// 1. Reuse browser contexts with saved cookies and localStorage, so logins
//    survive across checks and the site sees a warm session.
// 2. Rotate a small pool of realistic browser fingerprints (viewport, timezone,
//    locale, user-agent) rather than using one fixed profile.
// 3. Add human-like delays between actions. A script that clicks in 2ms is
//    obvious; one that takes 400-900ms isn't.
// 4. Reconnect on failure with backoff, so a single network hiccup doesn't
//    kill the monitoring loop.

import { chromium } from 'playwright';

const PROFILES = [
  { viewport: { width: 1920, height: 1080 }, locale: 'en-CA', timezoneId: 'America/Toronto',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' },
  { viewport: { width: 1440, height: 900 }, locale: 'en-CA', timezoneId: 'America/Toronto',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36' },
  { viewport: { width: 1366, height: 768 }, locale: 'en-CA', timezoneId: 'America/Vancouver',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
];

export function pickProfile(index) {
  return PROFILES[index % PROFILES.length];
}

export async function createSession({ profileIndex = 0, storageState, headless = true } = {}) {
  const profile = pickProfile(profileIndex);
  const browser = await chromium.launch({
    headless,
    args: [
      '--disable-blink-features=AutomationControlled',  // hides the "automated" flag
      '--no-sandbox',
    ],
  });

  const contextOpts = {
    ...profile,
    // Saved cookies and localStorage from a previous session. On the first run
    // this is undefined (fresh context); after login, call context.storageState()
    // and pass it here next time.
    ...(storageState ? { storageState } : {}),
  };
  const context = await browser.newContext(contextOpts);

  // Mask the webdriver flag. Many WAFs check navigator.webdriver.
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = await context.newPage();
  return { browser, context, page, profile };
}

// Human-like pause. Never exactly the same.
export function humanDelay(minMs = 400, maxMs = 900) {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise((r) => setTimeout(r, ms));
}

// Retry with exponential backoff. Used around every navigation.
export async function withRetry(fn, { tries = 3, baseMs = 2000, label = 'action' } = {}) {
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === tries - 1) throw err;
      const wait = baseMs * 2 ** i;
      console.log(`[session] ${label} failed (attempt ${i + 1}/${tries}), retrying in ${wait}ms: ${err.message}`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

// Save the session state so the next check doesn't start from a fresh login.
export async function saveState(context) {
  return context.storageState();
}
