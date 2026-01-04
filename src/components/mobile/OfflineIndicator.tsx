/**
 * Offline Indicator
 *
 * Shows online/offline status with automatic detection.
 * Provides visual feedback for network connectivity.
 *
 * @module mobile/offline
 */

'use client'

import { useEffect, useState } from 'react'
import { WifiOff, Check } from 'lucide-react'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Initial state
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      setShow(true)
      setTimeout(() => setShow(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShow(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!show || isOnline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-slide-in-top">
      <div
        className={`
          flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium shadow-lg
          ${isOnline
            ? 'bg-green-500 text-white'
            : 'bg-slate-800 text-white'
          }
        `}
        role="alert"
        aria-live="polite"
      >
        {isOnline ? (
          <>
            <Check className="w-4 h-4" aria-hidden="true" />
            <span>You&apos;re back online</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" aria-hidden="true" />
            <span>You&apos;re offline. Some features may be limited.</span>
          </>
        )}
      </div>
    </div>
  )
}
