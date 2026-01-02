/**
 * Optimization Provider
 *
 * Provides auto-optimization functionality to the application.
 * Monitors performance and applies optimizations in background.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { status, getSuggestions, isEnabled } = useOptimization()
 *
 *   useEffect(() => {
 *     if (isEnabled) {
 *       getSuggestions().then(suggestions => {
 *         console.log('Optimization suggestions:', suggestions)
 *       })
 *     }
 *   }, [isEnabled, getSuggestions])
 * }
 * ```
 */

'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { createOptimizationEngine, allRules } from '@/lib/optimization'
import type { OptimizationStatus, OptimizationEngineState, AppliedRule } from '@/lib/optimization'
import type { OptimizationContextValue, ProvidersConfig } from './types'

const OptimizationContext = createContext<OptimizationContextValue | null>(null)

export interface OptimizationProviderProps {
  /** Provider configuration */
  config?: ProvidersConfig['optimization']

  /** Children components */
  children: React.ReactNode
}

/**
 * Optimization Provider Component
 */
export function OptimizationProvider({ config, children }: OptimizationProviderProps) {
  const engineRef = useRef<ReturnType<typeof createOptimizationEngine> | null>(null)
  const [status, setStatus] = useState<OptimizationStatus>('idle')
  const [state, setState] = useState<OptimizationEngineState | null>(null)
  const [appliedRules, setAppliedRules] = useState<AppliedRule[]>([])
  const [isEnabled, setIsEnabled] = useState(config?.enabled ?? false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize optimization engine
  useEffect(() => {
    if (typeof window === 'undefined') {
      // Server-side - skip initialization
      setIsLoading(false)
      return
    }

    let mounted = true

    const initialize = async () => {
      try {
        if (!(config?.enabled ?? false)) {
          console.info('[OptimizationProvider] Disabled by config')
          setIsLoading(false)
          return
        }

        const engine = createOptimizationEngine({
          autoApply: config?.autoApply ?? false,
          monitorInterval: config?.monitorInterval ?? 30000,
        })

        // Register all default rules
        for (const rule of allRules) {
          engine.registerRule(rule)
        }

        engineRef.current = engine

        // Subscribe to events
        engine.on('state_changed', (newState: OptimizationEngineState) => {
          if (mounted) {
            setState(newState)
            setStatus(newState.status)
            setAppliedRules(newState.appliedRules ?? [])
          }
        })

        engine.on('optimization_applied', (result: any) => {
          if (mounted) {
            setAppliedRules(prev => [...prev, result])
          }
        })

        engine.on('error', (err: Error) => {
          console.error('[OptimizationProvider] Engine error:', err)
        })

        // Start the engine if enabled
        if (isEnabled) {
          await engine.start()
        }

        if (mounted) {
          setState(engine.getState())
          setStatus(engine.getState().status)
          setAppliedRules(engine.getState().appliedRules ?? [])
          setIsInitialized(true)
          setIsLoading(false)
        }
      } catch (err) {
        if (mounted) {
          const error = err instanceof Error ? err : new Error(String(err))
          console.error('[OptimizationProvider] Initialization failed:', error)
          setError(error)
          setIsLoading(false)
        }
      }
    }

    initialize()

    return () => {
      mounted = false
      // Stop engine on cleanup
      if (engineRef.current) {
        engineRef.current.stop().catch(console.error)
      }
    }
  }, []) // Only run on mount

  // Enable/disable optimization
  useEffect(() => {
    if (!engineRef.current || !isInitialized) {
      return
    }

    if (isEnabled) {
      engineRef.current.start().catch(err => {
        console.error('[OptimizationProvider] Failed to start:', err)
      })
    } else {
      engineRef.current.stop().catch(err => {
        console.error('[OptimizationProvider] Failed to stop:', err)
      })
    }
  }, [isEnabled, isInitialized])

  // Get suggestions
  const getSuggestions = useCallback(async () => {
    if (!engineRef.current) {
      return []
    }

    try {
      const suggestions = await engineRef.current.suggestOptimizations()
      return suggestions.map(s => ({
        ruleId: s.ruleId,
        name: s.name,
        impact: s.impact,
        confidence: s.confidence,
      }))
    } catch (err) {
      console.error('[OptimizationProvider] Get suggestions failed:', err)
      return []
    }
  }, [])

  // Enable optimization
  const enable = useCallback(async () => {
    setIsEnabled(true)
  }, [])

  // Disable optimization
  const disable = useCallback(async () => {
    setIsEnabled(false)
  }, [])

  // Run optimization manually
  const runOptimization = useCallback(async () => {
    if (!engineRef.current) {
      throw new Error('Optimization engine not initialized')
    }

    try {
      const suggestions = await engineRef.current.suggestOptimizations()

      // Apply safe optimizations automatically
      for (const suggestion of suggestions) {
        if (suggestion.autoApplySafe) {
          await engineRef.current!.applyOptimization(suggestion.ruleId)
        }
      }
    } catch (err) {
      console.error('[OptimizationProvider] Run optimization failed:', err)
      throw err
    }
  }, [])

  // Apply a specific optimization
  const applyOptimization = useCallback(async (ruleId: string) => {
    if (!engineRef.current) {
      throw new Error('Optimization engine not initialized')
    }

    try {
      await engineRef.current.applyOptimization(ruleId)
    } catch (err) {
      console.error('[OptimizationProvider] Apply optimization failed:', err)
      throw err
    }
  }, [])

  // Get health status
  const getHealth = useCallback(async () => {
    if (!engineRef.current) {
      return {
        health: 'unhealthy' as const,
        issues: ['Engine not initialized'],
      }
    }

    try {
      const health = engineRef.current.getHealthStatus()
      return {
        health: health.overallHealth,
        issues: health.issues,
      }
    } catch (err) {
      console.error('[OptimizationProvider] Get health failed:', err)
      return {
        health: 'unhealthy' as const,
        issues: ['Failed to get health status'],
      }
    }
  }, [])

  const contextValue: OptimizationContextValue = {
    status,
    state,
    appliedRules,
    getSuggestions,
    enable,
    disable,
    runOptimization,
    applyOptimization,
    getHealth,
    isEnabled,
    isLoading,
    error,
    isInitialized,
  }

  return (
    <OptimizationContext.Provider value={contextValue}>
      {children}
    </OptimizationContext.Provider>
  )
}

/**
 * Hook to access optimization context
 */
export function useOptimization(): OptimizationContextValue {
  const context = useContext(OptimizationContext)

  if (!context) {
    throw new Error('useOptimization must be used within OptimizationProvider')
  }

  return context
}
