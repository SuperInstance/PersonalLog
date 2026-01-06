/**
 * JEPA - Audio Recording Controls
 *
 * React component for controlling audio recording with microphone,
 * including start/stop, pause/resume, and recording status display.
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '../ui/Button'
import { getAudioCapture } from '@/lib/jepa/audio-capture'
import { AudioState, AudioWindow } from '@/lib/jepa/types'

// ============================================================================
// TYPES
// ============================================================================

interface AudioControlsProps {
  /**
   * Callback when audio data is received (each 64ms window)
   */
  onData?: (window: AudioWindow) => void

  /**
   * Callback when recording state changes
   */
  onStateChange?: (state: AudioState) => void

  /**
   * Callback when recording is complete
   */
  onComplete?: (windows: AudioWindow[], duration: number) => void

  /**
   * Custom className for styling
   */
  className?: string

  /**
   * Show recording timer
   */
  showTimer?: boolean

  /**
   * Show audio level visualization
   */
  showLevel?: boolean
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface RecordingTimerProps {
  duration: number
}

function RecordingTimer({ duration }: RecordingTimerProps) {
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    const centiseconds = Math.floor((ms % 1000) / 10)

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="font-mono text-lg text-slate-700 dark:text-slate-300 tabular-nums">
      {formatTime(duration)}
    </div>
  )
}

interface AudioLevelMeterProps {
  level: number
  isActive: boolean
}

function AudioLevelMeter({ level, isActive }: AudioLevelMeterProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-75 rounded-full"
          style={{
            width: `${Math.min(level * 100, 100)}%`,
            backgroundColor: level > 0.8 ? '#ef4444' : level > 0.5 ? '#f59e0b' : '#22c55e',
            opacity: isActive ? 1 : 0.3,
          }}
        />
      </div>
      <span className="text-xs text-slate-500 dark:text-slate-400 w-12 tabular-nums">
        {(level * 100).toFixed(0)}%
      </span>
    </div>
  )
}

interface RecordingIndicatorProps {
  isRecording: boolean
}

function RecordingIndicator({ isRecording }: RecordingIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-3 h-3 rounded-full transition-all duration-200 ${
          isRecording
            ? 'bg-red-500 animate-pulse'
            : 'bg-slate-300 dark:bg-slate-600'
        }`}
      />
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {isRecording ? 'Recording' : 'Idle'}
      </span>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AudioControls({
  onData,
  onStateChange,
  onComplete,
  className = '',
  showTimer = true,
  showLevel = true,
}: AudioControlsProps) {
  const [audioState, setAudioState] = useState<AudioState>({
    state: 'idle',
    error: undefined,
    permissionsGranted: false,
    duration: 0,
    bufferSize: 0,
  })
  const [audioLevel, setAudioLevel] = useState<number>(0)
  const [isInitialized, setIsInitialized] = useState<boolean>(false)

  const audioCaptureRef = useRef(getAudioCapture())
  const levelUpdateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  useEffect(() => {
    const audioCapture = audioCaptureRef.current

    // Subscribe to state changes
    const unsubscribeState = audioCapture.onStateChange((state) => {
      setAudioState(state)
      onStateChange?.(state)

      // If recording stopped and has data, call onComplete
      if (state.state === 'stopped' && state.bufferSize > 0) {
        const windows = audioCapture.getWindows()
        onComplete?.(windows, state.duration)
      }
    })

    // Subscribe to audio data
    const unsubscribeData = audioCapture.onData((window) => {
      onData?.(window)
    })

    // Cleanup
    return () => {
      unsubscribeState()
      unsubscribeData()
    }
  }, [onData, onStateChange, onComplete])

  // ==========================================================================
  // AUDIO LEVEL MONITORING
  // ==========================================================================

  useEffect(() => {
    if (audioState.state === 'recording') {
      // Update audio level every 100ms
      levelUpdateIntervalRef.current = setInterval(() => {
        const level = audioCaptureRef.current.getCurrentAudioLevel()
        setAudioLevel(level)
      }, 100)
    } else {
      if (levelUpdateIntervalRef.current) {
        clearInterval(levelUpdateIntervalRef.current)
        levelUpdateIntervalRef.current = null
      }
      setAudioLevel(0)
    }

    return () => {
      if (levelUpdateIntervalRef.current) {
        clearInterval(levelUpdateIntervalRef.current)
      }
    }
  }, [audioState.state])

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  const handleInitialize = useCallback(async () => {
    try {
      const audioCapture = audioCaptureRef.current
      await audioCapture.initialize()
      setIsInitialized(true)
    } catch (error) {
      console.error('Failed to initialize audio capture:', error)
    }
  }, [])

  const handleStartRecording = useCallback(async () => {
    try {
      const audioCapture = audioCaptureRef.current
      await audioCapture.startRecording()
    } catch (error) {
      console.error('Failed to start recording:', error)
    }
  }, [])

  const handlePauseRecording = useCallback(() => {
    try {
      const audioCapture = audioCaptureRef.current
      audioCapture.pauseRecording()
    } catch (error) {
      console.error('Failed to pause recording:', error)
    }
  }, [])

  const handleResumeRecording = useCallback(async () => {
    try {
      const audioCapture = audioCaptureRef.current
      await audioCapture.resumeRecording()
    } catch (error) {
      console.error('Failed to resume recording:', error)
    }
  }, [])

  const handleStopRecording = useCallback(() => {
    try {
      const audioCapture = audioCaptureRef.current
      audioCapture.stopRecording()
    } catch (error) {
      console.error('Failed to stop recording:', error)
    }
  }, [])

  const handleReset = useCallback(() => {
    try {
      const audioCapture = audioCaptureRef.current
      audioCapture.reset()
      setIsInitialized(false)
    } catch (error) {
      console.error('Failed to reset:', error)
    }
  }, [])

  // ==========================================================================
  // RENDER
  // ==========================================================================

  const isRecording = audioState.state === 'recording'
  const isPaused = audioState.state === 'paused'
  const isStopped = audioState.state === 'stopped'
  const hasPermission = audioState.permissionsGranted

  return (
    <div className={`flex flex-col gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm ${className}`}>
      {/* Status Row */}
      <div className="flex items-center justify-between">
        <RecordingIndicator isRecording={isRecording} />
        {showTimer && (
          <RecordingTimer duration={audioState.duration} />
        )}
      </div>

      {/* Audio Level Meter */}
      {showLevel && (
        <AudioLevelMeter level={audioLevel} isActive={isRecording || isPaused} />
      )}

      {/* Error Display */}
      {audioState.error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{audioState.error}</p>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {!hasPermission ? (
          <Button
            onClick={handleInitialize}
            disabled={audioState.state === 'requesting'}
            size="md"
          >
            {audioState.state === 'requesting' ? 'Requesting...' : 'Enable Microphone'}
          </Button>
        ) : !isRecording && !isPaused && !isStopped ? (
          <Button
            onClick={handleStartRecording}
            variant="default"
            size="md"
          >
            Start Recording
          </Button>
        ) : null}

        {isRecording && (
          <Button
            onClick={handlePauseRecording}
            variant="outline"
            size="md"
          >
            Pause
          </Button>
        )}

        {isPaused && (
          <Button
            onClick={handleResumeRecording}
            variant="default"
            size="md"
          >
            Resume
          </Button>
        )}

        {(isRecording || isPaused) && (
          <Button
            onClick={handleStopRecording}
            variant="destructive"
            size="md"
          >
            Stop Recording
          </Button>
        )}

        {isStopped && (
          <>
            <Button
              onClick={handleStartRecording}
              variant="default"
              size="md"
            >
              New Recording
            </Button>
            <Button
              onClick={handleReset}
              variant="ghost"
              size="md"
            >
              Reset
            </Button>
          </>
        )}

        {hasPermission && !isRecording && !isPaused && !isStopped && (
          <Button
            onClick={handleReset}
            variant="ghost"
            size="md"
          >
            Reset
          </Button>
        )}
      </div>

      {/* Recording Info */}
      {(audioState.bufferSize > 0 || audioState.duration > 0) && (
        <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
          <span>Windows: {audioState.bufferSize}</span>
          <span>Duration: {(audioState.duration / 1000).toFixed(1)}s</span>
        </div>
      )}

      {/* Status Messages */}
      {!hasPermission && audioState.state === 'idle' && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Microphone access is required to record audio. Click &quot;Enable Microphone&quot; to continue.
        </p>
      )}
    </div>
  )
}

// ============================================================================
// DISPLAY NAME
// ============================================================================

AudioControls.displayName = 'AudioControls'
