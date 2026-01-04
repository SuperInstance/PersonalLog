/**
 * Lazy Load Hook
 *
 * Implements intersection observer-based lazy loading for images and components.
 * Supports viewport-based loading with configurable thresholds.
 *
 * @module mobile/lazyload
 */

import { useEffect, useState, RefObject } from 'react'

export interface LazyLoadOptions {
  threshold?: number // Intersection threshold (0-1)
  rootMargin?: string // Margin around root
  triggerOnce?: boolean // Only trigger once
  enabled?: boolean
}

export function useLazyLoad<T extends HTMLElement>(
  ref: RefObject<T>,
  options: LazyLoadOptions = {}
) {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = true,
    enabled = true,
  } = options

  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasIntersected, setHasIntersected] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element || !enabled || (triggerOnce && hasIntersected)) return

    // Check if IntersectionObserver is supported
    if (!('IntersectionObserver' in window)) {
      // Fallback: immediately set as intersecting
      setIsIntersecting(true)
      setHasIntersected(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true)
          setHasIntersected(true)

          if (triggerOnce) {
            observer.disconnect()
          }
        } else if (!triggerOnce) {
          setIsIntersecting(false)
        }
      },
      {
        threshold,
        rootMargin,
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [ref, threshold, rootMargin, triggerOnce, enabled, hasIntersected])

  return isIntersecting
}

/**
 * Hook for lazy loading images with src/srcset support
 */
export function useLazyImage(
  ref: RefObject<HTMLImageElement>,
  src: string,
  srcset?: string,
  options?: LazyLoadOptions
) {
  const shouldLoad = useLazyLoad(ref, options || {})
  const [currentSrc, setCurrentSrc] = useState<string>()
  const [currentSrcset, setCurrentSrcset] = useState<string>()

  useEffect(() => {
    if (shouldLoad && !currentSrc) {
      setCurrentSrc(src)
      setCurrentSrcset(srcset)

      // Update the image element
      if (ref.current) {
        if (srcset) ref.current.srcset = srcset
        if (src) ref.current.src = src
      }
    }
  }, [shouldLoad, src, srcset, currentSrc, ref])

  return {
    isLoaded: !!currentSrc,
    currentSrc,
    currentSrcset,
  }
}
