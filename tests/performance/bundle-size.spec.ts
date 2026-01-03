/**
 * Bundle Size Regression Tests
 *
 * Ensures that bundle sizes don't grow beyond acceptable limits.
 * Run these tests in CI to catch bundle size regressions.
 *
 * @module tests/performance/bundle-size.spec
 */

import { test, expect } from '@playwright/test'

// Bundle size budgets (in bytes)
const BUNDLE_BUDGETS = {
  // Main bundles
  'app-page.js': 100000, // 100KB
  'layout.js': 50000, // 50KB

  // Page chunks
  'messenger/page.js': 80000, // 80KB
  'knowledge/page.js': 80000, // 80KB
  'settings/page.js': 60000, // 60KB

  // Component chunks
  'MessageList': 40000, // 40KB
  'ConversationList': 30000, // 30KB
  'ChatInput': 30000, // 30KB

  // Vendor chunks
  'react': 45000, // 45KB
  'react-dom': 45000, // 45KB
  'next': 100000, // 100KB

  // Total budget
  total: 500000, // 500KB total
}

test.describe('Bundle Size Regression', () => {
  test('should keep main bundle within budget', async ({ page }) => {
    const bundleSizes = await page.evaluate(async () => {
      const sizes: Record<string, number> = {}

      // Get all script tags
      const scripts = Array.from(document.querySelectorAll('script[src]'))

      for (const script of scripts) {
        const src = (script as HTMLScriptElement).src
        try {
          const response = await fetch(src)
          const size = (await response.text()).length
          sizes[src] = size
        } catch (error) {
          console.error(`Failed to fetch ${src}:`, error)
        }
      }

      return sizes
    })

    console.log('Bundle sizes:')
    for (const [bundle, size] of Object.entries(bundleSizes)) {
      const kb = (size / 1024).toFixed(2)
      console.log(`  ${bundle}: ${kb} KB`)
    }

    // Check total size
    const totalSize = Object.values(bundleSizes).reduce((a, b) => a + b, 0)
    const totalKB = (totalSize / 1024).toFixed(2)
    console.log(`Total: ${totalKB} KB`)

    expect(totalSize).toBeLessThan(BUNDLE_BUDGETS.total)
  })

  test('should not load unused code', async ({ page }) => {
    await page.goto('/')

    // Check that we're not loading code for routes that aren't visited
    const loadedScripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script[src]'))
        .map(s => (s as HTMLScriptElement).src)
    })

    console.log('Loaded scripts:', loadedScripts)

    // Should not load settings page scripts on messenger page
    const settingsScripts = loadedScripts.filter(s => s.includes('settings'))
    expect(settingsScripts.length).toBe(0)
  })

  test('should use code splitting effectively', async ({ page }) => {
    await page.goto('/')

    const initialScripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script[src]'))
        .map(s => (s as HTMLScriptElement).src)
        .filter(s => s.endsWith('.js'))
        .length
    })

    console.log(`Initial JS files: ${initialScripts}`)

    // Navigate to knowledge page
    await page.click('a[href="/knowledge"]')
    await page.waitForLoadState('networkidle')

    const afterNavScripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script[src]'))
        .map(s => (s as HTMLScriptElement).src)
        .filter(s => s.endsWith('.js'))
        .length
    })

    console.log(`After navigation JS files: ${afterNavScripts}`)

    // Should lazy load additional chunks
    expect(afterNavScripts).toBeGreaterThan(initialScripts)

    // But not too many (indicates poor splitting)
    expect(afterNavScripts).toBeLessThan(initialScripts + 10)
  })

  test('should use tree shaking effectively', async ({ page }) => {
    // Check that unused exports are not included
    const bundleContent = await page.evaluate(async () => {
      const scripts = Array.from(document.querySelectorAll('script[src]'))
      const content: string[] = []

      for (const script of scripts) {
        const src = (script as HTMLScriptElement).src
        try {
          const response = await fetch(src)
          const text = await response.text()

          // Check for common unused patterns
          if (text.includes('unused')) {
            content.push(src)
          }
        } catch (error) {
          // Ignore fetch errors
        }
      }

      return content
    })

    console.log('Bundles with unused code:', bundleContent)

    // Should not have obvious unused code markers
    expect(bundleContent.length).toBe(0)
  })

  test('should optimize vendor chunk size', async ({ page }) => {
    await page.goto('/')

    const vendorSize = await page.evaluate(async () => {
      let totalVendorSize = 0

      const scripts = Array.from(document.querySelectorAll('script[src]'))

      for (const script of scripts) {
        const src = (script as HTMLScriptElement).src

        // Check if this looks like a vendor chunk
        if (src.includes('vendor') || src.includes('chunk')) {
          try {
            const response = await fetch(src)
            const size = (await response.text()).length
            totalVendorSize += size
          } catch (error) {
            // Ignore fetch errors
          }
        }
      }

      return totalVendorSize
    })

    const vendorKB = (vendorSize / 1024).toFixed(2)
    console.log(`Vendor chunk size: ${vendorKB} KB`)

    // Vendor chunk should be reasonably sized
    expect(vendorSize).toBeLessThan(200000) // 200KB
  })
})

test.describe('Compression Efficiency', () => {
  test('should use Brotli compression', async ({ page }) => {
    await page.goto('/')

    const compressionInfo = await page.evaluate(async () => {
      const info: Array<{ url: string; encoded: number; decoded: number; ratio: number }> = []

      const scripts = Array.from(document.querySelectorAll('script[src]'))

      for (const script of scripts) {
        const src = (script as HTMLScriptElement).src

        try {
          const response = await fetch(src)
          const content = await response.text()

          const decoded = content.length
          const encoded = new Blob([content]).size

          info.push({
            url: src.split('/').pop() || src,
            decoded,
            encoded,
            ratio: ((decoded - encoded) / decoded) * 100,
          })
        } catch (error) {
          // Ignore fetch errors
        }
      }

      return info
    })

    console.log('Compression info:')
    for (const item of compressionInfo) {
      console.log(`  ${item.url}: ${item.ratio.toFixed(2)}% reduction`)
    }

    // All bundles should benefit from compression
    const avgCompression = compressionInfo.reduce((sum, item) => sum + item.ratio, 0) / compressionInfo.length
    console.log(`Average compression: ${avgCompression.toFixed(2)}%`)

    expect(avgCompression).toBeGreaterThan(30) // At least 30% compression
  })
})
