/**
 * JEPA - Waveform Renderer
 *
 * Canvas-based waveform rendering with emotion overlays, zoom, and export.
 * Optimized for performance with batch operations and efficient drawing.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface WaveformRenderOptions {
  /** Waveform color (default: #3b82f6) */
  waveColor?: string

  /** Waveform line width (default: 1) */
  lineWidth?: number

  /** Background color (default: transparent) */
  backgroundColor?: string

  /** Playhead color (default: #ffffff) */
  playheadColor?: string

  /** Playhead width (default: 2) */
  playheadWidth?: number

  /** Whether to fill waveform (default: true) */
  fillWaveform?: boolean

  /** Padding around waveform (default: 0) */
  padding?: number

  /** Zoom level (default: 1) */
  zoom?: number
}

export interface EmotionRegion {
  /** Start time in seconds */
  start: number

  /** End time in seconds */
  end: number

  /** Emotion label */
  emotion: EmotionLabel
}

export type EmotionLabel =
  | 'excited'
  | 'calm'
  | 'angry'
  | 'sad'
  | 'confident'
  | 'neutral'

export interface EmotionRenderOptions {
  /** Emotion region opacity (default: 0.2) */
  opacity?: number

  /** Border width (default: 2) */
  borderWidth?: number

  /** Show emotion labels (default: false) */
  showLabels?: boolean

  /** Label font size (default: 12) */
  labelFontSize?: number
}

// ============================================================================
// EMOTION COLOR MAPPING
// ============================================================================

const EMOTION_COLORS: Record<EmotionLabel, string> = {
  excited: '#10b981',   // green
  calm: '#3b82f6',      // blue
  angry: '#ef4444',     // red
  sad: '#8b5cf6',       // purple
  confident: '#f59e0b', // amber
  neutral: '#6b7280'    // gray
}

/**
 * Get color for emotion label
 */
export function getEmotionColor(emotion: EmotionLabel): string {
  return EMOTION_COLORS[emotion] || EMOTION_COLORS.neutral
}

/**
 * Get all available emotion labels
 */
export function getEmotionLabels(): EmotionLabel[] {
  return Object.keys(EMOTION_COLORS) as EmotionLabel[]
}

/**
 * Get display name for emotion label
 */
export function getEmotionDisplayName(emotion: EmotionLabel): string {
  return emotion.charAt(0).toUpperCase() + emotion.slice(1)
}

// ============================================================================
// WAVEFORM RENDERING
// ============================================================================

/**
 * Draw waveform on canvas
 *
 * @param ctx - Canvas rendering context
 * @param audioBuffer - Audio buffer to visualize
 * @param width - Canvas width
 * @param height - Canvas height
 * @param options - Rendering options
 */
export function drawWaveform(
  ctx: CanvasRenderingContext2D,
  audioBuffer: AudioBuffer,
  width: number,
  height: number,
  options: WaveformRenderOptions = {}
): void {
  const {
    waveColor = '#3b82f6',
    lineWidth = 1,
    backgroundColor,
    fillWaveform = true,
    padding = 0,
    zoom = 1
  } = options

  // Clear canvas
  if (backgroundColor) {
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, width, height)
  } else {
    ctx.clearRect(0, 0, width, height)
  }

  // Get audio data (first channel only for mono)
  const data = audioBuffer.getChannelData(0)

  // Calculate drawing parameters
  const drawWidth = width - (padding * 2)
  const drawHeight = height - (padding * 2)
  const step = Math.ceil(data.length / drawWidth / zoom)
  const amp = drawHeight / 2

  // Set drawing style
  ctx.fillStyle = waveColor

  // Draw waveform
  if (fillWaveform) {
    // Filled waveform (more performant)
    for (let i = 0; i < drawWidth; i++) {
      let min = 1.0
      let max = -1.0

      // Find min/max in this step
      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j]
        if (datum < min) min = datum
        if (datum > max) max = datum
      }

      // Draw vertical line
      const x = i + padding
      const y1 = padding + (1 + min) * amp
      const y2 = padding + (1 + max) * amp
      const lineHeight = Math.max(1, (max - min) * amp)

      ctx.fillRect(x, y1, lineWidth, lineHeight)
    }
  } else {
    // Line waveform (more precise)
    ctx.strokeStyle = waveColor
    ctx.lineWidth = lineWidth
    ctx.beginPath()

    for (let i = 0; i < drawWidth; i++) {
      let min = 1.0
      let max = -1.0

      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j]
        if (datum < min) min = datum
        if (datum > max) max = datum
      }

      const x = i + padding
      const y = padding + ((1 + (min + max) / 2) * amp)

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }

    ctx.stroke()
  }
}

/**
 * Draw emotion regions on canvas
 *
 * @param ctx - Canvas rendering context
 * @param emotions - Array of emotion regions
 * @param duration - Total audio duration in seconds
 * @param width - Canvas width
 * @param height - Canvas height
 * @param options - Rendering options
 */
export function drawEmotionRegions(
  ctx: CanvasRenderingContext2D,
  emotions: EmotionRegion[],
  duration: number,
  width: number,
  height: number,
  options: EmotionRenderOptions & WaveformRenderOptions = {}
): void {
  const {
    opacity = 0.2,
    borderWidth = 2,
    showLabels = false,
    labelFontSize = 12,
    padding = 0,
    zoom = 1
  } = options

  const drawWidth = width - (padding * 2)

  emotions.forEach(emotion => {
    const x1 = padding + (emotion.start / duration) * drawWidth * zoom
    const x2 = padding + (emotion.end / duration) * drawWidth * zoom

    // Get emotion color
    const baseColor = getEmotionColor(emotion.emotion)

    // Convert hex to rgba
    const r = parseInt(baseColor.slice(1, 3), 16)
    const g = parseInt(baseColor.slice(3, 5), 16)
    const b = parseInt(baseColor.slice(5, 7), 16)

    // Draw filled region
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`
    ctx.fillRect(x1, padding, x2 - x1, height - (padding * 2))

    // Draw border
    ctx.strokeStyle = baseColor
    ctx.lineWidth = borderWidth
    ctx.strokeRect(x1, padding, x2 - x1, height - (padding * 2))

    // Draw label if requested
    if (showLabels && (x2 - x1) > 50) {
      ctx.fillStyle = baseColor
      ctx.font = `bold ${labelFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

      const text = getEmotionDisplayName(emotion.emotion)
      const textX = x1 + 5
      const textY = padding + labelFontSize + 5

      ctx.fillText(text, textX, textY)
    }
  })
}

/**
 * Draw playhead on canvas
 *
 * @param ctx - Canvas rendering context
 * @param currentTime - Current playback time in seconds
 * @param duration - Total audio duration in seconds
 * @param width - Canvas width
 * @param height - Canvas height
 * @param options - Rendering options
 */
export function drawPlayhead(
  ctx: CanvasRenderingContext2D,
  currentTime: number,
  duration: number,
  width: number,
  height: number,
  options: WaveformRenderOptions = {}
): void {
  const {
    playheadColor = '#ffffff',
    playheadWidth = 2,
    padding = 0,
    zoom = 1
  } = options

  const drawWidth = width - (padding * 2)
  const x = padding + (currentTime / duration) * drawWidth * zoom

  // Draw line
  ctx.strokeStyle = playheadColor
  ctx.lineWidth = playheadWidth
  ctx.beginPath()
  ctx.moveTo(x, padding)
  ctx.lineTo(x, height - padding)
  ctx.stroke()

  // Draw circle at top
  ctx.fillStyle = playheadColor
  ctx.beginPath()
  ctx.arc(x, padding + 5, 4, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * Draw complete waveform visualization with emotions and playhead
 *
 * @param ctx - Canvas rendering context
 * @param audioBuffer - Audio buffer to visualize
 * @param emotions - Array of emotion regions
 * @param currentTime - Current playback time (optional)
 * @param width - Canvas width
 * @param height - Canvas height
 * @param options - Rendering options
 */
export function drawCompleteVisualization(
  ctx: CanvasRenderingContext2D,
  audioBuffer: AudioBuffer,
  emotions: EmotionRegion[],
  currentTime: number | undefined,
  width: number,
  height: number,
  options: WaveformRenderOptions & EmotionRenderOptions = {}
): void {
  // Draw waveform
  drawWaveform(ctx, audioBuffer, width, height, options)

  // Draw emotion regions
  if (emotions.length > 0) {
    drawEmotionRegions(
      ctx,
      emotions,
      audioBuffer.duration,
      width,
      height,
      options
    )
  }

  // Draw playhead
  if (currentTime !== undefined) {
    drawPlayhead(
      ctx,
      currentTime,
      audioBuffer.duration,
      width,
      height,
      options
    )
  }
}

/**
 * Export canvas as PNG image
 *
 * @param canvas - Canvas element
 * @param filename - Output filename
 */
export function exportCanvasAsPNG(
  canvas: HTMLCanvasElement,
  filename: string = 'waveform.png'
): void {
  const dataUrl = canvas.toDataURL('image/png')
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate optimal zoom level for given duration and canvas width
 *
 * @param duration - Audio duration in seconds
 * @param width - Canvas width
 * @param samplesPerPixel - Target samples per pixel (default: 100)
 */
export function calculateOptimalZoom(
  duration: number,
  width: number,
  samplesPerPixel: number = 100
): number {
  const totalSamples = duration * 44100 // Assuming 44.1kHz
  const naturalZoom = totalSamples / (width * samplesPerPixel)
  return Math.max(1, Math.min(10, naturalZoom))
}

/**
 * Convert time position to x-coordinate
 *
 * @param time - Time in seconds
 * @param duration - Total duration in seconds
 * @param width - Canvas width
 * @param zoom - Zoom level
 * @param padding - Padding
 */
export function timeToX(
  time: number,
  duration: number,
  width: number,
  zoom: number = 1,
  padding: number = 0
): number {
  const drawWidth = width - (padding * 2)
  return padding + (time / duration) * drawWidth * zoom
}

/**
 * Convert x-coordinate to time position
 *
 * @param x - X-coordinate
 * @param duration - Total duration in seconds
 * @param width - Canvas width
 * @param zoom - Zoom level
 * @param padding - Padding
 */
export function xToTime(
  x: number,
  duration: number,
  width: number,
  zoom: number = 1,
  padding: number = 0
): number {
  const drawWidth = width - (padding * 2)
  return ((x - padding) / drawWidth / zoom) * duration
}
