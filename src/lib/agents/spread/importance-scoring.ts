/**
 * Message Importance Scoring
 *
 * Analyzes and scores message importance based on multiple factors:
 * - Recency (more recent = higher score)
 * - Information density (unique content = higher score)
 * - Keywords (questions, decisions, code = higher score)
 * - User vs AI (user messages = higher score)
 * - Token count (longer messages usually more important)
 */

import { Message } from '@/types/conversation'

// ============================================================================
// IMPORTANCE FACTOR TYPES
// ============================================================================

export interface ImportanceFactors {
  recency: number           // 0-1, exponential decay
  informationDensity: number // 0-1, unique word ratio
  hasQuestions: boolean     // Questions increase importance
  hasDecisions: boolean     // Decisions increase importance
  hasCode: boolean          // Code increases importance
  isUserMessage: boolean    // User messages weighted higher
  tokenCount: number        // Absolute token count
  hasPreservable: boolean   // Has preservable marker
}

export interface MessageImportance {
  messageId: string
  score: number             // 0-1, overall importance
  confidence: number        // 0-1, how confident we are
  factors: ImportanceFactors
  rank?: number             // Rank when sorted among peers
}

// ============================================================================
// IMPORTANCE WEIGHTS
// ============================================================================

export interface ImportanceWeights {
  recency: number
  informationDensity: number
  hasQuestions: number
  hasDecisions: number
  hasCode: number
  isUserMessage: number
  hasPreservable: number
}

export const DEFAULT_WEIGHTS: ImportanceWeights = {
  recency: 0.15,
  informationDensity: 0.25,
  hasQuestions: 0.15,
  hasDecisions: 0.20,
  hasCode: 0.10,
  isUserMessage: 0.10,
  hasPreservable: 0.05
}

// ============================================================================
// KEYWORD PATTERNS
// ============================================================================

const QUESTION_KEYWORDS = [
  '?', 'how', 'what', 'why', 'when', 'where', 'which', 'who',
  'can', 'could', 'would', 'should', 'is', 'are', 'do', 'does'
]

const DECISION_KEYWORDS = [
  'decided', 'chose', 'selected', 'agreed', 'concluded',
  'determined', 'resolved', 'settled on', 'going with',
  'final', 'confirmed', 'approved'
]

const CODE_INDICATORS = [
  '```', 'function', 'const', 'let', 'var', 'class',
  'import', 'export', 'return', 'if', 'else', 'for',
  'while', 'async', 'await', 'try', 'catch'
]

// ============================================================================
// IMPORTANCE CALCULATION
// ============================================================================

/**
 * Calculates importance score for a single message.
 *
 * @param message - The message to score
 * @param conversation - All messages in the conversation
 * @param index - Message index in the conversation
 * @param weights - Optional custom weights
 * @returns Message importance score with factors
 */
export function calculateImportance(
  message: Message,
  conversation: Message[],
  index: number,
  weights: ImportanceWeights = DEFAULT_WEIGHTS
): MessageImportance {
  const factors: ImportanceFactors = {
    recency: calculateRecency(index, conversation.length),
    informationDensity: calculateInformationDensity(message),
    hasQuestions: hasKeywords(message, QUESTION_KEYWORDS),
    hasDecisions: hasKeywords(message, DECISION_KEYWORDS),
    hasCode: containsCode(message),
    isUserMessage: message.author === 'user',
    tokenCount: estimateTokens(message),
    hasPreservable: hasPreservableMarker(message)
  }

  // Calculate weighted score
  let score = 0

  score += factors.recency * weights.recency
  score += factors.informationDensity * weights.informationDensity
  score += (factors.hasQuestions ? 1 : 0) * weights.hasQuestions
  score += (factors.hasDecisions ? 1 : 0) * weights.hasDecisions
  score += (factors.hasCode ? 1 : 0) * weights.hasCode
  score += (factors.isUserMessage ? 1 : 0) * weights.isUserMessage
  score += (factors.hasPreservable ? 1 : 0) * weights.hasPreservable

  // Normalize score to 0-1 range
  score = Math.min(score, 1)

  // Calculate confidence based on token count
  // Longer messages give us more confidence in the score
  const confidence = Math.min(0.5 + (factors.tokenCount / 1000) * 0.5, 1)

  return {
    messageId: message.id,
    score,
    confidence,
    factors
  }
}

/**
 * Calculates recency score using exponential decay.
 *
 * Recent messages score higher. Decay rate makes last ~10 messages
 * significantly more important than older ones.
 *
 * @param index - Message index in conversation
 * @param total - Total message count
 * @returns Recency score 0-1
 */
export function calculateRecency(index: number, total: number): number {
  if (total <= 1) return 1

  const age = total - index

  // Exponential decay: more recent = higher score
  // Decay over last ~10 messages
  return Math.exp(-age / 10)
}

/**
 * Calculates information density based on unique word ratio.
 *
 * @param message - The message to analyze
 * @returns Density score 0-1
 */
export function calculateInformationDensity(message: Message): number {
  const text = message.content.text || ''

  if (text.length === 0) return 0

  const words = text.toLowerCase().split(/\s+/)

  if (words.length <= 1) return 1

  // Unique words ratio
  const uniqueWords = new Set(words)
  const density = uniqueWords.size / words.length

  // Boost density for longer messages with high uniqueness
  if (words.length > 20 && density > 0.7) {
    return Math.min(density * 1.2, 1)
  }

  return Math.min(density, 1)
}

/**
 * Checks if a message contains specific keywords.
 *
 * @param message - The message to check
 * @param keywords - Keywords to look for
 * @returns True if any keyword found
 */
export function hasKeywords(message: Message, keywords: string[]): boolean {
  const text = message.content.text?.toLowerCase() || ''

  return keywords.some(keyword => text.includes(keyword))
}

/**
 * Checks if a message contains code.
 *
 * @param message - The message to check
 * @returns True if code detected
 */
export function containsCode(message: Message): boolean {
  const text = message.content.text || ''

  // Check for code blocks
  if (text.includes('```')) return true

  // Check for code indicators
  const lowerText = text.toLowerCase()
  return CODE_INDICATORS.some(indicator => lowerText.includes(indicator))
}

/**
 * Estimates token count for a message.
 *
 * @param message - The message to estimate
 * @returns Estimated token count
 */
export function estimateTokens(message: Message): number {
  let text = ''

  if (message.content.text) {
    text += message.content.text
  }

  if (message.content.systemNote) {
    text += message.content.systemNote
  }

  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4)
}

/**
 * Checks if a message has a preservable marker.
 *
 * @param message - The message to check
 * @returns True if preservable marker found
 */
export function hasPreservableMarker(message: Message): boolean {
  const text = message.content.text?.toLowerCase() || ''
  const markers = ['[preserve]', '[important]', '[decision]', '[key]', '[critical]']

  return markers.some(marker => text.includes(marker))
}

// ============================================================================
// BATCH SCORING
// ============================================================================

/**
 * Calculates importance scores for all messages in a conversation.
 *
 * @param messages - Messages to score
 * @param weights - Optional custom weights
 * @returns Array of importance scores
 */
export function calculateAllImportance(
  messages: Message[],
  weights?: ImportanceWeights
): MessageImportance[] {
  return messages.map((msg, i) =>
    calculateImportance(msg, messages, i, weights)
  )
}

/**
 * Ranks messages by importance.
 *
 * @param scores - Importance scores
 * @returns Scores with rank property added
 */
export function rankByImportance(scores: MessageImportance[]): MessageImportance[] {
  const sorted = [...scores].sort((a, b) => b.score - a.score)

  return sorted.map((score, index) => ({
    ...score,
    rank: index + 1
  }))
}

/**
 * Gets top N most important messages.
 *
 * @param messages - Messages to rank
 * @param n - Number of top messages to return
 * @param weights - Optional custom weights
 * @returns Top N messages with their scores
 */
export function getTopImportant(
  messages: Message[],
  n: number,
  weights?: ImportanceWeights
): Array<{ message: Message; score: MessageImportance }> {
  const scores = calculateAllImportance(messages, weights)
  const ranked = rankByImportance(scores)

  return ranked.slice(0, n).map(score => ({
    message: messages.find(m => m.id === score.messageId)!,
    score
  }))
}

/**
 * Gets messages above importance threshold.
 *
 * @param messages - Messages to filter
 * @param threshold - Minimum importance score (0-1)
 * @param weights - Optional custom weights
 * @returns Messages above threshold
 */
export function getMessagesAboveThreshold(
  messages: Message[],
  threshold: number,
  weights?: ImportanceWeights
): Array<{ message: Message; score: MessageImportance }> {
  const scores = calculateAllImportance(messages, weights)

  return scores
    .filter(s => s.score >= threshold)
    .map(score => ({
      message: messages.find(m => m.id === score.messageId)!,
      score
    }))
}

// ============================================================================
// IMPORTANCE STATISTICS
// ============================================================================

export interface ImportanceStatistics {
  mean: number
  median: number
  stdDev: number
  min: number
  max: number
  distribution: {
    low: number      // 0.0 - 0.3
    medium: number   // 0.3 - 0.7
    high: number     // 0.7 - 1.0
  }
}

/**
 * Calculates statistics for importance scores.
 *
 * @param scores - Importance scores
 * @returns Statistical summary
 */
export function calculateImportanceStatistics(scores: MessageImportance[]): ImportanceStatistics {
  if (scores.length === 0) {
    return {
      mean: 0,
      median: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      distribution: { low: 0, medium: 0, high: 0 }
    }
  }

  const values = scores.map(s => s.score).sort((a, b) => a - b)

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  const median = values[Math.floor(values.length / 2)]
  const min = values[0]
  const max = values[values.length - 1]

  // Standard deviation
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)

  // Distribution
  const distribution = {
    low: values.filter(v => v < 0.3).length,
    medium: values.filter(v => v >= 0.3 && v < 0.7).length,
    high: values.filter(v => v >= 0.7).length
  }

  return {
    mean,
    median,
    stdDev,
    min,
    max,
    distribution
  }
}

// ============================================================================
// NORMALIZATION
// ============================================================================

/**
 * Normalizes importance scores to ensure they sum to 1.
 *
 * Useful for probability-based selection.
 *
 * @param scores - Scores to normalize
 * @returns Normalized scores
 */
export function normalizeScores(scores: MessageImportance[]): MessageImportance[] {
  const sum = scores.reduce((total, s) => total + s.score, 0)

  if (sum === 0) {
    return scores.map(s => ({ ...s, score: 0 }))
  }

  return scores.map(s => ({
    ...s,
    score: s.score / sum
  }))
}

/**
 * Applies temperature to importance scores.
 *
 * Higher temperature = more uniform distribution
 * Lower temperature = more peaked distribution
 *
 * @param scores - Scores to adjust
 * @param temperature - Temperature parameter (0.1 to 10)
 * @returns Temperature-adjusted scores
 */
export function applyTemperature(
  scores: MessageImportance[],
  temperature: number
): MessageImportance[] {
  if (temperature === 1) {
    return scores
  }

  return scores.map(s => ({
    ...s,
    score: Math.pow(s.score, 1 / temperature)
  }))
}
