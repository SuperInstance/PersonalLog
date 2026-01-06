/**
 * JEPA - Spectrogram Renderer
 *
 * Real-time spectrogram visualization with FFT computation.
 * Optimized for performance using Web Workers and efficient rendering.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SpectrogramRenderOptions {
  /** Color scheme (default: 'viridis') */
  colorScheme?: ColorScheme

  /** Minimum frequency in Hz (default: 0) */
  minFreq?: number

  /** Maximum frequency in Hz (default: 22050) */
  maxFreq?: number

  /** FFT window size (default: 2048) */
  fftSize?: number

  /** Hop size between windows (default: 512) */
  hopSize?: number

  /** Zoom level (default: 1) */
  zoom?: number

  /** Padding (default: 0) */
  padding?: number

  /** Minimum dB value (default: -80) */
  minDb?: number

  /** Maximum dB value (default: 0) */
  maxDb?: number
}

export type ColorScheme =
  | 'viridis'  // Blue → Green → Yellow
  | 'magma'    // Black → Red → Yellow
  | 'inferno'  // Black → Red → Yellow
  | 'plasma'   // Blue → Red → Yellow
  | 'grayscale' // Black → White
  | 'custom'   // Custom color mapping

// ============================================================================
// FFT COMPUTATION
// ============================================================================

/**
 * Compute FFT using Cooley-Tukey algorithm
 *
 * @param real - Real part of input
 * @param imag - Imaginary part of input (optional)
 * @returns Interleaved real and imaginary parts [real0, imag0, real1, imag1, ...]
 */
export function computeFFT(real: Float32Array, imag?: Float32Array): Float32Array {
  const n = real.length

  // Check if n is power of 2
  if ((n & (n - 1)) !== 0) {
    throw new Error('FFT length must be a power of 2')
  }

  // Initialize output
  const output = new Float32Array(n * 2)
  const outputReal = new Float32Array(n)
  const outputImag = new Float32Array(n)

  // Copy input
  for (let i = 0; i < n; i++) {
    outputReal[i] = real[i]
    outputImag[i] = imag ? imag[i] : 0
  }

  // Bit-reversal permutation
  for (let i = 0; i < n; i++) {
    const j = reverseBits(i, Math.log2(n))
    if (j > i) {
      ;[outputReal[i], outputReal[j]] = [outputReal[j], outputReal[i]]
      ;[outputImag[i], outputImag[j]] = [outputImag[j], outputImag[i]]
    }
  }

  // Cooley-Tukey FFT
  for (let size = 2; size <= n; size *= 2) {
    const halfSize = size / 2
    const step = Math.PI / halfSize

    for (let i = 0; i < n; i += size) {
      for (let j = 0; j < halfSize; j++) {
        const angle = -j * step
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)

        const idx1 = i + j
        const idx2 = i + j + halfSize

        const tReal = outputReal[idx2] * cos - outputImag[idx2] * sin
        const tImag = outputReal[idx2] * sin + outputImag[idx2] * cos

        outputReal[idx2] = outputReal[idx1] - tReal
        outputImag[idx2] = outputImag[idx1] - tImag
        outputReal[idx1] = outputReal[idx1] + tReal
        outputImag[idx1] = outputImag[idx1] + tImag
      }
    }
  }

  // Interleave real and imaginary parts
  for (let i = 0; i < n; i++) {
    output[i * 2] = outputReal[i]
    output[i * 2 + 1] = outputImag[i]
  }

  return output
}

/**
 * Reverse bits of an integer
 */
function reverseBits(n: number, bits: number): number {
  let reversed = 0
  for (let i = 0; i < bits; i++) {
    reversed = (reversed << 1) | (n & 1)
    n >>= 1
  }
  return reversed
}

/**
 * Apply Hamming window to audio frame
 *
 * @param frame - Audio frame
 * @returns Windowed frame
 */
export function applyHammingWindow(frame: Float32Array): Float32Array {
  const n = frame.length
  const windowed = new Float32Array(n)

  for (let i = 0; i < n; i++) {
    const window = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1))
    windowed[i] = frame[i] * window
  }

  return windowed
}

/**
 * Apply Hanning window to audio frame
 *
 * @param frame - Audio frame
 * @returns Windowed frame
 */
export function applyHanningWindow(frame: Float32Array): Float32Array {
  const n = frame.length
  const windowed = new Float32Array(n)

  for (let i = 0; i < n; i++) {
    const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)))
    windowed[i] = frame[i] * window
  }

  return windowed
}

// ============================================================================
// SPECTROGRAM COMPUTATION
// ============================================================================

/**
 * Compute spectrogram from audio buffer
 *
 * @param audioBuffer - Audio buffer
 * @param options - Computation options
 * @returns Spectrogram data (magnitude × time × frequency)
 */
export async function computeSpectrogram(
  audioBuffer: AudioBuffer,
  options: SpectrogramRenderOptions = {}
): Promise<Float32Array> {
  const {
    fftSize = 2048,
    hopSize = 512
  } = options

  const data = audioBuffer.getChannelData(0)
  const numFrames = Math.floor((data.length - fftSize) / hopSize) + 1
  const numFreqs = fftSize / 2

  // Allocate spectrogram (frequency × time)
  const spectrogram = new Float32Array(numFreqs * numFrames)

  // Compute FFT for each frame
  for (let i = 0; i < numFrames; i++) {
    const start = i * hopSize
    let frame = data.slice(start, start + fftSize)

    // Zero-pad if necessary
    if (frame.length < fftSize) {
      const padded = new Float32Array(fftSize)
      padded.set(frame)
      frame = padded
    }

    // Apply window
    const windowed = applyHanningWindow(frame)

    // Compute FFT
    const fft = computeFFT(windowed)

    // Copy magnitude to spectrogram
    for (let j = 0; j < numFreqs; j++) {
      const real = fft[j * 2]
      const imag = fft[j * 2 + 1]
      const magnitude = Math.sqrt(real * real + imag * imag)

      // Convert to dB
      const db = 20 * Math.log10(magnitude + 1e-10)

      // Store in spectrogram (frequency-major order)
      spectrogram[i * numFreqs + j] = db
    }
  }

  return spectrogram
}

/**
 * Compute spectrogram incrementally (for real-time visualization)
 *
 * @param frame - Audio frame
 * @param frameIndex - Frame index
 * @param fftSize - FFT size
 * @returns Magnitude array
 */
export function computeFrameSpectrogram(
  frame: Float32Array,
  fftSize: number
): Float32Array {
  // Zero-pad if necessary
  let padded = frame
  if (frame.length < fftSize) {
    padded = new Float32Array(fftSize)
    padded.set(frame)
  }

  // Apply window
  const windowed = applyHanningWindow(padded)

  // Compute FFT
  const fft = computeFFT(windowed)

  // Compute magnitudes
  const numFreqs = fftSize / 2
  const magnitudes = new Float32Array(numFreqs)

  for (let j = 0; j < numFreqs; j++) {
    const real = fft[j * 2]
    const imag = fft[j * 2 + 1]
    const magnitude = Math.sqrt(real * real + imag * imag)
    magnitudes[j] = magnitude
  }

  return magnitudes
}

// ============================================================================
// COLOR MAPPING
// ============================================================================

/**
 * Map magnitude to RGB color using viridis scheme
 */
function magnitudeToViridis(
  magnitude: number,
  minDb: number,
  maxDb: number
): { r: number; g: number; b: number } {
  // Normalize to [0, 1]
  const normalized = Math.max(0, Math.min(1, (magnitude - minDb) / (maxDb - minDb)))

  // Viridis colormap (simplified)
  const r = Math.floor(68 + (normalized * (68 - 33)))
  const g = Math.floor(1 + (normalized * (256 - 1)))
  const b = Math.floor(84 + (normalized * (200 - 84)))

  return { r: Math.max(0, Math.min(255, r)), g: Math.max(0, Math.min(255, g)), b: Math.max(0, Math.min(255, b)) }
}

/**
 * Map magnitude to RGB color using magma scheme
 */
function magnitudeToMagma(
  magnitude: number,
  minDb: number,
  maxDb: number
): { r: number; g: number; b: number } {
  const normalized = Math.max(0, Math.min(1, (magnitude - minDb) / (maxDb - minDb)))

  // Magma colormap (simplified)
  const r = Math.floor(4 + (normalized * (253 - 4)))
  const g = Math.floor(Math.max(0, (normalized - 0.2) * 200))
  const b = Math.floor(Math.max(0, (normalized - 0.5) * 200))

  return { r: Math.max(0, Math.min(255, r)), g: Math.max(0, Math.min(255, g)), b: Math.max(0, Math.min(255, b)) }
}

/**
 * Map magnitude to RGB color using grayscale scheme
 */
function magnitudeToGrayscale(
  magnitude: number,
  minDb: number,
  maxDb: number
): { r: number; g: number; b: number } {
  const normalized = Math.max(0, Math.min(1, (magnitude - minDb) / (maxDb - minDb)))
  const value = Math.floor(normalized * 255)

  return { r: value, g: value, b: value }
}

/**
 * Map magnitude to RGB color
 *
 * @param magnitude - Magnitude value (dB)
 * @param minDb - Minimum dB
 * @param maxDb - Maximum dB
 * @param scheme - Color scheme
 */
export function magnitudeToColor(
  magnitude: number,
  minDb: number = -80,
  maxDb: number = 0,
  scheme: ColorScheme = 'viridis'
): { r: number; g: number; b: number } {
  switch (scheme) {
    case 'viridis':
      return magnitudeToViridis(magnitude, minDb, maxDb)
    case 'magma':
      return magnitudeToMagma(magnitude, minDb, maxDb)
    case 'grayscale':
      return magnitudeToGrayscale(magnitude, minDb, maxDb)
    default:
      return magnitudeToViridis(magnitude, minDb, maxDb)
  }
}

// ============================================================================
// SPECTROGRAM RENDERING
// ============================================================================

/**
 * Draw spectrogram on canvas
 *
 * @param ctx - Canvas rendering context
 * @param spectrogram - Spectrogram data
 * @param numFrames - Number of time frames
 * @param numFreqs - Number of frequency bins
 * @param width - Canvas width
 * @param height - Canvas height
 * @param options - Rendering options
 */
export function drawSpectrogram(
  ctx: CanvasRenderingContext2D,
  spectrogram: Float32Array,
  numFrames: number,
  numFreqs: number,
  width: number,
  height: number,
  options: SpectrogramRenderOptions = {}
): void {
  const {
    colorScheme = 'viridis',
    minFreq = 0,
    maxFreq = 22050, // Nyquist frequency for 44.1kHz
    minDb = -80,
    maxDb = 0,
    zoom = 1,
    padding = 0
  } = options

  const drawWidth = width - (padding * 2)
  const drawHeight = height - (padding * 2)

  // Create image data
  const imageData = ctx.createImageData(drawWidth, drawHeight)

  // Frequency range to display
  const minFreqBin = Math.floor((minFreq / maxFreq) * numFreqs)
  const maxFreqBin = Math.floor((maxFreq / maxFreq) * numFreqs)
  const freqRange = maxFreqBin - minFreqBin

  // Draw each pixel
  for (let y = 0; y < drawHeight; y++) {
    for (let x = 0; x < drawWidth; x++) {
      // Map pixel to spectrogram coordinates
      const frameIndex = Math.min(
        numFrames - 1,
        Math.floor((x / drawWidth) * numFrames / zoom)
      )
      const freqIndex = minFreqBin + Math.floor((1 - y / drawHeight) * freqRange)

      const magnitude = spectrogram[frameIndex * numFreqs + freqIndex]
      const color = magnitudeToColor(magnitude, minDb, maxDb, colorScheme)

      // Set pixel color
      const i = (y * drawWidth + x) * 4
      imageData.data[i] = color.r
      imageData.data[i + 1] = color.g
      imageData.data[i + 2] = color.b
      imageData.data[i + 3] = 255 // alpha
    }
  }

  // Draw image data
  ctx.putImageData(imageData, padding, padding)
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get frequency from frequency bin index
 *
 * @param bin - Frequency bin index
 * @param fftSize - FFT size
 * @param sampleRate - Sample rate
 */
export function binToFrequency(bin: number, fftSize: number, sampleRate: number): number {
  return (bin * sampleRate) / fftSize
}

/**
 * Get frequency bin index from frequency
 *
 * @param freq - Frequency in Hz
 * @param fftSize - FFT size
 * @param sampleRate - Sample rate
 */
export function frequencyToBin(freq: number, fftSize: number, sampleRate: number): number {
  return Math.floor((freq * fftSize) / sampleRate)
}

/**
 * Get time from frame index
 *
 * @param frame - Frame index
 * @param hopSize - Hop size
 * @param sampleRate - Sample rate
 */
export function frameToTime(frame: number, hopSize: number, sampleRate: number): number {
  return (frame * hopSize) / sampleRate
}

/**
 * Get frame index from time
 *
 * @param time - Time in seconds
 * @param hopSize - Hop size
 * @param sampleRate - Sample rate
 */
export function timeToFrame(time: number, hopSize: number, sampleRate: number): number {
  return Math.floor((time * sampleRate) / hopSize)
}
