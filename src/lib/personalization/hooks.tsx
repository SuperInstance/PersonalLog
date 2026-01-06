/**
 * PersonalLog - Personalization React Hooks
 *
 * React hooks for accessing and using personalized preferences.
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { PreferenceKey, PreferenceValue, PersonalizationEvent } from './types'
import { ModelFactory } from './models'
import { PersonalizationAdapter } from './adapters'

// ============================================================================
// USE PERSONALIZATION
// ============================================================================

/**
 * Main hook to access personalization system
 *
 * @example
 * const personalization = usePersonalization()
 * personalization.set('ui.theme', 'dark')
 */
export function usePersonalization(userId: string = 'default') {
  const [model, setModel] = useState(() => ModelFactory.getInstance().getModel(userId))
  const adapterRef = useRef<PersonalizationAdapter | null>(null)

  // Initialize adapter on first render
  if (!adapterRef.current) {
    adapterRef.current = new PersonalizationAdapter(model.getPreferences())
  }

  // Apply personalization on mount and when preferences change
  useEffect(() => {
    adapterRef.current!.applyAll()
  }, [model])

  // Get a preference value
  const get = useCallback(<T = PreferenceValue>(key: PreferenceKey): T => {
    return model.getPreferences().get<T>(key)
  }, [model])

  // Set a preference value
  const set = useCallback((key: PreferenceKey, value: PreferenceValue): void => {
    model.getPreferences().set(key, value, 'explicit')
    setModel(ModelFactory.getInstance().getModel(userId)) // Force re-render
  }, [model, userId])

  // Learn a preference
  const learn = useCallback((key: PreferenceKey, value: PreferenceValue, confidence: number): void => {
    model.getPreferences().learn(key, value, confidence)
    setModel(ModelFactory.getInstance().getModel(userId)) // Force re-render
  }, [model, userId])

  // Reset a preference
  const reset = useCallback((key: PreferenceKey): void => {
    model.getPreferences().reset(key)
    setModel(ModelFactory.getInstance().getModel(userId)) // Force re-render
  }, [model, userId])

  // Get explanation for a preference
  const explain = useCallback((key: PreferenceKey) => {
    return model.getPreferences().explain(key)
  }, [model])

  // Record user action for learning
  const recordAction = useCallback((action: {
    type: string
    context?: Record<string, unknown>
    data?: Record<string, unknown>
  }): void => {
    // This would integrate with the learner
    // For now, just record the action
    model.recordAction()
  }, [model])

  // Toggle learning
  const toggleLearning = useCallback((enabled: boolean): void => {
    model.toggleLearning(enabled)
    setModel(ModelFactory.getInstance().getModel(userId)) // Force re-render
  }, [model, userId])

  // Get learning state
  const getLearningState = useCallback(() => {
    return model.getLearningState()
  }, [model])

  // Get the preferences model (for advanced usage)
  const getPreferences = useCallback(() => {
    return model.getPreferences()
  }, [model])

  // Get interaction patterns
  const getPatterns = useCallback(() => {
    return model.getPatterns()
  }, [model])

  return {
    get,
    set,
    learn,
    reset,
    explain,
    recordAction,
    toggleLearning,
    getLearningState,
    getPreferences,
    getPatterns,
    adapter: adapterRef.current,
  }
}

// ============================================================================
// USE PERSONALIZED SETTING
// ============================================================================

/**
 * Hook to get and set a single personalized setting
 *
 * @example
 * const [theme, setTheme] = usePersonalizedSetting('ui.theme', 'auto')
 */
export function usePersonalizedSetting<T = PreferenceValue>(
  key: PreferenceKey,
  defaultValue: T
): [T, (value: T) => void, { loading: boolean; source: string; confidence: number }] {
  const personalization = usePersonalization()
  const [value, setValue] = useState<T>(() => personalization.get<T>(key) ?? defaultValue)
  const [meta, setMeta] = useState({
    loading: false,
    source: 'default',
    confidence: 0,
  })

  // Update when preference changes
  useEffect(() => {
    const explanation = personalization.explain(key as any)
    if (explanation) {
      setValue(personalization.get<T>(key) ?? defaultValue)
      setMeta({
        loading: false,
        source: explanation.source,
        confidence: explanation.confidence,
      })
    }
  }, [key, personalization, defaultValue])

  // Set value
  const setValueAndPersist = useCallback((newValue: T) => {
    setValue(newValue)
    personalization.set(key, newValue as any)
    setMeta({
      loading: false,
      source: 'explicit',
      confidence: 1.0,
    })
  }, [key, personalization])

  return [value, setValueAndPersist, meta]
}

// ============================================================================
// USE PERSONALIZED THEME
// ============================================================================

/**
 * Hook specifically for theme preference
 *
 * @example
 * const { theme, setTheme, colors } = usePersonalizedTheme()
 */
export function usePersonalizedTheme() {
  const personalization = usePersonalization()
  const theme = personalization.get<'light' | 'dark' | 'auto'>('ui.theme')
  const adapter = personalization.adapter?.getTheme()

  const setTheme = useCallback((newTheme: 'light' | 'dark' | 'auto') => {
    personalization.set('ui.theme', newTheme)
    adapter?.applyTheme()
  }, [personalization, adapter])

  const config = adapter?.getThemeConfig()

  return {
    theme,
    setTheme,
    colors: config?.colors,
    isDark: config?.theme === 'dark',
    isLight: config?.theme === 'light',
  }
}

// ============================================================================
// USE PERSONALIZED TYPOGRAPHY
// ============================================================================

/**
 * Hook for typography preferences
 *
 * @example
 * const { fontSize, fontSizeClass, setFontSize } = usePersonalizedTypography()
 */
export function usePersonalizedTypography() {
  const personalization = usePersonalization()
  const fontSize = personalization.get<number>('ui.fontSize')
  const density = personalization.get<'compact' | 'comfortable' | 'spacious'>('ui.density')
  const adapter = personalization.adapter?.getTypography()

  const setFontSize = useCallback((newSize: 0.85 | 1.0 | 1.15 | 1.3) => {
    personalization.set('ui.fontSize', newSize)
    adapter?.applyTypography()
  }, [personalization, adapter])

  const setDensity = useCallback((newDensity: 'compact' | 'comfortable' | 'spacious') => {
    personalization.set('ui.density', newDensity)
  }, [personalization])

  const fontSizeClass = adapter?.getFontSizeClass()
  const config = adapter?.getTypographyConfig()

  return {
    fontSize,
    setFontSize,
    density,
    setDensity,
    fontSizeClass,
    lineHeight: config?.lineHeight,
    letterSpacing: config?.letterSpacing,
  }
}

// ============================================================================
// USE PERSONALIZED LAYOUT
// ============================================================================

/**
 * Hook for layout preferences
 *
 * @example
 * const { density, sidebarPosition, densityClass } = usePersonalizedLayout()
 */
export function usePersonalizedLayout() {
  const personalization = usePersonalization()
  const density = personalization.get<'compact' | 'comfortable' | 'spacious'>('ui.density')
  const sidebarPosition = personalization.get<'left' | 'right' | 'hidden'>('ui.sidebarPosition')
  const adapter = personalization.adapter?.getLayout()

  const setDensity = useCallback((newDensity: 'compact' | 'comfortable' | 'spacious') => {
    personalization.set('ui.density', newDensity)
    adapter?.applyLayout()
  }, [personalization, adapter])

  const setSidebarPosition = useCallback((newPosition: 'left' | 'right' | 'hidden') => {
    personalization.set('ui.sidebarPosition', newPosition)
  }, [personalization])

  const densityClass = adapter?.getDensityClass()
  const config = adapter?.getLayoutConfig()

  return {
    density,
    setDensity,
    sidebarPosition,
    setSidebarPosition,
    densityClass,
    spacing: config?.spacing,
  }
}

// ============================================================================
// USE PERSONALIZED CONTENT
// ============================================================================

/**
 * Hook for content preferences
 *
 * @example
 * const { responseLength, tone, shouldUseEmojis } = usePersonalizedContent()
 */
export function usePersonalizedContent() {
  const personalization = usePersonalization()
  const adapter = personalization.adapter?.getContent()

  const responseLength = personalization.get<'brief' | 'balanced' | 'detailed'>('communication.responseLength')
  const tone = personalization.get<'casual' | 'neutral' | 'formal'>('communication.tone')
  const useEmojis = personalization.get<boolean>('communication.useEmojis')
  const formatting = personalization.get<'plain' | 'markdown' | 'structured'>('communication.formatting')
  const readingLevel = personalization.get<'simple' | 'standard' | 'advanced'>('content.readingLevel')
  const language = personalization.get<string>('content.language')
  const autoPlayMedia = personalization.get<boolean>('content.autoPlayMedia')

  const setResponseLength = useCallback((length: 'brief' | 'balanced' | 'detailed') => {
    personalization.set('communication.responseLength', length)
  }, [personalization])

  const setTone = useCallback((newTone: 'casual' | 'neutral' | 'formal') => {
    personalization.set('communication.tone', newTone)
  }, [personalization])

  const setUseEmojis = useCallback((enabled: boolean) => {
    personalization.set('communication.useEmojis', enabled)
  }, [personalization])

  const adaptContent = useCallback((content: string): string => {
    return adapter?.adaptContent(content) || content
  }, [adapter])

  return {
    responseLength,
    setResponseLength,
    tone,
    setTone,
    useEmojis,
    setUseEmojis,
    formatting,
    readingLevel,
    language,
    autoPlayMedia,
    adaptContent,
  }
}

// ============================================================================
// USE LEARNING STATE
// ============================================================================

/**
 * Hook for learning state management
 *
 * @example
 * const { learningEnabled, toggleLearning, stats } = useLearningState()
 */
export function useLearningState() {
  const personalization = usePersonalization()
  const learningState = personalization.getLearningState()

  const toggleLearning = useCallback((enabled?: boolean) => {
    const newState = enabled ?? !learningState.enabled
    personalization.toggleLearning(newState)
  }, [personalization, learningState.enabled])

  const disableCategory = useCallback((category: 'communication' | 'ui' | 'content') => {
    const model = ModelFactory.getInstance().getModel('default')
    model.disableLearningCategory(category)
  }, [])

  const enableCategory = useCallback((category: 'communication' | 'ui' | 'content') => {
    const model = ModelFactory.getInstance().getModel('default')
    model.enableLearningCategory(category)
  }, [])

  return {
    learningEnabled: learningState.enabled,
    toggleLearning,
    disableCategory,
    enableCategory,
    disabledCategories: learningState.disabledCategories,
    totalActionsRecorded: learningState.totalActionsRecorded,
    lastActionAt: learningState.lastActionAt,
  }
}

// ============================================================================
// USE PREFERENCE EXPLANATION
// ============================================================================

/**
 * Hook to get explanations for preferences
 *
 * @example
 * const explanation = usePreferenceExplanation('ui.theme')
 * // { reason: "You set this to 'dark'.", confidence: 1.0, ... }
 */
export function usePreferenceExplanation(key: PreferenceKey) {
  const personalization = usePersonalization()
  const [explanation, setExplanation] = useState(() => personalization.explain(key))

  // Refresh explanation when key or personalization changes
  useEffect(() => {
    setExplanation(personalization.explain(key))
  }, [key, personalization])

  return explanation
}

// ============================================================================
// USE PERSONALIZATION EFFECT
// ============================================================================

/**
 * Hook to apply personalization effects
 *
 * @example
 * usePersonalizationEffect({
 *   onPreferenceChanged: (key, value) => console.log(`${key} = ${value}`)
 * })
 */
export function usePersonalizationEffect(handlers: {
  onPreferenceChanged?: (key: PreferenceKey, value: PreferenceValue) => void
  onPreferenceLearned?: (key: PreferenceKey, value: PreferenceValue, confidence: number) => void
  onPatternDetected?: (pattern: string) => void
}) {
  const personalization = usePersonalization()

  useEffect(() => {
    // Note: Real event subscription would require event emitter
    // For now, this is a placeholder that runs on mount
    if (handlers.onPreferenceChanged) {
      // Placeholder: would hook into actual events
    }
  }, [personalization, handlers])
}

// ============================================================================
// USE PERSONALIZED VALUE (ADVANCED)
// ============================================================================

/**
 * Advanced hook for reactive personalized values
 *
 * @example
 * const fontSize = usePersonalizedValue('ui.fontSize', 1.0, {
 *   onChange: (value) => console.log('Font size changed:', value)
 * })
 */
export function usePersonalizedValue<T = PreferenceValue>(
  key: PreferenceKey,
  defaultValue: T,
  options?: {
    onChange?: (value: T) => void
    persistExplicit?: boolean
  }
): [T, (value: T) => void] {
  const personalization = usePersonalization()
  const [value, setValue] = useState<T>(() => personalization.get<T>(key) ?? defaultValue)

  // Update when preference changes externally
  useEffect(() => {
    // Note: Real event subscription would require event emitter
    // For now, just refresh the value when key/personalization changes
    setValue(personalization.get<T>(key) ?? defaultValue)
  }, [key, personalization, defaultValue])

  // Set value
  const setValueAndPersist = useCallback((newValue: T) => {
    setValue(newValue)
    personalization.set(key, newValue as any)
    options?.onChange?.(newValue)
  }, [key, personalization, options])

  return [value, setValueAndPersist]
}
