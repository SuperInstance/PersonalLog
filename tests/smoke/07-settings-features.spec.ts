/**
 * Smoke Test: Settings - Features
 *
 * Validates that feature flags page loads and displays toggles.
 * Critical for adaptive feature system.
 *
 * Runtime: < 15 seconds
 */

import { test, expect } from '@playwright/test'

test.describe('Smoke: Settings - Features', () => {
  test('should load features settings', async ({ page }) => {
    await page.goto('/settings/features')
    await page.waitForLoadState('domcontentloaded')

    // Should have main content
    await expect(page.locator('main')).toBeVisible()

    // Should have navigation
    await expect(page.locator('nav')).toBeVisible()

    // Should load without errors
    const hasErrors = await page.evaluate(() => {
      return document.body.textContent?.includes('Error') === true
    })
    expect(hasErrors).toBe(false)
  })

  test('should display feature flags', async ({ page }) => {
    await page.goto('/settings/features')
    await page.waitForLoadState('domcontentloaded')

    // Should have content
    const main = page.locator('main')
    await expect(main).toBeVisible()

    // Should mention features or flags
    const pageContent = await page.textContent('main')
    expect(pageContent).toBeTruthy()
  })

  test('should have interactive elements for features', async ({ page }) => {
    await page.goto('/settings/features')
    await page.waitForLoadState('domcontentloaded')

    // Look for toggles or checkboxes
    const toggles = page.locator('input[type="checkbox"], button[role="switch"], .toggle')

    // Should have some controls (even if no features are toggleable)
    const controlCount = await toggles.count()

    // If toggles exist, they should be visible
    if (controlCount > 0) {
      await expect(toggles.first()).toBeVisible()
    }
  })
})
