/**
 * Improvement Validator
 *
 * Statistical validation for optimization improvements using A/B testing
 * and statistical analysis.
 */

import type {
  Experiment,
  ExperimentResult,
  MetricStats,
  OptimizationTarget,
  OptimizationRule,
} from './types';

// ============================================================================
// STATISTICAL UTILITIES
// ============================================================================

/**
 * Statistical utilities for validation
 */
export class Statistics {
  /**
   * Calculate mean
   */
  static mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Calculate median
   */
  static median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Calculate standard deviation
   */
  static stdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const avg = this.mean(values);
    const squareDiffs = values.map((v) => Math.pow(v - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }

  /**
   * Calculate variance
   */
  static variance(values: number[]): number {
    const sd = this.stdDev(values);
    return sd * sd;
  }

  /**
   * Calculate percentile
   */
  static percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.floor((p / 100) * sorted.length);
    return sorted[Math.min(idx, sorted.length - 1)];
  }

  /**
   * Calculate standard error
   */
  static stdError(values: number[]): number {
    if (values.length < 2) return 0;
    return this.stdDev(values) / Math.sqrt(values.length);
  }

  /**
   * Calculate confidence interval
   */
  static confidenceInterval(
    values: number[],
    confidence: number = 0.95
  ): { lower: number; upper: number } {
    if (values.length < 2) {
      const mean = values[0] || 0;
      return { lower: mean, upper: mean };
    }

    const mean = this.mean(values);
    const se = this.stdError(values);

    // Use t-distribution approximation
    // For large samples, z-score of 1.96 is approximately 95% confidence
    const zScore = confidence === 0.95 ? 1.96 : 1.645; // 95% or 90%
    const margin = zScore * se;

    return {
      lower: mean - margin,
      upper: mean + margin,
    };
  }

  /**
   * Two-sample t-test for significance
   */
  static tTest(
    sample1: number[],
    sample2: number[],
    confidence: number = 0.95
  ): {
    significant: boolean;
    pValue: number;
    tStatistic: number;
    meanDifference: number;
  } {
    const n1 = sample1.length;
    const n2 = sample2.length;

    if (n1 < 2 || n2 < 2) {
      return {
        significant: false,
        pValue: 1,
        tStatistic: 0,
        meanDifference: 0,
      };
    }

    const mean1 = this.mean(sample1);
    const mean2 = this.mean(sample2);
    const var1 = this.variance(sample1);
    const var2 = this.variance(sample2);

    // Pooled standard error
    const pooledSE = Math.sqrt(var1 / n1 + var2 / n2);

    if (pooledSE === 0) {
      return {
        significant: false,
        pValue: 1,
        tStatistic: 0,
        meanDifference: mean2 - mean1,
      };
    }

    // T-statistic
    const tStatistic = (mean2 - mean1) / pooledSE;

    // Degrees of freedom (Welch's t-test)
    const df =
      Math.pow(var1 / n1 + var2 / n2, 2) /
      (Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1));

    // For large samples, approximate with normal distribution
    // Critical value for 95% confidence is approximately 1.96
    const criticalValue = confidence === 0.95 ? 1.96 : 1.645;

    const significant = Math.abs(tStatistic) > criticalValue;

    // Approximate p-value (two-tailed)
    const pValue = Math.max(0, 2 * (1 - this.normalCDF(Math.abs(tStatistic))));

    return {
      significant,
      pValue,
      tStatistic,
      meanDifference: mean2 - mean1,
    };
  }

  /**
   * Approximate normal cumulative distribution function
   */
  private static normalCDF(x: number): number {
    // Abramowitz and Stegun approximation
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const t = 1.0 / (1.0 + p * x);
    const y =
      1.0 -
      (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  /**
   * Calculate effect size (Cohen's d)
   */
  static effectSize(sample1: number[], sample2: number[]): number {
    const mean1 = this.mean(sample1);
    const mean2 = this.mean(sample2);
    const var1 = this.variance(sample1);
    const var2 = this.variance(sample2);

    // Pooled standard deviation
    const pooledSD = Math.sqrt((var1 + var2) / 2);

    if (pooledSD === 0) return 0;

    return Math.abs(mean2 - mean1) / pooledSD;
  }
}

// ============================================================================
// A/B TESTING
// ============================================================================

/**
 * A/B experiment manager
 */
export class ExperimentManager {
  private experiments: Map<string, Experiment> = new Map();
  private metricData: Map<string, { control: number[]; treatment: number[] }> =
    new Map();

  /**
   * Create new experiment
   */
  createExperiment(
    optimizationId: string,
    rule: OptimizationRule,
    trafficSplit: number = 0.5
  ): Experiment {
    const experiment: Experiment = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      optimizationId,
      control: [],
      treatment: rule.configChanges,
      trafficSplit,
      startTime: Date.now(),
      endTime: 0,
      minDuration: rule.estimatedTestDuration || 60000, // 1 minute default
      maxDuration: rule.rollbackTimeout,
      status: 'running',
    };

    this.experiments.set(experiment.id, experiment);
    this.metricData.set(experiment.id, { control: [], treatment: [] });

    return experiment;
  }

  /**
   * Record metric for experiment
   */
  recordMetric(experimentId: string, value: number, isTreatment: boolean): void {
    const data = this.metricData.get(experimentId);
    if (!data) return;

    if (isTreatment) {
      data.treatment.push(value);
    } else {
      data.control.push(value);
    }
  }

  /**
   * Get experiment
   */
  getExperiment(experimentId: string): Experiment | undefined {
    return this.experiments.get(experimentId);
  }

  /**
   * Complete experiment and get results
   */
  completeExperiment(experimentId: string): ExperimentResult | undefined {
    const experiment = this.experiments.get(experimentId);
    const data = this.metricData.get(experimentId);

    if (!experiment || !data) return undefined;

    // Calculate statistics for both groups
    const controlStats: MetricStats = {
      sampleSize: data.control.length,
      mean: Statistics.mean(data.control),
      stdDev: Statistics.stdDev(data.control),
      stdError: Statistics.stdError(data.control),
      percentiles: {
        p50: Statistics.percentile(data.control, 50),
        p95: Statistics.percentile(data.control, 95),
        p99: Statistics.percentile(data.control, 99),
      },
    };

    const treatmentStats: MetricStats = {
      sampleSize: data.treatment.length,
      mean: Statistics.mean(data.treatment),
      stdDev: Statistics.stdDev(data.treatment),
      stdError: Statistics.stdError(data.treatment),
      percentiles: {
        p50: Statistics.percentile(data.treatment, 50),
        p95: Statistics.percentile(data.treatment, 95),
        p99: Statistics.percentile(data.treatment, 99),
      },
    };

    // Run t-test
    const tTest = Statistics.tTest(data.control, data.treatment, 0.95);

    // Determine winner
    let winner: 'control' | 'treatment' | 'inconclusive' = 'inconclusive';

    if (tTest.significant) {
      // For performance metrics, lower is usually better
      if (tTest.meanDifference < 0) {
        winner = 'treatment';
      } else if (tTest.meanDifference > 0) {
        winner = 'control';
      }
    }

    // Calculate improvement
    const improvementPercent =
      controlStats.mean > 0
        ? ((controlStats.mean - treatmentStats.mean) / controlStats.mean) * 100
        : 0;

    // Confidence interval for difference
    const ci = Statistics.confidenceInterval(
      data.treatment.map((v, i) => v - data.control[i]),
      0.95
    );

    const result: ExperimentResult = {
      control: { metric: controlStats },
      treatment: { metric: treatmentStats },
      significance: tTest.pValue,
      winner,
      confidenceInterval: ci,
      improvementPercent,
    };

    // Update experiment
    experiment.endTime = Date.now();
    experiment.status = 'completed';
    experiment.results = result;

    return result;
  }

  /**
   * Check if experiment should complete
   */
  shouldCompleteExperiment(experimentId: string): boolean {
    const experiment = this.experiments.get(experimentId);
    const data = this.metricData.get(experimentId);

    if (!experiment || !data) return false;
    if (experiment.status !== 'running') return false;

    const elapsed = Date.now() - experiment.startTime;

    // Check minimum duration
    if (elapsed < experiment.minDuration) return false;

    // Check sample sizes
    const minSampleSize = 30;
    if (
      data.control.length < minSampleSize ||
      data.treatment.length < minSampleSize
    ) {
      return false;
    }

    // Check maximum duration
    if (elapsed > experiment.maxDuration) return true;

    // Run early stopping check if samples are sufficient
    if (data.control.length >= 100 && data.treatment.length >= 100) {
      const tTest = Statistics.tTest(data.control, data.treatment, 0.95);
      // Stop early if highly significant
      if (tTest.pValue < 0.01) return true;
    }

    return false;
  }

  /**
   * Get active experiment for optimization
   */
  getActiveExperiment(optimizationId: string): Experiment | undefined {
    for (const experiment of this.experiments.values()) {
      if (
        experiment.optimizationId === optimizationId &&
        experiment.status === 'running'
      ) {
        return experiment;
      }
    }
    return undefined;
  }

  /**
   * Pause experiment
   */
  pauseExperiment(experimentId: string): boolean {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== 'running') return false;

    experiment.status = 'paused';
    return true;
  }

  /**
   * Resume experiment
   */
  resumeExperiment(experimentId: string): boolean {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== 'paused') return false;

    experiment.status = 'running';
    return true;
  }
}

// ============================================================================
// VALIDATION MANAGER
// ============================================================================

/**
 * Validation manager for optimizations
 */
export class ValidationManager {
  private experiments: ExperimentManager;

  constructor() {
    this.experiments = new ExperimentManager();
  }

  /**
   * Create A/B test for optimization
   */
  createValidation(
    optimizationId: string,
    rule: OptimizationRule,
    trafficSplit: number = 0.5
  ): Experiment {
    return this.experiments.createExperiment(optimizationId, rule, trafficSplit);
  }

  /**
   * Record metric during validation
   */
  recordMetric(
    experimentId: string,
    metric: OptimizationTarget,
    value: number,
    isTreatment: boolean
  ): void {
    this.experiments.recordMetric(experimentId, value, isTreatment);
  }

  /**
   * Check if validation is complete
   */
  isValidationComplete(experimentId: string): boolean {
    return this.experiments.shouldCompleteExperiment(experimentId);
  }

  /**
   * Complete validation and get results
   */
  completeValidation(experimentId: string): ExperimentResult | undefined {
    return this.experiments.completeExperiment(experimentId);
  }

  /**
   * Get experiment
   */
  getExperiment(experimentId: string): Experiment | undefined {
    return this.experiments.getExperiment(experimentId);
  }

  /**
   * Validate without A/B test (direct comparison)
   */
  validateDirect(
    before: Record<OptimizationTarget, number[]>,
    after: Record<OptimizationTarget, number[]>,
    rule: OptimizationRule
  ): {
    passed: boolean;
    reason: string;
    improvement: number;
    details: Record<
      OptimizationTarget,
      {
        before: MetricStats;
        after: MetricStats;
        significant: boolean;
        improvement: number;
      }
    >;
  } {
    const details: Record<
      string,
      { before: MetricStats; after: MetricStats; significant: boolean; improvement: number }
    > = {};

    for (const metricValidation of rule.validation.metrics) {
      const target = metricValidation.target;
      const beforeData = before[target];
      const afterData = after[target];

      if (!beforeData || !afterData || beforeData.length === 0 || afterData.length === 0) {
        continue;
      }

      // Calculate statistics
      const beforeStats: MetricStats = {
        sampleSize: beforeData.length,
        mean: Statistics.mean(beforeData),
        stdDev: Statistics.stdDev(beforeData),
        stdError: Statistics.stdError(beforeData),
        percentiles: {
          p50: Statistics.percentile(beforeData, 50),
          p95: Statistics.percentile(beforeData, 95),
          p99: Statistics.percentile(beforeData, 99),
        },
      };

      const afterStats: MetricStats = {
        sampleSize: afterData.length,
        mean: Statistics.mean(afterData),
        stdDev: Statistics.stdDev(afterData),
        stdError: Statistics.stdError(afterData),
        percentiles: {
          p50: Statistics.percentile(afterData, 50),
          p95: Statistics.percentile(afterData, 95),
          p99: Statistics.percentile(afterData, 99),
        },
      };

      // Run t-test
      const tTest = Statistics.tTest(beforeData, afterData, 0.95);

      // Calculate improvement
      const improvement =
        beforeStats.mean > 0
          ? ((beforeStats.mean - afterStats.mean) / beforeStats.mean) * 100
          : 0;

      details[target] = {
        before: beforeStats,
        after: afterStats,
        significant: tTest.significant,
        improvement,
      };
    }

    // Check if validation criteria met
    let passed = true;
    let reason = 'Validation passed';

    for (const metricValidation of rule.validation.metrics) {
      const detail = details[metricValidation.target];
      if (!detail) continue;

      // Check if must improve
      if (metricValidation.mustImprove && detail.improvement < rule.validation.minImprovementPercent) {
        passed = false;
        reason = `${metricValidation.target} did not improve enough`;
        break;
      }

      // Check for degradation
      if (detail.improvement < -rule.validation.maxDegradationPercent) {
        passed = false;
        reason = `${metricValidation.target} degraded too much`;
        break;
      }

      // Check tolerance
      if (Math.abs(detail.improvement) > metricValidation.tolerance) {
        passed = false;
        reason = `${metricValidation.target} change outside tolerance`;
        break;
      }
    }

    // Calculate overall improvement
    const improvements = Object.values(details).map((d) => d.improvement);
    const avgImprovement =
      improvements.length > 0
        ? improvements.reduce((sum, i) => sum + i, 0) / improvements.length
        : 0;

    return {
      passed,
      reason,
      improvement: avgImprovement,
      details: details as any,
    };
  }

  /**
   * Get experiment manager
   */
  getExperimentManager(): ExperimentManager {
    return this.experiments;
  }
}
