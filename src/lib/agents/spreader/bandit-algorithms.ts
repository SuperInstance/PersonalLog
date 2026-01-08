/**
 * Multi-Armed Bandit Algorithms
 *
 * Implements three classic bandit algorithms for context compaction strategy selection:
 * - Epsilon-Greedy: Explore with probability ε, exploit otherwise
 * - UCB (Upper Confidence Bound): Optimism in face of uncertainty
 * - Thompson Sampling: Bayesian approach with probability matching
 *
 * Each algorithm balances exploration (trying new strategies) vs exploitation
 * (using known best strategies).
 */

import {
  CompactionStrategy,
  COMPACTION_STRATEGIES,
  StrategyReward,
  RewardHistory,
  createInitialRewardHistory,
  updateRewardHistory,
  calculateUCBBonus
} from './bandit-rewards'

// ============================================================================
// ALGORITHM TYPES
// ============================================================================

export type BanditAlgorithm = 'epsilon_greedy' | 'ucb' | 'thompson_sampling'

export interface BanditState {
  algorithm: BanditAlgorithm
  histories: Map<CompactionStrategy, RewardHistory>
  totalPulls: number
  lastUpdate: number
  parameters: BanditParameters
}

export interface BanditParameters {
  // Epsilon-Greedy parameters
  epsilon?: number  // Exploration rate [0, 1]
  epsilonDecay?: number  // Decay factor per pull

  // UCB parameters
  ucbC?: number  // Exploration parameter (default: sqrt(2))

  // Thompson Sampling parameters
  priorAlpha?: number  // Beta distribution prior (successes)
  priorBeta?: number   // Beta distribution prior (failures)

  // Common parameters
  minPullsBeforeExploit?: number  // Minimum pulls before exploiting
}

export interface SelectionResult {
  strategy: CompactionStrategy
  algorithm: BanditAlgorithm
  exploreExploit: 'explore' | 'exploit'
  confidence: number  // [0, 1] confidence in selection
  reason: string
}

export interface ArmStatistics {
  strategy: CompactionStrategy
  totalPulls: number
  averageReward: number
  cumulativeReward: number
  variance: number
  confidenceInterval: [number, number]
  recentAverage: number
  recentTrend: 'improving' | 'stable' | 'declining'
  winRate: number  // % of times it was best strategy
}

// ============================================================================
// BANDIT STATE MANAGEMENT
// ============================================================================

/**
 * Create initial bandit state for an algorithm.
 */
export function createBanditState(
  algorithm: BanditAlgorithm,
  parameters?: Partial<BanditParameters>
): BanditState {
  const histories = new Map<CompactionStrategy, RewardHistory>()

  for (const strategy of COMPACTION_STRATEGIES) {
    histories.set(strategy, createInitialRewardHistory(strategy))
  }

  const defaultParameters: BanditParameters = {
    epsilon: 0.1,  // 10% exploration
    epsilonDecay: 0.995,  // Slow decay
    ucbC: Math.sqrt(2),
    priorAlpha: 1,
    priorBeta: 1,
    minPullsBeforeExploit: 3
  }

  return {
    algorithm,
    histories,
    totalPulls: 0,
    lastUpdate: Date.now(),
    parameters: { ...defaultParameters, ...parameters }
  }
}

/**
 * Reset bandit state (e.g., for new conversation).
 */
export function resetBanditState(state: BanditState): BanditState {
  return createBanditState(state.algorithm, state.parameters)
}

// ============================================================================
// EPSILON-GREEDY ALGORITHM
// ============================================================================

/**
 * Select arm using epsilon-greedy strategy.
 *
 * With probability epsilon: select random arm (explore)
 * With probability 1-epsilon: select arm with highest average reward (exploit)
 */
export function selectArmEpsilonGreedy(
  state: BanditState
): SelectionResult {
  const { epsilon, epsilonDecay, minPullsBeforeExploit } = state.parameters
  const histories = state.histories

  // Decay epsilon over time
  const currentEpsilon =
    (epsilon || 0.1) * Math.pow(epsilonDecay || 1, state.totalPulls)

  // Find best arm (exploit)
  let bestStrategy: CompactionStrategy | null = null
  let bestReward = -Infinity

  for (const [strategy, history] of histories.entries()) {
    // Use recent average for more adaptive behavior
    const reward =
      history.recentRewards.length >= 3
        ? history.recentAverage
        : history.averageReward

    if (reward > bestReward && history.totalPulls >= (minPullsBeforeExploit || 0)) {
      bestReward = reward
      bestStrategy = strategy
    }
  }

  // Exploration vs exploitation
  const shouldExplore = Math.random() < currentEpsilon

  if (shouldExplore || !bestStrategy) {
    // Explore: select random arm (prefer under-explored arms)
    const armPulls = Array.from(histories.values()).map(h => h.totalPulls)
    const minPulls = Math.min(...armPulls)

    const underExplored = Array.from(histories.entries())
      .filter(([_, h]) => h.totalPulls === minPulls)
      .map(([s, _]) => s)

    const strategy =
      underExplored[Math.floor(Math.random() * underExplored.length)]

    return {
      strategy,
      algorithm: 'epsilon_greedy',
      exploreExploit: 'explore',
      confidence: 1 - currentEpsilon,
      reason: `Exploring (ε=${currentEpsilon.toFixed(3)})`
    }
  } else {
    // Exploit: select best arm
    return {
      strategy: bestStrategy!,
      algorithm: 'epsilon_greedy',
      exploreExploit: 'exploit',
      confidence: 1 - currentEpsilon,
      reason: `Exploiting best strategy (ε=${currentEpsilon.toFixed(3)})`
    }
  }
}

// ============================================================================
// UCB (UPPER CONFIDENCE BOUND) ALGORITHM
// ============================================================================

/**
 * Select arm using UCB strategy.
 *
 * Select arm with highest upper confidence bound:
 * UCB = average_reward + c * sqrt(ln(total_pulls) / arm_pulls)
 *
 * This algorithm is optimistic in the face of uncertainty - it prefers
 * arms that haven't been explored much.
 */
export function selectArmUCB(state: BanditState): SelectionResult {
  const { ucbC, minPullsBeforeExploit } = state.parameters
  const histories = state.histories
  const totalPulls = Math.max(1, state.totalPulls)

  let bestStrategy: CompactionStrategy | null = null
  let bestUCB = -Infinity

  for (const [strategy, history] of histories.entries()) {
    // Skip arms with zero pulls (initialize them first)
    if (history.totalPulls === 0) {
      return {
        strategy,
        algorithm: 'ucb',
        exploreExploit: 'explore',
        confidence: 1.0,
        reason: 'Initializing unexplored arm'
      }
    }

    // Calculate UCB
    const averageReward = history.averageReward
    const explorationBonus = calculateUCBBonus(
      totalPulls,
      history.totalPulls,
      ucbC || Math.sqrt(2)
    )

    const ucb = averageReward + explorationBonus

    if (ucb > bestUCB) {
      bestUCB = ucb
      bestStrategy = strategy
    }
  }

  // Calculate confidence based on how many pulls the best arm has
  const bestHistory = histories.get(bestStrategy!)
  const confidence =
    bestHistory && bestHistory.totalPulls >= (minPullsBeforeExploit || 0)
      ? Math.min(1, bestHistory.totalPulls / 20)  // Cap at 20 pulls
      : 0.5

  const exploreExploit: 'explore' | 'exploit' =
    confidence < 0.5 ? 'explore' : 'exploit'

  return {
    strategy: bestStrategy!,
    algorithm: 'ucb',
    exploreExploit,
    confidence,
    reason: `UCB = ${bestUCB!.toFixed(3)}`
  }
}

// ============================================================================
// THOMPSON SAMPLING ALGORITHM
// ============================================================================

/**
 * Beta distribution probability density function.
 */
function betaPDF(x: number, alpha: number, beta: number): number {
  if (x < 0 || x > 1) return 0

  // Use log-gamma to avoid overflow
  const logBeta = logGamma(alpha) + logGamma(beta) - logGamma(alpha + beta)
  const logPDF = (alpha - 1) * Math.log(x) + (beta - 1) * Math.log(1 - x) - logBeta

  return Math.exp(logPDF)
}

/**
 * Log-gamma function (log of gamma function).
 */
function logGamma(x: number): number {
  // Lanczos approximation
  const coef = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5
  ]

  const ser = 1.000000000190015
  let tmp = x + 5.5
  tmp -= (x + 0.5) * Math.log(tmp)

  let sum = ser
  for (let j = 0; j < 6; j++) {
    sum += coef[j] / (x + j + 1)
  }

  return -tmp + Math.log(2.5066282746310005 * sum / x)
}

/**
 * Sample from Beta distribution.
 */
function sampleBeta(alpha: number, beta: number): number {
  // Use rejection sampling
  while (true) {
    const u1 = Math.random()
    const u2 = Math.random()

    const x = u1
    const y = u2 * betaPDF(x, alpha, beta)

    if (y < betaPDF(x, alpha, beta)) {
      return x
    }
  }
}

/**
 * Select arm using Thompson sampling strategy.
 *
 * For each arm, sample from its posterior Beta distribution:
 * - Alpha = priorAlpha + successes (rewards)
 * - Beta = priorBeta + failures (1 - rewards)
 *
 * Select arm with highest sample.
 *
 * This naturally balances exploration and exploitation through
 * probability matching.
 */
export function selectArmThompsonSampling(
  state: BanditState
): SelectionResult {
  const { priorAlpha, priorBeta, minPullsBeforeExploit } = state.parameters
  const histories = state.histories

  let bestStrategy: CompactionStrategy | null = null
  let bestSample = -Infinity

  for (const [strategy, history] of histories.entries()) {
    // Calculate posterior parameters
    const alpha = (priorAlpha || 1) + history.cumulativeReward
    const beta = (priorBeta || 1) + (history.totalPulls - history.cumulativeReward)

    // Sample from posterior
    const sample = sampleBeta(alpha, beta)

    if (sample > bestSample) {
      bestSample = sample
      bestStrategy = strategy
    }
  }

  // Calculate confidence based on posterior concentration
  const bestHistory = histories.get(bestStrategy!)
  const alpha = (priorAlpha || 1) + (bestHistory?.cumulativeReward || 0)
  const beta = (priorBeta || 1) + (bestHistory?.totalPulls || 0)

  // Variance of Beta distribution
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1))
  const confidence = Math.max(0, Math.min(1, 1 - variance * 4))

  const exploreExploit: 'explore' | 'exploit' =
    (bestHistory?.totalPulls || 0) < (minPullsBeforeExploit || 0)
      ? 'explore'
      : 'exploit'

  return {
    strategy: bestStrategy!,
    algorithm: 'thompson_sampling',
    exploreExploit,
    confidence,
    reason: `Sampled value: ${bestSample.toFixed(3)}`
  }
}

// ============================================================================
// UNIFIED SELECTION INTERFACE
// ============================================================================

/**
 * Select arm using configured algorithm.
 */
export function selectArm(state: BanditState): SelectionResult {
  switch (state.algorithm) {
    case 'epsilon_greedy':
      return selectArmEpsilonGreedy(state)

    case 'ucb':
      return selectArmUCB(state)

    case 'thompson_sampling':
      return selectArmThompsonSampling(state)

    default:
      throw new Error(`Unknown algorithm: ${state.algorithm}`)
  }
}

// ============================================================================
// UPDATE MECHANISM
// ============================================================================

/**
 * Update bandit state with observed reward.
 */
export function updateArm(
  state: BanditState,
  strategy: CompactionStrategy,
  reward: StrategyReward
): BanditState {
  const history = state.histories.get(strategy)

  if (!history) {
    throw new Error(`Unknown strategy: ${strategy}`)
  }

  // Update history
  const updatedHistory = updateRewardHistory(history, reward)

  // Create new state (immutable)
  const newHistories = new Map(state.histories)
  newHistories.set(strategy, updatedHistory)

  return {
    ...state,
    histories: newHistories,
    totalPulls: state.totalPulls + 1,
    lastUpdate: Date.now()
  }
}

/**
 * Get statistics for all arms.
 */
export function getArmStatistics(
  state: BanditState
): ArmStatistics[] {
  const stats: ArmStatistics[] = []

  // Find total rewards for win rate calculation
  const maxPulls = Math.max(
    ...Array.from(state.histories.values()).map(h => h.totalPulls)
  )

  for (const [strategy, history] of state.histories.entries()) {
    stats.push({
      strategy,
      totalPulls: history.totalPulls,
      averageReward: history.averageReward,
      cumulativeReward: history.cumulativeReward,
      variance: history.variance,
      confidenceInterval: history.confidenceInterval,
      recentAverage: history.recentAverage,
      recentTrend: history.recentTrend,
      winRate: maxPulls > 0 ? history.totalPulls / maxPulls : 0
    })
  }

  // Sort by average reward (descending)
  stats.sort((a, b) => b.averageReward - a.averageReward)

  return stats
}

/**
 * Get exploration vs exploitation ratio.
 */
export function getExplorationExploitationRatio(
  state: BanditState
): { explore: number; exploit: number; ratio: number } {
  const stats = getArmStatistics(state)

  // Count explore vs exploit based on pulls
  // Arms with < 3 pulls are still being explored
  const exploreCount = stats.filter(s => s.totalPulls < 3).length
  const exploitCount = stats.length - exploreCount

  const ratio = exploitCount > 0 ? exploreCount / exploitCount : exploreCount

  return {
    explore: exploreCount,
    exploit: exploitCount,
    ratio
  }
}

// ============================================================================
// PERSISTENCE
// ============================================================================

export interface BanditStateJSON {
  algorithm: BanditAlgorithm
  histories: Record<string, RewardHistory>
  totalPulls: number
  lastUpdate: number
  parameters: BanditParameters
}

/**
 * Serialize bandit state to JSON.
 */
export function serializeBanditState(state: BanditState): BanditStateJSON {
  const histories: Record<string, RewardHistory> = {}

  for (const [strategy, history] of state.histories.entries()) {
    histories[strategy] = history
  }

  return {
    algorithm: state.algorithm,
    histories,
    totalPulls: state.totalPulls,
    lastUpdate: state.lastUpdate,
    parameters: state.parameters
  }
}

/**
 * Deserialize bandit state from JSON.
 */
export function deserializeBanditState(json: BanditStateJSON): BanditState {
  const histories = new Map<CompactionStrategy, RewardHistory>()

  for (const [strategy, history] of Object.entries(json.histories)) {
    histories.set(strategy as CompactionStrategy, history)
  }

  return {
    algorithm: json.algorithm,
    histories,
    totalPulls: json.totalPulls,
    lastUpdate: json.lastUpdate,
    parameters: json.parameters
  }
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Get algorithm performance summary.
 */
export function getAlgorithmPerformance(
  state: BanditState
): {
  totalPulls: number
  bestStrategy: CompactionStrategy | null
  averageReward: number
  cumulativeReward: number
  convergenceRate: number  // How quickly it found best strategy
} {
  const stats = getArmStatistics(state)
  const bestStrategy = stats.length > 0 ? stats[0].strategy : null

  const totalReward = Array.from(state.histories.values()).reduce(
    (sum, h) => sum + h.cumulativeReward,
    0
  )

  const averageReward =
    state.totalPulls > 0 ? totalReward / state.totalPulls : 0

  // Convergence: pulls until best strategy found / total pulls
  const convergenceRate =
    bestStrategy && state.totalPulls > 0
      ? (state.histories.get(bestStrategy)?.totalPulls || 0) / state.totalPulls
      : 0

  return {
    totalPulls: state.totalPulls,
    bestStrategy,
    averageReward,
    cumulativeReward: totalReward,
    convergenceRate
  }
}
