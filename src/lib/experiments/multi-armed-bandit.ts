/**
 * Multi-Armed Bandit Algorithms
 *
 * Implements 4 bandit algorithms for adaptive experiment optimization:
 * 1. Epsilon-Greedy: Simple exploration vs exploitation
 * 2. UCB1 (Upper Confidence Bound): Optimism in face of uncertainty
 * 3. Thompson Sampling: Bayesian probability matching
 * 4. Adaptive Allocation: Gradient-based optimization
 */

import type {
  Variant,
  BanditState,
  PosteriorParameters,
} from './types';

/**
 * Bandit algorithm types
 */
export type BanditAlgorithm = 'epsilon-greedy' | 'ucb1' | 'thompson-sampling' | 'adaptive';

/**
 * Bandit configuration
 */
export interface BanditConfig {
  /** Algorithm to use */
  algorithm: BanditAlgorithm;

  /** Exploration rate (for epsilon-greedy) */
  epsilon?: number;

  /** Confidence level (for UCB1) */
  confidenceLevel?: number;

  /** Learning rate (for adaptive) */
  learningRate?: number;

  /** Minimum pulls before trusting bandit */
  minPullsPerVariant?: number;

  /** Temperature for softmax (adaptive) */
  temperature?: number;

  /** Whether to decay exploration over time */
  decayExploration?: boolean;

  /** Exploration decay rate */
  decayRate?: number;
}

/**
 * Bandit arm statistics
 */
export interface BanditArm {
  /** Variant ID */
  variantId: string;

  /** Number of pulls (assignments) */
  pulls: number;

  /** Cumulative reward */
  reward: number;

  /** Average reward */
  averageReward: number;

  /** Last updated timestamp */
  lastUpdated: number;
}

/**
 * Bandit selection result
 */
export interface BanditSelection {
  /** Selected variant ID */
  variantId: string;

  /** Algorithm used */
  algorithm: BanditAlgorithm;

  /** Selection score (for debugging) */
  score: number;

  /** Exploration vs exploitation decision */
  explored: boolean;

  /** All arm scores (for debugging) */
  allScores: Record<string, number>;
}

/**
 * Multi-armed bandit implementation
 */
export class MultiArmedBandit {
  private config: BanditConfig;
  private arms: Map<string, BanditArm> = new Map();
  private totalPulls = 0;
  private currentEpsilon = 0;

  constructor(config: BanditConfig) {
    this.config = {
      algorithm: config.algorithm || 'thompson-sampling',
      epsilon: config.epsilon ?? 0.1,
      confidenceLevel: config.confidenceLevel ?? 2.0,
      learningRate: config.learningRate ?? 0.1,
      minPullsPerVariant: config.minPullsPerVariant ?? 10,
      temperature: config.temperature ?? 1.0,
      decayExploration: config.decayExploration ?? false,
      decayRate: config.decayRate ?? 0.995,
    };
    this.currentEpsilon = this.config.epsilon!;
  }

  /**
   * Select variant using configured algorithm
   */
  selectVariant(variants: Variant[]): BanditSelection {
    if (variants.length === 0) {
      throw new Error('No variants available');
    }

    // Initialize arms if needed
    this.initializeArms(variants);

    // Decay exploration if enabled
    if (this.config.decayExploration) {
      this.currentEpsilon *= this.config.decayRate!;
    }

    // Select algorithm
    switch (this.config.algorithm) {
      case 'epsilon-greedy':
        return this.epsilonGreedy(variants);
      case 'ucb1':
        return this.ucb1(variants);
      case 'thompson-sampling':
        return this.thompsonSampling(variants);
      case 'adaptive':
        return this.adaptiveAllocation(variants);
      default:
        return this.thompsonSampling(variants);
    }
  }

  /**
   * Update bandit with reward signal
   */
  updateReward(variantId: string, reward: number): void {
    const arm = this.arms.get(variantId);
    if (!arm) {
      console.warn(`[Bandit] Unknown variant: ${variantId}`);
      return;
    }

    // Update statistics
    arm.pulls += 1;
    arm.reward += reward;
    arm.averageReward = arm.reward / arm.pulls;
    arm.lastUpdated = Date.now();

    this.totalPulls += 1;
  }

  /**
   * Get current arm statistics
   */
  getArmStatistics(): Record<string, BanditArm> {
    const stats: Record<string, BanditArm> = {};
    this.arms.forEach((arm, variantId) => {
      stats[variantId] = { ...arm };
    });
    return stats;
  }

  /**
   * Get best performing variant
   */
  getBestVariant(): string | null {
    let bestVariantId: string | null = null;
    let bestReward = -Infinity;

    this.arms.forEach((arm, variantId) => {
      if (arm.averageReward > bestReward && arm.pulls >= this.config.minPullsPerVariant!) {
        bestReward = arm.averageReward;
        bestVariantId = variantId;
      }
    });

    return bestVariantId;
  }

  /**
   * Check if bandit has converged
   */
  hasConverged(threshold = 0.01): boolean {
    if (this.totalPulls < this.config.minPullsPerVariant! * this.arms.size * 10) {
      return false;
    }

    const rewards = Array.from(this.arms.values()).map(a => a.averageReward);
    const maxReward = Math.max(...rewards);
    const minReward = Math.min(...rewards);

    return (maxReward - minReward) < threshold;
  }

  /**
   * Reset bandit state
   */
  reset(): void {
    this.arms.clear();
    this.totalPulls = 0;
    this.currentEpsilon = this.config.epsilon!;
  }

  /**
   * Export bandit state
   */
  exportState(): BanditState {
    const posteriors: Record<string, PosteriorParameters> = {};

    this.arms.forEach((arm, variantId) => {
      // Convert to Beta posterior parameters
      const alpha = 1 + arm.reward;
      const beta = 1 + (arm.pulls - arm.reward);
      const total = alpha + beta;

      posteriors[variantId] = {
        alpha,
        beta,
        mean: arm.averageReward,
        variance: (alpha * beta) / (total * total * (total + 1)),
        stdDev: Math.sqrt((alpha * beta) / (total * total * (total + 1))),
      };
    });

    return {
      experimentId: 'unknown',
      counts: {},
      rewards: {},
      posteriors,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Initialize bandit arms for variants
   */
  private initializeArms(variants: Variant[]): void {
    variants.forEach(variant => {
      if (!this.arms.has(variant.id)) {
        this.arms.set(variant.id, {
          variantId: variant.id,
          pulls: 0,
          reward: 0,
          averageReward: 0,
          lastUpdated: Date.now(),
        });
      }
    });
  }

  /**
   * Epsilon-Greedy Algorithm
   *
   * With probability epsilon: explore (random variant)
   * With probability 1-epsilon: exploit (best variant)
   */
  private epsilonGreedy(variants: Variant[]): BanditSelection {
    const explored = Math.random() < this.currentEpsilon;
    let selectedVariant: string;
    const allScores: Record<string, number> = {};

    if (explored) {
      // Explore: random variant
      selectedVariant = variants[Math.floor(Math.random() * variants.length)].id;
      variants.forEach(v => {
        allScores[v.id] = Math.random();
      });
    } else {
      // Exploit: best variant
      let bestVariantId = variants[0].id;
      let bestReward = -Infinity;

      variants.forEach(v => {
        const arm = this.arms.get(v.id)!;
        const score = arm.pulls < this.config.minPullsPerVariant!
          ? Infinity // Encourage exploration of new arms
          : arm.averageReward;

        allScores[v.id] = score;

        if (score > bestReward) {
          bestReward = score;
          bestVariantId = v.id;
        }
      });

      selectedVariant = bestVariantId;
    }

    return {
      variantId: selectedVariant,
      algorithm: 'epsilon-greedy',
      score: allScores[selectedVariant],
      explored,
      allScores,
    };
  }

  /**
   * UCB1 Algorithm (Upper Confidence Bound)
   *
   * Selects variant with highest upper confidence bound:
   * score = average_reward + confidence_level * sqrt(ln(total_pulls) / pulls)
   */
  private ucb1(variants: Variant[]): BanditSelection {
    const allScores: Record<string, number> = {};
    let bestVariantId = variants[0].id;
    let bestScore = -Infinity;

    variants.forEach(v => {
      const arm = this.arms.get(v.id)!;
      let score: number;

      if (arm.pulls === 0) {
        // Never pulled: prioritize exploration
        score = Infinity;
      } else {
        // UCB1 formula
        const explorationBonus = this.config.confidenceLevel! *
          Math.sqrt(Math.log(this.totalPulls + 1) / arm.pulls);
        score = arm.averageReward + explorationBonus;
      }

      allScores[v.id] = score;

      if (score > bestScore) {
        bestScore = score;
        bestVariantId = v.id;
      }
    });

    return {
      variantId: bestVariantId,
      algorithm: 'ucb1',
      score: bestScore,
      explored: false, // UCB1 inherently balances exploration/exploitation
      allScores,
    };
  }

  /**
   * Thompson Sampling Algorithm
   *
   * Bayesian approach: sample from posterior distribution of each arm
   * and select the one with highest sample
   */
  private thompsonSampling(variants: Variant[]): BanditSelection {
    const allScores: Record<string, number> = {};
    let bestVariantId = variants[0].id;
    let bestSample = -Infinity;

    variants.forEach(v => {
      const arm = this.arms.get(v.id)!;
      let sample: number;

      if (arm.pulls === 0) {
        // Never pulled: maximum uncertainty
        sample = Math.random();
      } else {
        // Sample from Beta posterior
        const alpha = 1 + arm.reward;
        const beta = 1 + (arm.pulls - arm.reward);
        sample = this.sampleBeta(alpha, beta);
      }

      allScores[v.id] = sample;

      if (sample > bestSample) {
        bestSample = sample;
        bestVariantId = v.id;
      }
    });

    return {
      variantId: bestVariantId,
      algorithm: 'thompson-sampling',
      score: bestSample,
      explored: false, // Thompson sampling inherently balances
      allScores,
    };
  }

  /**
   * Adaptive Allocation Algorithm (Gradient-based)
   *
   * Uses gradient descent to adapt allocation probabilities
   * based on reward signals
   */
  private adaptiveAllocation(variants: Variant[]): BanditSelection {
    const allScores: Record<string, number> = {};
    const probabilities: Record<string, number> = {};

    // Calculate softmax probabilities
    const scores: number[] = [];
    variants.forEach(v => {
      const arm = this.arms.get(v.id)!;
      // Use average reward with exploration bonus for new arms
      const score = arm.pulls < this.config.minPullsPerVariant!
        ? 1000 // Large bonus for new arms
        : arm.averageReward * 100;

      scores.push(score);
      allScores[v.id] = score;
    });

    // Softmax with temperature
    const expScores = scores.map(s => Math.exp(s / this.config.temperature!));
    const sumExpScores = expScores.reduce((a, b) => a + b, 0);

    variants.forEach((v, i) => {
      probabilities[v.id] = expScores[i] / sumExpScores;
    });

    // Sample variant based on probabilities
    const random = Math.random();
    let cumulative = 0;
    let selectedVariant = variants[0].id;

    for (const v of variants) {
      cumulative += probabilities[v.id];
      if (random <= cumulative) {
        selectedVariant = v.id;
        break;
      }
    }

    return {
      variantId: selectedVariant,
      algorithm: 'adaptive',
      score: allScores[selectedVariant],
      explored: Math.random() < this.currentEpsilon,
      allScores,
    };
  }

  /**
   * Sample from Beta distribution
   */
  private sampleBeta(alpha: number, beta: number): number {
    // Use ratio of Gamma variables
    const gamma1 = this.sampleGamma(alpha);
    const gamma2 = this.sampleGamma(beta);
    return gamma1 / (gamma1 + gamma2);
  }

  /**
   * Sample from Gamma distribution (Marsaglia and Tsang's method)
   */
  private sampleGamma(alpha: number): number {
    if (alpha < 1) {
      return this.sampleGamma(alpha + 1) * Math.pow(Math.random(), 1 / alpha);
    }

    const d = alpha - 1/3;
    const c = 1 / Math.sqrt(9 * d);

    while (true) {
      let x, v;
      do {
        x = this.sampleNormal();
        v = 1 + c * x;
      } while (v <= 0);

      v = v * v * v;
      const u = Math.random();

      if (u < 1 - 0.0331 * (x * x) * (x * x)) {
        return d * v;
      }

      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
        return d * v;
      }
    }
  }

  /**
   * Sample from standard normal distribution (Box-Muller transform)
   */
  private sampleNormal(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }
}

/**
 * Bandit algorithm comparison
 */
export function compareBanditAlgorithms(
  variants: Variant[],
  rewards: Record<string, number[]>,
  rounds = 1000
): Record<BanditAlgorithm, { totalReward: number; finalVariant: string }> {
  const results: Record<BanditAlgorithm, { totalReward: number; finalVariant: string }> = {
    'epsilon-greedy': { totalReward: 0, finalVariant: '' },
    'ucb1': { totalReward: 0, finalVariant: '' },
    'thompson-sampling': { totalReward: 0, finalVariant: '' },
    'adaptive': { totalReward: 0, finalVariant: '' },
  };

  const algorithms: BanditAlgorithm[] = ['epsilon-greedy', 'ucb1', 'thompson-sampling', 'adaptive'];

  algorithms.forEach(algorithm => {
    const bandit = new MultiArmedBandit({ algorithm });
    let totalReward = 0;

    for (let i = 0; i < rounds; i++) {
      const selection = bandit.selectVariant(variants);
      const variantRewards = rewards[selection.variantId];
      const reward = variantRewards[Math.floor(Math.random() * variantRewards.length)];

      bandit.updateReward(selection.variantId, reward);
      totalReward += reward;
    }

    results[algorithm] = {
      totalReward,
      finalVariant: bandit.getBestVariant() || variants[0].id,
    };
  });

  return results;
}

/**
 * Recommend bandit algorithm based on experiment characteristics
 */
export function recommendBanditAlgorithm(
  numVariants: number,
  expectedVolume: number,
  rewardVariance: 'low' | 'medium' | 'high'
): BanditAlgorithm {
  // For low volume, use epsilon-greedy (simple, stable)
  if (expectedVolume < 1000) {
    return 'epsilon-greedy';
  }

  // For high volume with many variants, use UCB1
  if (numVariants > 5 && expectedVolume > 10000) {
    return 'ucb1';
  }

  // For high variance rewards, use Thompson sampling
  if (rewardVariance === 'high') {
    return 'thompson-sampling';
  }

  // Default: Thompson sampling (best overall)
  return 'thompson-sampling';
}
