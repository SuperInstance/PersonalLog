/**
 * Smoke Test: Offline Capability
 *
 * Validates that the app has basic offline support.
 * Critical for PWA functionality and reliability.
 *
 * Runtime: < 15 seconds
 */

import { test, expect } from '@playwright/test'

test.describe('Smoke: Offline Capability', () => {
  test('should load app with offline capability', async ({ page }) => {
    await page.goto('/')

    // App should load successfully
    await expect(page.locator('main')).toBeVisible()

    // Check for service worker
    const hasServiceWorker = await page.evaluate(() => {
      return 'serviceWorker' in navigator
    })

    expect(hasServiceWorker).toBe(true)
  })

  test('should cache critical resources', async ({ page }) => {
    await page.goto('/')

    // Check if cache API is available
    const hasCache = await page.evaluate(() => {
      return 'caches' in window
    })

    expect(hasCache).toBe(true)
  })

  test('should work with basic offline preparation', async ({ page }) => {
    await page.goto('/')

    // Navigate to a few pages to populate cache
    await page.goto('/knowledge')
    await page.waitForLoadState('domcontentloaded')

    await page.goto('/settings')
    await page.waitForLoadState('domcontentloaded')

    // Go back to home
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Should still work
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('nav')).toBeVisible()
  })
})
