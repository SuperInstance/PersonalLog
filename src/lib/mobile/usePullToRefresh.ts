/**
 * Pull to Refresh Hook
 *
 * Implements pull-to-refresh gesture for mobile devices.
 * Provides visual feedback during pull and triggers refresh callback.
 *
 * @module mobile/refresh
 */

import { useEffect, RefObject, useState } from 'react'

export interface PullToRefreshOptions {
  threshold?: number // Distance to trigger refresh (default: 80px)
  debounce?: number // Debounce time in ms (default: 500ms)
  disabled?: boolean
}

export function usePullToRefresh<T extends HTMLElement>(
  ref: RefObject<T>,
  onRefresh: () => Promise<void> | void,
  options: PullToRefreshOptions = {}
) {
  const {
    threshold = 80,
    debounce = 500,
    disabled = false,
  } = options

  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [shouldRefresh, setShouldRefresh] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element || disabled) return

    let startY = 0
    let currentY = 0
    let isDragging = false
    let lastRefreshTime = 0

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      startY = touch.clientY
      currentY = startY

      // Only enable pull-to-refresh when at the top
      const scrollTop = element.scrollTop
      if (scrollTop === 0) {
        isDragging = true
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return

      const touch = e.touches[0]
      currentY = touch.clientY
      const distance = Math.max(0, currentY - startY)

      // Apply resistance
      const resistedDistance = distance * 0.4
      setPullDistance(resistedDistance)

      // Check if threshold reached
      if (resistedDistance >= threshold && !shouldRefresh) {
        setShouldRefresh(true)
        if (typeof navigator.vibrate === 'function') {
          navigator.vibrate(50) // Haptic feedback
        }
      } else if (resistedDistance < threshold && shouldRefresh) {
        setShouldRefresh(false)
      }
    }

    const handleTouchEnd = async () => {
      if (!isDragging) return
      isDragging = false

      if (shouldRefresh) {
        const now = Date.now()
        // Debounce refresh
        if (now - lastRefreshTime >= debounce) {
          lastRefreshTime = now
          setIsRefreshing(true)
          setPullDistance(0)
          setShouldRefresh(false)

          try {
            await onRefresh()
          } catch (error) {
            console.error('Pull-to-refresh failed:', error)
          } finally {
            setIsRefreshing(false)
          }
        }
      } else {
        setPullDistance(0)
        setShouldRefresh(false)
      }
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [ref, onRefresh, threshold, debounce, disabled, shouldRefresh])

  return {
    pullDistance,
    isRefreshing,
    shouldRefresh,
    progress: Math.min(pullDistance / threshold, 1),
  }
}
