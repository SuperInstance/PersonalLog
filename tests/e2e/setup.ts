/**
 * Playwright E2E Test Setup
 *
 * Global setup for end-to-end tests.
 */

import { test as base } from '@playwright/test'

// Extend base test with custom fixtures
export const test = base.extend<{
  authenticatedPage: typeof base['page']
}>({
  authenticatedPage: async ({ page }, use) => {
    // Perform authentication if needed
    // For now, just use the page as-is
    await use(page)
  },
})

export { expect } from '@playwright/test'
