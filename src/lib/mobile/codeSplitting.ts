/**
 * Code Splitting Utilities
 *
 * Dynamic import helpers for code splitting and lazy loading.
 * Reduces initial bundle size by loading components on demand.
 *
 * @module mobile/codeSplitting
 */

import { lazy, ComponentType } from 'react'

/**
 * Lazy load component with loading state
 */
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(importFunc)
}

/**
 * Lazy load with error boundary
 */
export function lazyLoadWithError<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback: ComponentType<any>
): React.LazyExoticComponent<any> {
  return lazy(() => {
    return importFunc().catch((error) => {
      console.error('Failed to load component:', error)
      return { default: fallback }
    })
  })
}

/**
 * Preload component for faster navigation
 */
export function preloadComponent(importFunc: () => Promise<any>): void {
  if (typeof window === 'undefined') return

  // Start loading in background
  importFunc().catch(() => {
    // Ignore errors during preload
  })
}

/**
 * Preload multiple components
 */
export function preloadComponents(importFuncs: Array<() => Promise<any>>): void {
  importFuncs.forEach((importFunc) => preloadComponent(importFunc))
}
