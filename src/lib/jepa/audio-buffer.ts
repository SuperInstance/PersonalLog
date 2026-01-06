/**
 * JEPA - Audio Buffer Management
 *
 * Handles buffering of audio data in 64ms windows for JEPA processing.
 * Manages memory efficiently and provides audio level analysis.
 */

import { AudioWindow, AudioLevels, AUDIO_CONFIG } from './types'

// ============================================================================
// AUDIO BUFFER
// ============================================================================

export class AudioBuffer {
  private windows: AudioWindow[] = []
  private startTime: number = 0
  private maxBufferSize: number // Maximum number of windows to buffer

  constructor(maxWindows: number = 1000) {
    // Default: ~64 seconds of audio (1000 windows * 64ms)
    this.maxBufferSize = maxWindows
  }

  // ==========================================================================
  // BUFFER MANAGEMENT
  // ==========================================================================

  /**
   * Initialize buffer for a new recording
   */
  start(): void {
    this.windows = []
    this.startTime = Date.now()
  }

  /**
   * Add an audio window to the buffer
   */
  addWindow(samples: Float32Array): AudioWindow {
    const window: AudioWindow = {
      samples,
      timestamp: Date.now() - this.startTime,
      index: this.windows.length,
    }

    this.windows.push(window)

    // Prevent unbounded memory growth
    if (this.windows.length > this.maxBufferSize) {
      console.warn(`Audio buffer overflow: ${this.windows.length} windows`)
      this.windows.shift() // Remove oldest window

      // Re-index windows
      this.windows.forEach((w, i) => {
        w.index = i
      })
    }

    return window
  }

  /**
   * Get all buffered windows
   */
  getWindows(): AudioWindow[] {
    return [...this.windows]
  }

  /**
   * Get a specific window by index
   */
  getWindow(index: number): AudioWindow | undefined {
    return this.windows[index]
  }

  /**
   * Get windows in a time range
   */
  getWindowsInRange(startTimeMs: number, endTimeMs: number): AudioWindow[] {
    return this.windows.filter(
      w => w.timestamp >= startTimeMs && w.timestamp <= endTimeMs
    )
  }

  /**
   * Get the current number of buffered windows
   */
  getWindowCount(): number {
    return this.windows.length
  }

  /**
   * Clear all buffered data
   */
  clear(): void {
    this.windows = []
  }

  // ==========================================================================
  // AUDIO LEVELS ANALYSIS
  // ==========================================================================

  /**
   * Calculate audio levels for a single window
   */
  static calculateWindowLevel(samples: Float32Array): number {
    if (samples.length === 0) return 0

    let sum = 0
    let max = 0

    for (let i = 0; i < samples.length; i++) {
      const abs = Math.abs(samples[i])
      sum += abs
      if (abs > max) max = abs
    }

    return sum / samples.length
  }

  /**
   * Calculate audio levels for the entire buffer
   */
  calculateLevels(): AudioLevels {
    if (this.windows.length === 0) {
      return {
        min: 0,
        max: 0,
        average: 0,
        waveform: [],
      }
    }

    let min = 1
    let max = 0
    let totalSum = 0
    let totalSamples = 0
    const waveform: number[] = []

    for (const window of this.windows) {
      const level = AudioBuffer.calculateWindowLevel(window.samples)
      waveform.push(level)

      if (level < min) min = level
      if (level > max) max = level

      totalSum += level
      totalSamples++
    }

    return {
      min,
      max,
      average: totalSamples > 0 ? totalSum / totalSamples : 0,
      waveform,
    }
  }

  /**
   * Get real-time audio level for visualization
   */
  getCurrentLevel(): number {
    if (this.windows.length === 0) return 0
    const latestWindow = this.windows[this.windows.length - 1]
    return AudioBuffer.calculateWindowLevel(latestWindow.samples)
  }

  // ==========================================================================
  // DATA CONVERSION
  // ==========================================================================

  /**
   * Convert all buffered windows to a single Float32Array
   */
  toFloat32Array(): Float32Array {
    const totalSamples = this.windows.length * AUDIO_CONFIG.BUFFER_WINDOW_SAMPLES
    const result = new Float32Array(totalSamples)

    let offset = 0
    for (const window of this.windows) {
      result.set(window.samples, offset)
      offset += window.samples.length
    }

    return result
  }

  /**
   * Convert Float32Array (-1 to 1) to Int16Array (-32768 to 32767)
   * For export to standard audio formats
   */
  static floatToInt16(float32: Float32Array): Int16Array {
    const int16 = new Int16Array(float32.length)

    for (let i = 0; i < float32.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32[i]))
      int16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
    }

    return int16
  }

  /**
   * Convert Int16Array (-32768 to 32767) to Float32Array (-1 to 1)
   */
  static int16ToFloat(int16: Int16Array): Float32Array {
    const float32 = new Float32Array(int16.length)

    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff)
    }

    return float32
  }

  /**
   * Convert buffered windows to Int16Array
   */
  toInt16Array(): Int16Array {
    const float32 = this.toFloat32Array()
    return AudioBuffer.floatToInt16(float32)
  }

  /**
   * Get the duration of buffered audio in milliseconds
   */
  getDuration(): number {
    return this.windows.length * AUDIO_CONFIG.BUFFER_WINDOW_MS
  }

  /**
   * Get the size of buffered data in bytes
   */
  getSizeInBytes(): number {
    const bytesPerSample = 4 // Float32 = 4 bytes
    return this.windows.reduce((total, w) => {
      return total + (w.samples.length * bytesPerSample)
    }, 0)
  }

  /**
   * Get the size of buffered data in human-readable format
   */
  getSizeFormatted(): string {
    const bytes = this.getSizeInBytes()

    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create an audio buffer optimized for JEPA processing
 */
export function createJEPABuffer(): AudioBuffer {
  // JEPA typically processes ~5-10 seconds of context
  // At 64ms windows, that's ~78-156 windows
  // We allocate 10x that for safety and real-time processing
  return new AudioBuffer(1500) // ~96 seconds
}

/**
 * Convert Web Audio API AudioBuffer to Float32Array
 * Resamples if necessary to match target sample rate
 */
export async function convertWebAudioBufferToFloat32(
  webAudioBuffer: globalThis.AudioBuffer,
  targetSampleRate: number = AUDIO_CONFIG.SAMPLE_RATE
): Promise<Float32Array> {
  const channelCount = Math.min(webAudioBuffer.numberOfChannels, 1) // Use mono

  // Get audio data from first channel
  const channelData = webAudioBuffer.getChannelData(0)

  // Resample if necessary
  if (webAudioBuffer.sampleRate === targetSampleRate) {
    return channelData
  }

  // Simple linear resampling
  const ratio = webAudioBuffer.sampleRate / targetSampleRate
  const outputLength = Math.floor(channelData.length / ratio)
  const resampled = new Float32Array(outputLength)

  for (let i = 0; i < outputLength; i++) {
    const sourceIndex = i * ratio
    const index = Math.floor(sourceIndex)
    const fraction = sourceIndex - index

    if (index + 1 < channelData.length) {
      // Linear interpolation
      resampled[i] = channelData[index] * (1 - fraction) + channelData[index + 1] * fraction
    } else {
      resampled[i] = channelData[index]
    }
  }

  return resampled
}
