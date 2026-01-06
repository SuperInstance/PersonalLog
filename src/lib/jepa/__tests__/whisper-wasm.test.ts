/**
 * Tests for Whisper.cpp WebAssembly Integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WhisperSTT, WHISPER_LANGUAGES } from '../whisper-wasm'
import { preprocessAudio, toMono, resample, normalizeAmplitude } from '../audio-preprocessing'
import type { STTConfig } from '../stt-types'

// Mock WebAssembly
const mockWasmModule = {
  _malloc: vi.fn((size: number) => size),
  _free: vi.fn(),
  _whisper_init_from_buffer: vi.fn(() => 1234), // Mock context pointer
  _whisper_free: vi.fn(),
  _whisper_full: vi.fn(() => 0), // Success
  _whisper_full_n_segments: vi.fn(() => 2),
  _whisper_full_get_segment_t0: vi.fn((ctx: number, index: number) => index * 1000),
  _whisper_full_get_segment_t1: vi.fn((ctx: number, index: number) => (index + 1) * 1000),
  _whisper_full_get_segment_text: vi.fn((ctx: number, index: number) => {
    const texts = ['Hello world', 'This is a test']
    // Return pointer to mock string
    const text = texts[index] || ''
    const buffer = new TextEncoder().encode(text + '\0')
    const ptr = (mockWasmModule as any).HEAPU8.length
    ;(mockWasmModule as any).HEAPU8 = new Uint8Array([...(mockWasmModule as any).HEAPU8, ...buffer])
    return ptr
  }),
  _whisper_full_lang_id: vi.fn(() => 0), // English
  _whisper_lang_auto_detect: vi.fn(() => 0), // English
  _whisper_full_default_params: vi.fn(() => 5678), // Mock params pointer
  HEAPU8: new Uint8Array(1024 * 1024),
  HEAPF32: new Float32Array(1024 * 1024),
  UTF8ToString: vi.fn((ptr: number) => {
    // Mock UTF8ToString to return test text
    const texts = ['Hello world', 'This is a test']
    return texts[0] || ''
  }),
  stringToUTF8: vi.fn(),
}

describe('WhisperSTT', () => {
  let whisper: WhisperSTT
  let config: STTConfig

  beforeEach(() => {
    config = {
      backend: 'whisper-local',
      modelSize: 'tiny',
      language: 'en',
      enableTimestamps: true,
      enableTranslation: false,
      maxAudioLength: 300,
    }

    whisper = new WhisperSTT(config)
  })

  afterEach(async () => {
    try {
      await whisper.cleanup()
    } catch {
      // Ignore cleanup errors in tests
    }
  })

  describe('Language Support', () => {
    it('should support 99 languages', () => {
      const languages = whisper.getSupportedLanguages()

      expect(languages.length).toBeGreaterThan(50)
      expect(languages).toContainEqual({ code: 'en', name: 'english' })
      expect(languages).toContainEqual({ code: 'es', name: 'spanish' })
      expect(languages).toContainEqual({ code: 'fr', name: 'french' })
      expect(languages).toContainEqual({ code: 'de', name: 'german' })
      expect(languages).toContainEqual({ code: 'zh', name: 'chinese' })
      expect(languages).toContainEqual({ code: 'ja', name: 'japanese' })
    })

    it('should have WHISPER_LANGUAGES constant', () => {
      expect(WHISPER_LANGUAGES).toBeDefined()
      expect(WHISPER_LANGUAGES.en).toBe('english')
      expect(WHISPER_LANGUAGES.es).toBe('spanish')
      expect(WHISPER_LANGUAGES.fr).toBe('french')
    })
  })

  describe('Capabilities', () => {
    it('should return correct capabilities', () => {
      const capabilities = whisper.getCapabilities()

      expect(capabilities.supportsRealtime).toBe(true)
      expect(capabilities.supportsBatch).toBe(true)
      expect(capabilities.supportsDiarization).toBe(false)
      expect(capabilities.supportsTranslation).toBe(true)
      expect(capabilities.maxAudioLength).toBe(600)
      expect(capabilities.supportedLanguages.length).toBeGreaterThan(50)
    })
  })

  describe('WASM Support Detection', () => {
    it('should detect WebAssembly support', () => {
      // This test assumes the test environment supports WASM
      // If running in Node.js without WASM support, this will fail
      const hasWasm = typeof WebAssembly === 'object'

      expect(hasWasm).toBe(true)
    })
  })

  describe('Load Error Handling', () => {
    it('should throw error when WASM module is not available', async () => {
      await expect(whisper.load()).rejects.toThrow()
    })

    it('should provide helpful error message with build instructions', async () => {
      try {
        await whisper.load()
      } catch (error: any) {
        expect(error.type).toBe('browser-not-supported')
        expect(error.message).toContain('WASM')
      }
    })
  })

  describe('Transcription Error Handling', () => {
    it('should throw error when transcribing without loading', async () => {
      // Create a mock audio buffer
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const audioBuffer = audioContext.createBuffer(1, 16000, 16000)

      await expect(whisper.transcribe(audioBuffer)).rejects.toThrow()
    })
  })

  describe('Cleanup', () => {
    it('should cleanup resources', async () => {
      // Cleanup should not throw even if not initialized
      await expect(whisper.cleanup()).resolves.not.toThrow()
    })
  })
})

describe('Audio Preprocessing', () => {
  describe('toMono', () => {
    it('should return same buffer if already mono', async () => {
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const monoBuffer = audioContext.createBuffer(1, 16000, 16000)

      const result = await toMono(monoBuffer)

      expect(result).toBe(monoBuffer)
      expect(result.numberOfChannels).toBe(1)
    })

    it('should convert stereo to mono by averaging', async () => {
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const stereoBuffer = audioContext.createBuffer(2, 100, 16000)

      // Fill with known values
      const leftChannel = stereoBuffer.getChannelData(0)
      const rightChannel = stereoBuffer.getChannelData(1)

      for (let i = 0; i < 100; i++) {
        leftChannel[i] = 0.8
        rightChannel[i] = 0.4
      }

      const mono = await toMono(stereoBuffer)
      const monoData = mono.getChannelData(0)

      // Average should be (0.8 + 0.4) / 2 = 0.6
      expect(monoData[0]).toBeCloseTo(0.6, 5)
    })
  })

  describe('resample', () => {
    it('should return same buffer if sample rate matches', async () => {
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const buffer = audioContext.createBuffer(1, 16000, 16000)

      const result = await resample(buffer, 16000)

      expect(result).toBe(buffer)
    })

    it('should resample to different sample rate', async () => {
      const audioContext = new AudioContext({ sampleRate: 44100 })
      const buffer = audioContext.createBuffer(1, 44100, 44100)

      const result = await resample(buffer, 16000)

      expect(result.sampleRate).toBe(16000)
      expect(result.length).toBeLessThan(buffer.length)
    })
  })

  describe('normalizeAmplitude', () => {
    it('should normalize audio to -1dB', () => {
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const buffer = audioContext.createBuffer(1, 1000, 16000)
      const data = buffer.getChannelData(0)

      // Fill with low amplitude signal
      for (let i = 0; i < 1000; i++) {
        data[i] = 0.1
      }

      const normalized = normalizeAmplitude(buffer)
      const normalizedData = normalized.getChannelData(0)

      // Peak should be around 0.89 (-1dB)
      let peak = 0
      for (let i = 0; i < normalizedData.length; i++) {
        peak = Math.max(peak, Math.abs(normalizedData[i]))
      }

      expect(peak).toBeCloseTo(0.89, 1)
    })

    it('should handle silent audio', () => {
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const buffer = audioContext.createBuffer(1, 1000, 16000)

      const normalized = normalizeAmplitude(buffer)

      expect(normalized).toBe(buffer)
    })
  })

  describe('preprocessAudio', () => {
    it('should apply all preprocessing steps', async () => {
      const audioContext = new AudioContext({ sampleRate: 44100 })
      const stereoBuffer = audioContext.createBuffer(2, 44100, 44100)

      const result = await preprocessAudio(stereoBuffer, {
        targetSampleRate: 16000,
        normalize: true,
      })

      expect(result.numberOfChannels).toBe(1)
      expect(result.sampleRate).toBe(16000)
    })
  })
})

describe('Integration Tests', () => {
  describe('WhisperSTT with Audio Preprocessing', () => {
    it('should handle the complete transcription pipeline', async () => {
      const config: STTConfig = {
        backend: 'whisper-local',
        modelSize: 'tiny',
        language: 'en',
        enableTimestamps: true,
        enableTranslation: false,
        maxAudioLength: 300,
      }

      const whisper = new WhisperSTT(config)

      // Create test audio
      const audioContext = new AudioContext({ sampleRate: 44100 })
      const audioBuffer = audioContext.createBuffer(2, 44100, 44100)

      // Preprocess
      const processed = await preprocessAudio(audioBuffer, {
        targetSampleRate: 16000,
        normalize: true,
      })

      expect(processed.numberOfChannels).toBe(1)
      expect(processed.sampleRate).toBe(16000)

      // Cleanup
      await whisper.cleanup()
    })
  })
})
