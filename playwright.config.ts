import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 5180);
const BASE_URL = `http://localhost:${PORT}`;
const IS_CI = Boolean(process.env.CI);

// WebKit always reports macOS in its user agent. Off macOS that contradicts
// `navigator.platform` and the keys Playwright sends (Ctrl, not Cmd), so
// there the WebKit project presents itself as WebKit on Linux.
const SAFARI = devices['Desktop Safari'];
const WEBKIT =
  process.platform === 'darwin'
    ? SAFARI
    : {
        ...SAFARI,
        userAgent: SAFARI.userAgent.replace(
          /\(Macintosh;[^)]*\)/,
          '(X11; Linux x86_64)'
        ),
      };

export default defineConfig({
  testDir: './playwright',
  fullyParallel: true,
  forbidOnly: IS_CI,
  // Flaky policy (#68): one retry exists only to record a trace and classify
  // the failure. A test that passes on the retry still fails the run.
  retries: IS_CI ? 1 : 0,
  failOnFlakyTests: true,
  reporter: IS_CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    // Diagnostics only: no test compares pixels.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // Chromium, Firefox and WebKit are equal: none of them is the reference.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: WEBKIT },
  ],
  webServer: {
    command: `bun run dev --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !IS_CI,
    timeout: 120_000,
    // The app runs on the in-memory mocks and mock authorization.
    env: { VITE_MOCK_AUTH: 'true' },
  },
});
