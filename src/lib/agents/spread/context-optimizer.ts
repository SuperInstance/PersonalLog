/**
 * Context Optimization Engine for Spreader Agent
 *
 * Intelligently prioritizes and optimizes context for message management.
 * Uses multi-factor scoring to keep the most important messages within token limits.
 */

import { Message } from '@/types/conversation'
import {
  calculateImportance,
  type MessageImportance,
  type ImportanceWeights
} from './importance-scoring'
import { estimateMessageTokens, estimateTotalTokens } from './optimizer'

// ============================================================================
// ENHANCED SCORING TYPES
// ============================================================================

/**
 * Enhanced scoring factors with more granular control.
 */
export interface EnhancedMessageScore {
  messageId: string

  // Scoring components (0-1 each)
  recency: number           // Recent messages score higher
  relevance: number         // Semantic similarity to task/goal
  hierarchy: number         // User > Assistant > System
  task: number              // Task-specific importance
  informationDensity: number // Unique content ratio

  // Combined score
  total: number             // Weighted combination (0-1)

  // Metadata
  confidence: number        // How confident we are (0-1)
  tokenCount: number        // Estimated tokens
  preserve: boolean         // Force-preserve this message
  rank?: number             // Rank when sorted
}

/**
 * Scoring weight configuration.
 */
export interface ScoringWeights {
  recency: number
  relevance: number
  hierarchy: number
  task: number
  informationDensity: number
}

/**
 * Default scoring weights.
 */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  recency: 0.20,
  relevance: 0.30,
  hierarchy: 0.15,
  task: 0.20,
  informationDensity: 0.15
}

// ============================================================================
// TASK ANALYSIS TYPES
// ============================================================================

/**
 * Task requirements for context optimization.
 */
export interface TaskContextRequirements {
  // Task description
  task: string
  taskType: 'code' | 'writing' | 'analysis' | 'general' | 'research'

  // Keywords relevant to this task
  keywords: string[]

  // Required context size
  minTokens: number
  maxTokens: number

  // Priority (affects how aggressively we prune)
  priority: 'low' | 'medium' | 'high'

  // Which messages are explicitly required
  requiredMessageIds: string[]
}

/**
 * Analyzed task requirements.
 */
export interface AnalyzedTaskRequirements {
  taskType: TaskContextRequirements['taskType']
  keywords: string[]
  minContextSize: number
  maxContextSize: number
  priorityLevel: number  // 0-1
  requiredIds: Set<string>
}

// ============================================================================
// CONTEXT OPTIMIZATION RESULT
// ============================================================================

/**
 * Result of context optimization.
 */
export interface ContextOptimizationResult {
  // Input/output
  originalMessages: Message[]
  optimizedMessages: Message[]

  // Token metrics
  originalTokens: number
  optimizedTokens: number
  tokensSaved: number
  savingsPercentage: number

  // Message changes
  messagesRemoved: number
  messagesKept: number
  preservedCount: number  // Force-preserved messages

  // Scoring information
  scores: EnhancedMessageScore[]

  // Strategy used
  strategy: OptimizationStrategy

  // Performance metrics
  processingTime: number  // milliseconds

  // Summary
  summary: string
}

/**
 * Optimization strategy used.
 */
export type OptimizationStrategy =
  | 'none'           // No optimization needed
  | 'preserve_only'  // Only kept preserved messages
  | 'threshold'      // Removed messages below threshold
  | 'budget'         // Fit within token budget
  | 'task_specific'  // Optimized for specific task

// ============================================================================
// CONTEXT OPTIMIZER CONFIGURATION
// ============================================================================

/**
 * Configuration for context optimizer.
 */
export interface ContextOptimizerConfig {
  // Token budgets
  maxTokens: number
  warningThreshold: number  // Percentage (0-1)
  criticalThreshold: number // Percentage (0-1)

  // Scoring weights
  weights: ScoringWeights

  // Optimization thresholds
  minScoreThreshold: number  // Keep messages with score >= this
  preserveMarkers: string[]  // Markers that force preservation

  // Compaction settings
  enableSummarization: boolean
  enableDeduplication: boolean
  enableMetadataStripping: boolean

  // Logging
  enableMetrics: boolean
  logLevel: 'none' | 'basic' | 'detailed'
}

/**
 * Default configuration.
 */
export const DEFAULT_OPTIMIZER_CONFIG: ContextOptimizerConfig = {
  maxTokens: 128000,
  warningThreshold: 0.60,
  criticalThreshold: 0.85,

  weights: DEFAULT_SCORING_WEIGHTS,

  minScoreThreshold: 0.3,
  preserveMarkers: ['[PRESERVE]', '[IMPORTANT]', '[DECISION]', '[KEY]', '[CRITICAL]'],

  enableSummarization: true,
  enableDeduplication: true,
  enableMetadataStripping: true,

  enableMetrics: true,
  logLevel: 'basic'
}

// ============================================================================
// CONTEXT METRICS
// ============================================================================

/**
 * Context optimization metrics.
 */
export interface ContextMetrics {
  // Optimization operations
  totalOptimizations: number
  totalTokensSaved: number
  totalTimeSpent: number  // milliseconds

  // Average metrics
  avgSavingsPercentage: number
  avgProcessingTime: number

  // Strategy distribution
  strategyCounts: Record<OptimizationStrategy, number>

  // Message statistics
  totalMessagesProcessed: number
  totalMessagesRemoved: number
  totalMessagesPreserved: number

  // Timestamps
  lastOptimization: string | null
  firstOptimization: string | null
}

/**
 * Metrics tracker for context optimizer.
 */
class ContextMetricsTracker {
  private metrics: ContextMetrics = {
    totalOptimizations: 0,
    totalTokensSaved: 0,
    totalTimeSpent: 0,
    avgSavingsPercentage: 0,
    avgProcessingTime: 0,
    strategyCounts: {
      none: 0,
      preserve_only: 0,
      threshold: 0,
      budget: 0,
      task_specific: 0
    },
    totalMessagesProcessed: 0,
    totalMessagesRemoved: 0,
    totalMessagesPreserved: 0,
    lastOptimization: null,
    firstOptimization: null
  }

  record(result: ContextOptimizationResult): void {
    this.metrics.totalOptimizations++
    this.metrics.totalTokensSaved += result.tokensSaved
    this.metrics.totalTimeSpent += result.processingTime
    this.metrics.strategyCounts[result.strategy]++
    this.metrics.totalMessagesProcessed += result.originalMessages.length
    this.metrics.totalMessagesRemoved += result.messagesRemoved
    this.metrics.totalMessagesPreserved += result.preservedCount

    // Update averages
    this.metrics.avgSavingsPercentage =
      (this.metrics.avgSavingsPercentage * (this.metrics.totalOptimizations - 1) +
        result.savingsPercentage) / this.metrics.totalOptimizations

    this.metrics.avgProcessingTime =
      (this.metrics.avgProcessingTime * (this.metrics.totalOptimizations - 1) +
        result.processingTime) / this.metrics.totalOptimizations

    // Update timestamps
    const now = new Date().toISOString()
    if (!this.metrics.firstOptimization) {
      this.metrics.firstOptimization = now
    }
    this.metrics.lastOptimization = now
  }

  getMetrics(): ContextMetrics {
    return { ...this.metrics }
  }

  reset(): void {
    this.metrics = {
      totalOptimizations: 0,
      totalTokensSaved: 0,
      totalTimeSpent: 0,
      avgSavingsPercentage: 0,
      avgProcessingTime: 0,
      strategyCounts: {
        none: 0,
        preserve_only: 0,
        threshold: 0,
        budget: 0,
        task_specific: 0
      },
      totalMessagesProcessed: 0,
      totalMessagesRemoved: 0,
      totalMessagesPreserved: 0,
      lastOptimization: null,
      firstOptimization: null
    }
  }
}

// ============================================================================
// CONTEXT OPTIMIZER CLASS
// ============================================================================

/**
 * Intelligent context optimizer for Spreader agent.
 *
 * Optimizes conversation context by:
 * 1. Scoring messages on multiple factors
 * 2. Prioritizing important messages
 * 3. Removing redundant/low-value content
 * 4. Adapting to task requirements
 */
export class ContextOptimizerEngine {
  private config: ContextOptimizerConfig
  private metrics: ContextMetricsTracker

  constructor(config: Partial<ContextOptimizerConfig> = {}) {
    this.config = { ...DEFAULT_OPTIMIZER_CONFIG, ...config }
    this.metrics = new ContextMetricsTracker()
  }

  /**
   * Optimize context for general use.
   */
  async optimize(messages: Message[]): Promise<ContextOptimizationResult> {
    const startTime = performance.now()
    const originalTokens = estimateTotalTokens(messages)

    // If already under budget, no optimization needed
    if (originalTokens <= this.config.maxTokens * this.config.warningThreshold) {
      return this.createResult(
        messages,
        messages,
        startTime,
        'none',
        'Context already within safe limits'
      )
    }

    // Calculate enhanced scores
    const scores = await this.calculateScores(messages)

    // Determine optimal strategy
    const strategy = this.determineStrategy(messages, scores)

    // Apply optimization
    const optimized = await this.applyOptimization(messages, scores, strategy)

    const endTime = performance.now()

    const result = this.createResult(
      messages,
      optimized,
      startTime,
      strategy,
      this.generateSummary(messages, optimized, scores)
    )

    // Record metrics
    if (this.config.enableMetrics) {
      this.metrics.record(result)
    }

    return result
  }

  /**
   * Optimize context for a specific task.
   */
  async optimizeForTask(
    messages: Message[],
    task: TaskContextRequirements
  ): Promise<ContextOptimizationResult> {
    const startTime = performance.now()

    // Analyze task requirements
    const requirements = this.analyzeTaskRequirements(task)

    // Calculate task-aware scores
    const scores = await this.calculateScores(messages, requirements)

    // Apply task-specific optimization
    const optimized = await this.applyTaskOptimization(messages, scores, requirements)

    const endTime = performance.now()

    const result = this.createResult(
      messages,
      optimized,
      startTime,
      'task_specific',
      `Optimized for task: ${task.task}`
    )

    // Record metrics
    if (this.config.enableMetrics) {
      this.metrics.record(result)
    }

    return result
  }

  /**
   * Calculate enhanced scores for messages.
   */
  private async calculateScores(
    messages: Message[],
    task?: AnalyzedTaskRequirements
  ): Promise<EnhancedMessageScore[]> {
    const scores: EnhancedMessageScore[] = []

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i]

      // Base importance score
      const baseImportance = calculateImportance(message, messages, i)

      // Enhanced scoring
      const enhancedScore: EnhancedMessageScore = {
        messageId: message.id,
        recency: this.scoreRecency(i, messages.length),
        relevance: task ? this.scoreRelevance(message, task) : 0.5,
        hierarchy: this.scoreHierarchy(message),
        task: task ? this.scoreTaskRelevance(message, task) : 0.5,
        informationDensity: baseImportance.factors.informationDensity,
        total: 0, // Calculated below
        confidence: baseImportance.confidence,
        tokenCount: estimateMessageTokens(message),
        preserve: this.shouldPreserve(message)
      }

      // Calculate weighted total
      const weights = this.config.weights
      enhancedScore.total =
        enhancedScore.recency * weights.recency +
        enhancedScore.relevance * weights.relevance +
        enhancedScore.hierarchy * weights.hierarchy +
        enhancedScore.task * weights.task +
        enhancedScore.informationDensity * weights.informationDensity

      // Boost preserved messages to 1.0
      if (enhancedScore.preserve) {
        enhancedScore.total = 1.0
      }

      scores.push(enhancedScore)
    }

    // Normalize scores to 0-1
    this.normalizeScores(scores)

    // Assign ranks
    this.assignRanks(scores)

    return scores
  }

  /**
   * Score message recency (exponential decay).
   */
  private scoreRecency(index: number, total: number): number {
    if (total <= 1) return 1

    const age = total - index
    return Math.exp(-age / 10)
  }

  /**
   * Score message relevance to task keywords.
   */
  private scoreRelevance(message: Message, task: AnalyzedTaskRequirements): number {
    const text = message.content.text?.toLowerCase() || ''

    if (task.keywords.length === 0) return 0.5

    // Count matching keywords
    const matches = task.keywords.filter(keyword =>
      text.includes(keyword.toLowerCase())
    ).length

    // Score based on keyword match ratio
    return Math.min(matches / task.keywords.length + 0.3, 1.0)
  }

  /**
   * Score message by hierarchy (user > assistant > system).
   */
  private scoreHierarchy(message: Message): number {
    if (message.author === 'user') return 1.0
    if (typeof message.author === 'object' && message.author.type === 'ai-contact') return 0.7
    if (typeof message.author === 'object' && message.author.type === 'system') return 0.4
    return 0.5
  }

  /**
   * Score message by task-specific relevance.
   */
  private scoreTaskRelevance(message: Message, task: AnalyzedTaskRequirements): number {
    const text = message.content.text?.toLowerCase() || ''

    // Task type specific scoring
    switch (task.taskType) {
      case 'code':
        const codeIndicators = ['function', 'class', 'import', 'export', 'const', 'let', 'var']
        return codeIndicators.some(indicator => text.includes(indicator)) ? 0.9 : 0.4

      case 'writing':
        const writingIndicators = ['draft', 'write', 'edit', 'revise', 'content']
        return writingIndicators.some(indicator => text.includes(indicator)) ? 0.9 : 0.4

      case 'analysis':
        const analysisIndicators = ['analyze', 'review', 'examine', 'evaluate', 'assess']
        return analysisIndicators.some(indicator => text.includes(indicator)) ? 0.9 : 0.4

      case 'research':
        const researchIndicators = ['research', 'investigate', 'find', 'search', 'look into']
        return researchIndicators.some(indicator => text.includes(indicator)) ? 0.9 : 0.4

      default:
        return 0.5
    }
  }

  /**
   * Check if message should be preserved.
   */
  private shouldPreserve(message: Message): boolean {
    const text = message.content.text?.toLowerCase() || ''

    return this.config.preserveMarkers.some(marker =>
      text.toLowerCase().includes(marker.toLowerCase())
    )
  }

  /**
   * Normalize scores to 0-1 range.
   */
  private normalizeScores(scores: EnhancedMessageScore[]): void {
    if (scores.length === 0) return

    const maxTotal = Math.max(...scores.map(s => s.total))
    const minTotal = Math.min(...scores.map(s => s.total))
    const range = maxTotal - minTotal

    if (range === 0) return

    for (const score of scores) {
      if (!score.preserve) {
        score.total = (score.total - minTotal) / range
      }
    }
  }

  /**
   * Assign ranks to scores.
   */
  private assignRanks(scores: EnhancedMessageScore[]): void {
    const sorted = [...scores].sort((a, b) => b.total - a.total)

    for (let i = 0; i < sorted.length; i++) {
      sorted[i].rank = i + 1
    }
  }

  /**
   * Analyze task requirements.
   */
  private analyzeTaskRequirements(task: TaskContextRequirements): AnalyzedTaskRequirements {
    // Map priority to 0-1
    const priorityLevel =
      task.priority === 'high' ? 1.0 :
      task.priority === 'medium' ? 0.6 : 0.3

    return {
      taskType: task.taskType,
      keywords: task.keywords,
      minContextSize: task.minTokens,
      maxContextSize: task.maxTokens,
      priorityLevel,
      requiredIds: new Set(task.requiredMessageIds)
    }
  }

  /**
   * Determine optimization strategy.
   */
  private determineStrategy(
    messages: Message[],
    scores: EnhancedMessageScore[]
  ): OptimizationStrategy {
    const currentTokens = estimateTotalTokens(messages)
    const preservedCount = scores.filter(s => s.preserve).length

    // Critical threshold
    if (currentTokens >= this.config.maxTokens * this.config.criticalThreshold) {
      if (preservedCount > 0) {
        return 'preserve_only'
      }
      return 'budget'
    }

    // Warning threshold
    if (currentTokens >= this.config.maxTokens * this.config.warningThreshold) {
      return 'threshold'
    }

    return 'none'
  }

  /**
   * Apply optimization strategy.
   */
  private async applyOptimization(
    messages: Message[],
    scores: EnhancedMessageScore[],
    strategy: OptimizationStrategy
  ): Promise<Message[]> {
    switch (strategy) {
      case 'none':
        return messages

      case 'preserve_only':
        return messages.filter(msg => {
          const score = scores.find(s => s.messageId === msg.id)
          return score?.preserve || false
        })

      case 'threshold':
        return messages.filter(msg => {
          const score = scores.find(s => s.messageId === msg.id)
          return (score?.total || 0) >= this.config.minScoreThreshold || score?.preserve
        })

      case 'budget':
        return this.fitWithinBudget(messages, scores, this.config.maxTokens)

      default:
        return messages
    }
  }

  /**
   * Apply task-specific optimization.
   */
  private async applyTaskOptimization(
    messages: Message[],
    scores: EnhancedMessageScore[],
    requirements: AnalyzedTaskRequirements
  ): Promise<Message[]> {
    // Always include required messages
    const required = messages.filter(msg => requirements.requiredIds.has(msg.id))

    // Score remaining messages by task relevance
    const remaining = messages.filter(msg => !requirements.requiredIds.has(msg.id))
    const remainingScores = remaining.map(msg => scores.find(s => s.messageId === msg.id)!)
      .filter(s => s !== undefined) as EnhancedMessageScore[]

    // Sort by task score
    const sortedRemaining = remaining
      .map((msg, i) => ({ message: msg, score: remainingScores[i] }))
      .sort((a, b) => b.score.total - a.score.total)

    // Add messages until we hit the max context size
    const optimized: Message[] = [...required]
    let currentTokens = estimateTotalTokens(required)

    for (const { message, score } of sortedRemaining) {
      const msgTokens = estimateMessageTokens(message)

      if (currentTokens + msgTokens <= requirements.maxContextSize) {
        optimized.push(message)
        currentTokens += msgTokens
      }

      if (currentTokens >= requirements.minContextSize) break
    }

    // Preserve original order
    optimized.sort((a, b) =>
      messages.findIndex(m => m.id === a.id) - messages.findIndex(m => m.id === b.id)
    )

    return optimized
  }

  /**
   * Fit messages within token budget.
   */
  private fitWithinBudget(
    messages: Message[],
    scores: EnhancedMessageScore[],
    budget: number
  ): Message[] {
    // Sort by score
    const sorted = messages
      .map(msg => ({
        message: msg,
        score: scores.find(s => s.messageId === msg.id)!
      }))
      .sort((a, b) => b.score.total - a.score.total)

    // Keep top messages until budget reached
    const kept: Message[] = []
    let tokens = 0

    for (const { message, score } of sorted) {
      const msgTokens = estimateMessageTokens(message)

      // Always preserve preserved messages
      if (score.preserve) {
        kept.push(message)
        tokens += msgTokens
        continue
      }

      // Add if budget allows
      if (tokens + msgTokens <= budget) {
        kept.push(message)
        tokens += msgTokens
      }

      if (tokens >= budget) break
    }

    // Preserve original order
    kept.sort((a, b) =>
      messages.findIndex(m => m.id === a.id) - messages.findIndex(m => m.id === b.id)
    )

    return kept
  }

  /**
   * Create optimization result.
   */
  private createResult(
    originalMessages: Message[],
    optimizedMessages: Message[],
    startTime: number,
    strategy: OptimizationStrategy,
    summary: string
  ): ContextOptimizationResult {
    const originalTokens = estimateTotalTokens(originalMessages)
    const optimizedTokens = estimateTotalTokens(optimizedMessages)
    const tokensSaved = originalTokens - optimizedTokens
    const savingsPercentage = originalTokens > 0 ? (tokensSaved / originalTokens) * 100 : 0

    // Recalculate scores for optimized messages
    const scores = originalMessages.map((msg, i) => {
      const baseScore = calculateImportance(msg, originalMessages, i)
      return {
        messageId: msg.id,
        recency: this.scoreRecency(i, originalMessages.length),
        relevance: 0.5,
        hierarchy: this.scoreHierarchy(msg),
        task: 0.5,
        informationDensity: baseScore.factors.informationDensity,
        total: baseScore.score,
        confidence: baseScore.confidence,
        tokenCount: estimateMessageTokens(msg),
        preserve: this.shouldPreserve(msg)
      }
    })

    const processingTime = performance.now() - startTime

    return {
      originalMessages,
      optimizedMessages,
      originalTokens,
      optimizedTokens,
      tokensSaved,
      savingsPercentage,
      messagesRemoved: originalMessages.length - optimizedMessages.length,
      messagesKept: optimizedMessages.length,
      preservedCount: optimizedMessages.filter(msg => this.shouldPreserve(msg)).length,
      scores,
      strategy,
      processingTime,
      summary
    }
  }

  /**
   * Generate summary of optimization.
   */
  private generateSummary(
    original: Message[],
    optimized: Message[],
    scores: EnhancedMessageScore[]
  ): string {
    const removed = original.length - optimized.length
    const preserved = scores.filter(s => s.preserve).length

    if (removed === 0) {
      return 'No messages removed - context already optimal'
    }

    const avgScore = scores.reduce((sum, s) => sum + s.total, 0) / scores.length

    return `Removed ${removed} low-priority messages, kept ${optimized.length} messages (${preserved} preserved). Average score: ${(avgScore * 100).toFixed(1)}%`
  }

  /**
   * Get current metrics.
   */
  getMetrics(): ContextMetrics {
    return this.metrics.getMetrics()
  }

  /**
   * Reset metrics.
   */
  resetMetrics(): void {
    this.metrics.reset()
  }

  /**
   * Update configuration.
   */
  updateConfig(updates: Partial<ContextOptimizerConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  /**
   * Get current configuration.
   */
  getConfig(): ContextOptimizerConfig {
    return { ...this.config }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let optimizerInstance: ContextOptimizerEngine | null = null

/**
 * Get the singleton context optimizer instance.
 */
export function getContextOptimizer(): ContextOptimizerEngine {
  if (!optimizerInstance) {
    optimizerInstance = new ContextOptimizerEngine()
  }
  return optimizerInstance
}

/**
 * Reset the singleton instance (useful for testing).
 */
export function resetContextOptimizer(): void {
  optimizerInstance = null
}
