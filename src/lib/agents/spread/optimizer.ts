/**
 * Context Optimization Engine
 *
 * Intelligently reduces token usage while preserving important information.
 * Uses importance scoring, redundancy detection, and compression strategies.
 */

import { Message } from '@/types/conversation'
import { calculateImportance, type MessageImportance } from './importance-scoring'
import { detectRedundancy, type RedundancyAnalysis } from './compression-strategies'

// ============================================================================
// COMPRESSION RESULT TYPES
// ============================================================================

export type CompressionStrategy = 'lossless' | 'lossy' | 'hybrid' | 'none'

export interface CompressionResult {
  originalMessages: Message[]
  compressedMessages: Message[]
  originalTokens: number
  compressedTokens: number
  compressionRatio: number  // 0-1, where 1 = 100% reduction
  strategy: CompressionStrategy
  removedCount: number
  summary?: string
}

export interface PreservableMarker {
  marker: string
  description: string
  priority: number  // Higher = more important
}

// ============================================================================
// PRESERVABLE MARKERS
// ============================================================================

/**
 * Messages containing these markers will always be preserved during compression.
 */
export const PRESERVABLE_MARKERS: PreservableMarker[] = [
  { marker: '[PRESERVE]', description: 'User marked to preserve', priority: 100 },
  { marker: '[IMPORTANT]', description: 'Important message', priority: 95 },
  { marker: '[DECISION]', description: 'Key decision made', priority: 90 },
  { marker: '[KEY]', description: 'Key information', priority: 85 },
  { marker: '[CRITICAL]', description: 'Critical information', priority: 100 },
]

/**
 * Checks if a message has a preservable marker.
 */
export function hasPreservableMarker(message: Message): boolean {
  const text = message.content.text?.toLowerCase() || ''
  return PRESERVABLE_MARKERS.some(pm => text.toLowerCase().includes(pm.marker.toLowerCase()))
}

/**
 * Gets the highest priority marker from a message.
 */
export function getPreservableMarker(message: Message): PreservableMarker | null {
  const text = message.content.text?.toLowerCase() || ''

  let highestPriority: PreservableMarker | null = null

  for (const marker of PRESERVABLE_MARKERS) {
    if (text.toLowerCase().includes(marker.marker.toLowerCase())) {
      if (!highestPriority || marker.priority > highestPriority.priority) {
        highestPriority = marker
      }
    }
  }

  return highestPriority
}

/**
 * Adds a preservable marker to a message.
 */
export function addPreservableMarker(message: Message, marker: string): Message {
  return {
    ...message,
    content: {
      ...message.content,
      text: `${marker} ${message.content.text || ''}`
    }
  }
}

// ============================================================================
// TOKEN ESTIMATION
// ============================================================================

/**
 * Estimates token count for a message.
 */
export function estimateMessageTokens(message: Message): number {
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
 * Estimates total token count for an array of messages.
 */
export function estimateTotalTokens(messages: Message[]): number {
  return messages.reduce((sum, msg) => sum + estimateMessageTokens(msg), 0)
}

// ============================================================================
// CONTEXT OPTIMIZER CLASS
// ============================================================================

export class ContextOptimizer {
  private targetTokenPercentage: number

  constructor(targetTokenPercentage: number = 0.8) {
    this.targetTokenPercentage = targetTokenPercentage
  }

  /**
   * Compresses a conversation's context to fit within target token count.
   *
   * @param messages - Messages to compress
   * @param targetTokens - Target token count
   * @param strategy - Compression strategy to use
   * @returns Promise resolving to compression result
   */
  async compressContext(
    messages: Message[],
    targetTokens: number,
    strategy: CompressionStrategy = 'hybrid'
  ): Promise<CompressionResult> {
    const currentTokens = estimateTotalTokens(messages)

    // If already under target, no compression needed
    if (currentTokens <= targetTokens) {
      return {
        originalMessages: messages,
        compressedMessages: messages,
        originalTokens: currentTokens,
        compressedTokens: currentTokens,
        compressionRatio: 0,
        strategy: 'none',
        removedCount: 0
      }
    }

    // Calculate importance scores
    const importanceScores = messages.map((msg, i) =>
      calculateImportance(msg, messages, i)
    )

    // Mark messages with preservable markers as highest importance
    importanceScores.forEach((score, i) => {
      if (hasPreservableMarker(messages[i])) {
        score.score = 1.0
        score.factors.hasDecisions = true
      }
    })

    // Apply compression strategy
    let compressed: Message[]

    switch (strategy) {
      case 'lossless':
        compressed = await this.losslessCompression(messages, importanceScores, targetTokens)
        break

      case 'lossy':
        compressed = await this.lossyCompression(messages, importanceScores, targetTokens)
        break

      case 'hybrid':
        compressed = await this.hybridCompression(messages, importanceScores, targetTokens)
        break

      default:
        compressed = messages
    }

    const compressedTokens = estimateTotalTokens(compressed)
    const compressionRatio = (currentTokens - compressedTokens) / currentTokens

    return {
      originalMessages: messages,
      compressedMessages: compressed,
      originalTokens: currentTokens,
      compressedTokens,
      compressionRatio,
      strategy,
      removedCount: messages.length - compressed.length
    }
  }

  /**
   * Lossless compression: removes only redundant/duplicate messages.
   */
  private async losslessCompression(
    messages: Message[],
    scores: MessageImportance[],
    targetTokens: number
  ): Promise<Message[]> {
    // Detect redundant messages
    const redundancy = detectRedundancy(messages)
    const toRemove = new Set(
      redundancy.redundantMessages
        .filter(r => r.reason === 'duplicate')
        .map(r => r.message.id)
    )

    // Keep messages with preservable markers
    const toKeep = new Set(
      messages
        .filter(m => hasPreservableMarker(m))
        .map(m => m.id)
    )

    const compressed = messages.filter(msg =>
      toKeep.has(msg.id) || !toRemove.has(msg.id)
    )

    return compressed
  }

  /**
   * Lossy compression: removes low-importance messages and summarizes others.
   */
  private async lossyCompression(
    messages: Message[],
    scores: MessageImportance[],
    targetTokens: number
  ): Promise<Message[]> {
    // Sort by importance (descending)
    const sorted = messages
      .map((msg, i) => ({ message: msg, score: scores[i] }))
      .sort((a, b) => b.score.score - a.score.score)

    // Keep most important until target reached
    const compressed: Message[] = []
    let tokens = 0

    for (const { message, score } of sorted) {
      const msgTokens = estimateMessageTokens(message)

      if (tokens + msgTokens <= targetTokens) {
        // Keep message as-is
        compressed.push(message)
        tokens += msgTokens
      } else if (tokens < targetTokens * 0.9) {
        // Try to summarize if we have space
        const summary = await this.summarizeMessage(message)
        const summaryTokens = estimateMessageTokens({
          ...message,
          content: { text: summary }
        })

        if (tokens + summaryTokens <= targetTokens) {
          compressed.push({
            ...message,
            content: {
              ...message.content,
              text: `[Summary: ${summary}]`
            }
          })
          tokens += summaryTokens
        }
      }

      if (tokens >= targetTokens) break
    }

    // Preserve original order
    compressed.sort((a, b) =>
      messages.findIndex(m => m.id === a.id) - messages.findIndex(m => m.id === b.id)
    )

    return compressed
  }

  /**
   * Hybrid compression: combines lossless and lossy strategies.
   */
  private async hybridCompression(
    messages: Message[],
    scores: MessageImportance[],
    targetTokens: number
  ): Promise<Message[]> {
    // First, apply lossless (remove redundancy)
    let compressed = await this.losslessCompression(messages, scores, Infinity)

    // Re-calculate scores for compressed set
    const compressedScores = compressed.map((msg, i) =>
      calculateImportance(msg, compressed, i)
    )

    // If still too large, apply lossy
    if (estimateTotalTokens(compressed) > targetTokens) {
      compressed = await this.lossyCompression(compressed, compressedScores, targetTokens)
    }

    return compressed
  }

  /**
   * Summarizes a single message.
   */
  private async summarizeMessage(message: Message): Promise<string> {
    const text = message.content.text || ''

    // Simple summarization (in production, use LLM)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)

    if (sentences.length <= 2) {
      return text
    }

    // Keep first and last sentence
    return `${sentences[0].trim()}. [...] ${sentences[sentences.length - 1].trim()}.`
  }

  /**
   * Generates a summary of multiple messages.
   */
  async summarizeMessages(messages: Message[]): Promise<string> {
    const userMessages = messages.filter(m => m.author === 'user')
    const aiMessages = messages.filter(m => m.author !== 'user')

    const topics = this.extractTopics(messages)
    const keyPoints = this.extractKeyPoints(messages)

    let summary = `Summary of ${messages.length} messages:\n\n`

    if (topics.length > 0) {
      summary += `**Topics:** ${topics.join(', ')}\n\n`
    }

    if (keyPoints.length > 0) {
      summary += `**Key Points:**\n${keyPoints.map(p => `- ${p}`).join('\n')}\n\n`
    }

    summary += `Includes ${userMessages.length} user messages and ${aiMessages.length} AI responses.`

    return summary
  }

  /**
   * Extracts main topics from messages.
   */
  private extractTopics(messages: Message[]): string[] {
    // Simple topic extraction based on keywords
    const allText = messages.map(m => m.content.text || '').join(' ').toLowerCase()

    const commonWords = [
      'api', 'database', 'ui', 'frontend', 'backend', 'auth',
      'test', 'deploy', 'build', 'config', 'feature', 'bug',
      'design', 'implement', 'refactor', 'optimize', 'fix'
    ]

    const found = commonWords.filter(word => allText.includes(word))

    return found.slice(0, 5)
  }

  /**
   * Extracts key points from messages.
   */
  private extractKeyPoints(messages: Message[]): string[] {
    const points: string[] = []

    for (const msg of messages) {
      const text = msg.content.text || ''

      // Look for decision markers
      if (text.toLowerCase().includes('decided')) {
        const sentences = text.split(/[.!?]+/).filter(s => s.toLowerCase().includes('decided'))
        points.push(...sentences.slice(0, 2).map(s => s.trim()))
      }

      // Look for questions
      if (text.includes('?')) {
        const questions = text.split('?').filter(s => s.trim().length > 10)
        points.push(...questions.slice(0, 2).map(s => s.trim() + '?'))
      }

      if (points.length >= 5) break
    }

    return points.slice(0, 5)
  }

  /**
   * Auto-optimizes context when approaching threshold.
   */
  async autoOptimize(
    messages: Message[],
    maxTokens: number,
    currentThreshold: number
  ): Promise<CompressionResult | null> {
    const currentTokens = estimateTotalTokens(messages)
    const threshold = Math.floor(maxTokens * currentThreshold)

    // Only optimize if at or above threshold
    if (currentTokens < threshold) {
      return null
    }

    // Compress to 80% of threshold
    const targetTokens = Math.floor(threshold * this.targetTokenPercentage)

    return this.compressContext(messages, targetTokens, 'hybrid')
  }

  /**
   * Checks if context needs optimization.
   */
  needsOptimization(messages: Message[], maxTokens: number, threshold: number): boolean {
    const currentTokens = estimateTotalTokens(messages)
    return currentTokens >= Math.floor(maxTokens * threshold)
  }
}

// ============================================================================
// OPTIMIZATION SUGGESTIONS
// ============================================================================

export interface OptimizationSuggestion {
  type: 'remove_redundant' | 'summarize' | 'preserve' | 'none'
  messageIds: string[]
  reason: string
  estimatedSavings: number
}

/**
 * Generates optimization suggestions for a conversation.
 */
export function generateOptimizationSuggestions(
  messages: Message[],
  importanceScores: MessageImportance[],
  redundancy: RedundancyAnalysis
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = []

  // Suggest removing redundant messages
  if (redundancy.redundantMessages.length > 0) {
    const duplicates = redundancy.redundantMessages.filter(r => r.reason === 'duplicate')
    if (duplicates.length > 0) {
      suggestions.push({
        type: 'remove_redundant',
        messageIds: duplicates.map(d => d.message.id),
        reason: `Remove ${duplicates.length} duplicate messages`,
        estimatedSavings: redundancy.totalRedundantTokens
      })
    }
  }

  // Suggest summarizing low-importance messages
  const lowImportance = importanceScores
    .filter(s => s.score < 0.3 && !hasPreservableMarker(messages[importanceScores.indexOf(s)]))
    .slice(0, 10)

  if (lowImportance.length > 0) {
    const tokens = lowImportance.reduce((sum, s) => sum + s.factors.tokenCount, 0)
    suggestions.push({
      type: 'summarize',
      messageIds: lowImportance.map(s => s.messageId),
      reason: `Summarize ${lowImportance.length} low-importance messages`,
      estimatedSavings: Math.floor(tokens * 0.7)
    })
  }

  return suggestions
}
