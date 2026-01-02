/**
 * Integration Provider
 *
 * Provides integration system state and capabilities to the application.
 * Handles non-blocking initialization of the IntegrationManager.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { capabilities, isFeatureEnabled } = useIntegration()
 *
 *   if (isFeatureEnabled('ai-chat')) {
 *     return <AIChat />
 *   }
 * }
 * ```
 */

'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getIntegrationManager } from '@/lib/integration'
import type { IntegrationContextValue, ProvidersConfig } from './types'

const IntegrationContext = createContext<IntegrationContextValue | null>(null)

export interface IntegrationProviderProps {
  /** Provider configuration */
  config?: ProvidersConfig['integration']

  /** Children components */
  children: React.ReactNode
}

/**
 * Integration Provider Component
 */
export function IntegrationProvider({ config, children }: IntegrationProviderProps) {
  const [state, setState] = useState(getIntegrationManager().getState())
  const [capabilities, setCapabilities] = useState(getIntegrationManager().getCapabilities())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize integration system
  useEffect(() => {
    if (typeof window === 'undefined') {
      // Server-side - skip initialization
      setIsLoading(false)
      return
    }

    let mounted = true
    const manager = getIntegrationManager()
    const timeout = config?.timeout ?? 10000

    // Update state when manager emits events
    const handleProgress = (progress: { stage: string; progress: number }) => {
      if (mounted) {
        setState(manager.getState())
      }
    }

    const handleStatusChange = () => {
      if (mounted) {
        setState(manager.getState())
        setCapabilities(manager.getCapabilities())
      }
    }

    const handleCapabilitiesUpdate = () => {
      if (mounted) {
        setCapabilities(manager.getCapabilities())
      }
    }

    const handleError = (err: Error) => {
      if (mounted) {
        setError(err)
        setIsLoading(false)
      }
    }

    // Subscribe to events
    manager.on('initialization_progress', handleProgress)
    manager.on('system_status_changed', handleStatusChange)
    manager.on('capabilities_updated', handleCapabilitiesUpdate)
    manager.on('error', handleError)

    // Initialize
    const initialize = async () => {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Integration initialization timeout')), timeout)
        )

        await Promise.race([
          manager.initialize({
            debug: config?.debug ?? false,
            runBenchmarks: config?.runBenchmarks ?? true,
          }),
          timeoutPromise,
        ])

        if (mounted) {
          setState(manager.getState())
          setCapabilities(manager.getCapabilities())
          setIsInitialized(true)
          setIsLoading(false)
        }
      } catch (err) {
        if (mounted) {
          const error = err instanceof Error ? err : new Error(String(err))
          console.error('[IntegrationProvider] Initialization failed:', error)
          setError(error)
          setIsLoading(false)

          // Still update state even if initialization failed
          setState(manager.getState())
          setCapabilities(manager.getCapabilities())
        }
      }
    }

    initialize()

    return () => {
      mounted = false
      // Cleanup event listeners would be nice, but manager doesn't support off()
    }
  }, [config])

  // Check if a feature is enabled
  const isFeatureEnabled = useCallback((featureId: string): boolean => {
    return getIntegrationManager().isFeatureEnabled(featureId)
  }, [])

  // Get list of enabled features
  const getEnabledFeatures = useCallback((): string[] => {
    return getIntegrationManager().getEnabledFeatures()
  }, [])

  // Run diagnostics
  const runDiagnostics = useCallback(async () => {
    return getIntegrationManager().runDiagnostics()
  }, [])

  // Reinitialize
  const reinitialize = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const manager = getIntegrationManager()
      await manager.initialize({
        debug: config?.debug ?? false,
        runBenchmarks: config?.runBenchmarks ?? true,
      })

      setState(manager.getState())
      setCapabilities(manager.getCapabilities())
      setIsInitialized(true)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      console.error('[IntegrationProvider] Reinitialization failed:', error)
      setError(error)
    } finally {
      setIsLoading(false)
    }
  }, [config])

  const contextValue: IntegrationContextValue = {
    state,
    capabilities,
    isFeatureEnabled,
    getEnabledFeatures,
    runDiagnostics,
    reinitialize,
    isLoading,
    error,
    isInitialized,
  }

  return (
    <IntegrationContext.Provider value={contextValue}>
      {children}
    </IntegrationContext.Provider>
  )
}

/**
 * Hook to access integration context
 */
export function useIntegration(): IntegrationContextValue {
  const context = useContext(IntegrationContext)

  if (!context) {
    throw new Error('useIntegration must be used within IntegrationProvider')
  }

  return context
}
