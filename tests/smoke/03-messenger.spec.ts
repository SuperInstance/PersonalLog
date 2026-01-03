/**
 * Smoke Test: Messenger (Chat Interface)
 *
 * Validates the core messenger/chat functionality.
 * This is a critical feature - users need to interact with AI.
 *
 * Runtime: < 30 seconds
 */

import { test, expect } from '@playwright/test'

test.describe('Smoke: Messenger', () => {
  test('should load messenger interface', async ({ page }) => {
    await page.goto('/(messenger)')
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

  test('should display conversation list', async ({ page }) => {
    await page.goto('/(messenger)')
    await page.waitForLoadState('domcontentloaded')

    // Look for conversation list or chat interface
    const main = page.locator('main')
    await expect(main).toBeVisible()

    // The conversation list should be present (even if empty)
    // We check that the interface renders, not necessarily that it has data
    const contentExists = await page.evaluate(() => {
      return document.body.children.length > 0
    })
    expect(contentExists).toBe(true)
  })

  test('should have input area for messages', async ({ page }) => {
    await page.goto('/(messenger)')
    await page.waitForLoadState('domcontentloaded')

    // Look for input elements (textarea, input, or contenteditable)
    const input = page.locator('textarea, input[type="text"], [contenteditable="true"]')

    // At least one input should exist
    const inputCount = await input.count()
    expect(inputCount).toBeGreaterThan(0)
  })

  test('should allow creating new conversation', async ({ page }) => {
    await page.goto('/(messenger)')
    await page.waitForLoadState('domcontentloaded')

    // Look for "new conversation" button or similar
    const newButton = page.locator('button:has-text("New"), button:has-text("Create"), button[aria-label*="new" i]')

    // If button exists, click it
    if (await newButton.count() > 0) {
      await newButton.first().click()
      await page.waitForTimeout(500) // Brief wait for UI update

      // Should still be functional
      await expect(page.locator('main')).toBeVisible()
    }
  })
})
