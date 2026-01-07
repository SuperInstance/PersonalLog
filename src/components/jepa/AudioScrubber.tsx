/**
 * JEPA - Audio Scrubber Component
 *
 * Timeline seek control for audio playback and recording.
 * Allows users to navigate through audio with visual feedback.
 *
 * Features:
 * - Draggable seek bar
 * - Time display (current/total)
 * - Waveform preview
 * - Click-to-seek functionality
 * - Keyboard navigation
 * - Responsive design
 * - Accessible (ARIA labels)
 *
 * @module components/jepa/AudioScrubber
 */

'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Play, Pause } from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

export interface AudioScrubberProps {
  /** Current position in seconds */
  currentPosition: number

  /** Total duration in seconds */
  totalDuration: number

  /** Called when user seeks to a new position */
  onSeek: (position: number) => void

  /** Whether audio is currently playing */
  isPlaying?: boolean

  /** Whether to show time display */
  showTime?: boolean

  /** Whether scrubbing is disabled */
  disabled?: boolean

  /** Custom CSS classes */
  className?: string

  /** Waveform data (optional) for visual preview */
  waveform?: number[]

  /** Markers to show on timeline (e.g., transcript segments) */
  markers?: TimelineMarker[]
}

export interface TimelineMarker {
  /** Position in seconds */
  position: number

  /** Marker label */
  label?: string

  /** Marker color */
  color?: string

  /** Whether marker is interactive */
  interactive?: boolean
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface TimeDisplayProps {
  currentTime: number
  totalTime: number
}

function TimeDisplay({ currentTime, totalTime }: TimeDisplayProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-2 text-sm font-mono text-slate-700 dark:text-slate-300 tabular-nums">
      <span>{formatTime(currentTime)}</span>
      <span className="text-slate-400">/</span>
      <span className="text-slate-500 dark:text-slate-400">{formatTime(totalTime)}</span>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AudioScrubber({
  currentPosition,
  totalDuration,
  onSeek,
  isPlaying = false,
  showTime = true,
  disabled = false,
  className = '',
  waveform = [],
  markers = [],
}: AudioScrubberProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragPosition, setDragPosition] = useState<number | null>(null)
  const [hoverPosition, setHoverPosition] = useState<number | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const scrubberRef = useRef<HTMLDivElement>(null)

  // Calculate display position (current or drag)
  const displayPosition = dragPosition !== null ? dragPosition : currentPosition

  // Calculate progress percentage
  const progressPercent = totalDuration > 0 ? (displayPosition / totalDuration) * 100 : 0

  // ==========================================================================
  // SEEK HANDLING
  // ==========================================================================

  const handleSeek = useCallback(
    (clientX: number) => {
      if (disabled || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const x = clientX - rect.left
      const percent = Math.max(0, Math.min(1, x / rect.width))
      const newPosition = percent * totalDuration

      setDragPosition(newPosition)
      onSeek(newPosition)
    },
    [disabled, totalDuration, onSeek]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return
      setIsDragging(true)
      handleSeek(e.clientX)
    },
    [disabled, handleSeek]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return

      if (isDragging) {
        handleSeek(e.clientX)
      } else {
        // Update hover position for preview
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          const x = e.clientX - rect.left
          const percent = Math.max(0, Math.min(1, x / rect.width))
          setHoverPosition(percent * totalDuration)
        }
      }
    },
    [disabled, isDragging, handleSeek, totalDuration]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setDragPosition(null)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (!isDragging) {
      setHoverPosition(null)
    }
  }, [isDragging])

  // ==========================================================================
  // KEYBOARD NAVIGATION
  // ==========================================================================

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return

      const step = totalDuration / 100 // 1% of duration

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          onSeek(Math.max(0, currentPosition - step))
          break
        case 'ArrowRight':
          e.preventDefault()
          onSeek(Math.min(totalDuration, currentPosition + step))
          break
        case 'Home':
          e.preventDefault()
          onSeek(0)
          break
        case 'End':
          e.preventDefault()
          onSeek(totalDuration)
          break
      }
    },
    [disabled, totalDuration, currentPosition, onSeek]
  )

  // ==========================================================================
  // GLOBAL MOUSE EVENTS FOR DRAGGING
  // ==========================================================================

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        handleSeek(e.clientX)
      }

      const handleGlobalMouseUp = () => {
        setIsDragging(false)
        setDragPosition(null)
      }

      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove)
        document.removeEventListener('mouseup', handleGlobalMouseUp)
      }
    }
  }, [isDragging, handleSeek])

  // ==========================================================================
  // RENDER
  // ==========================================================================

  const waveformOpacity = disabled ? 0.3 : 1

  return (
    <div className={`audio-scrubber ${className}`}>
      {/* Time Display */}
      {showTime && (
        <div className="flex items-center justify-between mb-2">
          <TimeDisplay currentTime={displayPosition} totalTime={totalDuration} />
          {isPlaying && <Pause className="w-4 h-4 text-slate-500" />}
          {!isPlaying && <Play className="w-4 h-4 text-slate-500" />}
        </div>
      )}

      {/* Scrubber Track */}
      <div
        ref={containerRef}
        className={`
          relative h-12 bg-slate-100 dark:bg-slate-800
          rounded-lg cursor-pointer overflow-hidden
          transition-opacity duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}
        `}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="Audio scrubber"
        aria-valuemin={0}
        aria-valuemax={totalDuration}
        aria-valuenow={displayPosition}
        aria-disabled={disabled}
      >
        {/* Waveform Preview */}
        {waveform.length > 0 && (
          <div
            className="absolute inset-0 flex items-center justify-around px-2"
            style={{ opacity: waveformOpacity }}
          >
            {waveform.map((value, index) => (
              <div
                key={index}
                className="w-0.5 rounded-full bg-slate-300 dark:bg-slate-600"
                style={{
                  height: `${value * 100}%`,
                  opacity: index / waveform.length < progressPercent / 100 ? 1 : 0.3,
                }}
              />
            ))}
          </div>
        )}

        {/* Progress Fill */}
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-20"
          style={{ width: `${progressPercent}%` }}
        />

        {/* Timeline Markers */}
        {markers.map((marker, index) => {
          const markerPercent = totalDuration > 0 ? (marker.position / totalDuration) * 100 : 0
          return (
            <div
              key={index}
              className="absolute top-0 bottom-0 w-0.5 hover:w-1 transition-all duration-150 cursor-pointer"
              style={{
                left: `${markerPercent}%`,
                backgroundColor: marker.color || '#3b82f6',
              }}
              title={marker.label}
              onClick={(e) => {
                e.stopPropagation()
                if (marker.interactive && !disabled) {
                  onSeek(marker.position)
                }
              }}
            />
          )
        })}

        {/* Scrubber Handle */}
        <div
          ref={scrubberRef}
          className={`
            absolute top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500
            transition-all duration-75
            ${isDragging ? 'w-1.5' : ''}
          `}
          style={{ left: `${progressPercent}%` }}
        >
          {/* Handle Circle */}
          <div
            className={`
              absolute top-1/2 -translate-y-1/2 -translate-x-1/2
              w-4 h-4 rounded-full bg-white dark:bg-slate-900
              border-2 border-blue-500 shadow-lg
              transition-all duration-150
              ${isDragging ? 'scale-125' : 'hover:scale-110'}
            `}
          />
        </div>

        {/* Hover Preview */}
        {hoverPosition !== null && !isDragging && !disabled && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-400 dark:bg-slate-500"
            style={{
              left: `${(hoverPosition / totalDuration) * 100}%`,
            }}
          />
        )}

        {/* Hover Time Tooltip */}
        {hoverPosition !== null && !isDragging && !disabled && (
          <div
            className="absolute -top-8 px-2 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs rounded whitespace-nowrap"
            style={{
              left: `${(hoverPosition / totalDuration) * 100}%`,
              transform: 'translateX(-50%)',
            }}
          >
            {Math.floor(hoverPosition / 60)}:{(Math.floor(hoverPosition) % 60).toString().padStart(2, '0')}
          </div>
        )}
      </div>

      {/* Keyboard Hint */}
      {!disabled && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 text-center">
          Use arrow keys to seek, or click/drag on the timeline
        </p>
      )}
    </div>
  )
}

// ============================================================================
// DISPLAY NAME
// ============================================================================

AudioScrubber.displayName = 'AudioScrubber'
