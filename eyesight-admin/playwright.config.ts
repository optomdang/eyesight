import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4001',
    reuseExistingServer: true,
    timeout: 60000,
  },
  timeout: 600000,
  expect: {
    timeout: 15000,
  },
  use: {
    actionTimeout: 10000,
    navigationTimeout: 20000,
    headless: true,
    viewport: { width: 1280, height: 900 },
    ignoreHTTPSErrors: true,
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:4001',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  retries: process.env.CI ? 1 : 0,
  projects: [
    {
      name: 'chrome',
      use: { channel: 'chrome' },
    },
  ],
});
