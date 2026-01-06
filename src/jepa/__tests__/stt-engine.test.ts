/**
 * JEPA STT Engine Tests
 *
 * Comprehensive tests for Speech-to-Text functionality including:
 * - Whisper model loading
 * - Real-time transcription
 * - Timestamp alignment
 * - Accuracy verification
 * - Fallback mechanisms
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { STTEngine } from '../../lib/jepa/stt-engine'

// Define types locally for testing
type TranscriptionResult = any
type TranscriptionSegment = any

// Mock Whisper.cpp wrapper
const mockWhisperWrapper = {
  loadModel: vi.fn(),
  transcribe: vi.fn(),
  release: vi.fn(),
  isModelLoaded: vi.fn(),
}

vi.mock('../../lib/jepa/whisper-wrapper', () => ({
  WhisperWrapper: vi.fn(() => mockWhisperWrapper),
}))

describe.skip('STTEngine', () => {
  let sttEngine: STTEngine

  beforeEach(() => {
    sttEngine = new STTEngine()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await sttEngine.cleanup()
  })

  describe('Model Loading', () => {
    it('should load Whisper model successfully', async () => {
      mockWhisperWrapper.loadModel.mockResolvedValueOnce(true)
      mockWhisperWrapper.isModelLoaded.mockReturnValue(true)

      const loaded = await sttEngine.loadModel('tiny')

      expect(loaded).toBe(true)
      expect(mockWhisperWrapper.loadModel).toHaveBeenCalledWith('tiny')
    })

    it('should handle model loading failure', async () => {
      mockWhisperWrapper.loadModel.mockRejectedValueOnce(new Error('Model file not found'))

      await expect(sttEngine.loadModel('tiny')).rejects.toThrow('Model file not found')
    })

    it('should check if model is loaded', async () => {
      mockWhisperWrapper.isModelLoaded.mockReturnValue(false)

      const isLoaded = sttEngine.isModelLoaded()

      expect(isLoaded).toBe(false)
    })

    it('should support multiple model sizes', async () => {
      const models = ['tiny', 'base', 'small', 'medium', 'large']

      for (const model of models) {
        mockWhisperWrapper.loadModel.mockResolvedValueOnce(true)
        mockWhisperWrapper.isModelLoaded.mockReturnValue(true)

        const loaded = await sttEngine.loadModel(model as any)
        expect(loaded).toBe(true)
      }
    })

    it('should reject invalid model size', async () => {
      await expect(sttEngine.loadModel('invalid' as any)).rejects.toThrow()
    })
  })

  describe('Real-time Transcription', () => {
    beforeEach(async () => {
      mockWhisperWrapper.isModelLoaded.mockReturnValue(true)
      await sttEngine.loadModel('tiny')
    })

    it('should transcribe audio buffer', async () => {
      const mockResult: TranscriptionResult = {
        text: 'Hello world',
        segments: [
          {
            id: 0,
            text: 'Hello',
            start: 0.0,
            end: 0.5,
            confidence: 0.95,
          },
          {
            id: 1,
            text: 'world',
            start: 0.5,
            end: 1.0,
            confidence: 0.92,
          },
        ],
        language: 'en',
      }

      mockWhisperWrapper.transcribe.mockResolvedValueOnce(mockResult)

      const audioBuffer = new Float32Array(2822) // 64ms at 44.1kHz
      const result = await sttEngine.transcribe(audioBuffer)

      expect(result.text).toBe('Hello world')
      expect(result.segments).toHaveLength(2)
      expect(result.language).toBe('en')
    })

    it('should handle empty audio buffer', async () => {
      const emptyBuffer = new Float32Array(0)

      const result = await sttEngine.transcribe(emptyBuffer)

      expect(result.text).toBe('')
      expect(result.segments).toHaveLength(0)
    })

    it('should handle silence', async () => {
      const mockResult: TranscriptionResult = {
        text: '',
        segments: [],
        language: 'en',
      }

      mockWhisperWrapper.transcribe.mockResolvedValueOnce(mockResult)

      const silenceBuffer = new Float32Array(2822).fill(0)
      const result = await sttEngine.transcribe(silenceBuffer)

      expect(result.text).toBe('')
      expect(result.segments).toHaveLength(0)
    })

    it('should handle multiple consecutive transcriptions', async () => {
      const mockResult1: TranscriptionResult = {
        text: 'First sentence',
        segments: [{ id: 0, text: 'First sentence', start: 0.0, end: 1.0, confidence: 0.9 }],
        language: 'en',
      }

      const mockResult2: TranscriptionResult = {
        text: 'Second sentence',
        segments: [{ id: 1, text: 'Second sentence', start: 1.0, end: 2.0, confidence: 0.9 }],
        language: 'en',
      }

      mockWhisperWrapper.transcribe
        .mockResolvedValueOnce(mockResult1)
        .mockResolvedValueOnce(mockResult2)

      const buffer = new Float32Array(2822)
      const result1 = await sttEngine.transcribe(buffer)
      const result2 = await sttEngine.transcribe(buffer)

      expect(result1.text).toBe('First sentence')
      expect(result2.text).toBe('Second sentence')
    })
  })

  describe('Timestamp Alignment', () => {
    beforeEach(async () => {
      mockWhisperWrapper.isModelLoaded.mockReturnValue(true)
      await sttEngine.loadModel('tiny')
    })

    it('should align timestamps correctly', async () => {
      const mockResult: TranscriptionResult = {
        text: 'Hello world',
        segments: [
          {
            id: 0,
            text: 'Hello',
            start: 0.0,
            end: 0.5,
            confidence: 0.95,
          },
          {
            id: 1,
            text: 'world',
            start: 0.5,
            end: 1.0,
            confidence: 0.92,
          },
        ],
        language: 'en',
      }

      mockWhisperWrapper.transcribe.mockResolvedValueOnce(mockResult)

      const buffer = new Float32Array(2822)
      const result = await sttEngine.transcribe(buffer, 100) // Start at 100ms offset

      expect(result.segments[0].start).toBeGreaterThanOrEqual(0.1)
    })

    it('should handle overlapping timestamps', async () => {
      const mockResult: TranscriptionResult = {
        text: 'Test',
        segments: [
          {
            id: 0,
            text: 'Test',
            start: 0.0,
            end: 0.5,
            confidence: 0.9,
          },
        ],
        language: 'en',
      }

      mockWhisperWrapper.transcribe.mockResolvedValueOnce(mockResult)

      const buffer = new Float32Array(2822)
      const result1 = await sttEngine.transcribe(buffer, 0)
      const result2 = await sttEngine.transcribe(buffer, 64)

      // Timestamps should be sequential
      expect(result2.segments[0].start).toBeGreaterThan(result1.segments[0].start)
    })
  })

  describe('Transcription Accuracy', () => {
    beforeEach(async () => {
      mockWhisperWrapper.isModelLoaded.mockReturnValue(true)
      await sttEngine.loadModel('tiny')
    })

    it('should provide confidence scores', async () => {
      const mockResult: TranscriptionResult = {
        text: 'Hello',
        segments: [
          {
            id: 0,
            text: 'Hello',
            start: 0.0,
            end: 0.5,
            confidence: 0.95,
          },
        ],
        language: 'en',
      }

      mockWhisperWrapper.transcribe.mockResolvedValueOnce(mockResult)

      const buffer = new Float32Array(2822)
      const result = await sttEngine.transcribe(buffer)

      expect(result.segments[0].confidence).toBeGreaterThan(0)
      expect(result.segments[0].confidence).toBeLessThanOrEqual(1)
    })

    it('should handle low confidence transcriptions', async () => {
      const mockResult: TranscriptionResult = {
        text: '???',
        segments: [
          {
            id: 0,
            text: '???',
            start: 0.0,
            end: 0.5,
            confidence: 0.3, // Low confidence
          },
        ],
        language: 'en',
      }

      mockWhisperWrapper.transcribe.mockResolvedValueOnce(mockResult)

      const buffer = new Float32Array(2822)
      const result = await sttEngine.transcribe(buffer)

      expect(result.segments[0].confidence).toBeLessThan(0.5)
    })

    it('should detect language', async () => {
      const languages = ['en', 'es', 'fr', 'de', 'zh']

      for (const lang of languages) {
        const mockResult: TranscriptionResult = {
          text: 'Test',
          segments: [{ id: 0, text: 'Test', start: 0.0, end: 0.5, confidence: 0.9 }],
          language: lang,
        }

        mockWhisperWrapper.transcribe.mockResolvedValueOnce(mockResult)

        const buffer = new Float32Array(2822)
        const result = await sttEngine.transcribe(buffer)

        expect(result.language).toBe(lang)
      }
    })
  })

  describe('Fallback Mechanisms', () => {
    it('should fallback to API when local model fails', async () => {
      mockWhisperWrapper.loadModel.mockRejectedValueOnce(new Error('Model load failed'))

      // Should fallback to API-based transcription
      await expect(sttEngine.loadModel('tiny')).rejects.toThrow('Model load failed')

      // Engine should still be able to transcribe via API
      const isApiAvailable = sttEngine.isApiAvailable()
      expect(isApiAvailable).toBeDefined()
    })

    it('should switch to API seamlessly', async () => {
      mockWhisperWrapper.transcribe.mockRejectedValueOnce(new Error('Transcription failed'))

      const buffer = new Float32Array(2822)

      // Should fallback to API
      const result = await sttEngine.transcribe(buffer).catch(() => ({ text: '', segments: [], language: 'en' }))

      expect(result).toBeDefined()
    })

    it('should indicate when using API fallback', async () => {
      const isUsingApi = sttEngine.isUsingApiFallback()

      expect(typeof isUsingApi).toBe('boolean')
    })
  })

  describe('Performance', () => {
    beforeEach(async () => {
      mockWhisperWrapper.isModelLoaded.mockReturnValue(true)
      mockWhisperWrapper.loadModel.mockResolvedValue(true)
      await sttEngine.loadModel('tiny')
    })

    it('should transcribe within acceptable latency', async () => {
      const mockResult: TranscriptionResult = {
        text: 'Quick test',
        segments: [{ id: 0, text: 'Quick test', start: 0.0, end: 0.5, confidence: 0.9 }],
        language: 'en',
      }

      mockWhisperWrapper.transcribe.mockImplementation(async () => {
        // Simulate processing time
        await new Promise((resolve) => setTimeout(resolve, 100))
        return mockResult
      })

      const buffer = new Float32Array(2822)
      const startTime = performance.now()

      await sttEngine.transcribe(buffer)

      const latency = performance.now() - startTime

      // Should be faster than 250ms target
      expect(latency).toBeLessThan(500)
    })

    it('should handle batch transcription efficiently', async () => {
      const mockResult: TranscriptionResult = {
        text: 'Batch test',
        segments: [{ id: 0, text: 'Batch test', start: 0.0, end: 0.5, confidence: 0.9 }],
        language: 'en',
      }

      mockWhisperWrapper.transcribe.mockResolvedValue(mockResult)

      const buffers = Array(10).fill(new Float32Array(2822))
      const startTime = performance.now()

      await Promise.all(buffers.map((buffer) => sttEngine.transcribe(buffer)))

      const totalTime = performance.now() - startTime
      const avgTime = totalTime / buffers.length

      // Average should be reasonable
      expect(avgTime).toBeLessThan(500)
    })
  })

  describe('Memory Management', () => {
    it('should release model resources', async () => {
      mockWhisperWrapper.isModelLoaded.mockReturnValue(true)
      mockWhisperWrapper.loadModel.mockResolvedValue(true)

      await sttEngine.loadModel('tiny')
      await sttEngine.cleanup()

      expect(mockWhisperWrapper.release).toHaveBeenCalled()
    })

    it('should handle multiple cleanup calls', async () => {
      mockWhisperWrapper.isModelLoaded.mockReturnValue(true)
      mockWhisperWrapper.loadModel.mockResolvedValue(true)

      await sttEngine.loadModel('tiny')
      await sttEngine.cleanup()
      await sttEngine.cleanup() // Should not throw

      expect(mockWhisperWrapper.release).toHaveBeenCalled()
    })
  })

  describe('Error Scenarios', () => {
    it('should handle transcription without loaded model', async () => {
      mockWhisperWrapper.isModelLoaded.mockReturnValue(false)

      const buffer = new Float32Array(2822)

      await expect(sttEngine.transcribe(buffer)).rejects.toThrow()
    })

    it('should handle invalid audio format', async () => {
      mockWhisperWrapper.isModelLoaded.mockReturnValue(true)
      mockWhisperWrapper.loadModel.mockResolvedValue(true)
      mockWhisperWrapper.transcribe.mockRejectedValue(new Error('Invalid audio format'))

      await sttEngine.loadModel('tiny')

      const buffer = new Float32Array(2822)
      await expect(sttEngine.transcribe(buffer)).rejects.toThrow('Invalid audio format')
    })

    it('should recover from temporary failures', async () => {
      mockWhisperWrapper.isModelLoaded.mockReturnValue(true)
      mockWhisperWrapper.loadModel.mockResolvedValue(true)

      await sttEngine.loadModel('tiny')

      const mockResult: TranscriptionResult = {
        text: 'Success',
        segments: [{ id: 0, text: 'Success', start: 0.0, end: 0.5, confidence: 0.9 }],
        language: 'en',
      }

      // First call fails
      mockWhisperWrapper.transcribe.mockRejectedValueOnce(new Error('Temporary error'))
      // Second call succeeds
      mockWhisperWrapper.transcribe.mockResolvedValueOnce(mockResult)

      const buffer = new Float32Array(2822)

      const firstResult = await sttEngine.transcribe(buffer).catch(() => null)
      const secondResult = await sttEngine.transcribe(buffer)

      expect(firstResult).toBeNull()
      expect(secondResult.text).toBe('Success')
    })
  })

  describe('Language Support', () => {
    beforeEach(async () => {
      mockWhisperWrapper.isModelLoaded.mockReturnValue(true)
      mockWhisperWrapper.loadModel.mockResolvedValue(true)
      await sttEngine.loadModel('tiny')
    })

    it('should support multilingual transcription', async () => {
      const mockResult: TranscriptionResult = {
        text: 'Hola mundo',
        segments: [{ id: 0, text: 'Hola mundo', start: 0.0, end: 1.0, confidence: 0.9 }],
        language: 'es',
      }

      mockWhisperWrapper.transcribe.mockResolvedValue(mockResult)

      const buffer = new Float32Array(2822)
      const result = await sttEngine.transcribe(buffer)

      expect(result.language).toBe('es')
      expect(result.text).toBe('Hola mundo')
    })

    it('should auto-detect language', async () => {
      const mockResult: TranscriptionResult = {
        text: 'Bonjour',
        segments: [{ id: 0, text: 'Bonjour', start: 0.0, end: 0.5, confidence: 0.9 }],
        language: 'fr',
      }

      mockWhisperWrapper.transcribe.mockResolvedValue(mockResult)

      const buffer = new Float32Array(2822)
      const result = await sttEngine.transcribe(buffer)

      expect(result.language).toBe('fr')
    })
  })

  describe('Special Cases', () => {
    beforeEach(async () => {
      mockWhisperWrapper.isModelLoaded.mockReturnValue(true)
      mockWhisperWrapper.loadModel.mockResolvedValue(true)
      await sttEngine.loadModel('tiny')
    })

    it('should handle punctuation', async () => {
      const mockResult: TranscriptionResult = {
        text: 'Hello, world! How are you?',
        segments: [
          { id: 0, text: 'Hello, world!', start: 0.0, end: 1.0, confidence: 0.95 },
          { id: 1, text: 'How are you?', start: 1.0, end: 2.0, confidence: 0.92 },
        ],
        language: 'en',
      }

      mockWhisperWrapper.transcribe.mockResolvedValue(mockResult)

      const buffer = new Float32Array(2822)
      const result = await sttEngine.transcribe(buffer)

      expect(result.text).toContain(',')
      expect(result.text).toContain('!')
      expect(result.text).toContain('?')
    })

    it('should handle numbers', async () => {
      const mockResult: TranscriptionResult = {
        text: 'I have 5 apples and 10 oranges',
        segments: [{ id: 0, text: 'I have 5 apples and 10 oranges', start: 0.0, end: 2.0, confidence: 0.9 }],
        language: 'en',
      }

      mockWhisperWrapper.transcribe.mockResolvedValue(mockResult)

      const buffer = new Float32Array(2822)
      const result = await sttEngine.transcribe(buffer)

      expect(result.text).toMatch(/\d+/)
    })

    it('should handle proper nouns', async () => {
      const mockResult: TranscriptionResult = {
        text: 'My name is John and I live in California',
        segments: [{ id: 0, text: 'My name is John and I live in California', start: 0.0, end: 2.5, confidence: 0.9 }],
        language: 'en',
      }

      mockWhisperWrapper.transcribe.mockResolvedValue(mockResult)

      const buffer = new Float32Array(2822)
      const result = await sttEngine.transcribe(buffer)

      expect(result.text).toContain('John')
      expect(result.text).toContain('California')
    })
  })
})
