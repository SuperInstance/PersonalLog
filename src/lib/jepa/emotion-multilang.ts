/**
 * JEPA Multi-Language Emotion Analysis
 *
 * Language-specific emotion models and cultural adjustments.
 * Supports emotion analysis across 12+ languages with cultural nuance.
 *
 * @module lib/jepa/emotion-multilang
 */

import { getEmotionKeywords, getCulturalAdjustment, getLanguage } from './languages'

// Define EmotionAnalysis locally to avoid circular dependency
export interface EmotionAnalysisLocal {
  /** Segment ID this analysis corresponds to */
  segmentId: string
  /** Timestamp of analysis */
  timestamp: number
  /** Valence: positive (0.6-1.0) vs negative (0.0-0.4) */
  valence: number
  /** Arousal: energy/intensity (0.0-1.0) */
  arousal: number
  /** Dominance: confidence/assertiveness (0.0-1.0) */
  dominance: number
  /** Overall confidence in analysis (0.0-1.0) */
  confidence: number
  /** Detected emotion labels */
  emotions: string[]
}

// ============================================================================
// EMOTION TYPES
// ============================================================================

export interface EmotionScores {
  /** Valence: positive (0.6-1.0) vs negative (0.0-0.4) */
  valence: number
  /** Arousal: energy/intensity (0.0-1.0) */
  arousal: number
  /** Dominance: confidence/assertiveness (0.0-1.0) */
  dominance: number
}

export interface LanguageEmotionModel {
  /** Language code */
  language: string
  /** Has dedicated model (vs fallback) */
  hasModel: boolean
  /** Analyze emotion from text */
  analyze: (text: string) => Promise<EmotionScores>
  /** Get emotion labels from scores */
  getLabels: (scores: EmotionScores) => string[]
}

// ============================================================================
// EMOTION LABEL MAPPINGS
// ============================================================================

/**
 * Multilingual emotion labels
 */
const EMOTION_LABELS: Record<string, Record<string, string[]>> = {
  en: {
    positive_high: ['excited', 'joyful', 'enthusiastic'],
    positive_low: ['content', 'calm', 'satisfied'],
    negative_high: ['angry', 'frustrated', 'irritated'],
    negative_low: ['sad', 'disappointed', 'worried'],
    neutral: ['neutral', 'calm', 'balanced'],
  },
  es: {
    positive_high: ['emocionado', 'alegre', 'entusiasta'],
    positive_low: ['contento', 'tranquilo', 'satisfecho'],
    negative_high: ['enojado', 'frustrado', 'irritado'],
    negative_low: ['triste', 'decepcionado', 'preocupado'],
    neutral: ['neutral', 'tranquilo', 'equilibrado'],
  },
  zh: {
    positive_high: ['兴奋', '高兴', '热情'],
    positive_low: ['满足', '平静', '满意'],
    negative_high: ['生气', '沮丧', '恼火'],
    negative_low: ['难过', '失望', '担心'],
    neutral: ['中性', '平静', '平和'],
  },
  ja: {
    positive_high: ['興奮', '喜び', '熱心'],
    positive_low: ['満足', '穏やか', '満足'],
    negative_high: ['怒り', '苛立ち', '不満'],
    negative_low: ['悲しみ', '失望', '不安'],
    neutral: ['中立', '穏やか', 'バランス'],
  },
  fr: {
    positive_high: ['excité', 'joyeux', 'enthousiaste'],
    positive_low: ['content', 'calme', 'satisfait'],
    negative_high: ['en colère', 'frustré', 'irrité'],
    negative_low: ['triste', 'déçu', 'inquiet'],
    neutral: ['neutre', 'calme', 'équilibré'],
  },
  de: {
    positive_high: ['aufgeregt', 'fröhlich', 'begeistert'],
    positive_low: ['zufrieden', 'ruhig', 'zufriedengeben'],
    negative_high: ['wütend', 'frustriert', 'gereizt'],
    negative_low: ['traurig', 'enttäuscht', 'besorgt'],
    neutral: ['neutral', 'ruhig', 'ausgewogen'],
  },
  it: {
    positive_high: ['eccitato', 'gioioso', 'entusiasta'],
    positive_low: ['contento', 'calmo', 'soddisfatto'],
    negative_high: ['arrabbiato', 'frustrato', 'irritato'],
    negative_low: ['triste', 'deluso', 'preoccupato'],
    neutral: ['neutrale', 'calmo', 'equilibrato'],
  },
  pt: {
    positive_high: ['animado', 'feliz', 'entusiasmado'],
    positive_low: ['satisfeito', 'calmo', 'satisfeito'],
    negative_high: ['com raiva', 'frustrado', 'irritado'],
    negative_low: ['triste', 'decepcionado', 'preocupado'],
    neutral: ['neutro', 'calmo', 'equilibrado'],
  },
  ko: {
    positive_high: ['흥분', '기쁨', '열정적'],
    positive_low: ['만족', '평온', '만족스러운'],
    negative_high: ['화남', '좌절', '짜증'],
    negative_low: ['슬픔', '실망', '걱정'],
    neutral: ['중립', '평온', '균형'],
  },
  hi: {
    positive_high: ['उत्साहित', 'प्रसन्न', 'जोशीला'],
    positive_low: ['संतुष्ट', 'शांत', 'संतुष्ट'],
    negative_high: ['गुस्सा', 'निराश', 'चिड़चिड़ा'],
    negative_low: ['उदास', 'निराश', 'चिंतित'],
    neutral: ['तटस्थ', 'शांत', 'संतुलित'],
  },
  ru: {
    positive_high: ['взволнованный', 'радостный', 'восторженный'],
    positive_low: ['довольный', 'спокойный', 'удовлетворенный'],
    negative_high: ['злой', 'разочарованный', 'раздраженный'],
    negative_low: ['грустный', 'разочарованный', 'обеспокоенный'],
    neutral: ['нейтральный', 'спокойный', 'сбалансированный'],
  },
  ar: {
    positive_high: ['متحمس', 'سعيد', 'حماسي'],
    positive_low: ['راض', 'هادئ', 'مقتنع'],
    negative_high: ['غاضب', 'محبط', 'منزعج'],
    negative_low: ['حزين', 'خائب', 'قلق'],
    neutral: ['محايد', 'هادئ', 'متوازن'],
  },
}

// ============================================================================
// EMOTION ANALYZER
// ============================================================================

/**
 * Analyze emotion from text with language-specific models
 */
export async function analyzeEmotion(
  text: string,
  language: string
): Promise<EmotionScores> {
  // Get language-specific emotion model
  const model = getLanguageEmotionModel(language)

  // Analyze emotion
  const scores = await model.analyze(text)

  // Apply cultural adjustments
  const adjustedScores = adjustEmotionForCulture(scores, language)

  return adjustedScores
}

/**
 * Get emotion labels for scores in specific language
 */
export function getEmotionLabels(scores: EmotionScores, language: string): string[] {
  // Get language-specific model
  const model = getLanguageEmotionModel(language)

  // Get labels from model
  return model.getLabels(scores)
}

// ============================================================================
// LANGUAGE-SPECIFIC EMOTION MODELS
// ============================================================================

/**
 * Get language-specific emotion model
 * Falls back to English model if no dedicated model exists
 */
export function getLanguageEmotionModel(language: string): LanguageEmotionModel {
  const lang = getLanguage(language)

  // Check if dedicated model exists
  if (lang?.emotionModelAvailable) {
    return createDedicatedModel(language)
  }

  // Fall back to English model
  return createEnglishModel()
}

/**
 * Create a dedicated emotion model for languages with ML support
 */
function createDedicatedModel(language: string): LanguageEmotionModel {
  return {
    language,
    hasModel: true,
    analyze: async (text: string) => {
      // TODO: Integrate actual ML model for language
      // For now, use keyword-based analysis with language-specific keywords

      const keywords = getEmotionKeywords(language)
      if (!keywords) {
        // Fallback to English analysis
        return analyzeEmotionEnglish(text)
      }

      return analyzeEmotionWithKeywords(text, keywords)
    },
    getLabels: (scores: EmotionScores) => {
      const labels = EMOTION_LABELS[language] || EMOTION_LABELS['en']

      if (scores.valence > 0.6) {
        return scores.arousal > 0.6 ? labels.positive_high : labels.positive_low
      } else if (scores.valence < 0.4) {
        return scores.arousal > 0.6 ? labels.negative_high : labels.negative_low
      } else {
        return labels.neutral
      }
    },
  }
}

/**
 * Create English emotion model (used as fallback)
 */
function createEnglishModel(): LanguageEmotionModel {
  return {
    language: 'en',
    hasModel: true,
    analyze: async (text: string) => {
      return analyzeEmotionEnglish(text)
    },
    getLabels: (scores: EmotionScores) => {
      const labels = EMOTION_LABELS['en']

      if (scores.valence > 0.6) {
        return scores.arousal > 0.6 ? labels.positive_high : labels.positive_low
      } else if (scores.valence < 0.4) {
        return scores.arousal > 0.6 ? labels.negative_high : labels.negative_low
      } else {
        return labels.neutral
      }
    },
  }
}

/**
 * Analyze emotion using English keywords
 */
function analyzeEmotionEnglish(text: string): EmotionScores {
  const keywords = getEmotionKeywords('en')
  return analyzeEmotionWithKeywords(text, keywords!)
}

/**
 * Analyze emotion using language-specific keywords
 */
function analyzeEmotionWithKeywords(
  text: string,
  keywords: { positive: string[]; negative: string[]; highArousal: string[] }
): EmotionScores {
  const lowerText = text.toLowerCase()

  // Count sentiment words
  const positiveCount = keywords.positive.filter(word => lowerText.includes(word)).length
  const negativeCount = keywords.negative.filter(word => lowerText.includes(word)).length
  const arousalCount = keywords.highArousal.filter(word => lowerText.includes(word)).length

  // Calculate valence (0-1)
  const totalSentimentWords = positiveCount + negativeCount
  let valence = 0.5 // Neutral baseline

  if (totalSentimentWords > 0) {
    valence = 0.5 + (positiveCount - negativeCount) / (totalSentimentWords * 2)
    valence = Math.max(0, Math.min(1, valence)) // Clamp to [0, 1]
  }

  // Calculate arousal (energy/intensity)
  const arousal = Math.min(1, 0.3 + arousalCount * 0.15)

  // Calculate dominance (confidence)
  const dominanceWords = ['think', 'believe', 'know', 'sure', 'certain']
  const dominanceCount = dominanceWords.filter(word => lowerText.includes(word)).length
  const dominance = Math.min(1, 0.4 + dominanceCount * 0.2)

  return {
    valence,
    arousal,
    dominance,
  }
}

// ============================================================================
// CULTURAL ADJUSTMENTS
// ============================================================================

/**
 * Adjust emotion scores for cultural differences
 * Different cultures express emotions with varying intensity
 */
export function adjustEmotionForCulture(emotion: EmotionScores, language: string): EmotionScores {
  const adjustment = getCulturalAdjustment(language)

  if (!adjustment) {
    return emotion
  }

  return {
    valence: Math.max(0, Math.min(1, emotion.valence * adjustment.valence)),
    arousal: Math.max(0, Math.min(1, emotion.arousal * adjustment.arousal)),
    dominance: Math.max(0, Math.min(1, emotion.dominance * adjustment.dominance)),
  }
}

/**
 * Get cultural adjustment explanation
 */
export function getCulturalAdjustmentExplanation(language: string): string | null {
  const lang = getLanguage(language)
  const adjustment = getCulturalAdjustment(language)

  if (!adjustment || !lang) {
    return null
  }

  const explanations: Record<string, string> = {
    ja: `${lang.nativeName} speakers tend to express emotions more subtly, so we've adjusted the intensity downward to better reflect the cultural context.`,
    zh: `${lang.nativeName} communication often emphasizes context and hierarchy, so we've adjusted the emotion scores to reflect more reserved expression and stronger emphasis on social position.`,
    es: `${lang.nativeName} speakers tend to be more emotionally expressive, so we've adjusted the intensity upward to better reflect the cultural enthusiasm.`,
    it: `${lang.nativeName} culture values emotional expression, so we've enhanced the emotional intensity to match this cultural characteristic.`,
    ar: `${lang.nativeName} communication patterns include both emotional expressiveness and hierarchical respect, which we've incorporated into the analysis.`,
  }

  return explanations[language] || null
}

// ============================================================================
// EMOTION ANALYSIS CONVERSION
// ============================================================================

/**
 * Convert EmotionScores to EmotionAnalysis format
 */
export function emotionScoresToAnalysis(
  scores: EmotionScores,
  language: string,
  segmentId: string,
  timestamp: number
): EmotionAnalysisLocal {
  const model = getLanguageEmotionModel(language)
  const labels = model.getLabels(scores)

  return {
    segmentId,
    timestamp,
    valence: scores.valence,
    arousal: scores.arousal,
    dominance: scores.dominance,
    confidence: 0.7, // Placeholder - would be calculated from model confidence
    emotions: labels,
  }
}

/**
 * Create emotion analysis from text with language detection
 */
export async function createEmotionAnalysis(
  text: string,
  language: string,
  segmentId: string,
  timestamp: number
): Promise<EmotionAnalysisLocal> {
  const scores = await analyzeEmotion(text, language)
  return emotionScoresToAnalysis(scores, language, segmentId, timestamp)
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate emotion scores
 */
export function validateEmotionScores(scores: EmotionScores): boolean {
  return (
    scores.valence >= 0 &&
    scores.valence <= 1 &&
    scores.arousal >= 0 &&
    scores.arousal <= 1 &&
    scores.dominance >= 0 &&
    scores.dominance <= 1
  )
}

/**
 * Clamp emotion scores to valid range
 */
export function clampEmotionScores(scores: EmotionScores): EmotionScores {
  return {
    valence: Math.max(0, Math.min(1, scores.valence)),
    arousal: Math.max(0, Math.min(1, scores.arousal)),
    dominance: Math.max(0, Math.min(1, scores.dominance)),
  }
}

/**
 * Average multiple emotion scores
 */
export function averageEmotionScores(scores: EmotionScores[]): EmotionScores {
  if (scores.length === 0) {
    return { valence: 0.5, arousal: 0.5, dominance: 0.5 }
  }

  const sum = scores.reduce(
    (acc, scores) => ({
      valence: acc.valence + scores.valence,
      arousal: acc.arousal + scores.arousal,
      dominance: acc.dominance + scores.dominance,
    }),
    { valence: 0, arousal: 0, dominance: 0 }
  )

  return {
    valence: sum.valence / scores.length,
    arousal: sum.arousal / scores.length,
    dominance: sum.dominance / scores.length,
  }
}
