/**
 * JEPA - Enhanced Audio Waveform Visualization Component
 *
 * Advanced real-time audio waveform visualization with multiple modes:
 * - Waveform (time-domain visualization)
 * - Frequency spectrum (FFT visualization)
 * - Combined (both waveform and frequency)
 *
 * Features:
 * - Real-time amplitude display with VU meter
 * - Peak indicators (max volume levels)
 * - Clipping indicators (when audio is too loud)
 * - Frequency spectrum display (FFT visualization)
 * - Emotion-aware color coding
 * - Recording level meter (VU meter style)
 * - Click to seek functionality
 * - Zoom in/out on waveform
 * - Hover to see timestamp and amplitude
 * - Mobile-responsive with touch gestures
 * - 60fps performance with requestAnimationFrame
 *
 * @module components/jepa/EnhancedAudioWaveform
 */

'use client'

import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import {
  renderEnhancedWaveform,
  calculateAmplitude,
  detectClipping,
  getEmotionCategories,
  type WaveformData,
  type EnhancedWaveformOptions,
  type VisualizationMode,
  type EmotionCategory,
} from '@/lib/jepa/enhanced-waveform-renderer'

// ============================================================================
// TYPES
// ============================================================================

export type { WaveformData, EnhancedWaveformOptions, VisualizationMode, EmotionCategory }

export interface EnhancedAudioWaveformProps {
  /** Analyser node from Web Audio API */
  analyser: AnalyserNode | null

  /** Current recording state */
  state: 'idle' | 'recording' | 'paused'

  /** Emotion category for color coding */
  emotion?: EmotionCategory

  /** Visualization mode */
  mode?: VisualizationMode

  /** Canvas width (default: 800) */
  width?: number

  /** Canvas height (default: 300) */
  height?: number

  /** Show grid lines (default: false) */
  showGrid?: boolean

  /** Show peak indicators (default: false) */
  showPeaks?: boolean

  /** Show clipping indicators (default: true) */
  showClipping?: boolean

  /** Clipping threshold (0-1, default: 0.95) */
  clippingThreshold?: number

  /** Show VU meter (default: true) */
  showVUMeter?: boolean

  /** VU meter position (default: 'left') */
  vuMeterPosition?: 'left' | 'right' | 'both'

  /** Background color (default: transparent) */
  backgroundColor?: string

  /** Additional CSS classes */
  className?: string

  /** Enable click to seek (default: false for real-time) */
  enableSeek?: boolean

  /** Enable zoom (default: true) */
  enableZoom?: boolean

  /** Enable touch gestures (default: true) */
  enableTouch?: boolean

  /** Called when user clicks to seek */
  onSeek?: (time: number) => void

  /** Called when clipping is detected */
  onClipping?: (isClipping: boolean) => void

  /** Show mode selector (default: true) */
  showModeSelector?: boolean

  /** Show controls (default: true) */
  showControls?: boolean
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface ModeSelectorProps {
  currentMode: VisualizationMode
  onModeChange: (mode: VisualizationMode) => void
  disabled?: boolean
}

function ModeSelector({ currentMode, onModeChange, disabled }: ModeSelectorProps) {
  const modes: { value: VisualizationMode; label: string; icon: string }[] = [
    { value: 'waveform', label: 'Waveform', icon: '∿' },
    { value: 'frequency', label: 'Frequency', icon: '≈' },
    { value: 'combined', label: 'Combined', icon: '⚡' },
  ]

  return (
    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
      {modes.map(mode => (
        <button
          key={mode.value}
          onClick={() => onModeChange(mode.value)}
          disabled={disabled}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            currentMode === mode.value
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label={`Switch to ${mode.label} mode`}
          title={mode.label}
        >
          <span className="mr-1">{mode.icon}</span>
          <span className="hidden sm:inline">{mode.label}</span>
        </button>
      ))}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EnhancedAudioWaveform({
  analyser,
  state,
  emotion = 'neutral',
  mode: initialMode = 'waveform',
  width = 800,
  height = 300,
  showGrid = false,
  showPeaks = false,
  showClipping = true,
  clippingThreshold = 0.95,
  showVUMeter = true,
  vuMeterPosition = 'left',
  backgroundColor = 'transparent',
  className = '',
  enableSeek = false,
  enableZoom = true,
  enableTouch = true,
  onSeek,
  onClipping,
  showModeSelector = true,
  showControls = true,
}: EnhancedAudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const [mode, setMode] = useState<VisualizationMode>(initialMode)
  const [zoom, setZoom] = useState(1)
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [peakAmplitude, setPeakAmplitude] = useState(0)
  const [isClipping, setIsClipping] = useState(false)
  const [currentAmplitude, setCurrentAmplitude] = useState(0)
  const [touchDistance, setTouchDistance] = useState(0)

  // Refs for tracking peaks
  const peakRef = useRef(0)
  const clippingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Update peak tracking
  useEffect(() => {
    if (currentAmplitude > peakRef.current) {
      peakRef.current = currentAmplitude
      setPeakAmplitude(currentAmplitude)
    }

    // Decay peak slowly
    const decayInterval = setInterval(() => {
      peakRef.current = Math.max(0, peakRef.current - 0.01)
      setPeakAmplitude(peakRef.current)
    }, 100)

    return () => clearInterval(decayInterval)
  }, [currentAmplitude])

  // Handle clipping detection callback
  useEffect(() => {
    if (onClipping && isClipping) {
      onClipping(true)

      // Clear previous timeout
      if (clippingTimeoutRef.current) {
        clearTimeout(clippingTimeoutRef.current)
      }

      // Auto-clear clipping warning after 2 seconds
      clippingTimeoutRef.current = setTimeout(() => {
        onClipping(false)
      }, 2000)
    }

    return () => {
      if (clippingTimeoutRef.current) {
        clearTimeout(clippingTimeoutRef.current)
      }
    }
  }, [isClipping, onClipping])

  // Canvas rendering loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !analyser || state === 'idle') {
      return
    }

    const ctx = canvas.getContext('2d', { alpha: backgroundColor === 'transparent' })
    if (!ctx) return

    // Set canvas resolution for high DPI displays
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    // Create data arrays
    const timeDomainArray = new Float32Array(analyser.fftSize)
    const frequencyArray = new Uint8Array(analyser.frequencyBinCount)

    let animationId: number
    let lastFrameTime = performance.now()
    let smoothedAmplitude = 0

    const render = () => {
      animationId = requestAnimationFrame(render)

      // Calculate delta time for smooth animations
      const currentTime = performance.now()
      const deltaTime = currentTime - lastFrameTime
      lastFrameTime = currentTime

      // Get audio data
      analyser.getFloatTimeDomainData(timeDomainArray)
      analyser.getByteFrequencyData(frequencyArray)

      // Calculate amplitude
      const amplitude = calculateAmplitude(timeDomainArray)
      const smoothingFactor = 0.3
      smoothedAmplitude = smoothedAmplitude * (1 - smoothingFactor) + amplitude * smoothingFactor
      setCurrentAmplitude(smoothedAmplitude)

      // Detect clipping
      const clipping = detectClipping(timeDomainArray, clippingThreshold)
      setIsClipping(clipping)

      // Create waveform data
      const waveformData: WaveformData = {
        timeDomain: timeDomainArray,
        frequency: frequencyArray,
        amplitude: smoothedAmplitude,
        peak: peakRef.current,
        isClipping: clipping,
      }

      // Render visualization
      renderEnhancedWaveform(ctx, waveformData, width, height, {
        mode,
        padding: showVUMeter ? 20 : 10,
        showGrid,
        showPeaks,
        showClipping,
        showVUMeter,
        vuMeterPosition,
        emotion,
        zoom,
        smooth: true,
        backgroundColor,
      })
    }

    render()

    // Cleanup
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [
    analyser,
    state,
    width,
    height,
    mode,
    showGrid,
    showPeaks,
    showClipping,
    showVUMeter,
    vuMeterPosition,
    emotion,
    zoom,
    clippingThreshold,
    backgroundColor,
    peakAmplitude,
  ])

  // Handle mouse move (hover info)
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      setHoverPosition({ x, y })

      // Handle seeking if dragging
      if (isDragging && enableSeek && onSeek) {
        // For real-time visualization, we don't have a duration
        // This would be used for playback mode
        const time = (x / width) * 10 // Placeholder: 10 seconds
        onSeek(time)
      }
    },
    [isDragging, enableSeek, onSeek, width]
  )

  // Handle mouse down (start dragging)
  const handleMouseDown = useCallback(() => {
    if (enableSeek) {
      setIsDragging(true)
    }
  }, [enableSeek])

  // Handle mouse up (stop dragging)
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Handle mouse leave (clear hover)
  const handleMouseLeave = useCallback(() => {
    setHoverPosition(null)
    setIsDragging(false)
  }, [])

  // Handle wheel (zoom)
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      if (!enableZoom) return

      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      setZoom(z => Math.max(1, Math.min(10, z * delta)))
    },
    [enableZoom]
  )

  // Handle touch start (pinch to zoom)
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!enableTouch || e.touches.length !== 2) return

      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY)
      setTouchDistance(distance)
    },
    [enableTouch]
  )

  // Handle touch move (pinch to zoom)
  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!enableTouch || e.touches.length !== 2) return

      e.preventDefault()
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY)

      if (touchDistance > 0) {
        const delta = distance / touchDistance
        setZoom(z => Math.max(1, Math.min(10, z * delta)))
      }

      setTouchDistance(distance)
    },
    [enableTouch, touchDistance]
  )

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    setTouchDistance(0)
  }, [])

  // Handle zoom in
  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(10, z * 2))
  }, [])

  // Handle zoom out
  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(1, z / 2))
  }, [])

  // Handle reset zoom
  const handleResetZoom = useCallback(() => {
    setZoom(1)
  }, [])

  // Don't render if idle
  if (state === 'idle') {
    return (
      <div
        className={`enhanced-audio-waveform-idle ${className}`}
        style={{ width, height }}
        role="img"
        aria-label="Audio waveform idle"
      >
        <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-600">
          <div className="text-center space-y-2">
            <div className="text-4xl opacity-50">∿</div>
            <p className="text-sm font-medium">Ready to record</p>
            <p className="text-xs">Enhanced waveform visualization</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`enhanced-audio-waveform ${className}`}>
      <div className="relative">
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-crosshair"
          style={{
            width: `${width}px`,
            height: `${height}px`,
            touchAction: enableTouch ? 'none' : 'auto',
          }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          role="img"
          aria-label={`Enhanced audio waveform - ${mode} mode - ${state}`}
        />

        {/* Recording indicator */}
        {state === 'recording' && (
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">
              Recording
            </span>
          </div>
        )}

        {/* Paused indicator */}
        {state === 'paused' && (
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">
              Paused
            </span>
          </div>
        )}

        {/* Clipping warning */}
        {isClipping && showClipping && (
          <div className="absolute top-3 left-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium animate-pulse">
              <span>⚠️</span>
              <span>Clipping!</span>
            </div>
          </div>
        )}

        {/* Hover info */}
        {hoverPosition && !isDragging && (
          <div
            className="absolute pointer-events-none bg-slate-900/90 text-white text-xs px-2 py-1 rounded shadow-lg backdrop-blur-sm"
            style={{
              left: `${hoverPosition.x + 10}px`,
              top: `${hoverPosition.y - 30}px`,
            }}
          >
            <div>Amplitude: {(currentAmplitude * 100).toFixed(1)}%</div>
            <div>Peak: {(peakAmplitude * 100).toFixed(1)}%</div>
          </div>
        )}

        {/* Current amplitude badge */}
        {showVUMeter && (
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-900/80 text-white backdrop-blur-sm">
              {currentAmplitude.toFixed(2)} dB
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      {showControls && (
        <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
          {/* Mode selector */}
          {showModeSelector && (
            <ModeSelector
              currentMode={mode}
              onModeChange={setMode}
              disabled={state !== 'recording' && state !== 'paused'}
            />
          )}

          {/* Zoom controls */}
          {enableZoom && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Zoom out"
              >
                −
              </button>
              <span className="text-sm text-slate-600 dark:text-slate-400 font-mono min-w-[3rem] text-center">
                {zoom.toFixed(1)}x
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 10}
                className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Zoom in"
              >
                +
              </button>
              <button
                onClick={handleResetZoom}
                className="px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                aria-label="Reset zoom"
              >
                Reset
              </button>
            </div>
          )}

          {/* Emotion indicator */}
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-sm"
              style={
                emotion !== 'neutral'
                  ? { background: `linear-gradient(135deg, ${getEmotionColor(emotion, 'primary')}, ${getEmotionColor(emotion, 'secondary')})` }
                  : { backgroundColor: '#6b7280' }
              }
            />
            <span className="text-xs text-slate-600 dark:text-slate-400 capitalize">
              {emotion}
            </span>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 text-center">
        {enableZoom && 'Scroll or pinch to zoom • '}
        {enableSeek && 'Click and drag to seek • '}
        Hover to see amplitude details
      </div>
    </div>
  )
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getEmotionColor(emotion: EmotionCategory, shade: 'primary' | 'secondary'): string {
  const colors: Record<EmotionCategory, { primary: string; secondary: string }> = {
    excited: { primary: '#10b981', secondary: '#34d399' },
    calm: { primary: '#3b82f6', secondary: '#60a5fa' },
    angry: { primary: '#ef4444', secondary: '#f87171' },
    sad: { primary: '#8b5cf6', secondary: '#a78bfa' },
    confident: { primary: '#f59e0b', secondary: '#fbbf24' },
    neutral: { primary: '#6b7280', secondary: '#9ca3af' },
  }
  return colors[emotion]?.[shade] || colors.neutral[shade]
}

// ============================================================================
// EXPORTS
// ============================================================================

export { getEmotionCategories }
