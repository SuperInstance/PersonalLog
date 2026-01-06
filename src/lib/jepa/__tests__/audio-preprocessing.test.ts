/**
 * Tests for Audio Preprocessing Utilities
 */

import { describe, it, expect } from 'vitest'
import {
  preprocessAudio,
  toMono,
  resample,
  normalizeAmplitude,
  removeSilenceFromBuffer,
  frameAudio,
  calculateAudioLevel,
  detectSpeechSegments,
  audioBufferToFloat32,
  float32ToAudioBuffer,
  highPassFilter,
} from '../audio-preprocessing'

describe('Audio Preprocessing', () => {
  describe('preprocessAudio', () => {
    it('should apply default preprocessing', async () => {
      const audioContext = new AudioContext({ sampleRate: 44100 })
      const buffer = audioContext.createBuffer(2, 44100, 44100)

      const result = await preprocessAudio(buffer)

      expect(result.numberOfChannels).toBe(1)
      expect(result.sampleRate).toBe(16000)
    })

    it('should support custom options', async () => {
      const audioContext = new AudioContext({ sampleRate: 44100 })
      const buffer = audioContext.createBuffer(2, 44100, 44100)

      const result = await preprocessAudio(buffer, {
        targetSampleRate: 22050,
        removeSilence: false,
        normalize: false,
      })

      expect(result.sampleRate).toBe(22050)
    })
  })

  describe('toMono', () => {
    it('should return mono buffer unchanged', async () => {
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const monoBuffer = audioContext.createBuffer(1, 1600, 16000)

      const result = await toMono(monoBuffer)

      expect(result).toBe(monoBuffer)
      expect(result.numberOfChannels).toBe(1)
    })

    it('should convert stereo to mono by averaging', async () => {
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const stereoBuffer = audioContext.createBuffer(2, 1000, 16000)
      const left = stereoBuffer.getChannelData(0)
      const right = stereoBuffer.getChannelData(1)

      left[0] = 1.0
      right[0] = 0.0

      const mono = await toMono(stereoBuffer)
      const monoData = mono.getChannelData(0)

      expect(monoData[0]).toBeCloseTo(0.5, 5)
    })

    it('should handle multi-channel audio', async () => {
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const multiChannelBuffer = audioContext.createBuffer(4, 1000, 16000)

      for (let ch = 0; ch < 4; ch++) {
        const data = multiChannelBuffer.getChannelData(ch)
        for (let i = 0; i < 100; i++) {
          data[i] = ch * 0.25
        }
      }

      const mono = await toMono(multiChannelBuffer)
      const monoData = mono.getChannelData(0)

      // Average of [0, 0.25, 0.5, 0.75] = 0.375
      expect(monoData[0]).toBeCloseTo(0.375, 5)
    })
  })

  describe('resample', () => {
    it('should return buffer unchanged if sample rate matches', async () => {
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const buffer = audioContext.createBuffer(1, 1600, 16000)

      const result = await resample(buffer, 16000)

      expect(result).toBe(buffer)
    })

    it('should downsample from 44.1kHz to 16kHz', async () => {
      const audioContext = new AudioContext({ sampleRate: 44100 })
      const buffer = audioContext.createBuffer(1, 44100, 44100)
      const data = buffer.getChannelData(0)

      // Create sine wave
      for (let i = 0; i < 44100; i++) {
        data[i] = Math.sin(2 * Math.PI * 440 * i / 44100)
      }

      const resampled = await resample(buffer, 16000)

      expect(resampled.sampleRate).toBe(16000)
      expect(resampled.length).toBeCloseTo(16000, 0)
    })

    it('should upsample from 16kHz to 44.1kHz', async () => {
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const buffer = audioContext.createBuffer(1, 16000, 16000)

      const resampled = await resample(buffer, 44100)

      expect(resampled.sampleRate).toBe(44100)
      expect(resampled.length).toBeCloseTo(44100, 0)
    })

    it('should preserve audio quality during resampling', async () => {
      const audioContext = new AudioContext({ sampleRate: 44100 })
      const buffer = audioContext.createBuffer(1, 44100, 44100)
      const data = buffer.getChannelData(0)

      // Create test signal
      const frequency = 1000 // Hz
      for (let i = 0; i < 44100; i++) {
        data[i] = Math.sin(2 * Math.PI * frequency * i / 44100)
      }

      const resampled = await resample(buffer, 16000)
      const resampledData = resampled.getChannelData(0)

      // Check that signal is preserved (at least roughly)
      expect(resampledData.length).toBeGreaterThan(0)

      // Calculate RMS to ensure we have audio
      let sum = 0
      for (let i = 0; i < resampledData.length; i++) {
        sum += resampledData[i] * resampledData[i]
      }
      const rms = Math.sqrt(sum / resampledData.length)

      expect(rms).toBeGreaterThan(0)
    })
  })

  describe('normalizeAmplitude', () => {
    it('should normalize to -1dB by default', () => {
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const buffer = audioContext.createBuffer(1, 1000, 16000)
      const data = buffer.getChannelData(0)

      for (let i = 0; i < 1000; i++) {
        data[i] = 0.5
      }

      const normalized = normalizeAmplitude(buffer)
      const normalizedData = normalized.getChannelData(0)

      let peak = 0
      for (let i = 0; i < normalizedData.length; i++) {
        peak = Math.max(peak, Math.abs(normalizedData[i]))
      }

      expect(peak).toBeCloseTo(0.89, 1)
    })

    it('should normalize to custom target level', () => {
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const buffer = audioContext.createBuffer(1, 1000, 16000)
      const data = buffer.getChannelData(0)

      for (let i = 0; i < 1000; i++) {
        data[i] = 0.5
      }

      const normalized = normalizeAmplitude(buffer, -6) // -6dB
      const normalizedData = normalized.getChannelData(0)

      let peak = 0
      for (let i = 0; i < normalizedData.length; i++) {
        peak = Math.max(peak, Math.abs(normalizedData[i]))
      }

      const targetAmplitude = Math.pow(10, -6 / 20)
      expect(peak).toBeCloseTo(targetAmplitude, 1)
    })

    it('should handle silent audio', () => {
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const buffer = audioContext.createBuffer(1, 1000, 16000)

      const normalized = normalizeAmplitude(buffer)

      expect(normalized).toBe(buffer)
    })

    it('should handle clipped audio', () => {
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const buffer = audioContext.createBuffer(1, 1000, 16000)
      const data = buffer.getChannelData(0)

      for (let i = 0; i < 1000; i++) {
        data[i] = 1.5 // Clipped
      }

      const normalized = normalizeAmplitude(buffer)
      const normalizedData = normalized.getChannelData(0)

      let peak = 0
      for (let i = 0; i < normalizedData.length; i++) {
        peak = Math.max(peak, Math.abs(normalizedData[i]))
      }

      // Should normalize to -1dB
      expect(peak).toBeCloseTo(0.89, 1)
    })
  })

  describe('removeSilenceFromBuffer', () => {
    it('should remove silence from beginning and end', () => {
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const buffer = audioContext.createBuffer(1, 16000, 16000)
      const data = buffer.getChannelData(0)

      // Add silence at beginning
      for (let i = 0; i < 4000; i++) {
        data[i] = 0.001
      }

      // Add speech
      for (let i = 4000; i < 12000; i++) {
        data[i] = 0.5
      }

      // Add silence at end
      for (let i = 12000; i < 16000; i++) {
        data[i] = 0.001
      }

      const result = removeSilenceFromBuffer(buffer, 0.01, 0.5)

      expect(result.length).toBeLessThan(buffer.length)
      expect(result.length).toBeGreaterThan(7000) // Speech portion
    })

    it('should return original if no speech detected', () => {
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const buffer = audioContext.createBuffer(1, 16000, 16000)

      // All silence
      const result = removeSilenceFromBuffer(buffer, 0.01, 0.5)

      expect(result).toBe(buffer)
    })

    it('should preserve multiple speech segments', () => {
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const buffer = audioContext.createBuffer(1, 24000, 16000)
      const data = buffer.getChannelData(0)

      // Silence - Speech - Silence - Speech - Silence
      for (let i = 0; i < 4000; i++) data[i] = 0.001 // Silence
      for (let i = 4000; i < 8000; i++) data[i] = 0.5 // Speech
      for (let i = 8000; i < 12000; i++) data[i] = 0.001 // Silence
      for (let i = 12000; i < 16000; i++) data[i] = 0.5 // Speech
      for (let i = 16000; i < 24000; i++) data[i] = 0.001 // Silence

      const result = removeSilenceFromBuffer(buffer, 0.01, 0.5)

      // Should contain both speech segments
      expect(result.length).toBeLessThan(buffer.length)
      expect(result.length).toBeGreaterThan(7000)
    })
  })

  describe('frameAudio', () => {
    it('should frame audio into chunks', () => {
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const buffer = audioContext.createBuffer(1, 48000, 16000) // 3 seconds

      const frames = frameAudio(buffer, 1) // 1 second frames

      expect(frames.length).toBe(3)
      expect(frames[0].samples.length).toBe(16000)
      expect(frames[0].startTime).toBe(0)
      expect(frames[0].endTime).toBe(1)
    })

    it('should handle partial frames', () => {
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const buffer = audioContext.createBuffer(1, 25000, 16000) // 1.5625 seconds

      const frames = frameAudio(buffer, 1) // 1 second frames

      expect(frames.length).toBe(2)
      expect(frames[1].samples.length).toBeLessThan(16000)
    })
  })

  describe('calculateAudioLevel', () => {
    it('should calculate RMS level', () => {
      const samples = new Float32Array(1000)

      for (let i = 0; i < 1000; i++) {
        samples[i] = 0.5
      }

      const level = calculateAudioLevel(samples)

      expect(level).toBeGreaterThan(0)
      expect(level).toBeLessThanOrEqual(1)
    })

    it('should return 0 for silent audio', () => {
      const samples = new Float32Array(1000)

      const level = calculateAudioLevel(samples)

      expect(level).toBe(0)
    })
  })

  describe('detectSpeechSegments', () => {
    it('should detect speech segments', () => {
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const buffer = audioContext.createBuffer(1, 16000, 16000)
      const data = buffer.getChannelData(0)

      // Create speech segment
      for (let i = 4000; i < 12000; i++) {
        data[i] = 0.5
      }

      const segments = detectSpeechSegments(buffer, 0.01, 0.3)

      expect(segments.length).toBeGreaterThan(0)
      expect(segments[0].start).toBeCloseTo(0.25, 1) // 4000/16000
      expect(segments[0].end).toBeCloseTo(0.75, 1) // 12000/16000
    })

    it('should return empty array for silent audio', () => {
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const buffer = audioContext.createBuffer(1, 16000, 16000)

      const segments = detectSpeechSegments(buffer, 0.01, 0.3)

      expect(segments.length).toBe(0)
    })
  })

  describe('audioBufferToFloat32', () => {
    it('should return mono channel data', () => {
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const buffer = audioContext.createBuffer(1, 1000, 16000)
      const data = buffer.getChannelData(0)

      for (let i = 0; i < 1000; i++) {
        data[i] = i * 0.001
      }

      const result = audioBufferToFloat32(buffer)

      expect(result).toBe(data)
    })

    it('should mix stereo to mono', () => {
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const buffer = audioContext.createBuffer(2, 1000, 16000)
      const left = buffer.getChannelData(0)
      const right = buffer.getChannelData(1)

      left[0] = 1.0
      right[0] = 0.0

      const result = audioBufferToFloat32(buffer)

      expect(result[0]).toBeCloseTo(0.5, 5)
    })
  })

  describe('float32ToAudioBuffer', () => {
    it('should convert Float32Array to AudioBuffer', () => {
      const samples = new Float32Array(1000)

      for (let i = 0; i < 1000; i++) {
        samples[i] = i * 0.001
      }

      const buffer = float32ToAudioBuffer(samples, 16000, 1)

      expect(buffer.numberOfChannels).toBe(1)
      expect(buffer.sampleRate).toBe(16000)
      expect(buffer.length).toBe(1000)
    })

    it('should support multiple channels', () => {
      const samples = new Float32Array(1000)

      const buffer = float32ToAudioBuffer(samples, 16000, 2)

      expect(buffer.numberOfChannels).toBe(2)
      expect(buffer.getChannelData(0)[0]).toBe(samples[0])
      expect(buffer.getChannelData(1)[0]).toBe(samples[0])
    })
  })

  describe('highPassFilter', () => {
    it('should apply high-pass filter', () => {
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const buffer = audioContext.createBuffer(1, 16000, 16000)
      const data = buffer.getChannelData(0)

      // Create low-frequency signal
      for (let i = 0; i < 16000; i++) {
        data[i] = Math.sin(2 * Math.PI * 50 * i / 16000) // 50 Hz
      }

      const filtered = highPassFilter(buffer, 80)
      const filteredData = filtered.getChannelData(0)

      // Filtered signal should be different
      expect(filteredData[0]).not.toBe(data[0])
    })

    it('should preserve audio length', () => {
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const buffer = audioContext.createBuffer(1, 16000, 16000)

      const filtered = highPassFilter(buffer, 80)

      expect(filtered.length).toBe(buffer.length)
      expect(filtered.sampleRate).toBe(buffer.sampleRate)
    })
  })
})
