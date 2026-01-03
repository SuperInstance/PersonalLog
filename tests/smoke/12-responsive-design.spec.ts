/**
 * Smoke Test: Responsive Design
 *
 * Validates that the app works on different screen sizes.
 * Critical for mobile and tablet users.
 *
 * Runtime: < 20 seconds
 */

import { test, expect } from '@playwright/test'

test.describe('Smoke: Responsive Design', () => {
  test('should work on desktop', async ({ page }) => {
    // Desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Should display properly
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('nav')).toBeVisible()
  })

  test('should work on tablet', async ({ page }) => {
    // Tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Should display properly
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('nav')).toBeVisible()
  })

  test('should work on mobile', async ({ page }) => {
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Should display properly
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('nav')).toBeVisible()
  })

  test('should adapt navigation for mobile', async ({ page }) => {
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Navigation should be visible (might be hamburger menu)
    const nav = page.locator('nav')
    await expect(nav).toBeVisible()

    // Main content should be visible
    await expect(page.locator('main')).toBeVisible()
  })

  test('should handle orientation change', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Should work in portrait
    await expect(page.locator('main')).toBeVisible()

    // Switch to landscape
    await page.setViewportSize({ width: 667, height: 375 })
    await page.waitForTimeout(500) // Wait for layout adjustment

    // Should still work
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('nav')).toBeVisible()
  })
})
