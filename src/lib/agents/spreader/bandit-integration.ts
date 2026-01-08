/**
 * Multi-Armed Bandit Integration for Spreader
 *
 * Integrates bandit algorithms with Spreader agent to optimize context
 * compaction strategies in real-time.
 *
 * Features:
 * - Automatic strategy selection based on conversation state
 * - Real-time reward tracking and adaptation
 * - Per-conversation bandit instances
 * - Persistent learning across sessions
 * - A/B testing support
 */

import { Message } from '@/types/conversation'
import { ContextOptimizer, CompressionResult } from '../spread/optimizer'
import { estimateTotalTokens } from '../spread/token-utils'
import { calculateImportance } from '../spread/importance-scoring'
import {
  CompactionStrategy,
  StrategyOutcome,
  StrategyReward,
  RewardHistory,
  calculateReward,
  compressionResultToOutcome,
  createInitialRewardHistory,
  updateRewardHistory
} from './bandit-rewards'
import {
  BanditAlgorithm,
  BanditState,
  BanditParameters,
  SelectionResult,
  createBanditState,
  resetBanditState,
  selectArm,
  updateArm,
  getArmStatistics,
  serializeBanditState,
  deserializeBanditState,
  getExplorationExploitationRatio,
  getAlgorithmPerformance
} from './bandit-algorithms'

// ============================================================================
// INTEGRATION TYPES
// ============================================================================

export interface BanditConfig {
  algorithm: BanditAlgorithm
  parameters?: Partial<BanditParameters>
  persistenceKey?: string  // For storing learned strategies
  enablePersistence?: boolean
  autoOptimizeThreshold?: number  // Context % to trigger auto-optimization
  minMessagesForOptimization?: number
}

export interface BanditContext {
  conversationId: string
  state: BanditState
  lastOptimizationTime: number
  optimizationCount: number
  lastStrategy?: CompactionStrategy
  lastOutcome?: StrategyOutcome
}

export interface CompactionRequest {
  conversationId: string
  messages: Message[]
  currentTokens: number
  maxTokens: number
  contextPercentage: number
  forceStrategy?: CompactionStrategy  // Override bandit selection
}

export interface CompactionResponse {
  success: boolean
  strategy: CompactionStrategy
  selectionReason: string

  // Results
  compressedMessages: Message[]
  originalTokens: number
  compressedTokens: number
  tokensSaved: number
  compressionRatio: number

  // Bandit info
  exploreExploit: 'explore' | 'exploit'
  confidence: number
  reward?: StrategyReward

  // Performance
  compressionTime: number
}

// ============================================================================
// GLOBAL BANDIT MANAGER
// ============================================================================

class BanditManager {
  private contexts: Map<string, BanditContext> = new Map()
  private globalState: BanditState | null = null
  private config: BanditConfig

  constructor(config: BanditConfig) {
    this.config = config

    // Load persisted state if enabled
    if (config.enablePersistence && config.persistenceKey) {
      this.loadPersistedState()
    }

    // Initialize global state
    if (!this.globalState) {
      this.globalState = createBanditState(
        config.algorithm,
        config.parameters
      )
    }
  }

  // ========================================================================
  // CONTEXT MANAGEMENT
  // ========================================================================

  /**
   * Get or create bandit context for a conversation.
   */
  getContext(conversationId: string): BanditContext {
    let context = this.contexts.get(conversationId)

    if (!context) {
      // Clone global state for new conversation
      context = {
        conversationId,
        state: this.globalState
          ? { ...this.globalState, histories: new Map(this.globalState.histories) }
          : createBanditState(this.config.algorithm, this.config.parameters),
        lastOptimizationTime: 0,
        optimizationCount: 0
      }

      this.contexts.set(conversationId, context)
    }

    return context
  }

  /**
   * Remove context (e.g., when conversation is deleted).
   */
  removeContext(conversationId: string): void {
    this.contexts.delete(conversationId)
  }

  /**
   * Reset context for new optimization cycle.
   */
  resetContext(conversationId: string): void {
    const context = this.getContext(conversationId)
    context.state = resetBanditState(context.state)
    context.lastOptimizationTime = 0
    context.optimizationCount = 0
    context.lastStrategy = undefined
    context.lastOutcome = undefined
  }

  // ========================================================================
  // COMPACTION WITH BANDIT
  // ========================================================================

  /**
   * Optimize context using bandit-selected strategy.
   */
  async optimizeContext(request: CompactionRequest): Promise<CompactionResponse> {
    const startTime = Date.now()
    const context = this.getContext(request.conversationId)

    // Check if optimization is needed
    if (!this.shouldOptimize(request)) {
      return {
        success: false,
        strategy: 'none',
        selectionReason: 'Context does not require optimization',
        compressedMessages: request.messages,
        originalTokens: request.currentTokens,
        compressedTokens: request.currentTokens,
        tokensSaved: 0,
        compressionRatio: 0,
        exploreExploit: 'exploit',
        confidence: 1.0,
        compressionTime: 0
      }
    }

    // Select strategy (or use forced strategy)
    let selection: SelectionResult

    if (request.forceStrategy) {
      selection = {
        strategy: request.forceStrategy,
        algorithm: context.state.algorithm,
        exploreExploit: 'exploit',
        confidence: 1.0,
        reason: 'Forced strategy'
      }
    } else {
      selection = selectArm(context.state)
    }

    // Execute strategy
    const result = await this.executeStrategy(
      request.messages,
      request.maxTokens,
      selection.strategy
    )

    const compressionTime = Date.now() - startTime

    // Calculate important messages preserved
    const importantMessages = request.messages.filter((msg, i) => {
      const importance = calculateImportance(msg, request.messages, i)
      return importance.score > 0.7
    })

    const preservedImportant = result.compressedMessages.filter((msg) =>
      importantMessages.some(imp => imp.id === msg.id)
    ).length

    // Create outcome and calculate reward
    const outcome = compressionResultToOutcome(
      result,
      selection.strategy,
      request.conversationId,
      request.contextPercentage,
      compressionTime,
      preservedImportant,
      importantMessages.length
    )

    const reward = calculateReward(outcome)

    // Update bandit state
    context.state = updateArm(context.state, selection.strategy, reward)
    context.lastOptimizationTime = Date.now()
    context.optimizationCount++
    context.lastStrategy = selection.strategy
    context.lastOutcome = outcome

    // Update global state periodically
    if (context.optimizationCount % 10 === 0) {
      this.syncGlobalState()
    }

    return {
      success: true,
      strategy: selection.strategy,
      selectionReason: selection.reason,
      compressedMessages: result.compressedMessages,
      originalTokens: result.originalTokens,
      compressedTokens: result.compressedTokens,
      tokensSaved: result.originalTokens - result.compressedTokens,
      compressionRatio: result.compressionRatio,
      exploreExploit: selection.exploreExploit,
      confidence: selection.confidence,
      reward,
      compressionTime
    }
  }

  // ========================================================================
  // STRATEGY EXECUTION
  // ========================================================================

  /**
   * Execute a specific compaction strategy.
   */
  private async executeStrategy(
    messages: Message[],
    maxTokens: number,
    strategy: CompactionStrategy
  ): Promise<CompressionResult> {
    const optimizer = new ContextOptimizer(0.8)
    const targetTokens = Math.floor(maxTokens * 0.8)

    switch (strategy) {
      case 'none':
        return {
          originalMessages: messages,
          compressedMessages: messages,
          originalTokens: estimateTotalTokens(messages),
          compressedTokens: estimateTotalTokens(messages),
          compressionRatio: 0,
          strategy: 'none' as const,
          removedCount: 0
        }

      case 'recent_only':
        return await this.executeRecentOnly(messages, targetTokens)

      case 'importance_based':
        return await this.executeImportanceBased(messages, targetTokens)

      case 'summarization':
        return optimizer.compressContext(messages, targetTokens, 'lossy')

      case 'semantic_clustering':
        return await this.executeSemanticClustering(messages, targetTokens)

      case 'hybrid_lossless':
        return optimizer.compressContext(messages, targetTokens, 'lossless')

      case 'hybrid_lossy':
        return optimizer.compressContext(messages, targetTokens, 'hybrid')

      case 'aggressive':
        return await this.executeAggressive(messages, targetTokens)

      default:
        return optimizer.compressContext(messages, targetTokens, 'hybrid')
    }
  }

  /**
   * Keep only recent messages.
   */
  private async executeRecentOnly(
    messages: Message[],
    targetTokens: number
  ): Promise<CompressionResult> {
    const originalTokens = estimateTotalTokens(messages)

    // Keep last 30 messages or until target reached
    let compressed = messages.slice(-30)
    let compressedTokens = estimateTotalTokens(compressed)

    // Further reduce if still over target
    while (compressedTokens > targetTokens && compressed.length > 10) {
      compressed = compressed.slice(1)  // Remove oldest
      compressedTokens = estimateTotalTokens(compressed)
    }

    return {
      originalMessages: messages,
      compressedMessages: compressed,
      originalTokens,
      compressedTokens,
      compressionRatio: (originalTokens - compressedTokens) / originalTokens,
      strategy: 'hybrid' as const,  // Map to existing type
      removedCount: messages.length - compressed.length
    }
  }

  /**
   * Keep important messages based on scoring.
   */
  private async executeImportanceBased(
    messages: Message[],
    targetTokens: number
  ): Promise<CompressionResult> {
    const originalTokens = estimateTotalTokens(messages)

    // Calculate importance scores
    const scores = messages.map((msg, i) =>
      calculateImportance(msg, messages, i)
    )

    // Sort by importance
    const sorted = messages
      .map((msg, i) => ({ message: msg, score: scores[i] }))
      .sort((a, b) => b.score.score - a.score.score)

    // Keep most important until target reached
    const compressed: Message[] = []
    let tokens = 0

    for (const { message } of sorted) {
      const msgTokens = estimateTotalTokens([message])

      if (tokens + msgTokens <= targetTokens) {
        compressed.push(message)
        tokens += msgTokens
      }

      if (tokens >= targetTokens) break
    }

    // Preserve original order
    compressed.sort((a, b) =>
      messages.findIndex(m => m.id === a.id) - messages.findIndex(m => m.id === b.id)
    )

    const compressedTokens = estimateTotalTokens(compressed)

    return {
      originalMessages: messages,
      compressedMessages: compressed,
      originalTokens,
      compressedTokens,
      compressionRatio: (originalTokens - compressedTokens) / originalTokens,
      strategy: 'lossy' as const,  // Map to existing type
      removedCount: messages.length - compressed.length
    }
  }

  /**
   * Semantic clustering (simplified implementation).
   */
  private async executeSemanticClustering(
    messages: Message[],
    targetTokens: number
  ): Promise<CompressionResult> {
    // For now, use importance-based as proxy
    // In production, this would use embeddings and clustering
    return this.executeImportanceBased(messages, targetTokens)
  }

  /**
   * Aggressive compression.
   */
  private async executeAggressive(
    messages: Message[],
    targetTokens: number
  ): Promise<CompressionResult> {
    const optimizer = new ContextOptimizer(0.6)  // More aggressive target
    const aggressiveTarget = Math.floor(targetTokens * 0.7)

    return optimizer.compressContext(messages, aggressiveTarget, 'lossy')
  }

  // ========================================================================
  // OPTIMIZATION TRIGGERS
  // ========================================================================

  /**
   * Check if context should be optimized.
   */
  private shouldOptimize(request: CompactionRequest): boolean {
    const threshold = this.config.autoOptimizeThreshold || 0.85
    const minMessages = this.config.minMessagesForOptimization || 20

    // Must be at threshold
    if (request.contextPercentage < threshold * 100) {
      return false
    }

    // Must have minimum messages
    if (request.messages.length < minMessages) {
      return false
    }

    // Don't optimize too frequently (at least 1 minute apart)
    const context = this.getContext(request.conversationId)
    const timeSinceLastOpt = Date.now() - context.lastOptimizationTime

    if (timeSinceLastOpt < 60000) {  // 1 minute
      return false
    }

    return true
  }

  // ========================================================================
  // ANALYTICS & MONITORING
  // ========================================================================

  /**
   * Get statistics for a conversation.
   */
  getStatistics(conversationId: string) {
    const context = this.getContext(conversationId)

    return {
      armStatistics: getArmStatistics(context.state),
      exploreExploitRatio: getExplorationExploitationRatio(context.state),
      algorithmPerformance: getAlgorithmPerformance(context.state),
      optimizationCount: context.optimizationCount,
      lastStrategy: context.lastStrategy,
      lastOutcome: context.lastOutcome
    }
  }

  /**
   * Get global statistics across all conversations.
   */
  getGlobalStatistics() {
    const allStats = Array.from(this.contexts.values()).map(ctx =>
      this.getStatistics(ctx.conversationId)
    )

    return {
      totalConversations: this.contexts.size,
      totalOptimizations: allStats.reduce((sum, s) => sum + s.optimizationCount, 0),
      averageOptimizationsPerConversation:
        allStats.length > 0
          ? allStats.reduce((sum, s) => sum + s.optimizationCount, 0) / allStats.length
          : 0,
      globalState: this.globalState ? getAlgorithmPerformance(this.globalState) : null
    }
  }

  // ========================================================================
  // PERSISTENCE
  // ========================================================================

  /**
   * Sync global state from conversations.
   */
  private syncGlobalState(): void {
    if (!this.globalState) return

    // Average all conversation states
    const allStates = Array.from(this.contexts.values()).map(ctx => ctx.state)

    if (allStates.length === 0) return

    // Aggregate pull counts and rewards
    const aggregatedHistories = new Map<CompactionStrategy, RewardHistory>()

    for (const strategy of this.globalState.histories.keys()) {
      const allHistories = allStates
        .map(s => s.histories.get(strategy))
        .filter((h): h is RewardHistory => h !== undefined)

      if (allHistories.length === 0) continue

      // Create aggregated history
      const totalPulls = allHistories.reduce((sum, h) => sum + h.totalPulls, 0)
      const cumulativeReward = allHistories.reduce((sum, h) => sum + h.cumulativeReward, 0)
      const averageReward = cumulativeReward / totalPulls

      // Aggregate all rewards
      const allRewards = allHistories.flatMap(h => h.rewards)

      aggregatedHistories.set(strategy, {
        strategy,
        rewards: allRewards,
        totalPulls,
        averageReward,
        cumulativeReward,
        variance: 0,  // Would need to recalculate
        confidenceInterval: [0, 1],
        recentRewards: [],
        recentAverage: 0,
        recentTrend: 'stable'
      })
    }

    this.globalState = {
      ...this.globalState,
      histories: aggregatedHistories
    }

    // Persist if enabled
    if (this.config.enablePersistence && this.config.persistenceKey) {
      this.persistState()
    }
  }

  /**
   * Persist global state to storage.
   */
  private persistState(): void {
    if (!this.globalState || !this.config.persistenceKey) return

    try {
      const json = serializeBanditState(this.globalState)
      localStorage.setItem(this.config.persistenceKey, JSON.stringify(json))
    } catch (error) {
      console.error('[Bandit] Failed to persist state:', error)
    }
  }

  /**
   * Load persisted state from storage.
   */
  private loadPersistedState(): void {
    if (!this.config.persistenceKey) return

    try {
      const stored = localStorage.getItem(this.config.persistenceKey)

      if (stored) {
        const json = JSON.parse(stored)
        this.globalState = deserializeBanditState(json)
        console.log('[Bandit] Loaded persisted state:', json)
      }
    } catch (error) {
      console.error('[Bandit] Failed to load persisted state:', error)
    }
  }

  // ========================================================================
  // A/B TESTING SUPPORT
  // ========================================================================

  /**
   * Run A/B test comparing two strategies.
   */
  async runABTest(
    messages: Message[],
    maxTokens: number,
    strategyA: CompactionStrategy,
    strategyB: CompactionStrategy
  ): Promise<{
    strategyA: CompressionResult
    strategyB: CompressionResult
    winner: CompactionStrategy
    improvement: number
  }> {
    const resultA = await this.executeStrategy(messages, maxTokens, strategyA)
    const resultB = await this.executeStrategy(messages, maxTokens, strategyB)

    // Determine winner based on compression ratio and quality
    const scoreA = resultA.compressionRatio * 0.5 + (resultA.compressedMessages.length / resultA.originalMessages.length) * 0.5
    const scoreB = resultB.compressionRatio * 0.5 + (resultB.compressedMessages.length / resultB.originalMessages.length) * 0.5

    const winner = scoreA > scoreB ? strategyA : strategyB
    const improvement = Math.abs(scoreA - scoreB)

    return {
      strategyA: resultA,
      strategyB: resultB,
      winner,
      improvement
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let banditManagerInstance: BanditManager | null = null

/**
 * Get or create the global bandit manager.
 */
export function getBanditManager(config?: BanditConfig): BanditManager {
  if (!banditManagerInstance) {
    const defaultConfig: BanditConfig = {
      algorithm: 'ucb',  // UCB is good for this use case
      parameters: {
        ucbC: Math.sqrt(2),
        minPullsBeforeExploit: 3
      },
      enablePersistence: true,
      persistenceKey: 'spreader-bandit-state',
      autoOptimizeThreshold: 0.85,
      minMessagesForOptimization: 20
    }

    banditManagerInstance = new BanditManager(config || defaultConfig)
  }

  return banditManagerInstance
}

/**
 * Reset the global bandit manager (for testing).
 */
export function resetBanditManager(): void {
  banditManagerInstance = null
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Optimize context with bandit (convenience wrapper).
 */
export async function optimizeContextWithBandit(
  conversationId: string,
  messages: Message[],
  maxTokens: number
): Promise<CompactionResponse> {
  const manager = getBanditManager()

  const currentTokens = estimateTotalTokens(messages)
  const contextPercentage = (currentTokens / maxTokens) * 100

  return manager.optimizeContext({
    conversationId,
    messages,
    currentTokens,
    maxTokens,
    contextPercentage
  })
}

/**
 * Get bandit statistics for a conversation.
 */
export function getBanditStatistics(conversationId: string) {
  const manager = getBanditManager()
  return manager.getStatistics(conversationId)
}

/**
 * Force optimization with specific strategy.
 */
export async function forceOptimizationWithStrategy(
  conversationId: string,
  messages: Message[],
  maxTokens: number,
  strategy: CompactionStrategy
): Promise<CompactionResponse> {
  const manager = getBanditManager()

  const currentTokens = estimateTotalTokens(messages)
  const contextPercentage = (currentTokens / maxTokens) * 100

  return manager.optimizeContext({
    conversationId,
    messages,
    currentTokens,
    maxTokens,
    contextPercentage,
    forceStrategy: strategy
  })
}
