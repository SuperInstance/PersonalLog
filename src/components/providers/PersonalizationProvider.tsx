/**
 * Personalization Provider
 *
 * Provides user personalization and preference learning functionality.
 * Handles preference inference, storage, and category opt-outs.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { get, set, recordAction } = usePersonalization()
 *
 *   const fontSize = get('ui.fontSize')
 *
 *   const handleFontChange = (size: number) => {
 *     set('ui.fontSize', size)
 *   }
 * }
 * ```
 */

'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getPersonalizationAPI } from '@/lib/personalization'
import type { PreferenceKey, UserAction, LearningState, Preference, PreferenceValue } from '@/lib/personalization'
import type { PersonalizationContextValue, ProvidersConfig } from './types'

// UserPreferences is the internal format from the personalization library
type UserPreferences = Record<PreferenceKey, Preference<PreferenceValue>>

const PersonalizationContext = createContext<PersonalizationContextValue | null>(null)

export interface PersonalizationProviderProps {
  /** Provider configuration */
  config?: ProvidersConfig['personalization']

  /** Children components */
  children: React.ReactNode
}

/**
 * Personalization Provider Component
 */
export function PersonalizationProvider({ config, children }: PersonalizationProviderProps) {
  const api = getPersonalizationAPI()
  const userId = config?.userId ?? 'default'

  const [preferences, setPreferences] = useState<UserPreferences>({} as UserPreferences)
  const [learningState, setLearningState] = useState<LearningState>({
    enabled: true,
    disabledCategories: [],
    totalActionsRecorded: 0,
    learningStartedAt: new Date().toISOString(),
    lastActionAt: new Date().toISOString(),
  })
  const [optedOutCategories, setOptedOutCategories] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize personalization
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
          console.info('[PersonalizationProvider] Disabled by config')
          setIsLoading(false)
          return
        }

        // Load user model
        const model = api.getModel(userId)
        const prefs = model.getPreferences().getAll()

        if (mounted) {
          setPreferences(prefs as UserPreferences)
          setLearningState(model.getLearningState())

          // Load opted-out categories
          const stored = localStorage.getItem('personallog-personalization-optout')
          if (stored) {
            try {
              setOptedOutCategories(new Set(JSON.parse(stored)))
            } catch {
              // Ignore parse errors
            }
          }

          setIsInitialized(true)
          setIsLoading(false)
        }
      } catch (err) {
        if (mounted) {
          const error = err instanceof Error ? err : new Error(String(err))
          console.error('[PersonalizationProvider] Initialization failed:', error)
          setError(error)
          setIsLoading(false)
        }
      }
    }

    initialize()

    return () => {
      mounted = false
    }
  }, [config, userId, api])

  // Auto-save preferences
  useEffect(() => {
    if (!isInitialized || !config?.autoSaveInterval) {
      return
    }

    const interval = setInterval(() => {
      const model = api.getModel(userId)
      const prefs = model.getPreferences().getAll()
      setPreferences(prefs)
      setLearningState(model.getLearningState())
    }, config.autoSaveInterval)

    return () => clearInterval(interval)
  }, [isInitialized, config, userId, api])

  // Get a preference value
  const get = useCallback(<T = unknown>(key: PreferenceKey): T => {
    return api.get<T>(key, userId)
  }, [api, userId])

  // Set a preference value
  const set = useCallback((key: PreferenceKey, value: unknown) => {
    api.set(key, value as PreferenceValue, userId)
    const model = api.getModel(userId)
    setPreferences(model.getPreferences().getAll())
  }, [api, userId])

  // Reset a preference
  const reset = useCallback((key: PreferenceKey) => {
    api.reset(key, userId)
    const model = api.getModel(userId)
    setPreferences(model.getPreferences().getAll())
  }, [api, userId])

  // Update preference with inferred value
  const updatePreference = useCallback((key: PreferenceKey, value: unknown, confidence: number) => {
    const model = api.getModel(userId)

    if (!model.isLearningEnabled()) {
      return
    }

    const category = key.split('.')[0] as 'communication' | 'ui' | 'content'
    if (!model.isLearningEnabled(category)) {
      return
    }

    model.getPreferences().learn(key, value as PreferenceValue, confidence)
    setPreferences(model.getPreferences().getAll())
  }, [userId, api])

  // Record a user action
  const recordAction = useCallback((action: UserAction) => {
    api.recordAction(action, userId)
    const model = api.getModel(userId)
    setPreferences(model.getPreferences().getAll())
    setLearningState(model.getLearningState())
  }, [api, userId])

  // Opt out of a category
  const optOut = useCallback((category: 'communication' | 'ui' | 'content') => {
    const newOptedOut = new Set(optedOutCategories).add(category)
    setOptedOutCategories(newOptedOut)

    // Persist to localStorage
    try {
      localStorage.setItem(
        'personallog-personalization-optout',
        JSON.stringify([...newOptedOut])
      )
    } catch (err) {
      console.error('[PersonalizationProvider] Failed to persist opt-out:', err)
    }
  }, [optedOutCategories])

  // Check if opted out
  const isOptedOut = useCallback((category: 'communication' | 'ui' | 'content'): boolean => {
    return optedOutCategories.has(category)
  }, [optedOutCategories])

  // Toggle learning globally
  const toggleLearning = useCallback((enabled: boolean) => {
    api.toggleLearning(enabled, userId)
    const model = api.getModel(userId)
    setLearningState(model.getLearningState())
  }, [api, userId])

  // Explain a preference
  const explain = useCallback((key: PreferenceKey) => {
    const model = api.getModel(userId)
    const explanation = model.getPreferences().explain(key)

    if (!explanation) {
      return null
    }

    return {
      value: explanation.value,
      source: explanation.source,
      confidence: explanation.confidence,
      reason: explanation.reason,
    }
  }, [userId, api])

  // Export data
  const exportData = useCallback(async () => {
    try {
      const model = api.getModel(userId)
      const data = {
        preferences: model.getPreferences().getAll(),
        learningState: model.getLearningState(),
      }
      return JSON.stringify(data, null, 2)
    } catch (err) {
      console.error('[PersonalizationProvider] Export failed:', err)
      throw err
    }
  }, [userId, api])

  // Import data
  const importData = useCallback(async (data: string) => {
    try {
      const parsed = JSON.parse(data)
      const model = api.getModel(userId)
      // Import not fully implemented yet - just log
      console.warn('[PersonalizationProvider] Import not fully implemented:', parsed)
      setPreferences(model.getPreferences().getAll())
      setLearningState(model.getLearningState())
    } catch (err) {
      console.error('[PersonalizationProvider] Import failed:', err)
      throw err
    }
  }, [userId, api])

  // Clear learned data
  const clearLearning = useCallback(() => {
    api.clearLearning(userId)
    const model = api.getModel(userId)
    setPreferences(model.getPreferences().getAll())
    setLearningState(model.getLearningState())
  }, [api, userId])

  const contextValue: PersonalizationContextValue = {
    preferences,
    learningState,
    get,
    set,
    reset,
    updatePreference,
    recordAction,
    optOut,
    isOptedOut,
    toggleLearning,
    explain,
    exportData,
    importData,
    clearLearning,
    isLoading,
    error,
    isInitialized,
  }

  return (
    <PersonalizationContext.Provider value={contextValue}>
      {children}
    </PersonalizationContext.Provider>
  )
}

/**
 * Hook to access personalization context
 */
export function usePersonalization(): PersonalizationContextValue {
  const context = useContext(PersonalizationContext)

  if (!context) {
    throw new Error('usePersonalization must be used within PersonalizationProvider')
  }

  return context
}
