/**
 * Statistical Analyzer
 *
 * Performs Bayesian analysis on experiment metrics to determine
 * winners and provide probability estimates.
 */

import type {
  Experiment,
  ExperimentResults,
  VariantStats,
  MetricStatistics,
  BanditState,
  ExperimentConfig,
  Variant,
} from './types';
import { MetricsTracker } from './metrics';

/**
 * Beta distribution functions
 */
class BetaDistribution {
  /**
   * Calculate probability density function
   */
  static pdf(x: number, alpha: number, beta: number): number {
    if (x < 0 || x > 1) return 0;
    if (x === 0 && alpha < 1) return Infinity;
    if (x === 1 && beta < 1) return Infinity;

    // Use log to avoid overflow
    const logPdf =
      (alpha - 1) * Math.log(x) +
      (beta - 1) * Math.log(1 - x) +
      this.logBetaFunction(alpha, beta);

    return Math.exp(logPdf);
  }

  /**
   * Calculate mean of Beta distribution
   */
  static mean(alpha: number, beta: number): number {
    return alpha / (alpha + beta);
  }

  /**
   * Calculate variance of Beta distribution
   */
  static variance(alpha: number, beta: number): number {
    const sum = alpha + beta;
    return (alpha * beta) / (sum * sum * (sum + 1));
  }

  /**
   * Calculate credible interval
   */
  static credibleInterval(alpha: number, beta: number, width: number = 0.95): [number, number] {
    const lower = (1 - width) / 2;
    const upper = (1 + width) / 2;
    return [
      this.quantile(alpha, beta, lower),
      this.quantile(alpha, beta, upper),
    ];
  }

  /**
   * Calculate quantile (inverse CDF) using binary search
   */
  static quantile(alpha: number, beta: number, p: number): number {
    let low = 0;
    let high = 1;

    for (let i = 0; i < 50; i++) {
      const mid = (low + high) / 2;
      const cdf = this.cdf(mid, alpha, beta);

      if (cdf < p) {
        low = mid;
      } else {
        high = mid;
      }
    }

    return (low + high) / 2;
  }

  /**
   * Calculate cumulative distribution function
   */
  static cdf(x: number, alpha: number, beta: number): number {
    // Regularized incomplete beta function
    // Using numerical approximation
    return this.regularizedIncompleteBeta(x, alpha, beta);
  }

  /**
   * Regularized incomplete beta function
   */
  private static regularizedIncompleteBeta(x: number, alpha: number, beta: number): number {
    // Continued fraction approximation
    if (x === 0) return 0;
    if (x === 1) return 1;

    // Use symmetry to improve convergence
    if (x < (alpha + 1) / (alpha + beta + 2)) {
      return (
        Math.pow(x, alpha) * Math.pow(1 - x, beta) /
        (alpha * this.betaFunction(alpha, beta)) *
        this.continuedFraction(x, alpha, beta)
      );
    } else {
      return 1 - this.regularizedIncompleteBeta(1 - x, beta, alpha);
    }
  }

  /**
   * Continued fraction for incomplete beta
   */
  private static continuedFraction(
    x: number,
    alpha: number,
    beta: number,
    maxIterations: number = 100
  ): number {
    const ab = alpha + beta;
    const ap = alpha + 1;
    const am = alpha - 1;

    let d = 1 - ab * x / ap;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    let h = d;

    for (let m = 1; m <= maxIterations; m++) {
      const m2 = 2 * m;
      let aa = m * (beta - m) * x / ((am + m2) * (alpha + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      d = 1 / d;
      h *= aa * d;

      aa = -(alpha + m) * (ab + m) * x / ((alpha + m2) * (ap + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      d = 1 / d;
      h *= aa * d;
    }

    return h;
  }

  /**
   * Beta function
   */
  private static betaFunction(alpha: number, beta: number): number {
    return Math.exp(this.logBetaFunction(alpha, beta));
  }

  /**
   * Log beta function
   */
  private static logBetaFunction(alpha: number, beta: number): number {
    return (
      this.logGamma(alpha) +
      this.logGamma(beta) -
      this.logGamma(alpha + beta)
    );
  }

  /**
   * Log gamma function (Lanczos approximation)
   */
  private static logGamma(z: number): number {
    const c = [
      76.18009172947146,
      -86.50532032941677,
      24.01409824083091,
      -1.231739572450155,
      0.1208650973866179e-2,
      -0.5395239384953e-5,
    ];

    const x = z;
    const y = z;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;

    for (let j = 0; j < 6; j++) {
      y += 1;
      ser += c[j] / y;
    }

    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }
}

/**
 * Statistical analyzer implementation
 */
export class StatisticalAnalyzer {
  private config: ExperimentConfig;
  private banditStates: Map<string, BanditState> = new Map();

  constructor(config: ExperimentConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Load bandit states from storage
    this.loadFromStorage();
  }

  /**
   * Analyze experiment results
   */
  analyze(experiment: Experiment, allMetrics: import('./metrics').MetricsTracker): ExperimentResults | undefined {
    const metricIds = experiment.metrics.map(m => m.id);
    const primaryMetric = experiment.metrics.find(m => m.primary);

    if (!primaryMetric) {
      return undefined;
    }

    // Calculate statistics for each variant
    const variants: Record<string, VariantStats> = {};

    for (const variant of experiment.variants) {
      const stats = allMetrics.getVariantStatistics(
        experiment.id,
        variant.id,
        metricIds
      );

      const exposureCount = allMetrics.getExposureCount(experiment.id, variant.id);

      // Calculate probability of being best for primary metric
      if (stats[primaryMetric.id]) {
        const probability = this.calculateProbabilityOfBeingBest(
          experiment,
          variant.id,
          primaryMetric.id,
          allMetrics
        );

        const control = experiment.variants.find(v => v.isControl)!;
        const lift = this.calculateLift(
          stats[primaryMetric.id],
          allMetrics.getVariantStatistics(experiment.id, control.id, metricIds)[primaryMetric.id],
          primaryMetric.direction
        );

        const expectedImprovement = this.calculateExpectedImprovement(
          stats[primaryMetric.id],
          primaryMetric.direction
        );

        const credibleInterval = BetaDistribution.credibleInterval(
          stats[primaryMetric.id].sampleSize * stats[primaryMetric.id].mean + 1,
          stats[primaryMetric.id].sampleSize * (1 - stats[primaryMetric.id].mean) + 1
        );

        const risk = this.calculateRisk(
          stats[primaryMetric.id],
          control.id === variant.id ? null : allMetrics.getVariantStatistics(experiment.id, control.id, metricIds)[primaryMetric.id],
          primaryMetric.direction
        );

        variants[variant.id] = {
          variantId: variant.id,
          totalUsers: exposureCount,
          exposedUsers: exposureCount,
          metrics: stats,
          probabilityOfBeingBest: probability,
          expectedImprovement,
          credibleInterval,
          risk,
        };
      } else {
        variants[variant.id] = {
          variantId: variant.id,
          totalUsers: exposureCount,
          exposedUsers: exposureCount,
          metrics: stats,
        };
      }
    }

    // Determine winner
    const winner = this.determineWinner(experiment, variants, primaryMetric.id);

    // Calculate overall confidence
    const totalSampleSize = Object.values(variants).reduce(
      (sum, v) => sum + v.totalUsers,
      0
    );

    const hasSignificantResults =
      winner &&
      winner.probability >= experiment.confidenceThreshold &&
      totalSampleSize >= (experiment.targetSampleSize || experiment.variants.length * 100);

    const overallConfidence = hasSignificantResults ? winner.probability : 0;

    // Generate recommendation
    let recommendation: ExperimentResults['recommendation'];
    if (hasSignificantResults) {
      recommendation = 'keep_winner';
    } else if (totalSampleSize >= (experiment.targetSampleSize || 1000)) {
      recommendation = 'inconclusive';
    } else {
      recommendation = 'continue_testing';
    }

    return {
      experimentId: experiment.id,
      status: experiment.status,
      variants,
      winner,
      hasSignificantResults,
      totalSampleSize,
      recommendation,
      analyzedAt: Date.now(),
      overallConfidence,
    };
  }

  /**
   * Calculate probability of being best using Bayesian method
   */
  private calculateProbabilityOfBeingBest(
    experiment: Experiment,
    variantId: string,
    metricId: string,
    allMetrics: import('./metrics').MetricsTracker
  ): number {
    const variantStats = allMetrics.getVariantStatistics(
      experiment.id,
      variantId,
      [metricId]
    )[metricId];

    if (!variantStats || variantStats.sampleSize < 10) {
      return 0; // Not enough data
    }

    // Monte Carlo simulation to estimate probability
    const simulations = 10000;
    const metric = experiment.metrics.find(m => m.id === metricId)!;

    // Get posterior parameters for all variants
    const variantPosterior: Record<string, { alpha: number; beta: number }> = {};

    for (const variant of experiment.variants) {
      const stats = allMetrics.getVariantStatistics(
        experiment.id,
        variant.id,
        [metricId]
      )[metricId];

      if (stats && stats.sampleSize >= 10) {
        // Beta posterior parameters
        // For binary: alpha = successes + 1, beta = failures + 1
        // For numeric: convert to pseudo-binary using mean
        const alpha = stats.mean * stats.sampleSize + 1;
        const beta = (1 - stats.mean) * stats.sampleSize + 1;
        variantPosterior[variant.id] = { alpha, beta };
      }
    }

    // Run Monte Carlo simulation
    let wins = 0;

    for (let i = 0; i < simulations; i++) {
      let bestSample = -Infinity;
      let bestVariant = '';

      for (const [vid, params] of Object.entries(variantPosterior)) {
        const sample = this.sampleBeta(params.alpha, params.beta);

        if (metric.direction === 'maximize') {
          if (sample > bestSample) {
            bestSample = sample;
            bestVariant = vid;
          }
        } else {
          if (bestSample === -Infinity || sample < bestSample) {
            bestSample = sample;
            bestVariant = vid;
          }
        }
      }

      if (bestVariant === variantId) {
        wins++;
      }
    }

    return wins / simulations;
  }

  /**
   * Calculate lift over control
   */
  private calculateLift(
    variantStats: MetricStatistics,
    controlStats: MetricStatistics | undefined,
    direction: 'minimize' | 'maximize'
  ): number {
    if (!controlStats) {
      return 0;
    }

    const baseline = controlStats.mean;
    const value = variantStats.mean;

    if (baseline === 0) {
      return 0;
    }

    const lift = direction === 'maximize'
      ? ((value - baseline) / baseline) * 100
      : ((baseline - value) / baseline) * 100;

    return lift;
  }

  /**
   * Calculate expected improvement
   */
  private calculateExpectedImprovement(
    stats: MetricStatistics,
    direction: 'minimize' | 'maximize'
  ): number {
    // Use mean as expected value
    return direction === 'maximize' ? stats.mean : -stats.mean;
  }

  /**
   * Calculate risk (potential loss)
   */
  private calculateRisk(
    variantStats: MetricStatistics,
    controlStats: MetricStatistics | null,
    direction: 'minimize' | 'maximize'
  ): number {
    if (!controlStats) {
      return 0;
    }

    // Risk is probability that variant is worse than control
    // Simplified: use standard error
    const se = variantStats.stdErr;
    const diff = direction === 'maximize'
      ? variantStats.mean - controlStats.mean
      : controlStats.mean - variantStats.mean;

    // If difference is negative, risk is higher
    return diff < 0 ? Math.abs(diff) / se : 0;
  }

  /**
   * Determine winner from variant statistics
   */
  private determineWinner(
    experiment: Experiment,
    variants: Record<string, VariantStats>,
    primaryMetricId: string
  ): ExperimentResults['winner'] {
    let bestVariant: string | null = null;
    let bestProbability = 0;
    let bestLift = 0;

    const control = experiment.variants.find(v => v.isControl)!;
    const controlStats = variants[control.id];

    for (const [variantId, stats] of Object.entries(variants)) {
      const probability = stats.probabilityOfBeingBest || 0;
      const metricStats = stats.metrics[primaryMetricId];

      if (metricStats && controlStats) {
        const lift = this.calculateLift(
          metricStats,
          controlStats.metrics[primaryMetricId],
          experiment.metrics.find(m => m.id === primaryMetricId)!.direction
        );

        if (probability > bestProbability) {
          bestProbability = probability;
          bestVariant = variantId;
          bestLift = lift;
        }
      }
    }

    if (!bestVariant || bestProbability < experiment.confidenceThreshold) {
      return undefined;
    }

    const liftSign = bestLift >= 0 ? '+' : '';
    const liftPercentage = `${liftSign}${bestLift.toFixed(2)}%`;

    return {
      variantId: bestVariant,
      probability: bestProbability,
      lift: bestLift,
      liftPercentage,
      confidence: `${(bestProbability * 100).toFixed(1)}%`,
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
   * Sample from Gamma distribution
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
   * Sample from standard normal distribution
   */
  private sampleNormal(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }

  /**
   * Export bandit states
   */
  exportBanditStates(): Record<string, BanditState> {
    const obj: Record<string, BanditState> = {};
    this.banditStates.forEach((state, key) => {
      obj[key] = state;
    });
    return obj;
  }

  /**
   * Import bandit states
   */
  importBanditStates(data: Record<string, BanditState>): void {
    this.banditStates.clear();
    Object.entries(data).forEach(([key, state]) => {
      this.banditStates.set(key, state);
    });
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    if (!this.config.persistAssignments || typeof window === 'undefined') {
      return;
    }

    try {
      const data = this.exportBanditStates();
      localStorage.setItem(`${this.config.storageKey}-bandits`, JSON.stringify(data));
    } catch (e) {
      console.error('[Experiments] Failed to save bandit states:', e);
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem(`${this.config.storageKey}-bandits`);
      if (!stored) {
        return;
      }

      const data = JSON.parse(stored);
      this.importBanditStates(data);

      if (this.config.debug) {
        console.log('[Experiments] Loaded bandit states from storage');
      }
    } catch (e) {
      console.error('[Experiments] Failed to load bandit states:', e);
    }
  }
}
