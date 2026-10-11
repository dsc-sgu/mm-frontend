import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 5180);
const BASE_URL = `http://localhost:${PORT}`;
const IS_CI = Boolean(process.env.CI);

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
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
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
