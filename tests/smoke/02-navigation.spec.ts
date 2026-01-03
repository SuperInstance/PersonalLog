/**
 * Smoke Test: Navigation
 *
 * Validates that users can navigate between main sections of the app.
 * Critical path testing - users must be able to move around the app.
 *
 * Runtime: < 20 seconds
 */

import { test, expect } from '@playwright/test'

test.describe('Smoke: Navigation', () => {
  test('should navigate to all main sections', async ({ page }) => {
    await page.goto('/')

    // Define main sections based on the app structure
    const sections = [
      { path: '/journal', name: 'Journal' },
      { path: '/notes', name: 'Notes' },
      { path: '/tasks', name: 'Tasks' },
      { path: '/knowledge', name: 'Knowledge' },
      { path: '/chat', name: 'Chat' },
      { path: '/forum', name: 'Forum' },
      { path: '/catalog', name: 'Catalog' },
      { path: '/settings', name: 'Settings' },
    ]

    for (const section of sections) {
      // Try to navigate to section
      const response = await page.goto(section.path)

      // Should navigate successfully (200 or redirect)
      expect(response?.status()).toBeLessThan(400)

      // Should have main content
      await expect(page.locator('main')).toBeVisible()

      // Should have navigation
      await expect(page.locator('nav')).toBeVisible()
    }
  })

  test('should navigate using navigation links', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Find navigation links
    const navLinks = page.locator('nav a[href]').first()

    if (await navLinks.count() > 0) {
      // Click first navigation link
      await navLinks.click()
      await page.waitForLoadState('domcontentloaded')

      // Should navigate
      expect(page.url()).not.toBe('http://localhost:3002/')
    }
  })

  test('should handle browser back button', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Navigate to a section
    await page.goto('/knowledge')
    await page.waitForLoadState('domcontentloaded')

    expect(page.url()).toContain('/knowledge')

    // Go back
    await page.goBack()
    await page.waitForLoadState('domcontentloaded')

    // Should be back on home
    expect(page.url()).toBe('http://localhost:3002/')
  })

  test('should navigate to settings pages', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('domcontentloaded')

    // Settings should load
    await expect(page.locator('main')).toBeVisible()

    // Navigate to system settings
    await page.goto('/settings/system')
    await page.waitForLoadState('domcontentloaded')

    expect(page.url()).toContain('/settings/system')
    await expect(page.locator('main')).toBeVisible()
  })
})
