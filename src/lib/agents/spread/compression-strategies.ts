/**
 * Compression Strategies and Redundancy Detection
 *
 * Provides multiple compression strategies:
 * - Lossless: Remove exact duplicates and near-duplicates
 * - Lossy: Summarize or remove low-importance messages
 * - Hybrid: Combine both approaches
 *
 * Also includes redundancy detection using similarity algorithms.
 */

import { Message } from '@/types/conversation'
import { estimateMessageTokens, estimateTotalTokens } from './optimizer'
import { calculateImportance } from './importance-scoring'

// ============================================================================
// REDUNDANCY TYPES
// ============================================================================

export type RedundancyReason = 'duplicate' | 'subset' | 'superset' | 'similar'

export interface MessageRedundancy {
  message: Message
  redundantWith: Message[]  // Messages this is redundant with
  similarity: number         // 0-1, how similar
  reason: RedundancyReason
  tokenSavings: number
}

export interface RedundancyAnalysis {
  redundantMessages: MessageRedundancy[]
  totalRedundantTokens: number
  compressionRatio: number    // How much can be saved (0-1)
  duplicateCount: number      // Exact/near-exact duplicates
  similarCount: number        // Similar but not identical
}

// ============================================================================
// SIMILARITY CALCULATION
// ============================================================================

/**
 * Calculates Jaccard similarity between two messages.
 *
 * Jaccard similarity = (intersection / union) of word sets.
 * Returns 1 for identical messages, 0 for completely different.
 *
 * @param msg1 - First message
 * @param msg2 - Second message
 * @returns Similarity score 0-1
 */
export function calculateJaccardSimilarity(msg1: Message, msg2: Message): number {
  const text1 = msg1.content.text?.toLowerCase() || ''
  const text2 = msg2.content.text?.toLowerCase() || ''

  const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 2))
  const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 2))

  if (words1.size === 0 && words2.size === 0) return 1
  if (words1.size === 0 || words2.size === 0) return 0

  // Calculate intersection
  let intersection = 0
  words1.forEach(word => {
    if (words2.has(word)) {
      intersection++
    }
  })

  // Calculate union
  const union = new Set<string>()
  words1.forEach(word => union.add(word))
  words2.forEach(word => union.add(word))

  return intersection / union.size
}

/**
 * Calculates cosine similarity between two messages.
 *
 * Uses word frequency vectors for more nuanced similarity.
 *
 * @param msg1 - First message
 * @param msg2 - Second message
 * @returns Similarity score 0-1
 */
export function calculateCosineSimilarity(msg1: Message, msg2: Message): number {
  const text1 = msg1.content.text?.toLowerCase() || ''
  const text2 = msg2.content.text?.toLowerCase() || ''

  const words1 = text1.split(/\s+/).filter(w => w.length > 2)
  const words2 = text2.split(/\s+/).filter(w => w.length > 2)

  if (words1.length === 0 && words2.length === 0) return 1
  if (words1.length === 0 || words2.length === 0) return 0

  // Build frequency maps
  const freq1 = new Map<string, number>()
  const freq2 = new Map<string, number>()

  for (const word of words1) {
    freq1.set(word, (freq1.get(word) || 0) + 1)
  }

  for (const word of words2) {
    freq2.set(word, (freq2.get(word) || 0) + 1)
  }

  // Calculate dot product and magnitudes
  let dotProduct = 0
  let mag1 = 0
  let mag2 = 0

  const allWords = new Set<string>()
  freq1.forEach((_, word) => allWords.add(word))
  freq2.forEach((_, word) => allWords.add(word))

  allWords.forEach(word => {
    const f1 = freq1.get(word) || 0
    const f2 = freq2.get(word) || 0

    dotProduct += f1 * f2
    mag1 += f1 * f1
    mag2 += f2 * f2
  })

  mag1 = Math.sqrt(mag1)
  mag2 = Math.sqrt(mag2)

  if (mag1 === 0 || mag2 === 0) return 0

  return dotProduct / (mag1 * mag2)
}

/**
 * Calculates combined similarity score.
 *
 * Uses multiple similarity metrics for robustness.
 *
 * @param msg1 - First message
 * @param msg2 - Second message
 * @returns Combined similarity score 0-1
 */
export function calculateSimilarity(msg1: Message, msg2: Message): number {
  const jaccard = calculateJaccardSimilarity(msg1, msg2)
  const cosine = calculateCosineSimilarity(msg1, msg2)

  // Weighted average (Jaccard is stricter, so give it more weight)
  return (jaccard * 0.6 + cosine * 0.4)
}

// ============================================================================
// REDUNDANCY DETECTION
// ============================================================================

/**
 * Detects redundant messages in a conversation.
 *
 * @param messages - Messages to analyze
 * @param similarityThreshold - Minimum similarity to consider redundant (default: 0.85)
 * @returns Redundancy analysis
 */
export function detectRedundancy(
  messages: Message[],
  similarityThreshold: number = 0.85
): RedundancyAnalysis {
  const redundantMessages: MessageRedundancy[] = []
  const processed = new Set<string>()
  let totalRedundantTokens = 0

  for (let i = 0; i < messages.length; i++) {
    if (processed.has(messages[i].id)) continue

    for (let j = i + 1; j < messages.length; j++) {
      if (processed.has(messages[j].id)) continue

      const similarity = calculateSimilarity(messages[i], messages[j])

      if (similarity >= similarityThreshold) {
        // Found redundancy
        const reason = classifyRedundancy(messages[i], messages[j], similarity)

        redundantMessages.push({
          message: messages[j],
          redundantWith: [messages[i]],
          similarity,
          reason,
          tokenSavings: estimateMessageTokens(messages[j])
        })

        totalRedundantTokens += estimateMessageTokens(messages[j])
        processed.add(messages[j].id)
      }
    }
  }

  // Count by reason
  const duplicateCount = redundantMessages.filter(r =>
    r.reason === 'duplicate' || r.similarity > 0.95
  ).length

  const similarCount = redundantMessages.filter(r =>
    r.reason === 'similar' && r.similarity <= 0.95
  ).length

  const compressionRatio = totalRedundantTokens / estimateTotalTokens(messages)

  return {
    redundantMessages,
    totalRedundantTokens,
    compressionRatio,
    duplicateCount,
    similarCount
  }
}

/**
 * Classifies the type of redundancy.
 *
 * @param msg1 - First message
 * @param msg2 - Second message
 * @param similarity - Similarity score
 * @returns Redundancy reason
 */
function classifyRedundancy(msg1: Message, msg2: Message, similarity: number): RedundancyReason {
  if (similarity > 0.98) {
    return 'duplicate'
  } else if (similarity > 0.85) {
    return 'similar'
  } else {
    return 'similar'
  }
}

/**
 * Groups similar messages into clusters.
 *
 * @param messages - Messages to cluster
 * @param threshold - Similarity threshold for clustering
 * @returns Array of message clusters
 */
export function clusterSimilarMessages(
  messages: Message[],
  threshold: number = 0.7
): Message[][] {
  const clusters: Message[][] = []
  const assigned = new Set<string>()

  for (const msg of messages) {
    if (assigned.has(msg.id)) continue

    // Start new cluster
    const cluster = [msg]
    assigned.add(msg.id)

    // Find similar messages
    for (const other of messages) {
      if (assigned.has(other.id)) continue

      const similarity = calculateSimilarity(msg, other)

      if (similarity >= threshold) {
        cluster.push(other)
        assigned.add(other.id)
      }
    }

    if (cluster.length > 1) {
      clusters.push(cluster)
    }
  }

  return clusters
}

// ============================================================================
// COMPRESSION QUALITY METRICS
// ============================================================================

export interface CompressionQuality {
  preservedInformation: number    // 0-1, how much info kept
  semanticPreservation: number    // 0-1, semantic similarity
  structuralIntegrity: number     // 0-1, conversation flow maintained
  overallScore: number            // 0-1, combined quality score
}

/**
 * Measures quality of compression result.
 *
 * Compares original vs compressed messages.
 *
 * @param original - Original messages
 * @param compressed - Compressed messages
 * @returns Quality metrics
 */
export function measureCompressionQuality(
  original: Message[],
  compressed: Message[]
): CompressionQuality {
  // Information preserved (by token count)
  const originalTokens = estimateTotalTokens(original)
  const compressedTokens = estimateTotalTokens(compressed)
  const preservedInformation = compressedTokens / originalTokens

  // Semantic preservation (average similarity)
  let totalSimilarity = 0
  let comparisons = 0

  for (const origMsg of original) {
    const compMsg = compressed.find(m => m.id === origMsg.id)
    if (compMsg) {
      totalSimilarity += calculateSimilarity(origMsg, compMsg)
      comparisons++
    }
  }

  const semanticPreservation = comparisons > 0 ? totalSimilarity / comparisons : 0

  // Structural integrity (message order maintained)
  const structuralIntegrity = calculateStructuralIntegrity(original, compressed)

  // Overall score (weighted average)
  const overallScore =
    preservedInformation * 0.3 +
    semanticPreservation * 0.5 +
    structuralIntegrity * 0.2

  return {
    preservedInformation,
    semanticPreservation,
    structuralIntegrity,
    overallScore
  }
}

/**
 * Calculates if message order is preserved.
 *
 * @param original - Original messages
 * @param compressed - Compressed messages
 * @returns Structural integrity score 0-1
 */
function calculateStructuralIntegrity(original: Message[], compressed: Message[]): number {
  if (compressed.length === 0) return 0

  const compressedIds = compressed.map(m => m.id)
  let preserved = 0

  for (let i = 0; i < compressed.length - 1; i++) {
    const currentIdx = original.findIndex(m => m.id === compressedIds[i])
    const nextIdx = original.findIndex(m => m.id === compressedIds[i + 1])

    if (currentIdx !== -1 && nextIdx !== -1 && nextIdx > currentIdx) {
      preserved++
    }
  }

  return compressed.length > 1 ? preserved / (compressed.length - 1) : 1
}

// ============================================================================
// LOSSLESS COMPRESSION
// ============================================================================

/**
 * Applies lossless compression by removing duplicates.
 *
 * @param messages - Messages to compress
 * @param redundancy - Pre-computed redundancy analysis
 * @returns Compressed messages
 */
export function applyLosslessCompression(
  messages: Message[],
  redundancy: RedundancyAnalysis
): Message[] {
  const toRemove = new Set(
    redundancy.redundantMessages
      .filter(r => r.reason === 'duplicate')
      .map(r => r.message.id)
  )

  return messages.filter(msg => !toRemove.has(msg.id))
}

// ============================================================================
// LOSSY COMPRESSION
// ============================================================================

/**
 * Applies lossy compression based on importance scores.
 *
 * @param messages - Messages to compress
 * @param targetTokens - Target token count
 * @param minImportance - Minimum importance to keep (default: 0.3)
 * @returns Compressed messages
 */
export function applyLossyCompression(
  messages: Message[],
  targetTokens: number,
  minImportance: number = 0.3
): Message[] {
  // Calculate importance
  const importance = messages.map((msg, i) =>
    calculateImportance(msg, messages, i)
  )

  // Sort by importance
  const sorted = messages
    .map((msg, i) => ({ message: msg, importance: importance[i] }))
    .sort((a, b) => b.importance.score - a.importance.score)

  // Keep until target reached
  const compressed: Message[] = []
  let tokens = 0

  for (const { message, importance: score } of sorted) {
    const msgTokens = estimateMessageTokens(message)

    if (score.score >= minImportance && tokens + msgTokens <= targetTokens) {
      compressed.push(message)
      tokens += msgTokens
    }

    if (tokens >= targetTokens) break
  }

  // Preserve original order
  compressed.sort((a, b) =>
    messages.findIndex(m => m.id === a.id) - messages.findIndex(m => m.id === b.id)
  )

  return compressed
}

// ============================================================================
// HYBRID COMPRESSION
// ============================================================================

/**
 * Applies hybrid compression (lossless + lossy).
 *
 * @param messages - Messages to compress
 * @param targetTokens - Target token count
 * @returns Compressed messages
 */
export function applyHybridCompression(
  messages: Message[],
  targetTokens: number
): Message[] {
  // First, apply lossless
  const redundancy = detectRedundancy(messages)
  let compressed = applyLosslessCompression(messages, redundancy)

  // If still too large, apply lossy
  if (estimateTotalTokens(compressed) > targetTokens) {
    compressed = applyLossyCompression(compressed, targetTokens, 0.3)
  }

  return compressed
}

// ============================================================================
// SUMMARIZATION STRATEGIES
// ============================================================================

/**
 * Summarizes a group of similar messages into one.
 *
 * @param messages - Messages to summarize
 * @returns Summary text
 */
export function summarizeMessageGroup(messages: Message[]): string {
  if (messages.length === 0) return ''
  if (messages.length === 1) return messages[0].content.text || ''

  // Extract key points from each message
  const keyPoints: string[] = []

  for (const msg of messages) {
    const text = msg.content.text || ''
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)

    if (sentences.length > 0) {
      keyPoints.push(sentences[0].trim())
    }
  }

  // Combine key points
  const uniquePoints = [...new Set(keyPoints)]

  if (uniquePoints.length === 1) {
    return uniquePoints[0]
  }

  return `${uniquePoints.slice(0, 3).join('. ')}... (summarized from ${messages.length} similar messages)`
}

/**
 * Creates a summary message for a group of messages.
 *
 * @param messages - Messages to summarize
 * @param conversationId - Conversation ID
 * @returns Summary message
 */
export function createSummaryMessage(messages: Message[], conversationId: string): Message {
  const summary = summarizeMessageGroup(messages)

  return {
    id: `summary_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    conversationId,
    type: 'system',
    author: { type: 'system', reason: 'compression' },
    content: {
      systemNote: `Summarized ${messages.length} messages`,
      text: summary
    },
    timestamp: new Date().toISOString(),
    metadata: {
      isAgentMessage: true,
      agentResponse: {
        type: 'background',
        metadata: {
          summarizedCount: messages.length,
          originalIds: messages.map(m => m.id)
        }
      }
    }
  }
}
