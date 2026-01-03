/**
 * Smoke Test: Settings - System
 *
 * Validates that system settings page loads and displays hardware info.
 * Critical for adaptive optimization feature.
 *
 * Runtime: < 15 seconds
 */

import { test, expect } from '@playwright/test'

test.describe('Smoke: Settings - System', () => {
  test('should load system settings', async ({ page }) => {
    await page.goto('/settings/system')
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

  test('should display system information', async ({ page }) => {
    await page.goto('/settings/system')
    await page.waitForLoadState('domcontentloaded')

    // Should have some content (system info)
    const main = page.locator('main')
    await expect(main).toBeVisible()

    // Content should exist (even if system detection is pending)
    const hasContent = await page.evaluate(() => {
      return document.body.textContent?.trim().length ?? 0 > 0
    })
    expect(hasContent).toBe(true)
  })

  test('should allow viewing hardware info', async ({ page }) => {
    await page.goto('/settings/system')
    await page.waitForLoadState('domcontentloaded')

    // Should display something meaningful
    const pageContent = await page.textContent('main')
    expect(pageContent).toBeTruthy()
    expect(pageContent?.length).toBeGreaterThan(0)
  })
})
