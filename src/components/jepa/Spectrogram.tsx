/**
 * JEPA - Spectrogram Component
 *
 * Displays frequency spectrum heatmap over time.
 * Supports color schemes, zoom, and real-time updates.
 */

'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import {
  computeSpectrogram,
  drawSpectrogram,
  type SpectrogramRenderOptions,
  type ColorScheme,
} from '@/lib/jepa/spectrogram-renderer'

// ============================================================================
// TYPES
// ============================================================================

export interface SpectrogramProps {
  /** Audio buffer to visualize */
  audioBuffer: AudioBuffer | null

  /** Initial zoom level (default: 1) */
  initialZoom?: number

  /** Canvas width (default: 800) */
  width?: number

  /** Canvas height (default: 200) */
  height?: number

  /** Additional CSS classes */
  className?: string

  /** Rendering options */
  renderOptions?: SpectrogramRenderOptions

  /** Show color scheme selector (default: true) */
  showColorSchemeSelector?: boolean

  /** Show zoom controls (default: true) */
  showZoomControls?: boolean

  /** Show legend (default: true) */
  showLegend?: boolean

  /** Show export button (default: true) */
  showExportButton?: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export function Spectrogram({
  audioBuffer,
  initialZoom = 1,
  width = 800,
  height = 200,
  className = '',
  renderOptions,
  showColorSchemeSelector = true,
  showZoomControls = true,
  showLegend = true,
  showExportButton = true,
}: SpectrogramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [spectrogram, setSpectrogram] = useState<Float32Array | null>(null)
  const [numFrames, setNumFrames] = useState(0)
  const [numFreqs, setNumFreqs] = useState(0)
  const [zoom, setZoom] = useState(initialZoom)
  const [colorScheme, setColorScheme] = useState<ColorScheme>('viridis')
  const [isComputing, setIsComputing] = useState(false)

  // Compute spectrogram when audio buffer changes
  useEffect(() => {
    if (!audioBuffer) return

    const compute = async () => {
      setIsComputing(true)
      try {
        const spec = await computeSpectrogram(audioBuffer, renderOptions)

        const fftSize = renderOptions?.fftSize || 2048
        const hopSize = renderOptions?.hopSize || 512
        const data = audioBuffer.getChannelData(0)
        const frames = Math.floor((data.length - fftSize) / hopSize) + 1

        setSpectrogram(spec)
        setNumFrames(frames)
        setNumFreqs(fftSize / 2)
      } catch (error) {
        console.error('Failed to compute spectrogram:', error)
      } finally {
        setIsComputing(false)
      }
    }

    compute()
  }, [audioBuffer, renderOptions])

  // Draw spectrogram when dependencies change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !spectrogram) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    drawSpectrogram(
      ctx,
      spectrogram,
      numFrames,
      numFreqs,
      canvas.width,
      canvas.height,
      { ...renderOptions, zoom, colorScheme }
    )
  }, [spectrogram, numFrames, numFreqs, zoom, colorScheme, renderOptions])

  // Handle zoom in
  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(10, z * 2))
  }, [])

  // Handle zoom out
  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(1, z / 2))
  }, [])

  // Handle color scheme change
  const handleColorSchemeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setColorScheme(e.target.value as ColorScheme)
    },
    []
  )

  // Handle export
  const handleExport = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    link.download = `spectrogram-${timestamp}.png`
    link.href = dataUrl
    link.click()
  }, [])

  if (!audioBuffer) {
    return (
      <div className={`spectrogram-placeholder ${className}`} style={{ width, height }}>
        <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-600">
          <span className="text-sm">No audio loaded</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`spectrogram ${className}`}>
      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="rounded-lg border border-slate-200 dark:border-slate-700"
        />

        {/* Loading overlay */}
        {isComputing && (
          <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 flex items-center justify-center rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-700 dark:text-slate-300">Computing spectrogram...</span>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
        {/* Color scheme selector */}
        {showColorSchemeSelector && (
          <div className="flex items-center gap-2">
            <label htmlFor="color-scheme" className="text-sm text-slate-600 dark:text-slate-400">
              Color:
            </label>
            <select
              id="color-scheme"
              value={colorScheme}
              onChange={handleColorSchemeChange}
              className="px-2 py-1 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <option value="viridis">Viridis</option>
              <option value="magma">Magma</option>
              <option value="grayscale">Grayscale</option>
            </select>
          </div>
        )}

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

        {/* Export button */}
        {showExportButton && (
          <button
            onClick={handleExport}
            disabled={isComputing}
            className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Export as PNG"
          >
            Export PNG
          </button>
        )}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="mt-3">
          <ColorLegend colorScheme={colorScheme} />
        </div>
      )}
    </div>
  )
}

// ============================================================================
// COLOR LEGEND COMPONENT
// ============================================================================

interface ColorLegendProps {
  colorScheme: ColorScheme
}

function ColorLegend({ colorScheme }: ColorLegendProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Draw gradient
    const gradient = ctx.createLinearGradient(0, 0, width, 0)

    if (colorScheme === 'viridis') {
      gradient.addColorStop(0, 'rgb(68, 1, 84)')
      gradient.addColorStop(0.25, 'rgb(59, 82, 139)')
      gradient.addColorStop(0.5, 'rgb(33, 154, 143)')
      gradient.addColorStop(0.75, 'rgb(94, 201, 98)')
      gradient.addColorStop(1, 'rgb(253, 231, 37)')
    } else if (colorScheme === 'magma') {
      gradient.addColorStop(0, 'rgb(4, 4, 30)')
      gradient.addColorStop(0.25, 'rgb(84, 16, 79)')
      gradient.addColorStop(0.5, 'rgb(169, 51, 79)')
      gradient.addColorStop(0.75, 'rgb(239, 114, 43)')
      gradient.addColorStop(1, 'rgb(253, 254, 136)')
    } else if (colorScheme === 'grayscale') {
      gradient.addColorStop(0, 'rgb(0, 0, 0)')
      gradient.addColorStop(1, 'rgb(255, 255, 255)')
    }

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }, [colorScheme])

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-600 dark:text-slate-400">-80dB</span>
      <canvas
        ref={canvasRef}
        width={200}
        height={16}
        className="border border-slate-200 dark:border-slate-700 rounded"
      />
      <span className="text-xs text-slate-600 dark:text-slate-400">0dB</span>
    </div>
  )
}
