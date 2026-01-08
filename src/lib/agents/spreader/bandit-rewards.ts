/**
 * Multi-Armed Bandit Reward System
 *
 * Measures and rewards context compaction strategy performance based on:
 * - Token usage efficiency (lower is better)
 * - Response quality maintenance (higher is better)
 * - User satisfaction indicators
 * - Computational cost
 *
 * Rewards are normalized to [0, 1] range where 1 is optimal performance.
 */

import { Message } from '@/types/conversation'
import { estimateTotalTokens } from '../spread/token-utils'
import { CompressionResult } from '../spread/optimizer'

// ============================================================================
// REWARD METRIC TYPES
// ============================================================================

export interface StrategyOutcome {
  strategy: CompactionStrategy
  timestamp: number

  // Token metrics
  originalTokens: number
  compressedTokens: number
  targetTokens: number

  // Quality metrics
  originalMessages: Message[]
  compressedMessages: Message[]
  preservedImportantCount: number
  totalImportantCount: number

  // User feedback (optional)
  userSatisfaction?: 'positive' | 'neutral' | 'negative'
  userReverted?: boolean  // Did user undo the compaction?

  // Performance metrics
  compressionTime: number  // ms

  // Context
  conversationId: string
  contextPercentage: number  // Percentage before compaction
}

export interface StrategyReward {
  strategy: CompactionStrategy
  timestamp: number
  reward: number  // Normalized to [0, 1]

  // Component scores
  tokenEfficiency: number  // [0, 1]
  qualityPreservation: number  // [0, 1]
  userSatisfactionScore: number  // [0, 1]
  computationalEfficiency: number  // [0, 1]

  // Raw metrics for analysis
  outcome: StrategyOutcome
}

export interface RewardHistory {
  strategy: CompactionStrategy
  rewards: StrategyReward[]
  totalPulls: number
  averageReward: number
  cumulativeReward: number
  variance: number
  confidenceInterval: [number, number]  // 95% CI

  // Recent performance (last 10 pulls)
  recentRewards: number[]
  recentAverage: number
  recentTrend: 'improving' | 'stable' | 'declining'
}

// ============================================================================
// COMPACTION STRATEGIES (THE ARMS)
// ============================================================================

export type CompactionStrategy =
  | 'none'  // No compaction (baseline)
  | 'recent_only'  // Keep only last N messages
  | 'importance_based'  // Keep high-importance messages
  | 'summarization'  // Summarize older messages
  | 'semantic_clustering'  // Cluster by semantic similarity
  | 'hybrid_lossless'  // Remove duplicates only
  | 'hybrid_lossy'  // Remove duplicates + low importance
  | 'aggressive'  // Heavy compression

export const COMPACTION_STRATEGIES: CompactionStrategy[] = [
  'none',
  'recent_only',
  'importance_based',
  'summarization',
  'semantic_clustering',
  'hybrid_lossless',
  'hybrid_lossy',
  'aggressive'
]

export const STRATEGY_DESCRIPTIONS: Record<CompactionStrategy, string> = {
  none: 'No compaction - keep full context (baseline)',
  recent_only: 'Keep only the most recent messages',
  importance_based: 'Keep messages ranked as important',
  summarization: 'Summarize older messages',
  semantic_clustering: 'Cluster messages by semantic similarity',
  hybrid_lossless: 'Remove redundant messages only',
  hybrid_lossy: 'Remove redundant + low-importance messages',
  aggressive: 'Maximum compression while preserving critical info'
}

// ============================================================================
// REWARD CALCULATION
// ============================================================================

/**
 * Calculate reward for a compaction strategy outcome.
 *
 * Reward = weighted combination of:
 * - Token efficiency (40%): How well it reduces token count
 * - Quality preservation (30%): How much important info is kept
 * - User satisfaction (20%): Direct user feedback
 * - Computational efficiency (10%): Speed of compression
 */
export function calculateReward(outcome: StrategyOutcome): StrategyReward {
  // Calculate component scores
  const tokenEfficiency = calculateTokenEfficiency(outcome)
  const qualityPreservation = calculateQualityPreservation(outcome)
  const userSatisfactionScore = calculateUserSatisfaction(outcome)
  const computationalEfficiency = calculateComputationalEfficiency(outcome)

  // Weighted combination
  const reward =
    tokenEfficiency * 0.40 +
    qualityPreservation * 0.30 +
    userSatisfactionScore * 0.20 +
    computationalEfficiency * 0.10

  return {
    strategy: outcome.strategy,
    timestamp: outcome.timestamp,
    reward: Math.max(0, Math.min(1, reward)),  // Clamp to [0, 1]
    tokenEfficiency,
    qualityPreservation,
    userSatisfactionScore,
    computationalEfficiency,
    outcome
  }
}

/**
 * Calculate token efficiency score.
 *
 * Higher score for:
 * - Reaching closer to target (not over-compressing)
 * - Good compression ratio
 * - Staying under target
 */
function calculateTokenEfficiency(outcome: StrategyOutcome): number {
  const { originalTokens, compressedTokens, targetTokens } = outcome

  // No compression strategy gets baseline score
  if (outcome.strategy === 'none') {
    return 0.5  // Neutral score
  }

  // Calculate how close we are to target
  const distanceFromTarget = Math.abs(compressedTokens - targetTokens)
  const maxDistance = originalTokens - targetTokens
  const targetAccuracy = Math.max(0, 1 - (distanceFromTarget / maxDistance))

  // Calculate compression ratio
  const compressionRatio = 1 - (compressedTokens / originalTokens)

  // Bonus for staying under target
  const underTargetBonus = compressedTokens <= targetTokens ? 0.1 : 0

  // Penalty for over-compression (too aggressive)
  const overCompressionPenalty =
    compressedTokens < targetTokens * 0.5 ? 0.2 : 0

  // Combine metrics
  const score = targetAccuracy * 0.5 + compressionRatio * 0.4 + underTargetBonus - overCompressionPenalty

  return Math.max(0, Math.min(1, score))
}

/**
 * Calculate quality preservation score.
 *
 * Higher score for:
 * - Preserving important messages
 * - Maintaining message coherence
 * - Not losing critical information
 */
function calculateQualityPreservation(outcome: StrategyOutcome): number {
  const { preservedImportantCount, totalImportantCount, strategy } = outcome

  // No compaction always preserves everything
  if (strategy === 'none') {
    return 1.0
  }

  // Calculate preservation ratio
  const preservationRatio =
    totalImportantCount > 0
      ? preservedImportantCount / totalImportantCount
      : 1.0

  // Calculate message retention ratio
  const messageRetention = outcome.compressedMessages.length / outcome.originalMessages.length

  // Different strategies have different quality expectations
  let strategyMultiplier = 1.0

  switch (strategy) {
    case 'hybrid_lossless':
      // Should preserve almost everything
      strategyMultiplier = 1.0
      break

    case 'recent_only':
    case 'importance_based':
      // Some loss is expected
      strategyMultiplier = 0.9
      break

    case 'summarization':
    case 'semantic_clustering':
      // More loss acceptable
      strategyMultiplier = 0.8
      break

    case 'hybrid_lossy':
    case 'aggressive':
      // Significant loss expected
      strategyMultiplier = 0.7
      break

    default:
      strategyMultiplier = 1.0
  }

  // Combine metrics
  const score = (preservationRatio * 0.6 + messageRetention * 0.4) * strategyMultiplier

  return Math.max(0, Math.min(1, score))
}

/**
 * Calculate user satisfaction score.
 *
 * Based on direct feedback and implicit signals.
 */
function calculateUserSatisfaction(outcome: StrategyOutcome): number {
  // Explicit feedback
  if (outcome.userSatisfaction === 'positive') {
    return 1.0
  } else if (outcome.userSatisfaction === 'negative') {
    return 0.0
  } else if (outcome.userSatisfaction === 'neutral') {
    return 0.5
  }

  // Implicit signals
  if (outcome.userReverted) {
    // User undid the compaction - bad sign
    return 0.1
  }

  // No feedback - use heuristics
  let score = 0.6  // Default neutral-positive

  // Bonus if compression achieved target
  if (outcome.compressedTokens <= outcome.targetTokens) {
    score += 0.2
  }

  // Penalty if very aggressive (might frustrate user)
  if (outcome.strategy === 'aggressive') {
    score -= 0.1
  }

  // Small bonus for successful compression
  if (outcome.compressedTokens < outcome.originalTokens * 0.8) {
    score += 0.1
  }

  return Math.max(0, Math.min(1, score))
}

/**
 * Calculate computational efficiency score.
 *
 * Higher score for faster compression.
 */
function calculateComputationalEfficiency(outcome: StrategyOutcome): number {
  const { compressionTime, strategy } = outcome

  // No compression is instant
  if (strategy === 'none') {
    return 1.0
  }

  // Expected time thresholds (in milliseconds)
  const thresholds: Record<CompactionStrategy, { fast: number; slow: number }> = {
    none: { fast: 0, slow: 0 },
    recent_only: { fast: 10, slow: 100 },
    importance_based: { fast: 50, slow: 500 },
    summarization: { fast: 500, slow: 5000 },
    semantic_clustering: { fast: 200, slow: 2000 },
    hybrid_lossless: { fast: 50, slow: 500 },
    hybrid_lossy: { fast: 100, slow: 1000 },
    aggressive: { fast: 100, slow: 1000 }
  }

  const { fast, slow } = thresholds[strategy]

  // Normalize time to score
  if (compressionTime <= fast) {
    return 1.0
  } else if (compressionTime >= slow) {
    return 0.0
  } else {
    // Linear interpolation
    return 1 - ((compressionTime - fast) / (slow - fast))
  }
}

// ============================================================================
// REWARD HISTORY MANAGEMENT
// ============================================================================

/**
 * Update reward history with a new reward.
 */
export function updateRewardHistory(
  history: RewardHistory,
  reward: StrategyReward
): RewardHistory {
  const newRewards = [...history.rewards, reward]
  const totalPulls = history.totalPulls + 1
  const cumulativeReward = history.cumulativeReward + reward.reward
  const averageReward = cumulativeReward / totalPulls

  // Calculate variance
  const variance =
    newRewards.reduce((sum, r) => sum + Math.pow(r.reward - averageReward, 2), 0) /
    totalPulls

  // Calculate 95% confidence interval
  const stdDev = Math.sqrt(variance)
  const marginOfError = 1.96 * (stdDev / Math.sqrt(totalPulls))
  const confidenceInterval: [number, number] = [
    Math.max(0, averageReward - marginOfError),
    Math.min(1, averageReward + marginOfError)
  ]

  // Recent performance (last 10)
  const recentRewards = newRewards.slice(-10).map(r => r.reward)
  const recentAverage =
    recentRewards.reduce((sum, r) => sum + r, 0) / recentRewards.length

  // Determine trend
  let recentTrend: 'improving' | 'stable' | 'declining' = 'stable'

  if (recentRewards.length >= 5) {
    const firstHalf = recentRewards.slice(0, Math.floor(recentRewards.length / 2))
    const secondHalf = recentRewards.slice(Math.floor(recentRewards.length / 2))

    const firstAvg = firstHalf.reduce((sum, r) => sum + r, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, r) => sum + r, 0) / secondHalf.length

    if (secondAvg - firstAvg > 0.1) {
      recentTrend = 'improving'
    } else if (firstAvg - secondAvg > 0.1) {
      recentTrend = 'declining'
    }
  }

  return {
    strategy: history.strategy,
    rewards: newRewards,
    totalPulls,
    averageReward,
    cumulativeReward,
    variance,
    confidenceInterval,
    recentRewards,
    recentAverage,
    recentTrend
  }
}

/**
 * Create initial reward history for a strategy.
 */
export function createInitialRewardHistory(strategy: CompactionStrategy): RewardHistory {
  return {
    strategy,
    rewards: [],
    totalPulls: 0,
    averageReward: 0,
    cumulativeReward: 0,
    variance: 0,
    confidenceInterval: [0, 1],
    recentRewards: [],
    recentAverage: 0,
    recentTrend: 'stable'
  }
}

// ============================================================================
// CONVERSION UTILITIES
// ============================================================================

/**
 * Convert CompressionResult to StrategyOutcome for reward calculation.
 */
export function compressionResultToOutcome(
  result: CompressionResult,
  strategy: CompactionStrategy,
  conversationId: string,
  contextPercentage: number,
  compressionTime: number,
  preservedImportantCount: number = 0,
  totalImportantCount: number = 0
): StrategyOutcome {
  return {
    strategy,
    timestamp: Date.now(),
    originalTokens: result.originalTokens,
    compressedTokens: result.compressedTokens,
    targetTokens: result.originalTokens,  // Assume target was original
    originalMessages: result.originalMessages,
    compressedMessages: result.compressedMessages,
    preservedImportantCount,
    totalImportantCount,
    compressionTime,
    conversationId,
    contextPercentage
  }
}

// ============================================================================
// ANALYTICS UTILITIES
// ============================================================================

/**
 * Calculate improvement over baseline (no compression).
 */
export function calculateImprovementOverBaseline(
  history: RewardHistory,
  baselineHistory: RewardHistory
): {
  rewardImprovement: number
  tokenSavings: number
  qualityTradeoff: number
} {
  const rewardImprovement =
    history.averageReward - baselineHistory.averageReward

  // Get average token savings from history
  const tokenSavings =
    history.rewards.length > 0
      ? history.rewards.reduce(
          (sum, r) =>
            sum +
            (1 - r.outcome.compressedTokens / r.outcome.originalTokens),
          0
        ) / history.rewards.length
      : 0

  // Quality tradeoff (0 = no tradeoff, 1 = significant tradeoff)
  const qualityTradeoff =
    history.rewards.length > 0
      ? 1 -
        history.rewards.reduce(
          (sum, r) => sum + r.qualityPreservation,
          0
        ) / history.rewards.length
      : 0

  return {
    rewardImprovement,
    tokenSavings,
    qualityTradeoff
  }
}

/**
 * Get best performing strategy from histories.
 */
export function getBestStrategy(
  histories: Map<CompactionStrategy, RewardHistory>,
  minPulls: number = 5
): CompactionStrategy | null {
  let bestStrategy: CompactionStrategy | null = null
  let bestReward = -Infinity

  for (const [strategy, history] of histories.entries()) {
    // Skip strategies with insufficient data
    if (history.totalPulls < minPulls) {
      continue
    }

    // Use lower bound of confidence interval for risk-averse selection
    const conservativeReward = history.confidenceInterval[0]

    if (conservativeReward > bestReward) {
      bestReward = conservativeReward
      bestStrategy = strategy
    }
  }

  return bestStrategy
}

/**
 * Calculate exploration bonus for UCB algorithm.
 */
export function calculateUCBBonus(
  totalPulls: number,
  armPulls: number,
  explorationParameter: number = 2.0
): number {
  if (armPulls === 0) {
    return Infinity
  }

  return explorationParameter *
    Math.sqrt(Math.log(totalPulls) / armPulls)
}
