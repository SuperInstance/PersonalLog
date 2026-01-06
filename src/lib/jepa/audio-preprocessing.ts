/**
 * Audio Preprocessing for Whisper.cpp
 *
 * Converts audio to the format required by Whisper:
 * - 16kHz sample rate
 * - Mono channel
 * - Float32 samples normalized to [-1, 1]
 * - Optional silence removal
 * - Optional framing for streaming
 */

import { WHISPER_SAMPLE_RATE } from './stt-types'

// ============================================================================
// TYPES
// ============================================================================

export interface PreprocessOptions {
  targetSampleRate?: number
  removeSilence?: boolean
  silenceThreshold?: number // 0-1
  minSilenceDuration?: number // seconds
  normalize?: boolean
}

export interface AudioFrame {
  samples: Float32Array
  startTime: number // seconds
  endTime: number // seconds
}

// ============================================================================
// PREPROCESSING FUNCTIONS
// ============================================================================

/**
 * Preprocess audio buffer for Whisper transcription
 */
export async function preprocessAudio(
  audioBuffer: AudioBuffer,
  options: PreprocessOptions = {}
): Promise<AudioBuffer> {
  const {
    targetSampleRate = WHISPER_SAMPLE_RATE,
    removeSilence = false,
    silenceThreshold = 0.01,
    minSilenceDuration = 0.5,
    normalize = true,
  } = options

  let processed = audioBuffer

  // 1. Convert to mono
  processed = await toMono(processed)

  // 2. Resample to target rate
  processed = await resample(processed, targetSampleRate)

  // 3. Remove silence (optional)
  if (removeSilence) {
    processed = removeSilenceFromBuffer(processed, silenceThreshold, minSilenceDuration)
  }

  // 4. Normalize amplitude
  if (normalize) {
    processed = normalizeAmplitude(processed)
  }

  return processed
}

/**
 * Convert stereo/multi-channel audio to mono
 */
export async function toMono(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
  if (audioBuffer.numberOfChannels === 1) {
    return audioBuffer
  }

  // Average channels
  const numberOfChannels = audioBuffer.numberOfChannels
  const length = audioBuffer.length
  const sampleRate = audioBuffer.sampleRate

  const offlineCtx = new OfflineAudioContext(1, length, sampleRate)
  const monoBuffer = offlineCtx.createBuffer(1, length, sampleRate)
  const monoData = monoBuffer.getChannelData(0)

  // Mix down by averaging all channels
  for (let i = 0; i < length; i++) {
    let sum = 0
    for (let channel = 0; channel < numberOfChannels; channel++) {
      sum += audioBuffer.getChannelData(channel)[i]
    }
    monoData[i] = sum / numberOfChannels
  }

  return monoBuffer
}

/**
 * Resample audio to target sample rate
 */
export async function resample(
  audioBuffer: AudioBuffer,
  targetSampleRate: number
): Promise<AudioBuffer> {
  if (audioBuffer.sampleRate === targetSampleRate) {
    return audioBuffer
  }

  const sourceSampleRate = audioBuffer.sampleRate
  const numberOfChannels = audioBuffer.numberOfChannels
  const length = audioBuffer.length

  // Calculate new length
  const ratio = sourceSampleRate / targetSampleRate
  const newLength = Math.round(length / ratio)

  const offlineCtx = new OfflineAudioContext(numberOfChannels, newLength, targetSampleRate)
  const resampledBuffer = offlineCtx.createBuffer(numberOfChannels, newLength, targetSampleRate)

  // Linear interpolation resampling
  for (let channel = 0; channel < numberOfChannels; channel++) {
    const sourceData = audioBuffer.getChannelData(channel)
    const targetData = resampledBuffer.getChannelData(channel)

    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio
      const srcIndexInt = Math.floor(srcIndex)
      const srcIndexFrac = srcIndex - srcIndexInt

      if (srcIndexInt + 1 < length) {
        // Linear interpolation
        targetData[i] =
          sourceData[srcIndexInt] * (1 - srcIndexFrac) +
          sourceData[srcIndexInt + 1] * srcIndexFrac
      } else {
        targetData[i] = sourceData[srcIndexInt]
      }
    }
  }

  return resampledBuffer
}

/**
 * Normalize audio amplitude to -1dB (0.89)
 */
export function normalizeAmplitude(audioBuffer: AudioBuffer, targetDb = -1): AudioBuffer {
  const numberOfChannels = audioBuffer.numberOfChannels
  const length = audioBuffer.length
  const sampleRate = audioBuffer.sampleRate

  // Find peak amplitude across all channels
  let peak = 0
  for (let channel = 0; channel < numberOfChannels; channel++) {
    const data = audioBuffer.getChannelData(channel)
    for (let i = 0; i < length; i++) {
      peak = Math.max(peak, Math.abs(data[i]))
    }
  }

  if (peak === 0) {
    return audioBuffer // Silent audio, nothing to normalize
  }

  // Calculate gain
  const targetAmplitude = Math.pow(10, targetDb / 20) // -1dB = 0.89
  const gain = targetAmplitude / peak

  // Apply gain
  const normalizedBuffer = new AudioBuffer({
    numberOfChannels,
    length,
    sampleRate,
  })

  for (let channel = 0; channel < numberOfChannels; channel++) {
    const sourceData = audioBuffer.getChannelData(channel)
    const targetData = normalizedBuffer.getChannelData(channel)

    for (let i = 0; i < length; i++) {
      targetData[i] = sourceData[i] * gain
    }
  }

  return normalizedBuffer
}

/**
 * Remove silence from audio buffer
 */
export function removeSilenceFromBuffer(
  audioBuffer: AudioBuffer,
  threshold = 0.01,
  minSilenceDuration = 0.5
): AudioBuffer {
  const sampleRate = audioBuffer.sampleRate
  const minSilenceSamples = Math.floor(sampleRate * minSilenceDuration)

  const data = audioBuffer.getChannelData(0)
  const length = data.length

  // Find non-silent regions
  const regions: Array<{ start: number; end: number }> = []
  let inSpeech = false
  let speechStart = 0
  let silenceStart = 0

  for (let i = 0; i < length; i++) {
    const amplitude = Math.abs(data[i])

    if (!inSpeech && amplitude > threshold) {
      // Start of speech
      inSpeech = true
      speechStart = i
    } else if (inSpeech && amplitude < threshold) {
      // Start of silence
      inSpeech = false
      silenceStart = i
    } else if (!inSpeech && amplitude > threshold) {
      // End of silence - check if it's long enough to remove
      const silenceDuration = i - silenceStart
      if (silenceDuration >= minSilenceSamples) {
        // Keep the speech region
        regions.push({ start: speechStart, end: silenceStart })
      }
      inSpeech = true
      speechStart = i
    }
  }

  // Add final speech region if audio ends with speech
  if (inSpeech) {
    regions.push({ start: speechStart, end: length })
  } else if (regions.length > 0) {
    // Check if final silence should be kept
    const lastRegion = regions[regions.length - 1]
    if (silenceStart - lastRegion.end < minSilenceSamples) {
      regions[regions.length - 1] = { start: lastRegion.start, end: length }
    }
  }

  // If no speech detected, return original
  if (regions.length === 0) {
    return audioBuffer
  }

  // Combine regions
  const totalLength = regions.reduce((sum, region) => sum + (region.end - region.start), 0)
  const resultBuffer = new AudioBuffer({
    numberOfChannels: 1,
    length: totalLength,
    sampleRate,
  })

  const resultData = resultBuffer.getChannelData(0)
  let offset = 0

  for (const region of regions) {
    const regionLength = region.end - region.start
    for (let i = 0; i < regionLength; i++) {
      resultData[offset + i] = data[region.start + i]
    }
    offset += regionLength
  }

  return resultBuffer
}

/**
 * Frame audio into chunks for streaming
 */
export function frameAudio(
  audioBuffer: AudioBuffer,
  frameDuration: number = 30 // seconds
): AudioFrame[] {
  const frameSize = Math.floor(audioBuffer.sampleRate * frameDuration)
  const numberOfFrames = Math.ceil(audioBuffer.length / frameSize)

  const frames: AudioFrame[] = []
  const data = audioBuffer.getChannelData(0)

  for (let i = 0; i < numberOfFrames; i++) {
    const start = i * frameSize
    const end = Math.min(start + frameSize, audioBuffer.length)
    const frameSamples = data.slice(start, end)

    frames.push({
      samples: frameSamples,
      startTime: start / audioBuffer.sampleRate,
      endTime: end / audioBuffer.sampleRate,
    })
  }

  return frames
}

/**
 * Calculate audio level (RMS) for visualization
 */
export function calculateAudioLevel(samples: Float32Array): number {
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i]
  }
  const rms = Math.sqrt(sum / samples.length)
  return Math.min(1, rms * 10) // Scale up for better visualization
}

/**
 * Detect audio segments with speech
 */
export function detectSpeechSegments(
  audioBuffer: AudioBuffer,
  threshold = 0.01,
  minSpeechDuration = 0.3
): Array<{ start: number; end: number; confidence: number }> {
  const sampleRate = audioBuffer.sampleRate
  const minSpeechSamples = Math.floor(sampleRate * minSpeechDuration)

  const data = audioBuffer.getChannelData(0)
  const length = data.length

  const segments: Array<{ start: number; end: number; confidence: number }> = []
  let inSpeech = false
  let speechStart = 0
  let maxAmplitude = 0

  for (let i = 0; i < length; i++) {
    const amplitude = Math.abs(data[i])

    if (!inSpeech && amplitude > threshold) {
      // Start of speech
      inSpeech = true
      speechStart = i
      maxAmplitude = amplitude
    } else if (inSpeech) {
      maxAmplitude = Math.max(maxAmplitude, amplitude)

      // Check for end of speech
      if (amplitude < threshold) {
        // Check if speech segment is long enough
        const duration = i - speechStart
        if (duration >= minSpeechSamples) {
          segments.push({
            start: speechStart / sampleRate,
            end: i / sampleRate,
            confidence: Math.min(1, maxAmplitude * 2), // Rough confidence estimate
          })
        }
        inSpeech = false
        maxAmplitude = 0
      }
    }
  }

  // Add final speech segment if audio ends with speech
  if (inSpeech) {
    const duration = length - speechStart
    if (duration >= minSpeechSamples) {
      segments.push({
        start: speechStart / sampleRate,
        end: length / sampleRate,
        confidence: Math.min(1, maxAmplitude * 2),
      })
    }
  }

  return segments
}

/**
 * Convert AudioBuffer to Float32Array
 */
export function audioBufferToFloat32(audioBuffer: AudioBuffer): Float32Array {
  const numberOfChannels = audioBuffer.numberOfChannels
  const length = audioBuffer.length

  if (numberOfChannels === 1) {
    return audioBuffer.getChannelData(0)
  }

  // Mix down to mono
  const result = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    let sum = 0
    for (let channel = 0; channel < numberOfChannels; channel++) {
      sum += audioBuffer.getChannelData(channel)[i]
    }
    result[i] = sum / numberOfChannels
  }

  return result
}

/**
 * Convert Float32Array to AudioBuffer
 */
export function float32ToAudioBuffer(
  samples: Float32Array,
  sampleRate: number,
  numberOfChannels = 1
): AudioBuffer {
  const audioContext = new AudioContext({ sampleRate })
  const audioBuffer = audioContext.createBuffer(numberOfChannels, samples.length, sampleRate)

  for (let channel = 0; channel < numberOfChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel)
    channelData.set(samples)
  }

  return audioBuffer
}

/**
 * Apply high-pass filter to remove low-frequency noise
 */
export function highPassFilter(audioBuffer: AudioBuffer, cutoffFreq = 80): AudioBuffer {
  const sampleRate = audioBuffer.sampleRate
  const rc = 1.0 / (cutoffFreq * 2 * Math.PI)
  const dt = 1.0 / sampleRate
  const alpha = rc / (rc + dt)

  const data = audioBuffer.getChannelData(0)
  const filteredData = new Float32Array(data.length)

  let filtered = data[0]
  filteredData[0] = filtered

  for (let i = 1; i < data.length; i++) {
    filtered = alpha * (filtered + data[i] - data[i - 1])
    filteredData[i] = filtered
  }

  const filteredBuffer = new AudioBuffer({
    numberOfChannels: 1,
    length: data.length,
    sampleRate,
  })

  filteredBuffer.getChannelData(0).set(filteredData)

  return filteredBuffer
}
