/**
 * EmotionIndicator Component
 *
 * Subtle emotion visualization that appears in chat messages.
 * Shows dominant emotion with confidence meter and color coding.
 *
 * @module components/agents/jepa/EmotionIndicator
 */

'use client'

import { memo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { EmotionAnalysis } from '@/lib/agents/jepa-agent'

export interface EmotionIndicatorProps {
  /** Emotion analysis data */
  emotion: EmotionAnalysis

  /** Whether to show compact view */
  compact?: boolean

  /** Additional CSS classes */
  className?: string
}

export const EmotionIndicator = memo(function EmotionIndicator({
  emotion,
  compact = false,
  className = '',
}: EmotionIndicatorProps) {
  const [expanded, setExpanded] = useState(false)

  // Determine emotion emoji and color
  const getEmotionDisplay = () => {
    if (emotion.valence > 0.6) {
      return {
        emoji: '😊',
        label: 'Positive',
        color: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-700',
      }
    } else if (emotion.valence < 0.4) {
      return {
        emoji: '😟',
        label: 'Negative',
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-700',
      }
    } else {
      return {
        emoji: '😐',
        label: 'Neutral',
        color: 'text-slate-600 dark:text-slate-400',
        bg: 'bg-slate-50 dark:bg-slate-900/20',
        border: 'border-slate-200 dark:border-slate-700',
      }
    }
  }

  const display = getEmotionDisplay()

  // Get confidence level label
  const getConfidenceLevel = () => {
    if (emotion.confidence > 0.8) return { label: 'High', color: 'text-green-600' }
    if (emotion.confidence > 0.5) return { label: 'Medium', color: 'text-yellow-600' }
    return { label: 'Low', color: 'text-red-600' }
  }

  const confidence = getConfidenceLevel()

  // Get arousal label
  const getArousalLabel = () => {
    if (emotion.arousal > 0.7) return 'High Energy'
    if (emotion.arousal > 0.4) return 'Moderate'
    return 'Calm'
  }

  // Get dominance label
  const getDominanceLabel = () => {
    if (emotion.dominance > 0.7) return 'Assertive'
    if (emotion.dominance > 0.4) return 'Confident'
    return 'Reserved'
  }

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${display.bg} ${display.border} ${className}`}
        title={`Emotion: ${display.label} (${Math.round(emotion.confidence * 100)}% confidence)`}
      >
        <span className="text-sm">{display.emoji}</span>
        <span className={`text-xs font-medium ${display.color}`}>
          {Math.round(emotion.confidence * 100)}%
        </span>
      </div>
    )
  }

  return (
    <div className={`emotion-indicator ${className}`}>
      {/* Compact indicator (always visible) */}
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer transition-all duration-200 hover:shadow-sm ${display.bg} ${display.border} ${display.color}`}
        onClick={() => setExpanded(!expanded)}
        title="Click to view emotion details"
      >
        <span className="text-sm">{display.emoji}</span>
        <span className="text-xs font-medium">{display.label}</span>
        <span className="text-xs opacity-75">({Math.round(emotion.confidence * 100)}%)</span>
        {expanded ? (
          <ChevronUp className="w-3 h-3 opacity-50" />
        ) : (
          <ChevronDown className="w-3 h-3 opacity-50" />
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div
          className={`mt-2 p-3 rounded-lg ${display.bg} ${display.border} ${display.color} text-sm`}
        >
          {/* Primary emotion */}
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">{display.label}</span>
            <span className={`text-xs ${confidence.color}`}>
              {confidence.label} Confidence
            </span>
          </div>

          {/* Metrics */}
          <div className="space-y-2">
            {/* Valence (positive/negative) */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span>Sentiment</span>
                <span>{Math.round(emotion.valence * 100)}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    emotion.valence > 0.6
                      ? 'bg-green-500'
                      : emotion.valence < 0.4
                      ? 'bg-red-500'
                      : 'bg-slate-500'
                  }`}
                  style={{ width: `${emotion.valence * 100}%` }}
                />
              </div>
            </div>

            {/* Arousal (energy/intensity) */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span>Energy ({getArousalLabel()})</span>
                <span>{Math.round(emotion.arousal * 100)}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${emotion.arousal * 100}%` }}
                />
              </div>
            </div>

            {/* Dominance (confidence/assertiveness) */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span>Assertiveness ({getDominanceLabel()})</span>
                <span>{Math.round(emotion.dominance * 100)}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                <div
                  className="bg-purple-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${emotion.dominance * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Emotion labels */}
          {emotion.emotions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <div className="text-xs font-medium mb-1.5">Detected Emotions</div>
              <div className="flex flex-wrap gap-1">
                {emotion.emotions.map((e, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-xs rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600"
                  >
                    {e}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs opacity-75">
            Analyzed at {new Date(emotion.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  )
})

/**
 * Timeline of emotions during conversation
 */
export interface EmotionTimelineProps {
  /** Array of emotion analyses */
  emotions: EmotionAnalysis[]

  /** Maximum number of emotions to show */
  maxItems?: number

  /** Additional CSS classes */
  className?: string
}

export const EmotionTimeline = memo(function EmotionTimeline({
  emotions,
  maxItems = 20,
  className = '',
}: EmotionTimelineProps) {
  const displayEmotions = emotions.slice(-maxItems)

  if (displayEmotions.length === 0) {
    return null
  }

  return (
    <div className={`emotion-timeline ${className}`}>
      <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
        Emotional Journey ({displayEmotions.length} moments)
      </div>
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {displayEmotions.map((emotion, index) => {
          const getColor = () => {
            if (emotion.valence > 0.6) return 'bg-green-400 dark:bg-green-600'
            if (emotion.valence < 0.4) return 'bg-red-400 dark:bg-red-600'
            return 'bg-slate-400 dark:bg-slate-600'
          }

          return (
            <div
              key={emotion.segmentId}
              className={`w-2 h-8 rounded-sm ${getColor()} transition-all hover:scale-125 cursor-pointer`}
              style={{ opacity: 0.5 + emotion.confidence * 0.5 }}
              title={`${new Date(emotion.timestamp).toLocaleTimeString()}: ${emotion.emotions.join(', ')}`}
            />
          )
        })}
      </div>
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-500 mt-1">
        <span>{new Date(displayEmotions[0].timestamp).toLocaleTimeString()}</span>
        <span>{new Date(displayEmotions[displayEmotions.length - 1].timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  )
})

EmotionIndicator.displayName = 'EmotionIndicator'
EmotionTimeline.displayName = 'EmotionTimeline'
