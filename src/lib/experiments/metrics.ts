/**
 * Metrics Tracker
 *
 * Tracks metric values for experiments and provides
 * aggregation and statistics computation.
 */

import type {
  MetricValue,
  MetricStatistics,
  ExperimentConfig,
} from './types';

/**
 * Metrics tracker implementation
 */
export class MetricsTracker {
  private config: ExperimentConfig;
  private metrics: Map<string, MetricValue[]> = new Map(); // experimentId -> metrics
  private variantMetrics: Map<string, MetricValue[]> = new Map(); // variantId -> metrics

  constructor(config: ExperimentConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Load metrics from storage
    this.loadFromStorage();
  }

  /**
   * Track a metric value
   */
  track(metric: MetricValue): void {
    if (!this.config.trackMetrics) {
      return;
    }

    // Store by experiment
    const expKey = `${metric.experimentId}`;
    if (!this.metrics.has(expKey)) {
      this.metrics.set(expKey, []);
    }
    this.metrics.get(expKey)!.push(metric);

    // Store by variant
    const varKey = `${metric.experimentId}:${metric.variantId}`;
    if (!this.variantMetrics.has(varKey)) {
      this.variantMetrics.set(varKey, []);
    }
    this.variantMetrics.get(varKey)!.push(metric);

    // Persist if enabled
    if (this.config.persistAssignments) {
      this.saveToStorage();
    }

    if (this.config.debug) {
      console.log('[Experiments] Tracked metric:', metric);
    }
  }

  /**
   * Get all metrics for an experiment
   */
  getExperimentMetrics(experimentId: string): MetricValue[] {
    return this.metrics.get(experimentId) || [];
  }

  /**
   * Get metrics for a specific variant
   */
  getVariantMetrics(experimentId: string, variantId: string): MetricValue[] {
    const key = `${experimentId}:${variantId}`;
    return this.variantMetrics.get(key) || [];
  }

  /**
   * Get metrics for a specific metric ID
   */
  getMetricById(
    experimentId: string,
    variantId: string,
    metricId: string
  ): MetricValue[] {
    const variantMetrics = this.getVariantMetrics(experimentId, variantId);
    return variantMetrics.filter(m => m.metricId === metricId);
  }

  /**
   * Compute statistics for a metric
   */
  computeStatistics(metrics: MetricValue[]): MetricStatistics | null {
    if (metrics.length === 0) {
      return null;
    }

    const values = metrics.map(m => m.value);
    const n = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / n;

    // Calculate variance
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const stdErr = stdDev / Math.sqrt(n);

    // Find min and max
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Get most recent timestamp
    const lastUpdated = Math.max(...metrics.map(m => m.timestamp));

    // Check if this looks like binary data (only 0s and 1s)
    const isBinary = values.every(v => v === 0 || v === 1);
    const successRate = isBinary ? mean : undefined;

    // Calculate sum for count/ratio metrics
    const sumValue = isBinary ? undefined : sum;

    return {
      metricId: metrics[0].metricId,
      sampleSize: n,
      mean,
      stdDev,
      stdErr,
      variance,
      min,
      max,
      successRate,
      sum: sumValue,
      lastUpdated,
    };
  }

  /**
   * Get statistics for all metrics in a variant
   */
  getVariantStatistics(
    experimentId: string,
    variantId: string,
    metricIds: string[]
  ): Record<string, MetricStatistics> {
    const statistics: Record<string, MetricStatistics> = {};

    for (const metricId of metricIds) {
      const metrics = this.getMetricById(experimentId, variantId, metricId);
      const stats = this.computeStatistics(metrics);

      if (stats) {
        statistics[metricId] = stats;
      }
    }

    return statistics;
  }

  /**
   * Get exposure count for a variant
   */
  getExposureCount(experimentId: string, variantId: string): number {
    const metrics = this.getVariantMetrics(experimentId, variantId);
    const uniqueUsers = new Set(metrics.filter(m => m.userId).map(m => m.userId!));
    return uniqueUsers.size;
  }

  /**
   * Get unique user count for experiment
   */
  getUniqueUserCount(experimentId: string): number {
    const metrics = this.getExperimentMetrics(experimentId);
    const uniqueUsers = new Set(metrics.filter(m => m.userId).map(m => m.userId!));
    return uniqueUsers.size;
  }

  /**
   * Clear all metrics for an experiment
   */
  clearExperimentData(experimentId: string): void {
    this.metrics.delete(experimentId);

    // Clear variant metrics
    for (const key of this.variantMetrics.keys()) {
      if (key.startsWith(`${experimentId}:`)) {
        this.variantMetrics.delete(key);
      }
    }

    if (this.config.persistAssignments) {
      this.saveToStorage();
    }
  }

  /**
   * Clear all metrics
   */
  clearAll(): void {
    this.metrics.clear();
    this.variantMetrics.clear();

    if (this.config.persistAssignments) {
      this.saveToStorage();
    }
  }

  /**
   * Export metrics
   */
  exportMetrics(): Record<string, MetricValue[]> {
    const obj: Record<string, MetricValue[]> = {};
    this.metrics.forEach((values, key) => {
      obj[key] = values;
    });
    return obj;
  }

  /**
   * Import metrics
   */
  importMetrics(data: Record<string, MetricValue[]>): void {
    this.metrics.clear();
    this.variantMetrics.clear();

    Object.entries(data).forEach(([expId, metrics]) => {
      this.metrics.set(expId, metrics);

      // Rebuild variant index
      metrics.forEach(metric => {
        const varKey = `${metric.experimentId}:${metric.variantId}`;
        if (!this.variantMetrics.has(varKey)) {
          this.variantMetrics.set(varKey, []);
        }
        this.variantMetrics.get(varKey)!.push(metric);
      });
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
      const data = this.exportMetrics();
      localStorage.setItem(`${this.config.storageKey}-metrics`, JSON.stringify(data));
    } catch (e) {
      console.error('[Experiments] Failed to save metrics:', e);
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
      const stored = localStorage.getItem(`${this.config.storageKey}-metrics`);
      if (!stored) {
        return;
      }

      const data = JSON.parse(stored);
      this.importMetrics(data);

      if (this.config.debug) {
        console.log('[Experiments] Loaded metrics from storage');
      }
    } catch (e) {
      console.error('[Experiments] Failed to load metrics:', e);
    }
  }
}
