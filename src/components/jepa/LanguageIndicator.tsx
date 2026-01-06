/**
 * JEPA Language Indicator Component
 *
 * Displays detected language with confidence meter and manual override.
 * Shows language flag, name, and detection confidence.
 *
 * @components/jepa/LanguageIndicator
 */

'use client'

import { useState } from 'react'
import {
  SUPPORTED_LANGUAGES,
  formatLanguageName,
  getLanguage,
  type LanguageDetectionResult,
} from '@/lib/jepa/languages'

// ============================================================================
// TYPES
// ============================================================================

interface LanguageIndicatorProps {
  /** Detected language result */
  detected: LanguageDetectionResult
  /** Callback when user manually overrides language */
  onOverride?: (languageCode: string) => void
  /** Show compact version (flag only) */
  compact?: boolean
  /** Additional CSS classes */
  className?: string
}

interface LanguageDisplayData {
  code: string
  name: string
  nativeName: string
  flag: string
  rtl: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LanguageIndicator({
  detected,
  onOverride,
  compact = false,
  className = '',
}: LanguageIndicatorProps) {
  const [isOverrideMenuOpen, setIsOverrideMenuOpen] = useState(false)

  const language = getLanguage(detected.language)
  const confidence = detected.confidence

  // Fallback if language not found
  const displayData: LanguageDisplayData = language
    ? {
        code: language.code,
        name: language.name,
        nativeName: language.nativeName,
        flag: language.flag,
        rtl: language.rtl,
      }
    : {
        code: detected.language,
        name: 'Unknown',
        nativeName: detected.language,
        flag: '🌐',
        rtl: false,
      }

  const confidencePercent = Math.round(confidence * 100)
  const confidenceColor = getConfidenceColor(confidence)

  const handleOverride = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = event.target.value
    onOverride?.(newLanguage)
    setIsOverrideMenuOpen(false)
  }

  if (compact) {
    return (
      <div className={`language-indicator-compact ${className}`} title={`${displayData.name} (${confidencePercent}%)`}>
        <span className="language-flag">{displayData.flag}</span>
      </div>
    )
  }

  return (
    <div className={`language-indicator ${className}`}>
      {/* Language flag and name */}
      <div className="language-info">
        <span className="language-flag" role="img" aria-label={displayData.name}>
          {displayData.flag}
        </span>
        <span className="language-name">{displayData.name}</span>
        <span className="language-native" dir={displayData.rtl ? 'rtl' : 'ltr'}>
          {displayData.nativeName}
        </span>
      </div>

      {/* Confidence meter */}
      <div className="confidence-meter" title={`Detection confidence: ${confidencePercent}%`}>
        <div className="confidence-bar">
          <div
            className={`confidence-fill ${confidenceColor}`}
            style={{ width: `${confidencePercent}%` }}
            role="progressbar"
            aria-valuenow={confidencePercent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <span className="confidence-text">{confidencePercent}%</span>
      </div>

      {/* Language override selector */}
      {onOverride && (
        <div className="language-selector">
          <select
            className="language-select"
            value={detected.language}
            onChange={handleOverride}
            onFocus={() => setIsOverrideMenuOpen(true)}
            onBlur={() => setTimeout(() => setIsOverrideMenuOpen(false), 200)}
            aria-label="Override detected language"
          >
            <option value="" disabled>
              Change language...
            </option>
            {SUPPORTED_LANGUAGES.filter(lang => lang.supported).map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.name} ({lang.nativeName})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Alternatives */}
      {detected.alternatives.length > 0 && confidencePercent < 80 && (
        <div className="language-alternatives">
          <span className="alternatives-label">Also possible:</span>
          <ul className="alternatives-list">
            {detected.alternatives.map(alt => {
              const altLang = getLanguage(alt.code)
              return (
                <li key={alt.code} className="alternative-item">
                  <span className="alternative-flag">{altLang?.flag || '🌐'}</span>
                  <span className="alternative-name">{altLang?.name || alt.code}</span>
                  <span className="alternative-confidence">{Math.round(alt.confidence * 100)}%</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get color class for confidence level
 */
function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) {
    return 'confidence-high'
  } else if (confidence >= 0.5) {
    return 'confidence-medium'
  } else {
    return 'confidence-low'
  }
}

// ============================================================================
// STYLES (to be moved to CSS module)
// ============================================================================

export const languageIndicatorStyles = `
.language-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-background, #f9fafb);
  border-radius: 0.5rem;
  border: 1px solid var(--color-border, #e5e7eb);
}

.language-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.language-flag {
  font-size: 1.5rem;
  line-height: 1;
}

.language-name {
  font-weight: 600;
  color: var(--color-text-primary, #111827);
}

.language-native {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
}

.confidence-meter {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 120px;
}

.confidence-bar {
  flex: 1;
  height: 0.5rem;
  background: var(--color-background-hover, #e5e7eb);
  border-radius: 0.25rem;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.confidence-fill.confidence-high {
  background: linear-gradient(90deg, #10b981, #059669);
}

.confidence-fill.confidence-medium {
  background: linear-gradient(90deg, #f59e0b, #d97706);
}

.confidence-fill.confidence-low {
  background: linear-gradient(90deg, #ef4444, #dc2626);
}

.confidence-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary, #6b7280);
  min-width: 2.5rem;
  text-align: right;
}

.language-selector {
  position: relative;
}

.language-select {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.375rem;
  background: var(--color-background, #ffffff);
  color: var(--color-text-primary, #111827);
  cursor: pointer;
  transition: all 0.2s;
}

.language-select:hover {
  border-color: var(--color-primary, #3b82f6);
}

.language-select:focus {
  outline: none;
  border-color: var(--color-primary, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.language-alternatives {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-left: auto;
}

.alternatives-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #6b7280);
}

.alternatives-list {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.alternative-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary, #6b7280);
}

.alternative-flag {
  font-size: 1rem;
}

.alternative-name {
  font-weight: 500;
}

.alternative-confidence {
  margin-left: auto;
  color: var(--color-text-tertiary, #9ca3af);
}

.language-indicator-compact {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: var(--color-background, #f9fafb);
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.language-indicator-compact .language-flag {
  font-size: 1.25rem;
}
`

// ============================================================================
// COMPACT VARIANT
// ============================================================================

interface CompactLanguageIndicatorProps {
  /** Language code */
  language: string
  /** Confidence percentage */
  confidence?: number
  /** Click handler */
  onClick?: () => void
  /** Additional CSS classes */
  className?: string
}

export function CompactLanguageIndicator({
  language,
  confidence,
  onClick,
  className = '',
}: CompactLanguageIndicatorProps) {
  const lang = getLanguage(language)
  const flag = lang?.flag || '🌐'

  return (
    <button
      className={`compact-language-indicator ${className}`}
      onClick={onClick}
      title={lang ? `${lang.name} (${confidence ? Math.round(confidence * 100) : '?'}%)` : language}
      type="button"
    >
      <span className="compact-flag">{flag}</span>
      {confidence !== undefined && (
        <span className="compact-confidence">{Math.round(confidence * 100)}%</span>
      )}
    </button>
  )
}
