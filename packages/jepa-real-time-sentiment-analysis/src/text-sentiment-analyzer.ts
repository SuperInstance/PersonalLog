/**
 * Enhanced Text-Based Sentiment Analyzer
 *
 * Advanced sentiment detection from text with:
 * - More nuanced sentiment categories (15+ sentiments)
 * - Emoji analysis
 * - Punctuation analysis
 * - Context awareness (conversation history)
 * - Confidence metrics
 * - Pattern matching with weighted scoring
 *
 * @module text-sentiment-analyzer
 */

import type {
  TextSentimentDetection,
  SentimentCategory,
  SentimentPattern,
  TextContextWindow,
} from './types'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type EmotionType = SentimentCategory

// ============================================================================
// SENTIMENT PATTERNS DATABASE
// ============================================================================

export const SENTIMENT_PATTERNS: Record<SentimentCategory, SentimentPattern> = {
  // Positive High-Arousal Sentiments
  happy: {
    keywords: [
      'happy', 'glad', 'pleased', 'delighted', 'cheerful', 'merry',
      'good', 'great', 'awesome', 'fantastic', 'wonderful', 'excellent',
      'love this', 'enjoying', 'fun', 'nice', 'pleasure'
    ],
    emojis: ['😊', '😄', '😁', '🙂', '👍', '💖', '✨'],
    punctuation: ['!'],
    weight: 1.0,
    vad: { valence: 0.75, arousal: 0.65, dominance: 0.6 }
  },

  excited: {
    keywords: [
      'excited', 'thrilled', 'pumped', 'stoked', 'ecstatic', 'elated',
      'can\'t wait', 'looking forward', 'anticipating', 'eager',
      'buzzing', 'hyped', 'amped', 'enthusiastic', 'energetic'
    ],
    emojis: ['🤩', '🎉', '🎊', '✨', '💫', '🔥', '⚡'],
    punctuation: ['!!!', '!!'],
    weight: 1.2,
    vad: { valence: 0.85, arousal: 0.9, dominance: 0.7 }
  },

  calm: {
    keywords: [
      'calm', 'relaxed', 'peaceful', 'serene', 'tranquil', 'composed',
      'collected', 'unperturbed', 'steady', 'balanced', 'centered',
      'zen', 'chill', 'laid back'
    ],
    emojis: ['😌', '🕊️', '☮️', '🌿', '✨'],
    weight: 0.9,
    vad: { valence: 0.65, arousal: 0.2, dominance: 0.5 }
  },

  relaxed: {
    keywords: [
      'relaxed', 'relaxing', 'at ease', 'comfortable', 'laid back',
      'easy', 'peaceful', 'unhurried', 'leisurely'
    ],
    emojis: ['😌', '🙂', '😊', '✨'],
    weight: 0.9,
    vad: { valence: 0.7, arousal: 0.3, dominance: 0.6 }
  },

  neutral: {
    keywords: [
      'okay', 'alright', 'fine', 'sure', 'maybe', 'perhaps',
      'understand', 'I see', 'got it', 'noted', 'acknowledged'
    ],
    emojis: ['😐', '🙂', '👌'],
    weight: 0.5,
    vad: { valence: 0.5, arousal: 0.5, dominance: 0.5 }
  },

  bored: {
    keywords: [
      'bored', 'boring', 'uninterested', 'not excited', 'dull',
      'nothing to do', 'tedious', 'monotonous'
    ],
    emojis: ['😑', '🥱', '😒'],
    weight: 1.0,
    vad: { valence: 0.4, arousal: 0.3, dominance: 0.4 }
  },

  sad: {
    keywords: [
      'sad', 'unhappy', 'down', 'depressed', 'miserable', 'heartbroken',
      'devastated', 'crushed', 'bummed', 'feeling low', 'crying',
      'tears', 'hurt', 'pain', 'suffering', 'grief'
    ],
    emojis: ['😢', '😭', '😞', '😔', '💔', '🥀'],
    weight: 1.0,
    vad: { valence: 0.2, arousal: 0.3, dominance: 0.3 }
  },

  angry: {
    keywords: [
      'angry', 'mad', 'furious', 'rage', 'outraged', 'irate',
      'livid', 'incensed', 'pissed', 'hate', 'can\'t stand',
      'unacceptable', 'how dare', 'outrage'
    ],
    emojis: ['😡', '😠', '🤬', '💢', '👿'],
    punctuation: ['!!!'],
    weight: 1.2,
    vad: { valence: 0.2, arousal: 0.9, dominance: 0.8 }
  },

  anxious: {
    keywords: [
      'anxious', 'nervous', 'worried', 'apprehensive', 'uneasy',
      'troubled', 'concerned', 'fearful', 'scared', 'afraid',
      'what if', 'don\'t know what to do'
    ],
    emojis: ['😟', '😰', '😨', '😖', '🙏'],
    weight: 1.0,
    vad: { valence: 0.35, arousal: 0.65, dominance: 0.3 }
  },

  tense: {
    keywords: [
      'tense', 'stressed', 'under pressure', 'on edge', 'strained',
      'uptight', 'high-strung', 'nervous', 'anxious'
    ],
    emojis: ['😬', '😰', '😖', '😤'],
    weight: 1.0,
    vad: { valence: 0.35, arousal: 0.7, dominance: 0.5 }
  },
}

// ============================================================================
// EMOJI ANALYSIS
// ============================================================================

/**
 * Extract emojis from text
 */
export function extractEmojis(text: string): string[] {
  // Use a simple emoji regex pattern (ES5 compatible)
  // This catches most common emojis
  const emojiPattern = /[\uD83C-\uDBFF\uDC00-\uDFFF]+/g
  return text.match(emojiPattern) || []
}

/**
 * Analyze sentiment from emojis
 */
function analyzeEmojis(text: string): Map<SentimentCategory, number> {
  const emojis = extractEmojis(text)
  const scores = new Map<SentimentCategory, number>()

  for (const [sentiment, pattern] of Object.entries(SENTIMENT_PATTERNS)) {
    const matchCount = emojis.filter(e => pattern.emojis.includes(e)).length
    if (matchCount > 0) {
      scores.set(sentiment as SentimentCategory, matchCount * pattern.weight * 0.8)
    }
  }

  return scores
}

// ============================================================================
// PUNCTUATION ANALYSIS
// ============================================================================

/**
 * Analyze sentiment from punctuation patterns
 */
function analyzePunctuation(text: string): Map<SentimentCategory, number> {
  const scores = new Map<SentimentCategory, number>()

  // Count exclamation marks
  const exclamationCount = (text.match(/!/g) || []).length
  if (exclamationCount >= 3) {
    // Strong excitement or anger
    scores.set('excited', exclamationCount * 0.3)
    scores.set('angry', exclamationCount * 0.2)
    scores.set('happy', exclamationCount * 0.2)
  } else if (exclamationCount === 2) {
    scores.set('excited', 0.4)
    scores.set('happy', 0.3)
  } else if (exclamationCount === 1) {
    scores.set('happy', 0.2)
    scores.set('excited', 0.15)
  }

  // Count question marks
  const questionCount = (text.match(/\?/g) || []).length
  if (questionCount >= 3) {
    scores.set('anxious', questionCount * 0.4)
    scores.set('excited', questionCount * 0.2)
  } else if (questionCount >= 2) {
    scores.set('anxious', questionCount * 0.3)
    scores.set('bored', questionCount * 0.2)
  } else if (questionCount === 1) {
    scores.set('bored', 0.2)
  }

  // Check for ellipsis (uncertainty or trailing off)
  if (text.includes('...')) {
    scores.set('sad', 0.3)
    scores.set('bored', 0.2)
    scores.set('anxious', 0.2)
  }

  // Check for all caps (high arousal)
  if (text === text.toUpperCase() && text.length > 5) {
    scores.set('angry', 0.4)
    scores.set('excited', 0.3)
    scores.set('tense', 0.3)
  }

  return scores
}

// ============================================================================
// KEYWORD ANALYSIS
// ============================================================================

/**
 * Analyze sentiment from keywords
 */
function analyzeKeywords(text: string): Map<SentimentCategory, number> {
  const scores = new Map<SentimentCategory, number>()
  const lowerText = text.toLowerCase()

  for (const [sentiment, pattern] of Object.entries(SENTIMENT_PATTERNS)) {
    let matchScore = 0
    let matchCount = 0

    for (const keyword of pattern.keywords) {
      if (lowerText.includes(keyword)) {
        matchCount++
        // Exact word matches get higher scores
        const wordRegex = new RegExp(`\\b${keyword}\\b`, 'i')
        if (wordRegex.test(lowerText)) {
          matchScore += pattern.weight * 0.5
        } else {
          matchScore += pattern.weight * 0.3
        }
      }
    }

    if (matchScore > 0) {
      // Bonus for multiple keyword matches
      const bonus = Math.min(matchCount - 1, 3) * 0.2
      scores.set(sentiment as SentimentCategory, matchScore + bonus)
    }
  }

  return scores
}

// ============================================================================
// CONTEXT AWARENESS
// ============================================================================

/**
 * Adjust sentiment scores based on conversation context
 */
function applyContext(
  scores: Map<SentimentCategory, number>,
  context?: TextContextWindow
): Map<SentimentCategory, number> {
  if (!context || context.previousMessages.length === 0) {
    return scores
  }

  const adjusted = new Map(scores)

  // Look at previous sentiment
  const lastSentiment = context.previousMessages[context.previousMessages.length - 1]?.sentiment
  if (lastSentiment) {
    // Sentiment inertia - previous sentiment influences current
    const inertiaBoost = 0.15
    const currentScore = adjusted.get(lastSentiment) || 0
    adjusted.set(lastSentiment, currentScore + inertiaBoost)
  }

  // Check for sentiment escalation or de-escalation
  if (context.previousMessages.length >= 2) {
    const secondLastSentiment = context.previousMessages[context.previousMessages.length - 2]?.sentiment
    if (lastSentiment && secondLastSentiment) {
      // If same sentiment persists, boost it (sentiment persistence)
      if (lastSentiment === secondLastSentiment) {
        const currentScore = adjusted.get(lastSentiment) || 0
        adjusted.set(lastSentiment, currentScore + 0.1)
      }
    }
  }

  // Consider speaker patterns
  const speakerMessages = context.previousMessages.filter(m => {
    // Extract speaker from message if available, otherwise use context
    const msgSpeaker = (m as any).speaker
    return msgSpeaker === context.speaker
  })
  if (speakerMessages.length >= 3) {
    // This speaker's typical sentiment baseline
    const recentSentiments = speakerMessages.slice(-3).map(m => m.sentiment)
    const sentimentCounts = new Map<SentimentCategory, number>()
    for (const sentiment of recentSentiments) {
      if (sentiment) {
        sentimentCounts.set(sentiment, (sentimentCounts.get(sentiment) || 0) + 1)
      }
    }

    // Boost sentiments that this speaker commonly expresses
    const countEntries = Array.from(sentimentCounts.entries())
    for (const [sentiment, count] of countEntries) {
      if (count >= 2) {
        const currentScore = adjusted.get(sentiment) || 0
        adjusted.set(sentiment, currentScore + 0.1)
      }
    }
  }

  return adjusted
}

// ============================================================================
// CONFIDENCE CALCULATION
// ============================================================================

/**
 * Calculate confidence in sentiment detection
 */
function calculateConfidence(
  primaryScore: number,
  scores: Map<SentimentCategory, number>,
  text: string
): number {
  // Base confidence from score strength
  let confidence = Math.min(0.95, 0.5 + primaryScore * 0.3)

  // Higher confidence if there's a clear winner (big gap to second place)
  const sortedScores = Array.from(scores.entries()).sort((a, b) => b[1] - a[1])
  if (sortedScores.length >= 2) {
    const gap = sortedScores[0][1] - sortedScores[1][1]
    if (gap > 0.5) {
      confidence = Math.min(0.98, confidence + 0.15)
    } else if (gap < 0.2) {
      confidence = Math.max(0.4, confidence - 0.15)
    }
  }

  // Emoji presence increases confidence
  const emojis = extractEmojis(text)
  if (emojis.length > 0) {
    confidence = Math.min(0.98, confidence + 0.1)
  }

  // Punctuation patterns increase confidence
  if (/[!?]{2,}/.test(text)) {
    confidence = Math.min(0.98, confidence + 0.08)
  }

  // Very short text decreases confidence
  if (text.split(' ').length < 3) {
    confidence = Math.max(0.35, confidence - 0.2)
  }

  return Math.max(0.3, Math.min(0.98, confidence))
}

// ============================================================================
// MAIN SENTIMENT DETECTION
// ============================================================================

/**
 * Detect sentiment from text with full analysis
 */
export function detectSentiment(
  text: string,
  context?: TextContextWindow
): TextSentimentDetection {
  // Collect evidence
  const evidence: string[] = []

  // Analyze different signal types
  const keywordScores = analyzeKeywords(text)
  const emojiScores = analyzeEmojis(text)
  const punctuationScores = analyzePunctuation(text)

  // Combine all scores
  const combinedScores = new Map<SentimentCategory, number>()

  for (const sentiment of Object.keys(SENTIMENT_PATTERNS) as SentimentCategory[]) {
    const total =
      (keywordScores.get(sentiment) || 0) +
      (emojiScores.get(sentiment) || 0) +
      (punctuationScores.get(sentiment) || 0)

    if (total > 0) {
      combinedScores.set(sentiment, total)
    }
  }

  // Apply context
  const contextAwareScores = applyContext(combinedScores, context)

  // Find primary sentiment
  let primarySentiment: SentimentCategory = 'neutral'
  let primaryScore = 0

  // Convert Map to array for iteration (ES5 compatible)
  const scoreEntries = Array.from(contextAwareScores.entries())
  for (const [sentiment, score] of scoreEntries) {
    if (score > primaryScore) {
      primaryScore = score
      primarySentiment = sentiment
    }
  }

  // If no sentiment detected, default to neutral
  if (primaryScore === 0) {
    primarySentiment = 'neutral'
    primaryScore = 0.5
  }

  // Find secondary sentiments
  const sortedScores = Array.from(contextAwareScores.entries())
    .sort((a, b) => b[1] - a[1])
    .filter(([sentiment, score]) => sentiment !== primarySentiment && score > 0.3)

  const secondarySentiments = sortedScores.slice(0, 2).map(([sentiment, score]) => ({
    sentiment,
    confidence: Math.min(1, score)
  }))

  // Calculate VAD values
  const baseVAD = SENTIMENT_PATTERNS[primarySentiment].vad

  // Adjust VAD based on score strength
  const intensity = Math.min(1, primaryScore / 2)
  const valence = baseVAD.valence * (0.7 + intensity * 0.3)
  const arousal = baseVAD.arousal * (0.7 + intensity * 0.3)
  const dominance = baseVAD.dominance * (0.7 + intensity * 0.3)

  // Calculate confidence
  const confidence = calculateConfidence(primaryScore, contextAwareScores, text)

  // Collect evidence
  if (keywordScores.get(primarySentiment)) {
    const pattern = SENTIMENT_PATTERNS[primarySentiment]
    const matchedKeywords = pattern.keywords.filter(kw =>
      text.toLowerCase().includes(kw)
    )
    if (matchedKeywords.length > 0) {
      evidence.push(`Keywords: "${matchedKeywords.slice(0, 3).join('", "')}"`)
    }
  }

  const emojis = extractEmojis(text)
  if (emojis.length > 0) {
    evidence.push(`Emojis: ${emojis.join(' ')}`)
  }

  if (punctuationScores.get(primarySentiment)) {
    evidence.push('Punctuation patterns detected')
  }

  return {
    sentiment: primarySentiment,
    secondarySentiments: secondarySentiments.length > 0 ? secondarySentiments : undefined,
    valence,
    arousal,
    dominance,
    confidence,
    evidence
  }
}

/**
 * Batch detect sentiments for multiple messages
 */
export function detectSentimentsBatch(
  messages: Array<{ text: string; speaker: string }>
): TextSentimentDetection[] {
  const results: TextSentimentDetection[] = []

  for (let i = 0; i < messages.length; i++) {
    const context: TextContextWindow = {
      previousMessages: results.slice(Math.max(0, i - 5)).map((r, idx) => ({
        text: messages[i - (5 - idx)]?.text || '',
        sentiment: r.sentiment
      })),
      speaker: messages[i].speaker
    }

    results.push(detectSentiment(messages[i].text, context))
  }

  return results
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all available sentiment types
 */
export function getSentimentTypes(): SentimentCategory[] {
  return Object.keys(SENTIMENT_PATTERNS) as SentimentCategory[]
}

/**
 * Get sentiment pattern data
 */
export function getSentimentPattern(sentiment: SentimentCategory): SentimentPattern | undefined {
  return SENTIMENT_PATTERNS[sentiment]
}

/**
 * Check if sentiment is positive
 */
export function isPositiveSentiment(sentiment: SentimentCategory): boolean {
  const pattern = SENTIMENT_PATTERNS[sentiment]
  return pattern ? pattern.vad.valence > 0.5 : false
}

/**
 * Check if sentiment is high arousal
 */
export function isHighArousal(sentiment: SentimentCategory): boolean {
  const pattern = SENTIMENT_PATTERNS[sentiment]
  return pattern ? pattern.vad.arousal > 0.5 : false
}

/**
 * Get sentiment intensity category
 */
export function getSentimentIntensity(sentiment: SentimentCategory): 'low' | 'medium' | 'high' {
  const pattern = SENTIMENT_PATTERNS[sentiment]
  if (!pattern) return 'medium'

  if (pattern.vad.arousal > 0.7) return 'high'
  if (pattern.vad.arousal > 0.4) return 'medium'
  return 'low'
}
