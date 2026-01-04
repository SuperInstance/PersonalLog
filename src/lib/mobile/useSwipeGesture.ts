/**
 * Swipe Gesture Hook
 *
 * Detects swipe gestures on touch devices.
 * Supports horizontal and vertical swipes with configurable thresholds.
 *
 * @module mobile/gestures
 */

import { useEffect, RefObject } from 'react'

export interface SwipeGestureCallbacks {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
}

export interface SwipeGestureOptions {
  threshold?: number // Minimum distance for swipe (default: 50px)
  restrain?: number // Maximum perpendicular movement (default: 100px)
  allowedTime?: number // Maximum duration (default: 300ms)
}

export function useSwipeGesture<T extends HTMLElement>(
  ref: RefObject<T>,
  callbacks: SwipeGestureCallbacks,
  options: SwipeGestureOptions = {}
) {
  const {
    threshold = 50,
    restrain = 100,
    allowedTime = 300,
  } = options

  useEffect(() => {
    const element = ref.current
    if (!element) return

    let touchStartX = 0
    let touchStartY = 0
    let touchStartTime = 0

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX
      touchStartY = e.changedTouches[0].screenY
      touchStartTime = Date.now()
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].screenX
      const touchEndY = e.changedTouches[0].screenY
      const touchEndTime = Date.now()

      const elapsedTime = touchEndTime - touchStartTime
      if (elapsedTime > allowedTime) return

      const distX = touchEndX - touchStartX
      const distY = touchEndY - touchStartY

      // Check if movement is primarily horizontal or vertical
      if (Math.abs(distX) >= Math.abs(distY)) {
        // Horizontal swipe
        if (Math.abs(distX) >= threshold && Math.abs(distY) <= restrain) {
          if (distX > 0) {
            callbacks.onSwipeRight?.()
          } else {
            callbacks.onSwipeLeft?.()
          }
        }
      } else {
        // Vertical swipe
        if (Math.abs(distY) >= threshold && Math.abs(distX) <= restrain) {
          if (distY > 0) {
            callbacks.onSwipeDown?.()
          } else {
            callbacks.onSwipeUp?.()
          }
        }
      }
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [ref, callbacks, threshold, restrain, allowedTime])
}
