/**
 * Mobile Utilities Index
 *
 * Central export point for all mobile optimization utilities.
 *
 * @module mobile
 */

// Gesture hooks
export { useSwipeGesture } from './useSwipeGesture'
export { usePullToRefresh } from './usePullToRefresh'

// Haptic feedback
export { useHapticFeedback, isHapticSupported } from './useHapticFeedback'

// Device detection
export {
  useMobileDetection,
  isMobileDevice,
  isTouchDevice,
} from './useMobileDetection'

// Lazy loading
export { useLazyLoad, useLazyImage } from './useLazyLoad'

// Performance monitoring
export {
  measureCoreWebVitals,
  measureResourceTiming,
  measureFPS,
  measureMemory,
  getAllMobileMetrics,
  logPerformanceMetrics,
} from './performanceMonitor'

// Types
export type { HapticPattern, HapticFeedbackOptions } from './useHapticFeedback'
export type { DeviceInfo } from './useMobileDetection'
export type { SwipeGestureCallbacks, SwipeGestureOptions } from './useSwipeGesture'
export type { PullToRefreshOptions } from './usePullToRefresh'
export type { LazyLoadOptions } from './useLazyLoad'
export type { PerformanceMetrics } from './performanceMonitor'
