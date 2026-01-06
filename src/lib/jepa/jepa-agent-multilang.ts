/**
 * JEPA Multi-Language Agent Handler
 *
 * Enhanced JEPA agent with comprehensive multi-language support.
 * Detects language, analyzes emotion with cultural adjustments, and manages
 * transcript segments across 12+ languages.
 *
 * @module lib/jepa/jepa-agent-multilang
 */

import type { EmotionAnalysisLocal } from './emotion-multilang'
import type { AudioWindow, LanguageDetectionResult } from './language-detection'
import { detectLanguage, detectLanguageFromTranscript } from './language-detection'
import { createEmotionAnalysis, type EmotionScores } from './emotion-multilang'
import { getLanguage, SUPPORTED_LANGUAGES, type LanguagePreferences, DEFAULT_LANGUAGE_PREFERENCES } from './languages'

// ============================================================================
// MULTI-LANGUAGE AGENT STATE
// ============================================================================

export interface MultiLanguageJEPAAgentState {
  /** Current detected language */
  currentLanguage: string
  /** Language detection results per segment */
  languageDetections: Map<string, LanguageDetectionResult>
  /** User language preferences */
  languagePreferences: LanguagePreferences
  /** Whether auto-detection is enabled */
  autoDetectEnabled: boolean
}

export interface MultiLanguageTranscriptSegment {
  id: string
  timestamp: number
  text: string
  speaker: 'user' | 'assistant' | 'unknown'
  confidence: number
  /** Detected language code */
  language: string
  /** Language detection result */
  languageDetection: LanguageDetectionResult
  /** Emotion analysis with cultural adjustments */
  emotion?: EmotionAnalysisLocal
}

// ============================================================================
// MULTI-LANGUAGE JEPA AGENT HANDLER
// ============================================================================

export class MultiLanguageJEPAAgentHandler {
  private state: MultiLanguageJEPAAgentState
  private segmentLanguages: Map<string, string> = new Map()
  private segmentEmotions: Map<string, EmotionAnalysisLocal> = new Map()

  constructor(preferences: Partial<LanguagePreferences> = {}) {
    this.state = {
      currentLanguage: 'en',
      languageDetections: new Map(),
      languagePreferences: {
        ...DEFAULT_LANGUAGE_PREFERENCES,
        ...preferences,
      },
      autoDetectEnabled: preferences.autoDetect ?? true,
    }
  }

  // ==========================================================================
  // LANGUAGE DETECTION
  // ==========================================================================

  /**
   * Detect language from audio buffer
   */
  async detectLanguageFromAudio(audioBuffer: AudioWindow): Promise<LanguageDetectionResult> {
    if (!this.state.autoDetectEnabled && this.state.languagePreferences.preferredLanguage) {
      // Use user's preferred language
      return {
        language: this.state.languagePreferences.preferredLanguage,
        confidence: 1.0,
        alternatives: [],
      }
    }

    try {
      const detection = await detectLanguage(audioBuffer)

      // Update current language
      this.state.currentLanguage = detection.language

      return detection
    } catch (error) {
      console.error('Language detection failed:', error)

      // Fallback to user's preference
      return {
        language: this.state.languagePreferences.fallbackLanguage,
        confidence: 0.3,
        alternatives: [],
      }
    }
  }

  /**
   * Detect language from transcript text
   */
  async detectLanguageFromText(text: string, segmentId: string): Promise<LanguageDetectionResult> {
    if (!this.state.autoDetectEnabled && this.state.languagePreferences.preferredLanguage) {
      return {
        language: this.state.languagePreferences.preferredLanguage,
        confidence: 1.0,
        alternatives: [],
      }
    }

    try {
      const detection = await detectLanguageFromTranscript(text)

      // Store detection result
      this.state.languageDetections.set(segmentId, detection)
      this.segmentLanguages.set(segmentId, detection.language)

      return detection
    } catch (error) {
      console.error('Text-based language detection failed:', error)

      // Fallback
      const fallback = {
        language: this.state.languagePreferences.fallbackLanguage,
        confidence: 0.3,
        alternatives: [],
      }

      this.state.languageDetections.set(segmentId, fallback)
      this.segmentLanguages.set(segmentId, fallback.language)

      return fallback
    }
  }

  // ==========================================================================
  // EMOTION ANALYSIS WITH LANGUAGE
  // ==========================================================================

  /**
   * Process transcript segment with language detection and emotion analysis
   */
  async processSegment(
    segmentId: string,
    text: string,
    timestamp: number
  ): Promise<{
    language: string
    languageDetection: LanguageDetectionResult
    emotion: EmotionAnalysisLocal
  }> {
    // Detect language from text
    const languageDetection = await this.detectLanguageFromText(text, segmentId)
    const language = languageDetection.language

    // Analyze emotion with language-specific model
    const emotion = await this.analyzeEmotionWithLanguage(text, language, segmentId, timestamp)

    // Store results
    this.state.languageDetections.set(segmentId, languageDetection)
    this.segmentEmotions.set(segmentId, emotion)
    this.segmentLanguages.set(segmentId, language)

    return {
      language,
      languageDetection,
      emotion,
    }
  }

  /**
   * Analyze emotion with language-specific model and cultural adjustments
   */
  async analyzeEmotionWithLanguage(
    text: string,
    language: string,
    segmentId: string,
    timestamp: number
  ): Promise<EmotionAnalysisLocal> {
    try {
      const emotion = await createEmotionAnalysis(text, language, segmentId, timestamp)

      // Store emotion
      this.segmentEmotions.set(segmentId, emotion)

      return emotion
    } catch (error) {
      console.error('Emotion analysis failed:', error)

      // Return neutral emotion
      return {
        segmentId,
        timestamp,
        valence: 0.5,
        arousal: 0.5,
        dominance: 0.5,
        confidence: 0.3,
        emotions: ['neutral'],
      }
    }
  }

  /**
   * Get emotion analysis for a segment
   */
  getSegmentEmotion(segmentId: string): EmotionAnalysisLocal | undefined {
    return this.segmentEmotions.get(segmentId)
  }

  /**
   * Get all emotion analyses
   */
  getAllEmotions(): EmotionAnalysisLocal[] {
    return Array.from(this.segmentEmotions.values())
  }

  // ==========================================================================
  // LANGUAGE MANAGEMENT
  // ==========================================================================

  /**
   * Set language preference (manual override)
   */
  setLanguagePreference(languageCode: string): void {
    const language = getLanguage(languageCode)

    if (!language) {
      throw new Error(`Invalid language code: ${languageCode}`)
    }

    this.state.languagePreferences.preferredLanguage = languageCode
    this.state.autoDetectEnabled = false
    this.state.currentLanguage = languageCode
  }

  /**
   * Enable automatic language detection
   */
  enableAutoDetect(): void {
    this.state.autoDetectEnabled = true
    this.state.languagePreferences.preferredLanguage = undefined
  }

  /**
   * Disable automatic language detection
   */
  disableAutoDetect(): void {
    this.state.autoDetectEnabled = false
  }

  /**
   * Override language for a specific segment
   */
  overrideSegmentLanguage(segmentId: string, languageCode: string): void {
    const language = getLanguage(languageCode)

    if (!language) {
      throw new Error(`Invalid language code: ${languageCode}`)
    }

    // Update segment language
    this.segmentLanguages.set(segmentId, languageCode)

    // Update language detection
    const detection: LanguageDetectionResult = {
      language: languageCode,
      confidence: 1.0, // Manual override = 100% confidence
      alternatives: [],
    }

    this.state.languageDetections.set(segmentId, detection)

    // Re-analyze emotion with new language
    const existingEmotion = this.segmentEmotions.get(segmentId)
    if (existingEmotion) {
      // Re-analyze with new language (text would need to be stored separately)
      // For now, just update the language tag
    }
  }

  /**
   * Get language for a segment
   */
  getSegmentLanguage(segmentId: string): string | undefined {
    return this.segmentLanguages.get(segmentId)
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): string {
    return this.state.currentLanguage
  }

  /**
   * Get all languages used in transcript
   */
  getUsedLanguages(): string[] {
    return Array.from(new Set(this.segmentLanguages.values()))
  }

  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================

  /**
   * Get current state
   */
  getState(): MultiLanguageJEPAAgentState {
    return {
      ...this.state,
      languageDetections: new Map(this.state.languageDetections),
    }
  }

  /**
   * Get language preferences
   */
  getLanguagePreferences(): LanguagePreferences {
    return { ...this.state.languagePreferences }
  }

  /**
   * Update language preferences
   */
  updateLanguagePreferences(preferences: Partial<LanguagePreferences>): void {
    this.state.languagePreferences = {
      ...this.state.languagePreferences,
      ...preferences,
    }

    if (preferences.autoDetect !== undefined) {
      this.state.autoDetectEnabled = preferences.autoDetect
    }

    if (preferences.preferredLanguage) {
      this.state.currentLanguage = preferences.preferredLanguage
    }
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): typeof SUPPORTED_LANGUAGES {
    return SUPPORTED_LANGUAGES.filter(lang => lang.supported)
  }

  // ==========================================================================
  // TRANSCRIPT MANAGEMENT
  // ==========================================================================

  /**
   * Create a multi-language transcript segment
   */
  createTranscriptSegment(
    id: string,
    text: string,
    timestamp: number,
    speaker: 'user' | 'assistant' | 'unknown',
    confidence: number
  ): MultiLanguageTranscriptSegment {
    const language = this.segmentLanguages.get(id) || this.state.currentLanguage
    const languageDetection = this.state.languageDetections.get(id) || {
      language,
      confidence: 0.5,
      alternatives: [],
    }
    const emotion = this.segmentEmotions.get(id)

    return {
      id,
      timestamp,
      text,
      speaker,
      confidence,
      language,
      languageDetection,
      emotion,
    }
  }

  /**
   * Clear all segment data
   */
  clearSegments(): void {
    this.segmentLanguages.clear()
    this.segmentEmotions.clear()
    this.state.languageDetections.clear()
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Get language usage statistics
   */
  getLanguageStatistics(): Array<{ language: string; count: number; percentage: number }> {
    const languages = Array.from(this.segmentLanguages.values())
    const total = languages.length

    if (total === 0) {
      return []
    }

    const counts = new Map<string, number>()

    for (const lang of languages) {
      counts.set(lang, (counts.get(lang) || 0) + 1)
    }

    return Array.from(counts.entries()).map(([language, count]) => ({
      language,
      count,
      percentage: (count / total) * 100,
    }))
  }

  /**
   * Get emotion statistics by language
   */
  getEmotionStatisticsByLanguage(): Array<{
    language: string
    avgValence: number
    avgArousal: number
    avgDominance: number
    segmentCount: number
  }> {
    const languageEmotions = new Map<string, EmotionAnalysisLocal[]>()

    // Group emotions by language
    const emotionsArray = Array.from(this.segmentEmotions.entries())
    for (const [segmentId, emotion] of emotionsArray) {
      const language = this.segmentLanguages.get(segmentId) || 'en'

      if (!languageEmotions.has(language)) {
        languageEmotions.set(language, [])
      }

      languageEmotions.get(language)!.push(emotion)
    }

    // Calculate averages
    return Array.from(languageEmotions.entries()).map(([language, emotions]) => {
      const sum = emotions.reduce(
        (acc, e) => ({
          valence: acc.valence + e.valence,
          arousal: acc.arousal + e.arousal,
          dominance: acc.dominance + e.dominance,
        }),
        { valence: 0, arousal: 0, dominance: 0 }
      )

      const count = emotions.length

      return {
        language,
        avgValence: sum.valence / count,
        avgArousal: sum.arousal / count,
        avgDominance: sum.dominance / count,
        segmentCount: count,
      }
    })
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a multi-language JEPA agent handler
 */
export function createMultiLanguageJEPAAgent(
  preferences?: Partial<LanguagePreferences>
): MultiLanguageJEPAAgentHandler {
  return new MultiLanguageJEPAAgentHandler(preferences)
}

// ============================================================================
// RE-EXPORT TYPES
// ============================================================================

export type { LanguageDetectionResult } from './language-detection'
export type { EmotionScores } from './emotion-multilang'
export type { Language, LanguagePreferences } from './languages'
