/**
 * PersonalLog - Personalized Component
 *
 * Wrapper component that applies personalization to children.
 */

'use client'

import React, { ReactElement, cloneElement, ReactNode } from 'react'
import { usePersonalization } from '@/lib/personalization/hooks'
import { generateCSSVariables, getDensityClassName, getFontSizeClassName } from '@/lib/personalization/adapters'

// ============================================================================
// PERSONALIZED PROVIDER
// ============================================================================

export interface PersonalizedProviderProps {
  children: ReactNode
  userId?: string
  applyToDocument?: boolean
}

/**
 * Provider component that sets up personalization context
 *
 * @example
 * <PersonalizedProvider>
 *   <App />
 * </PersonalizedProvider>
 */
export function PersonalizedProvider({
  children,
  userId = 'default',
  applyToDocument = true,
}: PersonalizedProviderProps) {
  const personalization = usePersonalization(userId)

  // Apply to document when requested
  React.useEffect(() => {
    if (applyToDocument && personalization.adapter) {
      personalization.adapter.applyAll()
    }
  }, [applyToDocument, personalization.adapter])

  // Generate CSS variables
  const cssVariables = personalization.adapter
    ? generateCSSVariables(personalization.adapter)
    : {}

  return (
    <div style={cssVariables}>
      {children}
    </div>
  )
}

// ============================================================================
// PERSONALIZED SETTING
// ============================================================================

export interface PersonalizedSettingProps<T = unknown> {
  setting: string
  options?: T[]
  onChange?: (value: T) => void
  children: (value: T) => ReactNode
  learnOnChange?: boolean
}

/**
 * Component that renders based on personalized setting
 *
 * @example
 * <PersonalizedSetting
 *   setting="ui.theme"
 *   options={['light', 'dark', 'auto']}
 *   onChange={(value) => console.log('Theme changed:', value)}
 * >
 *   {(theme) => <ThemeProvider theme={theme} />}
 * </PersonalizedSetting>
 */
export function PersonalizedSetting<T = unknown>({
  setting,
  options,
  onChange,
  children,
  learnOnChange = true,
}: PersonalizedSettingProps<T>) {
  const personalization = usePersonalization()
  const value = personalization.get<T>(setting as any)

  const handleChange = (newValue: T) => {
    if (learnOnChange) {
      personalization.set(setting as any, newValue)
    }
    onChange?.(newValue)
  }

  return (
    <>
      {children(value)}
    </>
  )
}

// ============================================================================
// PERSONALIZED TEXT
// ============================================================================

export interface PersonalizedTextProps {
  children: string
  adapt?: boolean
  className?: string
}

/**
 * Text component that adapts to user's reading level and tone preferences
 *
 * @example
 * <PersonalizedText adapt>
 *   This is some text that will be adapted based on preferences.
 * </PersonalizedText>
 */
export function PersonalizedText({ children, adapt = true, className = '' }: PersonalizedTextProps) {
  const { adaptContent, readingLevel } = usePersonalization()

  const adaptedText = adapt ? adaptContent(children) : children

  return (
    <span className={`personalized-text text-${readingLevel} ${className}`}>
      {adaptedText}
    </span>
  )
}

// ============================================================================
// PERSONALIZED CONTAINER
// ============================================================================

export interface PersonalizedContainerProps {
  children: ReactNode
  className?: string
  applyDensity?: boolean
  applyFontSize?: boolean
}

/**
 * Container that applies density and font size classes
 *
 * @example
 * <PersonalizedContainer applyDensity applyFontSize>
 *   <div>This content respects user's density and font size preferences</div>
 * </PersonalizedContainer>
 */
export function PersonalizedContainer({
  children,
  className = '',
  applyDensity = true,
  applyFontSize = true,
}: PersonalizedContainerProps) {
  const personalization = usePersonalization()

  const densityClass = applyDensity ? getDensityClassName(personalization.adapter!) : ''
  const fontSizeClass = applyFontSize ? getFontSizeClassName(personalization.adapter!) : ''

  return (
    <div className={`${densityClass} ${fontSizeClass} ${className}`.trim()}>
      {children}
    </div>
  )
}

// ============================================================================
// PERSONALIZED THEME WRAPPER
// ============================================================================

export interface PersonalizedThemeProps {
  children: ReactNode
  className?: string
}

/**
 * Wrapper that applies theme-specific styling
 *
 * @example
 * <PersonalizedTheme>
 *   <Card>This card adapts to the theme</Card>
 * </PersonalizedTheme>
 */
export function PersonalizedTheme({ children, className = '' }: PersonalizedThemeProps) {
  const { theme, isDark } = usePersonalizedTheme()

  return (
    <div className={`theme-${theme} ${isDark ? 'dark' : 'light'} ${className}`.trim()}>
      {children}
    </div>
  )
}

// ============================================================================
// PERSONALIZED EXPLANATION
// ============================================================================

export interface PersonalizedExplanationProps {
  setting: string
  children?: (explanation: {
    value: unknown
    reason: string
    confidence: number
    source: string
  }) => ReactNode
}

/**
 * Component that shows why a setting is set a certain way
 *
 * @example
 * <PersonalizedExplanation setting="ui.theme">
 *   {(explanation) => (
 *     <div>
 *       <p>Current value: {explanation.value}</p>
 *       <p>Why: {explanation.reason}</p>
 *       <p>Confidence: {Math.round(explanation.confidence * 100)}%</p>
 *     </div>
 *   )}
 * </PersonalizedExplanation>
 */
export function PersonalizedExplanation({ setting, children }: PersonalizedExplanationProps) {
  const personalization = usePersonalization()
  const explanation = personalization.explain(setting as any)

  if (children) {
    return <>{children(explanation)}</>
  }

  return (
    <div className="personalized-explanation text-sm text-gray-600 dark:text-gray-400">
      <p><strong>Current value:</strong> {JSON.stringify(explanation.value)}</p>
      <p><strong>Why:</strong> {explanation.reason}</p>
      {explanation.source === 'learned' && (
        <p><strong>Confidence:</strong> {Math.round(explanation.confidence * 100)}%</p>
      )}
    </div>
  )
}

// ============================================================================
// PERSONALIZED CONTROLS
// ============================================================================

export interface PersonalizedControlsProps {
  setting: string
  label?: string
  type: 'select' | 'toggle' | 'slider'
  options?: { value: unknown; label: string }[]
  min?: number
  max?: number
  step?: number
}

/**
 * Pre-built controls for personalized settings
 *
 * @example
 * <PersonalizedControls
 *   setting="ui.theme"
 *   label="Theme"
 *   type="select"
 *   options={[
 *     { value: 'light', label: 'Light' },
 *     { value: 'dark', label: 'Dark' },
 *     { value: 'auto', label: 'Auto' }
 *   ]}
 * />
 */
export function PersonalizedControls({
  setting,
  label,
  type,
  options,
  min,
  max,
  step,
}: PersonalizedControlsProps) {
  const [value, setValue] = usePersonalizedSetting(setting, null as any)

  const handleChange = (newValue: unknown) => {
    setValue(newValue)
  }

  return (
    <div className="personalized-control">
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}

      {type === 'select' && options && (
        <select
          value={value as string}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        >
          {options.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {type === 'toggle' && (
        <button
          onClick={() => handleChange(!(value as boolean))}
          className={`px-4 py-2 rounded ${value ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          {value ? 'On' : 'Off'}
        </button>
      )}

      {type === 'slider' && typeof value === 'number' && (
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => handleChange(parseFloat(e.target.value))}
          className="w-full"
        />
      )}
    </div>
  )
}

// ============================================================================
// IMPORT HOOKS FOR CONVENIENCE
// ============================================================================

import {
  usePersonalization,
  usePersonalizedSetting,
  usePersonalizedTheme,
  usePersonalizedTypography,
  usePersonalizedLayout,
  usePersonalizedContent,
  useLearningState,
  usePreferenceExplanation,
  usePersonalizationEffect,
  usePersonalizedValue,
} from '@/lib/personalization/hooks'

// Re-export hooks from this component for convenience
export {
  usePersonalization,
  usePersonalizedSetting,
  usePersonalizedTheme,
  usePersonalizedTypography,
  usePersonalizedLayout,
  usePersonalizedContent,
  useLearningState,
  usePreferenceExplanation,
  usePersonalizationEffect,
  usePersonalizedValue,
}
