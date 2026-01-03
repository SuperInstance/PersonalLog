/**
 * Smoke Test: App Initialization
 *
 * Validates that the application loads and initializes correctly.
 * This is the most critical smoke test - if this fails, nothing else matters.
 *
 * Runtime: < 10 seconds
 */

import { test, expect } from '@playwright/test'

test.describe('Smoke: App Initialization', () => {
  test('should load the application without errors', async ({ page }) => {
    // Track console errors
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Navigate to app
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Should have loaded successfully
    expect(page.url()).toBe('http://localhost:3002/')

    // Should have no critical errors
    const criticalErrors = errors.filter(e =>
      e.includes('TypeError') ||
      e.includes('ReferenceError') ||
      e.includes('Cannot read') ||
      e.includes('Failed to fetch')
    )
    expect(criticalErrors.length).toBe(0)
  })

  test('should display main UI components', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Should have navigation
    const nav = page.locator('nav')
    await expect(nav).toBeVisible()

    // Should have main content area
    const main = page.locator('main')
    await expect(main).toBeVisible()

    // Should be responsive (viewport set)
    const viewport = page.viewportSize()
    expect(viewport).toBeTruthy()
  })

  test('should initialize within acceptable time', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    const loadTime = Date.now() - startTime

    // Should load in under 3 seconds for smoke test
    expect(loadTime).toBeLessThan(3000)
  })

  test('should handle browser refresh', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Refresh the page
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    // Should still work
    await expect(page.locator('nav')).toBeVisible()
    await expect(page.locator('main')).toBeVisible()
  })
})
