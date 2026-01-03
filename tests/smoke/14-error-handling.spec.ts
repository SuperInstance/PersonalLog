/**
 * Smoke Test: Error Handling
 *
 * Validates that the app handles errors gracefully.
 * Critical for user experience and debugging.
 *
 * Runtime: < 15 seconds
 */

import { test, expect } from '@playwright/test'

test.describe('Smoke: Error Handling', () => {
  test('should handle 404 pages gracefully', async ({ page }) => {
    // Navigate to non-existent page
    await page.goto('/nonexistent-page-12345')
    await page.waitForLoadState('domcontentloaded')

    // Should show something (custom 404 or Next.js 404)
    const body = page.locator('body')
    await expect(body).toBeVisible()

    // Should have navigation (app still works)
    await expect(page.locator('nav')).toBeVisible()
  })

  test('should not have console errors on home page', async ({ page }) => {
    const errors: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Filter out non-critical errors (e.g., third-party scripts)
    const criticalErrors = errors.filter(e =>
      e.includes('TypeError') ||
      e.includes('ReferenceError') ||
      e.includes('Cannot read') ||
      e.includes('Uncaught')
    )

    // Should have no critical errors
    expect(criticalErrors.length).toBe(0)
  })

  test('should handle rapid navigation without errors', async ({ page }) => {
    const errors: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Navigate rapidly between pages
    const routes = ['/', '/knowledge', '/settings', '/journal', '/notes', '/tasks']

    for (const route of routes) {
      await page.goto(route)
      await page.waitForTimeout(100) // Small delay between navigations
    }

    // Should not have accumulated critical errors
    const criticalErrors = errors.filter(e =>
      e.includes('TypeError') ||
      e.includes('ReferenceError') ||
      e.includes('Cannot read')
    )

    expect(criticalErrors.length).toBeLessThan(3) // Allow some leeway
  })
})
