/**
 * JEPA - Enhanced Waveform Renderer
 *
 * Advanced canvas-based waveform visualization with:
 * - Real-time amplitude display
 * - Peak indicators (max volume levels)
 * - Clipping indicators (when audio is too loud)
 * - Frequency spectrum display (FFT visualization)
 * - Multiple visualization modes (waveform, frequency, combined)
 * - Emotion-aware color coding
 * - Recording level meter (VU meter style)
 * - Performance optimized (60fps)
 *
 * @module lib/jepa/enhanced-waveform-renderer
 */

// ============================================================================
// TYPES
// ============================================================================

export type VisualizationMode = 'waveform' | 'frequency' | 'combined'

export type EmotionCategory = 'excited' | 'calm' | 'angry' | 'sad' | 'confident' | 'neutral'

export interface EnhancedWaveformOptions {
  /** Visualization mode */
  mode?: VisualizationMode

  /** Waveform line width */
  lineWidth?: number

  /** Background color */
  backgroundColor?: string

  /** Primary gradient color */
  primaryColor?: string

  /** Secondary gradient color */
  secondaryColor?: string

  /** Show grid lines */
  showGrid?: boolean

  /** Show peak indicators */
  showPeaks?: boolean

  /** Show clipping indicators */
  showClipping?: boolean

  /** Clipping threshold (0-1) */
  clippingThreshold?: number

  /** Show VU meter */
  showVUMeter?: boolean

  /** VU meter position ('left' | 'right' | 'both') */
  vuMeterPosition?: 'left' | 'right' | 'both'

  /** Emotion color override */
  emotion?: EmotionCategory

  /** Padding around waveform */
  padding?: number

  /** Zoom level */
  zoom?: number

  /** Smooth animation */
  smooth?: boolean

  /** Smoothing factor (0-1) */
  smoothingFactor?: number
}

export interface WaveformData {
  /** Time-domain waveform data */
  timeDomain: Float32Array

  /** Frequency-domain data */
  frequency: Uint8Array

  /** Current amplitude level */
  amplitude: number

  /** Peak amplitude */
  peak: number

  /** Is clipping */
  isClipping: boolean
}

export interface VUMeterOptions {
  /** VU meter width */
  width?: number

  /** VU meter color */
  color?: string

  /** VU meter warning color */
  warningColor?: string

  /** VU meter danger color */
  dangerColor?: string

  /** Warning threshold (0-1) */
  warningThreshold?: number

  /** Danger threshold (0-1) */
  dangerThreshold?: number
}

// ============================================================================
// EMOTION COLOR PALETTES
// ============================================================================

const EMOTION_COLORS: Record<EmotionCategory, { primary: string; secondary: string }> = {
  excited: { primary: '#10b981', secondary: '#34d399' }, // green gradient
  calm: { primary: '#3b82f6', secondary: '#60a5fa' }, // blue gradient
  angry: { primary: '#ef4444', secondary: '#f87171' }, // red gradient
  sad: { primary: '#8b5cf6', secondary: '#a78bfa' }, // purple gradient
  confident: { primary: '#f59e0b', secondary: '#fbbf24' }, // amber gradient
  neutral: { primary: '#6b7280', secondary: '#9ca3af' }, // gray gradient
}

/**
 * Get emotion color palette
 */
export function getEmotionColors(emotion: EmotionCategory): { primary: string; secondary: string } {
  return EMOTION_COLORS[emotion] || EMOTION_COLORS.neutral
}

// ============================================================================
// GRID RENDERING
// ============================================================================

/**
 * Draw background grid
 */
function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  padding: number
): void {
  const gridColor = 'rgba(100, 116, 139, 0.1)' // slate-500 with low opacity
  const gridSize = 50

  ctx.strokeStyle = gridColor
  ctx.lineWidth = 1

  // Vertical lines
  for (let x = padding; x < width - padding; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, padding)
    ctx.lineTo(x, height - padding)
    ctx.stroke()
  }

  // Horizontal lines
  for (let y = padding; y < height - padding; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(padding, y)
    ctx.lineTo(width - padding, y)
    ctx.stroke()
  }

  // Center line
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.2)'
  ctx.beginPath()
  ctx.moveTo(padding, height / 2)
  ctx.lineTo(width - padding, height / 2)
  ctx.stroke()
}

// ============================================================================
// WAVEFORM RENDERING
// ============================================================================

/**
 * Draw waveform with gradient
 */
function drawWaveform(
  ctx: CanvasRenderingContext2D,
  data: Float32Array,
  width: number,
  height: number,
  options: EnhancedWaveformOptions
): void {
  const {
    lineWidth = 2,
    primaryColor = '#3b82f6',
    secondaryColor = '#60a5fa',
    padding = 0,
    zoom = 1,
    smooth = true,
  } = options

  const drawWidth = (width - padding * 2) / zoom
  const drawHeight = height - padding * 2
  const centerY = height / 2

  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, primaryColor)
  gradient.addColorStop(1, secondaryColor)

  // Draw waveform
  ctx.lineWidth = lineWidth
  ctx.strokeStyle = gradient
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()

  const step = Math.max(1, Math.floor(data.length / drawWidth))
  let x = padding

  for (let i = 0; i < data.length; i += step) {
    const v = data[i] // -1 to 1
    const y = centerY + v * (drawHeight / 2)

    if (i === 0) {
      ctx.moveTo(x, y)
    } else if (smooth && step > 1) {
      // Smooth curve
      const prevV = data[i - step]
      const prevY = centerY + prevV * (drawHeight / 2)
      const cpX = x - (x - padding) / step / 2
      const cpY = (prevY + y) / 2
      ctx.quadraticCurveTo(x - (x - padding) / step, prevY, cpX, cpY)
    } else {
      ctx.lineTo(x, y)
    }

    x += (drawWidth / (data.length / step))
    if (x > width - padding) break
  }

  ctx.stroke()

  // Fill gradient below waveform
  const lastX = Math.min(x, width - padding)
  ctx.lineTo(lastX, height - padding)
  ctx.lineTo(padding, height - padding)
  ctx.closePath()
  ctx.globalAlpha = 0.15
  ctx.fillStyle = gradient
  ctx.fill()
  ctx.globalAlpha = 1.0
}

// ============================================================================
// FREQUENCY SPECTRUM RENDERING
// ============================================================================

/**
 * Draw frequency spectrum (FFT visualization)
 */
function drawFrequencySpectrum(
  ctx: CanvasRenderingContext2D,
  frequencyData: Uint8Array,
  width: number,
  height: number,
  options: EnhancedWaveformOptions
): void {
  const {
    primaryColor = '#3b82f6',
    padding = 0,
  } = options

  const drawWidth = width - padding * 2
  const drawHeight = height - padding * 2
  const barCount = frequencyData.length
  const barWidth = drawWidth / barCount

  // Draw frequency bars
  for (let i = 0; i < barCount; i++) {
    const magnitude = frequencyData[i] / 255 // 0-1
    const barHeight = magnitude * drawHeight
    const x = padding + i * barWidth
    const y = height - padding - barHeight

    // Color based on frequency (rainbow effect)
    const hue = (i / barCount) * 360
    const saturation = 70
    const lightness = 50 + magnitude * 20 // Brighter for louder frequencies

    ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`
    ctx.fillRect(x, y, Math.max(barWidth - 1, 1), barHeight)
  }
}

// ============================================================================
// PEAK INDICATORS
// ============================================================================

/**
 * Draw peak indicators
 */
function drawPeakIndicators(
  ctx: CanvasRenderingContext2D,
  peak: number,
  width: number,
  height: number,
  options: EnhancedWaveformOptions
): void {
  const {
    primaryColor = '#3b82f6',
    padding = 0,
  } = options

  const peakY = padding + (1 - peak) * (height - padding * 2)

  // Draw peak line
  ctx.strokeStyle = primaryColor
  ctx.lineWidth = 2
  ctx.setLineDash([5, 5])
  ctx.beginPath()
  ctx.moveTo(padding, peakY)
  ctx.lineTo(width - padding, peakY)
  ctx.stroke()
  ctx.setLineDash([])

  // Draw peak label
  ctx.fillStyle = primaryColor
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(`Peak: ${(peak * 100).toFixed(1)}%`, width - padding - 5, peakY - 5)
}

// ============================================================================
// CLIPPING INDICATORS
// ============================================================================

/**
 * Draw clipping indicators
 */
function drawClippingIndicators(
  ctx: CanvasRenderingContext2D,
  isClipping: boolean,
  width: number,
  height: number,
  options: EnhancedWaveformOptions
): void {
  if (!isClipping) return

  const {
    padding = 0,
  } = options

  // Draw red warning overlay
  ctx.fillStyle = 'rgba(239, 68, 68, 0.2)' // red-500 with opacity
  ctx.fillRect(padding, padding, width - padding * 2, height - padding * 2)

  // Draw clipping warning text
  ctx.fillStyle = '#ef4444'
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('⚠️ CLIPPING', width / 2, height / 2)

  ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillText('Reduce input volume', width / 2, height / 2 + 25)
}

// ============================================================================
// VU METER
// ============================================================================

/**
 * Draw VU meter (volume level meter)
 */
function drawVUMeter(
  ctx: CanvasRenderingContext2D,
  amplitude: number,
  width: number,
  height: number,
  options: EnhancedWaveformOptions & VUMeterOptions
): void {
  const {
    vuMeterPosition = 'left',
    width: meterWidth = 10,
    color = '#10b981',
    warningColor = '#f59e0b',
    dangerColor = '#ef4444',
    warningThreshold = 0.7,
    dangerThreshold = 0.9,
    padding = 10,
  } = options

  const meterHeight = height - padding * 2
  const meterX = vuMeterPosition === 'left' ? padding : width - meterWidth - padding

  // Draw meter background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
  ctx.fillRect(meterX, padding, meterWidth, meterHeight)

  // Calculate fill height
  const fillHeight = amplitude * meterHeight
  const fillY = height - padding - fillHeight

  // Determine color based on level
  let meterColor = color
  if (amplitude >= dangerThreshold) {
    meterColor = dangerColor
  } else if (amplitude >= warningThreshold) {
    meterColor = warningColor
  }

  // Draw meter fill
  const gradient = ctx.createLinearGradient(0, height - padding, 0, padding)
  gradient.addColorStop(0, color)
  gradient.addColorStop(warningThreshold, warningColor)
  gradient.addColorStop(dangerThreshold, dangerColor)

  ctx.fillStyle = gradient
  ctx.fillRect(meterX, fillY, meterWidth, fillHeight)

  // Draw meter border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.lineWidth = 1
  ctx.strokeRect(meterX, padding, meterWidth, meterHeight)

  // Draw tick marks
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
  for (let i = 0; i <= 10; i++) {
    const y = height - padding - (i / 10) * meterHeight
    ctx.fillRect(meterX - 2, y, meterWidth + 4, 1)
  }
}

// ============================================================================
// COMBINED VISUALIZATION
// ============================================================================

/**
 * Draw combined waveform and frequency visualization
 */
function drawCombinedVisualization(
  ctx: CanvasRenderingContext2D,
  data: WaveformData,
  width: number,
  height: number,
  options: EnhancedWaveformOptions
): void {
  const topHeight = height * 0.6 // 60% for waveform
  const bottomHeight = height * 0.4 // 40% for frequency

  // Draw waveform in top section
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, width, topHeight)
  ctx.clip()
  drawWaveform(ctx, data.timeDomain, width, topHeight, options)
  ctx.restore()

  // Draw frequency in bottom section
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, topHeight, width, bottomHeight)
  ctx.clip()
  drawFrequencySpectrum(ctx, data.frequency, width, bottomHeight, options)
  ctx.restore()

  // Draw divider line
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, topHeight)
  ctx.lineTo(width, topHeight)
  ctx.stroke()
}

// ============================================================================
// MAIN RENDER FUNCTION
// ============================================================================

/**
 * Render enhanced waveform visualization
 */
export function renderEnhancedWaveform(
  ctx: CanvasRenderingContext2D,
  data: WaveformData,
  width: number,
  height: number,
  options: EnhancedWaveformOptions = {}
): void {
  const {
    mode = 'waveform',
    backgroundColor = 'transparent',
    showGrid = false,
    showPeaks = false,
    showClipping = false,
    showVUMeter = false,
    vuMeterPosition = 'left',
    emotion = 'neutral',
    padding = 10,
  } = options

  // Apply emotion colors
  const emotionColors = getEmotionColors(emotion)
  const finalOptions = {
    ...options,
    primaryColor: options.primaryColor || emotionColors.primary,
    secondaryColor: options.secondaryColor || emotionColors.secondary,
  }

  // Clear canvas
  if (backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, width, height)
  } else {
    ctx.clearRect(0, 0, width, height)
  }

  // Draw grid
  if (showGrid) {
    drawGrid(ctx, width, height, padding)
  }

  // Draw visualization based on mode
  if (mode === 'waveform') {
    drawWaveform(ctx, data.timeDomain, width, height, finalOptions)
  } else if (mode === 'frequency') {
    drawFrequencySpectrum(ctx, data.frequency, width, height, finalOptions)
  } else if (mode === 'combined') {
    drawCombinedVisualization(ctx, data, width, height, finalOptions)
  }

  // Draw peak indicators
  if (showPeaks) {
    drawPeakIndicators(ctx, data.peak, width, height, finalOptions)
  }

  // Draw clipping indicators
  if (showClipping && data.isClipping) {
    drawClippingIndicators(ctx, data.isClipping, width, height, finalOptions)
  }

  // Draw VU meter
  if (showVUMeter) {
    drawVUMeter(ctx, data.amplitude, width, height, {
      ...finalOptions,
      vuMeterPosition,
    })
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate amplitude from time-domain data
 */
export function calculateAmplitude(timeDomain: Float32Array): number {
  let sum = 0
  for (let i = 0; i < timeDomain.length; i++) {
    sum += Math.abs(timeDomain[i])
  }
  return sum / timeDomain.length
}

/**
 * Detect clipping in audio data
 */
export function detectClipping(timeDomain: Float32Array, threshold: number = 0.95): boolean {
  for (let i = 0; i < timeDomain.length; i++) {
    if (Math.abs(timeDomain[i]) >= threshold) {
      return true
    }
  }
  return false
}

/**
 * Get all available emotion categories
 */
export function getEmotionCategories(): EmotionCategory[] {
  return Object.keys(EMOTION_COLORS) as EmotionCategory[]
}
