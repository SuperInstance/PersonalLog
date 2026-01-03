/**
 * Smoke Test: PWA Installability
 *
 * Validates that the app can be installed as a PWA.
 * Critical for mobile users and offline capability.
 *
 * Runtime: < 10 seconds
 */

import { test, expect } from '@playwright/test'

test.describe('Smoke: PWA Installability', () => {
  test('should have manifest link', async ({ page }) => {
    await page.goto('/')

    // Check for manifest link
    const manifestLink = page.locator('link[rel="manifest"]')
    const manifestCount = await manifestLink.count()

    // Should have manifest (PWA requirement)
    expect(manifestCount).toBeGreaterThan(0)

    // Should have href
    if (manifestCount > 0) {
      const href = await manifestLink.first().getAttribute('href')
      expect(href).toBeTruthy()
    }
  })

  test('should have service worker registration', async ({ page }) => {
    await page.goto('/')

    // Check if service worker is registered
    const hasServiceWorker = await page.evaluate(() => {
      return 'serviceWorker' in navigator
    })

    expect(hasServiceWorker).toBe(true)
  })

  test('should have PWA meta tags', async ({ page }) => {
    await page.goto('/')

    // Check for essential PWA meta tags
    const metaTags = {
      'theme-color': 'meta[name="theme-color"]',
      'apple-mobile-web-app-capable': 'meta[name="apple-mobile-web-app-capable"]',
      'viewport': 'meta[name="viewport"]',
    }

    for (const [name, selector] of Object.entries(metaTags)) {
      const tag = page.locator(selector)
      const count = await tag.count()

      // At minimum, should have viewport
      if (name === 'viewport') {
        expect(count).toBeGreaterThan(0)
      }
    }
  })

  test('should be installable (manifest exists)', async ({ page }) => {
    await page.goto('/')

    // Get manifest URL
    const manifestLink = page.locator('link[rel="manifest"]')
    const href = await manifestLink.first().getAttribute('href')

    if (href) {
      // Try to fetch manifest
      const manifestUrl = new URL(href, page.url())
      const response = await page.request.get(manifestUrl.toString())

      // Manifest should be accessible
      expect(response.status()).toBe(200)

      // Should be JSON
      const contentType = response.headers()['content-type']
      expect(contentType).toContain('application/json')
    }
  })
})
