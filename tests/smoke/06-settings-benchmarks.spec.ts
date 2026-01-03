/**
 * Smoke Test: Settings - Benchmarks
 *
 * Validates that benchmarks page loads and can display performance data.
 * Important for adaptive optimization system.
 *
 * Runtime: < 15 seconds
 */

import { test, expect } from '@playwright/test'

test.describe('Smoke: Settings - Benchmarks', () => {
  test('should load benchmarks settings', async ({ page }) => {
    await page.goto('/settings/benchmarks')
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

  test('should display benchmark interface', async ({ page }) => {
    await page.goto('/settings/benchmarks')
    await page.waitForLoadState('domcontentloaded')

    // Should have content
    const main = page.locator('main')
    await expect(main).toBeVisible()

    // Should have some text content
    const hasContent = await page.evaluate(() => {
      return document.body.textContent?.trim().length ?? 0 > 0
    })
    expect(hasContent).toBe(true)
  })

  test('should allow running benchmarks if available', async ({ page }) => {
    await page.goto('/settings/benchmarks')
    await page.waitForLoadState('domcontentloaded')

    // Look for run benchmark button
    const runButton = page.locator('button:has-text("Run"), button:has-text("Start"), button:has-text("Benchmark")')

    if (await runButton.count() > 0) {
      // Button exists, should be clickable
      await expect(runButton.first()).toBeVisible()
    }
  })
})
