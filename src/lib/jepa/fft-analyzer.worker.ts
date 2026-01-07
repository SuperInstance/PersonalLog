/**
 * JEPA - FFT Analyzer Web Worker
 *
 * Performs Fast Fourier Transform (FFT) analysis on audio data in a Web Worker
 * to avoid blocking the main thread. Calculates frequency spectrum for visualization.
 *
 * @module lib/jepa/fft-analyzer-worker
 */

// ============================================================================
// TYPES
// ============================================================================

export interface FFTAnalyzerMessage {
  type: 'analyze' | 'configure'
  data?: {
    audioData?: Float32Array
    sampleRate?: number
    fftSize?: number
    smoothing?: number
    windowFunction?: 'hanning' | 'hamming' | 'blackman' | 'none'
  }
}

export interface FFTAnalyzerResult {
  type: 'result'
  data: {
    frequencyData: Uint8Array // 0-255 magnitude for each frequency bin
    frequencyBins: Float64Array // Actual frequency values for each bin
    sampleRate: number
    fftSize: number
    dominantFrequency: number // Peak frequency in Hz
    spectralCentroid: number // Brightness measure
    bandwidth: number // Frequency bandwidth
  }
}

export interface FFTAnalyzerError {
  type: 'error'
  error: string
}

// ============================================================================
// CONFIGURATION
// ============================================================================

let config = {
  fftSize: 2048,
  sampleRate: 44100,
  smoothing: 0.8,
  windowFunction: 'hanning' as 'hanning' | 'hamming' | 'blackman' | 'none',
}

// ============================================================================
// WINDOW FUNCTIONS
// ============================================================================

/**
 * Apply Hanning window to reduce spectral leakage
 */
function applyHanningWindow(data: Float32Array): Float32Array {
  const windowed = new Float32Array(data.length)
  for (let i = 0; i < data.length; i++) {
    const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (data.length - 1)))
    windowed[i] = data[i] * window
  }
  return windowed
}

/**
 * Apply Hamming window to reduce spectral leakage
 */
function applyHammingWindow(data: Float32Array): Float32Array {
  const windowed = new Float32Array(data.length)
  for (let i = 0; i < data.length; i++) {
    const window = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (data.length - 1))
    windowed[i] = data[i] * window
  }
  return windowed
}

/**
 * Apply Blackman window to reduce spectral leakage
 */
function applyBlackmanWindow(data: Float32Array): Float32Array {
  const windowed = new Float32Array(data.length)
  for (let i = 0; i < data.length; i++) {
    const a0 = 0.42
    const a1 = 0.5
    const a2 = 0.08
    const window =
      a0 -
      a1 * Math.cos((2 * Math.PI * i) / (data.length - 1)) +
      a2 * Math.cos((4 * Math.PI * i) / (data.length - 1))
    windowed[i] = data[i] * window
  }
  return windowed
}

/**
 * Apply window function based on configuration
 */
function applyWindow(data: Float32Array): Float32Array {
  switch (config.windowFunction) {
    case 'hanning':
      return applyHanningWindow(data)
    case 'hamming':
      return applyHammingWindow(data)
    case 'blackman':
      return applyBlackmanWindow(data)
    case 'none':
      return data
    default:
      return applyHanningWindow(data)
  }
}

// ============================================================================
// FFT IMPLEMENTATION (Cooley-Tukey)
// ============================================================================

/**
 * Perform FFT using Cooley-Tukey algorithm
 * Returns complex numbers as [real, imag] pairs
 */
function fft(input: Float32Array): Float32Array {
  const n = input.length

  // Pad to next power of 2 if necessary
  let fftSize = 1
  while (fftSize < n) {
    fftSize *= 2
  }

  // Create complex array [real, imag, real, imag, ...]
  const complex = new Float32Array(fftSize * 2)
  for (let i = 0; i < n; i++) {
    complex[i * 2] = input[i]
    complex[i * 2 + 1] = 0
  }

  // Bit-reversal permutation
  const bits = Math.log2(fftSize)
  for (let i = 0; i < fftSize; i++) {
    const j = reverseBits(i, bits)
    if (j > i) {
      // Swap real parts
      const tempReal = complex[i * 2]
      complex[i * 2] = complex[j * 2]
      complex[j * 2] = tempReal
      // Swap imaginary parts
      const tempImag = complex[i * 2 + 1]
      complex[i * 2 + 1] = complex[j * 2 + 1]
      complex[j * 2 + 1] = tempImag
    }
  }

  // Cooley-Tukey FFT
  for (let size = 2; size <= fftSize; size *= 2) {
    const halfSize = size / 2
    const step = Math.PI / halfSize

    for (let i = 0; i < fftSize; i += size) {
      for (let j = 0; j < halfSize; j++) {
        const index = i + j
        const evenIndex = index * 2
        const oddIndex = (i + j + halfSize) * 2

        // Get even and odd values
        const evenReal = complex[evenIndex]
        const evenImag = complex[evenIndex + 1]
        const oddReal = complex[oddIndex]
        const oddImag = complex[oddIndex + 1]

        // Twiddle factor
        const angle = -j * step
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)

        // Butterfly operation
        complex[evenIndex] = evenReal + oddReal * cos - oddImag * sin
        complex[evenIndex + 1] = evenImag + oddReal * sin + oddImag * cos
        complex[oddIndex] = evenReal - oddReal * cos + oddImag * sin
        complex[oddIndex + 1] = evenImag - oddReal * sin - oddImag * cos
      }
    }
  }

  return complex
}

/**
 * Reverse bits of a number
 */
function reverseBits(n: number, bits: number): number {
  let reversed = 0
  for (let i = 0; i < bits; i++) {
    reversed = (reversed << 1) | (n & 1)
    n >>= 1
  }
  return reversed
}

// ============================================================================
// FREQUENCY ANALYSIS
// ============================================================================

/**
 * Calculate magnitude spectrum from FFT result
 */
function getMagnitudeSpectrum(fftResult: Float32Array): Float32Array {
  const n = fftResult.length / 2
  const magnitudes = new Float32Array(n / 2) // Only need first half (symmetric)

  for (let i = 0; i < magnitudes.length; i++) {
    const real = fftResult[i * 2]
    const imag = fftResult[i * 2 + 1]
    magnitudes[i] = Math.sqrt(real * real + imag * imag)
  }

  return magnitudes
}

/**
 * Convert magnitudes to 0-255 range
 */
function magnitudesToUint8(magnitudes: Float32Array): Uint8Array {
  const result = new Uint8Array(magnitudes.length)

  // Find maximum magnitude for normalization
  let maxMag = 0
  for (let i = 0; i < magnitudes.length; i++) {
    if (magnitudes[i] > maxMag) {
      maxMag = magnitudes[i]
    }
  }

  // Normalize to 0-255
  for (let i = 0; i < magnitudes.length; i++) {
    result[i] = Math.min(255, (magnitudes[i] / maxMag) * 255)
  }

  return result
}

/**
 * Calculate frequency bins
 */
function calculateFrequencyBins(fftSize: number, sampleRate: number): Float64Array {
  const binCount = fftSize / 2
  const bins = new Float64Array(binCount)
  const binWidth = sampleRate / fftSize

  for (let i = 0; i < binCount; i++) {
    bins[i] = i * binWidth
  }

  return bins
}

/**
 * Find dominant frequency (peak)
 */
function findDominantFrequency(magnitudes: Float32Array, frequencyBins: Float64Array): number {
  let maxMag = 0
  let maxIndex = 0

  for (let i = 1; i < magnitudes.length; i++) {
    // Skip DC component (i=0)
    if (magnitudes[i] > maxMag) {
      maxMag = magnitudes[i]
      maxIndex = i
    }
  }

  return frequencyBins[maxIndex]
}

/**
 * Calculate spectral centroid (brightness)
 */
function calculateSpectralCentroid(magnitudes: Float32Array, frequencyBins: Float64Array): number {
  let weightedSum = 0
  let totalMagnitude = 0

  for (let i = 0; i < magnitudes.length; i++) {
    weightedSum += magnitudes[i] * frequencyBins[i]
    totalMagnitude += magnitudes[i]
  }

  return totalMagnitude > 0 ? weightedSum / totalMagnitude : 0
}

/**
 * Calculate frequency bandwidth
 */
function calculateBandwidth(magnitudes: Float32Array, frequencyBins: Float64Array, centroid: number): number {
  let weightedDeviation = 0
  let totalMagnitude = 0

  for (let i = 0; i < magnitudes.length; i++) {
    const deviation = frequencyBins[i] - centroid
    weightedDeviation += magnitudes[i] * deviation * deviation
    totalMagnitude += magnitudes[i]
  }

  return totalMagnitude > 0 ? Math.sqrt(weightedDeviation / totalMagnitude) : 0
}

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

self.onmessage = (event: MessageEvent<FFTAnalyzerMessage>) => {
  try {
    const { type, data } = event.data

    if (type === 'configure') {
      // Update configuration
      if (data?.fftSize) config.fftSize = data.fftSize
      if (data?.sampleRate) config.sampleRate = data.sampleRate
      if (data?.smoothing !== undefined) config.smoothing = data.smoothing
      if (data?.windowFunction) config.windowFunction = data.windowFunction

      return
    }

    if (type === 'analyze') {
      if (!data?.audioData) {
        throw new Error('No audio data provided')
      }

      // Apply window function
      const windowed = applyWindow(data.audioData)

      // Perform FFT
      const fftResult = fft(windowed)

      // Get magnitude spectrum
      const magnitudes = getMagnitudeSpectrum(fftResult)

      // Convert to 0-255 range
      const frequencyData = magnitudesToUint8(magnitudes)

      // Calculate frequency bins
      const frequencyBins = calculateFrequencyBins(config.fftSize, config.sampleRate)

      // Calculate frequency features
      const dominantFrequency = findDominantFrequency(magnitudes, frequencyBins)
      const spectralCentroid = calculateSpectralCentroid(magnitudes, frequencyBins)
      const bandwidth = calculateBandwidth(magnitudes, frequencyBins, spectralCentroid)

      // Send result
      const result: FFTAnalyzerResult = {
        type: 'result',
        data: {
          frequencyData,
          frequencyBins,
          sampleRate: config.sampleRate,
          fftSize: config.fftSize,
          dominantFrequency,
          spectralCentroid,
          bandwidth,
        },
      }

      self.postMessage(result)

      return
    }

    throw new Error(`Unknown message type: ${type}`)
  } catch (error) {
    const errorMessage: FFTAnalyzerError = {
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
    }
    self.postMessage(errorMessage)
  }
}

// ============================================================================
// TYPE EXPORTS FOR WORKER
// ============================================================================

// Types are already exported above, no need to re-export
