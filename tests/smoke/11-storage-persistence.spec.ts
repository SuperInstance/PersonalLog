/**
 * Smoke Test: Storage & Persistence
 *
 * Validates that the app can store and retrieve data.
 * Critical for user data persistence.
 *
 * Runtime: < 15 seconds
 */

import { test, expect } from '@playwright/test'

test.describe('Smoke: Storage & Persistence', () => {
  test('should have localStorage available', async ({ page }) => {
    await page.goto('/')

    // Check localStorage is accessible
    const localStorageWorks = await page.evaluate(() => {
      try {
        localStorage.setItem('test', 'test')
        localStorage.removeItem('test')
        return true
      } catch (e) {
        return false
      }
    })

    expect(localStorageWorks).toBe(true)
  })

  test('should have IndexedDB available', async ({ page }) => {
    await page.goto('/')

    // Check IndexedDB is accessible
    const indexedDBWorks = await page.evaluate(() => {
      return 'indexedDB' in window
    })

    expect(indexedDBWorks).toBe(true)
  })

  test('should persist settings across navigation', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('domcontentloaded')

    // Set a test value in localStorage
    await page.evaluate(() => {
      localStorage.setItem('smoke_test', 'active')
    })

    // Navigate away
    await page.goto('/knowledge')
    await page.waitForLoadState('domcontentloaded')

    // Navigate back
    await page.goto('/settings')
    await page.waitForLoadState('domcontentloaded')

    // Value should persist
    const testValue = await page.evaluate(() => {
      return localStorage.getItem('smoke_test')
    })

    expect(testValue).toBe('active')

    // Cleanup
    await page.evaluate(() => {
      localStorage.removeItem('smoke_test')
    })
  })

  test('should persist settings across page refresh', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('domcontentloaded')

    // Set a test value
    await page.evaluate(() => {
      localStorage.setItem('smoke_test_refresh', 'persistent')
    })

    // Refresh page
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    // Value should persist
    const testValue = await page.evaluate(() => {
      return localStorage.getItem('smoke_test_refresh')
    })

    expect(testValue).toBe('persistent')

    // Cleanup
    await page.evaluate(() => {
      localStorage.removeItem('smoke_test_refresh')
    })
  })
})
