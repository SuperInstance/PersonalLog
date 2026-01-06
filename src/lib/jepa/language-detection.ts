/**
 * JEPA Language Detection
 *
 * Automatic language detection from audio and text.
 * Uses Whisper's built-in detection with transcript-based fallback.
 *
 * @module lib/jepa/language-detection
 */

import type { LanguageDetectionResult } from './languages'
import { SUPPORTED_LANGUAGES, isLanguageSupported, getLanguage } from './languages'

// Define AudioWindow locally to avoid import issues
export interface AudioWindow {
  samples: Float32Array
  timestamp: number
  index: number
}

// Re-export types for convenience
export type { LanguageDetectionResult } from './languages'

// ============================================================================
// DETECTION CONFIGURATION
// ============================================================================

const DETECTION_CONFIG = {
  /** Minimum confidence threshold for language detection */
  MIN_CONFIDENCE: 0.3,
  /** Number of alternative languages to return */
  MAX_ALTERNATIVES: 3,
  /** Minimum text length for transcript-based detection */
  MIN_TEXT_LENGTH: 20,
  /** Confidence boost for character set matches */
  CHARSET_CONFIDENCE_BOOST: 0.2,
} as const

// ============================================================================
// CHARACTER SET PATTERNS
// ============================================================================

const CHARSET_PATTERNS: Array<{
  pattern: RegExp
  languages: string[]
  confidence: number
  checkExclusively?: boolean // If true, check if ONLY this character set exists
}> = [
  {
    // Japanese characters (Hiragana, Katakana) - these are exclusive to Japanese
    pattern: /[\u3040-\u309f\u30a0-\u30ff]/,
    languages: ['ja'],
    confidence: 0.95,
    checkExclusively: true, // Hiragana/Katakana = definitely Japanese
  },
  {
    // Korean characters (Hangul)
    pattern: /[\uac00-\ud7af\u1100-\u11ff]/,
    languages: ['ko'],
    confidence: 0.9,
    checkExclusively: true,
  },
  {
    // Arabic characters
    pattern: /[\u0600-\u06ff\u0750-\u077f]/,
    languages: ['ar', 'fa', 'ur'], // Arabic, Persian, Urdu
    confidence: 0.85,
    checkExclusively: false,
  },
  {
    // Cyrillic characters (Russian, Ukrainian, Bulgarian, etc.)
    pattern: /[\u0400-\u04ff]/,
    languages: ['ru', 'uk', 'bg', 'sr'],
    confidence: 0.8,
    checkExclusively: false,
  },
  {
    // Greek characters
    pattern: /[\u0370-\u03ff]/,
    languages: ['el'],
    confidence: 0.9,
    checkExclusively: true,
  },
  {
    // Hebrew characters
    pattern: /[\u0590-\u05ff]/,
    languages: ['he'],
    confidence: 0.9,
    checkExclusively: true,
  },
  {
    // Thai characters
    pattern: /[\u0e00-\u0e7f]/,
    languages: ['th'],
    confidence: 0.95,
    checkExclusively: true,
  },
  {
    // Devanagari script (Hindi, Marathi, Nepali, Sanskrit)
    pattern: /[\u0900-\u097f]/,
    languages: ['hi', 'mr', 'ne'],
    confidence: 0.85,
    checkExclusively: true,
  },
  {
    // Chinese characters (simplified and traditional)
    // This must be checked AFTER Japanese, since Japanese also uses Kanji
    pattern: /[\u4e00-\u9fff\u3400-\u4dbf]/,
    languages: ['zh'],
    confidence: 0.85,
    checkExclusively: false,
  },
]

// ============================================================================
// CHARACTER TRIGRAM PROFILES
// ============================================================================

/**
 * Character trigram profiles for languages that use Latin script
 * These capture the unique character patterns of each language
 */
const LANGUAGE_TRIGRAMS: Record<string, string[]> = {
  en: [
    'the', 'and', 'ing', 'ion', 'ent', 'her', 'hat', 'tha', 'ere', 'ati',
    'ter', 'ate', 'ver', 'est', 'ers', 'sta', 'ste', 'str', 'ure', 'are'
  ],
  es: [
    'que', 'ent', 'ada', 'dos', 'por', 'par', 'con', 'est', 'sta', 'aci',
    'ció', 'nte', 'ado', 'los', 'las', 'una', 'ión', 'del', 'para', 'sus'
  ],
  fr: [
    'ent', 'que', 'ait', 'ème', 'émé', 'eur', 'eai', 'est', 'ais', 'ème',
    'men', 'ois', 'tion', 'aux', 'des', 'les', 'ent', 'eme', 'eur', 'aient'
  ],
  de: [
    'ein', 'eine', 'sch', 'chn', 'ich', 'cht', 'die', 'der', 'und', 'che',
    'ten', 'den', 'nde', 'gen', 'ung', 'nis', 'tei', 'lic', 'aus', 'eis'
  ],
  it: [
    'che', 'per', 'però', 'gli', 'chi', 'qui', 'quo', 'qua', 'zio', 'are',
    'ere', 'ire', 'nte', 'mento', 'ità', 'tre', 'tro', 'sta', 'ste', 'stri'
  ],
  pt: [
    'que', 'ent', 'ado', 'ada', 'por', 'par', 'con', 'est', 'sta', 'ção',
    'nte', 'dos', 'ara', 'ento', 'mento', 'res', 'dos', 'as', 'os', 'para'
  ],
  nl: [
    'een', 'het', 'dat', 'sch', 'chr', 'nch', 'ijk', 'hei', 'aar', 'nde',
    'ing', 'ver', 'van', 'oor', 'cht', 'ber', 'gen', 'den', 'st', 'ten'
  ],
}

// ============================================================================
// LANGUAGE KEYWORD PATTERNS (Enhanced with more words)
// ============================================================================

const LANGUAGE_KEYWORD_PATTERNS: Array<{
  language: string
  commonWords: string[]
  confidence: number
}> = [
  {
    language: 'en',
    commonWords: [
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
      'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
      'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what'
    ],
    confidence: 0.8,
  },
  {
    language: 'es',
    commonWords: [
      'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se',
      'no', 'haber', 'con', 'su', 'por', 'para', 'como', 'estar', 'tener', 'le',
      'lo', 'todo', 'pero', 'más', 'hacer', 'o', 'poder', 'decir', 'este', 'ir',
      'otro', 'ese', 'si', 'me', 'ya', 'ver', 'porque', 'dar', 'cuando', 'muy'
    ],
    confidence: 0.8,
  },
  {
    language: 'fr',
    commonWords: [
      'le', 'de', 'et', 'à', 'un', 'il', 'avoir', 'ne', 'je', 'son',
      'que', 'se', 'qui', 'dans', 'ce', 'pour', 'pas', 'plus', 'pouvoir', 'par',
      'sur', 'être', 'avec', 'tout', 'faire', 'son', 'dire', 'elle', 'nous', 'comme',
      'mais', 'vous', 'ce', 'si', 'leur', 'y', 'voir', 'bien', 'où', 'tu'
    ],
    confidence: 0.8,
  },
  {
    language: 'de',
    commonWords: [
      'der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich',
      'des', 'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'ein', 'eine', 'als',
      'auch', 'es', 'an', 'werden', 'aus', 'er', 'hat', 'dass', 'sie', 'nach',
      'wird', 'von', 'um', 'bei', 'noch', 'über', 'so', 'zum', 'war', 'haben'
    ],
    confidence: 0.8,
  },
  {
    language: 'it',
    commonWords: [
      'il', 'di', 'che', 'e', 'la', 'un', 'a', 'per', 'in', 'è',
      'non', 'essere', 'avere', 'da', 'con', 'su', 'perché', 'come', 'questo', 'lo',
      'più', 'ma', 'le', 'si', 'tutto', 'nel', 'potere', 'dire', 'fare', 'questo',
      'altro', 'così', 'me', 'se', 'gia', 'vedere', 'verso', 'quando', 'molto', 'quale'
    ],
    confidence: 0.8,
  },
  {
    language: 'pt',
    commonWords: [
      'o', 'de', 'a', 'e', 'do', 'da', 'em', 'um', 'para', 'é',
      'não', 'ser', 'com', 'se', 'na', 'por', 'que', 'como', 'mas', 'estar',
      'ter', 'à', 'poder', 'mais', 'fazer', 'esse', 'este', 'ele', 'seu', 'esse',
      'dos', 'no', 'as', 'ou', 'quando', 'tudo', 'lhe', 'quem', 'nas', 'me'
    ],
    confidence: 0.8,
  },
  {
    language: 'ru',
    commonWords: [
      'и', 'в', 'не', 'на', 'я', 'быть', 'он', 'с', 'как', 'что',
      'это', 'вы', 'что', 'который', 'для', 'мы', 'она', 'они', 'от', 'себя',
      'этот', 'тот', 'к', 'но', 'они', 'вы', 'оно', 'кто', 'мочь', 'все',
      'когда', 'где', 'если', 'этот', 'там', 'потом', 'твой', 'зачем', 'почему', 'кто-то'
    ],
    confidence: 0.8,
  },
  {
    language: 'nl',
    commonWords: [
      'de', 'van', 'en', 'in', 'een', 'het', 'dat', 'is', 'niet', 'zijn',
      'er', 'worden', 'op', 'aan', 'met', 'zich', 'te', 'voor', 'uit', 'door',
      'over', 'onder', 'naar', 'als', 'bij', 'om', 'dan', 'wil', 'me', 'u'
    ],
    confidence: 0.7,
  },
  {
    language: 'pl',
    commonWords: [
      'w', 'nie', 'i', 'z', 'na', 'do', 'że', 'a', 'się', 'to',
      'o', 'z', 'jako', 'od', ' Jest', 'być', 'ja', 'ty', 'on',
      'ona', 'my', 'wy', 'oni', 'ten', 'ta', 'to', 'co', 'jak', 'ale'
    ],
    confidence: 0.7,
  },
]

// ============================================================================
// AUDIO-BASED DETECTION
// ============================================================================

/**
 * Detect language from audio buffer
 * NOTE: This is a placeholder. Actual implementation would use Whisper's
 * language detection capabilities through the WASM module.
 *
 * @param audioBuffer - Audio data to analyze
 * @returns Language detection result
 */
export async function detectLanguage(audioBuffer: AudioWindow): Promise<LanguageDetectionResult> {
  try {
    // Placeholder: In production, this would call Whisper's language detection
    // For now, we'll use a simple heuristic based on audio characteristics

    // Extract audio features
    const features = extractAudioFeatures(audioBuffer)

    // TODO: Replace with actual Whisper language detection
    // const whisperCode = await whisper.detectLanguage(audioBuffer)

    // For now, default to English with medium confidence
    return {
      language: 'en',
      confidence: 0.6,
      alternatives: [
        { code: 'es', confidence: 0.1 },
        { code: 'fr', confidence: 0.08 },
      ],
    }
  } catch (error) {
    console.error('Language detection failed:', error)

    // Fallback to English
    return {
      language: 'en',
      confidence: 0.3,
      alternatives: [],
    }
  }
}

/**
 * Extract features from audio for language detection
 * This is a simplified placeholder - real implementation would analyze
 * spectral characteristics, phoneme patterns, etc.
 */
function extractAudioFeatures(audioWindow: AudioWindow): {
  zeroCrossingRate: number
  spectralCentroid: number
  mfcc: number[]
} {
  const channelData = audioWindow.samples
  const sampleRate = 44100 // Default sample rate

  // Calculate zero-crossing rate
  let zeroCrossings = 0
  for (let i = 1; i < channelData.length; i++) {
    if ((channelData[i - 1] >= 0 && channelData[i] < 0) || (channelData[i - 1] < 0 && channelData[i] >= 0)) {
      zeroCrossings++
    }
  }
  const zeroCrossingRate = zeroCrossings / channelData.length

  // Calculate spectral centroid (simplified)
  const spectralCentroid = sampleRate / 4 // Placeholder

  // MFCC coefficients (placeholder)
  const mfcc = new Array(13).fill(0)

  return {
    zeroCrossingRate,
    spectralCentroid,
    mfcc,
  }
}

// ============================================================================
// TEXT-BASED DETECTION
// ============================================================================

/**
 * Detect language from transcript text
 * Uses character sets, common words, and n-gram analysis
 *
 * @param text - Transcript text to analyze
 * @returns Language detection result
 */
export async function detectLanguageFromTranscript(text: string): Promise<LanguageDetectionResult> {
  // Clean and normalize text
  const cleanText = text.trim().toLowerCase()

  if (cleanText.length < DETECTION_CONFIG.MIN_TEXT_LENGTH) {
    // Text too short for reliable detection
    return {
      language: 'en',
      confidence: 0.3,
      alternatives: [],
    }
  }

  // Try character set detection first (most reliable)
  const charsetResult = detectByCharset(cleanText)
  if (charsetResult.confidence > 0.7) {
    return charsetResult
  }

  // Try trigram detection for Latin script languages
  const trigramResult = detectByTrigrams(cleanText)
  if (trigramResult.confidence > 0.5) {
    // Combine trigram and keyword results
    const keywordResult = detectByKeywords(cleanText)
    return combineDetectionResults(trigramResult, keywordResult)
  }

  // Try keyword detection
  const keywordResult = detectByKeywords(cleanText)
  if (keywordResult.confidence > 0.6) {
    return keywordResult
  }

  // Combine results
  return combineDetectionResults(charsetResult, keywordResult)
}

/**
 * Detect language by character trigrams (for Latin script languages)
 */
function detectByTrigrams(text: string): LanguageDetectionResult {
  const scores: Array<{ language: string; confidence: number }> = []

  // Extract trigrams from text
  const trigrams = extractTrigrams(text)

  for (const [language, profile] of Object.entries(LANGUAGE_TRIGRAMS)) {
    if (!isLanguageSupported(language)) {
      continue
    }

    // Calculate similarity with profile
    const matches = profile.filter(trigram => trigrams.has(trigram)).length
    const similarity = matches / profile.length

    if (similarity > 0.1) {
      scores.push({
        language,
        confidence: Math.min(0.9, similarity * 1.5),
      })
    }
  }

  // Sort by confidence
  scores.sort((a, b) => b.confidence - a.confidence)

  if (scores.length === 0) {
    return {
      language: 'en',
      confidence: 0.3,
      alternatives: [],
    }
  }

  const top = scores[0]
  const alternatives = scores
    .slice(1, DETECTION_CONFIG.MAX_ALTERNATIVES + 1)
    .map(s => ({ code: s.language, confidence: s.confidence }))

  return {
    language: top.language,
    confidence: top.confidence,
    alternatives,
  }
}

/**
 * Extract character trigrams from text
 */
function extractTrigrams(text: string): Set<string> {
  const trigrams = new Set<string>()
  const words = text.split(/\s+/)

  for (const word of words) {
    if (word.length >= 3) {
      // Extract all trigrams from the word
      for (let i = 0; i <= word.length - 3; i++) {
        trigrams.add(word.substring(i, i + 3))
      }
    }
  }

  return trigrams
}

/**
 * Detect language by character set
 */
function detectByCharset(text: string): LanguageDetectionResult {
  const scores: Array<{ language: string; confidence: number }> = []

  for (const { pattern, languages, confidence, checkExclusively } of CHARSET_PATTERNS) {
    const matches = (text.match(pattern) || []).length

    if (matches > 0) {
      // For exclusive scripts (Hiragana, Hangul, etc.), presence alone is strong evidence
      // For non-exclusive scripts (Chinese characters shared with Japanese), need more evidence
      let confidenceScore = confidence

      if (checkExclusively) {
        // Exclusive script: high confidence based on presence
        confidenceScore = Math.min(1, confidence + (matches / text.length) * 0.15)
      } else {
        // Non-exclusive script: need higher match rate
        const matchRate = matches / text.length
        confidenceScore = Math.min(1, confidence * matchRate * 1.5)
      }

      for (const lang of languages) {
        if (isLanguageSupported(lang)) {
          scores.push({ language: lang, confidence: confidenceScore })
        }
      }
    }
  }

  // Sort by confidence
  scores.sort((a, b) => b.confidence - a.confidence)

  if (scores.length === 0) {
    return {
      language: 'en',
      confidence: 0.3,
      alternatives: [],
    }
  }

  const top = scores[0]
  const alternatives = scores
    .slice(1, DETECTION_CONFIG.MAX_ALTERNATIVES + 1)
    .map(s => ({ code: s.language, confidence: s.confidence }))

  return {
    language: top.language,
    confidence: top.confidence,
    alternatives,
  }
}

/**
 * Detect language by common words
 */
function detectByKeywords(text: string): LanguageDetectionResult {
  const words = text.split(/\s+/).filter(w => w.length > 2)
  const scores: Array<{ language: string; confidence: number }> = []

  for (const { language, commonWords, confidence } of LANGUAGE_KEYWORD_PATTERNS) {
    const matches = words.filter(word => commonWords.includes(word)).length
    const matchRate = matches / words.length

    if (matchRate > 0.1) {
      // At least 10% of words match
      scores.push({
        language,
        confidence: Math.min(confidence, matchRate * 2),
      })
    }
  }

  // Sort by confidence
  scores.sort((a, b) => b.confidence - a.confidence)

  if (scores.length === 0) {
    return {
      language: 'en',
      confidence: 0.3,
      alternatives: [],
    }
  }

  const top = scores[0]
  const alternatives = scores
    .slice(1, DETECTION_CONFIG.MAX_ALTERNATIVES + 1)
    .map(s => ({ code: s.language, confidence: s.confidence }))

  return {
    language: top.language,
    confidence: top.confidence,
    alternatives,
  }
}

/**
 * Combine multiple detection results
 */
function combineDetectionResults(
  result1: LanguageDetectionResult,
  result2: LanguageDetectionResult
): LanguageDetectionResult {
  // Aggregate scores by language
  const scores = new Map<string, number>()

  // Add scores from result 1
  scores.set(result1.language, result1.confidence)
  for (const alt of result1.alternatives) {
    const current = scores.get(alt.code) || 0
    scores.set(alt.code, current + alt.confidence * 0.5)
  }

  // Add scores from result 2
  const current = scores.get(result2.language) || 0
  scores.set(result2.language, current + result2.confidence)
  for (const alt of result2.alternatives) {
    const currentScore = scores.get(alt.code) || 0
    scores.set(alt.code, currentScore + alt.confidence * 0.5)
  }

  // Sort by combined score
  const sorted = Array.from(scores.entries())
    .map(([language, score]) => ({ language, score }))
    .sort((a, b) => b.score - a.score)

  if (sorted.length === 0) {
    return {
      language: 'en',
      confidence: 0.3,
      alternatives: [],
    }
  }

  const top = sorted[0]
  const alternatives = sorted
    .slice(1, DETECTION_CONFIG.MAX_ALTERNATIVES + 1)
    .map(s => ({ code: s.language, confidence: Math.min(1, s.score) }))

  return {
    language: top.language,
    confidence: Math.min(1, top.score),
    alternatives,
  }
}

// ============================================================================
// CONFIDENCE CALCULATION
// ============================================================================

/**
 * Get language confidence with alternatives
 */
export function getLanguageConfidence(result: LanguageDetectionResult): {
  primary: { language: string; confidence: number }
  alternatives: Array<{ language: string; confidence: number }>
  isReliable: boolean
} {
  return {
    primary: {
      language: result.language,
      confidence: result.confidence,
    },
    alternatives: result.alternatives.map(alt => ({
      language: alt.code,
      confidence: alt.confidence,
    })),
    isReliable: result.confidence >= DETECTION_CONFIG.MIN_CONFIDENCE,
  }
}

/**
 * Boost confidence based on multiple detection results
 */
export function boostConfidence(
  result: LanguageDetectionResult,
  additionalEvidence: LanguageDetectionResult[]
): LanguageDetectionResult {
  if (additionalEvidence.length === 0) {
    return result
  }

  // Check if additional evidence agrees
  const agreements = additionalEvidence.filter(e => e.language === result.language).length
  const agreementRate = agreements / additionalEvidence.length

  // Boost confidence if there's agreement
  const boostedConfidence = Math.min(1, result.confidence + agreementRate * 0.2)

  return {
    ...result,
    confidence: boostedConfidence,
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Validate language detection result
 */
export function validateDetectionResult(result: LanguageDetectionResult): boolean {
  // Check if language is supported
  if (!isLanguageSupported(result.language)) {
    return false
  }

  // Check confidence is in valid range
  if (result.confidence < 0 || result.confidence > 1) {
    return false
  }

  // Check alternatives
  for (const alt of result.alternatives) {
    if (!isLanguageSupported(alt.code)) {
      return false
    }
    if (alt.confidence < 0 || alt.confidence > 1) {
      return false
    }
  }

  return true
}

/**
 * Get language name from detection result
 */
export function getDetectedLanguageName(result: LanguageDetectionResult): string {
  const lang = getLanguage(result.language)
  if (!lang) {
    return result.language
  }

  return `${lang.flag} ${lang.name} (${Math.round(result.confidence * 100)}%)`
}

/**
 * Create a human-readable detection report
 */
export function createDetectionReport(result: LanguageDetectionResult): string {
  const lines: string[] = []

  lines.push(`Detected Language: ${getDetectedLanguageName(result)}`)
  lines.push(`Confidence: ${(result.confidence * 100).toFixed(1)}%`)

  if (result.alternatives.length > 0) {
    lines.push('\nAlternative possibilities:')
    for (const alt of result.alternatives) {
      const lang = getLanguage(alt.code)
      const flag = lang?.flag || '🌐'
      const name = lang?.name || alt.code
      lines.push(`  - ${flag} ${name}: ${(alt.confidence * 100).toFixed(1)}%`)
    }
  }

  return lines.join('\n')
}
