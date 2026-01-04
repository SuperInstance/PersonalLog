/**
 * Mobile Detection Hook
 *
 * Detects mobile device characteristics and viewport.
 * Provides information about device type, orientation, and capabilities.
 *
 * @module mobile/detection
 */

import { useState, useEffect } from 'react'

export interface DeviceInfo {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isTouch: boolean
  isPortrait: boolean
  isLandscape: boolean
  screenWidth: number
  screenHeight: number
  pixelRatio: number
  viewportWidth: number
  viewportHeight: number
}

const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
}

export function useMobileDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => getDeviceInfo())

  useEffect(() => {
    // Update device info on resize and orientation change
    const handleResize = () => {
      setDeviceInfo(getDeviceInfo())
    }

    const handleOrientationChange = () => {
      // Slight delay to allow orientation to complete
      setTimeout(() => {
        setDeviceInfo(getDeviceInfo())
      }, 100)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleOrientationChange)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [])

  return deviceInfo
}

function getDeviceInfo(): DeviceInfo {
  const screenWidth = window.screen.width
  const screenHeight = window.screen.height
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const pixelRatio = window.devicePixelRatio || 1

  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  // Determine device type based on viewport width
  const isMobile = viewportWidth < BREAKPOINTS.mobile
  const isTablet = viewportWidth >= BREAKPOINTS.mobile && viewportWidth < BREAKPOINTS.tablet
  const isDesktop = viewportWidth >= BREAKPOINTS.tablet

  // Determine orientation
  const isPortrait = viewportHeight > viewportWidth
  const isLandscape = viewportWidth > viewportHeight

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouch,
    isPortrait,
    isLandscape,
    screenWidth,
    screenHeight,
    pixelRatio,
    viewportWidth,
    viewportHeight,
  }
}

/**
 * Quick check if current device is mobile
 */
export function isMobileDevice(): boolean {
  return getDeviceInfo().isMobile
}

/**
 * Quick check if current device has touch capability
 */
export function isTouchDevice(): boolean {
  return getDeviceInfo().isTouch
}
