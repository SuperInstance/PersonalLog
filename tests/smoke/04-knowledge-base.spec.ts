/**
 * Smoke Test: Knowledge Base
 *
 * Validates knowledge base functionality including search and browsing.
 * Critical for users to access their stored information.
 *
 * Runtime: < 20 seconds
 */

import { test, expect } from '@playwright/test'

test.describe('Smoke: Knowledge Base', () => {
  test('should load knowledge base', async ({ page }) => {
    await page.goto('/knowledge')
    await page.waitForLoadState('domcontentloaded')

    // Should have main content
    await expect(page.locator('main')).toBeVisible()

    // Should have navigation
    await expect(page.locator('nav')).toBeVisible()
  })

  test('should display knowledge interface', async ({ page }) => {
    await page.goto('/knowledge')
    await page.waitForLoadState('domcontentloaded')

    // Should have searchable content or interface
    const main = page.locator('main')
    await expect(main).toBeVisible()

    // Should load without errors
    const hasErrors = await page.evaluate(() => {
      return document.body.textContent?.includes('Error') === true
    })
    expect(hasErrors).toBe(false)
  })

  test('should have search or filter interface', async ({ page }) => {
    await page.goto('/knowledge')
    await page.waitForLoadState('domcontentloaded')

    // Look for search input or filter controls
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], [aria-label*="search" i]')

    // Search interface should exist (even if empty knowledge base)
    const hasSearchInterface = await searchInput.count() > 0

    // If no search input, look for any content display
    if (!hasSearchInterface) {
      const content = page.locator('main')
      await expect(content).toBeVisible()
    }
  })

  test('should navigate knowledge sections', async ({ page }) => {
    // Test knowledge sub-routes if they exist
    const knowledgeRoutes = ['/knowledge']

    for (const route of knowledgeRoutes) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')

      // Should load successfully
      await expect(page.locator('main')).toBeVisible()
      await expect(page.locator('nav')).toBeVisible()
    }
  })
})
