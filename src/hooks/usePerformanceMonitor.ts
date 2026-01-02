/**
 * usePerformanceMonitor Hook
 *
 * Development-only performance monitoring hook for React components.
 * Logs render times to help identify performance bottlenecks.
 *
 * PERFORMANCE USAGE:
 * - Only active in development mode
 * - Measures render time for components
 * - Helps identify slow-rendering components
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   usePerformanceMonitor('MyComponent')
 *   return <div>...</div>
 * }
 * ```
 *
 * @module hooks/usePerformanceMonitor
 */

import { useEffect } from 'react'

/**
 * Performance monitoring hook for React components
 *
 * @param componentName - Name of the component to monitor
 * @param enabled - Enable/disable monitoring (default: true in dev)
 *
 * @remarks
 * This hook uses performance.now() to measure component render time.
 * It only logs in development mode to avoid production overhead.
 */
export function usePerformanceMonitor(componentName: string, enabled: boolean = true) {
  useEffect(() => {
    // Skip if not enabled or not in development
    if (!enabled || process.env.NODE_ENV !== 'development') {
      return
    }

    const startTime = performance.now()

    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Log render time
      if (renderTime > 16) {
        // Log warning if render takes longer than one frame (16ms at 60fps)
        console.warn(
          `[Performance] ${componentName} render took ${renderTime.toFixed(2)}ms ⚠️`
        )
      } else {
        console.log(
          `[Performance] ${componentName} render took ${renderTime.toFixed(2)}ms`
        )
      }
    }
  }, [componentName, enabled])
}

/**
 * Extended performance monitoring with threshold warnings
 *
 * @param componentName - Name of the component to monitor
 * @param thresholdMs - Threshold in ms for warnings (default: 16ms)
 *
 * @example
 * ```tsx
 * function ExpensiveComponent() {
 *   usePerformanceMonitorWithThreshold('ExpensiveComponent', 10)
 *   return <div>...</div>
 * }
 * ```
 */
export function usePerformanceMonitorWithThreshold(
  componentName: string,
  thresholdMs: number = 16
) {
  useEffect(() => {
    // Skip in production
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    const startTime = performance.now()

    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime

      if (renderTime > thresholdMs) {
        console.warn(
          `[Performance] ${componentName} exceeded threshold: ${renderTime.toFixed(2)}ms > ${thresholdMs}ms ⚠️`
        )
      }
    }
  }, [componentName, thresholdMs])
}

/**
 * Performance monitoring with detailed metrics
 *
 * @param componentName - Name of the component to monitor
 * @returns Object with performance metrics
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const metrics = usePerformanceMonitorDetailed('MyComponent')
 *   return <div>{metrics.renderCount} renders</div>
 * }
 * ```
 */
export function usePerformanceMonitorDetailed(componentName: string) {
  useEffect(() => {
    // Skip in production
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    const startTime = performance.now()
    const renderCount = parseInt(sessionStorage.getItem(`perf-${componentName}`) || '0', 10)
    sessionStorage.setItem(`perf-${componentName}`, String(renderCount + 1))

    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      const totalRenders = renderCount + 1

      console.log(
        `[Performance] ${componentName}: #${totalRenders} | ${renderTime.toFixed(2)}ms`
      )
    }
  }, [componentName])
}
