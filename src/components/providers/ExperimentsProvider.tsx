/**
 * Experiments Provider
 *
 * Provides A/B testing functionality to the application.
 * Handles experiment assignment, tracking, and opt-out management.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { getVariant, isVariant } = useExperiments()
 *
 *   const variant = getVariant('new-ui-design')
 *
 *   if (isVariant('new-ui-design', 'treatment')) {
 *     return <NewUI />
 *   }
 *   return <OldUI />
 * }
 * ```
 */

'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getGlobalManager } from '@/lib/experiments'
import type { Experiment } from '@/lib/experiments'
import type { ExperimentsContextValue, ProvidersConfig } from './types'

const ExperimentsContext = createContext<ExperimentsContextValue | null>(null)

export interface ExperimentsProviderProps {
  /** Provider configuration */
  config?: ProvidersConfig['experiments']

  /** Children components */
  children: React.ReactNode
}

/**
 * Experiments Provider Component
 */
export function ExperimentsProvider({ config, children }: ExperimentsProviderProps) {
  const [manager, setManager] = useState<typeof getGlobalManager.return | null>(null)
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [optedOut, setOptedOut] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize experiments
  useEffect(() => {
    if (typeof window === 'undefined') {
      // Server-side - skip initialization
      setIsLoading(false)
      return
    }

    let mounted = true

    const initialize = async () => {
      try {
        if (!(config?.enabled ?? true)) {
          console.info('[ExperimentsProvider] Disabled by config')
          setIsLoading(false)
          return
        }

        const mgr = getGlobalManager()

        // Load opted-out experiments from localStorage
        const stored = localStorage.getItem(config?.storageKey ?? 'personallog-experiments-optout')
        if (stored) {
          try {
            setOptedOut(new Set(JSON.parse(stored)))
          } catch {
            // Ignore parse errors
          }
        }

        if (mounted) {
          setManager(mgr)
          setExperiments(mgr.getAllExperiments())
          setIsInitialized(true)
          setIsLoading(false)
        }
      } catch (err) {
        if (mounted) {
          const error = err instanceof Error ? err : new Error(String(err))
          console.error('[ExperimentsProvider] Initialization failed:', error)
          setError(error)
          setIsLoading(false)
        }
      }
    }

    initialize()

    return () => {
      mounted = false
    }
  }, [config])

  // Get variant assignment
  const getVariant = useCallback((experimentId: string): string | null => {
    if (!manager || optedOut.has(experimentId)) {
      return null
    }

    try {
      const { getVariant } = require('@/lib/experiments')
      return getVariant(experimentId)
    } catch (err) {
      console.error('[ExperimentsProvider] Get variant failed:', err)
      return null
    }
  }, [manager, optedOut])

  // Check if user is in a specific variant
  const isVariant = useCallback((experimentId: string, variantId: string): boolean => {
    return getVariant(experimentId) === variantId
  }, [getVariant])

  // Track a metric
  const trackMetric = useCallback((experimentId: string, metric: string, value: number) => {
    if (!manager || optedOut.has(experimentId)) {
      return
    }

    try {
      const { trackMetric: track } = require('@/lib/experiments')
      track(experimentId, metric, value)
    } catch (err) {
      console.error('[ExperimentsProvider] Track metric failed:', err)
    }
  }, [manager, optedOut])

  // Get all experiments
  const getAllExperiments = useCallback((): Experiment[] => {
    if (!manager) {
      return []
    }
    return manager.getAllExperiments()
  }, [manager])

  // Get a specific experiment
  const getExperiment = useCallback((experimentId: string): Experiment | undefined => {
    if (!manager) {
      return undefined
    }
    return manager.getAllExperiments().find((exp: Experiment) => exp.id === experimentId)
  }, [manager])

  // Opt out of an experiment
  const optOut = useCallback((experimentId: string) => {
    const newOptedOut = new Set(optedOut).add(experimentId)
    setOptedOut(newOptedOut)

    // Persist to localStorage
    try {
      localStorage.setItem(
        config?.storageKey ?? 'personallog-experiments-optout',
        JSON.stringify([...newOptedOut])
      )
    } catch (err) {
      console.error('[ExperimentsProvider] Failed to persist opt-out:', err)
    }
  }, [optedOut, config])

  // Check if opted out
  const isOptedOut = useCallback((experimentId: string): boolean => {
    return optedOut.has(experimentId)
  }, [optedOut])

  // Create a new experiment
  const createExperiment = useCallback(async (experimentConfig: {
    id: string
    name: string
    variants: Array<{ id: string; weight: number }>
    primaryMetric?: string
    trafficAllocation?: number
  }) => {
    if (!manager) {
      throw new Error('Experiment manager not initialized')
    }

    try {
      const { createExperiment: create } = require('@/lib/experiments')
      const experiment = create(experimentConfig)
      manager.registerExperiment(experiment)
      setExperiments(manager.getAllExperiments())
    } catch (err) {
      console.error('[ExperimentsProvider] Create experiment failed:', err)
      throw err
    }
  }, [manager])

  const contextValue: ExperimentsContextValue = {
    getVariant,
    isVariant,
    trackMetric,
    getAllExperiments,
    getExperiment,
    optOut,
    isOptedOut,
    createExperiment,
    isLoading,
    error,
    isInitialized,
  }

  return (
    <ExperimentsContext.Provider value={contextValue}>
      {children}
    </ExperimentsContext.Provider>
  )
}

/**
 * Hook to access experiments context
 */
export function useExperiments(): ExperimentsContextValue {
  const context = useContext(ExperimentsContext)

  if (!context) {
    throw new Error('useExperiments must be used within ExperimentsProvider')
  }

  return context
}
