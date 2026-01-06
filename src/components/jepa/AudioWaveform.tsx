/**
 * JEPA - Audio Waveform Visualization Component
 *
 * Real-time audio waveform visualization with beautiful gradient rendering.
 * Displays live audio data during recording with smooth 60fps canvas rendering.
 *
 * Features:
 * - Real-time waveform visualization from Web Audio API
 * - Beautiful gradient colors (blue to purple)
 * - Recording state indication with pulse effect
 * - Multiple states: Idle, Recording, Paused
 * - Performance optimized with requestAnimationFrame
 * - Mobile responsive
 * - Accessible (aria-label, screen reader support)
 *
 * @module components/jepa/AudioWaveform
 */

'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

// ============================================================================
// TYPES
// ============================================================================

export type WaveformState = 'idle' | 'recording' | 'paused'

export interface AudioWaveformProps {
  /** Analyser node from AudioCapture system */
  analyser: AnalyserNode | null

  /** Current recording state */
  state: WaveformState

  /** Canvas width (default: 800) */
  width?: number

  /** Canvas height (default: 200) */
  height?: number

  /** Waveform line width (default: 2) */
  lineWidth?: number

  /** Show gradient fill (default: true) */
  showGradient?: boolean

  /** Show recording indicator (default: true) */
  showRecordingIndicator?: boolean

  /** Additional CSS classes */
  className?: string

  /** Custom colors (optional) */
  colors?: {
    /** Gradient start color (top) */
    start?: string
    /** Gradient end color (bottom) */
    end?: string
    /** Waveform line color */
    line?: string
    /** Recording indicator color */
    recording?: string
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AudioWaveform({
  analyser,
  state,
  width = 800,
  height = 200,
  lineWidth = 2,
  showGradient = true,
  showRecordingIndicator = true,
  className = '',
  colors,
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const [isRecordingPulse, setIsRecordingPulse] = useState(false)

  // Default colors (blue to purple gradient)
  const defaultColors = {
    start: colors?.start || '#3b82f6', // blue-500
    end: colors?.end || '#8b5cf6', // purple-500
    line: colors?.line || '#60a5fa', // blue-400
    recording: colors?.recording || '#ef4444', // red-500
  }

  // Pulse animation for recording indicator
  useEffect(() => {
    if (state === 'recording') {
      const interval = setInterval(() => {
        setIsRecordingPulse(prev => !prev)
      }, 1000) // 1 second pulse
      return () => clearInterval(interval)
    } else {
      setIsRecordingPulse(false)
    }
  }, [state])

  // Canvas rendering loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !analyser || state === 'idle') {
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas resolution for high DPI displays
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    // Create data array for waveform
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    let animationId: number

    const render = () => {
      animationId = requestAnimationFrame(render)

      // Get time-domain data (waveform)
      analyser.getByteTimeDomainData(dataArray)

      // Clear canvas
      ctx.clearRect(0, 0, width, height)

      // Create gradient
      let gradient: CanvasGradient | null = null
      if (showGradient) {
        gradient = ctx.createLinearGradient(0, 0, 0, height)
        gradient.addColorStop(0, defaultColors.start)
        gradient.addColorStop(1, defaultColors.end)
      }

      // Draw waveform
      ctx.lineWidth = lineWidth
      ctx.strokeStyle = gradient || defaultColors.line
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.beginPath()

      const sliceWidth = width / bufferLength
      let x = 0

      // Move to first point
      const firstY = (dataArray[0] / 128.0) * (height / 2)
      ctx.moveTo(x, firstY)
      x += sliceWidth

      // Draw waveform line
      for (let i = 1; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = (v * height) / 2

        // Smooth curve using quadratic bezier
        if (i === 1) {
          ctx.lineTo(x, y)
        } else {
          const prevX = x - sliceWidth
          const prevV = dataArray[i - 1] / 128.0
          const prevY = (prevV * height) / 2
          const cpX = (prevX + x) / 2
          const cpY = (prevY + y) / 2
          ctx.quadraticCurveTo(prevX, prevY, cpX, cpY)
        }

        x += sliceWidth
      }

      ctx.stroke()

      // Fill gradient below waveform
      if (showGradient && gradient) {
        ctx.lineTo(width, height)
        ctx.lineTo(0, height)
        ctx.closePath()
        ctx.globalAlpha = 0.2
        ctx.fillStyle = gradient
        ctx.fill()
        ctx.globalAlpha = 1.0
      }

      // Draw recording glow effect
      if (state === 'recording') {
        const glowAlpha = isRecordingPulse ? 0.15 : 0.05
        ctx.shadowBlur = isRecordingPulse ? 20 : 10
        ctx.shadowColor = defaultColors.recording
        ctx.globalAlpha = glowAlpha
        ctx.fillStyle = defaultColors.recording
        ctx.fillRect(0, 0, width, height)
        ctx.globalAlpha = 1.0
        ctx.shadowBlur = 0
      }

      // Draw center line when paused
      if (state === 'paused') {
        ctx.beginPath()
        ctx.moveTo(0, height / 2)
        ctx.lineTo(width, height / 2)
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)' // slate-500 with opacity
        ctx.lineWidth = 1
        ctx.setLineDash([5, 5])
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    render()

    // Cleanup
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [analyser, state, width, height, lineWidth, showGradient, defaultColors, isRecordingPulse])

  // Don't render if idle
  if (state === 'idle') {
    return (
      <div
        className={`audio-waveform-idle ${className}`}
        style={{ width, height }}
        role="img"
        aria-label="Audio waveform idle"
      >
        <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-600">
          <div className="text-center space-y-2">
            <div className="text-4xl opacity-50">∿</div>
            <p className="text-sm">Ready to record</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`audio-waveform ${className}`} role="img" aria-label={`Audio waveform - ${state}`}>
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
          style={{
            width: `${width}px`,
            height: `${height}px`,
          }}
        />

        {/* Recording Indicator */}
        {showRecordingIndicator && state === 'recording' && (
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                isRecordingPulse ? 'bg-red-500 scale-110' : 'bg-red-600'
              }`}
              style={{
                boxShadow: isRecordingPulse
                  ? '0 0 20px rgba(239, 68, 68, 0.6)'
                  : '0 0 10px rgba(239, 68, 68, 0.4)',
              }}
            />
            <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">
              Recording
            </span>
          </div>
        )}

        {/* Paused Indicator */}
        {showRecordingIndicator && state === 'paused' && (
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">
              Paused
            </span>
          </div>
        )}

        {/* State Badge (Bottom Left) */}
        <div className="absolute bottom-3 left-3">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium uppercase tracking-wider ${
              state === 'recording'
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            }`}
          >
            {state === 'recording' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
                Live
              </>
            ) : (
              'Paused'
            )}
          </span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// COMPACT WAVEFORM COMPONENT
// ============================================================================

export interface CompactAudioWaveformProps {
  analyser: AnalyserNode | null
  state: WaveformState
  width?: number
  height?: number
  className?: string
}

/**
 * Compact version for embedding in tight spaces (e.g., header, toolbar)
 */
export function CompactAudioWaveform({
  analyser,
  state,
  width = 300,
  height = 60,
  className = '',
}: CompactAudioWaveformProps) {
  return (
    <AudioWaveform
      analyser={analyser}
      state={state}
      width={width}
      height={height}
      lineWidth={1.5}
      showGradient={true}
      showRecordingIndicator={false}
      className={className}
    />
  )
}

// ============================================================================
// WAVEFORM WITH CONTROLS
// ============================================================================

export interface AudioWaveformWithControlsProps extends AudioWaveformProps {
  /** Called when user clicks to pause/resume */
  onPauseToggle?: () => void

  /** Whether pause toggle is disabled */
  pauseDisabled?: boolean

  /** Show pause button (default: true) */
  showPauseButton?: boolean
}

/**
 * Waveform with integrated pause/resume control
 */
export function AudioWaveformWithControls({
  analyser,
  state,
  onPauseToggle,
  pauseDisabled = false,
  showPauseButton = true,
  ...waveformProps
}: AudioWaveformWithControlsProps) {
  const handlePauseToggle = useCallback(() => {
    if (!pauseDisabled && onPauseToggle) {
      onPauseToggle()
    }
  }, [pauseDisabled, onPauseToggle])

  const isRecording = state === 'recording'
  const isPaused = state === 'paused'

  return (
    <div className="audio-waveform-with-controls">
      <div
        onClick={handlePauseToggle}
        className="cursor-pointer"
        role="button"
        tabIndex={0}
        aria-label={isRecording ? 'Pause recording' : 'Resume recording'}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handlePauseToggle()
          }
        }}
      >
        <AudioWaveform
          analyser={analyser}
          state={state}
          {...waveformProps}
          className={waveformProps.className || ''}
        />
      </div>

      {showPauseButton && (isRecording || isPaused) && (
        <div className="mt-3 flex items-center justify-center">
          <button
            onClick={handlePauseToggle}
            disabled={pauseDisabled}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              pauseDisabled
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : isRecording
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400'
            }`}
            aria-label={isRecording ? 'Pause recording' : 'Resume recording'}
          >
            {isRecording ? '⏸ Pause' : '▶ Resume'}
          </button>
        </div>
      )}

      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 text-center">
        {isRecording
          ? 'Click waveform or button to pause'
          : isPaused
          ? 'Click to resume recording'
          : 'Start recording to see waveform'}
      </p>
    </div>
  )
}
