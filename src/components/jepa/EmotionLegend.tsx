/**
 * JEPA - Emotion Legend Component
 *
 * Displays emotion color mapping for visualizations.
 */

'use client'

import { getEmotionColor, getEmotionDisplayName, getEmotionLabels, type EmotionLabel } from '@/lib/jepa/waveform-renderer'

// ============================================================================
// TYPES
// ============================================================================

export interface EmotionLegendProps {
  /** Layout direction (default: 'horizontal') */
  layout?: 'horizontal' | 'vertical'

  /** Show emotion labels (default: true) */
  showLabels?: boolean

  /** Show color boxes (default: true) */
  showColorBoxes?: true

  /** Emotions to display (default: all) */
  emotions?: EmotionLabel[]

  /** Size of color box (default: 'md') */
  size?: 'sm' | 'md' | 'lg'

  /** Additional CSS classes */
  className?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EmotionLegend({
  layout = 'horizontal',
  showLabels = true,
  showColorBoxes = true,
  emotions,
  size = 'md',
  className = '',
}: EmotionLegendProps) {
  const emotionList = emotions || getEmotionLabels()

  const sizeClasses = {
    sm: 'w-3 h-3 text-xs',
    md: 'w-4 h-4 text-sm',
    lg: 'w-5 h-5 text-base'
  }

  const layoutClasses = {
    horizontal: 'flex-row flex-wrap gap-3',
    vertical: 'flex-col gap-2'
  }

  return (
    <div className={`emotion-legend flex ${layoutClasses[layout]} ${className}`}>
      {emotionList.map(emotion => (
        <div key={emotion} className="flex items-center gap-2">
          {showColorBoxes && (
            <span
              className={`rounded-sm flex-shrink-0 ${sizeClasses[size].split(' ')[0]}`}
              style={{ backgroundColor: getEmotionColor(emotion) }}
              aria-label={`${emotion} emotion color`}
            />
          )}
          {showLabels && (
            <span className={`text-slate-700 dark:text-slate-300 ${sizeClasses[size].split(' ')[1]}`}>
              {getEmotionDisplayName(emotion)}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// COMPACT EMOTION LEGEND
// ============================================================================

export interface CompactEmotionLegendProps {
  /** Emotions to display */
  emotions: EmotionLabel[]

  /** Additional CSS classes */
  className?: string
}

/**
 * Compact legend that only shows colored dots
 */
export function CompactEmotionLegend({
  emotions,
  className = '',
}: CompactEmotionLegendProps) {
  return (
    <div className={`compact-emotion-legend flex items-center gap-1.5 ${className}`}>
      {emotions.map(emotion => (
        <span
          key={emotion}
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: getEmotionColor(emotion) }}
          title={getEmotionDisplayName(emotion)}
          aria-label={`${emotion} emotion color`}
        />
      ))}
    </div>
  )
}

// ============================================================================
// EMOTION BADGE
// ============================================================================

export interface EmotionBadgeProps {
  /** Emotion label */
  emotion: EmotionLabel

  /** Size (default: 'md') */
  size?: 'sm' | 'md' | 'lg'

  /** Show icon (default: false) */
  showIcon?: boolean

  /** Additional CSS classes */
  className?: string
}

/**
 * Individual emotion badge with color and optional icon
 */
export function EmotionBadge({
  emotion,
  size = 'md',
  showIcon = false,
  className = '',
}: EmotionBadgeProps) {
  const color = getEmotionColor(emotion)
  const name = getEmotionDisplayName(emotion)

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  }

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: `${color}20`,
        color,
        border: `1px solid ${color}40`
      }}
    >
      {showIcon && <EmotionIcon emotion={emotion} className={iconSize[size]} />}
      <span>{name}</span>
    </span>
  )
}

// ============================================================================
// EMOTION ICON
// ============================================================================

export interface EmotionIconProps {
  /** Emotion label */
  emotion: EmotionLabel

  /** Additional CSS classes */
  className?: string
}

/**
 * Icon for emotion (emoji)
 */
export function EmotionIcon({ emotion, className = '' }: EmotionIconProps) {
  const icons: Record<EmotionLabel, string> = {
    excited: '🎉',
    calm: '😌',
    angry: '😠',
    sad: '😢',
    confident: '😤',
    neutral: '😐'
  }

  return (
    <span className={className} role="img" aria-label={emotion}>
      {icons[emotion] || icons.neutral}
    </span>
  )
}

// ============================================================================
// EMOTION STATISTICS
// ============================================================================

export interface EmotionStatsProps {
  /** Emotion counts */
  counts: Record<EmotionLabel, number>

  /** Total count (optional, calculated if not provided) */
  total?: number

  /** Layout direction (default: 'vertical') */
  layout?: 'horizontal' | 'vertical'

  /** Additional CSS classes */
  className?: string
}

/**
 * Shows emotion statistics with percentages
 */
export function EmotionStats({
  counts,
  total,
  layout = 'vertical',
  className = '',
}: EmotionStatsProps) {
  const totalCount = total || Object.values(counts).reduce((sum, count) => sum + count, 0)

  const layoutClasses = {
    horizontal: 'flex-row flex-wrap gap-4',
    vertical: 'flex-col gap-2'
  }

  return (
    <div className={`emotion-stats flex ${layoutClasses[layout]} ${className}`}>
      {getEmotionLabels().map(emotion => {
        const count = counts[emotion] || 0
        const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0
        const color = getEmotionColor(emotion)

        return (
          <div key={emotion} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {getEmotionDisplayName(emotion)}:
            </span>
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {count} ({percentage.toFixed(1)}%)
            </span>
          </div>
        )
      })}
    </div>
  )
}
