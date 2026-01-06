/**
 * Language Detection Tests
 *
 * Tests for automatic language detection from audio and text.
 *
 * @module lib/jepa/__tests__/language-detection.test
 */

import { describe, it, expect } from '@jest/globals'
import {
  detectLanguageFromTranscript,
  getLanguageConfidence,
  validateDetectionResult,
  getDetectedLanguageName,
} from '../language-detection'
import type { LanguageDetectionResult } from '../languages'

describe('Language Detection from Text', () => {
  describe('Chinese Detection', () => {
    it('should detect Chinese characters', async () => {
      const text = '你好，我是中国人。我非常喜欢学习中文。'
      const result = await detectLanguageFromTranscript(text)

      expect(result.language).toBe('zh')
      expect(result.confidence).toBeGreaterThan(0.7)
    })

    it('should detect mixed Chinese and English', async () => {
      const text = '你好，我是 a Chinese student. 我喜欢学习。'
      const result = await detectLanguageFromTranscript(text)

      // Should still detect Chinese due to character set
      expect(result.language).toBe('zh')
      expect(result.confidence).toBeGreaterThan(0.5)
    })
  })

  describe('Japanese Detection', () => {
    it('should detect Japanese Hiragana', async () => {
      const text = 'こんにちは、私は日本人です。日本語を勉強しています。'
      const result = await detectLanguageFromTranscript(text)

      expect(result.language).toBe('ja')
      expect(result.confidence).toBeGreaterThan(0.7)
    })

    it('should detect Japanese Katakana', async () => {
      const text = 'コンニチハ、ワタシハニホンジンデス。'
      const result = await detectLanguageFromTranscript(text)

      expect(result.language).toBe('ja')
      expect(result.confidence).toBeGreaterThan(0.7)
    })

    it('should detect mixed Japanese scripts', async () => {
      const text = '私は日本で学生です。毎日大学に行きます。'
      const result = await detectLanguageFromTranscript(text)

      expect(result.language).toBe('ja')
      expect(result.confidence).toBeGreaterThan(0.7)
    })
  })

  describe('Korean Detection', () => {
    it('should detect Korean Hangul', async () => {
      const text = '안녕하세요, 저는 한국인입니다. 한국어를 배우고 있습니다.'
      const result = await detectLanguageFromTranscript(text)

      expect(result.language).toBe('ko')
      expect(result.confidence).toBeGreaterThan(0.8)
    })
  })

  describe('Arabic Detection', () => {
    it('should detect Arabic text', async () => {
      const text = 'مرحبا، أنا طالب. أحب تعلم اللغة العربية.'
      const result = await detectLanguageFromTranscript(text)

      expect(result.language).toBe('ar')
      expect(result.confidence).toBeGreaterThan(0.7)
    })
  })

  describe('Russian Detection', () => {
    it('should detect Russian Cyrillic', async () => {
      const text = 'Привет, я студент. Я изучаю русский язык.'
      const result = await detectLanguageFromTranscript(text)

      expect(result.language).toBe('ru')
      expect(result.confidence).toBeGreaterThan(0.7)
    })
  })

  describe('English Detection', () => {
    it('should detect English text', async () => {
      const text = 'Hello, I am a student. I love learning English.'
      const result = await detectLanguageFromTranscript(text)

      expect(result.language).toBe('en')
      expect(result.confidence).toBeGreaterThan(0.5)
    })

    it('should detect English with common words', async () => {
      const text = 'The quick brown fox jumps over the lazy dog.'
      const result = await detectLanguageFromTranscript(text)

      expect(result.language).toBe('en')
    })
  })

  describe('Spanish Detection', () => {
    it('should detect Spanish text', async () => {
      const text = 'Hola, soy estudiante. Me encanta aprender español.'
      const result = await detectLanguageFromTranscript(text)

      expect(result.language).toBe('es')
      expect(result.confidence).toBeGreaterThan(0.5)
    })
  })

  describe('French Detection', () => {
    it('should detect French text', async () => {
      const text = 'Bonjour, je suis étudiant. J\'adore apprendre le français.'
      const result = await detectLanguageFromTranscript(text)

      expect(result.language).toBe('fr')
      expect(result.confidence).toBeGreaterThan(0.5)
    })
  })

  describe('German Detection', () => {
    it('should detect German text', async () => {
      const text = 'Hallo, ich bin Student. Ich lerne gerne Deutsch.'
      const result = await detectLanguageFromTranscript(text)

      expect(result.language).toBe('de')
      expect(result.confidence).toBeGreaterThan(0.5)
    })
  })

  describe('Hindi Detection', () => {
    it('should detect Hindi Devanagari', async () => {
      const text = 'नमस्ते, मैं छात्र हूं। मुझे हिंदी सीखना पसंद है।'
      const result = await detectLanguageFromTranscript(text)

      expect(result.language).toBe('hi')
      expect(result.confidence).toBeGreaterThan(0.7)
    })
  })

  describe('Short Text Handling', () => {
    it('should handle very short text', async () => {
      const text = 'Hi'
      const result = await detectLanguageFromTranscript(text)

      // Should return a result with lower confidence
      expect(result).toBeDefined()
      expect(result.confidence).toBeLessThan(0.5)
    })

    it('should handle empty text', async () => {
      const text = ''
      const result = await detectLanguageFromTranscript(text)

      // Should return fallback
      expect(result).toBeDefined()
    })
  })
})

describe('Language Confidence', () => {
  describe('getLanguageConfidence', () => {
    it('should return primary language and confidence', () => {
      const result: LanguageDetectionResult = {
        language: 'en',
        confidence: 0.85,
        alternatives: [
          { code: 'es', confidence: 0.1 },
          { code: 'fr', confidence: 0.05 },
        ],
      }

      const confidence = getLanguageConfidence(result)

      expect(confidence.primary.language).toBe('en')
      expect(confidence.primary.confidence).toBe(0.85)
    })

    it('should return alternatives', () => {
      const result: LanguageDetectionResult = {
        language: 'en',
        confidence: 0.85,
        alternatives: [
          { code: 'es', confidence: 0.1 },
          { code: 'fr', confidence: 0.05 },
        ],
      }

      const confidence = getLanguageConfidence(result)

      expect(confidence.alternatives).toHaveLength(2)
      expect(confidence.alternatives[0].language).toBe('es')
      expect(confidence.alternatives[1].language).toBe('fr')
    })

    it('should indicate reliability for high confidence', () => {
      const result: LanguageDetectionResult = {
        language: 'en',
        confidence: 0.9,
        alternatives: [],
      }

      const confidence = getLanguageConfidence(result)

      expect(confidence.isReliable).toBe(true)
    })

    it('should indicate unreliability for low confidence', () => {
      const result: LanguageDetectionResult = {
        language: 'en',
        confidence: 0.2,
        alternatives: [],
      }

      const confidence = getLanguageConfidence(result)

      expect(confidence.isReliable).toBe(false)
    })
  })
})

describe('Detection Result Validation', () => {
  describe('validateDetectionResult', () => {
    it('should validate correct result', () => {
      const result: LanguageDetectionResult = {
        language: 'en',
        confidence: 0.85,
        alternatives: [
          { code: 'es', confidence: 0.1 },
        ],
      }

      expect(validateDetectionResult(result)).toBe(true)
    })

    it('should reject invalid language code', () => {
      const result: LanguageDetectionResult = {
        language: 'invalid',
        confidence: 0.85,
        alternatives: [],
      }

      expect(validateDetectionResult(result)).toBe(false)
    })

    it('should reject confidence out of range', () => {
      const result1: LanguageDetectionResult = {
        language: 'en',
        confidence: 1.5, // Too high
        alternatives: [],
      }

      const result2: LanguageDetectionResult = {
        language: 'en',
        confidence: -0.1, // Too low
        alternatives: [],
      }

      expect(validateDetectionResult(result1)).toBe(false)
      expect(validateDetectionResult(result2)).toBe(false)
    })

    it('should reject invalid alternative', () => {
      const result: LanguageDetectionResult = {
        language: 'en',
        confidence: 0.85,
        alternatives: [
          { code: 'invalid', confidence: 0.1 },
        ],
      }

      expect(validateDetectionResult(result)).toBe(false)
    })
  })
})

describe('Language Name Formatting', () => {
  describe('getDetectedLanguageName', () => {
    it('should format English result', () => {
      const result: LanguageDetectionResult = {
        language: 'en',
        confidence: 0.85,
        alternatives: [],
      }

      const name = getDetectedLanguageName(result)

      expect(name).toContain('🇺🇸')
      expect(name).toContain('English')
      expect(name).toContain('85%')
    })

    it('should format Spanish result', () => {
      const result: LanguageDetectionResult = {
        language: 'es',
        confidence: 0.72,
        alternatives: [],
      }

      const name = getDetectedLanguageName(result)

      expect(name).toContain('🇪🇸')
      expect(name).toContain('Spanish')
      expect(name).toContain('72%')
    })

    it('should handle unknown language', () => {
      const result: LanguageDetectionResult = {
        language: 'xx',
        confidence: 0.5,
        alternatives: [],
      }

      const name = getDetectedLanguageName(result)

      expect(name).toContain('xx')
    })
  })
})
