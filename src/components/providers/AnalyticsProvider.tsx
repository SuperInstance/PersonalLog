/**
 * Analytics Provider
 *
 * Provides privacy-first analytics functionality to the application.
 * Handles user consent and non-blocking initialization.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { track, isTrackingEnabled } = useAnalytics()
 *
 *   const handleClick = () => {
 *     if (isTrackingEnabled) {
 *       track('button_clicked', { feature: 'my-component' })
 *     }
 *   }
 * }
 * ```
 */

'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { analytics } from '@/lib/analytics'
import type { AnalyticsContextValue, ProvidersConfig } from './types'

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null)

export interface AnalyticsProviderProps {
  /** Provider configuration */
  config?: ProvidersConfig['analytics']

  /** Children components */
  children: React.ReactNode
}

/**
 * Analytics Provider Component
 */
export function AnalyticsProvider({ config, children }: AnalyticsProviderProps) {
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(config?.enabled ?? true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize analytics
  useEffect(() => {
    if (typeof window === 'undefined') {
      // Server-side - skip initialization
      setIsLoading(false)
      return
    }

    let mounted = true

    const initialize = async () => {
      try {
        // If consent is required and not granted, skip initialization
        if (config?.requireConsent && !isTrackingEnabled) {
          console.info('[AnalyticsProvider] Consent required, skipping initialization')
          setIsLoading(false)
          return
        }

        await analytics.initialize({
          retentionDays: config?.retentionDays ?? 90,
          enabled: isTrackingEnabled,
        })

        if (mounted) {
          setIsInitialized(true)
          setIsLoading(false)
        }
      } catch (err) {
        if (mounted) {
          const error = err instanceof Error ? err : new Error(String(err))
          console.error('[AnalyticsProvider] Initialization failed:', error)
          setError(error)
          setIsLoading(false)
        }
      }
    }

    initialize()

    return () => {
      mounted = false
    }
  }, [config, isTrackingEnabled])

  // Track an event
  const track = useCallback(async (type: any, data: any) => {
    if (!isTrackingEnabled) {
      return
    }

    try {
      await analytics.track(type, data)
    } catch (err) {
      console.error('[AnalyticsProvider] Track failed:', err)
    }
  }, [isTrackingEnabled])

  // Flush pending events
  const flush = useCallback(async () => {
    try {
      // AnalyticsAPI doesn't have a flush method directly,
      // but the EventCollector does. We'll need to access it differently
      // or just ignore for now since analytics auto-flushes
    } catch (err) {
      console.error('[AnalyticsProvider] Flush failed:', err)
    }
  }, [])

  // Get statistics
  const getStats = useCallback(async (days?: number) => {
    try {
      const storageInfo = await analytics.data.getStorageInfo()
      return {
        totalEvents: storageInfo.totalEvents,
        storageSize: storageInfo.storageSize,
        retentionDays: storageInfo.retentionDays,
      }
    } catch (err) {
      console.error('[AnalyticsProvider] Get stats failed:', err)
      return {
        totalEvents: 0,
        storageSize: 0,
        retentionDays: config?.retentionDays ?? 90,
      }
    }
  }, [config])

  // Export data
  const exportData = useCallback(async (days?: number) => {
    try {
      return await analytics.data.export(days ?? 30)
    } catch (err) {
      console.error('[AnalyticsProvider] Export failed:', err)
      throw err
    }
  }, [])

  // Delete data
  const deleteData = useCallback(async (days: number) => {
    try {
      await analytics.data.delete(days)
    } catch (err) {
      console.error('[AnalyticsProvider] Delete failed:', err)
      throw err
    }
  }, [])

  // Set tracking enabled
  const setTrackingEnabled = useCallback((enabled: boolean) => {
    setIsTrackingEnabled(enabled)
    analytics.updateConfig({ enabled })
  }, [])

  // Get configuration
  const getConfig = useCallback(() => {
    return analytics.getConfig()
  }, [])

  // Update configuration
  const updateConfig = useCallback((newConfig: any) => {
    analytics.updateConfig(newConfig)
  }, [])

  const contextValue: AnalyticsContextValue = {
    track,
    flush,
    getStats,
    exportData,
    deleteData,
    isTrackingEnabled,
    setTrackingEnabled,
    getConfig,
    updateConfig,
    isLoading,
    error,
    isInitialized,
  }

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  )
}

/**
 * Hook to access analytics context
 */
export function useAnalytics(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext)

  if (!context) {
    throw new Error('useAnalytics must be used within AnalyticsProvider')
  }

  return context
}
