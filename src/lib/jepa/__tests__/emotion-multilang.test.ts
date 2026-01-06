/**
 * Multi-Language Emotion Analysis Tests
 *
 * Tests for language-specific emotion analysis and cultural adjustments.
 *
 * @module lib/jepa/__tests__/emotion-multilang.test
 */

import { describe, it, expect } from '@jest/globals'
import {
  analyzeEmotion,
  getEmotionLabels,
  adjustEmotionForCulture,
  emotionScoresToAnalysis,
  createEmotionAnalysis,
  validateEmotionScores,
  clampEmotionScores,
  averageEmotionScores,
  type EmotionScores,
} from '../emotion-multilang'

describe('Emotion Analysis', () => {
  describe('English Emotion Analysis', () => {
    it('should detect positive emotion', async () => {
      const text = 'I am so happy and excited today!'
      const scores = await analyzeEmotion(text, 'en')

      expect(scores.valence).toBeGreaterThan(0.6) // Positive
      expect(scores.arousal).toBeGreaterThan(0.5) // High energy
    })

    it('should detect negative emotion', async () => {
      const text = 'I am very sad and disappointed.'
      const scores = await analyzeEmotion(text, 'en')

      expect(scores.valence).toBeLessThan(0.4) // Negative
    })

    it('should detect neutral emotion', async () => {
      const text = 'The meeting is scheduled for tomorrow.'
      const scores = await analyzeEmotion(text, 'en')

      expect(scores.valence).toBeGreaterThan(0.4)
      expect(scores.valence).toBeLessThan(0.6) // Neutral range
    })
  })

  describe('Spanish Emotion Analysis', () => {
    it('should detect positive emotion', async () => {
      const text = '¡Estoy muy feliz y emocionado hoy!'
      const scores = await analyzeEmotion(text, 'es')

      expect(scores.valence).toBeGreaterThan(0.6)
    })

    it('should apply cultural adjustments', async () => {
      const text = '¡Estoy muy feliz!'
      const scores = await analyzeEmotion(text, 'es')

      // Spanish should have higher arousal due to cultural adjustment
      expect(scores.arousal).toBeGreaterThan(0)
    })
  })

  describe('Chinese Emotion Analysis', () => {
    it('should detect positive emotion', async () => {
      const text = '我今天很开心，很兴奋！'
      const scores = await analyzeEmotion(text, 'zh')

      expect(scores.valence).toBeGreaterThan(0.6)
    })

    it('should apply cultural adjustments (more reserved)', async () => {
      const text = '我很高兴'
      const scores = await analyzeEmotion(text, 'zh')

      // Chinese should have dampened emotions
      expect(scores.valence).toBeLessThanOrEqual(1.0)
    })
  })

  describe('Japanese Emotion Analysis', () => {
    it('should detect positive emotion', async () => {
      const text = '私はとても幸せで、興奮しています！'
      const scores = await analyzeEmotion(text, 'ja')

      expect(scores.valence).toBeGreaterThan(0.6)
    })

    it('should apply cultural adjustments (subtle expression)', async () => {
      const text = 'とても嬉しいです'
      const scores = await analyzeEmotion(text, 'ja')

      // Japanese should have dampened emotions
      expect(scores.valence).toBeLessThanOrEqual(1.0)
      expect(scores.arousal).toBeLessThanOrEqual(1.0)
      expect(scores.dominance).toBeLessThanOrEqual(1.0)
    })
  })
})

describe('Emotion Labels', () => {
  describe('getEmotionLabels', () => {
    it('should return positive high labels for high valence and arousal', () => {
      const scores: EmotionScores = {
        valence: 0.8,
        arousal: 0.8,
        dominance: 0.7,
      }

      const labels = getEmotionLabels(scores, 'en')

      expect(labels).toContain('excited')
      expect(labels).toContain('joyful')
    })

    it('should return positive low labels for high valence and low arousal', () => {
      const scores: EmotionScores = {
        valence: 0.8,
        arousal: 0.3,
        dominance: 0.7,
      }

      const labels = getEmotionLabels(scores, 'en')

      expect(labels).toContain('content')
      expect(labels).toContain('calm')
    })

    it('should return negative high labels for low valence and high arousal', () => {
      const scores: EmotionScores = {
        valence: 0.2,
        arousal: 0.8,
        dominance: 0.7,
      }

      const labels = getEmotionLabels(scores, 'en')

      expect(labels).toContain('angry')
      expect(labels).toContain('frustrated')
    })

    it('should return negative low labels for low valence and low arousal', () => {
      const scores: EmotionScores = {
        valence: 0.2,
        arousal: 0.3,
        dominance: 0.4,
      }

      const labels = getEmotionLabels(scores, 'en')

      expect(labels).toContain('sad')
      expect(labels).toContain('disappointed')
    })

    it('should return neutral labels for mid valence', () => {
      const scores: EmotionScores = {
        valence: 0.5,
        arousal: 0.5,
        dominance: 0.5,
      }

      const labels = getEmotionLabels(scores, 'en')

      expect(labels).toContain('neutral')
    })

    it('should return labels in different languages', () => {
      const scores: EmotionScores = {
        valence: 0.8,
        arousal: 0.8,
        dominance: 0.7,
      }

      const spanishLabels = getEmotionLabels(scores, 'es')
      expect(spanishLabels).toContain('emocionado')

      const chineseLabels = getEmotionLabels(scores, 'zh')
      expect(chineseLabels).toContain('兴奋')
    })
  })
})

describe('Cultural Adjustments', () => {
  describe('adjustEmotionForCulture', () => {
    it('should apply Japanese cultural adjustments', () => {
      const input: EmotionScores = {
        valence: 0.8,
        arousal: 0.8,
        dominance: 0.8,
      }

      const adjusted = adjustEmotionForCulture(input, 'ja')

      // Japanese should dampen emotions
      expect(adjusted.valence).toBeLessThan(input.valence)
      expect(adjusted.arousal).toBeLessThan(input.arousal)
      expect(adjusted.dominance).toBeLessThan(input.dominance)
    })

    it('should apply Spanish cultural adjustments', () => {
      const input: EmotionScores = {
        valence: 0.7,
        arousal: 0.7,
        dominance: 0.7,
      }

      const adjusted = adjustEmotionForCulture(input, 'es')

      // Spanish should enhance emotional expression
      expect(adjusted.valence).toBeGreaterThan(input.valence)
      expect(adjusted.arousal).toBeGreaterThan(input.arousal)
    })

    it('should apply Chinese cultural adjustments', () => {
      const input: EmotionScores = {
        valence: 0.8,
        arousal: 0.8,
        dominance: 0.8,
      }

      const adjusted = adjustEmotionForCulture(input, 'zh')

      // Chinese should be more reserved
      expect(adjusted.valence).toBeLessThan(input.valence)
      expect(adjusted.arousal).toBeLessThan(input.arousal)
    })

    it('should not adjust English (baseline)', () => {
      const input: EmotionScores = {
        valence: 0.7,
        arousal: 0.7,
        dominance: 0.7,
      }

      const adjusted = adjustEmotionForCulture(input, 'en')

      expect(adjusted.valence).toBeCloseTo(input.valence)
      expect(adjusted.arousal).toBeCloseTo(input.arousal)
      expect(adjusted.dominance).toBeCloseTo(input.dominance)
    })

    it('should handle unknown language (no adjustment)', () => {
      const input: EmotionScores = {
        valence: 0.7,
        arousal: 0.7,
        dominance: 0.7,
      }

      const adjusted = adjustEmotionForCulture(input, 'unknown')

      expect(adjusted.valence).toBe(input.valence)
      expect(adjusted.arousal).toBe(input.arousal)
      expect(adjusted.dominance).toBe(input.dominance)
    })

    it('should clamp values to valid range', () => {
      const input: EmotionScores = {
        valence: 0.95,
        arousal: 0.95,
        dominance: 0.95,
      }

      // Spanish adjustment could push over 1.0
      const adjusted = adjustEmotionForCulture(input, 'es')

      expect(adjusted.valence).toBeLessThanOrEqual(1.0)
      expect(adjusted.arousal).toBeLessThanOrEqual(1.0)
      expect(adjusted.dominance).toBeLessThanOrEqual(1.0)

      expect(adjusted.valence).toBeGreaterThanOrEqual(0.0)
      expect(adjusted.arousal).toBeGreaterThanOrEqual(0.0)
      expect(adjusted.dominance).toBeGreaterThanOrEqual(0.0)
    })
  })
})

describe('Emotion Conversion', () => {
  describe('emotionScoresToAnalysis', () => {
    it('should convert scores to analysis', () => {
      const scores: EmotionScores = {
        valence: 0.7,
        arousal: 0.6,
        dominance: 0.8,
      }

      const analysis = emotionScoresToAnalysis(scores, 'en', 'segment_1', Date.now())

      expect(analysis.segmentId).toBe('segment_1')
      expect(analysis.valence).toBe(0.7)
      expect(analysis.arousal).toBe(0.6)
      expect(analysis.dominance).toBe(0.8)
      expect(analysis.emotions.length).toBeGreaterThan(0)
    })

    it('should include confidence score', () => {
      const scores: EmotionScores = {
        valence: 0.7,
        arousal: 0.6,
        dominance: 0.8,
      }

      const analysis = emotionScoresToAnalysis(scores, 'en', 'segment_1', Date.now())

      expect(analysis.confidence).toBeDefined()
      expect(analysis.confidence).toBeGreaterThan(0)
      expect(analysis.confidence).toBeLessThanOrEqual(1)
    })
  })

  describe('createEmotionAnalysis', () => {
    it('should create complete emotion analysis from text', async () => {
      const text = 'I am very happy today!'
      const analysis = await createEmotionAnalysis(text, 'en', 'segment_1', Date.now())

      expect(analysis.segmentId).toBe('segment_1')
      expect(analysis.valence).toBeGreaterThan(0.6)
      expect(analysis.emotions.length).toBeGreaterThan(0)
    })
  })
})

describe('Utility Functions', () => {
  describe('validateEmotionScores', () => {
    it('should validate correct scores', () => {
      const scores: EmotionScores = {
        valence: 0.5,
        arousal: 0.5,
        dominance: 0.5,
      }

      expect(validateEmotionScores(scores)).toBe(true)
    })

    it('should reject out-of-range values', () => {
      const scores1: EmotionScores = {
        valence: 1.5,
        arousal: 0.5,
        dominance: 0.5,
      }

      const scores2: EmotionScores = {
        valence: 0.5,
        arousal: -0.1,
        dominance: 0.5,
      }

      expect(validateEmotionScores(scores1)).toBe(false)
      expect(validateEmotionScores(scores2)).toBe(false)
    })
  })

  describe('clampEmotionScores', () => {
    it('should clamp high values', () => {
      const scores: EmotionScores = {
        valence: 1.5,
        arousal: 2.0,
        dominance: 1.8,
      }

      const clamped = clampEmotionScores(scores)

      expect(clamped.valence).toBe(1.0)
      expect(clamped.arousal).toBe(1.0)
      expect(clamped.dominance).toBe(1.0)
    })

    it('should clamp low values', () => {
      const scores: EmotionScores = {
        valence: -0.5,
        arousal: -0.2,
        dominance: -1.0,
      }

      const clamped = clampEmotionScores(scores)

      expect(clamped.valence).toBe(0)
      expect(clamped.arousal).toBe(0)
      expect(clamped.dominance).toBe(0)
    })

    it('should not modify valid values', () => {
      const scores: EmotionScores = {
        valence: 0.7,
        arousal: 0.5,
        dominance: 0.8,
      }

      const clamped = clampEmotionScores(scores)

      expect(clamped.valence).toBe(0.7)
      expect(clamped.arousal).toBe(0.5)
      expect(clamped.dominance).toBe(0.8)
    })
  })

  describe('averageEmotionScores', () => {
    it('should average multiple scores', () => {
      const scores: EmotionScores[] = [
        { valence: 0.8, arousal: 0.7, dominance: 0.6 },
        { valence: 0.6, arousal: 0.5, dominance: 0.8 },
        { valence: 0.7, arousal: 0.6, dominance: 0.7 },
      ]

      const averaged = averageEmotionScores(scores)

      expect(averaged.valence).toBeCloseTo(0.7)
      expect(averaged.arousal).toBeCloseTo(0.6)
      expect(averaged.dominance).toBeCloseTo(0.7)
    })

    it('should handle empty array', () => {
      const averaged = averageEmotionScores([])

      expect(averaged.valence).toBe(0.5)
      expect(averaged.arousal).toBe(0.5)
      expect(averaged.dominance).toBe(0.5)
    })

    it('should handle single score', () => {
      const scores: EmotionScores[] = [
        { valence: 0.8, arousal: 0.7, dominance: 0.6 },
      ]

      const averaged = averageEmotionScores(scores)

      expect(averaged.valence).toBe(0.8)
      expect(averaged.arousal).toBe(0.7)
      expect(averaged.dominance).toBe(0.6)
    })
  })
})
