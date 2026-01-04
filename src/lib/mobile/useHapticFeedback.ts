/**
 * Haptic Feedback Hook
 *
 * Provides haptic feedback for mobile devices.
 * Supports different feedback patterns for various UI interactions.
 *
 * @module mobile/haptics
 */

export type HapticPattern =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection'
  | 'impact'

export interface HapticFeedbackOptions {
  enabled?: boolean
  intensity?: number // 0-1 multiplier for vibration intensity
}

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator
}

/**
 * Convert pattern to vibration array
 */
function getVibrationPattern(pattern: HapticPattern, intensity: number = 1): number | number[] {
  const baseIntensity = Math.max(0, Math.min(1, intensity))

  switch (pattern) {
    case 'light':
      return 10 * baseIntensity

    case 'medium':
      return 25 * baseIntensity

    case 'heavy':
      return 50 * baseIntensity

    case 'success':
      return [10 * baseIntensity, 50, 30 * baseIntensity]

    case 'warning':
      return [20 * baseIntensity, 50, 20 * baseIntensity, 50, 20 * baseIntensity]

    case 'error':
      return [50 * baseIntensity, 30, 50 * baseIntensity, 30, 100 * baseIntensity]

    case 'selection':
      return [5 * baseIntensity]

    case 'impact':
      return 15 * baseIntensity

    default:
      return 10 * baseIntensity
  }
}

/**
 * Haptic feedback hook
 */
export function useHapticFeedback(options: HapticFeedbackOptions = {}) {
  const { enabled = true, intensity = 1 } = options
  const supported = isHapticSupported()

  const trigger = (pattern: HapticPattern = 'medium') => {
    if (!enabled || !supported) return

    const vibrationPattern = getVibrationPattern(pattern, intensity)
    navigator.vibrate(vibrationPattern)
  }

  return {
    trigger,
    supported,
    light: () => trigger('light'),
    medium: () => trigger('medium'),
    heavy: () => trigger('heavy'),
    success: () => trigger('success'),
    warning: () => trigger('warning'),
    error: () => trigger('error'),
    selection: () => trigger('selection'),
    impact: () => trigger('impact'),
  }
}
