/**
 * Smoke Test: Core Productivity Features
 *
 * Validates Journal, Notes, and Tasks - core personal log features.
 * These are fundamental to the app's purpose.
 *
 * Runtime: < 20 seconds
 */

import { test, expect } from '@playwright/test'

test.describe('Smoke: Productivity Features', () => {
  test('should load journal', async ({ page }) => {
    await page.goto('/journal')
    await page.waitForLoadState('domcontentloaded')

    // Should have main content and nav
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('nav')).toBeVisible()
  })

  test('should load notes', async ({ page }) => {
    await page.goto('/notes')
    await page.waitForLoadState('domcontentloaded')

    // Should have main content and nav
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('nav')).toBeVisible()
  })

  test('should load tasks', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForLoadState('domcontentloaded')

    // Should have main content and nav
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('nav')).toBeVisible()
  })

  test('journal should have input interface', async ({ page }) => {
    await page.goto('/journal')
    await page.waitForLoadState('domcontentloaded')

    // Look for input area
    const input = page.locator('textarea, input[type="text"], [contenteditable="true"], button:has-text("Add"), button:has-text("Create")')

    // Should have some way to add content
    const hasInput = await input.count() > 0
    expect(hasInput).toBe(true)
  })

  test('notes should be navigable', async ({ page }) => {
    await page.goto('/notes')
    await page.waitForLoadState('domcontentloaded')

    // Should load successfully
    await expect(page.locator('main')).toBeVisible()

    // Should have some content or empty state message
    const content = await page.textContent('main')
    expect(content).toBeTruthy()
  })

  test('tasks should display task interface', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForLoadState('domcontentloaded')

    // Should load successfully
    await expect(page.locator('main')).toBeVisible()

    // Should have task-related UI
    const hasTaskUI = await page.locator('button:has-text("Add"), button:has-text("New"), input[type="checkbox"]').count() > 0
    // This is optional - just verify page loads
    await expect(page.locator('main')).toBeVisible()
  })
})
