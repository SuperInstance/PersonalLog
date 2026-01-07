/**
 * JEPA - Emotion Timeline Component
 *
 * Visualizes emotion changes over time in a transcript.
 * Shows valence, arousal, and dominance as a line chart with colored regions.
 *
 * Features:
 * - Interactive emotion timeline
 * - Emotion category labels
 * - Color-coded emotion regions
 * - Click to seek to specific time
 * - Hover tooltips with emotion details
 * - Responsive design
 *
 * @module components/jepa/EmotionTimeline
 */

'use client'

import { useState, useCallback, useMemo } from 'react'
import { EmotionResult, EmotionCategory } from '@/lib/jepa/types'

// ============================================================================
// TYPES
// ============================================================================

export interface EmotionTimelineProps {
  /** Array of emotion data points over time */
  emotions: EmotionDataPoint[]

  /** Called when user clicks on a specific time */
  onSeek?: (time: number) => void

  /** Whether seeking is disabled */
  disabled?: boolean

  /** Custom CSS classes */
  className?: string

  /** Height of the timeline in pixels */
  height?: number

  /** Show emotion labels on timeline */
  showLabels?: boolean

  /** Show confidence scores */
  showConfidence?: boolean
}

export interface EmotionDataPoint {
  /** Time in seconds */
  time: number

  /** Emotion analysis result */
  emotion: EmotionResult

  /** Optional label (e.g., transcript segment text) */
  label?: string
}

// ============================================================================
// EMOTION COLORS
// ============================================================================

const EMOTION_COLORS: Record<EmotionCategory, string> = {
  excited: '#f59e0b',    // amber-500
  happy: '#22c55e',      // green-500
  calm: '#06b6d4',       // cyan-500
  relaxed: '#3b82f6',    // blue-500
  neutral: '#6b7280',    // gray-500
  bored: '#8b5cf6',      // purple-500
  sad: '#6366f1',        // indigo-500
  angry: '#ef4444',      // red-500
  anxious: '#f97316',    // orange-500
  tense: '#dc2626',      // red-600
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getEmotionColor(emotion: EmotionCategory): string {
  return EMOTION_COLORS[emotion] || EMOTION_COLORS.neutral
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EmotionTimeline({
  emotions,
  onSeek,
  disabled = false,
  className = '',
  height = 200,
  showLabels = true,
  showConfidence = false,
}: EmotionTimelineProps) {
  const [hoveredPoint, setHoveredPoint] = useState<EmotionDataPoint | null>(null)
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null)

  // Calculate timeline boundaries
  const { minTime, maxTime, duration } = useMemo(() => {
    if (emotions.length === 0) {
      return { minTime: 0, maxTime: 1, duration: 1 }
    }

    const times = emotions.map(e => e.time)
    const min = Math.min(...times)
    const max = Math.max(...times)

    return {
      minTime: min,
      maxTime: max,
      duration: max - min || 1, // Avoid division by zero
    }
  }, [emotions])

  // Generate path data for arousal line (intensity)
  const arousalPath = useMemo(() => {
    if (emotions.length === 0) return ''

    const points = emotions.map(point => {
      const x = ((point.time - minTime) / duration) * 100
      const y = 100 - (point.emotion.arousal * 100) // Invert Y (canvas coordinates)
      return `${x},${y}`
    })

    return `M ${points.join(' L ')}`
  }, [emotions, minTime, duration])

  // Generate path data for valence line (positive/negative)
  const valencePath = useMemo(() => {
    if (emotions.length === 0) return ''

    const points = emotions.map(point => {
      const x = ((point.time - minTime) / duration) * 100
      const y = 100 - (point.emotion.valence * 100)
      return `${x},${y}`
    })

    return `M ${points.join(' L ')}`
  }, [emotions, minTime, duration])

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (disabled) return

      const svg = e.currentTarget
      const rect = svg.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Find closest emotion point
      const time = minTime + (x / rect.width) * duration
      const closest = emotions.reduce((prev, curr) => {
        return Math.abs(curr.time - time) < Math.abs(prev.time - time) ? curr : prev
      }, emotions[0])

      if (closest && Math.abs(closest.time - time) < 5) { // Within 5 seconds
        setHoveredPoint(closest)
        setHoverPosition({ x, y })
      } else {
        setHoveredPoint(null)
        setHoverPosition(null)
      }
    },
    [disabled, emotions, minTime, duration]
  )

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null)
    setHoverPosition(null)
  }, [])

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (disabled || !onSeek) return

      const svg = e.currentTarget
      const rect = svg.getBoundingClientRect()
      const x = e.clientX - rect.left

      // Calculate time from position
      const time = minTime + (x / rect.width) * duration
      onSeek(time)
    },
    [disabled, onSeek, minTime, duration]
  )

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (emotions.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No emotion data available
        </p>
      </div>
    )
  }

  return (
    <div className={`emotion-timeline ${className}`}>
      {/* Timeline Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Emotion Timeline
        </h3>
        {hoveredPoint && (
          <div className="text-xs text-slate-600 dark:text-slate-400">
            {formatTime(hoveredPoint.time)}
          </div>
        )}
      </div>

      {/* SVG Timeline */}
      <div className="relative">
        <svg
          width="100%"
          height={height}
          className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          style={{ cursor: disabled ? 'not-allowed' : onSeek ? 'pointer' : 'default' }}
        >
          {/* Background Grid */}
          <defs>
            <pattern
              id="grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-slate-100 dark:text-slate-800"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Emotion Regions */}
          {emotions.map((point, index) => {
            const nextPoint = emotions[index + 1]
            if (!nextPoint) return null

            const x = ((point.time - minTime) / duration) * 100
            const nextX = ((nextPoint.time - minTime) / duration) * 100
            const width = nextX - x

            const color = getEmotionColor(point.emotion.emotion)

            return (
              <rect
                key={index}
                x={`${x}%`}
                y="0"
                width={`${width}%`}
                height="100%"
                fill={color}
                opacity="0.1"
              />
            )
          })}

          {/* Valence Line (Positive/Negative) */}
          <path
            d={valencePath}
            fill="none"
            stroke="#22c55e"
            strokeWidth="2"
            opacity="0.7"
            vectorEffect="non-scaling-stroke"
          />

          {/* Arousal Line (Intensity) */}
          <path
            d={arousalPath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            opacity="0.7"
            vectorEffect="non-scaling-stroke"
          />

          {/* Data Points */}
          {emotions.map((point, index) => {
            const x = ((point.time - minTime) / duration) * 100
            const y = 100 - (point.emotion.arousal * 100)
            const color = getEmotionColor(point.emotion.emotion)

            return (
              <circle
                key={index}
                cx={`${x}%`}
                cy={`${y}%`}
                r="4"
                fill={color}
                className="transition-all duration-150 hover:r-6"
                opacity={hoveredPoint === point ? 1 : 0.6}
              />
            )
          })}

          {/* Hover Point Indicator */}
          {hoveredPoint && hoverPosition && (
            <circle
              cx={`${((hoveredPoint.time - minTime) / duration) * 100}%`}
              cy={`${100 - hoveredPoint.emotion.arousal * 100}%`}
              r="6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-slate-900 dark:text-slate-100"
            />
          )}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint && hoverPosition && (
          <div
            className="absolute z-10 px-3 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs rounded-lg shadow-lg pointer-events-none"
            style={{
              left: hoverPosition.x,
              top: hoverPosition.y - 80,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="font-semibold capitalize">{hoveredPoint.emotion.emotion}</div>
            <div className="mt-1 space-y-0.5">
              <div>Valence: {hoveredPoint.emotion.valence.toFixed(2)}</div>
              <div>Arousal: {hoveredPoint.emotion.arousal.toFixed(2)}</div>
              <div>Dominance: {hoveredPoint.emotion.dominance.toFixed(2)}</div>
              {showConfidence && (
                <div>Confidence: {(hoveredPoint.emotion.confidence * 100).toFixed(0)}%</div>
              )}
            </div>
            {hoveredPoint.label && (
              <div className="mt-2 pt-2 border-t border-slate-700 dark:border-slate-300 italic opacity-80">
                "{hoveredPoint.label.slice(0, 50)}{hoveredPoint.label.length > 50 ? '...' : ''}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-green-500" />
          <span>Valence (Positive/Negative)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-amber-500" />
          <span>Arousal (Intensity)</span>
        </div>
      </div>

      {/* Emotion Labels */}
      {showLabels && (
        <div className="flex flex-wrap gap-2 mt-3">
          {Object.entries(EMOTION_COLORS).map(([emotion, color]) => (
            <div
              key={emotion}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="capitalize">{emotion}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// DISPLAY NAME
// ============================================================================

EmotionTimeline.displayName = 'EmotionTimeline'
