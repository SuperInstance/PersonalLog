/**
 * JEPA Recording Controls Component
 *
 * Provides Start/Stop/Pause recording buttons with visual feedback.
 * Part of the JEPA (Joint Embedding Predictive Architecture) integration.
 *
 * @module components/jepa/RecordingControls
 */

'use client'

import { memo } from 'react'
import { Mic, MicOff, Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { RecordingState } from '@/lib/jepa/types'

export interface RecordingControlsProps {
  /**
   * Current recording state
   */
  state: RecordingState

  /**
   * Whether microphone permission has been granted
   */
  hasPermission: boolean

  /**
   * Whether an error has occurred
   */
  hasError: boolean

  /**
   * Callback when start recording is clicked
   */
  onStart?: () => void

  /**
   * Callback when stop recording is clicked
   */
  onStop?: () => void

  /**
   * Callback when pause recording is clicked
   */
  onPause?: () => void

  /**
   * Callback when resume recording is clicked
   */
  onResume?: () => void

  /**
   * Callback when retry is clicked (after error)
   */
  onRetry?: () => void

  /**
   * Whether controls are disabled
   */
  disabled?: boolean

  /**
   * Additional CSS classes
   */
  className?: string
}

export const RecordingControls = memo(function RecordingControls({
  state,
  hasPermission,
  hasError,
  onStart,
  onStop,
  onPause,
  onResume,
  onRetry,
  disabled = false,
  className = '',
}: RecordingControlsProps) {
  const isIdle = state === 'idle' || state === 'stopped'
  const isRecording = state === 'recording'
  const isPaused = state === 'paused'
  const isError = state === 'error'

  const canStart = isIdle && hasPermission && !hasError
  const canStop = (isRecording || isPaused) && !hasError
  const canPause = isRecording && !hasError
  const canResume = isPaused && !hasError
  const canRetry = isError && onRetry

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Start Recording Button */}
      {canStart && (
        <Button
          variant="default"
          size="lg"
          onClick={onStart}
          disabled={disabled}
          className="gap-2 shadow-lg hover:shadow-xl transition-all duration-200"
          title="Start recording audio"
        >
          <Mic className="w-5 h-5" />
          <span className="font-semibold">Start Recording</span>
        </Button>
      )}

      {/* Stop Recording Button */}
      {canStop && (
        <Button
          variant="destructive"
          size="lg"
          onClick={onStop}
          disabled={disabled}
          className="gap-2 shadow-lg hover:shadow-xl transition-all duration-200"
          title="Stop recording"
        >
          <MicOff className="w-5 h-5" />
          <span className="font-semibold">Stop Recording</span>
        </Button>
      )}

      {/* Pause Recording Button */}
      {canPause && (
        <Button
          variant="outline"
          size="md"
          onClick={onPause}
          disabled={disabled}
          className="gap-2"
          title="Pause recording"
        >
          <Pause className="w-4 h-4" />
          <span>Pause</span>
        </Button>
      )}

      {/* Resume Recording Button */}
      {canResume && (
        <Button
          variant="outline"
          size="md"
          onClick={onResume}
          disabled={disabled}
          className="gap-2"
          title="Resume recording"
        >
          <Play className="w-4 h-4" />
          <span>Resume</span>
        </Button>
      )}

      {/* Retry Button (Error State) */}
      {canRetry && (
        <Button
          variant="default"
          size="lg"
          onClick={onRetry}
          disabled={disabled}
          className="gap-2"
          title="Retry recording"
        >
          <Play className="w-5 h-5" />
          <span className="font-semibold">Retry</span>
        </Button>
      )}

      {/* Request Permission State */}
      {isIdle && !hasPermission && !hasError && (
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Microphone access required
        </div>
      )}
    </div>
  )
})

/**
 * Compact version of recording controls (minimal UI)
 */
export interface CompactRecordingControlsProps {
  state: RecordingState
  hasPermission: boolean
  hasError: boolean
  onToggle?: () => void
  disabled?: boolean
  className?: string
}

export const CompactRecordingControls = memo(function CompactRecordingControls({
  state,
  hasPermission,
  hasError,
  onToggle,
  disabled = false,
  className = '',
}: CompactRecordingControlsProps) {
  const isIdle = state === 'idle' || state === 'stopped'
  const isRecording = state === 'recording'
  const isPaused = state === 'paused'
  const isError = state === 'error'

  const canToggle = (isIdle || isRecording || isPaused) && hasPermission && !hasError

  return (
    <Button
      variant={isRecording ? 'destructive' : 'default'}
      size="md"
      onClick={onToggle}
      disabled={disabled || !canToggle}
      className={`${className} ${
        isRecording ? 'animate-pulse' : ''
      }`}
      title={
        isRecording
          ? 'Stop recording'
          : isPaused
          ? 'Resume recording'
          : 'Start recording'
      }
    >
      {isRecording || isPaused ? (
        <MicOff className="w-4 h-4" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </Button>
  )
})
