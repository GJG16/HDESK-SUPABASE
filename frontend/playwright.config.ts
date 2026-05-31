import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    headless: true,
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
    video: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Use system Chrome to avoid downloading Playwright-managed browsers
    { name: 'chromium', use: { channel: 'chrome' } },
    { name: 'firefox', use: { browserName: 'firefox' } }
  ]
});
