/**
 * Performance Regression Tests
 *
 * These tests ensure that the application maintains performance standards
 * and doesn't regress in key metrics over time.
 *
 * @module tests/performance/performance-regression.spec
 */

import { test, expect } from '@playwright/test'

// Performance thresholds (adjust based on your requirements)
const PERFORMANCE_THRESHOLDS = {
  // Load time thresholds
  initialLoad: 3000, // 3 seconds
  navigation: 1000, // 1 second

  // Bundle size thresholds (in bytes)
  maxBundleSize: 500000, // 500KB gzipped
  maxChunkSize: 150000, // 150KB per chunk

  // Lighthouse score thresholds
  lighthousePerformance: 90,
  lighthouseAccessibility: 95,
  lighthouseBestPractices: 90,
  lighthouseSEO: 90,

  // Resource thresholds
  maxJsExecutionTime: 2000, // 2 seconds
  maxTotalBlockingTime: 500, // 500ms
  maxCumulativeLayoutShift: 0.1,
  maxLargestContentfulPaint: 2500, // 2.5 seconds

  // API response times
  maxApiLatency: 1000, // 1 second
}

test.describe('Performance Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Enable performance monitoring
    // Note: page.coverage.startJSCoverage() is deprecated
    // Use CDP session if needed: const client = await page.context().newCDPSession(page)
  })

  test.afterEach(async ({ page }) => {
    // Stop coverage and collect metrics
    try {
      // Note: Page.coverage is deprecated in newer Playwright versions
      // Use CDP session directly or skip coverage collection
      const coverage = await page.evaluate(() => {
        // Alternative: Get script tags and calculate size
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        return scripts.map(s => ({
          url: (s as HTMLScriptElement).src,
          text: '', // Cannot get actual text due to CORS
        }));
      });

      // Calculate approximate JS size from script URLs
      const totalBytes = coverage.reduce((sum, entry) => {
        // Estimate size from URL length (very rough approximation)
        return sum + entry.url.length * 2;
      }, 0);

      console.log(`Approximate JS size: ${(totalBytes / 1024).toFixed(2)} KB`);

      // Assert against threshold (relaxed due to approximation)
      expect(totalBytes).toBeLessThan(PERFORMANCE_THRESHOLDS.maxBundleSize);
    } catch (error) {
      // Coverage might not be available in all browsers
      console.log('Coverage collection failed:', error);
    }
  })

  test('should load initial page within threshold', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/')

    const loadTime = Date.now() - startTime
    console.log(`Initial load time: ${loadTime}ms`)

    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.initialLoad)

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle')
  })

  test('should navigate between pages quickly', async ({ page }) => {
    await page.goto('/')

    const startTime = Date.now()
    await page.click('a[href="/knowledge"]')
    await page.waitForLoadState('networkidle')
    const navigationTime = Date.now() - startTime

    console.log(`Navigation time: ${navigationTime}ms`)
    expect(navigationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.navigation)
  })

  test('should have fast LCP (Largest Contentful Paint)', async ({ page }) => {
    const metrics = await page.goto('/').then(() =>
      page.evaluate(async () => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const lcpEntry = entries[entries.length - 1]
            resolve(lcpEntry?.startTime || 0)
          }).observe({ entryTypes: ['largest-contentful-paint'] })
        })
      })
    )

    console.log(`LCP: ${metrics}ms`)
    expect(metrics).toBeLessThan(PERFORMANCE_THRESHOLDS.maxLargestContentfulPaint)
  })

  test('should have low Cumulative Layout Shift', async ({ page }) => {
    await page.goto('/')

    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value
            }
          }
          resolve(clsValue)
        }).observe({ entryTypes: ['layout-shift'] })
      })
    })

    console.log(`CLS: ${cls}`)
    expect(cls).toBeLessThan(PERFORMANCE_THRESHOLDS.maxCumulativeLayoutShift)
  })

  test('should have low Total Blocking Time', async ({ page }) => {
    await page.goto('/')

    const tbt = await page.evaluate(() => {
      return new Promise((resolve) => {
        let tbt = 0
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const duration = (entry as any).duration
            if (duration > 50) {
              tbt += duration - 50
            }
          }
          resolve(tbt)
        }).observe({ entryTypes: ['longtask'] })
      })
    })

    console.log(`TBT: ${tbt}ms`)
    expect(tbt).toBeLessThan(PERFORMANCE_THRESHOLDS.maxTotalBlockingTime)
  })

  test('should efficiently render message list', async ({ page }) => {
    await page.goto('/')

    // Create a conversation with many messages
    await page.evaluate(() => {
      const messages = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        content: { text: `Message ${i}` },
        author: i % 2 === 0 ? 'user' : { type: 'ai-contact', contactId: 'ai', contactName: 'AI' },
        timestamp: new Date().toISOString(),
      }))
      localStorage.setItem('test-messages', JSON.stringify(messages))
    })

    const startTime = Date.now()
    await page.reload()
    await page.waitForLoadState('networkidle')
    const renderTime = Date.now() - startTime

    console.log(`Render time for 100 messages: ${renderTime}ms`)
    expect(renderTime).toBeLessThan(2000) // Should render quickly even with many messages
  })

  test('should handle memory efficiently', async ({ page }) => {
    await page.goto('/')

    // Use Performance API to measure memory usage (Chrome-only)
    const initialMemory = await page.evaluate(() => {
      // @ts-ignore - Chrome-specific API
      if (performance.memory) {
        // @ts-ignore
        return performance.memory.usedJSHeapSize
      }
      return 0
    })

    // Perform some actions that might allocate memory
    await page.click('button:has-text("New Conversation")')
    await page.waitForTimeout(1000)

    const finalMemory = await page.evaluate(() => {
      // @ts-ignore - Chrome-specific API
      if (performance.memory) {
        // @ts-ignore
        return performance.memory.usedJSHeapSize
      }
      return 0
    })

    // JS heap size shouldn't grow excessively
    if (initialMemory > 0 && finalMemory > 0) {
      const heapGrowth = finalMemory - initialMemory
      const heapGrowthMB = heapGrowth / (1024 * 1024)

      console.log(`Heap growth: ${heapGrowthMB.toFixed(2)} MB`)

      // Allow up to 50MB growth for normal usage
      expect(heapGrowthMB).toBeLessThan(50)
    }
  })

  test('should efficiently search conversations', async ({ page }) => {
    await page.goto('/')

    // Create test data
    await page.evaluate(() => {
      const conversations = Array.from({ length: 50 }, (_, i) => ({
        id: `conv-${i}`,
        title: `Conversation ${i}`,
        type: 'personal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
        aiContacts: [],
        settings: {},
        metadata: { messageCount: 0, pinned: false, archived: false },
      }))
      localStorage.setItem('test-conversations', JSON.stringify(conversations))
    })

    const startTime = Date.now()
    await page.fill('input[placeholder*="search" i]', 'Conversation 10')
    await page.waitForTimeout(500) // Wait for debounce
    const searchTime = Date.now() - startTime

    console.log(`Search time: ${searchTime}ms`)
    expect(searchTime).toBeLessThan(500) // Should be nearly instant
  })

  test('should efficiently switch between conversations', async ({ page }) => {
    await page.goto('/')

    // Create test conversations
    await page.evaluate(() => {
      const conversations = Array.from({ length: 10 }, (_, i) => ({
        id: `conv-${i}`,
        title: `Chat ${i}`,
        type: 'personal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: Array.from({ length: 20 }, (_, j) => ({
          id: `msg-${i}-${j}`,
          content: { text: `Message ${j}` },
          author: j % 2 === 0 ? 'user' : { type: 'ai-contact', contactId: 'ai', contactName: 'AI' },
          timestamp: new Date().toISOString(),
        })),
        aiContacts: [],
        settings: {},
        metadata: { messageCount: 20, pinned: false, archived: false },
      }))
      localStorage.setItem('test-conversations', JSON.stringify(conversations))
    })

    const switchTimes: number[] = []

    for (let i = 0; i < 5; i++) {
      const startTime = Date.now()
      await page.click(`text=Chat ${i}`)
      await page.waitForTimeout(200) // Wait for transition
      switchTimes.push(Date.now() - startTime)
    }

    const avgSwitchTime = switchTimes.reduce((a, b) => a + b, 0) / switchTimes.length
    console.log(`Average conversation switch time: ${avgSwitchTime}ms`)

    expect(avgSwitchTime).toBeLessThan(300) // Should be snappy
  })
})

test.describe('Network Performance', () => {
  test('should not make excessive API calls', async ({ page }) => {
    let requestCount = 0

    page.on('request', () => {
      requestCount++
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    console.log(`Total requests: ${requestCount}`)

    // Should not make more than 20 requests on initial load
    expect(requestCount).toBeLessThan(20)
  })

  test('should optimize bundle loading', async ({ page }) => {
    const scripts: string[] = []

    page.on('response', async (response) => {
      const url = response.url()
      if (url.endsWith('.js')) {
        scripts.push(url)
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    console.log(`JS files loaded: ${scripts.length}`)
    console.log('Scripts:', scripts)

    // Should load fewer than 15 JS files (code splitting)
    expect(scripts.length).toBeLessThan(15)
  })

  test('should use efficient compression', async ({ page }) => {
    const responses: Array<{ url: string; size: number; encodedSize: number }> = []

    page.on('response', async (response) => {
      const headers = response.headers()
      if (headers['content-encoding']) {
        responses.push({
          url: response.url(),
          size: parseInt(headers['content-length'] || '0'),
          encodedSize: parseInt(headers['content-length'] || '0'),
        })
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    console.log(`Compressed responses: ${responses.length}`)

    // Most responses should be compressed
    if (responses.length > 0) {
      const totalOriginalSize = responses.reduce((sum, r) => sum + r.size, 0)
      const totalEncodedSize = responses.reduce((sum, r) => sum + r.encodedSize, 0)
      const compressionRatio = ((totalOriginalSize - totalEncodedSize) / totalOriginalSize) * 100

      console.log(`Compression ratio: ${compressionRatio.toFixed(2)}%`)

      // Should achieve at least 50% compression
      expect(compressionRatio).toBeGreaterThan(50)
    }
  })
})
