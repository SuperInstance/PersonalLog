/**
 * Mobile Performance Monitor
 *
 * Tracks mobile-specific performance metrics:
 * - Core Web Vitals (LCP, FID, CLS)
 * - Resource loading times
 * - Frame rate (FPS)
 * - Memory usage
 *
 * @module mobile/monitoring
 */

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number // Largest Contentful Paint (target: <2.5s)
  fid?: number // First Input Delay (target: <100ms)
  cls?: number // Cumulative Layout Shift (target: <0.1)

  // Resource timing
  ttfb?: number // Time to First Byte (target: <600ms)
  fcp?: number // First Contentful Paint (target: <1.8s)
  tti?: number // Time to Interactive (target: <3.8s)

  // Custom metrics
  loadTime?: number // Page load time
  domContentLoaded?: number // DOM ready time

  // Mobile-specific
  fps?: number // Frame rate
  memory?: number // Memory usage in MB
}

/**
 * Measure Core Web Vitals
 */
export function measureCoreWebVitals(): Promise<PerformanceMetrics> {
  return new Promise((resolve) => {
    const metrics: PerformanceMetrics = {}

    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1] as any
          metrics.lcp = lastEntry.renderedTime || lastEntry.loadTime
          lcpObserver.disconnect()
          checkComplete()
        })

        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      } catch (e) {
        console.warn('LCP observer not supported')
        checkComplete()
      }
    } else {
      checkComplete()
    }

    // First Input Delay (FID)
    if ('PerformanceObserver' in window) {
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const firstInput = entries[0] as any
          metrics.fid = firstInput.processingStart - firstInput.startTime
          fidObserver.disconnect()
          checkComplete()
        })

        fidObserver.observe({ entryTypes: ['first-input'] })
      } catch (e) {
        console.warn('FID observer not supported')
        checkComplete()
      }
    } else {
      checkComplete()
    }

    // Cumulative Layout Shift (CLS)
    if ('PerformanceObserver' in window) {
      try {
        let clsValue = 0
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value
            }
          }
          metrics.cls = clsValue
        })

        clsObserver.observe({ entryTypes: ['layout-shift'] })

        // Stop measuring after 5 seconds
        setTimeout(() => {
          clsObserver.disconnect()
          checkComplete()
        }, 5000)
      } catch (e) {
        console.warn('CLS observer not supported')
        checkComplete()
      }
    } else {
      checkComplete()
    }

    let completed = 0
    const total = 3

    function checkComplete() {
      completed++
      if (completed >= total) {
        resolve(metrics)
      }
    }

    // Timeout after 10 seconds
    setTimeout(() => {
      resolve(metrics)
    }, 10000)
  })
}

/**
 * Measure resource timing
 */
export function measureResourceTiming(): PerformanceMetrics {
  const metrics: PerformanceMetrics = {}

  if ('performance' in window && 'getEntriesByType' in performance) {
    const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]

    if (navigationEntries.length > 0) {
      const navigation = navigationEntries[0]
      metrics.ttfb = navigation.responseStart - navigation.requestStart
      metrics.loadTime = navigation.loadEventEnd - navigation.fetchStart
      metrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart
    }

    // First Contentful Paint
    const paintEntries = performance.getEntriesByType('paint')
    for (const entry of paintEntries) {
      if (entry.name === 'first-contentful-paint') {
        metrics.fcp = entry.startTime
        break
      }
    }
  }

  return metrics
}

/**
 * Measure frame rate (FPS)
 */
export function measureFPS(duration: number = 5000): Promise<number> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'undefined') {
      resolve(0)
      return
    }

    let frames = 0
    const startTime = performance.now()

    function countFrames() {
      frames++
      const elapsed = performance.now() - startTime

      if (elapsed < duration) {
        requestAnimationFrame(countFrames)
      } else {
        const fps = (frames / duration) * 1000
        resolve(Math.round(fps))
      }
    }

    requestAnimationFrame(countFrames)
  })
}

/**
 * Measure memory usage (if available)
 */
export function measureMemory(): number | undefined {
  if ('memory' in performance) {
    const memory = (performance as any).memory
    return Math.round(memory.usedJSHeapSize / 1048576) // Convert to MB
  }
  return undefined
}

/**
 * Get all mobile performance metrics
 */
export async function getAllMobileMetrics(): Promise<PerformanceMetrics> {
  const [webVitals, resourceMetrics] = await Promise.all([
    measureCoreWebVitals(),
    Promise.resolve(measureResourceTiming()),
  ])

  const fps = await measureFPS(5000)
  const memory = measureMemory()

  return {
    ...webVitals,
    ...resourceMetrics,
    fps,
    memory,
  }
}

/**
 * Log performance metrics to console (for debugging)
 */
export function logPerformanceMetrics(metrics: PerformanceMetrics): void {
  if (process.env.NODE_ENV !== 'development') return

  console.group('🚀 Mobile Performance Metrics')

  if (metrics.lcp) console.log(`LCP: ${metrics.lcp.toFixed(0)}ms (target: <2500ms)`)
  if (metrics.fid) console.log(`FID: ${metrics.fid.toFixed(0)}ms (target: <100ms)`)
  if (metrics.cls) console.log(`CLS: ${metrics.cls.toFixed(3)} (target: <0.1)`)
  if (metrics.ttfb) console.log(`TTFB: ${metrics.ttfb.toFixed(0)}ms (target: <600ms)`)
  if (metrics.fcp) console.log(`FCP: ${metrics.fcp.toFixed(0)}ms (target: <1800ms)`)
  if (metrics.loadTime) console.log(`Load Time: ${metrics.loadTime.toFixed(0)}ms`)
  if (metrics.fps) console.log(`FPS: ${metrics.fps} (target: ≥60)`)
  if (metrics.memory) console.log(`Memory: ${metrics.memory}MB`)

  console.groupEnd()
}
