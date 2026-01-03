'use client'

/**
 * LiveAnnouncer Component
 *
 * Provides ARIA live regions for screen reader announcements.
 *
 * Live regions allow dynamic content updates to be announced to screen readers
 * without the user having to focus on the element.
 *
 * FEATURES:
 * - Toast notifications
 * - Error messages
 * - Loading state changes
 * - Progress updates
 * - Status changes
 *
 * @module components/ui/LiveAnnouncer
 */

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react'

type AnnouncementRole = 'status' | 'alert' | 'assertive' | 'polite'

interface Announcement {
  message: string
  role: AnnouncementRole
  timestamp: number
}

interface LiveAnnouncerContextValue {
  announce: (message: string, role?: AnnouncementRole) => void
  announceStatus: (message: string) => void
  announceAlert: (message: string) => void
  announceProgress: (current: number, total: number, description?: string) => void
}

const LiveAnnouncerContext = createContext<LiveAnnouncerContextValue | undefined>(undefined)

export function useLiveAnnouncer() {
  const context = useContext(LiveAnnouncerContext)
  if (!context) {
    throw new Error('useLiveAnnouncer must be used within LiveAnnouncerProvider')
  }
  return context
}

interface LiveAnnouncerProviderProps {
  children: React.ReactNode
  /** Delay in ms before announcements are cleared (default: 7000) */
  cleanupDelay?: number
}

/**
 * Provider for live region announcements
 *
 * Should be placed at the root of the application to provide
 * global announcement functionality.
 */
export function LiveAnnouncerProvider({
  children,
  cleanupDelay = 7000,
}: LiveAnnouncerProviderProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const announcerRefs = useRef<{
    status: HTMLDivElement | null
    alert: HTMLDivElement | null
  }>({
    status: null,
    alert: null,
  })

  /**
   * Make an announcement to screen readers
   */
  const announce = useCallback((message: string, role: AnnouncementRole = 'status') => {
    const announcement: Announcement = {
      message,
      role,
      timestamp: Date.now(),
    }

    setAnnouncements(prev => [...prev, announcement])

    // Announce using the appropriate live region
    const ref = role === 'alert' || role === 'assertive'
      ? announcerRefs.current.alert
      : announcerRefs.current.status

    if (ref) {
      // Clear content first to re-trigger announcement for same message
      ref.textContent = ''
      // Use setTimeout to ensure the clearing is registered
      setTimeout(() => {
        ref.textContent = message
      }, 50)
    }

    // Cleanup old announcements
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.timestamp !== announcement.timestamp))
    }, cleanupDelay)
  }, [cleanupDelay])

  /**
   * Announce a status update (polite, non-interrupting)
   */
  const announceStatus = useCallback((message: string) => {
    announce(message, 'status')
  }, [announce])

  /**
   * Announce an alert (assertive, interrupting)
   */
  const announceAlert = useCallback((message: string) => {
    announce(message, 'alert')
  }, [announce])

  /**
   * Announce progress update
   */
  const announceProgress = useCallback((current: number, total: number, description?: string) => {
    const percentage = Math.round((current / total) * 100)
    const message = description
      ? `${description}: ${percentage} percent complete`
      : `${percentage} percent complete`

    announce(message, 'status')
  }, [announce])

  const contextValue: LiveAnnouncerContextValue = {
    announce,
    announceStatus,
    announceAlert,
    announceProgress,
  }

  return (
    <LiveAnnouncerContext.Provider value={contextValue}>
      {children}

      {/* Live regions for screen readers */}
      <div
        ref={el => { announcerRefs.current.status = el }}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      <div
        ref={el => { announcerRefs.current.alert = el }}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </LiveAnnouncerContext.Provider>
  )
}

/**
 * Simple hook to announce toast notifications
 *
 * @example
 * ```tsx
 * const { announceToast } = useToastAnnouncer()
 * announceToast('Message sent successfully', 'success')
 * ```
 */
export function useToastAnnouncer() {
  const { announceStatus, announceAlert } = useLiveAnnouncer()

  const announceToast = useCallback((
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info'
  ) => {
    const prefix = {
      success: 'Success',
      error: 'Error',
      info: 'Info',
      warning: 'Warning',
    }[type]

    const fullMessage = `${prefix}: ${message}`

    // Use alert for errors, status for everything else
    if (type === 'error') {
      announceAlert(fullMessage)
    } else {
      announceStatus(fullMessage)
    }
  }, [announceStatus, announceAlert])

  return { announceToast }
}

/**
 * Hook to announce loading state changes
 *
 * @example
 * ```tsx
 * const { announceLoadingStart, announceLoadingEnd, announceLoadingProgress } = useLoadingAnnouncer()
 * announceLoadingStart('Loading messages')
 * announceLoadingProgress(50, 100)
 * announceLoadingEnd('Messages loaded')
 * ```
 */
export function useLoadingAnnouncer() {
  const { announceStatus, announceProgress } = useLiveAnnouncer()

  const announceLoadingStart = useCallback((description?: string) => {
    announceStatus(description || 'Loading...')
  }, [announceStatus])

  const announceLoadingEnd = useCallback((description?: string) => {
    announceStatus(description || 'Loading complete')
  }, [announceStatus])

  const announceLoadingProgress = useCallback((current: number, total: number, description?: string) => {
    announceProgress(current, total, description)
  }, [announceProgress])

  return {
    announceLoadingStart,
    announceLoadingEnd,
    announceLoadingProgress,
  }
}

/**
 * Standalone LiveAnnouncer component
 *
 * Use this if you don't need the context provider, just the live regions.
 * Combined with the useLiveAnnouncer hook from the provider.
 */
export function LiveAnnouncer() {
  return (
    <>
      {/* Polite live region for non-urgent updates */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        aria-label="Status updates"
      />

      {/* Assertive live region for urgent updates */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        aria-label="Important alerts"
      />
    </>
  )
}
