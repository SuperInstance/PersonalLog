/**
 * Enhanced Text-Based Emotion Analyzer
 *
 * Advanced emotion detection from text with:
 * - More nuanced emotion categories (15+ emotions)
 * - Emoji analysis
 * - Punctuation analysis
 * - Context awareness (conversation history)
 * - Confidence metrics
 * - Pattern matching with weighted scoring
 *
 * @module lib/jepa/emotion-text-analyzer
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface EmotionDetection {
  /** Primary emotion detected */
  emotion: EmotionType
  /** Secondary emotions detected (if any) */
  secondaryEmotions?: Array<{ emotion: EmotionType; confidence: number }>
  /** Valence: positive (0.6-1.0) vs negative (0.0-0.4) */
  valence: number
  /** Arousal: energy/intensity (0.0-1.0) */
  arousal: number
  /** Dominance: confidence/assertiveness (0.0-1.0) */
  dominance: number
  /** Overall confidence in detection (0.0-1.0) */
  confidence: number
  /** Evidence supporting this detection */
  evidence: string[]
}

export type EmotionType =
  | 'happy'
  | 'excited'
  | 'joyful'
  | 'content'
  | 'calm'
  | 'grateful'
  | 'proud'
  | 'relieved'
  | 'curious'
  | 'surprised'
  | 'confused'
  | 'sad'
  | 'disappointed'
  | 'worried'
  | 'angry'
  | 'frustrated'
  | 'irritated'
  | 'neutral'

export interface EmotionPattern {
  /** Words/phrases indicating this emotion */
  keywords: string[]
  /** Emojis indicating this emotion */
  emojis: string[]
  /** Punctuation patterns */
  punctuation?: string[]
  /** Weight for this pattern (higher = stronger signal) */
  weight: number
  /** VAD values for this emotion */
  vad: { valence: number; arousal: number; dominance: number }
}

export interface ContextWindow {
  /** Previous messages in conversation */
  previousMessages: Array<{ text: string; emotion?: EmotionType; speaker?: string }>
  /** Current speaker */
  speaker: string
  /** Conversation topic (if known) */
  topic?: string
}

// ============================================================================
// EMOTION PATTERNS DATABASE
// ============================================================================

const EMOTION_PATTERNS: Record<EmotionType, EmotionPattern> = {
  // Positive High-Arousal Emotions
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

  joyful: {
    keywords: [
      'joy', 'bliss', 'overjoyed', 'radiant', 'gleeful', 'jubilant',
      'celebrating', 'rejoicing', 'blessed', 'thankful', 'grateful heart',
      'pure happiness', 'elation', 'rapture'
    ],
    emojis: ['😊', '🥰', '😇', '🌟', '💖', '🙏'],
    weight: 1.1,
    vad: { valence: 0.9, arousal: 0.6, dominance: 0.5 }
  },

  // Positive Low-Arousal Emotions
  content: {
    keywords: [
      'content', 'satisfied', 'pleased', 'comfortable', 'at ease',
      'fine', 'okay', 'alright', 'peaceful', 'serene', 'mellow',
      'settled', 'happy with', 'accepting'
    ],
    emojis: ['😌', '🙂', '😊', '✨'],
    weight: 0.9,
    vad: { valence: 0.7, arousal: 0.3, dominance: 0.6 }
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

  grateful: {
    keywords: [
      'grateful', 'thankful', 'appreciate', 'thanks', 'thank you',
      'blessed', 'fortunate', 'gratitude', 'indebted', 'obliged',
      'thankful for', 'grateful for', 'appreciate the'
    ],
    emojis: ['🙏', '😊', '🥰', '💖', '✨'],
    weight: 1.0,
    vad: { valence: 0.8, arousal: 0.4, dominance: 0.4 }
  },

  proud: {
    keywords: [
      'proud', 'pride', 'accomplished', 'achievement', 'succeeded',
      'did it', 'made it happen', 'successful', 'triumph', 'victory',
      'achieved', 'accomplishment', 'success'
    ],
    emojis: ['🏆', '🎖️', '👏', '😤', '💪', '🌟'],
    weight: 1.0,
    vad: { valence: 0.8, arousal: 0.5, dominance: 0.8 }
  },

  relieved: {
    keywords: [
      'relieved', 'whew', 'thank goodness', 'glad that\'s over',
      'finally over', 'it\'s okay', 'safe now', 'good news',
      'sigh of relief', 'breathing easy', 'worst is over'
    ],
    emojis: ['😅', '😮‍💨', '🤗', '😌'],
    weight: 1.0,
    vad: { valence: 0.6, arousal: 0.3, dominance: 0.5 }
  },

  // Cognitive States
  curious: {
    keywords: [
      'curious', 'interested', 'wonder', 'fascinating', 'interesting',
      'want to know', 'how does', 'why does', 'inquiring', 'intrigued',
      'curious about', 'interested in', 'tell me more'
    ],
    emojis: ['🤔', '🧐', '❓', '🤨', '💡'],
    weight: 0.9,
    vad: { valence: 0.55, arousal: 0.5, dominance: 0.5 }
  },

  surprised: {
    keywords: [
      'surprised', 'shocked', 'amazed', 'astonished', 'stunned',
      'didn\'t expect', 'wow', 'whoa', 'omg', 'gosh', 'unbelievable',
      'unexpected', 'suddenly', 'out of nowhere'
    ],
    emojis: ['😲', '😮', '🤯', '😱', '👀', '❗'],
    punctuation: ['!'],
    weight: 1.0,
    vad: { valence: 0.5, arousal: 0.85, dominance: 0.4 }
  },

  confused: {
    keywords: [
      'confused', 'confusing', 'don\'t understand', 'not sure',
      'unclear', 'puzzled', 'baffled', 'perplexed', 'lost',
      'what do you mean', 'huh', 'how come', 'doesn\'t make sense'
    ],
    emojis: ['😕', '🤨', '😐', '❓', '❔'],
    punctuation: ['???', '??'],
    weight: 1.0,
    vad: { valence: 0.4, arousal: 0.55, dominance: 0.3 }
  },

  // Negative Low-Arousal Emotions
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

  disappointed: {
    keywords: [
      'disappointed', 'let down', 'bummed', 'didn\'t work out',
      'hoped for better', 'expectations not met', 'anti-climactic',
      'not as good as', 'fell short', 'wish it was better'
    ],
    emojis: ['😞', '😔', '😣', '😩'],
    weight: 1.0,
    vad: { valence: 0.35, arousal: 0.35, dominance: 0.4 }
  },

  worried: {
    keywords: [
      'worried', 'concerned', 'anxious', 'nervous', 'apprehensive',
      'uneasy', 'troubled', 'trouble', 'fear', 'afraid', 'scared',
      'what if', 'don\'t know what to do', 'stress', 'stressing'
    ],
    emojis: ['😟', '😰', '😨', '😖', '🙏'],
    weight: 1.0,
    vad: { valence: 0.35, arousal: 0.65, dominance: 0.3 }
  },

  // Negative High-Arousal Emotions
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

  frustrated: {
    keywords: [
      'frustrated', 'frustrating', 'annoying', 'annoyed', 'irritating',
      'give up', 'why is this happening', 'can\'t believe this',
      'so difficult', 'struggling', 'stuck', 'blocked'
    ],
    emojis: ['😤', '😖', '😣', '😩', '🤬'],
    weight: 1.1,
    vad: { valence: 0.3, arousal: 0.75, dominance: 0.5 }
  },

  irritated: {
    keywords: [
      'irritated', 'irritating', 'annoyed', 'bothered', 'bugging',
      'getting on my nerves', 'ugh', 'seriously', 'whatever',
      'can\'t deal', 'so annoying'
    ],
    emojis: ['😒', '😑', '🙄', '😤'],
    weight: 1.0,
    vad: { valence: 0.35, arousal: 0.6, dominance: 0.4 }
  },

  neutral: {
    keywords: [
      'okay', 'alright', 'fine', 'sure', 'maybe', 'perhaps',
      'understand', 'I see', 'got it', 'noted', 'acknowledged'
    ],
    emojis: ['😐', '🙂', '👌'],
    weight: 0.5,
    vad: { valence: 0.5, arousal: 0.5, dominance: 0.5 }
  }
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
 * Analyze emotion from emojis
 */
function analyzeEmojis(text: string): Map<EmotionType, number> {
  const emojis = extractEmojis(text)
  const scores = new Map<EmotionType, number>()

  for (const [emotion, pattern] of Object.entries(EMOTION_PATTERNS)) {
    const matchCount = emojis.filter(e => pattern.emojis.includes(e)).length
    if (matchCount > 0) {
      scores.set(emotion as EmotionType, matchCount * pattern.weight * 0.8)
    }
  }

  return scores
}

// ============================================================================
// PUNCTUATION ANALYSIS
// ============================================================================

/**
 * Analyze emotion from punctuation patterns
 */
function analyzePunctuation(text: string): Map<EmotionType, number> {
  const scores = new Map<EmotionType, number>()

  // Count exclamation marks
  const exclamationCount = (text.match(/!/g) || []).length
  if (exclamationCount >= 3) {
    // Strong excitement or anger
    scores.set('excited', exclamationCount * 0.3)
    scores.set('angry', exclamationCount * 0.2)
    scores.set('surprised', exclamationCount * 0.2)
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
    scores.set('confused', questionCount * 0.4)
    scores.set('surprised', questionCount * 0.2)
  } else if (questionCount >= 2) {
    scores.set('curious', questionCount * 0.3)
    scores.set('confused', questionCount * 0.2)
  } else if (questionCount === 1) {
    scores.set('curious', 0.2)
  }

  // Check for ellipsis (uncertainty or trailing off)
  if (text.includes('...')) {
    scores.set('sad', 0.3)
    scores.set('disappointed', 0.2)
    scores.set('worried', 0.2)
  }

  // Check for all caps (high arousal)
  if (text === text.toUpperCase() && text.length > 5) {
    scores.set('angry', 0.4)
    scores.set('excited', 0.3)
    scores.set('frustrated', 0.3)
  }

  return scores
}

// ============================================================================
// KEYWORD ANALYSIS
// ============================================================================

/**
 * Analyze emotion from keywords
 */
function analyzeKeywords(text: string): Map<EmotionType, number> {
  const scores = new Map<EmotionType, number>()
  const lowerText = text.toLowerCase()

  for (const [emotion, pattern] of Object.entries(EMOTION_PATTERNS)) {
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
      scores.set(emotion as EmotionType, matchScore + bonus)
    }
  }

  return scores
}

// ============================================================================
// CONTEXT AWARENESS
// ============================================================================

/**
 * Adjust emotion scores based on conversation context
 */
function applyContext(
  scores: Map<EmotionType, number>,
  context?: ContextWindow
): Map<EmotionType, number> {
  if (!context || context.previousMessages.length === 0) {
    return scores
  }

  const adjusted = new Map(scores)

  // Look at previous emotion
  const lastEmotion = context.previousMessages[context.previousMessages.length - 1]?.emotion
  if (lastEmotion) {
    // Emotional inertia - previous emotion influences current
    const inertiaBoost = 0.15
    const currentScore = adjusted.get(lastEmotion) || 0
    adjusted.set(lastEmotion, currentScore + inertiaBoost)
  }

  // Check for emotional escalation or de-escalation
  if (context.previousMessages.length >= 2) {
    const secondLastEmotion = context.previousMessages[context.previousMessages.length - 2]?.emotion
    if (lastEmotion && secondLastEmotion) {
      // If same emotion persists, boost it (emotional persistence)
      if (lastEmotion === secondLastEmotion) {
        const currentScore = adjusted.get(lastEmotion) || 0
        adjusted.set(lastEmotion, currentScore + 0.1)
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
    // This speaker's typical emotional baseline
    const recentEmotions = speakerMessages.slice(-3).map(m => m.emotion)
    const emotionCounts = new Map<EmotionType, number>()
    for (const emotion of recentEmotions) {
      if (emotion) {
        emotionCounts.set(emotion, (emotionCounts.get(emotion) || 0) + 1)
      }
    }

    // Boost emotions that this speaker commonly expresses
    const countEntries = Array.from(emotionCounts.entries())
    for (const [emotion, count] of countEntries) {
      if (count >= 2) {
        const currentScore = adjusted.get(emotion) || 0
        adjusted.set(emotion, currentScore + 0.1)
      }
    }
  }

  return adjusted
}

// ============================================================================
// CONFIDENCE CALCULATION
// ============================================================================

/**
 * Calculate confidence in emotion detection
 */
function calculateConfidence(
  primaryScore: number,
  scores: Map<EmotionType, number>,
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
// MAIN EMOTION DETECTION
// ============================================================================

/**
 * Detect emotion from text with full analysis
 */
export function detectEmotion(
  text: string,
  context?: ContextWindow
): EmotionDetection {
  // Collect evidence
  const evidence: string[] = []

  // Analyze different signal types
  const keywordScores = analyzeKeywords(text)
  const emojiScores = analyzeEmojis(text)
  const punctuationScores = analyzePunctuation(text)

  // Combine all scores
  const combinedScores = new Map<EmotionType, number>()

  for (const emotion of Object.keys(EMOTION_PATTERNS) as EmotionType[]) {
    const total =
      (keywordScores.get(emotion) || 0) +
      (emojiScores.get(emotion) || 0) +
      (punctuationScores.get(emotion) || 0)

    if (total > 0) {
      combinedScores.set(emotion, total)
    }
  }

  // Apply context
  const contextAwareScores = applyContext(combinedScores, context)

  // Find primary emotion
  let primaryEmotion: EmotionType = 'neutral'
  let primaryScore = 0

  // Convert Map to array for iteration (ES5 compatible)
  const scoreEntries = Array.from(contextAwareScores.entries())
  for (const [emotion, score] of scoreEntries) {
    if (score > primaryScore) {
      primaryScore = score
      primaryEmotion = emotion
    }
  }

  // If no emotion detected, default to neutral
  if (primaryScore === 0) {
    primaryEmotion = 'neutral'
    primaryScore = 0.5
  }

  // Find secondary emotions
  const sortedScores = Array.from(contextAwareScores.entries())
    .sort((a, b) => b[1] - a[1])
    .filter(([emotion, score]) => emotion !== primaryEmotion && score > 0.3)

  const secondaryEmotions = sortedScores.slice(0, 2).map(([emotion, score]) => ({
    emotion,
    confidence: Math.min(1, score)
  }))

  // Calculate VAD values
  const baseVAD = EMOTION_PATTERNS[primaryEmotion].vad

  // Adjust VAD based on score strength
  const intensity = Math.min(1, primaryScore / 2)
  const valence = baseVAD.valence * (0.7 + intensity * 0.3)
  const arousal = baseVAD.arousal * (0.7 + intensity * 0.3)
  const dominance = baseVAD.dominance * (0.7 + intensity * 0.3)

  // Calculate confidence
  const confidence = calculateConfidence(primaryScore, contextAwareScores, text)

  // Collect evidence
  if (keywordScores.get(primaryEmotion)) {
    const pattern = EMOTION_PATTERNS[primaryEmotion]
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

  if (punctuationScores.get(primaryEmotion)) {
    evidence.push('Punctuation patterns detected')
  }

  return {
    emotion: primaryEmotion,
    secondaryEmotions: secondaryEmotions.length > 0 ? secondaryEmotions : undefined,
    valence,
    arousal,
    dominance,
    confidence,
    evidence
  }
}

/**
 * Batch detect emotions for multiple messages
 */
export function detectEmotionsBatch(
  messages: Array<{ text: string; speaker: string }>
): EmotionDetection[] {
  const results: EmotionDetection[] = []

  for (let i = 0; i < messages.length; i++) {
    const context: ContextWindow = {
      previousMessages: results.slice(Math.max(0, i - 5)).map((r, idx) => ({
        text: messages[i - (5 - idx)]?.text || '',
        emotion: r.emotion
      })),
      speaker: messages[i].speaker
    }

    results.push(detectEmotion(messages[i].text, context))
  }

  return results
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all available emotion types
 */
export function getEmotionTypes(): EmotionType[] {
  return Object.keys(EMOTION_PATTERNS) as EmotionType[]
}

/**
 * Get emotion pattern data
 */
export function getEmotionPattern(emotion: EmotionType): EmotionPattern | undefined {
  return EMOTION_PATTERNS[emotion]
}

/**
 * Check if emotion is positive
 */
export function isPositiveEmotion(emotion: EmotionType): boolean {
  const pattern = EMOTION_PATTERNS[emotion]
  return pattern ? pattern.vad.valence > 0.5 : false
}

/**
 * Check if emotion is high arousal
 */
export function isHighArousal(emotion: EmotionType): boolean {
  const pattern = EMOTION_PATTERNS[emotion]
  return pattern ? pattern.vad.arousal > 0.5 : false
}

/**
 * Get emotion intensity category
 */
export function getEmotionIntensity(emotion: EmotionType): 'low' | 'medium' | 'high' {
  const pattern = EMOTION_PATTERNS[emotion]
  if (!pattern) return 'medium'

  if (pattern.vad.arousal > 0.7) return 'high'
  if (pattern.vad.arousal > 0.4) return 'medium'
  return 'low'
}
