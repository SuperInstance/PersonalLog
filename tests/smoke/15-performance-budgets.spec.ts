/**
 * Smoke Test: Performance Budgets
 *
 * Validates that the app meets basic performance budgets.
 * Critical for user experience and retention.
 *
 * Runtime: < 20 seconds
 */

import { test, expect } from '@playwright/test'

test.describe('Smoke: Performance Budgets', () => {
  test('should load home page quickly', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    const loadTime = Date.now() - startTime

    // Should load in under 3 seconds (smoke test budget)
    expect(loadTime).toBeLessThan(3000)
  })

  test('should have reasonable Time to First Byte', async ({ page }) => {
    const startTime = Date.now()

    const response = await page.goto('/')

    if (response) {
      const ttfb = Date.now() - startTime

      // TTFB should be under 1 second
      expect(ttfb).toBeLessThan(1000)
    }
  })

  test('should not have excessive DOM size', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Check DOM size
    const domInfo = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*')
      return {
        totalElements: allElements.length,
        bodyChildren: document.body.children.length,
      }
    })

    // DOM should be reasonable (< 2000 elements for initial load)
    expect(domInfo.totalElements).toBeLessThan(2000)
  })

  test('should load settings pages quickly', async ({ page }) => {
    const settingsPages = ['/settings/system', '/settings/benchmarks', '/settings/features']

    for (const pageUrl of settingsPages) {
      const startTime = Date.now()

      await page.goto(pageUrl)
      await page.waitForLoadState('domcontentloaded')

      const loadTime = Date.now() - startTime

      // Each page should load in under 3 seconds
      expect(loadTime).toBeLessThan(3000)
    }
  })

  test('should not block main thread excessively', async ({ page }) => {
    await page.goto('/')

    // Measure long tasks
    const longTasks = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        // Use PerformanceObserver to detect long tasks
        if ('PerformanceObserver' in window) {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const longTaskCount = entries.filter(
              (entry: any) => entry.duration > 50
            ).length
            resolve(longTaskCount)
            observer.disconnect()
          })

          observer.observe({ entryTypes: ['measure', 'longtask'] })

          // Give it some time to collect
          setTimeout(() => resolve(0), 1000)
        } else {
          resolve(0)
        }
      })
    })

    // Should have minimal long tasks on initial load
    expect(longTasks).toBeLessThan(10)
  })
})
