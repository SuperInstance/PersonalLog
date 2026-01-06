/**
 * JEPA - Audio Visualizer Component
 *
 * Displays audio waveform with emotion-colored regions, playhead, and zoom controls.
 * Supports seeking, zooming, and export to PNG.
 */

'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import {
  drawCompleteVisualization,
  exportCanvasAsPNG,
  type EmotionRegion,
  type WaveformRenderOptions,
  type EmotionRenderOptions,
  xToTime,
} from '@/lib/jepa/waveform-renderer'

// ============================================================================
// TYPES
// ============================================================================

export interface AudioVisualizerProps {
  /** Audio buffer to visualize */
  audioBuffer: AudioBuffer | null

  /** Emotion regions to overlay */
  emotions?: EmotionRegion[]

  /** Current playback time (optional) */
  currentTime?: number

  /** Called when user seeks to a position */
  onSeek?: (time: number) => void

  /** Initial zoom level (default: 1) */
  initialZoom?: number

  /** Canvas width (default: 800) */
  width?: number

  /** Canvas height (default: 200) */
  height?: number

  /** Additional CSS classes */
  className?: string

  /** Rendering options */
  renderOptions?: WaveformRenderOptions & EmotionRenderOptions

  /** Show zoom controls (default: true) */
  showZoomControls?: boolean

  /** Show export button (default: true) */
  showExportButton?: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AudioVisualizer({
  audioBuffer,
  emotions = [],
  currentTime,
  onSeek,
  initialZoom = 1,
  width = 800,
  height = 200,
  className = '',
  renderOptions,
  showZoomControls = true,
  showExportButton = true,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [zoom, setZoom] = useState(initialZoom)
  const [hoverTime, setHoverTime] = useState<number | null>(null)

  // Draw waveform when dependencies change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !audioBuffer) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear and draw complete visualization
    drawCompleteVisualization(
      ctx,
      audioBuffer,
      emotions,
      currentTime,
      canvas.width,
      canvas.height,
      { ...renderOptions, zoom }
    )
  }, [audioBuffer, emotions, currentTime, zoom, renderOptions])

  // Handle mouse down (start seeking)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!audioBuffer || !onSeek) return
      setIsDragging(true)
      handleSeek(e)
    },
    [audioBuffer, onSeek]
  )

  // Handle mouse move (continue seeking or show hover time)
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas || !audioBuffer) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left

      // Calculate hover time
      const time = xToTime(x, audioBuffer.duration, canvas.width, zoom)
      setHoverTime(time)

      // Continue seeking if dragging
      if (isDragging && onSeek) {
        onSeek(time)
      }
    },
    [audioBuffer, isDragging, onSeek, zoom]
  )

  // Handle mouse up (stop seeking)
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Handle mouse leave (stop seeking and clear hover time)
  const handleMouseLeave = useCallback(() => {
    setIsDragging(false)
    setHoverTime(null)
  }, [])

  // Handle seek
  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas || !audioBuffer || !onSeek) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const time = xToTime(x, audioBuffer.duration, canvas.width, zoom)
      onSeek(time)
    },
    [audioBuffer, onSeek, zoom]
  )

  // Handle zoom in
  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(10, z * 2))
  }, [])

  // Handle zoom out
  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(1, z / 2))
  }, [])

  // Handle export
  const handleExport = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    exportCanvasAsPNG(canvas, `waveform-${timestamp}.png`)
  }, [])

  // Format time for display
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    const ms = Math.floor((time % 1) * 100)
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  if (!audioBuffer) {
    return (
      <div className={`audio-visualizer-placeholder ${className}`} style={{ width, height }}>
        <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-600">
          <span className="text-sm">No audio loaded</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`audio-visualizer ${className}`}>
      {/* Canvas container */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="cursor-crosshair rounded-lg border border-slate-200 dark:border-slate-700"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{ touchAction: 'none' }}
        />

        {/* Hover time tooltip */}
        {hoverTime !== null && !isDragging && (
          <div
            className="absolute pointer-events-none bg-slate-900 text-white text-xs px-2 py-1 rounded shadow-lg"
            style={{
              left: `${(hoverTime / audioBuffer.duration) * 100 * zoom}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {formatTime(hoverTime)}
          </div>
        )}

        {/* Current time indicator */}
        {currentTime !== undefined && (
          <div
            className="absolute pointer-events-none bg-blue-500 text-white text-xs px-2 py-1 rounded shadow-lg"
            style={{
              left: `${(currentTime / audioBuffer.duration) * 100 * zoom}%`,
              top: '0',
              transform: 'translate(-50%, 0)',
            }}
          >
            {formatTime(currentTime)}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mt-2 gap-2">
        {/* Zoom controls */}
        {showZoomControls && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 1}
              className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Zoom out"
            >
              Zoom Out
            </button>
            <span className="text-sm text-slate-600 dark:text-slate-400 font-mono">
              {zoom}x
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 10}
              className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Zoom in"
            >
              Zoom In
            </button>
          </div>
        )}

        {/* Duration display */}
        <div className="text-sm text-slate-600 dark:text-slate-400 font-mono">
          {formatTime(audioBuffer.duration)}
        </div>

        {/* Export button */}
        {showExportButton && (
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            aria-label="Export as PNG"
          >
            Export PNG
          </button>
        )}
      </div>

      {/* Emotion legend */}
      {emotions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {Array.from(new Set(emotions.map(e => e.emotion))).map(emotion => {
            const color = getEmotionColor(emotion)
            return (
              <div key={emotion} className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="capitalize text-slate-700 dark:text-slate-300">
                  {emotion}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get color for emotion label (from waveform-renderer)
 */
function getEmotionColor(emotion: string): string {
  const colors: Record<string, string> = {
    excited: '#10b981',
    calm: '#3b82f6',
    angry: '#ef4444',
    sad: '#8b5cf6',
    confident: '#f59e0b',
    neutral: '#6b7280'
  }
  return colors[emotion] || colors.neutral
}
