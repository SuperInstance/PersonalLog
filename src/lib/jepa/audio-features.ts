/**
 * JEPA Audio Feature Extraction
 *
 * Extracts MFCC, spectral, and prosodic features from audio buffers
 * for emotion analysis using the Tiny-JEPA model.
 *
 * @module lib/jepa/audio-features
 */

import { AUDIO_CONFIG } from './types'

// ============================================================================
// FEATURE EXTRACTION CONFIG
// ============================================================================

export const FEATURE_CONFIG = {
  /**
   * MFCC configuration
   */
  MFCC: {
    numCoefficients: 13, // Number of MFCC coefficients to extract
    frameSize: 0.025, // Frame size in seconds (25ms)
    hopSize: 0.010, // Hop size in seconds (10ms)
    numMelFilters: 26, // Number of mel-frequency filter banks
    sampleRate: AUDIO_CONFIG.SAMPLE_RATE,
  },

  /**
   * Spectral feature configuration
   */
  SPECTRAL: {
    frameSize: 0.025, // Frame size in seconds (25ms)
    hopSize: 0.010, // Hop size in seconds (10ms)
  },

  /**
   * Prosodic feature configuration
   */
  PROSODIC: {
    minPitch: 80, // Minimum pitch in Hz (for male speakers)
    maxPitch: 400, // Maximum pitch in Hz (for female speakers)
    pitchFrameSize: 0.04, // Frame size for pitch detection (40ms)
  },
} as const

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AudioFeatures {
  /** MFCC coefficients (13 coefficients × N frames) */
  mfcc: Float32Array

  /** Spectral features */
  spectral: SpectralFeatures

  /** Prosodic features */
  prosodic: ProsodicFeatures
}

export interface SpectralFeatures {
  /** Spectral centroid (brightness) */
  centroid: number

  /** Spectral rolloff (frequency below which 85% of energy is contained) */
  rolloff: number

  /** Spectral flux (rate of change of spectrum) */
  flux: number

  /** Zero crossing rate (number of sign changes) */
  zeroCrossingRate: number
}

export interface ProsodicFeatures {
  /** Fundamental frequency (F0) in Hz */
  pitch: number

  /** Energy/RMS amplitude */
  energy: number

  /** Tempo/beats per minute */
  tempo: number

  /** Pitch variation (jitter) */
  jitter: number

  /** Amplitude variation (shimmer) */
  shimmer: number
}

// ============================================================================
// MFCC EXTRACTION
// ============================================================================

/**
 * Extract MFCC coefficients from audio buffer
 *
 * @param audioBuffer - Input audio buffer
 * @returns MFCC coefficients (13 × N frames matrix)
 */
export function extractMFCC(audioBuffer: AudioBuffer): Float32Array {
  const config = FEATURE_CONFIG.MFCC
  const samples = audioBuffer.getChannelData(0)
  const sampleRate = audioBuffer.sampleRate

  // Calculate frame parameters
  const frameSizeSamples = Math.floor(config.frameSize * sampleRate)
  const hopSizeSamples = Math.floor(config.hopSize * sampleRate)

  // Apply pre-emphasis filter
  const preEmphasis = 0.97
  const emphasized = applyPreEmphasis(samples, preEmphasis)

  // Frame the signal
  const frames = frameAudio(emphasized, frameSizeSamples, hopSizeSamples)

  // Extract MFCCs from each frame
  const mfccs: number[][] = []
  for (const frame of frames) {
    const mfcc = extractMFCCFrame(frame, sampleRate, config)
    mfccs.push(mfcc)
  }

  // Pad or truncate to 100 frames
  const numFrames = 100
  const mfccMatrix = new Float32Array(config.numCoefficients * numFrames)

  for (let i = 0; i < numFrames; i++) {
    for (let j = 0; j < config.numCoefficients; j++) {
      if (i < mfccs.length) {
        mfccMatrix[i * config.numCoefficients + j] = mfccs[i][j]
      } else {
        // Pad with zeros
        mfccMatrix[i * config.numCoefficients + j] = 0
      }
    }
  }

  return mfccMatrix
}

/**
 * Extract MFCC from a single frame
 */
function extractMFCCFrame(
  frame: number[],
  sampleRate: number,
  config: typeof FEATURE_CONFIG.MFCC
): number[] {
  // Apply Hamming window
  const windowed = applyHammingWindow(frame)

  // Compute FFT
  const fft = computeFFT(windowed)

  // Compute power spectrum
  const powerSpectrum = computePowerSpectrum(fft)

  // Apply mel filterbank
  const melEnergies = applyMelFilterbank(powerSpectrum, sampleRate, config)

  // Take log
  const logMelEnergies = melEnergies.map(e => Math.log(e + 1e-10))

  // Apply DCT to get MFCCs
  const mfcc = computeDCT(logMelEnergies, config.numCoefficients)

  return mfcc
}

// ============================================================================
// SPECTRAL FEATURE EXTRACTION
// ============================================================================

/**
 * Extract spectral features from audio buffer
 *
 * @param audioBuffer - Input audio buffer
 * @returns Spectral features
 */
export function extractSpectralFeatures(audioBuffer: AudioBuffer): SpectralFeatures {
  const samples = audioBuffer.getChannelData(0)
  const sampleRate = audioBuffer.sampleRate

  // Compute FFT
  const fft = computeFFT(Array.from(samples.slice(0, 4096)))
  const magnitude = fft.map(c => Math.sqrt(c.real * c.real + c.imag * c.imag))

  // Spectral centroid
  const centroid = computeSpectralCentroid(magnitude, sampleRate)

  // Spectral rolloff
  const rolloff = computeSpectralRolloff(magnitude, sampleRate)

  // Spectral flux (compare with previous frame)
  const flux = computeSpectralFlux(magnitude)

  // Zero crossing rate
  const zcr = computeZeroCrossingRate(samples)

  return {
    centroid,
    rolloff,
    flux,
    zeroCrossingRate: zcr,
  }
}

function computeSpectralCentroid(magnitude: number[], sampleRate: number): number {
  let numerator = 0
  let denominator = 0

  for (let i = 0; i < magnitude.length; i++) {
    const freq = (i * sampleRate) / (2 * magnitude.length)
    numerator += freq * magnitude[i]
    denominator += magnitude[i]
  }

  return denominator > 0 ? numerator / denominator : 0
}

function computeSpectralRolloff(magnitude: number[], sampleRate: number): number {
  const totalEnergy = magnitude.reduce((sum, m) => sum + m * m, 0)
  let energySum = 0
  const threshold = 0.85 * totalEnergy

  for (let i = 0; i < magnitude.length; i++) {
    energySum += magnitude[i] * magnitude[i]
    if (energySum >= threshold) {
      return (i * sampleRate) / (2 * magnitude.length)
    }
  }

  return sampleRate / 2
}

function computeSpectralFlux(magnitude: number[]): number {
  // Simplified flux computation (would compare with previous frame in production)
  let sum = 0
  for (let i = 1; i < magnitude.length; i++) {
    const diff = magnitude[i] - magnitude[i - 1]
    sum += diff * diff
  }
  return Math.sqrt(sum)
}

function computeZeroCrossingRate(samples: Float32Array): number {
  let crossings = 0
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i - 1] >= 0 && samples[i] < 0) || (samples[i - 1] < 0 && samples[i] >= 0)) {
      crossings++
    }
  }
  return crossings / samples.length
}

// ============================================================================
// PROSODIC FEATURE EXTRACTION
// ============================================================================

/**
 * Extract prosodic features from audio buffer
 *
 * @param audioBuffer - Input audio buffer
 * @returns Prosodic features
 */
export function extractProsodicFeatures(audioBuffer: AudioBuffer): ProsodicFeatures {
  const samples = audioBuffer.getChannelData(0)
  const sampleRate = audioBuffer.sampleRate

  // Pitch detection using autocorrelation
  const pitch = detectPitch(samples, sampleRate)

  // Energy (RMS)
  const energy = computeEnergy(samples)

  // Tempo (simplified - would use beat tracking in production)
  const tempo = estimateTempo(samples, sampleRate)

  // Jitter (pitch variation)
  const jitter = computeJitter(samples, sampleRate)

  // Shimmer (amplitude variation)
  const shimmer = computeShimmer(samples)

  return {
    pitch,
    energy,
    tempo,
    jitter,
    shimmer,
  }
}

/**
 * Detect fundamental frequency (F0) using autocorrelation
 */
function detectPitch(samples: Float32Array, sampleRate: number): number {
  const config = FEATURE_CONFIG.PROSODIC
  const minPeriod = Math.floor(sampleRate / config.maxPitch)
  const maxPeriod = Math.floor(sampleRate / config.minPitch)

  // Use autocorrelation
  const correlation = autocorrelate(samples, minPeriod, maxPeriod)

  // Find the peak
  let maxCorr = 0
  let bestPeriod = minPeriod

  for (let i = minPeriod; i <= maxPeriod; i++) {
    if (correlation[i] > maxCorr) {
      maxCorr = correlation[i]
      bestPeriod = i
    }
  }

  // Calculate pitch from period
  if (maxCorr > 0.3) {
    // Threshold for voiced speech
    return sampleRate / bestPeriod
  }

  return 0 // Unvoiced
}

function autocorrelate(samples: Float32Array, minPeriod: number, maxPeriod: number): Float32Array {
  const correlation = new Float32Array(maxPeriod + 1)

  for (let lag = minPeriod; lag <= maxPeriod; lag++) {
    let sum = 0
    for (let i = 0; i < samples.length - lag; i++) {
      sum += samples[i] * samples[i + lag]
    }
    correlation[lag] = sum
  }

  return correlation
}

function computeEnergy(samples: Float32Array): number {
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i]
  }
  return Math.sqrt(sum / samples.length)
}

function estimateTempo(samples: Float32Array, sampleRate: number): number {
  // Simplified tempo estimation using energy peaks
  // In production, would use beat tracking algorithm
  const frameSize = Math.floor(sampleRate * 0.04) // 40ms frames
  const hopSize = Math.floor(sampleRate * 0.02) // 20ms hop

  const energies: number[] = []
  for (let i = 0; i < samples.length - frameSize; i += hopSize) {
    let sum = 0
    for (let j = 0; j < frameSize; j++) {
      sum += samples[i + j] * samples[i + j]
    }
    energies.push(sum / frameSize)
  }

  // Count peaks
  let peaks = 0
  for (let i = 1; i < energies.length - 1; i++) {
    if (energies[i] > energies[i - 1] && energies[i] > energies[i + 1]) {
      peaks++
    }
  }

  // Estimate tempo (beats per minute)
  const duration = samples.length / sampleRate
  return peaks > 0 ? (peaks / duration) * 60 : 0
}

function computeJitter(samples: Float32Array, sampleRate: number): number {
  // Pitch variation computed as standard deviation of pitch differences
  const frameSize = Math.floor(sampleRate * 0.04)
  const pitches: number[] = []

  for (let i = 0; i < samples.length - frameSize; i += frameSize) {
    const frame = samples.slice(i, i + frameSize)
    const pitch = detectPitch(frame, sampleRate)
    if (pitch > 0) {
      pitches.push(pitch)
    }
  }

  if (pitches.length < 2) return 0

  // Calculate differences
  const differences: number[] = []
  for (let i = 1; i < pitches.length; i++) {
    differences.push(Math.abs(pitches[i] - pitches[i - 1]))
  }

  // Mean difference
  const mean = differences.reduce((sum, d) => sum + d, 0) / differences.length

  return mean
}

function computeShimmer(samples: Float32Array): number {
  // Amplitude variation computed as standard deviation of energy differences
  const frameSize = Math.floor(samples.length / 10)
  const energies: number[] = []

  for (let i = 0; i < samples.length - frameSize; i += frameSize) {
    const frame = samples.slice(i, i + frameSize)
    energies.push(computeEnergy(frame))
  }

  if (energies.length < 2) return 0

  // Calculate differences
  const differences: number[] = []
  for (let i = 1; i < energies.length; i++) {
    differences.push(Math.abs(energies[i] - energies[i - 1]))
  }

  // Mean difference
  const mean = differences.reduce((sum, d) => sum + d, 0) / differences.length

  return mean
}

// ============================================================================
// FEATURE NORMALIZATION
// ============================================================================

/**
 * Normalize audio features using z-score normalization
 *
 * @param features - Raw audio features
 * @returns Normalized features
 */
export function normalizeFeatures(features: AudioFeatures): AudioFeatures {
  // Normalize MFCC (frame-wise)
  const normalizedMFCC = normalizeMFCC(features.mfcc)

  // Normalize spectral features
  const normalizedSpectral = normalizeSpectralFeatures(features.spectral)

  // Normalize prosodic features
  const normalizedProsodic = normalizeProsodicFeatures(features.prosodic)

  return {
    mfcc: normalizedMFCC,
    spectral: normalizedSpectral,
    prosodic: normalizedProsodic,
  }
}

function normalizeMFCC(mfcc: Float32Array): Float32Array {
  const numCoefficients = FEATURE_CONFIG.MFCC.numCoefficients
  const numFrames = mfcc.length / numCoefficients

  // Calculate mean and std for each coefficient across all frames
  const means = new Float32Array(numCoefficients)
  const stds = new Float32Array(numCoefficients)

  // Calculate means
  for (let i = 0; i < numCoefficients; i++) {
    let sum = 0
    for (let j = 0; j < numFrames; j++) {
      sum += mfcc[j * numCoefficients + i]
    }
    means[i] = sum / numFrames
  }

  // Calculate standard deviations
  for (let i = 0; i < numCoefficients; i++) {
    let sum = 0
    for (let j = 0; j < numFrames; j++) {
      const diff = mfcc[j * numCoefficients + i] - means[i]
      sum += diff * diff
    }
    stds[i] = Math.sqrt(sum / numFrames)
  }

  // Normalize
  const normalized = new Float32Array(mfcc.length)
  for (let i = 0; i < numCoefficients; i++) {
    for (let j = 0; j < numFrames; j++) {
      const idx = j * numCoefficients + i
      normalized[idx] = stds[i] > 0 ? (mfcc[idx] - means[i]) / stds[i] : 0
    }
  }

  return normalized
}

function normalizeSpectralFeatures(spectral: SpectralFeatures): SpectralFeatures {
  // Use predefined normalization constants (from training data)
  const CENTROID_MEAN = 2000
  const CENTROID_STD = 1000
  const ROLLOFF_MEAN = 5000
  const ROLLOFF_STD = 2000
  const FLUX_MEAN = 0.5
  const FLUX_STD = 0.3
  const ZCR_MEAN = 0.1
  const ZCR_STD = 0.05

  return {
    centroid: (spectral.centroid - CENTROID_MEAN) / CENTROID_STD,
    rolloff: (spectral.rolloff - ROLLOFF_MEAN) / ROLLOFF_STD,
    flux: (spectral.flux - FLUX_MEAN) / FLUX_STD,
    zeroCrossingRate: (spectral.zeroCrossingRate - ZCR_MEAN) / ZCR_STD,
  }
}

function normalizeProsodicFeatures(prosodic: ProsodicFeatures): ProsodicFeatures {
  // Use predefined normalization constants (from training data)
  const PITCH_MEAN = 150
  const PITCH_STD = 50
  const ENERGY_MEAN = 0.1
  const ENERGY_STD = 0.05
  const TEMPO_MEAN = 100
  const TEMPO_STD = 30
  const JITTER_MEAN = 2
  const JITTER_STD = 1
  const SHIMMER_MEAN = 0.01
  const SHIMMER_STD = 0.005

  return {
    pitch: prosodic.pitch > 0 ? (prosodic.pitch - PITCH_MEAN) / PITCH_STD : 0,
    energy: (prosodic.energy - ENERGY_MEAN) / ENERGY_STD,
    tempo: prosodic.tempo > 0 ? (prosodic.tempo - TEMPO_MEAN) / TEMPO_STD : 0,
    jitter: (prosodic.jitter - JITTER_MEAN) / JITTER_STD,
    shimmer: (prosodic.shimmer - SHIMMER_MEAN) / SHIMMER_STD,
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Apply pre-emphasis filter to audio signal
 */
function applyPreEmphasis(samples: Float32Array, coefficient: number): Float32Array {
  const emphasized = new Float32Array(samples.length)
  emphasized[0] = samples[0]

  for (let i = 1; i < samples.length; i++) {
    emphasized[i] = samples[i] - coefficient * samples[i - 1]
  }

  return emphasized
}

/**
 * Apply Hamming window to frame
 */
function applyHammingWindow(frame: number[]): number[] {
  const windowed = new Array(frame.length)
  for (let i = 0; i < frame.length; i++) {
    const window = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (frame.length - 1))
    windowed[i] = frame[i] * window
  }
  return windowed
}

/**
 * Frame audio signal into overlapping windows
 */
function frameAudio(samples: Float32Array, frameSize: number, hopSize: number): number[][] {
  const frames: number[][] = []
  for (let i = 0; i < samples.length - frameSize; i += hopSize) {
    frames.push(Array.from(samples.slice(i, i + frameSize)))
  }
  return frames
}

/**
 * Compute FFT using Cooley-Tukey algorithm (simplified)
 */
function computeFFT(samples: number[]): Array<{ real: number; imag: number }> {
  const N = Math.pow(2, Math.floor(Math.log2(samples.length)))
  const padded = samples.slice(0, N)

  // Use simple radix-2 FFT (simplified - in production use optimized library)
  const result: Array<{ real: number; imag: number }> = []
  for (let k = 0; k < N; k++) {
    let real = 0
    let imag = 0
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N
      real += padded[n] * Math.cos(angle)
      imag -= padded[n] * Math.sin(angle)
    }
    result.push({ real, imag })
  }

  return result
}

/**
 * Compute power spectrum from FFT
 */
function computePowerSpectrum(fft: Array<{ real: number; imag: number }>): number[] {
  return fft.map(c => c.real * c.real + c.imag * c.imag)
}

/**
 * Apply mel-frequency filterbank to power spectrum
 */
function applyMelFilterbank(
  powerSpectrum: number[],
  sampleRate: number,
  config: typeof FEATURE_CONFIG.MFCC
): number[] {
  const numFilters = config.numMelFilters
  const numFFT = powerSpectrum.length

  // Convert Hz to Mel scale
  const hzToMel = (hz: number) => 1127 * Math.log(1 + hz / 700)
  const melToHz = (mel: number) => 700 * (Math.exp(mel / 1127) - 1)

  // Calculate filter bank edges
  const melMin = hzToMel(0)
  const melMax = hzToMel(sampleRate / 2)
  const melPoints = []
  for (let i = 0; i <= numFilters + 1; i++) {
    melPoints.push(melMin + ((melMax - melMin) * i) / (numFilters + 1))
  }

  const hzPoints = melPoints.map(melToHz)
  const binPoints = hzPoints.map(hz => Math.floor((hz * numFFT) / (sampleRate / 2)))

  // Apply filters
  const melEnergies: number[] = []
  for (let i = 0; i < numFilters; i++) {
    let energy = 0
    for (let j = binPoints[i]; j < binPoints[i + 2]; j++) {
      if (j >= 0 && j < numFFT) {
        let weight = 0
        if (j >= binPoints[i] && j < binPoints[i + 1]) {
          weight = (j - binPoints[i]) / (binPoints[i + 1] - binPoints[i])
        } else if (j >= binPoints[i + 1] && j < binPoints[i + 2]) {
          weight = (binPoints[i + 2] - j) / (binPoints[i + 2] - binPoints[i + 1])
        }
        energy += weight * powerSpectrum[j]
      }
    }
    melEnergies.push(energy)
  }

  return melEnergies
}

/**
 * Compute Discrete Cosine Transform (DCT)
 */
function computeDCT(values: number[], numCoefficients: number): number[] {
  const N = values.length
  const coefficients: number[] = []

  for (let k = 0; k < numCoefficients; k++) {
    let sum = 0
    for (let n = 0; n < N; n++) {
      sum += values[n] * Math.cos((Math.PI * k * (2 * n + 1)) / (2 * N))
    }
    coefficients.push(sum * Math.sqrt(2 / N))
  }

  return coefficients
}
