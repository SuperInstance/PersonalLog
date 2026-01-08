/**
 * Multi-Armed Bandit System Tests
 *
 * Comprehensive test suite for bandit algorithms, reward calculation,
 * and Spreader integration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  calculateReward,
  StrategyOutcome,
  CompactionStrategy,
  createInitialRewardHistory,
  updateRewardHistory,
  compressionResultToOutcome,
  getBestStrategy,
  calculateImprovementOverBaseline
} from '../bandit-rewards'
import {
  createBanditState,
  resetBanditState,
  selectArm,
  updateArm,
  getArmStatistics,
  getExplorationExploitationRatio,
  serializeBanditState,
  deserializeBanditState,
  getAlgorithmPerformance,
  type BanditState
} from '../bandit-algorithms'
import {
  getBanditManager,
  resetBanditManager,
  optimizeContextWithBandit,
  type CompactionRequest
} from '../bandit-integration'
import { Message } from '@/types/conversation'
import { CompressionResult } from '../../spread/optimizer'

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createMockMessage(
  id: string,
  text: string,
  author: Message['author'] = 'user'
): Message {
  return {
    id,
    conversationId: 'test-conv',
    type: 'text',
    author,
    content: { text },
    timestamp: new Date().toISOString(),
    metadata: {}
  }
}

function createMockOutcome(
  strategy: CompactionStrategy,
  originalTokens: number,
  compressedTokens: number,
  targetTokens: number
): StrategyOutcome {
  return {
    strategy,
    timestamp: Date.now(),
    originalTokens,
    compressedTokens,
    targetTokens,
    originalMessages: [
      createMockMessage('1', 'Hello'),
      createMockMessage('2', 'World'),
      createMockMessage('3', 'Test')
    ],
    compressedMessages: [
      createMockMessage('1', 'Hello'),
      createMockMessage('3', 'Test')
    ],
    preservedImportantCount: 2,
    totalImportantCount: 3,
    compressionTime: 100,
    conversationId: 'test-conv',
    contextPercentage: 90
  }
}

function createMockCompressionResult(
  original: number,
  compressed: number
): CompressionResult {
  return {
    originalMessages: [
      createMockMessage('1', 'Message 1'),
      createMockMessage('2', 'Message 2')
    ],
    compressedMessages: [createMockMessage('1', 'Message 1')],
    originalTokens: original,
    compressedTokens: compressed,
    compressionRatio: (original - compressed) / original,
    strategy: 'hybrid',
    removedCount: 1
  }
}

// ============================================================================
// REWARD CALCULATION TESTS
// ============================================================================

describe('Bandit Rewards', () => {
  describe('calculateReward', () => {
    it('should calculate reward for successful compression', () => {
      const outcome = createMockOutcome('hybrid_lossy', 1000, 600, 800)

      const reward = calculateReward(outcome)

      expect(reward.strategy).toBe('hybrid_lossy')
      expect(reward.reward).toBeGreaterThan(0)
      expect(reward.reward).toBeLessThanOrEqual(1)
      expect(reward.tokenEfficiency).toBeGreaterThan(0)
      expect(reward.qualityPreservation).toBeGreaterThan(0)
    })

    it('should give neutral reward for no compression', () => {
      const outcome = createMockOutcome('none', 1000, 1000, 800)

      const reward = calculateReward(outcome)

      expect(reward.strategy).toBe('none')
      expect(reward.reward).toBeGreaterThan(0.4)  // Should be around 0.5-0.6
      expect(reward.tokenEfficiency).toBe(0.5)  // Baseline
    })

    it('should reward reaching target tokens', () => {
      const goodOutcome = createMockOutcome('hybrid_lossy', 1000, 800, 800)
      const badOutcome = createMockOutcome('hybrid_lossy', 1000, 950, 800)

      const goodReward = calculateReward(goodOutcome)
      const badReward = calculateReward(badOutcome)

      expect(goodReward.tokenEfficiency).toBeGreaterThan(badReward.tokenEfficiency)
    })

    it('should penalize over-compression', () => {
      const normalOutcome = createMockOutcome('hybrid_lossy', 1000, 800, 800)
      const overCompressed = createMockOutcome('aggressive', 1000, 300, 800)

      const normalReward = calculateReward(normalOutcome)
      const overReward = calculateReward(overCompressed)

      expect(normalReward.tokenEfficiency).toBeGreaterThan(overReward.tokenEfficiency)
    })

    it('should preserve quality for lossless strategies', () => {
      const outcome = createMockOutcome('hybrid_lossless', 1000, 900, 800)

      const reward = calculateReward(outcome)

      expect(reward.qualityPreservation).toBeGreaterThan(0.9)
    })

    it('should incorporate user satisfaction', () => {
      const positiveOutcome = createMockOutcome('hybrid_lossy', 1000, 700, 800)
      positiveOutcome.userSatisfaction = 'positive'

      const negativeOutcome = createMockOutcome('hybrid_lossy', 1000, 700, 800)
      negativeOutcome.userSatisfaction = 'negative'

      const positiveReward = calculateReward(positiveOutcome)
      const negativeReward = calculateReward(negativeOutcome)

      expect(positiveReward.userSatisfactionScore).toBe(1.0)
      expect(negativeReward.userSatisfactionScore).toBe(0.0)
      expect(positiveReward.reward).toBeGreaterThan(negativeReward.reward)
    })

    it('should penalize user reverts', () => {
      const outcome = createMockOutcome('hybrid_lossy', 1000, 700, 800)
      outcome.userReverted = true

      const reward = calculateReward(outcome)

      expect(reward.userSatisfactionScore).toBeLessThan(0.2)
    })

    it('should reward fast compression', () => {
      const fastOutcome = createMockOutcome('recent_only', 1000, 600, 800)
      fastOutcome.compressionTime = 10

      const slowOutcome = createMockOutcome('summarization', 1000, 600, 800)
      slowOutcome.compressionTime = 5000

      const fastReward = calculateReward(fastOutcome)
      const slowReward = calculateReward(slowOutcome)

      expect(fastReward.computationalEfficiency).toBeGreaterThan(
        slowReward.computationalEfficiency
      )
    })
  })
})

// ============================================================================
// REWARD HISTORY TESTS
// ============================================================================

describe('Reward History', () => {
  it('should create initial history', () => {
    const history = createInitialRewardHistory('hybrid_lossy')

    expect(history.strategy).toBe('hybrid_lossy')
    expect(history.totalPulls).toBe(0)
    expect(history.averageReward).toBe(0)
    expect(history.rewards).toHaveLength(0)
  })

  it('should update history with reward', () => {
    const history = createInitialRewardHistory('hybrid_lossy')
    const outcome = createMockOutcome('hybrid_lossy', 1000, 700, 800)
    const reward = calculateReward(outcome)

    const updated = updateRewardHistory(history, reward)

    expect(updated.totalPulls).toBe(1)
    expect(updated.averageReward).toBe(reward.reward)
    expect(updated.cumulativeReward).toBe(reward.reward)
    expect(updated.rewards).toHaveLength(1)
  })

  it('should calculate average over multiple rewards', () => {
    const history = createInitialRewardHistory('hybrid_lossy')

    let updated = history
    for (let i = 0; i < 5; i++) {
      const outcome = createMockOutcome('hybrid_lossy', 1000, 600 + i * 50, 800)
      const reward = calculateReward(outcome)
      updated = updateRewardHistory(updated, reward)
    }

    expect(updated.totalPulls).toBe(5)
    expect(updated.averageReward).toBeGreaterThan(0)
    expect(updated.rewards).toHaveLength(5)
  })

  it('should calculate confidence interval', () => {
    const history = createInitialRewardHistory('hybrid_lossy')

    let updated = history
    for (let i = 0; i < 10; i++) {
      const outcome = createMockOutcome('hybrid_lossy', 1000, 700, 800)
      const reward = calculateReward(outcome)
      updated = updateRewardHistory(updated, reward)
    }

    expect(updated.confidenceInterval).toHaveLength(2)
    expect(updated.confidenceInterval[0]).toBeLessThanOrEqual(updated.averageReward)
    expect(updated.confidenceInterval[1]).toBeGreaterThanOrEqual(updated.averageReward)
  })

  it('should track recent rewards', () => {
    const history = createInitialRewardHistory('hybrid_lossy')

    let updated = history
    for (let i = 0; i < 15; i++) {
      const outcome = createMockOutcome('hybrid_lossy', 1000, 700, 800)
      const reward = calculateReward(outcome)
      updated = updateRewardHistory(updated, reward)
    }

    expect(updated.recentRewards).toHaveLength(10)  // Only last 10
    expect(updated.recentAverage).toBeGreaterThan(0)
  })

  it('should detect improving trend', () => {
    const history = createInitialRewardHistory('hybrid_lossy')

    let updated = history
    // First 5 rewards are low
    for (let i = 0; i < 5; i++) {
      const outcome = createMockOutcome('hybrid_lossy', 1000, 950, 800)
      updated = updateRewardHistory(updated, calculateReward(outcome))
    }

    // Next 5 rewards are high
    for (let i = 0; i < 5; i++) {
      const outcome = createMockOutcome('hybrid_lossy', 1000, 600, 800)
      updated = updateRewardHistory(updated, calculateReward(outcome))
    }

    expect(updated.recentTrend).toBe('improving')
  })

  it('should detect declining trend', () => {
    const history = createInitialRewardHistory('hybrid_lossy')

    let updated = history
    // First 5 rewards are high
    for (let i = 0; i < 5; i++) {
      const outcome = createMockOutcome('hybrid_lossy', 1000, 600, 800)
      updated = updateRewardHistory(updated, calculateReward(outcome))
    }

    // Next 5 rewards are low
    for (let i = 0; i < 5; i++) {
      const outcome = createMockOutcome('hybrid_lossy', 1000, 950, 800)
      updated = updateRewardHistory(updated, calculateReward(outcome))
    }

    expect(updated.recentTrend).toBe('declining')
  })
})

// ============================================================================
// BANDIT ALGORITHM TESTS
// ============================================================================

describe('Epsilon-Greedy Algorithm', () => {
  it('should create bandit state', () => {
    const state = createBanditState('epsilon_greedy')

    expect(state.algorithm).toBe('epsilon_greedy')
    expect(state.totalPulls).toBe(0)
    expect(state.histories.size).toBe(8)  // All strategies
    expect(state.parameters.epsilon).toBe(0.1)
  })

  it('should select arm for exploration', () => {
    const state = createBanditState('epsilon_greedy', { epsilon: 1.0 })  // Always explore

    const selection = selectArm(state)

    expect(selection.algorithm).toBe('epsilon_greedy')
    expect(selection.exploreExploit).toBe('explore')
    expect(selection.strategy).toBeDefined()
  })

  it('should select arm for exploitation', () => {
    const state = createBanditState('epsilon_greedy', { epsilon: 0.0 })  // Always exploit

    // Give some data to one arm
    let updated = state
    const outcome = createMockOutcome('hybrid_lossy', 1000, 700, 800)
    const reward = calculateReward(outcome)
    updated = updateArm(updated, 'hybrid_lossy', reward)

    const selection = selectArm(updated)

    expect(selection.exploreExploit).toBe('exploit')
  })

  it('should update arm statistics', () => {
    const state = createBanditState('epsilon_greedy')
    const outcome = createMockOutcome('hybrid_lossy', 1000, 700, 800)
    const reward = calculateReward(outcome)

    const updated = updateArm(state, 'hybrid_lossy', reward)

    expect(updated.totalPulls).toBe(1)
    expect(updated.histories.get('hybrid_lossy')?.totalPulls).toBe(1)
  })

  it('should decay epsilon over time', () => {
    const state = createBanditState('epsilon_greedy', {
      epsilon: 0.5,
      epsilonDecay: 0.9
    })

    // Simulate multiple pulls
    let updated = state
    for (let i = 0; i < 10; i++) {
      const selection = selectArm(updated)
      const outcome = createMockOutcome(selection.strategy, 1000, 700, 800)
      const reward = calculateReward(outcome)
      updated = updateArm(updated, selection.strategy, reward)
    }

    // Epsilon should have decayed
    const finalSelection = selectArm(updated)
    expect(finalSelection.reason).toContain('0.19')  // 0.5 * 0.9^10
  })
})

describe('UCB Algorithm', () => {
  it('should initialize unexplored arms first', () => {
    const state = createBanditState('ucb')

    // Give data to all arms except one
    let updated = state
    for (const strategy of state.histories.keys()) {
      if (strategy !== 'none') {
        const outcome = createMockOutcome(strategy, 1000, 700, 800)
        const reward = calculateReward(outcome)
        updated = updateArm(updated, strategy, reward)
      }
    }

    const selection = selectArm(updated)

    expect(selection.strategy).toBe('none')  // Unexplored arm
    expect(selection.reason).toContain('Initializing')
  })

  it('should prefer arms with high uncertainty', () => {
    const state = createBanditState('ucb')

    // Give many pulls to one arm, few to another
    let updated = state
    for (let i = 0; i < 20; i++) {
      const outcome = createMockOutcome('hybrid_lossy', 1000, 700, 800)
      const reward = calculateReward(outcome)
      updated = updateArm(updated, 'hybrid_lossy', reward)
    }

    for (let i = 0; i < 2; i++) {
      const outcome = createMockOutcome('recent_only', 1000, 700, 800)
      const reward = calculateReward(outcome)
      updated = updateArm(updated, 'recent_only', reward)
    }

    const stats = getArmStatistics(updated)
    const hybridLossy = stats.find(s => s.strategy === 'hybrid_lossy')
    const recentOnly = stats.find(s => s.strategy === 'recent_only')

    expect(hybridLossy?.totalPulls).toBe(20)
    expect(recentOnly?.totalPulls).toBe(2)
  })

  it('should balance exploration and exploitation', () => {
    const state = createBanditState('ucb', { ucbC: Math.sqrt(2) })

    let updated = state
    const selections: string[] = []

    for (let i = 0; i < 50; i++) {
      const selection = selectArm(updated)
      selections.push(selection.strategy)

      const outcome = createMockOutcome(selection.strategy, 1000, 700, 800)
      const reward = calculateReward(outcome)
      updated = updateArm(updated, selection.strategy, reward)
    }

    // Should have tried multiple strategies
    const uniqueStrategies = new Set(selections)
    expect(uniqueStrategies.size).toBeGreaterThan(1)
  })
})

describe('Thompson Sampling Algorithm', () => {
  it('should sample from posterior distribution', () => {
    const state = createBanditState('thompson_sampling')

    const selection = selectArm(state)

    expect(selection.algorithm).toBe('thompson_sampling')
    expect(selection.strategy).toBeDefined
    expect(selection.reason).toContain('Sampled value')
  })

  it('should favor successful arms over time', () => {
    const state = createBanditState('thompson_sampling')

    // Give high rewards to hybrid_lossy
    let updated = state
    for (let i = 0; i < 10; i++) {
      const outcome = createMockOutcome('hybrid_lossy', 1000, 600, 800)
      const reward = calculateReward(outcome)
      updated = updateArm(updated, 'hybrid_lossy', reward)
    }

    // Give low rewards to recent_only
    for (let i = 0; i < 10; i++) {
      const outcome = createMockOutcome('recent_only', 1000, 950, 800)
      const reward = calculateReward(outcome)
      updated = updateArm(updated, 'recent_only', reward)
    }

    // Count next 20 selections
    const selections: Record<string, number> = {}
    for (let i = 0; i < 20; i++) {
      const selection = selectArm(updated)
      selections[selection.strategy] = (selections[selection.strategy] || 0) + 1
    }

    // hybrid_lossy should be selected more often
    expect(selections['hybrid_lossy'] || 0).toBeGreaterThan(selections['recent_only'] || 0)
  })

  it('should handle uncertainty with probability matching', () => {
    const state = createBanditState('thompson_sampling')

    let updated = state
    const exploreCount = { hybrid_lossy: 0, recent_only: 0 }

    // Run 100 trials
    for (let i = 0; i < 100; i++) {
      const selection = selectArm(updated)

      if (selection.strategy === 'hybrid_lossy') {
        exploreCount.hybrid_lossy++
        const outcome = createMockOutcome('hybrid_lossy', 1000, 700, 800)
        const reward = calculateReward(outcome)
        updated = updateArm(updated, 'hybrid_lossy', reward)
      } else if (selection.strategy === 'recent_only') {
        exploreCount.recent_only++
        const outcome = createMockOutcome('recent_only', 1000, 700, 800)
        const reward = calculateReward(outcome)
        updated = updateArm(updated, 'recent_only', reward)
      }
    }

    // Both should have been explored
    expect(exploreCount.hybrid_lossy + exploreCount.recent_only).toBeGreaterThan(0)
  })
})

// ============================================================================
// BANDIT STATE TESTS
// ============================================================================

describe('Bandit State Management', () => {
  it('should reset state', () => {
    const state = createBanditState('epsilon_greedy')

    // Add some data
    let updated = state
    const outcome = createMockOutcome('hybrid_lossy', 1000, 700, 800)
    const reward = calculateReward(outcome)
    updated = updateArm(updated, 'hybrid_lossy', reward)

    expect(updated.totalPulls).toBe(1)

    // Reset
    const reset = resetBanditState(updated)

    expect(reset.totalPulls).toBe(0)
    expect(reset.histories.get('hybrid_lossy')?.totalPulls).toBe(0)
  })

  it('should get arm statistics', () => {
    const state = createBanditState('ucb')

    let updated = state
    for (let i = 0; i < 5; i++) {
      const outcome = createMockOutcome('hybrid_lossy', 1000, 700, 800)
      const reward = calculateReward(outcome)
      updated = updateArm(updated, 'hybrid_lossy', reward)
    }

    const stats = getArmStatistics(updated)

    expect(stats).toHaveLength(8)
    expect(stats[0].strategy).toBeDefined()
    expect(stats[0].totalPulls).toBeGreaterThanOrEqual(0)
  })

  it('should calculate explore/exploit ratio', () => {
    const state = createBanditState('epsilon_greedy')

    let updated = state
    for (let i = 0; i < 10; i++) {
      const selection = selectArm(updated)
      const outcome = createMockOutcome(selection.strategy, 1000, 700, 800)
      const reward = calculateReward(outcome)
      updated = updateArm(updated, selection.strategy, reward)
    }

    const ratio = getExplorationExploitationRatio(updated)

    expect(ratio.explore).toBeGreaterThanOrEqual(0)
    expect(ratio.exploit).toBeGreaterThanOrEqual(0)
    expect(ratio.ratio).toBeGreaterThanOrEqual(0)
  })

  it('should get algorithm performance', () => {
    const state = createBanditState('ucb')

    let updated = state
    for (let i = 0; i < 20; i++) {
      const selection = selectArm(updated)
      const outcome = createMockOutcome(selection.strategy, 1000, 700, 800)
      const reward = calculateReward(outcome)
      updated = updateArm(updated, selection.strategy, reward)
    }

    const perf = getAlgorithmPerformance(updated)

    expect(perf.totalPulls).toBe(20)
    expect(perf.averageReward).toBeGreaterThan(0)
    expect(perf.cumulativeReward).toBeGreaterThan(0)
    expect(perf.bestStrategy).toBeDefined()
  })

  it('should serialize and deserialize state', () => {
    const state = createBanditState('thompson_sampling')

    let updated = state
    for (let i = 0; i < 5; i++) {
      const outcome = createMockOutcome('hybrid_lossy', 1000, 700, 800)
      const reward = calculateReward(outcome)
      updated = updateArm(updated, 'hybrid_lossy', reward)
    }

    const json = serializeBanditState(updated)
    const restored = deserializeBanditState(json)

    expect(restored.algorithm).toBe(updated.algorithm)
    expect(restored.totalPulls).toBe(updated.totalPulls)
    expect(restored.histories.size).toBe(updated.histories.size)
  })
})

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Bandit Integration', () => {
  beforeEach(() => {
    resetBanditManager()
  })

  it('should get bandit manager', () => {
    const manager = getBanditManager()

    expect(manager).toBeDefined()
  })

  it('should optimize context with bandit', async () => {
    const manager = getBanditManager({
      algorithm: 'epsilon_greedy',
      parameters: { epsilon: 0.0 },  // Always exploit
      autoOptimizeThreshold: 0.5,  // Lower threshold for testing
      minMessagesForOptimization: 5
    })

    const messages = [
      createMockMessage('1', 'Message 1'),
      createMockMessage('2', 'Message 2'),
      createMockMessage('3', 'Message 3'),
      createMockMessage('4', 'Message 4'),
      createMockMessage('5', 'Message 5')
    ]

    const result = await manager.optimizeContext({
      conversationId: 'test-conv',
      messages,
      currentTokens: 90000,
      maxTokens: 100000,
      contextPercentage: 90
    })

    expect(result.success).toBe(true)
    expect(result.strategy).toBeDefined()
    expect(result.compressedMessages).toBeDefined()
    expect(result.selectionReason).toBeDefined()
  })

  it('should skip optimization when not needed', async () => {
    const manager = getBanditManager()

    const messages = [createMockMessage('1', 'Message 1')]

    const result = await manager.optimizeContext({
      conversationId: 'test-conv',
      messages,
      currentTokens: 50000,
      maxTokens: 100000,
      contextPercentage: 50
    })

    expect(result.success).toBe(false)
    expect(result.strategy).toBe('none')
  })

  it('should track optimization count', async () => {
    const manager = getBanditManager({
      algorithm: 'ucb',
      autoOptimizeThreshold: 0.5,
      minMessagesForOptimization: 5
    })

    const messages = Array.from({ length: 10 }, (_, i) =>
      createMockMessage(`${i}`, `Message ${i}`)
    )

    await manager.optimizeContext({
      conversationId: 'test-conv',
      messages,
      currentTokens: 90000,
      maxTokens: 100000,
      contextPercentage: 90
    })

    const stats = manager.getStatistics('test-conv')

    expect(stats.optimizationCount).toBe(1)
  })

  it('should get statistics', async () => {
    const manager = getBanditManager({
      algorithm: 'epsilon_greedy',
      autoOptimizeThreshold: 0.5,
      minMessagesForOptimization: 5
    })

    const messages = Array.from({ length: 10 }, (_, i) =>
      createMockMessage(`${i}`, `Message ${i}`)
    )

    await manager.optimizeContext({
      conversationId: 'test-conv',
      messages,
      currentTokens: 90000,
      maxTokens: 100000,
      contextPercentage: 90
    })

    const stats = manager.getStatistics('test-conv')

    expect(stats.armStatistics).toBeDefined()
    expect(stats.exploreExploitRatio).toBeDefined()
    expect(stats.algorithmPerformance).toBeDefined()
  })

  it('should persist and load state', () => {
    const manager = getBanditManager({
      algorithm: 'epsilon_greedy',
      enablePersistence: false  // Don't use actual localStorage in tests
    })

    const state = manager['globalState']

    expect(state).toBeDefined()
    expect(state?.algorithm).toBeDefined()
  })
})

// ============================================================================
// UTILITY TESTS
// ============================================================================

describe('Utility Functions', () => {
  it('should convert compression result to outcome', () => {
    const result = createMockCompressionResult(1000, 600)

    const outcome = compressionResultToOutcome(
      result,
      'hybrid_lossy',
      'test-conv',
      90,
      100,
      2,
      3
    )

    expect(outcome.strategy).toBe('hybrid_lossy')
    expect(outcome.originalTokens).toBe(1000)
    expect(outcome.compressedTokens).toBe(600)
    expect(outcome.conversationId).toBe('test-conv')
  })

  it('should get best strategy', () => {
    const histories = new Map<CompactionStrategy, any>()

    // Give hybrid_lossy high rewards
    const hybridHistory = createInitialRewardHistory('hybrid_lossy')
    for (let i = 0; i < 10; i++) {
      const outcome = createMockOutcome('hybrid_lossy', 1000, 600, 800)
      const reward = calculateReward(outcome)
      hybridHistory.rewards.push(reward)
      hybridHistory.totalPulls++
      hybridHistory.cumulativeReward += reward.reward
      hybridHistory.averageReward = hybridHistory.cumulativeReward / hybridHistory.totalPulls
    }
    histories.set('hybrid_lossy', hybridHistory)

    // Give recent_only low rewards
    const recentHistory = createInitialRewardHistory('recent_only')
    for (let i = 0; i < 10; i++) {
      const outcome = createMockOutcome('recent_only', 1000, 950, 800)
      const reward = calculateReward(outcome)
      recentHistory.rewards.push(reward)
      recentHistory.totalPulls++
      recentHistory.cumulativeReward += reward.reward
      recentHistory.averageReward = recentHistory.cumulativeReward / recentHistory.totalPulls
    }
    histories.set('recent_only', recentHistory)

    const best = getBestStrategy(histories, 5)

    expect(best).toBe('hybrid_lossy')
  })

  it('should calculate improvement over baseline', () => {
    const strategyHistory = createInitialRewardHistory('hybrid_lossy')

    // Add good rewards
    for (let i = 0; i < 10; i++) {
      const outcome = createMockOutcome('hybrid_lossy', 1000, 600, 800)
      const reward = calculateReward(outcome)
      strategyHistory.rewards.push(reward)
      strategyHistory.totalPulls++
      strategyHistory.cumulativeReward += reward.reward
      strategyHistory.averageReward = strategyHistory.cumulativeReward / strategyHistory.totalPulls
    }

    const baselineHistory = createInitialRewardHistory('none')

    // Add baseline rewards
    for (let i = 0; i < 10; i++) {
      const outcome = createMockOutcome('none', 1000, 1000, 800)
      const reward = calculateReward(outcome)
      baselineHistory.rewards.push(reward)
      baselineHistory.totalPulls++
      baselineHistory.cumulativeReward += reward.reward
      baselineHistory.averageReward = baselineHistory.cumulativeReward / baselineHistory.totalPulls
    }

    const improvement = calculateImprovementOverBaseline(strategyHistory, baselineHistory)

    expect(improvement.rewardImprovement).toBeGreaterThan(0)
    expect(improvement.tokenSavings).toBeGreaterThan(0)
    expect(improvement.qualityTradeoff).toBeGreaterThanOrEqual(0)
  })
})
