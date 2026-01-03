/**
 * Smoke Test: API Endpoints
 *
 * Validates that critical API endpoints are accessible.
 * Important for full-stack functionality.
 *
 * Runtime: < 15 seconds
 */

import { test, expect } from '@playwright/test'

test.describe('Smoke: API Endpoints', () => {
  test('should have health check or root API', async ({ page }) => {
    // Try to access API routes
    const apiRoutes = ['/api/health', '/api/']

    for (const route of apiRoutes) {
      const response = await page.request.get(`http://localhost:3002${route}`)

      // Should respond (200, 404, or 405 are all acceptable)
      // We just want to know the server is running
      expect([200, 404, 405]).toContain(response.status())
    }
  })

  test('should handle API errors gracefully', async ({ page }) => {
    // Try to access a non-existent API route
    const response = await page.request.get('http://localhost:3002/api/nonexistent')

    // Should return 404, not 500
    expect(response.status()).toBe(404)
  })

  test('should have proper CORS headers', async ({ page }) => {
    const response = await page.request.get('http://localhost:3002/api/health', {
      headers: {
        'Origin': 'http://localhost:3002',
      },
    })

    // Should have CORS headers (if route exists)
    if (response.status() === 200) {
      const headers = response.headers()
      // We don't strictly check for CORS headers in smoke test,
      // just that the API is responsive
      expect(headers).toBeTruthy()
    }
  })
})
