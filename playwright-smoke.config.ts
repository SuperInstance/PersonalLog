import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright Configuration for Smoke Tests
 *
 * Smoke tests are fast-running tests that validate critical functionality.
 * They should run in < 5 minutes total and catch major regressions quickly.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Faster timeouts for smoke tests
  timeout: 30 * 1000, // 30 seconds per test
  expect: {
    timeout: 10 * 1000, // 10 seconds per assertion
  },

  reporter: [
    ['html', { outputFolder: 'playwright-smoke-report' }],
    ['list'],
    ['junit', { outputFile: 'test-results/smoke-junit.xml' }],
  ],

  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Faster navigation
    navigationTimeout: 15 * 1000,
  },

  // Only test on chromium for speed - smoke tests don't need cross-browser
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run dev server before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
