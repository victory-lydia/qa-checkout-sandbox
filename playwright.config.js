import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Configuration for The QA Checkout Sandbox.
 * Automatically spawns the local Express backend on port 3000.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: false,
  workers: 1, // Single worker for deterministic state testing
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'node src/server.js',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});
