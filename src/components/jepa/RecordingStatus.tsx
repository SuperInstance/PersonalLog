/**
 * JEPA Recording Status Component
 *
 * Visual feedback indicator for recording state.
 * Shows current status with appropriate colors and animations.
 *
 * @module components/jepa/RecordingStatus
 */

'use client'

import { memo } from 'react'
import { Circle, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import type { RecordingState } from '@/lib/jepa/types'

export interface RecordingStatusProps {
  /**
   * Current recording state
   */
  state: RecordingState

  /**
   * Recording duration in milliseconds (for display)
   */
  duration?: number

  /**
   * Error message to display (if in error state)
   */
  error?: string

  /**
   * Number of audio chunks buffered
   */
  chunkCount?: number

  /**
   * Whether to show detailed information
   */
  showDetails?: boolean

  /**
   * Additional CSS classes
   */
  className?: string
}

export const RecordingStatus = memo(function RecordingStatus({
  state,
  duration = 0,
  error,
  chunkCount = 0,
  showDetails = true,
  className = '',
}: RecordingStatusProps) {
  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const renderStatusIndicator = () => {
    switch (state) {
      case 'idle':
      case 'stopped':
        return (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Circle className="w-3 h-3 fill-slate-400 dark:fill-slate-600" />
            <span className="text-sm font-medium">Idle</span>
          </div>
        )

      case 'recording':
        return (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Circle className="w-3 h-3 fill-red-500 animate-pulse" />
            <span className="text-sm font-medium">Recording</span>
          </div>
        )

      case 'paused':
        return (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Clock className="w-3 h-3" />
            <span className="text-sm font-medium">Paused</span>
          </div>
        )

      case 'error':
        return (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-3 h-3" />
            <span className="text-sm font-medium">Error</span>
          </div>
        )

      default:
        return null
    }
  }

  const renderStatusText = () => {
    switch (state) {
      case 'idle':
      case 'stopped':
        return 'Ready to record'

      case 'recording':
        return `Recording in progress`

      case 'paused':
        return 'Recording paused'

      case 'error':
        return error || 'An error occurred'

      default:
        return 'Unknown state'
    }
  }

  const getStatusColor = () => {
    switch (state) {
      case 'idle':
      case 'stopped':
        return 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
      case 'recording':
        return 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
      case 'paused':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600'
      default:
        return 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
    }
  }

  return (
    <div
      className={`
        flex items-center justify-between gap-4 px-4 py-3 rounded-lg border-2
        transition-all duration-200
        ${getStatusColor()}
        ${className}
      `}
    >
      {/* Status Indicator */}
      <div className="flex items-center gap-3">
        {renderStatusIndicator()}
        <span className="text-sm text-slate-700 dark:text-slate-300">
          {renderStatusText()}
        </span>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
          {/* Duration */}
          {(state === 'recording' || state === 'paused') && duration > 0 && (
            <div className="font-mono">{formatDuration(duration)}</div>
          )}

          {/* Chunk Count */}
          {chunkCount > 0 && (
            <div className="text-xs">
              {chunkCount} {chunkCount === 1 ? 'chunk' : 'chunks'}
            </div>
          )}
        </div>
      )}
    </div>
  )
})

/**
 * Minimal status badge (compact version)
 */
export interface RecordingStatusBadgeProps {
  state: RecordingState
  className?: string
}

export const RecordingStatusBadge = memo(function RecordingStatusBadge({
  state,
  className = '',
}: RecordingStatusBadgeProps) {
  const getStatusColor = () => {
    switch (state) {
      case 'idle':
      case 'stopped':
        return 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
      case 'recording':
        return 'bg-red-500 text-white animate-pulse'
      case 'paused':
        return 'bg-amber-500 text-white'
      case 'error':
        return 'bg-red-600 text-white'
      default:
        return 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
    }
  }

  const getStatusText = () => {
    switch (state) {
      case 'idle':
      case 'stopped':
        return 'Idle'
      case 'recording':
        return 'Recording'
      case 'paused':
        return 'Paused'
      case 'error':
        return 'Error'
      default:
        return 'Unknown'
    }
  }

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md
        text-xs font-semibold
        transition-colors duration-200
        ${getStatusColor()}
        ${className}
      `}
    >
      <Circle className="w-2 h-2 fill-current" />
      <span>{getStatusText()}</span>
    </div>
  )
})

/**
 * Recording pulse indicator (for use in headers/titles)
 */
export interface RecordingPulseProps {
  isRecording: boolean
  className?: string
}

export const RecordingPulse = memo(function RecordingPulse({
  isRecording,
  className = '',
}: RecordingPulseProps) {
  if (!isRecording) {
    return null
  }

  return (
    <div
      className={`
        inline-flex items-center gap-2
        ${className}
      `}
    >
      <div className="relative">
        <Circle className="w-3 h-3 fill-red-500 text-red-500" />
        <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75" />
      </div>
      <span className="text-xs font-semibold text-red-600 dark:text-red-400">LIVE</span>
    </div>
  )
})
